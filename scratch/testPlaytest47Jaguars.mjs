import {
  evaluateJaguarsEventForesight,
  shouldJaguarsRearrangeNow,
  buildJaguarsMasterDeckOrder,
  scoreCardForPlayer,
  chooseCpuNominationCard,
  evaluateCpuAuctionBid
} from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== TEST SUITE: PLAYTEST 47 - JACKSONVILLE JAGUARS FORESIGHT & DECK REARRANGEMENT ===\n');

function createMockGame(round = 1) {
  const jaguarsTeam = TEAMS.find(t => t.id === 'jaguars');
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  const chiefsTeam = TEAMS.find(t => t.id === 'chiefs');

  const G = {
    board: {
      round,
      firstPlayer: '0',
      nominator: '0',
      auctionPlayers: [],
      passedAuctionPlayers: [],
      jaguarsAbilityUsed: false,
      activeAuctionCardIndex: null,
      highestBid: 0,
      highestBidder: null
    },
    players: {
      '0': {
        id: '0',
        team: jaguarsTeam,
        psi: jaguarsTeam.initialPsi, // 43
        coins: jaguarsTeam.coins, // 12
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.jaguars,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0_2' }
        ],
        cardsWonThisRound: 0
      },
      '1': {
        id: '1',
        team: billsTeam,
        psi: 40,
        coins: 10,
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.bills,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_2' }
        ],
        cardsWonThisRound: 0
      },
      '2': {
        id: '2',
        team: chiefsTeam,
        psi: 40,
        coins: 10,
        isCpu: true,
        genome: ACTIVE_TEAM_GENOMES.chiefs,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2_2' }
        ],
        cardsWonThisRound: 0
      }
    },
    decks: {
      event: [
        { id: 'fourth_down_gamble', name: '4th Down Gamble', category: 'fourth_down_gamble' },
        { id: 'neutral_turf', name: 'Neutral Turf', category: 'neutral_turf' },
        { id: 'double_all', name: 'Offensive Battle', category: 'double_all' },
        { id: 'instant_deflate', name: 'Cold Air', category: 'instant_deflate' },
        { id: 'double_draft', name: 'Rookie Class', category: 'double_draft' },
        { id: 'double_phase1', name: 'Raw Talent', category: 'double_phase1' },
        { id: 'legend_returns', name: 'Team Legend Returns', category: 'legend_returns' },
        { id: 'instant_inflate', name: 'Hot Air', category: 'instant_inflate' }
      ]
    }
  };

  return G;
}

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
  }
}

// -------------------------------------------------------------
// TEST 1: Immediate Win Trigger with Cold Air
// -------------------------------------------------------------
console.log('Test 1: Immediate Win Trigger with Cold Air');
{
  const G = createMockGame(4);
  G.players['0'].psi = 9; // Lineup deflate 2 + Cold air 7 = 9 -> hits 0!
  G.players['0'].lineup.push({
    id: 'derrick_henry',
    effects: [{ type: 'deflate', amount: 2, perRound: true }]
  });

  const shouldRearrange = shouldJaguarsRearrangeNow(G, '0');
  assert(shouldRearrange === true, 'Jaguars triggers deck rearrangement immediately when Cold Air secures a win');

  const newOrder = buildJaguarsMasterDeckOrder(G, '0');
  assert(newOrder[0].category === 'instant_deflate', 'Cold Air is placed in Slot 1 (top of event deck) for instant victory');
}

// -------------------------------------------------------------
// TEST 2: Red Threat Defense with Hot Air
// -------------------------------------------------------------
console.log('\nTest 2: Red Threat Defense with Hot Air');
{
  const G = createMockGame(5);
  G.players['0'].psi = 22;
  G.players['1'].psi = 5; // Opponent is about to win!

  const shouldRearrange = shouldJaguarsRearrangeNow(G, '0');
  assert(shouldRearrange === true, 'Jaguars triggers deck rearrangement to defend against opponent red threat');

  const newOrder = buildJaguarsMasterDeckOrder(G, '0');
  assert(newOrder[0].category === 'instant_inflate', 'Hot Air (+7 PSI to all) is placed in Slot 1 to halt opponent win');
}

// -------------------------------------------------------------
// TEST 3: Cold Air "Effective PSI" (Acting like 7 less PSI)
// -------------------------------------------------------------
console.log('\nTest 3: Cold Air "Effective PSI" (Acting like 7 less PSI)');
{
  const G = createMockGame(4);
  // Put Cold Air on top of event deck (index 0)
  G.decks.event = [
    { id: 'instant_deflate', name: 'Cold Air', category: 'instant_deflate' },
    { id: 'offensive_battle', name: 'Offensive Battle', category: 'double_all' }
  ];
  G.players['0'].psi = 14; // Actual PSI 14. With Cold Air coming, effective PSI is 7!
  G.players['0'].coins = 12;

  const nukeCard = {
    id: 'closer_nuke',
    name: 'Closer Nuke',
    minBid: 4,
    maxBid: 10,
    phase: 2,
    effects: [{ type: 'deflate', amount: 7, perRound: false }]
  };
  G.board.auctionPlayers = [nukeCard];
  G.board.activeAuctionCardIndex = 0;

  const bid = evaluateCpuAuctionBid(G, '0');
  assert(bid.shouldBid === true, 'Jaguars bids on closer nuke when Cold Air is upcoming');
  assert(bid.isChampionshipBid === true, 'Jaguars treats this as a championship buyout because 14 - 7 - 7 <= 0');
}

