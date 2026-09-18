import assert from 'assert';
import { 
  DeflategateGame, 
  advanceFreeAgencyQueue,
  advanceNewCapLimitQueue,
  advancePukaQueue,
  scoreCardForPlayer,
  resolveAuctionWin,
  getEffectiveTeamId
} from '../src/Game.js';

console.log('================================================================');
console.log('--- STARTING PVP & PVP-VS-CPU COMPREHENSIVE VERIFICATION SUITE ---');
console.log('================================================================\n');

// Mock context and events
const createMockCtx = (numPlayers = 4, currentPlayer = '0') => ({
  numPlayers,
  currentPlayer,
  playOrder: Array.from({ length: numPlayers }, (_, i) => String(i)),
  activePlayers: null
});

// ----------------------------------------------------------------------------
// Test 1: Team Selection with 2 Humans + 2 CPUs
// ----------------------------------------------------------------------------
console.log('Test 1: Team Selection - 2 Humans + 2 CPUs');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });

  assert.strictEqual(G.numHumans, 2, 'numHumans should be 2');
  assert.strictEqual(G.players['0'].isCpu, false, 'Player 0 should be human');
  assert.strictEqual(G.players['1'].isCpu, false, 'Player 1 should be human');
  assert.strictEqual(G.players['2'].isCpu, true, 'Player 2 should be CPU');
  assert.strictEqual(G.players['3'].isCpu, true, 'Player 3 should be CPU');

  const moves = game.phases.teamSelection.moves;
  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  // Human 0 selects their 1st choice
  const p0Choice = G.players['0'].teamChoices[0];
  moves.selectTeam({ G, playerID: '0', events }, 0, '0');
  assert.strictEqual(G.players['0'].team.id, p0Choice.id, `Player 0 selected ${p0Choice.name}`);
  assert.strictEqual(G.players['2'].team, null, 'CPUs should NOT be assigned yet while humans are picking');
  assert.strictEqual(phaseEnded, false, 'Phase should NOT end after first human picks');

  // Human 1 selects their 1st choice
  const p1Choice = G.players['1'].teamChoices[0];
  moves.selectTeam({ G, playerID: '0', events }, 0, '1');
  assert.strictEqual(G.players['1'].team.id, p1Choice.id, `Player 1 selected ${p1Choice.name}`);
  assert(G.players['2'].team !== null, 'Player 2 (CPU) should now be assigned a team');
  assert(G.players['3'].team !== null, 'Player 3 (CPU) should now be assigned a team');
  assert.strictEqual(phaseEnded, true, 'Phase should end after all humans have selected their teams');
  console.log('  ✔ 2 Humans selected teams sequentially; CPUs automatically assigned remaining teams afterwards');
}

// ----------------------------------------------------------------------------
// Test 2: Team Selection with 4 Humans (Full Pass & Play / Online PvP)
// ----------------------------------------------------------------------------
console.log('\nTest 2: Team Selection - 4 Humans');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 4 });

  for (let i = 0; i < 4; i++) {
    assert.strictEqual(G.players[String(i)].isCpu, false, `Player ${i} should be human`);
  }

  const moves = game.phases.teamSelection.moves;
  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  for (let i = 0; i < 4; i++) {
    const id = String(i);
    const choice = G.players[id].teamChoices[0];
    moves.selectTeam({ G, playerID: '0', events }, 0, id);
    assert.strictEqual(G.players[id].team.id, choice.id);
    if (i < 3) {
      assert.strictEqual(phaseEnded, false, `Phase should not end after human ${i} selects`);
    } else {
      assert.strictEqual(phaseEnded, true, 'Phase should end after 4th human selects');
    }
  }
  console.log('  ✔ All 4 humans selected teams sequentially with proper phase transition');
}

