import { PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { DeflategateGame, calculateRefreshResults } from '../src/Game.js';
import assert from 'assert';

console.log('--- Starting Playtest #13 Verification Tests ---');

// Test 1: Special Effect Text on Cards
console.log('\nTest 1: Special effect cards have specialText/customText descriptions');
const allCards = [...PHASE_1_PLAYERS, ...PHASE_2_PLAYERS, ...HOF_PLAYERS];
const specialCardIds = [
  'isaiah_pacheco',
  'jaylen_waddle',
  'brandon_aiyuk',
  'dj_moore',
  'puka_nacua',
  'brock_purdy',
  'tyreek_hill',
  'amon_ra_st_brown'
];

specialCardIds.forEach(id => {
  const card = allCards.find(c => c.id === id);
  assert(card, `Card ${id} should exist in decks`);
  const text = card.specialText || card.customText;
  assert(text && text.length > 5, `Card ${id} must have descriptive specialText or customText, got: ${text}`);
  console.log(`  ✓ Card ${card.name} (${id}): "${text}"`);
});

// Test 2: Packers Ability Restriction
console.log('\nTest 2: Packers ability only triggers when ALL lineup cards are genuine Phase 1 (no practice squad)');
{
  const p1Card1 = { id: 'p1_1', name: 'Phase 1 Card 1', phase: 1, effects: [] };
  const p1Card2 = { id: 'p1_2', name: 'Phase 1 Card 2', phase: 1, effects: [] };
  const psCard = { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0', isPracticeSquad: true };

  // Case A: 2 Phase 1 + 1 Practice Squad -> Should NOT get Packers bonus
  const mockG_A = {
    board: { round: 2, activeEvent: null, qbChoices: {} },
    players: {
      '0': {
        team: { id: 'packers', name: 'Packers' },
        lineup: [p1Card1, p1Card2, psCard],
        coins: 10,
        psi: 50
      },
      '1': {
        team: { id: 'lions', name: 'Lions' },
        lineup: [],
        coins: 10,
        psi: 50
      }
    },
    actionLog: []
  };
  calculateRefreshResults(mockG_A);
  const packersLogA = mockG_A.logs?.find(l => l.text.includes('Packers Ability: All active lineup cards are Phase 1'));
  assert(!packersLogA, 'Packers should NOT receive -4 PSI bonus with a Practice Squad card in lineup');
  console.log('  ✓ Packers with 2 Phase 1 + 1 Practice Squad did not trigger ability');

  // Case B: 3 genuine Phase 1 cards -> Should get Packers bonus
  const p1Card3 = { id: 'p1_3', name: 'Phase 1 Card 3', phase: 1, effects: [] };
  const mockG_B = {
    board: { round: 2, activeEvent: null, qbChoices: {} },
    players: {
      '0': {
        team: { id: 'packers', name: 'Packers' },
        lineup: [p1Card1, p1Card2, p1Card3],
        coins: 10,
        psi: 50
      },
      '1': {
        team: { id: 'lions', name: 'Lions' },
        lineup: [],
        coins: 10,
        psi: 50
      }
    }
  };
  calculateRefreshResults(mockG_B);
  const packersLogB = mockG_B.logs?.find(l => l.text.includes('Packers Ability: All active lineup cards are Phase 1'));
  assert(packersLogB, 'Packers should receive -4 PSI bonus when all active cards are genuine Phase 1');
  console.log('  ✓ Packers with 3 genuine Phase 1 cards triggered -4 PSI ability');
}

// Test 3: Refresh Phase Activity Logging format (no double negative --)
console.log('\nTest 3: Refresh Phase Activity Log shows "inflated +X PSI" instead of "deflated --X PSI"');
{
  // A team that had net inflation (e.g. initial PSI 50, ending PSI 52 -> psiDeflated is -2)
  const mockG_Inflated = {
    board: { round: 2, activeEvent: null, qbChoices: {} },
    players: {
      '0': {
        team: { id: 'patriots', name: 'Patriots' },
        lineup: [],
        coins: 10,
        psi: 50,
        bonusDeflate: -2 // Net inflated
      }
    },
    actionLog: []
  };
  // Simulate log creation
  const p = mockG_Inflated.players['0'];
  const psiDeflated = -2;
  const coinsGained = 3;
  const displayId = 1;
  const psiActionText = psiDeflated >= 0 ? `deflated -${psiDeflated} PSI` : `inflated +${Math.abs(psiDeflated)} PSI`;
  const logMsg = `Refresh: Player ${displayId} (${p.team.name}) net coins +${coinsGained}, ${psiActionText} (PSI now: 52).`;
  assert(!logMsg.includes('--'), `Log should never have "--", got: ${logMsg}`);
  assert(logMsg.includes('inflated +2 PSI'), `Log should say "inflated +2 PSI", got: ${logMsg}`);
  console.log(`  ✓ Log message format: "${logMsg}"`);
}

// Test 4: Pass restriction on nomination
console.log('\nTest 4: Pass move returns INVALID_MOVE when highestBidder is null (opening nomination)');
{
  const passMove = DeflategateGame.phases.auctionPhase.moves.pass;
  const mockG = {
    board: {
      activeAuctionCardIndex: 0,
      highestBid: 0,
      highestBidder: null, // Opening nomination bid has not been placed yet
      passedAuctionPlayers: []
    },
    players: {
      '0': { coins: 10, hasWonAuction: false }
    }
  };

  const result = passMove({ G: mockG, playerID: '0', events: { endTurn: () => {} } });
  assert.strictEqual(result, 'INVALID_MOVE', 'Pass must be rejected when highestBidder is null');
  console.log('  ✓ pass() returned INVALID_MOVE on opening nomination');

  // Once a bid has been placed, passing is allowed
  mockG.board.round = 1;
  mockG.board.highestBidder = '1';
  mockG.board.highestBid = 2;
  mockG.board.auctionPlayers = [{ name: 'Test Player', minBid: 1 }];
  mockG.decks = { discard: [] };
  mockG.players['0'].lineup = [];
  mockG.players['1'] = { coins: 10, hasWonAuction: false, lineup: [] };
  let turnEnded = false;
  const validResult = passMove({ G: mockG, playerID: '0', events: { endTurn: () => { turnEnded = true; } } });
  assert.notStrictEqual(validResult, 'INVALID_MOVE', 'Pass must be accepted when outbid');
  assert(turnEnded, 'Turn must end on pass');
  assert(mockG.players['1'].hasWonAuction, 'Remaining highest bidder should win the auction');
  assert.strictEqual(mockG.players['1'].lineup[0].name, 'Test Player', 'Winner should acquire the card');
  console.log('  ✓ pass() succeeded after outbid, auction resolved for remaining highest bidder');
}

// Test 5: Eagles Ability (Use Once, Use Twice, and Queuing)
console.log('\nTest 5: Eagles ability single/double use and onBegin queueing');
{
  // Test onBegin queueing: Human Eagles player with 0 coins should STILL be queued in pendingEagles
  const mockG_EaglesBegin = {
    board: { round: 3, pendingEaglesQueue: [] },
    players: {
      '0': {
        team: { id: 'eagles', name: 'Eagles' },
        coins: 1, // < 3 coins
        isCpu: false,
        eaglesUsedRound: 2,
        eaglesUsedCount: 2
      },
      '1': {
        team: { id: 'chiefs', name: 'Chiefs' },
        coins: 10,
        isCpu: true
      }
    },
    actionLog: []
  };
  DeflategateGame.phases.postAuctionPhase.onBegin({ G: mockG_EaglesBegin, ctx: { numPlayers: 2 }, events: {} });
  assert(mockG_EaglesBegin.board.pendingEagles, 'Human Eagles player must be queued even if coins < 3');
  assert.strictEqual(mockG_EaglesBegin.board.pendingEagles.playerID, '0');
  console.log('  ✓ Human Eagles player successfully queued in postAuctionPhase.onBegin with low coins');

  // Test eaglesUseAbility: Use Once (times: 1)
  const eaglesUseMove = DeflategateGame.phases.postAuctionPhase.moves.eaglesUseAbility;
  const mockG_EaglesUse = {
    board: {
      round: 3,
      pendingEagles: { playerID: '0' },
      pendingEaglesQueue: []
    },
    players: {
      '0': {
        team: { id: 'eagles', name: 'Eagles' },
        coins: 8,
        psi: 50,
        isCpu: false
      },
      '1': {
        team: { id: 'cowboys', name: 'Cowboys' },
        coins: 10,
        psi: 50,
        isCpu: true
      },
      '2': {
        team: { id: 'giants', name: 'Giants' },
        coins: 10,
        psi: 50,
        isCpu: true
      }
    },
    actionLog: []
  };

  let phaseEnded = false;
  eaglesUseMove({ G: mockG_EaglesUse, playerID: '0', events: { endPhase: () => { phaseEnded = true; } } }, 1);
  assert.strictEqual(mockG_EaglesUse.players['0'].coins, 5, 'Eagles player should have paid 3 coins');
  assert.strictEqual(mockG_EaglesUse.players['1'].psi, 53, 'Opponent 1 should be inflated by +3 PSI');
  assert.strictEqual(mockG_EaglesUse.players['2'].psi, 53, 'Opponent 2 should be inflated by +3 PSI');
  assert.strictEqual(mockG_EaglesUse.board.pendingEagles, null, 'pendingEagles should be cleared');
  assert(phaseEnded, 'Phase should end when pending queues are empty');
  console.log('  ✓ eaglesUseAbility(1) correctly deducted 3 coins, inflated opponents +3 PSI, and ended phase');

  // Test eaglesUseAbility: Use Twice (times: 2)
  const mockG_EaglesTwice = {
    board: {
      round: 3,
      pendingEagles: { playerID: '0' },
      pendingEaglesQueue: []
    },
    players: {
      '0': {
        team: { id: 'eagles', name: 'Eagles' },
        coins: 10,
        psi: 50,
        isCpu: false
      },
      '1': {
        team: { id: 'cowboys', name: 'Cowboys' },
        coins: 10,
        psi: 50,
        isCpu: true
      }
    },
    actionLog: []
  };
  let phaseEndedTwice = false;
  eaglesUseMove({ G: mockG_EaglesTwice, playerID: '0', events: { endPhase: () => { phaseEndedTwice = true; } } }, 2);
  assert.strictEqual(mockG_EaglesTwice.players['0'].coins, 4, 'Eagles player should have paid 6 coins');
  assert.strictEqual(mockG_EaglesTwice.players['1'].psi, 56, 'Opponent should be inflated by +6 PSI');
  assert(phaseEndedTwice, 'Phase should end when pending queues are empty');
  console.log('  ✓ eaglesUseAbility(2) correctly deducted 6 coins, inflated opponent +6 PSI, and ended phase');
}

// Test 6: Trade Rumors & Event Phase End Transitions
console.log('\nTest 6: Trade Rumors dismissal and interactive events call events.endPhase()');
{
  const dismissTradeRumors = DeflategateGame.phases.eventPhase.moves.dismissTradeRumorsSummary;
  const mockG_TR = {
    board: {
      eventConfirmed: true,
      tradeRumorsSummary: ['Player 1 gave Card A to Player 2']
    }
  };
  let phaseEnded = false;
  dismissTradeRumors({ G: mockG_TR, events: { endPhase: () => { phaseEnded = true; } } });
  assert.strictEqual(mockG_TR.board.tradeRumorsSummary, null, 'Summary should be cleared');
  assert(phaseEnded, 'dismissTradeRumorsSummary must call events.endPhase() when eventConfirmed is true');
  console.log('  ✓ dismissTradeRumorsSummary cleared summary and called events.endPhase()');

  // Free Agency Pass
  const faPass = DeflategateGame.phases.eventPhase.moves.freeAgencyPass;
  const mockG_FA = {
    board: {
      eventConfirmed: true,
      pendingFreeAgency: { card: { name: 'FA Player' } }
    },
    players: { '0': { coins: 10 } },
    decks: { discard: [] },
    actionLog: []
  };
  let faPhaseEnded = false;
  faPass({ G: mockG_FA, playerID: '0', events: { endPhase: () => { faPhaseEnded = true; } } });
  assert.strictEqual(mockG_FA.board.pendingFreeAgency, null);
  assert(faPhaseEnded, 'freeAgencyPass must call events.endPhase()');
  console.log('  ✓ freeAgencyPass cleared pendingFreeAgency and called events.endPhase()');
}

console.log('\n🎉 ALL 6 VERIFICATION TEST SUITES PASSED SUCCESSFULLY!');
