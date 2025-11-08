# 🐳 Docker Deployment Guide - Authentication System

## Important Changes for Docker Deployment

The authentication system requires **persistent storage** for the SQLite database and **environment configuration** for security. Here's what changed and what you need to do:

---

## ⚠️ Critical: JWT Secret Configuration

### Before Deployment

**1. Generate a Secure JWT Secret**

On your local machine or server, run:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

This will output something like:
```
a1b2c3d4e5f6...very_long_random_string...
```

**2. Create `.env` file for Docker Compose**

On your Docker host at `/mnt/usb_1/Docker/Dicesoccer/`:

```bash
cd /mnt/usb_1/Docker/Dicesoccer/
nano .env
```

Add this content:
```env
JWT_SECRET=<paste your generated secret here>
```

**3. Update docker-compose.yml**

Replace your current docker-compose.yml with the new `docker-compose.dev.yml` content, or create a new one:

```bash
cd /mnt/usb_1/Docker/Dicesoccer/
nano docker-compose.yml
```

---

## 📦 New Docker Compose Configuration

### Required Volumes

The websocket server now needs **two persistent volumes**:

1. **Database Storage**: `/mnt/usb_1/Docker/Dicesoccer/websocket-data`
   - Stores SQLite database with user accounts, games, stats
   - **MUST persist** across container restarts

2. **Backup Storage**: `/mnt/usb_1/Docker/Dicesoccer/websocket-backups`
   - Stores automated database backups
   - Recommended for data safety

### Create Directories

On your Docker host:

```bash
mkdir -p /mnt/usb_1/Docker/Dicesoccer/websocket-data
mkdir -p /mnt/usb_1/Docker/Dicesoccer/websocket-backups
chmod 777 /mnt/usb_1/Docker/Dicesoccer/websocket-data
chmod 777 /mnt/usb_1/Docker/Dicesoccer/websocket-backups
```

---

## 🚀 Deployment Steps

### 1. Push Code to Dev Branch

```bash
git add .
git commit -m "Add authentication system - Phase 1"
git push origin dev
```

### 2. Wait for Docker Images to Build

GitHub Actions will build:
- `ghcr.io/thehijacker/dicesoccer:dev`
- `ghcr.io/thehijacker/dicesoccer-websocket:dev`

### 3. Setup Environment on Docker Host

```bash
# SSH to your Docker host
ssh your-server

# Navigate to Docker directory
cd /mnt/usb_1/Docker/Dicesoccer/

# Create .env file with JWT secret
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" > .env

# Create required directories
mkdir -p websocket-data websocket-backups
chmod 777 websocket-data websocket-backups

# Update docker-compose.yml (copy from docker-compose.dev.yml)
```

### 4. Deploy Updated Containers

```bash
cd /mnt/usb_1/Docker/Dicesoccer/

# Pull latest images
docker-compose pull

# Stop current containers
docker-compose down

# Start with new configuration
docker-compose up -d

# Check logs
docker-compose logs -f dicesoccer-ws
```

---

## ✅ Verification Checklist

### After Deployment

**1. Check WebSocket Server Health**

```bash
# Check if containers are running
docker ps

# Check websocket logs
docker logs dicesoccer-ws

# Should see:
# ✅ Database connected: /app/data/dicesoccer.db
# ✅ Database schema initialized
# ✅ Prepared statements ready
# ✅ AuthManager initialized
# 🚀 Dice Soccer WebSocket Server starting...
# WebSocket Server listening on port 7860
```

**2. Verify Database Created**

```bash
ls -lh /mnt/usb_1/Docker/Dicesoccer/websocket-data/

# Should see:
# dicesoccer.db
# dicesoccer.db-shm (if active)
# dicesoccer.db-wal (if active)
```

**3. Test HTTP Endpoint**

```bash
curl http://localhost:3123

# Should return JSON with server status:
# {"name":"Dice Soccer WebSocket Server","status":"running",...}
```

**4. Check for Errors**

```bash
# Watch logs for any errors
docker logs dicesoccer-ws --tail 100 -f

# Look for:
# ❌ symbols (errors)
# ⚠️ symbols (warnings)
```

---

## 🔍 Troubleshooting

### Database Permission Issues

**Symptom**: `Error: SQLITE_CANTOPEN: unable to open database file`

