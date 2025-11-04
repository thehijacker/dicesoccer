# Game Logging System

## Overview

The Dice Soccer game includes a comprehensive logging system for all game types (multiplayer, local 2-player, and AI games). All game sessions are automatically logged when logging is enabled in the configuration.

## Configuration

### config.json

The `config.json` file in the root directory controls the logging behavior:

```json
{
  "multiplayer-server": "php",
  "php-server": "multiplayer-server.php",
  "nodejs-server": "",
  "python-server": "",
  "log-enabled": true
}
```

**Options:**
- `multiplayer-server`: Server type to use ("php", "nodejs", or "python")
- `php-server`: URL to PHP multiplayer server
- `nodejs-server`: URL to Node.js multiplayer server (future)
- `python-server`: URL to Python multiplayer server (future)
- `log-enabled`: Enable/disable game logging (true/false)

## Log Files

### Location
All log files are stored in the `multiplayer-logs/` directory.

### Naming Convention
Log files are named using the format:
```
YYYY-MM-DD_HHmmss_RANDOMID.log
```

Example: `2025-11-02_143025_a3f2b8c1.log`

### Log File Structure

Each log file contains:

1. **Header Information**
   - Log ID (8-character random string)
   - Game Mode (Multiplayer, Local 2-Player, or VS AI)
   - Start time
   
2. **Player Information**
   - Player names
   - IP addresses (for multiplayer)
   - Device type (Mobile, Tablet, Desktop)
   - Device name (for mobile devices)
   - Operating System (Windows, macOS, iOS, Android, etc.)
   - Browser and version
   
3. **Game Events**
   - Timestamped events during gameplay
   - Dice rolls, moves, goals, round starts
   
4. **Final Results** (when game completes)
   - End time and reason (Completed, Abandoned, Disconnected)
   - Winner
   - Final score
   - Player statistics (moves, thinking time)
   - Total game time

### Example Log File

```
=== DICE SOCCER GAME LOG ===
Log ID: a3f2b8c1
Game Mode: VS AI
Start Time: 2025-11-02 14:30:25

--- PLAYER INFORMATION ---
Player 1: John
Player 1 Device: Desktop
Player 1 OS: Windows 10/11
Player 1 Browser: Chrome 120.0.6099.130
Player 2: AI (hard)
Player 2: AI Opponent

--- GAME DATA ---
Status: In Progress

--- GAME EVENTS ---
[2025-11-02 14:30:30] DICE_ROLL: John rolled 4
[2025-11-02 14:30:35] MOVE: John moved player #4 from (2,1) to (2,2)
[2025-11-02 14:30:40] DICE_ROLL: AI (hard) rolled 6
[2025-11-02 14:30:41] MOVE: AI (hard) moved player #6 from (3,6) to (3,5)
[2025-11-02 14:32:15] GOAL: John scored! Score: 1 - 0
[2025-11-02 14:32:20] ROUND_START: New round started. AI (hard) starts. Score: 1 - 0
...

--- GAME COMPLETED ---
End Time: 2025-11-02 14:45:12
End Reason: Completed

--- FINAL RESULTS ---
Winner: John
Final Score: 3 - 1

--- STATISTICS ---
Player 1 Total Moves: 45
Player 1 Thinking Time: 5:23
Player 2 Total Moves: 38
Player 2 Thinking Time: 49s
Total Game Time: 14:47

=== END OF LOG ===
```

## API Endpoints

### logger.php

The PHP logging script accepts POST requests with the following actions:

#### 1. Start Game Log
```json
{
  "action": "start",
  "player1Name": "John",
  "player2Name": "Sarah",
  "player1IP": "192.168.1.100",
  "player2IP": "192.168.1.101",
  "player1UserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "player2UserAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
  "startTime": "2025-11-02 14:30:25",
  "gameMode": "multiplayer"
}
```

**Response:**
```json
{
  "success": true,
  "logId": "a3f2b8c1",
  "logFilename": "2025-11-02_143025_a3f2b8c1.log"
}
```

