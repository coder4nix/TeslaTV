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

# Konfiguration - BITTE ANPASSEN!
GITHUB_REPO="https://github.com/YOUR_USERNAME/tesla-tv.git"  # ÄNDERN!
DOMAIN=""  # Optional: your-domain.com
APP_DIR="/var/www/tesla-tv"
NGINX_CONFIG="/etc/nginx/sites-available/tesla-tv"
NODE_VERSION="18"

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

    if [[ "$GITHUB_REPO" == *"YOUR_USERNAME"* ]]; then
        print_error "GITHUB_REPO wurde nicht angepasst!"
        print_info "Bitte bearbeiten Sie das Script und setzen Sie die korrekte GitHub URL"
        exit 1
    fi

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

    print_success "Abhängigkeiten installiert"
}

build_application() {
    print_header "Application Build"

    cd "$APP_DIR"

    print_info "Baue Production Version..."
    npm run build

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

    # SPA Routing
    location / {
        try_files \$uri \$uri/ /index.html;
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
    print_header "SSL Zertifikat (Optional)"

    if [[ -z "$DOMAIN" ]]; then
        print_warning "Keine Domain konfiguriert, überspringe SSL-Setup"
        print_info "SSL kann später mit: certbot --nginx -d your-domain.com eingerichtet werden"
        return
    fi

    read -p "Möchten Sie jetzt SSL mit Let's Encrypt einrichten? (y/n) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Installiere Certbot..."
        apt install -y -qq certbot python3-certbot-nginx

        print_info "Erstelle SSL Zertifikat für $DOMAIN..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
            print_warning "SSL-Setup fehlgeschlagen"
            print_info "Sie können es später manuell einrichten mit:"
            print_info "certbot --nginx -d $DOMAIN"
        }
    else
        print_info "SSL-Setup übersprungen"
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

setup_systemd_service() {
    print_header "Systemd Service (Optional)"

    read -p "Möchten Sie einen Systemd Service einrichten? (y/n) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Systemd Service übersprungen"
        return
    fi

    cat > /etc/systemd/system/tesla-tv.service << EOF
[Unit]
Description=Tesla TV IPTV Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable tesla-tv.service > /dev/null 2>&1

    print_success "Systemd Service erstellt und aktiviert"
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
    echo -e "   ${YELLOW}Nginx Logs:${NC}          tail -f /var/log/nginx/tesla-tv-error.log"
    echo -e "   ${YELLOW}Nginx Neustart:${NC}      systemctl restart nginx"
    echo -e "   ${YELLOW}SSL einrichten:${NC}      certbot --nginx -d your-domain.com"
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
    setup_systemd_service

    # Final
    final_checks
    print_summary

    print_info "Ende: $(date)"
}

# Run main installation
main "$@"
