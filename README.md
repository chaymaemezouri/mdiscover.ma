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
