export interface I18nDict {
  player1: string; bot1: string; bot2: string; bot3: string
  gameOver: string; playing: string
  selectCard: string; clickCell: string
  useMeeple: string; clickMeeple: string
  placeMeeple: string; withdrawMeeple: string
  skip: string; cancel: string; restart: string
  params: string; help: string; history: string
  hand: string; handOf: string; actions: string; opponents: string
  language: string; close: string; startGame: string
  next: string; prev: string; hint: string; skipTutorial: string
  placeable: string; conquerable: string; withdrawable: string
  botThinking: string; gameEnded: string
  resumeTitle: string; resumeTurn: string; resume: string; newGame: string; letsGo: string
  credits: string
  difficulty: string
  soundOn: string; soundOff: string; themeLight: string; themeDark: string
  playerNameLabel: string
  playerNamePlaceholder: string
  statsTitle: string; statsLabel: string; statsNoData: string
  statsGameSection: string; statsPlayerSection: string
  statsSimSubtitle: string
  statsSimAvgTurns: string; statsSimRange: string; statsSimAvgPts: string; statsSimWinChance: string
  statsGamesPlayed: string; statsAvgTurns: string; statsAvgTotalScore: string
  statsGamesWon: string; statsBestScore: string; statsAvgScore: string; statsFastestWin: string; statsWinRate: string
  diffLabels: Record<'easy' | 'medium' | 'hard', string>
  shapeNames: Record<'T' | 'Q' | 'C', string>
  colorNames: Record<'B' | 'R' | 'G', string>
  attrLabels: Record<'os' | 'oc' | 'is' | 'ic', string>
  onboarding: { icon: string; title: string; text: string }[]
}

export type Lang = 'it' | 'en' | 'fr'

