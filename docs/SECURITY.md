# Security Configuration

This document explains production security setup.

---

# Security Layers

Enabled protections:

- HTTPS SSL
- UFW Firewall
- Fail2Ban
- SSH Key Authentication
- Rate Limiting
- Docker Isolation

---

# HTTPS

SSL handled using Let's Encrypt.

Domain:

```bash
https://coffeeaurkitaab.co.in
```

---

# UFW Firewall

Allow required ports:

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
```

Enable firewall:

```bash
sudo ufw enable
```

Check status:

```bash
sudo ufw status
```

---

# Fail2Ban

Install:

```bash
sudo apt install fail2ban -y
```

Start:

```bash
sudo systemctl start fail2ban
```

Enable on boot:

```bash
sudo systemctl enable fail2ban
```

Check status:

```bash
sudo systemctl status fail2ban
```

---

# SSH Keys

SSH authentication uses key pairs.

Public keys stored in:

```bash
~/.ssh/authorized_keys
```

Private keys remain on trusted machines only.

---

# Security Best Practices

- Never commit .env files
- Never share private keys
- Rotate secrets periodically
- Monitor logs regularly
- Keep server updated

---

# Monitoring

Health endpoint:

```bash
/health
```

Monitored using UptimeRobot.