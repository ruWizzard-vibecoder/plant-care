# Plant Care — intelligent plant care PWA

Progressive web app that identifies plants and builds a personalized care plan (watering, light, feeding, seasonal adjustments) with AI.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **tRPC v11** — end-to-end typed API
- **Prisma 7** + **PostgreSQL**
- **Better Auth** — email/password + OAuth
- **Claude Haiku** — plant identification and care recommendations
- **Web Push** (VAPID) — care reminders
- PWA (installable, offline-friendly)

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values (see below)
npx prisma migrate dev
npm run dev
```

## Environment

Copy `.env.example` and provide your own values. Required keys include:

- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API key (AI features)
- `PLANTNET_API_KEY` / `PERENUAL_API_KEY` — plant data sources
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — auth
- `RESEND_API_KEY`, `EMAIL_FROM` — transactional email (optional)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — web push
- `CRON_SECRET` — protects the notification cron endpoint

All AI and email features are gated on their keys: if a key is absent, that feature degrades gracefully instead of failing.

## Build

```bash
npm run build
npm start
```

## Scripts

`scripts/` contains one-off data tools (species import, translation, image fetch). They read API keys from the environment and save resumable state locally.
