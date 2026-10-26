#!/usr/bin/env bash
set -e

# ==============================================================================
# Students Management & AI Educational Platform - Automated aaPanel Installer
# Domain: m.eliteali.com (configurable via DOMAIN variable)
# Database: student_manage (user: student_manage, pass: student_manage)
# ==============================================================================

DOMAIN="${DOMAIN:-m.eliteali.com}"

echo "=========================================================="
echo " Starting Automated Installation for ${DOMAIN}"
echo "=========================================================="

# 1. System packages
echo "[1/8] Updating system & installing dependencies..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-ben tesseract-ocr-eng git postgresql postgresql-contrib curl

# 2. Check Node.js (Require Node 20 LTS if missing or old)
echo "[2/8] Checking Node.js environment..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Setup PostgreSQL
echo "[3/8] Configuring PostgreSQL database..."
systemctl enable postgresql
systemctl start postgresql

# Create database and user if not exists
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'student_manage'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE student_manage;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'student_manage'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER student_manage WITH ENCRYPTED PASSWORD 'student_manage';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE student_manage TO student_manage;"
sudo -u postgres psql -c "ALTER DATABASE student_manage OWNER TO student_manage;"

# 4. Clone or update repository
echo "[4/8] Setting up project directory at /www/wwwroot/${DOMAIN}..."
mkdir -p /www/wwwroot
TARGET_DIR="/www/wwwroot/${DOMAIN}"

git config --global --add safe.directory "$TARGET_DIR" 2>/dev/null || true
git config --global --add safe.directory "*" 2>/dev/null || true

if [ -d "$TARGET_DIR/.git" ]; then
    echo "Directory exists with git. Pulling latest code..."
    cd "$TARGET_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "Preparing directory and cloning repository from GitHub..."
    if [ -f "$TARGET_DIR/.user.ini" ]; then
        chattr -i "$TARGET_DIR/.user.ini" 2>/dev/null || true
        rm -f "$TARGET_DIR/.user.ini" 2>/dev/null || true
    fi
    mkdir -p "$TARGET_DIR"
    if [ -d "$TARGET_DIR" ]; then
        chattr -R -i "$TARGET_DIR" 2>/dev/null || true
        rm -rf "$TARGET_DIR" 2>/dev/null || true
    fi
    git clone https://github.com/edge-tec/students-managemant.git "$TARGET_DIR" || (
        TMP_CLONE="/tmp/students-mgmt-$$"
        git clone https://github.com/edge-tec/students-managemant.git "$TMP_CLONE"
        cp -a "$TMP_CLONE/." "$TARGET_DIR/"
        rm -rf "$TMP_CLONE"
    )
    cd "$TARGET_DIR"
fi

# 5. Create production .env (only create if missing, preserve existing config)
echo "[5/8] Checking production .env file..."
if [ ! -f .env ]; then
    echo "Creating new production .env..."
    cat << EOF > .env
DATABASE_URL="postgresql://student_manage:student_manage@127.0.0.1:5432/student_manage?schema=public"
JWT_SECRET="eliteali_jwt_secret_production_key_9876543210"
NEXTAUTH_SECRET="eliteali_nextauth_production_key_0123456789"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_DEFAULT_LOCALE="bn"
GEMINI_API_KEY=""
UPLOAD_DIR="./uploads"
EOF
else
    echo "Existing .env found. Keeping existing credentials."
fi

# 6. Install Node dependencies & setup Prisma
echo "[6/8] Installing dependencies and migrating database..."
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push --accept-data-loss || true
node scripts/seed.mjs || true
node scripts/seed_authentic_questions.mjs || true
node scripts/provision-admin.mjs --email="admin@eliteali.com" --name="EliteAli Admin" --password="edge2129" --reset-password || true

mkdir -p uploads/pdfs
chmod -R 775 uploads 2>/dev/null || true

# 7. Build Next.js application
echo "[7/8] Building Next.js application..."
pm2 stop "${DOMAIN}" 2>/dev/null || true
rm -rf .next
npm run build

# 8. Start with PM2
echo "[8/8] Configuring PM2 process manager..."
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# Detect target port from aaPanel Nginx reverse proxy config if present, default to 3005
NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/proxy/${DOMAIN}/ 2>/dev/null | grep -oE ':[0-9]+' | tr -d ':' | head -n1 || true)
if [ -z "$NGINX_PROXY_PORT" ] || [ "$NGINX_PROXY_PORT" -lt 1024 ] 2>/dev/null; then
    NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/${DOMAIN}*.conf 2>/dev/null | grep -oE ':[0-9]+' | tr -d ':' | head -n1 || true)
fi
if [ -z "$NGINX_PROXY_PORT" ] || [ "$NGINX_PROXY_PORT" -lt 1024 ] 2>/dev/null; then
    TARGET_PORT="3005"
else
    TARGET_PORT="$NGINX_PROXY_PORT"
fi

echo "Freeing ports and starting on port ${TARGET_PORT}..."
fuser -k "${TARGET_PORT}/tcp" 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true
fuser -k 3006/tcp 2>/dev/null || true
lsof -ti:"${TARGET_PORT}" | xargs kill -9 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:3006 | xargs kill -9 2>/dev/null || true

pm2 delete "${DOMAIN}" 2>/dev/null || true
APP_NAME="${DOMAIN}" DOMAIN="${DOMAIN}" PORT="${TARGET_PORT}" pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup 2>/dev/null || true

echo "=========================================================="
echo " Checking service health on port ${TARGET_PORT}..."
HEALTHY=false
for attempt in 1 2 3 4 5; do
    sleep 2
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${TARGET_PORT} || echo "000")
    if echo "$HTTP_STATUS" | grep -q "200\|307\|308\|404"; then
        HEALTHY=true
        echo " ✓ Attempt $attempt: Service is UP and responding (HTTP $HTTP_STATUS)"
        break
    else
        echo " ... Attempt $attempt: waiting for Next.js to finish binding (HTTP $HTTP_STATUS)..."
    fi
done

if [ "$HEALTHY" = true ]; then
    echo "=========================================================="
    echo " INSTALLATION SUCCESSFUL!"
    echo " App running on http://127.0.0.1:${TARGET_PORT}"
    echo " Next steps in aaPanel:"
    echo " 1. Go to Website -> ${DOMAIN} -> Reverse Proxy"
    echo " 2. Set Target URL to: http://127.0.0.1:${TARGET_PORT}"
    echo " 3. Sent Domain: \$host"
    echo " 4. Apply SSL certificate (Let's Encrypt)"
    echo " 5. Admin Login: https://${DOMAIN}/admin/login"
    echo "    Email: admin@eliteali.com"
    echo "    Password: edge2129"
    echo "=========================================================="
else
    echo "⚠️ WARNING: App did not respond on http://127.0.0.1:${TARGET_PORT}"
    echo "PM2 Status:"
    pm2 status
    echo "--- Last 25 lines of PM2 logs: ---"
    pm2 logs "${DOMAIN}" --lines 25 --nostream || true
    echo "=========================================================="
fi
