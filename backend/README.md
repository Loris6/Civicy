# Civicy – Backend

Kleines Backend auf **Cloudflare Workers** (kostenloser Tarif reicht). Es macht:

1. **Anmeldung mit dem Microsoft-Konto** – tauscht den Code von Microsoft ein, meldet sich damit bei Xbox Live an und holt bei Minecraft das Profil (echter Name und UUID). Danach gibt es ein eigenes, signiertes Sitzungs-Token aus.
2. **Anmeldung mit Code aus dem Spiel** – das Plugin (`plugin/`) holt für `/weblogin` einen 6-stelligen Code, der Spieler gibt ihn auf der Webseite ein.
3. **Skins und Namen** – `/api/skin/<uuid>` liefert die Skin-Datei von Mojang für das 3D-Modell, `/api/lookup/<name>` die richtige Schreibweise.
4. **Ränge** – speichert den Rang jedes Spielers. Das Plugin gleicht ihn beim Betreten des Servers ab; fest geht es auch in `wrangler.toml` (`STAFF`).
5. **Forum** – Kategorien, Themen, Antworten, Bearbeiten, Löschen, Anheften und Schließen (Team).
6. **Neuigkeiten** – das Team schreibt sie direkt auf der Webseite, mit bis zu zwei Knöpfen.
7. **Bewerbungen** – nimmt Bewerbungen an und schickt sie in einen Discord-Kanal.

Gespeichert wird in einem Durable Object mit SQLite – nichts weiter anzulegen.

## Ablauf der Anmeldung

```
Webseite (eigene Oberfläche)          Microsoft                 Backend
  E-Mail eingeben  ───────────────►  Passwort / Authenticator
                                     (login_hint = E-Mail)
  ◄──────────── ?code=… ───────────
  Code ───────────────────────────────────────────────────►  Code → Microsoft-Token
                                                              → Xbox Live (XBL) → XSTS
                                                              → Minecraft-Token → Profil
  ◄────────────────────────── Sitzung + Name, UUID, Rang ───
```

Das Passwort sieht weder die Webseite noch das Backend – es wird nur bei Microsoft eingegeben.

## Einrichten

### 1. App im Azure-Portal registrieren

1. <https://portal.azure.com> → **Microsoft Entra ID** → **App-Registrierungen** → **Neue Registrierung**
2. Name: `Civicy`
3. Unterstützte Kontotypen: **Nur persönliche Microsoft-Konten**
4. Umleitungs-URI: Plattform **Web**, Adresse der Seite mit `/` am Ende, z. B. `https://loris6.github.io/Civicy/`
   (zum Testen zusätzlich `http://localhost:8000/`)
5. **Zertifikate & Geheimnisse** → **Neuer geheimer Clientschlüssel** → den *Wert* kopieren (= `MS_CLIENT_SECRET`)
6. Die **Anwendungs-ID (Client)** von der Übersichtsseite eintragen in
   - `assets/js/config.js` → `microsoft.clientId`
   - `backend/wrangler.toml` → `MS_CLIENT_ID`

### 2. Minecraft-Zugang beantragen (wichtig!)

Neue Azure-Apps dürfen die Minecraft-Schnittstelle erst nutzen, wenn Mojang sie freigeschaltet hat.
Antrag mit der Anwendungs-ID stellen: <https://aka.ms/mce-reviewappid>.
Bis zur Freigabe endet die Anmeldung mit „Die Civicy-App ist bei Minecraft noch nicht freigeschaltet“ – Microsoft und Xbox funktionieren aber schon.

### 3. Backend veröffentlichen – automatisch über GitHub Actions

1. Kostenloses Konto auf <https://cloudflare.com>, einmal **Workers & Pages** öffnen
2. **API-Token** erstellen (Vorlage „Edit Cloudflare Workers“) und die **Account-ID** kopieren
3. Im Repository unter **Settings → Secrets and variables → Actions** eintragen:

