#!/usr/bin/env bash
set -e

# ==============================================================================
# Students Management & AI Educational Platform - Quick aaPanel Updater
# Domain: m.eliteali.com (configurable via DOMAIN variable)
# ==============================================================================

DOMAIN="${DOMAIN:-m.eliteali.com}"
TARGET_DIR="/www/wwwroot/${DOMAIN}"

echo "=========================================================="
echo " Updating Application for ${DOMAIN}"
echo "=========================================================="

if [ ! -d "$TARGET_DIR" ]; then
    # Fallback to current directory if running directly inside the app folder
    if [ -f "ecosystem.config.cjs" ]; then
        TARGET_DIR="$(pwd)"
    else
        echo "Error: Directory $TARGET_DIR does not exist."
        exit 1
    fi
fi

cd "$TARGET_DIR"

echo "[1/7] Setting git safe directory..."
git config --global --add safe.directory "$TARGET_DIR" || true
git config --global --add safe.directory "*" || true

echo "[2/7] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[3/7] Updating dependencies..."
systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null || true
npm install --legacy-peer-deps

echo "[4/7] Regenerating Prisma Client & syncing database..."
npx prisma generate
npx prisma db push --accept-data-loss || true

echo "[5/7] Ensuring administrator account exists & seeding authentic question bank..."
node scripts/provision-admin.mjs --email="admin@eliteali.com" --name="EliteAli Admin" --password="edge2129" --reset-password || true
node scripts/seed_authentic_questions.mjs || true

echo "[6/7] Building Next.js application..."
# Stop PM2 and clear stale build cache to prevent manifest corruption
pm2 stop "${DOMAIN}" 2>/dev/null || true
rm -rf .next
npm run build

# Detect target port from aaPanel Nginx reverse proxy config if present, default to 3005
NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/proxy/${DOMAIN}/ 2>/dev/null | grep -oE '[0-9]+' | head -n1 || true)
if [ -z "$NGINX_PROXY_PORT" ]; then
    NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/${DOMAIN}*.conf 2>/dev/null | grep -oE '[0-9]+' | head -n1 || true)
fi
TARGET_PORT="${NGINX_PROXY_PORT:-3005}"

echo "[7/7] Freeing ports (3005, 3006) and restarting PM2 daemon on port ${TARGET_PORT}..."
# Ensure PM2 is installed
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# Kill any orphaned processes holding port 3005 or 3006
fuser -k 3005/tcp 2>/dev/null || true
fuser -k 3006/tcp 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:3006 | xargs kill -9 2>/dev/null || true
kill -9 $(netstat -tlpn 2>/dev/null | grep -E ':3005|:3006' | awk '{print $7}' | cut -d/ -f1) 2>/dev/null || true

pm2 delete "${DOMAIN}" 2>/dev/null || true
PORT="${TARGET_PORT}" pm2 start ecosystem.config.cjs --update-env
pm2 save

echo "=========================================================="
echo " Checking service health on port ${TARGET_PORT}..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${TARGET_PORT} | grep -q "200\|307\|308\|404"; then
    echo " SUCCESS: Application is running and responding on http://127.0.0.1:${TARGET_PORT}!"
else
    echo "⚠️ Notice: Checking PM2 process status..."
    pm2 status
    echo "--- Last 20 lines of PM2 log: ---"
    pm2 logs "${DOMAIN}" --lines 20 --nostream || true
fi
echo "=========================================================="
echo " UPDATE COMPLETE!"
echo " Portal:      https://${DOMAIN}/login"
echo " Admin Login: https://${DOMAIN}/admin/login"
echo " Credentials: admin@eliteali.com / edge2129"
echo "=========================================================="
