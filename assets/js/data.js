/*
 * Civicy – Inhalte der Webseite
 * Alles hier ist Beispiel-Inhalt und kann frei angepasst werden: Ränge, Team, Neuigkeiten, Regeln, FAQ und Stellen.
 * Icons: Namen aus assets/js/icons.js (Phosphor Icons).
 */
window.CIVICY_DATA = {
  // ── Ränge ────────────────────────────────────────────────────────────────
  // staff: true = Teamrang (wird auf der Team-Seite gezeigt). Die Reihenfolge ist die Rangfolge (oben = höchster).
  ranks: [
    { id: 'inhaber', name: 'Inhaber', color: '#5CE1FF', staff: true, group: 'Leitung', desc: 'Gründer und Leitung von Civicy. Entscheidet über Richtung, Team und Welt.' },
    { id: 'admin', name: 'Admin', color: '#FF5D6C', staff: true, group: 'Leitung', desc: 'Verwaltet Server, Plugins und das Team.' },
    { id: 'developer', name: 'Developer', color: '#A78BFA', staff: true, group: 'Entwicklung', desc: 'Schreibt Plugins und Systeme, die es nur auf Civicy gibt.' },
    { id: 'moderator', name: 'Moderator', color: '#4F8BFF', staff: true, group: 'Community', desc: 'Sorgt im Spiel und auf Discord dafür, dass die Regeln eingehalten werden.' },
    { id: 'supporter', name: 'Supporter', color: '#3EE08F', staff: true, group: 'Community', desc: 'Erste Hilfe bei Fragen – im Spiel, im Ticket und auf Discord.' },
    { id: 'builder', name: 'Builder', color: '#FFB547', staff: true, group: 'Bau', desc: 'Baut Spawn, Events und alles, was die Welt besonders macht.' },
    { id: 'creator', name: 'Creator', color: '#F472B6', staff: false, desc: 'Zeigt Civicy auf YouTube, TikTok oder Twitch.' },
    // Spielränge: steigen mit der Zeit auf dem Server und dem, was du für deine Stadt tust
    { id: 'legende', name: 'Legende', color: '#FFD34D', level: 6, desc: 'Hat Civicy geprägt wie kaum jemand.', perks: ['Eigener Titel und Partikel', '10 Grundstücke', 'Zugang zur Ruhmeshalle'] },
    { id: 'buergermeister', name: 'Bürgermeister', color: '#2EE6AA', level: 5, desc: 'Leitet eine eigene Stadt mit mindestens 10 Einwohnern.', perks: ['Stadt mit eigenen Gesetzen', '8 Grundstücke', 'Steuern festlegen'] },
    { id: 'ratsmitglied', name: 'Ratsmitglied', color: '#7FE8FF', level: 4, desc: 'Sitzt im Stadtrat und entscheidet mit.', perks: ['Stimmrecht im Rat', '6 Grundstücke', '/nick'] },
    { id: 'haendler', name: 'Händler', color: '#C4B5FD', level: 3, desc: 'Betreibt einen eigenen Laden auf dem Markt.', perks: ['Eigener Marktstand', '4 Grundstücke', '3 Shop-Schilder'] },
    { id: 'buerger', name: 'Bürger', color: '#9CC7E8', level: 2, desc: 'Wohnt fest in einer Stadt.', perks: ['Einer Stadt beitreten', '2 Grundstücke', '/home ×3'] },
    { id: 'neuling', name: 'Neuling', color: '#8392AA', level: 1, default: true, desc: 'Gerade angekommen – willkommen auf Civicy!', perks: ['Starter-Kit', '1 Grundstück', 'Hilfe vom Team'] },
  ],

  // ── Team ─────────────────────────────────────────────────────────────────
  // name = Minecraft-Name (für Kopf und Skin), rank = id aus ranks. Optional: uuid, role, about, since, discord, langs
  team: [
    { name: 'Civicy', rank: 'inhaber', role: 'Gründer & Leitung', since: '2026-01-10', about: 'Hat Civicy gegründet, weil es keinen Server gab, auf dem Städte wirklich von Spielern regiert werden.', langs: ['Deutsch', 'Englisch'] },
    { name: 'Beispiel_Admin', rank: 'admin', role: 'Server & Technik', since: '2026-02-01', about: 'Hält die Server am Laufen und schaut, dass jedes Update sauber ankommt.', langs: ['Deutsch'] },
    { name: 'Beispiel_Dev', rank: 'developer', role: 'Plugins', since: '2026-03-14', about: 'Baut das Stadt- und Wirtschaftssystem.', langs: ['Deutsch', 'Englisch'] },
    { name: 'Beispiel_Mod', rank: 'moderator', role: 'Moderation', since: '2026-04-02', about: 'Ansprechpartner bei Streit, Griefing und Meldungen.', langs: ['Deutsch'] },
    { name: 'Beispiel_Support', rank: 'supporter', role: 'Support', since: '2026-05-20', langs: ['Deutsch'] },
    { name: 'Beispiel_Builder', rank: 'builder', role: 'Spawn & Events', since: '2026-03-01', about: 'Hat den Spawn mit dem Mondturm gebaut.', langs: ['Deutsch'] },
  ],

  // ── Stimmen aus dem Team (Startseite) ───────────────────────────────────
  quotes: [
    { text: 'Auf Civicy baust du nicht nur ein Haus – du baust eine Stadt, die nach dir weiterlebt.', by: 'Civicy', role: 'Das Team' },
    { text: 'Jede Stadt hat ihre eigenen Gesetze. Was gilt, entscheidet nicht das Team, sondern ihr.', by: 'Civicy', role: 'Das Team' },
    { text: 'Handel, Politik, Abenteuer: Hier zählt, was du für deine Gemeinschaft tust.', by: 'Civicy', role: 'Das Team' },
    { text: 'Der Mondturm am Spawn war erst der Anfang. Der Rest der Welt gehört euch.', by: 'Civicy', role: 'Das Team' },
  ],

  // ── Merkmale (Startseite) ────────────────────────────────────────────────
  features: [
    { icon: 'buildings', title: 'Städte gründen', text: 'Gründe mit Freunden eine Stadt, verteile Grundstücke und wachse vom Dorf zur Metropole.' },
    { icon: 'gavel', title: 'Eigene Gesetze', text: 'Bürgermeister und Rat bestimmen Steuern, Bauregeln und wer in die Stadt darf.' },
    { icon: 'coins', title: 'Echte Wirtschaft', text: 'Spieler machen die Preise: Läden, Marktplatz und Aufträge zwischen Städten.' },
    { icon: 'shield-check', title: 'Geschützte Grundstücke', text: 'Was du baust, bleibt dein. Kein Griefing, kein Diebstahl – dafür sorgt das Claim-System.' },
    { icon: 'sword', title: 'Abenteuer & Dungeons', text: 'Erkunde die Wildnis, besiege Bosse und bring seltene Schätze zurück in deine Stadt.' },
    { icon: 'confetti', title: 'Events jede Woche', text: 'Bauwettbewerbe, Rennen, Turniere und Feste – mit Preisen für die ganze Stadt.' },
  ],

  // ── Neuigkeiten ──────────────────────────────────────────────────────────
  // cat = id aus newsCats; body: Absätze (## am Anfang = Zwischenüberschrift, - = Liste)
  newsCats: [
    { id: 'update', name: 'Update', color: '#5CE1FF' },
    { id: 'event', name: 'Event', color: '#FFB547' },
    { id: 'community', name: 'Community', color: '#3EE08F' },
    { id: 'wartung', name: 'Wartung', color: '#8392AA' },
    { id: 'team', name: 'Team', color: '#A78BFA' },
    { id: 'wichtig', name: 'Wichtig', color: '#FF5D6C' },
  ],
  news: [
    {
      id: 'beta-start', cat: 'wichtig', date: '2026-11-15', author: 'Civicy', cover: 'mondturm',
      title: 'Civicy öffnet die Tore: Die Beta startet',
      teaser: 'Ab sofort kannst du auf Civicy spielen. Gründe die erste Stadt, sichere dir dein Grundstück und hilf uns, den Server besser zu machen.',
      body: [
        'Es ist so weit: Civicy ist online. Nach Monaten des Bauens und Testens öffnen wir die Beta für alle.',
        '## Was dich erwartet',
        '- Der Spawn mit dem Mondturm und dem ersten Marktplatz',
        '- Städte gründen, Grundstücke sichern und Bürger einladen',
        '- Die ersten Spielränge – vom Neuling bis zur Legende',
        '## Wie du mitmachst',
        'Öffne Minecraft, füge den Server mit der Adresse play.civicy.de hinzu und verbinde dich. Fehler und Ideen meldest du am besten direkt auf unserem Discord.',
      ],
    },
    {
      id: 'bauwettbewerb', cat: 'event', date: '2026-11-12', author: 'Beispiel_Builder',
      title: 'Bauwettbewerb: Das schönste Rathaus',
      teaser: 'Zwei Wochen Zeit, ein Thema: Baut das schönste Rathaus für eure Stadt. Die Gewinner-Stadt bekommt ein eigenes Denkmal am Spawn.',
      body: [
        'Jede Stadt braucht ein Herz. Baut bis zum 30. November das schönste Rathaus – allein oder als ganze Stadt.',
        '## Preise',
        '- 1. Platz: Denkmal am Spawn und 50.000 Taler für die Stadtkasse',
        '- 2. Platz: 25.000 Taler',
        '- 3. Platz: 10.000 Taler',
        'Die Jury besteht aus dem Bau-Team. Zusätzlich gibt es einen Publikumspreis, über den ihr auf Discord abstimmt.',
      ],
    },
    {
      id: 'wirtschaft-update', cat: 'update', date: '2026-11-08', author: 'Beispiel_Dev',
      title: 'Update 0.4: Marktplatz und Handelsaufträge',
      teaser: 'Der Marktplatz am Spawn ist eröffnet. Dazu kommen Handelsaufträge zwischen Städten und ein neues Steuersystem.',
      body: [
        'Mit Update 0.4 bekommt Civicy eine echte Wirtschaft.',
        '## Neu',
        '- Marktplatz am Spawn mit mietbaren Ständen',
        '- Handelsaufträge: Städte können Rohstoffe bei anderen Städten bestellen',
        '- Steuern: Bürgermeister legen fest, wie viel die Bürger zahlen',
        '- /preise zeigt den Durchschnittspreis jedes Items',
        '## Behoben',
        'Grundstücke an Chunk-Grenzen werden jetzt richtig angezeigt, und Shop-Schilder verschwinden nicht mehr nach einem Neustart.',
      ],
    },
    {
      id: 'team-sucht', cat: 'team', date: '2026-11-03', author: 'Civicy',
      title: 'Wir suchen Verstärkung im Team',
      teaser: 'Supporter, Moderatoren und Builder gesucht: Hilf mit, Civicy zum besten Städte-Server zu machen.',
      body: [
        'Civicy wächst – und wir brauchen Hilfe. Gerade suchen wir Supporter, Moderatoren und Builder.',
        'Alle offenen Stellen und die Bewerbung findest du unter Karriere. Die Bewerbung dauert nur ein paar Minuten, du meldest dich dafür mit deinem Minecraft-Konto an.',
      ],
    },
    {
      id: 'wartung-1121', cat: 'wartung', date: '2026-10-28', author: 'Beispiel_Admin',
      title: 'Wartung: Umzug auf neue Hardware',
      teaser: 'Am Sonntag ist der Server von 8 bis 10 Uhr nicht erreichbar. Danach läuft Civicy auf schnellerer Hardware.',
      body: [
        'Am Sonntag ziehen wir auf einen neuen Server um. Von 8 bis 10 Uhr ist Civicy deshalb nicht erreichbar.',
        'Danach gibt es mehr Leistung, weniger Lags und Platz für mehr Spieler. Eure Welt, Grundstücke und Inventare ziehen natürlich mit um.',
      ],
    },
  ],

  // ── Regeln ───────────────────────────────────────────────────────────────
  rules: [
    {
      title: 'Miteinander', icon: 'handshake',
      items: [
        ['Respekt', 'Beleidigungen, Diskriminierung, Drohungen und Belästigung sind verboten – im Chat, auf Schildern und auf Discord.'],
        ['Kein Spam', 'Keine Nachrichten-Fluten, kein übermäßiges Schreiben in Großbuchstaben und keine Werbung für andere Server.'],
        ['Deutsch & Englisch', 'Im öffentlichen Chat wird Deutsch oder Englisch geschrieben, damit alle mitlesen können.'],
        ['Privatsphäre', 'Teile keine persönlichen Daten von dir oder anderen (Adresse, Telefonnummer, Fotos).'],
      ],
    },
    {
      title: 'Fair spielen', icon: 'shield-check',
      items: [
        ['Keine Cheats', 'Hacked Clients, X-Ray, Auto-Clicker, Fly- oder Kill-Aura-Mods sind verboten. Erlaubt sind z. B. Optifine, Sodium, Minimaps ohne Höhlen-Ansicht und Shader.'],
        ['Keine Bugs ausnutzen', 'Fehler, Duplikations-Tricks und Lücken meldest du dem Team – Ausnutzen wird bestraft.'],
        ['Ein Konto', 'Pro Person ist ein Konto erlaubt. Zweitkonten, um Strafen oder Limits zu umgehen, sind verboten.'],
        ['Farmen mit Maß', 'Große Redstone-Farmen und Lag-Maschinen nur nach Absprache mit dem Team.'],
      ],
    },
    {
      title: 'Bauen & Städte', icon: 'buildings',
      items: [
        ['Kein Griefing', 'Fremde Bauten zerstören, verändern oder bestehlen ist verboten – auch auf ungesicherten Flächen.'],
        ['Sauber bauen', 'Keine 1×1-Türme, schwebenden Erdblöcke oder halbfertigen Ruinen in der Nähe anderer Städte.'],
        ['Stadtgesetze', 'Jede Stadt darf eigene Regeln haben. Sie dürfen aber nicht gegen diese Serverregeln verstoßen.'],
        ['Unangemessene Bauten', 'Anstößige, politisch extreme oder beleidigende Bauten werden ohne Warnung entfernt.'],
      ],
    },
    {
      title: 'Handel & PvP', icon: 'coins',
      items: [
        ['Ehrlich handeln', 'Betrug beim Handel, Fake-Shops und nicht eingehaltene Abmachungen sind verboten.'],
        ['Kein Echtgeld', 'Items, Taler oder Grundstücke dürfen nicht gegen echtes Geld gehandelt werden.'],
        ['PvP nur in Zonen', 'Kämpfe nur in der Wildnis und in PvP-Arenen. Spawn-Killing und Fallen am Spawn sind verboten.'],
      ],
    },
  ],

  // ── Häufige Fragen ───────────────────────────────────────────────────────
  // home: true = auch auf der Startseite
  faq: [
    { q: 'Wie komme ich auf Civicy?', a: ['Öffne Minecraft (Java Edition), klicke auf „Mehrspieler“ → „Server hinzufügen“ und gib als Adresse {ip} ein. Fertig – verbinde dich und du landest am Spawn.'], home: true },
    { q: 'Kann ich mit Bedrock (Handy, Konsole, Windows) spielen?', a: ['Ja. Füge auf Bedrock einen Server mit der Adresse {bedrock} und dem Port {port} hinzu. Du spielst in derselben Welt wie alle anderen.'], home: true },
    { q: 'Welche Version brauche ich?', a: ['Civicy läuft auf Minecraft {version}. Ältere Versionen können sich meist auch verbinden, wir empfehlen aber immer die neueste.'], home: true },
    { q: 'Kostet Civicy etwas?', a: ['Nein. Civicy ist kostenlos. Du brauchst nur ein gekauftes Minecraft.'], home: true },
    { q: 'Wie gründe ich eine Stadt?', a: ['Mit /stadt gruenden <Name> an einer freien Stelle in der Welt. Dafür brauchst du mindestens den Rang Bürger und 5.000 Taler. Danach kannst du mit /stadt einladen <Spieler> Bürger aufnehmen.'] },
    { q: 'Warum melde ich mich auf der Webseite mit Microsoft an?', a: ['Dein Minecraft-Konto ist ein Microsoft-Konto. Über die Anmeldung wissen wir sicher, dass du wirklich du bist – und können dir deinen Skin, deinen Namen und deinen Rang zeigen.', 'Dein Passwort gibst du nur bei Microsoft ein. Wir sehen es nie.'], home: true },
    { q: 'Wie werde ich Teil des Teams?', a: ['Unter Karriere findest du alle offenen Stellen. Melde dich an, wähle eine Stelle und beantworte ein paar kurze Fragen – wir melden uns auf Discord.'] },
    { q: 'Ich wurde gebannt. Was jetzt?', a: ['Du kannst auf Discord einen Entbannungsantrag stellen. Schreib ehrlich, was passiert ist – jeder Antrag wird vom Team gelesen.'] },
  ],

  // ── Karriere ─────────────────────────────────────────────────────────────
  // open: false = Stelle wird gezeigt, Bewerbung ist aber geschlossen
  jobs: [
    {
      id: 'supporter', dept: 'Community', title: 'Supporter', open: true, time: '3–5 Std. pro Woche', age: 'ab 14 Jahren',
      teaser: 'Erster Ansprechpartner für neue Spieler – im Spiel, im Ticket und auf Discord.',
      tasks: ['Fragen von Spielern beantworten', 'Neue Spieler am Spawn begrüßen und einführen', 'Tickets auf Discord bearbeiten', 'Fehler und Probleme an das Team weitergeben'],
      needs: ['Freundlich und geduldig', 'Gute Kenntnisse in Minecraft und auf Civicy', 'Discord und ein funktionierendes Mikrofon', 'Mindestens 10 Stunden Spielzeit auf Civicy'],
    },
    {
      id: 'moderator', dept: 'Community', title: 'Moderator', open: true, time: '5–8 Std. pro Woche', age: 'ab 16 Jahren',
      teaser: 'Sorgt dafür, dass die Regeln eingehalten werden, und schlichtet Streit fair.',
      tasks: ['Chat und Spiel im Blick behalten', 'Meldungen und Griefing prüfen', 'Strafen nach dem Strafenkatalog verhängen', 'Entbannungsanträge mit bearbeiten'],
      needs: ['Erfahrung als Supporter oder auf einem anderen Server', 'Ruhig, fair und neutral', 'Gutes Deutsch in Wort und Schrift'],
    },
    {
      id: 'builder', dept: 'Bau', title: 'Builder', open: true, time: 'Nach Projekt', age: 'ab 14 Jahren',
      teaser: 'Baut Spawn, Event-Welten und Dungeons im Stil von Civicy.',
      tasks: ['Bauten für Spawn, Events und Dungeons', 'Mitarbeit an großen Gemeinschafts-Projekten', 'Terraforming und Gestaltung der Landschaft'],
      needs: ['Ein Portfolio mit Screenshots deiner Bauten', 'Erfahrung mit WorldEdit (oder FAWE)', 'Gefühl für Stil, Farben und Details'],
    },
    {
      id: 'developer', dept: 'Entwicklung', title: 'Plugin-Developer', open: true, time: 'Nach Absprache', age: 'ab 16 Jahren',
      teaser: 'Entwickelt Plugins für Städte, Wirtschaft und Events (Java, Paper-API).',
      tasks: ['Neue Systeme für Civicy planen und programmieren', 'Bestehende Plugins verbessern und Fehler beheben', 'Code-Reviews im Team'],
      needs: ['Sicher in Java und der Paper- oder Spigot-API', 'Erfahrung mit Git', 'Gerne: Datenbanken (MySQL, Redis)'],
    },
    {
      id: 'creator', dept: 'Medien', title: 'Content Creator', open: false, time: 'Frei', age: 'ab 14 Jahren',
      teaser: 'Zeigt Civicy auf YouTube, TikTok oder Twitch – mit eigenem Rang und Vorab-Zugang zu Updates.',
      tasks: ['Videos, Clips oder Streams über Civicy', 'Neue Updates vorstellen'],
      needs: ['Ein Kanal mit regelmäßigen Inhalten', 'Mindestens 500 Abonnenten oder Follower'],
    },
  ],
  // Fragen in Schritt 2 der Bewerbung (für alle Stellen gleich)
  jobQuestions: [
    { id: 'why', label: 'Warum möchtest du diese Stelle?', min: 80 },
    { id: 'exp', label: 'Welche Erfahrung bringst du mit?', min: 40, hint: 'Andere Server, Projekte, Teams – oder was du dir selbst beigebracht hast.' },
    { id: 'case', label: 'Ein Spieler beleidigt im Chat andere und hört nicht auf. Was tust du?', min: 40 },
  ],
};
