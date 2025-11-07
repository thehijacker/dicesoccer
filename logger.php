<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Function to parse user agent and extract device info
function parseUserAgent($userAgent) {
    $info = [
        'browser' => 'Unknown',
        'browser_version' => '',
        'os' => 'Unknown',
        'device_type' => 'Desktop',
        'device' => 'Unknown'
    ];
    
    // Detect device type
    if (preg_match('/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i', $userAgent)) {
        if (preg_match('/ipad|tablet|kindle/i', $userAgent)) {
            $info['device_type'] = 'Tablet';
        } else {
            $info['device_type'] = 'Mobile';
        }
    }
    
    // Detect OS (order matters - check more specific first!)
    if (preg_match('/windows nt 10/i', $userAgent)) {
        $info['os'] = 'Windows 10/11';
    } elseif (preg_match('/windows nt 6\.3/i', $userAgent)) {
        $info['os'] = 'Windows 8.1';
    } elseif (preg_match('/windows nt 6\.2/i', $userAgent)) {
        $info['os'] = 'Windows 8';
    } elseif (preg_match('/windows nt 6\.1/i', $userAgent)) {
        $info['os'] = 'Windows 7';
    } elseif (preg_match('/windows/i', $userAgent)) {
        $info['os'] = 'Windows';
    } elseif (preg_match('/macintosh|mac os x/i', $userAgent)) {
        if (preg_match('/mac os x ([\d_]+)/i', $userAgent, $matches)) {
            $version = str_replace('_', '.', $matches[1]);
            $info['os'] = 'macOS ' . $version;
        } else {
            $info['os'] = 'macOS';
        }
    } elseif (preg_match('/iphone/i', $userAgent)) {
        if (preg_match('/OS ([\d_]+)/i', $userAgent, $matches)) {
            $version = str_replace('_', '.', $matches[1]);
            $info['os'] = 'iOS ' . $version;
        } else {
            $info['os'] = 'iOS';
        }
        $info['device'] = 'iPhone';
    } elseif (preg_match('/ipad/i', $userAgent)) {
        if (preg_match('/OS ([\d_]+)/i', $userAgent, $matches)) {
            $version = str_replace('_', '.', $matches[1]);
            $info['os'] = 'iPadOS ' . $version;
        } else {
            $info['os'] = 'iPadOS';
        }
        $info['device'] = 'iPad';
    } elseif (preg_match('/android/i', $userAgent)) {
        if (preg_match('/android ([\d\.]+)/i', $userAgent, $matches)) {
            $info['os'] = 'Android ' . $matches[1];
        } else {
            $info['os'] = 'Android';
        }
        // Try to detect Android device
        if (preg_match('/\(([^;]+);[^)]*android/i', $userAgent, $matches)) {
            $info['device'] = trim($matches[1]);
        }
    } elseif (preg_match('/cros/i', $userAgent)) {
        $info['os'] = 'Chrome OS';
    } elseif (preg_match('/linux/i', $userAgent)) {
        $info['os'] = 'Linux';
    }
    
    // Detect Browser
    if (preg_match('/edg\/([\d\.]+)/i', $userAgent, $matches)) {
        $info['browser'] = 'Edge';
        $info['browser_version'] = $matches[1];
    } elseif (preg_match('/chrome\/([\d\.]+)/i', $userAgent, $matches)) {
        $info['browser'] = 'Chrome';
        $info['browser_version'] = $matches[1];
    } elseif (preg_match('/firefox\/([\d\.]+)/i', $userAgent, $matches)) {
        $info['browser'] = 'Firefox';
        $info['browser_version'] = $matches[1];
    } elseif (preg_match('/safari\/([\d\.]+)/i', $userAgent, $matches) && !preg_match('/chrome/i', $userAgent)) {
        $info['browser'] = 'Safari';
        if (preg_match('/version\/([\d\.]+)/i', $userAgent, $versionMatches)) {
            $info['browser_version'] = $versionMatches[1];
        }
    } elseif (preg_match('/opera|opr\/([\d\.]+)/i', $userAgent, $matches)) {
        $info['browser'] = 'Opera';
        if (isset($matches[1])) {
            $info['browser_version'] = $matches[1];
        }
    }
    
    return $info;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
    exit();
}

