# Deployment Workflow

This document explains how production deployment works for the Library Management System.

---

# Architecture Overview

Electron App
↓
HTTPS API
↓
Nginx Reverse Proxy
↓
Docker Backend Container
↓
PostgreSQL Database

---

# Backend Deployment Workflow

## Step 1 — Change Code Locally

Open project in VS Code.

Make backend/frontend changes.

---

## Step 2 — Push Code to GitHub

Run from project root:

```bash
git add .
git commit -m "update message"
git push
```

GitHub Actions automatically deploys backend changes to VPS.

---

# Manual VPS Deployment (Fallback)

SSH into VPS:

```bash
ssh kitaab@SERVER_IP
```

Go project folder:

```bash
cd ~/apps/library-management-system
```

Pull latest code:

```bash
git pull
```

Rebuild Docker containers:

```bash
docker compose up -d --build
```

---

# Docker Commands

## View Running Containers

```bash
docker ps
```

## View Backend Logs

```bash
docker logs -f backend
```

## Restart Containers

```bash
docker compose restart
```

## Stop Containers

```bash
docker compose down
```

---

# Nginx

Nginx acts as reverse proxy.

Traffic Flow:

Internet
↓
Nginx
↓
Backend Container

Nginx config location:

```bash
~/apps/library-management-system/nginx/nginx.conf
```

---

# SSL / HTTPS

HTTPS handled using Let's Encrypt certificates.

Main domain:

https://coffeeaurkitaab.co.in

SSL certificates managed through Certbot.

---

# Important Ports

| Port | Purpose |
|------|----------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |

---

# Monitoring

Health endpoint:

https://coffeeaurkitaab.co.in/health

Monitored using UptimeRobot.

---

# Security

Security layers enabled:

- UFW Firewall
- Fail2Ban
- HTTPS SSL
- Rate Limiting
- SSH Key Authentication

---

# Deployment Checklist

Before deployment:

- Test locally
- Verify .env values
- Commit changes
- Push to GitHub

After deployment:

- Test frontend
- Check backend logs
- Verify HTTPS
- Check health endpoint