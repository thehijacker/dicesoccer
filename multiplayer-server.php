<?php
// Suppress all errors from output (we'll handle them properly)
error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration
define('GAME_DATA_DIR', __DIR__ . '/multiplayer-data');
define('SESSION_TIMEOUT', 1800); // 30 minutes
define('POLL_TIMEOUT', 30); // 30 seconds for long-polling

// Create data directory if it doesn't exist
if (!is_dir(GAME_DATA_DIR)) {
    if (!@mkdir(GAME_DATA_DIR, 0755, true)) {
        sendError('Failed to create data directory. Check permissions.');
    }
}

// Clean up old sessions
try {
    cleanupOldSessions();
} catch (Exception $e) {
    // Ignore cleanup errors
}

// Route handler - check GET params first, then JSON body
$action = $_GET['action'] ?? '';

// If no action in GET, try to get it from JSON body (for POST requests)
if (empty($action) && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $jsonData = json_decode(file_get_contents('php://input'), true);
    $action = $jsonData['action'] ?? '';
}

switch ($action) {
    case 'enterLobby':
        handleEnterLobby();
        break;
    case 'getLobbyPlayers':
        handleGetLobbyPlayers();
        break;
    case 'sendChallenge':
        handleSendChallenge();
        break;
    case 'acceptChallenge':
        handleAcceptChallenge();
        break;
    case 'declineChallenge':
        handleDeclineChallenge();
        break;
    case 'leaveLobby':
        handleLeaveLobby();
        break;
    case 'host':
        handleHostGame();
        break;
    case 'getHosts':
        handleGetHosts();
        break;
    case 'join':
        handleJoinGame();
        break;
    case 'cancelHost':
        handleCancelHost();
        break;
    case 'sendEvent':
        handleSendEvent();
        break;
    case 'pollEvents':
        handlePollEvents();
        break;
    case 'leaveGame':
        handleLeaveGame();
        break;
    case 'heartbeat':
        handleHeartbeat();
        break;
    default:
        sendError('Invalid action');
}

// === LOBBY SYSTEM HANDLERS ===

// Enter lobby (make player available for challenges)
function handleEnterLobby() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            sendError('Invalid request data');
            return;
        }
        
        $playerId = $data['playerId'] ?? generateId();
        $playerName = $data['playerName'] ?? 'Player';
        $playerIp = $_SERVER['REMOTE_ADDR'];
        
        // Clean up any old lobby entries or games for this player
        cleanupPlayerFiles($playerId);
        
        $lobbyData = [
            'playerId' => $playerId,
            'playerName' => $playerName,
            'playerIp' => $playerIp,
            'timestamp' => time(),
            'status' => 'available', // available, challenging, challenged, in-game
            'gameId' => null,
            'challengedBy' => null,
            'challengingPlayer' => null
        ];
        
        $result = @file_put_contents(
            GAME_DATA_DIR . "/lobby_{$playerId}.json",
            json_encode($lobbyData)
        );
        
        if ($result === false) {
            sendError('Failed to save lobby data. Check directory permissions.');
            return;
        }
        
        sendSuccess([
            'playerId' => $playerId,
            'status' => 'in_lobby'
        ]);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// Get list of lobby players and active games
