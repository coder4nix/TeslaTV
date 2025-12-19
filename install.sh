#!/bin/bash

###############################################################################
# Tesla TV - Automatisches VPS Installation Script
# Für Ubuntu 22.04 auf Hetzner VPS
###############################################################################

set -e  # Exit bei Fehler

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguration
GITHUB_REPO=""
DOMAIN=""
APP_DIR="/var/www/tesla-tv"
NGINX_CONFIG="/etc/nginx/sites-available/tesla-tv"
NODE_VERSION="18"
SETUP_SSL="n"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Dieses Script muss als root ausgeführt werden!"
        echo "Bitte verwenden Sie: sudo bash install.sh"
        exit 1
    fi
    print_success "Root-Rechte vorhanden"
}

check_ubuntu_version() {
    if [[ ! -f /etc/lsb-release ]]; then
        print_error "Dies ist kein Ubuntu System!"
        exit 1
    fi

    source /etc/lsb-release
    if [[ "$DISTRIB_RELEASE" != "22.04" ]]; then
        print_warning "Ubuntu Version ist $DISTRIB_RELEASE (empfohlen: 22.04)"
        read -p "Trotzdem fortfahren? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Ubuntu 22.04 erkannt"
    fi
}

interactive_config() {
    print_header "Konfigurations-Assistent"

    echo -e "${BLUE}Bitte geben Sie die folgenden Informationen ein:${NC}"
    echo ""

    # GitHub Repository URL
    while true; do
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}1. GitHub Repository URL${NC}"
        echo -e "${NC}   Beispiel: https://github.com/username/tesla-tv.git${NC}"
        echo ""
        read -p "   GitHub URL: " GITHUB_REPO

        # Validierung
        if [[ -z "$GITHUB_REPO" ]]; then
            print_error "GitHub URL darf nicht leer sein!"
            echo ""
            continue
        fi

        if [[ ! "$GITHUB_REPO" =~ ^https://github.com/.+/.+\.git$ ]] && [[ ! "$GITHUB_REPO" =~ ^git@github.com:.+/.+\.git$ ]]; then
            print_warning "URL Format scheint nicht korrekt zu sein"
            read -p "   Trotzdem verwenden? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo ""
                continue
            fi
        fi

        print_success "GitHub URL: $GITHUB_REPO"
        echo ""
        break
    done

    # Domain (Optional)
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}2. Domain Name (Optional)${NC}"
    echo -e "${NC}   Wenn Sie eine Domain haben, geben Sie diese ein.${NC}"
    echo -e "${NC}   Leer lassen für IP-basierte Installation.${NC}"
    echo ""
    read -p "   Domain (oder Enter für keine): " DOMAIN

    if [[ -n "$DOMAIN" ]]; then
        print_success "Domain: $DOMAIN"
    else
        SERVER_IP=$(hostname -I | awk '{print $1}')
        print_info "Keine Domain angegeben, verwende IP: $SERVER_IP"
    fi
    echo ""

    # SSL Setup
    if [[ -n "$DOMAIN" ]]; then
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}3. SSL Zertifikat einrichten?${NC}"
        echo -e "${NC}   Let's Encrypt SSL für HTTPS (empfohlen)${NC}"
        echo ""
        read -p "   SSL einrichten? (y/n) " -n 1 -r SETUP_SSL
        echo ""

        if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
            print_success "SSL wird eingerichtet für: $DOMAIN"

            # Email für Let's Encrypt
            echo ""
            echo -e "${BLUE}   Email-Adresse für SSL-Benachrichtigungen:${NC}"
            read -p "   Email: " SSL_EMAIL

            if [[ -z "$SSL_EMAIL" ]]; then
                print_warning "Keine Email angegeben, fortfahren ohne Email"
            fi
        else
            print_info "SSL-Setup wird übersprungen"
        fi
        echo ""
    fi

    # Installation Directory
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}4. Installations-Verzeichnis${NC}"
    echo -e "${NC}   Standard: /var/www/tesla-tv${NC}"
    echo ""
    read -p "   Verzeichnis (oder Enter für Standard): " custom_dir

    if [[ -n "$custom_dir" ]]; then
        APP_DIR="$custom_dir"
    fi

    print_success "Installations-Verzeichnis: $APP_DIR"
    echo ""

    # Zusammenfassung
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Zusammenfassung der Konfiguration:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BLUE}GitHub Repository:${NC}  $GITHUB_REPO"
    echo -e "  ${BLUE}Domain:${NC}             ${DOMAIN:-Keine (IP-basiert)}"
    echo -e "  ${BLUE}SSL:${NC}                ${SETUP_SSL}"
    if [[ -n "$SSL_EMAIL" ]]; then
        echo -e "  ${BLUE}SSL Email:${NC}          $SSL_EMAIL"
    fi
    echo -e "  ${BLUE}Install Verzeichnis:${NC} $APP_DIR"
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    read -p "Mit dieser Konfiguration fortfahren? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Installation abgebrochen"
        exit 0
    fi

    print_success "Konfiguration bestätigt, starte Installation..."
    echo ""

    # Konfiguration speichern für spätere Updates
    cat > /tmp/tesla-tv-config.sh << EOF
