# GitHub Push Anleitung

## Schritt 1: GitHub Repository erstellen

1. Gehen Sie zu https://github.com
2. Klicken Sie auf das "+" Symbol oben rechts
3. Wählen Sie "New repository"
4. Repository Name: `tesla-tv`
5. Beschreibung: `Tesla TV IPTV Application`
6. Wählen Sie: **Private** (empfohlen) oder Public
7. **WICHTIG**: Wählen Sie **NICHT** "Initialize this repository with a README"
8. Klicken Sie auf "Create repository"

GitHub zeigt Ihnen dann die Repository URL, z.B.:
```
https://github.com/IHR_USERNAME/tesla-tv.git
```

## Schritt 2: Lokales Projekt zu GitHub pushen

Öffnen Sie Git Bash oder Command Prompt in Ihrem Projekt-Ordner:

```bash
cd C:\Users\ozgr\Documents\tesla-tv

# Aktuellen Status prüfen
git status

# Alle Dateien hinzufügen
git add .

# Commit erstellen (falls noch nicht geschehen)
git commit -m "Initial commit: Tesla TV Application with all features"

# GitHub Repository als Remote hinzufügen
git remote add origin https://github.com/IHR_USERNAME/tesla-tv.git

# Prüfen ob Remote korrekt ist
git remote -v

# Push zu GitHub (main branch)
git push -u origin master
```

**HINWEIS**: Wenn Ihr Branch `main` heißt statt `master`, verwenden Sie:
```bash
git branch -M main
git push -u origin main
```

## Schritt 3: Installation Script anpassen

Nach erfolgreichem Push:

1. Öffnen Sie `install.sh`
2. Ändern Sie die Zeile:
   ```bash
   GITHUB_REPO="https://github.com/YOUR_USERNAME/tesla-tv.git"
   ```
   zu Ihrer echten GitHub URL:
   ```bash
   GITHUB_REPO="https://github.com/IHR_USERNAME/tesla-tv.git"
   ```
3. Speichern und erneut zu GitHub pushen:
   ```bash
   git add install.sh
   git commit -m "Update install.sh with correct GitHub URL"
   git push
   ```

## Schritt 4: Installation auf VPS

Jetzt können Sie auf Ihrem VPS installieren:

```bash
# SSH Verbindung
ssh root@YOUR_VPS_IP

# Installation Script herunterladen
wget https://raw.githubusercontent.com/IHR_USERNAME/tesla-tv/main/install.sh

# Oder für master branch:
wget https://raw.githubusercontent.com/IHR_USERNAME/tesla-tv/master/install.sh

# Ausführbar machen
chmod +x install.sh

# Installation starten
./install.sh
```

## Häufige Probleme

### Problem: "Permission denied (publickey)"

Wenn Git nach einem Passwort fragt oder Permission denied zeigt:

**Lösung 1: HTTPS mit Personal Access Token**
1. Gehen Sie zu GitHub Settings → Developer settings → Personal access tokens
2. Klicken Sie "Generate new token (classic)"
3. Geben Sie dem Token einen Namen: "Tesla TV Deployment"
4. Wählen Sie Scope: `repo` (full control)
5. Klicken Sie "Generate token"
6. **KOPIEREN Sie den Token** (wird nur einmal angezeigt!)
7. Verwenden Sie den Token statt Passwort beim Push:
   ```bash
   git push -u origin master
   Username: IHR_GITHUB_USERNAME
   Password: HIER_DEN_TOKEN_EINFÜGEN
   ```

**Lösung 2: SSH Key einrichten**
```bash
# SSH Key generieren
ssh-keygen -t ed25519 -C "your_email@example.com"

# Public Key anzeigen
cat ~/.ssh/id_ed25519.pub

# Kopieren Sie den Key und fügen Sie ihn zu GitHub hinzu:
# GitHub → Settings → SSH and GPG keys → New SSH key

# Remote URL auf SSH ändern
git remote set-url origin git@github.com:IHR_USERNAME/tesla-tv.git
```

### Problem: "Repository not found"

Stellen Sie sicher, dass:
- Die Repository URL korrekt ist
- Sie die richtigen GitHub-Zugangsdaten verwenden
- Das Repository auf GitHub existiert

### Problem: "Updates were rejected"

Falls es Remote-Änderungen gibt:
```bash
git pull origin master --rebase
git push
```

## Nach erfolgreichem Push

✅ Ihr Code ist jetzt auf GitHub
✅ Das Installation Script kann das Repository klonen
✅ Sie können Updates einfach deployen mit:

```bash
# Änderungen machen
git add .
git commit -m "Update: beschreibung der änderung"
git push

# Dann auf VPS:
cd /var/www/tesla-tv
./update.sh
```

## Private Repository

Falls Ihr Repository private ist, muss das Installation Script authentifizieren:

### Option 1: Deploy Key (Empfohlen für Private Repos)
```bash
# Auf dem VPS:
ssh-keygen -t ed25519 -C "vps-deploy-key"
cat ~/.ssh/id_ed25519.pub

# Fügen Sie diesen Key als Deploy Key in GitHub hinzu:
# Repository → Settings → Deploy keys → Add deploy key
# Titel: "VPS Deploy Key"
# Key: [eingefügter public key]
# ✓ Allow write access (falls Sie vom VPS pushen wollen)
```

### Option 2: Personal Access Token
```bash
# Im install.sh ändern:
GITHUB_REPO="https://TOKEN@github.com/IHR_USERNAME/tesla-tv.git"
```

## Backup Strategie

Nach jedem größeren Feature:
```bash
git add .
git commit -m "Feature: beschreibung"
git push
git tag -a v1.0.0 -m "Version 1.0.0"
git push --tags
```
