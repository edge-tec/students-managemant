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
        # If directory has other files from aaPanel, remove immutable flags and clear
        chattr -R -i "$TARGET_DIR" 2>/dev/null || true
        rm -rf "$TARGET_DIR" 2>/dev/null || true
    fi
    git clone https://github.com/edge-tec/students-managemant.git "$TARGET_DIR" || (
        # If directory still exists and non-empty, clone into temp and move
        TMP_CLONE="/tmp/students-mgmt-$$"
        git clone https://github.com/edge-tec/students-managemant.git "$TMP_CLONE"
        cp -a "$TMP_CLONE/." "$TARGET_DIR/"
        rm -rf "$TMP_CLONE"
    )
    cd "$TARGET_DIR"
fi

# 5. Create production .env
echo "[5/8] Creating production .env file..."
cat << EOF > .env
DATABASE_URL="postgresql://student_manage:student_manage@127.0.0.1:5432/student_manage?schema=public"
JWT_SECRET="eliteali_jwt_secret_production_key_9876543210"
NEXTAUTH_SECRET="eliteali_nextauth_production_key_0123456789"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_DEFAULT_LOCALE="bn"
GEMINI_API_KEY=""
UPLOAD_DIR="./uploads"
EOF

# 6. Install Node dependencies & setup Prisma
echo "[6/8] Installing dependencies and migrating database..."
npm install --legacy-peer-deps
npx prisma generate
npx prisma db push
node scripts/seed.mjs
node scripts/provision-admin.mjs --email="admin@eliteali.com" --name="EliteAli Admin" --password="edge2129" --reset-password

mkdir -p uploads/pdfs
chmod -R 775 uploads

# 7. Build Next.js application
echo "[7/8] Building Next.js application..."
npm run build

# 8. Start with PM2
echo "[8/8] Starting PM2 process manager..."
npm install -g pm2
pm2 delete "${DOMAIN}" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=========================================================="
echo " INSTALLATION SUCCESSFUL!"
echo " App running on http://127.0.0.1:3006"
echo " Next steps in aaPanel:"
echo " 1. Go to Website -> ${DOMAIN} -> Reverse Proxy"
echo " 2. Set Target URL to: http://127.0.0.1:3006"
echo " 3. Apply SSL certificate (Let's Encrypt)"
echo " 4. Admin Login: https://${DOMAIN}/admin/login"
echo "    Email: admin@eliteali.com"
echo "    Password: edge2129"
echo "=========================================================="
