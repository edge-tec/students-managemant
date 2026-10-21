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

echo "[1/5] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[2/5] Updating dependencies..."
npm install --legacy-peer-deps

echo "[3/5] Regenerating Prisma Client..."
npx prisma generate

echo "[4/5] Building Next.js application..."
npm run build

echo "[5/5] Restarting PM2 process..."
pm2 reload "${DOMAIN}" 2>/dev/null || pm2 restart "${DOMAIN}" 2>/dev/null || pm2 start ecosystem.config.cjs
pm2 save

echo "=========================================================="
echo " UPDATE COMPLETE & SERVICE RUNNING!"
echo " Check status: pm2 status"
echo " View logs:    pm2 logs ${DOMAIN}"
echo "=========================================================="
