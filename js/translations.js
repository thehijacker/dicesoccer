// Translation system for Dice Soccer game
const translations = {
    en: {
        // Menu items
        newGame: "New Game",
        twoPlayerGame: "2 Player Game",
        aiDifficulty: "A.I. Difficulty",
        multiplayer: "Multiplayer",
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
        enterPlayerName: "Enter Player Name",
        save: "Save",
        close: "Close",
        cancel: "Cancel",
        join: "Join",
        refresh: "Refresh",
        player: "Player",
        noHostsFound: "No hosts found. Ask someone to host a game!",
        failedToHost: "Failed to host game",
        failedToJoin: "Failed to join game",
        opponentLeft: "Opponent left the game",
        opponentDisconnected: "Opponent disconnected",
        opponentReconnected: "Opponent reconnected",
        waitingForOpponent: "Waiting for opponent to reconnect",
        backToLobby: "Back to Lobby",
        connectionLost: "Connection lost",
        multiplayerUnavailable: "Multiplayer is currently unavailable. Please check your connection.",

        // Lobby
        welcomeToMultiplayer: "Welcome to Multiplayer",
        chooseYourOption: "Select login options",
        playAsGuest: "Play as Guest",
        guestDescription: "Play without creating an account",
        login: "Login",
        loginDescription: "Access your account",
        loginToAccount: "Login to your account",
        username: "Username",
        password: "Password",
        back: "Back",
        register: "Register",
        registerDescription: "Create a new account",
        createAccount: "Create an Account",
        emailOptional: "Email (optional)",
        
        // Auth errors
        failedToCreateGuest: "Failed to create guest user",
        pleaseEnterUsernamePassword: "Please enter username and password",
        loginFailed: "Login failed",
        pleaseEnterUsername: "Please enter a username",
        usernameMustBe: "Username must be 3-15 characters",
        passwordMustBe: "Password must be at least 8 characters",
        registrationFailed: "Registration failed",
        
        // Server validation errors
        usernameRequired: "Username is required",
        usernameTooShort: "Username must be at least 3 characters long",
        usernameTooLong: "Username must be 15 characters or less",
        usernameInvalidChars: "Username can contain any characters",
        passwordRequired: "Password is required",
        passwordTooShort: "Password must be at least 8 characters long",
        passwordTooLong: "Password must be less than 72 characters",
        passwordComplexity: "Password must contain at least one letter and one number",
        emailInvalid: "Invalid email format",
        usernameAlreadyTaken: "Username already taken",
        emailAlreadyRegistered: "Email already registered",
        invalidCredentials: "Invalid username or password",
        accountLocked: "Account temporarily locked due to too many failed attempts. Try again later.",
        tokenExpired: "Session expired. Please login again.",
        tokenInvalid: "Invalid session token",
        userNotFound: "User not found",
        
        // Password strength
        passwordStrength: "Password strength",
        weak: "Weak",
        fair: "Fair",
        good: "Good",
        strong: "Strong",

        leaderboards: "Leaderboards",
        viewLeaderboard: "View Leaderboard",
        weeklyLeaderboard: "Weekly Leaderboard",
        alltimeLeaderboard: "All-time Leaderboard",
        thisWeek: "This Week",
        allTime: "All Time",
        rank: "RANK",
        player: "PLAYER",
        elo: "ELO",
        games: "GAMES",
        winLoss: "W-L",
        winPercent: "WIN%",
        goalDiff: "GOAL DIFF",
        week: "Week",
        loading: "Loading...",
        failedToLoadLeaderboard: "Failed to load leaderboard",
        noPlayersYet: "No players yet. Be the first!",

        multiplayerLobby: "Multiplayer Lobby",
        availablePlayers: "Available Players",
        activeGames: "Active Games",
        noPlayersInLobby: "No players in lobby yet...",
        noActiveGames: "No active games",
        available: "Available",
        spectating: "Spectating",
        spectateGame: "Watch Game?",
        watch: "Watch",
        challenge: "Challenge",
        challengePlayer: "Challenge Player",
        challenging: "Challenging",
        accept: "Accept",
        decline: "Decline",
        waitingForResponse: "Waiting for response...",
        challengedYou: "challenged you to a game!",
        challengeDeclined: "Challenge was declined",
        challengeCancelled: "Challenge was cancelled",
        justNow: "Just now",
        minutesAgo: "m ago",
        hoursAgo: "h ago",

        // Connection
        connecting: "Connecting...",
        tryingToConnect: "Trying to connect to the server...",
        connectionFailed: "Connection Failed",
        connectionFailedMessage: "Could not connect to the server. Please try again later.",
        connectionLostMessage: "Connection to the server was lost. You've been returned to the main menu.",
        ok: "OK",

        // Game
        backToMenu: "Back to Menu",
        goal: "GOAL!",
        continue: "Continue",
        viewBoard: "View Board",
        statistics: "Statistics",
        winner: "Winner",
        wins: "wins",
        moves: "Moves",
        thinkingTime: "Thinking Time",
        totalMoves: "Total Moves",
        gameTime: "Game Time",
        totalTime: "Total Time",
        eloRating: "ELO Rating",
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
        multiplayer: "Spletno igranje",
        settings: "Nastavitve",
        gameSettings: "Nastavitve igre",
        language: "Jezik",
        sound: "Zvok",
        fastAI: "Hitrejši premiki AI",
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
        enterPlayerName: "Vnesi ime igralca",
        save: "Shrani",
        close: "Zapri",
        cancel: "Prekliči",
        join: "Pridruži se",
        refresh: "Osveži",
        player: "Igralec",
        noHostsFound: "Ni najdenih gostiteljev. Prosi nekoga, da gosti igro!",
        failedToHost: "Gostovanje igre ni uspelo",
        failedToJoin: "Pridružitev igri ni uspela",
        opponentLeft: "Nasprotnik je zapustil igro",
        opponentDisconnected: "Nasprotnik je prekinil povezavo",
        opponentReconnected: "Nasprotnik se je ponovno povezal",
        waitingForOpponent: "Čakanje na ponovno povezavo nasprotnika",
        backToLobby: "Nazaj v ložo",
        connectionLost: "Povezava izgubljena",
        multiplayerUnavailable: "Spletno igranje trenutno ni na voljo. Prosim preverite svojo povezavo.",

        // Lobby
        welcomeToMultiplayer: "Dobrodošli v spletnem igranju",
        chooseYourOption: "Izberi način prijave",
        playAsGuest: "Igraj kot gost",
        guestDescription: "Igraj brez ustvarjanja računa",
        login: "Prijava",
        loginDescription: "Dostop do svojega računa",
        loginToAccount: "Prijava v svoj račun",
        username: "Uporabniško ime",
        password: "Geslo",
        back: "Nazaj",
        register: "Registracija",
        registerDescription: "Ustvari nov račun",
        createAccount: "Ustvari račun",
        emailOptional: "E-pošta (neobvezno)",
        
        // Auth errors
        failedToCreateGuest: "Ustvarjanje gostujočega uporabnika ni uspelo",
        pleaseEnterUsernamePassword: "Prosim vnesite uporabniško ime in geslo",
        loginFailed: "Prijava ni uspela",
        pleaseEnterUsername: "Prosim vnesite uporabniško ime",
        usernameMustBe: "Uporabniško ime mora biti dolgo 3-15 znakov",
        passwordMustBe: "Geslo mora biti dolgo vsaj 8 znakov",
        registrationFailed: "Registracija ni uspela",
        
        // Server validation errors
        usernameRequired: "Uporabniško ime je obvezno",
        usernameTooShort: "Uporabniško ime mora biti dolgo vsaj 3 znake",
        usernameTooLong: "Uporabniško ime mora biti 15 znakov ali manj",
        usernameInvalidChars: "Uporabniško ime lahko vsebuje katerekoli znake",
        passwordRequired: "Geslo je obvezno",
        passwordTooShort: "Geslo mora biti dolgo vsaj 8 znakov",
        passwordTooLong: "Geslo mora biti krajše od 72 znakov",
        passwordComplexity: "Geslo mora vsebovati vsaj eno črko in eno številko",
        emailInvalid: "Neveljavna oblika e-pošte",
        usernameAlreadyTaken: "Uporabniško ime je že zasedeno",
        emailAlreadyRegistered: "E-pošta je že registrirana",
        invalidCredentials: "Napačno uporabniško ime ali geslo",
        accountLocked: "Račun je začasno zaklenjen zaradi preveč neuspelih poskusov. Poskusite kasneje.",
        tokenExpired: "Seja je potekla. Prosim prijavite se ponovno.",
        tokenInvalid: "Neveljavna seja",
        userNotFound: "Uporabnik ni najden",
        
        // Password strength
        passwordStrength: "Moč gesla",
        weak: "Šibko",
        fair: "Srednje",
        good: "Dobro",
        strong: "Močno",
        password: "Geslo",
        back: "Nazaj",
        register: "Registracija",
        registerDescription: "Ustvari nov račun",
        createAccount: "Ustvari račun",
        emailOptional: "E-pošta (neobvezno)",
        viewLeaderboard: "Poglej lestvico",

        leaderboards: "Lestvice",
        viewLeaderboard: "Poglej lestvico",
        weeklyLeaderboard: "Tedenska lestvica",
        alltimeLeaderboard: "Vsečasna lestvica",
        thisWeek: "Ta teden",
        allTime: "Ves čas",
        rank: "MESTO",
        player: "IGRALEC",
        elo: "ELO",
        games: "IGRE",
        winLoss: "Z-P",
        winPercent: "ZMAGE%",
        goalDiff: "GOL RAZ",
        week: "Teden",
        loading: "Nalaganje...",
        failedToLoadLeaderboard: "Ni uspelo naložiti lestvice",
        noPlayersYet: "Nobenih igralcev še ni. Bodite prvi!",

        multiplayerLobby: "Igralci v loži",
        availablePlayers: "Razpoložljivi igralci",
        activeGames: "Aktivne igre",
        noPlayersInLobby: "Nobenih igralcev ni v loži.",
        noActiveGames: "Ni aktivnih iger.",
        available: "Na voljo",
        spectating: "Opazovanje",
        spectateGame: "Opazujem igro?",
        watch: "Opazuj",
        challenge: "Izzovi",
        challengePlayer: "Izzovi igralca",
        challenging: "Izzivanje...",
        accept: "Sprejmi",
        decline: "Zavrni",
        waitingForResponse: "Čakanje na odgovor...",
        challengedYou: "te je izzval na igro!",
        challengeDeclined: "Izziv je bil zavrnjen",
        challengeCancelled: "Izziv je bil preklican",
        justNow: "ravnokar",
        minutesAgo: "pred minutami",
        hoursAgo: "pred urami",

        // Connection
        connecting: "Povezovanje...",
        tryingToConnect: "Poskušam se povezati s strežnikom...",
        connectionFailed: "Povezava ni uspela",
        connectionFailedMessage: "Ni se bilo mogoče povezati s strežnikom. Poskusite znova pozneje.",
        connectionLostMessage: "Povezava s strežnikom je bila prekinjena. Vrnjeni ste bili v glavni meni.",
        ok: "V redu",

        // Game
        backToMenu: "Nazaj v meni",
        goal: "GOL!",
        continue: "Nadaljuj",
        viewBoard: "Prikaži ploščo",
        statistics: "Statistika",
        winner: "Zmagovalec",
        wins: "zmaga",
        moves: "Poteze",
        thinkingTime: "Čas razmišljanja",
        totalMoves: "Skupaj potez",
        gameTime: "Čas igre",
        totalTime: "Skupni čas",
        eloRating: "ELO ocena",
        rollDiceFirst: "Najprej vrzi kocko",
        cannotMovePlayer: "Ta igralec ne more igrati",
        noMovesAvailable: "nima na voljo nobenih premikov",
        scores: "dobi točko",

        // Status messages
        on: "Vključeno",
        off: "Izklopljeno"
    },
    de: {
        // Menu items
        newGame: "Neues Spiel",
        twoPlayerGame: "2-Spieler-Spiel",
        aiDifficulty: "K.I.-Schwierigkeit",
        multiplayer: "Mehrspieler",
        settings: "Einstellungen",
        gameSettings: "Spieleinstellungen",
        language: "Sprache",
        sound: "Ton",
        fastAI: "Schnelle K.I.-Bewegung",
        autoDice: "Automatisches Würfeln",

        // Difficulty levels
        easy: "Einfach",
        normal: "Normal",
        hard: "Schwer",

        // Shirt colors
        blue: "Blau",
        green: "Grün",
        orange: "Orange",
        yellow: "Gelb",
        red: "Rot",
        pink: "Rosa",
        purple: "Lila",
        barca: "Barcelona",
        argentina: "Argentinien",
        slovenija: "Slowenien",

        // Players
        player1: "Spieler 1",
        player2: "Spieler 2",

        // Orientation
        orientation: "Ausrichtung",
        portrait: "Hochformat",
        landscape: "Querformat",
        difficulty: "Schwierigkeit",

        // Hints
        hints: "Hinweise",
        hintsOn: "Hinweise an",
        hintsOff: "Hinweise aus",
        selectHints: "Spielmodus auswählen",
        playWithHints: "Mit Hinweisen spielen",
        playWithoutHints: "Ohne Hinweise spielen",
        hintsOnDescription: "Bewegliche Spieler und gültige Züge werden hervorgehoben",
        hintsOffDescription: "Keine Hervorhebung - anspruchsvoller!",

        // Modals
        selectShirtColor: "Trikotfarbe auswählen",
        enterPlayerName: "Spielername eingeben",
        save: "Speichern",
        close: "Schließen",
        cancel: "Abbrechen",
        join: "Beitreten",
        refresh: "Aktualisieren",
        player: "Spieler",
        noHostsFound: "Keine Hosts gefunden. Bitte jemanden, ein Spiel zu hosten!",
        failedToHost: "Hosten des Spiels fehlgeschlagen",
        failedToJoin: "Beitritt zum Spiel fehlgeschlagen",
        opponentLeft: "Gegner hat das Spiel verlassen",
        opponentDisconnected: "Gegner hat die Verbindung getrennt",
        opponentReconnected: "Gegner hat sich wieder verbunden",
        waitingForOpponent: "Warte auf erneute Verbindung des Gegners",
        backToLobby: "Zurück zur Lobby",
        connectionLost: "Verbindung verloren",

        // Lobby
        multiplayerLobby: "Mehrspieler-Lobby",
        availablePlayers: "Verfügbare Spieler",
        activeGames: "Aktive Spiele",
        noPlayersInLobby: "Keine Spieler in der Lobby.",
        noActiveGames: "Keine aktiven Spiele.",
        available: "Verfügbar",
        spectating: "Zuschauen",
        spectateGame: "Spiel zuschauen?",
        watch: "Zuschauen",
        challenge: "Herausfordern",
        challengePlayer: "Spieler herausfordern",
        challenging: "Herausfordern...",
        accept: "Annehmen",
        decline: "Ablehnen",
        waitingForResponse: "Warte auf Antwort...",
        challengedYou: "hat dich zu einem Spiel herausgefordert!",
        challengeDeclined: "Herausforderung wurde abgelehnt",
        challengeCancelled: "Herausforderung wurde abgebrochen",
        justNow: "gerade eben",
        minutesAgo: "vor Minuten",
        hoursAgo: "vor Stunden",

        // Connection
        connecting: "Verbinde...",
        tryingToConnect: "Versuche, eine Verbindung zum Server herzustellen...",
        connectionFailed: "Verbindung fehlgeschlagen",
        connectionFailedMessage: "Konnte keine Verbindung zum Server herstellen. Bitte versuchen Sie es später erneut.",
        connectionLostMessage: "Die Verbindung zum Server wurde unterbrochen. Sie wurden zum Hauptmenü zurückgekehrt.",
        ok: "OK",

        // Game
        backToMenu: "Zurück zum Menü",
        goal: "TOR!",
        continue: "Weiter",
        viewBoard: "Spielfeld anzeigen",
        statistics: "Statistiken",
        winner: "Gewinner",
        wins: "gewinnt",
        moves: "Züge",
        thinkingTime: "Bedenkzeit",
        totalMoves: "Züge insgesamt",
        gameTime: "Spielzeit",
        totalTime: "Gesamtzeit",
        eloRating: "ELO-Wertung",
        rollDiceFirst: "Zuerst muss gewürfelt werden",
        cannotMovePlayer: "Dieser Spieler kann nicht bewegt werden",
        noMovesAvailable: "hat keine Züge verfügbar",
        scores: "erzielt",

        // Status messages
        on: "An",
        off: "Aus"
    },
    it: {
        // Menu items
        newGame: "Nuova Partita",
        twoPlayerGame: "Partita a 2 Giocatori",
        aiDifficulty: "Difficoltà I.A.",
        multiplayer: "Multigiocatore",
        settings: "Impostazioni",
        gameSettings: "Impostazioni di Gioco",
        language: "Lingua",
        sound: "Suono",
        fastAI: "Movimento I.A. Veloce",
        autoDice: "Lancio Dadi Automatico",

        // Difficulty levels
        easy: "Facile",
        normal: "Normale",
        hard: "Difficile",

        // Shirt colors
        blue: "Blu",
        green: "Verde",
        orange: "Arancione",
        yellow: "Giallo",
        red: "Rosso",
        pink: "Rosa",
        purple: "Viola",
        barca: "Barcellona",
        argentina: "Argentina",
        slovenija: "Slovenia",

        // Players
        player1: "Giocatore 1",
        player2: "Giocatore 2",

        // Orientation
        orientation: "Orientamento",
        portrait: "Verticale",
        landscape: "Orizzontale",
        difficulty: "difficoltà",

        // Hints
        hints: "Suggerimenti",
        hintsOn: "Suggerimenti Attivi",
        hintsOff: "Suggerimenti Disattivati",
        selectHints: "Seleziona Modalità di Gioco",
        playWithHints: "Gioca con Suggerimenti",
        playWithoutHints: "Gioca senza Suggerimenti",
        hintsOnDescription: "I giocatori mobili e le mosse valide sono evidenziati",
        hintsOffDescription: "Nessuna evidenziazione - più impegnativo!",

        // Modals
        selectShirtColor: "Seleziona Colore Maglia",
        enterPlayerName: "Inserisci Nome Giocatore",
        save: "Salva",
        close: "Chiudi",
        cancel: "Annulla",
        join: "Unisciti",
        refresh: "Aggiorna",
        player: "Giocatore",
        noHostsFound: "Nessun host trovato. Chiedi a qualcuno di ospitare una partita!",
        failedToHost: "Impossibile ospitare la partita",
        failedToJoin: "Impossibile unirsi alla partita",
        opponentLeft: "L'avversario ha lasciato la partita",
        opponentDisconnected: "Avversario disconnesso",
        opponentReconnected: "Avversario riconnesso",
        waitingForOpponent: "In attesa di riconnessione dell'avversario",
        backToLobby: "Torna alla Lobby",
        connectionLost: "Connessione persa",

        // Lobby
        multiplayerLobby: "Lobby Multigiocatore",
        availablePlayers: "Giocatori Disponibili",
        activeGames: "Partite Attive",
        noPlayersInLobby: "Nessun giocatore nella lobby.",
        noActiveGames: "Nessuna partita attiva.",
        available: "Disponibile",
        spectating: "Osservando",
        spectateGame: "Guardare la partita?",
        watch: "Guarda",
        challenge: "Sfida",
        challengePlayer: "Sfida Giocatore",
        challenging: "Sfidando...",
        accept: "Accetta",
        decline: "Rifiuta",
        waitingForResponse: "In attesa di risposta...",
        challengedYou: "ti ha sfidato a una partita!",
        challengeDeclined: "La sfida è stata rifiutata",
        challengeCancelled: "La sfida è stata annullata",
        justNow: "proprio ora",
        minutesAgo: "minuti fa",
        hoursAgo: "ore fa",

        // Connection
        connecting: "Connessione in corso...",
        tryingToConnect: "Tentativo di connessione al server...",
        connectionFailed: "Connessione Fallita",
        connectionFailedMessage: "Impossibile connettersi al server. Riprova più tardi.",
        connectionLostMessage: "La connessione al server è stata persa. Sei tornato al menu principale.",
        ok: "OK",

        // Game
        backToMenu: "Torna al Menu",
        goal: "GOAL!",
        continue: "Continua",
        viewBoard: "Visualizza campo",
        statistics: "Statistiche",
        winner: "Vincitore",
        wins: "vince",
        moves: "Mosse",
        thinkingTime: "Tempo di Riflessione",
        totalMoves: "Mosse Totali",
        gameTime: "Tempo di Gioco",
        totalTime: "Tempo Totale",
        eloRating: "Classifica ELO",
        rollDiceFirst: "Bisogna prima lanciare i dadi",
        cannotMovePlayer: "Questo giocatore non può essere mosso",
        noMovesAvailable: "non ha mosse disponibili",
        scores: "segna",

        // Status messages
        on: "On",
        off: "Off"
    },
    es: {
        // Menu items
        newGame: "Nuevo Juego",
        twoPlayerGame: "Juego de 2 Jugadores",
        aiDifficulty: "Dificultad de la IA",
        multiplayer: "Multijugador",
        settings: "Ajustes",
        gameSettings: "Ajustes del Juego",
        language: "Idioma",
        sound: "Sonido",
        fastAI: "Movimiento IA Rápido",
        autoDice: "Lanzamiento Automático de Dados",

        // Difficulty levels
        easy: "Fácil",
        normal: "Normal",
        hard: "Difícil",

        // Shirt colors
        blue: "Azul",
        green: "Verde",
        orange: "Naranja",
        yellow: "Amarillo",
        red: "Rojo",
        pink: "Rosa",
        purple: "Morado",
        barca: "Barcelona",
        argentina: "Argentina",
        slovenija: "Eslovenia",

        // Players
        player1: "Jugador 1",
        player2: "Jugador 2",

        // Orientation
        orientation: "Orientación",
        portrait: "Vertical",
        landscape: "Horizontal",
        difficulty: "dificultad",

        // Hints
        hints: "Pistas",
        hintsOn: "Pistas Activadas",
        hintsOff: "Pistas Desactivadas",
        selectHints: "Seleccionar Modo de Juego",
        playWithHints: "Jugar con Pistas",
        playWithoutHints: "Jugar sin Pistas",
        hintsOnDescription: "Se resaltan los jugadores que se pueden mover y los movimientos válidos",
        hintsOffDescription: "Sin resaltado - ¡más desafiante!",

        // Modals
        selectShirtColor: "Seleccionar Color de Camiseta",
        enterPlayerName: "Introducir Nombre del Jugador",
        save: "Guardar",
        close: "Cerrar",
        cancel: "Cancelar",
        join: "Unirse",
        refresh: "Actualizar",
        player: "Jugador",
        noHostsFound: "No se encontraron anfitriones. ¡Pídele a alguien que cree una partida!",
        failedToHost: "Error al crear la partida",
        failedToJoin: "Error al unirse a la partida",
        opponentLeft: "El oponente abandonó la partida",
        opponentDisconnected: "Oponente desconectado",
        opponentReconnected: "Oponente reconectado",
        waitingForOpponent: "Esperando que el oponente se reconecte",
        backToLobby: "Volver a la Sala",
        connectionLost: "Conexión perdida",

        // Lobby
        multiplayerLobby: "Sala Multijugador",
        availablePlayers: "Jugadores Disponibles",
        activeGames: "Partidas Activas",
        noPlayersInLobby: "No hay jugadores en la sala.",
        noActiveGames: "No hay partidas activas.",
        available: "Disponible",
        spectating: "Espectando",
        spectateGame: "¿Ver el juego?",
        watch: "Ver",
        challenge: "Desafiar",
        challengePlayer: "Desafiar Jugador",
        challenging: "Desafiando...",
        accept: "Aceptar",
        decline: "Rechazar",
        waitingForResponse: "Esperando respuesta...",
        challengedYou: "te desafió a un juego!",
        challengeDeclined: "El desafío fue rechazado",
        challengeCancelled: "El desafío fue cancelado",
        justNow: "justo ahora",
        minutesAgo: "hace minutos",
        hoursAgo: "hace horas",

        // Connection
        connecting: "Conectando...",
        tryingToConnect: "Intentando conectar al servidor...",
        connectionFailed: "Conexión Fallida",
        connectionFailedMessage: "No se pudo conectar al servidor. Por favor, inténtalo de nuevo más tarde.",
        connectionLostMessage: "La conexión al servidor se perdió. Has sido devuelto al menú principal.",
        ok: "OK",

        // Game
        backToMenu: "Volver al Menú",
        goal: "¡GOL!",
        continue: "Continuar",
        viewBoard: "Ver tablero",
        statistics: "Estadísticas",
        winner: "Ganador",
        wins: "gana",
        moves: "Movimientos",
        thinkingTime: "Tiempo de Pensamiento",
        totalMoves: "Movimientos Totales",
        gameTime: "Tiempo de Juego",
        totalTime: "Tiempo Total",
        eloRating: "Puntuación ELO",
        rollDiceFirst: "Primero hay que lanzar los dados",
        cannotMovePlayer: "Este jugador no se puede mover",
        noMovesAvailable: "no tiene movimientos disponibles",
        scores: "marca",

        // Status messages
        on: "On",
        off: "Off"
    },
    fr: {
        // Menu items
        newGame: "Nouvelle Partie",
        twoPlayerGame: "Partie à 2 Joueurs",
        aiDifficulty: "Difficulté de l'IA",
        multiplayer: "Multijoueur",
        settings: "Paramètres",
        gameSettings: "Paramètres du Jeu",
        language: "Langue",
        sound: "Son",
        fastAI: "Mouvement IA Rapide",
        autoDice: "Lancer de Dés Automatique",

        // Difficulty levels
        easy: "Facile",
        normal: "Normal",
        hard: "Difficile",

        // Shirt colors
        blue: "Bleu",
        green: "Vert",
        orange: "Orange",
        yellow: "Jaune",
        red: "Rouge",
        pink: "Rose",
        purple: "Violet",
        barca: "Barcelone",
        argentina: "Argentine",
        slovenija: "Slovénie",

        // Players
        player1: "Joueur 1",
        player2: "Joueur 2",

        // Orientation
        orientation: "Orientation",
        portrait: "Portrait",
        landscape: "Paysage",
        difficulty: "difficulté",

        // Hints
        hints: "Indices",
        hintsOn: "Indices Activés",
        hintsOff: "Indices Désactivés",
        selectHints: "Sélectionner le Mode de Jeu",
        playWithHints: "Jouer avec des Indices",
        playWithoutHints: "Jouer sans Indices",
        hintsOnDescription: "Les joueurs déplaçables et les coups valides sont mis en surbrillance",
        hintsOffDescription: "Pas de surbrillance - plus difficile !",

        // Modals
        selectShirtColor: "Choisir la Couleur du Maillot",
        enterPlayerName: "Entrer le Nom du Joueur",
        save: "Enregistrer",
        close: "Fermer",
        cancel: "Annuler",
        join: "Rejoindre",
        refresh: "Actualiser",
        player: "Joueur",
        noHostsFound: "Aucun hôte trouvé. Demandez à quelqu'un d'héberger une partie !",
        failedToHost: "Échec de l'hébergement de la partie",
        failedToJoin: "Échec pour rejoindre la partie",
        opponentLeft: "L'adversaire a quitté la partie",
        opponentDisconnected: "Adversaire déconnecté",
        opponentReconnected: "Adversaire reconnecté",
        waitingForOpponent: "En attente de la reconnexion de l'adversaire",
        backToLobby: "Retour au Salon",
        connectionLost: "Connexion perdue",

        // Lobby
        multiplayerLobby: "Salon Multijoueur",
        availablePlayers: "Joueurs Disponibles",
        activeGames: "Parties Actives",
        noPlayersInLobby: "Aucun joueur dans le salon.",
        noActiveGames: "Aucune partie active.",
        available: "Disponible",
        spectating: "En observation",
        spectateGame: "Regarder le jeu?",
        watch: "Regarder",
        challenge: "Défier",
        challengePlayer: "Défier le Joueur",
        challenging: "En train de défier...",
        accept: "Accepter",
        decline: "Refuser",
        waitingForResponse: "En attente de réponse...",
        challengedYou: "vous a défié à un jeu!",
        challengeDeclined: "Le défi a été refusé",
        challengeCancelled: "Le défi a été annulé",
        justNow: "à l'instant",
        minutesAgo: "il y a quelques minutes",
        hoursAgo: "il y a quelques heures",

        // Connection
        connecting: "Connexion en cours...",
        tryingToConnect: "Tentative de connexion au serveur...",
        connectionFailed: "Échec de la Connexion",
        connectionFailedMessage: "Impossible de se connecter au serveur. Veuillez réessayer plus tard.",
        connectionLostMessage: "La connexion au serveur a été perdue. Vous avez été renvoyé au menu principal.",
        ok: "OK",

        // Game
        backToMenu: "Retour au Menu",
        goal: "BUT !",
        continue: "Continuer",
        viewBoard: "Voir le terrain",
        statistics: "Statistiques",
        winner: "Gagnant",
        wins: "gagne",
        moves: "Mouvements",
        thinkingTime: "Temps de Réflexion",
        totalMoves: "Mouvements Totaux",
        gameTime: "Temps de Jeu",
        totalTime: "Temps Total",
        eloRating: "Classement ELO",
        rollDiceFirst: "Il faut d'abord lancer les dés",
        cannotMovePlayer: "Ce joueur ne peut pas être déplacé",
        noMovesAvailable: "n'a aucun coup disponible",
        scores: "marque",

        // Status messages
        on: "On",
        off: "Off"
    },
    hr: {
        // Menu items
        newGame: "Nova igra",
        twoPlayerGame: "Igra za 2 igrača",
        aiDifficulty: "Težina A.I.-a",
        multiplayer: "Više igrača",
        settings: "Postavke",
        gameSettings: "Postavke igre",
        language: "Jezik",
        sound: "Zvuk",
        fastAI: "Brzi potezi A.I.-a",
        autoDice: "Automatsko bacanje kocke",

        // Difficulty levels
        easy: "Lako",
        normal: "Normalno",
        hard: "Teško",

        // Shirt colors
        blue: "Plava",
        green: "Zelena",
        orange: "Narančasta",
        yellow: "Žuta",
        red: "Crvena",
        pink: "Roza",
        purple: "Ljubičasta",
        barca: "Barcelona",
        argentina: "Argentina",
        slovenija: "Slovenija",

        // Players
        player1: "Igrač 1",
        player2: "Igrač 2",

        // Orientation
        orientation: "Orijentacija",
        portrait: "Okomito",
        landscape: "Vodoravno",
        difficulty: "težina",

        // Hints
        hints: "Pomoć",
        hintsOn: "Pomoć uključena",
        hintsOff: "Pomoć isključena",
        selectHints: "Odaberite način igre",
        playWithHints: "Igraj s pomoći",
        playWithoutHints: "Igraj bez pomoći",
        hintsOnDescription: "Pomični igrači i valjani potezi su istaknuti",
        hintsOffDescription: "Bez isticanja - veći izazov!",

        // Modals
        selectShirtColor: "Odaberi boju dresa",
        enterPlayerName: "Unesi ime igrača",
        save: "Spremi",
        close: "Zatvori",
        cancel: "Odustani",
        join: "Pridruži se",
        refresh: "Osvježi",
        player: "Igrač",
        noHostsFound: "Nema pronađenih domaćina. Zamoli nekoga da stvori igru!",
        failedToHost: "Stvaranje igre nije uspjelo",
        failedToJoin: "Pridruživanje igri nije uspjelo",
        opponentLeft: "Protivnik je napustio igru",
        opponentDisconnected: "Protivnik je prekinuo vezu",
        opponentReconnected: "Protivnik se ponovno povezao",
        waitingForOpponent: "Čekanje da se protivnik ponovno poveže",
        backToLobby: "Povratak u predvorje",
        connectionLost: "Veza je izgubljena",

        // Lobby
        multiplayerLobby: "Predvorje za više igrača",
        availablePlayers: "Dostupni igrači",
        activeGames: "Aktivne igre",
        noPlayersInLobby: "Nema igrača u predvorju.",
        noActiveGames: "Nema aktivnih igara.",
        available: "Dostupan",
        spectating: "Gledanje",
        spectateGame: "Gledati igru?",
        watch: "Gledaj",
        challenge: "Izazov",
        challengePlayer: "Izazovi igrača",
        challenging: "Izazivanje...",
        accept: "Prihvati",
        decline: "Odbij",
        waitingForResponse: "Čekanje na odgovor...",
        challengedYou: "izazvao te je na igru!",
        challengeDeclined: "Izazov je odbijen",
        challengeCancelled: "Izazov je otkazan",
        justNow: "upravo sada",
        minutesAgo: "prije nekoliko minuta",
        hoursAgo: "prije nekoliko sati",

        // Connection
        connecting: "Povezivanje...",
        tryingToConnect: "Pokušavam se povezati na poslužitelj...",
        connectionFailed: "Povezivanje neuspješno",
        connectionFailedMessage: "Nije se moguće povezati na poslužitelj. Pokušajte ponovno kasnije.",
        connectionLostMessage: "Veza s poslužiteljem je izgubljena. Vraćeni ste na glavni izbornik.",
        ok: "U redu",

        // Game
        backToMenu: "Povratak na izbornik",
        goal: "GOL!",
        continue: "Nastavi",
        viewBoard: "Prikaži ploču",
        statistics: "Statistika",
        winner: "Pobjednik",
        wins: "pobjeđuje",
        moves: "Potezi",
        thinkingTime: "Vrijeme razmišljanja",
        totalMoves: "Ukupno poteza",
        gameTime: "Vrijeme igre",
        totalTime: "Ukupno vrijeme",
        eloRating: "ELO ocjena",
        rollDiceFirst: "Prvo treba baciti kocku",
        cannotMovePlayer: "Ovaj igrač se ne može pomaknuti",
        noMovesAvailable: "nema dostupnih poteza",
        scores: "zabija gol",

        // Status messages
        on: "Uključeno",
        off: "Isključeno"
    },
    hu: {
        // Menu items
        newGame: "Új játék",
        twoPlayerGame: "Kétszemélyes játék",
        aiDifficulty: "M.I. nehézség",
        multiplayer: "Többjátékos",
        settings: "Beállítások",
        gameSettings: "Játékbeállítások",
        language: "Nyelv",
        sound: "Hang",
        fastAI: "Gyors M.I. lépések",
        autoDice: "Automatikus kockadobás",

        // Difficulty levels
        easy: "Könnyű",
        normal: "Normál",
        hard: "Nehéz",

        // Shirt colors
        blue: "Kék",
        green: "Zöld",
        orange: "Narancs",
        yellow: "Sárga",
        red: "Piros",
        pink: "Rózsaszín",
        purple: "Lila",
        barca: "Barcelona",
        argentina: "Argentína",
        slovenija: "Szlovénia",

        // Players
        player1: "1. játékos",
        player2: "2. játékos",

        // Orientation
        orientation: "Tájolás",
        portrait: "Álló",
        landscape: "Fekvő",
        difficulty: "nehézség",

        // Hints
        hints: "Segítség",
        hintsOn: "Segítség bekapcsolva",
        hintsOff: "Segítség kikapcsolva",
        selectHints: "Játékmód kiválasztása",
        playWithHints: "Játék segítséggel",
        playWithoutHints: "Játék segítség nélkül",
        hintsOnDescription: "A mozgatható játékosok és az érvényes lépések ki vannak emelve",
        hintsOffDescription: "Nincs kiemelés - nagyobb kihívás!",

        // Modals
        selectShirtColor: "Mezszín kiválasztása",
        enterPlayerName: "Játékos nevének megadása",
        save: "Mentés",
        close: "Bezárás",
        cancel: "Mégse",
        join: "Csatlakozás",
        refresh: "Frissítés",
        player: "Játékos",
        noHostsFound: "Nincs elérhető szerver. Kérj meg valakit, hogy indítson egy játékot!",
        failedToHost: "Nem sikerült a játék indítása",
        failedToJoin: "Nem sikerült csatlakozni a játékhoz",
        opponentLeft: "Az ellenfél elhagyta a játékot",
        opponentDisconnected: "Az ellenfél kapcsolata megszakadt",
        opponentReconnected: "Az ellenfél újracsatlakozott",
        waitingForOpponent: "Várakozás az ellenfél újracsatlakozására",
        backToLobby: "Vissza az előszobába",
        connectionLost: "A kapcsolat megszakadt",

        // Lobby
        multiplayerLobby: "Többjátékos előszoba",
        availablePlayers: "Elérhető játékosok",
        activeGames: "Aktív játékok",
        noPlayersInLobby: "Nincsenek játékosok az előszobában.",
        noActiveGames: "Nincsenek aktív játékok.",
        available: "Elérhető",
        spectating: "Megtekintés",
        spectateGame: "Játék megtekintése?",
        watch: "Nézd",
        challenge: "Kihívás",
        challengePlayer: "Játékos kihívása",
        challenging: "Kihívás...",
        accept: "Elfogadás",
        decline: "Elutasítás",
        waitingForResponse: "Válaszra várva...",
        challengedYou: "kihívott egy játékra!",
        challengeDeclined: "A kihívás elutasítva",
        challengeCancelled: "A kihívás törölve",
        justNow: "most",
        minutesAgo: "perce",
        hoursAgo: "órája",

        // Connection
        connecting: "Kapcsolódás...",
        tryingToConnect: "Kísérlet a szerverhez való csatlakozásra...",
        connectionFailed: "Sikertelen csatlakozás",
        connectionFailedMessage: "Nem sikerült csatlakozni a szerverhez. Kérjük, próbálja újra később.",
        connectionLostMessage: "A szerverrel való kapcsolat megszakadt. Visszakerült a főmenübe.",
        ok: "OK",

        // Game
        backToMenu: "Vissza a menübe",
        goal: "GÓL!",
        continue: "Folytatás",
        viewBoard: "Pálya megtekintése",
        statistics: "Statisztika",
        winner: "Győztes",
        wins: "nyert",
        moves: "Lépések",
        thinkingTime: "Gondolkodási idő",
        totalMoves: "Összes lépés",
        gameTime: "Játékidő",
        totalTime: "Teljes idő",
        eloRating: "ELO értékelés",
        rollDiceFirst: "Először dobni kell a kockával",
        cannotMovePlayer: "Ezzel a játékossal nem lehet lépni",
        noMovesAvailable: "nem tud lépni",
        scores: "gólt lő",

        // Status messages
        on: "Be",
        off: "Ki"
    }
};

