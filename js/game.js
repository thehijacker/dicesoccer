// Game logic and state management
class GameState {
    constructor() {
        this.player1Name = localStorage.getItem('dicesoccer_player1') || '';
        this.player2Name = localStorage.getItem('dicesoccer_player2') || '';
        this.player1Shirt = localStorage.getItem('dicesoccer_player1_shirt') || 'green';
        this.player2Shirt = localStorage.getItem('dicesoccer_player2_shirt') || 'blue';
        this.difficulty = localStorage.getItem('dicesoccer_difficulty') || 'easy';
        this.soundEnabled = localStorage.getItem('dicesoccer_sound') !== 'false';
        this.orientation = localStorage.getItem('dicesoccer_orientation') || 'portrait';
        this.twoPlayerMode = localStorage.getItem('dicesoccer_twoPlayerMode') === 'true';
        this.hintsEnabled = localStorage.getItem('dicesoccer_hints') !== 'off';
        this.fastAI = localStorage.getItem('dicesoccer_fastAI') !== 'false';
        this.autoDice = localStorage.getItem('dicesoccer_autoDice') !== 'false';
        this.isMultiplayer = false;
        this.gameMode = 'local'; // can be local, ai, multiplayer
        
        // Temporary colors for multiplayer (don't save these)
        this.multiplayerPlayer1Shirt = null;
        this.multiplayerPlayer2Shirt = null;
    }
    
    // Get the active shirt color (multiplayer temp or default)
    getPlayer1Shirt() {
        return this.multiplayerPlayer1Shirt || this.player1Shirt;
    }
    
    getPlayer2Shirt() {
        return this.multiplayerPlayer2Shirt || this.player2Shirt;
    }
    
    // Set temporary multiplayer colors (not saved to localStorage)
    setMultiplayerColors(player1Color, player2Color) {
        this.multiplayerPlayer1Shirt = player1Color;
        this.multiplayerPlayer2Shirt = player2Color;
    }
    
    // Clear multiplayer colors (use defaults)
    clearMultiplayerColors() {
        this.multiplayerPlayer1Shirt = null;
        this.multiplayerPlayer2Shirt = null;
    }

    save() {
        localStorage.setItem('dicesoccer_player1', this.player1Name);
        localStorage.setItem('dicesoccer_player2', this.player2Name);
        localStorage.setItem('dicesoccer_player1_shirt', this.player1Shirt);
        localStorage.setItem('dicesoccer_player2_shirt', this.player2Shirt);
        localStorage.setItem('dicesoccer_difficulty', this.difficulty);
        localStorage.setItem('dicesoccer_sound', this.soundEnabled.toString());
        localStorage.setItem('dicesoccer_orientation', this.orientation);
        localStorage.setItem('dicesoccer_twoPlayerMode', this.twoPlayerMode.toString());
        localStorage.setItem('dicesoccer_fastAI', this.fastAI.toString());
        localStorage.setItem('dicesoccer_autoDice', this.autoDice.toString());
    }

    setPlayerName(player, name) {
        if (player === 1) {
            this.player1Name = name;
        } else {
            this.player2Name = name;
        }
        this.save();
    }

    setPlayerShirt(player, color) {
        if (player === 1) {
            this.player1Shirt = color;
        } else {
            this.player2Shirt = color;
        }
        this.save();
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.save();
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        this.save();
        return this.soundEnabled;
    }

    setTwoPlayerMode(enabled) {
        this.twoPlayerMode = enabled;
        this.save();
    }

    setFastAI(enabled) {
        this.fastAI = enabled;
        this.save();
    }

    setAutoDice(enabled) {
        this.autoDice = enabled;
        this.save();
    }

    startGame(mode = 'local') {
        this.gameMode = mode;
        this.isMultiplayer = mode === 'multiplayer';
        console.log('Starting game in mode:', mode);
        console.log('Player 1:', this.player1Name, this.player1Shirt);
        console.log('Player 2:', this.player2Name, this.player2Shirt);
        if (mode === 'ai') {
            console.log('AI Difficulty:', this.difficulty);
        }
    }
}

// Sound manager
class SoundManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.sounds = {
            pop: new Audio('sounds/pop.mp3'),
            walk: new Audio('sounds/walk.mp3'),
            whistle: new Audio('sounds/whistle.mp3'),
            rollingDice: new Audio('sounds/rolling-dice.mp3'),
            crowdCheers: new Audio('sounds/crowd-cheers.mp3')
        };

        // Preload sounds
        Object.values(this.sounds).forEach(sound => {
            sound.preload = 'auto';
        });
    }

    play(soundName) {
        if (!this.gameState.soundEnabled) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.error('Sound play failed:', err);
            });
        }
    }

    stop(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.pause();
            sound.currentTime = 0;
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }
}

// Shirt colors configuration
const shirtColors = [
    'blue', 'green', 'orange', 'yellow', 
    'red', 'pink', 'purple', 'barca', 
    'argentina', 'slovenija'
];

// Get shirt image path
function getShirtImage(color, number = 1) {
    return `images/${color}${number}.png`;
}

// Get a random shirt color different from the given color
function getRandomDifferentShirtColor(excludeColor) {
    const availableColors = shirtColors.filter(c => c !== excludeColor);
    return availableColors[Math.floor(Math.random() * availableColors.length)];
}

// Initialize game state
const gameState = new GameState();
const soundManager = new SoundManager(gameState);

// Dice Soccer Game Board Class
// Dice Soccer Game class
class DiceSoccerGame {
    constructor() {
        this.cols = 9;
        this.rows = 5;
        this.board = [];
        this.currentPlayer = 1;
        this.diceValue = 0;
        this.selectedPlayer = null;
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1Moves = 0;
        this.player2Moves = 0;
        this.player1ThinkingTime = 0;
        this.player2ThinkingTime = 0;
        this.moveStartTime = null;
        this.gameStartTime = null;
        this.currentGameStartTime = null;
        this.totalGameTime = 0;
        this.isRolling = false;
        this.waitingForMove = false;
        this.isMoving = false; // Prevent multiple simultaneous moves
        this.nextRoundStartPlayer = 1; // Player 1 always starts the first round
        this.lastRoundLoser = null; // Track who lost the last round (starts next round)
        this.activeTimeouts = []; // Track all active timeouts
        this.activeIntervals = []; // Track all active intervals
        this.localPlayerReady = false; // For goal continue synchronization
        this.opponentPlayerReady = false; // For goal continue synchronization
        this.isResetting = false; // Prevent duplicate game resets for spectators
        
        // AI strategic tracking (for hard difficulty)
        this.aiScoutPlayer = null; // Track the forward scout player
        this.aiScoutBlocked = false; // Is the scout blocked?
        this.aiPhase = 'scout'; // 'scout' or 'defensive'
    }
    
    // Cleanup method to stop all running timers and reset state
    cleanup() {
        // Clear all active timeouts
        this.activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.activeTimeouts = [];
        
        // Clear all active intervals
        this.activeIntervals.forEach(intervalId => clearInterval(intervalId));
        this.activeIntervals = [];
        
        // Reset all game state flags
        this.isRolling = false;
        this.waitingForMove = false;
        this.isMoving = false;
        this.selectedPlayer = null;
        this.diceValue = 0;
        
        // Remove any animation clones that might still be present
        document.querySelectorAll('.player-shirt.jumping-animation-right, .player-shirt.jumping-animation-left, .player-shirt.jumping-animation-player2-portrait').forEach(clone => {
            clone.remove();
        });
        
        // Remove rolling class from dice
        document.querySelectorAll('.dice-image').forEach(dice => {
            dice.classList.remove('rolling');
        });
        
        // Clear highlights
        this.clearHighlights();
    }

    initBoard() {
        // Create empty board
        this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        
        // Place goalkeepers in middle of first and last columns
        const middleRow = Math.floor(this.rows / 2);
        this.board[middleRow][0] = { player: 1, number: 1 };
        this.board[middleRow][this.cols - 1] = { player: 2, number: 1 };
        
        // Place other players randomly in columns 1-2 for player 1, and 6-7 for player 2
        const numbers = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6]; // Each number twice
        
        // Player 1 positions (columns 1-2)
        let player1Numbers = [...numbers];
        this.shuffleArray(player1Numbers);
        let p1Index = 0;
        for (let col = 1; col <= 2; col++) {
            for (let row = 0; row < this.rows; row++) {
                if (p1Index < player1Numbers.length) {
                    this.board[row][col] = { player: 1, number: player1Numbers[p1Index++] };
                }
            }
        }
        
        // Player 2 positions (columns 6-7, which is cols-3 to cols-2)
        let player2Numbers = [...numbers];
        this.shuffleArray(player2Numbers);
        let p2Index = 0;
        for (let col = this.cols - 3; col <= this.cols - 2; col++) {
            for (let row = 0; row < this.rows; row++) {
                if (p2Index < player2Numbers.length) {
                    this.board[row][col] = { player: 2, number: player2Numbers[p2Index++] };
                }
            }
        }
        
