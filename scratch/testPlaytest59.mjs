import assert from 'assert';
import { 
  DeflategateGame, 
  evaluateCpuAuctionBid, 
  resolveAuctionWin, 
  scoreCardForPlayer, 
  chooseCpuCommandersMarkCard,
  chooseCpuNominationCard,
  getEffectiveTeamId 
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

console.log('--- RUNNING PLAYTEST 59 UNIT & LOGIC VERIFICATION ---');

const ALL_PLAYERS = [...PHASE_1_PLAYERS, ...PHASE_2_PLAYERS];
function getCard(id) {
  const c = ALL_PLAYERS.find(p => p.id === id);
  if (!c) throw new Error(`Card not found: ${id}`);
  return { ...c };
}

// ============================================================================
// TEST GROUP 1: Universal Cycle Strategy
// ============================================================================
console.log('\n--- Group 1: Universal Cycle Strategy ---');

{
  // Test 1.1: Core Recurring Engine (< 2 recurring cards)
  // When a team has 0 or 1 recurring card, recurring cards receive +4.5 bonus.
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'bears') };
  p0.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];
  G.board.round = 1;

  const recurringDeflate = getCard('travis_kelce'); // recurring -2 PSI
  const instantCard = getCard('xavier_legette');    // instant coin gain

  const scoreRecurring = scoreCardForPlayer(G, '0', recurringDeflate);
  const scoreInstant = scoreCardForPlayer(G, '0', instantCard);

  assert(scoreRecurring > scoreInstant, 'Recurring card should be favored over instant card in engine building stage');
  console.log('✅ PASS: Core Recurring Engine (< 2 recurring) favors recurring cards for foundation building.');
}

{
  // Test 1.2: Cycle Spot (>= 2 recurring cards)
  // Once 2 recurring cards are locked in, instant cards receive +2.5 cycle bonus.
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'bears') };
  p0.lineup = [
    { ...getCard('travis_kelce'), uniqueId: 'rec_1' },
    { ...getCard('derrick_henry'), uniqueId: 'rec_2' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];
  G.board.round = 3;

  const cycleCard = getCard('ezekiel_elliott'); // 1-shot instant deflation
  const scoreCycle = scoreCardForPlayer(G, '0', cycleCard);

  // Compare to hypothetical where player had 0 recurring cards in round 3
  const p0Clone = JSON.parse(JSON.stringify(p0));
  p0Clone.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];
  const GClone = { ...G, players: { ...G.players, '0': p0Clone } };
  const scoreWithout2Engines = scoreCardForPlayer(GClone, '0', cycleCard);

  assert(scoreCycle > scoreWithout2Engines, 'Instant card should receive cycle bonus when 2 recurring engines are present');
  console.log('✅ PASS: Cycle Spot (>= 2 recurring) values instant rotation cards as active cycle weapons.');
}

// ============================================================================
// TEST GROUP 2: Philadelphia Eagles Strategy & Balance
// ============================================================================
console.log('\n--- Group 2: Philadelphia Eagles Strategy & Balance ---');

{
  // Test 2.1: Eagles Genome & Reserve Coins
  const eaglesGenome = ACTIVE_TEAM_GENOMES.eagles;
  assert.strictEqual(eaglesGenome.deflateWeight, 1.4, 'Eagles deflateWeight should be 1.4');
  assert.strictEqual(eaglesGenome.coinWeight, 1.7, 'Eagles coinWeight should be 1.7');
  assert.strictEqual(eaglesGenome.reserveCoins, 6, 'Eagles reserveCoins should be 6');
  assert(eaglesGenome.coinWeight > eaglesGenome.deflateWeight, 'Eagles must value coins over deflation');
  console.log('✅ PASS: Eagles genome active weights match specification (coinWeight 1.7 > deflateWeight 1.4, reserveCoins 6).');
}

{
  // Test 2.2: Eagles Lineup Balance (Needs 1 Deflation + 1 Coin Engine)
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'eagles') };
  p0.genome = { ...ACTIVE_TEAM_GENOMES.eagles };
  p0.lineup = [
    { ...getCard('travis_kelce'), uniqueId: 'rec_def' }, // Has recurring deflate
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];
  G.board.round = 2;

  const recurringCoin = getCard('aj_brown'); // recurring coin card (+3 coins/round)
  const anotherDeflate = getCard('derrick_henry'); // another recurring deflate (+4 deflate/round)

  const scoreCoin = scoreCardForPlayer(G, '0', recurringCoin);
  const scoreDeflate = scoreCardForPlayer(G, '0', anotherDeflate);

  assert(scoreCoin > scoreDeflate, 'Eagles with 1 deflate engine should strongly prioritize acquiring 1 coin engine for balance');
  console.log('✅ PASS: Eagles lineup balance prioritizes missing coin half when deflate half is satisfied.');
}

