# Dice Soccer - WebSocket Multiplayer Server

A real-time WebSocket server for Dice Soccer multiplayer gameplay using Socket.IO.

## Features

- 🔌 **Real-time WebSocket Communication** - Instant game updates without polling
- 🎮 **Lobby System** - Player presence, matchmaking, and challenges
- ⚡ **High Performance** - Handles many concurrent connections efficiently
- 🐳 **Docker Ready** - Easy deployment with Docker and docker-compose
- 💪 **Production Ready** - Health checks, graceful shutdown, connection management
- 🔄 **Auto-reconnect** - Robust connection handling with automatic reconnection

## Architecture

### Server Components

- **Lobby Management** - Track online players, availability, and challenges
- **Challenge System** - Send, accept, and decline game challenges
- **Game Sessions** - Manage active games and route events between players
- **Connection Management** - Heartbeat monitoring and cleanup of stale connections

### Client Integration

The client-side manager (`multiplayer-websocket.js`) provides the same interface as the PHP implementation, allowing easy switching between backends via `config.json`.

## Quick Start

### Local Development

1. **Install dependencies:**
```bash
cd websocket-server
npm install
```

2. **Start the server:**
```bash
npm start
```

The server will run on `http://localhost:3000`

### Using Docker

1. **Build and run with docker-compose:**
```bash
cd websocket-server
docker-compose up -d
```

2. **Or build manually:**
```bash
docker build -t dicesoccer-websocket .
docker run -p 3000:3000 dicesoccer-websocket
```

### Using Pre-built Images

Pull from GitHub Container Registry:

```bash
# Latest stable version (main branch)
docker pull ghcr.io/thehijacker/dicesoccer-websocket:latest

# Development version (dev branch)
docker pull ghcr.io/thehijacker/dicesoccer-websocket:dev

# Run the container
docker run -d -p 3000:3000 \
  -e CORS_ORIGIN="*" \
  --name dicesoccer-ws \
  ghcr.io/thehijacker/dicesoccer-websocket:latest
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `*` | CORS origin (use specific domain in production) |
| `NODE_ENV` | `production` | Node environment |

### Client Configuration

Update `config.json` in the main game directory:

```json
{
  "multiplayer-server": "nodejs",
  "nodejs-server": "ws://your-server-url:3000"
}
```

For production with HTTPS:
```json
{
  "multiplayer-server": "nodejs",
  "nodejs-server": "wss://your-domain.com:3000"
}
```

## API / Socket Events

### Client → Server

#### Connection & Lobby
- `init` - Initialize player connection
  - Parameters: `{ playerId, playerName }`
  - Response: `{ success, playerId }`

- `enterLobby` - Enter the multiplayer lobby
  - Response: `{ success }`

- `getLobbyPlayers` - Get list of players in lobby
  - Response: `{ success, availablePlayers, challengingPlayers, activeGames, myStatus }`

- `leaveLobby` - Leave the lobby
  - Response: `{ success }`

#### Challenges
- `sendChallenge` - Challenge another player
  - Parameters: `{ targetPlayerId, hintsEnabled }`
  - Response: `{ success, challengeId }`

- `acceptChallenge` - Accept an incoming challenge
  - Parameters: `{ challengeId }`
  - Response: `{ success, gameId, role, hintsEnabled, opponent }`

- `declineChallenge` - Decline a challenge
  - Parameters: `{ challengeId }`
  - Response: `{ success }`

#### Game
- `gameEvent` - Send game event to opponent
  - Parameters: `{ type, ...eventData }`
  - Response: `{ success, eventId }`

- `leaveGame` - Leave current game
  - Response: `{ success }`

#### Utility
- `heartbeat` - Keep connection alive
  - Response: `{ success }`

### Server → Client

- `challenge` - Incoming challenge from another player
  - Data: `{ challengeId, challengerId, challengerName, hintsEnabled }`

- `challengeAccepted` - Your challenge was accepted (game starting)
  - Data: `{ gameId, role, hintsEnabled, opponent }`

- `challengeDeclined` - Your challenge was declined
  - Data: `{ challengeId, declinedBy }`

- `challengeCancelled` - Challenge was cancelled (player disconnected)
  - Data: `{ challengeId }`

- `lobbyUpdate` - Lobby state changed (refresh needed)
  - Data: `{ timestamp }`

- `gameEvent` - Game event from opponent
  - Data: `{ type, eventId, timestamp, ...eventData }`

- `serverShutdown` - Server is shutting down
  - Data: `{ message }`

## Game Event Types

Events sent during gameplay via `gameEvent`:

- `initialPositions` - Initial board setup
- `guestColor` - Guest's chosen color
- `colorsConfirmed` - Both colors confirmed
- `diceRolled` - Dice was rolled
- `playerMoved` - Player piece moved
- `gameEnded` - Game finished

## Deployment

### Production Deployment

1. **Set up with Docker Compose:**

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  websocket:
    image: ghcr.io/thehijacker/dicesoccer-websocket:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - CORS_ORIGIN=https://yourdomain.com
      - NODE_ENV=production
```

