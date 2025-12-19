export default {
  // Language Info
  langCode: 'de',
  langName: 'Deutsch',

  // Header
  header: {
    welcome: 'Willkommen',
    logout: 'Abmelden',
    password: 'Passwort',
    maxConnections: 'Max. Verbindungen',
    activeConnections: 'Aktive Verbindungen',
    expiryDate: 'Ablaufdatum',
    unlimited: 'Unbegrenzt',
    statusActive: 'Aktiv',
    statusInactive: 'Inaktiv'
  },

  // Navigation
  nav: {
    liveTV: 'Live TV',
    movies: 'Filme',
    series: 'Serien'
  },

  // Login
  login: {
    title: 'TESLA TV',
    username: 'Benutzername',
    password: 'Passwort',
    rememberMe: 'Anmeldedaten merken',
    loginButton: 'Anmelden',
    loggingIn: '⏳ Anmeldung läuft...',
    errorInvalidCredentials: 'Ungültige Anmeldedaten',
    errorLoadingData: 'Fehler beim Laden der Benutzerdaten',
    errorConnection: 'Verbindungsfehler: ',
    errorServerStatus: 'Server antwortete mit Status ',
    errorNoResponse: 'Keine Antwort vom Server',
    errorMissingFields: 'Bitte Benutzername und Passwort eingeben',
    errorServerNotConfigured: 'Server nicht konfiguriert. Bitte Admin-Setup durchführen.'
  },

  // LiveTV
  liveTV: {
    title: 'Live TV Kanäle',
    categories: 'Kategorien',
    allChannels: 'Alle Kanäle',
    searchPlaceholder: 'Kanal suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    live: 'LIVE',
    channelsShowing: 'Kanäle angezeigt',
    streamInfo: 'Stream-Informationen',
    channelId: 'Kanal ID',
    bitrate: 'Bitrate',
    detecting: 'Wird ermittelt...',
    epg: 'EPG (Elektronischer Programmführer)',
    noEpgData: 'Keine EPG-Daten verfügbar',
    categoryAction: 'Action',
    categoryComedy: 'Komödie',
    categoryDrama: 'Drama',
    categoryDocumentary: 'Dokumentation',
    categoryNews: 'Nachrichten',
    categorySports: 'Sport',
    categoryKids: 'Kinder',
    categoryMusic: 'Musik',
    categoryNature: 'Natur'
  },

  // Movies
  movies: {
    title: 'Filme',
    categories: 'Kategorien',
    allMovies: 'Alle Filme',
    searchPlaceholder: 'Film suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    moviesShowing: 'Filme angezeigt',
    categoryAction: 'Action',
    categoryComedy: 'Komödie',
    categoryDrama: 'Drama',
    categoryHorror: 'Horror',
    categorySciFi: 'Science-Fiction',
    categoryRomance: 'Romantik',
    categoryThriller: 'Thriller',
    categoryAnimation: 'Animation',
    categoryDocumentary: 'Dokumentation'
  },

  // Series
  series: {
    title: 'Serien',
    categories: 'Kategorien',
    allSeries: 'Alle Serien',
    searchPlaceholder: 'Serie suchen...',
    noResults: 'Keine Ergebnisse gefunden',
    seriesShowing: 'Serien angezeigt',
    season: 'Staffel',
    episode: 'Folge',
    categoryAction: 'Action',
    categoryComedy: 'Komödie',
    categoryDrama: 'Drama',
    categoryHorror: 'Horror',
    categorySciFi: 'Science-Fiction',
    categoryRomance: 'Romantik',
    categoryThriller: 'Thriller',
    categoryAnimation: 'Animation',
    categoryDocumentary: 'Dokumentation'
  },

  // Admin Area
  admin: {
    title: 'Admin Panel',
    setup: {
      title: 'TESLA TV Admin',
      subtitle: 'Ersteinrichtung',
      step: 'Schritt',
      of: 'von',
      stepServerTitle: 'Server-Konfiguration',
      stepServerDesc: 'XuiOne Panel Verbindungsdaten eingeben',
      stepAdminTitle: 'Admin-Benutzer erstellen',
      stepAdminDesc: 'Lokalen Admin-Benutzer mit sicheren Anmeldedaten erstellen',
      serverUrl: 'Server URL',
      serverUrlPlaceholder: 'z.B. 144.76.200.209 oder domain.com',
      port: 'Port',
      portPlaceholder: 'z.B. 80 oder 443',
      accessCode: 'Access Code',
      accessCodePlaceholder: 'XuiOne Access Code',
      apiKey: 'API-KEY',
      apiKeyPlaceholder: 'XuiOne API-KEY',
      testConnection: 'Verbindung testen',
      testing: '⏳ Teste Verbindung...',
      connectionSuccess: '✓ Verbindung erfolgreich!',
      continue: 'Weiter zur Admin-Benutzer-Erstellung',
      adminUsername: 'Admin Benutzername',
      adminUsernamePlaceholder: 'Admin Benutzername',
      adminPassword: 'Admin Passwort',
      adminPasswordPlaceholder: 'Sicheres Passwort',
      adminPasswordConfirm: 'Passwort bestätigen',
      adminPasswordConfirmPlaceholder: 'Passwort wiederholen',
      passwordRequirements: 'Passwort-Anforderungen:',
      requirement12Chars: 'Mindestens 12 Zeichen',
      requirementLowercase: 'Mindestens 1 Kleinbuchstabe',
      requirementUppercase: 'Mindestens 1 Großbuchstabe',
      requirementSpecial: 'Mindestens 1 Sonderzeichen',
      passwordStrength: 'Passwort-Stärke:',
      strengthWeak: 'Schwach',
      strengthMedium: 'Mittel',
      strengthStrong: 'Stark',
      setupComplete: 'Setup abschließen',
      settingUp: '⏳ Richte Admin-Benutzer ein...',
      errorPasswordMismatch: 'Passwörter stimmen nicht überein',
      defaultLanguage: 'Standard-Sprache',
      defaultLanguageDesc: 'Wählen Sie die Standard-Sprache für Benutzer'
    },
    login: {
      title: 'Admin Login',
      username: 'Admin Benutzername',
      usernamePlaceholder: 'Admin Benutzername',
      password: 'Passwort',
      passwordPlaceholder: 'Passwort',
      loginButton: 'Anmelden',
      loggingIn: '⏳ Anmeldung läuft...',
      errorInvalidCredentials: 'Ungültige Anmeldedaten'
    },
    tabs: {
      serverSettings: 'Server-Einstellungen',
      userLines: 'Benutzer-Lines',
      settings: 'Einstellungen'
    }
  },

  // Common
  common: {
    language: 'Sprache',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    search: 'Suchen',
    loading: 'Lädt...',
    error: 'Fehler',
    success: 'Erfolgreich'
  }
};
