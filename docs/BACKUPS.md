# Backup & Restore Guide

This document explains how database backups work for the Library Management System.

---

# Backup Location

Backups stored on VPS:

```bash
~/backups
```

---

# Manual Database Backup

SSH into VPS:

```bash
ssh kitaab@SERVER_IP
```

Run:

```bash
docker exec postgres pg_dump -U postgres library > ~/backups/library_backup_$(date +%F_%H-%M-%S).sql
```

This creates timestamped PostgreSQL backup.

---

# Verify Backup

Check backup files:

```bash
ls ~/backups
```

---

# Restore Database

Restore backup:

```bash
cat ~/backups/FILENAME.sql | docker exec -i postgres psql -U postgres library
```

---

# Automated Backup Script

Backup script location:

```bash
~/backup.sh
```

Make executable:

```bash
chmod +x ~/backup.sh
```

Run manually:

```bash
~/backup.sh
```

---

# Cron Automation

Open cron jobs:

```bash
crontab -e
```

Daily backup at 2 AM:

```bash
0 2 * * * ~/backup.sh
```

---

# Backup Cleanup

Automatically delete backups older than 7 days:

```bash
find ~/backups -type f -mtime +7 -delete
```

---

# Disaster Recovery Checklist

If VPS fails:

1. Create new VPS
2. Install Docker + Docker Compose
3. Clone GitHub repo
4. Restore docker-compose.yml
5. Restore nginx config
6. Restore .env files
7. Restore PostgreSQL backup
8. Restart containers

---

# Important Notes

- Always test backups periodically
- Never store only one backup
- Keep offsite backups in future
- Verify restore process works