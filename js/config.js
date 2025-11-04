// Configuration and Logging Manager for Dice Soccer
class ConfigManager {
    constructor() {
        this.config = null;
        this.loaded = false;
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json');
            if (response.ok) {
                this.config = await response.json();
                this.loaded = true;
                console.log('Configuration loaded:', this.config);
                return true;
            } else {
                console.error('Failed to load config.json');
                this.setDefaultConfig();
                return false;
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.setDefaultConfig();
            return false;
        }
    }

    setDefaultConfig() {
        this.config = {
            'websocket-server': 'wss://localhost:3000',
            'log-enabled': false,
            'debug-mode': false
        };
        this.loaded = true;
    }

    getConfig(key) {
        if (!this.loaded) {
            console.warn('Config not loaded yet');
            return null;
        }
        return this.config[key];
    }

    isLoggingEnabled() {
        return this.loaded && this.config['log-enabled'] === true;
    }

    isDebugMode() {
        return this.loaded && this.config['debug-mode'] === true;
    }

    getWebSocketServerUrl() {
        return this.config['websocket-server'] || 'wss://localhost:3000';
    }

    getLoggerUrl() {
        // Logger always uses PHP for now
        return 'logger.php';
    }
}

// Game Logger for Multiplayer Games
class GameLogger {
    constructor(configManager) {
        this.configManager = configManager;
        this.logId = null;
        this.logFilename = null;
        this.gameStartTime = null;
        this.player1IP = null;
        this.player2IP = null;
    }

    async initialize() {
        if (!this.configManager.isLoggingEnabled()) {
            console.log('Logging is disabled');
            return false;
        }

        // Get IP addresses
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            this.player1IP = ipData.ip;
        } catch (error) {
            console.log('Could not fetch IP address:', error);
            this.player1IP = 'Unknown';
        }

        return true;
    }

    async startGameLog(player1Name, player2Name, player2IP = null, gameMode = 'multiplayer', player2UserAgent = null) {
        if (!this.configManager.isLoggingEnabled()) {
            console.log('Logging not enabled in config');
            return null;
        }

        console.log('GameLogger.startGameLog called:', { player1Name, player2Name, player2IP, gameMode });

        this.gameStartTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
        this.player2IP = player2IP || 'Local';

        const logData = {
            action: 'start',
            player1Name: player1Name,
            player2Name: player2Name,
            player1IP: this.player1IP,
            player2IP: this.player2IP,
            player1UserAgent: navigator.userAgent,
            player2UserAgent: player2UserAgent || navigator.userAgent, // Use same UA for local/AI, or opponent's UA for multiplayer
            startTime: this.gameStartTime,
            gameMode: gameMode
        };

        console.log('Sending log data to:', this.configManager.getLoggerUrl(), logData);

        try {
            const response = await fetch(this.configManager.getLoggerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });

            console.log('Logger response status:', response.status);

            if (response.ok) {
                const responseText = await response.text();
                console.log('Logger response text:', responseText);
                
                try {
                    const result = JSON.parse(responseText);
                    console.log('Logger response:', result);
                    if (result.success) {
                        this.logId = result.logId;
                        this.logFilename = result.logFilename;
                        console.log('Game log started:', this.logFilename);
                        return this.logId;
                    }
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    console.error('Response was:', responseText.substring(0, 500));
                }
            }
        } catch (error) {
            console.error('Failed to start game log:', error);
        }

        return null;
    }

    async logEvent(eventType, eventData) {
        if (!this.configManager.isLoggingEnabled() || !this.logId) {
            return;
        }

        const logData = {
            action: 'event',
            logId: this.logId,
            eventType: eventType,
            eventData: typeof eventData === 'string' ? eventData : JSON.stringify(eventData)
        };

        try {
            await fetch(this.configManager.getLoggerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
        } catch (error) {
            console.error('Failed to log event:', error);
        }
    }

    async endGameLog(winner, player1Score, player2Score, player1Moves, player2Moves, 
                     player1ThinkingTime, player2ThinkingTime, totalGameTime, reason = 'Completed') {
        if (!this.configManager.isLoggingEnabled() || !this.logId) {
            return;
        }

        const endTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // Format thinking times
        const formatTime = (ms) => {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else if (minutes > 0) {
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                return `${seconds}s`;
            }
        };

        const logData = {
            action: 'end',
            logId: this.logId,
            endTime: endTime,
            winner: winner,
            player1Score: player1Score,
            player2Score: player2Score,
            player1Moves: player1Moves,
            player2Moves: player2Moves,
            player1ThinkingTime: formatTime(player1ThinkingTime),
            player2ThinkingTime: formatTime(player2ThinkingTime),
            totalGameTime: formatTime(totalGameTime),
            reason: reason
        };

        try {
            const response = await fetch(this.configManager.getLoggerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('Game log completed:', this.logFilename);
                }
            }
        } catch (error) {
            console.error('Failed to end game log:', error);
        }

        // Reset logger state
        this.logId = null;
        this.logFilename = null;
    }
}

// Global instances
window.configManager = new ConfigManager();
window.gameLogger = new GameLogger(window.configManager);

