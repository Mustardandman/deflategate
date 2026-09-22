import assert from 'assert';
import {
  DeflategateGame,
  fisherYatesShuffle,
  getEffectiveTeamId,
  checkDolphinsEmergencyCoins,
  scoreCardForPlayer,
  chooseCpuNominationCard,
  evaluateCpuAuctionBid,
  resolveAuctionWin,
  calculateEstimatedGameEndRound
} from '../src/Game.js';
import { TEAMS, EVENTS, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';

console.log('--- STARTING PLAYTEST 19 VERIFICATION TESTS ---');

// 1. Fisher-Yates Shuffle Test
console.log('Test 1: Fisher-Yates uniform shuffle');
const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shuffled = fisherYatesShuffle(arr);
assert.strictEqual(shuffled.length, arr.length);
assert.deepStrictEqual([...shuffled].sort((a, b) => a - b), arr);
console.log('✓ Fisher-Yates shuffle preserves elements');

// 2. Lions First-Player Round Win Coin Refund
console.log('Test 2: Lions First Player Bonus');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'lions');
  state.players['0'].coins = 10;
  state.board.firstClaimThisRound = null;
  const testCard = { id: 'test_card', name: 'Test Player', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2 }] };
  state.board.highestBid = 5;
  
  resolveAuctionWin(state, '0', testCard);
  // Lions should have received +4 coins (4 players in game)
  // Coins started at 10, paid 5 -> 5 + 4 = 9
  assert.strictEqual(state.players['0'].coins, 9, `Lions should have 9 coins, got ${state.players['0'].coins}`);
  assert.strictEqual(state.board.firstClaimThisRound, '0');
  assert.ok(state.board.abilityNotification, 'Ability notification should be triggered');
  assert.strictEqual(state.board.abilityNotification.teamId, 'lions');
  console.log('✓ Lions received +4 coins on first claim with ability notification');
}

// 3. Player Demands a Trade Event Flow
console.log('Test 3: Player Demands a Trade Event Redesign');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.decks.activePlayers = [
    { id: 'reg1', name: 'Regular 1', minBid: 2, maxBid: 6 },
    { id: 'reg2', name: 'Regular 2', minBid: 2, maxBid: 6 },
    { id: 'reg3', name: 'Regular 3', minBid: 2, maxBid: 6 },
    { id: 'reg4', name: 'Regular 4', minBid: 2, maxBid: 6 },
    { id: 'trade1', name: 'Trade Demand Star', minBid: 3, maxBid: 10 }
  ];
  state.decks.event = [{ id: 'trade_event', name: 'Player Demands a Trade', category: 'bonus_auction', effect: 'Bonus auction' }];

  // Run eventPhase.onBegin
  game.phases.eventPhase.onBegin({ G: state, ctx: { numPlayers: 4 }, random: {} });
  assert.strictEqual(state.board.isTradeDemandActive, true);
  assert.strictEqual(state.board.tradeDemandCard.name, 'Trade Demand Star');

  // Run preAuctionPhase.onBegin
  game.phases.preAuctionPhase.onBegin({ G: state, ctx: { numPlayers: 4 }, events: {} });
  assert.strictEqual(state.board.isTradeDemandBidding, true);
  assert.strictEqual(state.board.auctionPlayers.length, 1);
  assert.strictEqual(state.board.auctionPlayers[0].name, 'Trade Demand Star');
  assert.strictEqual(state.board.pendingRegularAuctionPlayers.length, 4);

  // Claim the trade demand card
  state.players['1'].coins = 10;
  state.board.highestBid = 4;
  resolveAuctionWin(state, '1', state.board.auctionPlayers[0]);

  // After claiming trade demand card:
  assert.strictEqual(state.board.isTradeDemandBidding, false);
  assert.strictEqual(state.board.isTradeDemandActive, false);
  assert.strictEqual(state.board.auctionPlayers.length, 4, 'Regular auction players should be restored to auction row');
  assert.strictEqual(state.players['1'].hasWonAuction, false, 'Winner of trade demand card still gets to participate in regular auction');
  assert.strictEqual(state.players['1'].lineup.length, 1, 'Winner got the trade demand player');
  console.log('✓ Trade Demand event transitions seamlessly without modal');
}

// 4. Vikings Under 27 PSI Doubling Instant Coins
console.log('Test 4: Vikings 2x Instant Coins Under 27 PSI');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['2'].team = TEAMS.find(t => t.id === 'vikings');
  state.players['2'].psi = 24; // Under 27 PSI!
  state.players['2'].coins = 5;

  const instantCoinCard = {
    id: 'vik_coin_star',
    name: 'Coin Star',
    minBid: 1,
    maxBid: 5,
    effects: [{ type: 'coins', amount: 3 }] // Normally gives 3 coins
  };

  resolveAuctionWin(state, '2', instantCoinCard);
  // Started with 5 coins, instant 3 doubled to 6 -> 11 coins total
  assert.strictEqual(state.players['2'].coins, 11, `Vikings should have 11 coins (5 + 3*2), got ${state.players['2'].coins}`);
  console.log('✓ Vikings under 27 PSI correctly doubled instant coin effect');
}

