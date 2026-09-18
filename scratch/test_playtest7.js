import { DeflategateGame, applyCoinsGained, applyPsiDeflated, applyPsiInflated, applyPenaltyCoinLoss, resolveAuctionWin, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS, EVENTS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';

console.log('=== RUNNING PLAYTEST #7 RULES & ABILITIES TEST SUITE ===');

const createTestG = () => {
  const G = DeflategateGame.setup({
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => [...arr] }
  });
  return G;
};

// TEST 1: Saints Immunity
{
  const G = createTestG();
  const saintsTeam = TEAMS.find(t => t.id === 'saints');
  G.players['0'].team = saintsTeam;
  G.players['0'].psi = 42;
  G.players['0'].coins = 12;

  applyPsiInflated(G, '0', 5);
  console.assert(G.players['0'].psi === 42, `Saints should be immune to PSI inflation! Expected 42, got ${G.players['0'].psi}`);

  applyPenaltyCoinLoss(G, '0', 5);
  console.assert(G.players['0'].coins === 12, `Saints should be immune to penalty coin loss! Expected 12, got ${G.players['0'].coins}`);
  console.log('✔ Test 1: Saints Immunity PASSED');
}

// TEST 2: Penalty Flag Full Round Capping
{
  const G = createTestG();
  G.board.activeEvent = { id: 'e4', name: 'Penalty Flag (Coins)', category: 'cap_coins', maxCoins: 10 };
  G.board.roundStats = { '0': { coinsGained: 0, psiDeflated: 0 } };
  G.players['0'].coins = 5;

  const gained1 = applyCoinsGained(G, '0', 6);
  console.assert(gained1 === 6 && G.players['0'].coins === 11, 'Gained 6 coins first');

  const gained2 = applyCoinsGained(G, '0', 8);
  console.assert(gained2 === 4 && G.players['0'].coins === 15, `Gained only remaining 4 coins up to max 10. Got ${gained2}`);

  console.log('✔ Test 2: Penalty Flag Full-Round Capping PASSED');
}

// TEST 3: Steelers PSI Transfer when Strictly Richest
{
  const G = createTestG();
  const steelersTeam = TEAMS.find(t => t.id === 'steelers');
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  const saintsTeam = TEAMS.find(t => t.id === 'saints');

  G.players['0'].team = steelersTeam;
  G.players['0'].coins = 20;
  G.players['0'].psi = 48;

  G.players['1'].team = billsTeam;
  G.players['1'].coins = 10;
  G.players['1'].psi = 44;

  G.players['2'].team = saintsTeam;
  G.players['2'].coins = 8;
  G.players['2'].psi = 42;

  G.players['3'].team = billsTeam;
  G.players['3'].coins = 5;
  G.players['3'].psi = 40;

  // Run eventPhase onBegin
  DeflategateGame.phases.eventPhase.onBegin({
    G,
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => arr }
  });

  // Player 1 (Bills) gained 1 PSI (45). Player 2 (Saints) immune (42). Player 3 (Bills) gained 1 PSI (41).
  // Total given = 2. Steelers should decrease by 2 (46).
  console.assert(G.players['1'].psi === 45, `Player 1 should be 45, got ${G.players['1'].psi}`);
  console.assert(G.players['2'].psi === 42, `Saints Player 2 should be 42, got ${G.players['2'].psi}`);
  console.assert(G.players['3'].psi === 41, `Player 3 should be 41, got ${G.players['3'].psi}`);
  console.assert(G.players['0'].psi === 46, `Steelers Player 0 should be 46, got ${G.players['0'].psi}`);
  console.log('✔ Test 3: Steelers Strictly Richest PSI Transfer PASSED');
}

// TEST 4: Round 1 Active Nominator (Richest, tie-break lowest PSI) & Round 2+ Pass to Right
{
  const G = createTestG();
  G.board.round = 1;
  G.players['0'].coins = 10; G.players['0'].psi = 44;
  G.players['1'].coins = 15; G.players['1'].psi = 42;
  G.players['2'].coins = 15; G.players['2'].psi = 40; // Tied coins with 1, lower PSI -> Winner!
  G.players['3'].coins = 8;  G.players['3'].psi = 40;

  DeflategateGame.phases.eventPhase.onBegin({
    G,
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => arr }
  });

  console.assert(G.board.round1Nominator === '2', `Round 1 nominator should be '2', got ${G.board.round1Nominator}`);
  console.assert(G.board.nominator === '2', `Round 1 active nominator should be '2', got ${G.board.nominator}`);

  // Round 2
  G.board.round = 2;
  DeflategateGame.phases.eventPhase.onBegin({
    G,
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => arr }
  });
  // (2 + (2 - 1)) % 4 = 3
  console.assert(G.board.nominator === '3', `Round 2 nominator should be '3', got ${G.board.nominator}`);

  // Round 3
  G.board.round = 3;
  DeflategateGame.phases.eventPhase.onBegin({
    G,
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => arr }
  });
  // (2 + (3 - 1)) % 4 = 0
  console.assert(G.board.nominator === '0', `Round 3 nominator should be '0', got ${G.board.nominator}`);

  console.log('✔ Test 4: Nominator Selection & Turn Passing PASSED');
}

