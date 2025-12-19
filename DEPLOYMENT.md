# Tesla TV - Deployment Anleitung für Hetzner VPS (Ubuntu 22.04)

## 1. VPS Vorbereitung

Verbinden Sie sich mit Ihrem VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```

### System aktualisieren
```bash
apt update && apt upgrade -y
```

### Nginx installieren
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### Node.js installieren (Optional - nur wenn Sie auf dem Server bauen möchten)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

## 2. Firewall konfigurieren

```bash
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

## 3. Deployment-Ordner erstellen

```bash
mkdir -p /var/www/tesla-tv
chown -R www-data:www-data /var/www/tesla-tv
```

## 4. Build-Dateien übertragen

**Von Ihrem lokalen Windows-Rechner:**

### Option A: Mit SCP (empfohlen)
```bash
scp -r C:\Users\ozgr\Documents\tesla-tv\dist\* root@YOUR_VPS_IP:/var/www/tesla-tv/
```

### Option B: Mit WinSCP oder FileZilla
- Laden Sie die Dateien aus dem `dist` Ordner hoch
- Zielverzeichnis: `/var/www/tesla-tv/`

## 5. Nginx konfigurieren

Erstellen Sie eine neue Nginx-Konfiguration auf dem VPS:

```bash
nano /etc/nginx/sites-available/tesla-tv
```

Fügen Sie folgende Konfiguration ein:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN_OR_IP;

    root /var/www/tesla-tv;
    index index.html;

    # Gzip Kompression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statische Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Sicherheits-Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Ersetzen Sie `YOUR_DOMAIN_OR_IP` mit Ihrer Domain oder IP-Adresse.

### Konfiguration aktivieren
```bash
ln -s /etc/nginx/sites-available/tesla-tv /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## 6. SSL mit Let's Encrypt (Optional aber empfohlen)

### Certbot installieren
```bash
apt install certbot python3-certbot-nginx -y
```

### SSL-Zertifikat erstellen
```bash
certbot --nginx -d your-domain.com
```

Folgen Sie den Anweisungen. Certbot konfiguriert automatisch HTTPS.

## 7. Berechtigungen setzen

```bash
chown -R www-data:www-data /var/www/tesla-tv
chmod -R 755 /var/www/tesla-tv
```

## 8. Testen

Öffnen Sie Ihren Browser und besuchen Sie:
- `http://YOUR_VPS_IP` oder
- `https://your-domain.com` (wenn SSL konfiguriert)

## Automatisches Deployment-Script (Optional)

Erstellen Sie ein Deployment-Script auf Ihrem lokalen Rechner:

**deploy.bat** (Windows):
```batch
@echo off
echo Building production version...
call npm run build

echo Transferring files to VPS...
scp -r dist\* root@YOUR_VPS_IP:/var/www/tesla-tv/

echo Setting permissions...
ssh root@YOUR_VPS_IP "chown -R www-data:www-data /var/www/tesla-tv && chmod -R 755 /var/www/tesla-tv"

echo Deployment complete!
pause
```

**deploy.sh** (Linux/Mac):
```bash
#!/bin/bash
echo "Building production version..."
npm run build

echo "Transferring files to VPS..."
scp -r dist/* root@YOUR_VPS_IP:/var/www/tesla-tv/

echo "Setting permissions..."
ssh root@YOUR_VPS_IP "chown -R www-data:www-data /var/www/tesla-tv && chmod -R 755 /var/www/tesla-tv"

echo "Deployment complete!"
```

## Troubleshooting

### Nginx startet nicht
```bash
nginx -t  # Zeigt Konfigurationsfehler
tail -f /var/log/nginx/error.log  # Logs ansehen
```

### 404 Fehler bei React Router
Stellen Sie sicher, dass `try_files $uri $uri/ /index.html;` in der Nginx-Config ist.

### CORS-Fehler
Wenn Ihre IPTV-API auf einer anderen Domain läuft, fügen Sie CORS-Headers hinzu:
```nginx
add_header Access-Control-Allow-Origin "*" always;
```

### Performance-Optimierung
Aktivieren Sie HTTP/2 in Nginx:
```nginx
listen 443 ssl http2;
```

## Wartung

### Updates deployen
1. Bauen: `npm run build`
2. Hochladen: `scp -r dist\* root@YOUR_VPS_IP:/var/www/tesla-tv/`
3. Fertig!

### Logs ansehen
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Nginx neu starten
```bash
systemctl restart nginx
```

## Hinweise

- **Backup**: Erstellen Sie regelmäßig Backups der `/var/www/tesla-tv` Verzeichnisse
- **Monitoring**: Installieren Sie ein Monitoring-Tool wie `netdata` oder `prometheus`
- **Security**: Halten Sie Ihr System aktuell mit `apt update && apt upgrade`