// 5. Dolphins Emergency Bailout Check
console.log('Test 5: Dolphins 0-Coin Bailout');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['3'].team = TEAMS.find(t => t.id === 'dolphins');
  state.players['3'].coins = 0;

  checkDolphinsEmergencyCoins(state, '3');
  assert.strictEqual(state.players['3'].coins, 3, 'Dolphins should immediately gain 3 coins when reaching 0');
  assert.strictEqual(state.board.abilityNotification.teamId, 'dolphins');
  console.log('✓ Dolphins 0-coin bailout triggered immediately');
}

// 6. Raiders Velocity Threat Selection
console.log('Test 6: Raiders Velocity Threat Selection');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'raiders');
  state.players['0'].isCpu = true;
  state.players['0'].psi = 25;

  // Opponent 1: Low PSI (10), but 0 deflation per round and only 1 coin -> 10 turns to win
  state.players['1'].psi = 10;
  state.players['1'].coins = 1;
  state.players['1'].lineup = [];

  // Opponent 2: Higher PSI (16), but deflating 8 PSI per round! -> 2 turns to win (huge imminent threat!)
  state.players['2'].psi = 16;
  state.players['2'].coins = 5;
  state.players['2'].lineup = [
    { name: 'Engine 1', effects: [{ trigger: 'refresh', type: 'deflate', amount: 4 }] },
    { name: 'Engine 2', effects: [{ trigger: 'end_round', type: 'deflate', amount: 4 }] }
  ];

  // Opponent 3: 30 PSI
  state.players['3'].psi = 30;
  state.players['3'].coins = 2;
  state.players['3'].lineup = [];

  // Trigger preAuctionPhase.onBegin
  game.phases.preAuctionPhase.onBegin({ G: state, ctx: { numPlayers: 4 }, events: {} });

  // Raiders should have given 1 PSI to Player 2 (id '2'), NOT Player 1!
  assert.strictEqual(state.players['2'].psi, 17, `Player 2 should be inflated to 17, got ${state.players['2'].psi}`);
  assert.strictEqual(state.players['1'].psi, 10, 'Player 1 should not be targeted');
  assert.strictEqual(state.board.abilityNotification.teamId, 'raiders');
  console.log('✓ Raiders targeted the high-velocity engine threat (Player 2) instead of lowest raw PSI');
}

// 7. Cardinals Synergy Dilution Awareness
console.log('Test 7: Cardinals Synergy Dilution Awareness');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'cardinals');
  state.players['0'].isCpu = true;
  state.players['1'].team = TEAMS.find(t => t.id === 'saints'); // Saints rival present!

  const negCard1 = { name: 'Negative 1', minBid: 1, maxBid: 4, effects: [{ type: 'coins', amount: -2 }] };
  const negCard2 = { name: 'Negative 2', minBid: 1, maxBid: 4, effects: [{ type: 'inflate', amount: 2 }] };
  const goodCard1 = { name: 'Good 1', minBid: 2, maxBid: 5, effects: [{ type: 'deflate', amount: 2 }] };
  const goodCard2 = { name: 'Good 2', minBid: 2, maxBid: 5, effects: [{ type: 'deflate', amount: 1 }] };
  const topCard = { name: 'Awesome Deck Card', minBid: 2, maxBid: 6, effects: [{ type: 'deflate', amount: 5 }] };

  // activePlayers is popped from the end. Draw count is 4 for 4 players.
  // We want topCard to remain in deck, and the other 4 to be drawn into auctionPlayers.
  state.decks.activePlayers = [topCard, goodCard1, goodCard2, negCard2, negCard1];

  // Run preAuctionPhase.onBegin
  game.phases.preAuctionPhase.onBegin({ G: state, ctx: { numPlayers: 4 }, events: {} });

  // Cardinals should NOT swap away either negative card, because keeping 2 negative cards on board crowds the Saints!
  assert.ok(state.board.auctionPlayers.some(c => c && c.name === 'Negative 1'), 'Negative card 1 should be preserved for dilution');
  assert.ok(state.board.auctionPlayers.some(c => c && c.name === 'Negative 2'), 'Negative card 2 should be preserved for dilution');
  console.log('✓ Cardinals preserved multiple negative cards to dilute Saints draft');
}

