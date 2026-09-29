import assert from 'assert';
import { 
  DeflategateGame, 
  scoreCardForPlayer, 
  chooseCpuNominationCard, 
  evaluateCpuAuctionBid, 
  resolveAuctionWin, 
  getEffectiveCardMaxBid 
} from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Running Playtest 41: Jets AI Verification Suite ===\n');

function createMockJetsGameState(jetsCoins = 7, jetsPsi = 44, round = 1) {
  const G = {
    players: {
      '0': {
        id: '0',
        team: TEAMS.find(t => t.id === 'jets'),
        coins: jetsCoins,
        psi: jetsPsi,
        lineup: [
          { id: 'ps_1', name: 'Practice Squad 1', position: 'WR', effects: [] },
          { id: 'ps_2', name: 'Practice Squad 2', position: 'RB', effects: [] },
          { id: 'ps_3', name: 'Practice Squad 3', position: 'TE', effects: [] },
          { id: 'ps_4', name: 'Practice Squad 4', position: 'QB', effects: [] }
        ],
        isCpu: true,
        cardsWonThisRound: 0,
        genome: { ...ACTIVE_TEAM_GENOMES.jets, jetsMaxBidGap: 3 }
      },
      '1': {
        id: '1',
        team: TEAMS.find(t => t.id === 'patriots'),
        coins: 7,
        psi: 36,
        lineup: [],
        isCpu: true,
        cardsWonThisRound: 0,
        genome: { ...ACTIVE_TEAM_GENOMES.patriots }
      },
      '2': {
        id: '2',
        team: TEAMS.find(t => t.id === 'bills'),
        coins: 8,
        psi: 40,
        lineup: [],
        isCpu: true,
        cardsWonThisRound: 0,
        genome: { ...ACTIVE_TEAM_GENOMES.bills }
      }
    },
    board: {
      round,
      firstPlayer: '0',
      nominator: '0',
      highestBid: 0,
      highestBidder: null,
      passedAuctionPlayers: [],
      auctionPlayers: [],
      activeAuctionCardIndex: 0,
      activeEvent: null,
      log: []
    },
    decks: {
      discard: []
    }
  };
  return G;
}

// 1. Small Max Gem Test: Rome Odunze / Malik Nabers (max 3, gain 5 instant coins)
console.log('Test 1: Small Max Gem (Rome Odunze/Malik Nabers - Max 3, gain 5 instant coins)');
{
  const G = createMockJetsGameState(5, 44, 1);
  const odunze = {
    id: 'rome_odunze',
    name: 'Rome Odunze',
    position: 'WR',
    minBid: 1,
    maxBid: 3,
    phase: 1,
    effects: [{ type: 'coins', amount: 5, perRound: false }]
  };
  G.board.auctionPlayers = [odunze];
  G.board.highestBid = 1;
  G.board.highestBidder = '1';

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log('  Bid Decision for Odunze:', bidDecision);
  assert.strictEqual(bidDecision.shouldBid, true, 'Jets should bid on Rome Odunze');
  assert.strictEqual(bidDecision.bidAmount, 3, 'Jets should jump to max bid (3) for Rome Odunze');
  assert.strictEqual(bidDecision.isMaxBid, true, 'Jets bid should be marked as isMaxBid');

  // Verify resolution triggers Jets ability (-4 PSI)
  const initialPsi = G.players['0'].psi;
  G.board.highestBid = bidDecision.bidAmount;
  resolveAuctionWin(G, '0', odunze);
  console.log(`  Jets PSI before: ${initialPsi}, after: ${G.players['0'].psi} (-${initialPsi - G.players['0'].psi})`);
  assert.strictEqual(G.players['0'].psi, initialPsi - 4, 'Jets should deflate 4 PSI upon paying max bid');
  console.log('  -> PASS: Small Max Gem correctly bought out at max and deflated 4 PSI!\n');
}

// 2. Willing to Pay vs Max Bid Gap Rule: Small Gap (2-4 coins) -> Pay Max!
console.log('Test 2: Gap Rule - Small Gap (2-4 coins away) -> Trigger Max Buyout');
{
  const G = createMockJetsGameState(10, 40, 2);
  // A solid card with max bid 6
  const solidCard = {
    id: 'solid_deflater',
    name: 'Solid Deflater',
    position: 'RB',
    minBid: 2,
    maxBid: 6,
    phase: 1,
    effects: [{ type: 'deflate', amount: 2, perRound: true }]
  };
  G.board.auctionPlayers = [solidCard];
  G.board.highestBid = 2;
  G.board.highestBidder = '1';

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log('  Bid Decision for Solid Deflater (max 6):', bidDecision);
  assert.strictEqual(bidDecision.shouldBid, true, 'Jets should bid');
  assert.strictEqual(bidDecision.bidAmount, 6, 'Jets should pay max bid (6) because gap <= 3');
  assert.strictEqual(bidDecision.isMaxBid, true, 'Should be marked as isMaxBid');
  console.log('  -> PASS: Small gap triggered max buyout for 4 PSI bonus!\n');
}

