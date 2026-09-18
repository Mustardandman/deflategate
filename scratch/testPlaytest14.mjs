import assert from 'assert';
import { 
  DeflategateGame, 
  chooseCpuNominationCard, 
  evaluateCpuAuctionBid 
} from '../src/Game.js';
import { EVENTS } from '../src/GameData.js';

console.log('--- Starting Playtest #14 Verification Tests ---\n');

// Test 1: Jaguars Secret Event Deck draws from index 0 (.shift())
console.log('Test 1: Event drawing pulls from top of deck (index 0)');
{
  const testEventTop = { id: 'top_test_event', name: 'Top Test Event', effect: 'Triggered first!', category: 'neutral' };
  const testEventBottom = { id: 'bottom_test_event', name: 'Bottom Test Event', effect: 'Triggered last!', category: 'neutral' };
  
  const mockG = {
    board: { round: 2, eventsRevealed: 0, activeEvent: null, eventFlipRevealed: false },
    players: {
      '0': { team: { id: 'jaguars', name: 'Jaguars' }, coins: 10, psi: 50 },
      '1': { team: { id: 'patriots', name: 'Patriots' }, coins: 10, psi: 50 }
    },
    decks: {
      event: [testEventTop, testEventBottom]
    },
    logs: []
  };

  const onBegin = DeflategateGame.phases.eventPhase.onBegin;
  onBegin({ G: mockG, events: {} });

  assert.strictEqual(mockG.board.activeEvent.id, 'top_test_event', 'Top card (index 0) must be drawn on event reveal');
  assert.strictEqual(mockG.decks.event.length, 1, 'Event deck should have 1 remaining card');
  assert.strictEqual(mockG.decks.event[0].id, 'bottom_test_event', 'Remaining card should be the bottom card');
  console.log('  ✓ Top event (index 0) successfully revealed as active event');
}

// Test 2: CPU Nomination sets highestBid = card.minBid (never 0 or Math.min with low coins)
console.log('\nTest 2: CPU Nomination enforces card.minBid as opening bid');
{
  const cardP1 = { id: 'card_min1', name: 'Phase 1 Star', minBid: 1, maxBid: 10, phase: 1, effects: [] };
  const cardP2 = { id: 'card_min2', name: 'Phase 2 Star', minBid: 2, maxBid: 15, phase: 2, effects: [] };

  const mockG = {
    board: {
      round: 5,
      activeAuctionCardIndex: null,
      passedAuctionPlayers: [],
      auctionPlayers: [cardP1, cardP2],
      highestBid: 0,
      highestBidder: null,
      nominator: '1'
    },
    players: {
      '0': { isCpu: false, coins: 10, hasWonAuction: false, team: { id: 'chiefs' } },
      '1': { isCpu: true, coins: 5, hasWonAuction: false, team: { id: 'bills' } },
      '2': { isCpu: true, coins: 5, hasWonAuction: false, team: { id: 'jets' } }
    },
    logs: []
  };

  // CPU 1 chooses nomination
  const chosenIdx = chooseCpuNominationCard(mockG, '1');
  assert(chosenIdx !== -1, 'CPU with 5 coins should choose an affordable card');
  
  // Trigger stepCpuTurn
  let turnEnded = false;
  DeflategateGame.moves.stepCpuTurn({
    G: mockG,
    ctx: { currentPlayer: '1', numPlayers: 3 },
    events: { endTurn: () => { turnEnded = true; } }
  });

  assert.strictEqual(mockG.board.highestBidder, '1', 'CPU 1 should be the highest bidder');
  const nominatedCard = mockG.board.auctionPlayers[mockG.board.activeAuctionCardIndex];
  assert.strictEqual(mockG.board.highestBid, nominatedCard.minBid, `Opening bid must equal card.minBid (${nominatedCard.minBid})`);
  assert(mockG.board.highestBid >= 1, 'Opening bid must be at least 1');
  assert(turnEnded, 'Turn should end after nomination');
  console.log(`  ✓ CPU nominated ${nominatedCard.name} with exact opening bid = ${mockG.board.highestBid}`);
}