// 8. Bills BPA (Best Player Available) Discard Claim
console.log('Test 8: Bills BPA Discard Evaluation');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'bills');
  state.players['0'].isCpu = true;
  state.players['0'].coins = 10;
  state.board.round = 2;

  const lowQualityCard = { name: 'Scrap Player', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1 }] };
  const highQualityCard = { name: 'Phase 1 Gem', minBid: 2, maxBid: 6, effects: [{ trigger: 'refresh', type: 'deflate', amount: 3 }] };
  state.decks.discard = [lowQualityCard, highQualityCard];

  // Run postAuctionPhase.onBegin
  game.phases.postAuctionPhase.onBegin({ G: state, events: {} });

  // Bills should have chosen the high quality gem, not the first card!
  assert.strictEqual(state.players['0'].hasUsedBillsAbility, true);
  assert.ok(state.players['0'].lineup.some(c => c.name === 'Phase 1 Gem'), 'Bills should have claimed Phase 1 Gem');
  assert.strictEqual(state.board.abilityNotification.teamId, 'bills');
  console.log('✓ Bills chose Best Player Available (Phase 1 Gem) from discard pile');
}

// 9. Colts Negative Recurring Avoidance
console.log('Test 9: Colts Strict Negative Avoidance');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'colts');
  state.players['0'].psi = 25;
  state.players['0'].coins = 10;

  const negativeRecurringCard = {
    id: 'ezekiel_elliott',
    name: 'Ezekiel Elliott',
    minBid: 2,
    maxBid: 6,
    effects: [{ trigger: 'refresh', type: 'coins', amount: -1 }, { trigger: 'refresh', type: 'deflate', amount: 2 }]
  };

  const cleanRecurringCard = {
    id: 'clean_card',
    name: 'Clean Card',
    minBid: 2,
    maxBid: 6,
    effects: [{ trigger: 'refresh', type: 'deflate', amount: 2 }]
  };

  const scoreNegative = scoreCardForPlayer(negativeRecurringCard, state.players['0'], state);
  const scoreClean = scoreCardForPlayer(cleanRecurringCard, state.players['0'], state);

  assert.ok(scoreNegative < 0, `Colts should heavily penalize recurring negative cards, score: ${scoreNegative}`);
  assert.ok(scoreClean > 15, `Colts should highly value clean recurring cards, score: ${scoreClean}`);
  console.log(`✓ Colts penalized negative recurring (${scoreNegative}) and favored clean (${scoreClean})`);
}

// 10. Bengals Dual-Threat QB & Instants Valuation
console.log('Test 10: Bengals Dual-Threat & Instant Boost');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'bengals');
  state.players['0'].psi = 25;
  state.players['0'].coins = 10;

  const instantCard = {
    id: 'inst',
    name: 'Instant Deflate',
    minBid: 1,
    maxBid: 4,
    effects: [{ type: 'deflate', amount: 2 }]
  };

  const dualThreatQb = {
    id: 'qb_dual',
    name: 'Dual QB',
    position: 'QB',
    minBid: 2,
    maxBid: 7,
    effects: [{ type: 'deflate', amount: 2 }, { trigger: 'refresh', type: 'deflate', amount: 2 }]
  };

  const scoreInst = scoreCardForPlayer(instantCard, state.players['0'], state);
  const scoreDual = scoreCardForPlayer(dualThreatQb, state.players['0'], state);

  assert.ok(scoreInst > 14, `Bengals should boost instant abilities by +2, got score ${scoreInst}`);
  assert.ok(scoreDual > 25, `Bengals should prize dual-threat QBs filling two roles, got score ${scoreDual}`);
  console.log(`✓ Bengals boosted instant (${scoreInst}) and dual-threat QB (${scoreDual})`);
}

// 11. Smart Middle-Tier Nomination When Out-Coined
console.log('Test 11: Smart Middle-Tier Nomination');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].coins = 3; // Low on coins
  state.players['1'].coins = 20; // Opponents rich
  state.players['2'].coins = 18;
  state.players['3'].coins = 15;

  const unaffordableSuperstar = { name: 'Superstar', minBid: 8, maxBid: 20, effects: [{ type: 'deflate', amount: 6 }] };
  const affordableQuality = { name: 'Quality Mid', minBid: 2, maxBid: 5, effects: [{ type: 'deflate', amount: 3 }] };
  const junk = { name: 'Junk', minBid: 1, maxBid: 2, effects: [{ type: 'coins', amount: 1 }] };

  state.board.auctionPlayers = [unaffordableSuperstar, affordableQuality, junk];

  const chosenIdx = chooseCpuNominationCard(state, '0');
  assert.strictEqual(chosenIdx, 1, `Should nominate affordable quality player (idx 1), got ${chosenIdx}`);
  console.log('✓ CPU nominated affordable quality player when out-coined by rivals');
}

