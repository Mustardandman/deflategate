import assert from 'assert';
import { 
  DeflategateGame, 
  scoreCardForPlayer, 
  doesCardFitTeamStrategy,
  resolveAuctionWin,
  getEffectiveCardMaxBid 
} from '../src/Game.js';

console.log('--- Starting Playtest #15 Verification Tests ---\n');

// ----------------------------------------------------------------------------
// Test 1: Jaguars CPU Deck Reordering Timing in eventPhase.onBegin
// ----------------------------------------------------------------------------
console.log('Test 1: CPU Jaguars reorders the event deck BEFORE the event is drawn');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });
  
  // Assign Jaguars to Player 1 (CPU)
  G.players['1'].team = { id: 'jaguars', name: 'Jaguars' };
  G.players['1'].isCpu = true;
  G.board.jaguarsAbilityUsed = false;
  G.board.round = 3; // Round >= 3 triggers Jaguars CPU ability

  // Set event deck with an ordinary event on top and high-impact double event underneath
  const normalEvent = { id: 'test_norm', name: 'Normal Event', category: 'normal_trade' };
  const doubleEvent = { id: 'test_double', name: 'Double Battle', category: 'double_all' };
  G.decks.event = [normalEvent, doubleEvent];

  // Invoke eventPhase.onBegin
  game.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });

  // Verify CPU Jaguars triggered
  assert.strictEqual(G.board.jaguarsAbilityUsed, true, 'Jaguars ability should be marked as used');
  assert(G.board.jaguarsPopupNotification !== null, 'Jaguars popup notification should be set');
  
  // The event revealed should be the doubleEvent because CPU sorted the deck before drawing!
  assert.strictEqual(G.board.activeEvent.id, 'test_double', 'Active event drawn should be the reordered top event (double_all)');
  console.log('  ✔ CPU Jaguars successfully reordered deck BEFORE event draw (active event is double_all)');
}

// ----------------------------------------------------------------------------
// Test 2: Jaguars Popup Dismissal in eventPhase & other phases
// ----------------------------------------------------------------------------
console.log('\nTest 2: dismissJaguarsPopup in eventPhase and all phase move tables');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });
  G.board.jaguarsPopupNotification = '🐆 Jaguars Ability Used!';

  // Test dismiss in eventPhase.moves
  assert(typeof game.phases.eventPhase.moves.dismissJaguarsPopup === 'function', 'eventPhase must have dismissJaguarsPopup');
  game.phases.eventPhase.moves.dismissJaguarsPopup({ G });
  assert.strictEqual(G.board.jaguarsPopupNotification, null, 'dismissJaguarsPopup in eventPhase should clear notification');

  // Test dismiss in preAuctionPhase, postAuctionPhase, refreshPhase
  assert(typeof game.phases.preAuctionPhase.moves.dismissJaguarsPopup === 'function', 'preAuctionPhase must have dismissJaguarsPopup');
  assert(typeof game.phases.postAuctionPhase.moves.dismissJaguarsPopup === 'function', 'postAuctionPhase must have dismissJaguarsPopup');
  assert(typeof game.phases.refreshPhase.moves.dismissJaguarsPopup === 'function', 'refreshPhase must have dismissJaguarsPopup');
  console.log('  ✔ dismissJaguarsPopup is present in all phases and dismisses popup without freeze');
}

