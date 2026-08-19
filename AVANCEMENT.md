# Avancement — Mdiscover Impex Food (mdiscover.ma)

Dernière mise à jour : 2026-07-30

## Périmètre
Backend NestJS + PostgreSQL (Prisma) + Docker — **Food & Hygiène uniquement** (pas de cosmétique).

## Stack retenue
- NestJS + Prisma 6 + PostgreSQL + JWT + Docker — cible OVH VPS

---

## Étapes du projet

| # | Module | Statut |
|---|--------|--------|
| 1 | Setup projet | ✅ FAIT |
| 2 | Auth & Users | ✅ FAIT |
| 3 | Produits Food | ✅ FAIT |
| 4 | Recherche & filtres | ✅ FAIT |
| 5 | Panier & commande directe | ✅ FAIT |
| 6 | Devis (quotes) | ✅ FAIT |
| 7 | Commandes | ✅ FAIT |
| 8 | Paiements | ✅ FAIT |
| 9 | Livraison | ✅ FAIT |
| 10 | Retours & remboursements | ✅ FAIT |
| 11 | Avis, favoris, blog, pages légales, FAQ | ✅ FAIT |
| 12 | Panel d'administration | ✅ FAIT |
| — | Polish post-backend (docs, robots, backups Win) | ✅ FAIT |

---

## Backend Food — statut global
**12/12 modules CDC livrés** + polish docs/SEO.  
Structure : `backend/` (Nest) + `frontend/` (Next).  
API : `http://localhost:3000/api/v1` — Front : `http://localhost:3001` — Postgres **55432**.  
Admin : `admin@mdiscover.ma` / `Admin123!`.  
Lancer : `npm run db:up` → `npm run dev:api` + `npm run dev:web`.

### Suite (hors CDC modules)
| Option | Description |
|--------|-------------|
| A | Commit git du backend |
| B | Déploiement OVH (`docker-compose.prod.yml`) |
| C | Frontend — **démarré** (`frontend/` Next.js port 3001) |

### Frontend (pages)
Boutique + espace client + **admin UI `/admin`**.

Périmètre front : **Food & Hygiène uniquement** (pas de cosmétique).

Pages : `/`, `/catalogue`, `/categories`, `/marques`, `/produits/[slug]`,
`/recherche`, `/panier`, `/commande`, `/inscription`, `/connexion`, `/compte`,
`/compte/commandes`, `/compte/devis`, `/devis`, `/suivi`, `/contact`, `/faq`,
`/blog`, `/legal/[slug]`, `/admin` (+ commandes, devis, produits, clients, contenu).

```bash
npm run dev:api   # API :3000
npm run dev:web   # Front :3001 → http://localhost:3001
# Admin : http://localhost:3001/admin  (admin@mdiscover.ma / Admin123!)
```

---

## Étape 12 — Panel d'administration (résumé)
Dashboard, stats, export/import CSV, settings, audit, sitemap — voir journal.

### Polish post-backend
- [x] `robots.txt` public
- [x] README carte API à jour
- [x] `.env.example` + `RETURN_WINDOW_DAYS`
- [x] Scripts backup/restore PowerShell

---

## Journal
| Date | Action |
|------|--------|
| 2026-07-30 | Étapes 1–7 : setup → commandes |
| 2026-07-30 | Étape 8 : paiements CMI + virement, stubs Stripe/COD |
| 2026-07-30 | Étape 9 : zones, tarifs, transporteurs, shipments + tracking |
| 2026-07-30 | Étape 10 : retours, remboursements, avoir PDF |
| 2026-07-30 | Étape 11 : avis, favoris, blog, FAQ, légal, bannières |
| 2026-07-30 | Étape 12 : dashboard admin, stats, CSV, settings, sitemap |
| 2026-07-30 | Polish : robots.txt, README, backups Windows |
| 2026-07-30 | Frontend Next.js démarré (home, catalogue, produit, login, panier, recherche) |
| 2026-07-30 | Seed catalogue : 16 produits Food & Hygiène + catégories/marques/FAQ |
| 2026-07-31 | Frontend Food & Hygiène only — Cosmétique retiré ; admin `/admin` |
