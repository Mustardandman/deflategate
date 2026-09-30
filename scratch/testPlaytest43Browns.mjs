import { DeflategateGame, scoreCardForPlayer, evaluateCpuAuctionBid, chooseCpuNominationCard } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Running Playtest 43: Cleveland Browns AI Verification Suite ===\n');

// Helper setup
function createTestGame(round = 1, brownsCoins = 20, brownsPsi = 45) {
  const G = DeflategateGame.setup(
    { ctx: { numPlayers: 7 }, random: { _random: () => 0.5, Shuffle: a => a } },
    { numHumans: 0, vsCpu: true }
  );

  G.board.round = round;
  const brownsTeam = TEAMS.find(t => t.id === 'browns');
  G.players['0'].team = brownsTeam;
  G.players['0'].psi = brownsPsi;
  G.players['0'].coins = brownsCoins;
  G.players['0'].isCpu = true;
  G.players['0'].genome = { ...ACTIVE_TEAM_GENOMES.browns };

  return G;
}

// -------------------------------------------------------------
// Test 1: Start of Round 5 (+30 Coins)
// -------------------------------------------------------------
console.log('Test 1: Browns 30-Coin Bonus at Start of Round 5');
{
  const G = createTestGame(5, 5, 30);
  G.players['0'].hasBrownsBonus = false;

  // Trigger event phase onBegin
  if (DeflategateGame.phases.eventPhase?.onBegin) {
    DeflategateGame.phases.eventPhase.onBegin({
      G,
      ctx: { numPlayers: 7 },
      random: { Shuffle: a => a }
    });
  }

  const coinsAfter = G.players['0'].coins;
  const hasBonus = G.players['0'].hasBrownsBonus;
  console.log(`  Coins before: 5, Coins after: ${coinsAfter}, Bonus Flag: ${hasBonus}`);
  if (coinsAfter === 35 && hasBonus) {
    console.log('  -> PASS: Browns successfully received +30 coins at the start of Round 5!\n');
  } else {
    throw new Error(`FAIL: Expected 35 coins and true flag, got ${coinsAfter} and ${hasBonus}`);
  }
}

// -------------------------------------------------------------
// Test 2: Pure Coin Cards Rejection (Score <= -50 & 0 Bid)
// -------------------------------------------------------------
console.log('Test 2: Pure Coin Cards Rejection');
{
  const G = createTestGame(2, 16, 42);
  const pureCoinCard = {
    id: 'dk_metcalf',
    name: 'DK Metcalf',
    position: 'WR',
    phase: 2,
    minBid: 2,
    maxBid: 10,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };

  const score = scoreCardForPlayer(G, '0', pureCoinCard);
  G.board.auctionPlayers = [pureCoinCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 2;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  DK Metcalf Score for Browns: ${score}`);
  console.log(`  Bid Decision: shouldBid = ${bidDecision.shouldBid}, bidAmount = ${bidDecision.bidAmount}`);

  if (score <= -50 && !bidDecision.shouldBid) {
    console.log('  -> PASS: Pure coin card correctly scored <= -50 and Browns refused to bid!\n');
  } else {
    throw new Error(`FAIL: Browns should not value or bid on pure coin card`);
  }
}

// -------------------------------------------------------------
// Test 3: Phase 1 Crown Jewel (Brock Bowers Outbid up to 12-13 Coins)
// -------------------------------------------------------------
console.log('Test 3: Brock Bowers Phase 1 Priority Outbid');
{
  const G = createTestGame(1, 20, 45);
  const bowers = {
    id: 'brock_bowers',
    name: 'Brock Bowers',
    position: 'TE',
    phase: 1,
    minBid: 2,
    maxBid: 16,
    effects: [
      { type: 'deflate', amount: 2, perRound: true },
      { type: 'deflate', amount: 2, perRound: false }
    ]
  };

  G.board.auctionPlayers = [bowers];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 8;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  G.players['1'].coins = 15;
  G.players['1'].team = TEAMS.find(t => t.id === 'patriots');

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Bowers at nextBid=9 with 20 coins: shouldBid = ${bidDecision.shouldBid}, bidAmount = ${bidDecision.bidAmount}`);

  if (bidDecision.shouldBid && bidDecision.bidAmount >= 9) {
    console.log('  -> PASS: Browns actively outbids rivals for Brock Bowers in Round 1!\n');
  } else {
    throw new Error(`FAIL: Browns should aggressively bid on Brock Bowers in Round 1`);
  }
}

