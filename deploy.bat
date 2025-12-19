@echo off
REM Tesla TV Deployment Script
REM Passen Sie die VPS_IP und ggf. VPS_USER an

SET VPS_IP=YOUR_VPS_IP
SET VPS_USER=root
SET REMOTE_PATH=/var/www/tesla-tv

echo ============================================
echo Tesla TV Deployment Script
echo ============================================
echo.

REM Schritt 1: Production Build
echo [1/4] Building production version...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

REM Schritt 2: Dateien übertragen
echo [2/4] Transferring files to VPS...
scp -r dist\* %VPS_USER%@%VPS_IP%:%REMOTE_PATH%/
if errorlevel 1 (
    echo ERROR: File transfer failed!
    echo Make sure you have SSH access to your VPS.
    pause
    exit /b 1
)
echo Files transferred successfully!
echo.

REM Schritt 3: Berechtigungen setzen
echo [3/4] Setting permissions on VPS...
ssh %VPS_USER%@%VPS_IP% "chown -R www-data:www-data %REMOTE_PATH% && chmod -R 755 %REMOTE_PATH%"
if errorlevel 1 (
    echo WARNING: Permission setting failed (might need manual fix)
)
echo.

REM Schritt 4: Nginx neuladen (optional)
echo [4/4] Reloading Nginx...
ssh %VPS_USER%@%VPS_IP% "systemctl reload nginx"
echo.

echo ============================================
echo Deployment Complete!
echo ============================================
echo.
echo Your app should now be live at: http://%VPS_IP%
echo.
pause