// ----------------------------------------------------------------------------
// Test 3: Buccaneers Copy Ability with Multi-Human
// ----------------------------------------------------------------------------
console.log('\nTest 3: Buccaneers Copy Ability - Human 1 acts via actingPlayerId');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  G.players['0'].team = { id: 'chiefs', name: 'Chiefs' };
  G.players['1'].team = { id: 'buccaneers', name: 'Buccaneers' };
  G.players['2'].team = { id: 'eagles', name: 'Eagles' };
  G.players['3'].team = { id: 'patriots', name: 'Patriots' };

  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  // Buccaneers phase onBegin
  game.phases.buccaneersCopy.onBegin({ G, ctx: createMockCtx(), events });

  // Player 1 copies Chiefs ability
  game.phases.buccaneersCopy.moves.copyAbility({ G, playerID: '0', events }, 'chiefs', '1');
  assert.strictEqual(G.players['1'].copiedTeam.id, 'chiefs', 'Player 1 copied Chiefs');
  assert.strictEqual(G.board.bucsCopyComplete, true, 'Copy marked complete');
  assert.strictEqual(phaseEnded, true, 'buccaneersCopy phase ended');
  console.log('  ✔ Human 1 successfully copied franchise ability via actingPlayerId');
}

// ----------------------------------------------------------------------------
// Test 4: Titans Opening Draft Ability with Multi-Human
// ----------------------------------------------------------------------------
console.log('\nTest 4: Titans Opening Draft - Human 1 acts via actingPlayerId');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  G.players['1'].team = { id: 'titans', name: 'Titans' };

  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  game.phases.titansDraft.onBegin({ G, events });
  assert.strictEqual(G.board.pendingTitansDraft.playerID, '1', 'Pending Titans draft should be for Player 1');

  const cardsCountBefore = G.players['1'].lineup.length;
  game.phases.titansDraft.moves.titansPickCard({ G, playerID: '0', events }, 0, '1');
  assert.strictEqual(G.players['1'].lineup.length, cardsCountBefore + 1, 'Player 1 acquired drafted card');
  assert(G.players['1'].lineup.some(c => !c.isPracticeSquad), 'Player 1 acquired genuine card');
  assert.strictEqual(phaseEnded, true, 'titansDraft phase ended');
  console.log('  ✔ Human 1 successfully drafted Titans card via actingPlayerId');
}

// ----------------------------------------------------------------------------
// Test 5: Multi-Human Free Agency Sequential Queue
// ----------------------------------------------------------------------------
console.log('\nTest 5: Multi-Human Free Agency Sequential Queue');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  G.players['0'].team = { id: 'patriots', name: 'Patriots' };
  G.players['1'].team = { id: 'bills', name: 'Bills' };
  G.players['0'].coins = 20;
  G.players['1'].coins = 20;

  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  // Set active event to Free Agency
  G.board.activeEvent = { id: 'free_agency', name: 'Free Agency', category: 'free_agency' };
  G.board.eventConfirmed = true;
  
  // Advance queue
  G.board.pendingFreeAgencyQueue = ['0', '1'];
  advanceFreeAgencyQueue(G);

  // Both humans 0 and 1 should be queued, starting with 0
  assert.strictEqual(G.board.pendingFreeAgency.playerID, '0', 'Player 0 is first in Free Agency queue');
  assert.deepStrictEqual(G.board.pendingFreeAgencyQueue, ['1'], 'Player 1 is queued next');

  const moves = game.phases.eventPhase.moves;

  // Player 0 signs card
  const cardSigned = G.board.pendingFreeAgency.card;
  moves.freeAgencySign({ G, playerID: '0', events }, -1, '0');
  assert.strictEqual(G.players['0'].lineup.some(c => c.name === cardSigned.name), true, 'Player 0 acquired card');

  // Queue should now advance to Player 1!
  assert(G.board.pendingFreeAgency !== null, 'Free agency should still be active for Player 1');
  assert.strictEqual(G.board.pendingFreeAgency.playerID, '1', 'Player 1 is now active in queue');
  assert.strictEqual(G.board.pendingFreeAgencyQueue.length, 0, 'Queue is now empty');
  assert.strictEqual(phaseEnded, false, 'Phase should NOT end yet');

  // Player 1 passes
  moves.freeAgencyPass({ G, playerID: '0', events }, '1');
  assert.strictEqual(G.board.pendingFreeAgency, null, 'Free agency fully cleared');
  assert.strictEqual(phaseEnded, true, 'eventPhase ended after last human resolved');
  console.log('  ✔ Free Agency queued multiple humans sequentially and ended phase cleanly');
}

