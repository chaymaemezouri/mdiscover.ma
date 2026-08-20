#!/usr/bin/env bash
# Déploiement production MDISCOVER sur le VPS OVH.
# Usage (sur le VPS) : bash scripts/deploy-vps.sh

set -euo pipefail

load_node_tools() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
  elif [[ -s "$HOME/.fnm/fnm" ]]; then
    # shellcheck source=/dev/null
    eval "$("$HOME/.fnm/fnm" env)"
  elif [[ -s "$HOME/.local/share/fnm/fnm" ]]; then
    # shellcheck source=/dev/null
    eval "$("$HOME/.local/share/fnm/fnm" env)"
  elif [[ -s "$HOME/.profile" ]]; then
    # shellcheck source=/dev/null
    . "$HOME/.profile"
  elif [[ -s "$HOME/.bashrc" ]]; then
    # shellcheck source=/dev/null
    . "$HOME/.bashrc"
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm introuvable (SSH non interactif). Installe Node via nvm ou ajoute-le au PATH." >&2
    exit 1
  fi

  echo "==> Node $(node -v) | npm $(npm -v)"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> MDISCOVER deploy @ $(date -Is)"
load_node_tools

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

echo "==> Attente démarrage API"
sleep 8
if ! docker ps --format '{{.Names}} {{.Status}}' | grep -q 'mdiscover-app-prod Up'; then
  echo "ERROR: conteneur API non démarré" >&2
  docker logs mdiscover-app-prod --tail 80 || true
  exit 1
fi

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
for i in $(seq 1 45); do
  if curl -sf http://127.0.0.1:3100/api/v1/health >/dev/null; then
    echo "API OK"
    break
  fi
  if [[ "$i" -eq 45 ]]; then
    echo "ERROR: API health check failed" >&2
    docker logs mdiscover-app-prod --tail 80 || true
    exit 1
  fi
  sleep 2
done

echo "==> Deploy terminé"
