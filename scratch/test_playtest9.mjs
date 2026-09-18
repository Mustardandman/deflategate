import { DeflategateGame, resolveAuctionWin, applyCoinsGained, getEffectiveTeamId, advanceTitansDraftQueue } from '../src/Game.js';
import { EVENTS, PHASE_1_PLAYERS, TEAMS } from '../src/GameData.js';

console.log('--- RUNNING PLAYTEST #9 VERIFICATION TESTS ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }
}

// TEST 1: Event deck counts
console.log('\n[Test 1: Event Deck Counts]');
assert(EVENTS.length === 16, `EVENTS length should be 16, got ${EVENTS.length}`);
assert(!EVENTS.some(e => e.id === 'e17' || e.id === 'e18'), 'e17 and e18 should not be in EVENTS');

// TEST 2: Phase 1 Player Roster (44 Players)
console.log('\n[Test 2: Phase 1 Player Roster (44 Players)]');
assert(PHASE_1_PLAYERS.length === 44, `PHASE_1_PLAYERS length should be 44, got ${PHASE_1_PLAYERS.length}`);
const pacheco = PHASE_1_PLAYERS.find(p => p.id === 'isaiah_pacheco');
assert(pacheco !== undefined && pacheco.minBid === 1 && pacheco.maxBid === 15, 'Isaiah Pacheco defined with min 1 max 15');
const waddle = PHASE_1_PLAYERS.find(p => p.id === 'jaylen_waddle');
assert(waddle !== undefined && waddle.minBid === 1 && waddle.maxBid === 12, 'Jaylen Waddle defined with min 1 max 12');
const aiyuk = PHASE_1_PLAYERS.find(p => p.id === 'brandon_aiyuk');
assert(aiyuk !== undefined && aiyuk.minBid === 1 && aiyuk.maxBid === 12, 'Brandon Aiyuk defined with min 1 max 12');

// TEST 3: Setup initializes 10-card event deck from 16 events
console.log('\n[Test 3: Setup Event Deck Selection]');
const mockCtx = { numPlayers: 4 };
const mockRandom = {
  Shuffle: (arr) => [...arr].reverse()
};
const G = DeflategateGame.setup({ ctx: mockCtx, random: mockRandom });
assert(G.decks.event.length === 10, `G.decks.event should have 10 cards, got ${G.decks.event.length}`);
assert(G.decks.activePlayers.length === 44, `Active player deck should start with 44 Phase 1 cards, got ${G.decks.activePlayers.length}`);

// TEST 4: Buccaneers Copy Titans Multi-Draft Queue
console.log('\n[Test 4: Buccaneers Copy Titans Multi-Draft Queue]');
// Setup players where P0 is Buccaneers (copies Titans) and P1 is Titans
G.players['0'].team = TEAMS.find(t => t.id === 'buccaneers');
G.players['0'].copiedTeam = TEAMS.find(t => t.id === 'titans');
G.players['0'].lineup = [{ uniqueId: 'ps_0', isPracticeSquad: true, name: 'Practice Squad' }];
G.players['1'].team = TEAMS.find(t => t.id === 'titans');
G.players['1'].lineup = [{ uniqueId: 'ps_1', isPracticeSquad: true, name: 'Practice Squad' }];

let phaseEnded = false;
const mockEvents = { endPhase: () => { phaseEnded = true; } };

DeflategateGame.phases.titansDraft.onBegin({ G, events: mockEvents });

assert(G.board.pendingTitansDraft !== null, 'P0 (Bucs copied Titans) should have pending draft');
assert(String(G.board.pendingTitansDraft.playerID) === '0', 'Pending draft should be for Player 0');
assert(G.board.titansDraftQueue.length === 1 && G.board.titansDraftQueue[0] === '1', 'Titans (P1) should be next in queue');

// P0 picks card 0
DeflategateGame.phases.titansDraft.moves.titansPickCard({ G, playerID: '0', events: mockEvents }, 0);
assert(!G.players['0'].lineup[0].isPracticeSquad, 'P0 practice squad replaced by drafted card');

// Now P1 (Titans) should be next
if (G.players['1'].isCpu) {
  // If CPU, advanceTitansDraftQueue already processed P1 and finished
  assert(G.board.titansDraftComplete === true, 'titansDraftComplete should be true after CPU finishes queue');
  assert(!G.players['1'].lineup[0].isPracticeSquad, 'P1 CPU practice squad replaced by drafted card');
} else {
  assert(G.board.pendingTitansDraft !== null && String(G.board.pendingTitansDraft.playerID) === '1', 'P1 should now have pending draft');
  DeflategateGame.phases.titansDraft.moves.titansPickCard({ G, playerID: '1', events: mockEvents }, 0);
  assert(G.board.titansDraftComplete === true, 'titansDraftComplete should be true after both finish');
}

// TEST 5: Jaylen Waddle +1 Coin Bonus
console.log('\n[Test 5: Jaylen Waddle +1 Coin Bonus on Bid]');
G.board.activeAuctionCardIndex = 0;
G.board.auctionPlayers = [{ ...waddle, uniqueId: 'waddle_test' }];
G.board.highestBid = 0;
G.board.highestBidder = null;
G.players['0'].coins = 10;
G.players['0'].hasWonAuction = false;
G.players['1'].hasWonAuction = false;

const initialCoins = G.players['0'].coins;
DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '0', events: { endTurn: () => {} } }, 2);
assert(G.board.waddleBonusAlert !== null, 'waddleBonusAlert should be set');
// Bid was 2, but Waddle gives +1 coin bonus, so coins should be 10 - 2 (or won) + 1 = 9 if won, or 9 if bid
assert(G.players['0'].coins === initialCoins - 2 + 1 || G.players['0'].coins === initialCoins + 1, `Coins should reflect +1 bonus, current: ${G.players['0'].coins}`);

