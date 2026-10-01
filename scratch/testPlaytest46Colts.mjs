import {
  scoreCardForPlayer,
  evaluateCpuAuctionBid,
  chooseCpuNominationCard,
  getEffectiveTeamId
} from '../src/Game.js';
import { PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';

const ALL_PLAYERS = [...PHASE_1_PLAYERS, ...PHASE_2_PLAYERS, ...HOF_PLAYERS];

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== TEST PLAYTEST 46: INDIANAPOLIS COLTS AI STRATEGY ===\n');

function createMockColtsState(customColts = {}, round = 1) {
  const coltsPlayer = {
    id: '0',
    team: { id: 'colts', name: 'Indianapolis Colts' },
    isCpu: true,
    coins: 7,
    psi: 42,
    cardsWonThisRound: 0,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_3' }
    ],
    ...customColts
  };

  const oppPlayer = {
    id: '1',
    team: { id: 'bills', name: 'Buffalo Bills' },
    isCpu: true,
    coins: 6,
    psi: 42,
    cardsWonThisRound: 0,
    lineup: [
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_4' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_5' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_6' }
    ]
  };

  return {
    players: { '0': coltsPlayer, '1': oppPlayer },
    board: {
      round,
      firstPlayer: '0',
      nominator: '0',
      highestBidder: null,
      highestBid: 0,
      activeAuctionCardIndex: 0,
      auctionPlayers: [],
      passedAuctionPlayers: []
    },
    decks: { discard: [] }
  };
}

// -------------------------------------------------------------
// TEST 1: Absolute Zero-Tolerance for Poison Cards
// -------------------------------------------------------------
console.log('Test 1: Absolute Zero-Tolerance for Poison Cards (Watson, Hunter Henry, Zeke)');
{
  const G = createMockColtsState();
  const watson = ALL_PLAYERS.find(c => c.id === 'deshaun_watson') || {
    id: 'deshaun_watson', name: 'Deshaun Watson', minBid: 1, maxBid: 10,
    effects: [{ type: 'inflate', amount: 3, perRound: true }, { type: 'coins', amount: 2, perRound: true }]
  };
  const hunterHenry = ALL_PLAYERS.find(c => c.id === 'hunter_henry');
  const zeke = ALL_PLAYERS.find(c => c.id === 'ezekiel_elliott');

  // Verify scoreCardForPlayer rejects them
  const watsonScore = scoreCardForPlayer(G, '0', watson);
  const henryScore = scoreCardForPlayer(G, '0', hunterHenry);
  const zekeScore = scoreCardForPlayer(G, '0', zeke);

  assert(watsonScore <= -50, `Colts score for Deshaun Watson is lethal negative: ${watsonScore}`);
  assert(henryScore <= -50, `Colts score for Hunter Henry is lethal negative: ${henryScore}`);
  assert(zekeScore <= -50, `Colts score for Ezekiel Elliott is lethal negative: ${zekeScore}`);

  // Verify evaluateCpuAuctionBid refuses to bid
  G.board.auctionPlayers = [watson, hunterHenry, zeke];
  G.board.activeAuctionCardIndex = 0;
  const bidWatson = evaluateCpuAuctionBid(G, '0');
  assert(!bidWatson.shouldBid, `Colts refuses to bid on Deshaun Watson`);

  G.board.activeAuctionCardIndex = 1;
  const bidHenry = evaluateCpuAuctionBid(G, '0');
  assert(!bidHenry.shouldBid, `Colts refuses to bid on Hunter Henry`);

  G.board.activeAuctionCardIndex = 2;
  const bidZeke = evaluateCpuAuctionBid(G, '0');
  assert(!bidZeke.shouldBid, `Colts refuses to bid on Ezekiel Elliott`);
}

// -------------------------------------------------------------
// TEST 2: Trevor Lawrence is Not Bad (Not a High Priority Either)
// -------------------------------------------------------------
console.log('\nTest 2: Trevor Lawrence is Evaluated as Viable Ordinary Engine (Not Over-Prioritized)');
{
  const G = createMockColtsState();
  const lawrence = ALL_PLAYERS.find(c => c.id === 'trevor_lawrence');
  assert(!!lawrence, `Trevor Lawrence found in ALL_PLAYERS`);

  const cleanStar = ALL_PLAYERS.find(c => c.id === 'brock_bowers') || {
    id: 'brock_bowers', name: 'Brock Bowers', minBid: 1, maxBid: 15,
    effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'coins', amount: 2, perRound: true }]
  };

  const scoreLawrence = scoreCardForPlayer(G, '0', lawrence);
  const scoreStar = scoreCardForPlayer(G, '0', cleanStar);

  assert(scoreLawrence > 0, `Colts scores Trevor Lawrence positively (${scoreLawrence.toFixed(1)} > 0, not lethal)`);
  assert(scoreLawrence < 50, `Colts does NOT over-prioritize Trevor Lawrence (${scoreLawrence.toFixed(1)} < 50)`);
  assert(scoreStar > scoreLawrence * 2, `Clean star Brock Bowers (${scoreStar.toFixed(1)}) is prioritized significantly over Trevor Lawrence (${scoreLawrence.toFixed(1)})`);

  // Bidding on Lawrence: willing to pick him up if cheap (1-3 coins), but passes at 4+ when alternatives exist
  const cheapCleanCard = { id: 'alt_rec', name: 'Clean Rec', minBid: 1, maxBid: 6, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
  G.board.auctionPlayers = [lawrence, cheapCleanCard];
  G.board.activeAuctionCardIndex = 0;

  // Opening bid on Lawrence at 1 coin
  const bidLawrenceOpen = evaluateCpuAuctionBid(G, '0');
  assert(bidLawrenceOpen.shouldBid, `Colts willing to open bid on Trevor Lawrence for cheap (1 coin)`);
  assert(bidLawrenceOpen.bidAmount === 1, `Opening bid is nextBid 1`);

  // When outbid to 3 coins (nextBid 4) and clean alternatives exist, Colts passes on Lawrence!
  G.board.highestBidder = '1';
  G.board.highestBid = 3;
  const bidLawrence4 = evaluateCpuAuctionBid(G, '0');
  assert(!bidLawrence4.shouldBid, `Colts passes on Trevor Lawrence at 4+ coins when clean alternative is on the board`);
}