**Solution**:
```bash
chmod 777 /mnt/usb_1/Docker/Dicesoccer/websocket-data
chown -R 1000:1000 /mnt/usb_1/Docker/Dicesoccer/websocket-data
```

### Missing JWT Secret

**Symptom**: `⚠️ JWT_SECRET not set in environment`

**Solution**:
```bash
# Add to .env file
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> /mnt/usb_1/Docker/Dicesoccer/.env

# Restart container
docker-compose restart dicesoccer-ws
```

### bcrypt Build Errors

**Symptom**: `Error: Cannot find module 'bcrypt'`

**Solution**: The Dockerfile now includes Python and build tools. Rebuild image:
```bash
docker-compose build --no-cache dicesoccer-ws
docker-compose up -d
```

### Database Locked

**Symptom**: `Error: SQLITE_BUSY: database is locked`

**Solution**: Only one websocket server should run at a time:
```bash
docker ps | grep dicesoccer-ws  # Should see only one
docker-compose down
docker-compose up -d
```

---

## 📊 Monitoring

### Check Database Size

```bash
du -h /mnt/usb_1/Docker/Dicesoccer/websocket-data/
```

### View Active Users

```bash
# Get database stats
docker exec dicesoccer-ws node -e "
const db = require('./database/db-manager');
db.initialize();
console.log(db.getStats());
"
```

### Manual Database Backup

```bash
# Backup database
docker exec dicesoccer-ws sqlite3 /app/data/dicesoccer.db ".backup /app/backups/manual-$(date +%Y%m%d-%H%M%S).db"

# Copy to host
docker cp dicesoccer-ws:/app/backups/. /mnt/usb_1/Docker/Dicesoccer/websocket-backups/
```

---

## 🔄 Rollback Plan

If you need to rollback to the previous version:

```bash
cd /mnt/usb_1/Docker/Dicesoccer/

# Stop current containers
docker-compose down

# Pull previous stable version (main branch)
docker pull ghcr.io/thehijacker/dicesoccer:main
docker pull ghcr.io/thehijacker/dicesoccer-websocket:main

# Update docker-compose.yml to use :main tags
sed -i 's/:dev/:main/g' docker-compose.yml

# Start containers
docker-compose up -d
```

---

## 📈 What's New in This Deployment

### WebSocket Server Changes

- ✅ **SQLite database** for user accounts and game history
- ✅ **bcrypt** password hashing (requires native build)
- ✅ **JWT tokens** for authentication
- ✅ **6 new Socket.IO endpoints** (register, login, logout, etc.)
- ✅ **Automatic token cleanup** job
- ✅ **Database initialization** on first run

### Frontend Changes

- ✅ **auth-client.js** added for authentication management
- ✅ **Auto-login** support with token refresh
- ✅ **Guest mode** support (no registration required)

### Infrastructure Requirements

- ✅ **Persistent volumes** for database and backups
- ✅ **Environment variables** for JWT secret
- ✅ **Python/build tools** in Docker image (for bcrypt)

---

## 🎯 Testing After Deployment

Once deployed, the backend is ready but **frontend UI is not yet implemented**. You can test the backend directly:

### Test Registration (via Browser Console)

```javascript
// Connect to websocket
const socket = io('http://your-server:3123');

// Register a test user
socket.emit('register', {
    username: 'testuser123',
    password: 'TestPass123',
    email: 'test@example.com'
}, (response) => {
    console.log('Registration:', response);
});
```

### Test Login

```javascript
socket.emit('login', {
    username: 'testuser123',
    password: 'TestPass123'
}, (response) => {
    console.log('Login:', response);
    // Save tokens for later
    localStorage.setItem('ds_access_token', response.accessToken);
    localStorage.setItem('ds_refresh_token', response.refreshToken);
});
```

---

## ⏭️ Next Steps

After successful deployment:

1. ✅ Verify database is created and persisting
2. ✅ Test basic registration/login via console
3. ✅ Monitor logs for errors
4. 🚧 **Next Phase**: Implement frontend login/register UI
5. 🚧 **Then**: Integrate with multiplayer lobby
6. 🚧 **Then**: Game tracking and leaderboards

---

**Summary**: Your Docker setup will work, but needs the **volume mounts** for database persistence and **JWT_SECRET environment variable** for security. Follow the steps above to deploy successfully! 🚀
