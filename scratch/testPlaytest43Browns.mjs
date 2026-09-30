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

  for (let i = 1; i < 7; i++) {
    const seat = String(i);
    if (G.players[seat]) {
      G.players[seat].psi = 38;
      G.players[seat].coins = 12;
      G.players[seat].team = TEAMS[i] || TEAMS[0];
      G.players[seat].isCpu = true;
    }
  }

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
// Test 3: Phase 1 Dual-Threat Crown Jewels (Bowers & Kittle Dynamic Targeting)
// -------------------------------------------------------------
console.log('Test 3: Phase 1 Dual-Threat Crown Jewels (Any 2 recurring + instant deflate card)');
{
  const G = createTestGame(1, 20, 45);
  // Test with George Kittle (same effect as Brock Bowers: 2 recurring + 2 instant)
  const kittle = {
    id: 'george_kittle',
    name: 'George Kittle',
    position: 'TE',
    phase: 1,
    minBid: 1,
    maxBid: 15,
    effects: [
      { type: 'deflate', amount: 2, perRound: true },
      { type: 'deflate', amount: 2, perRound: false }
    ]
  };

  G.board.auctionPlayers = [kittle];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 8; // nextBid = 9
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  G.players['1'].coins = 15;
  G.players['1'].team = TEAMS.find(t => t.id === 'patriots');

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  George Kittle (Dual-Threat) at nextBid=9 with 20 coins: shouldBid = ${bidDecision.shouldBid}, bidAmount = ${bidDecision.bidAmount}`);

  if (bidDecision.shouldBid && bidDecision.bidAmount >= 9) {
    console.log('  -> PASS: Browns actively targets any dual-threat Phase 1 card (not just hardcoded Bowers)!\n');
  } else {
    throw new Error(`FAIL: Browns should aggressively bid on George Kittle in Round 1`);
  }
}

// -------------------------------------------------------------
// Test 4: Phase 1 Ordinary Deflater Discipline (Bang-for-Buck)
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
  G.players['1'].coins = 15;
  G.players['1'].team = TEAMS.find(t => t.id === 'chiefs');

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Ordinary deflater at nextBid=7: shouldBid = ${bidDecision.shouldBid}`, bidDecision);

  if (!bidDecision.shouldBid) {
    console.log('  -> PASS: Browns disciplined! Folds when price on ordinary deflater exceeds 4-5 coins.\n');
  } else {
    throw new Error(`FAIL: Browns overpaid for ordinary Phase 1 deflater`);
  }
}

// -------------------------------------------------------------
// Test 5: Dynamic Board-Tier State & Fallback Alternatives
// -------------------------------------------------------------
console.log('Test 5: Dynamic Board-Tier State & Alternative Card Awareness');
{
  const G = createTestGame(5, 35, 28);
  const mahomes = {
    id: 'patrick_mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    phase: 2,
    minBid: 2,
    maxBid: 25,
    effects: [
      { type: 'deflate', amount: 5, perRound: true },
      { type: 'coins', amount: 3, perRound: true }
    ]
  };
  const pureCoin1 = { id: 'dk_metcalf', phase: 2, minBid: 2, maxBid: 10, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const pureCoin2 = { id: 'ceedee_lamb', phase: 2, minBid: 2, maxBid: 8, effects: [{ type: 'coins', amount: 5, perRound: true }] };

  // Case A: Solitary Star (all other board cards are coins) -> Browns bids 15
  G.board.auctionPlayers = [mahomes, pureCoin1, pureCoin2];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 14;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  G.players['1'].coins = 30;
  G.players['1'].team = TEAMS.find(t => t.id === 'chiefs');
  const bidSolitary = evaluateCpuAuctionBid(G, '0');
  console.log(`  Case A: Mahomes as Solitary Star at nextBid=15: shouldBid = ${bidSolitary.shouldBid}, bidAmount = ${bidSolitary.bidAmount}`);

  // Case B: Board has ANOTHER elite superstar (Travis Kelce 6 deflate/rd)
  // When rival pushes Mahomes price to 18, Browns recognizes Kelce is on the board
  // and lets the rival overpay for Mahomes while Browns waits for Kelce!
  const kelce = {
    id: 'travis_kelce',
    name: 'Travis Kelce',
    position: 'TE',
    phase: 2,
    minBid: 2,
    maxBid: 21,
    effects: [{ type: 'deflate', amount: 6, perRound: true }]
  };
  G.board.auctionPlayers = [mahomes, kelce, pureCoin1];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 18; // nextBid = 19
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  const bidWithAlt = evaluateCpuAuctionBid(G, '0');
  console.log(`  Case B: Mahomes at nextBid=19 with Kelce also on board: shouldBid = ${bidWithAlt.shouldBid}`);

  if (bidSolitary.shouldBid && !bidWithAlt.shouldBid) {
    console.log('  -> PASS: Human-like board-tier reasoning! Pursues solitary star, but steps aside when equal superstar is on board!\n');
  } else {
    throw new Error(`FAIL: Expected bid on solitary star and pass when equal superstar available`);
  }
}

// -------------------------------------------------------------
// Test 6: Dynamic Nomination Strategy (Targeting Any Dual-Threat)
// -------------------------------------------------------------
console.log('Test 6: Dynamic Nomination Strategy');
{
  const G = createTestGame(1, 20, 45);
  // Greg Olsen: Phase 1 dual-threat (2 recurring + 2 instant deflate)
  const olsen = { id: 'greg_olsen', phase: 1, minBid: 1, maxBid: 14, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
  const pureCoin = { id: 'dk_metcalf', phase: 1, minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const cheapDeflater = { id: 'jordan_love', phase: 1, minBid: 1, maxBid: 8, effects: [{ type: 'deflate', amount: 1, perRound: true }] };

  G.board.auctionPlayers = [pureCoin, olsen, cheapDeflater];
  const nomIdx = chooseCpuNominationCard(G, '0');
  const nomCard = G.board.auctionPlayers[nomIdx];
  console.log(`  Nominated card in Phase 1 with Greg Olsen present: ${nomCard.id}`);

  if (nomCard.id === 'greg_olsen') {
    console.log('  -> PASS: Browns dynamically nominates any dual-threat card (tested with Greg Olsen)!\n');
  } else {
    throw new Error(`FAIL: Expected greg_olsen, got ${nomCard.id}`);
  }
}

console.log('=== ALL PLAYTEST 43 BROWNS TESTS PASSED SUCCESSFULLY! ===');
