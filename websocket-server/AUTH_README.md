# Dice Soccer - Authentication System Implementation

## 🎯 Overview

Phase 1 of the multiplayer authentication and leaderboard system has been implemented. This includes:

- User registration and login with secure password hashing (bcrypt)
- JWT-based token authentication (access + refresh tokens)
- Guest user support (temporary, no registration required)
- Rate limiting and account lockout protection
- SQLite database with comprehensive schema
- Token refresh and auto-login functionality

## 📦 Installation

### 1. Install Dependencies

```bash
cd websocket-server
npm install
```

This will install:
- `bcrypt` ^5.1.1 - Password hashing
- `jsonwebtoken` ^9.0.2 - JWT token generation/verification
- `better-sqlite3` ^11.3.0 - SQLite database

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

**IMPORTANT:** Generate a secure JWT secret for production:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update `.env` with your generated secret:

```env
JWT_SECRET=your-generated-secret-here
```

### 3. Start the Server

```bash
npm start
```

The database will be automatically initialized on first run.

## 🗄️ Database Schema

### Users Table
```sql
- user_id (PRIMARY KEY) - UUID v4
- username (UNIQUE) - 3-20 characters, alphanumeric + underscore
- password_hash - bcrypt hash (NULL for guests)
- email (UNIQUE, optional) - for password recovery
- created_at - registration timestamp
- last_login - last login timestamp
- is_guest - 0=registered, 1=guest
- failed_attempts - failed login counter
- locked_until - account lockout timestamp
- profile_data - JSON blob for user preferences
```

### Games Table
```sql
- game_id (PRIMARY KEY)
- player1_id, player2_id - references users
- winner_id - references users
- score_p1, score_p2 - final scores
- total_moves, game_duration - game stats
- started_at, ended_at - timestamps
- week_number - YYYYWW format for leaderboards
- is_ranked - 1=counts for leaderboard, 0=unranked (guest games)
- game_data - JSON blob of full game log
```

### Weekly Stats Table
```sql
- user_id + week_number (COMPOSITE PRIMARY KEY)
- games_played, games_won, games_lost
- total_score_for, total_score_against
- elo_rating - ELO ranking system
- rank_position - position in leaderboard
- win_streak, best_win_streak
```

### Additional Tables
- `alltime_stats` - Lifetime statistics per user
- `achievements` - Available achievements
- `user_achievements` - Unlocked achievements per user
- `refresh_tokens` - Active refresh tokens for session management

## 🔐 Security Features

### Password Security
- ✅ **bcrypt** hashing with salt rounds = 12
- ✅ Minimum 8 characters
- ✅ Must contain letters and numbers
- ✅ Max 72 characters (bcrypt limit)
- ✅ One-way hashing (cannot be decoded)

### Account Protection
- ✅ Rate limiting: 5 login attempts per minute
- ✅ Account lockout: 15 minutes after 5 failed attempts
- ✅ Failed attempt tracking per user
- ✅ Automatic lockout reset on successful login

### Token Management
- ✅ Short-lived access tokens (15 minutes)
- ✅ Long-lived refresh tokens (7 days)
- ✅ Token revocation on logout
- ✅ Automatic cleanup of expired tokens
- ✅ Token hashing in database (SHA-256)

### Additional Security
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Foreign key constraints
- ✅ User agent and IP tracking for tokens

## 🎮 API Endpoints (Socket.IO Events)

### Authentication

**Register**
```javascript
socket.emit('register', {
    username: 'player123',
    password: 'SecurePass123',
    email: 'player@example.com' // optional
}, (response) => {
    // response.success, response.user, response.accessToken, response.refreshToken
});
```

**Login**
```javascript
socket.emit('login', {
    username: 'player123',
    password: 'SecurePass123'
}, (response) => {
    // response.success, response.user, response.accessToken, response.refreshToken
});
```

**Logout**
```javascript
socket.emit('logout', {
    refreshToken: storedRefreshToken
}, (response) => {
    // response.success
});
```

**Create Guest**
```javascript
socket.emit('createGuest', {
    guestName: 'CoolPlayer'
}, (response) => {
    // response.success, response.user
});
```

**Verify Token**
```javascript
socket.emit('verifyToken', {
    accessToken: storedAccessToken
}, (response) => {
    // response.success, response.user
});
```

**Refresh Token**
```javascript
socket.emit('refreshToken', {
    refreshToken: storedRefreshToken
}, (response) => {
    // response.success, response.accessToken
});
```

