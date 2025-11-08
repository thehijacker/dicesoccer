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
  game_id TEXT PRIMARY KEY,                    -- Same as game_id from active games
  player1_id TEXT NOT NULL,                    -- user_id
  player2_id TEXT NOT NULL,                    -- user_id
  winner_id TEXT,                              -- NULL if draw/abandoned
  score_p1 INTEGER NOT NULL,                   -- Final score player 1
  score_p2 INTEGER NOT NULL,                   -- Final score player 2
  total_moves INTEGER,                         -- Combined moves
  game_duration INTEGER,                       -- Duration in seconds
  started_at INTEGER NOT NULL,                 -- Unix timestamp (milliseconds)
  ended_at INTEGER NOT NULL,                   -- Unix timestamp (milliseconds)
  week_number INTEGER NOT NULL,                -- YYYYWW format (e.g., 202445)
  is_ranked INTEGER DEFAULT 1,                 -- 1=ranked (counts for stats), 0=unranked (guest games)
  game_data TEXT,                              -- JSON: full game log (optional)
  FOREIGN KEY (player1_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_week ON games(week_number, is_ranked);
CREATE INDEX IF NOT EXISTS idx_player1 ON games(player1_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_player2 ON games(player2_id, ended_at);
CREATE INDEX IF NOT EXISTS idx_winner ON games(winner_id, week_number);
CREATE INDEX IF NOT EXISTS idx_ended_at ON games(ended_at);

-- Weekly stats table: pre-aggregated statistics for performance
CREATE TABLE IF NOT EXISTS weekly_stats (
  user_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,                -- YYYYWW format
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,               -- If implementing draws
  total_score_for INTEGER DEFAULT 0,           -- Total points scored
  total_score_against INTEGER DEFAULT 0,       -- Total points conceded
  elo_rating INTEGER DEFAULT 1200,             -- ELO ranking (1200 = default)
  elo_peak INTEGER DEFAULT 1200,               -- Highest ELO this week
  rank_position INTEGER,                       -- Position in leaderboard (updated periodically)
  win_streak INTEGER DEFAULT 0,                -- Current win streak
  best_win_streak INTEGER DEFAULT 0,           -- Best streak this week
  updated_at INTEGER NOT NULL,                 -- Last update timestamp
  PRIMARY KEY (user_id, week_number),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_week_rank ON weekly_stats(week_number, rank_position);
CREATE INDEX IF NOT EXISTS idx_week_elo ON weekly_stats(week_number, elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_weeks ON weekly_stats(user_id, week_number DESC);

-- All-time stats table: lifetime statistics
CREATE TABLE IF NOT EXISTS alltime_stats (
  user_id TEXT PRIMARY KEY,
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_draws INTEGER DEFAULT 0,
  current_elo INTEGER DEFAULT 1200,
  peak_elo INTEGER DEFAULT 1200,
  peak_elo_date INTEGER,                       -- When peak was reached
  total_score_for INTEGER DEFAULT 0,
  total_score_against INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  first_game_at INTEGER,                       -- First game timestamp
  last_game_at INTEGER,                        -- Last game timestamp
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alltime_elo ON alltime_stats(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_alltime_wins ON alltime_stats(total_wins DESC);

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
