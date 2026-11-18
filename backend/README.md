# Civicy – Backend

Kleines Backend auf **Cloudflare Workers** (kostenloser Tarif reicht). Es macht drei Dinge:

1. **Anmeldung mit dem Microsoft-Konto** – tauscht den Code von Microsoft ein, meldet sich damit bei Xbox Live an und holt bei Minecraft das Profil (UUID, Name, Skin). Danach gibt es ein eigenes, signiertes Sitzungs-Token aus.
2. **Ränge** – speichert den Rang jedes Spielers. Setzen lässt er sich fest in `wrangler.toml` (`STAFF`) oder per API, z. B. aus einem Plugin auf dem Minecraft-Server.
3. **Bewerbungen** – nimmt Bewerbungen von angemeldeten Spielern an und schickt sie in einen Discord-Kanal.

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
| `ADMIN_KEY` | nein | Schlüssel, um Ränge per API zu setzen |

4. **Actions → „Backend veröffentlichen“ → Run workflow**. Die Adresse des Backends wird danach automatisch in `assets/js/config.js` (`api`) eingetragen.

Von Hand geht es auch: `cd backend && npx wrangler@4 deploy`, danach die Geheimnisse mit `npx wrangler@4 secret put <NAME>` setzen.

## Ränge setzen

Fest im Code (`wrangler.toml`):

```toml
STAFF = '{"DeinName": "inhaber", "069a79f444e94726a5befca90e38aaf5": "admin"}'
```

Oder per API (z. B. aus einem Server-Plugin, das bei jeder Rangänderung in LuckPerms aufgerufen wird):

```bash
curl -X PUT https://civicy-backend.<name>.workers.dev/api/ranks/<uuid> \
  -H "Authorization: Bearer $ADMIN_KEY" -H "Content-Type: application/json" \
  -d '{"rank": "moderator", "name": "Spielername"}'
```

Die Rang-ids (`inhaber`, `admin`, `moderator`, `buerger`, …) stehen in `assets/js/data.js` unter `ranks`. Ein gespeicherter Rang hat Vorrang vor `STAFF`; ohne beides gilt `DEFAULT_RANK`.

## Schnittstellen

| Methode | Pfad | Zugriff | Zweck |
|---|---|---|---|
| POST | `/auth/microsoft` | öffentlich | `{code, verifier, redirectUri}` → `{token, user}` |
| GET | `/api/me` | Sitzung | Aktueller Spieler mit Rang |
| POST | `/auth/logout` | Sitzung | Sitzung beenden |
| POST | `/api/applications` | Sitzung | Bewerbung (max. 1 pro Stelle und Tag) |
| GET | `/api/ranks` | `ADMIN_KEY` | Alle gespeicherten Ränge |
| PUT / DELETE | `/api/ranks/<uuid>` | `ADMIN_KEY` | Rang setzen / entfernen |