| Name | Pflicht | Inhalt |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ja | API-Token von Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | ja | Account-ID von Cloudflare |
| `MS_CLIENT_SECRET` | ja | Geheimer Clientschlüssel aus dem Azure-Portal |
| `SESSION_SECRET` | ja | Lange Zufallszeichenkette, z. B. aus `openssl rand -hex 32` |
| `DISCORD_WEBHOOK_URL` | nein | Webhook eines Discord-Kanals für Bewerbungen |
| `SERVER_KEY` | für das Plugin | Schlüssel für das Plugin auf dem Minecraft-Server (`/weblogin`, Rang-Abgleich) |
| `ADMIN_KEY` | nein | Schlüssel für Admin-Werkzeuge, z. B. Ränge per curl setzen |

4. **Actions → „Backend veröffentlichen“ → Run workflow**. Die Adresse des Backends wird danach automatisch in `assets/js/config.js` (`api`) eingetragen.

Von Hand geht es auch: `cd backend && npx wrangler@4 deploy`, danach die Geheimnisse mit `npx wrangler@4 secret put <NAME>` setzen.

## Ränge setzen

Am einfachsten über das Plugin (`plugin/README.md`): Es schickt beim Betreten des Servers den höchsten Rang des Spielers an das Backend.

Fest im Code (`wrangler.toml`):

```toml
STAFF = '{"DeinName": "inhaber", "069a79f444e94726a5befca90e38aaf5": "admin"}'
```

Oder per API (z. B. aus einem Server-Plugin, das bei jeder Rangänderung in LuckPerms aufgerufen wird):

```bash
curl -X PUT https://civicy-backend.<name>.workers.dev/api/ranks/<uuid> \
  -H "Authorization: Bearer $SERVER_KEY" -H "Content-Type: application/json" \
  -d '{"rank": "moderator", "name": "Spielername"}'
```

Die Rang-ids (`inhaber`, `admin`, `moderator`, `diamant`, `gold`, …) stehen in `assets/js/data.js` unter `ranks`. Ein gespeicherter Rang hat Vorrang vor `STAFF`; ohne beides gilt `DEFAULT_RANK`.

## Teamrechte

Wer einen Rang aus `STAFF_RANKS` hat (Standard: inhaber, admin, developer, moderator, supporter, builder), darf auf der Webseite Neuigkeiten schreiben, im Forum Themen anheften, schließen und fremde Beiträge löschen und in „Ankündigungen“ neue Themen erstellen.

## Schnittstellen

| Methode | Pfad | Zugriff | Zweck |
|---|---|---|---|
| POST | `/auth/microsoft` | öffentlich | `{code, verifier, redirectUri}` → `{token, user}` |
| POST | `/auth/code` | öffentlich | `{code}` aus `/weblogin` → `{token, user}` (max. 10 Versuche in 10 Minuten) |
| POST | `/auth/logout` | Sitzung | Sitzung beenden |
| GET | `/api/me` | Sitzung | Aktueller Spieler mit Rang |
| GET | `/api/lookup/<name>` | öffentlich | Richtige Schreibweise und UUID |
| GET | `/api/skin/<uuid>` | öffentlich | Skin-Datei (PNG) |
| GET | `/api/players/<name>` | öffentlich | Profil mit Rang und Forenthemen |
| GET | `/api/forum`, `/api/forum/recent`, `/api/forum/c/<kat>`, `/api/forum/t/<id>` | öffentlich | Forum lesen |
| POST | `/api/forum/threads`, `/api/forum/t/<id>/posts` | Sitzung | Thema erstellen, antworten (15 s Pause zwischen Beiträgen) |
| PUT / DELETE | `/api/forum/p/<id>` | Sitzung | Eigenen Beitrag bearbeiten / löschen (Team: alle) |
| PUT | `/api/forum/t/<id>` | Team | Anheften, schließen, verschieben |
| GET | `/api/news` | öffentlich | Neuigkeiten des Teams |
| POST / PUT / DELETE | `/api/news`, `/api/news/<id>` | Team | Neuigkeit schreiben, bearbeiten, löschen |
| POST | `/api/applications` | Sitzung | Bewerbung (max. 1 pro Stelle und Tag) |
| POST | `/api/link` | `SERVER_KEY` | `{uuid, name}` → Code für `/weblogin` |
| GET | `/api/ranks` | `SERVER_KEY`/`ADMIN_KEY` | Alle gespeicherten Ränge |
| PUT / DELETE | `/api/ranks/<uuid>` | `SERVER_KEY`/`ADMIN_KEY` | Rang setzen / entfernen |