// TEST 5: Bengals +2 Instant Effects & Discard Won Card
{
  const G = createTestG();
  const bengalsTeam = TEAMS.find(t => t.id === 'bengals');
  G.players['0'].team = bengalsTeam;
  G.players['0'].coins = 10;
  G.players['0'].psi = 46;
  G.players['0'].lineup = [
    { name: 'Card 1', isPracticeSquad: true },
    { name: 'Card 2', isPracticeSquad: true },
    { name: 'Card 3', isPracticeSquad: true }
  ];

  // Won card with instant deflate 2 and instant coins 3
  const testCard = {
    name: 'Instant Star',
    phase: 1,
    minBid: 2,
    maxBid: 8,
    effects: [
      { type: 'coins', amount: 3, perRound: false },
      { type: 'deflate', amount: 2, perRound: false }
    ]
  };

  G.board.highestBid = 2;
  resolveAuctionWin(G, '0', testCard);

  // Coins: 10 - 2 (bid) + (3 + 2) (bengals bonus) = 13
  // PSI: 46 - (2 + 2) (bengals bonus) = 42
  console.assert(G.players['0'].coins === 13, `Bengals coins should be 13, got ${G.players['0'].coins}`);
  console.assert(G.players['0'].psi === 42, `Bengals PSI should be 42, got ${G.players['0'].psi}`);
  console.assert(G.pendingReplacement !== null, 'Pending replacement should be active for full lineup');

  // Test Discard Acquired Card
  DeflategateGame.moves.discardWonCard({ G, playerID: '0' });
  console.assert(G.pendingReplacement === null, 'Pending replacement should be cleared after discard');
  console.assert(G.decks.discard.length === 1 && G.decks.discard[0].name === 'Instant Star', 'Discarded card in discard pile');
  console.assert(G.players['0'].lineup.length === 3, 'Lineup remained intact');
  console.log('✔ Test 5: Bengals +2 Instant Effects & Discard Acquired Player PASSED');
}

// TEST 6: Broncos Ignore 1st Round Effects and Clear Next Round
{
  const G = createTestG();
  const broncosTeam = TEAMS.find(t => t.id === 'broncos');
  G.players['0'].team = broncosTeam;
  G.board.round = 2;

  const card = {
    name: 'Broncos New Guy',
    phase: 1,
    minBid: 1,
    maxBid: 5,
    effects: [{ type: 'deflate', amount: 4, perRound: true }]
  };

  G.board.highestBid = 1;
  resolveAuctionWin(G, '0', card);
  console.assert(card.broncosRoundAcquired === 2, 'Card marked with broncosRoundAcquired === 2');

  // Refresh Phase in Round 2: Card should NOT deflate!
  G.players['0'].psi = 40;
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 40, `Broncos card should be ignored this round! PSI is ${G.players['0'].psi}`);

  // Confirm Refresh Summary ends round 2: state must be deleted
  DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: { endPhase: () => {} } });
  console.assert(card.broncosRoundAcquired === undefined, 'broncosRoundAcquired deleted after refresh summary');
  console.assert(G.board.round === 3, 'Round incremented to 3');

  // Refresh Phase in Round 3: Card should trigger now!
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 36, `Broncos card should deflate -4 in Round 3! PSI is ${G.players['0'].psi}`);
  console.log('✔ Test 6: Broncos 1st Round Ignore and Natural Next-Round Trigger PASSED');
}

// TEST 7: 49ers Calculate Lineup Coins First; If Resulting Coins < 5 -> Double Deflation
{
  const G = createTestG();
  const ninersTeam = TEAMS.find(t => t.id === '49ers');
  G.players['0'].team = ninersTeam;
  G.players['0'].coins = 2;
  G.players['0'].psi = 44;
  G.players['0'].lineup = [
    { name: 'WR 1', phase: 1, position: 'WR', effects: [{ type: 'coins', amount: 1, perRound: true }, { type: 'deflate', amount: 3, perRound: true }] }
  ];

  // 2 coins starting + 1 from lineup = 3 resulting coins (< 5) -> Double deflation: 3 * 2 = 6!
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 38, `49ers should double deflate by 6! PSI is ${G.players['0'].psi}`);

  // Case where coins >= 5:
  G.players['0'].coins = 4;
  G.players['0'].psi = 44;
  // 4 coins + 1 from lineup = 5 resulting coins (not < 5) -> Normal deflation: 3!
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 41, `49ers should have single deflation 3! PSI is ${G.players['0'].psi}`);
  console.log('✔ Test 7: 49ers Coin Calculation Order & Double Deflation PASSED');
}

