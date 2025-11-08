// Main application logic and UI interactions
const APP_VERSION = '2.0.2';

// Global config
let appConfig = {
    'debug-mode': false,
    'log-enabled': false
};


// Debug logging helper
function debugLog(...args) {
    if (appConfig['debug-mode']) {
        console.log(...args);
    }
}

// Initialize multiplayer manager
let multiplayerManager = null;

// Load config and initialize
(async function initializeApp() {
    try {
        const response = await fetch('config.json');
        appConfig = await response.json();
        debugLog('🎮 App config loaded:', appConfig);
        
        // Initialize WebSocket multiplayer manager
        if (typeof WebSocketMultiplayerManager !== 'undefined') {
            multiplayerManager = new WebSocketMultiplayerManager();
            window.multiplayerManager = multiplayerManager;
            debugLog('✅ WebSocket multiplayer manager initialized');
        } else {
            console.error('❌ WebSocketMultiplayerManager not found!');
        }
    } catch (error) {
        console.error('Failed to load config:', error);
        // Use defaults
        if (typeof WebSocketMultiplayerManager !== 'undefined') {
            multiplayerManager = new WebSocketMultiplayerManager();
            window.multiplayerManager = multiplayerManager;
        }
    }
})();

// Wake Lock API to prevent screen sleep
let wakeLock = null;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').then(reg => {
    // Check for updates every 60 seconds
    setInterval(() => {
      reg.update();
    }, 60000);
    
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          debugLog('New version available, reloading in 1 second...');
          // Delay slightly to ensure service worker is fully activated
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      });
    });
  });
  
  // Listen for messages from the service worker
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'SW_UPDATED') {
      debugLog('Service Worker updated to version:', event.data.version);
      // Reload the page to use the new version
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  });
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            debugLog('Wake Lock acquired - screen will stay on');
            
            wakeLock.addEventListener('release', () => {
                debugLog('Wake Lock released');
            });
        }
    } catch (err) {
        console.error('Wake Lock request failed:', err);
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
        } catch (err) {
            console.error('Wake Lock release failed:', err);
        }
    }
}

// Handle orientation changes during gameplay
function handleGameplayOrientationChange() {
    // Only handle if game screen is active
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen || !gameScreen.classList.contains('active')) {
        return;
    }
    
    // Detect current physical orientation
    const isLandscape = window.innerWidth > window.innerHeight;
    const newOrientation = isLandscape ? 'landscape' : 'portrait';
    
    // If orientation changed during gameplay, update the game board
    if (gameState.orientation !== newOrientation) {
        gameState.orientation = newOrientation;
        
        // Update the game screen layout
        updateGameScreenOrientation(newOrientation);
        
        // Re-render the board with current game state if game is active
        if (currentGame) {
            currentGame.renderBoard();
            
            // Spectators should never see highlights
            if (gameState.gameMode === 'spectator') {
                return;
            }
            
            // Redraw hints if dice was rolled and hints are enabled
            if (currentGame.waitingForMove && gameState.hintsEnabled && currentGame.diceValue > 0) {
                // In multiplayer, only highlight if it's the local player's turn
                const isMultiplayer = gameState.gameMode === 'multiplayer';
                const isLocalPlayerTurn = !isMultiplayer || 
                    (multiplayerManager && currentGame.currentPlayer === multiplayerManager.localPlayer);
                
                if (!isLocalPlayerTurn) {
                    // Not our turn in multiplayer - don't highlight anything
                    return;
                }
                
                // If a player is selected, show their valid moves
                if (currentGame.selectedPlayer) {
                    currentGame.highlightValidMoves(currentGame.selectedPlayer.row, currentGame.selectedPlayer.col);
                } else {
                    // Show all movable players
                    const movablePlayers = currentGame.getMovablePlayers(currentGame.diceValue);
                    if (movablePlayers.length === 0) {
                        const allMovable = currentGame.getAllMovablePlayers();
                        allMovable.forEach(pos => currentGame.highlightCell(pos.row, pos.col, 'movable'));
                    } else {
                        movablePlayers.forEach(pos => currentGame.highlightCell(pos.row, pos.col, 'movable'));
                    }
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Prevent context menu on right-click and long-press
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    setViewportHeight();
    
    // Load configuration first, then initialize
    window.configManager.loadConfig().then(() => {
        window.gameLogger.initialize().then(() => {
            // Initialize authentication client
            if (window.authClient) {
                window.authClient.initialize().then(() => {
                    // Initialize stats client after auth
                    if (window.statsClient && window.authClient.socket) {
                        window.statsClient.initialize(window.authClient.socket);
                    }
                });
            }
            
            initializeApp();
        });
    });
    
    registerServiceWorker();
    
    // Request wake lock to keep screen on
    requestWakeLock();
    
    // Handle browser back button for PWA
    setupBackButtonHandler();
});

// Handle Escape key to close modals and submenus
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
        // First, check for any active modal and close it
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            closeModal(activeModal.id);
            return;
        }
        
        // If no modal is open, check for any active submenu and close it
        const activeSubmenu = document.querySelector('.submenu.active');
        if (activeSubmenu) {
            activeSubmenu.classList.remove('active');
        }
    }
});

// Handle browser back button for PWA
function setupBackButtonHandler() {
    // Push a dummy state to history when app loads
    window.history.pushState({ page: 'game' }, '', '');
    
    // Listen for back button
    window.addEventListener('popstate', async (event) => {
        // Push state back immediately to prevent actual navigation
        window.history.pushState({ page: 'game' }, '', '');
        
        // Check if we're in an active game
        const gameScreen = document.getElementById('gameScreen');
        const isInGame = gameScreen && gameScreen.classList.contains('active');
        
        if (isInGame && currentGame) {
            const backToMenuBtn = document.getElementById('backToMenuBtn');
            
            // Check if menu is already expanded
            const isMenuExpanded = backToMenuBtn && !backToMenuBtn.classList.contains('collapsed');
            
            if (isMenuExpanded) {
                // Second back press while menu is expanded - go back to menu
                await handleBackToMenu();
            } else {
                // First back press - expand the menu
                if (backToMenuBtn) {
                    backToMenuBtn.classList.remove('collapsed');
                    
                    // Update rotation based on current player
                    if (window.updateMenuRotation) {
                        window.updateMenuRotation();
                    }
                    
                    // Auto-collapse after 3 seconds
                    setTimeout(() => {
                        backToMenuBtn.classList.add('collapsed');
                    }, 3000);
                    
                    // Play a sound to indicate the action
                    soundManager.play('pop');
                }
            }
        } else {
            // Not in game - allow back button to close app (do nothing, let browser handle)
            // But keep the history state to maintain consistency
        }
    });
}

// Helper function to handle returning to menu (shared by button click and back press)
async function handleBackToMenu() {
    // Log abandoned game if there's an active log
    if (window.gameLogger && window.gameLogger.logId && currentGame) {
        // Only log if game hasn't completed yet (check if winner modal is not active)
        const winnerModal = document.getElementById('winnerModal');
        const isGameCompleted = winnerModal && winnerModal.classList.contains('active');
        
        if (!isGameCompleted) {
            const player1Name = gameState.player1Name || 'Player 1';
            let player2Name = gameState.player2Name || 'Player 2';
            
            if (gameState.gameMode === 'ai') {
                const difficulty = gameState.aiDifficulty || 'Medium';
                player2Name = `AI (${difficulty})`;
            }
            
            await window.gameLogger.endGameLog(
                'None',
                currentGame.player1Score || 0,
                currentGame.player2Score || 0,
                currentGame.player1Moves || 0,
                currentGame.player2Moves || 0,
                currentGame.player1ThinkingTime || 0,
                currentGame.player2ThinkingTime || 0,
                Date.now() - currentGame.gameStartTime,
                'Abandoned (Returned to Menu)'
            );
        }
    }
    
    // Track if this was a multiplayer game or spectator mode
    const wasMultiplayer = gameState.gameMode === 'multiplayer';
    const wasSpectator = gameState.gameMode === 'spectator';
    
    // Leave spectator mode properly if active
    if (wasSpectator && multiplayerManager) {
        await exitSpectatorMode();
        return; // exitSpectatorMode handles the transition back to lobby
    }
    
    // Leave multiplayer game if active
    if (wasMultiplayer && multiplayerManager) {
        await multiplayerManager.leaveGame();
    }
    
    // Restore original player 2 name if it was changed for multiplayer
    if (gameState.originalPlayer2Name) {
        gameState.player2Name = gameState.originalPlayer2Name;
        gameState.originalPlayer2Name = null;
    }
    
    // Properly cleanup the game
    if (currentGame) {
        // Stop all sounds
        soundManager.stopAll();
        
        // Call game cleanup to stop all timers and reset state
        currentGame.cleanup();
        
        // Clear the board grid
        const fieldGrid = document.getElementById('fieldGrid');
        if (fieldGrid) {
            while (fieldGrid.firstChild) {
                fieldGrid.removeChild(fieldGrid.firstChild);
            }
        }
        
        // Reset game reference
        currentGame = null;
    }
    
    // Close any open modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Clear multiplayer colors
    gameState.clearMultiplayerColors();
    
    // Return to lobby if this was a multiplayer game, otherwise main menu
    if (wasMultiplayer) {
        showScreen('mainMenu');
        // Open lobby after a short delay
        setTimeout(() => {
            openLobby();
        }, 100);
    } else {
        showScreen('mainMenu');
    }
}