{
  // Test 2.3: Eagles Early Game Prudence in postAuctionPhase
  // In Rounds 1-2, Tush Push should NOT trigger regardless of coins.
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'eagles') };
  p0.coins = 10;
  p0.psi = 24;
  G.players['1'].psi = 20; // Opponent
  G.board.round = 1;

  // Simulate postAuctionPhase.onBegin
  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  assert.strictEqual(p0.coins, 10, 'Coins should not be spent on Tush Push in Round 1');
  assert.strictEqual(G.players['1'].psi, 20, 'Opponent PSI should not be inflated in Round 1');

  G.board.round = 2;
  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  assert.strictEqual(p0.coins, 10, 'Coins should not be spent on Tush Push in Round 2');
  assert.strictEqual(G.players['1'].psi, 20, 'Opponent PSI should not be inflated in Round 2');
  console.log('✅ PASS: Eagles Early Game Prudence preserves coins during Rounds 1 and 2.');
}

{
  // Test 2.4: Eagles Endgame Suffocation (Rounds 3+)
  // In Round 3+, Tush Push triggers when coins are sufficient.
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'eagles') };
  p0.coins = 9;
  p0.psi = 20;
  const p1 = G.players['1'];
  p1.team = { ...TEAMS.find(t => t.id === 'patriots') };
  p1.psi = 15; // Rival
  G.board.round = 4;

  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  assert(p0.coins < 9, 'Coins should be spent on Tush Push in Round 4');
  assert(p1.psi > 15, 'Rival PSI should be inflated by Tush Push in Round 4');
  console.log(`✅ PASS: Eagles Endgame Suffocation actively uses Tush Push in Round 4 (p0 coins: ${p0.coins}, p1 PSI: ${p1.psi}).`);
}

{
  // Test 2.5: Anti-Saints Tactics (Top Contender Check)
  // When Saints is the top contender, Philadelphia does NOT waste coins on Tush Push.
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'eagles') };
  p0.coins = 10;
  p0.psi = 22;

  const p1 = G.players['1'];
  p1.team = { ...TEAMS.find(t => t.id === 'saints') };
  p1.psi = 12; // Saints is the lowest PSI leader!

  const p2 = G.players['2'];
  p2.team = { ...TEAMS.find(t => t.id === 'bears') };
  p2.psi = 20;

  G.board.round = 4;
  DeflategateGame.phases.postAuctionPhase.onBegin({ G });

  assert.strictEqual(p0.coins, 10, 'Eagles should not use Tush Push when Saints is the top contender');
  console.log('✅ PASS: Eagles switch tactics and hold Tush Push when Saints is the top contender.');

  // But if Saints is NOT the top contender, Eagles still uses Tush Push on the actual leader!
  p1.psi = 24; // Saints is lagging behind
  p2.psi = 12; // Bears is top contender
  DeflategateGame.phases.postAuctionPhase.onBegin({ G });
  assert(p0.coins < 10, 'Eagles should use Tush Push when Saints is NOT the top contender');
  assert.strictEqual(p2.psi, 18, 'Top contender Bears should receive double Tush Push inflation (+6 PSI)');
  console.log('✅ PASS: Eagles resumes Tush Push when Saints is in the game but NOT the top contender.');
}

// ============================================================================
// TEST GROUP 3: Washington Commanders Overhaul
// ============================================================================
console.log('\n--- Group 3: Washington Commanders Overhaul ---');

{
  // Test 3.1: Poison Avoidance (Trevor Lawrence & Hunter Henry)
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const p0 = G.players['0'];
  p0.team = { ...TEAMS.find(t => t.id === 'commanders') };
  p0.genome = { ...ACTIVE_TEAM_GENOMES.commanders };

  const trevor = getCard('trevor_lawrence'); // +8 instant inflate poison
  const hunter = getCard('hunter_henry');    // +3 recurring inflate poison

  const scoreTrevor = scoreCardForPlayer(G, '0', trevor);
  const scoreHunter = scoreCardForPlayer(G, '0', hunter);

  assert(scoreTrevor <= -100, `Trevor Lawrence should be heavily penalized (got ${scoreTrevor})`);
  assert(scoreHunter <= -100, `Hunter Henry should be heavily penalized (got ${scoreHunter})`);
  console.log('✅ PASS: Commanders severely penalizes self-inflation poison cards.');
}

