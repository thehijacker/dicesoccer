#!/bin/bash
# Quick setup script for Dice Soccer Docker deployment with authentication

echo "🎮 Dice Soccer - Docker Deployment Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  Please don't run as root"
    exit 1
fi

# Set base directory
BASE_DIR="/mnt/usb_1/Docker/Dicesoccer"

# Create base directory if it doesn't exist
if [ ! -d "$BASE_DIR" ]; then
    echo "📁 Creating base directory: $BASE_DIR"
    mkdir -p "$BASE_DIR"
fi

cd "$BASE_DIR" || exit 1

echo "📂 Working directory: $(pwd)"
echo ""

# Generate JWT secret if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "🔐 Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 2>/dev/null)
    
    if [ -z "$JWT_SECRET" ]; then
        echo "❌ Failed to generate JWT secret. Is Node.js installed?"
        echo "   Please install Node.js or manually create .env file"
        exit 1
    fi
    
    echo "JWT_SECRET=$JWT_SECRET" > .env
    echo "✅ JWT secret created in .env file"
else
    echo "✅ .env file already exists"
fi

echo ""

# Create required directories
echo "📁 Creating required directories..."
mkdir -p websocket-data
mkdir -p websocket-backups
chmod 777 websocket-data websocket-backups

echo "✅ Directories created:"
echo "   - $BASE_DIR/websocket-data"
echo "   - $BASE_DIR/websocket-backups"
echo ""

# Check if config.json exists
if [ ! -f "config.json" ]; then
    echo "⚠️  Warning: config.json not found"
    echo "   Creating default config.json..."
    cat > config.json << 'EOF'
{
  "websocket-server": "ws://localhost:3123",
  "log-enabled": false,
  "log-script": "logger.php",
  "debug-mode": false
}
EOF
    echo "✅ Default config.json created (update websocket-server URL for production)"
fi

echo ""

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "⚠️  Warning: docker-compose.yml not found"
    echo "   Please copy docker-compose.dev.yml from the repository"
else
    echo "✅ docker-compose.yml found"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update config.json with your production WebSocket URL"
echo "2. Copy docker-compose.dev.yml from repo to docker-compose.yml (if needed)"
echo "3. Run: docker-compose pull"
echo "4. Run: docker-compose up -d"
echo "5. Check logs: docker-compose logs -f dicesoccer-ws"
echo ""
echo "Verify JWT secret:"
cat .env
echo ""