// Re-acquire wake lock when page becomes visible again (e.g., after switching tabs)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

// Handle viewport height for mobile browsers (fixes address bar issues)
function setViewportHeight() {
    const setHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setHeight();
    window.addEventListener('resize', () => {
        setHeight();
        // Auto-detect orientation on resize (more reliable than orientationchange)
        handleAutoOrientationDetection();
        // Handle orientation changes during gameplay
        handleGameplayOrientationChange();
    });
    window.addEventListener('orientationchange', () => {
        // Wait longer for dimensions to update after orientation change
        setTimeout(() => {
            setHeight();
            handleAutoOrientationDetection();
            // Handle orientation changes during gameplay
            handleGameplayOrientationChange();
        }, 300);
    });
}

// Auto-detect device orientation and update menu accordingly
function handleAutoOrientationDetection() {
    // Safety check: ensure gameState is initialized
    if (typeof gameState === 'undefined') {
        return;
    }
    
    // Only auto-detect when main menu is active (not during gameplay)
    const mainMenu = document.getElementById('mainMenu');
    if (!mainMenu.classList.contains('active')) {
        return; // Don't change orientation during gameplay
    }
    
    // Detect current device orientation
    const isLandscape = window.innerWidth > window.innerHeight;
    const newOrientation = isLandscape ? 'landscape' : 'portrait';
    
    debugLog('Auto-detect orientation:', {
        width: window.innerWidth,
        height: window.innerHeight,
        isLandscape: isLandscape,
        newOrientation: newOrientation,
        currentOrientation: gameState.orientation
    });
    
    // Update orientation setting if different
    if (gameState.orientation !== newOrientation) {
        gameState.orientation = newOrientation;
        localStorage.setItem('dicesoccer_orientation', newOrientation);
        updateOrientationDisplay(newOrientation);
    }
}

// Register service worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                debugLog('Service Worker registered:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

function initializeApp() {
    // Apply translations
    translationManager.updateUI();
    
    // Display version number
    const versionElement = document.getElementById('versionInfo');
    if (versionElement) {
        versionElement.textContent = `v${APP_VERSION}`;
    }

    // Load saved player names
    document.getElementById('player1Name').textContent = gameState.player1Name;
    document.getElementById('player2Name').textContent = gameState.player2Name;

    // Update shirt icons
    updateShirtIcon(1, gameState.player1Shirt);
    updateShirtIcon(2, gameState.player2Shirt);

    // Set sound toggle
    document.getElementById('soundCheckbox').checked = gameState.soundEnabled;
    updateSoundIcon(gameState.soundEnabled);
    
    // Set Fast AI toggle
    document.getElementById('fastAICheckbox').checked = gameState.fastAI;
    
    // Set Auto Dice toggle
    document.getElementById('autoDiceCheckbox').checked = gameState.autoDice;
    
    // Initialize custom language dropdown with current language
    initializeLanguageDropdown();

    // Set two player mode toggle
    document.getElementById('twoPlayerCheckbox').checked = gameState.twoPlayerMode;
    updatePlayer2UI(gameState.twoPlayerMode);
    
    // Set initial difficulty selection in submenu
    document.querySelectorAll('#difficultySubmenu .submenu-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-difficulty') === gameState.difficulty);
    });

    // Use early detected orientation from sessionStorage (set in head script)
    const initialOrientation = sessionStorage.getItem('initialOrientation');
    const isLandscape = window.innerWidth > window.innerHeight;
    const detectedOrientation = initialOrientation || (isLandscape ? 'landscape' : 'portrait');
    
    // Use detected orientation and apply immediately to prevent visual jump
    gameState.orientation = detectedOrientation;
    localStorage.setItem('dicesoccer_orientation', detectedOrientation);
    
    // Apply orientation classes immediately without animation
    const menuContainer = document.getElementById('menuContainer');
    if (detectedOrientation === 'landscape') {
        menuContainer.classList.add('horizontal-menu');
        menuContainer.classList.remove('vertical-menu');
    } else {
        menuContainer.classList.add('vertical-menu');
        menuContainer.classList.remove('horizontal-menu');
    }
    
    // Update the orientation display value
    const orientationValue = document.getElementById('orientationValue');
    orientationValue.setAttribute('data-translate-value', detectedOrientation);
    orientationValue.textContent = translationManager.get(detectedOrientation);

    // Set up event listeners
    debugLog('Setting up event listeners...');
    setupEventListeners();
    debugLog('Event listeners set up successfully');

    // Initialize shirt modal
    initializeShirtModal();
    debugLog('App initialized successfully');
}

// Initialize custom language dropdown
function initializeLanguageDropdown() {    
    const dropdown = document.getElementById('languageDropdown');
    const trigger = dropdown.querySelector('.custom-select-trigger');
    const options = dropdown.querySelectorAll('.custom-option');
    const currentLang = translationManager.getCurrentLanguage();
    
    // Set initial selected language
    options.forEach(option => {
        const value = option.getAttribute('data-value');
        if (value === currentLang) {
            const flag = option.getAttribute('data-flag');
            const text = option.querySelector('span').textContent;
            trigger.querySelector('.flag-icon').src = `images/${flag}`;
            trigger.querySelector('span').textContent = text;
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = dropdown.classList.contains('open');
        dropdown.classList.toggle('open');
        
        // Determine if dropdown should open upward
        if (!wasOpen) {
            const optionsElement = dropdown.querySelector('.custom-select-options');
            const triggerRect = trigger.getBoundingClientRect();
            const modalRect = dropdown.closest('.submenu').getBoundingClientRect();
            const spaceBelow = modalRect.bottom - triggerRect.bottom;
            const spaceAbove = triggerRect.top - modalRect.top;
            const dropdownHeight = Math.min(200, window.innerHeight * 0.3);
            
            // Open upward if not enough space below but more space above
            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                dropdown.classList.add('open-upward');
            } else {
                dropdown.classList.remove('open-upward');
            }
        }
    });
    
    // Handle option selection
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.getAttribute('data-value');
            const flag = option.getAttribute('data-flag');
            const text = option.querySelector('span').textContent;
            
            // Update trigger display
            trigger.querySelector('.flag-icon').src = `images/${flag}`;
            trigger.querySelector('span').textContent = text;
            
            // Update selected state
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Close dropdown
            dropdown.classList.remove('open');
            dropdown.classList.remove('open-upward');
            
            // Change language
            translationManager.setLanguage(value);
            updateOrientationDisplay(gameState.orientation);
            updatePlayer2UI(gameState.twoPlayerMode);
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            dropdown.classList.remove('open-upward');
        }
    });
}