// -------------------------------------------------------------
// TEST 3: Bargain Hunter on Cheap Clean Recurring Engines (3-4 Coins Max, Passes at 5)
// -------------------------------------------------------------
console.log('\nTest 3: Bargain Hunter on Cheap Clean Recurring Engines (3-4 Coins Max)');
{
  const G = createMockColtsState();
  const cheap2Coins = {
    id: 'test_cheap_coins', name: 'Cheap Coins Guy', minBid: 1, maxBid: 6, phase: 1,
    effects: [{ type: 'coins', amount: 2, perRound: true }]
  };
  const cheap1Coin1Deflate = {
    id: 'test_cheap_dual', name: 'Cheap Dual Engine', minBid: 1, maxBid: 6, phase: 1,
    effects: [{ type: 'coins', amount: 1, perRound: true }, { type: 'deflate', amount: 1, perRound: true }]
  };

  const scoreCoins = scoreCardForPlayer(G, '0', cheap2Coins);
  const scoreDual = scoreCardForPlayer(G, '0', cheap1Coin1Deflate);
  assert(scoreCoins >= 20.0, `Colts heavily scores cheap 2 coins engine: ${scoreCoins.toFixed(1)}`);
  assert(scoreDual >= 20.0, `Colts heavily scores cheap 1 coin + 1 deflate engine: ${scoreDual.toFixed(1)}`);

  // Case A: Another clean option exists on the board -> cap is 3 coins
  G.board.auctionPlayers = [cheap2Coins, cheap1Coin1Deflate];
  G.board.activeAuctionCardIndex = 0;
  
  // Opening bid
  const bidOpening = evaluateCpuAuctionBid(G, '0');
  assert(bidOpening.shouldBid, `Colts bids on cheap recurring engine`);
  assert(bidOpening.bidAmount === 1, `Opening bid is nextBid (1)`);

  // Opponent bids 2 -> Colts bids 3
  G.board.highestBidder = '1';
  G.board.highestBid = 2;
  const bid3 = evaluateCpuAuctionBid(G, '0');
  assert(bid3.shouldBid && bid3.bidAmount === 3, `Colts outbids opponent up to 3 coins`);

  // Opponent bids 3 (nextBid = 4) with alternative on board -> Colts passes at 4 to take the other option!
  G.board.highestBid = 3;
  const bidPass4 = evaluateCpuAuctionBid(G, '0');
  assert(!bidPass4.shouldBid, `Colts passes on 4-coin bid when another clean cheap option is on the board`);

  // Case B: Solitary cheap engine (no other clean recurring on board) -> bids up to 4 coins, passes at 5!
  G.board.auctionPlayers = [cheap2Coins];
  G.board.highestBid = 3;
  const bid4Solitary = evaluateCpuAuctionBid(G, '0');
  assert(bid4Solitary.shouldBid && bid4Solitary.bidAmount === 4, `Colts bids up to 4 coins when solitary cheap engine`);

  // At 5 coins: Colts considers other options / folds
  G.board.highestBid = 4; // nextBid = 5
  G.board.auctionPlayers = [cheap2Coins, { id: 'alt_pure_inst', name: 'Alt Instant', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 3, perRound: false }] }];
  const bid5Fold = evaluateCpuAuctionBid(G, '0');
  assert(!bid5Fold.shouldBid, `Colts passes at 5 coins: "once it gets to 5 coins I'd have to consider my other options"`);
}

