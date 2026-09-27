import assert from 'assert';
import { DeflategateGame, selectCpuBucsTeamToCopy, executeActiveEvent, calculateRefreshResults } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('--- Testing Playtest 27 Features & Bugfixes ---');

// Test 1: CPU Buccaneers Copy Logic
console.log('Test 1: CPU Bucs Team Copy Logic...');
for (let i = 0; i < 50; i++) {
  const chosen = selectCpuBucsTeamToCopy(TEAMS);
  assert.ok(chosen, 'Chosen team must not be null');
  assert.notStrictEqual(chosen.id, 'broncos', 'Bucs must never copy Broncos (negative ability)');
  assert.notStrictEqual(chosen.id, 'browns', 'Bucs must never copy Browns (negative ability)');
  assert.notStrictEqual(chosen.id, 'patriots', 'Bucs must never copy Patriots (no ability)');
  assert.notStrictEqual(chosen.id, 'buccaneers', 'Bucs must never copy self');
}
console.log('✓ CPU Bucs never copies negative or invalid teams over 50 iterations');

// Test 2: Event Effect Execution Order
console.log('Test 2: Event Effect Execution Order...');
const state = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
// Assign teams
Object.keys(state.players).forEach((id, idx) => {
  state.players[id].team = TEAMS[idx];
});

// Set an event with instant inflate
state.board.activeEvent = {
  id: 'hot_air',
  name: 'Hot Air',
  category: 'instant_inflate',
  amount: 7,
  effect: 'All teams inflate +7 PSI'
};
state.board.eventFlipRevealed = true;
state.board.eventConfirmed = false;

const initialPsis = Object.keys(state.players).map(id => state.players[id].psi);

// Before confirmEventReveal, PSI should NOT have changed
Object.keys(state.players).forEach((id, idx) => {
  assert.strictEqual(state.players[id].psi, initialPsis[idx], `PSI of player ${id} must not change before reveal confirmation`);
});
console.log('✓ Event effects are NOT triggered before reveal confirmation');

// Confirm event reveal
DeflategateGame.phases.eventPhase.moves.confirmEventReveal({ G: state });
assert.strictEqual(state.board.eventFlipRevealed, false);
assert.strictEqual(state.board.eventConfirmed, true);

// Now PSI should be inflated by +7
Object.keys(state.players).forEach((id, idx) => {
  assert.strictEqual(state.players[id].psi, initialPsis[idx] + 7, `PSI of player ${id} should be inflated by 7`);
});
console.log('✓ Event effects execute properly upon confirmEventReveal');

// Test 3: proceedToRefresh move
console.log('Test 3: proceedToRefresh Move...');
state.board.postAuctionComplete = false;
state.board.pendingBills = { playerID: '0' };
state.board.pendingEagles = { playerID: '1' };

let phaseEnded = false;
DeflategateGame.phases.auctionPhase.moves.proceedToRefresh({
  G: state,
  events: {
    endPhase: () => { phaseEnded = true; }
  }
});
assert.strictEqual(state.board.postAuctionComplete, true, 'postAuctionComplete must be true');
assert.strictEqual(state.board.pendingBills, null, 'pendingBills must be cleared');
assert.strictEqual(state.board.pendingEagles, null, 'pendingEagles must be cleared');
assert.strictEqual(phaseEnded, true, 'phase must end or transition to refreshPhase');
console.log('✓ proceedToRefresh successfully resets pending post-auction states and ends phase');

// Test 4: calculateRefreshResults and confirmRefreshSummary
console.log('Test 4: calculateRefreshResults & confirmRefreshSummary...');
calculateRefreshResults(state);
assert.ok(Array.isArray(state.board.refreshResults), 'refreshResults should be an array');
assert.strictEqual(state.board.refreshResults.length, 4, 'refreshResults should contain entries for all 4 players');
console.log('✓ calculateRefreshResults generates team payouts array');

const prevRound = state.board.round;
DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G: state });
assert.strictEqual(state.board.round, prevRound + 1, 'Round number should increment');
assert.strictEqual(state.board.refreshConfirmed, true, 'refreshConfirmed should be set to true');
assert.strictEqual(state.board.eventConfirmed, false, 'eventConfirmed should reset for next round');
assert.strictEqual(state.board.eventFlipRevealed, false, 'eventFlipRevealed should reset for next round');
console.log('✓ confirmRefreshSummary advances to next round and resets round state');

console.log('ALL PLAYTEST 27 TESTS PASSED SUCCESSFULLY! 🎉');