#### 2. Log Event
```json
{
  "action": "event",
  "logId": "a3f2b8c1",
  "eventType": "DICE_ROLL",
  "eventData": "John rolled 4"
}
```

#### 3. End Game Log
```json
{
  "action": "end",
  "logId": "a3f2b8c1",
  "endTime": "2025-11-02 14:45:12",
  "winner": "John",
  "player1Score": 3,
  "player2Score": 1,
  "player1Moves": 45,
  "player2Moves": 38,
  "player1ThinkingTime": "5:23",
  "player2ThinkingTime": "4:51",
  "totalGameTime": "14:47",
  "reason": "Completed"
}
```

## Logged Game Events

The following events are automatically logged during gameplay:

- **DICE_ROLL**: When a player rolls the dice
- **MOVE**: When a player moves a piece
- **GOAL**: When a player scores a goal
- **ROUND_START**: When a new round begins after a goal

## Game End Reasons

Games can end with the following reasons:

- **Completed**: Normal game completion (player won 3 rounds)
- **Abandoned (Returned to Menu)**: Player quit to main menu
- **Disconnected**: Opponent disconnected (multiplayer only)
- **Opponent Left**: Opponent voluntarily left (multiplayer only)

## Device Detection

The logging system automatically detects and logs:

### Device Types
- Mobile (smartphones)
- Tablet
- Desktop (default)

### Operating Systems
- Windows (7, 8, 8.1, 10/11)
- macOS (with version)
- iOS (with version) - iPhone/iPad
- iPadOS (with version)
- Android (with version and device model)
- Linux
- Chrome OS

### Browsers
- Chrome
- Firefox
- Safari
- Edge
- Opera

## Privacy Considerations

Log files contain:
- Player names (as entered by users)
- IP addresses
- User agent strings
- Device and browser information
- Game statistics and timestamps

**Important:** Ensure compliance with local privacy laws and regulations (GDPR, CCPA, etc.). Consider:
- Informing users that game data is logged
- Implementing data retention policies
- Securing log files from unauthorized access
- Anonymizing or deleting old logs periodically
- Providing users with access to their data

## Manual Log Management

Logs can be managed manually:
1. Access the `multiplayer-logs/` directory on the server
2. Log files are plain text and can be viewed/edited with any text editor
3. Delete old logs manually to manage disk space
4. Consider implementing automated cleanup scripts

## Future Enhancements

- Node.js server implementation for logging
- Python server implementation for logging
- Log analysis tools and statistics
- Automated log cleanup/archiving
- Web-based log viewer dashboard
- Export logs to CSV/JSON format

## Configuration

### config.json

The `config.json` file in the root directory controls the logging behavior:

```json
{
  "multiplayer-server": "php",
  "php-server": "multiplayer-server.php",
  "nodejs-server": "",
  "python-server": "",
  "log-enabled": true
}
```

**Options:**
- `multiplayer-server`: Server type to use ("php", "nodejs", or "python")
- `php-server`: URL to PHP multiplayer server
- `nodejs-server`: URL to Node.js multiplayer server (future)
- `python-server`: URL to Python multiplayer server (future)
- `log-enabled`: Enable/disable game logging (true/false)

## Log Files

### Location
All log files are stored in the `multiplayer-logs/` directory.

### Naming Convention
Log files are named using the format:
```
YYYY-MM-DD_HHmmss_RANDOMID.log
```

Example: `2025-11-02_143025_a3f2b8c1.log`

### Log File Structure

Each log file contains:

1. **Header Information**
   - Log ID (8-character random string)
   - Start time
   
2. **Player Information**
   - Player 1 (Host) name and IP address
   - Player 2 (Guest) name and IP address
   
3. **Game Events**
   - Timestamped events during gameplay
   - Dice rolls, moves, goals, etc.
   
4. **Final Results** (when game completes)
   - End time
   - Winner
   - Final score
   - Player statistics (moves, thinking time)
   - Total game time

### Example Log File

