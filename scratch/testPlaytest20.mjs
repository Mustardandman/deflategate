import assert from 'assert';
import { 
  DeflategateGame, 
  isGenuinePlayerCard, 
  scoreCardForPlayer, 
  evaluateCpuAuctionBid, 
  getEffectiveTeamId,
  resolveAuctionWin
} from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('--- RUNNING PLAYTEST #20 COMPREHENSIVE TEST SUITE ---');

// 1. Test isGenuinePlayerCard
console.log('\n[Test 1] isGenuinePlayerCard Filtering');
const phase1Card = { id: 'p1_card', name: 'Standard P1', phase: 1, minBid: 2, maxBid: 8 };
const phase2Card = { id: 'p2_card', name: 'Power P2', phase: 2, minBid: 5, maxBid: 12 };
const hofCard = { id: 'hof_card', name: 'HOF Legend', isHof: true, phase: 'hof', minBid: 8, maxBid: 15 };
const psCard1 = { id: 'practice_squad', name: 'Practice Squad', isPracticeSquad: true };
const psCard2 = { id: 'ps_rb', uniqueId: 'ps_12345', name: 'Scrub RB' };

assert.strictEqual(isGenuinePlayerCard(phase1Card), true, 'Phase 1 card should be genuine');
assert.strictEqual(isGenuinePlayerCard(phase2Card), true, 'Phase 2 card should be genuine');
assert.strictEqual(isGenuinePlayerCard(hofCard), true, 'HOF card should be genuine');
assert.strictEqual(isGenuinePlayerCard(psCard1), false, 'Practice squad card should NOT be genuine');
assert.strictEqual(isGenuinePlayerCard(psCard2), false, 'PS prefixed uniqueId card should NOT be genuine');
console.log('✅ isGenuinePlayerCard successfully identifies genuine players and excludes practice squad.');

// 2. Test Isaiah Pacheco Valuation vs Ezekiel Elliott
console.log('\n[Test 2] Isaiah Pacheco Expected Value vs Ezekiel Elliott');
const mockPlayer = {
  team: TEAMS.find(t => t.id === 'packers'),
  coins: 10,
  psi: 35,
  lineup: []
};
const mockG = {
  board: { round: 2 },
  players: { '0': mockPlayer, '1': { team: TEAMS.find(t => t.id === 'bears'), coins: 10, psi: 35, lineup: [] } }
};

const pachecoCard = {
  id: 'isaiah_pacheco',
  name: 'Isaiah Pacheco',
  position: 'RB',
  phase: 1,
  minBid: 1,
  maxBid: 15,
  effects: []
};
const zekeCard = {
  id: 'ezekiel_elliott',
  name: 'Ezekiel Elliott',
  position: 'RB',
  phase: 1,
  minBid: 1,
  maxBid: 8,
  effects: [{ type: 'coins', amount: -2, perRound: true }, { type: 'deflate', amount: 2, perRound: true }]
};

const pachecoP1Score = scoreCardForPlayer(mockG, '0', pachecoCard);
const zekeScore = scoreCardForPlayer(mockG, '0', zekeCard);
console.log(`Pacheco P1 Score: ${pachecoP1Score}, Zeke Score: ${zekeScore}`);
assert(pachecoP1Score >= 18.0, 'Pacheco P1 expected value should be at least 18.0');
assert(pachecoP1Score > zekeScore, 'CPUs should evaluate Pacheco significantly higher than Zeke due to coin bleed');

// Check Pacheco scaling in Phase 2 (R5) and HOF (R8)
mockG.board.round = 5;
const pachecoP2Score = scoreCardForPlayer(mockG, '0', pachecoCard);
assert(pachecoP2Score >= 28.0, 'Pacheco Phase 2 score should be at least 28.0');

mockG.board.round = 8;
const pachecoHofScore = scoreCardForPlayer(mockG, '0', pachecoCard);
assert(pachecoHofScore >= 40.0, 'Pacheco HOF score should be at least 40.0');
console.log('✅ Isaiah Pacheco EV correctly matches era decks (18 / 28 / 40) and beats negative coin bleed cards.');