function setupEventListeners() {
    debugLog('setupEventListeners called');
    
    // New Game button
    document.getElementById('newGameBtn').addEventListener('click', () => {
        // Show hints selection modal
        showHintsModal('new');
    });

    // Two Player toggle
    document.getElementById('twoPlayerCheckbox').addEventListener('change', (e) => {
        gameState.setTwoPlayerMode(e.target.checked);
        updatePlayer2UI(e.target.checked);
    });

    // Player 1 Container - opens name modal when clicked
    document.getElementById('player1Container')?.addEventListener('click', (e) => {
        const target = e.target;
        
        // Check if clicking on shirt icon (for color selection)
        if (target && target.classList && target.classList.contains('shirt-icon')) {
            return; // Let the shirt icon handler below handle this
        }
        
        // If clicking on name input or container, open name modal
        openPlayerNameModal(1);
    });

    // Player 2 Container - shows name modal in 2P mode or difficulty submenu in AI mode
    try {
        document.getElementById('player2Container').addEventListener('click', (e) => {
            const target = e.target;
            
            // Check if clicking on shirt icon (for color selection)
            if (target && target.classList && target.classList.contains('shirt-icon')) {
                return; // Let the shirt icon handler below handle this
            }
            
            // If in two-player mode, open name modal
            if (gameState.twoPlayerMode) {
                openPlayerNameModal(2);
            } else {
                // In AI mode, open difficulty submenu
                toggleSubmenu('difficultySubmenu');
            }
        });
    } catch (error) {
        console.error('Error setting up player2Container listener:', error);
    }

    // Orientation
    document.getElementById('orientationItem').addEventListener('click', () => {
        toggleSubmenu('orientationSubmenu');
    });

    document.querySelectorAll('#orientationSubmenu .submenu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const orientation = e.currentTarget.getAttribute('data-orientation');
            gameState.orientation = orientation;
            localStorage.setItem('dicesoccer_orientation', orientation);
            updateOrientationDisplay(orientation);
            toggleSubmenu('orientationSubmenu', false);
        });
    });

    // Hints modal buttons
    document.getElementById('hintsOnBtn').addEventListener('click', () => {
        handleHintsSelection(true);
    });

    document.getElementById('hintsOffBtn').addEventListener('click', () => {
        handleHintsSelection(false);
    });

    // Difficulty options (for AI)
    document.querySelectorAll('#difficultySubmenu .submenu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const difficulty = e.currentTarget.getAttribute('data-difficulty');
            gameState.setDifficulty(difficulty);
            updatePlayer2UI(gameState.twoPlayerMode); // Update AI difficulty label
            
            // Update selected state in submenu
            document.querySelectorAll('#difficultySubmenu .submenu-option').forEach(opt => {
                opt.classList.toggle('selected', opt.getAttribute('data-difficulty') === difficulty);
            });
            
            toggleSubmenu('difficultySubmenu', false);
        });
    });

    // Player name inputs (readonly - names are changed via modal)
    // Removed input event listeners since inputs are now readonly

    // Shirt selection
    document.getElementById('player1Shirt').addEventListener('click', () => {
        openShirtModal(1);
    });

    document.getElementById('player2Shirt').addEventListener('click', () => {
        openShirtModal(2);
    });

    // Multiplayer lobby
    document.getElementById('multiplayerBtn').addEventListener('click', () => {
        openLobby();
    });

    // Settings menu
    document.getElementById('settingsItem').addEventListener('click', () => {
        toggleSubmenu('settingsSubmenu');
    });

    // Close settings button
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        toggleSubmenu('settingsSubmenu', false);
    });
        
    // Fast AI toggle
    document.getElementById('fastAICheckbox').addEventListener('change', (e) => {
        gameState.setFastAI(e.target.checked);
    });
    
    // Auto Dice toggle
    document.getElementById('autoDiceCheckbox').addEventListener('change', (e) => {
        gameState.setAutoDice(e.target.checked);
    });

    // Sound toggle
    document.getElementById('soundCheckbox').addEventListener('change', (e) => {
        const enabled = gameState.toggleSound();
        updateSoundIcon(enabled);
        if (enabled) {
            soundManager.play('pop');
        }
    });

    // Modal close buttons
    document.getElementById('closeShirtModal')?.addEventListener('click', () => {
        closeModal('shirtModal');
    });
    
    // Player name modal buttons
    document.getElementById('savePlayerNameBtn')?.addEventListener('click', () => {
        savePlayerName();
    });
    
    document.getElementById('cancelPlayerNameBtn')?.addEventListener('click', () => {
        closeModal('playerNameModal');
    });
    
    // Allow Enter key to save player name
    document.getElementById('playerNameInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            savePlayerName();
        }
    });
    
    // Lobby modal handlers
    document.getElementById('refreshLobbyBtn')?.addEventListener('click', async () => {
        await refreshLobby();
    });

    document.getElementById('closeLobbyBtn')?.addEventListener('click', () => {
        closeLobby();
    });

    // Spectate modal handlers
    document.getElementById('confirmSpectateBtn')?.addEventListener('click', () => {
        if (window.spectateGameInfo) {
            startSpectating(window.spectateGameInfo);
        }
    });

    document.getElementById('cancelSpectateBtn')?.addEventListener('click', () => {
        closeModal('spectateModal');
        openModal('lobbyModal');
    });

    // Challenge modal handlers
    document.getElementById('cancelChallengeBtn')?.addEventListener('click', () => {
        cancelChallenge();
    });

    document.getElementById('acceptChallengeBtn')?.addEventListener('click', () => {
        acceptChallenge();
    });

    document.getElementById('declineChallengeBtn')?.addEventListener('click', () => {
        declineChallenge();
    });

    // Connection modal handlers
    document.getElementById('cancelConnectionBtn')?.addEventListener('click', () => {
        connectionModalCancelled = true;
        multiplayerManager.disconnect();
        closeModal('connectionModal');
    });

    document.getElementById('okConnectionBtn')?.addEventListener('click', () => {
        closeModal('connectionModal');
    });

    // Back to menu - expandable square
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    let collapseTimeout = null;
    
    // Global function to collapse menu (called from game actions)
    window.collapseMenuButton = function() {
        const isExpanded = backToMenuBtn && !backToMenuBtn.classList.contains('collapsed');
        if (isExpanded && collapseTimeout) {
            clearTimeout(collapseTimeout);
            backToMenuBtn.classList.add('collapsed');
        }
    };
    
    // Global function to update menu rotation based on current player
    window.updateMenuRotation = function() {
        if (!currentGame) return;
        
        // In 2-player mode, rotate toward Player 2 when it's their turn but only in portrait mode
        if (gameState.twoPlayerMode && currentGame.currentPlayer === 2 && gameState.orientation === 'portrait') {
            backToMenuBtn.style.transform = 'rotate(180deg)';
        } else {
            backToMenuBtn.style.transform = 'rotate(0deg)';
        }
    };
    
    backToMenuBtn.addEventListener('click', async (e) => {
        // Check if button is currently expanded (checking at click time)
        const isExpanded = !backToMenuBtn.classList.contains('collapsed');
        
        if (!isExpanded) {
            // First click: expand the menu
            backToMenuBtn.classList.remove('collapsed');
            
            // Update rotation based on current player
            updateMenuRotation();
            
            // Auto-collapse after 3 seconds
            collapseTimeout = setTimeout(() => {
                backToMenuBtn.classList.add('collapsed');
            }, 3000);
        } else {
            // Menu is expanded - clicking on text goes back to menu
            clearTimeout(collapseTimeout);
            
            // Reset menu state
            backToMenuBtn.classList.add('collapsed');
            
            // Go back to menu using shared function
            await handleBackToMenu();
        }
    });

    // Goal modal continue button
    document.getElementById('continueGameBtn').addEventListener('click', () => {
        if (currentGame) {
            // stop all sounds (cheering))
            soundManager.stopAll();
            currentGame.continueAfterGoal();
        }
    });

    // View Board buttons - minimize/maximize modals
    document.getElementById('viewBoardFromGoal').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const modal = document.getElementById('goalModal');
        const button = e.target;
        
        if (modal.classList.contains('minimized')) {
            // Restore modal
            modal.classList.remove('minimized');
            button.textContent = translationManager.get('viewBoard');
        } else {
            // Minimize modal
            modal.classList.add('minimized');
            // Add text indicator for minimized state
            const modalContent = modal.querySelector('.modal-content');
            let minimizeText = modalContent.querySelector('.modal-minimize-text');
            if (!minimizeText) {
                minimizeText = document.createElement('div');
                minimizeText.className = 'modal-minimize-text';
                modalContent.appendChild(minimizeText);
            }
            minimizeText.textContent = translationManager.get('goal') + ' - ' + translationManager.get('continue');
        }
    });

    document.getElementById('viewBoardFromWinner').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const modal = document.getElementById('winnerModal');
        const button = e.target;
        
        if (modal.classList.contains('minimized')) {
            // Restore modal
            modal.classList.remove('minimized');
            button.textContent = translationManager.get('viewBoard');
        } else {
            // Minimize modal
            modal.classList.add('minimized');
            // Add text indicator for minimized state
            const modalContent = modal.querySelector('.modal-content');
            let minimizeText = modalContent.querySelector('.modal-minimize-text');
            if (!minimizeText) {
                minimizeText = document.createElement('div');
                minimizeText.className = 'modal-minimize-text';
                modalContent.appendChild(minimizeText);
            }
            minimizeText.textContent = translationManager.get('statistics');
        }
    });

    // Click on minimized modal to restore it
    document.getElementById('goalModal').addEventListener('click', (e) => {
        const modal = e.currentTarget;
        if (modal.classList.contains('minimized')) {
            modal.classList.remove('minimized');
            const button = document.getElementById('viewBoardFromGoal');
            if (button) {
                button.textContent = translationManager.get('viewBoard');
            }
        }
    });

    document.getElementById('winnerModal').addEventListener('click', (e) => {
        const modal = e.currentTarget;
        if (modal.classList.contains('minimized')) {
            modal.classList.remove('minimized');
            const button = document.getElementById('viewBoardFromWinner');
            if (button) {
                button.textContent = translationManager.get('viewBoard');
            }
        }
    });

    // Winner modal buttons
    document.getElementById('continueFromWinner').addEventListener('click', () => {
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && currentGame) {
            // Set local ready state
            currentGame.localPlayerReady = true;
            
            // Send ready event to opponent
            multiplayerManager.sendEvent({
                type: 'winnerContinue'
            });
            
            // Update button to show waiting state
            const continueBtn = document.getElementById('continueFromWinner');
            continueBtn.textContent = translationManager.get('waitingForOpponent') || 'Waiting for opponent...';
            continueBtn.disabled = true;
            
            // If opponent is also ready, start new game
            if (currentGame.opponentPlayerReady) {
                currentGame.bothPlayersReadyFromWinner();
            }
        }
    });
    
    document.getElementById('newGameFromWinner').addEventListener('click', () => {
        // In multiplayer, coordinate with opponent (like Continue button)
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && currentGame) {
            // Set local ready state
            currentGame.localPlayerReady = true;
            
            // Send ready event to opponent
            multiplayerManager.sendEvent({
                type: 'winnerContinue'
            });
            
            // Update button to show waiting state
            const newGameBtn = document.getElementById('newGameFromWinner');
            newGameBtn.textContent = translationManager.get('waitingForOpponent') || 'Waiting for opponent...';
            newGameBtn.disabled = true;
            
            // If opponent is also ready, start new game
            if (currentGame.opponentPlayerReady) {
                currentGame.bothPlayersReadyFromWinner();
            }
        } else {
            // Local or AI game - just start new game immediately
            closeModal('winnerModal');
            soundManager.stopAll();
            startNewGame();
        }
    });

    document.getElementById('backToMenuFromWinner').addEventListener('click', async () => {
        // stop all sounds (cheering))
        soundManager.stopAll();

        closeModal('winnerModal');
        
        // Track if this was multiplayer
        const wasMultiplayer = gameState.gameMode === 'multiplayer';
        
        // Leave multiplayer game if active
        if (wasMultiplayer && multiplayerManager) {
            await multiplayerManager.leaveGame();
        }
        
        // Restore original player 2 name if it was changed for multiplayer
        if (gameState.originalPlayer2Name) {
            gameState.player2Name = gameState.originalPlayer2Name;
            gameState.originalPlayer2Name = null;
        }
        
        // Clear multiplayer colors
        gameState.clearMultiplayerColors();
        
        // Properly cleanup the game
        if (currentGame) {
            // Stop all sounds
            soundManager.stopAll();
            
            // Call game cleanup to stop all timers and reset state
            currentGame.cleanup();
            
            // Clear the board grid
            const fieldGrid = document.getElementById('fieldGrid');
            if (fieldGrid) {
                while (fieldGrid.firstChild) {
                    fieldGrid.removeChild(fieldGrid.firstChild);
                }
            }
            
            // Reset game reference
            currentGame = null;
        }
        
        showScreen('mainMenu');
        
        // Return to lobby if this was multiplayer
        if (wasMultiplayer) {
            setTimeout(() => {
                openLobby();
            }, 100);
        }
    });

    // Close modals on outside click (except lobbyModal which has a close button)
    document.querySelectorAll('.modal').forEach(modal => {
        if (modal.id === 'lobbyModal') return; // Lobby modal should only close via close button
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Update Player 2 UI for AI/2-player mode
function updatePlayer2UI(twoPlayerMode) {
    const player2Name = document.getElementById('player2Name');
    const aiLabel = document.getElementById('aiDifficultyLabel');
    const player2Container = document.getElementById('player2Container');
    
    if (twoPlayerMode) {
        // Two-player mode: show player name display
        player2Name.classList.remove('hidden');
        aiLabel.classList.add('hidden');
        player2Container.classList.remove('expandable');
    } else {
        // AI mode: show AI label and make clickable
        player2Name.classList.add('hidden');
        aiLabel.classList.remove('hidden');
        aiLabel.textContent = `AI (${translationManager.get(gameState.difficulty)})`;
        player2Container.classList.add('expandable');
        player2Container.style.cursor = 'pointer';
    }
}

// Update orientation display
function updateOrientationDisplay(orientation) {
    const orientationValue = document.getElementById('orientationValue');
    orientationValue.setAttribute('data-translate-value', orientation);
    orientationValue.textContent = translationManager.get(orientation);

    // Translate submenu options
    document.querySelectorAll('#orientationSubmenu .submenu-option').forEach(option => {
        const key = option.getAttribute('data-orientation');
        option.querySelector('span').textContent = translationManager.get(key);
    });

    // Update menu layout
    const menuContainer = document.querySelector('.menu-container');
    if (orientation === 'landscape') {
        menuContainer.classList.add('horizontal-menu');
        menuContainer.classList.remove('vertical-menu');
    } else {
        menuContainer.classList.add('vertical-menu');
        menuContainer.classList.remove('horizontal-menu');
    }
}

// Update game screen orientation
function updateGameScreenOrientation(orientation) {
    const gameScreen = document.getElementById('gameScreen');
    if (orientation === 'landscape') {
        gameScreen.classList.add('horizontal-game');
        gameScreen.classList.remove('vertical-game');
        document.body.classList.add('landscape-stripes');
    } else {
        gameScreen.classList.add('vertical-game');
        gameScreen.classList.remove('horizontal-game');
        document.body.classList.remove('landscape-stripes');
    }
    
    // Add game mode class for conditional styling
    gameScreen.classList.remove('local-game', 'ai-game', 'multiplayer-game');
    if (gameState.gameMode === 'local') {
        gameScreen.classList.add('local-game');
    } else if (gameState.gameMode === 'ai') {
        gameScreen.classList.add('ai-game');
    } else if (gameState.gameMode === 'multiplayer') {
        gameScreen.classList.add('multiplayer-game');
    }
}

function toggleSubmenu(submenuId, show = null) {
    const submenu = document.getElementById(submenuId);
    if (show === null) {
        submenu.classList.toggle('active');
    } else {
        submenu.classList.toggle('active', show);
    }
    
    // Add click listener to close when clicking outside (except for settingsSubmenu which has a close button)
    if (submenu.classList.contains('active') && submenuId !== 'settingsSubmenu') {
        setTimeout(() => {
            const closeOnClickOutside = (e) => {
                if (!submenu.contains(e.target) && !e.target.closest('.menu-item')) {
                    submenu.classList.remove('active');
                    document.removeEventListener('click', closeOnClickOutside);
                }
            };
            document.addEventListener('click', closeOnClickOutside);
        }, 10);
    }
}

function updateSoundIcon(enabled) {
    const soundIcon = document.getElementById('soundIcon');
    soundIcon.src = enabled ? 'images/soundon128.png' : 'images/soundoff128.png';
}

function updateShirtIcon(player, color) {
    const shirtIcon = document.getElementById(`player${player}Shirt`);
    shirtIcon.src = getShirtImage(color, 1);
}

// Shirt modal
let currentShirtPlayer = 1;

function initializeShirtModal() {
    const shirtGrid = document.getElementById('shirtGrid');
    shirtGrid.innerHTML = '';
    
    shirtColors.forEach(color => {
        const option = document.createElement('div');
        option.className = 'shirt-option';
        option.setAttribute('data-color', color);
        
        const img = document.createElement('img');
        img.src = getShirtImage(color, 1);
        img.alt = color;
        
        const span = document.createElement('span');
        span.setAttribute('data-translate', color);
        span.textContent = translationManager.get(color);
        
        option.appendChild(img);
        option.appendChild(span);
        
        option.addEventListener('click', () => {
            selectShirt(color);
        });
        
        shirtGrid.appendChild(option);
    });
}

function openShirtModal(player) {
    currentShirtPlayer = player;
    
    // Get the other player's shirt color
    const otherPlayer = player === 1 ? 2 : 1;
    const otherPlayerShirt = player === 1 ? gameState.player2Shirt : gameState.player1Shirt;
    
    // Update shirt options to disable the other player's color
    document.querySelectorAll('.shirt-option').forEach(option => {
        const color = option.getAttribute('data-color');
        if (color === otherPlayerShirt) {
            option.classList.add('disabled');
            option.style.opacity = '0.3';
            option.style.cursor = 'not-allowed';
            option.style.pointerEvents = 'none';
        } else {
            option.classList.remove('disabled');
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
            option.style.pointerEvents = 'auto';
        }
    });
    
    openModal('shirtModal');
}

function selectShirt(color) {
    gameState.setPlayerShirt(currentShirtPlayer, color);
    updateShirtIcon(currentShirtPlayer, color);
    closeModal('shirtModal');
}

// Player name modal functions
let currentNamePlayer = null;

function openPlayerNameModal(player) {
    currentNamePlayer = player;
    const input = document.getElementById('playerNameInput');
    const title = document.getElementById('playerNameModalTitle');
    
    // Set current name as default value
    if (player === 1) {
        input.value = gameState.player1Name || '';
        input.placeholder = translationManager.get('player1');
    } else {
        input.value = gameState.player2Name || '';
        input.placeholder = translationManager.get('player2');
    }
    
    // Update title
    title.textContent = translationManager.get('enterPlayerName');
    
    openModal('playerNameModal');
    
    // Focus input and position cursor at end (not select all)
    setTimeout(() => {
        input.focus();
        // Move cursor to end of text
        const length = input.value.length;
        input.setSelectionRange(length, length);
    }, 100);
}

function savePlayerName() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();
    
    if (currentNamePlayer) {
        gameState.setPlayerName(currentNamePlayer, name);
        document.getElementById(`player${currentNamePlayer}Name`).textContent = name || translationManager.get(`player${currentNamePlayer}`);
    }
    
    closeModal('playerNameModal');
}

// Hints selection modal functions
let hintsModalMode = null; // 'new' for new game, 'host' for multiplayer

function showHintsModal(mode) {
    hintsModalMode = mode;
    openModal('hintsModal');
}

function handleHintsSelection(hintsEnabled) {
    gameState.hintsEnabled = hintsEnabled;
    localStorage.setItem('dicesoccer_hints', hintsEnabled ? 'on' : 'off');
    closeModal('hintsModal');
    
    // Continue with the original action
    if (hintsModalMode === 'new') {
        // Play start sound
        soundManager.play('whistle');
        // Start new game
        const mode = gameState.twoPlayerMode ? 'local' : 'ai';
        gameState.startGame(mode);
        showScreen('gameScreen');
        updateGameScreenOrientation(gameState.orientation);
        startNewGame();
    }

    hintsModalMode = null;
}


// Launch confetti animation
async function launchConfetti() {
    if (typeof confetti === 'function') {
        const duration = 3000;
        const end = Date.now() + duration;

        while (Date.now() < end) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: Math.random() - 0.2 },
                zIndex: 1500
            });
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// === LOBBY SYSTEM FUNCTIONS ===

