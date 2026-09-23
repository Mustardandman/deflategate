import assert from 'assert';
import { 
  DeflategateGame, 
  scoreCardForPlayer, 
  evaluateCpuAuctionBid, 
  resolveAuctionWin,
  getEffectiveCardMaxBid
} from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('--- RUNNING PLAYTEST #20 TUNING & UI ENHANCEMENTS TEST SUITE ---');

// 1. Board Parity Valuation Test (TJ Hockenson scenario)
console.log('\n[Test 1] Board Parity Valuation Cap (TJ Hockenson scenario)');
const hockenson = {
  id: 'tj_hockenson',
  name: 'T.J. Hockenson',
  position: 'TE',
  phase: 1,
  minBid: 1,
  maxBid: 10,
  effects: [{ type: 'deflate', amount: 2, perRound: true }]
};
const kirk = {
  id: 'christian_kirk',
  name: 'Christian Kirk',
  position: 'WR',
  phase: 1,
  minBid: 1,
  maxBid: 10,
  effects: [{ type: 'deflate', amount: 2, perRound: true }]
};
const goedert = {
  id: 'dallas_goedert',
  name: 'Dallas Goedert',
  position: 'TE',
  phase: 1,
  minBid: 1,
  maxBid: 10,
  effects: [{ type: 'deflate', amount: 2, perRound: true }]
};
const pitts = {
  id: 'kyle_pitts',
  name: 'Kyle Pitts',
  position: 'TE',
  phase: 1,
  minBid: 1,
  maxBid: 10,
  effects: [{ type: 'deflate', amount: 2, perRound: true }]
};

const parityBoardG = {
  board: {
    round: 2,
    activeAuctionCardIndex: 0,
    highestBid: 1,
    highestBidder: '1',
    passedAuctionPlayers: [],
    auctionPlayers: [hockenson, kirk, goedert, pitts]
  },
  players: {
    '0': { team: TEAMS.find(t => t.id === 'patriots'), coins: 14, psi: 30, lineup: [], isCpu: true, archetype: 'rusher' },
    '1': { team: TEAMS.find(t => t.id === 'steelers'), coins: 12, psi: 32, lineup: [], isCpu: true, archetype: 'tycoon' },
    '2': { team: TEAMS.find(t => t.id === 'packers'), coins: 10, psi: 35, lineup: [], isCpu: true, archetype: 'balanced' },
    '3': { team: TEAMS.find(t => t.id === 'chiefs'), coins: 11, psi: 34, lineup: [], isCpu: false }
  }
};

// Opening bid on 1
const hockensonOpeningDecision = evaluateCpuAuctionBid(parityBoardG, '0', hockenson);
console.log('Hockenson Opening Decision:', hockensonOpeningDecision);
assert(hockensonOpeningDecision.shouldBid, 'CPU should be willing to place opening/early bid');
assert(hockensonOpeningDecision.bidAmount <= 3, `Opening bid must be <= 3 coins (was ${hockensonOpeningDecision.bidAmount})`);

// When bid reaches 3, next bid would be 4 -> CPU should NOT value it above 3
parityBoardG.board.highestBid = 3;
const hockensonHighBidDecision = evaluateCpuAuctionBid(parityBoardG, '0', hockenson);
console.log('Hockenson at Bid 3 Decision (Next bid 4):', hockensonHighBidDecision);
// If shouldBid is true, it could only be a price bump, but normal valuation must not exceed 3
if (hockensonHighBidDecision.shouldBid) {
  assert(hockensonHighBidDecision.isPriceBump, 'Any bid above 3 must strictly be a price bump, not a value bid');
}
console.log('✅ Board Parity principle correctly caps valuation to <= 3 coins when all remaining cards are similarly strong.');

// 2. Opportunity Cost & Tier Ranking Test (Jalen Coker scenario)
console.log('\n[Test 2] Opportunity Cost Cap (Jalen Coker vs Drake London / AJ Brown)');
const coker = {
  id: 'jalen_coker',
  name: 'Jalen Coker',
  position: 'WR',
  phase: 1,
  minBid: 1,
  maxBid: 8,
  effects: [{ type: 'coins', amount: 2, perRound: true }]
};
const drakeLondon = {
  id: 'drake_london',
  name: 'Drake London',
  position: 'WR',
  phase: 1,
  minBid: 1,
  maxBid: 14,
  effects: [{ type: 'coins', amount: 4, perRound: true }]
};
const ajBrown = {
  id: 'aj_brown',
  name: 'A.J. Brown',
  position: 'WR',
  phase: 1,
  minBid: 1,
  maxBid: 12,
  effects: [{ type: 'deflate', amount: 3, perRound: true }]
};

const cokerBoardG = {
  board: {
    round: 2,
    activeAuctionCardIndex: 0,
    highestBid: 1,
    highestBidder: '1',
    passedAuctionPlayers: [],
    auctionPlayers: [coker, drakeLondon, ajBrown]
  },
  players: {
    '0': { team: TEAMS.find(t => t.id === 'packers'), coins: 16, psi: 32, lineup: [], isCpu: true, archetype: 'rusher' },
    '1': { team: TEAMS.find(t => t.id === 'bears'), coins: 12, psi: 35, lineup: [], isCpu: true },
    '2': { team: TEAMS.find(t => t.id === 'vikings'), coins: 10, psi: 35, lineup: [], isCpu: true },
    '3': { team: TEAMS.find(t => t.id === 'patriots'), coins: 12, psi: 35, lineup: [], isCpu: false }
  }
};

