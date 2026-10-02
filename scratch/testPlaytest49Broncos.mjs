import {
  scoreCardForPlayer,
  evaluateCpuAuctionBid,
  chooseCpuNominationCard,
  resolveAuctionWin,
  calculateRefreshResults,
  doesCardFitTeamStrategy,
  DeflategateGame
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== TEST SUITE: PLAYTEST 49 - DENVER BRONCOS AI OPTIMIZATION ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  FAIL: ${message}`);
    process.exitCode = 1;
  }
}

const broncosTeam = TEAMS.find(t => t.id === 'broncos');
const bowers = PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers');
const cousins = PHASE_1_PLAYERS.find(p => p.id === 'kirk_cousins');
const kittle = PHASE_1_PLAYERS.find(p => p.id === 'george_kittle');
const henry = PHASE_1_PLAYERS.find(p => p.id === 'hunter_henry') || {
  id: 'hunter_henry', name: 'Hunter Henry', minBid: 1, maxBid: 8, phase: 1, position: 'TE',
  effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }]
};
const zeke = PHASE_1_PLAYERS.find(p => p.id === 'ezekiel_elliott') || {
  id: 'ezekiel_elliott', name: 'Ezekiel Elliott', minBid: 1, maxBid: 8, phase: 1, position: 'RB',
  effects: [{ type: 'deflate', amount: 5, perRound: false }, { type: 'coins', amount: -2, perRound: true }]
};
const kyren = PHASE_1_PLAYERS.find(p => p.id === 'kyren_williams') || {
  id: 'kyren_williams', name: 'Kyren Williams', minBid: 1, maxBid: 8, phase: 1, position: 'RB',
  effects: [{ type: 'deflate', amount: 4, perRound: false }]
};

// ----------------------------------------------------------------------------
// TEST 1: Broncos Card Scoring (Delay on Recurring, Boost on Instants, Pump & Dump)
// ----------------------------------------------------------------------------
console.log('Test 1: Broncos Card Scoring');
{
  const p = {
    id: '0',
    team: broncosTeam,
    psi: 40,
    coins: 20,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
    ]
  };

  const G = {
    board: { round: 1 },
    players: { '0': p }
  };

  const henryScore = scoreCardForPlayer(G, '0', henry);
  const zekeScore = scoreCardForPlayer(G, '0', zeke);
  const kyrenScore = scoreCardForPlayer(G, '0', kyren);
  const bowersScore = scoreCardForPlayer(G, '0', bowers);

  assert(henryScore > 15, `Hunter Henry scores very high as pump-and-dump (${henryScore.toFixed(1)} > 15)`);
  assert(zekeScore > 10, `Ezekiel Elliott scores high as pump-and-dump (${zekeScore.toFixed(1)} > 10)`);
  assert(bowersScore > 20, `Brock Bowers scores massive in R1 as premier anchor (${bowersScore.toFixed(1)} > 20)`);
  assert(kyrenScore > 12, `Kyren Williams (instant deflate) scores high with no delay penalty (${kyrenScore.toFixed(1)} > 12)`);
}

// ----------------------------------------------------------------------------
// TEST 2: Broncos Ability Mechanics (First Refresh Delay)
// ----------------------------------------------------------------------------
console.log('\nTest 2: Broncos Ability Mechanics & First Refresh Delay');
{
  const p = {
    id: '0',
    team: broncosTeam,
    psi: 40,
    coins: 20,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' }
    ]
  };

  const G = {
    board: {
      round: 1,
      highestBid: 5,
      highestBidder: '0',
      activeAuctionCardIndex: 0,
      auctionPlayers: [cousins]
    },
    players: { '0': p },
    decks: { discard: [] },
    numHumans: 0
  };

  // Win auction for Kirk Cousins (recurring 3 coins)
  resolveAuctionWin(G, '0', cousins);

  const wonCard = p.lineup.find(c => c.id === 'kirk_cousins');
  assert(wonCard !== undefined, `Kirk Cousins was added to Broncos lineup`);
  assert(wonCard.broncosRoundAcquired === 1, `Cousins has broncosRoundAcquired = 1`);

  // Calculate refresh results: Cousins' 3 coins should be ignored this round!
  calculateRefreshResults(G);

  // Practice squads generate 1 coin each (2 practice squads = 2 coins)
  // Cousins should produce 0 coins this round due to Broncos delay!
  const coinsGained = p.coins - (20 - 5);
  assert(coinsGained === 2, `Cousins recurring coins skipped on round acquired (gained ${coinsGained} coins from 2 PS, expected 2)`);

  // Confirm refresh summary cleans up the flag for round 2
  DeflategateGame.moves.confirmRefreshSummary({ G });
  assert(wonCard.broncosRoundAcquired === undefined, `broncosRoundAcquired cleared at end of round for next refresh`);
}

// ----------------------------------------------------------------------------
// TEST 3: Hunter Henry Pump-and-Dump Refresh & Drawback Skip
// ----------------------------------------------------------------------------
console.log('\nTest 3: Hunter Henry Pump-and-Dump Refresh Behavior');
{
  const p = {
    id: '0',
    team: broncosTeam,
    psi: 40,
    coins: 20,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' }
    ]
  };

  const G = {
    board: {
      round: 1,
      highestBid: 4,
      highestBidder: '0',
      activeAuctionCardIndex: 0,
      auctionPlayers: [henry]
    },
    players: { '0': p },
    decks: { discard: [] },
    numHumans: 0
  };

  // Win auction for Hunter Henry (+8 instant deflate, +3 recurring inflate)
  resolveAuctionWin(G, '0', henry);

  assert(p.psi === 32, `Instant 8 deflation immediately applied: 40 - 8 = 32 PSI`);
  assert(p.lineup.some(c => c.id === 'hunter_henry'), `Hunter Henry is in lineup`);

  // Calculate refresh results: Hunter Henry's +3 inflation should be ignored!
  calculateRefreshResults(G);
  assert(p.psi === 32, `Hunter Henry's +3 recurring inflation was ignored on first refresh (PSI remains 32)`);
}