let lobbyRefreshInterval = null;
let currentChallengeInfo = null;
let connectionModalCancelled = false;

// Connection modal functions
window.showConnectionModal = function(status) {
    const modal = document.getElementById('connectionModal');
    const title = document.getElementById('connectionTitle');
    const message = document.getElementById('connectionMessage');
    const cancelBtn = document.getElementById('cancelConnectionBtn');
    const okBtn = document.getElementById('okConnectionBtn');
    
    if (status === 'connecting') {
        connectionModalCancelled = false;
        title.textContent = translationManager.get('connecting');
        message.textContent = translationManager.get('tryingToConnect');
        cancelBtn.style.display = 'inline-block';
        okBtn.style.display = 'none';
        openModal('connectionModal');
    } else if (status === 'failed') {
        title.textContent = translationManager.get('connectionFailed');
        message.textContent = translationManager.get('connectionFailedMessage');
        cancelBtn.style.display = 'none';
        okBtn.style.display = 'inline-block';
    }
};

window.updateConnectionModal = function(attempt, maxAttempts) {
    const message = document.getElementById('connectionMessage');
    if (message && !connectionModalCancelled) {
        message.textContent = `${translationManager.get('tryingToConnect')} (${attempt}/${maxAttempts})`;
    }
};

window.hideConnectionModal = function() {
    closeModal('connectionModal');
    connectionModalCancelled = false;
};