// ----------------------------------------------------------------------------
// Test 3: Bengals Instant Targeting & Discard Flexibility AI Scoring
// ----------------------------------------------------------------------------
console.log('\nTest 3: Bengals instant card scoring & discard flexibility');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });
  G.board.round = 2; // 8 rounds left

  // Setup Player 0 as Bengals
  G.players['0'].team = { id: 'bengals', name: 'Bengals' };
  G.players['0'].isCpu = true;
  G.players['0'].personality = 'tycoon';

  // Setup Player 1 as a control team (e.g. Patriots)
  G.players['1'].team = { id: 'patriots', name: 'Patriots' };
  G.players['1'].isCpu = true;
  G.players['1'].personality = 'tycoon';

  const instantCard = {
    id: 'instant_pollard',
    name: 'Tony Pollard',
    position: 'RB',
    minBid: 2,
    maxBid: 7,
    effects: [{ type: 'deflate', amount: 4, perRound: false }]
  };

  // Case A: 0 per-round engines
  G.players['0'].lineup = [];
  G.players['1'].lineup = [];
  const bengalsScoreEmpty = scoreCardForPlayer(G, '0', instantCard);
  const patriotsScoreEmpty = scoreCardForPlayer(G, '1', instantCard);
  // Bengals gets +2 deflate (+2 * 1.1 = +2.2 or higher depending on weight)
  assert(bengalsScoreEmpty > patriotsScoreEmpty, 'Bengals should score instant card higher than Patriots due to +2 instant bonus');

  // Case B: Holding 2 per-round engines (Bengals heavily targets instant cards)
  const engine1 = { id: 'eng1', name: 'Engine 1', effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const engine2 = { id: 'eng2', name: 'Engine 2', effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  G.players['0'].lineup = [engine1, engine2];
  G.players['1'].lineup = [engine1, engine2];

  const bengalsScoreWithEngines = scoreCardForPlayer(G, '0', instantCard);
  const patriotsScoreWithEngines = scoreCardForPlayer(G, '1', instantCard);
  // Bengals gets rotation bonus (+5.0) + specific targeting bonus (+5.0) = +10.0 boost on top of +2 bonus
  assert(bengalsScoreWithEngines >= patriotsScoreWithEngines + 10.0, 'Bengals with 2 engines should get massive targeting bonus (+10+) for instant cards');

  // Case C: Full Lineup (3 per-round engines) - Opportunity cost discard flexibility
  const engine3 = { id: 'eng3', name: 'Engine 3', effects: [{ type: 'coins', amount: 2, perRound: true }] };
  G.players['0'].lineup = [engine1, engine2, engine3];
  G.players['1'].lineup = [engine1, engine2, engine3];

  const bengalsScoreFull = scoreCardForPlayer(G, '0', instantCard);
  const patriotsScoreFull = scoreCardForPlayer(G, '1', instantCard);
  // Patriots suffer heavy opportunity cost penalty because they must discard an engine to take Pollard
  // Bengals has discard flexibility, so opportunity cost = 0!
  assert(bengalsScoreFull > 0, 'Bengals score for instant card should remain positive with full lineup due to discard flexibility');
  assert(patriotsScoreFull < 0, 'Patriots score for instant card should be heavily negative due to replacing an ongoing engine');

  console.log(`  ✔ Bengals instant valuation: Empty=${bengalsScoreEmpty.toFixed(1)}, With 2 Engines=${bengalsScoreWithEngines.toFixed(1)}, Full Lineup=${bengalsScoreFull.toFixed(1)} vs Patriots Full=${patriotsScoreFull.toFixed(1)}`);
}

// ----------------------------------------------------------------------------
// Test 4: CPU Bengals Lineup Discard Preservation on Acquisition
// ----------------------------------------------------------------------------
console.log('\nTest 4: CPU Bengals discards won instant card when holding 3 per-round engines');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });
  G.decks.discard = [];

  const bengalsPlayer = G.players['0'];
  bengalsPlayer.team = { id: 'bengals', name: 'Bengals' };
  bengalsPlayer.isCpu = true;
  bengalsPlayer.psi = 40;
  bengalsPlayer.coins = 10;

  const engA = { id: 'ea', name: 'Engine A', effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const engB = { id: 'eb', name: 'Engine B', effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  const engC = { id: 'ec', name: 'Engine C', effects: [{ type: 'coins', amount: 2, perRound: true }] };
  bengalsPlayer.lineup = [engA, engB, engC];

  const wonInstantCard = {
    id: 'pollard',
    name: 'Tony Pollard',
    effects: [{ type: 'deflate', amount: 4, perRound: false }]
  };

  resolveAuctionWin(G, '0', wonInstantCard);

  // Lineup should still have all 3 engines intact!
  assert.strictEqual(bengalsPlayer.lineup.length, 3, 'Lineup length must stay 3');
  assert.strictEqual(bengalsPlayer.lineup[0].id, 'ea', 'Engine A preserved');
  assert.strictEqual(bengalsPlayer.lineup[1].id, 'eb', 'Engine B preserved');
  assert.strictEqual(bengalsPlayer.lineup[2].id, 'ec', 'Engine C preserved');

  // The instant card should have been discarded
  assert.strictEqual(G.decks.discard.length, 1, 'Discard pile should have 1 card');
  assert.strictEqual(G.decks.discard[0].id, 'pollard', 'Won instant card placed in discard pile');

  // Bengals +2 bonus should have applied: Pollard deflates 4 + 2 = 6 PSI
  assert.strictEqual(bengalsPlayer.psi, 34, 'Bengals PSI should deflate by 4 + 2 = 6 PSI (40 -> 34)');
  console.log('  ✔ CPU Bengals successfully activated instant payoff (+2 bonus) and preserved all 3 per-round engines');
}

// ----------------------------------------------------------------------------
// Test 5: Texans QB AI Targeting & Strategy
// ----------------------------------------------------------------------------
console.log('\nTest 5: Texans heavily target QBs due to Refresh Phase passive ability');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });
  G.board.round = 2; // 8 rounds left

  // Setup Texans player
  G.players['0'].team = { id: 'texans', name: 'Texans' };
  G.players['0'].isCpu = true;
  G.players['0'].personality = 'tycoon';

  // Setup Control player (Ravens)
  G.players['1'].team = { id: 'ravens', name: 'Ravens' };
  G.players['1'].isCpu = true;
  G.players['1'].personality = 'tycoon';

  const qbCard = {
    id: 'qb_hurts',
    name: 'Jalen Hurts',
    position: 'QB',
    minBid: 2,
    maxBid: 15,
    effects: [
      { type: 'deflate', amount: 2, perRound: true },
      { type: 'coins', amount: 2, perRound: true }
    ]
  };

  const nonQbCard = {
    id: 'wr_adams',
    name: 'Davante Adams',
    position: 'WR',
    minBid: 2,
    maxBid: 16,
    effects: [
      { type: 'deflate', amount: 2, perRound: true },
      { type: 'coins', amount: 2, perRound: true }
    ]
  };

  const texansQbScore = scoreCardForPlayer(G, '0', qbCard);
  const texansNonQbScore = scoreCardForPlayer(G, '0', nonQbCard);
  const ravensQbScore = scoreCardForPlayer(G, '1', qbCard);

  // Texans score for QB should be dramatically higher than for an identical WR
  // (Refresh ability gives +2 coins and +2 deflate per round = 16 coins & 16 deflate over 8 rounds + 8.0 boost)
  assert(texansQbScore > texansNonQbScore + 30, 'Texans must heavily value QB over non-QB with same base effects');
  assert(texansQbScore > ravensQbScore + 30, 'Texans must value QB much higher than other teams');

  // Verify strategy check
  assert.strictEqual(doesCardFitTeamStrategy('texans', qbCard), true, 'QB fits Texans team strategy');
  assert.strictEqual(doesCardFitTeamStrategy('texans', nonQbCard), false, 'Non-QB does not fit Texans QB strategy');

  console.log(`  ✔ Texans QB score (${texansQbScore.toFixed(1)}) vs non-QB (${texansNonQbScore.toFixed(1)}) and other team (${ravensQbScore.toFixed(1)})`);
}

// ----------------------------------------------------------------------------
// Test 6: Overpaid Event Max Price Calculation
// ----------------------------------------------------------------------------
console.log('\nTest 6: Overpaid Event +4 max bid modifier');
{
  const card = { id: 'test_card', name: 'Test Player', minBid: 2, maxBid: 10 };
  const normalEvent = { category: 'double_all' };
  const overpaidEvent = { category: 'overpaid' };

  assert.strictEqual(getEffectiveCardMaxBid(card, normalEvent), 10, 'Normal event should leave maxBid unchanged');
  assert.strictEqual(getEffectiveCardMaxBid(card, overpaidEvent), 14, 'Overpaid event should increase maxBid by +4');
  console.log('  ✔ Overpaid event correctly boosts max bid by +4 (10 -> 14)');
}

console.log('\n--- ALL PLAYTEST #15 TESTS PASSED SUCCESSFULLY! ---');