{
  // Test 3.2: Affordability Guard in chooseCpuCommandersMarkCard
  // Never mark cards where card.minBid > firstPlayer.coins
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const pCmd = G.players['0'];
  pCmd.team = { ...TEAMS.find(t => t.id === 'commanders') };
  pCmd.coins = 6;

  const pFirst = G.players['1'];
  pFirst.team = { ...TEAMS.find(t => t.id === 'patriots') };
  pFirst.coins = 1; // First player only has 1 coin!
  G.board.firstPlayer = '1';

  const expensiveCard = { ...getCard('travis_kelce'), minBid: 3 };
  const cheapCard = { ...getCard('xavier_legette'), minBid: 1 };
  G.board.auctionPlayers = [expensiveCard, cheapCard];

  const markedIdx = chooseCpuCommandersMarkCard(G, '0');
  const markedCard = G.board.auctionPlayers[markedIdx];
  assert.strictEqual(markedCard.id, cheapCard.id, 'Must NOT mark card First Player cannot afford');
  console.log('✅ PASS: Commanders Affordability Guard prevents marking unaffordable cards.');
}

{
  // Test 3.3: Shield / Dibs Mode vs Embargo Mode
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const pCmd = G.players['0'];
  pCmd.team = { ...TEAMS.find(t => t.id === 'commanders') };
  pCmd.coins = 6;
  pCmd.psi = 22;

  const pFirst = G.players['1'];
  pFirst.team = { ...TEAMS.find(t => t.id === 'patriots') };
  pFirst.coins = 5;
  pFirst.psi = 22; // Not dangerous (PSI > 18)
  G.board.firstPlayer = '1';

  const highDemandCard = { ...getCard('derrick_henry'), minBid: 2 }; // Both want it
  const fillerCard = { ...getCard('xavier_legette'), minBid: 1 };
  G.board.auctionPlayers = [highDemandCard, fillerCard];

  const markedIdx = chooseCpuCommandersMarkCard(G, '0');
  const markedCard = G.board.auctionPlayers[markedIdx];
  assert.strictEqual(markedCard.id, highDemandCard.id, 'Shield / Dibs mode should claim the card Commanders wants');
  console.log('✅ PASS: Commanders Shield/Dibs mode protects elite target from First Player.');
}

{
  // Test 3.4: Commanders Nomination of Unlocked Shielded Target
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const pCmd = G.players['0'];
  pCmd.team = { ...TEAMS.find(t => t.id === 'commanders') };
  pCmd.coins = 5;
  pCmd.lineup = [
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
    { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
  ];

  const targetCard = { ...getCard('derrick_henry'), minBid: 2, id: 'derrick_henry' };
  const otherCard = { ...getCard('xavier_legette'), minBid: 1, id: 'xavier_legette' };
  G.board.auctionPlayers = [otherCard, targetCard];
  G.board.commandersShieldedCardId = 'derrick_henry';
  G.board.commandersMarkedCardIndex = null; // Unlocked!

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];
  assert.strictEqual(nominatedCard.id, 'derrick_henry', 'Commanders should nominate their unlocked shielded target');
  console.log('✅ PASS: Commanders nominates unlocked shielded card to secure it.');
}

{
  // Test 3.5: Commanders Conviction Bidding on Shielded Target
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 0, vsCpu: true });
  const pCmd = G.players['0'];
  pCmd.team = { ...TEAMS.find(t => t.id === 'commanders') };
  pCmd.coins = 6;
  pCmd.genome = { ...ACTIVE_TEAM_GENOMES.commanders };
  G.board.round = 1;

  const targetCard = { ...getCard('derrick_henry'), minBid: 2, id: 'derrick_henry' };
  G.board.auctionPlayers = [targetCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.commandersShieldedCardId = 'derrick_henry';
  G.board.highestBid = 3;

  const res = evaluateCpuAuctionBid(G, '0', targetCard);
  assert(res.shouldBid && res.bidAmount >= 4, `Commanders should bid aggressively (>= 4) for their shielded target (got ${JSON.stringify(res)})`);
  console.log(`✅ PASS: Commanders bids with conviction (${res.bidAmount} coins) on shielded target.`);
}

console.log('\n============================================================');
console.log('🎉 ALL PLAYTEST 59 UNIT & LOGIC TESTS PASSED PERFECTLY!');
console.log('============================================================\n');
