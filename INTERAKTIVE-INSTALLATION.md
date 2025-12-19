# 🚀 Tesla TV - Interaktive VPS Installation

## Übersicht

Das `install.sh` Script ist jetzt **vollständig interaktiv**! Sie müssen das Script nicht mehr bearbeiten - es fragt Sie nach allen notwendigen Informationen.

## ✨ Was ist neu?

### Früher (Manuelle Konfiguration):
```bash
# Script öffnen
nano install.sh

# Zeilen manuell ändern
GITHUB_REPO="https://github.com/YOUR_USERNAME/tesla-tv.git"
DOMAIN="your-domain.com"

# Speichern und pushen
git commit -m "Update config"
git push
```

### Jetzt (Interaktive Installation):
```bash
# Einfach starten!
./install.sh

# Script fragt nach allen Informationen ✨
```

## 📋 Installations-Dialog

Wenn Sie `./install.sh` starten, werden Sie nacheinander gefragt:

### 1. GitHub Repository URL
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GitHub Repository URL
   Beispiel: https://github.com/username/tesla-tv.git

   GitHub URL: _
```

**Validierung:**
- ✓ URL darf nicht leer sein
- ✓ Format wird geprüft (github.com)
- ⚠ Bei ungültigem Format: Bestätigung erforderlich

**Beispiele:**
- `https://github.com/tesla-user/tesla-tv.git` ✅
- `git@github.com:tesla-user/tesla-tv.git` ✅

### 2. Domain Name (Optional)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Domain Name (Optional)
   Wenn Sie eine Domain haben, geben Sie diese ein.
   Leer lassen für IP-basierte Installation.

   Domain (oder Enter für keine): _
```

**Optionen:**
- Mit Domain: `tesla-tv.beispiel.de` → Nginx wird auf Domain konfiguriert
- Ohne Domain: `[Enter]` → Nginx wird auf Server-IP konfiguriert

### 3. SSL Zertifikat (nur wenn Domain angegeben)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SSL Zertifikat einrichten?
   Let's Encrypt SSL für HTTPS (empfohlen)

   SSL einrichten? (y/n) _
```

**Bei "y" (Ja):**
```
   Email-Adresse für SSL-Benachrichtigungen:
   Email: _
```

**Email ist optional:**
- Mit Email: Benachrichtigungen über Zertifikat-Ablauf
- Ohne Email: Funktioniert auch, aber keine Benachrichtigungen

### 4. Installations-Verzeichnis
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. Installations-Verzeichnis
   Standard: /var/www/tesla-tv

   Verzeichnis (oder Enter für Standard): _
```

**Standard:** `/var/www/tesla-tv` (empfohlen)
**Custom:** Jeder gültige Pfad möglich

### 5. Bestätigungs-Zusammenfassung
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zusammenfassung der Konfiguration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Repository:  https://github.com/tesla-user/tesla-tv.git
  Domain:             tesla-tv.beispiel.de
  SSL:                y
  SSL Email:          admin@beispiel.de
  Install Verzeichnis: /var/www/tesla-tv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mit dieser Konfiguration fortfahren? (y/n) _
```

**Bei "y":** Installation startet automatisch
**Bei "n":** Installation wird abgebrochen

## 🎯 Vollständiges Beispiel

### Szenario 1: Mit Domain und SSL

```bash
root@vps:~# ./install.sh

╔════════════════════════════════════════════════════════════════╗
║                    TESLA TV VPS INSTALLER                      ║
╚════════════════════════════════════════════════════════════════╝

✓ Root-Rechte vorhanden
✓ Ubuntu 22.04 erkannt

═══════════════════════════════════════════════════════════════
  Konfigurations-Assistent
═══════════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GitHub Repository URL
   Beispiel: https://github.com/username/tesla-tv.git

   GitHub URL: https://github.com/meintesla/tesla-tv.git

✓ GitHub URL: https://github.com/meintesla/tesla-tv.git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Domain Name (Optional)

   Domain (oder Enter für keine): tv.meineseite.de

✓ Domain: tv.meineseite.de

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SSL Zertifikat einrichten?

   SSL einrichten? (y/n) y

✓ SSL wird eingerichtet für: tv.meineseite.de

   Email-Adresse für SSL-Benachrichtigungen:
   Email: admin@meineseite.de

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. Installations-Verzeichnis

   Verzeichnis (oder Enter für Standard): [Enter]

✓ Installations-Verzeichnis: /var/www/tesla-tv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zusammenfassung der Konfiguration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Repository:  https://github.com/meintesla/tesla-tv.git
  Domain:             tv.meineseite.de
  SSL:                y
  SSL Email:          admin@meineseite.de
  Install Verzeichnis: /var/www/tesla-tv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mit dieser Konfiguration fortfahren? (y/n) y

✓ Konfiguration bestätigt, starte Installation...

[... Installation läuft automatisch ...]
```

