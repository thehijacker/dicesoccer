/**
 * Authentication Client for Dice Soccer
 * Handles user authentication, token management, and auto-login
 */

class AuthClient {
    constructor() {
        this.socket = null;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.isGuest = false;
        this.autoLoginAttempted = false;
        
        // Callbacks
        this.onAuthStateChange = null;
        this.onError = null;
    }

    /**
     * Initialize authentication client
     */
    async initialize(socket) {
        this.socket = socket;
        
        // Try to auto-login with stored tokens
        await this.attemptAutoLogin();
        
        return this.isAuthenticated;
    }

    /**
     * Attempt auto-login using stored refresh token
     */
    async attemptAutoLogin() {
        if (this.autoLoginAttempted) {
            return false;
        }
        
        this.autoLoginAttempted = true;
        
        try {
            // Check for stored tokens
            const storedRefreshToken = this.getStoredRefreshToken();
            const storedAccessToken = this.getStoredAccessToken();
            
            if (!storedRefreshToken) {
                console.log('📱 No stored session found');
                return false;
            }
            
            console.log('🔄 Attempting auto-login with stored tokens...');
            
            // Try to verify access token first (faster)
            if (storedAccessToken) {
                const verifyResult = await this.verifyToken(storedAccessToken);
                if (verifyResult.success) {
                    this.accessToken = storedAccessToken;
                    this.refreshToken = storedRefreshToken;
                    this.currentUser = verifyResult.user;
                    this.isAuthenticated = true;
                    this.isGuest = false;
                    
                    console.log(`✅ Auto-login successful: ${this.currentUser.username}`);
                    this.notifyAuthStateChange();
                    return true;
                }
            }
            
            // Access token invalid/expired, try refresh token
            const refreshResult = await this.refreshAccessToken(storedRefreshToken);
            if (refreshResult.success) {
                this.accessToken = refreshResult.accessToken;
                this.refreshToken = storedRefreshToken;
                this.currentUser = refreshResult.user;
                this.isAuthenticated = true;
                this.isGuest = false;
                
                this.storeTokens(refreshResult.accessToken, storedRefreshToken);
                
                console.log(`✅ Auto-login successful (token refreshed): ${this.currentUser.username}`);
                this.notifyAuthStateChange();
                return true;
            } else {
                // Both failed, clear stored tokens
                console.log('❌ Auto-login failed, clearing tokens');
                this.clearStoredTokens();
                return false;
            }
            
        } catch (error) {
            console.error('❌ Auto-login error:', error);
            this.clearStoredTokens();
            return false;
        }
    }

