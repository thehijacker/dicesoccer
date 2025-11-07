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
                debugLog('Configuration loaded:', this.config);
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
            'websocket-server': 'wss://localhost:7860',
            'log-enabled': false,
            'log-script': 'logger.php',
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
        return this.config['websocket-server'] || 'wss://localhost:7860';
    }

    getLoggerUrl() {
        // Return configured log script URL (can be local file or external URL)
        return this.config['log-script'] || 'logger.php';
    }

    async validateLogScript() {
        // Test if the log script is accessible and working
        const loggerUrl = this.getLoggerUrl();
        
        try {
            // Send a test request to check if logger is available
            const response = await fetch(loggerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'test'
                })
            });
            
            // Check if we got any response (even error response means script exists)
            if (response.ok || response.status === 400) {
                debugLog(`✅ Log script validated: ${loggerUrl}`);
                return true;
            } else {
                debugLog(`⚠️ Log script not accessible: ${loggerUrl} (Status: ${response.status})`);
                return false;
            }
        } catch (error) {
            console.error(`⚠️ Log script validation failed: ${loggerUrl}`, error.message);
            return false;
        }
    }
}

// Game Logger for Multiplayer Games
class GameLogger {
    constructor(configManager) {
        this.configManager = configManager;
        this.logId = null;
        this.logFilename = null;
        this.gameStartTime = null;
    }

    async initialize() {
        if (!this.configManager.isLoggingEnabled()) {
            debugLog('Logging is disabled in config');
            return false;
        }

        // Validate log script is accessible and working
        const isLogScriptValid = await this.configManager.validateLogScript();
        if (!isLogScriptValid) {
            console.warn('⚠️ Logging disabled: log script is not accessible or not working');
            // Silently disable logging by updating config
            this.configManager.config['log-enabled'] = false;
            return false;
        }

        return true;
    }

    async startGameLog(player1Name, player2Name, gameMode = 'multiplayer', player2UserAgent = null, player2Resolution = null) {
        if (!this.configManager.isLoggingEnabled()) {
            debugLog('Logging not enabled in config');
            return null;
        }

        debugLog('GameLogger.startGameLog called:', { player1Name, player2Name, gameMode });

        this.gameStartTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

        const currentResolution = `${window.innerWidth}x${window.innerHeight}`;

        const logData = {
            action: 'start',
            player1Name: player1Name,
            player2Name: player2Name,
            player1UserAgent: navigator.userAgent,
            player2UserAgent: player2UserAgent || navigator.userAgent, // Use same UA for local/AI, or opponent's UA for multiplayer
            player1Resolution: currentResolution,
            player2Resolution: player2Resolution || currentResolution, // Use opponent's resolution for multiplayer, or same for local/AI
            startTime: this.gameStartTime,
            gameMode: gameMode
        };

        debugLog('Sending log data to:', this.configManager.getLoggerUrl(), logData);

        try {
            const response = await fetch(this.configManager.getLoggerUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });

            debugLog('Logger response status:', response.status);

            if (response.ok) {
                const responseText = await response.text();
                debugLog('Logger response text:', responseText);
                
                try {
                    const result = JSON.parse(responseText);
                    debugLog('Logger response:', result);
                    if (result.success) {
                        this.logId = result.logId;
                        this.logFilename = result.logFilename;
                        debugLog('Game log started:', this.logFilename);
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
                    debugLog('Game log completed:', this.logFilename);
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