function handleGetLobbyPlayers() {
    $data = json_decode(file_get_contents('php://input'), true);
    $requestingPlayerId = $data['playerId'] ?? '';
    
    $availablePlayers = [];
    $challengingPlayers = [];
    $activeGames = [];
    $myStatus = null;
    
    // Get lobby players
    $lobbyFiles = glob(GAME_DATA_DIR . '/lobby_*.json');
    foreach ($lobbyFiles as $file) {
        $playerData = json_decode(file_get_contents($file), true);
        if ($playerData) {
            $playerInfo = [
                'playerId' => $playerData['playerId'],
                'playerName' => $playerData['playerName'],
                'playerIp' => $playerData['playerIp'],
                'status' => $playerData['status']
            ];
            
            // If this is the requesting player, save their full data
            if ($playerData['playerId'] === $requestingPlayerId) {
                $myStatus = $playerData;
            }
            
            if ($playerData['status'] === 'available') {
                $availablePlayers[] = $playerInfo;
            } elseif ($playerData['status'] === 'challenging' || $playerData['status'] === 'challenged') {
                $challengingPlayers[] = $playerInfo;
            }
        }
    }
    
    // Get active games
    $gameFiles = glob(GAME_DATA_DIR . '/game_*.json');
    foreach ($gameFiles as $file) {
        $gameData = json_decode(file_get_contents($file), true);
        if ($gameData && $gameData['status'] === 'active') {
            $activeGames[] = [
                'gameId' => $gameData['gameId'],
                'player1' => $gameData['host']['playerName'],
                'player2' => $gameData['guest']['playerName'],
                'timestamp' => $gameData['timestamp']
            ];
        }
    }
    
    sendSuccess([
        'availablePlayers' => $availablePlayers,
        'challengingPlayers' => $challengingPlayers,
        'activeGames' => $activeGames,
        'myStatus' => $myStatus
    ]);
}

// Send challenge to another player
function handleSendChallenge() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $playerId = $data['playerId'] ?? '';
        $targetPlayerId = $data['targetPlayerId'] ?? '';
        $hintsEnabled = $data['hintsEnabled'] ?? true;
        
        // Validate both players exist in lobby
        $playerFile = GAME_DATA_DIR . "/lobby_{$playerId}.json";
        $targetFile = GAME_DATA_DIR . "/lobby_{$targetPlayerId}.json";
        
        if (!file_exists($playerFile) || !file_exists($targetFile)) {
            sendError('Player not found in lobby');
            return;
        }
        
        $playerData = json_decode(file_get_contents($playerFile), true);
        $targetData = json_decode(file_get_contents($targetFile), true);
        
        if ($targetData['status'] !== 'available') {
            sendError('Player is not available');
            return;
        }
        
        // Update challenger status
        $playerData['status'] = 'challenging';
        $playerData['challengingPlayer'] = $targetPlayerId;
        $playerData['hintsEnabled'] = $hintsEnabled;
        $playerData['timestamp'] = time();
        file_put_contents($playerFile, json_encode($playerData));
        
        // Update target status
        $targetData['status'] = 'challenged';
        $targetData['challengedBy'] = $playerId;
        $targetData['challengerName'] = $playerData['playerName'];
        $targetData['hintsEnabled'] = $hintsEnabled;
        $targetData['timestamp'] = time();
        file_put_contents($targetFile, json_encode($targetData));
        
        sendSuccess(['status' => 'challenge_sent']);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// Accept a challenge
