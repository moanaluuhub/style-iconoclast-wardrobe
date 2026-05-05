# Style Iconoclast — Developer Handover Guide

This document explains everything a developer needs to know to take over this project, run it locally, and replace the Manus-specific infrastructure with standard self-hosted equivalents.

---

## Project Overview

**Style Iconoclast** is a digital wardrobe management application built with:

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS 4 + shadcn/ui |
| API layer | tRPC 11 (end-to-end type-safe RPC) |
| Backend | Express 4 (Node.js) |
| Database ORM | Drizzle ORM |
| Database | MySQL / TiDB |
| Auth | OAuth 2.0 (currently Manus OAuth — see below) |
| File storage | S3-compatible object storage (currently Manus Storage) |
| Maps | Google Maps JavaScript API (proxied via Manus) |

---

## Key Features

- **Wardrobe** — add, tag, and organise clothing items with photos
- **Outfits** — build multi-piece looks from wardrobe items, track cost-per-wear
- **Build Your Look** — AI-assisted outfit builder
- **Travel Planner** — plan outfits day-by-day for trips, share trip itineraries via public link
- **Designers** — browse and follow designer pages
- **Style Index** — analytics: cost-per-wear, category breakdown, most-worn pieces
- **Wishlist / Cart** — save items to buy later
- **Sharing** — shareable public links for outfits and trips with lightbox thumbnails

---

## File Structure

```
client/                  ← React frontend (Vite)
  src/
    pages/               ← Page-level components
    components/          ← Reusable UI components
    contexts/            ← React contexts (auth, etc.)
    hooks/               ← Custom hooks
    lib/trpc.ts          ← tRPC client binding
    App.tsx              ← Routes & layout
    index.css            ← Global styles & Tailwind theme
drizzle/
  schema.ts              ← Database schema (single source of truth)
  migrations/            ← Auto-generated SQL migrations
server/
  routers.ts             ← All tRPC procedures (~1000 lines, split into sub-routers)
  db.ts                  ← All database query helpers
  storage.ts             ← S3 file storage helpers
  _core/                 ← Framework plumbing (DO NOT edit unless replacing infra)
    auth.ts              ← Session/cookie management
    context.ts           ← tRPC context (injects ctx.user)
    env.ts               ← Environment variable declarations
    llm.ts               ← LLM (AI) helper
    oauth.ts             ← OAuth flow handler
    imageGeneration.ts   ← Image generation helper
    map.ts               ← Google Maps backend helper
    notification.ts      ← Owner notification helper
shared/                  ← Shared constants & types (frontend + backend)
```

---

## Manus-Specific Infrastructure to Replace

The following components are currently provided by the Manus platform and need to be replaced with self-hosted equivalents when running outside Manus.

### 1. Authentication (OAuth)

**Current:** Manus OAuth 2.0 — users log in via the Manus identity portal.

**Files to replace:**
- `server/_core/oauth.ts` — handles `/api/oauth/callback`, token exchange, session creation
- `server/_core/auth.ts` — session cookie signing with `JWT_SECRET`
- `client/src/const.ts` — `getLoginUrl()` builds the Manus OAuth URL
- `client/src/contexts/AuthContext.tsx` — reads auth state from `trpc.auth.me`