// -------------------------------------------------------------
// TEST 4: Early Game Recurring Priority & 1-Win Discipline
// -------------------------------------------------------------
console.log('\nTest 4: Early Game Recurring Priority over Pure Instants (1-Win Discipline)');
{
  const G = createMockColtsState({}, 1); // Round 1
  const pureInstantCard = {
    id: 'test_instant', name: 'Instant Nuke', minBid: 1, maxBid: 8, phase: 1,
    effects: [{ type: 'deflate', amount: 3, perRound: false }]
  };
  const recurringCard = {
    id: 'test_recurring', name: 'Recurring Engine', minBid: 1, maxBid: 8, phase: 1,
    effects: [{ type: 'deflate', amount: 1, perRound: true }]
  };

  G.board.auctionPlayers = [pureInstantCard, recurringCard];
  G.board.activeAuctionCardIndex = 0; // pure instant card is currently up

  const bidInstant = evaluateCpuAuctionBid(G, '0');
  assert(!bidInstant.shouldBid, `Colts PASSES on pure instant card in Round 1 while clean recurring card is on the board`);

  // If NO recurring cards exist on the board, Colts may bid on the instant card
  G.board.auctionPlayers = [pureInstantCard];
  const bidSoloInstant = evaluateCpuAuctionBid(G, '0');
  assert(bidSoloInstant.shouldBid, `Colts can bid on instant card when no recurring alternative exists on board`);
}

// -------------------------------------------------------------
// TEST 5: Endgame Closer Pivot
// -------------------------------------------------------------
console.log('\nTest 5: Endgame Closer Pivot (PSI <= 16 or Instant Win)');
{
  const G = createMockColtsState({ psi: 14 }, 7); // Round 7, 14 PSI
  const instantCloser = {
    id: 'test_closer', name: 'Closer Bomb', minBid: 1, maxBid: 10,
    effects: [{ type: 'deflate', amount: 6, perRound: false }]
  };
  const championshipCard = {
    id: 'test_champ', name: 'Game Winner', minBid: 1, maxBid: 15,
    effects: [{ type: 'deflate', amount: 14, perRound: false }]
  };

  G.board.auctionPlayers = [instantCloser, championshipCard];
  G.board.activeAuctionCardIndex = 0;
  const bidCloser = evaluateCpuAuctionBid(G, '0');
  assert(bidCloser.shouldBid, `Colts bids aggressively on instant closer in endgame`);

  G.board.activeAuctionCardIndex = 1;
  const bidChamp = evaluateCpuAuctionBid(G, '0');
  assert(bidChamp.shouldBid && bidChamp.isChampionshipBid, `Colts bids championship all-in to win the game`);
}

// -------------------------------------------------------------
// TEST 6: Nomination Strategy
// -------------------------------------------------------------
console.log('\nTest 6: Nomination Strategy (Prioritizes Coins/Bargains Early, Never Poison)');
{
  const G = createMockColtsState({}, 1);
  const poisonCard = ALL_PLAYERS.find(c => c.id === 'hunter_henry');
  const pureInstant = { id: 'inst_1', name: 'Instant Only', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 2, perRound: false }] };
  const cheapRecurring = { id: 'cheap_rec', name: 'Cheap Rec', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
  const recurringCoin = { id: 'rec_coin', name: 'Coin Engine', minBid: 2, maxBid: 7, effects: [{ type: 'coins', amount: 2, perRound: true }] };

  G.board.auctionPlayers = [poisonCard, pureInstant, cheapRecurring, recurringCoin];

  const nominatedIdx = chooseCpuNominationCard(G, '0');
  const nominatedCard = G.board.auctionPlayers[nominatedIdx];
  assert(nominatedCard.id !== poisonCard.id, `Colts never nominates poison card (${poisonCard.name})`);
  assert(nominatedCard.id === recurringCoin.id, `Colts prioritizes recurring coin engine in Round 1: nominated ${nominatedCard.name}`);
}

// -------------------------------------------------------------
// TEST 7: Marginal Coin Priority in Early Rounds
// -------------------------------------------------------------
console.log('\nTest 7: Marginal Coin Priority Early (Rounds 1-3)');
{
  const G1 = createMockColtsState({}, 1);
  const card1Coin = { id: 'c1', name: '1 Coin / Rd', minBid: 1, maxBid: 5, effects: [{ type: 'coins', amount: 1, perRound: true }] };
  const card1Deflate = { id: 'd1', name: '1 Deflate / Rd', minBid: 1, maxBid: 5, effects: [{ type: 'deflate', amount: 1, perRound: true }] };

  const score1CoinR1 = scoreCardForPlayer(G1, '0', card1Coin);
  const score1DeflateR1 = scoreCardForPlayer(G1, '0', card1Deflate);
  assert(score1CoinR1 > score1DeflateR1, `In Round 1, 1 coin/round (${score1CoinR1.toFixed(1)}) is marginally prioritized over 1 deflate/round (${score1DeflateR1.toFixed(1)})`);

  // In Round 6, deflate should be prioritized over coin
  const G6 = createMockColtsState({}, 6);
  const score1CoinR6 = scoreCardForPlayer(G6, '0', card1Coin);
  const score1DeflateR6 = scoreCardForPlayer(G6, '0', card1Deflate);
  assert(score1DeflateR6 > score1CoinR6, `In Round 6, deflate (${score1DeflateR6.toFixed(1)}) is prioritized over coin (${score1CoinR6.toFixed(1)})`);
}

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
