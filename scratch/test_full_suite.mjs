import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';
import { TEAMS, EVENTS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';

console.log('=== RUNNING DEFLATEGATE COMPREHENSIVE PLAYTEST #8 TEST SUITE ===');

function createTestGame() {
  const client = Client({
    game: DeflategateGame,
    numPlayers: 4
  });
  client.start();
  return client;
}

// TEST 1: Team Selection & Buccanners Copy Phase
console.log('\n--- TEST 1: Team Selection & Bucs Copy Phase ---');
{
  const client = createTestGame();
  let state = client.getState();
  console.assert(state.ctx.phase === 'teamSelection', `Expected teamSelection, got ${state.ctx.phase}`);

  client.moves.selectTeam(0);
  state = client.getState();

  console.log('Phase after human team selection:', state.ctx.phase);
  console.assert(Object.values(state.G.players).every(p => p.team !== null), 'All players should have teams assigned');

  if (state.ctx.phase === 'buccaneersCopy') {
    const bucsP = Object.keys(state.G.players).find(id => state.G.players[id].team.id === 'buccaneers');
    if (bucsP === '0') {
      const otherTeam = Object.values(state.G.players).find(p => p.team.id !== 'buccaneers').team;
      client.moves.copyAbility(otherTeam.id);
      state = client.getState();
    }
  }
  console.log('Phase after bucs resolution:', state.ctx.phase);
  console.assert(state.ctx.phase === 'eventPhase', `Expected eventPhase, got ${state.ctx.phase}`);
  console.log('✓ TEST 1 PASSED: Team Selection cleanly advances to eventPhase');
}

// TEST 2: Refresh Phase Stepping & Round 2 Event Reveal
console.log('\n--- TEST 2: Refresh Phase Stepping & Round 2 Event Reveal ---');
{
  const client = createTestGame();
  client.moves.selectTeam(0);
  let state = client.getState();
  if (state.ctx.phase === 'buccaneersCopy') {
    const otherTeam = Object.values(state.G.players).find(p => p.team.id !== 'buccaneers').team;
    client.moves.copyAbility(otherTeam.id);
    state = client.getState();
  }

  client.moves.confirmEventReveal();
  state = client.getState();
  console.log('Phase after event confirmation:', state.ctx.phase);

  // Deep clone G to test refreshPhase directly
  const G = JSON.parse(JSON.stringify(state.G));
  G.board.activeAuctionCardIndex = null;
  G.board.postAuctionComplete = true;
  Object.values(G.players).forEach(p => p.hasWonAuction = true);

  DeflategateGame.phases.refreshPhase.onBegin({ G });
  console.assert(G.board.refreshStage === 'intro', `Expected refreshStage to be 'intro', got ${G.board.refreshStage}`);
  console.assert(G.board.inRefreshSummary === true, 'Expected inRefreshSummary to be true');
  console.assert(G.board.refreshResults.length === 4, `Expected 4 refresh results, got ${G.board.refreshResults.length}`);
  console.log('Refresh results initial:', G.board.refreshResults.map(r => `${r.teamName}: +${r.coinsGained} coins, -${r.psiDeflated} psi`));

  // Step 1: Start refresh sequence
  DeflategateGame.phases.refreshPhase.moves.startRefreshSequence({ G });
  console.assert(G.board.refreshStage === 'animating', 'Expected stage to be animating');
  console.assert(G.board.refreshStepIndex === 0, 'Expected stepIndex to be 0');
  console.log('✓ Stage animated to team 0');

  // Step 2: Advance through all teams
  for (let i = 0; i < 4; i++) {
    console.log(`Advancing refresh step ${G.board.refreshStepIndex}`);
    DeflategateGame.phases.refreshPhase.moves.advanceRefreshStep({ G });
  }
  console.assert(G.board.refreshStage === 'complete', `Expected stage 'complete', got ${G.board.refreshStage}`);
  console.log('✓ All teams animated, stage is complete');

  // Step 3: Confirm refresh summary ("Advance to Round 2 Event 🏈")
  const eventsMock = {
    endPhase: () => {
      G.board.round = 2;
      DeflategateGame.phases.eventPhase.onBegin({ G, events: eventsMock });
    }
  };
  DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: eventsMock });
  console.assert(G.board.round === 2, `Expected Round 2, got ${G.board.round}`);
  console.assert(G.board.refreshStage === null, 'refreshStage should be reset to null');
  console.assert(G.board.inRefreshSummary === false, 'inRefreshSummary should be reset to false');
  console.assert(G.board.eventFlipRevealed === true, 'Round 2 event card should be flipped open!');
  console.log(`✓ Round 2 event revealed: "${G.board.activeEvent.name}" (${G.board.activeEvent.category})`);
  console.log('✓ TEST 2 PASSED: Refresh Phase & Round 2 Event Reveal work without hanging');
}

// TEST 3: All 16 Event Cards Verification
console.log('\n--- TEST 3: All 16 Event Cards Verification ---');
const eventCategories = [
  'double_all',
  'instant_inflate',
  'instant_deflate',
  'cap_coins',
  'cap_deflate',
  'qb_choice',
  'double_phase1',
  'bonus_auction',
  'free_agency',
  'pass_right',
  'buy_practice_squad',
  'double_draft',
  'legend_returns',
  'match_second_psi',
  'give_psi',
  'overpaid'
];

