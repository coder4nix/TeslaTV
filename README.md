# 📺 Tesla TV - IPTV Application

Eine moderne IPTV-Anwendung mit Live-TV, VOD (Movies) und Serien-Unterstützung, entwickelt mit React und Vite.

## ✨ Features

- 📡 **Live TV** - HLS Streaming mit M3U Playlist Support
- 🎬 **Movies/VOD** - Film-Bibliothek mit Kategorien und Suche
- 📺 **Series** - Serien-Section (in Entwicklung)
- 🌐 **Multi-Language** - Unterstützung für Türkisch, Deutsch, Englisch
- 🎮 **Custom Controls** - Touchscreen-optimierte Steuerung
- 🎯 **Auto-Fullscreen** - VODs öffnen direkt im Vollbild
- 🎨 **Modern UI** - Tailwind CSS Design

## 🚀 Quick Start

### Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build
```

### VPS Deployment (Hetzner Ubuntu 22.04)

```bash
# 1. Auf VPS verbinden
ssh root@YOUR_VPS_IP

# 2. Installation Script herunterladen und ausführen
wget https://raw.githubusercontent.com/coder4nix/TeslaTV/main/install.sh
chmod +x install.sh
./install.sh
```

Das war's! Die App ist dann verfügbar unter `http://YOUR_VPS_IP`

## 📋 Voraussetzungen

- Node.js 18+
- npm oder yarn
- Moderner Browser mit HLS-Support

## 🔧 Konfiguration

### Admin Server Settings

Bei der ersten Anmeldung müssen Sie folgende Daten eingeben:

- **Server URL**: Ihre IPTV Server URL
- **Port**: Server Port (Standard: 80)
- **Username**: Ihr IPTV Benutzername
- **Password**: Ihr IPTV Passwort

Diese Einstellungen werden lokal im Browser gespeichert.

## 📦 Tech Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Video Player**: Video.js 8.23.4
- **Styling**: Tailwind CSS 3.4.0
- **HTTP Client**: Axios
- **Routing**: React Router

## 🎯 Features im Detail

### Custom Fullscreen Controls

- **Exit Button**: Rotes X oben rechts mit Pulsing-Animation (6 Sekunden)
- **Play/Pause**: Großer zentraler Button mit Double-Click Bestätigung
- **Touch-Optimiert**: Alle Controls für Touchscreens optimiert

### VOD Auto-Fullscreen

Movies öffnen automatisch im Fullscreen-Modus mit:
- Fallback-Mechanismus falls Fullscreen fehlschlägt
- Automatische Rückkehr zur Übersicht bei Exit

### Live TV Features

- Kategorien-Filter
- Such-Funktion
- Bitrate-Anzeige
- Channel-Informationen

## 📁 Projekt-Struktur

```
tesla-tv/
├── src/
│   ├── components/          # React Components
│   │   └── VideoPlayer.jsx  # Custom Video.js Player
│   ├── contexts/            # React Contexts
│   │   └── LanguageContext.jsx
│   ├── LiveTV.jsx           # Live TV Seite
│   ├── Movies.jsx           # VOD Seite
│   ├── Series.jsx           # Serien Seite
│   ├── App.jsx              # Main App Component
│   └── main.jsx             # Entry Point
├── public/                  # Statische Assets
├── install.sh              # VPS Installation Script
└── package.json
```

## 🔄 Updates deployen

Nach dem ersten Deployment:

```bash
# Auf VPS
cd /var/www/tesla-tv
./update.sh
```

## 🐛 Troubleshooting

### Video lädt nicht
- Überprüfen Sie die Server-Einstellungen
- Prüfen Sie die Browser-Console auf CORS-Fehler
- Stellen Sie sicher, dass die M3U URL korrekt ist

### Fullscreen funktioniert nicht
- Moderne Browser erfordern User-Interaktion für Fullscreen
- Prüfen Sie Browser-Berechtigungen

### Build schlägt fehl
```bash
# Cache löschen
rm -rf node_modules dist
npm install
npm run build
```

## 📝 Lizenz

Private Projekt

## 👤 Autor

Entwickelt für Tesla IPTV

## 🆘 Support

Bei Problemen öffnen Sie ein Issue im GitHub Repository.

---

**🤖 Generated with Claude Code**