function handleAcceptChallenge() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $playerId = $data['playerId'] ?? '';
        $challengerId = $data['challengerId'] ?? '';
        
        $playerFile = GAME_DATA_DIR . "/lobby_{$playerId}.json";
        $challengerFile = GAME_DATA_DIR . "/lobby_{$challengerId}.json";
        
        if (!file_exists($playerFile) || !file_exists($challengerFile)) {
            sendError('Player not found');
            return;
        }
        
        $playerData = json_decode(file_get_contents($playerFile), true);
        $challengerData = json_decode(file_get_contents($challengerFile), true);
        
        // Create game session
        $gameId = generateId();
        
        $gameData = [
            'gameId' => $gameId,
            'host' => [
                'playerId' => $challengerData['playerId'],
                'playerName' => $challengerData['playerName']
            ],
            'guest' => [
                'playerId' => $playerData['playerId'],
                'playerName' => $playerData['playerName']
            ],
            'status' => 'active',
            'currentTurn' => $challengerData['playerId'],
            'events' => [],
            'timestamp' => time(),
            'lastActivity' => time(),
            'hintsEnabled' => $challengerData['hintsEnabled'] ?? true
        ];
        
        file_put_contents(
            GAME_DATA_DIR . "/game_{$gameId}.json",
            json_encode($gameData)
        );
        
        // Update both players' lobby status
        $playerData['status'] = 'in-game';
        $playerData['gameId'] = $gameId;
        file_put_contents($playerFile, json_encode($playerData));
        
        $challengerData['status'] = 'in-game';
        $challengerData['gameId'] = $gameId;
        file_put_contents($challengerFile, json_encode($challengerData));
        
        // Notify challenger that challenge was accepted
        addGameEvent($gameId, [
            'type' => 'challengeAccepted',
            'gameId' => $gameId,
            'hintsEnabled' => $gameData['hintsEnabled'],
            'opponent' => [
                'playerId' => $playerData['playerId'],
                'playerName' => $playerData['playerName']
            ]
        ], $challengerId);
        
        sendSuccess([
            'gameId' => $gameId,
            'role' => 'guest',
            'hintsEnabled' => $gameData['hintsEnabled'],
            'opponent' => [
                'playerId' => $challengerData['playerId'],
                'playerName' => $challengerData['playerName']
            ]
        ]);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// Decline a challenge
function handleDeclineChallenge() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $playerId = $data['playerId'] ?? '';
        $challengerId = $data['challengerId'] ?? '';
        
        $playerFile = GAME_DATA_DIR . "/lobby_{$playerId}.json";
        $challengerFile = GAME_DATA_DIR . "/lobby_{$challengerId}.json";
        
        if (file_exists($playerFile)) {
            $playerData = json_decode(file_get_contents($playerFile), true);
            $playerData['status'] = 'available';
            $playerData['challengedBy'] = null;
            $playerData['challengerName'] = null;
            $playerData['timestamp'] = time();
            file_put_contents($playerFile, json_encode($playerData));
        }
        
        if (file_exists($challengerFile)) {
            $challengerData = json_decode(file_get_contents($challengerFile), true);
            $challengerData['status'] = 'available';
            $challengerData['challengingPlayer'] = null;
            $challengerData['timestamp'] = time();
            file_put_contents($challengerFile, json_encode($challengerData));
        }
        
        sendSuccess(['status' => 'challenge_declined']);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// Leave lobby
function handleLeaveLobby() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $playerId = $data['playerId'] ?? '';
        
        $playerFile = GAME_DATA_DIR . "/lobby_{$playerId}.json";
        
        if (file_exists($playerFile)) {
            $playerData = json_decode(file_get_contents($playerFile), true);
            
            // If player was challenging someone, reset that person's status
            if (isset($playerData['challengingPlayer'])) {
                $targetFile = GAME_DATA_DIR . "/lobby_{$playerData['challengingPlayer']}.json";
                if (file_exists($targetFile)) {
                    $targetData = json_decode(file_get_contents($targetFile), true);
                    $targetData['status'] = 'available';
                    $targetData['challengedBy'] = null;
                    $targetData['challengerName'] = null;
                    file_put_contents($targetFile, json_encode($targetData));
                }
            }
            
            // If player was challenged, reset challenger's status
            if (isset($playerData['challengedBy'])) {
                $challengerFile = GAME_DATA_DIR . "/lobby_{$playerData['challengedBy']}.json";
                if (file_exists($challengerFile)) {
                    $challengerData = json_decode(file_get_contents($challengerFile), true);
                    $challengerData['status'] = 'available';
                    $challengerData['challengingPlayer'] = null;
                    file_put_contents($challengerFile, json_encode($challengerData));
                }
            }
            
            unlink($playerFile);
        }
        
        sendSuccess(['status' => 'left_lobby']);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// === LEGACY HANDLERS (kept for backwards compatibility) ===