    /**
     * Register a new user
     */
    async register({ username, password, email }) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }
            
            this.socket.emit('register', { username, password, email }, (response) => {
                if (response.success) {
                    this.handleAuthSuccess(response);
                    resolve(response);
                } else {
                    this.handleAuthError(response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Login user
     */
    async login({ username, password }) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }
            
            this.socket.emit('login', { username, password }, (response) => {
                if (response.success) {
                    this.handleAuthSuccess(response);
                    resolve(response);
                } else {
                    this.handleAuthError(response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Logout user
     */
    async logout() {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }
            
            this.socket.emit('logout', { refreshToken: this.refreshToken }, (response) => {
                if (response.success) {
                    this.handleLogout();
                    resolve(response);
                } else {
                    // Logout failed, but still clear local state
                    this.handleLogout();
                    resolve(response);
                }
            });
        });
    }

    /**
     * Create guest user
     */
    async createGuest(guestName) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                return reject(new Error('Socket not initialized'));
            }
            
            this.socket.emit('createGuest', { guestName }, (response) => {
                if (response.success) {
                    this.currentUser = response.user;
                    this.isGuest = true;
                    this.isAuthenticated = false; // Guest is not fully authenticated
                    
                    console.log(`✅ Guest user created: ${response.user.displayName}`);
                    this.notifyAuthStateChange();
                    resolve(response);
                } else {
                    this.handleAuthError(response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    /**
     * Verify access token
     */
    async verifyToken(accessToken) {
        return new Promise((resolve) => {
            if (!this.socket) {
                return resolve({ success: false, error: 'Socket not initialized' });
            }
            
            this.socket.emit('verifyToken', { accessToken }, (response) => {
                resolve(response);
            });
        });
    }

    /**
     * Refresh access token
     */
    async refreshAccessToken(refreshToken) {
        return new Promise((resolve) => {
            if (!this.socket) {
                return resolve({ success: false, error: 'Socket not initialized' });
            }
            
            this.socket.emit('refreshToken', { refreshToken }, (response) => {
                if (response.success) {
                    this.accessToken = response.accessToken;
                    this.storeAccessToken(response.accessToken);
                }
                resolve(response);
            });
        });
    }

    /**
     * Handle successful authentication
     */
    handleAuthSuccess(response) {
        this.accessToken = response.accessToken;
        this.refreshToken = response.refreshToken;
        this.currentUser = response.user;
        this.isAuthenticated = true;
        this.isGuest = false;
        
        // Store tokens
        this.storeTokens(response.accessToken, response.refreshToken);
        
        console.log(`✅ Authentication successful: ${this.currentUser.username}`);
        this.notifyAuthStateChange();
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.accessToken = null;
        this.refreshToken = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.isGuest = false;
        
        this.clearStoredTokens();
        
        console.log('✅ Logged out successfully');
        this.notifyAuthStateChange();
    }

    /**
     * Handle authentication error
     */
    handleAuthError(error) {
        console.error('❌ Authentication error:', error);
        if (this.onError) {
            this.onError(error);
        }
    }

    /**
     * Store tokens in localStorage (with encryption for refresh token)
     */
    storeTokens(accessToken, refreshToken) {
        try {
            localStorage.setItem('ds_access_token', accessToken);
            localStorage.setItem('ds_refresh_token', refreshToken);
        } catch (error) {
            console.error('❌ Failed to store tokens:', error);
        }
    }

    /**
     * Store only access token
     */
    storeAccessToken(accessToken) {
        try {
            localStorage.setItem('ds_access_token', accessToken);
        } catch (error) {
            console.error('❌ Failed to store access token:', error);
        }
    }

    /**
     * Get stored refresh token
     */
    getStoredRefreshToken() {
        try {
            return localStorage.getItem('ds_refresh_token');
        } catch (error) {
            console.error('❌ Failed to get refresh token:', error);
            return null;
        }
    }

    /**
     * Get stored access token
     */
    getStoredAccessToken() {
        try {
            return localStorage.getItem('ds_access_token');
        } catch (error) {
            console.error('❌ Failed to get access token:', error);
            return null;
        }
    }

    /**
     * Clear stored tokens
     */
    clearStoredTokens() {
        try {
            localStorage.removeItem('ds_access_token');
            localStorage.removeItem('ds_refresh_token');
        } catch (error) {
            console.error('❌ Failed to clear tokens:', error);
        }
    }

    /**
     * Notify listeners of auth state change
     */
    notifyAuthStateChange() {
        if (this.onAuthStateChange) {
            this.onAuthStateChange({
                isAuthenticated: this.isAuthenticated,
                isGuest: this.isGuest,
                user: this.currentUser
            });
        }
    }

    /**
     * Get current user display name (for multiplayer)
     */
    getUserDisplayName() {
        if (!this.currentUser) {
            return null;
        }
        
        if (this.isGuest) {
            return this.currentUser.displayName || this.currentUser.username;
        }
        
        return this.currentUser.username;
    }

    /**
     * Get current user ID
     */
    getUserId() {
        return this.currentUser ? this.currentUser.userId : null;
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * Check if user is guest
     */
    isGuestUser() {
        return this.isGuest;
    }
}

// Create global auth client instance
const authClient = new AuthClient();