window.showConnectionLost = function() {
    // Return to main menu first
    if (currentGame) {
        currentGame.cleanup();
        currentGame = null;
    }
    
    // Clear lobby interval
    if (lobbyRefreshInterval) {
        clearInterval(lobbyRefreshInterval);
        lobbyRefreshInterval = null;
    }
    
    // Close all modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Show main menu
    showScreen('mainMenu');
    
    // Show connection lost modal
    const modal = document.getElementById('connectionModal');
    const title = document.getElementById('connectionTitle');
    const message = document.getElementById('connectionMessage');
    const cancelBtn = document.getElementById('cancelConnectionBtn');
    const okBtn = document.getElementById('okConnectionBtn');
    
    title.textContent = translationManager.get('connectionLost');
    message.textContent = translationManager.get('connectionLostMessage');
    cancelBtn.style.display = 'none';
    okBtn.style.display = 'inline-block';
    openModal('connectionModal');
};

async function openLobby() {
    // Check authentication first
    if (window.authUI) {
        console.log('🔐 Checking authentication before lobby entry...');
        const isAuth = await window.authUI.checkAuth(async () => {
            // Continue with lobby after auth
            console.log('✅ Auth complete, proceeding to lobby');
            await proceedToLobby();
        });
        
        if (isAuth) {
            // Already authenticated, proceed directly
            console.log('✅ Already authenticated, proceeding to lobby');
            await proceedToLobby();
        } else {
            console.log('🔒 Not authenticated, showing auth modal');
        }
        // If not authenticated, checkAuth will show modal and callback will handle it
        return;
    }
    
    // Fallback if authUI not available
    console.warn('⚠️ Auth UI not available, proceeding to lobby without auth');
    await proceedToLobby();
}

async function proceedToLobby() {
    // Reset connection cancelled flag in multiplayerManager
    if (multiplayerManager.connectionCancelled) {
        multiplayerManager.connectionCancelled = false;
    }
    
    // Check if we need to initialize or reconnect
    if (!multiplayerManager.playerId || !multiplayerManager.connected) {
        try {
            await multiplayerManager.init();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            // Check if error was due to cancellation
            if (error.message === 'Connection cancelled') {
                return;
            }
            // Connection modal already shown the error, just return
            return;
        }
    }
    
    // Check if connection was cancelled
    if (connectionModalCancelled) {
        connectionModalCancelled = false;
        return;
    }
    
    // Use authenticated username or default player name
    let playerName = gameState.player1Name || translationManager.get('player1');
    if (window.authClient && window.authClient.isAuthenticated) {
        playerName = window.authClient.getUserDisplayName() || playerName;
    }
    
    try {
        // Enter lobby
        const result = await multiplayerManager.enterLobby(playerName);
        
        if (!result.success) {
            console.error(translationManager.get('failedToJoin') + ': ' + result.error);
            return;
        }
        
        // Open lobby modal
        openModal('lobbyModal');
        
        // Initial refresh
        await refreshLobby();
        
        // Set up periodic refresh (every 3 seconds) - only if not already running
        if (!lobbyRefreshInterval) {
            lobbyRefreshInterval = setInterval(async () => {
                await refreshLobby();
            }, 3000);
        }
    } catch (error) {
        console.error('Failed to enter lobby:', error);
        console.error(translationManager.get('failedToJoin') + ': ' + error.message);
    }
}

