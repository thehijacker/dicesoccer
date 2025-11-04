# WebSocket Server Deployment Guide

Quick guide for deploying the Dice Soccer WebSocket server.

## Quick Start with Docker

### Pull and Run Pre-built Image

```bash
# Latest stable (main branch)
docker run -d \
  --name dicesoccer-ws \
  -p 3000:3000 \
  -e CORS_ORIGIN="*" \
  --restart unless-stopped \
  ghcr.io/thehijacker/dicesoccer-websocket:latest

# Development version (dev branch)
docker run -d \
  --name dicesoccer-ws-dev \
  -p 3000:3000 \
  -e CORS_ORIGIN="*" \
  --restart unless-stopped \
  ghcr.io/thehijacker/dicesoccer-websocket:dev
```

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  websocket:
    image: ghcr.io/thehijacker/dicesoccer-websocket:latest
    container_name: dicesoccer-ws
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - CORS_ORIGIN=*  # Change to your domain in production
      - NODE_ENV=production
    restart: unless-stopped
```

Run:
```bash
docker-compose up -d
```

## Configure Client

Update `config.json` in your game directory:

```json
{
  "multiplayer-server": "nodejs",
  "nodejs-server": "ws://your-server-ip:3000"
}
```

For HTTPS/WSS:
```json
{
  "multiplayer-server": "nodejs",
  "nodejs-server": "wss://your-domain.com:3000"
}
```

## Production Deployment

### With SSL/TLS (Recommended)

Use Nginx as reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Then use `wss://yourdomain.com` in config.json.

## Monitoring

Check server status:
```bash
curl http://localhost:3000
```

View logs:
```bash
docker logs dicesoccer-ws -f
```

Check health:
```bash
docker ps  # Look for "healthy" status
```

## Troubleshooting

**Can't connect?**
- Check firewall allows port 3000
- Verify CORS_ORIGIN includes your domain
- Check server logs: `docker logs dicesoccer-ws`

**High latency?**
- Check server resources
- Consider using reverse proxy
- Verify network connectivity

## Scaling

For multiple instances, use Redis adapter:
```bash
# This requires code modification - see main README
```

## More Documentation

See `README.md` in websocket-server directory for complete documentation.