```
=== DICE SOCCER MULTIPLAYER GAME LOG ===
Log ID: a3f2b8c1
Start Time: 2025-11-02 14:30:25

--- PLAYER INFORMATION ---
Player 1 (Host): John
Player 1 IP: 192.168.1.100
Player 2 (Guest): Sarah
Player 2 IP: 192.168.1.101

--- GAME DATA ---
Status: In Progress

--- GAME EVENTS ---
[2025-11-02 14:30:30] DICE_ROLLED: Player 1 rolled 4
[2025-11-02 14:30:35] PLAYER_MOVED: Player 1 moved from (2,1) to (2,2)
[2025-11-02 14:30:40] DICE_ROLLED: Player 2 rolled 6
...

--- GAME COMPLETED ---
End Time: 2025-11-02 14:45:12
End Reason: Completed

--- FINAL RESULTS ---
Winner: John
Final Score: 3 - 1

--- STATISTICS ---
Player 1 Total Moves: 45
Player 1 Thinking Time: 5:23
Player 2 Total Moves: 38
Player 2 Thinking Time: 4:51
Total Game Time: 14:47

=== END OF LOG ===
```

## API Endpoints

### multiplayer-logger.php

The PHP logging script accepts POST requests with the following actions:

#### 1. Start Game Log
```json
{
  "action": "start",
  "player1Name": "John",
  "player2Name": "Sarah",
  "player1IP": "192.168.1.100",
  "player2IP": "192.168.1.101",
  "startTime": "2025-11-02 14:30:25"
}
```

**Response:**
```json
{
  "success": true,
  "logId": "a3f2b8c1",
  "logFilename": "2025-11-02_143025_a3f2b8c1.log"
}
```

#### 2. Log Event
```json
{
  "action": "event",
  "logId": "a3f2b8c1",
  "eventType": "DICE_ROLLED",
  "eventData": "Player 1 rolled 4"
}
```

#### 3. End Game Log
```json
{
  "action": "end",
  "logId": "a3f2b8c1",
  "endTime": "2025-11-02 14:45:12",
  "winner": "John",
  "player1Score": 3,
  "player2Score": 1,
  "player1Moves": 45,
  "player2Moves": 38,
  "player1ThinkingTime": "5:23",
  "player2ThinkingTime": "4:51",
  "totalGameTime": "14:47",
  "reason": "Completed"
}
```

## Implementation Details

### JavaScript Classes

#### ConfigManager
- Loads and manages configuration from `config.json`
- Provides methods to check if logging is enabled
- Returns appropriate server URLs based on configuration

#### GameLogger
- Handles all logging operations
- Automatically fetches player IP addresses
- Tracks game session with unique log ID
- Formats time data for readability

### Integration Points

1. **App Initialization** (`app.js`)
   - Loads config on startup
   - Initializes logger with player IP

2. **Game Start** (`app.js`)
   - Creates log file when multiplayer game starts (host only)
   - Records player names and IP addresses

3. **Game End** (`game.js`)
   - Writes final statistics when game completes
   - Logs reason for game ending (completed, disconnected, etc.)

## Requirements

- PHP 7.0 or higher (for logging functionality)
- Write permissions on the `multiplayer-logs/` directory
- If PHP is not available, logging is automatically disabled

## Privacy Considerations

Log files contain:
- Player names (as entered by users)
- IP addresses
- Game statistics and timestamps

**Important:** Ensure compliance with local privacy laws and regulations. Consider:
- Informing users that game data is logged
- Implementing data retention policies
- Securing log files from unauthorized access
- Anonymizing or deleting old logs periodically

## Manual Log Management

Logs can only be edited or deleted manually:
1. Access the `multiplayer-logs/` directory on the server
2. Log files are plain text and can be viewed/edited with any text editor
3. Delete old logs manually to manage disk space
4. There is no web interface for log management by design

## Future Enhancements

- Node.js server implementation for logging
- Python server implementation for logging
- Log analysis tools
- Automated log cleanup/archiving
- Statistics dashboard (optional)
