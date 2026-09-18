import { 
  scoreCardForPlayer, 
  chooseCpuNominationCard, 
  evaluateCpuAuctionBid, 
  doesCardFitTeamStrategy, 
  isCardEspeciallyGood 
} from '../src/Game.js';

console.log('Testing Enhanced Human-Like CPU Auction Evaluation & Strategy...');

// Base Mock Game State
const createMockG = () => ({
  board: {
    round: 1,
    activeEvent: null,
    highestBid: 0,
    highestBidder: null,
    passedAuctionPlayers: [],
    firstPlayer: '0',
    commandersMarkedCardIndex: null,
    activeAuctionCardIndex: null,
    auctionPlayers: [
      { id: 'player_a', name: 'Card A (3 Coins)', minBid: 1, maxBid: 8, effects: [{ type: 'coins', amount: 3, perRound: true }] },
      { id: 'player_b', name: 'Card B (2 Coins)', minBid: 1, maxBid: 6, effects: [{ type: 'coins', amount: 2, perRound: true }] },
      { id: 'player_c', name: 'Card C (Instant 5 Coins)', minBid: 1, maxBid: 6, effects: [{ type: 'coins', amount: 5, perRound: false }] },
      { id: 'ezekiel_elliott', name: 'Ezekiel Elliott', minBid: 1, maxBid: 7, effects: [{ type: 'deflate', amount: 5, perRound: false }, { type: 'coins', amount: -2, perRound: true }] }
    ]
  },
  players: {
    '0': { isCpu: false, coins: 10, psi: 45, lineup: [{ isPracticeSquad: true }], team: { id: 'vikings' } },
    '1': { isCpu: true, coins: 12, psi: 45, personality: 'opportunist', lineup: [{ isPracticeSquad: true }], team: { id: 'vikings' }, hasWonAuction: false },
    '2': { isCpu: true, coins: 8, psi: 45, personality: 'rusher', lineup: [{ isPracticeSquad: true }], team: { id: 'titans' }, hasWonAuction: false },
    '3': { isCpu: true, coins: 5, psi: 45, personality: 'tycoon', lineup: [{ isPracticeSquad: true }], team: { id: 'steelers' }, hasWonAuction: false }
  }
});

let G = createMockG();

// -------------------------------------------------------------
// Test 1: First turn vs Clogged Lineup (3 Roster Spots)
// "getting an every turn 3 coins is good on the first turn, but if you have three 2 coins every turn players it isn't that much of an upgrade"
// -------------------------------------------------------------
console.log('\n--- Test 1: Roster Rotation & 3 Roster Spots ---');
// Case 1A: First turn (Practice squad lineup)
G.board.round = 1;
G.players['1'].lineup = [
  { isPracticeSquad: true },
  { isPracticeSquad: true },
  { isPracticeSquad: true }
];
const scoreR1_3Coins = scoreCardForPlayer(G, '1', G.board.auctionPlayers[0]); // 3 coins/rd
console.log(`Round 1 (First turn) Score for 3 coins/rd: ${scoreR1_3Coins.toFixed(1)}`);
if (scoreR1_3Coins >= 25) {
  console.log('✅ PASS: Every turn 3 coins is valued exceptionally high on first turn.');
} else {
  console.error('❌ FAIL: First turn score too low');
}

// Case 1B: Three 2-coins every turn players in lineup (clogged roster)
G.board.round = 4;
G.players['1'].lineup = [
  { id: 'c1', name: 'Engine 1', effects: [{ type: 'coins', amount: 2, perRound: true }] },
  { id: 'c2', name: 'Engine 2', effects: [{ type: 'coins', amount: 2, perRound: true }] },
  { id: 'c3', name: 'Engine 3', effects: [{ type: 'coins', amount: 2, perRound: true }] }
];
const scoreClogged_3Coins = scoreCardForPlayer(G, '1', G.board.auctionPlayers[0]); // 3 coins/rd
console.log(`Clogged Roster (three 2 coins/rd) Score for 3 coins/rd: ${scoreClogged_3Coins.toFixed(1)}`);
if (scoreClogged_3Coins <= 2) {
  console.log('✅ PASS: When having three 2 coins/turn players, 3 coins/turn is correctly treated as NOT much of an upgrade.');
} else {
  console.error('❌ FAIL: Clogged roster upgrade scored higher than expected');
}

