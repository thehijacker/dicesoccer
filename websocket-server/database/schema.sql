-- Dice Soccer Database Schema
-- Version: 1.0.0

-- Users table: stores registered users and guest users
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,                    -- UUID v4
  username TEXT UNIQUE NOT NULL,               -- 3-20 chars, alphanumeric + underscore
  password_hash TEXT,                          -- bcrypt hash (NULL for guest users)
  email TEXT UNIQUE,                           -- Optional, for password recovery
  created_at INTEGER NOT NULL,                 -- Unix timestamp (milliseconds)
  last_login INTEGER,                          -- Unix timestamp (milliseconds)
  is_guest INTEGER DEFAULT 0,                  -- 0=registered, 1=guest
  failed_attempts INTEGER DEFAULT 0,           -- Failed login counter
  locked_until INTEGER DEFAULT 0,              -- Account lockout timestamp
  profile_data TEXT DEFAULT '{}',              -- JSON: { avatar, bio, preferences }
  is_active INTEGER DEFAULT 1,                 -- Account status (0=disabled, 1=active)
  email_verified INTEGER DEFAULT 0             -- Email verification status
);

CREATE INDEX IF NOT EXISTS idx_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_is_guest ON users(is_guest);
CREATE INDEX IF NOT EXISTS idx_last_login ON users(last_login);

-- Games table: stores completed games for statistics
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  week_number INTEGER NOT NULL,                -- YYYYWW format (e.g., 202445)
  player1_user_id TEXT NOT NULL,
  player2_user_id TEXT NOT NULL,
  player1_username TEXT NOT NULL,
  player2_username TEXT NOT NULL,
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  winner_user_id TEXT,                         -- NULL if draw
  game_duration_ms INTEGER,                    -- Duration in milliseconds
  player1_moves INTEGER DEFAULT 0,
  player2_moves INTEGER DEFAULT 0,
  game_mode TEXT DEFAULT 'multiplayer',        -- 'multiplayer', 'local', 'ai'
  completed_at INTEGER NOT NULL,               -- Unix timestamp (milliseconds)
  FOREIGN KEY (player1_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (player2_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (winner_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_week ON games(week_number);
CREATE INDEX IF NOT EXISTS idx_player1 ON games(player1_user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_player2 ON games(player2_user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_winner ON games(winner_user_id, week_number);
CREATE INDEX IF NOT EXISTS idx_completed ON games(completed_at);

-- Weekly stats table: pre-aggregated statistics for performance
CREATE TABLE IF NOT EXISTS weekly_stats (
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,                      -- Cached username for leaderboards
  week_number INTEGER NOT NULL,                -- YYYYWW format
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1200,             -- ELO ranking (1200 = default)
  last_game_at INTEGER,                        -- Last game timestamp
  PRIMARY KEY (user_id, week_number),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_week_rank ON weekly_stats(week_number, elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_weeks ON weekly_stats(user_id, week_number DESC);

-- All-time stats table: lifetime statistics
CREATE TABLE IF NOT EXISTS alltime_stats (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,                      -- Cached username
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  goals_scored INTEGER DEFAULT 0,
  goals_conceded INTEGER DEFAULT 0,
  last_game_at INTEGER,                        -- Last game timestamp
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Achievements table: available achievements
CREATE TABLE IF NOT EXISTS achievements (
  achievement_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,                                   -- Icon identifier or emoji
  category TEXT,                               -- e.g., 'wins', 'streaks', 'special'
  criteria TEXT NOT NULL,                      -- JSON: unlock conditions
  points INTEGER DEFAULT 0,                    -- Achievement points
  rarity TEXT DEFAULT 'common',                -- common, rare, epic, legendary
  created_at INTEGER NOT NULL
);

-- User achievements: unlocked achievements per user
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  progress TEXT DEFAULT '{}',                  -- JSON: progress tracking
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_achievements ON user_achievements(user_id, unlocked_at DESC);

-- Session tokens: for token management and revocation
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,                    -- Hashed refresh token
  expires_at INTEGER NOT NULL,                 -- Expiration timestamp
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  user_agent TEXT,                             -- Browser/device info
  ip_address TEXT,                             -- For security monitoring
  is_revoked INTEGER DEFAULT 0,                -- Manual revocation flag
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_token_user ON refresh_tokens(user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_token_expires ON refresh_tokens(expires_at);

-- Database version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT
);

-- Insert initial version
INSERT OR IGNORE INTO schema_version (version, applied_at, description)
VALUES ('1.0.0', strftime('%s', 'now') * 1000, 'Initial schema with users, games, stats, achievements, and tokens');
