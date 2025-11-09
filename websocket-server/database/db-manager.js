/**
 * Database Manager for Dice Soccer
 * Handles SQLite database initialization, migrations, and queries
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class DatabaseManager {
    constructor(dbPath = null) {
        // Use DB_PATH environment variable if set, otherwise default to ./database/dicesoccer.db
        this.dbPath = dbPath || process.env.DB_PATH || path.join(__dirname, 'dicesoccer.db');
        this.db = null;
    }

    /**
     * Initialize database connection and create tables
     */
    initialize() {
        try {
            console.log(`📂 Database path: ${this.dbPath}`);
            
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            console.log(`📂 Checking directory: ${dbDir}`);
            
            if (!fs.existsSync(dbDir)) {
                console.log(`📁 Creating directory: ${dbDir}`);
                try {
                    fs.mkdirSync(dbDir, { recursive: true, mode: 0o755 });
                    console.log(`✅ Directory created: ${dbDir}`);
                } catch (mkdirError) {
                    console.error(`❌ Failed to create directory: ${mkdirError.message}`);
                    throw mkdirError;
                }
            } else {
                console.log(`✅ Directory exists: ${dbDir}`);
                
                // Check if directory is writable
                try {
                    fs.accessSync(dbDir, fs.constants.W_OK);
                    console.log(`✅ Directory is writable`);
                } catch (accessError) {
                    console.error(`❌ Directory is not writable: ${accessError.message}`);
                    throw new Error(`Database directory is not writable: ${dbDir}`);
                }
            }

            // Open database connection
            console.log(`🔌 Opening database connection...`);
            this.db = new Database(this.dbPath);
            
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
            getUserByUsernameInsensitive: this.db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)'),
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
            cleanExpiredTokens: this.db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?')
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

    /**
     * Get user by username
     */
    getUserByUsername(username) {
        try {
            return this.statements.getUserByUsername.get(username);
        } catch (error) {
            console.error('Error getting user by username:', error);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new DatabaseManager();
