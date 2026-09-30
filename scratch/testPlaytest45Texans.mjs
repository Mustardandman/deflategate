import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

let allPassed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    allPassed = false;
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('=== RUNNING PLAYTEST 45: HOUSTON TEXANS UNIT & LOGIC VERIFICATION ===\n');

// Setup Helper
function setupMockGame(numPlayers = 7) {
  const G = DeflategateGame.setup({ ctx: { numPlayers } }, { numHumans: 0, vsCpu: true });
  for (let i = 0; i < numPlayers; i++) {
    const seat = String(i);
    const teamId = (i === 0) ? 'texans' : 'cowboys';
    const t = TEAMS.find(item => item.id === teamId);
    G.players[seat].team = t;
    G.players[seat].psi = t.initialPsi;
    G.players[seat].coins = t.coins;
    G.players[seat].isCpu = true;
    G.players[seat].genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
  }
  G.board.round = 1;
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = null;
  G.board.highestBid = 0;
  G.board.passedAuctionPlayers = [];
  return G;
}

// TEST 1: QB acquisition grants +2 coins and +2 deflate per QB in Refresh Phase
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }, { type: 'coins', amount: 1, perRound: true }] },
    { id: 'josh_allen', name: 'Josh Allen', position: 'QB', effects: [{ type: 'deflate', amount: 2, perRound: true }] }
  ];
  const startPsi = texans.psi;
  const startCoins = texans.coins;

  DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers: 7 }, events: {} });

  // Cousins: 4 def, 1 coin. Allen: 2 def. Total lineup = 6 def, 1 coin.
  // Texans Ability: 2 QBs -> +4 def, +4 coins.
  // Total Deflate = 6 + 4 = 10. Total Coins = 1 + 4 = 5.
  assert(texans.psi === startPsi - 10, `Test 1A: Texans deflated 10 PSI (expected ${startPsi - 10}, got ${texans.psi})`);
  assert(texans.coins === startCoins + 5, `Test 1B: Texans gained 5 coins (expected ${startCoins + 5}, got ${texans.coins})`);
}

// TEST 2: Lineup Replacement Cuts Non-QBs First (Preserving QBs)
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'josh_allen', name: 'Josh Allen', position: 'QB', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { id: 'diontae_johnson', name: 'Diontae Johnson', position: 'WR', effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  // Incoming card: Joe Burrow (QB)
  const incomingQb = { id: 'joe_burrow', name: 'Joe Burrow', position: 'QB', effects: [{ type: 'deflate', amount: 3, perRound: true }, { type: 'coins', amount: 2, perRound: true }] };
  resolveAuctionWin(G, '0', incomingQb, 5);

  const lineupPositions = texans.lineup.map(c => c.position);
  assert(lineupPositions.filter(p => p === 'QB').length === 3, 'Test 2A: Roster replacement cut non-QB, resulting in 3 QBs');
  assert(!texans.lineup.some(c => c.id === 'diontae_johnson'), 'Test 2B: Diontae Johnson (WR) was the card replaced');
}

// TEST 3: Lineup Replacement Cuts Toxic Recurring Inflation Cards First
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'deshaun_watson', name: 'Deshaun Watson', position: 'QB', effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] },
    { id: 'diontae_johnson', name: 'Diontae Johnson', position: 'WR', effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  const incomingCard = { id: 'kyler_murray', name: 'Kyler Murray', position: 'QB', effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  resolveAuctionWin(G, '0', incomingCard, 4);

  assert(!texans.lineup.some(c => c.id === 'deshaun_watson'), 'Test 3: Toxic Deshaun Watson (recurring inflation) was replaced first');
}

// TEST 4: The 1-Win Constraint: Passes on Non-QB When Viable QB is on Board
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.coins = 8;
  texans.cardsWonThisRound = 0;

  // Board has a WR up for auction, and a QB waiting
  const activeWr = { id: 'michael_pittman', name: 'Michael Pittman Jr.', position: 'WR', minBid: 1, maxBid: 10, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const waitingQb = { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 4, perRound: true }, { type: 'coins', amount: 1, perRound: true }] };

  G.board.auctionPlayers = [activeWr, waitingQb];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = '1';
  G.board.highestBid = 2;

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(!decision.shouldBid, `Test 4: Texans passed on non-QB because viable QB is waiting on the board (decision.shouldBid=${decision.shouldBid})`);
}

// TEST 5: Aggressive QB Bidding Up to Available Purse
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.coins = 8;
  texans.cardsWonThisRound = 0;

  const soleQb = { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 4, perRound: true }, { type: 'coins', amount: 1, perRound: true }] };
  const otherCard = { id: 'chuba_hubbard', name: 'Chuba Hubbard', position: 'RB', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1, perRound: true }] };

  G.board.auctionPlayers = [soleQb, otherCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = '1';
  G.board.highestBid = 6;

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(decision.shouldBid && decision.bidAmount >= 7, `Test 5: Texans bids aggressively on sole viable QB at 7+ coins (bid=${decision.bidAmount})`);
}

// TEST 6: 3-QB Lineup Saturation: Does Not Overbid on Non-Upgrade QB
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.coins = 15;
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'joe_burrow', name: 'Joe Burrow', position: 'QB', effects: [{ type: 'deflate', amount: 3, perRound: true }, { type: 'coins', amount: 2, perRound: true }] },
    { id: 'patrick_mahomes', name: 'Patrick Mahomes', position: 'QB', effects: [{ type: 'deflate', amount: 5, perRound: true }] }
  ];

  // Weak non-upgrade QB
  const weakQb = { id: 'russell_wilson', name: 'Russell Wilson', position: 'QB', minBid: 1, maxBid: 6, effects: [{ type: 'deflate', amount: 1, perRound: true }, { type: 'coins', amount: 1, perRound: true }] };
  G.board.auctionPlayers = [weakQb];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = '1';
  G.board.highestBid = 3;

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(!decision.shouldBid, `Test 6: Texans does not overpay on non-upgrade QB when already holding 3 top QBs (decision.shouldBid=${decision.shouldBid})`);
}