async function refreshLobby() {
    const result = await multiplayerManager.getLobbyPlayers();
    
    if (!result.success) {
        console.error('Failed to refresh lobby:', result.error);
        return;
    }
    
    debugLog('📋 Lobby refresh result:', result);
    
    // Check if we've been challenged
    if (result.myStatus && result.myStatus.status === 'challenged' && !currentChallengeInfo) {
        debugLog('🎯 We have been challenged!', result.myStatus);
        // We've been challenged! Show the challenge dialog
        const challengerId = result.myStatus.challengedBy;
        const challengerName = result.myStatus.challengerName;
        const hintsEnabled = result.myStatus.hintsEnabled;
        const challengeId = result.myStatus.challengeId; // WebSocket servers provide challengeId
        
        currentChallengeInfo = {
            challengerId: challengerId,
            challengeId: challengeId, // Store challengeId for WebSocket
            challengerName: challengerName,
            hintsEnabled: hintsEnabled,
            isChallenger: false
        };
        
        // Close lobby modal and show challenge modal
        closeModal('lobbyModal');
        openModal('challengeModal');
        
        document.getElementById('challengeTitle').textContent = translationManager.get('challengePlayer');
        document.getElementById('challengeMessage').textContent = `${challengerName} ${translationManager.get('challenging')}`;
        
        // Show accept/decline buttons, hide other elements
        document.getElementById('challengeHintsSelection').classList.add('hidden');
        document.getElementById('challengeResponseButtons').classList.remove('hidden');
        document.getElementById('challengeWaiting').classList.add('hidden');
        document.getElementById('cancelChallengeBtn').classList.add('hidden');
        
        return; // Don't update lobby UI while showing challenge
    }
    
    // Update available players list
    const playersList = document.getElementById('lobbyPlayersList');
    const availablePlayers = result.availablePlayers.filter(p => p.playerId !== multiplayerManager.playerId);
    
    if (availablePlayers.length === 0) {
        playersList.innerHTML = `<p class="no-players-message" data-translate="noPlayersInLobby">${translationManager.get('noPlayersInLobby')}</p>`;
    } else {
        playersList.innerHTML = '';
        availablePlayers.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'lobby-player-item';
            playerItem.innerHTML = `
                <div class="lobby-player-info">
                    <div class="lobby-player-name">${escapeHtml(player.playerName)}</div>
                    <div class="lobby-player-status available">${translationManager.get('available')}</div>
                </div>
                <button class="challenge-btn">${translationManager.get('challenge')}</button>
            `;
            
            playerItem.querySelector('.challenge-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await challengePlayer(player);
            });
            
            playersList.appendChild(playerItem);
        });
    }
    
    // Update active games list
    const gamesList = document.getElementById('activeGamesList');
    const activeGames = result.activeGames;
    
    if (activeGames.length === 0) {
        gamesList.innerHTML = `<p class="no-games-message" data-translate="noActiveGames">${translationManager.get('noActiveGames')}</p>`;
    } else {
        gamesList.innerHTML = '';
        activeGames.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'game-item';
            gameItem.style.cursor = 'pointer';
            
            const timeAgo = getTimeAgo(game.timestamp);
            
            // Display score if available (format: "2:1")
            // Use !== undefined to handle 0 scores correctly
            const scoreDisplay = (game.score1 !== undefined && game.score2 !== undefined)
                ? `<span style="font-weight: 600; color: #2196F3; margin-left: 8px;">(${game.score1}:${game.score2})</span>` 
                : '';
            
            gameItem.innerHTML = `
                <div>
                    <div class="game-players">${escapeHtml(game.player1)} vs ${escapeHtml(game.player2)} ${scoreDisplay}</div>
                    <div class="game-time">${timeAgo}</div>
                </div>
            `;
            
            // Add click handler for spectating
            gameItem.addEventListener('click', () => {
                promptSpectateGame(game);
            });
            
            gamesList.appendChild(gameItem);
        });
    }
}

function promptSpectateGame(game) {
    // Store game info for spectating
    window.spectateGameInfo = game;
    
    // Show spectate modal
    document.getElementById('spectateMessage').textContent = `${game.player1} vs ${game.player2}`;
    
    // Close lobby modal
    closeModal('lobbyModal');
    
    // Open spectate confirmation modal
    openModal('spectateModal');
}

async function startSpectating(game) {
    debugLog('🔭 Starting spectator mode for game:', game);
    
    // Close spectate modal
    closeModal('spectateModal');
    
    // Cleanup any existing game state
    if (currentGame) {
        currentGame.cleanup();
    }
    
    // Save spectator's own name before overwriting
    if (!gameState.spectatorOwnName) {
        gameState.spectatorOwnName = gameState.player1Name;
    }
    
    // Set spectator mode in gameState
    gameState.gameMode = 'spectator';
    gameState.spectatorGameId = game.gameId;
    gameState.player1Name = game.player1;
    gameState.player2Name = game.player2;
    
    // Notify server we're joining as spectator
    try {
        const result = await multiplayerManager.joinAsSpectator(game.gameId);
        
        if (!result.success) {
            console.error(result.error || 'Failed to join as spectator');
            gameState.gameMode = null;
            // Restore spectator's own name
            if (gameState.spectatorOwnName) {
                gameState.player1Name = gameState.spectatorOwnName;
                gameState.spectatorOwnName = null;
            }
            openModal('lobbyModal');
            return;
        }
        
        debugLog('✅ Joined as spectator, received initial state:', result);
        
        // Update player displays
        document.getElementById('player1NameDisplay').textContent = game.player1;
        document.getElementById('player2NameDisplay').textContent = game.player2;
        
        // Show network icons for both players when spectating
        const networkIconPlayer1 = document.getElementById('networkIconPlayer1');
        const networkIconPlayer2 = document.getElementById('networkIconPlayer2');
        if (networkIconPlayer1) {
            networkIconPlayer1.style.display = 'inline';
        }
        if (networkIconPlayer2) {
            networkIconPlayer2.style.display = 'inline';
        }
        
        // Show game screen
        showScreen('gameScreen');
        updateGameScreenOrientation(gameState.orientation);
        
        // Initialize the game
        currentGame = new DiceSoccerGame(
            gameState.boardSize,
            gameState.hintsEnabled,
            gameState.soundsEnabled
        );
        
        // Set player shirt colors if provided by server
        if (result.player1Color && result.player2Color) {
            gameState.setMultiplayerColors(result.player1Color, result.player2Color);
            debugLog(`🎨 Set colors - P1: ${result.player1Color}, P2: ${result.player2Color}`);
        }
        
        // If server provided board state, apply it
        if (result.boardState) {
            currentGame.board = result.boardState;
            currentGame.player1Score = result.score1 || 0;
            currentGame.player2Score = result.score2 || 0;
            currentGame.currentPlayer = result.currentPlayer || 1;
            currentGame.renderBoard();
            currentGame.updateUI();
        }
        
        // Set up event handler for spectator updates
        multiplayerManager.onEvent = handleSpectatorEvent;
        
        debugLog('🔭 Spectator mode fully initialized');
        
    } catch (error) {
        console.error('Failed to start spectating:', error);
        gameState.gameMode = null;
        openModal('lobbyModal');
    }
}

function handleSpectatorEvent(event) {
    debugLog('👁️ Spectator event:', event);
    
    // Handle game events as spectator
    if (event.type === 'gameEnded' || event.type === 'playerDisconnected' || event.type === 'gameAborted') {
        // Return to lobby
        debugLog('🔚 Game ended or interrupted, returning to lobby');
        exitSpectatorMode();
        return;
    }
    
    // Forward other events to the game for display
    if (currentGame) {
        currentGame.handleMultiplayerEvent(event);
    }
}

