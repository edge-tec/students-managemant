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

echo "[1/6] Setting git safe directory..."
git config --global --add safe.directory "$TARGET_DIR" || true
git config --global --add safe.directory "*" || true

echo "[2/6] Pulling latest code from GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[3/6] Updating dependencies..."
npm install --legacy-peer-deps

echo "[4/6] Regenerating Prisma Client..."
npx prisma generate

echo "[5/6] Building Next.js application..."
npm run build

echo "[6/6] Hard restarting PM2 daemon with fresh build..."
pm2 delete "${DOMAIN}" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "=========================================================="
echo " UPDATE COMPLETE & SERVICE RUNNING ON PORT 3006!"
echo " Check status: pm2 status"
echo " View logs:    pm2 logs ${DOMAIN} --lines 20"
echo "=========================================================="