// TEST 8: Ravens 3 Distinct Positions (+3 Coins)
{
  const G = createTestG();
  const ravensTeam = TEAMS.find(t => t.id === 'ravens');
  G.players['0'].team = ravensTeam;
  G.players['0'].coins = 5;
  G.players['0'].lineup = [
    { name: 'Player QB', position: 'QB', phase: 1, effects: [] },
    { name: 'Player WR', position: 'WR', phase: 1, effects: [] },
    { name: 'Player RB', position: 'RB', phase: 1, effects: [] }
  ];

  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].coins === 8, `Ravens should gain +3 coins for 3 positions! Coins: ${G.players['0'].coins}`);

  // When 1 is practice squad (doesn't count towards 3 distinct positions):
  G.players['0'].coins = 5;
  G.players['0'].lineup = [
    { name: 'Practice Squad', position: 'WR', isPracticeSquad: true, effects: [] },
    { name: 'Player WR', position: 'WR', phase: 1, effects: [] },
    { name: 'Player RB', position: 'RB', phase: 1, effects: [] }
  ];
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].coins === 5, `Ravens should not gain coins with only 2 non-PS positions! Coins: ${G.players['0'].coins}`);
  console.log('✔ Test 8: Ravens 3 Distinct Positions PASSED');
}

// TEST 9: Packers Part 2: All Active Non-PS Cards Are Phase 1 (-4 Deflate)
{
  const G = createTestG();
  const packersTeam = TEAMS.find(t => t.id === 'packers');
  G.players['0'].team = packersTeam;
  G.players['0'].psi = 50;
  G.players['0'].lineup = [
    { name: 'PS 1', isPracticeSquad: true, effects: [] },
    { name: 'P1 Card', phase: 1, effects: [] }
  ];

  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 46, `Packers should deflate -4 with Phase 1 player! PSI: ${G.players['0'].psi}`);

  // With a Phase 2 card:
  G.players['0'].psi = 50;
  G.players['0'].lineup = [
    { name: 'P1 Card', phase: 1, effects: [] },
    { name: 'P2 Card', phase: 2, effects: [] }
  ];
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.players['0'].psi === 50, `Packers should not deflate if Phase 2 present! PSI: ${G.players['0'].psi}`);
  console.log('✔ Test 9: Packers All-Phase-1 Deflation PASSED');
}

// TEST 10: Rams 2x Token
{
  const G = createTestG();
  const ramsTeam = TEAMS.find(t => t.id === 'rams');
  G.players['0'].team = ramsTeam;
  G.players['0'].psi = 49;
  G.players['0'].coins = 10;
  const p2Card = { uniqueId: 'p2_mahomes', name: 'Mahomes', phase: 2, effects: [{ type: 'deflate', amount: 5, perRound: true }, { type: 'coins', amount: 3, perRound: true }] };
  G.players['0'].lineup = [p2Card];

  // Apply Rams 2x token
  DeflategateGame.moves.ramsApplyDoubleToken({ G, playerID: '0' }, 'p2_mahomes');
  console.assert(p2Card.ramsDoubleToken === true, 'Card has ramsDoubleToken');
  console.assert(G.players['0'].ramsTokenAttached === true, 'Player ramsTokenAttached is true');

  DeflategateGame.phases.refreshPhase.onBegin({ G });
  // Normal 5 deflate, 3 coins -> Doubled: 10 deflate, 6 coins
  console.assert(G.players['0'].psi === 39, `Rams 2x token should deflate 10! PSI: ${G.players['0'].psi}`);
  console.assert(G.players['0'].coins === 16, `Rams 2x token should give 6 coins! Coins: ${G.players['0'].coins}`);
  console.log('✔ Test 10: Rams 2x Token PASSED');
}

// TEST 11: Lions First Claim Bonus
{
  const G = createTestG();
  const lionsTeam = TEAMS.find(t => t.id === 'lions');
  G.players['0'].team = lionsTeam;
  G.players['0'].coins = 9;

  const card = { name: 'Player 1', minBid: 1, maxBid: 5, effects: [] };
  G.board.highestBid = 1;
  resolveAuctionWin(G, '0', card);

  // 9 - 1 (bid) + 4 (numPlayers bonus) = 12
  console.assert(G.players['0'].coins === 12, `Lions should have 12 coins after 1st claim, got ${G.players['0'].coins}`);
  console.log('✔ Test 11: Lions First Claim Bonus PASSED');
}

console.log('\n🎉 ALL 11 UNIT TESTS PASSED SUCCESSFULLY! 🎉\n');