export const I18N: Record<Lang, I18nDict> = {
  it: {
    player1: 'Giocatore 1', bot1: '🤖 Bot 1', bot2: '🤖 Bot 2', bot3: '🤖 Bot 3',
    gameOver: 'FINE GIOCO', playing: 'sta giocando...',
    selectCard: 'Seleziona una carta', clickCell: 'Clicca cella evidenziata',
    useMeeple: 'Scegli cosa fare con la pedina', clickMeeple: 'Clicca una pedina sulla plancia per ritirarla',
    placeMeeple: 'Piazza pedina ●', withdrawMeeple: 'Ritira pedina ↩',
    skip: 'Salta', cancel: '← Annulla', restart: 'Ricomincia',
    params: 'Impostazioni', help: '?', history: 'Storico mosse',
    hand: 'La tua mano', handOf: 'La mano di {name}', actions: 'Azioni', opponents: 'Avversari',
    language: 'Lingua', close: 'Chiudi', startGame: 'Inizia a giocare! →',
    next: 'Avanti →', prev: '← Indietro', hint: 'Seleziona carta, poi clicca cella blu.', skipTutorial: 'Salta tutorial',
    placeable: 'posizionabile', conquerable: 'conquistabile', withdrawable: 'ritirabile',
    botThinking: 'Bot sta giocando...', gameEnded: 'Partita terminata.',
    resumeTitle: 'Partita salvata', resumeTurn: 'Turno', resume: 'Riprendi →', newGame: 'Nuova partita', letsGo: 'Iniziamo! →',
    credits: 'Gioco realizzato e testato da Filippo Fresilli e Stefano Spensieri',
    difficulty: 'Difficoltà bot', playerNameLabel: 'Il tuo nome', playerNamePlaceholder: 'Giocatore 1',
    soundOn: 'Suono', soundOff: 'Muto', themeLight: 'Chiaro', themeDark: 'Scuro',
    statsTitle: 'Statistiche', statsLabel: 'Statistiche', statsNoData: 'Nessuna partita giocata ancora.',
    statsGameSection: 'Statistiche del gioco', statsPlayerSection: 'Statistiche del giocatore',
    statsSimSubtitle: '1.000 partite simulate · difficoltà media',
    statsSimAvgTurns: 'Turni medi', statsSimRange: 'Durata (min–max)', statsSimAvgPts: 'Punteggio medio', statsSimWinChance: 'Prob. vittoria',
    statsGamesPlayed: 'Partite giocate', statsAvgTurns: 'Turni medi', statsAvgTotalScore: 'Punteggio totale medio',
    statsGamesWon: 'Partite vinte', statsBestScore: 'Miglior punteggio', statsAvgScore: 'Punteggio medio',
    statsFastestWin: 'Vittoria più rapida', statsWinRate: 'Percentuale vittorie',
    diffLabels: { easy: '😌 Facile', medium: '🤔 Medio', hard: '🔥 Difficile' },
    shapeNames: { T: 'Triangolo', Q: 'Quadrato', C: 'Cerchio' },
    colorNames: { B: 'Blu', R: 'Rosso', G: 'Verde' },
    attrLabels: { os: 'forma est.', oc: 'colore est.', is: 'forma int.', ic: 'colore int.' },
    onboarding: [
      { icon: '🏆', title: 'Sei pronto a diventare FORMIDABILE?', text: 'Formidable è il gioco delle forme e dei colori. Sii il primo a raggiungere 50 punti completando file di carte con caratteristiche in comune. Strategia, conquiste e colpi di scena ti aspettano!' },
      { icon: '🎴', title: 'Le carte', text: 'Ogni carta ha 4 caratteristiche: forma esterna (triangolo, quadrato, cerchio), colore esterno (blu, rosso, verde), forma interna e colore interno. Lo sfondo è il colore esterno, la forma bianca è quella esterna, il simbolo colorato dentro è la forma interna.' },
      { icon: '🎯', title: 'Il tuo turno', text: 'Ogni turno fai 3 cose:\n1️⃣ Piazza una carta su una cella vuota adiacente.\n2️⃣ Usa una pedina: piazzala sulla carta appena messa OPPURE ritira una tua pedina già sulla plancia.\n3️⃣ Pesca una carta per tornare ad averne 3.' },
      { icon: '⭐', title: 'Come fare punti', text: 'I punti si fanno ritirando una pedina. Per ogni fila di almeno 4 carte consecutive con almeno 1 caratteristica uguale, guadagni 1 punto per carta per caratteristica condivisa.\n\nEsempio: 4 carte tutte verdi = +4 punti. Anche tutte cerchi = +8 totali!' },
      { icon: '🔥', title: 'Conquista e brucia', text: 'Puoi piazzare la tua carta sopra una carta avversaria libera, se ha almeno 2 caratteristiche in comune. Devi mettere subito una pedina.\n\nQuando ritiri quella pedina, oltre ai punti, si bruciano la carta conquistata e le carte adiacenti che hanno contribuito ai punti!' },
    ],
  },
  en: {
    player1: 'Player 1', bot1: '🤖 Bot 1', bot2: '🤖 Bot 2', bot3: '🤖 Bot 3',
    gameOver: 'GAME OVER', playing: 'is playing...',
    selectCard: 'Select a card', clickCell: 'Click highlighted cell',
    useMeeple: 'Choose what to do with your meeple', clickMeeple: 'Click a meeple on the board to withdraw it',
    placeMeeple: 'Place meeple ●', withdrawMeeple: 'Withdraw meeple ↩',
    skip: 'Skip', cancel: '← Cancel', restart: 'Restart',
    params: 'Settings', help: '?', history: 'Move history',
    hand: 'Your hand', handOf: "{name}'s hand", actions: 'Actions', opponents: 'Opponents',
    language: 'Language', close: 'Close', startGame: 'Start playing! →',
    next: 'Next →', prev: '← Back', hint: 'Select card, then click a blue cell.', skipTutorial: 'Skip tutorial',
    placeable: 'placeable', conquerable: 'conquerable', withdrawable: 'withdrawable',
    botThinking: 'Bot is playing...', gameEnded: 'Game over.',
    resumeTitle: 'Saved game found', resumeTurn: 'Turn', resume: 'Resume →', newGame: 'New game', letsGo: "Let's go! →",
    credits: 'Game designed and tested by Filippo Fresilli and Stefano Spensieri',
    difficulty: 'Bot difficulty', playerNameLabel: 'Your name', playerNamePlaceholder: 'Player 1',
    soundOn: 'Sound', soundOff: 'Muted', themeLight: 'Light', themeDark: 'Dark',
    statsTitle: 'Statistics', statsLabel: 'Statistics', statsNoData: 'No games played yet.',
    statsGameSection: 'Game statistics', statsPlayerSection: 'Player statistics',
    statsSimSubtitle: '1,000 simulated games · medium difficulty',
    statsSimAvgTurns: 'Avg turns', statsSimRange: 'Length (min–max)', statsSimAvgPts: 'Avg score', statsSimWinChance: 'Win chance',
    statsGamesPlayed: 'Games played', statsAvgTurns: 'Average turns', statsAvgTotalScore: 'Average total score',
    statsGamesWon: 'Games won', statsBestScore: 'Best score', statsAvgScore: 'Average score',
    statsFastestWin: 'Fastest win', statsWinRate: 'Win rate',
    diffLabels: { easy: '😌 Easy', medium: '🤔 Medium', hard: '🔥 Hard' },
    shapeNames: { T: 'Triangle', Q: 'Square', C: 'Circle' },
    colorNames: { B: 'Blue', R: 'Red', G: 'Green' },
    attrLabels: { os: 'outer shape', oc: 'outer color', is: 'inner shape', ic: 'inner color' },
    onboarding: [
      { icon: '🏆', title: 'Are you ready to be FORMIDABLE?', text: 'Formidable is the game of shapes and colors. Be the first to reach 50 points by completing rows of cards sharing common traits. Strategy, conquests, and surprises await!' },
      { icon: '🎴', title: 'The cards', text: 'Each card has 4 traits: outer shape (triangle, square, circle), outer color (blue, red, green), inner shape, and inner color. The hex background is the outer color, the white shape is the outer shape, the colored symbol inside is the inner shape.' },
      { icon: '🎯', title: 'Your turn', text: 'Each turn you do 3 things:\n1️⃣ Place a card on an empty adjacent cell.\n2️⃣ Use a meeple: place it on the card you just placed OR withdraw one already on the board.\n3️⃣ Draw a card to get back to 3.' },
      { icon: '⭐', title: 'How to score', text: 'Points are scored by withdrawing a meeple. For each row of at least 4 consecutive cards sharing at least 1 trait, you earn 1 point per card per shared trait.\n\nExample: 4 green cards = +4 points. Also all circles = +8 total!' },
      { icon: '🔥', title: 'Conquer and burn', text: 'You can place your card on top of an unguarded opponent card if it shares at least 2 traits. You must immediately place a meeple.\n\nWhen you withdraw that meeple, besides scoring, the conquered card and adjacent cards that contributed to scoring are burned!' },
    ],
  },
  fr: {
    player1: 'Joueur 1', bot1: '🤖 Bot 1', bot2: '🤖 Bot 2', bot3: '🤖 Bot 3',
    gameOver: 'FIN DE PARTIE', playing: 'joue...',
    selectCard: 'Sélectionne une carte', clickCell: 'Clique la case en surbrillance',
    useMeeple: 'Que faire avec ton pion ?', clickMeeple: 'Clique un pion sur le plateau pour le retirer',
    placeMeeple: 'Poser le pion ●', withdrawMeeple: 'Retirer le pion ↩',
    skip: 'Passer', cancel: '← Annuler', restart: 'Recommencer',
    params: 'Paramètres', help: '?', history: 'Historique',
    hand: 'Ta main', handOf: 'La main de {name}', actions: 'Actions', opponents: 'Adversaires',
    language: 'Langue', close: 'Fermer', startGame: 'Commencer ! →',
    next: 'Suivant →', prev: '← Retour', hint: 'Sélectionne une carte, puis clique une case bleue.', skipTutorial: 'Passer le tutoriel',
    placeable: 'plaçable', conquerable: 'conquérable', withdrawable: 'retirable',
    botThinking: 'Le bot joue...', gameEnded: 'Partie terminée.',
    resumeTitle: 'Partie sauvegardée', resumeTurn: 'Tour', resume: 'Reprendre →', newGame: 'Nouvelle partie', letsGo: 'C\'est parti ! →',
    credits: 'Jeu conçu et testé par Filippo Fresilli et Stefano Spensieri',
    difficulty: 'Difficulté bot', playerNameLabel: 'Ton nom', playerNamePlaceholder: 'Joueur 1',
    soundOn: 'Son', soundOff: 'Muet', themeLight: 'Clair', themeDark: 'Sombre',
    statsTitle: 'Statistiques', statsLabel: 'Statistiques', statsNoData: 'Aucune partie jouée encore.',
    statsGameSection: 'Statistiques du jeu', statsPlayerSection: 'Statistiques du joueur',
    statsSimSubtitle: '1 000 parties simulées · difficulté moyenne',
    statsSimAvgTurns: 'Tours moyens', statsSimRange: 'Durée (min–max)', statsSimAvgPts: 'Score moyen', statsSimWinChance: 'Prob. de victoire',
    statsGamesPlayed: 'Parties jouées', statsAvgTurns: 'Tours moyens', statsAvgTotalScore: 'Score total moyen',
    statsGamesWon: 'Parties gagnées', statsBestScore: 'Meilleur score', statsAvgScore: 'Score moyen',
    statsFastestWin: 'Victoire la plus rapide', statsWinRate: 'Taux de victoire',
    diffLabels: { easy: '😌 Facile', medium: '🤔 Moyen', hard: '🔥 Difficile' },
    shapeNames: { T: 'Triangle', Q: 'Carré', C: 'Cercle' },
    colorNames: { B: 'Bleu', R: 'Rouge', G: 'Vert' },
    attrLabels: { os: 'forme ext.', oc: 'couleur ext.', is: 'forme int.', ic: 'couleur int.' },
    onboarding: [
      { icon: '🏆', title: 'Prêt à être FORMIDABLE ?', text: 'Formidable est le jeu des formes et des couleurs. Sois le premier à atteindre 50 points en complétant des rangées de cartes ayant des caractéristiques communes. Stratégie, conquêtes et surprises t\'attendent !' },
      { icon: '🎴', title: 'Les cartes', text: 'Chaque carte a 4 caractéristiques : forme extérieure (triangle, carré, cercle), couleur extérieure (bleu, rouge, vert), forme intérieure et couleur intérieure. Le fond hexagonal est la couleur extérieure, la forme blanche est la forme extérieure, le symbole coloré à l\'intérieur est la forme intérieure.' },
      { icon: '🎯', title: 'Ton tour', text: 'À chaque tour tu fais 3 choses :\n1️⃣ Place une carte sur une case vide adjacente.\n2️⃣ Utilise un pion : pose-le sur la carte que tu viens de placer OU retire un pion déjà sur le plateau.\n3️⃣ Pioche une carte pour revenir à 3.' },
      { icon: '⭐', title: 'Comment marquer des points', text: 'Les points se marquent en retirant un pion. Pour chaque rangée d\'au moins 4 cartes consécutives partageant au moins 1 caractéristique, tu gagnes 1 point par carte par caractéristique commune.\n\nExemple : 4 cartes toutes vertes = +4 points. Aussi toutes des cercles = +8 au total !' },
      { icon: '🔥', title: 'Conquête et brûlure', text: 'Tu peux poser ta carte sur une carte adverse non gardée si elle partage au moins 2 caractéristiques. Tu dois immédiatement y placer un pion.\n\nQuand tu retires ce pion, en plus des points, la carte conquise et les cartes adjacentes ayant contribué aux points sont brûlées !' },
    ],
  },
}
