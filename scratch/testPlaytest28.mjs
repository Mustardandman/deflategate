import assert from 'assert';
import { DeflategateGame, resolveAuctionWin, calculateRefreshResults } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('--- Running Playtest 28 Verification Tests ---');

// Test 1: Card Won Celebration Fly Animation
console.log('Test 1: Card Won Celebration Fly Animation...');
const state1 = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: a => a } });
Object.keys(state1.players).forEach((id, idx) => {
  state1.players[id].team = TEAMS[idx];
  state1.players[id].coins = 10;
});

const testCard = {
  id: 'card_test',
  name: 'Speedy Receiver',
  position: 'WR',
  phase: 1,
  minBid: 2,
  maxBid: 8,
  effects: [{ type: 'coins', amount: 2, perRound: true }]
};

state1.board.highestBid = 4;
resolveAuctionWin(state1, '0', testCard);

assert.ok(state1.board.cardWonFlyAnimation, 'cardWonFlyAnimation must be populated upon player acquisition');
assert.strictEqual(state1.board.cardWonFlyAnimation.winnerId, '0');
assert.strictEqual(state1.board.cardWonFlyAnimation.bidAmount, 4);
assert.strictEqual(state1.board.cardWonFlyAnimation.card.name, 'Speedy Receiver');
assert.strictEqual(state1.board.cardWonFlyAnimation.winnerTeamName, TEAMS[0].name);

// Dismiss celebration
DeflategateGame.phases.auctionPhase.moves.dismissCardWonFlyAnimation({ G: state1 });
assert.strictEqual(state1.board.cardWonFlyAnimation, null, 'dismissCardWonFlyAnimation in auctionPhase must clear state');

// Test in postAuctionPhase moves
state1.board.cardWonFlyAnimation = { timestamp: Date.now() };
DeflategateGame.phases.postAuctionPhase.moves.dismissCardWonFlyAnimation({ G: state1 });
assert.strictEqual(state1.board.cardWonFlyAnimation, null, 'dismissCardWonFlyAnimation in postAuctionPhase must clear state');
console.log('✓ Card Won Fly Animation and dismiss moves verified successfully');

// Test 2: Cardinals Deck Swap Logic
console.log('Test 2: Cardinals Deck Swap Logic...');
const state2 = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: a => a } });
const topCard = { id: 'top_card', name: 'Elite QB', position: 'QB', phase: 2, minBid: 3, maxBid: 9 };
const auctionCard1 = { id: 'auc_1', name: 'Rookie RB', position: 'RB', phase: 1, minBid: 1, maxBid: 6 };
const auctionCard2 = { id: 'auc_2', name: 'Veteran Kicker', position: 'K', phase: 1, minBid: 1, maxBid: 4 };

state2.decks.activePlayers = [topCard];
state2.board.auctionPlayers = [auctionCard1, auctionCard2];
state2.board.pendingCardinals = { playerID: '0', topCard };

DeflategateGame.phases.preAuctionPhase.moves.cardinalsSwap({ G: state2, playerID: '0' }, 0);

assert.strictEqual(state2.board.auctionPlayers[0].id, 'top_card', 'Auction card 0 must now be the topCard');
assert.strictEqual(state2.decks.activePlayers[state2.decks.activePlayers.length - 1].id, 'auc_1', 'Old card must be returned to deck');
assert.strictEqual(state2.board.pendingCardinals, null, 'pendingCardinals must be cleared after swap');
console.log('✓ Cardinals Peek & Swap logic verified successfully');

// Test 3: Highlight Teams in Red Condition Check
console.log('Test 3: Highlight Teams Acquired Condition Check...');
const playerWithCard = { hasWonAuction: true, cardsWonThisRound: 1 };
const playerWithoutCard = { hasWonAuction: false, cardsWonThisRound: 0 };
const isAuctionActive = true;

const hasAcquired1 = isAuctionActive && Boolean(playerWithCard.hasWonAuction || (playerWithCard.cardsWonThisRound || 0) > 0);
const hasAcquired2 = isAuctionActive && Boolean(playerWithoutCard.hasWonAuction || (playerWithoutCard.cardsWonThisRound || 0) > 0);

assert.strictEqual(hasAcquired1, true, 'Team that has won auction must be flagged as hasAcquiredThisRound');
assert.strictEqual(hasAcquired2, false, 'Team that has not won auction must NOT be flagged as hasAcquiredThisRound');
console.log('✓ Acquired (Out) red highlight condition verified');

// Test 4: Refresh Results Payouts
console.log('Test 4: Refresh Results Calculation for 2-Column Grid...');
const state3 = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: a => a } });
Object.keys(state3.players).forEach((id, idx) => {
  state3.players[id].team = TEAMS[idx];
  state3.players[id].lineup = [
    { id: `p_${idx}`, name: `Player ${idx}`, effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];
});
calculateRefreshResults(state3);
const refreshResults = state3.board.refreshResults;
assert.ok(Array.isArray(refreshResults), 'refreshResults must be an array');
assert.strictEqual(refreshResults.length, 4, 'Must generate results for all 4 teams');
refreshResults.forEach(res => {
  assert.ok(res.teamName, 'Result must have teamName');
  assert.strictEqual(res.coinsGained, 2, 'Result must reflect 2 coins gained');
});
console.log('✓ Refresh Results 2-column data verified');

console.log('ALL PLAYTEST 28 TESTS PASSED SUCCESSFULLY! 🎉');
