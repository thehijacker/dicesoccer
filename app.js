// Main application logic and UI interactions
const APP_VERSION = '1.0.2';

// Track PHP availability
let phpAvailable = true;

// Wake Lock API to prevent screen sleep
let wakeLock = null;

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

document.addEventListener('DOMContentLoaded', () => {
    // Prevent context menu on right-click and long-press
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    setViewportHeight();
    checkPHPAvailability().then(() => {
        initializeApp();
    });
    registerServiceWorker();
    
    // Request wake lock to keep screen on
    requestWakeLock();
});

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
    });
    window.addEventListener('orientationchange', () => {
        // Wait longer for dimensions to update after orientation change
        setTimeout(() => {
            setHeight();
            handleAutoOrientationDetection();
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

    // Set initial difficulty
    updateDifficultyDisplay(gameState.difficulty);

    // Set sound toggle
    document.getElementById('soundCheckbox').checked = gameState.soundEnabled;
    updateSoundIcon(gameState.soundEnabled);

    // Set two player mode toggle
    document.getElementById('twoPlayerCheckbox').checked = gameState.twoPlayerMode;
    updatePlayer2UI(gameState.twoPlayerMode);

    // Auto-detect initial orientation based on device
    const isLandscape = window.innerWidth > window.innerHeight;
    const detectedOrientation = isLandscape ? 'landscape' : 'portrait';
    
    // Use detected orientation (prefer auto-detection over saved preference)
    gameState.orientation = detectedOrientation;
    localStorage.setItem('dicesoccer_orientation', detectedOrientation);
    updateOrientationDisplay(detectedOrientation);

    // Disable multiplayer options if PHP is not available
    if (!phpAvailable) {
        const hostBtn = document.getElementById('hostGameBtn');
        const joinBtn = document.getElementById('joinGameBtn');
        
        if (hostBtn) {
            hostBtn.classList.add('disabled');
            hostBtn.title = 'PHP not available - Multiplayer requires PHP server support';
        }
        
        if (joinBtn) {
            joinBtn.classList.add('disabled');
            joinBtn.title = 'PHP not available - Multiplayer requires PHP server support';
        }
        
        console.log('Multiplayer options disabled - PHP not available');
    }

    // Set up event listeners
    setupEventListeners();

    // Initialize shirt modal
    initializeShirtModal();
}

function setupEventListeners() {
    // New Game button
    document.getElementById('newGameBtn').addEventListener('click', () => {
        soundManager.play('whistle');
        const mode = gameState.twoPlayerMode ? 'local' : 'ai';
        gameState.startGame(mode);
        showScreen('gameScreen');
        updateGameScreenOrientation(gameState.orientation);
        startNewGame();
    });

    // Two Player toggle
    document.getElementById('twoPlayerCheckbox').addEventListener('change', (e) => {
        gameState.setTwoPlayerMode(e.target.checked);
        toggleAIDifficulty(!e.target.checked);
        updatePlayer2UI(e.target.checked);
    });

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

    // AI Difficulty
    document.getElementById('aiDifficultyItem').addEventListener('click', () => {
        toggleSubmenu('difficultySubmenu');
    });

    document.querySelectorAll('#difficultySubmenu .submenu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const difficulty = e.currentTarget.getAttribute('data-difficulty');
            gameState.setDifficulty(difficulty);
            updateDifficultyDisplay(difficulty);
            updatePlayer2UI(gameState.twoPlayerMode); // Update AI difficulty label
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

    // Host game
    document.getElementById('hostGameBtn').addEventListener('click', () => {
        hostGame();
    });

    // Join game
    document.getElementById('joinGameBtn').addEventListener('click', () => {
        openJoinModal();
    });

    // Language
    document.getElementById('languageItem').addEventListener('click', () => {
        toggleSubmenu('languageSubmenu');
    });

    document.querySelectorAll('#languageSubmenu .submenu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const lang = e.currentTarget.getAttribute('data-language');
            translationManager.setLanguage(lang);
            // Update orientation and AI difficulty labels after language change
            updateOrientationDisplay(gameState.orientation);
            updatePlayer2UI(gameState.twoPlayerMode);
            toggleSubmenu('languageSubmenu', false);
        });
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
    
    document.getElementById('refreshHostsBtn')?.addEventListener('click', async () => {
        await refreshGamesList();
    });

    document.getElementById('cancelHosting')?.addEventListener('click', () => {
        multiplayerManager.cancelHosting();
        closeModal('waitingModal');
    });

    // Back to menu - expandable square
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    let menuExpanded = false;
    let collapseTimeout = null;
    
    // Global function to collapse menu (called from game actions)
    window.collapseMenuButton = function() {
        if (menuExpanded && collapseTimeout) {
            clearTimeout(collapseTimeout);
            backToMenuBtn.classList.add('collapsed');
            menuExpanded = false;
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
    
    backToMenuBtn.addEventListener('click', async () => {
        if (!menuExpanded) {
            // First click: expand the menu
            menuExpanded = true;
            backToMenuBtn.classList.remove('collapsed');
            
            // Update rotation based on current player
            updateMenuRotation();
            
            // Auto-collapse after 3 seconds
            collapseTimeout = setTimeout(() => {
                backToMenuBtn.classList.add('collapsed');
                menuExpanded = false;
            }, 3000);
        } else {
            // Second click: go back to menu
            clearTimeout(collapseTimeout);
            
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
            
            // Reset menu state
            menuExpanded = false;
            backToMenuBtn.classList.add('collapsed');
            
            showScreen('mainMenu');
        }
    });

    // Goal modal continue button
    document.getElementById('continueGameBtn').addEventListener('click', () => {
        if (currentGame) {
            currentGame.continueAfterGoal();
        }
    });

    // Winner modal buttons
    document.getElementById('newGameFromWinner').addEventListener('click', () => {
        closeModal('winnerModal');
        startNewGame();
    });

    document.getElementById('backToMenuFromWinner').addEventListener('click', async () => {
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
    if (twoPlayerMode) {
        player2Name.classList.remove('hidden');
        aiLabel.classList.add('hidden');
    } else {
        player2Name.classList.add('hidden');
        aiLabel.classList.remove('hidden');
        aiLabel.textContent = `AI (${translationManager.get(gameState.difficulty)} ${translationManager.get('difficulty')})`;
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

function toggleAIDifficulty(show) {
    const aiItem = document.getElementById('aiDifficultyItem');
    const difficultySubmenu = document.getElementById('difficultySubmenu');
    
    if (show) {
        aiItem.classList.remove('disabled');
    } else {
        aiItem.classList.add('disabled');
        difficultySubmenu.classList.remove('active');
    }
}

function updateDifficultyDisplay(difficulty) {
    const difficultyValue = document.getElementById('difficultyValue');
    difficultyValue.setAttribute('data-translate-value', difficulty);
    difficultyValue.textContent = translationManager.get(difficulty);
    
    // Update selected state
    document.querySelectorAll('#difficultySubmenu .submenu-option').forEach(option => {
        option.classList.toggle('selected', option.getAttribute('data-difficulty') === difficulty);
    });
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
    openModal('shirtModal');
}

function selectShirt(color) {
    gameState.setPlayerShirt(currentShirtPlayer, color);
    updateShirtIcon(currentShirtPlayer, color);
    closeModal('shirtModal');
}

// Multiplayer functions
async function hostGame() {
    const playerName = gameState.player1Name || translationManager.get('player1');
    
    // Initialize multiplayer if not done
    if (!multiplayerManager.playerId) {
        multiplayerManager.init();
    }
    
    const result = await multiplayerManager.hostGame(playerName);
    
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