// 3. Test Early-Game Bankroll Management in Rounds 1-3
console.log('\n[Test 3] Early-Game CPU Bankroll Management');
const standardP1Card = {
  id: 'standard_wr',
  name: 'Reliable WR',
  position: 'WR',
  phase: 1,
  minBid: 1,
  maxBid: 10,
  effects: [{ type: 'coins', amount: 1, perRound: true }, { type: 'deflate', amount: 1, perRound: true }]
};
const earlyG = {
  board: {
    round: 1,
    activeAuctionCardIndex: 0,
    highestBid: 2,
    highestBidder: '1',
    passedAuctionPlayers: [],
    auctionPlayers: [standardP1Card]
  },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'patriots'),
      coins: 12,
      psi: 50,
      lineup: [],
      isCpu: true,
      hasWonAuction: false
    },
    '1': {
      team: TEAMS.find(t => t.id === 'jets'),
      coins: 10,
      psi: 45,
      lineup: [],
      isCpu: true,
      hasWonAuction: false
    }
  }
};

const bidEval = evaluateCpuAuctionBid(earlyG, '0');
console.log(`CPU Coins: 12, Should Bid: ${bidEval.shouldBid}, Bid Amount: ${bidEval.bidAmount}`);
// In R1 with 12 coins, earlyReserve = max(3, round(12 * 0.35)) = 4 coins reserved.
// Standard P1 bid is capped at ~65% of coins (12 * 0.65 = 8).
// The CPU should never bid all 12 coins on an ordinary Phase 1 card!
if (bidEval.shouldBid) {
  assert(bidEval.bidAmount <= 8, `CPU should cap ordinary Phase 1 bid to <= 8 coins (was ${bidEval.bidAmount})`);
  assert(earlyG.players['0'].coins - bidEval.bidAmount >= 3, 'CPU should maintain at least 3 coins in reserve');
}
console.log('✅ Early-game CPU bankroll management maintains healthy coin reserves in Rounds 1-3.');

// 4. Test Endgame Deflation Escalation (1-2 Turns Left)
console.log('\n[Test 4] Endgame Deflation Valuation Escalation (User Directive)');
const lateG = {
  board: { round: 9 }, // 1-2 turns left
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'packers'),
      coins: 15,
      psi: 20,
      lineup: []
    }
  }
};
const pureDeflateCard = {
  id: 'pure_deflate',
  name: 'Elite Closer',
  phase: 2,
  minBid: 3,
  maxBid: 14,
  effects: [{ type: 'deflate', amount: 4, perRound: true }]
};
const pureCoinsCard = {
  id: 'pure_coins',
  name: 'Coin Vault',
  phase: 2,
  minBid: 3,
  maxBid: 14,
  effects: [{ type: 'coins', amount: 4, perRound: true }]
};

const deflateScore = scoreCardForPlayer(lateG, '0', pureDeflateCard);
const coinsScore = scoreCardForPlayer(lateG, '0', pureCoinsCard);
console.log(`Late Game (R9) Deflate Score: ${deflateScore.toFixed(1)}, Coins Score: ${coinsScore.toFixed(1)}`);
assert(deflateScore > coinsScore * 2.5, `Deflation should be valued massively higher than coins in endgame (deflate: ${deflateScore}, coins: ${coinsScore})`);
console.log('✅ In the final 1-2 rounds, deflation is valued heavily over coins.');

// 5. Test 4-Deflate Superstars Bypass Savings Reserve
console.log('\n[Test 5] 4-Deflate Superstars Bypass Savings Reserve');
const superstarG = {
  board: {
    round: 5,
    activeAuctionCardIndex: 0,
    highestBid: 5,
    highestBidder: '1',
    passedAuctionPlayers: [],
    auctionPlayers: [pureDeflateCard]
  },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'broncos'),
      coins: 10,
      psi: 35,
      lineup: [],
      isCpu: true,
      hasWonAuction: false
    },
    '1': {
      team: TEAMS.find(t => t.id === 'raiders'),
      coins: 10,
      psi: 35,
      lineup: [],
      isCpu: true,
      hasWonAuction: false
    }
  }
};

