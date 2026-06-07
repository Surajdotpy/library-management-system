# Library Management System

## Tech Stack

- **Backend:** Node.js, TypeScript, Express 5
- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS 4
- **Desktop:** Electron 41, electron-builder
- **Database:** PostgreSQL 16, raw SQL via `pg` (no ORM)
- **Real-time:** Socket.IO 4
- **Payments:** Cashfree (mock/sandbox/production modes)
- **Auth:** JWT + bcrypt
- **Validation:** Zod 4
- **Testing:** Vitest 4, Supertest (backend), @testing-library/react (frontend)
- **Package manager:** npm

## Project Structure

```
backend/src/
  app.ts                  -- Express app setup
  server.ts               -- HTTP + Socket.IO server
  config/                 -- env, db, cors config
  database/
    migrations/           -- Timestamped .sql files
    migration-runner.ts   -- Auto-applies pending migrations
  middleware/             -- auth, rate-limit, error handling
  modules/                -- Feature modules (auth, users, students, seats, etc.)
    <module>/
      <module>.routes.ts     -- Express Router
      <module>.controller.ts -- Request/response handlers
      <module>.service.ts    -- Business logic + SQL queries
      <module>.types.ts      -- TypeScript interfaces
  tests/api/              -- Integration tests per module

desktop-app/src/
  pages/                  -- React pages (lazy-loaded)
  components/             -- ui/, layout/, features/
  lib/api/                -- Axios wrappers per module
  lib/config/             -- Runtime config
  types/                  -- Shared TypeScript types
```

## Module Convention

Every feature module follows: `routes -> controller -> service -> database`

- **routes.ts** — Define Express Router, inline Zod validation, wire controllers
- **controller.ts** — Parse request, validate, call service, format response (thin)
- **service.ts** — Business logic, parameterized SQL via `pool.query()`
- **types.ts** — TypeScript interfaces

## API Response Envelope

```ts
{ success: boolean, data?: T, error?: string, message?: string }
```

## Coding Conventions

- ESM imports with file extensions
- `module.responsibility.ts` naming (e.g., `auth.controller.ts`)
- Raw SQL with `$1, $2` parameterized queries (no ORM)
- Controllers: try/catch → return JSON error with status code
- Services: throw `Error` with descriptive message
- Migrations: `YYYYMMDD_NN_description.sql` files
- Frontend: `@/` path alias, barrel exports from `types/index.ts`
- All API responses use `{ success, data?, error? }` envelope

## Key Scripts

```bash
backend/
  npm run dev             # Start dev server with hot reload
  npm run test            # Run integration tests
  npm run db:migrate      # Run pending migrations

desktop-app/
  npm run dev             # Vite dev + Electron
  npm run electron:build  # Build Windows installer

Root/
  docker compose up -d --build   # Deploy backend + DB
```

## Routes

All API routes under `/api`:
- `POST /api/auth/login`
- `GET /api/auth/me`
- CRUD for: users, students, seats, branches, attendance, payments, reports, notifications, dashboard

## Environments

- `NODE_ENV=development` — local dev with `.env`
- `NODE_ENV=test` — uses `.env.test`, separate test DB
- `NODE_ENV=production` — Docker deployment

## Deployment

CI/CD via GitHub Actions (`.github/workflows/deploy.yml`):
- Push to `main` → auto-deploy backend on VPS + build + publish desktop app to GitHub Releases
- Desktop app downloads/updates via GitHub Releases (electron-updater with `publish: github`)
- Manual fallback: `ssh VPS → git pull → docker compose up -d --build`
