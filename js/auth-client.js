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
        
        // Reconnection settings
        this.reconnectInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectDelay = 30000; // 30 seconds max
        this.isReconnecting = false;
        
        // Callbacks
        this.onAuthStateChange = null;
        this.onError = null;
        this.onConnectionStateChange = null; // New callback for connection status
    }

    /**
     * Initialize authentication client
     * @param {Object} socket - Socket.IO socket instance (optional, will create if not provided)
     */
    async initialize(socket = null) {
        if (!socket) {
            // Create socket connection if not provided
            const serverUrl = window.configManager?.getWebSocketServerUrl() || 'ws://localhost:7860';
            console.log('🔌 Connecting to auth server:', serverUrl);
            this.socket = io(serverUrl);
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);
                
                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    console.log('✅ Connected to auth server');
                    this.reconnectAttempts = 0;
                    this.isReconnecting = false;
                    
                    // Send current language to server
                    this.sendLanguageToServer();
                    
                    // Hide reconnection message
                    if (typeof window.hideConnectionMessage === 'function') {
                        window.hideConnectionMessage();
                    }
                    
                    // Notify about connection state
                    if (this.onConnectionStateChange) {
                        this.onConnectionStateChange(true);
                    }
                    
                    // Try auto-login if we have stored tokens (for reconnections)
                    if (localStorage.getItem('dicesoccer_refresh_token') && !this.isAuthenticated) {
                        console.log('🔐 Attempting auto-login after reconnect');
                        this.attemptAutoLogin().catch(err => {
                            console.warn('⚠️ Auto-login failed:', err);
                        });
                    }
                    
                    resolve();
                });
                
                this.socket.on('disconnect', () => {
                    console.warn('⚠️ Disconnected from auth server');
                    if (this.onConnectionStateChange) {
                        this.onConnectionStateChange(false);
                    }
                    // Start reconnection attempts
                    this.startReconnection();
                });
                
                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    console.error('❌ Connection failed:', error.message);
                    reject(error);
                });
            });
        } else {
            console.log('🔌 Reusing existing socket for auth');
            this.socket = socket;
            // Send current language to server for existing socket
            this.sendLanguageToServer();
            
            // Reset auto-login flag so we can re-authenticate on the new socket
            console.log('🔄 Reusing socket, resetting auto-login flag from', this.autoLoginAttempted, 'to false');
            this.autoLoginAttempted = false;
        }
        
        // Try to auto-login with stored tokens
        console.log('🔐 Calling attemptAutoLogin(), autoLoginAttempted:', this.autoLoginAttempted);
        const loginResult = await this.attemptAutoLogin();
        console.log('🔐 attemptAutoLogin() completed, result:', loginResult);
        
        return this.isAuthenticated;
    }

    /**
     * Start background reconnection attempts
     */
    startReconnection() {
        if (this.isReconnecting) return;
        
        this.isReconnecting = true;
        console.log('🔄 Starting background reconnection...');
        
        const attemptReconnect = async () => {
            if (this.socket && this.socket.connected) {
                console.log('✅ Already reconnected');
                this.isReconnecting = false;
                this.reconnectAttempts = 0;
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
                return;
            }
            
            this.reconnectAttempts++;
            const delay = Math.min(5000 * this.reconnectAttempts, this.maxReconnectDelay);
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts} (next in ${delay/1000}s)...`);
            
            // Notify app about reconnection attempt
            if (typeof window.updateReconnectionAttempt === 'function') {
                window.updateReconnectionAttempt(this.reconnectAttempts);
            }
            
            try {
                if (this.socket) {
                    // Force disconnect first to clear any stale connection state
                    if (this.socket.connected) {
                        this.socket.disconnect();
                    }
                    
                    // Wait a moment for disconnect to complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Now reconnect
                    this.socket.connect();
                    
                    // If we have stored tokens, try to auto-login after a successful connect
                    // (the connect handler will trigger this via onConnectionStateChange)
                    if (localStorage.getItem('dicesoccer_refresh_token')) {
                        // Auto-login will be attempted in the connect handler
                        console.log('🔐 Will attempt auto-login on reconnect');
                    }
                }
            } catch (error) {
                console.warn('Reconnection attempt failed:', error.message);
            }
        };
        
        // Clear any existing interval
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
        }
        
        // Start periodic reconnection attempts
        this.reconnectInterval = setInterval(attemptReconnect, 10000); // Try every 10 seconds
        
        // Try immediately once
        attemptReconnect();
    }

    /**
     * Send current language preference to server
     */
    sendLanguageToServer() {
        if (this.socket && window.translationManager) {
            const language = window.translationManager.getCurrentLanguage();
            this.socket.emit('setLanguage', { language });
            console.log('🌐 Sent language to server:', language);
        }
    }

    /**
     * Attempt auto-login using stored refresh token
     */
    async attemptAutoLogin() {
        console.log('🔐 attemptAutoLogin() called, autoLoginAttempted:', this.autoLoginAttempted);
        if (this.autoLoginAttempted) {
            console.log('⏭️ Auto-login already attempted, skipping');
            return false;
        }
        
        this.autoLoginAttempted = true;
        console.log('🔐 Setting autoLoginAttempted to true');
        
        try {
            // Check for stored tokens
            const storedRefreshToken = this.getStoredRefreshToken();
            const storedAccessToken = this.getStoredAccessToken();
            
            console.log('🔍 Stored tokens:', {
                hasRefreshToken: !!storedRefreshToken,
                hasAccessToken: !!storedAccessToken
            });
            
            if (!storedRefreshToken) {
                console.log('📱 No stored session found');
                return false;
            }
            
            console.log('🔄 Attempting auto-login with stored tokens...');
            
            // Try to verify access token first (faster)
            if (storedAccessToken) {
                console.log('✅ Calling verifyToken with stored access token');
                const verifyResult = await this.verifyToken(storedAccessToken);
                console.log('🔍 verifyToken result:', verifyResult);
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
window.authClient = new AuthClient();

// Testing helper - available in console as window.testAuth
window.testAuth = {
    /**
     * Initialize and test connection
     * Usage: await testAuth.init('http://192.168.28.53:3123')
     */
    async init(serverUrl = null) {
        try {
            if (serverUrl) {
                // Override config temporarily
                if (window.configManager) {
                    window.configManager.config['websocket-server'] = serverUrl;
                }
            }
            
            console.log('🔄 Initializing auth client...');
            await window.authClient.initialize();
            console.log('✅ Auth client initialized');
            console.log('📊 Auth state:', {
                authenticated: window.authClient.isAuthenticated,
                user: window.authClient.currentUser,
                isGuest: window.authClient.isGuest
            });
            return true;
        } catch (error) {
            console.error('❌ Init failed:', error);
            return false;
        }
    },

    /**
     * Register new user
     * Usage: await testAuth.register('testuser', 'Test123456', 'test@test.com')
     */
    async register(username, password, email) {
        try {
            console.log('🔄 Registering user:', username);
            const result = await window.authClient.register({ username, password, email });
            console.log('✅ Registration successful:', result);
            return result;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            return null;
        }
    },

    /**
     * Login existing user
     * Usage: await testAuth.login('testuser', 'Test123456')
     */
    async login(username, password) {
        try {
            console.log('🔄 Logging in:', username);
            const result = await window.authClient.login({ username, password });
            console.log('✅ Login successful:', result);
            return result;
        } catch (error) {
            console.error('❌ Login failed:', error);
            return null;
        }
    },

    /**
     * Create guest user
     * Usage: await testAuth.guest('MyGuestName')
     */
    async guest(displayName = null) {
        try {
            console.log('🔄 Creating guest user:', displayName || '(auto)');
            const result = await window.authClient.createGuest(displayName);
            console.log('✅ Guest created:', result);
            return result;
        } catch (error) {
            console.error('❌ Guest creation failed:', error);
            return null;
        }
    },

    /**
     * Logout current user
     * Usage: await testAuth.logout()
     */
    async logout() {
        try {
            console.log('🔄 Logging out...');
            await window.authClient.logout();
            console.log('✅ Logged out');
            return true;
        } catch (error) {
            console.error('❌ Logout failed:', error);
            return false;
        }
    },

    /**
     * Get current auth state
     * Usage: testAuth.status()
     */
    status() {
        console.log('📊 Authentication Status:');
        console.log('  Authenticated:', window.authClient.isAuthenticated);
        console.log('  Guest:', window.authClient.isGuest);
        console.log('  User:', window.authClient.currentUser);
        console.log('  Display Name:', window.authClient.getUserDisplayName());
        return {
            authenticated: window.authClient.isAuthenticated,
            guest: window.authClient.isGuest,
            user: window.authClient.currentUser,
            displayName: window.authClient.getUserDisplayName()
        };
    },

    /**
     * Clear stored tokens
     * Usage: testAuth.clearTokens()
     */
    clearTokens() {
        localStorage.removeItem('ds_access_token');
        localStorage.removeItem('ds_refresh_token');
        console.log('✅ Tokens cleared');
    }
};

console.log('🎮 Dice Soccer Auth Client loaded');
console.log('💡 Test auth with: testAuth.init("http://192.168.28.53:3123")');