2. **Run:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Behind Nginx Reverse Proxy

```nginx
location /socket.io/ {
    proxy_pass http://localhost:3000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

### Health Check

The server provides a health check endpoint at `/`:

```bash
curl http://localhost:3000
```

Response:
```json
{
  "name": "Dice Soccer WebSocket Server",
  "status": "running",
  "players": 5,
  "activeGames": 2,
  "timestamp": "2025-11-04T12:00:00.000Z"
}
```

## Monitoring

### Docker Health Check

Built-in health check runs every 30 seconds:

```bash
docker ps
```

Look for "healthy" status.

### Logs

View server logs:
```bash
docker logs dicesoccer-ws -f
```

## Performance

- **Lightweight** - ~50MB memory footprint
- **Scalable** - Handles 1000+ concurrent connections on modest hardware
- **Low Latency** - < 10ms event delivery on local network
- **Efficient** - WebSocket keeps connections open, no polling overhead

## Comparison: WebSocket vs PHP

| Feature | WebSocket | PHP Long-Polling |
|---------|-----------|------------------|
| Latency | < 10ms | ~500ms |
| Server Load | Low | Medium-High |
| Scalability | Excellent | Good |
| Real-time | Yes | Simulated |
| Connection Overhead | Minimal | High (frequent requests) |
| Deployment | Requires Node.js | Runs on any PHP server |

## Troubleshooting

### Connection Issues

1. **Check server is running:**
```bash
curl http://localhost:3000
```

2. **Check CORS settings** - Ensure `CORS_ORIGIN` allows your domain

3. **Firewall** - Ensure port 3000 is open

### Client Not Connecting

1. **Check config.json** - Verify `nodejs-server` URL
2. **Check browser console** - Look for connection errors
3. **Try HTTP before HTTPS** - Test with `ws://` first

### Performance Issues

1. **Check Docker resources** - Ensure adequate CPU/RAM
2. **Monitor connections** - Check health endpoint for player count
3. **Review logs** - Look for errors or warnings

## Development

### Run in Development Mode

Uses `nodemon` for auto-reload:

```bash
npm run dev
```

### Project Structure

```
websocket-server/
├── server.js           # Main server code
├── package.json        # Dependencies
├── Dockerfile          # Container image
├── docker-compose.yml  # Local deployment
├── .dockerignore      # Docker build exclusions
└── README.md          # This file
```

## Future Enhancements

- [ ] Chat system
- [ ] Spectator mode
- [ ] Game replays
- [ ] Tournament brackets
- [ ] Player statistics
- [ ] Rate limiting
- [ ] Redis for multi-instance scaling

## License

MIT License - See main project LICENSE file

## Support

For issues and questions, please use the GitHub repository issues page.
