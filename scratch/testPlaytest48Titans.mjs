import {
  advanceTitansDraftQueue,
  scoreCardForPlayer,
  evaluateCpuAuctionBid,
  resolveAuctionWin,
  applyCoinsGained,
  applyPsiDeflated
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== TEST SUITE: PLAYTEST 48 - TITANS DRAFT & UNIVERSAL CYCLE STRATEGY ===\n');

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

// ----------------------------------------------------------------------------
// TEST 1: Titans Opening Draft CPU Selection (BPA with Recurring Priority, Zero Poison)
// ----------------------------------------------------------------------------
console.log('Test 1: Titans Opening Draft CPU Selection');
{
  const titansTeam = TEAMS.find(t => t.id === 'titans');
  const bowers = PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers'); // 2 rec deflate, 2 inst deflate
  const henry = { id: 'hunter_henry', name: 'Hunter Henry', effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] };
  const odunze = PHASE_1_PLAYERS.find(p => p.id === 'rome_odunze'); // 5 inst coins

  const G = {
    board: {
      round: 1,
      titansDraftQueue: ['0'],
      titansDraftComplete: false
    },
    decks: {
      activePlayers: [bowers, henry, odunze] // top 3 will be popped in reverse: odunze, henry, bowers
    },
    players: {
      '0': {
        id: '0',
        team: titansTeam,
        psi: 44,
        coins: 7,
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.titans,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };

  advanceTitansDraftQueue(G, {});

  const draftedCard = G.players['0'].lineup.find(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  assert(draftedCard && draftedCard.id === 'brock_bowers', `Titans drafted Brock Bowers (BPA engine), avoiding toxic Hunter Henry. Drafted: ${draftedCard?.name}`);
  assert(G.players['0'].psi === 42, `Titans instant deflation from Brock Bowers (-2) applied: PSI is now 42 (was 44)`);
}

// ----------------------------------------------------------------------------
// TEST 2: Titans Opening Draft Instant Coins Application (e.g. Odunze)
// ----------------------------------------------------------------------------
console.log('\nTest 2: Instant Coins Application on Opening Draft');
{
  const titansTeam = TEAMS.find(t => t.id === 'titans');
  const odunze = PHASE_1_PLAYERS.find(p => p.id === 'rome_odunze'); // 5 inst coins
  const hubbard = PHASE_1_PLAYERS.find(p => p.id === 'chuba_hubbard'); // 2 inst deflate
  const legette = PHASE_1_PLAYERS.find(p => p.id === 'xavier_legette'); // 2 inst coins

  const G = {
    board: {
      round: 1,
      titansDraftQueue: ['0'],
      titansDraftComplete: false
    },
    decks: {
      activePlayers: [legette, hubbard, odunze]
    },
    players: {
      '0': {
        id: '0',
        team: titansTeam,
        psi: 44,
        coins: 7,
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.titans,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };

  advanceTitansDraftQueue(G, {});

  const draftedCard = G.players['0'].lineup.find(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  assert(draftedCard && draftedCard.id === 'rome_odunze', `Titans drafted Rome Odunze (5 instant coins) when no recurring engine available`);
  assert(G.players['0'].coins === 12, `Titans gained 5 instant coins upon drafting Odunze (7 + 5 = 12 coins)`);
}

// ----------------------------------------------------------------------------
// TEST 3: Universal Cycle Strategy in scoreCardForPlayer
// ----------------------------------------------------------------------------
console.log('\nTest 3: Universal Cycle Strategy in scoreCardForPlayer');
{
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  const bowers = PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers');
  const kittle = PHASE_1_PLAYERS.find(p => p.id === 'george_kittle');
  const kyren = PHASE_1_PLAYERS.find(p => p.id === 'kyren_williams'); // 4 instant deflate
  const ordinaryFiller = PHASE_1_PLAYERS.find(p => p.id === 'dalton_schultz'); // 1 deflate/rd

  // Case A: Team has 0 engines (3 Practice Squad)
  const G_noEngines = {
    board: { round: 2 },
    players: {
      '0': {
        id: '0',
        team: billsTeam,
        psi: 40,
        coins: 10,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };
  const scoreKyrenEarly = scoreCardForPlayer(G_noEngines, '0', kyren);

  // Case B: Team has 2 recurring engines (Bowers + Kittle + 1 PS)
  const G_twoEngines = {
    board: { round: 2 },
    players: {
      '0': {
        id: '0',
        team: billsTeam,
        psi: 40,
        coins: 10,
        lineup: [
          bowers,
          kittle,
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };
  const scoreKyrenCycle = scoreCardForPlayer(G_twoEngines, '0', kyren);
  assert(scoreKyrenCycle > scoreKyrenEarly + 10, `Instant deflation nuke (Kyren Williams) scores significantly higher when team has 2 engines (${scoreKyrenCycle} vs ${scoreKyrenEarly})`);

  // Case C: Weak recurring filler is de-prioritized when 2 engines are already locked
  const scoreFiller = scoreCardForPlayer(G_twoEngines, '0', ordinaryFiller);
  assert(scoreKyrenCycle > scoreFiller, `Cycle instant nuke (${scoreKyrenCycle}) is favored over weak 1-deflate redundant recurring filler (${scoreFiller})`);
}

// ----------------------------------------------------------------------------
// TEST 4: Universal Lineup Replacement Hierarchy (Practice Squad -> Cycle Spot -> Engines Protected)
// ----------------------------------------------------------------------------
console.log('\nTest 4: Universal Lineup Replacement Hierarchy');
{
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  const bowers = { ...PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers'), uniqueId: 'bowers_1' };
  const kittle = { ...PHASE_1_PLAYERS.find(p => p.id === 'george_kittle'), uniqueId: 'kittle_1' };
  const kyren = { ...PHASE_1_PLAYERS.find(p => p.id === 'kyren_williams'), uniqueId: 'kyren_1' }; // instant card (consumed)
  const aaronJones = { id: 'aaron_jones', name: 'Aaron Jones', minBid: 1, maxBid: 8, effects: [{ type: 'deflate', amount: 7, perRound: false }] };

  // Case A: Lineup has Bowers, Kittle, and Practice Squad. Acquired Aaron Jones.
  const G_hasPS = {
    board: { round: 3, highestBid: 3 },
    decks: { discard: [] },
    players: {
      '0': {
        id: '0',
        team: billsTeam,
        coins: 10,
        psi: 38,
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.bills,
        lineup: [
          bowers,
          kittle,
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };

  resolveAuctionWin(G_hasPS, '0', aaronJones, 3);
  assert(G_hasPS.players['0'].lineup.some(c => c.id === 'aaron_jones'), 'Aaron Jones successfully added to lineup');
  assert(!G_hasPS.players['0'].lineup.some(c => c.isPracticeSquad), 'Practice Squad was the card replaced (scored at -200)');
  assert(G_hasPS.players['0'].lineup.some(c => c.id === 'brock_bowers') && G_hasPS.players['0'].lineup.some(c => c.id === 'george_kittle'), 'Core recurring engines (Bowers & Kittle) permanently preserved!');

  // Case B: Lineup has Bowers, Kittle, and consumed cycle card (Aaron Jones). Acquired Derrick Henry.
  const derrickHenry = { id: 'derrick_henry', name: 'Derrick Henry', minBid: 1, maxBid: 12, effects: [{ type: 'deflate', amount: 9, perRound: false }] };
  resolveAuctionWin(G_hasPS, '0', derrickHenry, 5);

  assert(G_hasPS.players['0'].lineup.some(c => c.id === 'derrick_henry'), 'Derrick Henry successfully added to lineup');
  assert(!G_hasPS.players['0'].lineup.some(c => c.id === 'aaron_jones'), 'Consumed cycle card (Aaron Jones) was replaced (scored at -100)');
  assert(G_hasPS.players['0'].lineup.some(c => c.id === 'brock_bowers') && G_hasPS.players['0'].lineup.some(c => c.id === 'george_kittle'), 'Core recurring engines (Bowers & Kittle) STILL permanently preserved!');
}

// ----------------------------------------------------------------------------
// TEST 5: Titans Round 1 Anchor Bidding & Exemption from 65% Purse Clamp
// ----------------------------------------------------------------------------
console.log('\nTest 5: Titans Round 1 Anchor Bidding & Bankroll Conviction');
{
  const titansTeam = TEAMS.find(t => t.id === 'titans');
  const bowers = PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers');
  const goedert = PHASE_1_PLAYERS.find(p => p.id === 'dallas_goedert');

  const G = {
    board: {
      round: 1,
      highestBid: 5,
      highestBidder: '1',
      passedAuctionPlayers: [],
      auctionPlayers: [goedert],
      activeAuctionCardIndex: 0
    },
    players: {
      '0': {
        id: '0',
        team: titansTeam,
        psi: 42,
        coins: 7, // starting purse
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.titans,
        lineup: [
          bowers, // 1 good engine from opening draft!
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ],
        cardsWonThisRound: 0
      },
      '1': {
        id: '1',
        coins: 10,
        cardsWonThisRound: 0
      }
    }
  };

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(decision.shouldBid === true, 'Titans bids when opponent bids 5 on Dallas Goedert to complete 2-engine setup');
  assert(decision.bidAmount >= 6, `Titans bids 6 or 7 coins (got: ${decision.bidAmount}), exempt from generic 5-coin clamp`);
}

// ----------------------------------------------------------------------------
// TEST 6: Titans Round 1 Viability of Instant Card when 1 Engine Held
// ----------------------------------------------------------------------------
console.log('\nTest 6: Titans Round 1 Instant Card Viability');
{
  const titansTeam = TEAMS.find(t => t.id === 'titans');
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  const bowers = PHASE_1_PLAYERS.find(p => p.id === 'brock_bowers');
  const kyren = PHASE_1_PLAYERS.find(p => p.id === 'kyren_williams');

  // Bills: 3 Practice Squads in R1
  const G_bills = {
    board: { round: 1 },
    players: {
      '1': {
        id: '1',
        team: billsTeam,
        psi: 44,
        coins: 10,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_2' }
        ]
      }
    }
  };

  // Titans: 1 Bowers (engine) + 2 PS in R1
  const G_titans = {
    board: { round: 1 },
    players: {
      '0': {
        id: '0',
        team: titansTeam,
        psi: 42,
        coins: 7,
        lineup: [
          bowers,
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ]
      }
    }
  };

  const scoreBills = scoreCardForPlayer(G_bills, '1', kyren);
  const scoreTitans = scoreCardForPlayer(G_titans, '0', kyren);
  assert(scoreTitans > scoreBills, `Titans evaluates instant card higher than generic team in Round 1 (${scoreTitans} vs ${scoreBills}) because Titans already has 1 engine`);
}

console.log(`\n======================================================`);
console.log(`TITANS & CYCLE STRATEGY TESTS: ${passedTests}/${totalTests} PASSED`);
console.log(`======================================================\n`);
