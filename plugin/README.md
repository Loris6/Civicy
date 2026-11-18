# CivicyLink – Plugin für den Minecraft-Server

Verbindet den Server (Paper 1.21+) mit der Civicy-Webseite:

- **`/weblogin`** – der Spieler bekommt einen 6-stelligen Code und meldet sich damit auf der Webseite an. So stehen dort sein **echter Name, seine UUID und sein Skin** – auch solange die Microsoft-Anmeldung noch auf die Freigabe von Mojang wartet.
- **Rang-Abgleich** – beim Betreten wird der höchste Rang des Spielers an die Webseite geschickt (Chat-Tag und Rang erscheinen dann im Konto, im Profil und im Forum). Welcher Rang gilt, steht über Permissions fest, z. B. aus LuckPerms:
  ```
  /lp group diamant permission set civicy.rank.diamant
  /lp group moderator permission set civicy.rank.moderator
  ```
- `/civicylink reload` lädt die Konfiguration neu, `/civicylink sync [Spieler]` gleicht einen Rang sofort ab.

## Einrichten

1. Backend einrichten (`backend/README.md`) und dort das Geheimnis **`SERVER_KEY`** setzen (lange Zufallszeichenkette).
2. Plugin bauen: GitHub → **Actions → „Plugin bauen“ → Run workflow**, danach die `CivicyLink.jar` unter *Artifacts* herunterladen.
   Lokal geht es mit `cd plugin && mvn package` (Java 21, Maven).
3. Die Jar in den `plugins`-Ordner legen, Server starten.
4. In `plugins/CivicyLink/config.yml` eintragen: `api` (Adresse des Backends) und `server-key` (der Wert von `SERVER_KEY`). Danach `/civicylink reload`.

Der `server-key` gehört nur auf den Server – nie in die Webseite oder ins Repository.