// TEST 6: Brandon Aiyuk Max Bid Upgrade
console.log('\n[Test 6: Brandon Aiyuk Max Bid Upgrade]');
const aiyukCard = { ...aiyuk, uniqueId: 'aiyuk_test', effects: [{ type: 'coins', amount: 2, perRound: true }] };
G.board.highestBid = 12; // Max bid is 12
G.players['2'].hasWonAuction = false;
G.players['2'].coins = 20;
resolveAuctionWin(G, '2', aiyukCard);
assert(aiyukCard.effects[0].amount === 4, `Brandon Aiyuk should upgrade to 4 coins/round on max bid, got ${aiyukCard.effects[0].amount}`);

// TEST 7: Isaiah Pacheco Deck Swap
console.log('\n[Test 7: Isaiah Pacheco Deck Swap on Acquisition]');
const pachecoCard = { ...pacheco, uniqueId: 'pacheco_test' };
G.board.highestBid = 5;
G.players['3'].hasWonAuction = false;
G.players['3'].coins = 20;
const prevDiscardCount = G.decks.discard.length;
resolveAuctionWin(G, '3', pachecoCard);
assert(G.board.pachecoSwapAlert !== null, 'pachecoSwapAlert should be set');
assert(G.board.pachecoSwapAlert.oldCard.id === 'isaiah_pacheco', 'Old card in alert should be Pacheco');
assert(G.board.pachecoSwapAlert.newCard.id !== 'isaiah_pacheco', 'New card should not be Pacheco');
assert(G.decks.discard.some(c => c.id === 'isaiah_pacheco'), 'Pacheco should be in discard deck');

// TEST 8: Last Player in Auction Row Flow
console.log('\n[Test 8: Last Player in Auction Row Flow]');
// Setup 4-player game where P0, P1, P2 have already won auction
G.players['0'].hasWonAuction = true;
G.players['1'].hasWonAuction = true;
G.players['2'].hasWonAuction = true;
G.players['3'].hasWonAuction = false; // Only P3 remains
G.players['3'].coins = 15;
const lastCard = { id: 'kirk_cousins', name: 'Kirk Cousins', minBid: 1, maxBid: 10, effects: [] };
G.board.auctionPlayers = [null, null, null, lastCard];
G.board.activeAuctionCardIndex = null;

// onBegin should set nominator to '3' and NOT auto-win
DeflategateGame.phases.auctionPhase.turn.onBegin({ G, events: { endTurn: () => {} } });
assert(G.board.nominator === '3', 'Nominator should be set to last remaining player (3)');
assert(G.players['3'].hasWonAuction === false, 'Last player should NOT auto-win before bidding');

// Last player nominates card 3
DeflategateGame.phases.auctionPhase.moves.selectCard({ G, playerID: '3' }, 3);
assert(G.board.activeAuctionCardIndex === 3, 'Active auction card index should be 3');

// Last player places bid of 4 coins
DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '3', events: { endTurn: () => {} } }, 4);
assert(G.players['3'].hasWonAuction === true, 'Last player should win immediately on their bid');
assert(G.players['3'].coins === 15 - 4, `Last player coins should be 15 - 4 = 11, got ${G.players['3'].coins}`);

// TEST 9: Round Progression to Round 2 Event Reveal
console.log('\n[Test 9: Round Progression to Round 2 Event Reveal]');
G.board.round = 1;
G.board.refreshStage = 'complete';
G.board.inRefreshSummary = true;
let eventPhaseEntered = false;
DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: { endPhase: () => { eventPhaseEntered = true; } } });
assert(G.board.round === 2, `Round should be 2 after confirmRefreshSummary, got ${G.board.round}`);
assert(G.board.refreshConfirmed === true, 'refreshConfirmed should be true');

// Call eventPhase.onBegin
DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4 }, random: mockRandom });
assert(G.board.activeEvent !== null, 'Round 2 activeEvent should be set');
assert(G.board.eventFlipRevealed === true, 'Round 2 eventFlipRevealed should be true');
assert(G.board.round === 2, 'Round should remain 2 in event phase');

// TEST 10: Bengals Discard Restriction & Instant Effects
console.log('\n[Test 10: Bengals Discard Restriction & Instant Effects]');
const bengalsCard = { id: 'test_player', name: 'Test Player', effects: [{ type: 'coins', amount: 3, perRound: false }] };
G.pendingReplacement = { playerID: '0', wonCard: bengalsCard };
G.players['0'].team = { id: 'dolphins', name: 'Miami Dolphins' };
delete G.players['0'].copiedTeam;

// Dolphins attempt to discard won card -> MUST BE INVALID_MOVE
const invalidResult = DeflategateGame.phases.auctionPhase.moves.discardWonCard({ G, playerID: '0' });
assert(invalidResult === 'INVALID_MOVE', 'Non-Bengals team cannot discard won card');

// Change player 0 to Bengals
G.players['0'].team = { id: 'bengals', name: 'Cincinnati Bengals' };
const validResult = DeflategateGame.phases.auctionPhase.moves.discardWonCard({ G, playerID: '0' });
assert(validResult !== 'INVALID_MOVE', 'Bengals team CAN discard won card');
assert(G.pendingReplacement === null, 'pendingReplacement cleared after Bengals discard');
assert(G.decks.discard.includes(bengalsCard), 'Discarded card added to discard pile');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
