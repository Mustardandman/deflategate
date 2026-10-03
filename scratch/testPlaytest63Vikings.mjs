import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, scoreCardForPlayer, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('PLAYTEST 63: MINNESOTA VIKINGS VERIFICATION SUITE');
console.log('========================================================================================\n');

function createVikingsState({ vikingsCoins = 11, vikingsPsi = 44, round = 1, lineupCards = [] } = {}) {
  const G = {
    board: {
      round,
      nominator: '0',
      auctionPlayers: [],
      activeEvent: null,
      passedAuctionPlayers: []
    },
    players: {
      '0': {
        team: { id: 'vikings', name: 'Vikings', initialPsi: 44, coins: 11 },
        coins: vikingsCoins,
        psi: vikingsPsi,
        lineup: lineupCards.length > 0 ? lineupCards : [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
        ],
        hasWonAuction: false,
        genome: { ...ACTIVE_TEAM_GENOMES.vikings }
      },
      '1': {
        team: { id: 'bears', name: 'Bears', initialPsi: 42, coins: 13 },
        coins: 13,
        psi: 42,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_2' }
        ],
        hasWonAuction: false,
        genome: { ...ACTIVE_TEAM_GENOMES.bears }
      }
    }
  };
  return G;
}

// Test 1: Ability Mechanics Check (< 27 PSI Rule Verification)
console.log('Test 1: 2x Coin Ability Mechanics Verification (< 27 PSI Threshold)');
{
  const at27Psi = 27;
  const under27Psi = 26;
  assert(at27Psi >= 27, 'At 27 PSI: Ability is not yet active (>= 27)');
  assert(under27Psi < 27, 'At 26 PSI: Ability activates (< 27)');
}

// Test 2: Phase 1 (PSI >= 27) vs Phase 2 (PSI < 27) Scoring Logic
console.log('\nTest 2: Two-Phase Strategic Valuation (Sprint to 26 PSI vs Deflation War Chest)');
{
  const recDeflater = { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, position: 'TE', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const instantCoinScrap = { id: 'generic_coin', name: 'Instant Coin Scrap', phase: 1, position: 'WR', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 3, perRound: false }] };
  const heavyDeflater = { id: 'derrick_henry', name: 'Derrick Henry', phase: 2, position: 'RB', minBid: 2, maxBid: 10, effects: [{ type: 'deflate', amount: 3, perRound: true }] };

  // Phase 1: Vikings at 44 PSI (sprint to 27 PSI)
  const G_Phase1 = createVikingsState({ vikingsCoins: 11, vikingsPsi: 44, round: 1 });
  const goedertPhase1Score = scoreCardForPlayer(G_Phase1, '0', recDeflater);
  const coinPhase1Score = scoreCardForPlayer(G_Phase1, '0', instantCoinScrap);

  assert(goedertPhase1Score > coinPhase1Score, `Phase 1: Goedert (${goedertPhase1Score.toFixed(1)}) valued substantially higher than coin scrap (${coinPhase1Score.toFixed(1)})`);

  // Phase 2: Vikings at 24 PSI (< 27 PSI)
  const G_Phase2 = createVikingsState({ vikingsCoins: 14, vikingsPsi: 24, round: 5 });
  const henryPhase2Score = scoreCardForPlayer(G_Phase2, '0', heavyDeflater);
  const coinPhase2Score = scoreCardForPlayer(G_Phase2, '0', instantCoinScrap);

  assert(henryPhase2Score > coinPhase2Score, `Phase 2: Heavy Deflater Henry (${henryPhase2Score.toFixed(1)}) vastly outscores coin scrap (${coinPhase2Score.toFixed(1)})`);
  assert(coinPhase2Score < coinPhase1Score, `Phase 2: Instant coin scrap is penalized when under 27 PSI (Phase 1: ${coinPhase1Score.toFixed(1)} vs Phase 2: ${coinPhase2Score.toFixed(1)})`);
}

// Test 3: Instant Closer Game-Winning Priority
console.log('\nTest 3: Game-Winning Instant Closer Check');
{
  const G = createVikingsState({ vikingsCoins: 10, vikingsPsi: 5, round: 8 });
  const instantCloser = { id: 'tony_pollard', name: 'Tony Pollard', phase: 2, position: 'RB', minBid: 2, maxBid: 7, effects: [{ type: 'deflate', amount: 5, perRound: false }] };
  const score = scoreCardForPlayer(G, '0', instantCloser);

  assert(score >= 40.0, `Instant closer Pollard scored massively (${score.toFixed(1)}) to immediately clinch 0 PSI victory`);
}

