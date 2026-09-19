import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid } from '../src/Game.js';
import { PHASE_2_PLAYERS, HOF_PLAYERS, EVENTS } from '../src/GameData.js';

console.log('================================================================');
console.log('--- STARTING PLAYTEST #17 VERIFICATION TEST SUITE ---');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✔ ${message}`);
  passedTests++;
}

// -------------------------------------------------------------
// Test 1: Deck Shuffle Progression (Round 4 for Phase 2, Round 7 for HOF)
// -------------------------------------------------------------
console.log('Test 1: Deck Shuffle Progression (Round 4 for Phase 2, Round 7 for HOF)');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 1 });
  const initialActiveCount = G.decks.activePlayers.length;

  // Simulate reaching Round 3: neither Phase 2 nor HOF should be shuffled yet
  G.board.round = 3;
  // Trigger eventPhase onBegin
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  assert(!G.board.phase2Shuffled, 'Phase 2 players not shuffled at Round 3');
  assert(!G.board.hofShuffled, 'Hall of Fame legends not shuffled at Round 3');

  // Advance to Round 4: Phase 2 players MUST shuffle in
  G.board.round = 4;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  assert(G.board.phase2Shuffled === true, 'Phase 2 players successfully shuffled into deck at Round 4');
  assert(!G.board.hofShuffled, 'Hall of Fame legends not shuffled at Round 4');

  // Advance to Round 6: HOF still not shuffled
  G.board.round = 6;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  assert(!G.board.hofShuffled, 'Hall of Fame legends not shuffled at Round 6');

  // Advance to Round 7: HOF legends MUST shuffle in
  G.board.round = 7;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  assert(G.board.hofShuffled === true, 'Hall of Fame legends successfully shuffled into deck at Round 7');
}

// -------------------------------------------------------------
// Test 2: Team Legend Returns Event (Phase 2 for Round < 7, HOF for Round >= 7)
// -------------------------------------------------------------
console.log('\nTest 2: Team Legend Returns Event (Phase 2 for Round < 7, HOF for Round >= 7)');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 1 });
  
  // Test at Round 4: should award Phase 2 card
  G.board.round = 4;
  G.decks.event = [{ id: 'e13', name: 'Team Legend Returns', category: 'legend_returns' }];
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  const topCardR4 = G.decks.activePlayers[G.decks.activePlayers.length - 1];
  assert(topCardR4.phase === 2, `Round 4 Team Legend Returns awards Phase 2 player (${topCardR4.name})`);

  // Test at Round 6: should still award Phase 2 card
  G.board.round = 6;
  G.decks.event = [{ id: 'e13', name: 'Team Legend Returns', category: 'legend_returns' }];
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  const topCardR6 = G.decks.activePlayers[G.decks.activePlayers.length - 1];
  assert(topCardR6.phase === 2, `Round 6 Team Legend Returns awards Phase 2 player (${topCardR6.name})`);

  // Test at Round 7: should award Hall of Fame card
  G.board.round = 7;
  G.decks.event = [{ id: 'e13', name: 'Team Legend Returns', category: 'legend_returns' }];
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4, currentPlayer: '0' }, events: {} });
  const topCardR7 = G.decks.activePlayers[G.decks.activePlayers.length - 1];
  assert(topCardR7.phase === 'hof', `Round 7 Team Legend Returns awards Hall of Fame player (${topCardR7.name})`);
}

// -------------------------------------------------------------
// Test 3: Sole Remaining Bidder with 0 Coins Can Bid 0 and Win Immediately
// -------------------------------------------------------------
console.log('\nTest 3: Sole Remaining Bidder with 0 Coins Can Bid 0 and Win Immediately');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 2 });
  // Players 1, 2, 3 have won auctions already
  G.players['1'].hasWonAuction = true;
  G.players['2'].hasWonAuction = true;
  G.players['3'].hasWonAuction = true;
  // Player 0 is sole remaining bidder and has 0 coins
  G.players['0'].hasWonAuction = false;
  G.players['0'].coins = 0;
  G.players['0'].cardsWonThisRound = 0;

  // Single auction card remaining with minBid 5
  G.board.auctionPlayers = [
    { id: 'player_a', name: 'Expensive Player', minBid: 5, maxBid: 15, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
    null, null, null
  ];

  // Player 0 nominates card 0
  const selectRes = DeflategateGame.phases.auctionPhase.moves.selectCard({ G, playerID: '0', events: {} }, 0, '0');
  assert(selectRes !== 'INVALID_MOVE', 'Player 0 with 0 coins successfully nominates the remaining card');
  assert(G.board.activeAuctionCardIndex === 0, 'Auction card 0 is actively nominated');

  // Player 0 bids 0 coins
  const bidRes = DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '0', events: {} }, 0, '0');
  assert(bidRes !== 'INVALID_MOVE', 'Player 0 with 0 coins successfully submits a 0 coin bid');
  assert(G.players['0'].hasWonAuction === true, 'Player 0 immediately wins the auction for 0 coins');
  assert(G.players['0'].lineup.some(c => c.id === 'player_a'), 'Player 0 received the player card into their lineup');
}

// -------------------------------------------------------------
// Test 4: Lions CPU 1st-Player Aggressive Nomination (Max-Bid or Lockout)
// -------------------------------------------------------------
console.log('\nTest 4: Lions CPU 1st-Player Aggressive Nomination (Max-Bid or Lockout)');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 0 });
  // Set Player 1 as Lions
  G.players['1'].team = { id: 'lions', name: 'Detroit Lions' };
  G.players['1'].coins = 12;

  // Set board with players: one affordable max card (max 8) and one expensive (max 15)
  G.board.auctionPlayers = [
    { id: 'expensive_star', name: 'Expensive Star', minBid: 3, maxBid: 15, phase: 1, effects: [{ type: 'deflate', amount: 3, perRound: true }] },
    { id: 'cheap_gem', name: 'Cheap Gem', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  // No player has won auction yet in this round
  Object.values(G.players).forEach(p => { p.hasWonAuction = false; });

  const chosenNomIdx = chooseCpuNominationCard(G, '1');
  assert(chosenNomIdx === 1, 'Lions selects card 1 (Cheap Gem) because Lions can afford its max bid (8 <= 12)');

  // Now simulate CPU move execution
  G.board.activeAuctionCardIndex = null;
  DeflategateGame.phases.auctionPhase.moves.stepCpuTurn({ G, ctx: { currentPlayer: '1' }, events: {} });
  assert(G.board.lastActionText.includes('nominated Cheap Gem for 8 coins'), 'Lions CPU immediately submitted max bid (8 coins) on nomination');
  assert(G.players['1'].hasWonAuction === true, 'Lions CPU immediately won the auction on nomination via max bid');
  assert(G.players['1'].coins === 8, 'Lions coins net 8 (12 - 8 bid + 4 Lions first-claim bonus)');
  assert(G.players['1'].lineup.some(c => c.id === 'cheap_gem'), 'Lions received Cheap Gem card into lineup');
}

// -------------------------------------------------------------
// Test 5: Non-Lions Counter-Play Against Lions on 1st Player of Round
// -------------------------------------------------------------
console.log('\nTest 5: Non-Lions Counter-Play Against Lions on 1st Player of Round');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: arr => [...arr] } }, { numHumans: 0 });
  G.players['0'].team = { id: 'packers', name: 'Green Bay Packers' };
  G.players['0'].coins = 15;
  G.players['1'].team = { id: 'lions', name: 'Detroit Lions' };
  G.players['1'].coins = 14;

  G.board.activeAuctionCardIndex = 0;
  G.board.auctionPlayers = [
    { id: 'top_player', name: 'Top Player', minBid: 3, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 4, perRound: true }] }
  ];

  // Lions is currently the highest bidder on the first player of the round
  G.board.highestBid = 4;
  G.board.highestBidder = '1';
  G.board.passedAuctionPlayers = [];

  // Packers (Player 0) turn to bid: should aggressively counter-bid / price-bump against Lions
  const bidDecision = evaluateCpuAuctionBid(G, '0');
  assert(bidDecision.shouldBid === true, 'Packers CPU aggressively bids to counter/block Lions on 1st player of round');
  assert(bidDecision.bidAmount === 5, 'Packers CPU raises bid to 5 coins to push Lions higher');
}

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests} / ${totalTests} PLAYTEST #17 TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================\n');