GITHUB_REPO="$GITHUB_REPO"
DOMAIN="$DOMAIN"
APP_DIR="$APP_DIR"
SSL_EMAIL="$SSL_EMAIL"
SETUP_SSL="$SETUP_SSL"
EOF

    print_info "Konfiguration gespeichert in /tmp/tesla-tv-config.sh"
}

###############################################################################
# Installation Functions
###############################################################################

update_system() {
    print_header "System Update"

    print_info "Aktualisiere Paketlisten..."
    apt update -qq

    print_info "Installiere System-Updates..."
    apt upgrade -y -qq

    print_info "Installiere Build-Essentials..."
    apt install -y -qq build-essential curl wget git unzip

    print_success "System aktualisiert"
}

install_nodejs() {
    print_header "Node.js Installation"

    if command -v node &> /dev/null; then
        NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VER" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js $(node -v) bereits installiert"
            return
        else
            print_warning "Node.js Version zu alt, aktualisiere..."
        fi
    fi

    print_info "Installiere Node.js ${NODE_VERSION}.x..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - > /dev/null 2>&1
    apt install -y -qq nodejs

    NODE_VERSION_INSTALLED=$(node -v)
    NPM_VERSION_INSTALLED=$(npm -v)

    print_success "Node.js ${NODE_VERSION_INSTALLED} installiert"
    print_success "npm ${NPM_VERSION_INSTALLED} installiert"
}

install_nginx() {
    print_header "Nginx Installation"

    if command -v nginx &> /dev/null; then
        print_success "Nginx bereits installiert ($(nginx -v 2>&1 | cut -d'/' -f2))"
    else
        print_info "Installiere Nginx..."
        apt install -y -qq nginx
        print_success "Nginx installiert"
    fi

    print_info "Starte Nginx..."
    systemctl start nginx
    systemctl enable nginx > /dev/null 2>&1
    print_success "Nginx gestartet und aktiviert"
}

setup_firewall() {
    print_header "Firewall Konfiguration"

    if command -v ufw &> /dev/null; then
        print_info "Konfiguriere UFW Firewall..."

        # Erlaube SSH (wichtig!)
        ufw allow OpenSSH > /dev/null 2>&1
        print_success "SSH erlaubt (Port 22)"

        # Erlaube Nginx
        ufw allow 'Nginx Full' > /dev/null 2>&1
        print_success "Nginx erlaubt (Ports 80, 443)"

        # Aktiviere Firewall
        echo "y" | ufw enable > /dev/null 2>&1
        print_success "Firewall aktiviert"
    else
        print_warning "UFW nicht installiert, überspringe Firewall-Setup"
    fi
}

create_directories() {
    print_header "Verzeichnisse erstellen"

    print_info "Erstelle $APP_DIR..."
    mkdir -p "$APP_DIR"

    print_info "Setze Berechtigungen..."
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"

    print_success "Verzeichnisse erstellt und konfiguriert"
}

clone_repository() {
    print_header "GitHub Repository klonen"

    print_info "Klone Repository: $GITHUB_REPO"

    # Backup falls Verzeichnis existiert
    if [[ -d "$APP_DIR/.git" ]]; then
        print_warning "Git Repository existiert bereits, führe Pull durch..."
        cd "$APP_DIR"
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || print_warning "Pull fehlgeschlagen"
    else
        # Leere das Verzeichnis falls nötig
        rm -rf "$APP_DIR"
        git clone "$GITHUB_REPO" "$APP_DIR"
    fi

    cd "$APP_DIR"
    print_success "Repository geklont"
}