// -------------------------------------------------------------
// TEST 4: Clock Management (Hot Air vs Cold Air)
// -------------------------------------------------------------
console.log('\nTest 4: Clock Management (Hot Air vs Cold Air)');
{
  // Scenario A: Behind with recurring engines -> wants more time to cook -> Hot Air first!
  const G_cook = createMockGame(3);
  G_cook.players['0'].psi = 34; // Behind on PSI
  G_cook.players['1'].psi = 22;
  G_cook.players['0'].lineup = [
    { id: 'engine1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { id: 'engine2', effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  const orderCook = buildJaguarsMasterDeckOrder(G_cook, '0');
  assert(orderCook[0].category === 'instant_inflate', 'Behind with 2+ engines: Hot Air is placed in Slot 1 to extend clock');

  // Scenario B: In the lead with instant deflation -> wants shorter game -> Cold Air first!
  const G_lead = createMockGame(4);
  G_lead.players['0'].psi = 18; // Leading table
  G_lead.players['1'].psi = 28;
  G_lead.players['0'].lineup = [
    { id: 'instant1', effects: [{ type: 'deflate', amount: 4, perRound: false }] },
    { id: 'instant2', effects: [{ type: 'deflate', amount: 3, perRound: false }] }
  ];

  const orderLead = buildJaguarsMasterDeckOrder(G_lead, '0');
  assert(orderLead[0].category === 'instant_deflate', 'Leading with instant cards: Cold Air is placed in Slot 1 to shorten clock');
}

// -------------------------------------------------------------
// TEST 5: Multi-Turn Synergy Combo (Rookie Class -> Offensive Battle)
// -------------------------------------------------------------
console.log('\nTest 5: Multi-Turn Synergy Combo (Rookie Class -> Offensive Battle)');
{
  const G = createMockGame(2);
  G.players['0'].coins = 14; // Richest on the table
  G.players['1'].coins = 6;
  G.players['2'].coins = 4;

  const order = buildJaguarsMasterDeckOrder(G, '0');
  assert(order[0].category === 'double_draft', 'Slot 1 is Rookie Class when Jaguars holds large coin lead');
  assert(order[1].category === 'double_all', 'Slot 2 is Offensive Battle immediately following Rookie Class to double new picks');
}

// -------------------------------------------------------------
// TEST 6: Legend Returns Scheduling & Cash Preservation
// -------------------------------------------------------------
console.log('\nTest 6: Legend Returns Scheduling & Cash Preservation');
{
  const G = createMockGame(4);
  G.decks.event = [
    { id: 'legend_returns', name: 'Team Legend Returns', category: 'legend_returns' },
    { id: 'fourth_down_gamble', name: '4th Down Gamble', category: 'fourth_down_gamble' }
  ];
  G.players['0'].coins = 12;

  const ordinaryCard = {
    id: 'ordinary_guy',
    name: 'Ordinary Guy',
    minBid: 2,
    maxBid: 6,
    phase: 1,
    effects: [{ type: 'coins', amount: 1, perRound: false }]
  };
  G.board.auctionPlayers = [ordinaryCard];
  G.board.activeAuctionCardIndex = 0;

  const bid = evaluateCpuAuctionBid(G, '0');
  // With Legend Returns upcoming next round, Jaguars preserves cash (reserves >= 6 coins)
  assert(bid.bidAmount <= 4, `Jaguars caps bid at 4 coins (${bid.bidAmount}) to preserve cash for Round 5 HOF auction`);
}

// -------------------------------------------------------------
// TEST 7: Round 1 Anchor Star Conviction
// -------------------------------------------------------------
console.log('\nTest 7: Round 1 Anchor Star Conviction');
{
  const G = createMockGame(1);
  const bowers = PHASE_1_PLAYERS.find(c => c.id === 'brock_bowers') || {
    id: 'brock_bowers',
    name: 'Brock Bowers',
    minBid: 4,
    maxBid: 16,
    phase: 1,
    effects: [{ type: 'coins', amount: 3, perRound: true }]
  };
  G.board.auctionPlayers = [bowers];
  G.board.activeAuctionCardIndex = 0;

  const score = scoreCardForPlayer(G, '0', bowers);
  assert(score >= 24.0, `Brock Bowers scored very high in Round 1: ${score} (>= 24.0)`);

  const bidInitial = evaluateCpuAuctionBid(G, '0');
  assert(bidInitial.shouldBid === true, 'Jaguars bids on Brock Bowers');
  assert(bidInitial.bidAmount >= 1, `Jaguars opens auction on Round 1 anchor: bidAmount = ${bidInitial.bidAmount}`);

  // Test contested bidding against a rival who bid 6:
  G.board.highestBid = 6;
  G.board.highestBidder = '1';
  const bidContested = evaluateCpuAuctionBid(G, '0');
  assert(bidContested.shouldBid === true, 'Jaguars raises when rival bids 6 on Brock Bowers');
  assert(bidContested.bidAmount === 7, `Jaguars outbids rival at 7 coins (valuation up to 9): bidAmount = ${bidContested.bidAmount}`);

  // Test when rival bids 10 (above Jaguars R1 valuation cap of 9):
  G.board.highestBid = 10;
  G.board.highestBidder = '1';
  const bidOverpriced = evaluateCpuAuctionBid(G, '0');
  assert(bidOverpriced.shouldBid === false, 'Jaguars prudently folds when bid exceeds valuation cap of 9');
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n======================================================`);
console.log(`JAGUARS FORESIGHT TESTS COMPLETE: ${passed}/${total} PASSED`);
console.log(`======================================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