### Szenario 2: Ohne Domain, nur IP

```bash
root@vps:~# ./install.sh

[... Header ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GitHub Repository URL

   GitHub URL: https://github.com/user/tesla-tv.git

✓ GitHub URL: https://github.com/user/tesla-tv.git

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. Domain Name (Optional)

   Domain (oder Enter für keine): [Enter]

ℹ Keine Domain angegeben, verwende IP: 142.93.45.67

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. Installations-Verzeichnis

   Verzeichnis (oder Enter für Standard): [Enter]

✓ Installations-Verzeichnis: /var/www/tesla-tv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Zusammenfassung der Konfiguration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub Repository:  https://github.com/user/tesla-tv.git
  Domain:             Keine (IP-basiert)
  SSL:                n
  Install Verzeichnis: /var/www/tesla-tv

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mit dieser Konfiguration fortfahren? (y/n) y
```

## 💾 Konfigurationsspeicherung

Die eingegebene Konfiguration wird automatisch gespeichert:

```bash
/tmp/tesla-tv-config.sh
```

Diese Datei kann für spätere Updates verwendet werden.

## 🔄 Updates mit gespeicherter Konfiguration

Das automatisch erstellte Update-Script verwendet die gespeicherte Konfiguration:

```bash
# Auf VPS:
cd /var/www/tesla-tv
./update.sh

# Führt aus:
# - git pull
# - npm install
# - npm run build
# - Berechtigungen setzen
# - Nginx reload
```

## ✅ Vorteile der interaktiven Installation

1. ✨ **Keine Datei-Bearbeitung nötig**
   - Kein nano/vim erforderlich
   - Keine Git-Kenntnisse für Script-Anpassung

2. 🛡️ **Validierung**
   - Eingaben werden geprüft
   - Fehlerhafte URLs werden erkannt

3. 📋 **Übersichtlich**
   - Zusammenfassung vor Installation
   - Bestätigung erforderlich

4. 💾 **Wiederverwendbar**
   - Konfiguration wird gespeichert
   - Update-Script verwendet gespeicherte Werte

5. 🎯 **Flexibel**
   - Mit oder ohne Domain
   - Mit oder ohne SSL
   - Custom Installation Directory

## 🆘 Fehlerbehandlung

### Ungültige GitHub URL
```
✗ GitHub URL darf nicht leer sein!
```
→ Geben Sie eine gültige URL ein

### Format-Warnung
```
⚠ URL Format scheint nicht korrekt zu sein
   Trotzdem verwenden? (y/n)
```
→ Prüfen Sie die URL oder fahren Sie fort

### Installation abgebrochen
```
⚠ Installation abgebrochen
```
→ Script beendet, keine Änderungen vorgenommen

## 🔧 Manuelle Konfiguration (falls nötig)

Sie können das Script auch mit vordefinierten Werten verwenden:

```bash
# Umgebungsvariablen setzen
export GITHUB_REPO="https://github.com/user/tesla-tv.git"
export DOMAIN="tv.example.com"
export SETUP_SSL="y"
export SSL_EMAIL="admin@example.com"

# Script starten
./install.sh
```

Das Script wird dann die Umgebungsvariablen verwenden.

## 📚 Verwandte Dokumente

- **START-HIER.txt** - Schnellstart Guide
- **DEPLOYMENT.md** - Vollständige Deployment-Anleitung
- **GITHUB-PUSH.md** - GitHub Setup
- **README.md** - Projekt-Dokumentation
