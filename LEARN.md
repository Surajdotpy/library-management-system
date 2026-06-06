# Learn Coding & Deployment from Zero

This guide teaches you everything from scratch â€” what each thing is, why we use it, and how to do it yourself in any project.

---

## Part 1: What is Deployment?

### The problem

You wrote code on your computer. Only YOU can see it. You want the world (or your clients) to use it.

### The solution

**Deployment** = copying your code to a computer that runs 24/7 (a server) so anyone can access it.

```
Your Computer (development)
    â†“
    You write code, test it
    â†“
GitHub (code storage)
    â†“
    You push code here
    â†“
Server/VPS (production)
    â†“
    Code runs here 24/7
    â†“
Users access it
```

### Development vs Production

| | Development | Production |
|--|------------|------------|
| Where | Your computer | Server/VPS |
| Who sees it | Only you | Everyone |
| URL | `localhost:3000` | `yourdomain.com` |
| Database | Test data | Real data |
| Safety | Doesn't matter | Must be secure |

---

## Part 2: Types of Deployment

### 1. Manual Deployment (Old way)

```bash
# SSH into server
ssh user@server

# Copy your code manually
git pull

# Restart your app
npm start
```

**Good for:** Learning, tiny projects
**Bad for:** Any real project (slow, error-prone)

### 2. CI/CD Deployment (Modern way)

You push code to GitHub â†’ everything happens automatically.

```
You push â†’ GitHub detects it â†’ CI builds code â†’ CD deploys to server
```

**Good for:** Every real project
**What we use:** GitHub Actions

### 3. Docker Deployment

Your app runs inside a "container" â€” like a lightweight virtual machine.

```
Your code + all dependencies + settings = Container
```

**Good for:** Consistent behavior everywhere
**Why:** "Works on my computer" problem solved

### Which to use when?

| Situation | Use |
|-----------|-----|
| Learning | Manual (to understand) |
| Personal project | Manual or simple CI/CD |
| Client project | CI/CD + Docker |
| Team project | CI/CD + Docker + Auto-scaling |

---

## Part 3: What is a VPS?

### Simple explanation

A VPS is a computer that runs 24/7 in a data center. You rent it.

```
Your laptop (runs when you're using it)
VPS (runs 24/7, even when you sleep)
```

### Common VPS providers

| Provider | Price | Good for |
|----------|-------|----------|
| Hostinger | $10/month | Starting out |
| DigitalOcean | $6/month | Learning |
| Linode | $5/month | Learning |
| AWS | Pay as you go | Big projects |

### What you get

- An IP address (like: `192.168.1.100`)
- Root access (full control)
- Linux operating system (usually Ubuntu)

### How to connect (SSH)

```bash
ssh username@server_ip
```

| Part | Meaning |
|------|---------|
| `ssh` | Secure Shell â€” encrypted connection |
| `username` | Usually `root` or `kitaab` |
| `server_ip` | Your VPS's IP address |

When you press Enter, it asks for password (or uses key file).

### SSH Keys (more secure)

Instead of password, you use a file (key).

```bash
ssh -i ~/.ssh/mykey username@server_ip
```

- Generate key on your computer
- Copy public key to VPS
- Now you can login without password

---

## Part 4: Linux Basics for VPS

### What is Linux?

An operating system (like Windows). Most servers use Linux because it's free and stable.

### Essential commands

```bash
pwd              # Print current folder
                 # Output: /home/kitaab

ls               # List files in current folder
ls -la           # List all files with details
                 # -l = details, -a = hidden files

cd folder_name   # Change directory (go into folder)
cd ..            # Go up one folder
cd ~             # Go to home folder

mkdir newfolder  # Create a new folder (make directory)
rm file.txt      # Delete a file
rm -rf folder    # Delete a folder and everything inside
                 # -r = recursive, -f = force

cp file1 file2   # Copy file1 to file2
mv file1 folder/ # Move file1 into folder/

nano file.txt    # Open text editor (simple)
vim file.txt     # Open text editor (advanced)

cat file.txt     # Show file contents in terminal

chmod +x file    # Make file executable
chown user:group file  # Change file owner
```

### Nano editor (most important)

```
nano filename.txt

Inside nano:
- Type to write text
- Arrow keys to move
- Ctrl+X â†’ Exit
- Y â†’ Yes (save changes)
- Enter â†’ Confirm filename
```

### File permissions explained

```bash
ls -la
-rw-r--r--  1 kitaab kitaab  1024 Jun 6 10:00 file.txt
```

| Part | Meaning |
|------|---------|
| `-rw-r--r--` | Permissions |
| `kitaab` | Owner |
| `kitaab` | Group |
| `1024` | Size in bytes |

Permissions breakdown:
```
rw-  r--  r--
|     |    |
|     |    Everyone else (read only)
|     Group (read only)
Owner (read + write)
```

- `r` = read (view file)
- `w` = write (edit file)
- `x` = execute (run file)

---

## Part 5: What is Docker?

### The problem

"My code works on my computer but not on the server."

Why? Different:
- Node.js version
- Operating system
- Database version
- Missing dependencies

### The solution

Docker packages your app + everything it needs into a "container."

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   Your App          â”‚
â”‚   Node.js 22        â”‚
â”‚   npm packages      â”‚
â”‚   Ubuntu base       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       Container
```

The container runs the same everywhere.

### Docker vs Virtual Machine

```
Virtual Machine:         Docker Container:
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ App              â”‚    â”‚ App              â”‚
â”‚ Guest OS (2GB)   â”‚    â”‚ Shared OS kernel â”‚
â”‚ Hypervisor       â”‚    â”‚ Docker Engine    â”‚
â”‚ Host OS          â”‚    â”‚ Host OS          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
Heavy (GBs)             Light (MBs)
Slow start              Instant start
```

### Key Docker commands

```bash
docker ps                    # List running containers
docker ps -a                 # List all containers

docker images                # List downloaded images

docker compose up -d         # Start all containers
docker compose down          # Stop all containers
docker compose restart       # Restart containers
docker compose logs -f       # View logs (follow mode)

docker compose up -d --build # Rebuild + start

docker logs -f container_name   # View specific container logs
docker exec -it container bash  # Go inside container
```

### `docker-compose.yml` explained

```yaml
services:
  backend:           # Service name
    build: ./backend # Build from Dockerfile in backend/
    container_name: backend  # Container name
    restart: always  # Auto-restart if crashes
    ports:           # Open ports
      - "5000:5000"  # Host:Container
    env_file:        # Load environment variables
      - ./backend/.env
```

| Setting | Meaning |
|---------|---------|
| `build: ./backend` | Create image from Dockerfile in backend/ folder |
| `restart: always` | If app crashes, Docker restarts it |
| `ports: "5000:5000"` | First 5000 = outside world, second 5000 = inside container |

### Why we use Docker

1. **Same everywhere** â€” No "Works on my machine" problem
2. **Easy restart** â€” One command to restart everything
3. **Isolation** â€” Each app has its own environment
4. **Version control** â€” You can save and restore versions

---

## Part 6: What is Nginx?

### The problem

Your backend runs on port 5000. Users type `http://server:5000`. That's ugly.

### The solution

Nginx sits in front of your app. Users type `http://yourdomain.com` and Nginx forwards to your app.

```
User â†’ yourdomain.com:80 â†’ Nginx â†’ Backend:5000
```

### What Nginx handles

| Task | Why |
|------|-----|
| Reverse proxy | Forward requests to backend |
| HTTPS/SSL | Handle encrypted connections |
| Static files | Serve images, downloads |
| Load balancing | Distribute traffic across multiple servers |

### Nginx config explained

```nginx
server {
    listen 80;                    # Listen on port 80 (HTTP)
    server_name example.com;      # Only respond to this domain

    location / {                  # For all URLs starting with /
        proxy_pass http://backend:5000;  # Forward to backend
    }
}
```

### Our config

```nginx
server {
    listen 80;
    server_name coffeeaurkitaab.co.in;
    return 301 https://$host$request_uri;  # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl;
    server_name coffeeaurkitaab.co.in;

    ssl_certificate ...;  # SSL certificate file

    location /UZvgJNxe/releases {
        alias /usr/share/nginx/html/releases;  # Serve files from this folder
        autoindex on;                          # Show file listing
    }

    location / {
        proxy_pass http://backend:5000;        # All other requests â†’ backend
    }
}
```