install_dependencies() {
    print_header "Node.js Abhängigkeiten installieren"

    cd "$APP_DIR"

    if [[ ! -f "package.json" ]]; then
        print_error "package.json nicht gefunden in $APP_DIR"
        exit 1
    fi

    print_info "Installiere npm Pakete..."
    npm install --production=false

    # Fix permissions for node_modules binaries
    print_info "Setze Berechtigungen für node_modules..."
    if [[ -d "node_modules/.bin" ]]; then
        chmod -R +x node_modules/.bin/ 2>/dev/null || true
    fi

    print_success "Abhängigkeiten installiert"
}

build_application() {
    print_header "Application Build"

    cd "$APP_DIR"

    print_info "Baue Production Version..."

    # Try npm run build first
    if ! npm run build 2>/dev/null; then
        print_warning "npm run build fehlgeschlagen, versuche npx..."

        # Fallback to npx vite build
        if ! npx vite build; then
            print_error "Build fehlgeschlagen"
            print_info "Versuche manuelle Permission-Korrektur..."

            # Last resort: fix permissions and try again
            chmod -R 755 node_modules 2>/dev/null || true
            chmod -R +x node_modules/.bin/* 2>/dev/null || true

            if ! npm run build; then
                print_error "Build endgültig fehlgeschlagen"
                exit 1
            fi
        fi
    fi

    if [[ ! -d "dist" ]]; then
        print_error "Build fehlgeschlagen - dist/ Ordner nicht gefunden"
        exit 1
    fi

    print_success "Build erfolgreich"
}

configure_nginx() {
    print_header "Nginx Konfiguration"

    # Ermittle Server Name
    if [[ -z "$DOMAIN" ]]; then
        SERVER_NAME=$(hostname -I | awk '{print $1}')
        print_info "Keine Domain angegeben, verwende IP: $SERVER_NAME"
    else
        SERVER_NAME="$DOMAIN"
        print_info "Verwende Domain: $SERVER_NAME"
    fi

    # Frage nach IPTV Server für Proxy (CORS-Fix)
    echo ""
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}IPTV Backend Server (CORS-Fix)${NC}"
    echo -e "${NC}   WICHTIG: Hier wird nach Ihrem IPTV-Backend gefragt,${NC}"
    echo -e "${NC}   NICHT nach Ihrer Tesla TV Domain!${NC}"
    echo ""
    echo -e "${NC}   Geben Sie die IP/Domain Ihres XuiOne IPTV-Servers ein:${NC}"
    echo ""
    read -p "   IPTV Backend Server (z.B. 144.76.200.209): " IPTV_SERVER

    if [[ -z "$IPTV_SERVER" ]]; then
        print_warning "Kein IPTV Server angegeben, Proxy wird nicht konfiguriert"
        IPTV_SERVER=""
    else
        print_success "IPTV Server: $IPTV_SERVER"
        # In Konfiguration speichern
        echo "IPTV_SERVER=\"$IPTV_SERVER\"" >> /tmp/tesla-tv-config.sh
    fi
    echo ""

    print_info "Erstelle Nginx Konfiguration..."

    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    root $APP_DIR/dist;
    index index.html;

    # Gzip Kompression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json
               application/vnd.ms-fontobject application/x-font-ttf
               font/opentype image/svg+xml image/x-icon;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
EOF

    # IPTV Proxy nur hinzufügen wenn Server angegeben
    if [[ -n "$IPTV_SERVER" ]]; then
        cat >> "$NGINX_CONFIG" << 'EOF'

    # IPTV API Proxy (CORS-Fix)
    location /api/ {
EOF
        cat >> "$NGINX_CONFIG" << EOF
        proxy_pass http://$IPTV_SERVER/;
        proxy_set_header Host $IPTV_SERVER;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # CORS Headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization" always;

        # Preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*";
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 200;
        }

        # Timeouts für Streaming
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;

        # Buffering deaktivieren
        proxy_buffering off;
        proxy_request_buffering off;
    }
EOF
    fi

    cat >> "$NGINX_CONFIG" << 'EOF'

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache statische Assets (1 Jahr)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Keine Logs für favicon und robots.txt
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # Größere Upload-Größe falls nötig
    client_max_body_size 10M;

    # Access & Error Logs
    access_log /var/log/nginx/tesla-tv-access.log;
    error_log /var/log/nginx/tesla-tv-error.log;
}
EOF

    print_success "Nginx Konfiguration erstellt"

    # Aktiviere Site
    print_info "Aktiviere Site..."
    ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/tesla-tv

    # Entferne default wenn vorhanden
    if [[ -f /etc/nginx/sites-enabled/default ]]; then
        print_info "Deaktiviere default Site..."
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Teste Konfiguration
    print_info "Teste Nginx Konfiguration..."
    if nginx -t > /dev/null 2>&1; then
        print_success "Nginx Konfiguration gültig"
    else
        print_error "Nginx Konfiguration fehlerhaft!"
        nginx -t
        exit 1
    fi

    # Reload Nginx
    print_info "Lade Nginx neu..."
    systemctl reload nginx
    print_success "Nginx neu geladen"
}

setup_ssl() {
    print_header "SSL Zertifikat Setup"

    if [[ -z "$DOMAIN" ]]; then
        print_warning "Keine Domain konfiguriert, überspringe SSL-Setup"
        print_info "SSL kann später mit: certbot --nginx -d your-domain.com eingerichtet werden"
        return
    fi

    if [[ ! $SETUP_SSL =~ ^[Yy]$ ]]; then
        print_info "SSL-Setup wurde bei der Konfiguration übersprungen"
        print_info "SSL kann später manuell eingerichtet werden mit:"
        print_info "certbot --nginx -d $DOMAIN"
        return
    fi

    print_info "Installiere Certbot..."
    apt install -y -qq certbot python3-certbot-nginx

    print_info "Erstelle SSL Zertifikat für $DOMAIN..."

    if [[ -n "$SSL_EMAIL" ]]; then
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" || {
            print_warning "SSL-Setup fehlgeschlagen"
            print_info "Sie können es später manuell einrichten mit:"
            print_info "certbot --nginx -d $DOMAIN"
        }
    else
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
            print_warning "SSL-Setup fehlgeschlagen"
            print_info "Sie können es später manuell einrichten mit:"
            print_info "certbot --nginx -d $DOMAIN"
        }
    fi
}

create_update_script() {
    print_header "Update-Script erstellen"

    cat > "$APP_DIR/update.sh" << 'EOF'
#!/bin/bash
# Tesla TV Update Script

set -e

echo "🔄 Aktualisiere Tesla TV..."

cd /var/www/tesla-tv

# Pull neueste Änderungen
echo "📥 Lade neueste Version..."
git pull origin main 2>/dev/null || git pull origin master

# Installiere Abhängigkeiten
echo "📦 Installiere Abhängigkeiten..."
npm install

# Build
echo "🔨 Baue Production Version..."
npm run build

# Setze Berechtigungen
echo "🔐 Setze Berechtigungen..."
chown -R www-data:www-data /var/www/tesla-tv
chmod -R 755 /var/www/tesla-tv

# Reload Nginx
echo "♻️  Lade Nginx neu..."
systemctl reload nginx

echo "✅ Update abgeschlossen!"
EOF

    chmod +x "$APP_DIR/update.sh"
    print_success "Update-Script erstellt: $APP_DIR/update.sh"
}


final_checks() {
    print_header "Abschluss-Checks"

    # Check Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx läuft"
    else
        print_error "Nginx läuft nicht!"
    fi

    # Check dist folder
    if [[ -d "$APP_DIR/dist" ]] && [[ -f "$APP_DIR/dist/index.html" ]]; then
        print_success "Build-Dateien vorhanden"
    else
        print_error "Build-Dateien fehlen!"
    fi

    # Check permissions
    OWNER=$(stat -c '%U' "$APP_DIR/dist")
    if [[ "$OWNER" == "www-data" ]]; then
        print_success "Berechtigungen korrekt"
    else
        print_warning "Berechtigungen möglicherweise falsch (Owner: $OWNER)"
    fi
}

print_summary() {
    print_header "Installation Abgeschlossen!"

    SERVER_IP=$(hostname -I | awk '{print $1}')

    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                   INSTALLATION ERFOLGREICH!                 ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo ""
    echo -e "${BLUE}📱 Ihre Tesla TV App ist jetzt verfügbar:${NC}"

    if [[ -n "$DOMAIN" ]]; then
        echo -e "   ${GREEN}https://$DOMAIN${NC}"
        echo -e "   ${GREEN}http://$DOMAIN${NC}"
    fi
    echo -e "   ${GREEN}http://$SERVER_IP${NC}"

    echo ""
    echo -e "${BLUE}📂 Installation Verzeichnis:${NC} $APP_DIR"
    echo -e "${BLUE}🔄 Update Script:${NC} $APP_DIR/update.sh"
    echo ""
    echo -e "${BLUE}📝 Nützliche Befehle:${NC}"
    echo -e "   ${YELLOW}Update App:${NC}          cd $APP_DIR && ./update.sh"
    echo -e "   ${YELLOW}Deinstallieren:${NC}      ./install.sh --uninstall"
    echo -e "   ${YELLOW}Nginx Logs:${NC}          tail -f /var/log/nginx/tesla-tv-error.log"
    echo -e "   ${YELLOW}Nginx Neustart:${NC}      systemctl restart nginx"
    echo -e "   ${YELLOW}SSL einrichten:${NC}      certbot --nginx -d your-domain.com"
    echo ""

    if [[ -n "$IPTV_SERVER" ]]; then
        echo -e "${BLUE}🔧 IPTV Konfiguration (WICHTIG):${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "   In den Admin-Einstellungen verwenden Sie:"
        echo ""
        echo -e "   ${GREEN}Server URL:${NC} /api"
        echo -e "   ${GREEN}Port:${NC}       (leer lassen)"
        echo ""
        echo -e "   ${BLUE}ℹ${NC}  Der Proxy leitet Anfragen automatisch zu $IPTV_SERVER weiter"
        echo -e "   ${BLUE}ℹ${NC}  Dies behebt CORS-Probleme"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    fi
}

###############################################################################
# Uninstall Function
###############################################################################

uninstall() {
    clear

    echo -e "${RED}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                  TESLA TV DEINSTALLATION                       ║
║                                                                ║
║                   ⚠️  WARNUNG: Löscht alles!                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    print_warning "Dies wird ALLE Tesla TV Komponenten entfernen!"
    echo ""

    # Lade gespeicherte Konfiguration falls vorhanden
    if [[ -f /tmp/tesla-tv-config.sh ]]; then
        source /tmp/tesla-tv-config.sh
    else
        # Standard-Werte
        APP_DIR="/var/www/tesla-tv"
        NGINX_CONFIG="/etc/nginx/sites-available/tesla-tv"
    fi

    # Zeige was entfernt wird
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}Folgendes wird entfernt:${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Prüfe was existiert
    ITEMS_TO_REMOVE=()

    if [[ -d "$APP_DIR" ]]; then
        echo -e "  ${RED}✗${NC} App Verzeichnis: $APP_DIR"
        ITEMS_TO_REMOVE+=("app_dir")
    fi

    if [[ -f "$NGINX_CONFIG" ]]; then
        echo -e "  ${RED}✗${NC} Nginx Konfiguration: $NGINX_CONFIG"
        ITEMS_TO_REMOVE+=("nginx_config")
    fi

    if [[ -L /etc/nginx/sites-enabled/tesla-tv ]]; then
        echo -e "  ${RED}✗${NC} Nginx Site Link: /etc/nginx/sites-enabled/tesla-tv"
        ITEMS_TO_REMOVE+=("nginx_link")
    fi

    if [[ -f /tmp/tesla-tv-config.sh ]]; then
        echo -e "  ${RED}✗${NC} Konfigurationsdatei: /tmp/tesla-tv-config.sh"
        ITEMS_TO_REMOVE+=("config")
    fi

    # Prüfe auf SSL Zertifikate
    if [[ -n "$DOMAIN" ]] && [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        echo -e "  ${RED}✗${NC} SSL Zertifikat für: $DOMAIN"
        ITEMS_TO_REMOVE+=("ssl")
    fi

    # Logs
    if [[ -f /var/log/nginx/tesla-tv-access.log ]] || [[ -f /var/log/nginx/tesla-tv-error.log ]]; then
        echo -e "  ${RED}✗${NC} Nginx Log-Dateien"
        ITEMS_TO_REMOVE+=("logs")
    fi

    echo ""

    if [[ ${#ITEMS_TO_REMOVE[@]} -eq 0 ]]; then
        print_info "Keine Tesla TV Installation gefunden"
        exit 0
    fi

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${RED}⚠️  WICHTIG: Installierte Pakete (Nginx, Node.js) werden NICHT entfernt${NC}"
    echo -e "${NC}   Diese können Sie manuell deinstallieren mit:${NC}"
    echo -e "${NC}   apt remove nginx nodejs${NC}"
    echo ""

    read -p "Möchten Sie fortfahren? (yes/NO) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Deinstallation abgebrochen"
        exit 0
    fi

    print_header "Deinstallation wird ausgeführt"

    # App Verzeichnis entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " app_dir " ]]; then
        print_info "Entferne App Verzeichnis..."
        rm -rf "$APP_DIR"
        print_success "App Verzeichnis entfernt"
    fi

    # Nginx Site Link entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " nginx_link " ]]; then
        print_info "Deaktiviere Nginx Site..."
        rm -f /etc/nginx/sites-enabled/tesla-tv
        print_success "Nginx Site deaktiviert"
    fi

    # Nginx Konfiguration entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " nginx_config " ]]; then
        print_info "Entferne Nginx Konfiguration..."
        rm -f "$NGINX_CONFIG"
        print_success "Nginx Konfiguration entfernt"
    fi

    # SSL Zertifikat entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " ssl " ]]; then
        echo ""
        read -p "SSL Zertifikat für $DOMAIN auch entfernen? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Entferne SSL Zertifikat..."
            certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
            print_success "SSL Zertifikat entfernt"
        fi
    fi

    # Logs entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " logs " ]]; then
        print_info "Entferne Log-Dateien..."
        rm -f /var/log/nginx/tesla-tv-access.log
        rm -f /var/log/nginx/tesla-tv-error.log
        print_success "Log-Dateien entfernt"
    fi

    # Konfigurationsdatei entfernen
    if [[ " ${ITEMS_TO_REMOVE[@]} " =~ " config " ]]; then
        print_info "Entferne Konfigurationsdatei..."
        rm -f /tmp/tesla-tv-config.sh
        print_success "Konfigurationsdatei entfernt"
    fi

    # Nginx neu laden
    print_info "Lade Nginx neu..."
    nginx -t > /dev/null 2>&1 && systemctl reload nginx || {
        print_warning "Nginx Reload fehlgeschlagen, versuche Restart..."
        systemctl restart nginx
    }

    # Finale Meldung
    echo ""
    echo -e "${GREEN}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║              DEINSTALLATION ABGESCHLOSSEN!                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "${BLUE}Tesla TV wurde vollständig entfernt.${NC}"
    echo ""
    echo -e "${YELLOW}Hinweis:${NC} Installierte System-Pakete wurden behalten:"
    echo "  • Nginx"
    echo "  • Node.js"
    echo ""
    echo "Um diese zu entfernen:"
    echo "  apt remove --purge nginx nodejs"
    echo "  apt autoremove"
    echo ""
}

###############################################################################
# Main Installation
###############################################################################

main() {
    clear

    echo -e "${BLUE}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║                    TESLA TV VPS INSTALLER                      ║
║                                                                ║
║              Automatische Installation für Ubuntu 22.04         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    print_info "Start: $(date)"
    echo ""

    # Pre-checks
    check_root
    check_ubuntu_version

    # Interactive Configuration
    interactive_config

    # Installation
    update_system
    install_nodejs
    install_nginx
    setup_firewall
    create_directories
    clone_repository
    install_dependencies
    build_application
    configure_nginx
    setup_ssl
    create_update_script

    # Final
    final_checks
    print_summary

    print_info "Ende: $(date)"
}

# Command line argument handling
case "${1:-}" in
    --uninstall|uninstall|-u)
        check_root
        uninstall
        ;;
    --help|-h|help)
        echo "Tesla TV Installation Script"
        echo ""
        echo "Verwendung:"
        echo "  $0              - Installation starten (interaktiv)"
        echo "  $0 --uninstall  - Tesla TV deinstallieren"
        echo "  $0 --help       - Diese Hilfe anzeigen"
        echo ""
        exit 0
        ;;
    *)
        # Run main installation
        main "$@"
        ;;
esac
