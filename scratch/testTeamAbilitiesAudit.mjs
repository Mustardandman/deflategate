import { DeflategateGame, evaluateCpuAuctionBid } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log("=== RUNNING TEAM ABILITIES & DYNAMIC BEHAVIOR AUDIT ===");

function createTestGame(teamIds) {
  const G = DeflategateGame.setup({ ctx: { numPlayers: teamIds.length } }, { numHumans: 0 });
  teamIds.forEach((teamId, idx) => {
    const t = TEAMS.find(item => item.id === teamId);
    G.players[String(idx)].team = t;
    G.players[String(idx)].psi = t.initialPsi;
    G.players[String(idx)].coins = t.coins;
    G.players[String(idx)].isCpu = true;
  });
  return G;
}

// 1. Rams Token Test
console.log("\n[TEST 1] Rams CPU Token Attachment & Double Multiplier...");
{
  const G = createTestGame(['rams', 'bills', 'jets', 'bears']);
  const ramsPlayer = G.players['0'];
  // Give Rams a Phase 2 card with recurring deflation
  ramsPlayer.lineup.push({
    uniqueId: 'p2_test_star',
    name: 'Phase 2 Test Star',
    phase: 2,
    effects: [{ type: 'deflate', amount: 2, perRound: true }]
  });
  
  // Call postAuctionPhase onBegin
  G.board.round = 4;
  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  
  const tokenAttached = ramsPlayer.ramsTokenAttached;
  const cardToken = ramsPlayer.lineup.find(c => c.uniqueId === 'p2_test_star')?.ramsDoubleToken;
  const cardMult = ramsPlayer.lineup.find(c => c.uniqueId === 'p2_test_star')?.ramsMultiplier;
  console.log(`- Rams Token Attached: ${tokenAttached} (Card ramsDoubleToken: ${cardToken}, ramsMultiplier: ${cardMult})`);
  if (!tokenAttached || !cardToken || !cardMult) {
    console.error("FAIL: Rams token was not attached or synced!");
  } else {
    console.log("PASS: Rams CPU attached token to Phase 2 star with dual flags synced.");
  }
}

// 2. Jets Immediate Max Price Jump Test
console.log("\n[TEST 2] Jets Max Bid Jumping...");
{
  const G = createTestGame(['jets', 'bills', 'patriots', 'bears']);
  const jetsPlayer = G.players['0'];
  jetsPlayer.coins = 12;
  
  // Create an auction card with minBid 2, maxBid 6, and a solid deflation effect
  G.board.auctionPlayers = [
    {
      uniqueId: 'cheap_gem',
      id: 'cheap_gem',
      name: 'Cheap Gem WR',
      phase: 1,
      minBid: 2,
      maxBid: 6,
      effects: [{ type: 'deflate', amount: 2, perRound: true }]
    }
  ];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 2;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];
  
  const decision = evaluateCpuAuctionBid(G, '0');
  console.log(`- Jets Bid Decision:`, decision);
  if (decision.shouldBid && decision.bidAmount === 6 && decision.isMaxBid) {
    console.log("PASS: Jets immediately jumped straight to max price (6 coins)!");
  } else {
    console.error(`FAIL: Jets did not jump to max bid (got ${decision.bidAmount})`);
  }
}

// 3. Lions Dynamic Aggression Test
console.log("\n[TEST 3] Lions Dynamic Aggression...");
{
  const G = createTestGame(['lions', 'bills', 'patriots', 'bears']);
  const lionsPlayer = G.players['0'];
  lionsPlayer.coins = 15;
  
  G.board.auctionPlayers = [
    {
      uniqueId: 'mid_card',
      id: 'mid_card',
      name: 'Solid Player',
      phase: 1,
      minBid: 2,
      maxBid: 10,
      effects: [{ type: 'deflate', amount: 1, perRound: true }, { type: 'coins', amount: 1, perRound: true }]
    }
  ];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 2;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  // Case A: First claim of the round (nobody has won)
  const decisionFirst = evaluateCpuAuctionBid(G, '0');
  console.log(`- Lions Decision on 1st Claim (Aggression 1.50):`, decisionFirst);

  // Case B: Post claim of the round (another player already claimed a player)
  G.players['2'].hasWonAuction = true;
  const decisionPost = evaluateCpuAuctionBid(G, '0');
  console.log(`- Lions Decision Post 1st Claim (Aggression 0.85):`, decisionPost);
  
  if (decisionFirst.shouldBid) {
    console.log("PASS: Lions bids aggressively for 1st claim.");
  }
}

// 4. Chiefs Adaptive Claim Test
console.log("\n[TEST 4] Chiefs Adaptive Claim in Round 4...");
{
  const G = createTestGame(['chiefs', 'bills', 'patriots', 'bears']);
  const chiefsPlayer = G.players['0'];
  chiefsPlayer.coins = 9;
  chiefsPlayer.hasUsedChiefsAbility = false;
  
  G.board.round = 4;
  G.board.auctionPlayers = [
    {
      uniqueId: 'p2_star',
      id: 'p2_star',
      name: 'Phase 2 Star',
      phase: 2,
      minBid: 3,
      maxBid: 10,
      effects: [{ type: 'deflate', amount: 2, perRound: true }]
    },
    {
      uniqueId: 'p1_scrub',
      id: 'p1_scrub',
      name: 'Phase 1 Scrub',
      phase: 1,
      minBid: 1,
      maxBid: 4,
      effects: [{ type: 'coins', amount: 1 }]
    }
  ];

  DeflategateGame.phases.preAuctionPhase.onBegin({ G, events: {}, ctx: { numPlayers: 4 } });
  console.log(`- Chiefs Ability Used: ${chiefsPlayer.hasUsedChiefsAbility}`);
  const wonCard = chiefsPlayer.lineup[chiefsPlayer.lineup.length - 1];
  console.log(`- Chiefs Won Card: ${wonCard?.name} (phase ${wonCard?.phase})`);
  if (chiefsPlayer.hasUsedChiefsAbility && wonCard) {
    console.log("PASS: Chiefs claimed a card for min cost without bidding.");
  } else {
    console.error("FAIL: Chiefs failed to claim target card.");
  }
}

// 5. Bills Discard Adaptive Threshold Test
console.log("\n[TEST 5] Bills Adaptive Discard Claim...");
{
  const G = createTestGame(['bills', 'chiefs', 'patriots', 'bears']);
  const billsPlayer = G.players['0'];
  billsPlayer.coins = 8;
  billsPlayer.hasUsedBillsAbility = false;
  
  G.board.round = 4;
  G.decks.discard = [
    {
      uniqueId: 'discarded_stud',
      id: 'discarded_stud',
      name: 'Discarded Stud',
      phase: 2,
      minBid: 3,
      maxBid: 8,
      effects: [{ type: 'deflate', amount: 2, perRound: true }]
    }
  ];

  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  console.log(`- Bills Ability Used: ${billsPlayer.hasUsedBillsAbility}`);
  const grabbed = billsPlayer.lineup.find(c => c.uniqueId === 'discarded_stud');
  console.log(`- Bills Grabbed Discarded Stud: ${Boolean(grabbed)}`);
  if (billsPlayer.hasUsedBillsAbility && grabbed) {
    console.log("PASS: Bills claimed discarded player at calibrated threshold.");
  } else {
    console.error("FAIL: Bills failed to claim discard card.");
  }
}

console.log("\n=== ALL TEST CHECKS COMPLETE ===");