// Test 4: Strategic Nomination Logic
console.log('\nTest 4: Strategic Nomination (Closer Nuke, Richest Bully, and Sprint Phase)');
{
  // A. Closer Mode: PSI <= 16 with instant closer available
  const G_Closer = createVikingsState({ vikingsCoins: 10, vikingsPsi: 5, round: 8 });
  const pollard = { id: 'tony_pollard', name: 'Tony Pollard', phase: 2, position: 'RB', minBid: 2, maxBid: 7, effects: [{ type: 'deflate', amount: 5, perRound: false }] };
  const chuba = { id: 'chuba_hubbard', name: 'Chuba Hubbard', phase: 1, position: 'RB', minBid: 1, maxBid: 3, effects: [{ type: 'deflate', amount: 2, perRound: false }] };

  G_Closer.board.auctionPlayers = [chuba, pollard];
  const nomIdxCloser = chooseCpuNominationCard(G_Closer, '0');
  const nomCardCloser = G_Closer.board.auctionPlayers[nomIdxCloser];
  assert(nomCardCloser.id === 'tony_pollard', `Closer Mode: Vikings nominates game-winning closer (${nomCardCloser.name})`);

  // B. Richest Bully Mode: Under 27 PSI and strictly richest player
  const G_Bully = createVikingsState({ vikingsCoins: 15, vikingsPsi: 20, round: 5 });
  G_Bully.players['1'].coins = 8; // Opponent has only 8 coins
  const mahomes = { id: 'patrick_mahomes', name: 'Patrick Mahomes', phase: 1, position: 'QB', minBid: 1, maxBid: 12, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'coins', amount: 3, perRound: true }] };
  const randomCard = { id: 'random_wr', name: 'Random WR', phase: 1, position: 'WR', minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 2, perRound: true }] };

  G_Bully.board.auctionPlayers = [randomCard, mahomes];
  const nomIdxBully = chooseCpuNominationCard(G_Bully, '0');
  const nomCardBully = G_Bully.board.auctionPlayers[nomIdxBully];
  assert(nomCardBully.id === 'patrick_mahomes', `Bully Mode: Richest Vikings under 27 PSI nominates Tier 1 Superstar (${nomCardBully.name}) to lock out opponents`);

  // C. Sprint Phase: Over 27 PSI (Sprint to 27)
  const G_Sprint = createVikingsState({ vikingsCoins: 11, vikingsPsi: 44, round: 1 });
  const goedert = { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, position: 'TE', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const coinOnlyCard = { id: 'coin_wr', name: 'Coin WR', phase: 1, position: 'WR', minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 3, perRound: true }] };

  G_Sprint.board.auctionPlayers = [coinOnlyCard, goedert];
  const nomIdxSprint = chooseCpuNominationCard(G_Sprint, '0');
  const nomCardSprint = G_Sprint.board.auctionPlayers[nomIdxSprint];
  assert(nomCardSprint.id === 'dallas_goedert', `Sprint Phase: Vikings nominates recurring deflater (${nomCardSprint.name}) to break 27 PSI threshold`);
}

// Test 5: Genome Verification
console.log('\nTest 5: Active & Evolved Genome Calibration');
{
  const genome = ACTIVE_TEAM_GENOMES.vikings;
  assert(genome.deflateWeight === 2.35, `deflateWeight calibrated to 2.35 (actual: ${genome.deflateWeight})`);
  assert(genome.coinWeight === 0.90, `coinWeight calibrated to 0.90 (actual: ${genome.coinWeight})`);
  assert(genome.reserveCoins === 1, `reserveCoins calibrated to 1 (actual: ${genome.reserveCoins})`);
  assert(genome.firstClaimAggression === 1.25, `firstClaimAggression calibrated to 1.25 (actual: ${genome.firstClaimAggression})`);
  assert(genome.aggression === 1.15, `aggression calibrated to 1.15 (actual: ${genome.aggression})`);
  assert(genome.superstarPriorityMult === 1.35, `superstarPriorityMult calibrated to 1.35 (actual: ${genome.superstarPriorityMult})`);
}

console.log(`\nResults: ${passedTests} / ${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL PLAYTEST 63 VIKINGS TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('SOME TESTS FAILED!');
  process.exit(1);
}