// Host a new game
function handleHostGame() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            sendError('Invalid request data');
            return;
        }
        
        $playerId = $data['playerId'] ?? generateId();
        $playerName = $data['playerName'] ?? 'Player 1';
        $playerIp = $_SERVER['REMOTE_ADDR'];
        $hintsEnabled = $data['hintsEnabled'] ?? true;
                
        // Clean up any old files for this player before hosting
        $oldHostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
        if (file_exists($oldHostFile)) {
            unlink($oldHostFile);
        }
        
        $oldHeartbeatFile = GAME_DATA_DIR . "/heartbeat_{$playerId}.json";
        if (file_exists($oldHeartbeatFile)) {
            unlink($oldHeartbeatFile);
        }
        
        // Clean up any old event files for this player
        $oldEventFiles = glob(GAME_DATA_DIR . "/events_*_{$playerId}.json");
        foreach ($oldEventFiles as $file) {
            unlink($file);
        }
        
        // Clean up old game files where this player was host or guest
        $allGameFiles = glob(GAME_DATA_DIR . "/game_*.json");
        foreach ($allGameFiles as $gameFile) {
            $gameData = json_decode(file_get_contents($gameFile), true);
            if (isset($gameData['host']['playerId']) && $gameData['host']['playerId'] === $playerId) {
                unlink($gameFile);
            } elseif (isset($gameData['guest']['playerId']) && $gameData['guest']['playerId'] === $playerId) {
                unlink($gameFile);
            }
        }

        $hostData = [
            'playerId' => $playerId,
            'playerName' => $playerName,
            'playerIp' => $playerIp,
            'timestamp' => time(),
            'status' => 'waiting',
            'gameId' => null,
            'hintsEnabled' => $hintsEnabled
        ];
        
        $result = @file_put_contents(
            GAME_DATA_DIR . "/host_{$playerId}.json",
            json_encode($hostData)
        );
        
        if ($result === false) {
            sendError('Failed to save host data. Check directory permissions.');
            return;
        }
        
        sendSuccess(['playerId' => $playerId, 'status' => 'hosting']);
    } catch (Exception $e) {
        sendError('Server error: ' . $e->getMessage());
    }
}

// Get list of available hosts
function handleGetHosts() {
    $hosts = [];
    $files = glob(GAME_DATA_DIR . '/host_*.json');
    
    foreach ($files as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && $data['status'] === 'waiting') {
            $hosts[] = [
                'playerId' => $data['playerId'],
                'playerName' => $data['playerName'],
                'playerIp' => $data['playerIp']
            ];
        }
    }
    
    sendSuccess(['hosts' => $hosts]);
}

