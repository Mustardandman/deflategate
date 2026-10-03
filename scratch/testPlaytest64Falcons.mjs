import assert from 'assert';
import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, resolveAuctionWin, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('========================================================================================');
console.log('PLAYTEST 64: ATLANTA FALCONS LATE-AUCTION MULLIGAN & PASSING SUITE');
console.log('========================================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  FAIL: ${description}`);
    console.error(`    ${err.message}`);
  }
}

// Setup helper
function createTestGame(lobbySize = 4) {
  const G = DeflategateGame.setup(
    { ctx: { numPlayers: lobbySize }, random: { _random: Math.random, Shuffle: (a) => a } },
    { numHumans: 0, vsCpu: true }
  );
  const falconsTeam = TEAMS.find(t => t.id === 'falcons');
  G.players['0'].team = { ...falconsTeam };
  G.players['0'].psi = 48;
  G.players['0'].coins = 9;
  G.players['0'].isCpu = true;
  G.players['0'].genome = { ...ACTIVE_TEAM_GENOMES.falcons };
  G.players['0'].falconsPhaseUses = { p1: false, p2: false, p3: false };
  G.players['0'].lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];

  for (let i = 1; i < lobbySize; i++) {
    const seat = String(i);
    const t = TEAMS.find(tm => tm.id !== 'falcons');
    G.players[seat].team = { ...t };
    G.players[seat].psi = 40;
    G.players[seat].coins = 12;
    G.players[seat].isCpu = true;
    G.players[seat].hasWonAuction = false;
  }

  G.board.round = 1;
  G.board.highestBid = 0;
  G.board.highestBidder = null;
  G.board.passedAuctionPlayers = [];
  return G;
}

// --------------------------------------------------------------------------------------
console.log('Test 1: Intentional Passing & Early Auction Discipline');
// --------------------------------------------------------------------------------------
test('Falcons strictly passes on Deshaun Watson and recurring inflation', () => {
  const G = createTestGame(4);
  const watsonCard = {
    id: 'deshaun_watson',
    name: 'Deshaun Watson',
    position: 'QB',
    minBid: 1,
    maxBid: 10,
    effects: [{ type: 'inflate', amount: 1, perRound: true }]
  };
  G.board.activeAuctionCardIndex = 0;
  G.board.auctionPlayers = [watsonCard, null, null, null];
  G.board.highestBid = 1;
  G.board.highestBidder = '1';

  const decision = evaluateCpuAuctionBid(G, '0');
  assert.strictEqual(decision.shouldBid, false, 'Falcons should refuse to bid on Deshaun Watson');
});

test('Falcons intentionally passes on mediocre card when > 2 bidders remain', () => {
  const G = createTestGame(4);
  const mediocreCard = {
    id: 'mediocre_test',
    name: 'Mediocre Player',
    position: 'WR',
    minBid: 3,
    maxBid: 6,
    effects: [{ type: 'coins', amount: 2 }] // instant 2 coins, score ~10-12
  };
  G.board.activeAuctionCardIndex = 0;
  G.board.auctionPlayers = [mediocreCard, null, null, null];
  G.board.highestBid = 3;
  G.board.highestBidder = '1';

  // 4 players eligible (hasWonAuction is false for all)
  const decision = evaluateCpuAuctionBid(G, '0');
  assert.strictEqual(decision.shouldBid, false, 'Falcons should intentionally pass early to conserve coins');
});

test('Falcons DOES bid early on premier centerpiece (Tier 1 / recurring deflate >= 2)', () => {
  const G = createTestGame(4);
  const premierCard = {
    id: 'brock_bowers',
    name: 'Brock Bowers',
    position: 'TE',
    minBid: 2,
    maxBid: 14,
    effects: [
      { type: 'deflate', amount: 2, perRound: true },
      { type: 'coins', amount: 1, perRound: true }
    ]
  };
  G.board.activeAuctionCardIndex = 0;
  G.board.auctionPlayers = [premierCard, null, null, null];
  G.board.highestBid = 2;
  G.board.highestBidder = '1';

  const decision = evaluateCpuAuctionBid(G, '0');
  assert.strictEqual(decision.shouldBid, true, 'Falcons should contest premier recurring deflation centerpiece');
});

// --------------------------------------------------------------------------------------
console.log('\nTest 2: Late-Auction Leverage & Passing to the End');
// --------------------------------------------------------------------------------------
test('Falcons bids when auction enters late threshold (<= 2 eligible bidders)', () => {
  const G = createTestGame(4);
  // Opponents 1 and 2 already won and exited
  G.players['1'].hasWonAuction = true;
  G.players['2'].hasWonAuction = true;
  // Now only Falcons ('0') and opponent '3' remain!

  const solidCard = {
    id: 'solid_test',
    name: 'Solid Player',
    position: 'RB',
    minBid: 2,
    maxBid: 8,
    effects: [{ type: 'deflate', amount: 3 }] // instant 3 deflate
  };
  G.board.activeAuctionCardIndex = 0;
  G.board.auctionPlayers = [solidCard, null, null, null];
  G.board.highestBid = 2;
  G.board.highestBidder = '3';

  const decision = evaluateCpuAuctionBid(G, '0');
  assert.strictEqual(decision.shouldBid, true, 'Falcons should actively bid when down to the final 2 bidders');
});

