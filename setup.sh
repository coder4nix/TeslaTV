#!/bin/bash

echo "========================================"
echo "TESLA TV Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js ist nicht installiert!"
    echo "Bitte installiere Node.js von: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[OK] Node.js gefunden"
node --version
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm ist nicht installiert!"
    exit 1
fi

echo "[OK] npm gefunden"
npm --version
echo ""

# Install dependencies
echo "========================================"
echo "Installiere Dependencies..."
echo "========================================"
echo ""

npm install

if [ $? -ne 0 ]; then
    echo "[ERROR] Installation fehlgeschlagen!"
    exit 1
fi

echo ""
echo "========================================"
echo "Erstelle Tailwind CSS Konfiguration..."
echo "========================================"
echo ""

npx tailwindcss init -p

echo ""
echo "========================================"
echo "Setup erfolgreich abgeschlossen!"
echo "========================================"
echo ""
echo "Nächste Schritte:"
echo "1. Kopiere die TESLA TV Komponenten nach src/"
echo "2. Starte den Dev-Server mit: npm run dev"
echo "3. Öffne http://localhost:5173 im Browser"
echo ""
