# ⚡ TESLA TV - Quick Start Guide

## 🚀 Installation in 30 Sekunden

### Windows:

1. Lade alle Dateien herunter
2. Entpacke sie in einen Ordner, z.B.: `C:\Users\ozgr\Documents\tesla-tv`
3. Doppelklick auf **INSTALL.bat**
4. Fertig! 🎉

### Was macht INSTALL.bat?
- ✅ Überprüft Node.js & npm
- ✅ Installiert alle Dependencies
- ✅ Konfiguriert Tailwind CSS
- ✅ Startet optional den Dev-Server

---

## 📂 Nach dem Download

Deine Ordner-Struktur sollte so aussehen:

```
tesla-tv/
├── INSTALL.bat          ← DIESES SCRIPT STARTEN!
├── setup.bat            
├── setup.sh             
├── package.json         
├── vite.config.js       
├── tailwind.config.js   
├── postcss.config.js    
├── index.html           
├── .gitignore           
├── SETUP_ANLEITUNG.md   ← Detaillierte Anleitung
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

---

## ▶️ Starten

Nach Installation:

```cmd
npm run dev
```

Browser öffnet automatisch: http://localhost:5173

---

## 🎯 Features

### ✅ Bereits implementiert:
- Login-Screen mit "Remember Me"
- Live TV mit Kategorien & Senderliste
- Filme Grid-Ansicht
- Serien Grid-Ansicht
- Responsives Design
- Dunkles Theme
- Smooth Animations

### 🔜 Nächste Schritte:
- XuiOne API Integration
- Video Player (HLS.js)
- Echte Sender-Logos
- EPG (Electronic Program Guide)
- Favoriten-System

---

## 💡 Tipps

- Alle Änderungen in `src/` werden live aktualisiert
- Öffne `src/App.jsx` um die Haupt-Logik zu sehen
- Öffne `src/LiveTV.jsx` um die Senderliste anzupassen
- Nutze `claude-code` im Terminal für KI-Unterstützung

---

## 🆘 Probleme?

### "Node.js nicht gefunden"
→ Installiere: https://nodejs.org/

### "Port 5173 bereits belegt"
→ Ändere Port in `vite.config.js`

### "Dependencies fehlen"
→ Führe `npm install` erneut aus

---

**Viel Erfolg! 🚀**
