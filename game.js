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
                console.log('Sound play failed:', err);
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
        this.nextRoundStartPlayer = 1; // Track which player should start the next round (alternates within match)
        this.activeTimeouts = []; // Track all active timeouts
        this.activeIntervals = []; // Track all active intervals
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
        if (this.isRolling || this.isMoving) return; // Prevent clicks during dice roll or move animation
        
        // Collapse menu if expanded
        if (window.collapseMenuButton) window.collapseMenuButton();
        
        // In multiplayer, only allow clicks when it's local player's turn
        if (gameState.gameMode === 'multiplayer' && multiplayerManager.localPlayer !== this.currentPlayer) {
            return; // Not local player's turn
        }
        
        // Check if dice has been rolled
        if (!this.waitingForMove) {
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
                
                // Show all movable players again
                const movablePlayers = this.getMovablePlayers(this.diceValue);
                if (movablePlayers.length === 0) {
                    const allMovable = this.getAllMovablePlayers();
                    allMovable.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
                } else {
                    movablePlayers.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
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

    rollDice() {
        if (this.isRolling || this.waitingForMove) return;
        
        // Collapse menu if expanded
        if (window.collapseMenuButton) window.collapseMenuButton();
        
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
        
        diceImg.classList.add('rolling');
        soundManager.play('rollingDice');
        
        // Animate dice rolling with random values
        const rollInterval = setInterval(() => {
            const randomValue = Math.floor(Math.random() * 6) + 1;
            diceImg.src = `images/dice${randomValue}.png`;
        }, 100);
        this.activeIntervals.push(rollInterval);
        
        // Stop after animation (approximately 2 seconds) and show final value
        const timeoutId = setTimeout(() => {
            clearInterval(rollInterval);
            diceImg.src = `images/dice${this.diceValue}.png`;
            diceImg.classList.remove('rolling');
            this.isRolling = false;
            
            this.handleDiceRolled();
        }, 2000);
        this.activeTimeouts.push(timeoutId);
    }

    handleDiceRolled() {
        this.waitingForMove = true;
        this.moveStartTime = Date.now(); // Start tracking thinking time
                
        // Find players with this number
        const movablePlayers = this.getMovablePlayers(this.diceValue);

        if (movablePlayers.length === 0) {
            // No players with this number can move, try all movable players
            const allMovable = this.getAllMovablePlayers();
            if (allMovable.length > 0) {
                // Highlight all that can move
                allMovable.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
            } else {
                // No moves possible for current player
                this.handleNoMovesAvailable();
                return;
            }
        } else {
            // Highlight only movable players with this number
            movablePlayers.forEach(pos => this.highlightCell(pos.row, pos.col, 'movable'));
        }
        
        // AI move
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2) {
            const timeoutId = setTimeout(() => this.makeAIMove(), 1000);
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

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const validMoves = this.getValidMoves(fromRow, fromCol);
        return validMoves.some(move => move.row === toRow && move.col === toCol);
    }

    movePlayer(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        
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
                
                // For portrait mode Player 2, pieces are already rotated 180deg
                const needsFlippedAnimation = isPortrait && isPlayer2;
                
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
                
                // Hide original immediately and update board state
                shirtImg.style.opacity = '0';
                shirtImg.style.pointerEvents = 'none';
                fromCell.style.pointerEvents = 'none'; // Disable pointer events on the cell too
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;
                
                // Wait for animation to complete
                const animationTimeoutId = setTimeout(() => {
                    // Remove clone first
                    clone.remove();
                    
                    // Then render the board to show piece at new position
                    this.clearHighlights();
                    this.selectedPlayer = null;
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
                }, 500);
                this.activeTimeouts.push(animationTimeoutId);
                
                return;
            }
        }
        
        // Fallback if animation fails
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        this.clearHighlights();
        this.selectedPlayer = null;
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
        this.highlightCell(row, col, 'movable');
        
        const validMoves = this.getValidMoves(row, col);
        validMoves.forEach(move => this.highlightCell(move.row, move.col, 'valid-move'));
    }

    clearHighlights() {
        const fieldGrid = document.getElementById('fieldGrid');
        fieldGrid.querySelectorAll('.field-cell').forEach(cell => {
            cell.classList.remove('movable', 'valid-move');
        });
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.waitingForMove = false;
        this.isMoving = false; // Reset moving flag
        this.diceValue = 0;
        this.updateUI();
        
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
        
        // Check if new player has any moves at all (stalemate check)
        this.checkForStalemate();
        
        // AI turn
        if (gameState.gameMode === 'ai' && this.currentPlayer === 2 && !this.isRolling) {
            const timeoutId = setTimeout(() => this.rollDice(), 800);
            this.activeTimeouts.push(timeoutId);
        }
    }

    handleNoMovesAvailable() {
        // Current player has no moves available
        const playerName = this.currentPlayer === 1 ? 
            (gameState.player1Name || translationManager.get('player1')) :
            (gameState.gameMode === 'ai' ? 
                `AI (${translationManager.get(gameState.difficulty)})` : 
                (gameState.player2Name || translationManager.get('player2')));
        
        this.showMessage(`${playerName} ${translationManager.get('noMovesAvailable')}`, 2500);
        
        // Switch to other player after message
        const timeoutId = setTimeout(() => {
            this.switchPlayer();
        }, 2500);
        this.activeTimeouts.push(timeoutId);
    }

    checkForStalemate() {
        // Check if the new current player has ANY possible moves
        const currentPlayerMoves = this.getAllMovablePlayers();
        
        if (currentPlayerMoves.length === 0) {
            // Current player can't move, check if opponent can either
            const otherPlayer = this.currentPlayer === 1 ? 2 : 1;
            const savedPlayer = this.currentPlayer;
            this.currentPlayer = otherPlayer;
            const otherPlayerMoves = this.getAllMovablePlayers();
            this.currentPlayer = savedPlayer;
            
            if (otherPlayerMoves.length === 0) {
                // Neither player can move - STALEMATE!
                this.handleStalemate();
            }
        }
    }

    handleStalemate() {
        // Both players are stuck - it's a draw
        this.showMessage(translationManager.get('stalemate'), 3000);
        
        const timeoutId = setTimeout(() => {
            // Reset the round without awarding points
            this.resetRound();
        }, 3000);
        this.activeTimeouts.push(timeoutId);
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
            // Hard AI: Evaluate ALL possible player+move combinations
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
            }, 500);
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
        
        // CRITICAL: Am I currently blocking an opponent? Don't move unless absolutely necessary!
        const currentlyBlocking = this.isBlockingOpponent(playerPos.row, playerPos.col);
        if (currentlyBlocking) {
            score -= 600; // HUGE penalty for abandoning a blocking position
        }
        
        // CRITICAL: Check if NOT moving this piece would give opponent a clear path to goal
        const threatScore = this.evaluateDefensiveThreat(playerPos, move);
        score += threatScore;
        
        // OFFENSIVE STRATEGIES
        
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
        
        // 4. Don't block opponent unnecessarily if we're far from their goal
        // (avoid arriving too early when opponent has many blockers)
        if (move.col <= 2) { // If we're entering opponent territory
            const opponentBlockers = this.countOpponentPieces(0, 3);
            if (opponentBlockers > 6) {
                score -= 25; // Penalty for entering too early
            }
        }
        
        // DEFENSIVE STRATEGIES
        
        // 5. CRITICAL: Keep goalkeeper in goal unless absolutely necessary
        if (piece.number === 1) { // Goalkeeper
            if (playerPos.col === myGoalCol && playerPos.row === middleRow) {
                score -= 200; // Heavy penalty for moving goalkeeper out of goal
            }
        }
        
        // 6. Protect area around goalkeeper
        const isNearMyGoal = playerPos.col >= this.cols - 3;
        if (isNearMyGoal) {
            const goalProtection = this.evaluateGoalProtection(move.row, move.col);
            score += goalProtection * 20;
        }
        
        // 7. Block opponent's forward progress
        const blockingValue = this.evaluateBlockingPosition(move.row, move.col);
        score += blockingValue * 25;
        
        // 8. Try to push opponent pieces to edge corners
        const trapValue = this.evaluateTrapOpponent(move.row, move.col);
        score += trapValue * 30;
        
        // 9. Avoid positions where opponent can trap us in edge corners
        if ((move.row === 0 || move.row === this.rows - 1) && move.col >= this.cols - 4) {
            score -= 40; // Heavy penalty for being in danger of corner trap
        }
        
        return score;
    }

    isBlockingOpponent(row, col) {
        // Check if current position is directly blocking an opponent piece
        const opponent = this.currentPlayer === 1 ? 2 : 1;
        const opponentDirection = opponent === 1 ? 1 : -1;
        
        // Check the column behind us (from opponent's perspective)
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
        
        return false;
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
        
        if (this.currentPlayer === 1) {
            this.player1Score++;
        } else {
            this.player2Score++;
        }
        
        this.updateUI();
        
        const scorer = this.currentPlayer === 1 ? 
            (gameState.player1Name || translationManager.get('player1')) : 
            (gameState.gameMode === 'ai' ? 
                `AI (${translationManager.get(gameState.difficulty)})` :
                    (gameState.player2Name || translationManager.get('player2')));
        
        // Get player names for score display
        const player1Name = gameState.player1Name || translationManager.get('player1');
        const player2Name = gameState.gameMode === 'ai' ? 
            `AI (${translationManager.get(gameState.difficulty)})` :
            (gameState.player2Name || translationManager.get('player2'));
        
        // Show goal message and current score
        document.getElementById('goalMessage').textContent = `${scorer} ${translationManager.get('goal')}`;
        const scoreDisplay = `${player1Name} ${this.player1Score}:${this.player2Score} ${player2Name}`;
        document.getElementById('goalMessage').textContent += `\n${scoreDisplay}`;
        
        const goalModal = document.getElementById('goalModal');
        goalModal.classList.add('active');
        
        // Rotate goal modal for Player 2 in portrait 2-player mode
        if (gameState.twoPlayerMode && gameState.orientation === 'portrait' && scoringPlayer === 2) {
            goalModal.style.transform = 'rotate(180deg)';
        } else {
            goalModal.style.transform = '';
        }
        
        // Check for winner
        if (this.player1Score >= 3 || this.player2Score >= 3) {
            const timeoutId = setTimeout(() => this.endGame(), 2000);
            this.activeTimeouts.push(timeoutId);
        }
    }

    continueAfterGoal() {
        const goalModal = document.getElementById('goalModal');
        goalModal.classList.remove('active');
        goalModal.style.transform = ''; // Reset rotation
        this.resetRound();
    }

    resetRound() {
        // Alternate the starting player for this round (after the first round)
        this.nextRoundStartPlayer = this.nextRoundStartPlayer === 1 ? 2 : 1;
        
        this.initBoard();
        this.renderBoard();
        this.currentPlayer = this.nextRoundStartPlayer; // Use alternating start player for each round
        this.waitingForMove = false;
        this.currentGameStartTime = Date.now();
        
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
    }

    endGame() {
        this.totalGameTime = Date.now() - this.gameStartTime;
        
        const player1Name = gameState.player1Name || translationManager.get('player1');
        const player2Name = gameState.gameMode === 'ai' ? 
            `AI (${translationManager.get(gameState.difficulty)})` : 
            (gameState.player2Name || translationManager.get('player2'));
        
        const winner = this.player1Score >= 3 ? player1Name : player2Name;
        const totalMoves = this.player1Score >= 3 ? this.player1Moves : this.player2Moves;
        
        document.getElementById('winnerMessage').textContent = `${winner} ${translationManager.get('wins')}!`;
        
        const statsHTML = `
            <p><strong>${player1Name}:</strong> ${this.player1Score} ${translationManager.get('points')} - ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player1ThinkingTime)}</p>
            <p><strong>${player2Name}:</strong> ${this.player2Score} ${translationManager.get('points')} - ${translationManager.get('thinkingTime')}: ${this.formatTime(this.player2ThinkingTime)}</p>
            <p><strong>${translationManager.get('totalMoves')}:</strong> ${totalMoves}</p>
            <p><strong>${translationManager.get('totalTime')}:</strong> ${this.formatTime(this.totalGameTime)}</p>
        `;
        
        document.getElementById('finalStatsContent').innerHTML = statsHTML;
        document.getElementById('goalModal').classList.remove('active');
        
        const winnerModal = document.getElementById('winnerModal');
        winnerModal.classList.add('active');
        
        // Rotate winner modal for Player 2 in portrait 2-player mode
        const winningPlayer = this.player1Score >= 3 ? 1 : 2;
        if (gameState.twoPlayerMode && gameState.orientation === 'portrait' && winningPlayer === 2) {
            winnerModal.style.transform = 'rotate(180deg)';
        } else {
            winnerModal.style.transform = '';
        }
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        
        // Reset game state variables
        this.isRolling = false;
        this.waitingForMove = false;
        this.isMoving = false;
        this.diceValue = 0;
        this.selectedPlayer = null;
        
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
            
            if (this.currentPlayer === effectivePlayer && !this.isRolling && !this.waitingForMove) {
                // In multiplayer, check if it's local player's turn
                if (gameState.gameMode === 'multiplayer') {
                    if (multiplayerManager.localPlayer !== effectivePlayer) {
                        console.log(`Player 1 dice clicked, but not my turn (I'm P${multiplayerManager.localPlayer}, current is P${this.currentPlayer})`);
                        return; // Not local player's turn
                    }
                    // For guest, also check if board has been initialized
                    if (!multiplayerManager.isHost && this.board.every(row => row.every(cell => cell === null))) {
                        console.log('Guest: Board not initialized yet');
                        return;
                    }
                }
                console.log(`Player 1 dice clicked, rolling for player ${effectivePlayer}`);
                this.rollDice();
            }
        });
        
        document.getElementById('player2DiceContainer').addEventListener('click', () => {
            // In multiplayer, guest sees P2 dice but opponent controls P1
            const effectivePlayer = (gameState.gameMode === 'multiplayer' && multiplayerManager && !multiplayerManager.isHost) ? 1 : 2;
            
            if (this.currentPlayer === effectivePlayer && !this.isRolling && !this.waitingForMove) {
                // In multiplayer, check if it's local player's turn
                if (gameState.gameMode === 'multiplayer') {
                    if (multiplayerManager.localPlayer !== effectivePlayer) {
                        console.log(`Player 2 dice clicked, but not my turn (I'm P${multiplayerManager.localPlayer}, current is P${this.currentPlayer})`);
                        return; // Not local player's turn
                    }
                    // For guest, also check if board has been initialized
                    if (!multiplayerManager.isHost && this.board.every(row => row.every(cell => cell === null))) {
                        console.log('Guest: Board not initialized yet');
                        return;
                    }
                }
                console.log(`Player 2 dice clicked, rolling for player ${effectivePlayer}`);
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
            
            console.log(`🔵 Host sending initialPositions with my color: ${gameState.player1Shirt}`);
            
            multiplayerManager.sendEvent({
                type: 'initialPositions',
                positions: positions,
                myColor: gameState.player1Shirt  // Host sends their P1 color
            });
        } else {
            // Guest sends their color to host
            console.log(`🟠 Guest sending my color to host: ${gameState.player1Shirt}`);
            
            multiplayerManager.sendEvent({
                type: 'guestColor',
                myColor: gameState.player1Shirt  // Guest sends their P1 color
            });
        }
    }
    
    handleMultiplayerEvent(event) {        
        switch (event.type) {
            case 'initialPositions':
                // Guest receives initial board and host's color
                console.log(`📥 Guest received initialPositions with host color: ${event.myColor}`);
                
                const hostColor = event.myColor || 'green';
                const myColor = gameState.player1Shirt;
                
                // Check if colors conflict
                let opponentColor = hostColor;
                if (hostColor === myColor) {
                    // Same color - pick a random different one for opponent
                    opponentColor = getRandomDifferentShirtColor(myColor);
                    console.log(`⚠️ Color conflict! Both have ${myColor}. Using random color for opponent: ${opponentColor}`);
                }
                
                // Guest sees their color as P1, opponent's color as P2
                gameState.setMultiplayerColors(myColor, opponentColor);
                
                // Create board and populate with positions
                this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(null));
                event.positions.forEach(pos => {
                    this.board[pos.row][pos.col] = { player: pos.player, number: pos.number };
                });
                this.renderBoard();
                
                // Send confirmation back to host with final colors
                multiplayerManager.sendEvent({
                    type: 'colorsConfirmed',
                    hostColor: opponentColor,
                    guestColor: myColor
                });
                
                console.log(`✅ Guest colors set: My P1=${myColor}, Opponent P2=${opponentColor}`);
                break;
                
            case 'guestColor':
                // Host receives guest's color
                console.log(`📥 Host received guest color: ${event.myColor}`);
                
                const guestColor = event.myColor || 'blue';
                const hostMyColor = gameState.player1Shirt;
                
                // Check if colors conflict
                let finalGuestColor = guestColor;
                if (guestColor === hostMyColor) {
                    // Same color - pick a random different one for guest
                    finalGuestColor = getRandomDifferentShirtColor(hostMyColor);
                    console.log(`⚠️ Color conflict! Both have ${hostMyColor}. Using random color for guest: ${finalGuestColor}`);
                }
                
                // Host sees their color as P1, guest's color as P2
                gameState.setMultiplayerColors(hostMyColor, finalGuestColor);
                this.renderBoard();
                
                console.log(`✅ Host colors set: My P1=${hostMyColor}, Guest P2=${finalGuestColor}`);
                break;
                
            case 'colorsConfirmed':
                // Host receives final color confirmation from guest
                console.log(`📥 Host received color confirmation: host=${event.hostColor}, guest=${event.guestColor}`);
                // Update if different (in case of conflict resolution)
                if (event.hostColor !== gameState.getPlayer1Shirt() || event.guestColor !== gameState.getPlayer2Shirt()) {
                    gameState.setMultiplayerColors(event.hostColor, event.guestColor);
                    this.renderBoard();
                }
                break;
                
            case 'diceRolled':
                // Opponent rolled the dice - animate with their result
                // Set the value immediately so it's ready when animation ends
                this.diceValue = event.value;
                
                // Determine which visual dice to animate for the opponent
                // Guest (Player 2) sees opponent (Player 1) as "Player 2" visually
                const isGuest = multiplayerManager && !multiplayerManager.isHost;
                const visualPlayer = (isGuest && event.player === 1) ? 2 : (isGuest && event.player === 2) ? 1 : event.player;
                
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
                
                // Stop after 2 seconds and show the actual rolled value
                const diceTimeoutId = setTimeout(() => {
                    clearInterval(rollInterval);
                    diceImg.src = `images/dice${event.value}.png`;
                    diceImg.classList.remove('rolling');
                    this.waitingForMove = true;
                }, 2000);
                this.activeTimeouts.push(diceTimeoutId);
                break;
                
            case 'playerMoved':
                // Opponent moved a player - animate it
                const piece = this.board[event.fromRow][event.fromCol];
                if (!piece) {
                    console.error('No piece found at source position!');
                    return;
                }
                
                // Cell IDs are ALWAYS based on original board coordinates (not flipped)
                // So we use the event coordinates directly
                const fromCellId = `cell-${event.fromRow}-${event.fromCol}`;
                const toCellId = `cell-${event.toRow}-${event.toCol}`;
                                
                const fromCell = document.getElementById(fromCellId);
                const toCell = document.getElementById(toCellId);
                
                if (!fromCell || !toCell) {
                    console.error(`Could not find cells for animation. fromCell=${fromCell}, toCell=${toCell}`);
                    console.error(`Tried IDs: ${fromCellId}, ${toCellId}`);
                    // Update board immediately without animation
                    this.board[event.toRow][event.toCol] = piece;
                    this.board[event.fromRow][event.fromCol] = null;
                    this.renderBoard();
                    soundManager.play('walk');
                    
                    // Reset waiting state
                    this.waitingForMove = false;
                    this.diceValue = 0;
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        console.log('Goal detected from opponent move!');
                        setTimeout(() => this.handleGoal(), 300);
                    } else {
                        // Switch to local player's turn
                        this.switchPlayer();
                    }
                    return;
                }
                
                // Find the player shirt element in the source cell
                const playerElement = fromCell.querySelector('.player-shirt');
                if (!playerElement) {
                    console.error('Could not find player shirt element in cell');
                    // Fallback: update immediately without animation
                    this.board[event.toRow][event.toCol] = piece;
                    this.board[event.fromRow][event.fromCol] = null;
                    this.renderBoard();
                    soundManager.play('walk');
                    
                    // Reset waiting state
                    this.waitingForMove = false;
                    this.diceValue = 0;
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        console.log('Goal detected from opponent move!');
                        setTimeout(() => this.handleGoal(), 300);
                    } else {
                        // Switch to local player's turn
                        this.switchPlayer();
                    }
                    return;
                }
                
                // Create clone for animation
                const clone = playerElement.cloneNode(true);
                clone.classList.add('animating');
                clone.style.position = 'absolute';
                clone.style.zIndex = '1000';
                
                // Position clone at source
                const fromRect = fromCell.getBoundingClientRect();
                const fieldGrid = document.getElementById('fieldGrid');
                if (!fieldGrid) {
                    console.error('Could not find fieldGrid container');
                    // Fallback: update immediately without animation
                    this.board[event.toRow][event.toCol] = piece;
                    this.board[event.fromRow][event.fromCol] = null;
                    this.renderBoard();
                    soundManager.play('walk');
                    
                    // Reset waiting state
                    this.waitingForMove = false;
                    this.diceValue = 0;
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        console.log('Goal detected from opponent move!');
                        setTimeout(() => this.handleGoal(), 300);
                    } else {
                        // Switch to local player's turn
                        this.switchPlayer();
                    }
                    return;
                }
                const boardRect = fieldGrid.getBoundingClientRect();
                
                const fromLeft = fromRect.left - boardRect.left + fromRect.width * 0.1;
                const fromTop = fromRect.top - boardRect.top + fromRect.height * 0.1;
                
                clone.style.left = fromLeft + 'px';
                clone.style.top = fromTop + 'px';
                clone.style.width = fromRect.width * 0.8 + 'px';
                clone.style.height = fromRect.height * 0.8 + 'px';
                                
                fieldGrid.appendChild(clone);
                
                // Start animation after a brief delay
                setTimeout(() => {
                    const toRect = toCell.getBoundingClientRect();
                    const toLeft = toRect.left - boardRect.left + toRect.width * 0.1;
                    const toTop = toRect.top - boardRect.top + toRect.height * 0.1;
                                        
                    clone.style.transition = 'all 0.3s ease-in-out';
                    clone.style.left = toLeft + 'px';
                    clone.style.top = toTop + 'px';
                    
                    soundManager.play('walk');
                }, 10);
                
                // After animation completes, update board state
                setTimeout(() => {
                    this.board[event.toRow][event.toCol] = piece;
                    this.board[event.fromRow][event.fromCol] = null;
                    this.renderBoard();
                    clone.remove();
                    
                    // Reset waiting state
                    this.waitingForMove = false;
                    this.diceValue = 0;
                    
                    // Check for goal
                    const middleRow = Math.floor(this.rows / 2);
                    if ((event.toCol === 0 && piece.player === 2) || (event.toCol === this.cols - 1 && piece.player === 1)) {
                        console.log('Goal detected from opponent move!');
                        setTimeout(() => this.handleGoal(), 300);
                } else {
                    // Switch to local player's turn
                    setTimeout(() => this.switchPlayer(), 200);
                }
                }, 300);
                break;
                
            case 'gameEnded':
                // Game ended (opponent left or disconnected)                
                if (event.reason === 'opponent_disconnected') {
                    this.showMessage(translationManager.get('opponentDisconnected') || 'Opponent disconnected');
                } else {
                    this.showMessage(translationManager.get('opponentLeft'));
                }
                
                // Stop polling and clean up
                if (multiplayerManager) {
                    multiplayerManager.stopPolling();
                    multiplayerManager.cleanup();
                }
                
                // Restore original player 2 name if it was changed for multiplayer
                if (gameState.originalPlayer2Name) {
                    gameState.player2Name = gameState.originalPlayer2Name;
                    gameState.originalPlayer2Name = null;
                }
                
                setTimeout(() => {
                    showScreen('mainMenu');
                }, 3000);
                break;
        }
    }
}

// Global game instance
let currentGame = null;