// Join a hosted game
function handleJoinGame() {
    $data = json_decode(file_get_contents('php://input'), true);
    $hostId = $data['hostId'] ?? '';
    $playerId = $data['playerId'] ?? generateId();
    $playerName = $data['playerName'] ?? 'Player 2';
        
    // Clean up any old files for this player before joining
    $oldHostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
    if (file_exists($oldHostFile)) {
        unlink($oldHostFile);
    }
    
    $oldHeartbeatFile = GAME_DATA_DIR . "/heartbeat_{$playerId}.json";
    if (file_exists($oldHeartbeatFile)) {
        unlink($oldHeartbeatFile);
    }
    
    // Clean up any old event files for this player
    $oldEventFiles = glob(GAME_DATA_DIR . "/events_*_{$playerId}.json");
    foreach ($oldEventFiles as $file) {
        unlink($file);
    }
    
    // Clean up old game files where this player was host or guest
    $allGameFiles = glob(GAME_DATA_DIR . "/game_*.json");
    foreach ($allGameFiles as $gameFile) {
        $gameData = json_decode(file_get_contents($gameFile), true);
        if (isset($gameData['host']['playerId']) && $gameData['host']['playerId'] === $playerId) {
            unlink($gameFile);
        } elseif (isset($gameData['guest']['playerId']) && $gameData['guest']['playerId'] === $playerId) {
            unlink($gameFile);
        }
    }
    
    $hostFile = GAME_DATA_DIR . "/host_{$hostId}.json";
    
    if (!file_exists($hostFile)) {
        sendError('Host not found');
        return;
    }
    
    $hostData = json_decode(file_get_contents($hostFile), true);
    
    if ($hostData['status'] !== 'waiting') {
        sendError('Host is no longer available');
        return;
    }
    
    // Create game session
    $gameId = generateId();
    
    $gameData = [
        'gameId' => $gameId,
        'host' => [
            'playerId' => $hostData['playerId'],
            'playerName' => $hostData['playerName']
        ],
        'guest' => [
            'playerId' => $playerId,
            'playerName' => $playerName
        ],
        'status' => 'active',
        'currentTurn' => $hostData['playerId'],
        'events' => [],
        'timestamp' => time(),
        'lastActivity' => time()
    ];
    
    file_put_contents(
        GAME_DATA_DIR . "/game_{$gameId}.json",
        json_encode($gameData)
    );
    
    // Update host status
    $hostData['status'] = 'ingame';
    $hostData['gameId'] = $gameId;
    file_put_contents($hostFile, json_encode($hostData));
    
    // Send game start event to host
    addGameEvent($gameId, [
        'type' => 'gameStart',
        'gameId' => $gameId,
        'hintsEnabled' => $hostData['hintsEnabled'],
        'opponent' => [
            'playerId' => $playerId,
            'playerName' => $playerName
        ]
    ], $hostData['playerId']);
    
    sendSuccess([
        'gameId' => $gameId,
        'playerId' => $playerId,
        'role' => 'guest',
        'hintsEnabled' => $hostData['hintsEnabled'],
        'opponent' => [
            'playerId' => $hostData['playerId'],
            'playerName' => $hostData['playerName']
        ]
    ]);
}

// Cancel hosting
function handleCancelHost() {
    $data = json_decode(file_get_contents('php://input'), true);
    $playerId = $data['playerId'] ?? '';
    
    $hostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
    if (file_exists($hostFile)) {
        unlink($hostFile);
    }
    
    sendSuccess(['status' => 'cancelled']);
}

// Send game event
function handleSendEvent() {
    $data = json_decode(file_get_contents('php://input'), true);
    $gameId = $data['gameId'] ?? '';
    $playerId = $data['playerId'] ?? '';
    $event = $data['event'] ?? [];
        
    $gameFile = GAME_DATA_DIR . "/game_{$gameId}.json";
    
    if (!file_exists($gameFile)) {
        sendError('Game not found');
        return;
    }
    
    $gameData = json_decode(file_get_contents($gameFile), true);
    
    // Determine recipient (the other player)
    $recipientId = ($gameData['host']['playerId'] === $playerId) 
        ? $gameData['guest']['playerId'] 
        : $gameData['host']['playerId'];
    
    addGameEvent($gameId, $event, $recipientId);
    
    // Update last activity
    $gameData['lastActivity'] = time();
    file_put_contents($gameFile, json_encode($gameData));

    sendSuccess(['status' => 'sent']);
}

