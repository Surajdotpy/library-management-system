# Coffee aur Kitaab Desktop App

Electron desktop app for the library management system. The UI is built with React, TypeScript, and Vite, then packaged with Electron Builder for Windows.

## Prerequisites

- Node.js 20+
- The backend API running locally or hosted somewhere reachable by the desktop app

## Environment

Create a local `.env` file by copying `.env.example`.

The most important variable is:

```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

If you package the app for staff machines that connect to a hosted backend, set `VITE_API_BASE_URL` to that hosted API URL before running the production build.

## Scripts

```bash
npm run dev
```

Starts the Vite frontend only.

```bash
npm run electron:dev
```

Starts Vite and opens the Electron shell against the local dev server.

```bash
npm run build
```

Builds the production frontend into `dist/`.

```bash
npm run electron:build:win
```

Builds the frontend and packages the Windows installer into `release/`.

## Release Output

- `release/Coffee aur Kitaab Setup 1.0.0.exe`
- `release/latest.yml`
- `release/win-unpacked/`

`latest.yml` is used by `electron-updater` for GitHub release based updates.

## Branding

Windows packaging uses `icon.png` from the project root. Replace that file if you want to update the installer and executable branding later.