## 🎨 Frontend Integration

The `auth-client.js` handles all authentication logic:

```javascript
// Initialize auth client
await authClient.initialize(socket);

// Listen to auth state changes
authClient.onAuthStateChange = (state) => {
    console.log('Auth state:', state);
    // Update UI based on state.isAuthenticated, state.isGuest, state.user
};

// Handle errors
authClient.onError = (error) => {
    console.error('Auth error:', error);
    // Show error message to user
};

// Register
try {
    await authClient.register({
        username: 'player123',
        password: 'SecurePass123',
        email: 'player@example.com'
    });
} catch (error) {
    // Handle error
}

// Login
try {
    await authClient.login({
        username: 'player123',
        password: 'SecurePass123'
    });
} catch (error) {
    // Handle error
}

// Logout
await authClient.logout();

// Create guest
await authClient.createGuest('CoolPlayer');

// Get current user info
const username = authClient.getUserDisplayName();
const userId = authClient.getUserId();
const isAuth = authClient.isUserAuthenticated();
const isGuest = authClient.isGuestUser();
```

## 📋 Next Steps

### Frontend UI (Phase 1 continued)
- [ ] Create login modal (`index.html`)
- [ ] Create registration modal (`index.html`)
- [ ] Add authentication forms with validation
- [ ] Update main menu to show login/logout options
- [ ] Update multiplayer lobby to use authenticated usernames
- [ ] Add "Continue as Guest" option

### Integration (Phase 2)
- [ ] Modify game start to check auth status
- [ ] Store game results in database
- [ ] Update stats after each game
- [ ] Distinguish ranked vs unranked games

### Leaderboards (Phase 3)
- [ ] Create leaderboard UI
- [ ] Implement weekly stat aggregation
- [ ] Add ELO rating calculation
- [ ] Create leaderboard endpoints
- [ ] Add historical leaderboard viewer

## 🧪 Testing

### Manual Testing Checklist

**Registration:**
- [ ] Valid registration succeeds
- [ ] Duplicate username rejected
- [ ] Duplicate email rejected
- [ ] Weak password rejected
- [ ] Invalid username format rejected

**Login:**
- [ ] Valid login succeeds
- [ ] Invalid credentials rejected
- [ ] Failed attempts tracked
- [ ] Account locked after 5 failures
- [ ] Lockout expires after 15 minutes
- [ ] Rate limiting works (5/minute)

**Tokens:**
- [ ] Access token expires after 15 minutes
- [ ] Refresh token works
- [ ] Logout revokes tokens
- [ ] Auto-login works on page reload
- [ ] Expired tokens handled gracefully

**Guest Users:**
- [ ] Guest creation works
- [ ] Guest games are unranked
- [ ] Guest prompt to register after game

## 🔧 Troubleshooting

### Database Issues

**Error: Cannot find module 'better-sqlite3'**
```bash
cd websocket-server
npm install better-sqlite3
```

**Error: Database locked**
- SQLite WAL mode is enabled for better concurrency
- Ensure only one server instance is running
- Check file permissions on database directory

### Token Issues

**Tokens invalidated on server restart**
- Set JWT_SECRET in .env file
- Don't use random secret in production

**Auto-login not working**
- Check browser localStorage for tokens
- Verify refresh token hasn't expired
- Check for token in database

## 🚀 Production Deployment

### Security Checklist
- [ ] Set strong JWT_SECRET in production .env
- [ ] Enable HTTPS
- [ ] Configure CORS_ORIGIN to specific domain
- [ ] Set NODE_ENV=production
- [ ] Regular database backups
- [ ] Monitor failed login attempts
- [ ] Set up error logging/monitoring

### Performance
- [ ] Database on SSD for better performance
- [ ] Enable database backups (automatic)
- [ ] Monitor database size
- [ ] Consider Redis for rate limiting (current is in-memory)

### Monitoring
- [ ] Log authentication events
- [ ] Track registration rate
- [ ] Monitor failed login patterns
- [ ] Alert on unusual activity

## 📚 Additional Resources

- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## 🤝 Contributing

When adding authentication-related features:
1. Follow existing security patterns
2. Add input validation
3. Test edge cases
4. Update this README
5. Consider backwards compatibility

---

**Status:** ✅ Phase 1 Backend Complete | 🚧 Phase 1 Frontend In Progress

Last Updated: 2025-11-08
