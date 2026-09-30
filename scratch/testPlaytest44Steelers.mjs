import { DeflategateGame, scoreCardForPlayer, evaluateCpuAuctionBid, chooseCpuNominationCard } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Running Playtest 44: Pittsburgh Steelers AI Verification Suite ===\n');

// Helper setup
function createTestGame(round = 1, steelersCoins = 12, steelersPsi = 48) {
  const G = DeflategateGame.setup(
    { ctx: { numPlayers: 7 }, random: { _random: () => 0.5, Shuffle: a => a } },
    { numHumans: 0, vsCpu: true }
  );

  G.board.round = round;
  const steelersTeam = TEAMS.find(t => t.id === 'steelers');
  G.players['0'].team = steelersTeam;
  G.players['0'].psi = steelersPsi;
  G.players['0'].coins = steelersCoins;
  G.players['0'].isCpu = true;
  G.players['0'].genome = { ...ACTIVE_TEAM_GENOMES.steelers };

  for (let i = 1; i < 7; i++) {
    const seat = String(i);
    if (G.players[seat]) {
      G.players[seat].psi = 38;
      G.players[seat].coins = 10;
      G.players[seat].team = TEAMS[i] || TEAMS[0];
      G.players[seat].isCpu = true;
    }
  }

  return G;
}

// -------------------------------------------------------------
// Test 1: Start of Round Richest Ability Transfer (-6 PSI in 7P)
// -------------------------------------------------------------
console.log('Test 1: Steelers Ability Transfer when Strictly Richest');
{
  const G = createTestGame(2, 14, 48);
  // Ensure Steelers has strictly more coins than all opponents
  for (let i = 1; i < 7; i++) {
    G.players[String(i)].coins = 10;
  }

  if (DeflategateGame.phases.eventPhase?.onBegin) {
    DeflategateGame.phases.eventPhase.onBegin({
      G,
      ctx: { numPlayers: 7 },
      random: { Shuffle: a => a }
    });
  }

  const finalPsi = G.players['0'].psi;
  const alert = G.board.steelersAlert;
  console.log(`  Initial PSI: 48, Final PSI: ${finalPsi}, Alert: ${alert}`);

  if (finalPsi === 42 && alert && alert.includes('Steelers Ability')) {
    console.log('  -> PASS: Steelers successfully transferred 1 PSI to all 6 opponents, reducing burden by -6 PSI!\n');
  } else {
    throw new Error(`FAIL: Expected 42 PSI, got ${finalPsi}`);
  }
}

// -------------------------------------------------------------
// Test 2: Passing to Secure Richest Title (User Directive)
// -------------------------------------------------------------
console.log('Test 2: Passing to Secure Richest Title (6-9 Deflation Swing over Ordinary Card)');
{
  const G = createTestGame(2, 12, 42);
  // Opponents: highest opponent has 10 coins
  for (let i = 1; i < 7; i++) {
    G.players[String(i)].coins = 10;
    G.players[String(i)].hasWonAuction = true; // Opponents finished bidding with 10 coins
  }

  // Active card: Kirk Cousins (+3 coins/rd), current bid is 5 coins
  const cousinsCard = {
    id: 'kirk_cousins',
    name: 'Kirk Cousins',
    position: 'QB',
    phase: 1,
    minBid: 4,
    maxBid: 12,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };

  G.board.auctionPlayers = [cousinsCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 5;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  // If Steelers bids 6 coins: coins drop from 12 - 6 = 6. With +3 coins next round = 9 coins.
  // Opponent has 10 coins. Steelers would LOSE the richest title!
  // If Steelers PASSES: spends 1 coin later = 11 coins > 10 coins. Steelers stays strictly richest!
  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Bid Decision on 6-coin bid for Cousins: shouldBid = ${decision.shouldBid}`);

  if (!decision.shouldBid) {
    console.log('  -> PASS: Steelers correctly passed to protect the 6-PSI deflation transfer!\n');
  } else {
    throw new Error('FAIL: Steelers should have passed to secure the richest title');
  }
}

// -------------------------------------------------------------
// Test 3: Spending Within Safe Surplus
// -------------------------------------------------------------
console.log('Test 3: Spending Within Safe Surplus (Winning Card While Staying Richest)');
{
  const G = createTestGame(2, 16, 42);
  // Opponents have at most 10 coins
  for (let i = 1; i < 7; i++) {
    G.players[String(i)].coins = 10;
    G.players[String(i)].hasWonAuction = true;
  }

  // Active card: Terry McLaurin (+2 coins/rd), bid is at 2 coins
  const coinCard = {
    id: 'terry_mclaurin',
    name: 'Terry McLaurin',
    position: 'WR',
    phase: 1,
    minBid: 2,
    maxBid: 8,
    effects: [{ type: 'coins', amount: 2, perRound: true }]
  };

  G.board.auctionPlayers = [coinCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 2;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  // If Steelers bids 3 coins: 16 - 3 + 2 = 15 coins > 10 coins. Steelers STAYS richest!
  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Bid Decision on 3-coin bid: shouldBid = ${decision.shouldBid}, bidAmount = ${decision.bidAmount}`);

  if (decision.shouldBid && decision.bidAmount >= 3) {
    console.log('  -> PASS: Steelers comfortably bids within safe surplus and stays richest!\n');
  } else {
    throw new Error('FAIL: Steelers should bid when safe surplus covers the cost');
  }
}