// ----------------------------------------------------------------------------
// Test 6: Multi-Human Trade Rumors Simultaneous Collection
// ----------------------------------------------------------------------------
console.log('\nTest 6: Multi-Human Trade Rumors Simultaneous Decision Collection');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  
  // Give cards to all players
  G.players['0'].lineup = [{ id: 'c0', name: 'Card 0', position: 'WR' }];
  G.players['1'].lineup = [{ id: 'c1', name: 'Card 1', position: 'RB' }];
  G.players['2'].lineup = [{ id: 'c2', name: 'Card 2', position: 'TE' }];
  G.players['3'].lineup = [{ id: 'c3', name: 'Card 3', position: 'QB' }];

  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  // Put Trade Rumors event on top of event deck
  G.decks.event.unshift({ id: 'pass_right', name: 'Trade Rumors', category: 'pass_right' });
  game.phases.eventPhase.onBegin({ G, ctx: createMockCtx(), events });
  G.board.eventConfirmed = true;

  assert(G.board.pendingTradeRumors !== null, 'pendingTradeRumors should exist');
  // CPUs 2 and 3 have automatically picked
  assert.strictEqual(G.board.pendingTradeRumors.picks['2'], 0);
  assert.strictEqual(G.board.pendingTradeRumors.picks['3'], 0);
  assert.strictEqual(G.board.pendingTradeRumors.picks['0'], undefined);
  assert.strictEqual(G.board.pendingTradeRumors.picks['1'], undefined);

  const moves = game.phases.eventPhase.moves;

  // Human 0 submits pick
  moves.tradeRumorsPickCard({ G, playerID: '0' }, 0, '0');
  assert.strictEqual(G.board.pendingTradeRumors.picks['0'], 0);
  assert.strictEqual(G.board.tradeRumorsSummary, null, 'Summary not shown until all humans pick');

  // Human 1 submits pick
  moves.tradeRumorsPickCard({ G, playerID: '0' }, 0, '1');
  assert(G.board.tradeRumorsSummary !== null, 'tradeRumorsSummary generated after all picked');
  assert.strictEqual(G.board.tradeRumorsSummary.length, 4, 'Summary contains records for all 4 players');

  // Dismiss summary ends phase
  moves.dismissTradeRumorsSummary({ G, events });
  assert.strictEqual(G.board.tradeRumorsSummary, null, 'Summary dismissed');
  assert.strictEqual(phaseEnded, true, 'Phase ended upon summary dismissal');
  console.log('  ✔ Trade Rumors collected decisions from multiple humans independently before resolving');
}

// ----------------------------------------------------------------------------
// Test 7: Multi-Human New Cap Limit Queue
// ----------------------------------------------------------------------------
console.log('\nTest 7: Multi-Human New Cap Limit Sequential Queue');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  
  G.players['0'].coins = 15;
  G.players['1'].coins = 15;
  G.board.activeEvent = { id: 'buy_practice_squad', name: 'New Cap Limit', category: 'buy_practice_squad' };
  G.board.eventConfirmed = true;

  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  G.board.pendingNewCapLimitQueue = ['0', '1'];
  advanceNewCapLimitQueue(G);

  assert.strictEqual(G.board.pendingNewCapLimit.playerID, '0', 'Player 0 is first in cap limit queue');
  assert.deepStrictEqual(G.board.pendingNewCapLimitQueue, ['1'], 'Player 1 queued next');

  const moves = game.phases.eventPhase.moves;

  // Player 0 buys practice squad
  moves.buyPracticeSquad({ G, playerID: '0', events }, '0');
  assert.strictEqual(G.players['0'].coins, 5, 'Player 0 paid 10 coins');
  assert.strictEqual(G.players['0'].extraLineupSlots, 1, 'Player 0 extra slot incremented');

  // Queue advances to Player 1
  assert(G.board.pendingNewCapLimit !== null, 'Player 1 cap limit now pending');
  assert.strictEqual(G.board.pendingNewCapLimit.playerID, '1', 'Player 1 is active');

  // Player 1 passes
  moves.passPracticeSquad({ G, playerID: '0', events }, '1');
  assert.strictEqual(G.players['1'].coins, 15, 'Player 1 did not spend coins');
  assert.strictEqual(G.board.pendingNewCapLimit, null, 'Cap limit queue cleared');
  assert.strictEqual(phaseEnded, true, 'eventPhase ended');
  console.log('  ✔ New Cap Limit queued multiple humans sequentially and enforced roster options');
}

