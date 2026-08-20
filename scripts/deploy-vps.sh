#!/usr/bin/env bash
# Déploiement production MDISCOVER sur le VPS OVH.
# Usage (sur le VPS) : bash scripts/deploy-vps.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> MDISCOVER deploy @ $(date -Is)"

if [[ ! -f backend/.env ]]; then
  echo "ERROR: backend/.env manquant sur le VPS." >&2
  exit 1
fi

if [[ ! -f frontend/.env.production ]]; then
  echo "ERROR: frontend/.env.production manquant sur le VPS." >&2
  exit 1
fi

echo "==> Backend (Docker)"
docker compose -p mdiscover --env-file backend/.env -f docker-compose.prod.yml up -d --build app

echo "==> Frontend (build)"
cd frontend
npm install
npm run build
cd "$ROOT_DIR"

echo "==> Frontend (PM2)"
if pm2 describe mdiscover-web >/dev/null 2>&1; then
  pm2 startOrRestart frontend/ecosystem.config.cjs
else
  pm2 start frontend/ecosystem.config.cjs
fi
pm2 save

echo "==> Health check"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3100/api/v1/health >/dev/null; then
    echo "API OK"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "ERROR: API health check failed" >&2
    exit 1
  fi
  sleep 2
done

echo "==> Deploy terminé"