**Recommended replacement:** [Auth.js (NextAuth)](https://authjs.dev/) or [Lucia](https://lucia-auth.com/) with email/password + social providers (Google, Apple). The `users` table in `drizzle/schema.ts` already has `id`, `openId`, `name`, `email`, `role` columns — extend as needed.

**Environment variables to replace:**
```
VITE_APP_ID          → your OAuth client ID
OAUTH_SERVER_URL     → your OAuth server base URL
VITE_OAUTH_PORTAL_URL → your login portal URL
JWT_SECRET           → keep this, just generate your own secret
OWNER_OPEN_ID        → remove (Manus-specific owner concept)
OWNER_NAME           → remove
```

---

### 2. Database

**Current:** TiDB (MySQL-compatible) hosted by Manus, connection string injected as `DATABASE_URL`.

**Files:** `drizzle/schema.ts` (schema), `server/db.ts` (queries), `drizzle/` (migrations)

**Recommended replacement:** Any MySQL 8+ compatible database:
- [PlanetScale](https://planetscale.com/) — serverless MySQL, free tier
- [Railway MySQL](https://railway.app/) — simple self-hosted MySQL
- [Supabase](https://supabase.com/) — PostgreSQL (requires changing Drizzle dialect from `mysql2` to `postgres`)
- Local MySQL via Docker: `docker run -e MYSQL_ROOT_PASSWORD=secret -p 3306:3306 mysql:8`

**To run migrations:**
```bash
DATABASE_URL="mysql://user:pass@host:3306/dbname" pnpm db:push
```

---

### 3. File Storage (S3)

**Current:** Manus internal S3-compatible storage. Files are uploaded via `server/storage.ts` → `storagePut()` and served via `/manus-storage/` path.

**Files to replace:**
- `server/storage.ts` — `storagePut()` and `storageGet()` helpers
- `server/_core/` — the storage proxy middleware that serves `/manus-storage/*`

**Recommended replacement:** [AWS S3](https://aws.amazon.com/s3/) or [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible, no egress fees).

Replace `storagePut` / `storageGet` with the AWS SDK v3:
```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
```

**Environment variables to add:**
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET
```

---

### 4. LLM / AI Features

**Current:** Manus built-in LLM API (`server/_core/llm.ts` → `invokeLLM()`).

**Files to replace:** `server/_core/llm.ts`

**Recommended replacement:** OpenAI SDK:
```ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```
The `invokeLLM` function signature mirrors the OpenAI chat completions API, so the swap is straightforward.

**Environment variables to add:**
```
OPENAI_API_KEY
```

---

### 5. Image Generation

**Current:** Manus built-in image generation (`server/_core/imageGeneration.ts` → `generateImage()`).

**Recommended replacement:** OpenAI DALL-E 3 or Stability AI. Replace `generateImage()` in `server/_core/imageGeneration.ts`.

---

### 6. Google Maps

**Current:** Proxied via Manus (`client/src/components/Map.tsx` + `server/_core/map.ts`). No API key needed in dev.

**Recommended replacement:** Get a [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key) and pass it directly:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
```

**Environment variables to add:**
```
VITE_GOOGLE_MAPS_API_KEY
```

---

### 7. Owner Notifications

**Current:** `server/_core/notification.ts` → `notifyOwner()` sends push notifications via Manus.

**Recommended replacement:** Email via [Resend](https://resend.com/) or [SendGrid](https://sendgrid.com/), or remove entirely if not needed.

---

## Running Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# 3. Push database schema
pnpm db:push

# 4. Start dev server (frontend + backend on port 3000)
pnpm dev
```

---

## Environment Variables Reference

Create a `.env` file at the project root:

```env
# Database (required)
DATABASE_URL=mysql://user:password@localhost:3306/wardrobe

# Auth (required)
JWT_SECRET=your-random-secret-min-32-chars

# OAuth — replace with your own provider
VITE_APP_ID=your-oauth-app-id
OAUTH_SERVER_URL=https://your-oauth-server.com
VITE_OAUTH_PORTAL_URL=https://your-login-portal.com

# AI (optional — only needed for AI features)
OPENAI_API_KEY=sk-...

# Storage (optional — only needed for file uploads)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=style-iconoclast

# Maps (optional — only needed for Travel map features)
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## Database Schema Summary

Key tables in `drizzle/schema.ts`:

| Table | Purpose |
|---|---|
| `users` | User accounts (id, openId, name, email, role) |
| `wardrobe_items` | Individual clothing/accessory items |
| `outfits` | Named outfit collections with shareToken |
| `outfit_items` | Many-to-many: outfits ↔ wardrobe_items |
| `trips` | Travel trips with dates, destination, shareToken |
| `trip_days` | Per-day outfit assignments (outfitId, outfitId2, labels) |
| `designers` | Designer profiles |
| `wishlist_items` | User wishlist |
| `cart_items` | Shopping cart |
| `price_points` | Price history per item |

---

## Deployment

The app is a standard Node.js Express server serving both the API (`/api/trpc`) and the built React frontend. Any Node.js hosting works:

- **Railway** — `railway up` (auto-detects Node.js)
- **Render** — connect GitHub repo, set build command `pnpm build`, start command `node dist/server/index.js`
- **Fly.io** — `fly launch`
- **Docker** — a `Dockerfile` can be added easily

---

## Contact

This project was built on the Manus platform. For questions about the original build, contact the project owner via GitHub: [@moanaluuhub](https://github.com/moanaluuhub).