// ----------------------------------------------------------------------------
// Test 8: Multi-Human Puka Nacua Choice Queue in Refresh Phase
// ----------------------------------------------------------------------------
console.log('\nTest 8: Multi-Human Puka Nacua Queue in Refresh Phase');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  
  // Both humans have Puka Nacua + another teammate card
  G.players['0'].lineup = [
    { id: 'puka_nacua', uniqueId: 'puka_0', name: 'Puka Nacua', effects: [{ type: 'coins', amount: 1, perRound: true }] },
    { id: 't0', uniqueId: 't0_id', name: 'Teammate 0', effects: [{ type: 'coins', amount: 3, perRound: true }] }
  ];
  G.players['1'].lineup = [
    { id: 'puka_nacua', uniqueId: 'puka_1', name: 'Puka Nacua', effects: [{ type: 'coins', amount: 1, perRound: true }] },
    { id: 't1', uniqueId: 't1_id', name: 'Teammate 1', effects: [{ type: 'deflate', amount: 2, perRound: true }] }
  ];

  G.board.pendingPukaQueue = [
    { playerID: '0', pukaUniqueId: 'puka_0' },
    { playerID: '1', pukaUniqueId: 'puka_1' }
  ];

  advancePukaQueue(G);

  assert.strictEqual(G.board.pendingPukaChoice.playerID, '0', 'Player 0 is first in Puka queue');
  assert.deepStrictEqual(G.board.pendingPukaQueue, [{ playerID: '1', pukaUniqueId: 'puka_1' }]);

  const moves = game.phases.refreshPhase.moves;

  // Player 0 chooses teammate t0
  moves.pukaChooseTeammate({ G, playerID: '0' }, 't0_id', '0');
  assert.deepStrictEqual(G.board.pukaCopiedEffects['puka_0'], [{ type: 'coins', amount: 3, perRound: true }]);

  // Queue advances to Player 1
  assert.strictEqual(G.board.pendingPukaChoice.playerID, '1', 'Player 1 now active');

  // Player 1 chooses teammate t1
  moves.pukaChooseTeammate({ G, playerID: '0' }, 't1_id', '1');
  assert.deepStrictEqual(G.board.pukaCopiedEffects['puka_1'], [{ type: 'deflate', amount: 2, perRound: true }]);
  assert.strictEqual(G.board.pendingPukaChoice, null, 'Puka queue finished');
  console.log('  ✔ Puka Nacua queued multiple humans sequentially and updated ability copy');
}

// ----------------------------------------------------------------------------
// Test 9: Multi-Human Auction Nomination & Bidding with actingPlayerId
// ----------------------------------------------------------------------------
console.log('\nTest 9: Multi-Human Auction Nomination & Bidding');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  G.players['0'].coins = 15;
  G.players['1'].coins = 15;
  G.board.activeAuctionCardIndex = null;
  G.board.highestBidder = null;
  G.board.highestBid = 0;
  G.board.nominator = '0';

  const testCard = {
    id: 'test_card_1',
    name: 'Star Player',
    position: 'WR',
    minBid: 2,
    maxBid: 10,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };
  G.board.auctionPlayers = [testCard];

  const moves = game.phases.auctionPhase.moves;
  const events = { endTurn: () => {} };

  // Human 0 nominates card 0
  moves.selectCard({ G, playerID: '0' }, 0, '0');
  assert.strictEqual(G.board.activeAuctionCardIndex, 0, 'Auction active card index set to 0');
  assert.strictEqual(G.board.highestBid, 0, 'highestBid starts at 0 before opening bid');
  assert.strictEqual(G.board.highestBidder, null, 'No highest bidder yet');

  // Human 0 places opening bid of 2
  moves.bid({ G, playerID: '0', events }, 2, '0');
  assert.strictEqual(G.board.highestBid, 2, 'Opening bid set to 2');
  assert.strictEqual(G.board.highestBidder, '0', 'Player 0 is highest bidder');

  // Human 1 bids 5 via actingPlayerId
  moves.bid({ G, playerID: '0', events }, 5, '1');
  assert.strictEqual(G.board.highestBid, 5);
  assert.strictEqual(G.board.highestBidder, '1');

  // Human 0 outbids with 7
  moves.bid({ G, playerID: '0', events }, 7, '0');
  assert.strictEqual(G.board.highestBid, 7);
  assert.strictEqual(G.board.highestBidder, '0');

  // Human 1 passes
  moves.pass({ G, playerID: '0', events }, '1');
  assert.strictEqual(G.board.passedAuctionPlayers.includes('1'), true);

  console.log('  ✔ Multiple humans nominated, bid, outbid, and passed using actingPlayerId seamlessly');
}

