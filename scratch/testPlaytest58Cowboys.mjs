import assert from 'assert';
import { 
  DeflategateGame, 
  evaluateCpuAuctionBid, 
  resolveAuctionWin, 
  scoreCardForPlayer, 
  getEffectiveTeamId 
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

console.log('--- RUNNING PLAYTEST 58 UNIT TESTS ---');

// --- Test 1: Negative recurring player replaced FIRST before Practice Squad for non-Saints ---
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');
  const p0 = G.players['0'];
  p0.team = { ...cowboysTeam };
  p0.isCpu = true;
  p0.genome = { ...(ACTIVE_TEAM_GENOMES.cowboys || DEFAULT_GENOME) };
  
  const watson = PHASE_1_PLAYERS.find(c => c.id === 'deshaun_watson');
  const newCard = PHASE_1_PLAYERS.find(c => c.id === 'xavier_legette');

  // Lineup: 2 Practice Squad, 1 Deshaun Watson
  p0.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...watson, uniqueId: 'watson_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' }
  ];

  G.board.highestBid = 1;
  G.board.highestBidder = '0';
  G.board.auctionPlayers = [newCard];
  G.board.activeAuctionCardIndex = 0;

  resolveAuctionWin(G, '0', newCard);

  assert.strictEqual(p0.lineup[1].id, 'xavier_legette', 'Watson should be replaced at index 1');
  assert(p0.lineup[0].isPracticeSquad, 'Practice squad at index 0 should be preserved');
  assert(p0.lineup[2].isPracticeSquad, 'Practice squad at index 2 should be preserved');
  console.log('✅ PASS: Negative recurring player (Watson) replaced FIRST before Practice Squad on non-Saints team.');
}

// --- Test 2: Ezekiel Elliott replaced FIRST before Practice Squad ---
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const texansTeam = TEAMS.find(t => t.id === 'texans');
  const p0 = G.players['0'];
  p0.team = { ...texansTeam };
  p0.isCpu = true;
  p0.genome = { ...(ACTIVE_TEAM_GENOMES.texans || DEFAULT_GENOME) };
  
  const elliott = PHASE_1_PLAYERS.find(c => c.id === 'ezekiel_elliott');
  const newCard = PHASE_1_PLAYERS.find(c => c.id === 'xavier_legette');

  p0.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...elliott, uniqueId: 'elliott_0' }
  ];

  G.board.highestBid = 1;
  G.board.highestBidder = '0';
  G.board.auctionPlayers = [newCard];
  G.board.activeAuctionCardIndex = 0;

  resolveAuctionWin(G, '0', newCard);

  assert.strictEqual(p0.lineup[2].id, 'xavier_legette', 'Elliott should be replaced at index 2');
  assert(p0.lineup[0].isPracticeSquad, 'Practice squad at index 0 should be preserved');
  assert(p0.lineup[1].isPracticeSquad, 'Practice squad at index 1 should be preserved');
  console.log('✅ PASS: Negative recurring player (Elliott) replaced FIRST before Practice Squad on Texans.');
}

// --- Test 3: Saints does NOT treat Watson as toxic because of immunity ---
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const saintsTeam = TEAMS.find(t => t.id === 'saints');
  const p0 = G.players['0'];
  p0.team = { ...saintsTeam };
  p0.isCpu = true;
  p0.genome = { ...(ACTIVE_TEAM_GENOMES.saints || DEFAULT_GENOME) };
  
  const watson = PHASE_1_PLAYERS.find(c => c.id === 'deshaun_watson');
  const newCard = PHASE_1_PLAYERS.find(c => c.id === 'xavier_legette');

  p0.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...watson, uniqueId: 'watson_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' }
  ];

  G.board.highestBid = 1;
  G.board.highestBidder = '0';
  G.board.auctionPlayers = [newCard];
  G.board.activeAuctionCardIndex = 0;

  resolveAuctionWin(G, '0', newCard);

  // Saints should replace Practice Squad first (index 0), preserving Watson (index 1)
  assert.strictEqual(p0.lineup[1].id, 'deshaun_watson', 'Saints preserves Watson (+5 coins/rd immunity engine)');
  assert.strictEqual(p0.lineup[0].id, 'xavier_legette', 'Saints replaced Practice Squad at index 0');
  console.log('✅ PASS: Saints correctly preserves Watson and replaces Practice Squad first.');
}

// --- Test 4: Xavier Legette scored HIGHER than Deshaun Watson on non-Saints ---
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');
  G.players['0'].team = { ...cowboysTeam };
  G.players['0'].isCpu = true;
  G.players['0'].genome = { ...(ACTIVE_TEAM_GENOMES.cowboys || DEFAULT_GENOME) };

  const watson = PHASE_1_PLAYERS.find(c => c.id === 'deshaun_watson');
  const legette = PHASE_1_PLAYERS.find(c => c.id === 'xavier_legette');

  const watsonScore = scoreCardForPlayer(G, '0', watson);
  const legetteScore = scoreCardForPlayer(G, '0', legette);

  console.log(`Cowboys Evaluation: Watson = ${watsonScore}, Legette = ${legetteScore}`);
  assert(legetteScore > watsonScore, `Legette (${legetteScore}) must be higher than Watson (${watsonScore})`);
  assert(watsonScore <= -20, `Watson score (${watsonScore}) must be heavily negative for non-Saints`);
  console.log('✅ PASS: Xavier Legette is scored higher than Deshaun Watson on Cowboys.');
}

// --- Test 5: Cowboys Round 1 Bidding Strategy ---
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');
  G.players['0'].team = { ...cowboysTeam };
  G.players['0'].coins = 5;
  G.players['0'].psi = 42;
  G.players['0'].isCpu = true;
  G.players['0'].genome = { ...(ACTIVE_TEAM_GENOMES.cowboys || DEFAULT_GENOME) };
  G.board.round = 1;

  // Elite player (Tier 1: George Kittle or Brock Bowers)
  const kittle = PHASE_1_PLAYERS.find(c => c.id === 'george_kittle');
  G.board.auctionPlayers = [kittle];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 1;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const eliteDecision = evaluateCpuAuctionBid(G, '0');
  console.log(`Cowboys R1 Bidding on George Kittle (Elite): bidAmount = ${eliteDecision.bidAmount}, shouldBid = ${eliteDecision.shouldBid}`);
  assert(eliteDecision.shouldBid, 'Cowboys should bid on George Kittle');
  assert.strictEqual(eliteDecision.bidAmount, 5, 'Cowboys should spend all 5 coins on Tier 1 elite centerpiece in Round 1');

  // Tier 2 player (Juju Smith-Schuster, 2 coins/rd)
  const juju = PHASE_1_PLAYERS.find(c => c.id === 'juju_smith_schuster');
  G.board.auctionPlayers = [juju];
  G.board.activeAuctionCardIndex = 0;
  G.board.highestBid = 1;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  const tier2Decision = evaluateCpuAuctionBid(G, '0');
  console.log(`Cowboys R1 Bidding on Juju Smith-Schuster (Tier 2): bidAmount = ${tier2Decision.bidAmount}, shouldBid = ${tier2Decision.shouldBid}`);
  assert(tier2Decision.shouldBid, 'Cowboys should bid on Juju Smith-Schuster');
  assert.strictEqual(tier2Decision.bidAmount, 4, 'Cowboys should spend up to 4 coins on Tier 2 starter in Round 1');

  console.log('✅ PASS: Cowboys Round 1 spending logic (5 coins for Tier 1, 4 coins for Tier 2) verified.');
}

console.log('--- ALL PLAYTEST 58 UNIT TESTS PASSED ---');
