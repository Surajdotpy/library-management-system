# Disaster Recovery Guide

This document explains how to recover production infrastructure.

---

# If VPS Fails Completely

---

# Step 1 — Create New VPS

Install Ubuntu LTS.

---

# Step 2 — Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
```

---

# Step 3 — Clone Repository

```bash
git clone REPOSITORY_URL
```

---

# Step 4 — Restore Environment Files

Restore:

- .env
- nginx config
- docker-compose.yml

---

# Step 5 — Restore Database

Copy SQL backup.

Restore:

```bash
cat backup.sql | docker exec -i postgres psql -U postgres library
```

---

# Step 6 — Start Containers

```bash
docker compose up -d --build
```

---

# Step 7 — Configure HTTPS

Install Certbot.

Restore SSL certificates.

---

# Step 8 — Verify System

Check:

- domain
- HTTPS
- backend
- Electron app
- database
- logs

---

# Important Notes

- Test backups regularly
- Keep infrastructure docs updated
- Store backups safely