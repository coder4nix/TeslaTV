export default {
  // Language Info
  langCode: 'tr',
  langName: 'Türkçe',

  // Header
  header: {
    welcome: 'Hoşgeldiniz',
    logout: 'Çıkış Yap',
    password: 'Şifre',
    maxConnections: 'Maks. Bağlantı',
    activeConnections: 'Aktif Bağlantı',
    expiryDate: 'Bitiş Tarihi',
    unlimited: 'Sınırsız',
    statusActive: 'Aktif',
    statusInactive: 'Pasif'
  },

  // Navigation
  nav: {
    liveTV: 'Canlı TV',
    movies: 'Filmler',
    series: 'Diziler'
  },

  // Login
  login: {
    title: 'TESLA TV',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    rememberMe: 'Login Bilgilerimi Hatırla',
    loginButton: 'Giriş Yap',
    loggingIn: '⏳ Giriş yapılıyor...',
    errorInvalidCredentials: 'Geçersiz kullanıcı bilgileri',
    errorLoadingData: 'Kullanıcı verileri yüklenirken hata oluştu',
    errorConnection: 'Bağlantı hatası: ',
    errorServerStatus: 'Sunucu şu durum koduyla yanıt verdi: ',
    errorNoResponse: 'Sunucudan yanıt alınamadı',
    errorMissingFields: 'Lütfen kullanıcı adı ve şifre girin',
    errorServerNotConfigured: 'Sunucu yapılandırılmamış. Lütfen admin kurulumunu yapın.'
  },

  // LiveTV
  liveTV: {
    title: 'Canlı TV Kanalları',
    categories: 'Kategoriler',
    allChannels: 'Tüm Kanallar',
    searchPlaceholder: 'Kanal ara...',
    noResults: 'Sonuç bulunamadı',
    live: 'CANLI',
    channelsShowing: 'kanal gösteriliyor',
    streamInfo: 'Yayın Bilgileri',
    channelId: 'Kanal ID',
    bitrate: 'Bit Hızı',
    detecting: 'Tespit ediliyor...',
    epg: 'EPG (Elektronik Program Rehberi)',
    noEpgData: 'EPG verisi mevcut değil',
    categoryAction: 'Aksiyon',
    categoryComedy: 'Komedi',
    categoryDrama: 'Dram',
    categoryDocumentary: 'Belgesel',
    categoryNews: 'Haber',
    categorySports: 'Spor',
    categoryKids: 'Çocuk',
    categoryMusic: 'Müzik',
    categoryNature: 'Doğa'
  },

  // Movies
  movies: {
    title: 'Filmler',
    categories: 'Kategoriler',
    allMovies: 'Tüm Filmler',
    searchPlaceholder: 'Film ara...',
    noResults: 'Sonuç bulunamadı',
    moviesShowing: 'film gösteriliyor',
    categoryAction: 'Aksiyon',
    categoryComedy: 'Komedi',
    categoryDrama: 'Dram',
    categoryHorror: 'Korku',
    categorySciFi: 'Bilim Kurgu',
    categoryRomance: 'Romantik',
    categoryThriller: 'Gerilim',
    categoryAnimation: 'Animasyon',
    categoryDocumentary: 'Belgesel'
  },

  // Series
  series: {
    title: 'Diziler',
    categories: 'Kategoriler',
    allSeries: 'Tüm Diziler',
    searchPlaceholder: 'Dizi ara...',
    noResults: 'Sonuç bulunamadı',
    seriesShowing: 'dizi gösteriliyor',
    season: 'Sezon',
    episode: 'Bölüm',
    categoryAction: 'Aksiyon',
    categoryComedy: 'Komedi',
    categoryDrama: 'Dram',
    categoryHorror: 'Korku',
    categorySciFi: 'Bilim Kurgu',
    categoryRomance: 'Romantik',
    categoryThriller: 'Gerilim',
    categoryAnimation: 'Animasyon',
    categoryDocumentary: 'Belgesel'
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
      adminUsername: 'Admin Username',
      adminUsernamePlaceholder: 'Admin Username',
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
      username: 'Admin Username',
      usernamePlaceholder: 'Admin Username',
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
    language: 'Dil',
    save: 'Kaydet',
    cancel: 'İptal',
    close: 'Kapat',
    delete: 'Sil',
    edit: 'Düzenle',
    search: 'Ara',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı'
  }
};
