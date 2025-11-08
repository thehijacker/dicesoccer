/**
 * Authentication Manager for Dice Soccer
 * Handles user registration, login, token management with security best practices
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dbManager = require('./database/db-manager');
const path = require('path');
const fs = require('fs');

// Import translation system
// Try Docker path first (/app/js/translations.js), then local path (../js/translations.js)
let translationsPath = path.join(__dirname, 'js/translations.js');
if (!fs.existsSync(translationsPath)) {
    translationsPath = path.join(__dirname, '../js/translations.js');
}
const { translationManager } = require(translationsPath);

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
            return { valid: false, error: 'usernameRequired' };
        }
        
        if (username.length < 3) {
            return { valid: false, error: 'usernameTooShort' };
        }
        
        if (username.length > 20) {
            return { valid: false, error: 'usernameTooLong' };
        }
        
        // Allow letters, numbers, spaces, and underscores
        if (!/^[a-zA-Z0-9_ ]+$/.test(username)) {
            return { valid: false, error: 'usernameInvalidChars' };
        }
        
        return { valid: true };
    }

    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, error: 'passwordRequired' };
        }
        
        if (password.length < 8) {
            return { valid: false, error: 'passwordTooShort' };
        }
        
        if (password.length > 72) {
            return { valid: false, error: 'passwordTooLong' };
        }
        
        // Check for complexity (at least one number and one letter)
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return { valid: false, error: 'passwordComplexity' };
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
            return { valid: false, error: 'emailInvalid' };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, error: 'emailInvalid' };
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
                return { success: false, error: 'usernameAlreadyTaken' };
            }
            
            // Check if email already exists (if provided)
            if (email) {
                const existingEmail = dbManager.statements.getUserByEmail.get(email);
                if (existingEmail) {
                    return { success: false, error: 'emailAlreadyRegistered' };
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
                return { success: false, error: 'invalidCredentials' };
            }
            
            // Check if account is locked
            if (user.locked_until > Date.now()) {
                return { 
                    success: false, 
                    error: 'accountLocked'
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
                
                // Always return same error for security
                return { 
                    success: false, 
                    error: 'invalidCredentials'
                };
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
                return { success: false, error: 'tokenInvalid' };
            }
            
            // Check if token exists and is not revoked
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            const storedToken = dbManager.statements.getRefreshToken.get(decoded.tokenId);
            
            if (!storedToken || storedToken.token_hash !== tokenHash) {
                return { success: false, error: 'tokenInvalid' };
            }
            
            // Check if token is expired
            if (storedToken.expires_at < Date.now()) {
                return { success: false, error: 'tokenExpired' };
            }
            
            // Verify user still exists in database (security check)
            const user = dbManager.statements.getUserById.get(decoded.userId);
            if (!user) {
                console.warn(`⚠️ User no longer exists: ${decoded.username} (${decoded.userId})`);
                // Revoke the token
                dbManager.statements.revokeToken.run(decoded.tokenId);
                return { success: false, error: 'userNotFound' };
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
            return { success: false, error: 'tokenInvalid' };
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
                return { valid: false, error: 'tokenInvalid' };
            }
            
            // Verify user still exists in database (security check)
            const user = dbManager.statements.getUserById.get(decoded.userId);
            if (!user) {
                console.warn(`⚠️ User no longer exists: ${decoded.username} (${decoded.userId})`);
                return { valid: false, error: 'userNotFound' };
            }
            
            return {
                valid: true,
                userId: decoded.userId,
                username: decoded.username
            };
            
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return { valid: false, error: 'tokenExpired', expired: true };
            }
            return { valid: false, error: 'tokenInvalid' };
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