// Long-polling for events
function handlePollEvents() {
    $gameId = $_GET['gameId'] ?? '';
    $playerId = $_GET['playerId'] ?? '';
    $lastEventId = intval($_GET['lastEventId'] ?? 0);
        
    $startTime = time();
    
    // If gameId is 'waiting', check if host has been joined
    if ($gameId === 'waiting') {
        // Poll for host to be joined
        while (time() - $startTime < POLL_TIMEOUT) {
            $hostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
            
            if (file_exists($hostFile)) {
                $hostData = json_decode(file_get_contents($hostFile), true);
                
                // Check if host now has a gameId (someone joined)
                if (!empty($hostData['gameId'])) {
                    $gameId = $hostData['gameId'];
                    $events = getPlayerEvents($gameId, $playerId, $lastEventId);
                    
                    if (!empty($events)) {
                        sendSuccess(['events' => $events]);
                        return;
                    }
                }
            } else {
                // Host file deleted (cancelled)
                sendSuccess(['events' => []]);
                return;
            }
            
            usleep(500000); // Wait 0.5 seconds before checking again
        }
        
        // Timeout - return empty
        sendSuccess(['events' => []]);
        return;
    }
    
    // If gameId is 'challenge_<playerId>', check if challenger's challenge was accepted
    if (strpos($gameId, 'challenge_') === 0) {
        $challengerPlayerId = substr($gameId, 10); // Remove 'challenge_' prefix
        
        while (time() - $startTime < POLL_TIMEOUT) {
            $challengerFile = GAME_DATA_DIR . "/lobby_{$challengerPlayerId}.json";
            
            if (file_exists($challengerFile)) {
                $challengerData = json_decode(file_get_contents($challengerFile), true);
                
                // Check if challenge was accepted (status changed to 'in-game')
                if ($challengerData['status'] === 'in-game' && !empty($challengerData['gameId'])) {
                    $actualGameId = $challengerData['gameId'];
                    $events = getPlayerEvents($actualGameId, $playerId, $lastEventId);
                    
                    if (!empty($events)) {
                        sendSuccess(['events' => $events]);
                        return;
                    }
                }
                
                // Check if challenge was declined (status back to 'available')
                if ($challengerData['status'] === 'available') {
                    sendSuccess(['events' => [['type' => 'challengeDeclined']]]);
                    return;
                }
            } else {
                // Challenger file deleted
                sendSuccess(['events' => []]);
                return;
            }
            
            usleep(500000); // Wait 0.5 seconds before checking again
        }
        
        // Timeout - return empty
        sendSuccess(['events' => []]);
        return;
    }
    
    // Normal polling for active games
    while (time() - $startTime < POLL_TIMEOUT) {
        $events = getPlayerEvents($gameId, $playerId, $lastEventId);
        
        if (!empty($events)) {
            sendSuccess(['events' => $events]);
            return;
        }
        
        // Check if game still exists
        $gameFile = GAME_DATA_DIR . "/game_{$gameId}.json";
        if (!file_exists($gameFile)) {
            sendSuccess(['events' => [['type' => 'gameEnded', 'reason' => 'disconnected']]]);
            return;
        }
        
        // Check if opponent is still active (has sent heartbeat recently)
        $gameData = json_decode(file_get_contents($gameFile), true);
        
        // Get opponent ID
        $opponentId = null;
        if (isset($gameData['host']) && isset($gameData['guest'])) {
            $opponentId = ($gameData['host']['playerId'] === $playerId) 
                ? $gameData['guest']['playerId'] 
                : $gameData['host']['playerId'];
        }
        
        if ($opponentId) {
            $timeSinceGameStart = time() - ($gameData['timestamp'] ?? time());
            
            // Only check heartbeats if game is older than 45 seconds
            // This gives time for both players to connect and start sending heartbeats (first at 30s)
            if ($timeSinceGameStart > 45) {
                // Check opponent's heartbeat file
                $opponentHeartbeatFile = GAME_DATA_DIR . "/heartbeat_{$opponentId}.json";
                
                if (file_exists($opponentHeartbeatFile)) {
                    $heartbeatData = json_decode(file_get_contents($opponentHeartbeatFile), true);
                    $timeSinceLastHeartbeat = time() - ($heartbeatData['lastActivity'] ?? 0);
                    
                    // If opponent hasn't sent heartbeat in 60 seconds, consider them disconnected
                    if ($timeSinceLastHeartbeat > 60) {
                        sendSuccess(['events' => [['type' => 'gameEnded', 'reason' => 'opponent_disconnected']]]);
                        return;
                    }
                } else {
                    // No heartbeat file exists after 45 seconds - opponent never connected properly
                    // or their heartbeat was cleaned up (means they're gone)
                    sendSuccess(['events' => [['type' => 'gameEnded', 'reason' => 'opponent_disconnected']]]);
                    return;
                }
            }
        }
        
        usleep(500000); // Wait 0.5 seconds before checking again
    }
    
    // Timeout - return empty
    sendSuccess(['events' => []]);
}

