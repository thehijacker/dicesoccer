// Main application logic and UI interactions
const APP_VERSION = 'v2.0.0-beta-3';

// Track PHP availability
let phpAvailable = true;

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
          console.log('New version available, reloading in 1 second...');
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
      console.log('Service Worker updated to version:', event.data.version);
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
            console.log('Wake Lock acquired - screen will stay on');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        }
    } catch (err) {
        console.log('Wake Lock request failed:', err);
    }
}

async function releaseWakeLock() {
    if (wakeLock !== null) {
        try {
            await wakeLock.release();
            wakeLock = null;
        } catch (err) {
            console.log('Wake Lock release failed:', err);
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
            
            // Redraw hints if dice was rolled and hints are enabled
            if (currentGame.waitingForMove && gameState.hintsEnabled && currentGame.diceValue > 0) {
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
        checkPHPAvailability().then(() => {
            window.gameLogger.initialize().then(() => {
                initializeApp();
            });
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
    
    // Leave multiplayer game if active
    if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
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
    
    showScreen('mainMenu');
}

// Re-acquire wake lock when page becomes visible again (e.g., after switching tabs)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        requestWakeLock();
    }
});

// Check if PHP is available on the server
async function checkPHPAvailability() {
    try {
        const response = await fetch('php-check.php', {
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const data = await response.json();
            phpAvailable = data.php_available === true;
        } else {
            phpAvailable = false;
        }
    } catch (error) {
        console.log('PHP not available on this server:', error);
        phpAvailable = false;
    }
}

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
    
    console.log('Auto-detect orientation:', {
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
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
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
    document.getElementById('player1Name').value = gameState.player1Name;
    document.getElementById('player2Name').value = gameState.player2Name;

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

    // Disable multiplayer options if PHP is not available
    if (!phpAvailable) {
        const multiplayerBtn = document.getElementById('multiplayerBtn');
        
        if (multiplayerBtn) {
            multiplayerBtn.classList.add('disabled');
            multiplayerBtn.title = 'PHP not available - Multiplayer requires PHP server support';
        }
        
        console.log('Multiplayer options disabled - PHP not available');
    }

    // Set up event listeners
    console.log('Setting up event listeners...');
    setupEventListeners();
    console.log('Event listeners set up successfully');

    // Initialize shirt modal
    initializeShirtModal();
    console.log('App initialized successfully');
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
    console.log('setupEventListeners called');
    
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

    // Player 2 Container - shows difficulty submenu when in AI mode
    try {
        document.getElementById('player2Container').addEventListener('click', (e) => {
            // Only open submenu if in AI mode (not two-player mode)
            if (!gameState.twoPlayerMode) {
                // Don't open if clicking directly on the shirt icon (for color selection)
                const target = e.target;
                if (target && target.classList && !target.classList.contains('shirt-icon')) {
                    toggleSubmenu('difficultySubmenu');
                }
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

    // Player name inputs
    document.getElementById('player1Name').addEventListener('input', (e) => {
        gameState.setPlayerName(1, e.target.value);
    });

    document.getElementById('player2Name').addEventListener('input', (e) => {
        gameState.setPlayerName(2, e.target.value);
    });

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

    document.getElementById('closeJoinModal')?.addEventListener('click', () => {
        closeModal('joinGameModal');
    });
    
    // Lobby modal handlers
    document.getElementById('refreshLobbyBtn')?.addEventListener('click', async () => {
        await refreshLobby();
    });

    document.getElementById('closeLobbyBtn')?.addEventListener('click', () => {
        closeLobby();
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
    document.getElementById('newGameFromWinner').addEventListener('click', () => {
        closeModal('winnerModal');
        // stop all sounds (cheering))
        soundManager.stopAll();
        startNewGame();
    });

    document.getElementById('backToMenuFromWinner').addEventListener('click', async () => {
        // stop all sounds (cheering))
        soundManager.stopAll();

        closeModal('winnerModal');
        
        // Leave multiplayer game if active
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
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
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
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
        // Two-player mode: show editable name input
        player2Name.classList.remove('hidden');
        player2Name.readOnly = false;
        player2Name.style.cursor = 'text';
        aiLabel.classList.add('hidden');
        player2Container.classList.remove('expandable');
    } else {
        // AI mode: show AI label and make clickable
        player2Name.classList.add('hidden');
        player2Name.readOnly = true;
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
    
    // Add click listener to close when clicking outside
    if (submenu.classList.contains('active')) {
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
    } else if (hintsModalMode === 'host') {
        // Host multiplayer game
        hostGame();
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

// Multiplayer functions
async function hostGame() {
    const playerName = gameState.player1Name || translationManager.get('player1');
    
    // Initialize multiplayer if not done
    if (!multiplayerManager.playerId) {
        multiplayerManager.init();
    }
    
    const result = await multiplayerManager.hostGame(playerName, gameState.hintsEnabled);
    
    if (result.success) {
        // Show waiting modal
        document.getElementById('hostPlayerName').textContent = playerName;
        document.getElementById('hostPlayerIp').textContent = 'Waiting...';
        openModal('hostWaitingModal');
        
        // Get IP address (shown in modal)
        fetch('https://api.ipify.org?format=json')
            .then(r => r.json())
            .then(data => {
                document.getElementById('hostPlayerIp').textContent = data.ip;
            })
            .catch(() => {
                document.getElementById('hostPlayerIp').textContent = 'Unknown';
            });
        
        // Start polling for events FIRST
        multiplayerManager.startPolling();
        
        // Set up callback for when player joins
        multiplayerManager.onEvent = (event) => {
            console.log('Host received event:', event);
            if (event.type === 'gameStart') {
                console.log('Player joined:', event.opponent);
                closeModal('hostWaitingModal');
                // Apply hints setting from event (host's preference)
                if (event.hintsEnabled !== undefined) {
                    gameState.hintsEnabled = event.hintsEnabled;
                }
                // Play start sound
                soundManager.play('whistle');
                // Host is player 1, guest is player 2
                startMultiplayerGame('host', event.opponent);
            }
        };
    } else {
        console.error('Failed to host game:', result.error);
        alert(translationManager.get('failedToHost') + ': ' + result.error);
    }
}

// Cancel hosting
document.getElementById('cancelHostBtn')?.addEventListener('click', async () => {
    await multiplayerManager.cancelHost();
    closeModal('hostWaitingModal');
});

// === LOBBY SYSTEM FUNCTIONS ===

let lobbyRefreshInterval = null;
let currentChallengeInfo = null;

async function openLobby() {
    // Initialize multiplayer if not done
    if (!multiplayerManager.playerId) {
        try {
            await multiplayerManager.init();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            alert(translationManager.get('failedToJoin') + ': ' + error.message);
            return;
        }
    }
    
    const playerName = gameState.player1Name || translationManager.get('player1');
    
    // Enter lobby
    const result = await multiplayerManager.enterLobby(playerName);
    
    if (!result.success) {
        alert(translationManager.get('failedToJoin') + ': ' + result.error);
        return;
    }
    
    // Open lobby modal
    openModal('lobbyModal');
    
    // Initial refresh
    await refreshLobby();
    
    // Set up periodic refresh (every 3 seconds)
    lobbyRefreshInterval = setInterval(async () => {
        await refreshLobby();
        await checkForChallenges();
    }, 3000);
}

async function refreshLobby() {
    const result = await multiplayerManager.getLobbyPlayers();
    
    if (!result.success) {
        console.error('Failed to refresh lobby:', result.error);
        return;
    }
    
    console.log('📋 Lobby refresh result:', result);
    
    // Check if we've been challenged
    if (result.myStatus && result.myStatus.status === 'challenged' && !currentChallengeInfo) {
        console.log('🎯 We have been challenged!', result.myStatus);
        // We've been challenged! Show the challenge dialog
        const challengerId = result.myStatus.challengedBy;
        const challengerName = result.myStatus.challengerName;
        const hintsEnabled = result.myStatus.hintsEnabled;
        
        currentChallengeInfo = {
            challengerId: challengerId,
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
            
            const timeAgo = getTimeAgo(game.timestamp);
            
            gameItem.innerHTML = `
                <div>
                    <div class="game-players">${escapeHtml(game.player1)} vs ${escapeHtml(game.player2)}</div>
                    <div class="game-time">${timeAgo}</div>
                </div>
            `;
            
            gamesList.appendChild(gameItem);
        });
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
        alert(translationManager.get('failedToJoin') + ': ' + result.error);
        closeModal('challengeModal');
        openModal('lobbyModal');
        return;
    }
    
    // Start polling for challenge response
    multiplayerManager.onEvent = handleLobbyEvent;
    multiplayerManager.startPolling();
}

async function checkForChallenges() {
    // This would require a new endpoint to check if we've been challenged
    // For now, we'll rely on the getLobbyPlayers call which updates our status
    const result = await multiplayerManager.getLobbyPlayers();
    
    if (result.success) {
        // Check if we're in the challenging/challenged list
        const allPlayers = [...result.availablePlayers, ...result.challengingPlayers];
        const myInfo = allPlayers.find(p => p.playerId === multiplayerManager.playerId);
        
        if (myInfo && myInfo.status === 'challenged' && !currentChallengeInfo) {
            // We've been challenged! - Note: We need to enhance the server to return challenger info
            // For now, this is a placeholder
        }
    }
}

function handleLobbyEvent(event) {
    console.log('Lobby event received:', event);
    
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
    }
}

async function acceptChallenge() {
    if (!currentChallengeInfo) return;
    
    const result = await multiplayerManager.acceptChallenge(currentChallengeInfo.challengerId);
    
    if (!result.success) {
        alert(translationManager.get('failedToJoin') + ': ' + result.error);
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
    
    await multiplayerManager.declineChallenge(currentChallengeInfo.challengerId);
    
    currentChallengeInfo = null;
    closeModal('challengeModal');
    
    // Return to lobby
    openModal('lobbyModal');
    refreshLobby();
}

async function cancelChallenge() {
    multiplayerManager.stopPolling();
    
    // Clean up challenge state on server
    if (currentChallengeInfo && currentChallengeInfo.isChallenger && currentChallengeInfo.targetPlayerId) {
        // When challenger cancels, we decline using target as the declining player
        // This will reset both players to 'available'
        await fetch('multiplayer-server.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'declineChallenge',
                playerId: currentChallengeInfo.targetPlayerId,
                challengerId: multiplayerManager.playerId
            })
        });
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

// === LEGACY MULTIPLAYER FUNCTIONS ===

async function openJoinModal() {
    // Initialize multiplayer if not done
    if (!multiplayerManager.playerId) {
        multiplayerManager.init();
    }
    
    openModal('joinGameModal');
    await refreshGamesList();
}

async function refreshGamesList() {
    const hostsList = document.getElementById('hostsList');
    hostsList.innerHTML = '<div class="loading-spinner"></div>';
    
    const hosts = await multiplayerManager.getAvailableHosts();
    
    console.log('Available hosts:', hosts);
    
    if (hosts.length === 0) {
        hostsList.innerHTML = `
            <div class="no-hosts-message">
                <p data-translate="noHostsFound">${translationManager.get('noHostsFound')}</p>
            </div>
        `;
    } else {
        hostsList.innerHTML = '';
        hosts.forEach(host => {
            const hostItem = document.createElement('div');
            hostItem.className = 'host-item';
            hostItem.innerHTML = `
                <div class="host-item-info">
                    <div class="host-item-name">${escapeHtml(host.playerName)}</div>
                    <div class="host-item-ip">${escapeHtml(host.playerIp)}</div>
                </div>
                <button class="join-host-btn" data-translate="join">${translationManager.get('join')}</button>
            `;
            
            hostItem.querySelector('.join-host-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await joinGame(host.playerId, host.playerName);
            });
            
            hostsList.appendChild(hostItem);
        });
    }
}

async function joinGame(hostId, hostName) {
    const playerName = gameState.player1Name || translationManager.get('player1');
    const result = await multiplayerManager.joinGame(hostId, playerName);
    
    if (result.success) {
        console.log('Joined game:', result);
        closeModal('joinGameModal');
        // Apply hints setting from host
        if (result.hintsEnabled !== undefined) {
            gameState.hintsEnabled = result.hintsEnabled;
        }
        // Play start sound
        soundManager.play('whistle');
        // Guest is player 2, host is player 1
        startMultiplayerGame('guest', result.opponent);
    } else {
        console.error('Failed to join game:', result.error);
        alert(translationManager.get('failedToJoin') + ': ' + result.error);
    }
}

function startMultiplayerGame(role, opponent) {
    console.log(`Starting multiplayer game as ${role}`, opponent);
    
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
        console.log(`Host: I control Player 1 (${gameState.player1Name}), opponent controls Player 2 (${opponent.playerName})`);
        
        // Start game log (host initiates)
        window.gameLogger.startGameLog(
            gameState.player1Name,
            opponent.playerName,
            opponent.playerIp || 'Unknown'
        ).then(logId => {
            if (logId) {
                console.log('Game logging started with ID:', logId);
            }
        });
    } else {
        // Guest controls Player 2, but sees themselves as "Player 1" on their screen
        // We'll flip the display perspective in rendering
        gameState.player2Name = opponent.playerName;
        multiplayerManager.isHost = false;
        multiplayerManager.localPlayer = 2;
        console.log(`Guest: I control Player 2 (${gameState.player1Name}), opponent controls Player 1 (${opponent.playerName})`);
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
    
    // Show network icon for multiplayer
    const networkIcon = document.getElementById('networkIcon');
    if (networkIcon) {
        networkIcon.style.display = 'inline';
    }
    
    showScreen('gameScreen');
    updateGameScreenOrientation(gameState.orientation);
    startNewGame();
    soundManager.play('cheering');
    
    // Ensure polling is active for multiplayer game
    console.log('🔄 Starting polling for multiplayer game');
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
        
        // Hide network icon when returning to menu
        const networkIcon = document.getElementById('networkIcon');
        if (networkIcon) {
            networkIcon.style.display = 'none';
        }
    }
}

// Start new game
function startNewGame() {
    currentGame = new DiceSoccerGame();
    currentGame.start();
}