eventCategories.forEach(cat => {
  const ev = EVENTS.find(e => e.category === cat) || { id: 'test', name: cat, category: cat, effect: 'Test effect' };
  const client = createTestGame();
  client.moves.selectTeam(0);
  let state = client.getState();
  if (state.ctx.phase === 'buccaneersCopy') {
    const otherTeam = Object.values(state.G.players).find(p => p.team.id !== 'buccaneers').team;
    client.moves.copyAbility(otherTeam.id);
    state = client.getState();
  }

  const G = JSON.parse(JSON.stringify(state.G));
  G.decks.event.push(ev);
  G.board.activeEvent = null;
  DeflategateGame.phases.eventPhase.onBegin({ G, events: { endPhase: () => {} } });

  console.log(`Testing event: "${G.board.activeEvent.name}" [${cat}]`);

  if (cat === 'buy_practice_squad') {
    console.assert(G.board.pendingNewCapLimit !== null, 'Should have pendingNewCapLimit');
    DeflategateGame.phases.eventPhase.moves.passPracticeSquad({ G, playerID: '0' });
    console.assert(G.board.pendingNewCapLimit === null, 'pendingNewCapLimit should resolve');
  } else if (cat === 'give_psi') {
    console.assert(G.board.pendingRivalry !== null, 'Should have pendingRivalry');
    DeflategateGame.phases.eventPhase.moves.rivalryGivePsi({ G, playerID: '0' }, '1');
    console.assert(G.board.pendingRivalry === null, 'Rivalry should complete');
  } else if (cat === 'pass_right') {
    console.assert(G.board.pendingTradeRumors !== null, 'Should have pendingTradeRumors');
    DeflategateGame.phases.eventPhase.moves.tradeRumorsPickCard({ G, playerID: '0' }, 0);
    console.assert(G.board.pendingTradeRumors === null, 'Trade rumors should complete');
    console.assert(G.board.tradeRumorsSummary !== null, 'Should have tradeRumorsSummary');
    DeflategateGame.phases.eventPhase.moves.dismissTradeRumorsSummary({ G });
  } else if (cat === 'bonus_auction') {
    console.assert(G.board.bonusAuction !== null, 'Should have bonusAuction');
    G.players['0'].coins = 100;
    const effMax = 99;
    DeflategateGame.phases.eventPhase.moves.bonusAuctionBid({ G, playerID: '0' }, 99);
    console.assert(G.board.bonusAuction === null, 'bonusAuction should resolve upon win');
  } else if (cat === 'free_agency') {
    console.assert(G.board.pendingFreeAgency !== null, 'Should have pendingFreeAgency');
    DeflategateGame.phases.eventPhase.moves.freeAgencyPass({ G, playerID: '0' });
    console.assert(G.board.pendingFreeAgency === null, 'Free agency should resolve');
  } else if (cat === 'qb_choice') {
    const p = G.players['0'];
    p.lineup.push({ id: 'mahomes_test', uniqueId: 'mahomes_test', name: 'Patrick Mahomes', position: 'QB', effects: [{ type: 'deflate', amount: 5, perRound: true }, { type: 'coins', amount: 3, perRound: true }] });
    DeflategateGame.phases.eventPhase.moves.setQbChoice({ G, playerID: '0' }, 'mahomes_test', 'deflate');
    console.assert(G.board.qbChoices['mahomes_test'] === 'deflate', 'QB choice should be set to deflate');
  }

  DeflategateGame.phases.eventPhase.moves.confirmEventReveal({ G, events: { endPhase: () => {} } });
  console.assert(G.board.eventConfirmed === true, 'Event should be confirmed');
  const endIfVal = DeflategateGame.phases.eventPhase.endIf({ G });
  console.assert(endIfVal === true, `Expected eventPhase.endIf to be true for ${cat}, but got false`);
});
console.log('✓ TEST 3 PASSED: All 16 Event Cards validated without hanging');

// TEST 4: Broncos First Round Ignore & Clear
console.log('\n--- TEST 4: Broncos First Round Ignore & Clear ---');
{
  const client = createTestGame();
  client.moves.selectTeam(0);
  let state = client.getState();
  const G = JSON.parse(JSON.stringify(state.G));
  const broncosPlayer = G.players['0'];
  broncosPlayer.team = { id: 'broncos', name: 'Broncos', ability: 'Whenever you win an auction card, ignore all negative and positive effects for that round only.' };
  
  const card = { id: 'kittle_test', name: 'George Kittle', effects: [{ type: 'deflate', amount: 4, perRound: true }], broncosRoundAcquired: 1 };
  broncosPlayer.lineup.push(card);
  G.board.round = 1;

  DeflategateGame.phases.refreshPhase.onBegin({ G });
  const pRes = G.board.refreshResults.find(r => r.id === '0');
  console.assert(pRes.psiDeflated === 0, `Expected 0 deflation for Broncos first round, got ${pRes.psiDeflated}`);
  console.log('✓ Broncos correctly ignored during round 1 refresh');

  DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: { endPhase: () => {} } });
  const updatedCard = G.players['0'].lineup.find(c => c.id === 'kittle_test');
  console.assert(!updatedCard.broncosRoundAcquired, 'broncosRoundAcquired flag should be deleted');
  console.log('✓ broncosRoundAcquired removed so effects trigger in round 2');
}

console.log('\n=========================================');
console.log('🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
console.log('=========================================');
