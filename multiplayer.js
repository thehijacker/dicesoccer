// Multiplayer functionality using PHP long-polling
class MultiplayerManager {
    constructor() {
        this.serverUrl = 'multiplayer-server.php';
        this.playerId = null;
        this.gameId = null;
        this.role = null; // 'host' or 'guest'
        this.isHost = false; // true if this player is the host
        this.localPlayer = 1; // Which player number is controlled locally (1 or 2)
        this.opponentInfo = null;
        this.isHosting = false;
        this.isInGame = false;
        this.lastEventId = 0;
        this.pollingActive = false;
        this.heartbeatInterval = null;
        this.onEvent = null; // Callback for game events
    }

    // Initialize player ID
    init() {
        // Generate or retrieve player ID
        this.playerId = localStorage.getItem('dicesoccer_mp_playerid');
        if (!this.playerId) {
            this.playerId = this.generateId();
            localStorage.setItem('dicesoccer_mp_playerid', this.playerId);
        }
    }

    // Host a new game
    async hostGame(playerName) {
        try {
            console.log(`Hosting game as ${playerName}`);
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'host',
                    playerId: this.playerId,
                    playerName: playerName
                })
            });

            const result = await response.json();
            console.log('Host result:', result);
            
            if (result.success) {
                this.isHosting = true;
                this.role = 'host';
                this.isHost = true;
                this.localPlayer = 1;
                this.lastEventId = 0; // Reset event ID for new game session
                console.log('Successfully hosting, player ID:', this.playerId);
                this.startHeartbeat();
                return { success: true, playerId: this.playerId };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to host game:', error);
            return { success: false, error: error.message };
        }
    }

    // Get list of available hosts
    async getAvailableHosts() {
        try {
            const response = await fetch(`${this.serverUrl}?action=getHosts`);
            const result = await response.json();
            
            if (result.success) {
                return result.data.hosts;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to get hosts:', error);
            return [];
        }
    }

    // Join a hosted game
    async joinGame(hostId, playerName) {
        try {
            console.log(`Joining game hosted by ${hostId} as ${playerName}`);
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'join',
                    hostId: hostId,
                    playerId: this.playerId,
                    playerName: playerName
                })
            });

            const result = await response.json();
            console.log('Join result:', result);
            
            if (result.success) {
                // Use the playerId returned by server (important for rejoining with cleaned session)
                this.playerId = result.data.playerId;
                this.gameId = result.data.gameId;
                this.lastEventId = 0; // Reset event ID for new game session
                this.role = 'guest';
                this.isHost = false;
                this.localPlayer = 2;
                this.opponentInfo = result.data.opponent;
                this.isInGame = true;
                console.log(`Successfully joined game ${this.gameId} with playerId ${this.playerId}, starting polling...`);
                this.startPolling();
                this.startHeartbeat();
                return { success: true, gameId: this.gameId, playerId: this.playerId, opponent: result.data.opponent };
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to join game:', error);
            return { success: false, error: error.message };
        }
    }

    // Cancel hosting
    async cancelHost() {
        try {
            await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'cancelHost',
                    playerId: this.playerId
                })
            });
            
            this.isHosting = false;
            this.stopHeartbeat();
            return { success: true };
        } catch (error) {
            console.error('Failed to cancel hosting:', error);
            return { success: false, error: error.message };
        }
    }

    // Send game event to opponent
    async sendEvent(event) {
        if (!this.gameId) {
            console.error('No active game, cannot send event');
            return false;
        }

        try {
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendEvent',
                    gameId: this.gameId,
                    playerId: this.playerId,
                    event: event
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                return true;
            } else {
                console.error('Server rejected event:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Failed to send event:', error);
            return false;
        }
    }

    // Start polling for events (long-polling)
    startPolling() {
        if (this.pollingActive) return;
        
        this.pollingActive = true;
        this.poll();
    }

    // Long-polling loop
    async poll() {
        // For hosts waiting for a game, use 'waiting' as gameId
        const pollGameId = this.gameId || (this.isHosting ? 'waiting' : null);
        
        if (!this.pollingActive || !pollGameId) {
            return;
        }

        try {                        
            const response = await fetch(
                `${this.serverUrl}?action=pollEvents&gameId=${pollGameId}&playerId=${this.playerId}&lastEventId=${this.lastEventId}`,
                { timeout: 35000 } // Slightly longer than server timeout
            );

            const result = await response.json();
            
            if (result.success && result.data.events && result.data.events.length > 0) {
                for (const event of result.data.events) {
                    this.handleEvent(event);
                    this.lastEventId = event.eventId;
                }
            }
        } catch (error) {
            console.error('❌ Polling error:', error);
        }

        // Continue polling
        if (this.pollingActive) {
            setTimeout(() => this.poll(), 100); // Brief pause before next poll
        }
    }

    // Stop polling
    stopPolling() {
        this.pollingActive = false;
    }

    // Handle incoming event
    handleEvent(event) {
        if (event.type === 'gameStart') {
            console.log(`🎮 Game started! Updating gameId from ${this.gameId} to ${event.gameId}`);
            this.gameId = event.gameId;
            this.lastEventId = 0; // Reset event ID for new game session
            this.opponentInfo = event.opponent;
            this.isInGame = true;
            // Keep isHosting as true if we're the host, false if we're the guest
            // Don't change it here - it's set correctly in hostGame() and joinGame()
            console.log(`✅ Now polling with actual gameId: ${this.gameId}`);
        }

        // Call the registered event handler
        if (this.onEvent) {
            this.onEvent(event);
        }
    }

    // Leave current game
    async leaveGame() {
        if (!this.gameId) return;

        try {
            await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'leaveGame',
                    gameId: this.gameId,
                    playerId: this.playerId
                })
            });
        } catch (error) {
            console.error('Failed to leave game:', error);
        }

        this.cleanup();
    }

    // Heartbeat to keep session alive
    startHeartbeat() {
        if (this.heartbeatInterval) return;
        
        // Send first heartbeat immediately
        this.sendHeartbeat();
        
        // Then send every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // Every 30 seconds
    }
    
    async sendHeartbeat() {
        try {
            const response = await fetch(this.serverUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'heartbeat',
                    playerId: this.playerId
                })
            });
            
            if (!response.ok) {
                console.warn('Heartbeat failed with status:', response.status);
            }
        } catch (error) {
            // Silently fail - heartbeat is not critical
            // Just log to console for debugging
            console.debug('Heartbeat error (non-critical):', error.message);
        }
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Cleanup
    cleanup() {
        console.log(`🧹 Cleaning up multiplayer session - was ${this.role}, gameId: ${this.gameId}`);
        this.stopPolling();
        this.stopHeartbeat();
        this.gameId = null;
        this.role = null;
        this.isHost = false;
        this.localPlayer = 1;
        this.opponentInfo = null;
        this.isHosting = false;
        this.isInGame = false;
        this.lastEventId = 0;
        console.log('✅ Cleanup complete - ready for new session');
    }

    // Generate unique ID
    generateId() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

// Create global multiplayer manager instance
const multiplayerManager = new MultiplayerManager();
