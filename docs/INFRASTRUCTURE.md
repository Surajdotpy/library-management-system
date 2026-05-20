# Infrastructure Overview

This document explains production architecture.

---

# System Architecture

Electron Desktop App
↓
HTTPS Requests
↓
Nginx Reverse Proxy
↓
Docker Backend Container
↓
PostgreSQL Database

---

# VPS

Provider: Hostinger VPS

OS: Ubuntu Linux

---

# Docker Services

Services:

- postgres
- backend
- nginx

---

# Docker Commands

View containers:

```bash
docker ps
```

View logs:

```bash
docker logs -f backend
```

Restart services:

```bash
docker compose restart
```

---

# Nginx

Nginx handles:

- HTTPS
- reverse proxy
- routing

Config:

```bash
nginx/nginx.conf
```

---

# PostgreSQL

Database runs inside Docker container.

Persistent storage uses Docker volumes.

---

# Monitoring

Monitoring stack:

- UptimeRobot
- backend logs
- htop
- Docker logs

---

# CI/CD

GitHub Actions automatically deploys backend changes.

Workflow:

```bash
.github/workflows/deploy.yml
```

---

# Backups

Database backups automated using cron jobs.

Backup location:

```bash
~/backups
```

---

# Security

Security systems:

- UFW
- Fail2Ban
- HTTPS
- SSH Keys