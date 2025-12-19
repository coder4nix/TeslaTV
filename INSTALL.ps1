# TESLA TV - PowerShell Setup Script
# Rechtsklick -> "Mit PowerShell ausfuehren"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    TESLA TV - Automatisches Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "[1/5] Pruefe Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js gefunden: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] Node.js nicht gefunden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte installiere Node.js von: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Nach der Installation starte dieses Script erneut." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}
Write-Host ""

# Check npm
Write-Host "[2/5] Pruefe npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm gefunden: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] npm nicht gefunden!" -ForegroundColor Red
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}
Write-Host ""

# Install dependencies
Write-Host "[3/5] Installiere Dependencies..." -ForegroundColor Yellow
Write-Host "Dies kann einige Minuten dauern..." -ForegroundColor Gray
Write-Host ""

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[X] Installation fehlgeschlagen!" -ForegroundColor Red
    Write-Host "Versuche es erneut oder pruefe deine Internetverbindung." -ForegroundColor Yellow
    Read-Host "Druecke Enter zum Beenden"
    exit 1
}

Write-Host ""
Write-Host "[OK] Dependencies erfolgreich installiert!" -ForegroundColor Green
Write-Host ""

# Initialize Tailwind
Write-Host "[4/5] Konfiguriere Tailwind CSS..." -ForegroundColor Yellow
npx tailwindcss init -p | Out-Null
Write-Host "[OK] Tailwind CSS konfiguriert!" -ForegroundColor Green
Write-Host ""

# Success message
Write-Host "[5/5] Finalisiere Setup..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      Setup erfolgreich!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projekt-Struktur:" -ForegroundColor White
Write-Host "   - src/          (Deine Komponenten)" -ForegroundColor Gray
Write-Host "   - public/       (Statische Dateien)" -ForegroundColor Gray
Write-Host "   - dist/         (Production Build)" -ForegroundColor Gray
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor White
Write-Host ""
Write-Host "   1. Starte den Dev-Server:" -ForegroundColor White
Write-Host "      npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Oeffne im Browser:" -ForegroundColor White
Write-Host "      http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Bearbeite Dateien in src/" -ForegroundColor White
Write-Host "      Aenderungen werden automatisch aktualisiert!" -ForegroundColor Gray
Write-Host ""
Write-Host "Weitere Befehle:" -ForegroundColor White
Write-Host "   npm run build    - Production Build erstellen" -ForegroundColor Gray
Write-Host "   npm run preview  - Production Build testen" -ForegroundColor Gray
Write-Host ""

# Ask to start dev server
$startDev = Read-Host "Moechtest du den Dev-Server jetzt starten? (j/n)"
if ($startDev -eq "j") {
    Write-Host ""
    Write-Host "Starte Dev-Server..." -ForegroundColor Green
    Write-Host "Browser oeffnet sich automatisch auf http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Druecke STRG+C zum Beenden." -ForegroundColor Yellow
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Setup abgeschlossen! Starte spaeter mit: npm run dev" -ForegroundColor Green
    Write-Host ""
    Read-Host "Druecke Enter zum Beenden"
}
