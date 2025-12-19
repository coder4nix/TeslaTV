@echo off
echo ========================================
echo TESLA TV Setup Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js ist nicht installiert!
    echo Bitte installiere Node.js von: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js gefunden
node --version
echo.

REM Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm ist nicht installiert!
    pause
    exit /b 1
)

echo [OK] npm gefunden
npm --version
echo.

REM Install dependencies
echo ========================================
echo Installiere Dependencies...
echo ========================================
echo.

call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Installation fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Erstelle Tailwind CSS Konfiguration...
echo ========================================
echo.

call npx tailwindcss init -p

echo.
echo ========================================
echo Setup erfolgreich abgeschlossen!
echo ========================================
echo.
echo Naechste Schritte:
echo 1. Kopiere die TESLA TV Komponenten nach src/
echo 2. Starte den Dev-Server mit: npm run dev
echo 3. Oeffne http://localhost:5173 im Browser
echo.
echo Druecke eine Taste um fortzufahren...
pause >nul
