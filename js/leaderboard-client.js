/**
 * Leaderboard Client for Dice Soccer
 * Handles leaderboard display and interactions
 */

class LeaderboardClient {
    constructor() {
        this.modal = null;
        this.weeklyTab = null;
        this.alltimeTab = null;
        this.weeklyContent = null;
        this.alltimeContent = null;
        this.currentTab = 'weekly';
        this.currentUserId = null;
    }

    /**
     * Initialize leaderboard client
     */
    initialize() {
        this.modal = document.getElementById('leaderboardModal');
        this.weeklyContent = document.getElementById('weeklyLeaderboard');
        this.alltimeContent = document.getElementById('alltimeLeaderboard');
        
        // Tab buttons
        const tabs = document.querySelectorAll('.leaderboard-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Buttons
        document.getElementById('viewLeaderboardBtn')?.addEventListener('click', () => this.show());
        document.getElementById('refreshLeaderboardBtn')?.addEventListener('click', () => this.refresh());
        document.getElementById('closeLeaderboardBtn')?.addEventListener('click', () => this.hide());
        
        console.log('📊 Leaderboard client initialized');
    }

    /**
     * Show leaderboard modal
     */
    async show() {
        // Get current user ID if authenticated
        if (window.authClient && window.authClient.isAuthenticated) {
            this.currentUserId = window.authClient.currentUser.userId;
        } else {
            this.currentUserId = null;
        }
        
        this.modal.classList.add('active');
        await this.loadLeaderboards();
    }

    /**
     * Hide leaderboard modal
     */
    hide() {
        this.modal.classList.remove('active');
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update content visibility
        if (tabName === 'weekly') {
            this.weeklyContent.classList.add('active');
            this.alltimeContent.classList.remove('active');
        } else {
            this.weeklyContent.classList.remove('active');
            this.alltimeContent.classList.add('active');
        }
    }

    /**
     * Refresh current leaderboard
     */
    async refresh() {
        await this.loadLeaderboards();
    }

    /**
     * Load all leaderboards
     */
    async loadLeaderboards() {
        await Promise.all([
            this.loadWeeklyLeaderboard(),
            this.loadAlltimeLeaderboard()
        ]);
    }

    /**
     * Load weekly leaderboard
     */
    async loadWeeklyLeaderboard() {
        const listEl = document.getElementById('weeklyLeaderboardList');
        listEl.innerHTML = '<div class="loading-spinner"></div><p>Loading...</p>';
        
        try {
            const leaderboard = await window.statsClient.getWeeklyLeaderboard();
            
            // Update week number
            document.getElementById('currentWeekNumber').textContent = `Week ${leaderboard.weekNumber}`;
            
            // Render leaderboard
            listEl.innerHTML = this.renderLeaderboard(leaderboard.players, true);
        } catch (error) {
            console.error('Failed to load weekly leaderboard:', error);
            listEl.innerHTML = '<p class="error-message">Failed to load leaderboard</p>';
        }
    }

    /**
     * Load all-time leaderboard
     */
    async loadAlltimeLeaderboard() {
        const listEl = document.getElementById('alltimeLeaderboardList');
        listEl.innerHTML = '<div class="loading-spinner"></div><p>Loading...</p>';
        
        try {
            const leaderboard = await window.statsClient.getAllTimeLeaderboard();
            
            // Render leaderboard
            listEl.innerHTML = this.renderLeaderboard(leaderboard.players, false);
        } catch (error) {
            console.error('Failed to load all-time leaderboard:', error);
            listEl.innerHTML = '<p class="error-message">Failed to load leaderboard</p>';
        }
    }

    /**
     * Render leaderboard entries
     */
    renderLeaderboard(players, isWeekly) {
        if (!players || players.length === 0) {
            return '<p class="no-data-message">No players yet. Be the first!</p>';
        }
        
        let html = '<div class="leaderboard-table">';
        
        // Header
        html += '<div class="leaderboard-row header">';
        html += '<div class="rank-col">Rank</div>';
        html += '<div class="player-col">Player</div>';
        if (isWeekly) {
            html += '<div class="elo-col">ELO</div>';
        }
        html += '<div class="games-col">Games</div>';
        html += '<div class="record-col">W-L-D</div>';
        html += '<div class="winrate-col">Win%</div>';
        if (!isWeekly) {
            html += '<div class="goals-col">Goal Diff</div>';
        }
        html += '</div>';
        
        // Players
        players.forEach(player => {
            const isCurrentUser = this.currentUserId && player.user_id === this.currentUserId;
            const rowClass = isCurrentUser ? 'leaderboard-row current-user' : 'leaderboard-row';
            
            html += `<div class="${rowClass}">`;
            html += `<div class="rank-col">${this.getRankBadge(player.rank)}</div>`;
            html += `<div class="player-col">${this.escapeHtml(player.username)}</div>`;
            
            if (isWeekly) {
                html += `<div class="elo-col">${player.elo_rating}</div>`;
            }
            
            html += `<div class="games-col">${player.games_played}</div>`;
            html += `<div class="record-col">${player.wins}-${player.losses}-${player.draws}</div>`;
            html += `<div class="winrate-col">${player.win_rate}%</div>`;
            
            if (!isWeekly) {
                const goalDiff = player.goal_difference || 0;
                const diffClass = goalDiff > 0 ? 'positive' : (goalDiff < 0 ? 'negative' : '');
                html += `<div class="goals-col ${diffClass}">${goalDiff > 0 ? '+' : ''}${goalDiff}</div>`;
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    }

    /**
     * Get rank badge HTML
     */
    getRankBadge(rank) {
        if (rank === 1) {
            return `<span class="rank-badge gold">🥇</span>`;
        } else if (rank === 2) {
            return `<span class="rank-badge silver">🥈</span>`;
        } else if (rank === 3) {
            return `<span class="rank-badge bronze">🥉</span>`;
        } else {
            return `<span class="rank-number">${rank}</span>`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global leaderboard client instance
window.leaderboardClient = new LeaderboardClient();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.leaderboardClient.initialize();
    });
} else {
    window.leaderboardClient.initialize();
}

console.log('🏆 Leaderboard client loaded');