async function exitSpectatorMode() {
    debugLog('🚪 Exiting spectator mode');
    
    // Notify server we're leaving FIRST and wait for confirmation
    if (multiplayerManager) {
        await multiplayerManager.leaveSpectator();
        debugLog('✅ Server confirmed spectator exit');
    }
    
    // Clean up game
    if (currentGame) {
        currentGame.cleanup();
        currentGame = null;
    }
    
    // Clean up game state
    gameState.gameMode = null;
    gameState.spectatorGameId = null;
    
    // Restore spectator's own name
    if (gameState.spectatorOwnName) {
        gameState.player1Name = gameState.spectatorOwnName;
        gameState.spectatorOwnName = null;
        debugLog(`🔄 Restored spectator name: ${gameState.player1Name}`);
    }
    
    // Stop event handling
    if (multiplayerManager) {
        multiplayerManager.onEvent = null;
    }
    
    // Hide network icons and spectator count
    const networkIconPlayer1 = document.getElementById('networkIconPlayer1');
    const networkIconPlayer2 = document.getElementById('networkIconPlayer2');
    if (networkIconPlayer1) {
        networkIconPlayer1.style.display = 'none';
    }
    if (networkIconPlayer2) {
        networkIconPlayer2.style.display = 'none';
    }
    
    const spectatorCountDiv = document.getElementById('spectatorCount');
    if (spectatorCountDiv) {
        spectatorCountDiv.style.display = 'none';
    }
    
    // Return to main menu, then open lobby
    showScreen('mainMenu');
    
    // Small delay to ensure clean transition
    setTimeout(() => {
        openLobby();
    }, 100);
}

function updateSpectatorCount(count) {
    debugLog(`👁️ Spectator count updated: ${count}`);
    
    const spectatorCountDiv = document.getElementById('spectatorCount');
    const spectatorCountText = document.getElementById('spectatorCountText');
    
    if (spectatorCountDiv && spectatorCountText) {
        if (count > 0) {
            spectatorCountText.textContent = `👁️ ${count}`;
            spectatorCountDiv.style.display = 'block';
            debugLog(`Showing spectator count: ${count}`);
        } else {
            spectatorCountDiv.style.display = 'none';
            debugLog(`Hiding spectator count (count is ${count})`);
        }
    } else {
        debugLog(`Warning: spectator count elements not found`);
    }
}

async function challengePlayer(player) {
    currentChallengeInfo = {
        targetPlayerId: player.playerId,
        targetPlayerName: player.playerName,
        isChallenger: true
    };
    
    // Close lobby modal
    closeModal('lobbyModal');
    
    // Show challenge modal with hints selection
    openModal('challengeModal');
    document.getElementById('challengeTitle').textContent = translationManager.get('challengePlayer');
    document.getElementById('challengeMessage').textContent = `${translationManager.get('challenging')} ${player.playerName}`;
    
    document.getElementById('challengeHintsSelection').classList.remove('hidden');
    document.getElementById('challengeResponseButtons').classList.add('hidden');
    document.getElementById('challengeWaiting').classList.add('hidden');
    document.getElementById('cancelChallengeBtn').classList.remove('hidden');
    
    // Set up hints selection buttons
    const hintsButtons = document.querySelectorAll('.hints-option-btn');
    hintsButtons.forEach(btn => {
        btn.onclick = async () => {
            const hintsEnabled = btn.dataset.hints === 'true';
            await sendChallenge(hintsEnabled);
        };
    });
}

async function sendChallenge(hintsEnabled) {
    // Hide hints selection, show waiting
    document.getElementById('challengeHintsSelection').classList.add('hidden');
    document.getElementById('challengeWaiting').classList.remove('hidden');
    
    const result = await multiplayerManager.challengePlayer(
        currentChallengeInfo.targetPlayerId,
        hintsEnabled
    );
    
    if (!result.success) {
        console.error(translationManager.get('failedToJoin') + ': ' + result.error);
        closeModal('challengeModal');
        openModal('lobbyModal');
        return;
    }
    
    // Store the challengeId for cancellation
    currentChallengeInfo.challengeId = result.challengeId;
    debugLog('✅ Challenge sent, challengeId:', result.challengeId);
    
    // Start polling for challenge response
    multiplayerManager.onEvent = handleLobbyEvent;
    multiplayerManager.startPolling();
}

function handleLobbyEvent(event) {
    debugLog('Lobby event received:', event);
    
    if (event.type === 'challengeAccepted') {
        // Challenge was accepted, start the game
        multiplayerManager.stopPolling();
        closeModal('challengeModal');
        
        // Close lobby interval if still running
        if (lobbyRefreshInterval) {
            clearInterval(lobbyRefreshInterval);
            lobbyRefreshInterval = null;
        }
        
        // Apply hints setting from event
        if (event.hintsEnabled !== undefined) {
            gameState.hintsEnabled = event.hintsEnabled;
        }
        
        // Play start sound
        soundManager.play('whistle');
        
        // Start multiplayer game (challenger is host/player1)
        startMultiplayerGame('host', event.opponent);
    } else if (event.type === 'challengeDeclined') {
        // Challenge was declined
        handleChallengeDeclined(event);
    } else if (event.type === 'challengeCancelled') {
        // Challenge was cancelled
        handleChallengeCancelled(event);
    }
}

// Global handler for incoming challenges
window.handleIncomingChallenge = function(data) {
    debugLog('🎯 Incoming challenge from:', data.challengerName);
    
    currentChallengeInfo = {
        challengeId: data.challengeId,
        challengerId: data.challengerId,
        challengerName: data.challengerName,
        hintsEnabled: data.hintsEnabled,
        isChallenger: false
    };
    
    // Close lobby modal and show challenge modal
    closeModal('lobbyModal');
    openModal('challengeModal');
    
    document.getElementById('challengeTitle').textContent = translationManager.get('challengePlayer');
    document.getElementById('challengeMessage').textContent = 
        `${data.challengerName} ${translationManager.get('challengedYou')}`;
    
    // Show accept/decline buttons, hide other elements
    document.getElementById('challengeHintsSelection').classList.add('hidden');
    document.getElementById('challengeResponseButtons').classList.remove('hidden');
    document.getElementById('challengeWaiting').classList.add('hidden');
    document.getElementById('cancelChallengeBtn').classList.add('hidden');
    
    soundManager.play('challenge');
};

// Global handler for challenge declined
window.handleChallengeDeclined = function(data) {
    debugLog('❌ Challenge declined by:', data.declinedBy || 'opponent');
    
    currentChallengeInfo = null;
    multiplayerManager.stopPolling();
    
    // Show notification in challenge modal
    document.getElementById('challengeTitle').textContent = translationManager.get('challengePlayer');
    document.getElementById('challengeMessage').textContent = translationManager.get('challengeDeclined');
    
    // Hide all buttons and show only a close button
    document.getElementById('challengeHintsSelection').classList.add('hidden');
    document.getElementById('challengeResponseButtons').classList.add('hidden');
    document.getElementById('challengeWaiting').classList.add('hidden');
    document.getElementById('cancelChallengeBtn').classList.remove('hidden');
    document.getElementById('cancelChallengeBtn').textContent = translationManager.get('close');
    document.getElementById('cancelChallengeBtn').onclick = () => {
        closeModal('challengeModal');
        openModal('lobbyModal');
        refreshLobby();
    };
};

// Global handler for challenge cancelled
window.handleChallengeCancelled = function(data) {
    debugLog('🚫 handleChallengeCancelled called with data:', data);
    debugLog('🚫 Challenge cancelled by challenger');
    
    currentChallengeInfo = null;
    
    // Update modal to show cancellation message
    document.getElementById('challengeTitle').textContent = translationManager.get('challengePlayer');
    document.getElementById('challengeMessage').textContent = translationManager.get('challengeCancelled');
    
    // Hide all buttons except close button
    document.getElementById('challengeHintsSelection').classList.add('hidden');
    document.getElementById('challengeResponseButtons').classList.add('hidden');
    document.getElementById('challengeWaiting').classList.add('hidden');
    document.getElementById('cancelChallengeBtn').classList.remove('hidden');
    document.getElementById('cancelChallengeBtn').textContent = translationManager.get('close');
    document.getElementById('cancelChallengeBtn').onclick = () => {
        closeModal('challengeModal');
        openModal('lobbyModal');
        refreshLobby();
    };
};