const cokerDecision = evaluateCpuAuctionBid(cokerBoardG, '0', coker);
console.log('Coker Early Bid Decision:', cokerDecision);
if (cokerDecision.shouldBid) {
  assert(cokerDecision.bidAmount <= 4, `Mid-tier Phase 1 player (Coker) must be capped <= 4 coins (was ${cokerDecision.bidAmount})`);
}

// When bid reaches 4, next bid would be 5 -> CPU should NOT value Coker at 5 when London/Brown are available
cokerBoardG.board.highestBid = 4;
const cokerAt4Decision = evaluateCpuAuctionBid(cokerBoardG, '0', coker);
console.log('Coker at Bid 4 Decision (Next bid 5):', cokerAt4Decision);
if (cokerAt4Decision.shouldBid) {
  assert(cokerAt4Decision.isPriceBump, 'Any bid above 4 on Coker must strictly be a price bump, not a value bid');
}
console.log('✅ Opportunity cost ranking correctly restrains bidding on mid-tier cards to <= 4 coins.');

// 3. Jets Ability Notification Trigger
console.log('\n[Test 3] Jets Max Bid Ability Notification Banner');
const jetsG = {
  board: { round: 2, logs: [], highestBid: 8, firstClaimThisRound: null },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'jets'),
      coins: 20,
      psi: 30,
      lineup: []
    }
  },
  decks: { discard: [] }
};
const sampleCard = { id: 'sample', name: 'Sample Star', phase: 1, minBid: 2, maxBid: 8, effects: [] };
resolveAuctionWin(jetsG, '0', sampleCard);
console.log(`Jets PSI: ${jetsG.players['0'].psi}, Ability Notification:`, jetsG.board.abilityNotification);
assert.strictEqual(jetsG.players['0'].psi, 26, 'Jets should deflate 4 PSI on max bid acquisition');
assert(jetsG.board.abilityNotification, 'Ability notification should exist');
assert.strictEqual(jetsG.board.abilityNotification.teamId, 'jets', 'teamId should be jets');
console.log('✅ Jets franchise ability successfully populates abilityNotification for banner display.');

// 4. Raiders Ability Notification Trigger
console.log('\n[Test 4] Raiders Ability Notification Banner');
const raidersG = {
  board: { 
    round: 2, 
    logs: [],
    pendingRaiders: { playerID: '0' },
    pendingRaidersQueue: []
  },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'raiders'),
      coins: 10,
      psi: 25,
      lineup: []
    },
    '1': {
      team: TEAMS.find(t => t.id === 'chiefs'),
      coins: 10,
      psi: 20,
      lineup: []
    }
  },
  decks: { discard: [] }
};
DeflategateGame.phases.preAuctionPhase.moves.raidersGivePsi({ G: raidersG, playerID: '0', events: { endTurn: () => {} } }, '1');
console.log(`Raiders PSI: ${raidersG.players['0'].psi}, Chiefs PSI: ${raidersG.players['1'].psi}`);
console.log('Raiders Notification:', raidersG.board.abilityNotification);
assert.strictEqual(raidersG.players['0'].psi, 24, 'Raiders should lose 1 PSI');
assert.strictEqual(raidersG.players['1'].psi, 21, 'Chiefs (leader) should gain 1 PSI');
assert(raidersG.board.abilityNotification, 'Ability notification should exist');
assert.strictEqual(raidersG.board.abilityNotification.teamId, 'raiders', 'teamId should be raiders');
console.log('✅ Raiders franchise ability successfully populates abilityNotification for banner display.');

// 5. Broncos First Round Ignored Status
console.log('\n[Test 5] Broncos Ignored Card First Round Lifecycle');
const broncosG = {
  board: { round: 2, logs: [], highestBid: 3, firstClaimThisRound: null },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'broncos'),
      coins: 10,
      psi: 30,
      lineup: []
    }
  },
  decks: { discard: [] }
};
const broncosCard = { id: 'broncos_wr', name: 'Broncos Target', phase: 1, minBid: 1, maxBid: 8, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
resolveAuctionWin(broncosG, '0', broncosCard, 3, false);
const acquiredCard = broncosG.players['0'].lineup.find(c => c.id === 'broncos_wr');
assert(acquiredCard, 'Card should be in lineup');
assert.strictEqual(acquiredCard.broncosRoundAcquired, 2, 'broncosRoundAcquired should equal acquisition round (2)');
console.log('Card broncosRoundAcquired property:', acquiredCard.broncosRoundAcquired);
console.log('✅ Broncos card correctly receives broncosRoundAcquired tag for red outline rendering until refresh summary.');

console.log('\n======================================================');
console.log('🎉 ALL PLAYTEST #20 TUNING TESTS PASSED!');
console.log('======================================================\n');
