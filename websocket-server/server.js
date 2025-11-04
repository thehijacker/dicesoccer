/**
 * Dice Soccer - WebSocket Multiplayer Server
 * 
 * A real-time multiplayer server using Socket.IO for handling:
 * - Player lobby and presence
 * - Challenge system
 * - Game sessions and events
 * - Connection management
 */

const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 3000;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds
const LOBBY_CLEANUP_INTERVAL = 60000; // 1 minute

// Data structures
const players = new Map(); // playerId -> player info
const lobbySockets = new Map(); // socketId -> playerId
const challenges = new Map(); // challengeId -> challenge info
const games = new Map(); // gameId -> game session
const playerGames = new Map(); // playerId -> gameId

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        name: 'Dice Soccer WebSocket Server',
        status: 'running',
        players: players.size,
        activeGames: games.size,
        timestamp: new Date().toISOString()
    }));
});

// Create Socket.IO server with CORS
const io = socketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

console.log('🚀 Dice Soccer WebSocket Server starting...');

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);
    
    // Initialize player on connection
    socket.on('init', (data, callback) => {
        try {
            const { playerId, playerName } = data;
            
            if (!playerId || !playerName) {
                return callback({ success: false, error: 'Missing playerId or playerName' });
            }
            
            // Check if player already exists (reconnection scenario)
            const existingPlayer = players.get(playerId);
            if (existingPlayer) {
                console.log(`🔄 Player reconnecting: ${playerName} (${playerId})`);
                
                // Update socket ID
                existingPlayer.socketId = socket.id;
                existingPlayer.status = existingPlayer.inGame ? 'in-game' : 'online';
                existingPlayer.lastSeen = Date.now();
                delete existingPlayer.disconnectedAt; // Clear disconnect timestamp
                
                lobbySockets.set(socket.id, playerId);
                
                // If player was in a game, notify opponent of reconnection
                const gameId = playerGames.get(playerId);
                if (gameId) {
                    const game = games.get(gameId);
                    if (game) {
                        const opponentId = game.host.playerId === playerId ? game.guest.playerId : game.host.playerId;
                        const opponent = players.get(opponentId);
                        
                        if (opponent) {
                            const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                            if (opponentSocket) {
                                console.log(`✅ Notifying opponent that ${playerName} reconnected`);
                                opponentSocket.emit('gameEvent', {
                                    type: 'playerReconnected',
                                    reconnectedPlayerId: playerId,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
                
                return callback({ success: true, playerId, reconnected: true });
            }
            
            // Store player info
            players.set(playerId, {
                playerId,
                playerName,
                socketId: socket.id,
                status: 'online',
                lastSeen: Date.now(),
                inLobby: false,
                inGame: false
            });
            
            lobbySockets.set(socket.id, playerId);
            
            console.log(`👤 Player initialized: ${playerName} (${playerId})`);
            
            callback({ success: true, playerId });
        } catch (error) {
            console.error('Init error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Enter lobby
    socket.on('enterLobby', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (!playerId) {
                return callback({ success: false, error: 'Not initialized' });
            }
            
            const player = players.get(playerId);
            if (!player) {
                return callback({ success: false, error: 'Player not found' });
            }
            
            player.inLobby = true;
            player.status = 'available';
            player.lastSeen = Date.now();
            
            socket.join('lobby');
            
            console.log(`🚪 ${player.playerName} entered lobby`);
            
            // Notify all lobby players of the update
            broadcastLobbyUpdate();
            
            callback({ success: true });
        } catch (error) {
            console.error('Enter lobby error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Get lobby players
    socket.on('getLobbyPlayers', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (!playerId) {
                return callback({ success: false, error: 'Not initialized' });
            }
            
            const lobbyPlayers = getLobbyPlayersList(playerId);
            callback({ success: true, ...lobbyPlayers });
        } catch (error) {
            console.error('Get lobby players error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Send challenge
    socket.on('sendChallenge', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            const { targetPlayerId, hintsEnabled } = data;
            
            if (!playerId || !targetPlayerId) {
                return callback({ success: false, error: 'Invalid request' });
            }
            
            const challenger = players.get(playerId);
            const target = players.get(targetPlayerId);
            
            if (!challenger || !target) {
                return callback({ success: false, error: 'Player not found' });
            }
            
            if (target.status !== 'available') {
                return callback({ success: false, error: 'Player not available' });
            }
            
            // Create challenge
            const challengeId = generateId();
            challenges.set(challengeId, {
                challengeId,
                challengerId: playerId,
                challengerName: challenger.playerName,
                targetId: targetPlayerId,
                hintsEnabled: hintsEnabled !== false,
                timestamp: Date.now()
            });
            
            // Update player statuses
            challenger.status = 'challenging';
            target.status = 'challenged';
            
            // Notify target player
            const targetSocket = io.sockets.sockets.get(target.socketId);
            if (targetSocket) {
                targetSocket.emit('challenge', {
                    challengeId,
                    challengerId: playerId,
                    challengerName: challenger.playerName,
                    hintsEnabled: hintsEnabled !== false
                });
            }
            
            console.log(`⚔️ ${challenger.playerName} challenged ${target.playerName}`);
            
            broadcastLobbyUpdate();
            
            callback({ success: true, challengeId });
        } catch (error) {
            console.error('Send challenge error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Accept challenge
    socket.on('acceptChallenge', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            const { challengeId } = data;
            
            if (!playerId || !challengeId) {
                return callback({ success: false, error: 'Invalid request' });
            }
            
            const challenge = challenges.get(challengeId);
            if (!challenge) {
                return callback({ success: false, error: 'Challenge not found' });
            }
            
            if (challenge.targetId !== playerId) {
                return callback({ success: false, error: 'Not your challenge' });
            }
            
            const challenger = players.get(challenge.challengerId);
            const accepter = players.get(playerId);
            
            if (!challenger || !accepter) {
                return callback({ success: false, error: 'Player not found' });
            }
            
            // Create game session
            const gameId = generateId();
            const game = {
                gameId,
                host: {
                    playerId: challenge.challengerId,
                    playerName: challenger.playerName,
                    socketId: challenger.socketId
                },
                guest: {
                    playerId: playerId,
                    playerName: accepter.playerName,
                    socketId: accepter.socketId
                },
                hintsEnabled: challenge.hintsEnabled,
                status: 'active',
                events: [],
                createdAt: Date.now()
            };
            
            games.set(gameId, game);
            playerGames.set(challenge.challengerId, gameId);
            playerGames.set(playerId, gameId);
            
            // Update player statuses
            challenger.status = 'in-game';
            challenger.inLobby = false;
            challenger.inGame = true;
            accepter.status = 'in-game';
            accepter.inLobby = false;
            accepter.inGame = true;
            
            // Remove challenge
            challenges.delete(challengeId);
            
            // Both players join game room
            socket.join(gameId);
            const challengerSocket = io.sockets.sockets.get(challenger.socketId);
            if (challengerSocket) {
                challengerSocket.join(gameId);
                challengerSocket.leave('lobby');
                
                // Notify challenger
                challengerSocket.emit('challengeAccepted', {
                    gameId,
                    role: 'host',
                    hintsEnabled: challenge.hintsEnabled,
                    opponent: {
                        playerId: accepter.playerId,
                        playerName: accepter.playerName
                    }
                });
            }
            
            socket.leave('lobby');
            
            console.log(`🎮 Game started: ${challenger.playerName} vs ${accepter.playerName} (${gameId})`);
            
            broadcastLobbyUpdate();
            
            callback({
                success: true,
                gameId,
                role: 'guest',
                hintsEnabled: challenge.hintsEnabled,
                opponent: {
                    playerId: challenger.playerId,
                    playerName: challenger.playerName
                }
            });
        } catch (error) {
            console.error('Accept challenge error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Decline challenge
    socket.on('declineChallenge', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            const { challengeId } = data;
            
            if (!playerId || !challengeId) {
                return callback({ success: false, error: 'Invalid request' });
            }
            
            const challenge = challenges.get(challengeId);
            if (!challenge) {
                return callback({ success: false, error: 'Challenge not found' });
            }
            
            if (challenge.targetId !== playerId) {
                return callback({ success: false, error: 'Not your challenge' });
            }
            
            const challenger = players.get(challenge.challengerId);
            const decliner = players.get(playerId);
            
            if (challenger) {
                challenger.status = 'available';
                
                // Notify challenger
                const challengerSocket = io.sockets.sockets.get(challenger.socketId);
                if (challengerSocket) {
                    challengerSocket.emit('challengeDeclined', {
                        challengeId,
                        declinedBy: decliner?.playerName || 'Unknown'
                    });
                }
            }
            
            if (decliner) {
                decliner.status = 'available';
            }
            
            challenges.delete(challengeId);
            
            console.log(`❌ Challenge declined: ${decliner?.playerName || playerId}`);
            
            broadcastLobbyUpdate();
            
            callback({ success: true });
        } catch (error) {
            console.error('Decline challenge error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Send game event
    socket.on('gameEvent', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (!playerId) {
                return callback({ success: false, error: 'Not initialized' });
            }
            
            const gameId = playerGames.get(playerId);
            if (!gameId) {
                return callback({ success: false, error: 'Not in a game' });
            }
            
            const game = games.get(gameId);
            if (!game) {
                return callback({ success: false, error: 'Game not found' });
            }
            
            // Add event to game history
            const event = {
                ...data,
                eventId: game.events.length + 1,
                timestamp: Date.now()
            };
            
            game.events.push(event);
            
            // Send event to opponent only
            const opponentId = game.host.playerId === playerId ? game.guest.playerId : game.host.playerId;
            const opponent = players.get(opponentId);
            
            if (opponent) {
                const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                if (opponentSocket) {
                    opponentSocket.emit('gameEvent', event);
                }
            }
            
            // console.log(`📤 Game event: ${data.type} in game ${gameId}`);
            
            callback({ success: true, eventId: event.eventId });
        } catch (error) {
            console.error('Game event error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Leave game
    socket.on('leaveGame', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (!playerId) {
                return callback({ success: false, error: 'Not initialized' });
            }
            
            const gameId = playerGames.get(playerId);
            if (!gameId) {
                return callback({ success: true }); // Not in game, nothing to do
            }
            
            const game = games.get(gameId);
            if (game) {
                // Notify opponent
                const opponentId = game.host.playerId === playerId ? game.guest.playerId : game.host.playerId;
                const opponent = players.get(opponentId);
                
                if (opponent) {
                    const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                    if (opponentSocket) {
                        opponentSocket.emit('gameEvent', {
                            type: 'gameEnded',
                            reason: 'opponent_left',
                            timestamp: Date.now()
                        });
                        opponentSocket.leave(gameId);
                    }
                    
                    opponent.status = 'available';
                    opponent.inGame = false;
                    playerGames.delete(opponentId);
                }
                
                // Clean up game
                games.delete(gameId);
            }
            
            const player = players.get(playerId);
            if (player) {
                player.status = 'available';
                player.inGame = false;
            }
            
            playerGames.delete(playerId);
            socket.leave(gameId);
            
            console.log(`👋 Player left game: ${playerId}`);
            
            callback({ success: true });
        } catch (error) {
            console.error('Leave game error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Leave lobby
    socket.on('leaveLobby', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (!playerId) {
                return callback({ success: false, error: 'Not initialized' });
            }
            
            const player = players.get(playerId);
            if (player) {
                player.inLobby = false;
                player.status = 'online';
            }
            
            socket.leave('lobby');
            
            console.log(`🚪 ${player?.playerName || playerId} left lobby`);
            
            broadcastLobbyUpdate();
            
            callback({ success: true });
        } catch (error) {
            console.error('Leave lobby error:', error);
            callback({ success: false, error: error.message });
        }
    });
    
    // Heartbeat
    socket.on('heartbeat', (data, callback) => {
        try {
            const playerId = lobbySockets.get(socket.id);
            if (playerId) {
                const player = players.get(playerId);
                if (player) {
                    player.lastSeen = Date.now();
                }
            }
            
            if (callback) callback({ success: true });
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
        
        const playerId = lobbySockets.get(socket.id);
        if (playerId) {
            handlePlayerDisconnect(playerId);
            lobbySockets.delete(socket.id);
        }
    });
});

// Helper functions
function generateId() {
    return Array.from(crypto.randomBytes(16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function getLobbyPlayersList(requestingPlayerId) {
    const availablePlayers = [];
    const challengingPlayers = [];
    const activeGames = [];
    let myStatus = null;
    
    for (const [playerId, player] of players.entries()) {
        if (!player.inLobby) continue;
        
        if (playerId === requestingPlayerId) {
            myStatus = {
                status: player.status
            };
            
            // Check if this player has challenges
            for (const [challengeId, challenge] of challenges.entries()) {
                if (challenge.targetId === playerId) {
                    myStatus.challengedBy = challenge.challengerId;
                    myStatus.challengerName = challenge.challengerName;
                    myStatus.hintsEnabled = challenge.hintsEnabled;
                    myStatus.challengeId = challengeId;
                } else if (challenge.challengerId === playerId) {
                    myStatus.challengingPlayer = challenge.targetId;
                }
            }
            continue;
        }
        
        if (player.status === 'available') {
            availablePlayers.push({
                playerId: player.playerId,
                playerName: player.playerName
            });
        } else if (player.status === 'challenging') {
            challengingPlayers.push({
                playerId: player.playerId,
                playerName: player.playerName
            });
        }
    }
    
    // Collect active games
    for (const [gameId, game] of games.entries()) {
        if (game.status === 'active') {
            activeGames.push({
                gameId: gameId,
                player1: game.host.playerName,
                player2: game.guest.playerName,
                hintsEnabled: game.hintsEnabled,
                timestamp: game.createdAt
            });
        }
    }
    
    return {
        availablePlayers,
        challengingPlayers,
        activeGames,
        myStatus
    };
}

function broadcastLobbyUpdate() {
    // Send lobby update to all players in lobby
    io.to('lobby').emit('lobbyUpdate', {
        timestamp: Date.now()
    });
}

function handlePlayerDisconnect(playerId) {
    const player = players.get(playerId);
    if (!player) return;
    
    console.log(`🔌 Handling disconnect: ${player.playerName}`);
    
    // If player was in a game, mark as disconnected with grace period
    const gameId = playerGames.get(playerId);
    if (gameId) {
        const game = games.get(gameId);
        if (game) {
            // Mark player as disconnected
            player.status = 'disconnected';
            player.disconnectedAt = Date.now();
            
            // Notify opponent that player disconnected (not ended)
            const opponentId = game.host.playerId === playerId ? game.guest.playerId : game.host.playerId;
            const opponent = players.get(opponentId);
            
            if (opponent) {
                const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                if (opponentSocket) {
                    opponentSocket.emit('gameEvent', {
                        type: 'playerDisconnected',
                        disconnectedPlayerId: playerId,
                        timestamp: Date.now()
                    });
                }
            }
            
            // Set timeout to end game if player doesn't reconnect
            setTimeout(() => {
                // Check if player is still disconnected
                const currentPlayer = players.get(playerId);
                if (!currentPlayer || currentPlayer.status === 'disconnected') {
                    console.log(`⏰ Grace period expired for ${player.playerName}, ending game`);
                    
                    // End the game now
                    const currentGame = games.get(gameId);
                    if (currentGame) {
                        const currentOpponent = players.get(opponentId);
                        if (currentOpponent) {
                            const currentOpponentSocket = io.sockets.sockets.get(currentOpponent.socketId);
                            if (currentOpponentSocket) {
                                currentOpponentSocket.emit('gameEvent', {
                                    type: 'gameEnded',
                                    reason: 'opponent_disconnected',
                                    timestamp: Date.now()
                                });
                            }
                            
                            currentOpponent.status = 'available';
                            currentOpponent.inGame = false;
                            playerGames.delete(opponentId);
                        }
                        
                        games.delete(gameId);
                    }
                    
                    // Remove disconnected player
                    if (currentPlayer && currentPlayer.status === 'disconnected') {
                        players.delete(playerId);
                        playerGames.delete(playerId);
                    }
                }
            }, 60000); // 60 second grace period
            
            return; // Don't delete player yet, keep them for reconnection
        }
    }
    
    // Clean up challenges
    for (const [challengeId, challenge] of challenges.entries()) {
        if (challenge.challengerId === playerId || challenge.targetId === playerId) {
            // Notify the other party
            const otherId = challenge.challengerId === playerId ? challenge.targetId : challenge.challengerId;
            const other = players.get(otherId);
            
            if (other) {
                other.status = 'available';
                
                const otherSocket = io.sockets.sockets.get(other.socketId);
                if (otherSocket) {
                    otherSocket.emit('challengeCancelled', { challengeId });
                }
            }
            
            challenges.delete(challengeId);
        }
    }
    
    // Remove player (only if not in game)
    players.delete(playerId);
    
    broadcastLobbyUpdate();
}

// Cleanup old connections periodically
setInterval(() => {
    const now = Date.now();
    const timeout = HEARTBEAT_TIMEOUT;
    
    for (const [playerId, player] of players.entries()) {
        if (now - player.lastSeen > timeout) {
            console.log(`⏰ Timeout: ${player.playerName}`);
            
            // Disconnect socket if still connected
            const socket = io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.disconnect(true);
            }
            
            handlePlayerDisconnect(playerId);
        }
    }
}, LOBBY_CLEANUP_INTERVAL);

// Start server
server.listen(PORT, () => {
    console.log(`✅ Dice Soccer WebSocket Server running on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🌐 HTTP health check: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    
    // Notify all connected clients
    io.emit('serverShutdown', { message: 'Server is shutting down' });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    
    io.emit('serverShutdown', { message: 'Server is shutting down' });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
