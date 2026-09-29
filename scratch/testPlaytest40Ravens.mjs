import assert from 'assert';
import { 
  DeflategateGame, 
  evaluateCpuAuctionBid, 
  chooseCpuNominationCard, 
  resolveAuctionWin, 
  calculateRefreshResults,
  scoreCardForPlayer 
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';

console.log('=== Playtest 40: Ravens Strategic AI & Mechanics Verification Suite ===\n');

// -------------------------------------------------------------
// Test 1: Practice Squad cards do NOT count as a position for Ravens ability
// -------------------------------------------------------------
console.log('Test 1: Practice Squad cards do not count toward 3-position bonus');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const ravensTeam = TEAMS.find(t => t.id === 'ravens');
  const p = G.players['0'];
  p.team = ravensTeam;
  p.coins = 5;
  p.psi = 42;

  // Case A: 3 Practice Squad cards in lineup (each PS card generates 1 coin, ability gives 0)
  p.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1', isPracticeSquad: true },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2', isPracticeSquad: true },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_3', isPracticeSquad: true }
  ];
  calculateRefreshResults(G);
  // 5 starting + 3 lineup coins from PS = 8 coins (ability gives 0; if ability triggered, it would be 11)
  assert.strictEqual(p.coins, 8, 'Ravens with 3 Practice Squad cards must NOT trigger ability (coins should be 5 + 3 PS lineup = 8)');

  // Case B: 1 QB, 1 RB, 1 Practice Squad card (2 real positions, 1 PS)
  p.coins = 5;
  p.lineup = [
    { id: 'c1', name: 'Lamar Jackson', position: 'QB', effects: [{ type: 'coins', amount: 1, perRound: true }] },
    { id: 'c2', name: 'Derrick Henry', position: 'RB', effects: [{ type: 'deflate', amount: 1, perRound: true }] },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1', isPracticeSquad: true }
  ];
  calculateRefreshResults(G);
  // Lamar gives 1 coin, PS gives 1 coin = 2 lineup coins; ability gives 0 -> 5 + 2 = 7
  assert.strictEqual(p.coins, 7, 'Ravens with 2 positions + 1 Practice Squad must NOT trigger 3-position bonus (coins should be 5 + 2 lineup = 7)');

  // Case C: 1 QB, 1 RB, 1 TE (3 distinct real positions, none with coins)
  p.coins = 5;
  p.lineup = [
    { id: 'c1', name: 'Lamar Jackson', position: 'QB', effects: [] },
    { id: 'c2', name: 'Derrick Henry', position: 'RB', effects: [] },
    { id: 'c3', name: 'Mark Andrews', position: 'TE', effects: [] }
  ];
  calculateRefreshResults(G);
  // Lineup gives 0, ability gives +3 -> 5 + 3 = 8
  assert.strictEqual(p.coins, 8, 'Ravens with 3 distinct real positions (QB, RB, TE) MUST gain +3 coins (coins should be 5 + 3 = 8)');

  // Case D: 4 slots (3 distinct real positions + 1 Practice Squad from 4th slot purchase)
  p.coins = 5;
  p.extraLineupSlots = 1;
  p.lineup = [
    { id: 'c1', name: 'Lamar Jackson', position: 'QB', effects: [] },
    { id: 'c2', name: 'Derrick Henry', position: 'RB', effects: [] },
    { id: 'c3', name: 'Mark Andrews', position: 'TE', effects: [] },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1', isPracticeSquad: true }
  ];
  calculateRefreshResults(G);
  // Lineup gives 1 (PS), ability gives +3 -> 5 + 1 + 3 = 9
  assert.strictEqual(p.coins, 9, 'Ravens with 3 distinct real positions + 1 Practice Squad in 4th slot MUST trigger +3 coins bonus (coins should be 5 + 1 PS + 3 ability = 9)');
  console.log('  ✓ Passed: Practice Squad cards correctly excluded from position counting in all scenarios.');
}

