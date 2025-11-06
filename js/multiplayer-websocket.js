/**
 * Dice Soccer - WebSocket Client Manager
 * 
 * Real-time multiplayer client using Socket.IO
 * Provides the same interface as the PHP multiplayer manager for easy switching
 */

// Debug logging helper (will use global appConfig if available)
function wsDebugLog(...args) {
    if (typeof appConfig !== 'undefined' && appConfig['debug-mode']) {
        console.log(...args);
    }
}

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
        this.isInLobby = false;
        this.wasInLobby = false;
        this.onEvent = null; // Callback for game events
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.heartbeatInterval = null;
        this.connectionCancelled = false;
        this.connectPromiseReject = null;
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
            // Use global appConfig if available
            if (typeof appConfig !== 'undefined' && appConfig['websocket-server']) {
                this.serverUrl = appConfig['websocket-server'];
            } else {
                // Fallback: load config ourselves
                try {
                    const response = await fetch('config.json');
                    const config = await response.json();
                    this.serverUrl = config['websocket-server'] || 'wss://localhost:3000';
                } catch (error) {
                    console.error('Failed to load config:', error);
                    this.serverUrl = 'wss://localhost:3000'; // Fallback
                }
            }
        }

        wsDebugLog(`🔌 Connecting to WebSocket server: ${this.serverUrl}`);

        // Reset cancellation flag
        this.connectionCancelled = false;

        return new Promise((resolve, reject) => {
            this.connectPromiseReject = reject;
            
            try {
                // Show connection modal
                if (typeof window.showConnectionModal === 'function') {
                    window.showConnectionModal('connecting');
                }
                
                // Load Socket.IO client library if not already loaded
                if (typeof io === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
                    script.crossOrigin = 'anonymous';
                    script.onload = () => this.connect(resolve, reject);
                    script.onerror = () => {
                        if (typeof window.showConnectionModal === 'function') {
                            window.showConnectionModal('failed');
                        }
                        reject(new Error('Failed to load Socket.IO client'));
                    };
                    document.head.appendChild(script);
                } else {
                    this.connect(resolve, reject);
                }
            } catch (error) {
                if (typeof window.showConnectionModal === 'function') {
                    window.showConnectionModal('failed');
                }
                reject(error);
            }
        });
    }

    connect(resolve, reject) {
        // Check if connection was cancelled
        if (this.connectionCancelled) {
            wsDebugLog('❌ Connection cancelled by user');
            reject(new Error('Connection cancelled'));
            return;
        }
        
        try {
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.socket.on('connect', () => {
                wsDebugLog('✅ Connected to WebSocket server');
                this.connected = true;
                this.reconnectAttempts = 0;

                // Hide connection modal on successful connection
                if (typeof window.hideConnectionModal === 'function') {
                    window.hideConnectionModal();
                }

                // Start heartbeat to prevent timeout
                this.startHeartbeat();

                // Initialize player on server
                const playerName = gameState?.player1Name || 'Player';
                this.socket.emit('init', { 
                    playerId: this.playerId, 
                    playerName: playerName 
                }, (response) => {
                    if (response.success) {
                        wsDebugLog('👤 Player initialized on server');
                        
                        // Check if we reconnected to an existing game
                        if (response.reconnected) {
                            wsDebugLog('🔄 Reconnected to existing session');
                            
                            // If we have a current game, re-establish the event handler
                            if (window.currentGame && document.getElementById('gameScreen')?.classList.contains('active')) {
                                wsDebugLog('✅ Game state preserved, re-establishing event handler');
                                
                                // Reconnect the event handler
                                this.onEvent = (event) => {
                                    if (window.currentGame && event.type !== 'gameStart') {
                                        if (typeof window.currentGame.handleMultiplayerEvent === 'function') {
                                            window.currentGame.handleMultiplayerEvent(event);
                                        }
                                    }
                                };
                            }
                        } else if (this.wasInLobby && typeof window.refreshLobby === 'function') {
                            // New connection, was in lobby before - refresh lobby
                            wsDebugLog('🔄 Reconnected - refreshing lobby');
                            setTimeout(() => window.refreshLobby(), 500);
                        }
                        
                        resolve();
                    } else {
                        reject(new Error(response.error));
                    }
                });
            });

            this.socket.on('disconnect', (reason) => {
                wsDebugLog('❌ Disconnected from WebSocket server:', reason);
                this.connected = false;
                this.stopHeartbeat();
                
                // Remember state for reconnection
                if (this.isInLobby) {
                    this.wasInLobby = true;
                }
                
                // Notify user if disconnected unexpectedly (but not during intentional disconnects)
                // Also handle cases where disconnect happens during active game or lobby
                if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
                    // Server disconnected us or connection lost
                    const isInGame = document.getElementById('gameScreen')?.classList.contains('active');
                    const isInLobby = document.getElementById('lobbyModal')?.classList.contains('active');
                    
                    // Only show connection lost if we were actually using the connection
                    if (isInGame || isInLobby || this.isInGame || this.isInLobby) {
                        if (typeof window.showConnectionLost === 'function') {
                            window.showConnectionLost();
                        }
                    }
                }
            });

            this.socket.on('connect_error', (error) => {
                // Check if connection was cancelled
                if (this.connectionCancelled) {
                    wsDebugLog('❌ Connection cancelled during retry');
                    return;
                }
                
                console.error('Connection error:', error);
                this.reconnectAttempts++;
                
                // Update connection modal with retry info
                if (typeof window.updateConnectionModal === 'function') {
                    window.updateConnectionModal(this.reconnectAttempts, this.maxReconnectAttempts);
                }
                
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    // Hide trying modal and show failed modal
                    if (typeof window.showConnectionModal === 'function') {
                        window.showConnectionModal('failed');
                    }
                    reject(new Error('Connection timeout'));
                }
            });

            // Event handlers
            this.socket.on('challenge', (data) => {
                wsDebugLog('⚔️ Received challenge:', data);
                // Handle incoming challenge in app.js
                if (window.handleIncomingChallenge) {
                    window.handleIncomingChallenge(data);
                }
            });

            this.socket.on('challengeAccepted', (data) => {
                wsDebugLog('🎮 Challenge accepted:', data);
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
                wsDebugLog('❌ Challenge declined:', data);
                if (window.handleChallengeDeclined) {
                    window.handleChallengeDeclined(data);
                }
            });

            this.socket.on('challengeCancelled', (data) => {
                wsDebugLog('🚫 Challenge cancelled:', data);
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
                wsDebugLog('📨 Received game event:', event.type);
                if (this.onEvent) {
                    this.onEvent(event);
                }
            });

            this.socket.on('serverShutdown', (data) => {
                console.warn('⚠️ Server shutting down:', data.message);
                // Show connection lost modal
                if (typeof window.showConnectionLost === 'function') {
                    window.showConnectionLost();
                }
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
                    this.isInLobby = true;
                    this.wasInLobby = false;
                    wsDebugLog('🚪 Entered lobby');
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
                    wsDebugLog('⚔️ Challenge sent');
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
                    
                    wsDebugLog('✅ Challenge accepted, starting game');
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
                    wsDebugLog('❌ Challenge declined');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    async joinAsSpectator(gameId) {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return reject(new Error('Not connected to server'));
            }

            this.socket.emit('joinSpectator', { gameId }, (response) => {
                if (response.success) {
                    this.gameId = gameId;
                    this.isSpectator = true;
                    this.isInGame = false; // Spectators aren't "in game" as players
                    
                    wsDebugLog('👁️ Joined as spectator');
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    leaveSpectator() {
        console.log('🚪 leaveSpectator() called - isSpectator:', this.isSpectator, 'gameId:', this.gameId);
        
        return new Promise((resolve) => {
            if (this.socket && this.connected && this.isSpectator) {
                const gameId = this.gameId; // Save before clearing
                console.log('📤 Sending leaveSpectator event for game:', gameId);
                this.socket.emit('leaveSpectator', { gameId: gameId }, (response) => {
                    console.log('📥 leaveSpectator response:', response);
                    if (response && response.success) {
                        wsDebugLog('🚪 Successfully left spectator mode');
                    } else {
                        console.error('Failed to leave spectator mode:', response?.error);
                    }
                    
                    // Clear state after server confirms
                    this.isSpectator = false;
                    this.gameId = null;
                    resolve(response || { success: true });
                });
            } else {
                console.log('❌ Cannot leave spectator - socket:', !!this.socket, 'connected:', this.connected, 'isSpectator:', this.isSpectator);
                this.isSpectator = false;
                this.gameId = null;
                resolve({ success: false, error: 'Not in spectator mode' });
            }
        });
    }

    async leaveLobby() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.connected) {
                return resolve({ success: true }); // Already disconnected
            }

            this.socket.emit('leaveLobby', {}, (response) => {
                if (response.success) {
                    wsDebugLog('🚪 Left lobby');
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

        wsDebugLog('📤 Sending event:', event.type);
        
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
                this.isInLobby = false;
                this.wasInLobby = false;
                
                wsDebugLog('👋 Left game');
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
        wsDebugLog('📡 WebSocket mode: polling not needed (real-time events)');
    }

    stopPolling() {
        // No-op for WebSocket
    }

    disconnect() {
        wsDebugLog('🔌 Disconnecting from WebSocket server');
        
        // Set cancellation flag to stop connection attempts
        this.connectionCancelled = true;
        
        // Reject pending connection promise if exists
        if (this.connectPromiseReject) {
            this.connectPromiseReject(new Error('Connection cancelled'));
            this.connectPromiseReject = null;
        }
        
        // Stop heartbeat
        this.stopHeartbeat();
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
        
        // Reset connection state
        this.connected = false;
        this.reconnectAttempts = 0;
        this.isInGame = false;
        this.isInLobby = false;
    }

    cleanup() {
        wsDebugLog('🧹 Cleaning up WebSocket connection');
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