// -------------------------------------------------------------
// Test 4: Phase 1 Ordinary Deflater Discipline (Cap at 4-5 coins)
// -------------------------------------------------------------
console.log('Test 4: Ordinary Phase 1 Deflater Discipline (Bang-for-Buck)');
{
  const G = createTestGame(2, 15, 43);
  const ordinaryDeflater = {
    id: 'drake_london',
    name: 'Drake London',
    position: 'WR',
    phase: 1,
    minBid: 2,
    maxBid: 14,
    effects: [{ type: 'deflate', amount: 2, perRound: true }]
  };
  const alternateDeflater = {
    id: 'jordan_love',
    name: 'Jordan Love',
    position: 'QB',
    phase: 1,
    minBid: 1,
    maxBid: 8,
    effects: [{ type: 'deflate', amount: 1, perRound: true }]
  };

  G.board.auctionPlayers = [ordinaryDeflater, alternateDeflater];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 6; // nextBid = 7
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Ordinary deflater at nextBid=7: shouldBid = ${bidDecision.shouldBid}`);

  if (!bidDecision.shouldBid) {
    console.log('  -> PASS: Browns disciplined! Folds when price on ordinary deflater exceeds 4-5 coins.\n');
  } else {
    throw new Error(`FAIL: Browns overpaid for ordinary Phase 1 deflater`);
  }
}

// -------------------------------------------------------------
// Test 5: Solitary Star Scarcity & Walk-Away Ceiling
// -------------------------------------------------------------
console.log('Test 5: Solitary Star Scarcity & Walk-Away Ceiling');
{
  const G = createTestGame(5, 35, 28);
  const mahomes = {
    id: 'patrick_mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    phase: 2,
    minBid: 2,
    maxBid: 20,
    effects: [
      { type: 'deflate', amount: 5, perRound: true },
      { type: 'coins', amount: 3, perRound: true }
    ]
  };
  const pureCoin1 = { id: 'dk_metcalf', phase: 2, minBid: 2, maxBid: 10, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const pureCoin2 = { id: 'ceedee_lamb', phase: 2, minBid: 2, maxBid: 8, effects: [{ type: 'coins', amount: 5, perRound: true }] };

  G.board.auctionPlayers = [mahomes, pureCoin1, pureCoin2];
  G.board.activeAuctionCardIndex = 0;

  // Case A: At nextBid 15 with 35 coins, Browns should bid
  G.board.highestBid = 14;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  G.players['1'].coins = 30;
  G.players['1'].team = TEAMS.find(t => t.id === 'chiefs');
  const bid15 = evaluateCpuAuctionBid(G, '0');
  console.log(`  Mahomes as Solitary Star at nextBid=15: shouldBid = ${bid15.shouldBid}, bidAmount = ${bid15.bidAmount}`);

  // Case B: At nextBid 23 (above walk-away ceiling 22), Browns should walk away
  G.board.highestBid = 22;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  const bid23 = evaluateCpuAuctionBid(G, '0');
  console.log(`  Mahomes at crazy price nextBid=23: shouldBid = ${bid23.shouldBid}`);

  if (bid15.shouldBid && !bid23.shouldBid) {
    console.log('  -> PASS: Browns bids aggressively on solitary star but respects walk-away ceiling!\n');
  } else {
    throw new Error(`FAIL: Expected bid at 15 and walk-away at 23`);
  }
}

// -------------------------------------------------------------
// Test 6: Browns Nomination Strategy
// -------------------------------------------------------------
console.log('Test 6: Browns Nomination Strategy');
{
  const G = createTestGame(1, 20, 45);
  const bowers = { id: 'brock_bowers', phase: 1, minBid: 2, maxBid: 16, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
  const pureCoin = { id: 'dk_metcalf', phase: 1, minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const cheapDeflater = { id: 'jordan_love', phase: 1, minBid: 1, maxBid: 8, effects: [{ type: 'deflate', amount: 1, perRound: true }] };

  G.board.auctionPlayers = [pureCoin, bowers, cheapDeflater];
  const nomIdx = chooseCpuNominationCard(G, '0');
  const nomCard = G.board.auctionPlayers[nomIdx];
  console.log(`  Nominated card in Phase 1 with Bowers present: ${nomCard.id}`);

  if (nomCard.id === 'brock_bowers') {
    console.log('  -> PASS: Browns correctly nominates Brock Bowers first in Phase 1!\n');
  } else {
    throw new Error(`FAIL: Expected brock_bowers, got ${nomCard.id}`);
  }
}

console.log('=== ALL PLAYTEST 43 BROWNS TESTS PASSED SUCCESSFULLY! ===');
