import { DeflategateGame, resolveAuctionWin, chooseCpuCommandersMarkCard } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

function assert(condition, message) {
  if (!condition) {
    console.error('❌ Assertion failed:', message);
    throw new Error(message);
  } else {
    console.log('✅ Passed:', message);
  }
}

console.log('--- TEST PLAYTEST 18: COMMANDERS ABILITY & RULES GUIDE ---');

// Setup a 4-player game
const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
const commandersTeam = TEAMS.find(t => t.id === 'commanders');
const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');
const eaglesTeam = TEAMS.find(t => t.id === 'eagles');
const giantsTeam = TEAMS.find(t => t.id === 'giants');

G.players['0'].team = cowboysTeam; // First Player
G.players['0'].isCpu = false;
G.players['0'].coins = 20;
G.players['1'].team = commandersTeam; // Commanders (Human)
G.players['1'].isCpu = false;
G.players['1'].coins = 20;
G.players['2'].team = eaglesTeam;
G.players['2'].isCpu = true;
G.players['2'].coins = 20;
G.players['3'].team = giantsTeam;
G.players['3'].isCpu = true;
G.players['3'].coins = 20;

G.board.firstPlayer = '0';
G.board.nominator = '0';
G.board.round = 1;

// Populate auction cards
G.board.auctionPlayers = [
  { id: 'card_a', name: 'Player Alpha', minBid: 2, maxBid: 8, effects: [] },
  { id: 'card_b', name: 'Player Beta', minBid: 3, maxBid: 9, effects: [] },
  { id: 'card_c', name: 'Player Gamma', minBid: 4, maxBid: 10, effects: [] },
  { id: 'card_d', name: 'Player Delta', minBid: 5, maxBid: 12, effects: [] }
];

console.log('\n--- 1. Testing Human Commanders Ability Trigger in preAuctionPhase ---');
// Simulate preAuctionPhase.onBegin
const preAuction = DeflategateGame.phases.preAuctionPhase;
let endPhaseCalled = false;
const events = { endPhase: () => { endPhaseCalled = true; } };

preAuction.onBegin({ G, ctx: { numPlayers: 4 }, events });

assert(G.board.pendingCommanders !== null, 'Human Commanders queued into pendingCommanders');
assert(String(G.board.pendingCommanders.playerID) === '1', 'pendingCommanders targets Player 1');
assert(!endPhaseCalled, 'Phase did not advance prematurely because human Commanders is pending');

// Try invalid move by non-commanders player
const invalidRes = preAuction.moves.commandersMarkCard({ G, playerID: '0', events }, 1, '0');
assert(invalidRes === 'INVALID_MOVE', 'Non-Commanders player cannot mark card');

// Valid human commanders move marking card index 2 ('Player Gamma')
const validRes = preAuction.moves.commandersMarkCard({ G, playerID: '1', events }, 2, '1');
assert(validRes !== 'INVALID_MOVE', 'Commanders player successfully marked card 2');
assert(G.board.commandersMarkedCardIndex === 2, 'G.board.commandersMarkedCardIndex is set to 2');
assert(G.board.pendingCommanders === null, 'pendingCommanders cleared after marking');
assert(endPhaseCalled, 'Phase successfully ended to advance to auction');

console.log('\n--- 2. Testing Nomination Restriction for First Player ---');
const auctionMoves = DeflategateGame.phases.auctionPhase.moves;

// First Player ('0') attempts to nominate marked card (index 2)
const blockedNomination = auctionMoves.selectCard({ G, playerID: '0' }, 2, '0');
assert(blockedNomination === 'INVALID_MOVE', 'First Player blocked from nominating marked card index 2');

// First Player nominates an unblocked card (index 0)
const validNomination = auctionMoves.selectCard({ G, playerID: '0' }, 0, '0');
assert(validNomination !== 'INVALID_MOVE', 'First Player can nominate unblocked card index 0');
assert(G.board.activeAuctionCardIndex === 0, 'Active auction card is index 0');

console.log('\n--- 3. Testing Bidding on Marked Card ---');
// Let another player nominate the marked card (index 2)
G.board.activeAuctionCardIndex = 2;
G.board.highestBid = 4;
G.board.highestBidder = '2'; // Eagles bid 4

// First Player ('0') attempts to bid on marked card
const blockedBid = auctionMoves.bid({ G, playerID: '0', events: {} }, 5, '0');
assert(blockedBid === 'INVALID_MOVE', 'First Player blocked from bidding on marked card');

// Opponent ('3' - Giants) bids on marked card
const validOpponentBid = auctionMoves.bid({ G, playerID: '3', events: {} }, 5, '3');
assert(validOpponentBid !== 'INVALID_MOVE', 'Opponent can bid on marked card');
assert(G.board.highestBidder === '3', 'Opponent is now highest bidder');

console.log('\n--- 4. Testing Restriction Liftoff when First Player Wins Any Player ---');
// First Player wins card index 0
G.board.activeAuctionCardIndex = 0;
G.board.highestBid = 6;
G.board.highestBidder = '0';
const wonCard = G.board.auctionPlayers[0];

assert(G.board.commandersMarkedCardIndex === 2, 'Marked card index is still 2 prior to win');

// Resolve auction win for First Player
resolveAuctionWin(G, '0', wonCard);

assert(G.board.commandersMarkedCardIndex === null, 'Commanders marked card restriction lifted when First Player won a card!');

// Now that mark is lifted, card index 2 is unblocked for nomination
G.board.activeAuctionCardIndex = null;
const currentNom = G.board.nominator;
const nowUnblockedNom = auctionMoves.selectCard({ G, playerID: currentNom }, 2, currentNom);
assert(nowUnblockedNom !== 'INVALID_MOVE', 'Previously marked card index 2 is now completely unlocked for nomination');

console.log('\n--- 5. Testing Commanders Ability Skipped when Commanders is First Player ---');
// Reset state with Commanders as First Player
G.board.firstPlayer = '1'; // Commanders is now First Player
G.board.commandersMarkedCardIndex = null;
G.board.pendingCommanders = null;
G.board.pendingCommandersQueue = [];

preAuction.onBegin({ G, ctx: { numPlayers: 4 }, events });

assert(G.board.pendingCommanders === null, 'Commanders ability skipped when Commanders is First Player');
assert(G.board.commandersMarkedCardIndex === null, 'No card marked when Commanders is First Player');

console.log('\n--- 6. Testing CPU Commanders Strategic Card Marking ---');
// Set Commanders to CPU and not First Player
G.players['1'].isCpu = true;
G.board.firstPlayer = '0'; // Cowboys is First Player
G.board.commandersMarkedCardIndex = null;
G.board.pendingCommanders = null;

const cpuChosenIdx = chooseCpuCommandersMarkCard(G, '1');
assert(cpuChosenIdx >= 0 && cpuChosenIdx < G.board.auctionPlayers.length, 'CPU Commanders selected a valid card index: ' + cpuChosenIdx);

preAuction.onBegin({ G, ctx: { numPlayers: 4 }, events });
assert(G.board.commandersMarkedCardIndex !== null, 'CPU Commanders automatically marked a card in preAuctionPhase');
assert(G.board.pendingCommanders === null, 'No human prompt queued for CPU Commanders');

console.log('\n🎉 ALL PLAYTEST 18 TESTS PASSED SUCCESSFULLY!');
