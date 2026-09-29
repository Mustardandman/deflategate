import assert from 'assert';
import { 
  DeflategateGame, 
  scoreCardForPlayer, 
  chooseCpuNominationCard, 
  evaluateCpuAuctionBid, 
  resolveAuctionWin 
} from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Running Playtest 42: Bengals AI Verification Suite ===\n');

function createMockBengalsGameState(bengalsCoins = 9, bengalsPsi = 46, round = 1) {
  const G = {
    players: {
      '0': {
        id: '0',
        team: TEAMS.find(t => t.id === 'bengals'),
        coins: bengalsCoins,
        psi: bengalsPsi,
        lineup: [
          { id: 'ps_1', name: 'Practice Squad 1', position: 'WR', effects: [] },
          { id: 'ps_2', name: 'Practice Squad 2', position: 'RB', effects: [] },
          { id: 'ps_3', name: 'Practice Squad 3', position: 'TE', effects: [] }
        ],
        isCpu: true,
        cardsWonThisRound: 0,
        genome: { ...ACTIVE_TEAM_GENOMES.bengals }
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

// 1. Hunter Henry Discard-on-Acquire & +2 Instant Boost Test
console.log('Test 1: Hunter Henry Discard-on-Acquire (+10 Instant Deflation & Zero Inflation Penalty)');
{
  const G = createMockBengalsGameState(9, 46, 1);
  const hunterHenry = {
    id: 'hunter_henry',
    name: 'Hunter Henry',
    position: 'TE',
    minBid: 1,
    maxBid: 12,
    phase: 1,
    effects: [
      { type: 'deflate', amount: 8, perRound: false },
      { type: 'inflate', amount: 3, perRound: true }
    ]
  };
  G.board.auctionPlayers = [hunterHenry];
  G.board.highestBid = 5;
  G.board.highestBidder = '0';

  const initialPsi = G.players['0'].psi;
  resolveAuctionWin(G, '0', hunterHenry);

  console.log(`  Bengals PSI before: ${initialPsi}, after: ${G.players['0'].psi} (-${initialPsi - G.players['0'].psi})`);
  assert.strictEqual(G.players['0'].psi, initialPsi - 10, 'Bengals should gain 8 + 2 = 10 instant deflation from Hunter Henry');

  // Verify Hunter Henry is discarded and NOT in lineup
  const inLineup = G.players['0'].lineup.some(c => c.id === 'hunter_henry');
  const inDiscard = (G.decks.discard || []).some(c => c.id === 'hunter_henry');
  console.log(`  Hunter Henry in Lineup? ${inLineup} | in Discard? ${inDiscard}`);
  assert.strictEqual(inLineup, false, 'Hunter Henry should NOT be in Bengals active lineup');
  assert.strictEqual(inDiscard, true, 'Hunter Henry should be discarded immediately upon acquisition');
  console.log('  -> PASS: Hunter Henry successfully granted 10 deflation and was immediately discarded!\n');
}

// 2. Pure Instant Card Discard Churn (Malik Nabers / Rome Odunze)
console.log('Test 2: Pure Instant Card Discard Churn (Malik Nabers +7 Instant Coins)');
{
  const G = createMockBengalsGameState(5, 40, 2);
  const nabers = {
    id: 'malik_nabers',
    name: 'Malik Nabers',
    position: 'WR',
    minBid: 1,
    maxBid: 3,
    phase: 1,
    effects: [{ type: 'coins', amount: 5, perRound: false }]
  };
  G.board.auctionPlayers = [nabers];
  G.board.highestBid = 3;
  G.board.highestBidder = '0';

  const initialCoins = G.players['0'].coins;
  resolveAuctionWin(G, '0', nabers);

  // Spent 3 coins, gained 5 + 2 = 7 coins (net +4)
  console.log(`  Coins before: ${initialCoins}, after: ${G.players['0'].coins} (Net: +${G.players['0'].coins - initialCoins})`);
  assert.strictEqual(G.players['0'].coins, initialCoins - 3 + 7, 'Bengals should net +4 coins from Malik Nabers (5 + 2 = 7 gain, 3 paid)');

  const inLineup = G.players['0'].lineup.some(c => c.id === 'malik_nabers');
  const inDiscard = (G.decks.discard || []).some(c => c.id === 'malik_nabers');
  console.log(`  Nabers in Lineup? ${inLineup} | in Discard? ${inDiscard}`);
  assert.strictEqual(inLineup, false, 'Pure instant card should NOT remain in active lineup');
  assert.strictEqual(inDiscard, true, 'Pure instant card should be discarded to preserve lineup cleanliness');
  console.log('  -> PASS: Pure instant card correctly triggered +7 coins and was discarded!\n');
}

// 3. Superior Lineup Preservation on Recurring Acquisition
console.log('Test 3: Superior Lineup Preservation (Discarding Inferior Recurring Card)');
{
  const G = createMockBengalsGameState(10, 30, 4);
  // Setup 3 strong recurring starters
  G.players['0'].lineup = [
    { id: 'kirk_cousins', name: 'Kirk Cousins', position: 'QB', effects: [{ type: 'coins', amount: 3, perRound: true }] },
    { id: 'derrick_henry', name: 'Derrick Henry', position: 'RB', effects: [{ type: 'deflate', amount: 4, perRound: true }] },
    { id: 'george_kittle', name: 'George Kittle', position: 'TE', effects: [{ type: 'coins', amount: 3, perRound: true }] }
  ];

  // Bengals acquires an inferior recurring player (e.g. 1 coin/round)
  const scrubCard = {
    id: 'scrub_player',
    name: 'Scrub Player',
    position: 'WR',
    minBid: 1,
    maxBid: 5,
    phase: 1,
    effects: [{ type: 'coins', amount: 1, perRound: true }]
  };
  G.board.auctionPlayers = [scrubCard];
  G.board.highestBid = 1;
  G.board.highestBidder = '0';

  resolveAuctionWin(G, '0', scrubCard);

  // Lineup should still have Cousins, Henry, and Kittle!
  const hasCousins = G.players['0'].lineup.some(c => c.id === 'kirk_cousins');
  const hasHenry = G.players['0'].lineup.some(c => c.id === 'derrick_henry');
  const hasKittle = G.players['0'].lineup.some(c => c.id === 'george_kittle');
  const hasScrub = G.players['0'].lineup.some(c => c.id === 'scrub_player');
  const scrubInDiscard = (G.decks.discard || []).some(c => c.id === 'scrub_player');

  console.log(`  Lineup preserved? Cousins:${hasCousins}, Henry:${hasHenry}, Kittle:${hasKittle}, ScrubInLineup:${hasScrub}, ScrubInDiscard:${scrubInDiscard}`);
  assert.strictEqual(hasCousins && hasHenry && hasKittle, true, 'All 3 superior starters should remain in active lineup');
  assert.strictEqual(hasScrub, false, 'Inferior recurring card should NOT displace active starters');
  assert.strictEqual(scrubInDiscard, true, 'Inferior recurring card should be discarded via Bengals ability');
  console.log('  -> PASS: Bengals successfully discarded inferior recurring card to protect superior lineup!\n');
}

// 4. Roster Composition: 3rd Slot Tie-Breaker Preference for Instant
console.log('Test 4: Third Slot Tie-Breaker Preference for Instant Card');
{
  const G = createMockBengalsGameState(8, 40, 2);
  // Setup 2 recurring engines and 1 practice squad
  G.players['0'].lineup = [
    { id: 'player_1', name: 'Player 1', position: 'QB', effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { id: 'player_2', name: 'Player 2', position: 'RB', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { id: 'ps_3', name: 'Practice Squad 3', position: 'TE', effects: [] }
  ];

  const instantCard = { id: 'swift', name: 'D’Andre Swift', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'deflate', amount: 4, perRound: false }] };
  const scoreInstant = scoreCardForPlayer(instantCard, G.players['0'], G, '0');
  console.log('  Score for Swift (4+2 instant deflate):', scoreInstant.toFixed(1));
  assert.ok(scoreInstant > 15.0, 'Bengals should strongly value instant card when holding 2 engines');
  console.log('  -> PASS: 3rd slot tiebreaker correctly favors high-value instant card!\n');
}

// 5. Nomination Prioritization Test
console.log('Test 5: Bengals Nomination Prioritization');
{
  const G = createMockBengalsGameState(9, 44, 1);
  const cardA = { id: 'generic_wr', name: 'Generic WR', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
  const cardB = { id: 'hunter_henry', name: 'Hunter Henry', minBid: 1, maxBid: 12, phase: 1, effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] };
  const cardC = { id: 'generic_rb', name: 'Generic RB', minBid: 2, maxBid: 6, phase: 1, effects: [{ type: 'coins', amount: 1, perRound: true }] };
  G.board.auctionPlayers = [cardA, cardB, cardC];

  const nomIdx = chooseCpuNominationCard(G, '0');
  console.log('  Nominated Card:', G.board.auctionPlayers[nomIdx]?.name);
  assert.strictEqual(nomIdx, 1, 'Bengals should nominate Hunter Henry as top priority exploit');
  console.log('  -> PASS: Nomination correctly targets Hunter Henry for boosted instant deflation!\n');
}

console.log('=== ALL PLAYTEST 42 BENGALS TESTS PASSED SUCCESSFULLY! ===');