// -------------------------------------------------------------
// Test 4: Austerity in Round 1 Against 20-Coin Juggernauts
// -------------------------------------------------------------
console.log('Test 4: Austerity in Round 1 Against 20-Coin Juggernauts');
{
  const G = createTestGame(1, 12, 48);
  // Rival Browns with 20 coins
  G.players['1'].team = TEAMS.find(t => t.id === 'browns');
  G.players['1'].coins = 20;

  const card = {
    id: 'kirk_cousins',
    name: 'Kirk Cousins',
    position: 'QB',
    phase: 1,
    minBid: 4,
    maxBid: 12,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };

  G.board.auctionPlayers = [card];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 4;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  // When nextBid is 5 coins and Steelers cannot be richest anyway, cap investment at 2 coins (pass on 5 coins)
  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Decision at 5-coin price: shouldBid = ${decision.shouldBid}`);

  if (!decision.shouldBid) {
    console.log('  -> PASS: Steelers refuses to blow bankroll on 5-coin card when trailing 20-coin juggernauts!\n');
  } else {
    throw new Error('FAIL: Steelers should not spend 5 coins in Round 1 when trailing 20-coin rivals');
  }
}

// -------------------------------------------------------------
// Test 5: Board Alternatives Discipline (Not Overpaying First Card)
// -------------------------------------------------------------
console.log('Test 5: Board Alternatives Discipline (No Overpayment When Alternatives Exist)');
{
  const G = createTestGame(3, 18, 36);
  for (let i = 1; i < 7; i++) {
    G.players[String(i)].coins = 8;
    G.players[String(i)].hasWonAuction = true;
  }

  const card1 = {
    id: 'derrick_henry',
    name: 'Derrick Henry',
    position: 'RB',
    phase: 2,
    minBid: 3,
    maxBid: 14,
    effects: [{ type: 'deflate', amount: 3, perRound: true }]
  };

  const card2 = {
    id: 'saquon_barkley',
    name: 'Saquon Barkley',
    position: 'RB',
    phase: 2,
    minBid: 3,
    maxBid: 12,
    effects: [{ type: 'deflate', amount: 3, perRound: true }]
  };

  G.board.auctionPlayers = [card1, card2];
  G.board.activeAuctionCardIndex = 0;
  // Bidding is currently at 10 coins on Derrick Henry (cap at 60% of 14 is ~8-9 coins)
  G.board.highestBid = 10;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Decision on 11-coin bid with Barkley remaining: shouldBid = ${decision.shouldBid}`);

  if (!decision.shouldBid) {
    console.log('  -> PASS: Steelers disciplined; steps aside at 11 coins because Saquon Barkley is still on the board!\n');
  } else {
    throw new Error('FAIL: Steelers should step aside and buy the alternative cheaper');
  }
}

// -------------------------------------------------------------
// Test 6: Endgame Closer Pivot
// -------------------------------------------------------------
console.log('Test 6: Endgame Closer Pivot (Deflation Nukes to Cross 0 PSI)');
{
  const G = createTestGame(6, 15, 14); // 14 PSI remaining
  const mahomesCard = {
    id: 'patrick_mahomes',
    name: 'Patrick Mahomes',
    position: 'QB',
    phase: 'hof',
    minBid: 5,
    maxBid: 20,
    effects: [{ type: 'deflate', amount: 5, perRound: true }]
  };

  G.board.auctionPlayers = [mahomesCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 12;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Decision on 13-coin bid for Mahomes when PSI is 14: shouldBid = ${decision.shouldBid}, bidAmount = ${decision.bidAmount}`);

  if (decision.shouldBid && decision.bidAmount === 13) {
    console.log('  -> PASS: Steelers fearlessly deploys bankroll to capture Patrick Mahomes and close out the game!\n');
  } else {
    throw new Error('FAIL: Steelers should bid to secure game-ending deflation');
  }
}

// -------------------------------------------------------------
// Test 7: Nomination Strategy (Baiting vs Dominance)
// -------------------------------------------------------------
console.log('Test 7: Steelers Nomination Strategy');
{
  const G = createTestGame(1, 12, 48);
  // When trailing Browns (20 coins), Steelers should nominate high-cost bait card
  G.players['1'].team = TEAMS.find(t => t.id === 'browns');
  G.players['1'].coins = 20;

  const cheapCard = { id: 'c1', name: 'Scrub', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1 }] };
  const baitCard = { id: 'c2', name: 'Bait Superstar', minBid: 4, maxBid: 12, phase: 2, effects: [{ type: 'deflate', amount: 4 }] };

  G.board.auctionPlayers = [cheapCard, baitCard];
  const nomIdx = chooseCpuNominationCard(G, '0');
  console.log(`  Nominated index when trailing: ${nomIdx} (${G.board.auctionPlayers[nomIdx]?.name})`);

  if (nomIdx === 1) {
    console.log('  -> PASS: Steelers nominated bait superstar when trailing to drain opponents cash!\n');
  } else {
    throw new Error('FAIL: Steelers should nominate bait card when trailing');
  }
}

console.log('========================================================');
console.log('ALL PLAYTEST 44 PITTSBURGH STEELERS UNIT TESTS PASSED!');
console.log('========================================================\n');
