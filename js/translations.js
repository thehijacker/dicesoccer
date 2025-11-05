// Translation system for Dice Soccer game
const translations = {
    en: {
        // Menu items
        newGame: "New Game",
        twoPlayerGame: "2 Player Game",
        aiDifficulty: "A.I. Difficulty",
        multiplayer: "Multiplayer",
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
        opponentReconnected: "Opponent reconnected",
        waitingForOpponent: "Waiting for opponent to reconnect",
        backToLobby: "Back to Lobby",
        connectionLost: "Connection lost",
        
        // Lobby
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
        
        // Game
        gameStarting: "Game Starting...",
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
        multiplayerLobby: "Igralci v loži",
        availablePlayers: "Razpoložljivi igralci",
        activeGames: "Aktivne igre",
        noPlayersInLobby: "Nobenih igralcev ni v loži.",
        noActiveGames: "Ni aktivnih iger.",
        available: "Na voljo",
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
        opponentReconnected: "Nasprotnik se je ponovno povezal",
        waitingForOpponent: "Čakanje na ponovno povezavo nasprotnika",
        backToLobby: "Nazaj v ložo",
        connectionLost: "Povezava izgubljena",
        
        // Game
        gameStarting: "Igra se začenja...",
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
        hostGame: "Spiel hosten",
        joinGame: "Spiel beitreten",
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
        multiplayerLobby: "Mehrspieler-Lobby",
        availablePlayers: "Verfügbare Spieler",
        activeGames: "Aktive Spiele",
        noPlayersInLobby: "Keine Spieler in der Lobby.",
        noActiveGames: "Keine aktiven Spiele.",
        available: "Verfügbar",
        challenge: "Herausfordern",
        challengePlayer: "Spieler herausfordern",
        challenging: "Herausfordern...",
        accept: "Annehmen",
        decline: "Ablehnen",
        waitingForResponse: "Warte auf Antwort...",
        justNow: "gerade eben",
        minutesAgo: "vor Minuten",
        hoursAgo: "vor Stunden",
        selectShirtColor: "Trikotfarbe auswählen",
        close: "Schließen",
        availableGames: "Verfügbare Spiele",
        searching: "Suche nach Spielen...",
        noGamesFound: "Keine Spiele gefunden. Versuche, eines zu hosten!",
        waitingForPlayer: "Warte auf Beitritt eines Spielers...",
        gameCode: "Spiel-Code:",
        cancel: "Abbrechen",
        join: "Beitreten",
        refresh: "Aktualisieren",
        player: "Spieler",
        availableHosts: "Verfügbare Hosts",
        noHostsFound: "Keine Hosts gefunden. Bitte jemanden, ein Spiel zu hosten!",
        failedToHost: "Hosten des Spiels fehlgeschlagen",
        failedToJoin: "Beitritt zum Spiel fehlgeschlagen",
        opponentLeft: "Gegner hat das Spiel verlassen",
        opponentDisconnected: "Gegner hat die Verbindung getrennt",
        connectionLost: "Verbindung verloren",

        // Game
        gameStarting: "Spiel startet...",
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
        hostGame: "Ospita Partita",
        joinGame: "Unisciti a Partita",
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
        multiplayerLobby: "Lobby Multigiocatore",
        availablePlayers: "Giocatori Disponibili",
        activeGames: "Partite Attive",
        noPlayersInLobby: "Nessun giocatore nella lobby.",
        noActiveGames: "Nessuna partita attiva.",
        available: "Disponibile",
        challenge: "Sfida",
        challengePlayer: "Sfida Giocatore",
        challenging: "Sfidando...",
        accept: "Accetta",
        decline: "Rifiuta",
        waitingForResponse: "In attesa di risposta...",
        justNow: "proprio ora",
        minutesAgo: "minuti fa",
        hoursAgo: "ore fa",
        selectShirtColor: "Seleziona Colore Maglia",
        close: "Chiudi",
        availableGames: "Partite Disponibili",
        searching: "Ricerca di partite...",
        noGamesFound: "Nessuna partita trovata. Prova a ospitarne una!",
        waitingForPlayer: "In attesa che un giocatore si unisca...",
        gameCode: "Codice Partita:",
        cancel: "Annulla",
        join: "Unisciti",
        refresh: "Aggiorna",
        player: "Giocatore",
        availableHosts: "Host Disponibili",
        noHostsFound: "Nessun host trovato. Chiedi a qualcuno di ospitare una partita!",
        failedToHost: "Impossibile ospitare la partita",
        failedToJoin: "Impossibile unirsi alla partita",
        opponentLeft: "L'avversario ha lasciato la partita",
        opponentDisconnected: "Avversario disconnesso",
        connectionLost: "Connessione persa",

        // Game
        gameStarting: "Inizio partita...",
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
        hostGame: "Crear Partida",
        joinGame: "Unirse a Partida",
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
        multiplayerLobby: "Sala Multijugador",
        availablePlayers: "Jugadores Disponibles",
        activeGames: "Partidas Activas",
        noPlayersInLobby: "No hay jugadores en la sala.",
        noActiveGames: "No hay partidas activas.",
        available: "Disponible",
        challenge: "Desafiar",
        challengePlayer: "Desafiar Jugador",
        challenging: "Desafiando...",
        accept: "Aceptar",
        decline: "Rechazar",
        waitingForResponse: "Esperando respuesta...",
        justNow: "justo ahora",
        minutesAgo: "hace minutos",
        hoursAgo: "hace horas",
        selectShirtColor: "Seleccionar Color de Camiseta",
        close: "Cerrar",
        availableGames: "Partidas Disponibles",
        searching: "Buscando partidas...",
        noGamesFound: "No se encontraron partidas. ¡Intenta crear una!",
        waitingForPlayer: "Esperando a que se una un jugador...",
        gameCode: "Código de la Partida:",
        cancel: "Cancelar",
        join: "Unirse",
        refresh: "Actualizar",
        player: "Jugador",
        availableHosts: "Anfitriones Disponibles",
        noHostsFound: "No se encontraron anfitriones. ¡Pídele a alguien que cree una partida!",
        failedToHost: "Error al crear la partida",
        failedToJoin: "Error al unirse a la partida",
        opponentLeft: "El oponente abandonó la partida",
        opponentDisconnected: "Oponente desconectado",
        connectionLost: "Conexión perdida",

        // Game
        gameStarting: "Iniciando partida...",
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
        hostGame: "Héberger une Partie",
        joinGame: "Rejoindre une Partie",
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
        multiplayerLobby: "Salon Multijoueur",
        availablePlayers: "Joueurs Disponibles",
        activeGames: "Parties Actives",
        noPlayersInLobby: "Aucun joueur dans le salon.",
        noActiveGames: "Aucune partie active.",
        available: "Disponible",
        challenge: "Défier",
        challengePlayer: "Défier le Joueur",
        challenging: "En train de défier...",
        accept: "Accepter",
        decline: "Refuser",
        waitingForResponse: "En attente de réponse...",
        justNow: "à l'instant",
        minutesAgo: "il y a quelques minutes",
        hoursAgo: "il y a quelques heures",
        selectShirtColor: "Choisir la Couleur du Maillot",
        close: "Fermer",
        availableGames: "Parties Disponibles",
        searching: "Recherche de parties...",
        noGamesFound: "Aucune partie trouvée. Essayez d'en héberger une !",
        waitingForPlayer: "En attente d'un joueur...",
        gameCode: "Code de la Partie :",
        cancel: "Annuler",
        join: "Rejoindre",
        refresh: "Actualiser",
        player: "Joueur",
        availableHosts: "Hôtes Disponibles",
        noHostsFound: "Aucun hôte trouvé. Demandez à quelqu'un d'héberger une partie !",
        failedToHost: "Échec de l'hébergement de la partie",
        failedToJoin: "Échec pour rejoindre la partie",
        opponentLeft: "L'adversaire a quitté la partie",
        opponentDisconnected: "Adversaire déconnecté",
        connectionLost: "Connexion perdue",

        // Game
        gameStarting: "Début de la partie...",
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
        hostGame: "Stvori igru",
        joinGame: "Pridruži se igri",
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
        multiplayerLobby: "Predvorje za više igrača",
        availablePlayers: "Dostupni igrači",
        activeGames: "Aktivne igre",
        noPlayersInLobby: "Nema igrača u predvorju.",
        noActiveGames: "Nema aktivnih igara.",
        available: "Dostupan",
        challenge: "Izazov",
        challengePlayer: "Izazovi igrača",
        challenging: "Izazivanje...",
        accept: "Prihvati",
        decline: "Odbij",
        waitingForResponse: "Čekanje na odgovor...",
        justNow: "upravo sada",
        minutesAgo: "prije nekoliko minuta",
        hoursAgo: "prije nekoliko sati",
        selectShirtColor: "Odaberi boju dresa",
        close: "Zatvori",
        availableGames: "Dostupne igre",
        searching: "Traženje igara...",
        noGamesFound: "Nema pronađenih igara. Pokušaj stvoriti jednu!",
        waitingForPlayer: "Čekanje na igrača...",
        gameCode: "Kod igre:",
        cancel: "Odustani",
        join: "Pridruži se",
        refresh: "Osvježi",
        player: "Igrač",
        availableHosts: "Dostupni domaćini",
        noHostsFound: "Nema pronađenih domaćina. Zamoli nekoga da stvori igru!",
        failedToHost: "Stvaranje igre nije uspjelo",
        failedToJoin: "Pridruživanje igri nije uspjelo",
        opponentLeft: "Protivnik je napustio igru",
        opponentDisconnected: "Protivnik je prekinuo vezu",
        connectionLost: "Veza je izgubljena",
        
        // Game
        gameStarting: "Igra počinje...",
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
        hostGame: "Játék indítása",
        joinGame: "Csatlakozás játékhoz",
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
        multiplayerLobby: "Többjátékos előszoba",
        availablePlayers: "Elérhető játékosok",
        activeGames: "Aktív játékok",
        noPlayersInLobby: "Nincsenek játékosok az előszobában.",
        noActiveGames: "Nincsenek aktív játékok.",
        available: "Elérhető",
        challenge: "Kihívás",
        challengePlayer: "Játékos kihívása",
        challenging: "Kihívás...",
        accept: "Elfogadás",
        decline: "Elutasítás",
        waitingForResponse: "Válaszra várva...",
        justNow: "most",
        minutesAgo: "perce",
        hoursAgo: "órája",
        selectShirtColor: "Mezszín kiválasztása",
        close: "Bezárás",
        availableGames: "Elérhető játékok",
        searching: "Játékok keresése...",
        noGamesFound: "Nincsenek elérhető játékok. Próbálj indítani egyet!",
        waitingForPlayer: "Várakozás a másik játékosra...",
        gameCode: "Játék kódja:",
        cancel: "Mégse",
        join: "Csatlakozás",
        refresh: "Frissítés",
        player: "Játékos",
        availableHosts: "Elérhető szerverek",
        noHostsFound: "Nincs elérhető szerver. Kérj meg valakit, hogy indítson egy játékot!",
        failedToHost: "Nem sikerült a játék indítása",
        failedToJoin: "Nem sikerült csatlakozni a játékhoz",
        opponentLeft: "Az ellenfél elhagyta a játékot",
        opponentDisconnected: "Az ellenfél kapcsolata megszakadt",
        connectionLost: "A kapcsolat megszakadt",
        
        // Game
        gameStarting: "Játék indul...",
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
        // Try to get saved language from localStorage
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
