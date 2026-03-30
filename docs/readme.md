# Library Management System

Current repo status as of March 30, 2026:

- Backend API is implemented for auth, dashboard, branches, users/admins, students, attendance, payments, seats, and reports.
- Desktop app is implemented in Electron + React and can be packaged for Windows.
- Backend automated coverage is in place and currently passing.

## Project Structure

- `backend/` - Express + TypeScript API with PostgreSQL
- `desktop-app/` - Electron desktop client built with React + Vite
- `docs/` - setup and reference notes

## Backend Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in the `DATABASE_*`, `JWT_*`, `PORT`, and `FRONTEND_URL` values.
3. Run migrations:

```bash
cd backend
npm run db:migrate
```

4. Start the API:

```bash
npm run dev
```

Important endpoints:

- `GET /health`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/students`
- `GET /api/seats`
- `GET /api/payments`
- `GET /api/reports/overview`

## Desktop App Setup

1. Copy `desktop-app/.env.example` to `desktop-app/.env`.
2. Set `VITE_API_BASE_URL`.
3. Start the app in development:

```bash
cd desktop-app
npm run electron:dev
```

## Windows Release

From `desktop-app/`:

```bash
npm run electron:build:win
```

Artifacts are written to `desktop-app/release/`.

## Release Checklist

- Backend `.env` points to the production database.
- `backend npm test` passes.
- Database migrations are applied with `npm run db:migrate`.
- Desktop build uses the correct `VITE_API_BASE_URL`.
- `desktop-app npm run electron:build:win` completes successfully.
- Install and smoke test the generated Windows installer on a clean machine before public rollout.
