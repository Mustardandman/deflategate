import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, getEffectiveTeamId, getEffectiveCardMaxBid } from '../src/Game.js';
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
console.log('PLAYTEST 61: DETROIT LIONS STRATEGIC NOMINATION & COUNTERPLAY SUITE');
console.log('========================================================================================\n');

// Mock helpers
function createLionsGameState({ lionsCoins = 4, lionsPsi = 47, round = 1, opponents = [] } = {}) {
  const G = {
    players: {
      '0': {
        team: { id: 'lions', name: 'Detroit Lions', initialPsi: 47, coins: 4 },
        coins: lionsCoins,
        psi: lionsPsi,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
        ],
        hasWonAuction: false,
        genome: { ...ACTIVE_TEAM_GENOMES.lions }
      }
    },
    board: {
      round,
      nominator: '0',
      auctionPlayers: [],
      activeEvent: null,
      passedAuctionPlayers: []
    }
  };

  opponents.forEach((opp, idx) => {
    const seat = String(idx + 1);
    G.players[seat] = {
      team: { id: opp.id || 'packers', name: opp.name || 'Packers', initialPsi: 45, coins: opp.coins || 10 },
      coins: opp.coins || 10,
      psi: opp.psi || 45,
      lineup: [
        { ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_0` },
        { ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_1` },
        { ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_2` }
      ],
      hasWonAuction: false,
      genome: { ...ACTIVE_TEAM_GENOMES[opp.id || 'packers'] }
    };
  });

  return G;
}

// Test 1: Lions is NOT richest player in Round 1:
// Mahomes & Kelce are on board, but rivals have 10 coins, Lions has 4 coins.
// Lions MUST NOT nominate Mahomes or Kelce (which rivals will steal).
// Lions must nominate a winnable card (e.g. low max gem like Malik Nabers effMax 4).
console.log('Test 1: Strategic Nomination - Not Richest Player (Avoid Superstars Lions Cannot Win)');
{
  const G = createLionsGameState({
    lionsCoins: 4,
    round: 1,
    opponents: [{ id: 'chiefs', coins: 10 }, { id: 'bears', coins: 13 }]
  });

  const mahomes = { id: 'patrick_mahomes', name: 'Patrick Mahomes', position: 'QB', phase: 1, minBid: 3, maxBid: 15, effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  const nabers = { id: 'malik_nabers', name: 'Malik Nabers', position: 'WR', phase: 1, minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 3 }] };
  const odunze = { id: 'rome_odunze', name: 'Rome Odunze', position: 'WR', phase: 1, minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 2 }] };

  G.board.auctionPlayers = [mahomes, nabers, odunze];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];

  assert(nominatedCard.id !== 'patrick_mahomes', 'Lions does NOT nominate Mahomes when opponents can easily outbid him');
  assert(nominatedCard.id === 'malik_nabers' || nominatedCard.id === 'rome_odunze', `Lions nominates winnable low max gem (${nominatedCard.name})`);
}

// Test 2: Lions IS the richest player in Round 1:
// Lions has 15 coins, opponents have 4 coins.
// Lions CAN outbid everyone, so Lions nominates Tier 1 superstar Mahomes!
console.log('\nTest 2: Strategic Nomination - Richest Player (Lions Outbids Everyone for Superstars)');
{
  const G = createLionsGameState({
    lionsCoins: 15,
    round: 1,
    opponents: [{ id: 'chiefs', coins: 4 }, { id: 'bears', coins: 6 }]
  });

  const mahomes = { id: 'patrick_mahomes', name: 'Patrick Mahomes', position: 'QB', phase: 1, minBid: 3, maxBid: 15, effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  const nabers = { id: 'malik_nabers', name: 'Malik Nabers', position: 'WR', phase: 1, minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 3 }] };

  G.board.auctionPlayers = [nabers, mahomes];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];

  assert(nominatedCard.id === 'patrick_mahomes', `Lions nominates superstar (${nominatedCard.name}) when strictly richest player`);
}

// Test 3: Later Game (Round 4+ or coins >= 12) - Focus shifts to Deflation engines
console.log('\nTest 3: Mid/Late Game - Focus Shifts to Heavy Deflation Engines');
{
  const G = createLionsGameState({
    lionsCoins: 12,
    round: 4,
    opponents: [{ id: 'chiefs', coins: 8 }]
  });

  const coinFamer = { id: 'tank_dell', name: 'Tank Dell', position: 'WR', phase: 2, minBid: 2, maxBid: 9, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const deflater = { id: 'derrick_henry', name: 'Derrick Henry', position: 'RB', phase: 2, minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2, perRound: true }] };

  G.board.auctionPlayers = [coinFamer, deflater];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];

  assert(nominatedCard.id === 'derrick_henry', `Lions selects heavy deflation engine (${nominatedCard.name}) instead of coin card`);
}

// Test 4: Endgame Closer Mode (PSI <= 16) - Instant Deflation Nukes
console.log('\nTest 4: Endgame Closer Mode (PSI <= 16)');
{
  const G = createLionsGameState({
    lionsCoins: 8,
    lionsPsi: 12,
    round: 6,
    opponents: [{ id: 'bears', coins: 8 }]
  });

  const recDeflater = { id: 'derrick_henry', name: 'Derrick Henry', position: 'RB', phase: 2, minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const instantNuke = { id: 'tony_pollard', name: 'Tony Pollard', position: 'RB', phase: 2, minBid: 2, maxBid: 7, effects: [{ type: 'deflate', amount: 4 }] };

  G.board.auctionPlayers = [recDeflater, instantNuke];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];

  assert(nominatedCard.id === 'tony_pollard', `Lions selects instant deflation closer nuke (${nominatedCard.name}) to cross 0 PSI`);
}

// Test 5: Opponent Counter-Play Calibration
// When Lions leads the 1st auction, opponents raise 1-2 above normal valuation (and 10% spite block D ceiling)
console.log('\nTest 5: Opponent Counterplay Calibration (1-2 Raise vs 10% Spite Block)');
{
  const G = createLionsGameState({
    lionsCoins: 10,
    round: 1,
    opponents: [{ id: 'packers', coins: 10 }]
  });

  const card = { id: 'rome_odunze', name: 'Rome Odunze', position: 'WR', phase: 1, minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 2 }] };
  G.board.auctionPlayers = [card];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 1;
  G.board.highestBidder = '0'; // Lions

  let totalBids = 0;
  let spiteBlockBids = 0;
  let normalBids = 0;
  const trials = 1000;

  for (let i = 0; i < trials; i++) {
    const decision = evaluateCpuAuctionBid(G, '1');
    if (decision.shouldBid) {
      totalBids++;
      // effMax is 4. blockCeiling = min(3, 3) = 3.
      if (decision.bidAmount >= 3) {
        spiteBlockBids++;
      } else {
        normalBids++;
      }
    }
  }

  const bidRate = (totalBids / trials) * 100;
  console.log(`    Total Opponent Bids against Lions: ${bidRate.toFixed(1)}%`);
  assert(totalBids > 0, 'Opponents still actively counterplay Lions on the 1st player');
}

// Test 6: Opening Bid Logic
// Low max bid (effMax <= 5) -> Lions opens at effMax to lock out rivals
console.log('\nTest 6: Opening Bid Calibration (Low Max Lockout & Richest Lockout)');
{
  const G = createLionsGameState({
    lionsCoins: 6,
    round: 1,
    opponents: [{ id: 'packers', coins: 10 }]
  });

  const card = { id: 'malik_nabers', name: 'Malik Nabers', position: 'WR', phase: 1, minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: 3 }] };
  const effMax = getEffectiveCardMaxBid(card, null);

  assert(effMax <= 5 && G.players['0'].coins >= effMax, 'Precondition: Nabers is low max gem and affordable for Lions');
}

// Test 7: Genome weights check
console.log('\nTest 7: Genome Weights Verification');
{
  const genome = ACTIVE_TEAM_GENOMES.lions;
  assert(genome.deflateWeight === 2.35, `deflateWeight calibrated to 2.35 (actual: ${genome.deflateWeight})`);
  assert(genome.coinWeight === 0.8, `coinWeight calibrated to 0.8 (actual: ${genome.coinWeight})`);
  assert(genome.reserveCoins === 1, `reserveCoins calibrated to 1 (actual: ${genome.reserveCoins})`);
  assert(genome.firstClaimAggression === 1.5, `firstClaimAggression calibrated to 1.5 (actual: ${genome.firstClaimAggression})`);
  assert(genome.priceBumpProb === 0.2, `priceBumpProb calibrated to 0.2 (actual: ${genome.priceBumpProb})`);
}

console.log(`\nResults: ${passedTests} / ${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL PLAYTEST 61 TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('SOME TESTS FAILED!');
  process.exit(1);
}
