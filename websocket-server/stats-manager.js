/**
 * Statistics Manager for Dice Soccer
 * Handles game recording, ELO rating calculation, and leaderboard management
 */

const crypto = require('crypto');

class StatsManager {
    constructor(dbManager) {
        this.db = dbManager;
        
        // ELO rating constants
        this.K_FACTOR = 32; // How much ratings change per game
        this.INITIAL_ELO = 1200; // Starting ELO for new players
    }

    /**
     * Get current week number in YYYYWW format
     */
    getCurrentWeek() {
        const now = new Date();
        const year = now.getFullYear();
        
        // Calculate week number (ISO 8601)
        const startOfYear = new Date(year, 0, 1);
        const dayOfYear = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
        
        return year * 100 + weekNumber;
    }

    /**
     * Calculate expected score for ELO rating
     */
    calculateExpectedScore(ratingA, ratingB) {
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    /**
     * Calculate new ELO ratings after a game
     * @returns {Object} { winner: newWinnerElo, loser: newLoserElo }
     */
    calculateNewRatings(winnerElo, loserElo) {
        const expectedWinner = this.calculateExpectedScore(winnerElo, loserElo);
        const expectedLoser = this.calculateExpectedScore(loserElo, winnerElo);
        
        const newWinnerElo = Math.round(winnerElo + this.K_FACTOR * (1 - expectedWinner));
        const newLoserElo = Math.round(loserElo + this.K_FACTOR * (0 - expectedLoser));
        
        return {
            winner: newWinnerElo,
            loser: newLoserElo,
            winnerGain: newWinnerElo - winnerElo,
            loserLoss: newLoserElo - loserElo
        };
    }

    /**
     * Record a completed game
     * @param {Object} gameData - Game information
     * @returns {Object} Result with success status and ELO changes
     */
    async recordGame(gameData) {
        let {
            player1UserId,
            player2UserId,
            player1Username,
            player2Username,
            player1Score,
            player2Score,
            winnerId,
            gameDurationMs,
            player1Moves = 0,
            player2Moves = 0,
            gameMode = 'multiplayer'
        } = gameData;

        try {
            // If userIds not provided, look them up by username (for testing)
            if (!player1UserId && player1Username) {
                const user = this.db.getUserByUsername(player1Username);
                if (user) {
                    player1UserId = user.user_id;
                } else {
                    return {
                        success: false,
                        error: `User not found: ${player1Username}`
                    };
                }
            }
            
            if (!player2UserId && player2Username) {
                const user = this.db.getUserByUsername(player2Username);
                if (user) {
                    player2UserId = user.user_id;
                } else {
                    return {
                        success: false,
                        error: `User not found: ${player2Username}`
                    };
                }
            }
            
            // Determine winner if not provided
            if (!winnerId && player1Score !== player2Score) {
                winnerId = player1Score > player2Score ? player1UserId : player2UserId;
            }
            
            // Don't record games with guest users (unranked)
            if (!player1UserId || !player2UserId || 
                player1UserId.startsWith('guest_') || player2UserId.startsWith('guest_')) {
                console.log('⚠️ Game not recorded: Guest users or local games are unranked');
                return {
                    success: true,
                    ranked: false,
                    message: 'Game completed (unranked)'
                };
            }

            const weekNumber = this.getCurrentWeek();
            const gameId = crypto.randomUUID();
            const completedAt = Date.now();

            // Get current ELO ratings (or create initial stats)
            const player1Stats = await this.getOrCreateWeeklyStats(player1UserId, player1Username, weekNumber);
            const player2Stats = await this.getOrCreateWeeklyStats(player2UserId, player2Username, weekNumber);

            // Calculate new ELO ratings
            let eloChanges = null;
            let newPlayer1Elo = player1Stats.elo_rating;
            let newPlayer2Elo = player2Stats.elo_rating;

            if (winnerId) {
                const isPlayer1Winner = winnerId === player1UserId;
                const winnerElo = isPlayer1Winner ? player1Stats.elo_rating : player2Stats.elo_rating;
                const loserElo = isPlayer1Winner ? player2Stats.elo_rating : player1Stats.elo_rating;

                eloChanges = this.calculateNewRatings(winnerElo, loserElo);
                
                if (isPlayer1Winner) {
                    newPlayer1Elo = eloChanges.winner;
                    newPlayer2Elo = eloChanges.loser;
                } else {
                    newPlayer1Elo = eloChanges.loser;
                    newPlayer2Elo = eloChanges.winner;
                }
            }

            // Record game in database
            const insertGame = this.db.db.prepare(`
                INSERT INTO games (
                    game_id, week_number, player1_user_id, player2_user_id,
                    player1_username, player2_username, player1_score, player2_score,
                    winner_user_id, game_duration_ms, player1_moves, player2_moves,
                    game_mode, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertGame.run(
                gameId,
                weekNumber,
                player1UserId,
                player2UserId,
                player1Username,
                player2Username,
                player1Score,
                player2Score,
                winnerId || null,
                gameDurationMs,
                player1Moves,
                player2Moves,
                gameMode,
                completedAt
            );

            // Update weekly stats
            await this.updateWeeklyStats(player1UserId, weekNumber, {
                gamesPlayed: 1,
                wins: winnerId === player1UserId ? 1 : 0,
                losses: winnerId === player2UserId ? 1 : 0,
                goalsScored: player1Score,
                goalsConceded: player2Score,
                newElo: newPlayer1Elo
            });

            await this.updateWeeklyStats(player2UserId, weekNumber, {
                gamesPlayed: 1,
                wins: winnerId === player2UserId ? 1 : 0,
                losses: winnerId === player1UserId ? 1 : 0,
                goalsScored: player2Score,
                goalsConceded: player1Score,
                newElo: newPlayer2Elo
            });

            // Update all-time stats
            await this.updateAllTimeStats(player1UserId, player1Username, {
                gamesPlayed: 1,
                wins: winnerId === player1UserId ? 1 : 0,
                losses: winnerId === player2UserId ? 1 : 0,
                goalsScored: player1Score,
                goalsConceded: player2Score
            });

            await this.updateAllTimeStats(player2UserId, player2Username, {
                gamesPlayed: 1,
                wins: winnerId === player2UserId ? 1 : 0,
                losses: winnerId === player1UserId ? 1 : 0,
                goalsScored: player2Score,
                goalsConceded: player1Score
            });

            console.log(`✅ Game recorded: ${player1Username} ${player1Score}-${player2Score} ${player2Username}`);
            if (eloChanges) {
                console.log(`   ELO changes: ${player1Username} ${eloChanges.winnerGain > 0 ? '+' : ''}${winnerId === player1UserId ? eloChanges.winnerGain : eloChanges.loserLoss} (${newPlayer1Elo}), ${player2Username} ${eloChanges.winnerGain > 0 ? '+' : ''}${winnerId === player2UserId ? eloChanges.winnerGain : eloChanges.loserLoss} (${newPlayer2Elo})`);
            }

            return {
                success: true,
                ranked: true,
                gameId,
                eloChanges: eloChanges ? {
                    player1: {
                        oldElo: player1Stats.elo_rating,
                        newElo: newPlayer1Elo,
                        change: newPlayer1Elo - player1Stats.elo_rating
                    },
                    player2: {
                        oldElo: player2Stats.elo_rating,
                        newElo: newPlayer2Elo,
                        change: newPlayer2Elo - player2Stats.elo_rating
                    }
                } : null
            };

        } catch (error) {
            console.error('❌ Failed to record game:', error);
            return {
                success: false,
                error: 'Failed to record game: ' + error.message
            };
        }
    }

    /**
     * Get or create weekly stats for a player
     */
    async getOrCreateWeeklyStats(userId, username, weekNumber) {
        const getStats = this.db.db.prepare(`
            SELECT * FROM weekly_stats 
            WHERE user_id = ? AND week_number = ?
        `);

        let stats = getStats.get(userId, weekNumber);

        if (!stats) {
            // Create initial weekly stats
            const insertStats = this.db.db.prepare(`
                INSERT INTO weekly_stats (
                    user_id, username, week_number, elo_rating
                ) VALUES (?, ?, ?, ?)
            `);

            insertStats.run(userId, username, weekNumber, this.INITIAL_ELO);
            stats = getStats.get(userId, weekNumber);
        }

        return stats;
    }

    /**
     * Update weekly stats after a game
     */
    async updateWeeklyStats(userId, weekNumber, updates) {
        const updateStats = this.db.db.prepare(`
            UPDATE weekly_stats
            SET games_played = games_played + ?,
                wins = wins + ?,
                losses = losses + ?,
                goals_scored = goals_scored + ?,
                goals_conceded = goals_conceded + ?,
                elo_rating = ?,
                last_game_at = ?
            WHERE user_id = ? AND week_number = ?
        `);

        updateStats.run(
            updates.gamesPlayed,
            updates.wins,
            updates.losses,
            updates.goalsScored,
            updates.goalsConceded,
            updates.newElo,
            Date.now(),
            userId,
            weekNumber
        );
    }

    /**
     * Update all-time stats
     */
    async updateAllTimeStats(userId, username, updates) {
        // Check if stats exist
        const getStats = this.db.db.prepare(`
            SELECT * FROM alltime_stats WHERE user_id = ?
        `);

        const stats = getStats.get(userId);

        if (!stats) {
            // Create initial all-time stats
            const insertStats = this.db.db.prepare(`
                INSERT INTO alltime_stats (
                    user_id, username, games_played, wins, losses,
                    goals_scored, goals_conceded, last_game_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            insertStats.run(
                userId,
                username,
                updates.gamesPlayed,
                updates.wins,
                updates.losses,
                updates.goalsScored,
                updates.goalsConceded,
                Date.now()
            );
        } else {
            // Update existing stats
            const updateStats = this.db.db.prepare(`
                UPDATE alltime_stats
                SET games_played = games_played + ?,
                    wins = wins + ?,
                    losses = losses + ?,
                    goals_scored = goals_scored + ?,
                    goals_conceded = goals_conceded + ?,
                    last_game_at = ?
                WHERE user_id = ?
            `);

            updateStats.run(
                updates.gamesPlayed,
                updates.wins,
                updates.losses,
                updates.goalsScored,
                updates.goalsConceded,
                Date.now(),
                userId
            );
        }
    }

    /**
     * Get weekly leaderboard
     */
    async getWeeklyLeaderboard(weekNumber = null, limit = 50) {
        const week = weekNumber || this.getCurrentWeek();

        const getLeaderboard = this.db.db.prepare(`
            SELECT 
                user_id,
                username,
                elo_rating,
                games_played,
                wins,
                losses,
                goals_scored,
                goals_conceded,
                (goals_scored - goals_conceded) as goal_difference,
                ROUND(CAST(wins AS FLOAT) / CAST(games_played AS FLOAT) * 100, 1) as win_rate
            FROM weekly_stats
            WHERE week_number = ?
            ORDER BY elo_rating DESC, wins DESC, goal_difference DESC
            LIMIT ?
        `);

        const leaderboard = getLeaderboard.all(week, limit);

        return {
            weekNumber: week,
            players: leaderboard.map((player, index) => ({
                rank: index + 1,
                ...player
            }))
        };
    }

    /**
     * Get all-time leaderboard
     */
    async getAllTimeLeaderboard(limit = 50) {
        const getLeaderboard = this.db.db.prepare(`
            SELECT 
                user_id,
                username,
                games_played,
                wins,
                losses,
                goals_scored,
                goals_conceded,
                (goals_scored - goals_conceded) as goal_difference,
                ROUND(CAST(wins AS FLOAT) / CAST(games_played AS FLOAT) * 100, 1) as win_rate
            FROM alltime_stats
            WHERE games_played > 0
            ORDER BY wins DESC, goal_difference DESC, games_played DESC
            LIMIT ?
        `);

        const leaderboard = getLeaderboard.all(limit);

        return {
            players: leaderboard.map((player, index) => ({
                rank: index + 1,
                ...player
            }))
        };
    }

    /**
     * Get player's stats
     */
    async getPlayerStats(userId) {
        // Get current week stats
        const weekNumber = this.getCurrentWeek();
        const weeklyStats = await this.getOrCreateWeeklyStats(userId, null, weekNumber);

        // Get all-time stats
        const getAllTimeStats = this.db.db.prepare(`
            SELECT * FROM alltime_stats WHERE user_id = ?
        `);
        const allTimeStats = getAllTimeStats.get(userId);

        // Get recent games
        const getRecentGames = this.db.db.prepare(`
            SELECT * FROM games
            WHERE player1_user_id = ? OR player2_user_id = ?
            ORDER BY completed_at DESC
            LIMIT 10
        `);
        const recentGames = getRecentGames.all(userId, userId);

        // Get weekly rank
        const getRank = this.db.db.prepare(`
            SELECT COUNT(*) as rank
            FROM weekly_stats
            WHERE week_number = ? AND elo_rating > ?
        `);
        const rankResult = getRank.get(weekNumber, weeklyStats.elo_rating);
        const weeklyRank = rankResult.rank + 1;

        return {
            weekly: {
                ...weeklyStats,
                rank: weeklyRank
            },
            allTime: allTimeStats || {
                games_played: 0,
                wins: 0,
                losses: 0,
                goals_scored: 0,
                goals_conceded: 0
            },
            recentGames: recentGames.map(game => ({
                ...game,
                isPlayer1: game.player1_user_id === userId,
                opponentName: game.player1_user_id === userId ? game.player2_username : game.player1_username,
                playerScore: game.player1_user_id === userId ? game.player1_score : game.player2_score,
                opponentScore: game.player1_user_id === userId ? game.player2_score : game.player1_score,
                result: game.winner_user_id === userId ? 'win' : 'loss'
            }))
        };
    }

    /**
     * Clean up old weekly stats (keep last 10 weeks)
     */
    async cleanupOldWeeklyStats() {
        const currentWeek = this.getCurrentWeek();
        const tenWeeksAgo = currentWeek - 10; // Simplified, should handle year boundaries properly

        const deleteOld = this.db.db.prepare(`
            DELETE FROM weekly_stats WHERE week_number < ?
        `);

        const result = deleteOld.run(tenWeeksAgo);
        
        if (result.changes > 0) {
            console.log(`🧹 Cleaned up ${result.changes} old weekly stat records`);
        }
    }
}

module.exports = StatsManager;
