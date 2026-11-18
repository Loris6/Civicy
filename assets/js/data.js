/*
 * Civicy – Inhalte der Webseite
 * Alles hier ist Beispiel-Inhalt und kann frei angepasst werden: Spielmodi, Ränge, Team, Neuigkeiten, Forum, Regeln, FAQ und Stellen.
 * Icons: Namen aus assets/js/icons.js (Phosphor Icons).
 */
window.CIVICY_DATA = {
  // ── Spielmodi ────────────────────────────────────────────────────────────
  modes: [
    { id: 'bedwars', name: 'BedWars', icon: 'bed', color: '#FF5D6C', size: 'Solo · 2×4 · 4×4', tags: ['Team', 'PvP', 'Strategie'],
      text: 'Schütze dein Bett, sammle Ressourcen auf deiner Insel und zerstöre die Betten der anderen Teams. Wer kein Bett mehr hat, steht nicht mehr auf.' },
    { id: 'skywars', name: 'SkyWars', icon: 'cloud', color: '#5CE1FF', size: 'Solo · Duo', tags: ['PvP', 'Schnell'],
      text: 'Jeder startet auf seiner eigenen Insel hoch über dem Nichts. Plündere die Truhen, bau dich zur Mitte und sei der Letzte, der noch steht.' },
    { id: 'eggwars', name: 'EggWars', icon: 'egg', color: '#FFD34D', size: '4×4 · 8×2', tags: ['Team', 'Wirtschaft'],
      text: 'Wie BedWars – nur mit einem Drachenei. Baue Generatoren aus, kauf bessere Ausrüstung und verteidige dein Ei bis zum Schluss.' },
    { id: 'luckywars', name: 'LuckyWars', icon: 'clover', color: '#3EE08F', size: 'Solo · Duo', tags: ['Chaos', 'Glück'],
      text: 'Lucky Blocks überall: Mal gibt es ein Diamantschwert, mal einen Schwarm Bienen. Jede Runde ist anders – und keine ist fair.' },
    { id: 'epicminigames', name: 'Epic Minigames', icon: 'puzzle-piece', color: '#A78BFA', size: 'Bis 16 Spieler', tags: ['Party', 'Abwechslung'],
      text: 'Viele kleine Spiele hintereinander: Parkour, Spleef, Hot Potato, Colour Run und mehr. Wer am Ende die meisten Punkte hat, gewinnt.' },
    { id: 'murdermystery', name: 'Murder Mystery', icon: 'knife', color: '#FF8A3D', size: 'Bis 16 Spieler', tags: ['Rätsel', 'Rollen'],
      text: 'Unter euch ist ein Mörder. Als Unschuldiger überlebst du, als Detektiv findest du ihn – und als Mörder darf dich niemand erwischen.' },
    { id: 'citybuild', name: 'CityBuild', icon: 'buildings', color: '#2EE6AA', size: 'Freie Welt', tags: ['Bauen', 'Handel'],
      text: 'Dein eigenes Grundstück, ein Marktplatz voller Spieler-Shops und eine Wirtschaft, die ihr selbst macht. Zum Bauen, Handeln und Entspannen.' },
  ],

  // ── Ränge ────────────────────────────────────────────────────────────────
  // tag = Chat-Tag im Spiel, color = Farbe von Tag und Name.
  // buy: true = im Shop kaufbar (price als Text), staff: true = Teamrang (wird auf der Team-Seite gezeigt).
  // Die Reihenfolge ist die Rangfolge (oben = höchster).
  ranks: [
    { id: 'inhaber', name: 'Inhaber', tag: 'INHABER', color: '#5CE1FF', staff: true, group: 'Leitung', desc: 'Gründer und Leitung von Civicy.' },
    { id: 'admin', name: 'Admin', tag: 'ADMIN', color: '#FF5D6C', staff: true, group: 'Leitung', desc: 'Verwaltet Server, Plugins und das Team.' },
    { id: 'developer', name: 'Developer', tag: 'DEV', color: '#A78BFA', staff: true, group: 'Entwicklung', desc: 'Programmiert Spielmodi und Systeme.' },
    { id: 'moderator', name: 'Moderator', tag: 'MOD', color: '#4F8BFF', staff: true, group: 'Community', desc: 'Sorgt im Spiel, im Forum und auf Discord dafür, dass die Regeln eingehalten werden.' },
    { id: 'supporter', name: 'Supporter', tag: 'SUP', color: '#3EE08F', staff: true, group: 'Community', desc: 'Erste Hilfe bei Fragen – im Spiel, im Ticket und im Forum.' },
    { id: 'builder', name: 'Builder', tag: 'BUILDER', color: '#FFB547', staff: true, group: 'Bau', desc: 'Baut Lobbys und Maps für alle Spielmodi.' },
    { id: 'creator', name: 'Creator', tag: 'CREATOR', color: '#F472B6', desc: 'Für YouTuber, Streamer und TikToker, die Civicy zeigen. Nicht kaufbar – Bewerbung unter Karriere.' },
    { id: 'netherite', name: 'Netherite', tag: 'NETHERITE', color: '#FF55FF', buy: true, price: '49,99 €', desc: 'Der höchste Rang im Shop – mit allem, was es gibt.',
      perks: ['Chat-Tag [NETHERITE] und pinker Name', '/nick – spiel unerkannt', 'Eigene Join-Nachricht in der Lobby', 'Party mit bis zu 24 Spielern', '+100 % Coins in allen Modi', 'Alles aus Smaragd'] },
    { id: 'smaragd', name: 'Smaragd', tag: 'SMARAGD', color: '#55FF55', buy: true, price: '29,99 €', desc: 'Für alle, die jeden Tag dabei sind.',
      perks: ['Chat-Tag [SMARAGD] und grüner Name', 'Haustiere in der Lobby', 'Eigene Runden starten (private Spiele)', '+75 % Coins in allen Modi', 'Alles aus Diamant'] },
    { id: 'diamant', name: 'Diamant', tag: 'DIAMANT', color: '#55FFFF', buy: true, price: '19,99 €', desc: 'Der beliebteste Rang – mit Fliegen in der Lobby.',
      perks: ['Chat-Tag [DIAMANT] und hellblauer Name', 'Fliegen in allen Lobbys', 'Gadgets und Partikel', '+50 % Coins in allen Modi', 'Alles aus Gold'] },
    { id: 'gold', name: 'Gold', tag: 'GOLD', color: '#FFAA00', buy: true, price: '9,99 €', desc: 'Schneller rein, mehr Coins.',
      perks: ['Chat-Tag [GOLD] und goldener Name', 'Volle Server betreten', 'Kosmetische Kill-Effekte', '+25 % Coins in allen Modi', 'Alles aus Eisen'] },
    { id: 'eisen', name: 'Eisen', tag: 'EISEN', color: '#D8DEE6', buy: true, price: '4,99 €', desc: 'Der Einstieg – dein erster Tag im Chat.',
      perks: ['Chat-Tag [EISEN] und heller Name', 'Farbige Nachrichten im Chat', '2 Kosmetik-Truhen pro Woche', '+10 % Coins in allen Modi'] },
    { id: 'spieler', name: 'Spieler', tag: '', color: '#AAB4C3', default: true, desc: 'Jeder, der auf Civicy spielt – ohne gekauften Rang.',
      perks: ['Alle Spielmodi ohne Einschränkung', 'Coins und Statistiken', 'Forum und Discord'] },
  ],

  // ── Team ─────────────────────────────────────────────────────────────────
  // name = Minecraft-Name (für Kopf und Skin), rank = id aus ranks. Optional: role, about, since, langs
  team: [
    { name: 'Civicy', rank: 'inhaber', role: 'Gründer & Leitung', since: '2026-01-10', about: 'Hat Civicy gegründet, um ein deutsches Netzwerk mit vielen Spielmodi aufzubauen, auf dem jeder seinen Lieblingsmodus findet.', langs: ['Deutsch', 'Englisch'] },
    { name: 'Beispiel_Admin', rank: 'admin', role: 'Server & Technik', since: '2026-02-01', about: 'Hält die Server am Laufen und schaut, dass jedes Update sauber ankommt.', langs: ['Deutsch'] },
    { name: 'Beispiel_Dev', rank: 'developer', role: 'Spielmodi', since: '2026-03-14', about: 'Programmiert BedWars, EggWars und LuckyWars.', langs: ['Deutsch', 'Englisch'] },
    { name: 'Beispiel_Mod', rank: 'moderator', role: 'Moderation', since: '2026-04-02', about: 'Ansprechpartner bei Hackern, Teaming und Meldungen.', langs: ['Deutsch'] },
    { name: 'Beispiel_Support', rank: 'supporter', role: 'Support', since: '2026-05-20', langs: ['Deutsch'] },
    { name: 'Beispiel_Builder', rank: 'builder', role: 'Lobby & Maps', since: '2026-03-01', about: 'Hat die Lobby mit dem Mondturm gebaut.', langs: ['Deutsch'] },
  ],

  // ── Stimmen aus dem Team (Startseite) ───────────────────────────────────
  quotes: [
    { text: 'Ein Netzwerk, unzählige Runden: Bei uns findest du immer ein Spiel, das gerade startet.', by: 'Civicy', role: 'Das Team' },
    { text: 'Ob BedWars mit Freunden oder ganz entspannt in CityBuild – hier spielst du, worauf du Lust hast.', by: 'Civicy', role: 'Das Team' },
    { text: 'Faire Runden sind uns wichtiger als alles andere. Hacker und Teaming haben bei uns keine Chance.', by: 'Civicy', role: 'Das Team' },
    { text: 'Der Mondturm in der Lobby war erst der Anfang. Jeden Monat kommt etwas Neues dazu.', by: 'Civicy', role: 'Das Team' },
  ],

  // ── Neuigkeiten ──────────────────────────────────────────────────────────
  // cat = id aus newsCats; body: Absätze (## am Anfang = Zwischenüberschrift, - = Liste)
  // buttons (optional, bis zu 2): { label, url } – z. B. zum Discord, zum Shop oder zu einer Anmeldung
  newsCats: [
    { id: 'update', name: 'Update', color: '#5CE1FF' },
    { id: 'event', name: 'Event', color: '#FFB547' },
    { id: 'modus', name: 'Neuer Modus', color: '#3EE08F' },
    { id: 'shop', name: 'Shop', color: '#FF55FF' },
    { id: 'wartung', name: 'Wartung', color: '#8392AA' },
    { id: 'team', name: 'Team', color: '#A78BFA' },
    { id: 'wichtig', name: 'Wichtig', color: '#FF5D6C' },
  ],
  news: [
    {
      id: 'beta-start', cat: 'wichtig', date: '2026-11-15', author: 'Civicy', cover: 'mondturm',
      title: 'Civicy ist online: Die Beta startet',
      teaser: 'BedWars, SkyWars, EggWars, LuckyWars, Epic Minigames, Murder Mystery und CityBuild – ab sofort auf einem Server.',
      body: [
        'Es ist so weit: Civicy ist online. Nach Monaten des Bauens und Testens öffnen wir die Beta für alle.',
        '## Was dich erwartet',
        '- Sieben Spielmodi vom ersten Tag an',
        '- Die Lobby mit dem Mondturm, Parkour und Geheimnissen',
        '- Coins, Statistiken und Kosmetik in allen Modi',
        '## Wie du mitmachst',
        'Öffne Minecraft, füge den Server mit der Adresse {ip} hinzu und wähle in der Lobby mit dem Kompass deinen Modus. Fehler und Ideen meldest du am besten im Forum oder auf Discord.',
      ],
      buttons: [{ label: 'Discord beitreten', url: 'https://discord.gg/' }],
    },
    {
      id: 'bedwars-turnier', cat: 'event', date: '2026-11-12', author: 'Beispiel_Mod',
      title: 'BedWars-Turnier: 4×4 um den Titel',
      teaser: 'Am 29. November spielen 16 Teams um den Turniersieg. Die Gewinner bekommen den Rang Diamant und einen eigenen Titel.',
      body: [
        'Stellt euer Team zusammen: Am Samstag, 29. November, ab 18 Uhr startet unser erstes BedWars-Turnier im Modus 4×4.',
        '## Preise',
        '- 1. Platz: Rang Diamant für alle vier und der Titel „Bettenjäger“',
        '- 2. Platz: Rang Gold für alle vier',
        '- 3. Platz: 50.000 Coins pro Spieler',
        'Die Anmeldung läuft bis zum 27. November über das Forum.',
      ],
      buttons: [{ label: 'Team anmelden', url: '#/forum' }],
    },
    {
      id: 'luckywars-update', cat: 'update', date: '2026-11-08', author: 'Beispiel_Dev',
      title: 'Update 0.4: 40 neue Lucky Blocks',
      teaser: 'LuckyWars bekommt 40 neue Überraschungen, zwei neue Maps und eine Statistik für deine besten Runden.',
      body: [
        'Mit Update 0.4 wird LuckyWars noch chaotischer.',
        '## Neu',
        '- 40 neue Lucky Blocks – darunter der Meteor und der Hühner-Regen',
        '- Zwei neue Maps: Pilzinsel und Wolkenstadt',
        '- Statistiken für Kills, Siege und geöffnete Blöcke',
        '## Behoben',
        'Spieler fallen nach dem Respawn nicht mehr durch die Map, und Pfeile treffen wieder zuverlässig.',
      ],
    },
    {
      id: 'shop-raenge', cat: 'shop', date: '2026-11-05', author: 'Civicy',
      title: 'Die Ränge sind da: Eisen bis Netherite',
      teaser: 'Fünf Ränge mit eigenem Chat-Tag, Farben, Kosmetik und mehr Coins. Jeder Kauf unterstützt den Server.',
      body: [
        'Ab heute gibt es fünf Ränge im Shop: Eisen, Gold, Diamant, Smaragd und Netherite.',
        'Jeder Rang bringt einen eigenen Chat-Tag, einen farbigen Namen und Vorteile wie Fliegen in der Lobby oder mehr Coins. Spielvorteile gibt es nicht – in den Runden sind alle gleich.',
      ],
      buttons: [{ label: 'Ränge ansehen', url: '#/raenge' }],
    },
    {
      id: 'wartung', cat: 'wartung', date: '2026-10-28', author: 'Beispiel_Admin',
      title: 'Wartung: Umzug auf neue Hardware',
      teaser: 'Am Sonntag ist das Netzwerk von 8 bis 10 Uhr nicht erreichbar. Danach läuft Civicy auf schnellerer Hardware.',
      body: [
        'Am Sonntag ziehen wir auf neue Server um. Von 8 bis 10 Uhr ist Civicy deshalb nicht erreichbar.',
        'Danach gibt es mehr Leistung, weniger Lags und Platz für mehr Runden gleichzeitig. Coins, Ränge und Statistiken ziehen natürlich mit um.',
      ],
    },
  ],

  // ── Forum ────────────────────────────────────────────────────────────────
  // staffOnly: true = nur das Team kann dort Themen erstellen
  forum: [
    { id: 'ankuendigungen', name: 'Ankündigungen', icon: 'megaphone', color: '#FF5D6C', desc: 'Neues vom Team. Antworten ist erlaubt, neue Themen nur fürs Team.', staffOnly: true },
    { id: 'allgemein', name: 'Allgemeines', icon: 'chats', color: '#5CE1FF', desc: 'Alles rund um Civicy, was sonst nirgends hinpasst.' },
    { id: 'modi', name: 'Spielmodi', icon: 'game-controller', color: '#3EE08F', desc: 'Taktiken, Maps und Runden – BedWars, SkyWars, EggWars und alle anderen.' },
    { id: 'hilfe', name: 'Hilfe & Support', icon: 'lifebuoy', color: '#FFB547', desc: 'Du kommst nicht weiter? Hier helfen Community und Team.' },
    { id: 'vorschlaege', name: 'Vorschläge', icon: 'lightbulb', color: '#A78BFA', desc: 'Ideen für neue Modi, Maps und Funktionen.' },
    { id: 'bugs', name: 'Bug-Reports', icon: 'bug', color: '#FF8A3D', desc: 'Fehler gefunden? Beschreib, was passiert ist und wie man es nachstellt.' },
    { id: 'offtopic', name: 'Off-Topic', icon: 'coffee', color: '#8392AA', desc: 'Musik, Filme, andere Spiele – alles, was nichts mit Civicy zu tun hat.' },
  ],
  // Beispiel-Themen für den Demo-Modus (ohne Backend)
  forumSeed: [
    { cat: 'ankuendigungen', title: 'Willkommen im Civicy-Forum!', author: 'Civicy', pinned: true, locked: false, date: '2026-11-15T12:00:00Z',
      posts: [
        { author: 'Civicy', date: '2026-11-15T12:00:00Z', body: 'Hallo zusammen!\n\nHier könnt ihr euch austauschen, Fragen stellen, Vorschläge machen und Fehler melden. Bitte haltet euch an die Regeln – sie gelten auch hier.\n\nViel Spaß!' },
        { author: 'Beispiel_Mod', date: '2026-11-15T13:10:00Z', body: 'Bei Fragen zum Forum einfach hier antworten.' },
      ] },
    { cat: 'modi', title: 'BedWars: Wie verteidigt ihr euer Bett am Anfang?', author: 'Beispiel_Builder', date: '2026-11-16T18:30:00Z',
      posts: [
        { author: 'Beispiel_Builder', date: '2026-11-16T18:30:00Z', body: 'Ich baue immer zuerst Wolle drum herum und dann eine Schicht Endstein. Reicht das, oder macht ihr das anders?' },
        { author: 'Beispiel_Dev', date: '2026-11-16T19:02:00Z', body: 'Wolle + Holz + Endstein. Und Glas oben drauf gegen TNT von oben.' },
      ] },
    { cat: 'vorschlaege', title: 'Vorschlag: Ranked-Modus für SkyWars', author: 'Beispiel_Support', date: '2026-11-17T09:15:00Z',
      posts: [
        { author: 'Beispiel_Support', date: '2026-11-17T09:15:00Z', body: 'Es wäre cool, wenn es für SkyWars eine Rangliste mit Saisons gäbe. Was meint ihr?' },
      ] },
    { cat: 'hilfe', title: 'Bedrock: Ich komme nicht auf den Server', author: 'Beispiel_Admin', date: '2026-11-17T20:45:00Z',
      posts: [
        { author: 'Beispiel_Admin', date: '2026-11-17T20:45:00Z', body: 'Falls jemand das Problem hat: Auf Bedrock unbedingt den Port {port} angeben. Auf Konsolen geht es über die Freundesliste oder eine DNS-Umleitung.' },
      ] },
  ],

  // ── Regeln ───────────────────────────────────────────────────────────────
  rules: [
    {
      title: 'Miteinander', icon: 'handshake',
      items: [
        ['Respekt', 'Beleidigungen, Diskriminierung, Drohungen und Belästigung sind verboten – im Chat, im Forum und auf Discord.'],
        ['Kein Spam', 'Keine Nachrichten-Fluten, kein übermäßiges Schreiben in Großbuchstaben und keine Werbung für andere Server.'],
        ['Namen & Skins', 'Anstößige Namen, Skins, Chat-Tags oder Profilbilder sind verboten.'],
        ['Privatsphäre', 'Teile keine persönlichen Daten von dir oder anderen (Adresse, Telefonnummer, Fotos).'],
      ],
    },
    {
      title: 'Fair spielen', icon: 'shield-check',
      items: [
        ['Keine Cheats', 'Hacked Clients, X-Ray, Auto-Clicker, Reach, Kill-Aura und ähnliche Mods sind verboten. Erlaubt sind z. B. Optifine, Sodium, Lunar und Badlion ohne unfaire Module.'],
        ['Kein Teaming', 'In Solo-Runden darfst du dich nicht mit anderen Spielern verbünden. Auch Cross-Teaming in Team-Modi ist verboten.'],
        ['Keine Bugs ausnutzen', 'Fehler und Lücken meldest du im Forum unter Bug-Reports – Ausnutzen wird bestraft.'],
        ['Ein Konto', 'Zweitkonten, um Strafen zu umgehen oder Statistiken zu pushen, sind verboten.'],
      ],
    },
    {
      title: 'In den Spielmodi', icon: 'game-controller',
      items: [
        ['Spiel zu Ende', 'Absichtliches Verlassen, um Statistiken zu schützen, und AFK-Farmen von Coins sind verboten.'],
        ['Kein Stat-Boosting', 'Runden mit Absprachen, um Siege oder Kills zu sammeln, sind verboten.'],
        ['CityBuild', 'Fremde Grundstücke nicht betreten, verändern oder bestehlen. Keine anstößigen Bauten und keine Lag-Maschinen.'],
      ],
    },
    {
      title: 'Handel & Käufe', icon: 'coins',
      items: [
        ['Ehrlich handeln', 'Betrug beim Handel in CityBuild, Fake-Shops und gebrochene Abmachungen sind verboten.'],
        ['Kein Echtgeld', 'Items, Coins oder Konten dürfen nicht gegen echtes Geld gehandelt werden.'],
        ['Rückbuchungen', 'Wer einen Kauf zurückbucht, verliert den Rang und wird bis zur Klärung gesperrt.'],
      ],
    },
  ],

  // ── Häufige Fragen ───────────────────────────────────────────────────────
  // home: true = auch auf der Startseite
  faq: [
    { q: 'Wie komme ich auf Civicy?', a: ['Öffne Minecraft (Java Edition), klicke auf „Mehrspieler“ → „Server hinzufügen“ und gib als Adresse {ip} ein. In der Lobby wählst du mit dem Kompass deinen Spielmodus.'], home: true },
    { q: 'Kann ich mit Bedrock (Handy, Konsole, Windows) spielen?', a: ['Ja. Füge auf Bedrock einen Server mit der Adresse {bedrock} und dem Port {port} hinzu. Du spielst mit allen anderen zusammen.'], home: true },
    { q: 'Welche Spielmodi gibt es?', a: ['BedWars, SkyWars, EggWars, LuckyWars, Epic Minigames, Murder Mystery und CityBuild. Weitere Modi sind in Arbeit – Vorschläge gerne ins Forum.'], home: true },
    { q: 'Kostet Civicy etwas?', a: ['Nein. Alle Spielmodi sind kostenlos. Ränge im Shop sind freiwillig und bringen nur Kosmetik, einen Chat-Tag und mehr Coins – keine Vorteile im Kampf.'], home: true },
    { q: 'Wie bekomme ich einen Rang?', a: ['Ränge wie Eisen, Gold, Diamant, Smaragd und Netherite gibt es im Shop. Nach dem Kauf hast du den Rang sofort im Spiel und auf der Webseite. Alle Ränge findest du unter „Ränge“.'] },
    { q: 'Warum melde ich mich auf der Webseite mit Microsoft an?', a: ['Dein Minecraft-Konto ist ein Microsoft-Konto. Über die Anmeldung wissen wir sicher, wer du bist – und zeigen dir deinen echten Skin, deinen Namen und deinen Rang. Damit kannst du auch im Forum schreiben.', 'Dein Passwort gibst du nur bei Microsoft ein. Wir sehen es nie. Alternativ kannst du dich mit einem Code anmelden, den du im Spiel mit /weblogin bekommst.'], home: true },
    { q: 'Wie werde ich Teil des Teams?', a: ['Unter Karriere findest du alle offenen Stellen. Melde dich an, wähle eine Stelle und beantworte ein paar kurze Fragen – wir melden uns auf Discord.'] },
    { q: 'Ich wurde gebannt. Was jetzt?', a: ['Du kannst im Forum unter „Hilfe & Support“ oder auf Discord einen Entbannungsantrag stellen. Schreib ehrlich, was passiert ist – jeder Antrag wird gelesen.'] },
  ],

  // ── Karriere ─────────────────────────────────────────────────────────────
  // open: false = Stelle wird gezeigt, Bewerbung ist aber geschlossen
  jobs: [
    {
      id: 'supporter', dept: 'Community', title: 'Supporter', open: true, time: '3–5 Std. pro Woche', age: 'ab 14 Jahren',
      teaser: 'Erster Ansprechpartner für Spieler – im Spiel, im Forum und auf Discord.',
      tasks: ['Fragen von Spielern beantworten', 'Tickets und Forenbeiträge bearbeiten', 'Neue Spieler in der Lobby begrüßen', 'Fehler an das Team weitergeben'],
      needs: ['Freundlich und geduldig', 'Kennst die Spielmodi auf Civicy', 'Discord und ein funktionierendes Mikrofon', 'Mindestens 10 Stunden Spielzeit auf Civicy'],
    },
    {
      id: 'moderator', dept: 'Community', title: 'Moderator', open: true, time: '5–8 Std. pro Woche', age: 'ab 16 Jahren',
      teaser: 'Sorgt dafür, dass die Regeln eingehalten werden – gegen Hacker, Teaming und Beleidigungen.',
      tasks: ['Chat, Runden und Forum im Blick behalten', 'Meldungen und Replays prüfen', 'Strafen nach dem Strafenkatalog verhängen', 'Entbannungsanträge mit bearbeiten'],
      needs: ['Erfahrung als Supporter oder auf einem anderen Server', 'Erkennst Hacks und Teaming', 'Ruhig, fair und neutral'],
    },
    {
      id: 'builder', dept: 'Bau', title: 'Builder', open: true, time: 'Nach Projekt', age: 'ab 14 Jahren',
      teaser: 'Baut Maps für BedWars, SkyWars, EggWars und die Lobby.',
      tasks: ['Maps für alle Spielmodi bauen', 'Lobbys und Event-Welten gestalten', 'Bestehende Maps verbessern'],
      needs: ['Ein Portfolio mit Screenshots deiner Bauten', 'Erfahrung mit WorldEdit (oder FAWE)', 'Gefühl dafür, was eine faire Map ausmacht'],
    },
    {
      id: 'developer', dept: 'Entwicklung', title: 'Minigame-Developer', open: true, time: 'Nach Absprache', age: 'ab 16 Jahren',
      teaser: 'Entwickelt neue Spielmodi und verbessert die bestehenden (Java, Paper-API).',
      tasks: ['Neue Minigames planen und programmieren', 'Bestehende Modi verbessern und Fehler beheben', 'Code-Reviews im Team'],
      needs: ['Sicher in Java und der Paper- oder Spigot-API', 'Erfahrung mit Git', 'Gerne: Datenbanken (MySQL, Redis) und Netzwerke (Velocity)'],
    },
    {
      id: 'creator', dept: 'Medien', title: 'Content Creator', open: false, time: 'Frei', age: 'ab 14 Jahren',
      teaser: 'Zeigt Civicy auf YouTube, TikTok oder Twitch – mit dem Rang Creator und Vorab-Zugang zu Updates.',
      tasks: ['Videos, Clips oder Streams über Civicy', 'Neue Modi und Updates vorstellen'],
      needs: ['Ein Kanal mit regelmäßigen Inhalten', 'Mindestens 500 Abonnenten oder Follower'],
    },
  ],
  // Fragen in Schritt 2 der Bewerbung (für alle Stellen gleich)
  jobQuestions: [
    { id: 'why', label: 'Warum möchtest du diese Stelle?', min: 80 },
    { id: 'exp', label: 'Welche Erfahrung bringst du mit?', min: 40, hint: 'Andere Server, Projekte, Teams – oder was du dir selbst beigebracht hast.' },
    { id: 'case', label: 'In einer Solo-Runde SkyWars arbeiten zwei Spieler offensichtlich zusammen. Was tust du?', min: 40 },
  ],
};
