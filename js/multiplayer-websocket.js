/**
 * Dice Soccer - WebSocket Client Manager
 * 
 * Real-time multiplayer client using Socket.IO
 * Provides the same interface as the PHP multiplayer manager for easy switching
 */

class WebSocketMultiplayerManager {
    constructor() {
        this.serverUrl = null; // Will be set from config
        this.socket = null;
        this.playerId = null;
        this.gameId = null;
        this.role = null; // 'host' or 'guest'
        this.isHost = false;
        this.localPlayer = 1; // Which player number is controlled locally (1 or 2)
        this.opponentInfo = null;
        this.isInGame = false;
        this.onEvent = null; // Callback for game events
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // Initialize connection
    async init() {
        // Generate or retrieve player ID
        this.playerId = localStorage.getItem('dicesoccer_mp_playerid');
        if (!this.playerId) {
            this.playerId = this.generateId();
            localStorage.setItem('dicesoccer_mp_playerid', this.playerId);
        }

        // Load server URL from config
        if (!this.serverUrl) {
            try {
                const response = await fetch('config.json');
                const config = await response.json();
                this.serverUrl = config['nodejs-server'] || 'ws://localhost:3000';
            } catch (error) {
                console.error('Failed to load config:', error);
                this.serverUrl = 'ws://localhost:3000'; // Fallback
            }
        }

        console.log(`🔌 Connecting to WebSocket server: ${this.serverUrl}`);

        return new Promise((resolve, reject) => {
            try {
                // Load Socket.IO client library if not already loaded
                if (typeof io === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
                    script.crossOrigin = 'anonymous';
                    script.onload = () => this.connect(resolve, reject);
                    script.onerror = () => reject(new Error('Failed to load Socket.IO client'));
                    document.head.appendChild(script);
                } else {
                    this.connect(resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    connect(resolve, reject) {
        try {
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to WebSocket server');
                this.connected = true;
                this.reconnectAttempts = 0;

                // Initialize player on server
                const playerName = gameState?.player1Name || 'Player';
                this.socket.emit('init', { 
                    playerId: this.playerId, 
                    playerName: playerName 
                }, (response) => {
                    if (response.success) {
                        console.log('👤 Player initialized on server');
                        resolve();
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });

            this.socket.on('disconnect', () => {
                console.log('❌ Disconnected from WebSocket server');
                this.connected = false;
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                this.reconnectAttempts++;
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    reject(new Error('Failed to connect to server'));
                }
            });

            // Event handlers
            this.socket.on('challenge', (data) => {
                console.log('⚔️ Received challenge:', data);
                // Handle incoming challenge in app.js
                if (window.handleIncomingChallenge) {
                    window.handleIncomingChallenge(data);
                }
            });

            this.socket.on('challengeAccepted', (data) => {
                console.log('🎮 Challenge accepted:', data);
                this.gameId = data.gameId;
                this.role = data.role;
                this.isHost = (data.role === 'host');
                this.localPlayer = this.isHost ? 1 : 2;
                this.opponentInfo = data.opponent;
                this.isInGame = true;

                if (this.onEvent) {
                    this.onEvent({
                        type: 'challengeAccepted',
                        ...data
                    });
                }
            });

            this.socket.on('challengeDeclined', (data) => {
                console.log('❌ Challenge declined:', data);
                if (window.handleChallengeDeclined) {
                    window.handleChallengeDeclined(data);
                }
            });

            this.socket.on('challengeCancelled', (data) => {
                console.log('🚫 Challenge cancelled:', data);
                if (window.handleChallengeCancelled) {
                    window.handleChallengeCancelled(data);
                }
            });

            this.socket.on('lobbyUpdate', () => {
                // Refresh lobby list
                if (window.refreshLobby) {
                    window.refreshLobby();
                }
            });

            this.socket.on('gameEvent', (event) => {
                console.log('📨 Received game event:', event.type);
                if (this.onEvent) {
                    this.onEvent(event);
                }
            });

            this.socket.on('serverShutdown', (data) => {
                console.warn('⚠️ Server shutting down:', data.message);
                alert('Server is shutting down. Please reconnect later.');
            });

            // Set timeout for initial connection
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);

        } catch (error) {
            reject(error);
        }
    }

    // === LOBBY SYSTEM METHODS ===

    async enterLobby(playerName) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('enterLobby', { playerName }, (response) => {
                if (response.success) {
                    console.log('🚪 Entered lobby');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async getLobbyPlayers() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('getLobbyPlayers', {}, (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async challengePlayer(targetPlayerId, hintsEnabled) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('sendChallenge', { targetPlayerId, hintsEnabled }, (response) => {
                if (response.success) {
                    console.log('⚔️ Challenge sent');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async acceptChallenge(challengeId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('acceptChallenge', { challengeId }, (response) => {
                if (response.success) {
                    this.gameId = response.gameId;
                    this.role = response.role;
                    this.isHost = (response.role === 'host');
                    this.localPlayer = this.isHost ? 1 : 2;
                    this.opponentInfo = response.opponent;
                    this.isInGame = true;
                    
                    console.log('✅ Challenge accepted, starting game');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async declineChallenge(challengeId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('declineChallenge', { challengeId }, (response) => {
                if (response.success) {
                    console.log('❌ Challenge declined');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async leaveLobby() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return resolve({ success: true }); // Already disconnected
            }

            this.socket.emit('leaveLobby', {}, (response) => {
                if (response.success) {
                    console.log('🚪 Left lobby');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    // === GAME METHODS ===

    sendEvent(event) {
        if (!this.socket || !this.connected) {
            console.error('Cannot send event: not connected');
            return;
        }

        console.log('📤 Sending event:', event.type);
        
        this.socket.emit('gameEvent', event, (response) => {
            if (response.success) {
                // Event sent successfully
            } else {
                console.error('Failed to send event:', response.error);
            }
        });
    }

    async leaveGame() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return resolve({ success: true });
            }

            this.socket.emit('leaveGame', {}, (response) => {
                this.gameId = null;
                this.role = null;
                this.isHost = false;
                this.localPlayer = 1;
                this.opponentInfo = null;
                this.isInGame = false;
                
                console.log('👋 Left game');
                resolve(response);
            });
        });
    }

    // === UTILITY METHODS ===

    // Heartbeat (handled automatically by Socket.IO, but provide for compatibility)
    startHeartbeat() {
        // Socket.IO handles ping/pong automatically
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.connected) {
                this.socket.emit('heartbeat', {});
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // These methods are for PHP polling compatibility - not needed for WebSocket
    startPolling() {
        console.log('📡 WebSocket mode: polling not needed (real-time events)');
    }

    stopPolling() {
        // No-op for WebSocket
    }

    cleanup() {
        console.log('🧹 Cleaning up WebSocket connection');
        this.stopHeartbeat();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.gameId = null;
        this.role = null;
        this.isHost = false;
        this.localPlayer = 1;
        this.opponentInfo = null;
        this.isInGame = false;
        this.connected = false;
    }

    generateId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}
