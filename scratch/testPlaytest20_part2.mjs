import { DeflategateGame, triggerAbilityNotification } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('========================================================');
console.log('VERIFICATION TEST: PLAYTEST #20 PART 2 (ALL 4 USER REQUESTS)');
console.log('========================================================');

let passedTests = 0;

// -----------------------------------------------------------------
// Test 1: Team Abilities History & Dismissal Mechanism
// -----------------------------------------------------------------
console.log('\n--- Test 1: Team Abilities History & Dismissal ---');
const G1 = DeflategateGame.setup({
  ctx: { numPlayers: 4 },
  random: { Shuffle: arr => [...arr] }
});

// Setup 4 teams
G1.players['0'].team = TEAMS.find(t => t.id === 'jets');
G1.players['1'].team = TEAMS.find(t => t.id === 'lions');
G1.players['2'].team = TEAMS.find(t => t.id === 'raiders');
G1.players['3'].team = TEAMS.find(t => t.id === 'browns');

if (!Array.isArray(G1.board.abilityNotificationHistory)) {
  throw new Error('G.board.abilityNotificationHistory is not initialized as an array!');
}

// Trigger Jets notification
triggerAbilityNotification(G1, '0', 'jets', 'Max Bid Boost Activated', 'New York Jets bid max and deflated 4 PSI!');

// Trigger Raiders notification
triggerAbilityNotification(G1, '2', 'raiders', 'PSI Menace Transferred', 'Las Vegas Raiders transferred 1 PSI to an opponent!');

console.log('History length:', G1.board.abilityNotificationHistory.length);
if (G1.board.abilityNotificationHistory.length !== 2) {
  throw new Error(`Expected 2 history items, got ${G1.board.abilityNotificationHistory.length}`);
}

// Check items are in reverse chronological order (newest first)
if (G1.board.abilityNotificationHistory[0].teamId !== 'raiders' || G1.board.abilityNotificationHistory[1].teamId !== 'jets') {
  throw new Error('History is not unshifted (newest first)');
}

// Simulate client dismiss of Raiders notification
const dismissedByClient = [G1.board.abilityNotificationHistory[0].id];
const visibleToClient = G1.board.abilityNotificationHistory.filter(n => !dismissedByClient.includes(n.id));
console.log('Visible to client after dismissing Raiders:', visibleToClient.map(n => n.teamName));
if (visibleToClient.length !== 1 || visibleToClient[0].teamId !== 'jets') {
  throw new Error('Dismissal filtering failed');
}
console.log('✅ Test 1 Passed: Ability notifications properly queued in history and filterable per-client!');
passedTests++;

// -----------------------------------------------------------------
// Test 2: Rivalry Event Displays Franchise Name (e.g. Cleveland Browns)
// -----------------------------------------------------------------
console.log('\n--- Test 2: Rivalry Event Uses Franchise Names ---');
const G2 = DeflategateGame.setup({
  ctx: { numPlayers: 4 },
  random: { Shuffle: arr => [...arr] }
});
G2.players['0'].team = TEAMS.find(t => t.id === 'patriots') || { id: 'patriots', name: 'New England Patriots' };
G2.players['1'].team = TEAMS.find(t => t.id === 'bills') || { id: 'bills', name: 'Buffalo Bills' };
G2.players['2'].team = TEAMS.find(t => t.id === 'dolphins') || { id: 'dolphins', name: 'Miami Dolphins' };
G2.players['3'].team = TEAMS.find(t => t.id === 'browns') || { id: 'browns', name: 'Cleveland Browns' };

G2.board.pendingRivalry = {
  order: ['0', '1', '2', '3'],
  step: 0,
  currentGiverId: '0'
};
G2.players['0'].psi = 25;
G2.players['3'].psi = 28;

G2.players['1'].isCpu = false;
G2.players['2'].isCpu = false;
G2.players['3'].isCpu = false;

// Player 0 gives to Player 3 (Cleveland Browns)
DeflategateGame.moves.rivalryGivePsi({ G: G2 }, '3', '0');

console.log('Player 0 psi:', G2.players['0'].psi, '(expected 24)');
console.log('Player 3 psi:', G2.players['3'].psi, '(expected 29)');
console.log('G2.logs:', G2.logs);
const rivalryLog = G2.logs?.find(l => (typeof l === 'string' ? l : l.text || '').includes('Browns'));
console.log('Rivalry log:', rivalryLog?.text || rivalryLog);