// 3. Willing to Pay vs Max Bid Gap Rule: Large Gap (> 4 coins) -> DO NOT Pay Max!
console.log('Test 3: Gap Rule - Large Gap (9 coins away on a 15-coin player) -> DO NOT Pay Max');
{
  const G = createMockJetsGameState(15, 40, 2);
  // An expensive 15-coin card where fair valuation is ~5-6 coins
  const expensiveCard = {
    id: 'expensive_player',
    name: 'Expensive Veteran',
    position: 'TE',
    minBid: 3,
    maxBid: 15,
    phase: 2,
    effects: [{ type: 'deflate', amount: 2, perRound: true }]
  };
  G.board.auctionPlayers = [expensiveCard];
  G.board.highestBid = 3;
  G.board.highestBidder = '1';

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log('  Bid Decision for Expensive Veteran (max 15):', bidDecision);
  assert.strictEqual(bidDecision.shouldBid, true, 'Jets should bid within fair valuation');
  assert.notStrictEqual(bidDecision.bidAmount, 15, 'Jets should NOT pay max 15 when gap is huge');
  assert.ok(bidDecision.bidAmount <= 8, `Jets bid (${bidDecision.bidAmount}) should be reasonable, not 15`);
  console.log(`  -> PASS: Jets bid ${bidDecision.bidAmount} rationally instead of blowing 15 coins!\n`);
}

// 4. Championship / Endgame Buyout Trigger
console.log('Test 4: Championship Buyout Trigger (Jets at 4 PSI)');
{
  const G = createMockJetsGameState(12, 4, 4); // 4 PSI remaining
  const gameWinner = {
    id: 'big_star',
    name: 'Big Star',
    position: 'QB',
    minBid: 4,
    maxBid: 10,
    phase: 2,
    effects: [{ type: 'coins', amount: 2, perRound: true }]
  };
  G.board.auctionPlayers = [gameWinner];
  G.board.highestBid = 4;
  G.board.highestBidder = '1';

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log('  Championship Bid Decision:', bidDecision);
  assert.strictEqual(bidDecision.shouldBid, true, 'Jets should bid');
  assert.strictEqual(bidDecision.bidAmount, 10, 'Jets should pay max bid (10) for instant championship win');
  assert.strictEqual(bidDecision.isMaxBid, true, 'Should be marked as isMaxBid');
  console.log('  -> PASS: Championship buyout immediately executed to cross 0 PSI!\n');
}

// 5. Nomination Strategy: Small Max Buyouts & Cash Recovery Engine
console.log('Test 5: Jets Nomination Strategy');
{
  const G = createMockJetsGameState(8, 38, 1);
  const card1 = { id: 'big_wr', name: 'Big WR', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const card2 = { id: 'nabers', name: 'Malik Nabers', minBid: 1, maxBid: 3, phase: 1, effects: [{ type: 'coins', amount: 5, perRound: false }] };
  const card3 = { id: 'mid_rb', name: 'Mid RB', minBid: 2, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
  G.board.auctionPlayers = [card1, card2, card3];

  const nominatedIndex = chooseCpuNominationCard(G, '0');
  console.log('  Nominated Card Index:', nominatedIndex, 'Card:', G.board.auctionPlayers[nominatedIndex].name);
  assert.strictEqual(nominatedIndex, 1, 'Jets should nominate small max gem (Malik Nabers) first');

  // Test cash-recovery nomination when low on coins
  const G2 = createMockJetsGameState(2, 38, 2);
  const nonAffordable1 = { id: 'card_a', name: 'Card A', minBid: 4, maxBid: 8, phase: 1, effects: [] };
  const nonAffordable2 = { id: 'card_b', name: 'Card B', minBid: 5, maxBid: 10, phase: 1, effects: [] };
  const coinEngine = { id: 'cheap_coin_wr', name: 'Cheap Coin WR', minBid: 1, maxBid: 5, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] };
  G2.board.auctionPlayers = [nonAffordable1, nonAffordable2, coinEngine];

  const nomCashIdx = chooseCpuNominationCard(G2, '0');
  console.log('  Nominated Cash Card Index when low on coins:', nomCashIdx, 'Card:', G2.board.auctionPlayers[nomCashIdx]?.name);
  assert.strictEqual(nomCashIdx, 2, 'Jets should nominate affordable recurring coin engine when low on cash');
  console.log('  -> PASS: Nomination prioritization accurately reflects small max buyouts and cash rebuilding!\n');
}

console.log('=== ALL PLAYTEST 41 JETS TESTS PASSED SUCCESSFULLY! ===');
