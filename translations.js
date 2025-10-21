// Translation system for Dice Soccer game
const translations = {
    en: {
        // Menu items
        newGame: "New Game",
        twoPlayerGame: "2 Player Game",
        aiDifficulty: "A.I. Difficulty",
        hostGame: "Host Game",
        joinGame: "Join Game",
        settings: "Settings",
        gameSettings: "Game Settings",
        language: "Language",
        sound: "Sound",
        fastAI: "Fast AI Movement",
        autoDice: "Auto Dice Rolling",
        
        // Difficulty levels
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        
        // Shirt colors
        blue: "Blue",
        green: "Green",
        orange: "Orange",
        yellow: "Yellow",
        red: "Red",
        pink: "Pink",
        purple: "Purple",
        barca: "Barcelona",
        argentina: "Argentina",
        slovenija: "Slovenia",
        
        // Players
        player1: "Player 1",
        player2: "Player 2",

        // Orientation
        orientation: "Orientation",
        portrait: "Portrait",
        landscape: "Landscape",
        difficulty: "difficulty",

        // Hints
        hints: "Hints",
        hintsOn: "Hints On",
        hintsOff: "Hints Off",
        selectHints: "Select Game Mode",
        playWithHints: "Play with Hints",
        playWithoutHints: "Play without Hints",
        hintsOnDescription: "Movable players and valid moves are highlighted",
        hintsOffDescription: "No highlighting - more challenging!",

        // Modals
        selectShirtColor: "Select Shirt Color",
        close: "Close",
        availableGames: "Available Games",
        searching: "Searching for games...",
        noGamesFound: "No games found. Try hosting one!",
        waitingForPlayer: "Waiting for player to join...",
        gameCode: "Game Code:",
        cancel: "Cancel",
        join: "Join",
        refresh: "Refresh",
        player: "Player",
        availableHosts: "Available Hosts",
        noHostsFound: "No hosts found. Ask someone to host a game!",
        failedToHost: "Failed to host game",
        failedToJoin: "Failed to join game",
        opponentLeft: "Opponent left the game",
        opponentDisconnected: "Opponent disconnected",
        connectionLost: "Connection lost",
        
        // Game
        gameStarting: "Game Starting...",
        backToMenu: "Back to Menu",
        goal: "GOAL!",
        continue: "Continue",
        statistics: "Statistics",
        winner: "Winner",
        wins: "wins",
        moves: "Moves",
        points: "points",
        thinkingTime: "Thinking Time",
        totalMoves: "Total Moves",
        gameTime: "Game Time",
        totalTime: "Total Time",
        rollDiceFirst: "Dice needs to be rolled first",
        cannotMovePlayer: "This player cannot be moved",
        noMovesAvailable: "has no moves available",
        scores: "scores",
        
        // Status messages
        on: "On",
        off: "Off"
    },
    sl: {
        // Menu items
        newGame: "Nova igra",
        twoPlayerGame: "Igra za dva igralca",
        aiDifficulty: "A.I. težavnost",
        hostGame: "Gostuj igro",
        joinGame: "Pridruži se igri",
        settings: "Nastavitve",
        gameSettings: "Nastavitve igre",
        language: "Jezik",
        sound: "Zvok",
        fastAI: "Hitro AI gibanje",
        autoDice: "Samodejno metanje kocke",
        
        // Difficulty levels
        easy: "Lahka",
        normal: "Normalna",
        hard: "Težka",
        
        // Shirt colors
        blue: "Modra",
        green: "Zelena",
        orange: "Oranžna",
        yellow: "Rumena",
        red: "Rdeča",
        pink: "Rožnata",
        purple: "Vijolična",
        barca: "Barcelona",
        argentina: "Argentina",
        slovenija: "Slovenija",
        
        // Players
        player1: "Igralec 1",
        player2: "Igralec 2",

        // Orientation
        orientation: "Orientacija",
        portrait: "Pokončno",
        landscape: "Ležeče",
        difficulty: "težavnost",
        
        // Hints
        hints: "Namigi",
        hintsOn: "Vključi namige",
        hintsOff: "Izključi namige",
        selectHints: "Izberi način igre",
        playWithHints: "Igraj z namigi",
        playWithoutHints: "Igraj brez namigov",
        hintsOnDescription: "Premakljivi igralci in veljavne poteze so označene",
        hintsOffDescription: "Brez označevanja - večji izziv!",

        // Modals
        selectShirtColor: "Izberi barvo dresa",
        close: "Zapri",
        availableGames: "Razpoložljive igre",
        searching: "Iskanje iger...",
        noGamesFound: "Ni najdenih iger. Poskusi gostiti eno!",
        waitingForPlayer: "Čakanje na igralca...",
        gameCode: "Koda igre:",
        cancel: "Prekliči",
        join: "Pridruži se",
        refresh: "Osveži",
        player: "Igralec",
        availableHosts: "Razpoložljivi gostitelji",
        noHostsFound: "Ni najdenih gostiteljev. Prosi nekoga, da gosti igro!",
        failedToHost: "Gostovanje igre ni uspelo",
        failedToJoin: "Pridružitev igri ni uspela",
        opponentLeft: "Nasprotnik je zapustil igro",
        opponentDisconnected: "Nasprotnik je prekinil povezavo",
        connectionLost: "Povezava izgubljena",
        
        // Game
        gameStarting: "Igra se začenja...",
        backToMenu: "Nazaj v meni",
        goal: "GOL!",
        continue: "Nadaljuj",
        statistics: "Statistika",
        winner: "Zmagovalec",
        wins: "zmaga",
        moves: "Poteze",
        points: "točk",
        thinkingTime: "Čas razmišljanja",
        totalMoves: "Skupaj potez",
        gameTime: "Čas igre",
        totalTime: "Skupni čas",
        rollDiceFirst: "Najprej vrzi kocko",
        cannotMovePlayer: "Ta igralec ne more igrati",
        noMovesAvailable: "nima na voljo nobenih premikov",
        scores: "dobi točko",
        
        // Status messages
        on: "Vključeno",
        off: "Izklopljeno"
    }
};

class TranslationManager {
    constructor() {
        this.currentLanguage = this.detectLanguage();
        this.translations = translations;
    }

    detectLanguage() {
        // Try to get saved language from localStorage
        const savedLang = localStorage.getItem('dicesoccer_language');
        if (savedLang && (savedLang === 'en' || savedLang === 'sl')) {
            return savedLang;
        }

        // Detect from browser
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('sl')) {
            return 'sl';
        }
        return 'en'; // Default to English
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('dicesoccer_language', lang);
            this.updateUI();
        }
    }

    get(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    updateUI() {
        // Update all elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.get(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = this.get(key);
        });

        // Update elements with data-translate-value attribute
        document.querySelectorAll('[data-translate-value]').forEach(element => {
            const key = element.getAttribute('data-translate-value');
            element.textContent = this.get(key);
        });

        // Update language value display
        const languageValue = document.getElementById('languageValue');
        if (languageValue) {
            languageValue.textContent = this.currentLanguage === 'en' ? 'English' : 'Slovenščina';
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

// Create global translation manager instance
const translationManager = new TranslationManager();