if (G2.players['0'].psi !== 24 || G2.players['3'].psi !== 29) {
  throw new Error('Rivalry PSI transfer calculation failed');
}
if (!rivalryLog || !rivalryLog.text.includes('Browns (Player 4)')) {
  throw new Error(`Expected log to contain "Browns (Player 4)", got none`);
}
console.log('✅ Test 2 Passed: Rivalry properly named Browns and updated state accurately!');
passedTests++;

// -----------------------------------------------------------------
// Test 3: Skip to Refresh Phase with 2 Remaining Players and 1 Remaining Player
// -----------------------------------------------------------------
console.log('\n--- Test 3: Skip to Refresh Phase Progression ---');
const G3 = DeflategateGame.setup({
  ctx: { numPlayers: 4 },
  random: { Shuffle: arr => [...arr] }
});

for (let i = 0; i < 4; i++) {
  G3.players[i.toString()] = {
    coins: 10,
    psi: 35,
    lineup: [
      { id: `p_${i}_1`, name: `Player ${i} Lineup 1`, phase: 1, effects: [] },
      { id: `p_${i}_2`, name: `Player ${i} Lineup 2`, phase: 1, effects: [] },
      { id: `p_${i}_3`, name: `Player ${i} Lineup 3`, phase: 1, effects: [] }
    ],
    hasWonAuction: false,
    isCpu: i !== 0,
    personality: 'rusher'
  };
}

G3.board.auctionPlayers = [
  { id: 'c1', name: 'Card 1', minBid: 2, maxBid: 8, phase: 1, effects: [] },
  { id: 'c2', name: 'Card 2', minBid: 2, maxBid: 8, phase: 1, effects: [] },
  { id: 'c3', name: 'Card 3', minBid: 2, maxBid: 8, phase: 1, effects: [] },
  { id: 'c4', name: 'Card 4', minBid: 2, maxBid: 8, phase: 1, effects: [] }
];
G3.board.nominator = '0';
G3.board.firstPlayer = '0';

let ctx3 = { currentPlayer: '0', numPlayers: 4, phase: 'auctionPhase' };
let events3 = {
  endTurn: () => {
    const next = DeflategateGame.phases.auctionPhase.turn.order.next({ G: G3, ctx: ctx3 });
    ctx3.currentPlayer = next.toString();
  }
};

// 1. Human (0) wins auction
DeflategateGame.phases.auctionPhase.moves.selectCard({ G: G3, playerID: '0' }, 0);
DeflategateGame.phases.auctionPhase.moves.bid({ G: G3, playerID: '0', events: events3 }, 8);
DeflategateGame.phases.auctionPhase.moves.replaceLineupCard({ G: G3, playerID: '0', events: events3 }, 0);

if (!G3.players['0'].hasWonAuction) {
  throw new Error('Human should have won auction');
}

// Simulate the automated skip loop
let steps = 0;
while (ctx3.phase === 'auctionPhase' && steps < 30) {
  steps++;
  
  // Calculate acting player and isCpuTurn as App.jsx does
  const activeActingPlayerId = (ctx3.phase === 'auctionPhase' && G3.board.activeAuctionCardIndex === null)
    ? String(G3.board.nominator)
    : String(ctx3.currentPlayer);
  const isCpuTurn = Boolean(G3.players[activeActingPlayerId]?.isCpu);
  
  const remainingEligible = Object.keys(G3.players).filter(id => !G3.players[id].hasWonAuction);
  console.log(`Step ${steps}: remainingEligible=${remainingEligible.length} [${remainingEligible}], actingPlayer=${activeActingPlayerId}, isCpuTurn=${isCpuTurn}`);
  
  if (!isCpuTurn) {
    throw new Error(`Skip stalled at step ${steps} with ${remainingEligible.length} players left because isCpuTurn was false!`);
  }
  
  DeflategateGame.phases.auctionPhase.moves.stepCpuTurn({ G: G3, ctx: ctx3, events: events3 });
  
  const ended = DeflategateGame.phases.auctionPhase.endIf({ G: G3, ctx: ctx3 });
  if (ended) {
    console.log(`Auction ended successfully after ${steps} steps!`);
    ctx3.phase = 'postAuctionPhase';
    break;
  }
}

if (ctx3.phase === 'auctionPhase') {
  throw new Error('Auction phase did not complete!');
}

console.log('✅ Test 3 Passed: "Skip to Refresh Phase" stepped all the way to completion with 2 and 1 players left without stalling!');
passedTests++;

console.log(`\n========================================================`);
console.log(`ALL ${passedTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`========================================================`);