        // In multiplayer, host sends board state to guest
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && multiplayerManager.isHost) {
            debugLog('Host sending board state to guest');
            multiplayerManager.sendEvent({
                type: 'boardState',
                board: this.board
            });
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    renderBoard() {
        const fieldGrid = document.getElementById('fieldGrid');
        
        // Forcefully clear the grid
        while (fieldGrid.firstChild) {
            fieldGrid.removeChild(fieldGrid.firstChild);
        }
        
        const isLandscape = gameState.orientation === 'landscape';
        const isMultiplayerGuest = gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost;
        
        if (isLandscape) {
            // Landscape: 9 columns × 5 rows (wide board, players left/right)
            if (isMultiplayerGuest) {
                // Guest: Flip the board horizontally so they see their pieces (P2) on left
                for (let row = 0; row < this.rows; row++) {
                    for (let col = this.cols - 1; col >= 0; col--) {
                        this.createCell(fieldGrid, row, col, true); // true = flipped view
                    }
                }
            } else {
                // Host/Local: Normal rendering, P1 on left
                for (let row = 0; row < this.rows; row++) {
                    for (let col = 0; col < this.cols; col++) {
                        this.createCell(fieldGrid, row, col, false);
                    }
                }
            }
        } else {
            // Portrait: 5 columns × 9 rows (tall board, players top/bottom)
            // Transpose: render column by column in REVERSE order to rotate 90 degrees
            if (isMultiplayerGuest) {
                // Guest: Flip so their pieces (P2) are at bottom
                for (let col = 0; col < this.cols; col++) {
                    for (let row = 0; row < this.rows; row++) {
                        this.createCell(fieldGrid, row, col, true); // true = flipped view
                    }
                }
            } else {
                // Host/Local: This puts Player 1 (col 0) at bottom and Player 2 (col 8) at top
                for (let col = this.cols - 1; col >= 0; col--) {
                    for (let row = 0; row < this.rows; row++) {
                        this.createCell(fieldGrid, row, col, false);
                    }
                }
            }
        }
    }

    createCell(container, row, col, isFlippedView = false) {
        const cell = document.createElement('div');
        cell.className = 'field-cell';
        cell.id = `cell-${row}-${col}`; // Add unique ID for each cell
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // Empty cells in first and last columns (except middle)
        const middleRow = Math.floor(this.rows / 2);
        if ((col === 0 || col === this.cols - 1) && row !== middleRow) {
            cell.classList.add('empty-cell');
            container.appendChild(cell);
            return; // Don't add click listener to empty cells
        }
        
        // Goal cells
        if ((col === 0 || col === this.cols - 1) && row === middleRow) {
            cell.classList.add('goal-cell');
        }
        
        const piece = this.board[row][col];
        if (piece) {
            const shirtImg = document.createElement('img');
            
            // In flipped view (guest), swap the visual appearance but keep actual player number
            let displayPlayer = piece.player;
            if (isFlippedView) {
                // Guest sees Player 2 pieces as "their" pieces (display as P1 colors)
                // and Player 1 pieces as opponent (display as P2 colors)
                displayPlayer = piece.player === 1 ? 2 : 1;
            }
            
            const shirtColor = displayPlayer === 1 ? gameState.getPlayer1Shirt() : gameState.getPlayer2Shirt();
            shirtImg.src = getShirtImage(shirtColor, piece.number);
            shirtImg.className = `player-shirt player${displayPlayer}-shirt`;
            shirtImg.alt = `Player ${piece.player} - ${piece.number}`;
            cell.appendChild(shirtImg);
        }
        
        cell.addEventListener('click', () => this.handleCellClick(row, col));
        container.appendChild(cell);
    }

    handleCellClick(row, col) {
        debugLog(`🖱️ handleCellClick(${row}, ${col}) - isRolling: ${this.isRolling}, isMoving: ${this.isMoving}, currentPlayer: ${this.currentPlayer}, localPlayer: ${multiplayerManager?.localPlayer}, waitingForMove: ${this.waitingForMove}`);
        
        // Disable all interactions in spectator mode
        if (gameState.gameMode === 'spectator') {
            return;
        }
        
        if (this.isRolling || this.isMoving) return; // Prevent clicks during dice roll or move animation
        
        // Prevent interaction when it's AI's turn
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2) {
            return; // It's AI's turn, no human interaction allowed
        }
        
        // Collapse menu if expanded
        if (window.collapseMenuButton) window.collapseMenuButton();
        
        // In multiplayer, only allow clicks when it's local player's turn
        if (gameState.gameMode === 'multiplayer' && multiplayerManager.localPlayer !== this.currentPlayer) {
            debugLog(`❌ Not local player's turn. localPlayer=${multiplayerManager.localPlayer}, currentPlayer=${this.currentPlayer}`);
            return; // Not local player's turn
        }
        
        // Check if dice has been rolled
        if (!this.waitingForMove) {
            debugLog(`❌ Dice not rolled yet (waitingForMove=${this.waitingForMove})`);
            this.showMessage(translationManager.get('rollDiceFirst'));
            return;
        }
        
        const piece = this.board[row][col];
        
        if (this.selectedPlayer) {
            // Trying to move selected player
            if (this.isValidMove(this.selectedPlayer.row, this.selectedPlayer.col, row, col)) {
                this.movePlayer(this.selectedPlayer.row, this.selectedPlayer.col, row, col);
            } else {
                // Deselect and show all movable players again
                this.clearHighlights();
                this.selectedPlayer = null;
                
                // Show all movable players again (only if hints are enabled)
                if (gameState.hintsEnabled) {
                    const movablePlayers = this.getMovablePlayers(this.diceValue);
                    if (movablePlayers.length === 0) {
                        const allMovable = this.getAllMovablePlayers();
                        allMovable.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
                    } else {
                        movablePlayers.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
                    }
                }
            }
        } else {
            // Selecting a player to move
            if (piece && piece.player === this.currentPlayer) {
                // Check if this player can be moved
                const movablePlayers = this.getMovablePlayers(this.diceValue);
                const isMovable = movablePlayers.some(p => p.row === row && p.col === col);
                
                if (movablePlayers.length === 0) {
                    // If no players with dice number, check if this player is in the "any can move" list
                    const allMovable = this.getAllMovablePlayers();
                    const isInAllMovable = allMovable.some(p => p.row === row && p.col === col);
                    
                    if (isInAllMovable && this.canPlayerMove(row, col)) {
                        this.selectedPlayer = { row, col };
                        this.highlightValidMoves(row, col);
                    } else if (!isInAllMovable) {
                        this.showMessage(translationManager.get('cannotMovePlayer'));
                    }
                } else if (isMovable && this.canPlayerMove(row, col)) {
                    this.selectedPlayer = { row, col };
                    this.highlightValidMoves(row, col);
                } else if (!isMovable) {
                    this.showMessage(translationManager.get('cannotMovePlayer'));
                }
            }
        }
    }

    showMessage(text, duration = 2000) {
        const messageEl = document.getElementById('gameMessage');
        messageEl.textContent = text;
        messageEl.classList.remove('hidden');
        
        // In 2-player mode, rotate message toward Player 2 when it's their turn
        if (gameState.twoPlayerMode && this.currentPlayer === 2) {
            messageEl.style.transform = 'translate(-50%, -50%) rotate(180deg)';
        } else {
            messageEl.style.transform = 'translate(-50%, -50%)';
        }
        
        const timeoutId = setTimeout(() => {
            messageEl.classList.add('hidden');
        }, duration);
        this.activeTimeouts.push(timeoutId);
    }

    showOpponentDisconnectedDialog() {
        const goalModal = document.getElementById('goalModal');
        const goalMessage = document.getElementById('goalMessage');
        const continueBtn = document.getElementById('continueGameBtn');
        const viewBoardBtn = document.getElementById('viewBoardFromGoal');
        
        // Hide goal-specific elements (image and "GOAL!" heading)
        const goalImg = goalModal.querySelector('img');
        const goalHeading = goalModal.querySelector('h2');
        if (goalImg) goalImg.style.display = 'none';
        if (goalHeading) goalHeading.style.display = 'none';
        
        // Show disconnect message
        goalMessage.textContent = translationManager.get('waitingForOpponent') || 'Waiting for opponent to reconnect';
        goalModal.classList.add('active');
        
        // Hide continue button, change view board to "Back to Lobby"
        continueBtn.style.display = 'none';
        viewBoardBtn.textContent = translationManager.get('backToLobby') || 'Back to Lobby';
        viewBoardBtn.style.display = 'block';
        
        // Add click handler to return to lobby
        const lobbyHandler = async () => {
            viewBoardBtn.removeEventListener('click', lobbyHandler);
            goalModal.classList.remove('active');
            
            // Restore goal modal elements
            if (goalImg) goalImg.style.display = '';
            if (goalHeading) goalHeading.style.display = '';
            
            // Log game end
            if (window.gameLogger && window.gameLogger.logId) {
                const player1Name = gameState.player1Name || 'Player 1';
                const player2Name = gameState.player2Name || 'Player 2';
                
                await window.gameLogger.endGameLog(
                    'None',
                    this.player1Score,
                    this.player2Score,
                    this.player1Moves,
                    this.player2Moves,
                    this.player1ThinkingTime,
                    this.player2ThinkingTime,
                    Date.now() - this.gameStartTime,
                    'Opponent Disconnected'
                );
            }
            
            // Leave game and return to lobby
            if (multiplayerManager) {
                multiplayerManager.stopPolling();
                await multiplayerManager.leaveGame();
            }
            
            // Restore original player 2 name
            if (gameState.originalPlayer2Name) {
                gameState.player2Name = gameState.originalPlayer2Name;
                gameState.originalPlayer2Name = null;
            }
            
            showScreen('mainMenu');
            setTimeout(() => {
                openLobby();
            }, 100);
        };
        
        viewBoardBtn.addEventListener('click', lobbyHandler);
    }

    hideOpponentDisconnectedDialog() {
        const goalModal = document.getElementById('goalModal');
        const continueBtn = document.getElementById('continueGameBtn');
        const viewBoardBtn = document.getElementById('viewBoardFromGoal');
        
        // Close the modal
        goalModal.classList.remove('active');
        
        // Restore goal modal elements
        const goalImg = goalModal.querySelector('img');
        const goalHeading = goalModal.querySelector('h2');
        if (goalImg) goalImg.style.display = '';
        if (goalHeading) goalHeading.style.display = '';
        
        // Restore original button states
        continueBtn.style.display = 'block';
        viewBoardBtn.style.display = 'none';
        viewBoardBtn.textContent = translationManager.get('viewBoard') || 'View Board';
        
        // Show a brief message that opponent reconnected
        this.showMessage(translationManager.get('opponentReconnected') || 'Opponent reconnected!', 2000);
    }

    rollDice() {
        // Prevent rolling while already rolling, waiting for a move, or while a move animation is in progress
        if (this.isRolling || this.waitingForMove || this.isMoving) return;
        
        // Disable dice rolling in spectator mode
        if (gameState.gameMode === 'spectator') {
            return;
        }

        // Generate dice value IMMEDIATELY (before animation)
        this.diceValue = Math.floor(Math.random() * 6) + 1;
        
        // Send multiplayer event IMMEDIATELY so opponent starts animating at same time
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            multiplayerManager.sendEvent({
                type: 'diceRolled',
                player: this.currentPlayer,
                value: this.diceValue
            });
        }
        
        this.isRolling = true;
        
        // Determine which visual dice to animate
        // Guest (Player 2) sees their dice as "Player 1" visually
        const visualPlayer = (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost && this.currentPlayer === 2) ? 1 : this.currentPlayer;
        const diceImg = document.getElementById(`player${visualPlayer}Dice`);
        
        // Check if this is AI turn with Fast AI enabled
        const isFastAI = gameState.fastAI && gameState.gameMode === 'ai' && this.currentPlayer === 2;
        const animationDuration = isFastAI ? 100 : 1000;
        
        diceImg.classList.add('rolling');

        // Do not play roll dice sound if fast AI as sound is longer than animation
        if (!isFastAI) soundManager.play('rollingDice');
        
        // Animate dice rolling with random values
        const rollInterval = setInterval(() => {
            const randomValue = Math.floor(Math.random() * 6) + 1;
            diceImg.src = `images/dice${randomValue}.png`;
        }, 100);
        this.activeIntervals.push(rollInterval);
        
        // Stop after animation and show final value
        const timeoutId = setTimeout(() => {
            clearInterval(rollInterval);
            diceImg.src = `images/dice${this.diceValue}.png`;
            diceImg.classList.remove('rolling');
            this.isRolling = false;
            
            this.handleDiceRolled();
        }, animationDuration);
        this.activeTimeouts.push(timeoutId);
    }

    handleDiceRolled() {
        this.waitingForMove = true;
        this.moveStartTime = Date.now(); // Start tracking thinking time
        
        // Log dice roll event
        if (window.gameLogger && window.gameLogger.logId) {
            const playerName = this.currentPlayer === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            window.gameLogger.logEvent('DICE_ROLL', `${playerName} rolled ${this.diceValue}`);
        }
                
        // Find players with this number
        const movablePlayers = this.getMovablePlayers(this.diceValue);

        if (movablePlayers.length === 0) {
            // No players with this number can move, try all movable players
            const allMovable = this.getAllMovablePlayers();
            if (allMovable.length > 0) {
                // Highlight all that can move (only if hints are enabled AND not AI's turn)
                if (gameState.hintsEnabled && !(gameState.gameMode === 'ai' && this.currentPlayer === 2)) {
                    allMovable.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
                }
            } else {
                // No moves possible for current player
                this.handleNoMovesAvailable();
                return;
            }
        } else {
            // Highlight only movable players with this number (only if hints are enabled AND not AI's turn)
            if (gameState.hintsEnabled && !(gameState.gameMode === 'ai' && this.currentPlayer === 2)) {
                movablePlayers.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
            }
        }
        
        // AI move - execute faster without too much delay for faster gameplay
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2) {
            const timeoutId = setTimeout(() => this.makeAIMove(), 500);
            this.activeTimeouts.push(timeoutId);
        }
    }

    getMovablePlayers(number) {
        const movable = [];
        // Safety check: ensure board is initialized
        if (!this.board || this.board.length === 0) {
            return movable;
        }
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Additional safety check for row existence
                if (!this.board[row]) continue;
                const piece = this.board[row][col];
                if (piece && piece.player === this.currentPlayer && piece.number === number) {
                    if (this.canPlayerMove(row, col)) {
                        movable.push({ row, col });
                    }
                }
            }
        }
        return movable;
    }

    getAllMovablePlayers() {
        const movable = [];
        // Safety check: ensure board is initialized
        if (!this.board || this.board.length === 0) {
            return movable;
        }
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                // Additional safety check for row existence
                if (!this.board[row]) continue;
                const piece = this.board[row][col];
                if (piece && piece.player === this.currentPlayer) {
                    if (this.canPlayerMove(row, col)) {
                        movable.push({ row, col });
                    }
                }
            }
        }
        return movable;
    }

    canPlayerMove(row, col) {
        const validMoves = this.getValidMoves(row, col);
        return validMoves.length > 0;
    }

    getValidMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        if (!piece) return moves;
        
        const direction = piece.player === 1 ? 1 : -1; // Player 1 moves right, Player 2 moves left
        const middleRow = Math.floor(this.rows / 2);
        
        // Forward
        const forwardCol = col + direction;
        if (forwardCol >= 0 && forwardCol < this.cols) {
            // Check if it's an empty cell (non-goal cell in first/last column)
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && row !== middleRow;
            if (!isEmptyCell && !this.board[row][forwardCol]) {
                moves.push({ row, col: forwardCol });
            }
        }
        
        // Diagonal forward-up
        const upRow = row - 1;
        if (upRow >= 0 && forwardCol >= 0 && forwardCol < this.cols) {
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && upRow !== middleRow;
            if (!isEmptyCell && !this.board[upRow][forwardCol]) {
                moves.push({ row: upRow, col: forwardCol });
            }
        }
        
        // Diagonal forward-down
        const downRow = row + 1;
        if (downRow < this.rows && forwardCol >= 0 && forwardCol < this.cols) {
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && downRow !== middleRow;
            if (!isEmptyCell && !this.board[downRow][forwardCol]) {
                moves.push({ row: downRow, col: forwardCol });
            }
        }
        
        return moves;
    }

    // --- START MINIMAX & AI STRATEGY FUNCTIONS ---

    /**
     * Creates a new copy of the board and applies a move to it for simulation.
     * @param {Array} currentBoard - The board state to simulate on.
     * @param {object} move - The move to apply { fromRow, fromCol, toRow, toCol }.
     * @returns {Array} A new board state with the move applied.
     */
    applyMove(currentBoard, move) {
        // Deep copy the board to avoid modifying the original
        const newBoard = JSON.parse(JSON.stringify(currentBoard));
        const piece = newBoard[move.fromRow][move.fromCol];
        
        if (piece) {
            newBoard[move.toRow][move.toCol] = piece;
            newBoard[move.fromRow][move.fromCol] = null;
        }
        
        return newBoard;
    }

    /**
     * Finds valid moves for a piece on a simulated board.
     * @param {Array} board - The simulated board state.
     * @param {object} piecePosition - The position of the piece { row, col }.
     * @returns {Array} An array of valid move objects { row, col }.
     */
    getValidMovesSim(board, piecePosition) {
        const moves = [];
        const { row, col } = piecePosition;
        const piece = board[row][col];
        if (!piece) return moves;

        const direction = piece.player === 1 ? 1 : -1;
        const middleRow = Math.floor(this.rows / 2);

        // Forward
        const forwardCol = col + direction;
        if (forwardCol >= 0 && forwardCol < this.cols) {
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && row !== middleRow;
            if (!isEmptyCell && !board[row][forwardCol]) {
                moves.push({ row, col: forwardCol });
            }
        }

        // Diagonal forward-up
        const upRow = row - 1;
        if (upRow >= 0 && forwardCol >= 0 && forwardCol < this.cols) {
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && upRow !== middleRow;
            if (!isEmptyCell && !board[upRow][forwardCol]) {
                moves.push({ row: upRow, col: forwardCol });
            }
        }

        // Diagonal forward-down
        const downRow = row + 1;
        if (downRow < this.rows && forwardCol >= 0 && forwardCol < this.cols) {
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && downRow !== middleRow;
            if (!isEmptyCell && !board[downRow][forwardCol]) {
                moves.push({ row: downRow, col: forwardCol });
            }
        }

        return moves;
    }

    /**
     * Generates all possible moves for a player on a simulated board.
     * @param {number} player - The player to get moves for (1 or 2).
     * @param {Array} board - The simulated board state.
     * @param {number|null} diceValue - The dice value to filter by. If null, gets all movable players.
     * @returns {Array} An array of all possible moves [{ fromRow, fromCol, toRow, toCol }].
     */
    getAllValidMovesSim(player, board, diceValue = null) {
        const allMoves = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const piece = board[r][c];
                if (piece && piece.player === player) {
                    // If a dice value is specified, only consider pieces with that number
                    if (diceValue && piece.number !== diceValue) {
                        continue;
                    }
                    
                    const validMoves = this.getValidMovesSim(board, { row: r, col: c });
                    if (validMoves.length > 0) {
                        validMoves.forEach(move => {
                            allMoves.push({ fromRow: r, fromCol: c, toRow: move.row, toCol: move.col });
                        });
                    }
                }
            }
        }
        
        // If a dice value was provided and no moves were found, check for the "any piece can move" rule
        if (diceValue && allMoves.length === 0) {
            return this.getAllValidMovesSim(player, board, null); // Re-run without dice constraint
        }
        
        return allMoves;
    }

    /**
     * Checks if a player has any possible moves on a simulated board.
     * @param {number} player - The player to check.
     * @param {Array} board - The simulated board state.
     * @returns {boolean} True if the player has at least one move, false otherwise.
     */
    checkAnyPossibleMovesSim(player, board) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const piece = board[r][c];
                if (piece && piece.player === player) {
                    const validMoves = this.getValidMovesSim(board, { row: r, col: c });
                    if (validMoves.length > 0) {
                        return true; // Found at least one possible move
                    }
                }
            }
        }
        return false; // No moves available for this player
    }

    /**
     * This is the static heuristic evaluation for Minimax. It assigns a score
     * to a board position from the perspective of the AI (Player 2).
     * @param {Array} board - The board state to evaluate.
     * @returns {number} The heuristic score. Higher is better for the AI.
     */
    evaluateBoardState(board, player1Score, player2Score) {
        let score = 0;
        const aiPlayer = 2;
        const humanPlayer = 1;
        const middleRow = Math.floor(this.rows / 2);

        // --- Endgame Logic ---
        const isEndgame = player1Score === 2 || player2Score === 2;
        const goalProximityWeight = isEndgame ? 20 : 10; // Double the importance of getting to goal in endgame

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                if (piece.player === aiPlayer) {
                    // AI's score
                    // 1. Proximity to human's goal (col 0)
                    score += (this.cols - 1 - c) * goalProximityWeight;
                    // 2. Bonus for being on the middle row
                    if (r === middleRow) score += 5;
                    // 3. Goalkeeper safety (massive penalty for moving it)
                    if (piece.number === 1 && (c !== this.cols - 1 || r !== middleRow)) {
                        score -= 50000;
                    }
                    // 4. NEW: Control of the Center
                    if (c >= 3 && c <= 5) {
                        score += 15; // Bonus for occupying central columns
                    }
                } else {
                    // Human's score (subtracted from AI's score)
                    // 1. Proximity to AI's goal (col 8)
                    score -= c * goalProximityWeight;
                    // 2. Bonus for being on the middle row
                    if (r === middleRow) score -= 5;
                    // 3. Goalkeeper safety (if human moves GK, it's good for AI)
                    if (piece.number === 1 && (c !== 0 || r !== middleRow)) {
                        score += 1000;
                    }
                    // 4. NEW: Control of the Center (penalize human for it)
                    if (c >= 3 && c <= 5) {
                        score -= 15;
                    }
                }
            }
        }
        
        // --- Mobility Score ---
        const aiMoves = this.getAllValidMovesSim(aiPlayer, board, null).length;
        const humanMoves = this.getAllValidMovesSim(humanPlayer, board, null).length;
        score += (aiMoves - humanMoves) * 10; // Reward having more moves than the opponent

        // Check for win/loss states
        if (board[middleRow][0]?.player === aiPlayer) return 100000; // AI wins
        if (board[middleRow][this.cols - 1]?.player === humanPlayer) return -100000; // Human wins
        
        // Check for "no moves available" (block win/loss)
        if (humanMoves === 0) return 90000; // AI forces a block win
        if (aiMoves === 0) return -90000; // AI is blocked

        return score;
    }

    /**
     * The recursive Minimax search algorithm with Alpha-Beta Pruning.
     * @param {Array} board - The current board state.
     * @param {number} depth - The current depth in the search tree.
     * @param {boolean} isMaximizingPlayer - True if it's the AI's turn (maximizer), false for human (minimizer).
     * @param {number} alpha - The best score found so far for the maximizer.
     * @param {number} beta - The best score found so far for the minimizer.
     * @returns {number} The best possible score from this board state.
     */
    minimax(board, depth, isMaximizingPlayer, alpha, beta) {
        // Base case: if we've reached max depth or it's a terminal state (win/loss/draw)
        if (depth === 0 || board[Math.floor(this.rows / 2)][0] || board[Math.floor(this.rows / 2)][this.cols - 1]) {
            return this.evaluateBoardState(board);
        }

        if (isMaximizingPlayer) { // AI's turn (Maximizer)
            let maxEval = -Infinity;
            // We don't know the human's dice roll, so we must assume they can move ANY piece.
            // This is a conservative assumption for the AI's move.
            const moves = this.getAllValidMovesSim(2, board, null);
            
            if (moves.length === 0) {
                return this.evaluateBoardState(board); // No moves, evaluate current board
            }

            for (const move of moves) {
                const newBoard = this.applyMove(board, move);
                const evaluation = this.minimax(newBoard, depth - 1, false, alpha, beta);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break; // Beta cutoff
                }
            }
            return maxEval;
        } else { // Opponent's turn (Minimizer)
            let minEval = Infinity;
            // The AI knows its own dice roll, so it simulates the opponent's response to moves made with that dice roll.
            // However, for the lookahead, we assume the opponent can use ANY piece to counter.
            const moves = this.getAllValidMovesSim(1, board, null);

            if (moves.length === 0) {
                return this.evaluateBoardState(board); // No moves, evaluate current board
            }

            for (const move of moves) {
                const newBoard = this.applyMove(board, move);
                const evaluation = this.minimax(newBoard, depth - 1, true, alpha, beta);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break; // Alpha cutoff
                }
            }
            return minEval;
        }
    }

    // --- END MINIMAX & AI STRATEGY FUNCTIONS ---

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const validMoves = this.getValidMoves(fromRow, fromCol);
        return validMoves.some(move => move.row === toRow && move.col === toCol);
    }

    movePlayer(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        
        // Clear highlights immediately when move starts
        this.clearHighlights();
        this.selectedPlayer = null;
        
        // Log move event
        if (window.gameLogger && window.gameLogger.logId && piece) {
            const playerName = piece.player === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            window.gameLogger.logEvent('MOVE', `${playerName} moved player #${piece.number} from (${fromRow},${fromCol}) to (${toRow},${toCol})`);
        }
        
        // Set moving flag to prevent multiple simultaneous moves
        this.isMoving = true;
        this.waitingForMove = false; // Clear waiting state immediately
        
        // Track thinking time and increment move counter
        if (this.moveStartTime) {
            const thinkingTime = Date.now() - this.moveStartTime;
            if (this.currentPlayer === 1) {
                this.player1ThinkingTime += thinkingTime;
                this.player1Moves++;
            } else {
                this.player2ThinkingTime += thinkingTime;
                this.player2Moves++;
            }
            this.moveStartTime = null;
        }
        
        soundManager.play('walk');
        
        // Send multiplayer event if in multiplayer mode
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            debugLog(`📤 Sending playerMoved event: from (${fromRow},${fromCol}) to (${toRow},${toCol}), current player: ${this.currentPlayer}`);
            multiplayerManager.sendEvent({
                type: 'playerMoved',
                fromRow,
                fromCol,
                toRow,
                toCol
            });
        }
        
        // Get the from and to cells
        const cells = document.querySelectorAll('.field-cell');
        let fromCell = null;
        let toCell = null;
        
        cells.forEach(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            if (row === fromRow && col === fromCol) {
                fromCell = cell;
            }
            if (row === toRow && col === toCol) {
                toCell = cell;
            }
        });
        
        if (fromCell && toCell) {
            const shirtImg = fromCell.querySelector('.player-shirt');
            if (shirtImg) {
                // Get positions
                const fromRect = fromCell.getBoundingClientRect();
                const toRect = toCell.getBoundingClientRect();
                
                // Calculate distance
                const deltaX = toRect.left - fromRect.left;
                const deltaY = toRect.top - fromRect.top;
                
                // Determine rotation direction based on player and movement
                // Player 1 moves right (positive deltaX) - rotate clockwise
                // Player 2 moves left (negative deltaX) - rotate counter-clockwise
                const isMovingLeft = deltaX < 0;
                const isPlayer2 = piece.player === 2;
                const isPortrait = gameState.orientation === 'portrait';
                
                // For portrait mode Player 2 in LOCAL 2-player mode, pieces are already rotated 180deg
                // In multiplayer, guest sees themselves at bottom with no rotation
                const needsFlippedAnimation = isPortrait && isPlayer2 && gameState.twoPlayerMode && gameState.gameMode !== 'multiplayer';
                
                // Create clone for animation
                const clone = shirtImg.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.left = fromRect.left + 'px';
                clone.style.top = fromRect.top + 'px';
                clone.style.width = fromRect.width + 'px';
                clone.style.height = fromRect.height + 'px';
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                clone.style.transition = 'none'; // Disable CSS transitions on the clone
                
                // Choose animation based on movement direction and player
                if (needsFlippedAnimation) {
                    clone.classList.add('jumping-animation-player2-portrait');
                } else if (isMovingLeft) {
                    clone.classList.add('jumping-animation-left');
                } else {
                    clone.classList.add('jumping-animation-right');
                }
                
                // Set CSS variables for animation
                clone.style.setProperty('--deltaX', deltaX + 'px');
                clone.style.setProperty('--deltaY', deltaY + 'px');
                
                document.body.appendChild(clone);
                
                // Completely remove original shirt element immediately
                shirtImg.remove();
                fromCell.style.pointerEvents = 'none';
                
                // Update board state immediately
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;
                
                // Wait for animation to complete
                const animationTimeoutId = setTimeout(() => {
                    // Remove clone completely before calling renderBoard
                    clone.remove();
                    
                    // Small delay to ensure clone is fully removed from DOM
                    requestAnimationFrame(() => {
                        // Now render the board to show piece at new position
                        this.renderBoard();
                        
                        // Check for goal
                        const middleRow = Math.floor(this.rows / 2);
                        if ((toCol === 0 && piece.player === 2) || (toCol === this.cols - 1 && piece.player === 1)) {
                            const goalTimeoutId = setTimeout(() => this.handleGoal(), 300);
                            this.activeTimeouts.push(goalTimeoutId);
                        } else {
                            const switchTimeoutId = setTimeout(() => this.switchPlayer(), 200);
                            this.activeTimeouts.push(switchTimeoutId);
                        }
                    });
                }, 500);
                this.activeTimeouts.push(animationTimeoutId);
                
                return;
            }
        }
        
        // Fallback if animation fails
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        this.renderBoard();
        
        // Check for goal
        const middleRow = Math.floor(this.rows / 2);
        if ((toCol === 0 && piece.player === 2) || (toCol === this.cols - 1 && piece.player === 1)) {
            const goalTimeoutId = setTimeout(() => this.handleGoal(), 500);
            this.activeTimeouts.push(goalTimeoutId);
        } else {
            const switchTimeoutId = setTimeout(() => this.switchPlayer(), 300);
            this.activeTimeouts.push(switchTimeoutId);
        }
    }

    highlightCell(row, col, className) {
        const fieldGrid = document.getElementById('fieldGrid');
        const cells = fieldGrid.querySelectorAll('.field-cell');
        
        cells.forEach(cell => {
            const cellRow = parseInt(cell.dataset.row);
            const cellCol = parseInt(cell.dataset.col);
            
            if (cellRow === row && cellCol === col) {
                cell.classList.add(className);
            }
        });
    }

    highlightValidMoves(row, col) {
        this.clearHighlights();
        // Always highlight the selected player (even with hints disabled)
        this.highlightCell(row, col, 'movable');
        
        // Only highlight valid move positions if hints are enabled
        if (gameState.hintsEnabled) {
            const validMoves = this.getValidMoves(row, col);
            validMoves.forEach(move => this.highlightCell(move.row, move.col, 'valid-move'));
        }
    }

    clearHighlights() {
        const fieldGrid = document.getElementById('fieldGrid');
        fieldGrid.querySelectorAll('.field-cell').forEach(cell => {
            cell.classList.remove('movable', 'valid-move');
        });
    }

    switchPlayer() {
        debugLog(`🔄 switchPlayer() called. Current player before switch: ${this.currentPlayer}`);
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        debugLog(`🔄 switchPlayer() - New current player: ${this.currentPlayer}, Local player: ${multiplayerManager?.localPlayer}`);
        this.waitingForMove = false;
        this.isMoving = false; // Reset moving flag
        this.diceValue = 0;
        this.updateUI();
        
        // Check if current player has ANY possible moves before allowing dice roll
        const allMovablePlayers = this.getAllMovablePlayers();
        if (allMovablePlayers.length === 0) {
            // Current player is completely blocked - opponent wins this round!
            this.handleNoMovesAvailable();
            return;
        }
        
        // Update menu button rotation and collapse if expanded
        if (window.updateMenuRotation) window.updateMenuRotation();
        if (window.collapseMenuButton) window.collapseMenuButton();
        
        // Enable/disable dice based on game mode
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            // In multiplayer, enable dice only if it's local player's turn
            const isLocalPlayerTurn = this.currentPlayer === multiplayerManager.localPlayer;
            
            if (multiplayerManager.localPlayer === 1) {
                // Host sees P1 as bottom/left, P2 as top/right
                document.getElementById('player1DiceContainer').classList.toggle('disabled', !isLocalPlayerTurn);
                document.getElementById('player2DiceContainer').classList.toggle('disabled', isLocalPlayerTurn);
            } else {
                // Guest sees P2 as bottom/left (displayed as P1), P1 as top/right (displayed as P2)
                // But currentPlayer is global (1 or 2), so check if it matches localPlayer (2)
                document.getElementById('player1DiceContainer').classList.toggle('disabled', !isLocalPlayerTurn);
                document.getElementById('player2DiceContainer').classList.toggle('disabled', isLocalPlayerTurn);
            }
        } else {
            // Local/AI game - normal dice enabling
            document.getElementById('player1DiceContainer').classList.toggle('disabled', this.currentPlayer !== 1);
            document.getElementById('player2DiceContainer').classList.toggle('disabled', this.currentPlayer !== 2);
        }
        
        // AI turn
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2 && !this.isRolling) {
            const timeoutId = setTimeout(() => this.rollDice(), 800);
            this.activeTimeouts.push(timeoutId);
        }
        // Auto dice for human players when enabled
        else if (gameState.autoDice && !this.isRolling) {
            // Don't auto-roll for AI player, and don't auto-roll in multiplayer for remote player
            const shouldAutoRoll = gameState.gameMode === 'local' || 
                                  (gameState.gameMode === 'ai' && this.currentPlayer === 1) ||
                                  (gameState.gameMode === 'multiplayer' && multiplayerManager && this.currentPlayer === multiplayerManager.localPlayer);
            
            if (shouldAutoRoll) {
                const timeoutId = setTimeout(() => this.rollDice(), 500);
                this.activeTimeouts.push(timeoutId);
            }
        }
    }

    handleNoMovesAvailable() {
        // Current player has no moves available - opponent scores!
        soundManager.play('crowdCheers');
        
        this.isMoving = false; // Reset moving flag
        
        const blockedPlayer = this.currentPlayer;
        const scoringPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // Update scores - account for guest perspective (same logic as handleGoal)
        const isGuestPlayer = gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost;
        if (isGuestPlayer) {
            // Guest: currentPlayer is true game (1=host, 2=guest), but display is flipped
            // So if scoringPlayer=2 (guest scores), increment player1Score (guest's display score)
            if (scoringPlayer === 2) {
                this.player1Score++; // Guest scored (their display = player1)
            } else {
                this.player2Score++; // Host scored (their display = player2)
            }
        } else {
            // Host or local mode: normal increment
            if (scoringPlayer === 1) {
                this.player1Score++;
            } else {
                this.player2Score++;
            }
        }
        
        // Log event
        if (window.gameLogger && window.gameLogger.logId) {
            const blocked = blockedPlayer === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            const scorer = scoringPlayer === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            window.gameLogger.logEvent('NO_MOVES', `${blocked} blocked! ${scorer} scores. Score: ${this.player1Score} - ${this.player2Score}`);
        }
        
        this.updateUI();
        
        // Track who lost this round (for next round start)
        this.lastRoundLoser = blockedPlayer;
        
        // In multiplayer, send event to sync scores and lastRoundLoser
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            // Send TRUE scores (not display scores)
            const trueScore1 = isGuestPlayer ? this.player2Score : this.player1Score;
            const trueScore2 = isGuestPlayer ? this.player1Score : this.player2Score;
            
            multiplayerManager.sendEvent({
                type: 'noMoves',
                blockedPlayer: blockedPlayer,
                scoringPlayer: scoringPlayer,
                score1: trueScore1,
                score2: trueScore2
            });
        }
        
        // Check for winner - if game is over, go directly to endGame without showing goal modal
        if (this.player1Score >= 3 || this.player2Score >= 3) {
            const timeoutId = setTimeout(() => this.endGame(), 300);
            this.activeTimeouts.push(timeoutId);
            return; // Skip showing goal modal
        }
        
        // Show no-moves modal
        this.showNoMovesModal();
    }

    showNoMovesModal() {
        // For spectators, show temporary notification instead of modal
        if (gameState.gameMode === 'spectator') {
            debugLog('👁️ Spectator: showing no-moves notification');
            
            // Determine blocked player name from spectator perspective (host=P1, guest=P2)
            const blocked = this.currentPlayer === 1 ? 
                (gameState.player1Name || translationManager.get('player1')) : 
                (gameState.player2Name || translationManager.get('player2'));
            const scorer = this.currentPlayer === 1 ? 
                (gameState.player2Name || translationManager.get('player2')) : 
                (gameState.player1Name || translationManager.get('player1'));
            
            // Show temporary message: "Player X blocked, Player Y scores (2:1)"
            const message = `${blocked} ${translationManager.get('noMovesAvailable')}, ${scorer} ${translationManager.get('scores')} (${this.player1Score}:${this.player2Score})`;
            this.showMessage(message, 3000);
            return;
        }
        
        // Determine names - account for guest perspective
        let blockedPlayerName, scorerName;
        const blockedPlayer = this.currentPlayer;
        const scoringPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost) {
            // Guest perspective: currentPlayer is from true game (1=host, 2=guest)
            // But display is flipped (player1Name=guest's name, player2Name=host's name)
            blockedPlayerName = blockedPlayer === 1 ? 
                (gameState.player2Name || translationManager.get('player2')) : // Blocked=1 (host) → show player2Name (host's name for guest)
                (gameState.player1Name || translationManager.get('player1'));  // Blocked=2 (guest) → show player1Name (guest's own name)
            
            scorerName = scoringPlayer === 1 ? 
                (gameState.player2Name || translationManager.get('player2')) : // Scorer=1 (host) → show player2Name (host's name for guest)
                (gameState.player1Name || translationManager.get('player1'));  // Scorer=2 (guest) → show player1Name (guest's own name)
        } else {
            // Host or local/AI mode: normal mapping
            blockedPlayerName = blockedPlayer === 1 ? 
                (gameState.player1Name || translationManager.get('player1')) :
                (gameState.gameMode === 'ai' ? 
                    `AI (${translationManager.get(gameState.difficulty)})` : 
                    (gameState.player2Name || translationManager.get('player2')));
                    
            scorerName = scoringPlayer === 1 ? 
                (gameState.player1Name || translationManager.get('player1')) :
                (gameState.gameMode === 'ai' ? 
                    `AI (${translationManager.get(gameState.difficulty)})` : 
                    (gameState.player2Name || translationManager.get('player2')));
        }
        
        // Show blocked message and current score
        document.getElementById('goalMessage').innerHTML = `${blockedPlayerName} ${translationManager.get('noMovesAvailable')}!<br>${scorerName} ${translationManager.get('scores')}!<br><strong style="font-size: 1.5em;">${this.player1Score} : ${this.player2Score}</strong>`;
        
        const goalModal = document.getElementById('goalModal');
        goalModal.classList.add('active');
        
        // Rotate goal modal for Player 2 in portrait 2-player mode
        if (gameState.twoPlayerMode && gameState.orientation === 'portrait' && scoringPlayer === 2) {
            goalModal.style.transform = 'rotate(180deg)';
        } else {
            goalModal.style.transform = '';
        }
    }

    makeAIMove() {
        const movablePlayers = this.getMovablePlayers(this.diceValue);
        let allMovable = movablePlayers.length > 0 ? movablePlayers : this.getAllMovablePlayers();
        
        if (allMovable.length === 0) {
            this.switchPlayer();
            return;
        }
        
        let bestPlayerMove = null;
        let bestScore = -Infinity;
        
        if (gameState.difficulty === 'hard') {
            // Hard AI: Use Minimax to find the best move
            const depth = 2; // 2-ply lookahead (AI's move, Opponent's response)
            
            // Get all possible moves for the current dice value (or any piece if none match)
            const possibleMoves = this.getAllValidMovesSim(this.currentPlayer, this.board, this.diceValue);

            // CRITICAL: Check for immediate goal scoring opportunity FIRST
            const middleRow = Math.floor(this.rows / 2);
            const opponentGoalCol = 0; // AI is player 2, attacking column 0
            
            for (const move of possibleMoves) {
                if (move.toCol === opponentGoalCol && move.toRow === middleRow) {
                    // IMMEDIATE GOAL! Take it without any further analysis
                    bestPlayerMove = { 
                        player: { row: move.fromRow, col: move.fromCol }, 
                        move: { row: move.toRow, col: move.toCol }
                    };
                    debugLog('Hard AI: Found immediate goal opportunity!');
                    break;
                }
            }
            
            // CRITICAL: Check for near-goal opportunities (1-2 moves away from goal)
            if (!bestPlayerMove) {
                for (const move of possibleMoves) {
                    // If we're very close to goal (within 3 columns) and on middle row or can reach it
                    if (move.toCol <= 3) {
                        const distanceToMiddle = Math.abs(move.toRow - middleRow);
                        // Piece is close to goal and close to middle row
                        if (move.toCol <= 2 && distanceToMiddle <= 1) {
                            debugLog(`Hard AI: Found near-goal opportunity at (${move.fromRow},${move.fromCol}) -> (${move.toRow},${move.toCol})`);
                            if (!bestPlayerMove || move.toCol < bestPlayerMove.move.col) {
                                bestPlayerMove = { 
                                    player: { row: move.fromRow, col: move.fromCol }, 
                                    move: { row: move.toRow, col: move.toCol }
                                };
                            }
                        }
                    }
                }
            }
            
            // If no immediate goal or near-goal found, use Minimax
            if (!bestPlayerMove) {
                debugLog('Hard AI: Evaluating moves for dice value:', this.diceValue);
                
                for (const move of possibleMoves) {
                    // 1. Simulate AI's move
                    const boardAfterAIMove = this.applyMove(this.board, move);
                    
                    // 2. Run Minimax to find the score assuming opponent plays optimally
                    // We are in the minimizer's turn now (depth - 1)
                    const score = this.minimax(boardAfterAIMove, depth - 1, false, -Infinity, Infinity);

                    // Add bonuses for strategic positioning
                    let finalScore = score;
                    
                    // CRITICAL: Heavily favor pieces that START closer to the goal
                    // This ensures we move already-advanced pieces rather than pieces in the back
                    const startDistanceToGoal = move.fromCol; // Lower is better for AI (goal at col 0)
                    const pieceAdvancementBonus = (this.cols - startDistanceToGoal) * 800; // HUGE bonus for starting position
                    finalScore += pieceAdvancementBonus;
                    
                    // CRITICAL: Also favor the destination being closer to goal
                    const endDistanceToGoal = move.toCol;
                    const destinationBonus = (this.cols - endDistanceToGoal) * 300; // Secondary bonus for ending position
                    finalScore += destinationBonus;
                    
                    // Extra bonus if moving TOWARD the goal (reducing distance)
                    const movingForward = move.toCol < move.fromCol;
                    if (movingForward) {
                        finalScore += 400; // Increased from 200
                    }
                    
                    // CRITICAL: Check if this move OPENS a clear path to our own goal for opponent
                    // This is more important than "blocking" bonuses
                    const opensPathToOwnGoal = this.checkIfMoveClearsOpponentPath(move, boardAfterAIMove);
                    if (opensPathToOwnGoal) {
                        finalScore -= 20000; // HUGE penalty for opening path to own goal
                    }
                    
                    // Reduced blocking bonus - minimax should handle this better
                    const isBlocking = this.isBlockingOpponent(move.toRow, move.toCol);
                    if (isBlocking) {
                        finalScore += 5000; // Reduced from 15000
                    }

                    debugLog(`Move from (${move.fromRow},${move.fromCol}) to (${move.toRow},${move.toCol}): minimax=${score}, pieceBonus=${pieceAdvancementBonus}, destBonus=${destinationBonus}, forward=${movingForward?400:0}, opensPath=${opensPathToOwnGoal?'YES':'NO'}, blocking=${isBlocking?5000:0}, TOTAL=${finalScore}`);

                    if (finalScore > bestScore) {
                        bestScore = finalScore;
                        bestPlayerMove = { 
                            player: { row: move.fromRow, col: move.fromCol }, 
                            move: { row: move.toRow, col: move.toCol }
                        };
                    }
                }
                
                debugLog(`Hard AI: Selected move from (${bestPlayerMove.player.row},${bestPlayerMove.player.col}) to (${bestPlayerMove.move.row},${bestPlayerMove.move.col}) with score ${bestScore}`);
            }

            // If no move was found (should be rare), fall back to the old method
            if (!bestPlayerMove && possibleMoves.length > 0) {
                const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                 bestPlayerMove = { 
                    player: { row: randomMove.fromRow, col: randomMove.fromCol }, 
                    move: { row: randomMove.toRow, col: randomMove.toCol }
                };
            }

        } else if (gameState.difficulty === 'normal') {
            // Normal AI: 70% strategic, 30% random
            if (Math.random() < 0.7) {
                // Strategic: evaluate all combinations
                for (const player of allMovable) {
                    const validMoves = this.getValidMoves(player.row, player.col);
                    for (const move of validMoves) {
                        const score = this.evaluateMoveScore(player, move);
                        if (score > bestScore) {
                            bestScore = score;
                            bestPlayerMove = { player, move };
                        }
                    }
                }
            } else {
                // Random: pick random player and move
                const randomPlayer = allMovable[Math.floor(Math.random() * allMovable.length)];
                const validMoves = this.getValidMoves(randomPlayer.row, randomPlayer.col);
                if (validMoves.length > 0) {
                    bestPlayerMove = {
                        player: randomPlayer,
                        move: validMoves[Math.floor(Math.random() * validMoves.length)]
                    };
                }
            }
        } else {
            // Easy: random player and move
            const randomPlayer = allMovable[Math.floor(Math.random() * allMovable.length)];
            const validMoves = this.getValidMoves(randomPlayer.row, randomPlayer.col);
            if (validMoves.length > 0) {
                bestPlayerMove = {
                    player: randomPlayer,
                    move: validMoves[Math.floor(Math.random() * validMoves.length)]
                };
            }
        }
        
        if (bestPlayerMove) {
            const timeoutId = setTimeout(() => {
                this.movePlayer(
                    bestPlayerMove.player.row, 
                    bestPlayerMove.player.col, 
                    bestPlayerMove.move.row, 
                    bestPlayerMove.move.col
                );
            }, 200);
            this.activeTimeouts.push(timeoutId);
        } else {
            this.switchPlayer();
        }
    }

    evaluateMoveScore(playerPos, move) {
        const piece = this.board[playerPos.row][playerPos.col];
        const middleRow = Math.floor(this.rows / 2);
        const myGoalCol = this.cols - 1; // AI is player 2, goal at col 8
        const opponentGoalCol = 0; // Opponent goal at col 0
        
        let score = 0;
        
        // CRITICAL: Can we score a goal? (HIGHEST PRIORITY)
        if (move.col === opponentGoalCol && move.row === middleRow) {
            return 10000; // Immediately score!
        }
        
        // NEW: Check if this move blocks a major threat
        const isBlocking = this.isBlockingOpponent(move.row, move.col);
        if (isBlocking) {
            score += 15000;
        }

        // CRITICAL: Check if this move would block ALL opponent moves (instant win!)
        const blockingScore = this.evaluateCompleteBlockingWin(playerPos, move);
        if (blockingScore > 0) {
            return 9500 + blockingScore; // Almost as good as scoring a goal!
        }
        
        // === ADVANCED STRATEGY: Scout + Defensive Line Tactic ===
        // Identify or track the forward scout
        if (!this.aiScoutPlayer || this.board[this.aiScoutPlayer.row][this.aiScoutPlayer.col]?.player !== 2) {
            // Scout doesn't exist or is no longer valid, identify the most forward player
            this.aiScoutPlayer = this.identifyScoutPlayer();
        }
        
        // Check if this is the scout player
        const isScout = this.aiScoutPlayer && 
                       playerPos.row === this.aiScoutPlayer.row && 
                       playerPos.col === this.aiScoutPlayer.col;
        
        // Check if scout is blocked (can't move forward anymore)
        if (isScout) {
            const scoutCanAdvance = this.canPlayerAdvanceForward(playerPos.row, playerPos.col);
            this.aiScoutBlocked = !scoutCanAdvance;
        }
        
        // PHASE 1: Scout Phase - Push one player deep into opponent territory
        if (!this.aiScoutBlocked && (isScout || playerPos.col <= this.cols - 5)) {
            if (isScout) {
                // HUGE bonus for scout moving forward toward goal
                if (move.col < playerPos.col) {
                    score += 800; // Massive priority for scout advancement
                    
                    // Extra bonus if moving toward middle row
                    if (Math.abs(move.row - middleRow) < Math.abs(playerPos.row - middleRow)) {
                        score += 100;
                    }
                }
            } else {
                // If no scout established yet, prioritize becoming the scout
                if (move.col < playerPos.col && playerPos.col <= this.cols - 4) {
                    score += 400; // High bonus for advancing as potential scout
                }
            }
        }
        
        // PHASE 2: Once scout is blocked, focus on defensive line formation
        if (this.aiScoutBlocked) {
            // Check if this is a defensive player (not the scout)
            if (!isScout) {
                // Reward tight defensive formation
                const defensiveLineScore = this.evaluateDefensiveLine(playerPos, move);
                score += defensiveLineScore * 60;
                
                // Keep players close together in a line
                const cohesionScore = this.evaluateDefensiveCohesion(move.row, move.col);
                score += cohesionScore * 40;
                
                // Penalize moving forward when we should be defending
                if (move.col < playerPos.col && move.col < this.cols - 3) {
                    score -= 300; // Strong penalty for breaking defensive formation
                }
            } else {
                // Scout stays put unless there's a clear scoring opportunity
                if (move.col === opponentGoalCol || 
                    (move.col < playerPos.col && this.hasOpponentMovedForward())) {
                    score += 600; // Reward scout movement if opponent exposed themselves
                } else {
                    score -= 100; // Slight penalty for scout moving when defensive
                }
            }
        }
        
        // CRITICAL: Am I currently blocking an opponent? Don't move unless absolutely necessary!
        const currentlyBlocking = this.isBlockingOpponent(playerPos.row, playerPos.col);
        if (currentlyBlocking) {
            score -= 600; // HUGE penalty for abandoning a blocking position
        }
        
        // CRITICAL: Check if NOT moving this piece would give opponent a clear path to goal
        const threatScore = this.evaluateDefensiveThreat(playerPos, move);
        score += threatScore;
        
        // OFFENSIVE STRATEGIES (adjusted for strategy)
        
        // 1. Direct path to goal - heavily favor moves toward opponent goal
        const distanceToGoal = move.col - opponentGoalCol;
        score += (this.cols - distanceToGoal) * 50; // More reward for being closer
        
        // 2. Prefer middle rows (avoid edges where you can get stuck)
        const distanceFromMiddle = Math.abs(move.row - middleRow);
        score += (3 - distanceFromMiddle) * 15; // Penalize edge positions
        
        // 3. Check if this move opens a clear path to goal
        const pathToGoal = this.countClearPathToGoal(move.row, move.col, piece.player);
        if (pathToGoal > 0) {
            score += pathToGoal * 30; // Reward clear paths
        }
        
        // DEFENSIVE STRATEGIES
        
        // 4. CRITICAL: Keep goalkeeper in goal unless absolutely necessary
        if (piece.number === 1) { // Goalkeeper
            if (playerPos.col === myGoalCol && playerPos.row === middleRow) {
                score -= 50000; // Heavy penalty for moving goalkeeper out of goal
            }
        }
        
        // 5. Protect area around goalkeeper
        const isNearMyGoal = playerPos.col >= this.cols - 3;
        if (isNearMyGoal) {
            const goalProtection = this.evaluateGoalProtection(move.row, move.col);
            score += goalProtection * 20;
        }
        
        // 6. Block opponent's forward progress
        const blockingValue = this.evaluateBlockingPosition(move.row, move.col);
        score += blockingValue * 25;
        
        // 7. Try to push opponent pieces to edge corners
        const trapValue = this.evaluateTrapOpponent(move.row, move.col);
        score += trapValue * 30;
        
        // 8. Avoid positions where opponent can trap us in edge corners
        if ((move.row === 0 || move.row === this.rows - 1) && move.col >= this.cols - 4) {
            score -= 40; // Heavy penalty for being in danger of corner trap
        }
        
        return score;
    }

    // Helper: Identify the most forward AI player to be the scout
    identifyScoutPlayer() {
        // Find the best offensive player to be the scout
        // Prioritize: 1) Closest to opponent goal, 2) Near middle row, 3) Has forward path
        let scout = null;
        let bestScore = -Infinity;
        const middleRow = Math.floor(this.rows / 2);
        const opponentGoalCol = 0; // AI is player 2, opponent goal is at col 0
        
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === 2 && piece.number !== 1) { // Not goalkeeper
                    // Calculate offensive score for this player
                    let score = 0;
                    
                    // 1. Distance to goal (lower col = closer to opponent goal)
                    const distanceToGoal = col - opponentGoalCol;
                    score += (this.cols - distanceToGoal) * 100; // Heavy weight on proximity
                    
                    // 2. Distance from middle row (prefer center positioning)
                    const distanceFromMiddle = Math.abs(row - middleRow);
                    score += (3 - distanceFromMiddle) * 30;
                    
                    // 3. Has clear forward path
                    if (this.canPlayerAdvanceForward(row, col)) {
                        score += 50;
                    }
                    
                    // 4. Check if player is already advanced into opponent territory (col < 5)
                    if (col < 5) {
                        score += 80; // Bonus for already being forward
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        scout = { row, col };
                    }
                }
            }
        }
        return scout;
    }

    // Helper: Check if player can advance forward
    canPlayerAdvanceForward(row, col) {
        const piece = this.board[row][col];
        if (!piece) return false;
        
        const direction = piece.player === 1 ? 1 : -1;
        const forwardCol = col + direction;
        
        // Check forward moves
        if (forwardCol >= 0 && forwardCol < this.cols) {
            const middleRow = Math.floor(this.rows / 2);
            const isEmptyCell = (forwardCol === 0 || forwardCol === this.cols - 1) && row !== middleRow;
            
            // Check straight forward
            if (!isEmptyCell && !this.board[row][forwardCol]) {
                return true;
            }
            
            // Check diagonal forward-up
            const upRow = row - 1;
            if (upRow >= 0) {
                const isEmptyCellUp = (forwardCol === 0 || forwardCol === this.cols - 1) && upRow !== middleRow;
                if (!isEmptyCellUp && !this.board[upRow][forwardCol]) {
                    return true;
                }
            }
            
            // Check diagonal forward-down
            const downRow = row + 1;
            if (downRow < this.rows) {
                const isEmptyCellDown = (forwardCol === 0 || forwardCol === this.cols - 1) && downRow !== middleRow;
                if (!isEmptyCellDown && !this.board[downRow][forwardCol]) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // Helper: Evaluate defensive line formation
    evaluateDefensiveLine(playerPos, move) {
        // Reward staying in defensive zone (columns 6-8 for AI/player 2)
        const isInDefensiveZone = move.col >= this.cols - 3;
        if (!isInDefensiveZone) return -10;
        
        let score = 10; // Base score for being in defensive zone
        
        // Bonus for staying in a horizontal line with teammates
        let teammatesInLine = 0;
        for (let c = this.cols - 3; c < this.cols; c++) {
            if (this.board[move.row][c] && this.board[move.row][c].player === 2) {
                teammatesInLine++;
            }
        }
        score += teammatesInLine * 5;
        
        return score;
    }

    // Helper: Evaluate defensive cohesion (keeping players together)
    evaluateDefensiveCohesion(row, col) {
        let nearbyTeammates = 0;
        
        // Check adjacent cells for teammates
        for (let r = Math.max(0, row - 1); r <= Math.min(this.rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(this.cols - 1, col + 1); c++) {
                if (r === row && c === col) continue;
                
                const piece = this.board[r][c];
                if (piece && piece.player === 2) {
                    nearbyTeammates++;
                }
            }
        }
        
        return nearbyTeammates;
    }

    // Helper: Check if opponent has moved forward (creating space for scout)
    hasOpponentMovedForward() {
        // Count how many opponent pieces are in their attacking zone (columns 4-7 for player 1)
        let forwardOpponents = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 4; col <= 7; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === 1) {
                    forwardOpponents++;
                }
            }
        }
        
        // If opponent has 3+ pieces forward, they've likely left gaps
        return forwardOpponents >= 3;
    }

    evaluateCompleteBlockingWin(playerPos, move) {
        // Simulate the move and check if opponent would have ANY valid moves left
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        
        // Temporarily simulate the move
        const originalPiece = this.board[playerPos.row][playerPos.col];
        const targetPiece = this.board[move.row][move.col];
        
        this.board[move.row][move.col] = originalPiece;
        this.board[playerPos.row][playerPos.col] = null;
        
        // Temporarily switch to opponent
        const savedPlayer = this.currentPlayer;
        this.currentPlayer = opponent;
        
        // Check if opponent has ANY movable players
        const opponentMovablePlayers = this.getAllMovablePlayers();
        
        // Restore board and player
        this.currentPlayer = savedPlayer;
        this.board[playerPos.row][playerPos.col] = originalPiece;
        this.board[move.row][move.col] = targetPiece;
        
        // If opponent has no moves, this is a winning move!
        if (opponentMovablePlayers.length === 0) {
            // Return high score based on how many opponent pieces we're blocking
            const opponentPieceCount = this.countPlayerPieces(opponent);
            return 100 + (opponentPieceCount * 10); // More pieces blocked = better
        }
        
        // If opponent has very few moves (1-2), this is still strategically valuable
        if (opponentMovablePlayers.length <= 2) {
            return 50 + (3 - opponentMovablePlayers.length) * 20; // Reward limiting options
        }
        
        return 0;
    }

    countPlayerPieces(player) {
        let count = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const piece = this.board[row][col];
                if (piece && piece.player === player) {
                    count++;
                }
            }
        }
        return count;
    }

    checkIfMoveClearsOpponentPath(move, boardAfterMove) {
        // Check if moving away from current position opens a clear path for opponent to our goal
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        const myGoalCol = this.currentPlayer === 1 ? 0 : this.cols - 1;
        const middleRow = Math.floor(this.rows / 2);
        const opponentDirection = opponent === 1 ? 1 : -1;
        
        // Check if there's an opponent piece near the position we're leaving
        // that would have a clear path to goal after we move
        const fromRow = move.fromRow;
        const fromCol = move.fromCol;
        
        // Look for opponents in adjacent positions to where we're moving FROM
        for (let checkRow = Math.max(0, fromRow - 1); checkRow <= Math.min(this.rows - 1, fromRow + 1); checkRow++) {
            // Check the column behind our old position (where opponent would be coming from)
            const behindCol = fromCol - opponentDirection;
            
            if (behindCol >= 0 && behindCol < this.cols) {
                const piece = this.board[checkRow][behindCol];
                if (piece && piece.player === opponent) {
                    // Found an opponent behind our old position
                    // Check if they would have a CLEAR path to our goal after we move
                    
                    // 1. Check if they can reach middle row (required for goal)
                    const distanceToMiddleRow = Math.abs(checkRow - middleRow);
                    const distanceToGoal = Math.abs(behindCol - myGoalCol);
                    
                    // If they can reach middle row within the distance to goal, they have potential
                    if (distanceToMiddleRow <= distanceToGoal) {
                        // 2. Check if the path from opponent to goal is clear on the boardAfterMove
                        const hasDirectPath = this.checkClearPathToGoal(
                            checkRow, 
                            behindCol, 
                            opponent, 
                            boardAfterMove
                        );
                        
                        if (hasDirectPath) {
                            // This move opens a dangerous path!
                            debugLog(`WARNING: Moving from (${fromRow},${fromCol}) opens path for opponent at (${checkRow},${behindCol}) to goal!`);
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    checkClearPathToGoal(startRow, startCol, player, board) {
        // Check if there's a clear path from (startRow, startCol) to the goal
        const goalCol = player === 1 ? this.cols - 1 : 0;
        const middleRow = Math.floor(this.rows / 2);
        const direction = player === 1 ? 1 : -1;
        
        // Use BFS to check if player can reach (middleRow, goalCol) without obstacles
        const queue = [{row: startRow, col: startCol, visited: new Set([`${startRow},${startCol}`])}];
        
        while (queue.length > 0) {
            const {row, col, visited} = queue.shift();
            
            // Reached the goal!
            if (row === middleRow && col === goalCol) {
                return true;
            }
            
            // Limit search depth (don't search more than 5 moves ahead)
            const colDistance = Math.abs(col - goalCol);
            if (colDistance > 5) continue;
            
            // Try all possible moves from current position
            const nextCol = col + direction;
            if (nextCol < 0 || nextCol >= this.cols) continue;
            
            // Check forward, diagonal up, diagonal down
            const possibleRows = [row, row - 1, row + 1];
            
            for (const nextRow of possibleRows) {
                if (nextRow < 0 || nextRow >= this.rows) continue;
                
                const key = `${nextRow},${nextCol}`;
                if (visited.has(key)) continue;
                
                // Check if cell is empty or reachable
                const cellPiece = board[nextRow][nextCol];
                if (!cellPiece || cellPiece.player === player) {
                    // Empty or own piece - can potentially move here
                    if (!cellPiece) { // Only move to empty cells
                        const newVisited = new Set(visited);
                        newVisited.add(key);
                        queue.push({row: nextRow, col: nextCol, visited: newVisited});
                    }
                }
            }
        }
        
        return false;
    }

    isBlockingOpponent(row, col) {
        // Check if current position is directly blocking an opponent piece
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        const opponentDirection = opponent === 1 ? 1 : -1;
        
        // Check BOTH behind us (opponent trying to advance) AND ahead of us (we're in their path)
        
        // 1. Check the column behind us (from opponent's perspective) - original logic
        const behindCol = col - opponentDirection;
        
        if (behindCol >= 0 && behindCol < this.cols) {
            // Check if there's an opponent piece behind us that wants to move forward
            // Check same row and diagonals
            for (let checkRow = Math.max(0, row - 1); checkRow <= Math.min(this.rows - 1, row + 1); checkRow++) {
                const piece = this.board[checkRow][behindCol];
                if (piece && piece.player === opponent) {
                    // Found opponent behind us
                    // Check if we're in their forward path
                    const forwardCol = behindCol + opponentDirection;
                    if (forwardCol === col) {
                        // We're directly in front of them on their forward path
                        
                        // Check how dangerous this opponent is
                        const opponentDanger = this.evaluateThreatDanger(checkRow, behindCol, opponent);
                        if (opponentDanger > 3) {
                            // This is a dangerous opponent we're blocking
                            return true;
                        }
                    }
                }
            }
        }
        
        // 2. NEW: Check if we're blocking an opponent's clear path to goal (forward check)
        // Look for opponents in columns closer to our goal that would have clear path if we're not here
        const myGoalCol = this.currentPlayer === 1 ? 0 : this.cols - 1;
        const middleRow = Math.floor(this.rows / 2);
        
        // Check opponents that could advance toward our goal if we weren't blocking
        for (let checkCol = 0; checkCol < this.cols; checkCol++) {
            // For AI (player 2), check columns to the left (0 to current col)
            // For Player 1, check columns to the right (current col to end)
            const isInOpponentPath = (this.currentPlayer === 2 && checkCol < col) || 
                                    (this.currentPlayer === 1 && checkCol > col);
            
            if (!isInOpponentPath) continue;
            
            for (let checkRow = Math.max(0, row - 1); checkRow <= Math.min(this.rows - 1, row + 1); checkRow++) {
                const piece = this.board[checkRow][checkCol];
                if (piece && piece.player === opponent) {
                    // Found an opponent - check if they have a clear forward path that goes through our position
                    const canReachGoalRow = Math.abs(checkRow - middleRow) <= Math.abs(checkCol - myGoalCol);
                    
                    if (canReachGoalRow) {
                        // Check if our position is blocking their path
                        const pathBlockedByUs = this.isInOpponentPath(checkRow, checkCol, row, col, opponent);
                        
                        if (pathBlockedByUs) {
                            const opponentDanger = this.evaluateThreatDanger(checkRow, checkCol, opponent);
                            if (opponentDanger > 5) {
                                // We're blocking a dangerous opponent's path
                                return true;
                            }
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    // Helper: Check if position (blockRow, blockCol) is in the path of opponent at (oppRow, oppCol)
    isInOpponentPath(oppRow, oppCol, blockRow, blockCol, opponent) {
        const direction = opponent === 1 ? 1 : -1;
        const goalCol = opponent === 1 ? this.cols - 1 : 0;
        const middleRow = Math.floor(this.rows / 2);
        
        // Check if block position is between opponent and goal
        const isInColumnPath = (opponent === 1 && blockCol > oppCol && blockCol < goalCol) ||
                              (opponent === 2 && blockCol < oppCol && blockCol > goalCol);
        
        if (!isInColumnPath) return false;
        
        // Check if the row difference is reachable (diagonal movement)
        const colDiff = Math.abs(blockCol - oppCol);
        const rowDiff = Math.abs(blockRow - oppRow);
        
        // Opponent can reach this position with diagonal moves if rowDiff <= colDiff
        return rowDiff <= colDiff;
    }

    evaluateDefensiveThreat(playerPos, move) {
        // Check if leaving playerPos empty would give opponent ANY path (direct or multi-move) to our goal
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        const myGoalCol = this.currentPlayer === 1 ? 0 : this.cols - 1;
        const middleRow = Math.floor(this.rows / 2);
        
        // Check ALL opponent pieces to see if any would gain a clear path to goal if we move
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const opponentPiece = this.board[row][col];
                if (opponentPiece && opponentPiece.player === opponent) {
                    // Check if this opponent piece would have a clear path after our move
                    const pathBefore = this.hasBlockedPathToGoal(row, col, opponent);
                    const pathAfter = this.hasBlockedPathToGoalAfterMove(row, col, opponent, playerPos, move);
                    
                    // If path becomes unblocked after our move, that's BAD
                    if (pathBefore && !pathAfter) {
                        // We're currently blocking them, and moving would unblock them
                        
                        // Check how dangerous this is based on distance
                        const dangerLevel = this.evaluateThreatDanger(row, col, opponent);
                        
                        // CRITICAL: If they're on the goal row and would have clear path
                        if (row === middleRow && !pathAfter) {
                            return -800; // HUGE penalty - they can score!
                        }
                        
                        // Very dangerous if they're close to goal with clear path
                        return -400 - (dangerLevel * 50);
                    }
                }
            }
        }
        
        return 0;
    }

    hasBlockedPathToGoal(row, col, player) {
        // Check if there's currently ANY piece blocking the path to goal
        const direction = player === 1 ? 1 : -1;
        const goalCol = player === 1 ? this.cols - 1 : 0;
        const middleRow = Math.floor(this.rows / 2);
        
        // Check straight path to goal row first
        let currentCol = col + direction;
        let foundBlocker = false;
        
        while ((player === 1 && currentCol <= goalCol) || (player === 2 && currentCol >= goalCol)) {
            // Check if there's a piece in this column that could block
            for (let checkRow = 0; checkRow < this.rows; checkRow++) {
                if (this.board[checkRow][currentCol]) {
                    // There's a piece - check if it blocks path to goal row
                    const rowDiff = Math.abs(row - middleRow);
                    const colDiff = Math.abs(col - goalCol);
                    
                    // If this piece is in the way (between current position and goal)
                    if (Math.abs(checkRow - middleRow) <= rowDiff) {
                        foundBlocker = true;
                        break;
                    }
                }
            }
            if (foundBlocker) break;
            currentCol += direction;
        }
        
        return foundBlocker;
    }

    hasBlockedPathToGoalAfterMove(row, col, player, ourPosToVacate, ourNewPos) {
        // Simulate: check if opponent would have a blocked path after our move
        const direction = player === 1 ? 1 : -1;
        const goalCol = player === 1 ? this.cols - 1 : 0;
        const middleRow = Math.floor(this.rows / 2);
        
        let currentCol = col + direction;
        let foundBlocker = false;
        
        while ((player === 1 && currentCol <= goalCol) || (player === 2 && currentCol >= goalCol)) {
            // Check each cell in this column
            for (let checkRow = 0; checkRow < this.rows; checkRow++) {
                let cellOccupied = this.board[checkRow][currentCol] !== null;
                
                // Simulate our move
                if (checkRow === ourPosToVacate.row && currentCol === ourPosToVacate.col) {
                    cellOccupied = false; // We're vacating this cell
                }
                if (checkRow === ourNewPos.row && currentCol === ourNewPos.col) {
                    cellOccupied = true; // We're occupying this cell
                }
                
                if (cellOccupied) {
                    // Check if this piece blocks the path to goal row
                    const rowDiff = Math.abs(row - middleRow);
                    const colProgress = Math.abs(currentCol - col);
                    
                    // Can opponent reach goal row by the time they reach this column?
                    if (Math.abs(checkRow - middleRow) <= rowDiff - colProgress) {
                        foundBlocker = true;
                        break;
                    }
                }
            }
            if (foundBlocker) break;
            currentCol += direction;
        }
        
        return foundBlocker;
    }

    evaluateThreatDanger(row, col, player) {
        // Calculate how dangerous an opponent piece is based on position
        const goalCol = player === 1 ? this.cols - 1 : 0;
        const middleRow = Math.floor(this.rows / 2);
        
        const distanceToGoal = Math.abs(col - goalCol);
        const distanceFromGoalRow = Math.abs(row - middleRow);
        
        // Closer to goal = more dangerous
        // On goal row = most dangerous
        let danger = (this.cols - distanceToGoal) * 2;
        
        if (row === middleRow) {
            danger += 10; // Much more dangerous if on goal row
        } else {
            danger -= distanceFromGoalRow * 2; // Less dangerous if far from goal row
        }
        
        return Math.max(0, danger);
    }

    countClearPathToGoalAfterMove(opponentRow, opponentCol, opponentPlayer, ourPosToVacate, ourNewPos) {
        // Simulate: count clear cells from opponent position to goal if we move
        const direction = opponentPlayer === 1 ? 1 : -1;
        const targetCol = opponentPlayer === 1 ? this.cols - 1 : 0;
        let clearCells = 0;
        
        let currentCol = opponentCol + direction;
        while ((opponentPlayer === 1 && currentCol <= targetCol) || 
               (opponentPlayer === 2 && currentCol >= targetCol)) {
            
            // Check if this cell would be empty after our move
            const wouldBeEmpty = !this.board[opponentRow][currentCol] || 
                                 (currentCol === ourPosToVacate.col && opponentRow === ourPosToVacate.row);
            
            const wouldBeOccupied = (currentCol === ourNewPos.col && opponentRow === ourNewPos.row);
            
            if (wouldBeOccupied) {
                break; // Our new position blocks them
            }
            
            if (wouldBeEmpty) {
                clearCells++;
            } else {
                break; // Path blocked
            }
            
            currentCol += direction;
        }
        
        return clearCells;
    }

    canReachGoalRow(opponentRow, opponentCol, opponentPlayer, ourPosToVacate, ourNewPos) {
        // Check if opponent can reach the goal row (middle row) with diagonal moves
        const middleRow = Math.floor(this.rows / 2);
        const direction = opponentPlayer === 1 ? 1 : -1;
        const targetCol = opponentPlayer === 1 ? this.cols - 1 : 0;
        
        // Simple check: can they reach middle row through forward/diagonal moves?
        const rowDiff = Math.abs(opponentRow - middleRow);
        const colDiff = Math.abs(opponentCol - targetCol);
        
        // If they're already on goal row, definitely yes
        if (opponentRow === middleRow) return true;
        
        // If they can reach goal row with available moves (diagonal moves)
        return rowDiff <= colDiff;
    }

    countClearPathToGoal(row, col, player) {
        // Count how many empty cells are in the path toward goal
        const direction = player === 1 ? 1 : -1;
        const targetCol = player === 1 ? this.cols - 1 : 0;
        let clearCells = 0;
        
        let currentCol = col + direction;
        while ((player === 1 && currentCol < targetCol) || (player === 2 && currentCol > targetCol)) {
            if (!this.board[row][currentCol]) {
                clearCells++;
            } else {
                break; // Path blocked
            }
            currentCol += direction;
        }
        
        return clearCells;
    }

    countOpponentPieces(colStart, colEnd) {
        let count = 0;
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        
        for (let col = colStart; col <= colEnd; col++) {
            for (let row = 0; row < this.rows; row++) {
                if (this.board[row][col] && this.board[row][col].player === opponent) {
                    count++;
                }
            }
        }
        return count;
    }

    evaluateGoalProtection(row, col) {
        // Reward positions that protect the goalkeeper area
        const myGoalCol = this.currentPlayer === 1 ? 0 : this.cols - 1;
        const middleRow = Math.floor(this.rows / 2);
        
        // Check if position is adjacent to goal
        const distanceFromGoal = Math.abs(col - myGoalCol);
        const distanceFromMiddleRow = Math.abs(row - middleRow);
        
        if (distanceFromGoal === 1 && distanceFromMiddleRow <= 1) {
            return 10; // Good defensive position
        }
        if (distanceFromGoal === 2 && distanceFromMiddleRow <= 1) {
            return 5; // Decent defensive position
        }
        
        return 0;
    }

    evaluateBlockingPosition(row, col) {
        // Evaluate if this position blocks opponent's forward progress
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        const opponentDirection = opponent === 1 ? 1 : -1;
        
        // Check if there's an opponent piece that we would block
        const behindCol = col - opponentDirection;
        if (behindCol >= 0 && behindCol < this.cols) {
            for (let r = Math.max(0, row - 1); r <= Math.min(this.rows - 1, row + 1); r++) {
                if (this.board[r][behindCol] && this.board[r][behindCol].player === opponent) {
                    return 10; // We're blocking an opponent
                }
            }
        }
        
        return 0;
    }

    evaluateTrapOpponent(row, col) {
        // Evaluate if this move helps trap opponent in corner
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        
        // Check adjacent cells for opponent pieces near edges
        for (let r = Math.max(0, row - 1); r <= Math.min(this.rows - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(this.cols - 1, col + 1); c++) {
                if (this.board[r][c] && this.board[r][c].player === opponent) {
                    // Opponent is adjacent
                    // Check if they're near an edge corner on our side
                    const myGoalCol = this.currentPlayer === 1 ? 0 : this.cols - 1;
                    const isNearMyEdge = Math.abs(c - myGoalCol) <= 2;
                    const isOnEdgeRow = r === 0 || r === this.rows - 1;
                    
                    if (isNearMyEdge && isOnEdgeRow) {
                        return 15; // Good trapping position
                    }
                }
            }
        }
        
        return 0;
    }

    handleGoal() {
        soundManager.play('crowdCheers');
        
        this.isMoving = false; // Reset moving flag
        
        const scoringPlayer = this.currentPlayer;
        const losingPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // Update scores - account for guest perspective
        const isGuestPlayer = gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost;
        if (isGuestPlayer) {
            // Guest: currentPlayer is true game (1=host, 2=guest), but display is flipped
            // So if currentPlayer=2 (guest scored), increment player1Score (guest's display score)
            if (this.currentPlayer === 2) {
                this.player1Score++; // Guest scored (their display = player1)
            } else {
                this.player2Score++; // Host scored (their display = player2)
            }
        } else {
            // Host or local mode: normal increment
            if (this.currentPlayer === 1) {
                this.player1Score++;
            } else {
                this.player2Score++;
            }
        }
        
        // Log goal event
        if (window.gameLogger && window.gameLogger.logId) {
            const scorer = this.currentPlayer === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            window.gameLogger.logEvent('GOAL', `${scorer} scored! Score: ${this.player1Score} - ${this.player2Score}`);
        }
        
        this.updateUI();
        
        // Track who lost this round (for next round start)
        this.lastRoundLoser = losingPlayer;
        
        // In multiplayer, send goal event to sync lastRoundLoser
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            // Send TRUE scores (not display scores)
            const trueScore1 = isGuestPlayer ? this.player2Score : this.player1Score;
            const trueScore2 = isGuestPlayer ? this.player1Score : this.player2Score;
            
            multiplayerManager.sendEvent({
                type: 'goal',
                scoringPlayer: scoringPlayer,
                losingPlayer: losingPlayer,
                score1: trueScore1,
                score2: trueScore2
            });
        }
        
        // Check for winner - if game is over, go directly to endGame without showing goal modal
        if (this.player1Score >= 3 || this.player2Score >= 3) {
            const timeoutId = setTimeout(() => this.endGame(), 300);
            this.activeTimeouts.push(timeoutId);
            return; // Skip showing goal modal
        }
        
        // Show goal modal (or notification for spectators)
        this.showGoalModal();
    }

    showGoalModal() {
        // For spectators, show temporary notification instead of modal
        if (gameState.gameMode === 'spectator') {
            debugLog('👁️ Spectator: showing goal notification');
            
            // Determine scorer name from spectator perspective (host=P1, guest=P2)
            const scorer = this.currentPlayer === 1 ? 
                (gameState.player1Name || translationManager.get('player1')) : 
                (gameState.player2Name || translationManager.get('player2'));
            
            // Show temporary message: "Player X scored (2:1)"
            const message = `${scorer} ${translationManager.get('scores')} (${this.player1Score}:${this.player2Score})`;
            this.showMessage(message, 3000);
            return;
        }
        
        // Determine scorer name - account for guest perspective
        let scorer;
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost) {
            // Guest perspective: currentPlayer is from true game (1=host, 2=guest)
            // But display is flipped (player1Name=guest's name, player2Name=host's name)
            scorer = this.currentPlayer === 1 ? 
                (gameState.player2Name || translationManager.get('player2')) : // Current=1 (host) → show player2Name (host's name for guest)
                (gameState.player1Name || translationManager.get('player1'));  // Current=2 (guest) → show player1Name (guest's own name)
        } else {
            // Host or AI mode: normal mapping
            scorer = this.currentPlayer === 1 ? 
                (gameState.player1Name || translationManager.get('player1')) : 
                (gameState.gameMode === 'ai' ? 
                    `AI (${translationManager.get(gameState.difficulty)})` :
                        (gameState.player2Name || translationManager.get('player2')));
        }
        
        // Show goal message with scorer name and score only
        document.getElementById('goalMessage').innerHTML = `${scorer} ${translationManager.get('scores')}<br><strong style="font-size: 1.5em;">${this.player1Score} : ${this.player2Score}</strong>`;
        
        const goalModal = document.getElementById('goalModal');
        goalModal.classList.add('active');
        
        // Ensure buttons are visible (not hidden from previous states like disconnect dialog)
        const viewBoardBtn = document.getElementById('viewBoardFromGoal');
        const continueBtn = document.getElementById('continueGameBtn');
        if (viewBoardBtn) viewBoardBtn.style.display = 'block';
        if (continueBtn) continueBtn.style.display = 'block';
        
        // No rotation needed for multiplayer online mode (each player sees their own screen normally)
    }

    continueAfterGoal() {
        const goalModal = document.getElementById('goalModal');
        
        // In multiplayer, need both players to press continue
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            // Send event that we're ready
            multiplayerManager.sendEvent({
                type: 'playerReady',
                playerId: multiplayerManager.playerId
            });
            
            // Mark ourselves as ready
            this.localPlayerReady = true;
            
            // Update button text to show waiting
            const continueBtn = document.getElementById('continueGameBtn');
            continueBtn.textContent = translationManager.get('waitingForOpponent') || 'Waiting for opponent...';
            continueBtn.disabled = true;
            
            // Check if opponent is already ready
            if (this.opponentPlayerReady) {
                // Both ready, continue
                this.bothPlayersReady();
            }
            // Otherwise wait for opponent's ready event
        } else {
            // Single player or local multiplayer - continue immediately
            goalModal.classList.remove('active');
            goalModal.classList.remove('minimized');
            goalModal.style.transform = '';
            this.resetRound();
        }
    }

    bothPlayersReady() {
        // Reset ready states
        this.localPlayerReady = false;
        this.opponentPlayerReady = false;
        
        // Reset button
        const continueBtn = document.getElementById('continueGameBtn');
        continueBtn.textContent = translationManager.get('continue');
        continueBtn.disabled = false;
        
        // Close modal and continue
        const goalModal = document.getElementById('goalModal');
        goalModal.classList.remove('active');
        goalModal.classList.remove('minimized');
        goalModal.style.transform = '';
        this.resetRound();
    }

    bothPlayersReadyFromWinner() {
        debugLog('Both players ready from winner screen, starting new game');
        
        // Reset ready states
        this.localPlayerReady = false;
        this.opponentPlayerReady = false;
        
        // Reset button state
        const continueBtn = document.getElementById('continueFromWinner');
        if (continueBtn) {
            continueBtn.textContent = translationManager.get('continue') || 'Continue';
            continueBtn.disabled = false;
        }
        
        // In multiplayer, only HOST notifies spectators that game is resetting (to avoid duplicate events)
        if (gameState.gameMode === 'multiplayer' && multiplayerManager && multiplayerManager.isHost) {
            debugLog('Host sending gameReset event to guest and spectators');
            multiplayerManager.sendEvent({
                type: 'gameReset',
                message: 'New game starting'
            });
        }
        
        // Give a small delay to ensure the event is sent before starting new game
        setTimeout(() => {
            // Close modal and start new game
            closeModal('winnerModal');
            soundManager.stopAll();
            startNewGame();
        }, 100);
    }

    resetRound() {
        // The losing player starts the next round
        if (this.lastRoundLoser) {
            this.nextRoundStartPlayer = this.lastRoundLoser;
        }
        
        // Reset AI strategy state for new round
        this.aiScoutPlayer = null;
        this.aiScoutBlocked = false;
        this.aiPhase = 'scout';
        
        this.initBoard();
        this.renderBoard();
        this.currentPlayer = this.nextRoundStartPlayer; // Losing player starts next round
        this.waitingForMove = false;
        this.currentGameStartTime = Date.now();
        
        // Log new round start
        if (window.gameLogger && window.gameLogger.logId) {
            const roundStarter = this.currentPlayer === 1 ? 
                (gameState.player1Name || 'Player 1') : 
                (gameState.gameMode === 'ai' ? `AI (${gameState.difficulty})` : (gameState.player2Name || 'Player 2'));
            window.gameLogger.logEvent('ROUND_START', `New round started. ${roundStarter} starts. Score: ${this.player1Score} - ${this.player2Score}`);
        }
        
        // Update UI to reflect current player (scores and active player highlight)
        this.updateUI();
        
        // Check if current player has ANY possible moves before allowing dice roll
        const allMovablePlayers = this.getAllMovablePlayers();
        if (allMovablePlayers.length === 0) {
            // Current player is completely blocked at round start - opponent wins this round!
            this.handleNoMovesAvailable();
            return;
        }
        
        // Update dice enabled state based on current starting player
        if (this.currentPlayer === 1) {
            document.getElementById('player1DiceContainer').classList.remove('disabled');
            document.getElementById('player2DiceContainer').classList.add('disabled');
        } else {
            document.getElementById('player1DiceContainer').classList.add('disabled');
            document.getElementById('player2DiceContainer').classList.remove('disabled');
        }
        
        // If AI starts this round
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2) {
            setTimeout(() => this.rollDice(), 1000);
        }
        // Auto dice for human players when enabled
        else if (gameState.autoDice) {
            // Don't auto-roll for AI player, and don't auto-roll in multiplayer for remote player
            const shouldAutoRoll = gameState.gameMode === 'local' || 
                                  (gameState.gameMode === 'ai' && this.currentPlayer === 1) ||
                                  (gameState.gameMode === 'multiplayer' && multiplayerManager && this.currentPlayer === multiplayerManager.localPlayer);
            
            if (shouldAutoRoll) {
                setTimeout(() => this.rollDice(), 500);
            }
        }
    }

    async endGame() {
        this.totalGameTime = Date.now() - this.gameStartTime;
        
        const player1Name = gameState.player1Name || translationManager.get('player1');
        const player2Name = gameState.gameMode === 'ai' ? 
            `AI (${translationManager.get(gameState.difficulty)})` : 
            (gameState.player2Name || translationManager.get('player2'));
        
        const winner = this.player1Score >= 3 ? player1Name : player2Name;
        const totalMoves = this.player1Score >= 3 ? this.player1Moves : this.player2Moves;
        
        // In multiplayer, send stats to opponent before displaying
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            const isGuest = !multiplayerManager.isHost;
            
            // Send my stats to opponent
            multiplayerManager.sendEvent({
                type: 'gameStats',
                myMoves: this.player1Moves,  // My moves (I always see myself as P1)
                myThinkingTime: this.player1ThinkingTime  // My thinking time
            });
            
            debugLog(`Sent my stats - Moves: ${this.player1Moves}, ThinkingTime: ${this.player1ThinkingTime}`);
        }
        
        // Log game end for all game modes
        if (window.gameLogger && window.gameLogger.logId) {
            window.gameLogger.endGameLog(
                winner,
                this.player1Score,
                this.player2Score,
                this.player1Moves,
                this.player2Moves,
                this.player1ThinkingTime,
                this.player2ThinkingTime,
                this.totalGameTime,
                'Completed'
            );
        }
        
        // Record multiplayer game for ELO and stats (only for registered users)
        if (gameState.gameMode === 'multiplayer' && window.authClient && multiplayerManager) {
            console.log('🎮 Recording multiplayer game...');
            await this.recordMultiplayerGame(winner);
            console.log('✅ Game recorded, eloChanges:', this.eloChanges);
        }
        
        // Spectators don't see winner modal - show temporary notification and stay watching
        if (gameState.gameMode === 'spectator') {
            debugLog('👁️ Spectator: game ended, showing winner notification');
            
            // Determine winner from spectator perspective (host=P1, guest=P2)
            const player1Name = gameState.player1Name || translationManager.get('player1');
            const player2Name = gameState.player2Name || translationManager.get('player2');
            const winner = this.player1Score >= 3 ? player1Name : player2Name;
            
            // Show temporary message: "Player X wins! (3:2)"
            const message = `${winner} ${translationManager.get('wins')}! (${this.player1Score}:${this.player2Score})`;
            this.showMessage(message, 5000); // Longer duration for game end
            return;
        }
        
        document.getElementById('winnerMessage').textContent = `${winner} ${translationManager.get('wins')}!`;

        let statsHTML = `
            <p style="font-size: 1.5em; margin: 10px 0; text-align: center;"><strong>${this.player1Score}:${this.player2Score}</strong></p>
            <p><strong>${player1Name}:</strong> ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player1ThinkingTime)}</p>
            <p><strong>${player2Name}:</strong> ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player2ThinkingTime)}</p>
            <p><strong>${translationManager.get('totalMoves')}:</strong> ${totalMoves}</p>
            <p><strong>${translationManager.get('totalTime')}:</strong> ${this.formatTime(this.totalGameTime)}</p>
        `;
        
        // Add ELO changes if available (multiplayer ranked games)
        if (this.eloChanges) {
            console.log('✅ Displaying ELO changes in winner modal:', this.eloChanges);
            const myChange = this.eloChanges.player1;
            const changeColor = myChange.change >= 0 ? '#4CAF50' : '#f44336';
            const changeSign = myChange.change >= 0 ? '+' : '';
            
            statsHTML += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd;">
                    <p style="font-weight: bold; color: ${changeColor}; font-size: 1.2em;">
                        ${translationManager.get('eloRating') || 'ELO Rating'}: ${myChange.newElo} 
                        (${changeSign}${myChange.change})
                    </p>
                </div>
            `;
            
            // Clear for next game
            this.eloChanges = null;
        } else {
            console.log('ℹ️ No ELO changes to display (unranked or guest game)');
        }
        
        document.getElementById('finalStatsContent').innerHTML = statsHTML;
        document.getElementById('goalModal').classList.remove('active');
        
        const winnerModal = document.getElementById('winnerModal');
        winnerModal.classList.add('active');
        
        // For multiplayer, show Continue button instead of New Game, and keep both players in sync
        if (gameState.gameMode === 'multiplayer') {
            document.getElementById('continueFromWinner').style.display = 'block';
            document.getElementById('newGameFromWinner').style.display = 'none';
            
            // Reset ready states
            this.localPlayerReady = false;
            this.opponentPlayerReady = false;
        } else {
            document.getElementById('continueFromWinner').style.display = 'none';
            document.getElementById('newGameFromWinner').style.display = 'block';
        }

        // Launch confetti animation only if we won or we are in a 2-player local game
        if (winner === player1Name || gameState.twoPlayerMode) {
            if (window.launchConfetti) {
                window.launchConfetti();
            }
        }
        
        // Rotate winner modal for Player 2 in portrait 2-player mode
        const winningPlayer = this.player1Score >= 3 ? 1 : 2;
        if (gameState.twoPlayerMode && gameState.orientation === 'portrait' && winningPlayer === 2) {
            winnerModal.style.transform = 'rotate(180deg)';
        } else {
            winnerModal.style.transform = '';
        }
    }

    /**
     * Record multiplayer game to server for ELO and stats
     */
    async recordMultiplayerGame(winnerName) {
        // Only record if both players are registered (not guests)
        if (!window.authClient || !window.authClient.isAuthenticated || window.authClient.isGuest) {
            console.log('⚠️ Game not recorded: Guest or not authenticated');
            return;
        }
        
        if (!multiplayerManager || !multiplayerManager.opponentUserId) {
            console.log('⚠️ Game not recorded: Missing opponent info');
            return;
        }
        
        // Determine winner user ID
        let winnerId = null;
        const player1Name = gameState.player1Name || translationManager.get('player1');
        
        if (winnerName === player1Name) {
            // I won (I'm always player1 in my view)
            winnerId = window.authClient.currentUser.userId;
        } else {
            // Opponent won
            winnerId = multiplayerManager.opponentUserId;
        }
        
        // Prepare game data
        const gameData = {
            player1UserId: window.authClient.currentUser.userId,
            player2UserId: multiplayerManager.opponentUserId,
            player1Username: window.authClient.currentUser.username,
            player2Username: multiplayerManager.opponentUsername,
            player1Score: this.player1Score,
            player2Score: this.player2Score,
            winnerId: winnerId,
            gameDurationMs: this.totalGameTime,
            player1Moves: this.player1Moves,
            player2Moves: this.player2Moves,
            gameMode: 'multiplayer'
        };
        
        console.log('📊 Recording game to server:', gameData);
        
        try {
            const result = await multiplayerManager.recordGame(gameData);
            
            if (result.success) {
                if (result.ranked) {
                    console.log('✅ Ranked game recorded successfully');
                    
                    // Store ELO changes to display in winner modal
                    if (result.eloChanges) {
                        this.eloChanges = result.eloChanges;
                        console.log('📈 ELO Changes received:', result.eloChanges);
                    }
                } else {
                    console.log('ℹ️ Game completed (unranked)');
                }
            } else {
                console.error('❌ Failed to record game:', result.error);
            }
        } catch (error) {
            console.error('❌ Error recording game:', error);
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        // If less than 1 minute, show as seconds only
        if (totalSeconds < 60) {
            return `${seconds}s`;
        }
        
        // If less than 1 hour, show as m:ss
        if (hours === 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // If 1 hour or more, show as h:m:ss
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateUI() {
        document.getElementById('player1Score').textContent = this.player1Score;
        document.getElementById('player2Score').textContent = this.player2Score;
        
        const p1Name = gameState.player1Name || translationManager.get('player1');
        const p2Name = gameState.gameMode === 'ai' ? 
            `AI (${translationManager.get(gameState.difficulty)})` : 
            (gameState.player2Name || translationManager.get('player2'));
        
        document.getElementById('player1NameDisplay').textContent = p1Name;
        document.getElementById('player2NameDisplay').textContent = p2Name;
        
        // Highlight active player panel with red border
        const player1Panel = document.querySelector('.player1-panel');
        const player2Panel = document.querySelector('.player2-panel');
        
        if (player1Panel && player2Panel) {
            // In multiplayer, guest sees the board flipped:
            // - Guest controls Player 2 but sees themselves in the Player 1 panel (bottom)
            // - Host controls Player 1 and sees themselves in the Player 1 panel (bottom)
            const isGuest = gameState.gameMode === 'multiplayer' && multiplayerManager && multiplayerManager.localPlayer === 2;
            
            if (isGuest) {
                // Guest perspective: flip the highlighting
                if (this.currentPlayer === 2) {
                    // It's guest's turn (they are Player 2), highlight Player 1 panel (where they see themselves)
                    player1Panel.classList.add('active-player');
                    player2Panel.classList.remove('active-player');
                } else {
                    // It's opponent's turn (Player 1), highlight Player 2 panel (where they see opponent)
                    player1Panel.classList.remove('active-player');
                    player2Panel.classList.add('active-player');
                }
            } else {
                // Host/local/AI perspective: normal highlighting
                if (this.currentPlayer === 1) {
                    player1Panel.classList.add('active-player');
                    player2Panel.classList.remove('active-player');
                } else {
                    player1Panel.classList.remove('active-player');
                    player2Panel.classList.add('active-player');
                }
            }
        }
    }

    start() {
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1Moves = 0;
        this.player2Moves = 0;
        this.player1ThinkingTime = 0;
        this.player2ThinkingTime = 0;
        this.moveStartTime = null;
        this.currentPlayer = 1; // Always start with Player 1 at the beginning of a new match
        this.nextRoundStartPlayer = 1; // First round starts with Player 1
        this.gameStartTime = Date.now();
        this.currentGameStartTime = Date.now();
        
        debugLog('DiceSoccerGame.start() - gameState.gameMode:', gameState.gameMode);
        debugLog('DiceSoccerGame.start() - window.gameLogger exists:', !!window.gameLogger);

        // Start logging for local and AI games (multiplayer is logged in startMultiplayerGame)
        if (window.gameLogger && (gameState.gameMode === 'local' || gameState.gameMode === 'ai')) {
            const player1Name = gameState.player1Name;
            let player2Name = gameState.player2Name;
            
            if (gameState.gameMode === 'ai') {
                // Include AI difficulty in the name
                const difficulty = gameState.difficulty || 'easy';
                player2Name = `AI (${difficulty})`;
            }
            
            debugLog('Starting game log:', gameState.gameMode, player1Name, player2Name);
            window.gameLogger.startGameLog(player1Name, player2Name, null, gameState.gameMode);
        }
        
        // Reset game state variables
        this.isRolling = false;
        this.waitingForMove = false;
        this.isMoving = false;
        this.diceValue = 0;
        this.selectedPlayer = null;
        
        // Reset AI strategy state
        this.aiScoutPlayer = null;
        this.aiScoutBlocked = false;
        this.aiPhase = 'scout';
        
        // Reset dice images to dice1
        document.getElementById('player1Dice').src = 'images/dice1.png';
        document.getElementById('player2Dice').src = 'images/dice1.png';
        
        // Initialize menu rotation for current player
        if (window.updateMenuRotation) window.updateMenuRotation();
        
        // Only initialize board if not multiplayer guest (guest will receive board from host)
        const isMultiplayerGuest = gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost;
        if (!isMultiplayerGuest) {
            this.initBoard();
        } else {
            // Create empty board for guest - will be populated by initialPositions event
            this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
        }
        
        this.renderBoard();
        this.clearHighlights(); // Clear any previous highlights after rendering
        this.updateUI();
        
        // Remove old event listeners by cloning and replacing dice containers
        const player1DiceContainer = document.getElementById('player1DiceContainer');
        const player2DiceContainer = document.getElementById('player2DiceContainer');
        const newPlayer1DiceContainer = player1DiceContainer.cloneNode(true);
        const newPlayer2DiceContainer = player2DiceContainer.cloneNode(true);
        player1DiceContainer.parentNode.replaceChild(newPlayer1DiceContainer, player1DiceContainer);
        player2DiceContainer.parentNode.replaceChild(newPlayer2DiceContainer, player2DiceContainer);
        
        // Set up dice click handlers
        document.getElementById('player1DiceContainer').addEventListener('click', () => {
            // In multiplayer, guest sees P1 dice but they control P2
            const effectivePlayer = (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost) ? 2 : 1;
            
            // Also prevent clicking while a move animation is running (isMoving)
            if (this.currentPlayer === effectivePlayer && !this.isRolling && !this.waitingForMove && !this.isMoving) {
                // In multiplayer, check if it's local player's turn
                if (gameState.gameMode === 'multiplayer') {
                    if (multiplayerManager.localPlayer !== effectivePlayer) {
                        debugLog(`Player 1 dice clicked, but not my turn (I'm P${multiplayerManager.localPlayer}, current is P${this.currentPlayer})`);
                        return; // Not local player's turn
                    }
                    // For guest, also check if board has been initialized
                    if (!multiplayerManager.isHost && this.board.every(row => row.every(cell => cell === null))) {
                        debugLog('Guest: Board not initialized yet');
                        return;
                    }
                }
                this.rollDice();
            }
        });
        
        document.getElementById('player2DiceContainer').addEventListener('click', () => {
            // In multiplayer, guest sees P2 dice but opponent controls P1
            const effectivePlayer = (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost) ? 1 : 2;
            
            // Also prevent clicking while a move animation is running (isMoving)
            if (this.currentPlayer === effectivePlayer && !this.isRolling && !this.waitingForMove && !this.isMoving) {
                // In multiplayer, check if it's local player's turn
                if (gameState.gameMode === 'multiplayer') {
                    if (multiplayerManager.localPlayer !== effectivePlayer) {
                        debugLog(`Player 2 dice clicked, but not my turn (I'm P${multiplayerManager.localPlayer}, current is P${this.currentPlayer})`);
                        return; // Not local player's turn
                    }
                    // For guest, also check if board has been initialized
                    if (!multiplayerManager.isHost && this.board.every(row => row.every(cell => cell === null))) {
                        debugLog('Guest: Board not initialized yet');
                        return;
                    }
                }
                this.rollDice();
            }
        });
        
        // Enable dice based on starting player
        if (this.currentPlayer === 1) {
            document.getElementById('player1DiceContainer').classList.remove('disabled');
            document.getElementById('player2DiceContainer').classList.add('disabled');
        } else {
            document.getElementById('player1DiceContainer').classList.add('disabled');
            document.getElementById('player2DiceContainer').classList.remove('disabled');
        }
        
        // In multiplayer, adjust dice enabling based on local player and starting player
        if (gameState.gameMode === 'multiplayer' && multiplayerManager) {
            const isLocalPlayerTurn = this.currentPlayer === multiplayerManager.localPlayer;
            
            if (multiplayerManager.localPlayer === 1) {
                // Host (Player 1)
                document.getElementById('player1DiceContainer').classList.toggle('disabled', !isLocalPlayerTurn);
                document.getElementById('player2DiceContainer').classList.toggle('disabled', isLocalPlayerTurn);
            } else {
                // Guest (Player 2)
                document.getElementById('player1DiceContainer').classList.toggle('disabled', !isLocalPlayerTurn);
                document.getElementById('player2DiceContainer').classList.toggle('disabled', isLocalPlayerTurn);
            }
        }
        
        // Set up multiplayer handlers if in multiplayer mode
        if (gameState.gameMode === 'multiplayer') {
            this.setupMultiplayerHandlers();
        }
        
        // Auto-roll dice for the first turn if autoDice is enabled
        if (gameState.autoDice && !this.isRolling) {
            // AI turn
            if (gameState.gameMode === 'ai' && this.currentPlayer === 2) {
                const timeoutId = setTimeout(() => this.rollDice(), 800);
                this.activeTimeouts.push(timeoutId);
            }
            // Auto dice for human players when enabled
            else {
                const shouldAutoRoll = gameState.gameMode === 'local' || 
                                      (gameState.gameMode === 'ai' && this.currentPlayer === 1) ||
                                      (gameState.gameMode === 'multiplayer' && multiplayerManager && this.currentPlayer === multiplayerManager.localPlayer);
                
                if (shouldAutoRoll) {
                    const timeoutId = setTimeout(() => this.rollDice(), 500);
                    this.activeTimeouts.push(timeoutId);
                }
            }
        }
    }
    
    setupMultiplayerHandlers() {
        if (!multiplayerManager) {
            console.error('❌ setupMultiplayerHandlers: multiplayerManager is null!');
            return;
        }
                
        // Set event handler
        multiplayerManager.onEvent = (event) => this.handleMultiplayerEvent(event);
        
        // If we're the host (player 1), send initial board positions
        if (multiplayerManager.isHost) {
            const positions = [];
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    if (this.board[row][col]) {
                        positions.push({
                            row,
                            col,
                            player: this.board[row][col].player,
                            number: this.board[row][col].number
                        });
                    }
                }
            }
            
            debugLog(`🔵 Host sending initialPositions with my color: ${gameState.player1Shirt}`);
            
            multiplayerManager.sendEvent({
                type: 'initialPositions',
                positions: positions,
                myColor: gameState.player1Shirt  // Host sends their P1 color
            });
        } else {
            // Guest sends their color to host
            debugLog(`🟠 Guest sending my color to host: ${gameState.player1Shirt}`);
            
            multiplayerManager.sendEvent({
                type: 'guestColor',
                myColor: gameState.player1Shirt  // Guest sends their P1 color
            });
        }
    }
    
    handleMultiplayerEvent(event) {        
        switch (event.type) {
            case 'initialPositions':
                // Guest or spectator receives initial board and host's color
                debugLog(`📥 Guest/Spectator received initialPositions with host color: ${event.myColor}`);
                
                // Spectators should not send events back
                if (gameState.gameMode === 'spectator') {
                    const hostColor = event.myColor || 'green';
                    const guestColor = event.guestColor || 'red'; // May be undefined in initial send
                    
                    // Spectators see host as P1, guest as P2
                    gameState.setMultiplayerColors(hostColor, guestColor || hostColor);
                    
                    // Create board and populate with positions
                    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
                    event.positions.forEach(pos => {
                        this.board[pos.row][pos.col] = { player: pos.player, number: pos.number };
                    });
                    this.renderBoard();
                    
                    debugLog(`✅ Spectator colors set: Host P1=${hostColor}, Guest P2=${guestColor || hostColor}`);
                    break;
                }
                
                // Guest player logic
                const hostColor = event.myColor || 'green';
                const myColor = gameState.player1Shirt;
                
                // Guest always uses host's color as-is for opponent
                // If colors conflict, host will handle randomization on their side
                const opponentColor = hostColor;
                
                // Guest sees their color as P1, opponent's color as P2
                gameState.setMultiplayerColors(myColor, opponentColor);
                
                // Create board and populate with positions
                this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
                event.positions.forEach(pos => {
                    this.board[pos.row][pos.col] = { player: pos.player, number: pos.number };
                });
                this.renderBoard();
                
                // Send guest's color back to host
                multiplayerManager.sendEvent({
                    type: 'guestColor',
                    myColor: myColor
                });
                
                debugLog(`✅ Guest colors set: My P1=${myColor}, Opponent P2=${opponentColor}`);
                break;
                
            case 'guestColor':
                // Host receives guest's color and resolves any conflicts
                // Spectators should ignore this event
                if (gameState.gameMode === 'spectator') {
                    break;
                }
                
                debugLog(`📥 Host received guest color: ${event.myColor}`);
                
                const guestColor = event.myColor || 'blue';
                const hostMyColor = gameState.player1Shirt;
                
                // Check if colors conflict
                let finalGuestColor = guestColor;
                if (guestColor === hostMyColor) {
                    // Same color - host picks a random different one for guest
                    finalGuestColor = getRandomDifferentShirtColor(hostMyColor);
                    debugLog(`⚠️ Color conflict! Both have ${hostMyColor}. Host assigning random color for guest: ${finalGuestColor}`);
                }
                
                // Host sees their color as P1, guest's color as P2
                gameState.setMultiplayerColors(hostMyColor, finalGuestColor);
                this.renderBoard();
                
                // Send final guest color back if it was changed
                if (finalGuestColor !== guestColor) {
                    multiplayerManager.sendEvent({
                        type: 'colorCorrected',
                        correctedColor: finalGuestColor
                    });
                }
                
                debugLog(`✅ Host colors set: My P1=${hostMyColor}, Guest P2=${finalGuestColor}`);
                break;
                
            case 'colorCorrected':
                // Guest receives corrected opponent color from host (in case of conflict)
                debugLog(`📥 Guest received color correction: opponent now ${event.correctedColor}`);
                
                // Update opponent's color (P2 from guest's perspective)
                gameState.setMultiplayerColors(gameState.getPlayer1Shirt(), event.correctedColor);
                this.renderBoard();
                
                debugLog(`✅ Guest updated opponent color to: ${event.correctedColor}`);
                break;
                
            case 'diceRolled':
                // Opponent rolled the dice - animate with their result
                // Set the value immediately so it's ready when animation ends
                this.diceValue = event.value;
                
                // Determine which visual dice to animate
                let visualPlayer;
                if (gameState.gameMode === 'spectator') {
                    // Spectators: show dice animation on the actual player's side (no swapping)
                    visualPlayer = event.player;
                } else {
                    // Guest (Player 2) sees opponent (Player 1) as "Player 2" visually
                    const isGuest = multiplayerManager && !multiplayerManager.isHost;
                    visualPlayer = (isGuest && event.player === 1) ? 2 : (isGuest && event.player === 2) ? 1 : event.player;
                }
                
                // Show rolling animation
                const diceImg = document.getElementById(`player${visualPlayer}Dice`);
                diceImg.classList.add('rolling');
                soundManager.play('rollingDice');
                
                // Animate for 2 seconds with random values
                const rollInterval = setInterval(() => {
                    const randomValue = Math.floor(Math.random() * 6) + 1;
                    diceImg.src = `images/dice${randomValue}.png`;
                }, 100);
                this.activeIntervals.push(rollInterval);
                
                // Stop after 1 seconds and show the actual rolled value
                const diceTimeoutId = setTimeout(() => {
                    clearInterval(rollInterval);
                    diceImg.src = `images/dice${event.value}.png`;
                    diceImg.classList.remove('rolling');
                    this.waitingForMove = true;
                }, 1000);
                this.activeTimeouts.push(diceTimeoutId);
                break;
                
            case 'playerMoved':
                // Opponent moved a player - animate it
                
                // First, update the board state
                const piece = this.board[event.fromRow]?.[event.fromCol];
                if (!piece) {
                    console.error('No piece found at source position! Board may be out of sync.');
                    // Try to continue by just rendering without animation
                    this.renderBoard();
                    soundManager.play('walk');
                    return;
                }
                
                // Update board immediately (move will be animated)
                this.board[event.toRow][event.toCol] = piece;
                this.board[event.fromRow][event.fromCol] = null;
                
                // Cell IDs are ALWAYS based on original board coordinates (not flipped)
                // So we use the event coordinates directly
                const fromCellId = `cell-${event.fromRow}-${event.fromCol}`;
                const toCellId = `cell-${event.toRow}-${event.toCol}`;
                                
                const fromCell = document.getElementById(fromCellId);
                const toCell = document.getElementById(toCellId);
                
                if (!fromCell || !toCell) {
                    console.error(`Could not find cells for animation. fromCell=${fromCell}, toCell=${toCell}`);
                    // Board was already updated above, just render
                    this.renderBoard();
                    soundManager.play('walk');
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        debugLog('Goal detected from opponent move!');
                        // Don't call handleGoal - opponent already sent goal event
                    } else if (gameState.gameMode !== 'spectator') {
                        // Switch to local player's turn (not for spectators)
                        this.waitingForMove = false;
                        this.diceValue = 0;
                        this.switchPlayer();
                    }
                    return;
                }
                
                // Find the player shirt element in the source cell
                const shirtImg = fromCell.querySelector('.player-shirt');
                if (!shirtImg) {
                    console.error('Could not find player shirt element in cell');
                    // Board was already updated above, just render
                    this.renderBoard();
                    soundManager.play('walk');
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        debugLog('Goal detected from opponent move!');
                        // Don't call handleGoal - opponent already sent goal event
                    } else if (gameState.gameMode !== 'spectator') {
                        // Switch to local player's turn (not for spectators)
                        this.waitingForMove = false;
                        this.diceValue = 0;
                        this.switchPlayer();
                    }
                    return;
                }
                
                // Get positions for animation
                const fromRect = fromCell.getBoundingClientRect();
                const toRect = toCell.getBoundingClientRect();
                
                // Calculate movement direction
                const deltaX = toRect.left - fromRect.left;
                const deltaY = toRect.top - fromRect.top;
                
                const isMovingLeft = deltaX < 0;
                const isPlayer2 = piece.player === 2;
                const isPortrait = gameState.orientation === 'portrait';
                
                // For portrait mode Player 2 in LOCAL 2-player mode, pieces are already rotated 180deg
                // In multiplayer, guest sees themselves at bottom with no rotation
                const needsFlippedAnimation = isPortrait && isPlayer2 && gameState.twoPlayerMode && gameState.gameMode !== 'multiplayer';
                
                // Create clone for animation
                const clone = shirtImg.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.left = fromRect.left + 'px';
                clone.style.top = fromRect.top + 'px';
                clone.style.width = fromRect.width + 'px';
                clone.style.height = fromRect.height + 'px';
                clone.style.zIndex = '1000';
                clone.style.pointerEvents = 'none';
                
                // Choose animation based on movement direction and player
                if (needsFlippedAnimation) {
                    clone.classList.add('jumping-animation-player2-portrait');
                } else if (isMovingLeft) {
                    clone.classList.add('jumping-animation-left');
                } else {
                    clone.classList.add('jumping-animation-right');
                }
                
                // Set CSS variables for animation
                clone.style.setProperty('--deltaX', deltaX + 'px');
                clone.style.setProperty('--deltaY', deltaY + 'px');
                
                document.body.appendChild(clone);
                
                // Hide original immediately (board state already updated above)
                shirtImg.style.opacity = '0';
                shirtImg.style.pointerEvents = 'none';
                fromCell.style.pointerEvents = 'none';
                
                soundManager.play('walk');
                
                // Wait for animation to complete (0.5s)
                setTimeout(() => {
                    // Remove clone
                    clone.remove();
                    
                    // Render the board to show piece at new position
                    this.clearHighlights();
                    this.selectedPlayer = null;
                    this.renderBoard();
                    
                    // Reset waiting state
                    this.waitingForMove = false;
                    this.diceValue = 0;
                    
                    debugLog(`📍 playerMoved completed. Checking for goal: toCol=${event.toCol}, piece.player=${piece.player}`);
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        debugLog('⚽ Goal detected from opponent move!');
                        // Don't call handleGoal here - opponent already sent goal event
                        // Just update the scores when we receive the goal event
                        debugLog('Waiting for goal event from opponent...');
                    } else if (gameState.gameMode !== 'spectator') {
                        // Only switch player if not spectating (spectators just watch)
                        debugLog('🔄 No goal, switching player after opponent move');
                        setTimeout(() => this.switchPlayer(), 200);
                    } else {
                        // Spectators just update UI
                        this.updateUI();
                    }
                }, 500); // Match the 0.5s animation duration
                break;
            
            case 'playerDisconnected':
                // Opponent temporarily disconnected (grace period active)
                debugLog('Opponent disconnected, showing waiting dialog');
                this.showOpponentDisconnectedDialog();
                break;
            
            case 'playerReconnected':
                // Opponent reconnected within grace period
                debugLog('Opponent reconnected');
                this.hideOpponentDisconnectedDialog();
                break;
                
            case 'gameEnded':
                // Game ended (opponent left or grace period expired)
                const isDisconnect = event.reason === 'opponent_disconnected';
                const disconnectReason = isDisconnect ? 'Opponent Disconnected' : 'Opponent Left';
                
                // Opponent intentionally left or never reconnected - end game
                this.showMessage(translationManager.get(isDisconnect ? 'opponentDisconnected' : 'opponentLeft'));
                
                // Log game end
                if (window.gameLogger && window.gameLogger.logId) {
                    const player1Name = gameState.player1Name || 'Player 1';
                    const player2Name = gameState.player2Name || 'Player 2';
                    
                    window.gameLogger.endGameLog(
                        'None',
                        this.player1Score,
                        this.player2Score,
                        this.player1Moves,
                        this.player2Moves,
                        this.player1ThinkingTime,
                        this.player2ThinkingTime,
                        Date.now() - this.gameStartTime,
                        disconnectReason
                    );
                }
                
                // Leave game and return to lobby
                if (multiplayerManager) {
                    multiplayerManager.stopPolling();
                    multiplayerManager.leaveGame();
                }
                
                // Restore original player 2 name
                if (gameState.originalPlayer2Name) {
                    gameState.player2Name = gameState.originalPlayer2Name;
                    gameState.originalPlayer2Name = null;
                }
                
                setTimeout(() => {
                    showScreen('mainMenu');
                    setTimeout(() => {
                        if (typeof openLobby === 'function') {
                            openLobby();
                        }
                    }, 100);
                }, 3000);
                break;
            
            case 'playerReady':
                // Opponent pressed continue after goal
                this.opponentPlayerReady = true;
                
                // If we're also ready, proceed
                if (this.localPlayerReady) {
                    this.bothPlayersReady();
                }
                break;
            
            case 'winnerContinue':
                // Opponent pressed continue from winner screen
                this.opponentPlayerReady = true;
                
                // If we're also ready, start new game
                if (this.localPlayerReady) {
                    this.bothPlayersReadyFromWinner();
                }
                break;
            
            case 'gameReset':
                // Both players agreed to start new game - reset for spectators too
                debugLog('Received gameReset event, gameMode:', gameState.gameMode);
                if (gameState.gameMode === 'spectator') {
                    // Check if we're already resetting to avoid duplicate resets
                    if (this.isResetting) {
                        debugLog('👁️ Spectator: already resetting, ignoring duplicate gameReset event');
                        break;
                    }
                    
                    this.isResetting = true;
                    debugLog('👁️ Spectator: game resetting, showing notification');
                    this.showMessage(translationManager.get('newGame') || 'New Game', 3000);
                    
                    // Reset the game for spectator view
                    debugLog('👁️ Spectator: calling startNewGame() in 1 second');
                    setTimeout(() => {
                        debugLog('👁️ Spectator: now calling startNewGame()');
                        this.isResetting = false;
                        startNewGame();
                    }, 1000);
                } else {
                    debugLog('Received gameReset but not spectator, ignoring');
                }
                break;
            
            case 'goal':
                // Opponent scored or received goal - sync scores and lastRoundLoser
                debugLog('Received goal event from opponent:', event);
                this.lastRoundLoser = event.losingPlayer;
                
                // Sync scores
                if (gameState.gameMode === 'spectator') {
                    // Spectators: see true scores (host=P1, guest=P2)
                    this.player1Score = event.score1;
                    this.player2Score = event.score2;
                } else {
                    // Players: host is always player 1, guest is always player 2 in real terms
                    // But on display, each sees themselves as player 1
                    const isGuestPlayer = multiplayerManager && !multiplayerManager.isHost;
                    if (isGuestPlayer) {
                        // Guest: swap the scores because guest sees themselves as P1 but is actually P2
                        this.player1Score = event.score2; // Guest's score (their P1 = real P2)
                        this.player2Score = event.score1; // Host's score (their P2 = real P1)
                    } else {
                        // Host: scores are correct as-is
                        this.player1Score = event.score1;
                        this.player2Score = event.score2;
                    }
                }
                
                this.updateUI();
                debugLog(`Scores synced: ${this.player1Score} - ${this.player2Score}`);
                
                // Check if game is over and handle accordingly
                if (this.player1Score >= 3 || this.player2Score >= 3) {
                    const timeoutId = setTimeout(() => this.endGame(), 300);
                    this.activeTimeouts.push(timeoutId);
                } else {
                    // Show goal modal/notification for everyone (players see modal, spectators see notification)
                    this.showGoalModal();
                }
                break;
            
            case 'noMoves':
                // Opponent had no moves - sync scores and lastRoundLoser (same logic as goal)
                debugLog('Received noMoves event from opponent:', event);
                this.lastRoundLoser = event.blockedPlayer;
                
                // Sync scores (same logic as goal event)
                if (gameState.gameMode === 'spectator') {
                    // Spectators: see true scores (host=P1, guest=P2)
                    this.player1Score = event.score1;
                    this.player2Score = event.score2;
                } else {
                    // Players: host is always player 1, guest is always player 2 in real terms
                    // But on display, each sees themselves as player 1
                    const isGuestPlayer = multiplayerManager && !multiplayerManager.isHost;
                    if (isGuestPlayer) {
                        // Guest: swap the scores because guest sees themselves as P1 but is actually P2
                        this.player1Score = event.score2; // Guest's score (their P1 = real P2)
                        this.player2Score = event.score1; // Host's score (their P2 = real P1)
                    } else {
                        // Host: scores are correct as-is
                        this.player1Score = event.score1;
                        this.player2Score = event.score2;
                    }
                }
                
                this.updateUI();
                debugLog(`Scores synced after noMoves: ${this.player1Score} - ${this.player2Score}`);
                
                // Check if game is over and handle accordingly
                if (this.player1Score >= 3 || this.player2Score >= 3) {
                    const timeoutId = setTimeout(() => this.endGame(), 300);
                    this.activeTimeouts.push(timeoutId);
                } else {
                    // Show no-moves modal/notification for everyone
                    this.showNoMovesModal();
                }
                break;
            
            case 'boardState':
                // Guest receives board state from host
                debugLog('Guest received board state from host');
                this.board = event.board;
                this.renderBoard();
                break;
            
            case 'gameStats':
                // Received opponent's game statistics at end of game
                debugLog('Received opponent stats:', event);
                
                // Opponent sends their stats as "myMoves" and "myThinkingTime"
                // From my perspective, opponent is always player2
                this.player2Moves = event.myMoves;
                this.player2ThinkingTime = event.myThinkingTime;
                
                // Update the stats display
                const player1Name = gameState.player1Name || translationManager.get('player1');
                const player2Name = gameState.player2Name || translationManager.get('player2');
                const totalMoves = this.player1Score >= 3 ? this.player1Moves : this.player2Moves;
                
                const statsHTML = `
                    <p style="font-size: 1.5em; margin: 10px 0; text-align: center;"><strong>${this.player1Score}:${this.player2Score}</strong></p>
                    <p><strong>${player1Name}:</strong> ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player1ThinkingTime)}</p>
                    <p><strong>${player2Name}:</strong> ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player2ThinkingTime)}</p>
                    <p><strong>${translationManager.get('totalMoves')}:</strong> ${totalMoves}</p>
                    <p><strong>${translationManager.get('totalTime')}:</strong> ${this.formatTime(this.totalGameTime)}</p>
                `;
                
                document.getElementById('finalStatsContent').innerHTML = statsHTML;
                debugLog(`Updated stats display - P1 moves: ${this.player1Moves}, P2 moves: ${this.player2Moves}`);
                break;
            
            case 'spectatorUpdate':
                // Update spectator count display
                updateSpectatorCount(event.spectatorCount);
                break;
        }
    }
}

// Global game instance
let currentGame = null;