// -------------------------------------------------------------
// Test 2: Round 1 Star Anchor Strategy & Discipline on Ordinary Cards
// -------------------------------------------------------------
console.log('\nTest 2: Round 1 Star Anchor Bidding & Non-Star Discipline');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const ravensTeam = TEAMS.find(t => t.id === 'ravens');
  const p = G.players['0'];
  p.team = ravensTeam;
  p.coins = 14;
  p.psi = 42;
  G.board.round = 1;

  // Star Player: Brock Bowers (TE, 4 coins/round)
  const starCard = {
    id: 'brock_bowers',
    name: 'Brock Bowers',
    position: 'TE',
    phase: 1,
    minBid: 4,
    maxBid: 12,
    effects: [{ type: 'coins', amount: 4, perRound: true }]
  };
  G.board.auctionPlayers = [starCard];
  G.board.activeAuctionCardIndex = 0;

  // Case 2A: Opponent bids 4 (nextBid = 5). Ravens should bid.
  G.board.highestBidder = '1';
  G.board.highestBid = 4;
  const starBid5 = evaluateCpuAuctionBid(G, '0');
  console.log(`  Star Player Brock Bowers at nextBid=5: shouldBid=${starBid5.shouldBid}, bidAmount=${starBid5.bidAmount}`);
  assert.strictEqual(starBid5.shouldBid, true, 'Ravens should bid on Round 1 star player at 5 coins');

  // Case 2B: Bidding war pushes to 8 coins (nextBid = 9). Ravens is willing to pay up to 9 coins.
  G.board.highestBidder = '1';
  G.board.highestBid = 8;
  const starBid9 = evaluateCpuAuctionBid(G, '0');
  console.log(`  Star Player Brock Bowers at nextBid=9: shouldBid=${starBid9.shouldBid}, bidAmount=${starBid9.bidAmount}`);
  assert.strictEqual(starBid9.shouldBid, true, 'Ravens should bid on Round 1 star player up to 9 coins');
  assert.strictEqual(starBid9.bidAmount, 9, 'Ravens bid amount should match 9 coins ceiling');

  // Case 2C: Bidding war exceeds 9 coins (nextBid = 10). Ravens passes.
  G.board.highestBidder = '1';
  G.board.highestBid = 9;
  const starBid10 = evaluateCpuAuctionBid(G, '0');
  console.log(`  Star Player Brock Bowers at nextBid=10: shouldBid=${starBid10.shouldBid}`);
  assert.strictEqual(starBid10.shouldBid, false, 'Ravens should pass when bid exceeds 9 coins on Round 1 star');

  // Case 2D: Ordinary scrub player in Round 1: Jalen Coker (WR, 1 coin/round)
  const scrubCard = {
    id: 'jalen_coker',
    name: 'Jalen Coker',
    position: 'WR',
    phase: 1,
    minBid: 1,
    maxBid: 6,
    effects: [{ type: 'coins', amount: 1, perRound: true }]
  };
  G.board.auctionPlayers = [scrubCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = '1';
  G.board.highestBid = 3; // nextBid = 4
  const scrubBid = evaluateCpuAuctionBid(G, '0');
  console.log(`  Ordinary Card Jalen Coker (nextBid=4): shouldBid=${scrubBid.shouldBid}`);
  assert.strictEqual(scrubBid.shouldBid, false, 'Ravens should pass and not overspend 4+ coins on an ordinary scrub in Round 1');
  console.log('  ✓ Passed: Ravens aggressively targets anchor star up to 9 coins and stays disciplined on ordinary cards.');
}

