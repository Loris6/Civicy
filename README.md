<p align="center"><img src="assets/img/logo.webp" alt="Civicy" width="320"></p>

# Civicy

Die Webseite zum Minecraft-Netzwerk **Civicy**: viele Spielmodi auf einem Server – BedWars, SkyWars, EggWars, LuckyWars, Epic Minigames, Murder Mystery, CityBuild und mehr. Dazu Ränge mit Chat-Tags, ein Forum, Neuigkeiten, Team, Karriere und eine eigene Anmeldung mit dem Minecraft-Konto, die den **echten Skin (3D), den echten Namen und den Rang** zeigt.

Die Seite ist reines HTML, CSS und JavaScript ohne Build-Schritt und läuft direkt auf GitHub Pages. Aufgebaut wie die Train-Sim-Germany-Seite.

## Seiten

| Seite | Adresse | Inhalt |
|---|---|---|
| **Start** | `#/` | Nachthimmel mit Polarlicht und Hügeln aus Blöcken, IP zum Kopieren, Live-Status, Spielmodi als Karten, „So startest du“, Sätze aus dem Team, Neuigkeiten, Ränge mit Chat-Vorschau, Zahlen, neueste Forenthemen, FAQ, „Werde Teil des Teams“ |
| **Spielmodi** | `#/modi` | Jeder Modus mit Bild, Beschreibung, Teamgrößen und Merkmalen |
| **Neuigkeiten** | `#/news`, `#/news/<id>` | Filter nach Kategorie. Jede Neuigkeit kann **bis zu zwei Knöpfe** haben (z. B. Discord, YouTube, Shop, eine Seite der Webseite oder ein beliebiger Link). Das **Team schreibt, bearbeitet und löscht Neuigkeiten direkt auf der Seite** („Neuigkeit schreiben“) |
| **Forum** | `#/forum`, `#/forum/<kategorie>`, `#/forum/t/<id>` | Kategorien mit Zahlen, Themen, Antworten, eigene Beiträge bearbeiten und löschen. Das Team kann anheften, schließen und alles löschen. In „Ankündigungen“ erstellt nur das Team Themen |
| **Ränge** | `#/raenge` | Kaufbare Ränge (Eisen, Gold, Diamant, Smaragd, Netherite) mit Preis, Vorteilen und einer Vorschau, wie der **Chat-Tag** im Spiel aussieht – mit deinem eigenen Namen, wenn du angemeldet bist. Dazu Team- und Sonderränge |
| **Team** | `#/team` | Teammitglieder nach Bereich, ein Klick öffnet das Profil |
| **Spielerprofil** | `#/spieler/<Name>` | 3D-Skin (dreht sich, läuft, mit der Maus drehbar), Name, Rang, Chat-Tag, UUID, Beiträge und Themen im Forum, bei Teammitgliedern Aufgabe und „Über mich“ |
| **Mein Konto** | `#/konto` | 3D-Skin, Rang, UUID, Microsoft-Konto, eigene Forenthemen und Bewerbungen, Abmelden |
| **Regeln**, **FAQ**, **Karriere** | `#/regeln`, `#/faq`, `#/karriere` | Regeln für alle Modi, häufige Fragen, Stellen mit Bewerbung in drei Schritten |
| **Rechtliches** | `impressum.html`, `privacy.html`, `terms.html` | Angaben kommen aus `config.js` (`legal`) |

**Seitenwechsel:** Bei jedem Wechsel bauen Blöcke den Bildschirm zu, in der Mitte steht der Name der Seite (mit Logo) – beim Profil eines Spielers sein Name mit seinem Kopf darüber – und dann fädeln die Blöcke wieder aus.

**Leiste oben** bleibt immer stehen: Logo, wichtigste Seiten, IP zum Kopieren, Kopf des angemeldeten Spielers, Menü mit Hell/Dunkel/Auto. Die Bildlaufleiste ist hellblau und passt sich dem Theme an. Kein Gummiband-Effekt beim Scrollen.

## Anmeldung

Ein Klick auf das Profil öffnet die **eigene Anmelde-Oberfläche**. Es gibt drei Wege:

1. **Microsoft** – E-Mail eingeben → kurze Erklärung → Microsoft (die E-Mail wird mitgegeben, Microsoft fragt direkt nach dem Passwort) → zurück auf der Seite werden **Microsoft → Xbox Live → Minecraft-Profil → Rang** abgehakt → **Willkommen** mit 3D-Skin, Name, Rang und Chat-Tag. Das Passwort wird nur bei Microsoft eingegeben, nie auf der Webseite.
2. **Code aus dem Spiel** – im Spiel `/weblogin` eingeben, den 6-stelligen Code auf der Webseite eintippen. Name, UUID und Skin kommen direkt vom Server, also echt. Braucht das Plugin aus `plugin/`. Funktioniert auch, solange Mojang die Microsoft-App noch nicht freigegeben hat.
3. **Demo** (ohne Backend) – nach der E-Mail den Minecraft-Namen eingeben. Die Seite schlägt ihn nach, zeigt schon beim Tippen Kopf und richtige Schreibweise und lädt den echten Skin – bestätigt ist der Name aber nicht.

Der Skin kommt (in dieser Reihenfolge) vom eigenen Backend (`/api/skin/<uuid>`, direkt von Mojang), von crafatar.com oder von mc-heads.net und wird mit [skinview3d](https://github.com/bs-community/skinview3d) als 3D-Modell gezeigt.

## Einrichten

| Was | Wo |
|---|---|
| Server-IP, Version, Shop-Link, Discord, Microsoft-Client-ID, Backend-Adresse, Impressum | `assets/js/config.js` |
| Spielmodi, Ränge (Tag, Farbe, Preis, Vorteile), Team, Neuigkeiten mit Knöpfen, Forum-Kategorien, Regeln, FAQ, Stellen | `assets/js/data.js` – alles Beispiel-Inhalt |
| Backend (Anmeldung, Forum, Neuigkeiten, Ränge, Bewerbungen) | [`backend/README.md`](backend/README.md) |
| Plugin für den Server (`/weblogin`, Rang-Abgleich) | [`plugin/README.md`](plugin/README.md) |

Ohne Backend läuft alles im Demo-Modus: Forum und Neuigkeiten des Teams werden dann nur im Browser gespeichert. Wer sich im Demo-Modus mit dem Namen eines Teammitglieds aus `data.js` anmeldet, hat dessen Rang (zum Ausprobieren von „Neuigkeit schreiben“ und der Moderation).

## Lokal starten

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

## Veröffentlichen

GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**. Die Seite liegt dann unter `https://loris6.github.io/Civicy/`.

---

Civicy ist kein offizielles Minecraft-Produkt und nicht von Mojang oder Microsoft genehmigt oder mit ihnen verbunden. Symbole: [Phosphor Icons](https://phosphoricons.com) (MIT) und [Simple Icons](https://simpleicons.org) (CC0). 3D-Skin: skinview3d und three.js (MIT). Schriften: Rubik und Silkscreen (SIL Open Font License).
