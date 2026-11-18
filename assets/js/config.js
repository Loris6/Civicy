/*
 * Civicy – Einstellungen der Webseite
 *
 * Diese Datei ist öffentlich. Hier gehören NIE Passwörter, Client-Secrets oder Tokens hinein –
 * die liegen nur im Backend (Ordner backend/, siehe backend/README.md).
 *
 * ── Anmeldung mit dem Microsoft-Konto (= Minecraft-Konto) ─────────────────────
 * Solange microsoft.clientId oder api leer ist, läuft die Anmeldung im Demo-Modus:
 * Die eigene Anmelde-Oberfläche funktioniert, statt Microsoft wird aber nur der Minecraft-Name abgefragt.
 * Für die echte Anmeldung:
 *   1. Backend einrichten (backend/README.md) und die Adresse unten bei api eintragen
 *   2. App im Azure-Portal registrieren, Client-ID unten bei clientId eintragen
 *   3. Minecraft-API-Zugang für die App bei Mojang beantragen (Link im backend/README.md)
 */
window.CIVICY_CONFIG = {
  server: {
    // Adresse für „Server hinzufügen“ in Minecraft (Java Edition)
    ip: 'play.civicy.de',
    // Bedrock (Handy, Konsole, Windows): Adresse und Port – leer lassen, wenn es kein Bedrock gibt
    bedrockIp: 'play.civicy.de',
    bedrockPort: 19132,
    // Unterstützte Versionen (nur Anzeige)
    version: '1.21',
    // Live-Status (Spieler online) über api.mcsrvstat.us abfragen
    liveStatus: true,
  },

  microsoft: {
    // „Anwendungs-ID (Client)“ aus dem Azure-Portal (App-Registrierungen). Leer = Demo-Modus
    clientId: '',
    // Leer = Adresse der Seite. Muss exakt so im Azure-Portal als Umleitungs-URI (Plattform „Web“) stehen.
    redirectUri: '',
  },

  // Adresse des Backends (Ordner backend/), z. B. 'https://civicy-backend.<name>.workers.dev'. Leer = Demo-Modus
  api: '',

  // Links in Menü und Fußzeile – leer lassen, was es nicht gibt
  links: {
    discord: 'https://discord.gg/',
    // Einladungscode für die Mitgliederzahl auf der Startseite (der Teil nach discord.gg/)
    discordInvite: '',
    youtube: '',
    tiktok: '',
    instagram: '',
    twitch: '',
  },

  // Angaben für Impressum, Datenschutzerklärung und Nutzungsbedingungen
  legal: {
    operator: 'Vor- und Nachname eintragen',
    address: 'Straße Hausnummer, PLZ Ort, Deutschland',
    email: 'kontakt@beispiel.de',
    // Wo das Backend läuft (Anbieter mit Anschrift)
    backendHost: 'Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA',
    updated: '18. November 2026',
  },
};
