# Mdiscover Impex Food

Monorepo :
- `backend/` — NestJS + Prisma + PostgreSQL
- `frontend/` — Next.js (storefront)

## Première installation

```bash
# 1. Docker Desktop ouvert
npm run db:up

# 2. Dépendances
npm run install:all

# 3. DB
npm run migrate
npm run seed
```

## Lancer en dev (2 terminaux)

```bash
# Terminal 1 — API http://localhost:3000
npm run dev:api

# Terminal 2 — Site http://localhost:3001
npm run dev:web
```

Ou manuellement :

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

## Comptes seed

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@mdiscover.ma` | `Admin123!` |
| Client | `client1@test.ma` | `Client123!` |

## URLs

- Front : http://localhost:3001
- API : http://localhost:3000/api/v1
- Health : http://localhost:3000/api/v1/health

## Emails transactionnels (Gmail)

Templates pro MDiscover (logo + branding) envoyés automatiquement :

| Événement | Email |
|-----------|--------|
| Inscription (ou 1er login Google) | Bienvenue |
| Chaque connexion client (email ou Google) | Bon retour |
| Statut commande → Confirmée | Commande confirmée |
| → En préparation | En préparation |
| → Expédiée / En livraison | En livraison |
| → Livrée | Livrée |

Dans `backend/.env` :

```env
MAIL_USER=votre@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM=MDiscover <votre@gmail.com>
MAIL_SUPPORT=contact@mdiscover.ma
```

`MAIL_PASS` = **mot de passe d’application** Google (pas le mot de passe du compte) :
1. Activez la validation en 2 étapes
2. Créez un mot de passe d’app : https://myaccount.google.com/apppasswords

Sans `MAIL_USER` / `MAIL_PASS`, l’API démarre normalement et les emails sont ignorés (log warning).

## CI/CD (GitHub → VPS OVH)

Chaque `git push` sur `main` :

1. **CI** — build + lint backend et frontend
2. **Deploy** — pull sur le VPS, rebuild API Docker + frontend PM2

### 1. Secrets GitHub

Repo → **Settings → Secrets and variables → Actions** :

| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `51.255.161.97` |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | clé privée SSH (voir ci-dessous) |
| `VPS_DEPLOY_PATH` | `/home/ubuntu/projects/mdiscover` (optionnel) |

### 2. Clé SSH déploiement (une fois, sur le VPS)

```bash
ssh-keygen -t ed25519 -C "github-actions-mdiscover" -f ~/.ssh/github_actions_mdiscover -N ""
cat ~/.ssh/github_actions_mdiscover.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/github_actions_mdiscover
```

Copie **toute** la clé privée affichée dans le secret GitHub `VPS_SSH_KEY`.

### 3. Fichiers prod sur le VPS (ne pas committer)

```bash
# backend/.env — déjà en place
# frontend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

### 4. Workflow quotidien

```bash
git add -A
git commit -m "feat: ma modification"
git push
```

GitHub Actions déploie automatiquement. Suivi : onglet **Actions** du repo.

Deploy manuel : **Actions → Deploy Production → Run workflow**.

Deploy manuel sur le VPS :

```bash
cd ~/projects/mdiscover
git pull origin main
bash scripts/deploy-vps.sh
```
