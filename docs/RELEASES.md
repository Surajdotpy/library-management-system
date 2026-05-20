# Electron Release Workflow

This document explains how desktop app releases work.

---

# Release Architecture

Source Code
↓
Electron Build
↓
GitHub Release
↓
Auto Updater
↓
Client Machines

---

# Update Version

Update version inside:

```bash
desktop-app/package.json
```

Example:

```json
"version": "1.0.2"
```

---

# Build Electron App

Run from project root:

```bash
npm run electron:build
```

---

# Build Output

Generated files:

```bash
desktop-app/release
```

Includes:

- Setup.exe
- latest.yml
- blockmap

---

# Test Build Locally

Before release:

- Install app
- Test login
- Verify API connection
- Verify auto updater

---

# Create GitHub Release

Go to GitHub Releases.

Create new release tag:

```bash
v1.0.2
```

Upload:

- Setup.exe
- latest.yml
- blockmap

Publish release.

---

# Auto Update Flow

Client app checks GitHub release.

If newer version exists:

- download update
- install automatically

---

# Important Notes

- Frontend env changes require rebuild
- Backend changes do not require Electron rebuild
- Always increase version number