// ----------------------------------------------------------------------------
// Test 10: Special Abilities with Multi-Human actingPlayerId (Raiders, Chiefs, Rams)
// ----------------------------------------------------------------------------
console.log('\nTest 10: Franchise Abilities in Multi-Human Setup');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  G.players['0'].team = { id: 'chiefs', name: 'Chiefs' };
  G.players['1'].team = { id: 'raiders', name: 'Raiders' };
  G.players['0'].coins = 10;
  G.players['1'].coins = 10;
  G.players['0'].psi = 50;
  G.players['1'].psi = 50;

  // Test Raiders ability for Human 1
  G.board.pendingRaiders = { playerID: '1' };
  const preMoves = game.phases.preAuctionPhase.moves;
  preMoves.raidersGivePsi({ G, playerID: '0' }, '0', '1');
  assert.strictEqual(G.players['1'].psi, 49, 'Raiders deflated 1 PSI');
  assert.strictEqual(G.players['0'].psi, 51, 'Opponent inflated 1 PSI');
  assert.strictEqual(G.board.pendingRaiders, null, 'Raiders pending cleared');

  // Test Chiefs ability for Human 0
  G.board.pendingChiefs = { playerID: '0' };
  const claimedCard = { id: 'chiefs_target', name: 'Target Card', minBid: 1, maxBid: 8, effects: [] };
  G.board.auctionPlayers = [claimedCard];
  preMoves.chiefsClaimCard({ G, playerID: '0' }, 0, '0');
  assert.strictEqual(G.players['0'].coins, 9, 'Chiefs paid 1 coin to claim card');
  assert.strictEqual(G.players['0'].lineup.some(c => c.id === claimedCard.id), true, 'Card added to lineup');

  // Test Rams 2x Token for Human 1
  G.players['1'].team = { id: 'rams', name: 'Rams' };
  G.players['1'].ramsTokenAttached = false;
  const ramsCard = { id: 'rams_card', uniqueId: 'rams_u_1', phase: 2, name: 'Rams Card', effects: [{ type: 'coins', amount: 2, perRound: true }] };
  G.players['1'].lineup = [ramsCard];
  const generalMoves = game.moves;
  generalMoves.ramsApplyDoubleToken({ G, playerID: '0' }, 'rams_u_1', '1');
  assert.strictEqual(ramsCard.ramsDoubleToken, true, 'Rams 2x token applied');
  assert.strictEqual(G.players['1'].ramsTokenAttached, true, 'Rams token marked attached');

  console.log('  ✔ Raiders, Chiefs, and Rams abilities work for any human player via actingPlayerId');
}

// ----------------------------------------------------------------------------
// Test 11: Single Player vs CPU Backward Compatibility
// ----------------------------------------------------------------------------
console.log('\nTest 11: Single-Player Mode (numHumans = 1) Backward Compatibility');
{
  const game = DeflategateGame;
  const G = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } });

  assert.strictEqual(G.numHumans, 1, 'Default numHumans is 1');
  assert.strictEqual(G.players['0'].isCpu, false, 'Player 0 is human');
  assert.strictEqual(G.players['1'].isCpu, true, 'Player 1 is CPU');
  assert.strictEqual(G.players['2'].isCpu, true, 'Player 2 is CPU');
  assert.strictEqual(G.players['3'].isCpu, true, 'Player 3 is CPU');

  const moves = game.phases.teamSelection.moves;
  let phaseEnded = false;
  const events = { endPhase: () => { phaseEnded = true; } };

  // Single player picks team
  const p0Choice = G.players['0'].teamChoices[0];
  moves.selectTeam({ G, playerID: '0', events }, 0);
  assert.strictEqual(G.players['0'].team.id, p0Choice.id);
  assert(G.players['1'].team !== null, 'All CPUs assigned teams automatically');
  assert(G.players['2'].team !== null);
  assert(G.players['3'].team !== null);
  assert.strictEqual(phaseEnded, true, 'Phase ended immediately after single human picks');

  console.log('  ✔ Single-Player mode functions exactly as before with zero regressions');
}

console.log('\n================================================================');
console.log('🎉 ALL 11 PVP & PVP-VS-CPU VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('================================================================');
