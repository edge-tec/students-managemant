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
NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/proxy/${DOMAIN}/ 2>/dev/null | grep -oE ':[0-9]+' | tr -d ':' | head -n1 || true)
if [ -z "$NGINX_PROXY_PORT" ] || [ "$NGINX_PROXY_PORT" -lt 1024 ] 2>/dev/null; then
    NGINX_PROXY_PORT=$(grep -rh "proxy_pass http://127.0.0.1:" /www/server/panel/vhost/nginx/${DOMAIN}*.conf 2>/dev/null | grep -oE ':[0-9]+' | tr -d ':' | head -n1 || true)
fi
if [ -z "$NGINX_PROXY_PORT" ] || [ "$NGINX_PROXY_PORT" -lt 1024 ] 2>/dev/null; then
    TARGET_PORT="3005"
else
    TARGET_PORT="$NGINX_PROXY_PORT"
fi

echo "[7/7] Freeing ports (3005, 3006) and restarting PM2 daemon on port ${TARGET_PORT}..."
# Ensure PM2 is installed
command -v pm2 >/dev/null 2>&1 || npm install -g pm2

# Kill any orphaned processes holding the target port or default ports
fuser -k "${TARGET_PORT}/tcp" 2>/dev/null || true
fuser -k 3005/tcp 2>/dev/null || true
fuser -k 3006/tcp 2>/dev/null || true
lsof -ti:"${TARGET_PORT}" | xargs kill -9 2>/dev/null || true
lsof -ti:3005 | xargs kill -9 2>/dev/null || true
lsof -ti:3006 | xargs kill -9 2>/dev/null || true
kill -9 $(netstat -tlpn 2>/dev/null | grep -E ":${TARGET_PORT}|:3005|:3006" | awk '{print $7}' | cut -d/ -f1) 2>/dev/null || true

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
        echo " ✓ Attempt $attempt: SUCCESS: Application is running and responding (HTTP $HTTP_STATUS)!"
        break
    else
        echo " ... Attempt $attempt: waiting for Next.js to finish binding (HTTP $HTTP_STATUS)..."
    fi
done

if [ "$HEALTHY" = true ]; then
    echo "=========================================================="
    echo " UPDATE COMPLETE!"
    echo " Portal:      https://${DOMAIN}/login"
    echo " Admin Login: https://${DOMAIN}/admin/login"
    echo " Credentials: admin@eliteali.com / edge2129"
    echo "=========================================================="
else
    echo "⚠️ Notice: Checking PM2 process status..."
    pm2 status
    echo "--- Last 25 lines of PM2 log: ---"
    pm2 logs "${DOMAIN}" --lines 25 --nostream || true
    echo "=========================================================="
fi
