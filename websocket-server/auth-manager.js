/**
 * Authentication Manager for Dice Soccer
 * Handles user registration, login, token management with security best practices
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dbManager = require('./database/db-manager');

// Configuration
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_ACCESS_EXPIRY = '15m';  // 15 minutes
const JWT_REFRESH_EXPIRY = '7d';  // 7 days
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Rate limiting (simple in-memory, should use Redis in production)
const loginAttempts = new Map(); // key: username, value: { count, resetAt }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;

class AuthManager {
    constructor() {
        if (!process.env.JWT_SECRET) {
            console.warn('⚠️  JWT_SECRET not set in environment, using random secret (will invalidate tokens on restart)');
        }
        console.log('✅ AuthManager initialized');
    }

    /**
     * Generate a unique user ID
     */
    generateUserId() {
        return crypto.randomUUID();
    }

    /**
     * Validate username format
     */
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }
        
        if (username.length < 3 || username.length > 20) {
            return { valid: false, error: 'Username must be 3-20 characters long' };
        }
        
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
        }
        
        return { valid: true };
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'Password is required' };
        }
        
        if (password.length < 8) {
            return { valid: false, error: 'Password must be at least 8 characters long' };
        }
        
        if (password.length > 72) {
            return { valid: false, error: 'Password must be less than 72 characters' };
        }
        
        // Check for complexity (at least one number and one letter)
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return { valid: false, error: 'Password must contain at least one letter and one number' };
        }
        
        return { valid: true };
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        if (!email) {
            return { valid: true }; // Email is optional
        }
        
        if (typeof email !== 'string') {
            return { valid: false, error: 'Invalid email format' };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, error: 'Invalid email format' };
        }
        
        return { valid: true };
    }

    /**
     * Check rate limiting for login attempts
     */
    checkRateLimit(identifier) {
        const now = Date.now();
        const record = loginAttempts.get(identifier);
        
        if (!record || now > record.resetAt) {
            // Reset or create new record
            loginAttempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
            return { allowed: true };
        }
        
        if (record.count >= RATE_LIMIT_MAX) {
            const waitTime = Math.ceil((record.resetAt - now) / 1000);
            return { 
                allowed: false, 
                error: `Too many attempts. Please wait ${waitTime} seconds.` 
            };
        }
        
        record.count++;
        return { allowed: true };
    }

    /**
     * Register a new user
     */
    async register({ username, password, email }) {
        try {
            // Validate inputs
            const usernameValidation = this.validateUsername(username);
            if (!usernameValidation.valid) {
                return { success: false, error: usernameValidation.error };
            }
            
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.valid) {
                return { success: false, error: passwordValidation.error };
            }
            
            const emailValidation = this.validateEmail(email);
            if (!emailValidation.valid) {
                return { success: false, error: emailValidation.error };
            }
            
            // Check if username already exists
            const existingUser = dbManager.statements.getUserByUsername.get(username);
            if (existingUser) {
                return { success: false, error: 'Username already taken' };
            }
            
            // Check if email already exists (if provided)
            if (email) {
                const existingEmail = dbManager.statements.getUserByEmail.get(email);
                if (existingEmail) {
                    return { success: false, error: 'Email already registered' };
                }
            }
            
            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            
            // Create user
            const userId = this.generateUserId();
            const now = Date.now();
            
            dbManager.statements.createUser.run(
                userId,
                username,
                passwordHash,
                email || null,
                now,
                0 // is_guest = false
            );
            
            console.log(`✅ User registered: ${username} (${userId})`);
            
            // Generate tokens
            const { accessToken, refreshToken, tokenId } = await this.generateTokens(userId, username);
            
            return {
                success: true,
                user: {
                    userId,
                    username,
                    email: email || null,
                    createdAt: now
                },
                accessToken,
                refreshToken
            };
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    /**
     * Login a user
     */
    async login({ username, password, userAgent, ipAddress }) {
        try {
            // Rate limiting check
            const rateLimitCheck = this.checkRateLimit(username);
            if (!rateLimitCheck.allowed) {
                return { success: false, error: rateLimitCheck.error };
            }
            
            // Get user from database
            const user = dbManager.statements.getUserByUsername.get(username);
            
            if (!user) {
                return { success: false, error: 'Invalid username or password' };
            }
            
            // Check if account is locked
            if (user.locked_until > Date.now()) {
                const waitMinutes = Math.ceil((user.locked_until - Date.now()) / 60000);
                return { 
                    success: false, 
                    error: `Account locked. Try again in ${waitMinutes} minutes.` 
                };
            }
            
            // Verify password
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            
            if (!passwordMatch) {
                // Increment failed attempts
                const failedAttempts = user.failed_attempts + 1;
                let lockedUntil = 0;
                
                if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                    lockedUntil = Date.now() + LOCKOUT_DURATION;
                    console.log(`⚠️  Account locked: ${username} (too many failed attempts)`);
                }
                
                dbManager.statements.updateFailedAttempts.run(failedAttempts, lockedUntil, user.user_id);
                
                const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
                if (remainingAttempts > 0) {
                    return { 
                        success: false, 
                        error: `Invalid username or password. ${remainingAttempts} attempts remaining.` 
                    };
                } else {
                    return { 
                        success: false, 
                        error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' 
                    };
                }
            }
            
            // Successful login - reset failed attempts
            dbManager.statements.resetFailedAttempts.run(user.user_id);
            
            // Update last login
            dbManager.statements.updateLastLogin.run(Date.now(), user.user_id);
            
            // Generate tokens
            const { accessToken, refreshToken, tokenId } = await this.generateTokens(
                user.user_id, 
                user.username,
                userAgent,
                ipAddress
            );
            
            console.log(`✅ User logged in: ${username} (${user.user_id})`);
            
            return {
                success: true,
                user: {
                    userId: user.user_id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.created_at,
                    profileData: JSON.parse(user.profile_data || '{}')
                },
                accessToken,
                refreshToken
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    /**
     * Generate JWT access and refresh tokens
     */
    async generateTokens(userId, username, userAgent = null, ipAddress = null) {
        try {
            // Generate access token (short-lived)
            const accessToken = jwt.sign(
                { userId, username, type: 'access' },
                JWT_SECRET,
                { expiresIn: JWT_ACCESS_EXPIRY }
            );
            
            // Generate refresh token (long-lived)
            const tokenId = crypto.randomUUID();
            const refreshToken = jwt.sign(
                { userId, username, tokenId, type: 'refresh' },
                JWT_SECRET,
                { expiresIn: JWT_REFRESH_EXPIRY }
            );
            
            // Hash refresh token for storage
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            
            // Store refresh token in database
            const now = Date.now();
            const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days
            
            dbManager.statements.saveRefreshToken.run(
                tokenId,
                userId,
                tokenHash,
                expiresAt,
                now,
                userAgent || 'unknown',
                ipAddress || 'unknown'
            );
            
            return { accessToken, refreshToken, tokenId };
            
        } catch (error) {
            console.error('❌ Token generation error:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken({ refreshToken }) {
        try {
            if (!refreshToken) {
                return { success: false, error: 'Refresh token required' };
            }
            
            // Verify refresh token
            let decoded;
            try {
                decoded = jwt.verify(refreshToken, JWT_SECRET);
            } catch (error) {
                return { success: false, error: 'Invalid or expired refresh token' };
            }
            
            if (decoded.type !== 'refresh') {
                return { success: false, error: 'Invalid token type' };
            }
            
            // Check if token exists and is not revoked
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            const storedToken = dbManager.statements.getRefreshToken.get(decoded.tokenId);
            
            if (!storedToken || storedToken.token_hash !== tokenHash) {
                return { success: false, error: 'Token not found or revoked' };
            }
            
            // Check if token is expired
            if (storedToken.expires_at < Date.now()) {
                return { success: false, error: 'Refresh token expired' };
            }
            
            // Generate new access token
            const accessToken = jwt.sign(
                { userId: decoded.userId, username: decoded.username, type: 'access' },
                JWT_SECRET,
                { expiresIn: JWT_ACCESS_EXPIRY }
            );
            
            console.log(`✅ Token refreshed for user: ${decoded.username}`);
            
            return {
                success: true,
                accessToken,
                user: {
                    userId: decoded.userId,
                    username: decoded.username
                }
            };
            
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return { success: false, error: 'Token refresh failed' };
        }
    }

    /**
     * Logout user (revoke refresh token)
     */
    async logout({ refreshToken }) {
        try {
            if (!refreshToken) {
                return { success: true }; // Nothing to revoke
            }
            
            // Decode token to get tokenId
            let decoded;
            try {
                decoded = jwt.decode(refreshToken);
            } catch (error) {
                return { success: true }; // Invalid token, nothing to revoke
            }
            
            if (decoded && decoded.tokenId) {
                dbManager.statements.revokeToken.run(decoded.tokenId);
                console.log(`✅ User logged out: ${decoded.username}`);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Logout error:', error);
            return { success: false, error: 'Logout failed' };
        }
    }

    /**
     * Verify access token
     */
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            
            if (decoded.type !== 'access') {
                return { valid: false, error: 'Invalid token type' };
            }
            
            return {
                valid: true,
                userId: decoded.userId,
                username: decoded.username
            };
            
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { valid: false, error: 'Token expired', expired: true };
            }
            return { valid: false, error: 'Invalid token' };
        }
    }

    /**
     * Create a guest user (temporary, no password)
     */
    createGuestUser(guestName) {
        try {
            const userId = this.generateUserId();
            const username = `guest_${userId.substring(0, 8)}`;
            const now = Date.now();
            
            dbManager.statements.createUser.run(
                userId,
                username,
                null, // No password hash for guest
                null, // No email
                now,
                1 // is_guest = true
            );
            
            console.log(`✅ Guest user created: ${username} (${userId})`);
            
            return {
                success: true,
                user: {
                    userId,
                    username,
                    displayName: guestName || username,
                    isGuest: true
                }
            };
            
        } catch (error) {
            console.error('❌ Guest user creation error:', error);
            return { success: false, error: 'Failed to create guest user' };
        }
    }

    /**
     * Clean up expired tokens (run periodically)
     */
    cleanupExpiredTokens() {
        try {
            const result = dbManager.statements.cleanExpiredTokens.run(Date.now());
            if (result.changes > 0) {
                console.log(`🧹 Cleaned up ${result.changes} expired tokens`);
            }
        } catch (error) {
            console.error('❌ Token cleanup error:', error);
        }
    }
}

// Export singleton instance
module.exports = new AuthManager();