| Directive | Meaning |
|-----------|---------|
| `listen 80` | Watch for HTTP traffic |
| `server_name` | Only handle requests for this domain |
| `location /` | Rule for URLs starting with / |
| `proxy_pass` | Forward to another server |
| `return 301` | Redirect (301 = permanent) |
| `alias` | Serve files from a folder directly |
| `autoindex on` | Show directory listing when no index file |

### When to restart nginx

After changing config:
```bash
docker compose restart nginx
```

Not `docker compose up -d --build` â€” nginx config doesn't need a rebuild, just a restart.

---

## Part 7: What is HTTPS/SSL?

### The problem

When you send data over the internet, anyone can read it (like a postcard).

### The solution

HTTPS encrypts everything â€” like putting your postcard in a locked box.

```
HTTP:   readable by everyone
HTTPS:  encrypted, only server can read
```

### How SSL works

1. You buy/install an SSL certificate on your server
2. Browser connects â†’ server sends certificate
3. Browser verifies certificate is real
4. Encrypted connection established

### Let's Encrypt (free SSL)

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com
```

This creates certificate files:
```
/etc/letsencrypt/live/yourdomain.com/
â”œâ”€â”€ fullchain.pem    # Certificate
â””â”€â”€ privkey.pem      # Private key (keep secret)
```

### Auto-renewal

Let's Encrypt certificates expire after 90 days. Certbot auto-renews:

```bash
# Check if renewal works
sudo certbot renew --dry-run
```

Certbot adds a cron job that auto-renews. You don't need to worry.

---

## Part 8: What is CI/CD?

### The problem

Every time you update code, you must:
1. SSH into server
2. `git pull`
3. Rebuild
4. Restart

This takes time and you might make mistakes.

### The solution

CI/CD does all of this automatically when you push code to GitHub.

```
You push code â†’ GitHub Actions runs â†’ Server updated
```

### CI vs CD

| | CI (Continuous Integration) | CD (Continuous Deployment) |
|--|----------------------------|----------------------------|
| What | Build and test your code | Deploy to server |
| When | Every push | After CI passes |
| Checks | Does it compile? Do tests pass? | Is server ready? |

### Our GitHub Actions workflow

```yaml
name: Deploy         # Name of this workflow

on:                  # When does it run?
  push:
    branches: [main] # Only when pushing to main branch

jobs:
  deploy-backend:    # Job 1
    runs-on: ubuntu-latest  # GitHub provides a Linux computer
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}     # Your server IP
          username: ${{ secrets.VPS_USER }}  # Your username
          key: ${{ secrets.VPS_SSH_KEY }}    # Your SSH key
          script: |
            cd ~/apps/library-management-system
            git pull
            docker compose up -d --build
```

### What happens step by step

1. You push code to GitHub
2. GitHub sees push to `main` branch
3. GitHub spins up a temporary Linux computer
4. That computer SSH into your VPS
5. Runs: `cd ~/apps/your-project`
6. Runs: `git pull` (downloads new code)
7. Runs: `docker compose up -d --build` (rebuilds and restarts)
8. Computer shuts down
9. Done! Your VPS is updated

### GitHub Secrets

Passwords and keys stored safely in GitHub (not visible in code):

```
Settings â†’ Secrets and variables â†’ Actions â†’ New repository secret
```

Common secrets:

| Secret Name | What it holds |
|-------------|---------------|
| `VPS_HOST` | Your server IP (e.g., `192.168.1.100`) |
| `VPS_USER` | SSH username (e.g., `kitaab`) |
| `VPS_SSH_KEY` | Your private SSH key (entire file content) |

---

## Part 9: What is Cron?

### The problem

You need to do something regularly (daily backup at 2 AM). You won't wake up at 2 AM.

### The solution

Cron runs commands automatically at scheduled times.

```
Cron = Your personal robot that runs tasks on schedule
```

### Crontab syntax

```bash
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€ minute (0-59)
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€ hour (0-23)
â”‚ â”‚ â”Œâ”€â”€â”€â”€â”€â”€ day of month (1-31)
â”‚ â”‚ â”‚ â”Œâ”€â”€â”€â”€ month (1-12)
â”‚ â”‚ â”‚ â”‚ â”Œâ”€â”€ day of week (0-6, Sunday=0)
â”‚ â”‚ â”‚ â”‚ â”‚
* * * * * command_to_run
```

### Examples

```bash
0 2 * * * ~/backup.sh        # Every day at 2:00 AM
*/30 * * * * ~/script.sh     # Every 30 minutes
0 0 * * 0 ~/script.sh        # Every Sunday at midnight
0 9-17 * * 1-5 ~/script.sh   # Every hour 9-5 on weekdays
```

### Edit cron jobs

```bash
crontab -e   # Open editor to add/change jobs
crontab -l   # List current jobs
```

### Our backup cron job

```bash
0 2 * * * ~/backup.sh
```

This runs `~/backup.sh` every day at 2 AM, which backs up the database.

### Check if it worked

```bash
ls -la ~/backups/
```

If you see files with today's date, it's working.

---

## Part 10: How Everything Connects

### Big picture

```
Your Computer
  â”‚
  â”‚ git push
  â–¼
GitHub (code storage)
  â”‚
  â”‚ GitHub Actions (CI/CD)
  â”‚   â”œâ”€â”€ SSH into VPS
  â”‚   â”œâ”€â”€ git pull
  â”‚   â””â”€â”€ docker compose up -d --build
  â–¼