// ----------------------------------------------------------------------------
// TEST 4: Broncos Lineup Replacement Hierarchy (Drawback Cards Cut First)
// ----------------------------------------------------------------------------
console.log('\nTest 4: Broncos Lineup Replacement Hierarchy');
{
  const p = {
    id: '0',
    team: broncosTeam,
    psi: 32,
    coins: 16,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...bowers, uniqueId: 'starter_bowers' },
      { ...henry, uniqueId: 'starter_henry' },
      { ...cousins, uniqueId: 'starter_cousins' }
    ]
  };

  const G = {
    board: {
      round: 2,
      highestBid: 3,
      highestBidder: '0',
      activeAuctionCardIndex: 0,
      auctionPlayers: [kyren]
    },
    players: { '0': p },
    decks: { discard: [] },
    numHumans: 0
  };

  // Win Kyren Williams when lineup is full (Bowers, Henry, Cousins)
  resolveAuctionWin(G, '0', kyren);

  // Henry has recurring inflation, scored -300 in lineup replacement, so Henry MUST be cut!
  assert(!p.lineup.some(c => c.id === 'hunter_henry'), `Hunter Henry was cut to make room for Kyren Williams`);
  assert(p.lineup.some(c => c.id === 'brock_bowers'), `Brock Bowers was retained`);
  assert(p.lineup.some(c => c.id === 'kirk_cousins'), `Kirk Cousins was retained`);
  assert(p.lineup.some(c => c.id === 'kyren_williams'), `Kyren Williams was inserted`);
  assert(G.decks.discard.some(c => c.id === 'hunter_henry'), `Hunter Henry sent to discard pile with zero ongoing drawback`);
}

// ----------------------------------------------------------------------------
// TEST 5: Broncos Bidding Aggression & Early Purse Unleash (Rounds 1-2)
// ----------------------------------------------------------------------------
console.log('\nTest 5: Broncos Bidding Aggression & Early Purse Unleash');
{
  const p0 = {
    id: '0',
    team: broncosTeam,
    psi: 40,
    coins: 20,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
    ]
  };

  const p1 = {
    id: '1',
    team: TEAMS.find(t => t.id === 'chiefs'),
    psi: 42,
    coins: 10,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.chiefs,
    lineup: []
  };

  const G = {
    board: {
      round: 1,
      highestBid: 6,
      highestBidder: '1',
      activeAuctionCardIndex: 0,
      auctionPlayers: [bowers],
      passedAuctionPlayers: []
    },
    players: { '0': p0, '1': p1 }
  };

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(decision.shouldBid === true, `Broncos bids against opponent on Brock Bowers`);
  assert(decision.bidAmount > 6, `Broncos outbids 6 coins (bidAmount: ${decision.bidAmount})`);
  assert(decision.bidAmount <= 14, `Broncos respects bully bid cap of 14 (bidAmount: ${decision.bidAmount})`);
}

// ----------------------------------------------------------------------------
// TEST 6: Broncos Nomination Strategy
// ----------------------------------------------------------------------------
console.log('\nTest 6: Broncos Nomination Strategy');
{
  const p = {
    id: '0',
    team: broncosTeam,
    psi: 40,
    coins: 20,
    isCpu: true,
    genome: ACTIVE_TEAM_GENOMES.broncos,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
    ]
  };

  const genericScrub = { id: 'generic_scrub', name: 'Generic Scrub', minBid: 1, maxBid: 4, phase: 1, effects: [{ type: 'coins', amount: 1, perRound: false }] };

  // Case A: Hunter Henry available in Round 1
  const GA = {
    board: {
      round: 1,
      auctionPlayers: [genericScrub, henry, genericScrub]
    },
    players: { '0': p }
  };
  const nomIdxA = chooseCpuNominationCard(GA, '0');
  assert(nomIdxA === 1, `Broncos nominates Hunter Henry for pump-and-dump (index 1)`);

  // Case B: Brock Bowers available in Round 1
  const GB = {
    board: {
      round: 1,
      auctionPlayers: [genericScrub, genericScrub, bowers]
    },
    players: { '0': p }
  };
  const nomIdxB = chooseCpuNominationCard(GB, '0');
  assert(nomIdxB === 2, `Broncos nominates Brock Bowers as R1 anchor centerpiece (index 2)`);

  // Case C: Endgame closer (PSI <= 16)
  p.psi = 12;
  const GC = {
    board: {
      round: 6,
      auctionPlayers: [genericScrub, kyren, genericScrub]
    },
    players: { '0': p }
  };
  const nomIdxC = chooseCpuNominationCard(GC, '0');
  assert(nomIdxC === 1, `Broncos nominates instant deflation closer when PSI <= 16 (index 1)`);
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log('🎉 ALL PLAYTEST 49 BRONCOS TESTS PASSED SUCCESSFULLY!');
} else {
  process.exitCode = 1;
}
