import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log("--- Testing Playtest 39: New England Patriots Strategic Overhaul ---");

// Test 1: Hunter Henry Pump & Dump Immediate Replacement
console.log("\n[Test 1] Hunter Henry Toxic Replacement Priority (-300 Score)");
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
  const patPlayer = G.players['0'];
  const patTeam = TEAMS.find(t => t.id === 'patriots');
  patPlayer.team = patTeam;
  patPlayer.coins = 7;
  patPlayer.psi = 36;

  // Active lineup has: Practice Squad 1, Hunter Henry, Practice Squad 3
  patPlayer.lineup = [
    { id: 'ps_1', name: 'Practice Squad 1', isPracticeSquad: true, effects: [{ type: 'coins', amount: 1, perRound: true }] },
    { 
      id: 'hunter_henry', 
      name: 'Hunter Henry', 
      effects: [
        { type: 'deflate', amount: 8 },
        { type: 'inflate', amount: 3, perRound: true }
      ] 
    },
    { id: 'ps_3', name: 'Practice Squad 3', isPracticeSquad: true, effects: [{ type: 'coins', amount: 1, perRound: true }] }
  ];

  // Win a new player
  const newPlayer = { id: 'new_guy', name: 'New Player', effects: [{ type: 'deflate', amount: 1, perRound: true }] };
  resolveAuctionWin(G, '0', newPlayer);

  // Verify Hunter Henry was replaced, NOT the practice squad!
  const hasHunterHenry = patPlayer.lineup.some(c => c.id === 'hunter_henry');
  console.log(`Hunter Henry in lineup after new win? ${hasHunterHenry}`);
  if (!hasHunterHenry) {
    console.log("✅ PASS: Hunter Henry was immediately cut and dumped to discard on next auction win!");
  } else {
    console.error("❌ FAIL: Hunter Henry remained in active lineup!");
    process.exit(1);
  }
}

// Test 2: Turn 1 Premier Centerpiece Evaluation vs Ordinary Card
console.log("\n[Test 2] Turn 1 Fearless All-in Bidding on Premier Centerpiece");
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
  const patPlayer = G.players['0'];
  const patTeam = TEAMS.find(t => t.id === 'patriots');
  patPlayer.team = patTeam;
  patPlayer.coins = 7;
  patPlayer.psi = 36;
  G.board.round = 1;

  const bowersCard = {
    id: 'brock_bowers',
    name: 'Brock Bowers',
    minBid: 4,
    maxBid: 8,
    phase: 1,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };
  G.board.auctionPlayers = [bowersCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 4;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log("Bowers bid decision:", bidDecision);
  if (bidDecision.shouldBid && bidDecision.bidAmount === 7) {
    console.log("✅ PASS: Patriots bids all 7 coins on Brock Bowers in Round 1!");
  } else {
    console.error("❌ FAIL: Expected 7 coins all-in bid on Bowers, got:", bidDecision);
    process.exit(1);
  }
}

// Test 3: Turn 1 Cheap Strategy on Ordinary Card
console.log("\n[Test 3] Turn 1 Cheap Discipline on Ordinary Card");
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
  const patPlayer = G.players['0'];
  const patTeam = TEAMS.find(t => t.id === 'patriots');
  patPlayer.team = patTeam;
  patPlayer.coins = 7;
  patPlayer.psi = 36;
  G.board.round = 1;

  const ordinaryCard = {
    id: 'ordinary_joe',
    name: 'Ordinary Joe',
    minBid: 2,
    maxBid: 8,
    phase: 1,
    effects: [{ type: 'deflate', amount: 1, perRound: true }]
  };
  G.board.auctionPlayers = [ordinaryCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 4; // Someone bid 4
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log("Ordinary card bid decision at nextBid 5:", bidDecision);
  if (!bidDecision.shouldBid) {
    console.log("✅ PASS: Patriots refused to overpay for an ordinary card in Round 1 (capped at 3 coins)!");
  } else {
    console.error("❌ FAIL: Patriots overpaid for ordinary card in Round 1:", bidDecision);
    process.exit(1);
  }
}

// Test 4: Distance-to-Zero Closer Acceleration (PSI <= 18)
console.log("\n[Test 4] Distance-to-Zero Endgame Closer Acceleration (PSI <= 18)");
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
  const patPlayer = G.players['0'];
  const patTeam = TEAMS.find(t => t.id === 'patriots');
  patPlayer.team = patTeam;
  patPlayer.coins = 8;
  patPlayer.psi = 6; // Within range of instant nuke!
  G.board.round = 5;

  const closingNuke = {
    id: 'kenneth_walker',
    name: 'Kenneth Walker III',
    minBid: 3,
    maxBid: 8,
    phase: 2,
    effects: [{ type: 'deflate', amount: 6 }]
  };
  G.board.auctionPlayers = [closingNuke];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 3;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log("Endgame closing nuke bid decision:", bidDecision);
  if (bidDecision.shouldBid && bidDecision.bidAmount === 8) {
    console.log("✅ PASS: Patriots bids all-in to secure game-winning instant deflation closer!");
  } else {
    console.error("❌ FAIL: Expected all-in closer bid, got:", bidDecision);
    process.exit(1);
  }
}

// Test 5: Round 1/2 Practice Squad Delay Penalty on Hunter Henry
console.log("\n[Test 5] Round 1/2 Practice Squad Delay Penalty on Pump & Dump");
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
  const patPlayer = G.players['0'];
  const patTeam = TEAMS.find(t => t.id === 'patriots');
  patPlayer.team = patTeam;

  const henryCard = {
    id: 'hunter_henry',
    name: 'Hunter Henry',
    minBid: 4,
    maxBid: 8,
    effects: [{ type: 'deflate', amount: 8 }, { type: 'inflate', amount: 3, perRound: true }]
  };

  G.board.round = 1;
  const scoreR1 = scoreCardForPlayer(G, '0', henryCard);

  G.board.round = 4;
  const scoreR4 = scoreCardForPlayer(G, '0', henryCard);

  console.log(`Hunter Henry score in Round 1: ${scoreR1.toFixed(1)}`);
  console.log(`Hunter Henry score in Round 4: ${scoreR4.toFixed(1)}`);
  if (scoreR4 > scoreR1) {
    console.log("✅ PASS: Pump & dump reflects the Turn 1-2 roster development opportunity cost penalty!");
  } else {
    console.error("❌ FAIL: Score did not discount Turn 1/2 opportunity cost");
    process.exit(1);
  }
}

console.log("\n--- All Patriots Playtest 39 Unit Tests Passed! ---");