class TranslationManager {
    constructor() {
        this.translations = translations;
        this.currentLanguage = this.detectLanguage();
    }

    detectLanguage() {
        // Server-side: default to English
        if (typeof window === 'undefined') {
            return 'en';
        }
        
        // Browser-side: try to get saved language from localStorage
        const savedLang = localStorage.getItem('dicesoccer_language');
        if (savedLang && this.translations[savedLang]) {
            return savedLang;
        }

        // Detect from browser
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('sl')) {
            return 'sl';
        }
        if (browserLang.startsWith('de')) {
            return 'de';
        }
        if (browserLang.startsWith('it')) {
            return 'it';
        }
        if (browserLang.startsWith('es')) {
            return 'es';
        }
        if (browserLang.startsWith('fr')) {
            return 'fr';
        }
        if (browserLang.startsWith('hr')) {
            return 'hr';
        }
        if (browserLang.startsWith('hu')) {
            return 'hu';
        }
        return 'en'; // Default to English
    }

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            
            // Only use localStorage in browser environment
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('dicesoccer_language', lang);
            }
            
            this.updateUI();
            
            // Notify server of language change (browser only)
            if (typeof window !== 'undefined' && window.authClient && window.authClient.socket) {
                window.authClient.socket.emit('setLanguage', { language: lang });
                console.log('🌐 Language changed, notified server:', lang);
            }
        }
    }

    get(key) {
        // Try to get translation in current language
        const translation = this.translations[this.currentLanguage][key];
        if (translation) {
            return translation;
        }
        
        // Fall back to English if translation is missing
        if (this.currentLanguage !== 'en' && this.translations['en'][key]) {
            return this.translations['en'][key];
        }
        
        // If even English doesn't have it, return the key itself
        return key;
    }

    updateUI() {
        // Skip DOM operations if running in Node.js (server-side)
        if (typeof document === 'undefined') {
            return;
        }
        
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

// Export for Node.js (server-side) and keep global for browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translations, TranslationManager, translationManager };
}