// 12. Human Worst-Player Outbid Protection
console.log('Test 12: Human Worst-Player Outbid Protection');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].isCpu = false; // Human nominator
  state.players['1'].isCpu = true;  // CPU bidder
  state.players['1'].coins = 10;
  state.players['1'].psi = 25;

  const worstCard = { name: 'Worst Card', minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 1 }] };
  const greatCard = { name: 'Great Card', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 4 }] };
  state.board.auctionPlayers = [worstCard, greatCard];

  state.board.activeAuctionCardIndex = 0; // Worst card nominated by human
  state.board.highestBid = 1;
  state.board.highestBidder = '0'; // Human bid 1

  const decision = evaluateCpuAuctionBid(state, '1');
  assert.strictEqual(decision.shouldBid, false, 'CPU should pass on worst card when much better cards are available in auction row');
  console.log('✓ CPU avoided petty 1-coin outbid on human worst-card nomination');
}

// 13. Chargers Outbid Farming & Rivals Passing
console.log('Test 13: Chargers Outbid Farming & Rival Trapping');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.players['0'].team = TEAMS.find(t => t.id === 'chargers');
  state.players['0'].isCpu = true;
  state.players['0'].coins = 15;
  state.players['0'].psi = 25;
  state.players['1'].coins = 10; // Capable opponent
  state.players['2'].coins = 10; // Capable opponent

  const card = { name: 'Solid Card', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 2 }] };
  state.board.auctionPlayers = [card, { name: 'Card 2' }, { name: 'Card 3' }, { name: 'Card 4' }];
  state.board.activeAuctionCardIndex = 0;
  state.board.highestBid = 2;
  state.board.highestBidder = '1';

  // Chargers should outbid to farm end-of-round coins because opponents can outbid
  const chargersDecision = evaluateCpuAuctionBid(state, '0');
  assert.strictEqual(chargersDecision.shouldBid, true, 'Chargers should place competitive outbid');

  // Now test rival trapping: when Chargers has bid up near max valuation on a non-essential card, rival passes to make Chargers win!
  state.board.highestBid = 6;
  state.board.highestBidder = '0'; // Chargers holds highest bid
  state.players['2'].coins = 15;
  state.players['2'].psi = 25;
  const rivalDecision = evaluateCpuAuctionBid(state, '2');
  assert.strictEqual(rivalDecision.shouldBid, false, 'Rival should pass to stick Chargers with the win and shut down future outbid farming');
  console.log('✓ Chargers outbid farming and rival trapping pass verified');
}

// 14. Rookie Class Double Draft Clockwise Passing
console.log('Test 14: Rookie Class Clockwise Nomination');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.board.activeEvent = { category: 'double_draft', name: 'Rookie Class' };
  state.board.round = 2;
  state.board.firstPlayer = '0';
  state.board.nominator = '0';

  // Player 0 wins first card
  const card1 = { name: 'Rookie 1', minBid: 1, maxBid: 4 };
  state.board.auctionPlayers = [card1, { name: 'Rookie 2' }, { name: 'Rookie 3' }, { name: 'Rookie 4' }];
  state.board.activeAuctionCardIndex = 0;
  resolveAuctionWin(state, '0', card1);

  // In double_draft, after Player 0 wins 1 card, nomination should pass clockwise to Player 1 (who has 0 cards won)
  assert.strictEqual(state.board.nominator, '1', `Nomination should pass to Player 1, got ${state.board.nominator}`);
  console.log('✓ Rookie Class rotated nomination clockwise to next team with 0 wins');
}

// 15. Dynamic End Round Calculation
console.log('Test 15: Dynamic Game End Round');
{
  const game = DeflategateGame;
  const state = game.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  state.board.round = 3;
  Object.values(state.players).forEach(p => p.psi = 44);
  state.players['0'].team = TEAMS.find(t => t.id === 'eagles');
  state.players['0'].coins = 8; // Eagles pushes game to Round 10!

  assert.strictEqual(calculateEstimatedGameEndRound(state), 10, 'With Eagles active and high PSI, game end should estimate round 10');

  // Fast rusher at 8 PSI deflating 4 per round -> estimated round 5
  state.players['1'].psi = 8;
  state.players['1'].lineup = [{ effects: [{ perRound: true, type: 'deflate', amount: 4 }] }];
  const est = calculateEstimatedGameEndRound(state);
  assert.ok(est <= 7, `Estimated end round should reflect fast deflation, got ${est}`);
  console.log(`✓ Dynamic game end horizon calculated: ${est}`);
}

console.log('--- ALL PLAYTEST 19 TESTS PASSED SUCCESSFULLY! ---');
