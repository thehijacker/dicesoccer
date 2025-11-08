/**
 * Authentication UI for Dice Soccer
 * Handles login/register modals and user flows
 */

class AuthUI {
    constructor() {
        this.authModal = null;
        this.loginForm = null;
        this.registerForm = null;
        this.authOptions = null;
        this.onAuthComplete = null;
    }

    /**
     * Initialize auth UI
     */
    initialize() {
        this.authModal = document.getElementById('authModal');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.authOptions = document.querySelector('.auth-options');
        
        // Option buttons
        document.getElementById('playAsGuestBtn')?.addEventListener('click', () => this.playAsGuest());
        document.getElementById('showLoginBtn')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('showRegisterBtn')?.addEventListener('click', () => this.showRegisterForm());
        
        // Form buttons
        document.getElementById('loginSubmitBtn')?.addEventListener('click', () => this.submitLogin());
        document.getElementById('registerSubmitBtn')?.addEventListener('click', () => this.submitRegister());
        document.getElementById('backToAuthOptions')?.addEventListener('click', () => this.showAuthOptions());
        document.getElementById('backToAuthOptions2')?.addEventListener('click', () => this.showAuthOptions());
        
        // Enter key support
        document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitLogin();
        });
        document.getElementById('registerPassword')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitRegister();
        });
        
        // Password strength indicator
        document.getElementById('registerPassword')?.addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });
        
        console.log('🔐 Auth UI initialized');
    }

    /**
     * Check if user is authenticated, if not show auth modal
     * @param {Function} callback - Called when authentication is complete
     */
    async checkAuth(callback) {
        console.log('🔐 checkAuth called');
        console.log('  - authClient exists:', !!window.authClient);
        console.log('  - isAuthenticated:', window.authClient?.isAuthenticated);
        console.log('  - currentUser:', window.authClient?.currentUser);
        
        this.onAuthComplete = callback;
        
        if (window.authClient && window.authClient.isAuthenticated) {
            // Already authenticated
            console.log('✅ User already authenticated:', window.authClient.currentUser.username);
            if (this.onAuthComplete) this.onAuthComplete();
            return true;
        }
        
        // Show auth modal
        console.log('🔒 Showing auth modal');
        this.show();
        return false;
    }

    /**
     * Show auth modal
     */
    show() {
        console.log('👁️ Showing auth modal');
        console.log('  - authModal element:', !!this.authModal);
        this.showAuthOptions();
        if (this.authModal) {
            this.authModal.classList.add('active');
            console.log('  - Modal classes:', this.authModal.classList);
        } else {
            console.error('❌ authModal element not found!');
        }
    }

    /**
     * Hide auth modal
     */
    hide() {
        this.authModal.classList.remove('active');
        this.clearForms();
    }

    /**
     * Show authentication options
     */
    showAuthOptions() {
        this.authOptions.classList.remove('hidden');
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.add('hidden');
        this.clearErrors();
    }

    /**
     * Show login form
     */
    showLoginForm() {
        this.authOptions.classList.add('hidden');
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
        document.getElementById('loginUsername')?.focus();
    }

    /**
     * Show register form
     */
    showRegisterForm() {
        this.authOptions.classList.add('hidden');
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
        document.getElementById('registerUsername')?.focus();
    }

    /**
     * Play as guest
     */
    async playAsGuest() {
        try {
            // Generate random guest name
            const guestName = 'Guest_' + Math.random().toString(36).substring(2, 8).toUpperCase();
            
            console.log('🎮 Creating guest user:', guestName);
            await window.authClient.createGuest(guestName);
            
            // Get the actual display name from the auth client (server might have modified it)
            const actualName = window.authClient.getUserDisplayName();
            console.log('✅ Guest created with display name:', actualName);
            
            // Update player name in menu with the actual name
            this.updatePlayerNameInMenu(actualName);
            
            this.hide();
            if (this.onAuthComplete) this.onAuthComplete();
        } catch (error) {
            console.error('❌ Guest creation failed:', error);
            this.showError('loginError', 'Failed to create guest user');
        }
    }

    /**
     * Submit login
     */
    async submitLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showError('loginError', 'Please enter username and password');
            return;
        }
        
        try {
            console.log('🔄 Logging in:', username);
            await window.authClient.login({ username, password });
            
            console.log('✅ Login successful');
            this.updatePlayerNameInMenu(username);
            this.hide();
            if (this.onAuthComplete) this.onAuthComplete();
        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showError('loginError', error.message || 'Login failed');
        }
    }

    /**
     * Submit registration
     */
    async submitRegister() {
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        if (!username) {
            this.showError('registerError', 'Please enter a username');
            return;
        }
        
        if (username.length < 3 || username.length > 20) {
            this.showError('registerError', 'Username must be 3-20 characters');
            return;
        }
        
        if (!password || password.length < 8) {
            this.showError('registerError', 'Password must be at least 8 characters');
            return;
        }
        
        try {
            console.log('🔄 Registering:', username);
            await window.authClient.register({ username, password, email: email || null });
            
            console.log('✅ Registration successful');
            this.updatePlayerNameInMenu(username);
            this.hide();
            if (this.onAuthComplete) this.onAuthComplete();
        } catch (error) {
            console.error('❌ Registration failed:', error);
            this.showError('registerError', error.message || 'Registration failed');
        }
    }

    /**
     * Update Player 1 name in main menu
     */
    updatePlayerNameInMenu(username) {
        const player1NameEl = document.getElementById('player1Name');
        if (player1NameEl && username) {
            player1NameEl.textContent = username;
            // Also update gameState so it's used in all games
            if (window.gameState) {
                window.gameState.player1Name = username;
            }
            // DON'T store authenticated names in localStorage - they should be loaded from auth on each page load
            // Manual names are stored separately when user clicks the button
            console.log('✅ Updated Player 1 name to:', username);
        }
    }

    /**
     * Update password strength indicator
     */
    updatePasswordStrength(password) {
        const strengthEl = document.getElementById('passwordStrength');
        if (!strengthEl) return;
        
        let strength = 0;
        let text = '';
        let color = '';
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        if (password.length === 0) {
            strengthEl.style.display = 'none';
            return;
        }
        
        strengthEl.style.display = 'block';
        
        if (strength <= 1) {
            text = 'Weak';
            color = '#f44336';
        } else if (strength <= 3) {
            text = 'Fair';
            color = '#FF9800';
        } else if (strength <= 4) {
            text = 'Good';
            color = '#4CAF50';
        } else {
            text = 'Strong';
            color = '#2196F3';
        }
        
        strengthEl.textContent = `Password strength: ${text}`;
        strengthEl.style.color = color;
    }

    /**
     * Show error message
     */
    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    /**
     * Clear all errors and forms
     */
    clearErrors() {
        document.getElementById('loginError').textContent = '';
        document.getElementById('registerError').textContent = '';
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('registerError').style.display = 'none';
    }

    clearForms() {
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('passwordStrength').style.display = 'none';
        this.clearErrors();
    }
}

// Create global auth UI instance
window.authUI = new AuthUI();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authUI.initialize();
        
        // Update Player 1 name if user is already logged in
        if (window.authClient && window.authClient.isAuthenticated) {
            const username = window.authClient.currentUser.username;
            window.authUI.updatePlayerNameInMenu(username);
        }
    });
} else {
    window.authUI.initialize();
}

console.log('🔐 Auth UI loaded');