VPS (your server)
  â”‚
  â”œâ”€â”€ Docker Containers
  â”‚   â”œâ”€â”€ Nginx (port 80, 443)
  â”‚   â”‚   â”œâ”€â”€ Reverse proxy â†’ Backend
  â”‚   â”‚   â””â”€â”€ Static files â†’ /releases
  â”‚   â”œâ”€â”€ Backend (port 5000)
  â”‚   â”‚   â”œâ”€â”€ API endpoints
  â”‚   â”‚   â””â”€â”€ Authentication
  â”‚   â””â”€â”€ PostgreSQL (port 5432)
  â”‚       â””â”€â”€ Database storage
  â”‚
  â”œâ”€â”€ Cron Jobs
  â”‚   â””â”€â”€ Daily backup at 2 AM
  â”‚
  â””â”€â”€ Security
      â”œâ”€â”€ UFW Firewall
      â”œâ”€â”€ Fail2Ban
      â””â”€â”€ HTTPS (Let's Encrypt)
```

### Request flow

```
User opens app
  â”‚
  â–¼
Browser â†’ https://coffeeaurkitaab.co.in
  â”‚
  â–¼
DNS (domain â†’ IP)
  â”‚
  â–¼
VPS Firewall (allows ports 80, 443)
  â”‚
  â–¼
Nginx (listening on port 443)
  â”‚
  â”œâ”€â”€ If URL is /releases/* â†’ Serve file directly
  â”‚
  â””â”€â”€ If URL is /* â†’ Forward to Backend:5000
        â”‚
        â–¼
      Backend (Express API)
        â”‚
        â”œâ”€â”€ Check JWT token (authentication)
        â”œâ”€â”€ Process request
        â””â”€â”€ Query database (PostgreSQL)
              â”‚
              â–¼
            Response sent back through the chain
```

---

## Part 11: Step-by-Step â€” Deploy Any Project to VPS

### Step 1: Get a VPS

1. Go to Hostinger/DigitalOcean
2. Create an account
3. Buy the cheapest VPS ($6-10/month)
4. Choose Ubuntu (latest LTS)
5. Note the IP address and root password

### Step 2: SSH into VPS

```bash
ssh root@your_server_ip
```

Type the password when prompted.

### Step 3: Create a user

```bash
adduser kitaab          # Create user
usermod -aG sudo kitaab # Give sudo access
su - kitaab             # Switch to new user
```

### Step 4: Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
```

### Step 5: Install Git

```bash
sudo apt install git -y
```

### Step 6: Clone your project

```bash
git clone https://github.com/yourusername/yourproject.git ~/apps/yourproject
cd ~/apps/yourproject
```

### Step 7: Set up environment variables

```bash
nano backend/.env
```

Fill in your database passwords, JWT secret, etc.

### Step 8: Create nginx config

Create `nginx/default.conf` with your domain and SSL.

### Step 9: Set up HTTPS (if you have a domain)

```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d yourdomain.com
```

### Step 10: Start everything

```bash
docker compose up -d --build
```

### Step 11: Set up firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Step 12: Set up Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Step 13: Set up backup cron

```bash
crontab -e
# Add line: 0 2 * * * ~/backup.sh
```

### Step 14: Set up CI/CD (GitHub Actions)

1. Go to GitHub repo â†’ Settings â†’ Secrets â†’ Add:
   - `VPS_HOST`: your server IP
   - `VPS_USER`: kitaab
   - `VPS_SSH_KEY`: your private SSH key
2. Create `.github/workflows/deploy.yml`
3. Push code

### Done! Your project is live.

---

## Part 12: Debugging â€” When Things Go Wrong

### Website not loading?

```bash
# Step 1: Is server reachable?
ping yourdomain.com

# Step 2: Are containers running?
docker ps

# Step 3: Check nginx logs
docker compose logs nginx

# Step 4: Check backend logs
docker compose logs backend

# Step 5: Check database
docker compose logs postgres
```

### "502 Bad Gateway"

Means nginx can't reach backend.

```bash
# Check if backend container is running
docker ps | grep backend

# Check backend logs for crash
docker logs backend --tail=20

# Restart everything
docker compose up -d --build
```

### "Connection refused"

Means nothing is listening on that port.

```bash
# Check if container is running
docker ps

# Check port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Git pull conflicts

```
error: Your local changes to 'file.txt' would be overwritten by merge.
```

Fix:
```bash
git stash     # Save your changes temporarily
git pull      # Get new code
git stash pop # Restore your changes (may need to resolve conflicts)
```

### Docker container keeps restarting

```bash
# Check why it's crashing
docker logs container_name --tail=50

# Common fixes:
docker compose up -d --build        # Rebuild
docker compose build --no-cache     # Force fresh build
```

### Memory full / Server slow

```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
htop

# Clean Docker cache
docker system prune -a
```

### SSL certificate expired

```bash
# Renew
sudo certbot renew

# If that fails, force renewal
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Restart nginx
docker compose restart nginx
```

### "Port already in use"

Something else is using that port.

```bash
# Find what's using port 80
sudo lsof -i :80

# Kill it
sudo kill -9 PROCESS_ID
```

---

## Part 13: Essential Debugging Mindset

### The debug process

When something breaks:

1. **Don't panic** â€” Bugs are normal
2. **Read the error message** â€” It tells you what's wrong
3. **Check logs** â€” `docker compose logs`
4. **Google the error** â€” Someone else had it
5. **Change one thing at a time** â€” Change, test, change, test
6. **If stuck, go back to last working state** â€” What changed since it worked?

### Example debug

```
Problem: Website shows "502 Bad Gateway"

Step 1: Check Docker
$ docker ps
â†’ backend container not running

Step 2: Check backend logs
$ docker logs backend
â†’ Error: Cannot connect to database

Step 3: Check database
$ docker ps | grep postgres
â†’ postgres container running

Step 4: Check database config
$ docker compose exec backend cat .env
â†’ DATABASE_HOST=wrong_host

Step 5: Fix it
$ nano backend/.env
â†’ Change DATABASE_HOST to postgres

Step 6: Rebuild
$ docker compose up -d --build

Step 7: Test
Website loads! âœ…
```

### Golden rules

- **One change at a time** â€” Change one thing, test, then change next
- **Always read the error** â€” The error message tells you exactly what's wrong
- **Google it** â€” Copy the error message into Google
- **Ask ChatGpt** â€” Paste the error and your config
- **Take notes** â€” When you fix something, write it down

---

## Part 14: Practice Projects

To learn, do these in order:

### Level 1: Deploy a simple HTML page

- Get a free VPS (or use local VM)
- Install nginx
- Copy an HTML file
- Access it from browser

### Level 2: Deploy a Node.js app

- Create a simple Express app
- Deploy without Docker (manual)
- Add nginx reverse proxy
- Add domain and HTTPS

### Level 3: Deploy with Docker

- Add Dockerfile
- Add docker-compose.yml
- Deploy using Docker

### Level 4: Add CI/CD

- Create GitHub repo
- Add deploy.yml workflow
- Push â†’ auto-deploys

### Level 5: Full stack

- Backend (Express/Node.js)
- Database (PostgreSQL)
- Frontend (React)
- All in Docker
- CI/CD pipeline
- Domain + HTTPS
- Backups
- Monitoring

---

## Part 15: Code Concepts from Scratch

This section explains the code we wrote today â€” every line, what it means, why we wrote it.

---

### 15.1 What is a Variable?

A named container that stores a value.

```tsx
const email = 'admin@test.com';
```

| Code | Meaning |
|------|---------|
| `const` | This variable won't change (constant) |
| `email` | The name I choose |
| `=` | "Store this value in the name" |
| `'admin@test.com'` | The actual value |

### `let` vs `const`

```tsx
const name = 'John';  // Cannot change later
let age = 25;          // Can change later
age = 26;              // âœ… Works
name = 'Jane';         // âŒ Error
```

### Why we use variables

Instead of typing `'admin@test.com'` everywhere, we use the name `email`. If the email changes, we change it in one place.

---

### 15.2 What is a Function?

A reusable block of code that does one task.

```tsx
function add(a, b) {
  return a + b;
}
```

| Part | Meaning |
|------|---------|
| `function` | Keyword to create a function |
| `add` | Name of the function |
| `(a, b)` | Inputs (parameters) |
| `{ ... }` | The code to run |
| `return` | The output |

When you call it:
```tsx
const result = add(5, 3);  // result = 8
```

### Arrow function (modern way)

```tsx
const add = (a, b) => a + b;
```

Same thing, shorter. Used everywhere in modern code.

### `async function`

A function that waits for something (like API response):

```tsx
const handleSubmit = async (e) => {
  const response = await fetch('/api/login');
  // Code here waits for the response
};
```

`await` means: "wait for this to finish before moving to next line."

---

### 15.3 What is useState?

A "memory box" that remembers a value even when the page refreshes.

```tsx
const [showPassword, setShowPassword] = useState(false);
```

| Part | Meaning |
|------|---------|
| `showPassword` | The current value (true or false) |
| `setShowPassword` | Function to change the value |
| `useState(false)` | Start with `false` (password hidden) |

Think of it like a light switch:
- `false` = light OFF (password hidden)
- `true` = light ON (password visible)
- `setShowPassword(true)` = flip switch ON

### Why not just a variable?

```tsx
let showPassword = false;    // âŒ Won't work
showPassword = true;          // Changes value but page doesn't update
```

`useState` tells React: "When this value changes, update the page." A normal variable doesn't.

---

### 15.4 Show/Hide Password â€” Full Code Explained

```tsx
// Step 1: Import icons from lucide-react library
import { Eye, EyeOff } from 'lucide-react';

// Step 2: Create a state variable to track visibility
const [showPassword, setShowPassword] = useState(false);

// Step 3: In the JSX (HTML-like part), render the input
<Input
  type={showPassword ? 'text' : 'password'}  // Dynamic type
/>

// Step 4: Add toggle button
<button
  type="button"                               // Don't submit form
  onClick={() => setShowPassword(!showPassword)}  // Flip value
>
  {showPassword ? <EyeOff /> : <Eye />}       // Show correct icon
</button>
```

### The `? :` (ternary operator) explained

```tsx
condition ? valueIfTrue : valueIfFalse
```

It's a compact if-else:

```tsx
// This:
type={showPassword ? 'text' : 'password'}

// Is same as:
if (showPassword) {
  type = 'text';
} else {
  type = 'password';
}
```

### What does `onClick` do?

When user clicks the button, run this code:

```tsx
onClick={() => setShowPassword(!showPassword)}
```

`!showPassword` means "opposite of current value":
- If `showPassword` is `false` â†’ `!false` = `true` â†’ show password
- If `showPassword` is `true` â†’ `!true` = `false` â†’ hide password

### How to use in any project

1. Add `const [showField, setShowField] = useState(false);`
2. On the input: `type={showField ? 'text' : 'password'}`
3. On the button: `onClick={() => setShowField(!showField)}`

---

### 15.5 What is Import/Export?

Ways to use code from other files.

### Export â€” making code available to others

```tsx
// auth.controller.ts
export async function login(req, res) { ... }
```

### Import â€” using code from another file

```tsx
// auth.routes.ts
import { login } from './auth.controller.ts';
```

| Part | Meaning |
|------|---------|
| `import` | Keyword to bring in code |
| `{ login }` | What to import (curly braces for named exports) |
| `from` | Which file |
| `'./auth.controller.ts'` | File path (. = current folder) |

### Types of export

```tsx
// Named export (you can have many)
export const myVariable = 5;
export function myFunction() { }

// Default export (only one per file)
export default function MainComponent() { }
```

### Types of import

```tsx
// Named import
import { myVariable, myFunction } from './file';

// Default import (no curly braces)
import MainComponent from './file';

// Everything as object
import * as authController from './file';
// Use: authController.login, authController.logout
```

### Why we split code into files

- **Organized** â€” Each file has one purpose
- **Reusable** â€” Same function used in multiple places
- **Maintainable** â€” Change one file without touching others

---

### 15.6 What is a Component?

A reusable piece of UI.

```tsx
// Button.tsx â€” a reusable button component
export function Button({ label, onClick }) {
  return <button onClick={onClick}>{label}</button>;
}
```

Using it:
```tsx
import { Button } from './Button';

<Button label="Sign In" onClick={handleSubmit} />
```

| Part | Meaning |
|------|---------|
| `{ label, onClick }` | Props (inputs passed to component) |
| `<button>` | Actual HTML element |
| `{label}` | Using the prop value |

### Built-in components vs custom

```tsx
// Built-in HTML components
<div>, <input>, <button>, <h1>, <p>

// Our custom components
<Input>, <Button>, <Header>, <Sidebar>
```

### Props explained

Props are like function parameters for components:

```tsx
// Component definition
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Using it â€” passing name as prop
<Greeting name="John" />    // Shows: Hello, John!
<Greeting name="Jane" />    // Shows: Hello, Jane!
```

---

### 15.7 What is an Express Route?

```tsx
router.post('/login', middleware1, middleware2, controller);
```

When user sends POST to `/api/auth/login`, Express runs:

1. **First**: `middleware1` (rate limiter) â€” checks if too many requests
2. **Second**: `middleware2` (validation) â€” checks if input is valid
3. **Third**: `controller` â€” actually logs the user in

```
Request â†’ Rate Limiter â†’ Validation â†’ Login Controller â†’ Response
           (block if         (block if      (process
            too many)         bad input)     login)
```

### How middleware works

```tsx
function myMiddleware(req, res, next) {
  // Do something
  if (error) {
    return res.status(400).json({ error: 'Something wrong' });  // Stop
  }
  next();  // Continue to next middleware
}
```

| What it does | Call this |
|-------------|-----------|
| Everything is fine, continue | `next()` |
| Error, stop here | `res.status(400).json({...})` |

### Why middleware order matters

```tsx
app.use(helmet());           // 1st â€” security
app.use(cors());             // 2nd â€” allow cross-origin
app.use(express.json());     // 3rd â€” parse JSON body
app.use(rateLimiter);        // 4th â€” rate limit
app.use('/api', routes);     // 5th â€” actual routes
app.use(errorHandler);       // 6th â€” catch errors
```

If you put routes before helmet, requests would be processed before security headers are added.

---

### 15.8 Zod Validation Explained

### What is validation?

Checking if user input is correct BEFORE processing it.

Without validation:
```tsx
// User sends: { email: "", password: "" }
// Server tries to log in with empty values â†’ crash or security hole
```

With validation:
```tsx
// Zod checks: is email valid? is password not empty?
// If bad â†’ return error immediately
// If good â†’ process login
```

### Zod syntax

```tsx
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Must be a real email'),
  password: z.string().min(1, 'Cannot be empty'),
});
```

| Line | Meaning |
|------|---------|
| `z.object({...})` | I expect an object |
| `z.string()` | This field must be text |
| `.email()` | The text must have @ symbol |
| `.min(1)` | At least 1 character |

### safeParse â€” try to validate

```tsx
const result = loginSchema.safeParse(req.body);
```

`result` has two possibilities:

```tsx
if (result.success) {
  // âœ… Input is good
  req.body = result.data;  // Use cleaned data
  next();                   // Continue
} else {
  // âŒ Input is bad
  return res.status(400).json({
    error: result.error.errors.map(e => e.message).join(', ')
  });
}
```

### Common Zod rules

```ts
z.string().email()           // Must be valid email
z.string().min(6)            // At least 6 characters
z.string().max(100)          // Max 100 characters
z.number().min(0)            // Must be positive number
z.string().optional()        // Field not required
z.enum(['admin', 'user'])    // Must be one of these
z.string().regex(/^[A-Z]+$/) // Must match pattern (uppercase only)
```

### `.map()` explained

Takes an array, transforms each item, returns new array:

```tsx
const numbers = [1, 2, 3];
const doubled = numbers.map(n => n * 2);
// doubled = [2, 4, 6]
```

In our code:
```tsx
result.error.errors.map(e => e.message)
// Takes each error, gets just the message
// ["Valid email required", "Password required"]
```

### `.join(', ')` explained

Combines array items into one string with separator:

```tsx
['a', 'b', 'c'].join(', ')  // "a, b, c"
```

### Why Zod instead of writing if-else manually?

```tsx
// Without Zod â€” manual checks
if (!email) error = 'Email required';
if (!email.includes('@')) error = 'Invalid email';
if (!password) error = 'Password required';
if (password.length < 6) error = 'Password too short';

// With Zod â€” one schema
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

Zod is cleaner, reusable, and gives better error messages.

---

### 15.9 Helmet â€” Security Headers Explained

### What are HTTP headers?

Extra information sent with every web response:

```
When server responds to browser, it sends:

Status: 200 OK
Headers:
  Content-Type: application/json
  X-Frame-Options: DENY          â† Helmet adds
  Strict-Transport-Security: ...  â† Helmet adds
Body: {"success": true}
```

Browsers read these headers and change their behavior.

### What Helmet does

```tsx
import helmet from 'helmet';
app.use(helmet());
```

This one line adds 15+ security headers:

| Header | What it does | Why it matters |
|--------|-------------|----------------|
| `X-Frame-Options: DENY` | Prevents your site from loading in iframes | Stops clickjacking (hiding your site in a fake page) |
| `X-Content-Type-Options: nosniff` | Stops browser from guessing file types | Stops fake file uploads |
| `Strict-Transport-Security` | Forces HTTPS only | Prevents downgrade attacks |
| `X-XSS-Protection` | Enables XSS filter | Stops script injection |

### Without Helmet

A hacker could create a fake website that loads your site in a hidden iframe. User clicks "Delete Account" but actually clicks a button on your site. Helmet's `X-Frame-Options` prevents this.

---

### 15.10 Dockerfile Explained

A recipe for building a Docker container.

```dockerfile
FROM node:22            # Start with official Node.js image
                        # (like installing Windows on a new PC)

WORKDIR /app            # Go to /app folder (like cd)
                        # All following commands run here

COPY package*.json ./   # Copy package.json and package-lock.json
                        # * means "any file matching this pattern"

RUN npm install         # Install dependencies
                        # RUN runs during BUILD time

COPY . .                # Copy all code files
                        # . = current folder

RUN npm run build       # Compile TypeScript to JavaScript
                        # Creates /dist folder

RUN chown -R node:node /app  # Give ownership to 'node' user
                             # -R = recursive (all files inside)

USER node               # Switch from root to 'node' user
                        # Everything after runs as 'node'

EXPOSE 5000             # Document that this container uses port 5000
                        # (just documentation, doesn't actually open port)

CMD ["npm", "start"]    # Command to run when container starts
                        # Only ONE CMD allowed
```

### `RUN` vs `CMD` vs `COPY`

| Instruction | When it runs | How often | Purpose |
|-------------|-------------|-----------|---------|
| `FROM` | Build | Once | Base image |
| `COPY` | Build | Once | Add files |
| `RUN` | Build | Once | Execute commands during build |
| `CMD` | Start | Every time | Default command when container runs |

### Order matters

Put things that change less often FIRST. Docker caches each layer:

```dockerfile
COPY package*.json ./   # Changes only when you add/remove packages
RUN npm install         # Cached unless package.json changes

COPY . .                # Changes EVERY time you modify code
RUN npm run build       # Runs every time
```

This is faster â€” if only code changed, Docker reuses the cached `npm install` layer.

### Why `USER node`?

By default, containers run as `root` â€” full power. If a hacker gets in:
- **Root**: Can install software, read all files, escape to host
- **node user**: Can only access `/app` folder

It's like giving a guest a limited key vs your master key.

### `chown -R node:node /app`

Change ownership of `/app` folder to `node` user.

- `chown` = **ch**ange **own**er
- `-R` = **r**ecursive (all files and subfolders)
- `node:node` = **user**:group
- `/app` = folder path

Without this, `node` user can't write files inside `/app`.

---

### 15.11 Git Commands Explained

| Command | What it does | When to use |
|---------|-------------|-------------|
| `git init` | Start tracking a folder with git | First time in a new project |
| `git status` | Show changed files | Before commit, to check what changed |
| `git add .` | Stage all changes | Before commit |
| `git add file.ts` | Stage one file | When you want to commit only one file |
| `git commit -m "msg"` | Save snapshot with description | After adding, when changes are ready |
| `git push` | Upload commits to GitHub | After committing |
| `git pull` | Download latest from GitHub | To get teammates' changes |
| `git log --oneline` | Show commit history | To see what changed and when |
| `git stash` | Save local changes temporarily | Before pulling when you have local changes |
| `git stash pop` | Restore stashed changes | After pulling |
| `git checkout -- file` | Discard local changes to a file | When you messed up and want original |
| `git clone URL` | Download a repo for the first time | Setting up on a new computer |

### What we type every day:

```bash
git add .                    # Stage all changes (prepare)
git commit -m "my message"   # Take snapshot
git push                     # Upload to GitHub
```

### What each part means

```
git add .
```

- `git` = the program
- `add` = tell git to track these files
- `.` = current folder and everything inside

```
git commit -m "fixed login bug"
```

- `commit` = save a snapshot
- `-m` = message (inline)
- `"fixed login bug"` = description of what changed

### Why we write good commit messages

```
Bad:  "update"
Good: "fix login password validation"

Bad:  "changes"
Good: "add show/hide password toggle on login"
```

Good messages help you find what changed later.

---

### 15.12 Common Terms Explained

| Term | Simple meaning | Analogy |
|------|---------------|---------|
| **API** | URL that returns data (not a webpage) | Restaurant menu â€” you ask, kitchen gives |
| **JSON** | Way to write data: `{"name":"John"}` | A form with labeled fields |
| **Endpoint** | A specific URL like `/api/auth/login` | A specific page in a menu |
| **Middleware** | Code that runs BEFORE your main code | Security guard checking ID before entry |
| **Schema** | Rules for what data should look like | A form template with required fields |
| **State** | Data that changes over time | A light switch (on/off changes) |
| **Props** | Data passed to a component | Settings you give to a machine |
| **Component** | Reusable piece of UI | A Lego brick |
| **Container** | Lightweight virtual machine | A shipping container for your app |
| **CI/CD** | Auto build + deploy on git push | A factory that packages and ships |
| **Repository** | GitHub folder with your project | A filing cabinet |
| **Branch** | Separate version of code | A copy for experimenting |
| **SSH** | Secure way to connect to server | A secure tunnel |
| **Port** | Door on a server | Apartment number in a building |

### What is JSON?

```json
{
  "name": "John",
  "age": 30,
  "email": "john@test.com"
}
```

| Symbol | Meaning |
|--------|---------|
| `{ }` | An object (collection of data) |
| `"name"` | A label (key) |
| `:` | Separates key from value |
| `"John"` | The actual value |
| `,` | Separates items |

JSON is everywhere in web development â€” it's how apps talk to servers.

### What is an Object?

```tsx
const user = {
  name: 'John',
  age: 30,
  email: 'john@test.com'
};

// Access values:
user.name   // "John"
user.age    // 30
```

An object groups related data together. Instead of:

```tsx
const userName = 'John';
const userAge = 30;
const userEmail = 'john@test.com';
```

You write:

```tsx
const user = { name: 'John', age: 30, email: 'john@test.com' };
```

### What is an Array?

```tsx
const fruits = ['apple', 'banana', 'orange'];

// Access items:
fruits[0]   // "apple"  (index 0 = first)
fruits[1]   // "banana" (index 1 = second)
fruits.length  // 3 (how many items)
```

### What is an HTTP Request?

When your browser/app talks to a server:

```
GET    â†’ Get data (read)
POST   â†’ Create new data (login, signup)
PUT    â†’ Update existing data
DELETE â†’ Delete data
```

Each request gets a response with a status code:

| Code | Meaning | What happened |
|------|---------|---------------|
| 200 | OK | Everything worked |
| 201 | Created | New item created |
| 400 | Bad Request | You sent wrong data |
| 401 | Unauthorized | Not logged in |
| 403 | Forbidden | No permission |
| 404 | Not Found | URL doesn't exist |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Something broke on server |

---

## Part 16: How to Practice

### The learning method

1. **Read code** â€” Open a file, read each line
2. **Understand one line** â€” What does it do?
3. **Change one thing** â€” Modify a number, text, or color
4. **Run and see** â€” See what changed
5. **Break it** â€” Remove a line, see what error you get
6. **Fix it** â€” Put it back
7. **Google error** â€” Copy-paste error into Google

### Safe places to practice

| File | What to change |
|------|---------------|
| `LoginPage.tsx` | Colors, text, layout, button styles |
| Any CSS/Tailwind | Sizes, margins, colors |
| Any `.tsx` text | Headings, labels, placeholders |

### Projects to build (in order)

| Level | Project | What you learn |
|-------|---------|---------------|
| 1 | HTML page with nginx | Web server basics |
| 2 | Simple Node.js API | Backend, routes |
| 3 | Node.js + Database | Data storage |
| 4 | Dockerize your app | Containers |
| 5 | Add CI/CD | Automation |
| 6 | Add domain + HTTPS | Production ready |
| 7 | Full stack app | Everything together |

### Debugging practice

When you see an error:
1. **Read the error** â€” It tells you file and line number
2. **Copy the error** â€” Paste into Google
3. **Try one fix** â€” Change one thing
4. **Test again** â€” Did it work?
5. **Repeat** â€” If not, try next fix

### Golden rule

Code is just text. Computers follow instructions literally. When something breaks, it's because you told it to do something different than what you intended. Find where your instruction differs from your intention â€” that's the bug.

---

# Part 17: Payments â€” The Complete System

## 17.1 Overview

The payment module consists of 6 files under `backend/src/modules/payments/` and 4 files in `desktop-app/`. It supports two payment flows: manual cash/bank payments (record-and-confirm) and online gateway payments via Cashfree.

**File map:**

| File | Role |
|------|------|
| `payments.types.ts` | All shared types, DTOs, and database row interfaces |
| `payments.service.ts` | Business logic: transactions, queries, validation, reminders |
| `payments.cashfree.ts` | Cashfree gateway adapter: API calls, webhook HMAC, mock mode |
| `payments.controller.ts` | Express HTTP handlers: input parsing, response formatting |
| `payments.routes.ts` | Route definitions with auth middleware |
| `payments.communication.ts` | SMS/WhatsApp dispatch for receipts & reminders |
| `desktop-app/src/lib/api/payments.ts` | Frontend API client |
| `desktop-app/src/pages/PaymentsPage.tsx` | Admin payment dashboard |

---

### 17.2 Core Patterns

#### Row Locking with `SELECT ... FOR UPDATE`

Every payment confirmation uses a locking read inside a transaction:

```
BEGIN ISOLATION LEVEL READ COMMITTED
  SELECT ... FROM fee_payments WHERE id = ? FOR UPDATE
  -- validate status, amount, branch
  UPDATE fee_payments SET status = 'paid', confirmed_at = ...
COMMIT
```

The `getLockedPaymentRecord()` function in `service.ts` encapsulates this. It optionally filters by `branchId` so that branch-admin staff can only lock payments belonging to their own branch. Superadmins pass `undefined` to skip the filter.

#### Branch-Scoped Access

`resolveAuthorizedBranchId(user)` returns:
- The user's branch ID for branch-admin roles
- `undefined` for superadmins (meaning "all branches")

This value flows through every controller handler into the service layer.

#### Dual Payment Flow: Manual vs Gateway

| Aspect | Manual | Cashfree |
|--------|--------|----------|
| Staff submits | `recordPayment` with amount | `createCashfreePaymentRequest` |
| Confirmation | Superadmin confirms manually | Webhook auto-confirms |
| Timing | Synchronous (within session) | Asynchronous (user pays in browser) |
| Verification | Staff checks bank account | Cashfree sends HMAC-signed webhook |

Both paths eventually call `confirmPendingPayment()`, which is the single source of truth for marking a payment as paid.

---

### 17.3 Cashfree Gateway Integration

#### Modes

The `getMode()` function returns one of three values from `CASHFREE_MODE` env var:

- **`mock`** (default): Generates fake sessions locally. No API calls. Used for development.
- **`sandbox`**: Uses `https://sandbox.cashfree.com/pg`. Test credentials.
- **`production`**: Uses `https://api.cashfree.com/pg`. Real money.

In mock mode, `buildMockCashfreeSession()` creates a `CashfreePaymentSession` with a fake UPI intent URL pointing to `demo@cashfree`. The checkout URL points to `mock.cashfree.local`. No Cashfree API credentials are needed.

#### Order Creation Flow

1. `createCashfreePaymentRequest()` in `service.ts` validates the student, calculates expected fee, opens a transaction to validate amount (with `SELECT FOR UPDATE`), then commits.
2. `createCashfreePaymentSession()` in `cashfree.ts` calls POST `/orders` on Cashfree API to create an order and get a `payment_session_id`.
3. It then calls POST `/orders/sessions` to generate a hosted UPI link (QR/intent).
4. Returns a `CashfreePaymentSession` object with checkout URL, UPI intent, and metadata.

#### Webhook Verification

Cashfree sends a webhook with:
- `x-webhook-timestamp`: Unix time or ISO 8601
- `x-webhook-signature`: HMAC-SHA256 of `timestamp + rawBody`

Verification steps in `validateCashfreeWebhookRequest()`:
1. **HMAC check**: `verifyCashfreeWebhookSignature()` recomputes `HMAC-SHA256(timestamp || rawBody, secret)` and compares with `timingSafeEqual`.
2. **Timestamp freshness**: `isWebhookTimestampFresh()` rejects webhooks older than `CASHFREE_WEBHOOK_MAX_AGE_SECONDS` (default 300s). This prevents replay attacks.
3. **Deduplication**: `getCashfreeWebhookFingerprint()` creates a key from `timestamp:signature`. The `processedCashfreeWebhooks` map stores it with a TTL equal to `CASHFREE_WEBHOOK_MAX_AGE_SECONDS`. Duplicate webhooks return 200 without processing.

The raw body is captured via `express.json()`'s `verify` callback in `app.ts:29-31`:

```ts
verify: (req, _res, buffer) => {
  (req as Request & { rawBody?: string }).rawBody = buffer.toString('utf8');
}
```

---

### 17.4 Webhook Security Design

Three layers of defense:

1. **Signature verification**: HMAC-SHA256. The secret comes from `CASHFREE_WEBHOOK_SECRET` env var (falls back to `CASHFREE_SECRET_KEY` for backward compatibility, or a hardcoded mock secret in mock mode).

2. **Timestamp freshness check**: Rejects webhooks outside a configurable window (default 5 minutes). Prevents replay of captured webhook payloads.

3. **Deduplication**: In-memory map with TTL-based cleanup prevents double-processing of Cashfree's retries.

The initial implementation had `req.rawBody ?? JSON.stringify(req.body)` as a fallback. This was a bug: `JSON.stringify` re-serializes the parsed object, changing whitespace and key ordering, so the HMAC would never match. Fixed to require `rawBody` and return 400 if missing.

---

### 17.5 Communication Subsystem

Two types of outbound messages:

| Type | Trigger | Channel |
|------|---------|---------|
| Receipt | Payment confirmed (`confirmPayment` or webhook) | SMS, WhatsApp, or both |
| Reminder | `sendPaymentReminders` batch job | SMS, WhatsApp, or both |

The dispatch order is: try WhatsApp first (using configured provider), fall back to SMS. If both fail, the message status is logged as `failed` but the payment is unaffected. Communication errors are caught and logged â€” they never bubble up to fail the payment transaction.

---

### 17.6 Transaction Patterns and Edge Cases

#### `recordPayment` (Manual Entry)

```
ISOLATION LEVEL READ COMMITTED
  SELECT FOR UPDATE on existing pending payment for same student+month+year
  IF exists && paid â†’ 409 "already submitted"
  IF exists && pending â†’ 409 "already pending verification"
  INSERT new fee_payment with status = 'pending'
COMMIT
```

#### `confirmPendingPayment` (Shared Confirmation Logic)

```
ISOLATION LEVEL READ COMMITTED
  SELECT FOR UPDATE on the payment record
  Validate: status === 'pending', amount matches, student exists
  UPDATE: status = 'paid', confirmed_at = NOW(), confirmed_by = userId
COMMIT
try {
  await sendPaymentReceipt(...)  // non-critical, errors are logged
} catch (e) {
  console.error(...)
}
```

#### `createCashfreePaymentRequest` (Online Payment)

```
BEGIN
  SELECT FOR UPDATE on existing pending payment for same student+month+year
  Validate student, calculate expected fee
  IF amount mismatch â†’ throw
COMMIT
// After commit:
  Call Cashfree API to create order + payment session
  recordPayment() inside its own transaction (idempotent)
  Return session to frontend
```

---

### 17.7 Consistency Verification Walkthrough

Given:
- `R` = fee_payments row for student S, month M, year Y
- `T1` = staff records a manual payment of â‚¹2000 for (S, M, Y) â†’ status `pending`
- `T2` = Cashfree webhook arrives for same (S, M, Y) but for â‚¹2000 amount

**Question:** Can a student be double-charged?

**Walkthrough:**

1. `recordPayment(T1)`: `SELECT FOR UPDATE` on existing pending payment for (S, M, Y). None found. Inserts new `fee_payments` row with status `pending`. Commits.

2. Cashfree webhook arrives. `confirmPaymentFromWebhook(T2)` â†’ `confirmPendingPayment`:
   - `SELECT FOR UPDATE` on payment record by `transaction_id` or `payment_id`
   - Finds the pending payment from T1
   - Updates to `paid`
   - Commits

3. Staff T1 later calls `confirmPayment` â†’ `confirmPendingPayment`:
   - `SELECT FOR UPDATE` on the same payment
   - Status is now `paid`
   - Returns existing record without changes

**Result:** First one to commit wins. The other becomes a no-op. No double charge.

---

### 17.8 Frontend API Client

```typescript
export const paymentsApi = {
  async record(data: RecordPaymentRequest): Promise<Payment> {
    const response = await apiClient.post('/payments', data);
    return response.data.data;
  },

  async createCashfreeRequest(data): Promise<CashfreePaymentRequestResult> {
    const response = await apiClient.post('/payments/cashfree/request', data);
    return response.data.data;
  },

  async confirm(paymentId: number): Promise<Payment> {
    const response = await apiClient.post(`/payments/${paymentId}/confirm`);
    return response.data.data;
  },

  async getAll(options): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get('/payments', { params: options });
    return response.data.data;
  },

  async getPending(): Promise<PendingPayment[]> {
    const response = await apiClient.get('/payments/pending');
    return response.data.data;
  },
};
```

---

### 17.9 Frontend Cashfree SDK

```typescript
export async function openCashfreeCheckout(input) {
  await ensureCashfreeSdkLoaded();

  const cashfree = window.Cashfree({
    mode: 'sandbox'
  });

  const result = await cashfree.checkout({
    paymentSessionId: input.paymentSessionId,
    redirectTarget: '_blank',
  });
}
```

---

### 17.10 Student Payment Page

```tsx
export default function StudentPaymentPage() {
  const { accessToken } = useParams();
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/payments/public/${accessToken}`)
      .then(res => res.json())
      .then(data => setPayment(data.data));
  }, [accessToken]);

  if (payment.status === 'paid') return <div>Payment Successful âœ…</div>;

  return (
    <div>
      <h1>Pay â‚¹{payment.amount}</h1>
      {payment.gateway_upi_intent && (
        <QRCodeSVG value={payment.gateway_upi_intent} size={200} />
      )}
      {payment.gateway_session_id && (
        <button onClick={handleOpenCashfreeCheckout}>
          Pay with Cashfree
        </button>
      )}
    </div>
  );
}
```

---

### 17.11 The Complete Flow â€” Step by Step

```
Step 1: Admin selects student on PaymentsPage
Step 2: Admin clicks "Create Cashfree Request"
Step 3: Backend validates student, amount
Step 4: Backend calls Cashfree API
Step 5: Backend creates payment record (status = pending)
Step 6: Backend generates public payment URL
Step 7: Response goes to frontend
Step 8: Frontend shows QR code
Step 9: Student scans QR and pays
Step 10: Cashfree sends webhook
Step 11: Backend verifies webhook (HMAC, timestamp, duplicate)
Step 12: Backend confirms payment (status = paid)
Step 13: Frontend updates in real-time
```

---

### 17.12 Security â€” Every Layer

1. **Webhook signature verification**: HMAC-SHA256
2. **Timestamp freshness check**: Rejects webhooks > 5 min old
3. **Deduplication**: In-memory map with TTL
4. **Public payment links**: JWT with scope + expiry
5. **Branch isolation**: `resolveAuthorizedBranchId`
6. **Row-level locking**: `SELECT ... FOR UPDATE`
7. **Amount validation**: Locked to student's monthly fee

---

### 17.13 Common Mistakes and How We Avoid Them

| Mistake | Prevention |
|---------|-----------|
| Double charging | One pending per student, webhook dedup, row locking |
| Processing fake webhook | HMAC signature + timestamp freshness |
| Wrong amount entered | Amount locked to DB value |
| Payment confirmed but not notified | Auto-send receipt, log on failure |
| Payment shows paid before arrival | Two-step: pending â†’ paid |

---

### 17.14: How to Write Payment Code for Any App â€” First Principles

#### 17.14.1: First Principles â€” What Is a Payment System?

At the most fundamental level, payment is just three operations:

```
1. CREATE  â†’  Someone wants to pay, we record the intent (status = pending)
2. CONFIRM â†’  Money has arrived, we mark it done (status = paid)
3. FAIL    â†’  Something went wrong, we note it (status = failed)
```

Everything else â€” QR codes, webhooks, receipts, reminders, refunds â€” is built on top of these three operations.

#### 17.14.2: The Planning Phase

Ask yourself:

| Question | Your answer | What it affects |
|----------|-------------|-----------------|
| One-time or recurring? | Coverage dates, cron jobs | DB schema, service logic |
| Fixed amount or variable? | Amount locked vs user enters | Validation, forms |
| Who pays? | Logged in or anonymous? | Auth, public links |
| How verified? | Manual or automatic (webhook)? | Confirmation flow |
| Single or multiple gateways? | Adapter pattern | Architecture |

#### 17.14.3: Define the State Machine

```
                  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                  â”‚  PENDING â”‚â—„â”€â”€â”€â”€ Start here
                  â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜
                       â”‚
            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â–¼          â–¼          â–¼
        â”Œâ”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”
        â”‚ PAID â”‚  â”‚FAILEDâ”‚  â”‚REFUNDEDâ”‚
        â””â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

#### 17.14.4: Gateway Abstraction (The Swappable Part)

The gateway file is the ONLY file that knows about Cashfree/Razorpay/Stripe.

```typescript
export interface PaymentGatewayProvider {
  name: string;
  createOrder(input: CreateOrderInput): Promise<GatewaySession>;
  verifyWebhook(rawBody: string, headers: Record<string, string>): WebhookVerificationResult;
  parseWebhookData(payload: unknown): WebhookPaymentData | null;
}

function getActiveProvider(): PaymentGatewayProvider {
  const mode = getMode();
  if (mode === 'mock') return mockProvider;

  if (gatewayName === 'cashfree') return cashfreeProvider;
  if (gatewayName === 'razorpay') return razorpayProvider;
  return mockProvider;
}
```

**Key**: The REST of the app calls `createGatewayOrder()` and `verifyGatewayWebhook()` â€” it NEVER calls a provider directly. Switch gateways by changing ONE env variable.

#### 17.14.5: Defining the Data Model

```sql
-- CORE (every payment needs)
payments:
  id, user_id, amount, currency, status, receipt_number, created_at, paid_at

-- GATEWAY (only if using payment gateway)
  gateway_name, gateway_id, gateway_session, gateway_status

-- VERIFICATION (audit trail)
  verified_by, verified_at, verification_ref

-- SUBSCRIPTION (only for recurring)
  period_start, period_end
```

#### 17.14.6: Controller Pattern

```
try {
  parse â†’ validate â†’ authenticate â†’ call service â†’ respond
} catch (error) {
  log â†’ classify error â†’ respond with appropriate status
}
```

#### 17.14.7: Idempotency

```typescript
if (payment.status === 'paid') {
  return payment;  // â† THIS is idempotency
}
```

#### 17.14.8: Extending for Other Gateways

1. Create a new provider file implementing `PaymentGatewayProvider`
2. Register it in `getActiveProvider()`
3. Change ONE env variable: `PAYMENT_GATEWAY=razorpay`

#### 17.14.9: Design Decisions

| Decision | Why |
|----------|-----|
| Two-step confirm (pending â†’ paid) | Safety â€” never mark paid before money arrives |
| Gateway abstraction | Swap gateways without touching business logic |
| Coverage dates in DB | Works with any gateway, customer controls payment |
| Mock mode as a provider | Same interface as real â€” no special cases |

#### 17.14.10: The 5 Questions for Any Payment Feature

1. What is the payment state machine?
2. What data do I need to store?
3. How is payment created?
4. How is payment confirmed?
5. What happens after payment is confirmed?

---

### 17.15: Code Review Findings & Fixes

_Applied June 2026_

After a full audit of every payment file, the following issues were identified and fixed:

#### Fix 1: Brittle raw body fallback in webhook handler

**File:** `payments.controller.ts:305`  
**Severity:** Medium (security)

The webhook handler had:
```ts
const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
```

`JSON.stringify` re-serializes the parsed object, changing whitespace and key order. If the HMAC was computed over the original raw body, verification would always fail with the stringified fallback. While `req.rawBody` is reliably set by the `express.json()` verify callback in `app.ts`, this fallback masked misconfiguration.

**Fix:** Removed the fallback. `req.rawBody` is now required; returns 400 if missing. Fail-fast is safer than silent HMAC failure.

#### Fix 2: (Skipped â€” already implemented) TTL on deduplication map

The `processedCashfreeWebhooks` map was initially reported as unbounded. However, it already stores `number` (expiry timestamps) and runs `cleanupProcessedCashfreeWebhooks()` before every check. The cleanup function deletes entries whose TTL has passed. No change needed.

#### Fix 3: Missing timeout on outbound Cashfree API calls

**File:** `payments.cashfree.ts`  
**Severity:** Medium (reliability)

Two `fetch()` calls to the Cashfree API had no timeout:
- `POST /orders` (order creation)
- `POST /orders/sessions` (hosted link creation)

If the Cashfree API hangs, the server thread blocks indefinitely, consuming a connection pool slot and potentially hanging the user's request.

**Fix:** Added `AbortController` with a 30-second timeout to both `fetch()` calls. The timeout is cleared via `finally` to avoid resource leaks.

```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), CASHFREE_API_TIMEOUT_MS);
try {
  response = await fetch(url, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```

#### Fix 4: Implicit `undefined` branchId in payment confirmation

**File:** `payments.controller.ts:160,380`  
**Severity:** Low (clarity)

Both `confirmPayment` and `simulateCashfreeSuccess` passed hardcoded `undefined` as the `branchId` parameter:

```ts
const payment = await paymentService.confirmPayment(paymentId, user.userId, undefined, data);
```

These endpoints have `requireSuperAdmin` middleware, so `undefined` is correct (superadmins see all branches). But the intent was unclear â€” it looked like a bug.

**Fix:** Changed both to use `resolveAuthorizedBranchId(user)`:

```ts
const branchId = resolveAuthorizedBranchId(user);
const payment = await paymentService.confirmPayment(paymentId, user.userId, branchId, data);
```

For superadmins, `resolveAuthorizedBranchId` returns `undefined` â€” same behavior, but the intent is now explicit and consistent with every other controller handler in the module.

---

### 17.16: Don't Make These Mistakes Again â€” Recognition & Debugging Guide

The 3 bugs we fixed fall into **3 universal categories** that appear in EVERY payment codebase. Learn to spot them anywhere.

---

#### Category 1: The "Silent Fallback" Bug (Fix #1)

**The pattern:** `valueA ?? valueB` where `valueB` is a **computed transformation** of the original, not the original itself.

```ts
// DANGER: JSON.stringify changes the data
const rawBody = req.rawBody ?? JSON.stringify(req.body);

// DANGER: toUpperCase() loses original casing
const email = user.email ?? req.body.email?.toLowerCase();

// DANGER: parse + re-stringify changes whitespace
const config = rawConfig ?? JSON.parse(JSON.stringify(defaultConfig));
```

**Why it's a bug:** The `??` operator says "if left side is null/undefined, use the right side." But the right side produces a **different value** than the left side would have. When you're dealing with cryptographic signatures, exact string equality matters â€” one extra space breaks everything.

**How to spot it in ANY codebase:**
- Search for `??` (nullish coalescing) where the fallback transforms the data
- Look at webhook handlers â€” do they use `req.body` (parsed) or `req.rawBody` (raw string)?
- Anywhere you see `JSON.stringify` + `JSON.parse` in the same function, ask "why?"

**The mental checklist:**
```
When you see a fallback, ask:
1. What's the fallback value? Is it EXACTLY the same as the primary value?
2. If this is for HMAC/signature â€” the RAW string must be used, not a re-serialized object
3. Is the fallback hiding a real problem? (e.g., middleware not configured correctly)
```

**Better pattern â€” fail fast:**
```ts
const rawBody = req.rawBody;
if (!rawBody) {
  throw new Error('Missing raw body â€” check express.json() verify callback');
}
```

**When debugging:** If webhooks are returning 401 and you KNOW the secret is correct, the most likely cause is the raw body being modified before HMAC verification. Check:
1. Is the webhook route behind `express.json()` (good) or `express.raw()` (better)?
2. Is there any middleware that modifies `req.body` before your handler?
3. Are you using `req.body` instead of `req.rawBody`?

---

#### Category 2: The "No Timeout" Bug (Fix #3)

**The pattern:** Calling an external API (fetch, axios, http.request) without a timeout.

```ts
// DANGER: no timeout
const response = await fetch('https://api.cashfree.com/pg/orders', { method: 'POST', ... });

// DANGER: no timeout
const result = await axios.post('https://api.razorpay.com/v1/orders', data);
```

**Why it's a bug:** External APIs can:
- Hang indefinitely (no response)
- Be slow due to network issues
- Be unreachable (DNS failure takes 30+ seconds by default)

While the fetch hangs, your server holds onto:
- A database connection from the pool
- A request thread (or event loop slot)
- Memory for the request body

If 10 users' payments hang simultaneously, 10 DB connections are stuck. When the 11th user tries to pay, the pool is empty â†’ "connection refused."

**How to spot it in ANY codebase:**
- Search for `fetch(`, `axios.`, `http.request`, `https.request`
- If there's no `AbortController` or `timeout` option nearby â†’ it's a bug
- Look at startup code â€” any external API calls without timeouts

**The mental checklist:**
```
For every outbound HTTP call:
1. What happens if the API never responds?
2. How many requests can hang before the server runs out of resources?
3. Is there a cleanup mechanism (timeout, circuit breaker, retry with backoff)?
```

**The universal fix pattern:**
```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30_000);
try {
  response = await fetch(url, { ..., signal: controller.signal });
} finally {
  clearTimeout(timeoutId);  // â† ALWAYS clear in finally, not after await
}
```

**Common gotcha:** Don't put `clearTimeout` right after `await fetch`. If fetch throws, `clearTimeout` never runs. Always use `try/finally`.

---

#### Category 3: The "Inconsistent Intent" Bug (Fix #4)

**The pattern:** A function accepts a parameter but the caller passes a hardcoded default instead of computing it like every other caller does.

```ts
// DANGER: every other caller passes branchId, but this one passes undefined
const payment = await service.confirmPayment(paymentId, user.userId, undefined, data);

// DANGER: similar inconsistency
const result = await service.processOrder(orderId, user.id, 'default', options);
// vs
const result = await service.processOrder(orderId, user.id, user.role, options);
```

**Why it's a bug (even if it works):** Code communicates intent. When 10 callers pass `resolveAuthorizedBranchId(user)` and 1 passes `undefined`, the 11th developer reading this will:
- Think `undefined` is intentional (maybe it means "no branch filter"?)
- Copy the inconsistent pattern into new code
- Miss the actual reason (superadmin bypass)

The code works, but the team's understanding breaks down over time.

**How to spot it in ANY codebase:**
- Look for `undefined` or `null` passed as explicit arguments in function calls
- Compare with other callers of the same function â€” are they consistent?
- Search for function calls with more than 3 arguments â€” these are fragile by nature

**The mental checklist:**
```
When you see an explicit undefined/null argument:
1. Why is this caller different from others?
2. Is there a comment explaining why?
3. Can I make the intent clearer? (e.g., use the same helper function)
```

**Better pattern â€” use the same function every time:**
```ts
// EVERY caller does this, even if the result is undefined:
const branchId = resolveAuthorizedBranchId(user);
const payment = await service.confirmPayment(paymentId, user.userId, branchId, data);
```

This way: uniform code, explicit intent, and if the logic of `resolveAuthorizedBranchId` changes, every caller automatically gets the new behavior.

---

#### The Universal Debugging Framework for Payment Code

When you open a payment codebase for the first time, run through this checklist:

```
[ ] CAN I FIND THE 3 STATES? â€” pending â†’ paid/failed â†’ refunded
    Where is CREATE? Where is CONFIRM? Where is FAIL?
    
[ ] CAN I FIND THE WEBHOOK HANDLER?
    Does it verify a signature? (if no â†’ security bug)
    Does it check for duplicates? (if no â†’ double-charge risk)
    Does it use rawBody or parsed body? (if parsed â†’ HMAC will fail)
    
[ ] CAN I FIND THE OUTBOUND API CALLS?
    Do they have timeouts? (if no â†’ reliability bug)
    Are they behind a gateway abstraction? (if no â†’ hard to switch providers)
    
[ ] CAN I FIND THE CONFIRMATION LOGIC?
    Does it use row locking (FOR UPDATE)? (if no â†’ race condition risk)
    Is it idempotent? (if called twice, same result?)

[ ] CAN I FIND THE CONSISTENCY PATTERNS?
    Do all controllers call the same helper for branchId/userId? (if no â†’ inconsistency)
    Do all errors follow the same format? (if no â†’ debugging harder)
```

**Print this checklist. Stick it on your monitor. Use it every time you review payment code.**

---

#### Mistake #4 (The one we DIDN'T make â€” but you should know)

There's a 4th mistake that kills payment systems in production. We avoided it, but you need to know:

**Storing raw gateway credentials (API keys) in code.**

```
// DANGER: never do this
const secretKey = 'sk_test_xxxxxxxxxxxx';  // â† hardcoded!

// DANGER: never commit this
const cashfreeSecret = 'cfsk_xxxxxxxx';  // â† visible in git history forever
```

**Fix:** Always use environment variables (`.env`) + secret management.

```ts
const secretKey = process.env.GATEWAY_SECRET_KEY;
if (!secretKey) throw new Error('GATEWAY_SECRET_KEY not configured');
```

**How to check if you already made this mistake:**
```bash
# Check git history for committed secrets:
git log --all --oneline --diff-filter=A -- '**/*.env'
grep -r "sk_live\|sk_test\|cfsk\|rzp_live\|rzp_test" --include="*.ts" --include="*.js"
```

---

#### Summary: The 3 Lessons That Apply to Every Project

| # | The Mistake | The Lesson | How to Never Do It Again |
|---|-------------|------------|--------------------------|
| 1 | `JSON.stringify` fallback in webhook | Cryptographic operations need EXACT original data | Always use `rawBody`, never re-serialize |
| 2 | No timeout on `fetch()` | External APIs will hang eventually | Add `AbortController` to every outbound call |
| 3 | Hardcoded `undefined` argument | Inconsistency hides bugs | Use the same helper function everywhere |

**The deeper truth:** All 3 bugs are the same bug dressed differently â€” **assuming things will work when they aren't explicitly handled.** The fix is always: be explicit, fail fast, and never trust a fallback that silently changes your data.

---

| Concept | File | What it does |
|---------|------|-------------|
| Types | `payments.types.ts` | Data shapes |
| Gateway | `payments.cashfree.ts` | Talks to Cashfree API |
| Business logic | `payments.service.ts` | record, confirm, calculate coverage |
| HTTP layer | `payments.controller.ts` | Parse requests, send responses |
| URLs | `payments.routes.ts` | Route map with auth |
| Comm | `payments.communication.ts` | SMS/WhatsApp reminders & receipts |
| Frontend API | `api/payments.ts` | Frontend calls backend |
| Cashfree SDK | `lib/payments/cashfree.ts` | Browser-side checkout |
| Admin page | `pages/PaymentsPage.tsx` | Full payment dashboard |
| Student page | `pages/StudentPaymentPage.tsx` | Pay without login |
| DB table | `fee_payments` | Stores all payment records |
| DB table | `payment_communications` | Stores all SMS/WhatsApp logs |

---