// Leave game
function handleLeaveGame() {
    $data = json_decode(file_get_contents('php://input'), true);
    $gameId = $data['gameId'] ?? '';
    $playerId = $data['playerId'] ?? '';
    
    $gameFile = GAME_DATA_DIR . "/game_{$gameId}.json";
    
    if (file_exists($gameFile)) {
        $gameData = json_decode(file_get_contents($gameFile), true);
        
        // Notify other player
        $recipientId = ($gameData['host']['playerId'] === $playerId) 
            ? $gameData['guest']['playerId'] 
            : $gameData['host']['playerId'];
        
        addGameEvent($gameId, [
            'type' => 'gameEnded',
            'reason' => 'opponentLeft'
        ], $recipientId);
        
        // Delete game after a delay (give other player time to see the message)
        sleep(1);
        unlink($gameFile);
    }
    
    // Clean up host file if exists
    $hostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
    if (file_exists($hostFile)) {
        unlink($hostFile);
    }
    
    sendSuccess(['status' => 'left']);
}

// Heartbeat to keep session alive
function handleHeartbeat() {
    $data = json_decode(file_get_contents('php://input'), true);
    $playerId = $data['playerId'] ?? '';
    
    // Create/update heartbeat file for this player
    $heartbeatFile = GAME_DATA_DIR . "/heartbeat_{$playerId}.json";
    file_put_contents($heartbeatFile, json_encode([
        'playerId' => $playerId,
        'lastActivity' => time()
    ]));
    
    // Update host timestamp if hosting
    $hostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
    if (file_exists($hostFile)) {
        $hostData = json_decode(file_get_contents($hostFile), true);
        $hostData['timestamp'] = time();
        file_put_contents($hostFile, json_encode($hostData));
    }
    
    sendSuccess(['status' => 'alive']);
}

// Helper functions
function cleanupPlayerFiles($playerId) {
    // Remove lobby file
    $lobbyFile = GAME_DATA_DIR . "/lobby_{$playerId}.json";
    if (file_exists($lobbyFile)) {
        unlink($lobbyFile);
    }
    
    // Remove old host file
    $hostFile = GAME_DATA_DIR . "/host_{$playerId}.json";
    if (file_exists($hostFile)) {
        unlink($hostFile);
    }
    
    // Remove heartbeat file
    $heartbeatFile = GAME_DATA_DIR . "/heartbeat_{$playerId}.json";
    if (file_exists($heartbeatFile)) {
        unlink($heartbeatFile);
    }
    
    // Remove event files
    $eventFiles = glob(GAME_DATA_DIR . "/events_*_{$playerId}.json");
    foreach ($eventFiles as $file) {
        unlink($file);
    }
    
    // Clean up game files where this player was host or guest
    $gameFiles = glob(GAME_DATA_DIR . "/game_*.json");
    foreach ($gameFiles as $gameFile) {
        $gameData = json_decode(file_get_contents($gameFile), true);
        if (isset($gameData['host']['playerId']) && $gameData['host']['playerId'] === $playerId) {
            unlink($gameFile);
        } elseif (isset($gameData['guest']['playerId']) && $gameData['guest']['playerId'] === $playerId) {
            unlink($gameFile);
        }
    }
}

function addGameEvent($gameId, $event, $recipientId) {
    $eventFile = GAME_DATA_DIR . "/events_{$gameId}_{$recipientId}.json";
    $events = [];
    
    if (file_exists($eventFile)) {
        $events = json_decode(file_get_contents($eventFile), true) ?? [];
    }
    
    $event['eventId'] = count($events) + 1;
    $event['timestamp'] = time();
    $events[] = $event;
    
    file_put_contents($eventFile, json_encode($events));
}

