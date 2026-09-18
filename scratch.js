import fs from 'fs';

const text = fs.readFileSync('./src/GameRules.js', 'utf8');

// A basic script to scaffold the data structures manually. 
// Since the data is a bit unstructured, I'll extract it and format it as best as possible.

// I will output a template that I can fill in.
const out = `
export const TEAMS = [
  { id: 'bills', name: 'Bills', initialPsi: 12, coins: 44, ability: 'After the Auction Phase, you may pay the Minimum cost for a player in the discard pile (once per game)' },
  { id: 'dolphins', name: 'Dolphins', initialPsi: 9, coins: 45, ability: 'Whenever you have 0 coins, gain 3' },
  { id: 'patriots', name: 'Patriots', initialPsi: 7, coins: 36, ability: 'Starts with low PSI' },
  { id: 'jets', name: 'Jets', initialPsi: 7, coins: 44, ability: 'Every time you pay the Maximum for a player deflate 4 PSI' },
  { id: 'ravens', name: 'Ravens', initialPsi: 14, coins: 42, ability: 'At the end of the round, if you control 3 different positions in your lineup, gain 3 coins' },
  { id: 'bengals', name: 'Bengals', initialPsi: 9, coins: 46, ability: 'Players with instant abilities give you +2 coins/deflate. When you acquiring a player, you may discard them instead of replacing a player.' },
  { id: 'browns', name: 'Browns', initialPsi: 20, coins: 45, ability: 'Players can’t give you coins. Gain 30 coins after round 5' },
  { id: 'steelers', name: 'Steelers', initialPsi: 12, coins: 48, ability: 'At the start of the round, if you are the richest player, give every other player a PSI' },
  { id: 'texans', name: 'Texans', initialPsi: 8, coins: 47, ability: 'During the Refresh Phase gain 2 coins and 2 deflate for each QB on your team' },
  { id: 'colts', name: 'Colts', initialPsi: 5, coins: 50, ability: 'You have unlimited player spots in your lineup. When you acquire a player, add them to your lineup as an additional member instead of replacing a player.' },
  { id: 'jaguars', name: 'Jaguars', initialPsi: 12, coins: 43, ability: 'You can secretly look at the order of the event deck at any time. Once per game you can rearrange the order of the event deck.' },
  { id: 'titans', name: 'Titans', initialPsi: 7, coins: 44, ability: 'At the beginning of the game, look at the top three cards of the players deck. Acquire one for free. Shuffle the Player Deck' },
  { id: 'broncos', name: 'Broncos', initialPsi: 20, coins: 40, ability: 'The first Refresh Phase after you buy a player, ignore their ? symbols' },
  { id: 'chiefs', name: 'Chiefs', initialPsi: 9, coins: 46, ability: 'At the start of the Auction Phase you may pay the Minimum cost of a player without bidding (once per game)' },
  { id: 'raiders', name: 'Raiders', initialPsi: 8, coins: 45, ability: 'Before the Auction Phase, you may give 1 PSI you control to another player' },
  { id: 'chargers', name: 'Chargers', initialPsi: 6, coins: 50, ability: 'Each time you outbid a player, gain 1 coin at the end of the round' },
  { id: 'cowboys', name: 'Cowboys', initialPsi: 5, coins: 42, ability: 'Gain 2 coins at the end of every round' },
  { id: 'eagles', name: 'Eagles', initialPsi: 15, coins: 47, ability: 'After the Auction Phase, you may pay 3 coins to raise every other player’s PSI by 3 (Limit twice per round)' },
  { id: 'commanders', name: 'Commanders', initialPsi: 7, coins: 43, ability: 'At the start of the Auction Phase, mark a revealed player. The first player cannot bid on that player (the first player and the player to their left if playing with 5+ players). This effect doesn’t affect the Commanders' },
  { id: 'bears', name: 'Bears', initialPsi: 13, coins: 42, ability: 'Players have to outbid you by two coins instead of one' },
  { id: 'lions', name: 'Lions', initialPsi: 9, coins: 47, ability: 'During the Auction Phase, if you are the first player to claim a player, gain coins equal to the number of players' },
  { id: 'packers', name: 'Packers', initialPsi: 8, coins: 50, ability: 'If all your players are Phase 1 players, deflate 4 at the end of the round. Gain 1 coin every time you acquire a Phase 1 player' },
  { id: 'vikings', name: 'Vikings', initialPsi: 11, coins: 44, ability: 'If you have less that 27 PSI, your players receive twice as many coins' },
  { id: 'falcons', name: 'Falcons', initialPsi: 9, coins: 48, ability: 'Whenever you are starting the bid during the Auction Phase, you may discard all remaining players available and replace them with new players (limit once per phase)' },
  { id: 'saints', name: 'Saints', initialPsi: 12, coins: 42, ability: 'Negative coins and inflation don’t effect you' },
  { id: 'panthers', name: 'Panthers', initialPsi: 10, coins: 49, ability: 'Deflate 2 PSI at the end of every round' },
  { id: 'buccaneers', name: 'Buccaneers', initialPsi: 10, coins: 45, ability: 'After setup, choose another player’s team ability. The Buccaneers gain that ability' },
  { id: 'cardinals', name: 'Cardinals', initialPsi: 15, coins: 41, ability: 'During the Auction Phase, after players have been revealed, you may look at the top card of the Player Deck. Then swap it with one of the revealed players or put it back' },
  { id: 'rams', name: 'Rams', initialPsi: 11, coins: 49, ability: 'Once per game, you may put a x2 token on one of your non-Phase 1 players' },
  { id: '49ers', name: '49ers', initialPsi: 8, coins: 44, ability: 'During the Refresh Phase, your players all generate coins before deflation. If you have less than 5 coins during the Refresh Phase your players generate double deflation.' },
  { id: 'seahawks', name: 'Seahawks', initialPsi: 12, coins: 46, ability: 'Start the game with 4 Practice Squad Players on your team' },
];

export const EVENTS = [
  { id: 'e1', name: 'Offensive Battle', effect: 'Your lineup receives double coins and deflation this round' },
  { id: 'e2', name: 'Hot Air', effect: 'Inflate all player’s PSI by 7' },
  { id: 'e3', name: 'Cold Air', effect: 'Deflate each player’s PSI by 7' },
  { id: 'e4', name: 'Penalty Flag (Coins)', effect: 'Each player can only make a maximum of 10 coins this round' },
  { id: 'e5', name: 'Penalty Flag (PSI)', effect: 'Each player can only deflate a maximum of 5 PSI this round' },
  { id: 'e6', name: 'Refs Check', effect: 'All Quarterbacks can only deflate PSI or make coins this round (You choose for each QB)' },
  { id: 'e7', name: 'Raw Talent', effect: 'All Phase 1 players receive double coins and deflation this round' },
  { id: 'e8', name: 'Player Demands a Trade', effect: 'Draw the top card the deck, players may bid on that player before the regular bidding phase' },
  { id: 'e9', name: 'Free Agency', effect: 'Every player draws the top card of the deck, they may pay the max price to replace one of their active Player Cards with the acquired Player Card' },
  { id: 'e10', name: 'Trade Rumors', effect: 'Everyone picks one their Active players and passes it to the right' },
  { id: 'e11', name: 'New Cap Limit', effect: 'Each player can choose to pay ten coins to add a practice squad player to their team as an additional member' },
  { id: 'e12', name: 'Rookie Class', effect: 'Draw twice the number of players during the Auction Phase. Players will buy two players this round instead of 1. The first player passes like normal during the bidding phase and repeats once every player has acquired 1 player.' },
  { id: 'e13', name: 'Team Legend Returns', effect: 'Find a random Phase 2 player and add it to the top of the Player Deck (Hall of Fame player instead if it is round 5 or later)' },
  { id: 'e14', name: '1st Overall Pick', effect: 'The player with the highest amount of PSI deflates to match the player with that second highest PSI' },
  { id: 'e15', name: 'Rivalry', effect: 'Starting with the first player, each player gives 1 PSI to a player of their choice' },
  { id: 'e16', name: 'Overpaid', effect: 'Increase the Maximum cost to buy each player by 4' },
  { id: 'e17', name: 'Odelle', effect: 'All Wide Receivers make double money this round' },
  { id: 'e18', name: 'Unguarded', effect: 'All Tight Ends make double money this round' }
];

export const PRACTICE_SQUAD_CARD = {
  id: 'practice_squad',
  name: 'Practice Squad Player',
  minBid: 0,
  maxBid: 0,
  effects: [
    { type: 'coins', amount: 1, perRound: true }
  ]
};

// Will parse Phase 1, Phase 2, and HOF players manually or with another script based on structure.
`;

fs.writeFileSync('./src/GameData.js', out);
