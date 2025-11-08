/**
 * Database Manager for Dice Soccer
 * Handles SQLite database initialization, migrations, and queries
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = path.join(__dirname, 'dicesoccer.db')) {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Initialize database connection and create tables
     */
    initialize() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath, { verbose: console.log });
            
            // Enable WAL mode for better concurrency
            this.db.pragma('journal_mode = WAL');
            
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');

            console.log(`✅ Database connected: ${this.dbPath}`);

            // Run schema initialization
            this.runSchema();

            // Create prepared statements for common queries
            this.prepareStatements();

            return true;
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Run schema.sql to create tables
     */
    runSchema() {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Execute schema (SQLite allows multiple statements)
            this.db.exec(schema);
            
            console.log('✅ Database schema initialized');
        } catch (error) {
            console.error('❌ Schema initialization error:', error);
            throw error;
        }
    }

    /**
     * Prepare frequently used SQL statements for better performance
     */
    prepareStatements() {
        this.statements = {
            // User queries
            getUserById: this.db.prepare('SELECT * FROM users WHERE user_id = ?'),
            getUserByUsername: this.db.prepare('SELECT * FROM users WHERE username = ?'),
            getUserByEmail: this.db.prepare('SELECT * FROM users WHERE email = ?'),
            createUser: this.db.prepare(`
                INSERT INTO users (user_id, username, password_hash, email, created_at, is_guest)
                VALUES (?, ?, ?, ?, ?, ?)
            `),
            updateLastLogin: this.db.prepare('UPDATE users SET last_login = ? WHERE user_id = ?'),
            updateFailedAttempts: this.db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE user_id = ?'),
            resetFailedAttempts: this.db.prepare('UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE user_id = ?'),
            
            // Token queries
            saveRefreshToken: this.db.prepare(`
                INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, created_at, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `),
            getRefreshToken: this.db.prepare('SELECT * FROM refresh_tokens WHERE token_id = ? AND is_revoked = 0'),
            revokeToken: this.db.prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE token_id = ?'),
            revokeUserTokens: this.db.prepare('UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?'),
            cleanExpiredTokens: this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?'),
            
            // Game queries
            saveGame: this.db.prepare(`
                INSERT INTO games (game_id, player1_id, player2_id, winner_id, score_p1, score_p2, 
                                   total_moves, game_duration, started_at, ended_at, week_number, is_ranked, game_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            getGameById: this.db.prepare('SELECT * FROM games WHERE game_id = ?'),
            getUserGames: this.db.prepare(`
                SELECT * FROM games 
                WHERE (player1_id = ? OR player2_id = ?) AND is_ranked = 1
                ORDER BY ended_at DESC 
                LIMIT ?
            `),
            
            // Stats queries
            getWeeklyStats: this.db.prepare('SELECT * FROM weekly_stats WHERE user_id = ? AND week_number = ?'),
            upsertWeeklyStats: this.db.prepare(`
                INSERT INTO weekly_stats (user_id, week_number, games_played, games_won, games_lost, 
                                          total_score_for, total_score_against, elo_rating, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, week_number) DO UPDATE SET
                    games_played = games_played + excluded.games_played,
                    games_won = games_won + excluded.games_won,
                    games_lost = games_lost + excluded.games_lost,
                    total_score_for = total_score_for + excluded.total_score_for,
                    total_score_against = total_score_against + excluded.total_score_against,
                    elo_rating = excluded.elo_rating,
                    updated_at = excluded.updated_at
            `),
            getWeeklyLeaderboard: this.db.prepare(`
                SELECT ws.*, u.username, u.profile_data
                FROM weekly_stats ws
                JOIN users u ON ws.user_id = u.user_id
                WHERE ws.week_number = ? AND u.is_guest = 0 AND ws.games_played >= ?
                ORDER BY ws.elo_rating DESC
                LIMIT ?
            `),
            
            getAllTimeStats: this.db.prepare('SELECT * FROM alltime_stats WHERE user_id = ?'),
            upsertAllTimeStats: this.db.prepare(`
                INSERT INTO alltime_stats (user_id, total_games, total_wins, total_losses, 
                                           total_score_for, total_score_against, current_elo, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    total_games = total_games + excluded.total_games,
                    total_wins = total_wins + excluded.total_wins,
                    total_losses = total_losses + excluded.total_losses,
                    total_score_for = total_score_for + excluded.total_score_for,
                    total_score_against = total_score_against + excluded.total_score_against,
                    current_elo = excluded.current_elo,
                    last_game_at = excluded.updated_at,
                    updated_at = excluded.updated_at
            `)
        };

        console.log('✅ Prepared statements ready');
    }

    /**
     * Execute a transaction safely
     */
    transaction(callback) {
        const transaction = this.db.transaction(callback);
        return transaction;
    }

    /**
     * Backup database to a file
     */
    async backup(backupPath) {
        try {
            await this.db.backup(backupPath);
            console.log(`✅ Database backed up to: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Backup error:', error);
            return false;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('✅ Database connection closed');
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        const stats = {
            userCount: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_guest = 0').get().count,
            guestCount: this.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_guest = 1').get().count,
            totalGames: this.db.prepare('SELECT COUNT(*) as count FROM games').get().count,
            rankedGames: this.db.prepare('SELECT COUNT(*) as count FROM games WHERE is_ranked = 1').get().count,
            dbSize: fs.statSync(this.dbPath).size
        };
        return stats;
    }
}

// Export singleton instance
module.exports = new DatabaseManager();