function getPlayerEvents($gameId, $playerId, $lastEventId) {
    $eventFile = GAME_DATA_DIR . "/events_{$gameId}_{$playerId}.json";
        
    if (!file_exists($eventFile)) {
        return [];
    }
    
    $events = json_decode(file_get_contents($eventFile), true) ?? [];
    
    // Return events after lastEventId
    $filteredEvents = array_filter($events, function($event) use ($lastEventId) {
        return $event['eventId'] > $lastEventId;
    });
    
    // Re-index array to ensure it's a proper array in JSON (not an object)
    return array_values($filteredEvents);
}

function cleanupOldSessions() {
    $files = glob(GAME_DATA_DIR . '/*.json');
    $now = time();
    $activeGames = [];
    $activePlayers = [];
    
    // First pass: identify active games and players
    foreach ($files as $file) {
        $basename = basename($file);
        
        // Check game files
        if (strpos($basename, 'game_') === 0) {
            $data = json_decode(file_get_contents($file), true);
            if (isset($data['timestamp']) && ($now - $data['timestamp']) <= SESSION_TIMEOUT) {
                // Extract gameId from filename: game_{gameId}.json
                $gameId = substr($basename, 5, -5); // Remove 'game_' and '.json'
                $activeGames[] = $gameId;
                
                // Track active players
                if (isset($data['host']['playerId'])) {
                    $activePlayers[] = $data['host']['playerId'];
                }
                if (isset($data['guest']['playerId'])) {
                    $activePlayers[] = $data['guest']['playerId'];
                }
            }
        }
    }
    
    // Second pass: clean up old files
    foreach ($files as $file) {
        $basename = basename($file);
        $shouldDelete = false;
        
        $data = json_decode(file_get_contents($file), true);
        
        // Clean up by timestamp/lastActivity
        if (isset($data['timestamp']) && ($now - $data['timestamp']) > SESSION_TIMEOUT) {
            $shouldDelete = true;
        } elseif (isset($data['lastActivity']) && ($now - $data['lastActivity']) > SESSION_TIMEOUT) {
            $shouldDelete = true;
        }
        
        // Clean up event files for inactive games
        if (strpos($basename, 'events_') === 0) {
            // Extract gameId from filename: events_{gameId}_{playerId}.json
            $parts = explode('_', $basename);
            if (count($parts) >= 3) {
                $gameId = $parts[1];
                if (!in_array($gameId, $activeGames)) {
                    $shouldDelete = true;
                }
            }
        }
        
        // Clean up heartbeat files for inactive players
        if (strpos($basename, 'heartbeat_') === 0) {
            // Extract playerId from filename: heartbeat_{playerId}.json
            $playerId = substr($basename, 10, -5); // Remove 'heartbeat_' and '.json'
            if (!in_array($playerId, $activePlayers)) {
                // Also check if heartbeat is old
                if (isset($data['lastActivity']) && ($now - $data['lastActivity']) > 300) {
                    $shouldDelete = true; // Delete heartbeats older than 5 minutes for inactive players
                }
            }
        }
        
        // Clean up host files that are too old
        if (strpos($basename, 'host_') === 0) {
            if (isset($data['timestamp']) && ($now - $data['timestamp']) > 600) {
                $shouldDelete = true; // Delete host entries older than 10 minutes
            }
        }
        
        // Clean up lobby files that are too old
        if (strpos($basename, 'lobby_') === 0) {
            if (isset($data['timestamp']) && ($now - $data['timestamp']) > 900) {
                $shouldDelete = true; // Delete lobby entries older than 15 minutes
            }
        }
        
        if ($shouldDelete) {
            unlink($file);
        }
    }
}

function generateId() {
    return bin2hex(random_bytes(16));
}

function sendSuccess($data) {
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function sendError($message) {
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}
?>