// Test 3: CPU with 0 coins cannot nominate when competitors exist
console.log('\nTest 3: CPU with 0 coins cannot nominate when competitors exist');
{
  const cardP1 = { id: 'card_min1', name: 'Phase 1 Star', minBid: 1, maxBid: 10, phase: 1, effects: [] };

  const mockG = {
    board: {
      round: 2,
      activeAuctionCardIndex: null,
      passedAuctionPlayers: [],
      auctionPlayers: [cardP1],
      highestBid: 0,
      highestBidder: null,
      nominator: '1'
    },
    players: {
      '0': { isCpu: false, coins: 10, hasWonAuction: false, team: { id: 'chiefs' } },
      '1': { isCpu: true, coins: 0, hasWonAuction: false, team: { id: 'bills' } }
    },
    logs: []
  };

  // CPU 1 has 0 coins, card costs minBid 1
  const chosenIdx = chooseCpuNominationCard(mockG, '1');
  assert.strictEqual(chosenIdx, -1, 'CPU with 0 coins must not be allowed to nominate when competitors exist');
  console.log('  ✓ chooseCpuNominationCard returned -1 for 0-coin CPU');

  // stepCpuTurn should advance nominator to Player 0
  let turnEnded = false;
  DeflategateGame.moves.stepCpuTurn({
    G: mockG,
    ctx: { currentPlayer: '1', numPlayers: 2 },
    events: { endTurn: () => { turnEnded = true; } }
  });

  assert.strictEqual(mockG.board.nominator, '0', 'Nomination must pass to Player 0 who has coins');
  assert.strictEqual(mockG.board.activeAuctionCardIndex, null, 'No card should be nominated yet');
  console.log('  ✓ Nomination successfully passed to player with sufficient coins');
}

// Test 4: Sole remaining bidder with 0 coins can acquire card for 0 coins
console.log('\nTest 4: Sole remaining bidder with 0 coins can nominate and acquire card');
{
  const cardP1 = { id: 'last_card', name: 'Last Card', minBid: 1, maxBid: 10, phase: 1, effects: [] };

  const mockG = {
    board: {
      round: 2,
      activeAuctionCardIndex: null,
      passedAuctionPlayers: [],
      auctionPlayers: [cardP1],
      highestBid: 0,
      highestBidder: null,
      nominator: '1'
    },
    players: {
      '0': { isCpu: false, coins: 10, hasWonAuction: true, team: { id: 'chiefs' } }, // Already won
      '1': { isCpu: true, coins: 0, hasWonAuction: false, team: { id: 'bills' }, lineup: [] }  // Sole remaining
    },
    decks: { discard: [] },
    logs: []
  };

  // Sole remaining bidder can choose card
  const chosenIdx = chooseCpuNominationCard(mockG, '1');
  assert.strictEqual(chosenIdx, 0, 'Sole remaining bidder should be allowed to choose the last card');

  DeflategateGame.moves.stepCpuTurn({
    G: mockG,
    ctx: { currentPlayer: '1', numPlayers: 2 },
    events: { endTurn: () => {} }
  });

  assert(mockG.players['1'].hasWonAuction, 'Sole remaining bidder should immediately win the card');
  assert.strictEqual(mockG.players['1'].coins, 0, 'Coins should remain 0');
  console.log('  ✓ Sole remaining bidder with 0 coins successfully acquired card for 0 coins');
}

// Test 5: Human selectCard blocks unaffordable nominations
console.log('\nTest 5: Human selectCard blocks unaffordable card nomination');
{
  const cardP2 = { id: 'expensive_p2', name: 'Expensive Card', minBid: 2, maxBid: 10, phase: 2, effects: [] };

  const mockG = {
    board: {
      round: 5,
      activeAuctionCardIndex: null,
      passedAuctionPlayers: [],
      auctionPlayers: [cardP2],
      highestBid: 0,
      highestBidder: null,
      nominator: '0'
    },
    players: {
      '0': { isCpu: false, coins: 1, hasWonAuction: false, team: { id: 'chiefs' } },
      '1': { isCpu: true, coins: 10, hasWonAuction: false, team: { id: 'bills' } }
    },
    logs: []
  };

  // Player 0 has 1 coin, card costs minBid 2
  const result = DeflategateGame.phases.auctionPhase.moves.selectCard({ G: mockG, playerID: '0' }, 0);
  assert.strictEqual(result, 'INVALID_MOVE', 'selectCard must be rejected if player coins < card.minBid');
  console.log('  ✓ selectCard rejected when human coins < card.minBid');
}

// Test 6: passNomination move advances nominator
console.log('\nTest 6: passNomination move successfully advances nomination');
{
  const cardP1 = { id: 'card1', name: 'Card 1', minBid: 1, maxBid: 10, phase: 1, effects: [] };

  const mockG = {
    board: {
      round: 1,
      activeAuctionCardIndex: null,
      auctionPlayers: [cardP1],
      highestBid: 0,
      highestBidder: null,
      nominator: '0'
    },
    players: {
      '0': { isCpu: false, coins: 0, hasWonAuction: false, team: { id: 'chiefs' } },
      '1': { isCpu: true, coins: 5, hasWonAuction: false, team: { id: 'bills' } }
    },
    logs: []
  };

  let turnEnded = false;
  const passNomMove = DeflategateGame.phases.auctionPhase.moves.passNomination;
  passNomMove({ G: mockG, playerID: '0', events: { endTurn: () => { turnEnded = true; } } });

  assert.strictEqual(mockG.board.nominator, '1', 'Nomination should pass to Player 1');
  assert(turnEnded, 'Turn should end on passNomination');
  console.log('  ✓ passNomination successfully advanced nominator to Player 1');
}

console.log('\n🎉 ALL PLAYTEST #14 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