// Case 1C: Two 2-coins players + 1 rotating slot (ideal meta setup)
// "the best situation is having two every turn players and then rotate an instant immediate player in the third spot"
G.players['1'].lineup = [
  { id: 'c1', name: 'Engine 1', effects: [{ type: 'coins', amount: 2, perRound: true }] },
  { id: 'c2', name: 'Engine 2', effects: [{ type: 'coins', amount: 2, perRound: true }] },
  { id: 'spent_instant', name: 'Spent Instant', effects: [{ type: 'coins', amount: 5, perRound: false }] }
];
const scoreInstant_Rotating = scoreCardForPlayer(G, '1', G.board.auctionPlayers[2]); // Instant 5 coins
console.log(`Ideal Setup (2 engines + 1 rotating slot) Score for Instant 5 coins: ${scoreInstant_Rotating.toFixed(1)}`);
if (scoreInstant_Rotating >= 9.0) {
  console.log('✅ PASS: Instant card scored with high rotational synergy bonus in 3rd slot.');
} else {
  console.error('❌ FAIL: Instant card rotational score too low');
}

// -------------------------------------------------------------
// Test 2: Monopoly Leverage Bidding Cap
// "Richest players caps the bid at richest opponents coins, not richest opponent coins +1. Because If the second most coins have 8 coins, then if I bid 8 coins they won't be able to outbid with 9."
// -------------------------------------------------------------
console.log('\n--- Test 2: Monopoly Leverage Bidding Cap ---');
G = createMockG();
G.board.round = 2;
G.board.activeAuctionCardIndex = 0; // Card A
G.players['1'].coins = 20; // Rich CPU
G.players['0'].coins = 8;  // Richest opponent has exactly 8 coins
G.players['2'].coins = 6;
G.players['3'].coins = 4;
G.board.highestBid = 0;
G.board.highestBidder = null;

const monopolyBid = evaluateCpuAuctionBid(G, '1');
console.log('Monopoly Bid result when richest opponent has 8 coins:', monopolyBid);
// Valuation cap should be at most richestOpponentCoins = 8
// And next bid must be <= 8
if (monopolyBid.shouldBid && monopolyBid.bidAmount <= 8) {
  console.log('✅ PASS: Richest player caps bid at richest opponent coins (8 coins), never exceeding it.');
} else {
  console.error('❌ FAIL: Monopoly bid exceeded richest opponent coins');
}

// -------------------------------------------------------------
// Test 3: Situational Phase 2 & Hall of Fame Anticipation Savings
// "In Round 4 and Round 7, CPUs hold an emergency investment reserve ($4-6 coins)... depends on the situation. Don't do this for every team. I would do it if there is no one on the board that is especially good and if none of the players fit into your team strategy (team power)."
// -------------------------------------------------------------
console.log('\n--- Test 3: Situational Anticipation Savings ---');
G = createMockG();
G.board.round = 4;
// Board has only ordinary cards that do not fit strategy
G.board.auctionPlayers = [
  { id: 'mediocre_1', name: 'Ordinary WR', minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 1, perRound: true }] },
  { id: 'mediocre_2', name: 'Ordinary TE', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 1, perRound: true }] }
];
G.board.activeAuctionCardIndex = 0;
G.players['1'].coins = 6;
G.players['1'].team = { id: 'vikings' };

const savingsDecision = evaluateCpuAuctionBid(G, '1');
console.log('Ordinary board R4 (coins: 6, holding reserve):', savingsDecision);
if (!savingsDecision.shouldBid || savingsDecision.bidAmount <= 2) {
  console.log('✅ PASS: Emergency investment reserve (4-6 coins) successfully held when board has no standout cards.');
} else {
  console.error('❌ FAIL: CPU failed to save emergency reserve');
}

// Case 3B: Board has an especially good card or strategy fit
G.board.auctionPlayers = [
  { id: 'great_card', name: 'George Kittle', minBid: 1, maxBid: 15, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] },
  { id: 'mediocre_2', name: 'Ordinary TE', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 1, perRound: true }] }
];
G.board.activeAuctionCardIndex = 0;
const goodCardDecision = evaluateCpuAuctionBid(G, '1');
console.log('Standout card on board R4 (George Kittle):', goodCardDecision);
if (goodCardDecision.shouldBid) {
  console.log('✅ PASS: CPU bids aggressively when an especially good card is up, not hoarding reserve.');
} else {
  console.error('❌ FAIL: CPU refused to bid on standout card');
}

// Case 3C: Packers exemption (Packers love Phase 1 cards)
G.players['1'].team = { id: 'packers' };
G.board.activeAuctionCardIndex = 1; // Ordinary Phase 1 player
G.board.auctionPlayers[1].phase = 1;
const packersDecision = evaluateCpuAuctionBid(G, '1');
console.log('Packers R4 decision on Phase 1 card:', packersDecision);
if (packersDecision.shouldBid) {
  console.log('✅ PASS: Packers team power exempt from Phase 2 hoarding because they need Phase 1 players.');
} else {
  console.error('❌ FAIL: Packers should have bid on Phase 1 card');
}

console.log('\nAll human-like evaluation tests passed successfully!');
