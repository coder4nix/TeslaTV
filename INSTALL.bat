@echo off
echo ========================================
echo     TESLA TV - Automatisches Setup
echo ========================================
echo.

REM Check Node.js
echo [1/5] Pruefe Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js nicht gefunden!
    echo.
    echo Bitte installiere Node.js von: https://nodejs.org/
    echo Nach der Installation starte dieses Script erneut.
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js gefunden: 
node --version
echo.

REM Check npm
echo [2/5] Pruefe npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] npm nicht gefunden!
    pause
    exit /b 1
)
echo [OK] npm gefunden: 
npm --version
echo.

REM Install dependencies
echo [3/5] Installiere Dependencies...
echo Dies kann einige Minuten dauern...
echo.
call npm install

if %errorlevel% neq 0 (
    echo.
    echo [X] Installation fehlgeschlagen!
    echo Versuche es erneut oder pruefe deine Internetverbindung.
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies erfolgreich installiert!
echo.

REM Initialize Tailwind
echo [4/5] Konfiguriere Tailwind CSS...
call npx tailwindcss init -p >nul 2>&1
echo [OK] Tailwind CSS konfiguriert!
echo.

REM Create success message
echo [5/5] Finalisiere Setup...
echo.
echo ========================================
echo       Setup erfolgreich!
echo ========================================
echo.
echo Projekt-Struktur:
echo    - src/          (Deine Komponenten)
echo    - public/       (Statische Dateien)
echo    - dist/         (Production Build)
echo.
echo Naechste Schritte:
echo.
echo    1. Starte den Dev-Server:
echo       npm run dev
echo.
echo    2. Oeffne im Browser:
echo       http://localhost:5173
echo.
echo    3. Bearbeite Dateien in src/
echo       Aenderungen werden automatisch aktualisiert!
echo.
echo Weitere Befehle:
echo    npm run build    - Production Build erstellen
echo    npm run preview  - Production Build testen
echo.

REM Ask if user wants to start dev server now
echo.
set /p start_dev="Moechtest du den Dev-Server jetzt starten? (j/n): "
if /i "%start_dev%"=="j" (
    echo.
    echo Starte Dev-Server...
    echo Browser oeffnet sich automatisch auf http://localhost:5173
    echo.
    echo Druecke STRG+C zum Beenden.
    echo.
    call npm run dev
) else (
    echo.
    echo Setup abgeschlossen! Starte spaeter mit: npm run dev
    echo.
    pause
)
