# Spectator Mode - Server Requirements

## Overview
Spectator mode allows users to watch active games in real-time without being able to interact with the game.

## Server-Side Changes Required

### 1. Active Games - Include Live Scores

**Endpoint**: `getLobbyPlayers` response

**Required Changes**:
- Add `score1` and `score2` fields to each game in `activeGames` array
- Track and update scores in real-time as goals are scored

**Example Response**:
```javascript
{
  success: true,
  availablePlayers: [...],
  activeGames: [
    {
      gameId: "game123",
      player1: "Firefox",
      player2: "Andy",
      player1Id: "abc",
      player2Id: "def",
      score1: 2,  // NEW
      score2: 1,  // NEW
      timestamp: 1699123456789
    }
  ]
}
```

### 2. Join as Spectator

**New Event**: `joinSpectator`

**Client Sends**:
```javascript
socket.emit('joinSpectator', { gameId: "game123" }, (response) => {
  // response.success, response.error
});
```

**Server Actions**:
1. Verify game exists and is active
2. Add client to spectators list for that game
3. Send current game state to spectator:
   - Current board state
   - Current scores
   - Current player turn
   - Any other relevant game state

**Response**:
```javascript
{
  success: true,
  boardState: [...],
  score1: 2,
  score2: 1,
  currentPlayer: 1,
  player1Name: "Firefox",
  player2Name: "Andy"
}
```

### 3. Broadcast Game Events to Spectators

**Events to Broadcast**:
- `diceRolled` - dice roll with value
- `playerMoved` - piece movement
- `goal` - goal scored with updated scores
- `boardState` - board synchronization
- `gameStats` - end game statistics

**Implementation**:
When players emit game events, server should:
1. Forward to opponent (existing behavior)
2. Also broadcast to all spectators of that game (NEW)

### 4. Leave Spectator Mode

**New Event**: `leaveSpectator`

**Client Sends**:
```javascript
socket.emit('leaveSpectator', { gameId: "game123" });
```

**Server Actions**:
1. Remove client from spectators list for that game
2. Update player status back to "available" in lobby

### 5. Game End / Player Disconnect Handling

**Events**: `gameEnded`, `playerDisconnected`, `gameAborted`

**Server Actions**:
When game ends or player disconnects:
1. Notify all spectators of that game
2. Send `gameEnded` or `gameAborted` event to spectators
3. Remove spectators from game
4. Return spectators to available status

### 6. Lobby Status Updates

**Modify**: `getLobbyPlayers` response

**Player Status**:
- Add "spectating" status for players currently watching a game
- Spectating players should:
  - NOT appear in `availablePlayers` (they can't be challenged)
  - OR appear with status "spectating" and challenge button disabled

**Example**:
```javascript
{
  playerId: "xyz",
  playerName: "Observer",
  status: "spectating",  // NEW status
  spectatingGame: "game123"  // Optional: which game they're watching
}
```

### 7. Real-Time Score Updates

**Modify**: Goal scoring logic

When a goal is scored:
1. Update game's score in activeGames list
2. Broadcast updated scores to:
   - Both players (existing)
   - All spectators (NEW)

### 8. WebSocket Room Management

**Implementation Suggestions**:
1. Create rooms for each game: `game-${gameId}`
2. Players join their game room
3. Spectators join the same room as observers
4. Use `socket.to(roomId).emit()` to broadcast events

## Client-Side Implementation Status

✅ **Completed**:
- Active games display with live scores
- Click handler for spectating prompt
- Spectator mode flag in gameState
- Disabled controls (dice rolling, piece movement)
- Suppressed goal and winner modals
- Real-time event handling for spectators
- Auto-return to lobby on game end
- Translation strings added

⏳ **Pending Server Support**:
- `joinSpectator` endpoint
- `leaveSpectator` endpoint
- Broadcasting events to spectators
- Spectator status in lobby
- Score tracking in active games

## Testing Checklist

Once server is implemented:
1. ✅ Can view live scores in active games list
2. ⏳ Can click on active game and see spectate prompt
3. ⏳ Can join game as spectator
4. ⏳ See current board state when joining
5. ⏳ See dice rolls happen in real-time
6. ⏳ See pieces move in real-time
7. ⏳ See scores update when goals are scored
8. ⏳ Cannot roll dice as spectator
9. ⏳ Cannot move pieces as spectator
10. ⏳ Don't see goal modals as spectator
11. ⏳ Don't see winner screen as spectator
12. ⏳ Automatically returned to lobby when game ends
13. ⏳ Automatically returned to lobby if player disconnects
14. ⏳ Shows as "spectating" in lobby (unchallengeable)
15. ⏳ Can leave spectator mode and return to lobby

## Notes

- Spectators should have minimal impact on game performance
- Consider limiting number of spectators per game if needed
- Spectator events should be read-only (no ability to affect game state)
- Spectator bandwidth should be considered for mobile users