const superstarBid = evaluateCpuAuctionBid(superstarG, '0');
console.log(`Superstar Bid on 4-Deflate Card: shouldBid=${superstarBid.shouldBid}, bidAmount=${superstarBid.bidAmount}`);
assert.strictEqual(superstarBid.shouldBid, true, 'CPU should bid aggressively on 4-deflate superstar');
console.log('✅ 4-Deflate cards bypass savings reserve and trigger aggressive bidding in Round 5+.');

// 6. Test Lions First-Claim Announcement and Coin Bonus
console.log('\n[Test 6] Lions Ability First Claim of Round');
const lionsG = {
  board: {
    round: 3,
    highestBid: 4,
    firstClaimThisRound: null,
    logs: []
  },
  players: {
    '0': {
      team: TEAMS.find(t => t.id === 'lions'),
      coins: 5,
      psi: 45,
      lineup: []
    },
    '1': {
      team: TEAMS.find(t => t.id === 'bears'),
      coins: 8,
      psi: 45,
      lineup: []
    },
    '2': {
      team: TEAMS.find(t => t.id === 'vikings'),
      coins: 7,
      psi: 45,
      lineup: []
    }
  },
  decks: { discard: [] }
};

resolveAuctionWin(lionsG, '0', standardP1Card, 4, false);
console.log(`Lions Coins after 1st claim: ${lionsG.players['0'].coins} (started at 5 - 4 + 3 = 4)`);
assert.strictEqual(lionsG.players['0'].coins, 4, 'Lions should pay 4 coins and gain +3 coins (3 players)');
assert(lionsG.board.abilityNotification, 'Ability notification should be triggered');
assert.strictEqual(lionsG.board.abilityNotification.teamId, 'lions', 'Notification teamId should be lions');
assert(lionsG.board.abilityNotification.message.includes('Lions'), 'Notification message should mention Lions');
console.log('✅ Lions first claim correctly grants coins equal to player count and sets prominent notification.');

// 7. Test Bills Discard Thresholds & Filtering
console.log('\n[Test 7] Bills Discard Patience Thresholds');
const billsPlayer = {
  team: TEAMS.find(t => t.id === 'bills'),
  coins: 10,
  psi: 40,
  lineup: [],
  isCpu: true,
  hasUsedBillsAbility: false
};
const billsG = {
  board: { round: 1 },
  players: { '0': billsPlayer }
};

// In R1: ordinary Phase 1 card (e.g. cut early or instant value) has score < 26 threshold
const ordinaryCutCard = {
  id: 'adam_thielen',
  name: 'Adam Thielen',
  phase: 1,
  minBid: 1,
  maxBid: 5,
  effects: [{ type: 'coins', amount: 2, perRound: true }]
};
const ordinaryScore = scoreCardForPlayer(billsG, '0', ordinaryCutCard);
console.log(`R1 Ordinary P1 Card Score for Bills: ${ordinaryScore}`);
assert(ordinaryScore < 26, `Ordinary P1 card should score below 26 threshold in R1 (was ${ordinaryScore})`);

// An extraordinary card with 4-deflate has score >= 26
const eliteScore = scoreCardForPlayer(billsG, '0', pureDeflateCard);
console.log(`R1 Elite 4-Deflate Card Score for Bills: ${eliteScore}`);
assert(eliteScore >= 26, 'Elite 4-Deflate card should exceed 26 threshold in R1');

// In R4-6, threshold is 20:
billsG.board.round = 5;
const midP2Card = {
  id: 'mid_p2',
  name: 'Solid P2 Deflater',
  phase: 2,
  minBid: 2,
  maxBid: 10,
  effects: [{ type: 'deflate', amount: 3, perRound: true }]
};
const p2Score = scoreCardForPlayer(billsG, '0', midP2Card);
console.log(`R5 P2 Card Score for Bills: ${p2Score}`);
assert(p2Score >= 20, 'Solid P2 card should meet R4-6 threshold of 20');
console.log('✅ Bills discard patience logic preserves ability in R1-3 and claims top talent in R4+.');

console.log('\n======================================================');
console.log('🎉 ALL PLAYTEST #20 AUTOMATED TESTS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