// Validate required fields
$action = $data['action'] ?? '';

if ($action === 'start') {
    // Start a new game log
    $player1Name = $data['player1Name'] ?? 'Player 1';
    $player2Name = $data['player2Name'] ?? 'Player 2';
    $startTime = $data['startTime'] ?? date('Y-m-d H:i:s');
    $gameMode = $data['gameMode'] ?? 'multiplayer';
    $player1UserAgent = $data['player1UserAgent'] ?? '';
    $player2UserAgent = $data['player2UserAgent'] ?? '';
    $player1Resolution = $data['player1Resolution'] ?? '';
    $player2Resolution = $data['player2Resolution'] ?? '';
    
    // Parse user agents
    $player1Info = $player1UserAgent ? parseUserAgent($player1UserAgent) : null;
    $player2Info = $player2UserAgent ? parseUserAgent($player2UserAgent) : null;
    
    // Generate log filename: YYYY-MM-DD_HHmmss_RANDOM.log
    $timestamp = date('Y-m-d_His');
    $randomString = bin2hex(random_bytes(4)); // 8 character random string
    $logFilename = "{$timestamp}_{$randomString}.log";
    
    // Create logs directory if it doesn't exist
    $logsDir = __DIR__ . '/logs';
    if (!is_dir($logsDir)) {
        mkdir($logsDir, 0755, true);
    }
    
    $logPath = $logsDir . '/' . $logFilename;
    
    // Determine game type display
    $gameTypeDisplay = '';
    switch ($gameMode) {
        case 'multiplayer':
            $gameTypeDisplay = 'MULTIPLAYER (Online)';
            break;
        case 'local':
            $gameTypeDisplay = 'LOCAL 2-PLAYER';
            break;
        case 'ai':
            $gameTypeDisplay = 'VS AI';
            break;
        default:
            $gameTypeDisplay = strtoupper($gameMode);
    }
    
    // Create log file with initial data
    $logContent = "=== DICE SOCCER GAME LOG ===\n";
    $logContent .= "Log ID: {$randomString}\n";
    $logContent .= "Game Mode: {$gameTypeDisplay}\n";
    $logContent .= "Start Time: {$startTime}\n";
    $logContent .= "\n--- PLAYER INFORMATION ---\n";
    $logContent .= "Player 1: {$player1Name}\n";
    
    // Add Player 1 device info
    if ($player1Info) {
        $logContent .= "Player 1 Device: {$player1Info['device_type']}";
        if ($player1Info['device'] !== 'Unknown') {
            $logContent .= " ({$player1Info['device']})";
        }
        $logContent .= "\n";
        $logContent .= "Player 1 OS: {$player1Info['os']}\n";
        $logContent .= "Player 1 Browser: {$player1Info['browser']}";
        if ($player1Info['browser_version']) {
            $logContent .= " {$player1Info['browser_version']}";
        }
        $logContent .= "\n";
    }
    
    // Add Player 1 resolution
    if ($player1Resolution) {
        $logContent .= "Player 1 Resolution: {$player1Resolution}\n";
    }
    
    $logContent .= "Player 2: {$player2Name}\n";
    
    if ($gameMode === 'multiplayer') {
        // Add Player 2 device info for multiplayer
        if ($player2Info) {
            $logContent .= "Player 2 Device: {$player2Info['device_type']}";
            if ($player2Info['device'] !== 'Unknown') {
                $logContent .= " ({$player2Info['device']})";
            }
            $logContent .= "\n";
            $logContent .= "Player 2 OS: {$player2Info['os']}\n";
            $logContent .= "Player 2 Browser: {$player2Info['browser']}";
            if ($player2Info['browser_version']) {
                $logContent .= " {$player2Info['browser_version']}";
            }
            $logContent .= "\n";
        }
        
        // Add Player 2 resolution for multiplayer
        if ($player2Resolution) {
            $logContent .= "Player 2 Resolution: {$player2Resolution}\n";
        }
    } elseif ($gameMode === 'local') {
        // Same device info as Player 1
        if ($player1Info) {
            $logContent .= "Player 2 Device: {$player1Info['device_type']}";
            if ($player1Info['device'] !== 'Unknown') {
                $logContent .= " ({$player1Info['device']})";
            }
            $logContent .= "\n";
            $logContent .= "Player 2 OS: {$player1Info['os']}\n";
            $logContent .= "Player 2 Browser: {$player1Info['browser']}";
            if ($player1Info['browser_version']) {
                $logContent .= " {$player1Info['browser_version']}";
            }
            $logContent .= "\n";
        }
        
        // Add Player 2 resolution for local (same as Player 1)
        if ($player1Resolution) {
            $logContent .= "Player 2 Resolution: {$player1Resolution}\n";
        }
    } elseif ($gameMode === 'ai') {
        $logContent .= "Player 2: AI Opponent\n";
    }
    
    $logContent .= "\n--- GAME DATA ---\n";
    $logContent .= "Status: In Progress\n";
    $logContent .= "\n--- GAME EVENTS ---\n";
    
    if (file_put_contents($logPath, $logContent) !== false) {
        echo json_encode([
            'success' => true,
            'logId' => $randomString,
            'logFilename' => $logFilename
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create log file']);
    }
    
} elseif ($action === 'event') {
    // Log a game event
    $logId = $data['logId'] ?? '';
    $eventType = $data['eventType'] ?? '';
    $eventData = $data['eventData'] ?? '';
    $timestamp = date('Y-m-d H:i:s');
    
    if (empty($logId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing logId']);
        exit();
    }
    
    // Find log file by ID
    $logsDir = __DIR__ . '/logs';
    $logFiles = glob($logsDir . '/*_' . $logId . '.log');
    
    if (empty($logFiles)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Log file not found']);
        exit();
    }
    
    $logPath = $logFiles[0];
    
    // Append event to log
    $eventLine = "[{$timestamp}] {$eventType}: {$eventData}\n";
    
    if (file_put_contents($logPath, $eventLine, FILE_APPEND) !== false) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to write to log file']);
    }
    
} elseif ($action === 'end') {
    // End game and write final statistics
    $logId = $data['logId'] ?? '';
    $endTime = $data['endTime'] ?? date('Y-m-d H:i:s');
    $winner = $data['winner'] ?? 'Unknown';
    $player1Score = $data['player1Score'] ?? 0;
    $player2Score = $data['player2Score'] ?? 0;
    $player1Moves = $data['player1Moves'] ?? 0;
    $player2Moves = $data['player2Moves'] ?? 0;
    $player1ThinkingTime = $data['player1ThinkingTime'] ?? 0;
    $player2ThinkingTime = $data['player2ThinkingTime'] ?? 0;
    $totalGameTime = $data['totalGameTime'] ?? 0;
    $reason = $data['reason'] ?? 'Completed';
    
    if (empty($logId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Missing logId']);
        exit();
    }
    
    // Find log file by ID
    $logsDir = __DIR__ . '/logs';
    $logFiles = glob($logsDir . '/*_' . $logId . '.log');
    
    if (empty($logFiles)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Log file not found']);
        exit();
    }
    
    $logPath = $logFiles[0];
    
    // Append final statistics
    $finalStats = "\n--- GAME COMPLETED ---\n";
    $finalStats .= "End Time: {$endTime}\n";
    $finalStats .= "End Reason: {$reason}\n";
    $finalStats .= "\n--- FINAL RESULTS ---\n";
    $finalStats .= "Winner: {$winner}\n";
    $finalStats .= "Final Score: {$player1Score} - {$player2Score}\n";
    $finalStats .= "\n--- STATISTICS ---\n";
    $finalStats .= "Player 1 Total Moves: {$player1Moves}\n";
    $finalStats .= "Player 1 Thinking Time: {$player1ThinkingTime}\n";
    $finalStats .= "Player 2 Total Moves: {$player2Moves}\n";
    $finalStats .= "Player 2 Thinking Time: {$player2ThinkingTime}\n";
    $finalStats .= "Total Game Time: {$totalGameTime}\n";
    $finalStats .= "\n=== END OF LOG ===\n";
    
    if (file_put_contents($logPath, $finalStats, FILE_APPEND) !== false) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to write final statistics']);
    }
    
} else {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}
?>