async function acceptChallenge() {
    if (!currentChallengeInfo) return;
    
    // Use challengeId if available (WebSocket), otherwise fallback to challengerId (PHP)
    const challengeParam = currentChallengeInfo.challengeId || currentChallengeInfo.challengerId;
    const result = await multiplayerManager.acceptChallenge(challengeParam);
    
    if (!result.success) {
        console.error(translationManager.get('failedToJoin') + ': ' + result.error);
        return;
    }
    
    closeModal('challengeModal');
    
    // Close lobby interval if still running
    if (lobbyRefreshInterval) {
        clearInterval(lobbyRefreshInterval);
        lobbyRefreshInterval = null;
    }
    
    // Apply hints setting from result
    if (result.hintsEnabled !== undefined) {
        gameState.hintsEnabled = result.hintsEnabled;
    }
    
    // Play start sound
    soundManager.play('whistle');
    
    // Start multiplayer game (accepter is guest/player2)
    startMultiplayerGame('guest', result.opponent);
}

async function declineChallenge() {
    if (!currentChallengeInfo) return;
    
    // Use challengeId if available (WebSocket), otherwise fallback to challengerId (PHP)
    const challengeParam = currentChallengeInfo.challengeId || currentChallengeInfo.challengerId;
    await multiplayerManager.declineChallenge(challengeParam);
    
    currentChallengeInfo = null;
    closeModal('challengeModal');
    
    // Return to lobby
    openModal('lobbyModal');
    refreshLobby();
}

async function cancelChallenge() {
    multiplayerManager.stopPolling();
    
    debugLog('🚫 cancelChallenge called, currentChallengeInfo:', currentChallengeInfo);
    
    // Clean up challenge state on server via WebSocket
    if (currentChallengeInfo && currentChallengeInfo.challengeId) {
        try {
            debugLog('📤 Sending declineChallenge with challengeId:', currentChallengeInfo.challengeId);
            await multiplayerManager.declineChallenge(currentChallengeInfo.challengeId);
            debugLog('✅ Challenge cancelled successfully');
        } catch (error) {
            console.error('❌ Failed to cancel challenge:', error);
        }
    } else {
        debugLog('❌ No challengeId available to cancel');
    }
    
    currentChallengeInfo = null;
    closeModal('challengeModal');
    
    // Return to lobby
    openModal('lobbyModal');
    refreshLobby();
}

async function closeLobby() {
    // Stop refresh interval
    if (lobbyRefreshInterval) {
        clearInterval(lobbyRefreshInterval);
        lobbyRefreshInterval = null;
    }
    
    // Leave lobby
    await multiplayerManager.leaveLobby();
    
    closeModal('lobbyModal');
}

function getTimeAgo(timestamp) {
    const now = Date.now() / 1000;
    const diff = Math.floor(now - timestamp);
    
    if (diff < 60) return translationManager.get('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)}${translationManager.get('minutesAgo')}`;
    return `${Math.floor(diff / 3600)}${translationManager.get('hoursAgo')}`;
}

function startMultiplayerGame(role, opponent) {
    debugLog(`Starting multiplayer game as ${role}`, opponent);
    
    // Hide spectator count (will be shown if spectators join)
    const spectatorCountDiv = document.getElementById('spectatorCount');
    if (spectatorCountDiv) {
        spectatorCountDiv.style.display = 'none';
    }
    
    // Cleanup any existing game state
    if (currentGame) {
        currentGame.cleanup();
    }
    
    // Store original player 2 name before multiplayer modifies it
    if (!gameState.originalPlayer2Name) {
        gameState.originalPlayer2Name = gameState.player2Name;
    }
    
    gameState.startGame('multiplayer');
    
    // Set player names and roles
    if (role === 'host') {
        // Host controls Player 1, opponent is Player 2
        gameState.player2Name = opponent.playerName;
        multiplayerManager.isHost = true;
        multiplayerManager.localPlayer = 1;
        debugLog(`Host: I control Player 1 (${gameState.player1Name}), opponent controls Player 2 (${opponent.playerName})`);
        
        // Start game log (host initiates)
        window.gameLogger.startGameLog(
            gameState.player1Name,
            opponent.playerName,
            'multiplayer',
            null, // player2UserAgent - not currently exchanged
            null  // player2Resolution - not currently exchanged
        ).then(logId => {
            if (logId) {
                debugLog('Game logging started with ID:', logId);
            }
        });
    } else {
        // Guest controls Player 2, but sees themselves as "Player 1" on their screen
        // We'll flip the display perspective in rendering
        gameState.player2Name = opponent.playerName;
        multiplayerManager.isHost = false;
        multiplayerManager.localPlayer = 2;
        debugLog(`Guest: I control Player 2 (${gameState.player1Name}), opponent controls Player 1 (${opponent.playerName})`);
    }
    
    // Update displays - guest will see their own name, host name as opponent
    if (role === 'guest') {
        // Guest sees themselves as "bottom" player
        document.getElementById('player1NameDisplay').textContent = gameState.player1Name;
        document.getElementById('player2NameDisplay').textContent = opponent.playerName;
    } else {
        // Host sees normal Player 1/Player 2
        document.getElementById('player1NameDisplay').textContent = gameState.player1Name;
        document.getElementById('player2NameDisplay').textContent = gameState.player2Name;
    }
    
    // Show network icon only for Player 2 (the opponent) when playing
    const networkIconPlayer1 = document.getElementById('networkIconPlayer1');
    const networkIconPlayer2 = document.getElementById('networkIconPlayer2');
    if (networkIconPlayer1) {
        networkIconPlayer1.style.display = 'none'; // Hide for Player 1 (local player)
    }
    if (networkIconPlayer2) {
        networkIconPlayer2.style.display = 'inline'; // Show for Player 2 (opponent)
    }
    
    showScreen('gameScreen');
    updateGameScreenOrientation(gameState.orientation);
    startNewGame();
    soundManager.play('cheering');
    
    // Ensure polling is active for multiplayer game
    debugLog('🔄 Starting polling for multiplayer game');
    multiplayerManager.startPolling();
    
    // Set up event handler for opponent moves
    multiplayerManager.onEvent = (event) => {
        if (currentGame && event.type !== 'gameStart') {
            if (typeof currentGame.handleMultiplayerEvent === 'function') {
                currentGame.handleMultiplayerEvent(event);
            }
        }
    };
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    modal.classList.remove('minimized'); // Reset minimized state
    // Reset any rotation transforms
    modal.style.transform = '';
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    // When returning to main menu, auto-detect current device orientation
    if (screenId === 'mainMenu') {
        const isLandscape = window.innerWidth > window.innerHeight;
        const detectedOrientation = isLandscape ? 'landscape' : 'portrait';
        
        if (gameState.orientation !== detectedOrientation) {
            gameState.orientation = detectedOrientation;
            localStorage.setItem('dicesoccer_orientation', detectedOrientation);
            updateOrientationDisplay(detectedOrientation);
        } else {
            // Just update the menu display to match current orientation
            updateOrientationDisplay(gameState.orientation);
        }
        
        // Hide network icons when returning to menu
        const networkIconPlayer1 = document.getElementById('networkIconPlayer1');
        const networkIconPlayer2 = document.getElementById('networkIconPlayer2');
        if (networkIconPlayer1) {
            networkIconPlayer1.style.display = 'none';
        }
        if (networkIconPlayer2) {
            networkIconPlayer2.style.display = 'none';
        }
    }
}

// Start new game
function startNewGame() {
    // Cleanup old game instance before creating new one
    if (currentGame && typeof currentGame.cleanup === 'function') {
        debugLog('Cleaning up previous game instance');
        currentGame.cleanup();
    }
    
    // Hide spectator count (only relevant for multiplayer)
    const spectatorCountDiv = document.getElementById('spectatorCount');
    if (spectatorCountDiv) {
        spectatorCountDiv.style.display = 'none';
    }
    
    currentGame = new DiceSoccerGame();
    currentGame.start();
}