// TEST 7: Texans Nomination Prioritizes Best Viable QB (Avoids Recurring Inflation)
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.coins = 8;

  const toxicWatson = { id: 'deshaun_watson', name: 'Deshaun Watson', position: 'QB', minBid: 1, maxBid: 5, effects: [{ type: 'inflate', amount: 4, perRound: true }] };
  const starCousins = { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 4, perRound: true }] };
  const fillerWr = { id: 'jalen_coker', name: 'Jalen Coker', position: 'WR', minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 1, perRound: true }] };

  G.board.auctionPlayers = [toxicWatson, starCousins, fillerWr];
  const chosenIdx = chooseCpuNominationCard(G, '0');
  assert(chosenIdx === 1, `Test 7: Texans nominated Kirk Cousins (index 1), skipping toxic Watson (got index ${chosenIdx})`);
}

// TEST 8: Endgame Closer Pivot
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.psi = 10;
  texans.coins = 12;

  // Instant deflation nuke
  const nuke = { id: 'derrick_henry', name: 'Derrick Henry', position: 'RB', minBid: 3, maxBid: 12, effects: [{ type: 'deflate', amount: 8, perRound: false }] };
  G.board.auctionPlayers = [nuke];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBidder = '1';
  G.board.highestBid = 6;

  const decision = evaluateCpuAuctionBid(G, '0');
  assert(decision.shouldBid && decision.bidAmount >= 7, `Test 8: Texans pivots to endgame nuke when low PSI (bid=${decision.bidAmount})`);
}

// TEST 9: Watson Evaluation Is Half As Bad As Other Teams' Evaluation
{
  const G = setupMockGame();
  const watson = { id: 'deshaun_watson', name: 'Deshaun Watson', position: 'QB', effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] };

  // Evaluate Watson for Texans
  const texansScore = DeflategateGame ? (await import('../src/Game.js')).scoreCardForPlayer(G, '0', watson) : 0;
  
  // Baseline other teams evaluation: -4 deflate * 9 rounds * 2.2 = -79.2; +5 coins * 9 rounds * 1.2 = +54; sum = -32.8
  assert(texansScore < 0, `Test 9A: Watson score for Texans is negative (got ${texansScore})`);
  assert(texansScore >= -25 && texansScore <= -10, `Test 9B: Watson score is half as bad as other teams (-16.4 vs ~-32.8, got ${texansScore})`);
}

// TEST 10: Dynamic Lineup Replacement: Travis Kelce (Superstar TE) Can Replace a QB
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'russell_wilson', name: 'Russell Wilson', position: 'QB', effects: [{ type: 'deflate', amount: 1, perRound: true }, { type: 'coins', amount: 1, perRound: true }] },
    { id: 'anthony_richardson', name: 'Anthony Richardson', position: 'QB', effects: [{ type: 'coins', amount: 1, perRound: true }] }
  ];

  // Incoming card: Travis Kelce (Superstar TE, 4 deflate + 1 coin/round)
  const kelce = { id: 'travis_kelce', name: 'Travis Kelce', position: 'TE', minBid: 3, maxBid: 16, effects: [{ type: 'deflate', amount: 4, perRound: true }, { type: 'coins', amount: 1, perRound: true }] };
  resolveAuctionWin(G, '0', kelce, 8);

  assert(texans.lineup.some(c => c.id === 'travis_kelce'), 'Test 10A: Travis Kelce was successfully added to the lineup');
  assert(!texans.lineup.some(c => c.id === 'anthony_richardson'), 'Test 10B: Weakest QB (Anthony Richardson) was replaced by Travis Kelce');
  assert(texans.lineup.some(c => c.id === 'kirk_cousins') && texans.lineup.some(c => c.id === 'russell_wilson'), 'Test 10C: Superior QBs (Cousins, Wilson) remained in the lineup');
}

// TEST 11: Dynamic Lineup Replacement: Deshaun Watson Is Replaced Over Ordinary Non-QBs
{
  const G = setupMockGame();
  const texans = G.players['0'];
  texans.lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'deshaun_watson', name: 'Deshaun Watson', position: 'QB', effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] },
    { id: 'diontae_johnson', name: 'Diontae Johnson', position: 'WR', effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  // Incoming card: Russell Wilson (QB)
  const wilson = { id: 'russell_wilson', name: 'Russell Wilson', position: 'QB', effects: [{ type: 'deflate', amount: 1, perRound: true }, { type: 'coins', amount: 1, perRound: true }] };
  resolveAuctionWin(G, '0', wilson, 4);

  assert(!texans.lineup.some(c => c.id === 'deshaun_watson'), 'Test 11A: Deshaun Watson was replaced');
  assert(texans.lineup.some(c => c.id === 'diontae_johnson'), 'Test 11B: Diontae Johnson (positive non-QB) was preserved over Watson');
}

console.log(`\n========================================`);
if (allPassed) {
  console.log('ALL PLAYTEST 45 TEXANS TESTS PASSED!');
} else {
  console.error('SOME TESTS FAILED!');
  process.exit(1);
}
