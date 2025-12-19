# 🚀 TESLA TV - Komplette Setup-Anleitung

## 📋 Voraussetzungen

Bevor du startest, stelle sicher dass du folgendes installiert hast:

1. **Node.js** (Version 18 oder höher)
   - Download: https://nodejs.org/
   - Überprüfen: `node --version`

2. **npm** (kommt automatisch mit Node.js)
   - Überprüfen: `npm --version`

3. **Git** (Optional, aber empfohlen)
   - Download: https://git-scm.com/

---

## 🎯 Schnellstart (3 Schritte)

### Windows:

```cmd
# 1. Navigiere zu deinem Projekt-Ordner
cd C:\Users\ozgr\Documents\tesla-tv

# 2. Führe das Setup-Script aus
setup.bat

# 3. Starte den Dev-Server
npm run dev
```

### Mac/Linux:

```bash
# 1. Navigiere zu deinem Projekt-Ordner
cd ~/Documents/tesla-tv

# 2. Mache das Script ausführbar
chmod +x setup.sh

# 3. Führe das Setup-Script aus
./setup.sh

# 4. Starte den Dev-Server
npm run dev
```

Der Browser öffnet sich automatisch auf: `http://localhost:5173`

---

## 📦 Manuelle Installation (Schritt für Schritt)

### 1. Projekt-Ordner erstellen

```bash
mkdir tesla-tv
cd tesla-tv
```

### 2. Alle Setup-Dateien in den Ordner kopieren:

```
tesla-tv/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── setup.bat (für Windows)
├── setup.sh (für Mac/Linux)
└── src/
    ├── main.jsx
    ├── index.css
    ├── App.jsx
    ├── Login.jsx
    ├── Header.jsx
    ├── LiveTV.jsx
    ├── Movies.jsx
    └── Series.jsx
```

### 3. Dependencies installieren

```bash
npm install
```

### 4. Tailwind CSS initialisieren (falls nicht automatisch passiert)

```bash
npx tailwindcss init -p
```

### 5. Dev-Server starten

```bash
npm run dev
```

---

## 🛠️ Verfügbare Scripts

```bash
# Development Server starten (mit Hot Reload)
npm run dev

# Production Build erstellen
npm run build

# Production Build lokal testen
npm run preview

# Code Linting
npm run lint
```

---

## 📁 Projekt-Struktur erklärt

```
tesla-tv/
│
├── src/                      # Source Code
│   ├── main.jsx             # React Entry Point
│   ├── index.css            # Globale Styles + Tailwind
│   ├── App.jsx              # Haupt-Komponente (Routing)
│   ├── Login.jsx            # Login-Screen
│   ├── Header.jsx           # Header mit Logo & User-Menu
│   ├── LiveTV.jsx           # Live TV mit Kategorien & Senderliste
│   ├── Movies.jsx           # Filme Grid-Ansicht
│   └── Series.jsx           # Serien Grid-Ansicht
│
├── public/                  # Statische Assets
│
├── dist/                    # Production Build (nach npm run build)
│
├── node_modules/           # Dependencies (wird automatisch erstellt)
│
├── package.json            # Projekt-Konfiguration & Dependencies
├── vite.config.js         # Vite Build-Tool Konfiguration
├── tailwind.config.js     # Tailwind CSS Konfiguration
├── postcss.config.js      # PostCSS Konfiguration
└── index.html             # HTML Entry Point
```

---

## 🔧 Entwicklung

### Live-Reload
Alle Änderungen in `src/` werden automatisch im Browser aktualisiert!

### Komponenten bearbeiten
Öffne einfach die `.jsx` Dateien in VS Code und bearbeite sie. Der Browser aktualisiert sich automatisch.

### Neue Komponente hinzufügen

1. Erstelle eine neue Datei in `src/`, z.B. `Settings.jsx`
2. Importiere sie in `App.jsx`
3. Füge sie zur Navigation hinzu

---

## 🎨 Styling

Das Projekt nutzt **Tailwind CSS** für Styling.

### Tailwind Klassen verwenden:
```jsx
<div className="bg-slate-900 text-white p-4 rounded-lg">
  Mein Content
</div>
```

### Custom CSS hinzufügen:
Bearbeite `src/index.css` für globale Styles.

---

## 🌐 Production Build

### Build erstellen:
```bash
npm run build
```

Dies erstellt einen optimierten Build im `dist/` Ordner.

### Build lokal testen:
```bash
npm run preview
```

### Build deployen:
Der `dist/` Ordner kann auf jeden Webserver hochgeladen werden:
- Netlify
- Vercel
- GitHub Pages
- Eigener Server

---

## 🐛 Troubleshooting

### Problem: "npm: command not found"
**Lösung:** Node.js ist nicht installiert oder nicht im PATH.
- Windows: Neuinstallation von https://nodejs.org/
- Überprüfen: `node --version` in neuer CMD/PowerShell

### Problem: "Port 5173 already in use"
**Lösung:** Port ist belegt.
```bash
# Port in vite.config.js ändern:
server: {
  port: 3000  // Andere Port-Nummer
}
```

### Problem: Tailwind Styles werden nicht angewendet
**Lösung:** Tailwind neu initialisieren
```bash
npx tailwindcss init -p --force
npm run dev
```

### Problem: "Module not found"
**Lösung:** Dependencies neu installieren
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Nächste Schritte

1. ✅ Setup abgeschlossen
2. 🔌 XuiOne API Integration hinzufügen
3. 🎥 Video Player implementieren (HLS.js)
4. 🎨 Design anpassen
5. 📱 Mobile Optimierung
6. 🚀 Deployment

---

## 🆘 Hilfe & Support

Bei Fragen oder Problemen:
1. Überprüfe die Konsole im Browser (F12)
2. Überprüfe die Terminal-Ausgabe
3. Frag Claude! 😊

---

## 📝 Lizenz

Dieses Projekt ist für private Nutzung.

---

**Happy Coding! 🎉**
