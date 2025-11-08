/**
 * Statistics Client for Dice Soccer
 * Handles game recording and stats retrieval
 */

class StatsClient {
    constructor() {
        this.socket = null;
        this.pendingGameData = null;
    }

    /**
     * Initialize stats client with Socket.IO connection
     */
    initialize(socket) {
        this.socket = socket;
        console.log('📊 Stats client initialized');
    }

    /**
     * Record a completed game
     * @param {Object} gameData - Game information
     * @returns {Promise<Object>} Result with ELO changes
     */
    async recordGame(gameData) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }

            this.socket.emit('recordGame', gameData, (response) => {
                if (response.success) {
                    if (response.ranked) {
                        console.log('✅ Ranked game recorded:', response);
                    } else {
                        console.log('📝 Unranked game completed');
                    }
                    resolve(response);
                } else {
                    console.error('❌ Failed to record game:', response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Get player statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Player stats
     */
    async getPlayerStats(userId) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }

            this.socket.emit('getPlayerStats', { userId }, (response) => {
                if (response.success) {
                    resolve(response.stats);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Get weekly leaderboard
     * @param {number} weekNumber - Optional week number (YYYYWW format)
     * @param {number} limit - Maximum number of entries
     * @returns {Promise<Object>} Leaderboard data
     */
    async getWeeklyLeaderboard(weekNumber = null, limit = 50) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }

            this.socket.emit('getWeeklyLeaderboard', { weekNumber, limit }, (response) => {
                if (response.success) {
                    resolve(response.leaderboard);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Get all-time leaderboard
     * @param {number} limit - Maximum number of entries
     * @returns {Promise<Object>} Leaderboard data
     */
    async getAllTimeLeaderboard(limit = 50) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }

            this.socket.emit('getAllTimeLeaderboard', { limit }, (response) => {
                if (response.success) {
                    resolve(response.leaderboard);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Record game from game session data
     * Helper method that extracts needed data from game state
     */
    async recordGameFromSession(gameState, authClient) {
        // Check if both players are authenticated (ranked game)
        const player1 = gameState.player1 || {};
        const player2 = gameState.player2 || {};
        
        // Determine winner
        let winnerId = null;
        if (gameState.score1 > gameState.score2) {
            winnerId = player1.userId;
        } else if (gameState.score2 > gameState.score1) {
            winnerId = player2.userId;
        }
        // If scores are equal, winnerId stays null (draw)

        const gameData = {
            player1UserId: player1.userId || null,
            player2UserId: player2.userId || null,
            player1Username: player1.username || player1.name || 'Player 1',
            player2Username: player2.username || player2.name || 'Player 2',
            player1Score: gameState.score1 || 0,
            player2Score: gameState.score2 || 0,
            winnerId: winnerId,
            gameDurationMs: gameState.gameDuration || 0,
            player1Moves: gameState.player1Moves || 0,
            player2Moves: gameState.player2Moves || 0,
            gameMode: gameState.gameMode || 'multiplayer'
        };

        try {
            const result = await this.recordGame(gameData);
            return result;
        } catch (error) {
            console.error('Failed to record game:', error);
            return null;
        }
    }

    /**
     * Show ELO change notification
     * @param {Object} eloChanges - ELO changes for both players
     * @param {string} currentUserId - Current user's ID
     */
    showEloChange(eloChanges, currentUserId) {
        if (!eloChanges) return;

        const currentPlayerChange = eloChanges.player1?.change;
        const isPlayer1 = currentUserId === eloChanges.player1?.userId;
        const change = isPlayer1 ? eloChanges.player1 : eloChanges.player2;

        if (!change) return;

        const changeText = change.change >= 0 ? `+${change.change}` : change.change;
        const color = change.change >= 0 ? '#4CAF50' : '#f44336';

        // Create floating notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = `ELO ${changeText} → ${change.newElo}`;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Create global stats client instance
window.statsClient = new StatsClient();

// Testing helper - available in console as window.testStats
window.testStats = {
    /**
     * Initialize stats client
     * Usage: testStats.init()
     */
    init() {
        if (window.authClient && window.authClient.socket) {
            window.statsClient.initialize(window.authClient.socket);
            console.log('✅ Stats client initialized');
            return true;
        } else {
            console.error('❌ Auth client not initialized. Run: await testAuth.init()');
            return false;
        }
    },

    /**
     * Record a test game
     * Usage: await testStats.recordGame('player1-id', 'player2-id', 3, 2)
     */
    async recordGame(player1UserId, player2UserId, score1, score2) {
        try {
            const winnerId = score1 > score2 ? player1UserId : (score2 > score1 ? player2UserId : null);
            
            const gameData = {
                player1UserId,
                player2UserId,
                player1Username: 'TestPlayer1',
                player2Username: 'TestPlayer2',
                player1Score: score1,
                player2Score: score2,
                winnerId,
                gameDurationMs: 300000, // 5 minutes
                player1Moves: 15,
                player2Moves: 14,
                gameMode: 'multiplayer'
            };

            console.log('🔄 Recording test game...', gameData);
            const result = await window.statsClient.recordGame(gameData);
            console.log('✅ Game recorded:', result);
            
            if (result.eloChanges) {
                console.log('📊 ELO Changes:');
                console.log(`  Player 1: ${result.eloChanges.player1.oldElo} → ${result.eloChanges.player1.newElo} (${result.eloChanges.player1.change >= 0 ? '+' : ''}${result.eloChanges.player1.change})`);
                console.log(`  Player 2: ${result.eloChanges.player2.oldElo} → ${result.eloChanges.player2.newElo} (${result.eloChanges.player2.change >= 0 ? '+' : ''}${result.eloChanges.player2.change})`);
            }
            
            return result;
        } catch (error) {
            console.error('❌ Failed to record game:', error);
            return null;
        }
    },

    /**
     * Get player stats
     * Usage: await testStats.getStats('user-id')
     */
    async getStats(userId) {
        try {
            console.log('🔄 Getting player stats...');
            const stats = await window.statsClient.getPlayerStats(userId);
            console.log('📊 Player Stats:', stats);
            console.log('\n📈 Weekly Stats:');
            console.log(`  Rank: #${stats.weekly.rank}`);
            console.log(`  ELO: ${stats.weekly.elo_rating}`);
            console.log(`  Games: ${stats.weekly.games_played} (W:${stats.weekly.wins} L:${stats.weekly.losses} D:${stats.weekly.draws})`);
            console.log(`  Goals: ${stats.weekly.goals_scored}-${stats.weekly.goals_conceded}`);
            
            console.log('\n🏆 All-Time Stats:');
            console.log(`  Games: ${stats.allTime.games_played} (W:${stats.allTime.wins} L:${stats.allTime.losses} D:${stats.allTime.draws})`);
            console.log(`  Goals: ${stats.allTime.goals_scored}-${stats.allTime.goals_conceded}`);
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to get stats:', error);
            return null;
        }
    },

    /**
     * Get weekly leaderboard
     * Usage: await testStats.weekly()
     */
    async weekly() {
        try {
            console.log('🔄 Getting weekly leaderboard...');
            const leaderboard = await window.statsClient.getWeeklyLeaderboard();
            console.log(`📊 Weekly Leaderboard (Week ${leaderboard.weekNumber}):`);
            console.table(leaderboard.players.map(p => ({
                Rank: p.rank,
                Username: p.username,
                ELO: p.elo_rating,
                Games: p.games_played,
                'W-L': `${p.wins}-${p.losses}`,
                'Win%': p.win_rate + '%'
            })));
            return leaderboard;
        } catch (error) {
            console.error('❌ Failed to get leaderboard:', error);
            return null;
        }
    },

    /**
     * Get all-time leaderboard
     * Usage: await testStats.allTime()
     */
    async allTime() {
        try {
            console.log('🔄 Getting all-time leaderboard...');
            const leaderboard = await window.statsClient.getAllTimeLeaderboard();
            console.log('🏆 All-Time Leaderboard:');
            console.table(leaderboard.players.map(p => ({
                Rank: p.rank,
                Username: p.username,
                Games: p.games_played,
                Wins: p.wins,
                'W-L': `${p.wins}-${p.losses}`,
                'Win%': p.win_rate + '%',
                'Goal Diff': p.goal_difference
            })));
            return leaderboard;
        } catch (error) {
            console.error('❌ Failed to get leaderboard:', error);
            return null;
        }
    }
};

console.log('📊 Dice Soccer Stats Client loaded');
console.log('💡 Test stats with: testStats.init()');
