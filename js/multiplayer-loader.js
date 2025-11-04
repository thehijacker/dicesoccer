// Multiplayer Manager Loader
// Dynamically loads the appropriate multiplayer backend based on config.json

let multiplayerManager = null;

(async function initializeMultiplayerManager() {
    try {
        // Load config to determine which multiplayer backend to use
        const response = await fetch('config.json');
        const config = await response.json();
        
        const backendType = config['multiplayer-server'] || 'php';
        
        console.log(`🎮 Initializing multiplayer backend: ${backendType}`);
        
        if (backendType === 'nodejs' || backendType === 'websocket') {
            // Use WebSocket manager
            if (typeof WebSocketMultiplayerManager !== 'undefined') {
                multiplayerManager = new WebSocketMultiplayerManager();
                console.log('✅ WebSocket multiplayer manager loaded');
            } else {
                console.error('❌ WebSocketMultiplayerManager not loaded, falling back to PHP');
                multiplayerManager = new MultiplayerManager();
            }
        } else {
            // Use PHP manager (default)
            if (typeof MultiplayerManager !== 'undefined') {
                multiplayerManager = new MultiplayerManager();
                console.log('✅ PHP multiplayer manager loaded');
            } else {
                console.error('❌ MultiplayerManager not loaded');
            }
        }
        
        // Make globally available
        window.multiplayerManager = multiplayerManager;
        
    } catch (error) {
        console.error('Failed to initialize multiplayer manager:', error);
        // Fallback to PHP
        if (typeof MultiplayerManager !== 'undefined') {
            multiplayerManager = new MultiplayerManager();
            window.multiplayerManager = multiplayerManager;
            console.log('✅ Fallback to PHP multiplayer manager');
        }
    }
})();