// -------------------------------------------------------------
// Test 3: Strategic Lineup Replacement (Preserving Engine vs Double-Superstar)
// -------------------------------------------------------------
console.log('\nTest 3: Strategic Lineup Replacement (Preserving Engine vs Double-Superstar)');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const ravensTeam = TEAMS.find(t => t.id === 'ravens');
  const p = G.players['0'];
  p.team = ravensTeam;
  p.coins = 10;
  p.psi = 30;
  G.board.round = 5;

  // Case A: Holding Brock Bowers (TE, 4 coins), Lamar Jackson (QB, 2 coins), Scrub WR (WR, 1 coin).
  // Wins an elite TE: Travis Kelce (TE, 4 deflate/round).
  // Total Lineup optimization should realize:
  // Replacing Scrub WR leaves { Bowers (TE), Kelce (TE), Lamar (QB) } = 2 TE + 1 QB (loses 3-coin ability).
  // BUT Kelce (4 deflate = ~10 pts) + Bowers (4 coins = ~4.4 pts) + Lamar (2 coins = ~2.2 pts) = 16.6 pts,
  // whereas keeping Scrub WR and cutting Bowers to keep 3 positions:
  // Kelce (10 pts) + Scrub WR (1.1 pt) + Lamar (2.2 pts) + Ability (+3 coins = 3.3 pts) = 16.6 pts.
  // If Kelce is a massive upgrade over Scrub WR, it cuts Scrub WR and keeps BOTH tight ends!
  p.lineup = [
    { id: 'brock_bowers', name: 'Brock Bowers', position: 'TE', effects: [{ type: 'coins', amount: 4, perRound: true }] },
    { id: 'lamar_jackson', name: 'Lamar Jackson', position: 'QB', effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { id: 'malik_nabers', name: 'Malik Nabers', position: 'WR', effects: [{ type: 'coins', amount: 1, perRound: true }] }
  ];

  const travisKelce = {
    id: 'travis_kelce',
    name: 'Travis Kelce',
    position: 'TE',
    effects: [{ type: 'deflate', amount: 4, perRound: true }]
  };

  resolveAuctionWin(G, '0', travisKelce);
  const remainingIds = p.lineup.map(c => c.id);
  console.log(`  Lineup after winning Travis Kelce: [${p.lineup.map(c => `${c.name} (${c.position})`).join(', ')}]`);
  assert.ok(remainingIds.includes('travis_kelce'), 'Travis Kelce must be in lineup');
  assert.ok(remainingIds.includes('brock_bowers'), 'Brock Bowers must be preserved alongside Kelce');
  assert.ok(!remainingIds.includes('malik_nabers'), 'Weak WR Malik Nabers should be replaced rather than superstar Brock Bowers');
  console.log('  ✓ Passed: Ravens replaces weak other position to hold two superstars when raw output exceeds ability.');
}

// -------------------------------------------------------------
// Test 4: Missing Position Nomination & Bidding Conviction
// -------------------------------------------------------------
console.log('\nTest 4: Missing Position Nomination & Bidding Conviction');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const ravensTeam = TEAMS.find(t => t.id === 'ravens');
  const p = G.players['0'];
  p.team = ravensTeam;
  p.coins = 6;
  p.psi = 40;
  G.players['1'].coins = 5;
  G.board.round = 3;

  // Ravens currently has QB and TE (needs RB or WR to complete 3 positions)
  p.lineup = [
    { id: 'c1', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'coins', amount: 3, perRound: true }] },
    { id: 'c2', name: 'Brock Bowers', position: 'TE', effects: [{ type: 'coins', amount: 4, perRound: true }] },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1', isPracticeSquad: true }
  ];

  // Board has:
  // 0: Another QB (duplicate position)
  // 1: Another TE (duplicate position)
  // 2: An RB (completes 3-position engine!)
  const dupQb = { id: 'dup_qb', name: 'Geno Smith', position: 'QB', minBid: 2, maxBid: 8, effects: [{ type: 'coins', amount: 2, perRound: true }] };
  const dupTe = { id: 'dup_te', name: 'Dalton Kincaid', position: 'TE', minBid: 2, maxBid: 8, effects: [{ type: 'coins', amount: 2, perRound: true }] };
  const missingRb = { id: 'missing_rb', name: 'Bijan Robinson', position: 'RB', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2, perRound: true }] };

  G.board.auctionPlayers = [dupQb, dupTe, missingRb];
  G.board.nominator = '0';

  const nomIdx = chooseCpuNominationCard(G, '0');
  console.log(`  Nominated index: ${nomIdx} (${G.board.auctionPlayers[nomIdx].name}, ${G.board.auctionPlayers[nomIdx].position})`);
  assert.strictEqual(nomIdx, 2, 'Ravens should nominate the missing position (Bijan Robinson, RB) to complete 3 positions');

  // Bidding test on missing RB
  G.board.activeAuctionCardIndex = 2;
  G.board.highestBidder = '1';
  G.board.highestBid = 2; // nextBid = 3
  const bidDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`  Bidding on missing RB (nextBid=3): shouldBid=${bidDecision.shouldBid}, bidAmount=${bidDecision.bidAmount}`);
  assert.strictEqual(bidDecision.shouldBid, true, 'Ravens should eagerly bid on 3rd missing position');
  assert.ok(bidDecision.bidAmount >= 3, 'Ravens bid amount must meet or exceed nextBid to secure 3rd position');
  console.log('  ✓ Passed: Ravens prioritizes nominating and bidding on missing positions to unlock +3 coins/round.');
}

console.log('\n=========================================');
console.log('All Playtest 40 Verification Tests PASSED!');
console.log('=========================================');
