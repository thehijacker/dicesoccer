# Configuration Setup Guide

## Overview

This project uses `config.json` for runtime configuration. The file is **not tracked in Git** to allow environment-specific settings.

## For Developers

### Initial Setup

1. Copy the example configuration:
   ```bash
   cp config.example.json config.json
   ```

2. Edit `config.json` for your local environment:
   ```json
   {
     "websocket-server": "ws://localhost:7860",
     "log-enabled": true,
     "log-script": "logger.php",
     "debug-mode": true
   }
   ```

### Local Development

- Use `ws://localhost:7860` for the WebSocket server (unencrypted)
- Enable `debug-mode` for detailed console logging
- Enable `log-enabled` if testing game logging features

## For Deployment

### GitHub Pages (Automated)

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically creates the production `config.json` during deployment:

```json
{
  "websocket-server": "wss://dice-soccer-websocket-multiplayer-server.onrender.com/",
  "log-enabled": false,
  "log-script": "logger.php",
  "debug-mode": false
}
```

**No manual intervention needed** - just push to the main branch!

### Docker Deployment

When deploying via Docker, you can:

1. **Mount a config file**:
   ```yaml
   services:
     dicesoccer:
       image: ghcr.io/thehijacker/dicesoccer:latest
       volumes:
         - ./config.json:/usr/share/nginx/html/config.json
   ```

2. **Create during container startup**:
   ```dockerfile
   RUN echo '{"websocket-server":"wss://your-server.com/","log-enabled":false,"debug-mode":false}' > /usr/share/nginx/html/config.json
   ```

### Self-Hosted

Create `config.json` on your web server:

```json
{
  "websocket-server": "wss://your-websocket-server.com:7860",
  "log-enabled": false,
  "log-script": "logger.php",
  "debug-mode": false
}
```

**Important:** Use `wss://` (secure WebSocket) in production, not `ws://`

## Configuration Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `websocket-server` | string | WebSocket server URL | `"wss://server.com/"` |
| `log-enabled` | boolean | Enable game logging (requires PHP) | `false` |
| `log-script` | string | Path to logging script | `"logger.php"` |
| `debug-mode` | boolean | Enable debug console output | `false` |

## Security Notes

- ❌ **Never commit `config.json`** to the repository
- ✅ Use `wss://` (secure WebSocket) in production
- ✅ Set `debug-mode: false` in production
- ✅ Set `log-enabled: false` if not using logging features

## Troubleshooting

### "Failed to connect to WebSocket server"

- Check that the `websocket-server` URL is correct
- Verify the WebSocket server is running
- Ensure you're using `wss://` for HTTPS sites, `ws://` for HTTP

### Config not loading

- Ensure `config.json` exists in the root directory (same level as `index.html`)
- Check browser console for fetch errors
- Verify JSON syntax is valid

### Changes not taking effect

- Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check that Service Worker is updated (in browser DevTools)