// --------------------------------------------------------------------------------------
console.log('\nTest 3: Late-Auction Mulligan Trigger');
// --------------------------------------------------------------------------------------
test('Falcons triggers Mulligan late in auction when remaining cards are Tier 3 scraps', () => {
  const G = createTestGame(4);
  // Opponents 1 and 2 already won and exited
  G.players['1'].hasWonAuction = true;
  G.players['2'].hasWonAuction = true;
  // Only Falcons ('0') and '3' remain
  const scrap1 = { id: 'scrap_1', name: 'Scrap 1', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1 }] };
  const scrap2 = { id: 'scrap_2', name: 'Scrap 2', minBid: 1, maxBid: 3, effects: [{ type: 'deflate', amount: 1 }] };
  G.board.auctionPlayers = [scrap1, scrap2, null, null];

  const deckCard1 = { id: 'fresh_1', name: 'Fresh Star 1', minBid: 2, maxBid: 10, effects: [{ type: 'deflate', amount: 3 }] };
  const deckCard2 = { id: 'fresh_2', name: 'Fresh Star 2', minBid: 2, maxBid: 10, effects: [{ type: 'deflate', amount: 4 }] };
  G.decks.activePlayers = [deckCard1, deckCard2];

  resolveAuctionWin(G, '2', { id: 'some_winner' });

  assert.strictEqual(G.players['0'].falconsPhaseUses.p1, true, 'Falcons should use Phase 1 mulligan');
  assert.strictEqual(G.board.auctionPlayers[0].id, 'fresh_2', 'Fresh cards should be dealt to board');
});

test('Falcons does NOT mulligan if already used in current phase', () => {
  const G = createTestGame(4);
  G.players['0'].falconsPhaseUses.p1 = true; // Already used
  G.players['1'].hasWonAuction = true;
  G.players['2'].hasWonAuction = true;

  const scrap1 = { id: 'scrap_1', name: 'Scrap 1', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1 }] };
  G.board.auctionPlayers = [scrap1, null, null, null];

  resolveAuctionWin(G, '2', { id: 'some_winner' });
  assert.strictEqual(G.board.auctionPlayers[0].id, 'scrap_1', 'Cards should remain un-mulliganed');
});

// --------------------------------------------------------------------------------------
console.log('\nTest 4: Strategic Nomination');
// --------------------------------------------------------------------------------------
test('Falcons nominates instant closer nuke when PSI <= 16', () => {
  const G = createTestGame(4);
  G.players['0'].psi = 8;
  G.players['0'].coins = 10;

  const card1 = { id: 'c1', name: 'Decent Card', minBid: 1, maxBid: 8, effects: [{ type: 'deflate', amount: 2 }] };
  const nukeCard = { id: 'tony_pollard', name: 'Tony Pollard', minBid: 3, maxBid: 12, effects: [{ type: 'deflate', amount: 8 }] };
  G.board.auctionPlayers = [card1, nukeCard];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert.strictEqual(nominatedIdx, 1, 'Falcons should nominate game-winning instant closer nuke');
});

test('Falcons avoids nominating Watson/poison', () => {
  const G = createTestGame(4);
  const watson = { id: 'deshaun_watson', name: 'Deshaun Watson', minBid: 1, maxBid: 10, effects: [{ type: 'inflate', amount: 1, perRound: true }] };
  const cleanCard = { id: 'clean', name: 'Clean WR', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2 }] };
  G.board.auctionPlayers = [watson, cleanCard];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert.strictEqual(nominatedIdx, 1, 'Falcons should nominate the clean card, ignoring poison');
});

// --------------------------------------------------------------------------------------
console.log('\nTest 5: Active & Evolved Genome Verification');
// --------------------------------------------------------------------------------------
test('Falcons genome weights are calibrated to optimal values', () => {
  const g = ACTIVE_TEAM_GENOMES.falcons;
  assert.strictEqual(g.deflateWeight, 2.35, 'deflateWeight should be 2.35');
  assert.strictEqual(g.coinWeight, 1.0, 'coinWeight should be 1.0');
  assert.strictEqual(g.reserveCoins, 1, 'reserveCoins should be 1');
  assert.strictEqual(g.aggression, 1.18, 'aggression should be 1.18');
  assert.strictEqual(g.firstClaimAggression, 1.25, 'firstClaimAggression should be 1.25');
  assert.strictEqual(g.superstarPriorityMult, 1.25, 'superstarPriorityMult should be 1.25');
  assert.strictEqual(g.threatDefenseWeight, 1.10, 'threatDefenseWeight should be 1.10');
});

console.log(`\nResults: ${passedTests} / ${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL PLAYTEST 64 TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('SOME TESTS FAILED!\n');
  process.exit(1);
}
