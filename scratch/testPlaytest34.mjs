import { createDeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('--- Testing Playtest 34 AI Intelligence Enhancements ---');

// Test 1: #1 Marginal Lineup Upgrade Value
console.log('\n[Test 1] Marginal Lineup Upgrade Value (Roster Replacement Delta)');
{
  const G = {
    players: {
      '0': {
        team: TEAMS.find(t => t.id === 'patriots'),
        coins: 10,
        psi: 30,
        lineup: [
          { id: 'elite_1', name: 'Elite 1', phase: 2, effects: [{ type: 'deflate', amount: 3, perRound: true }] },
          { id: 'elite_2', name: 'Elite 2', phase: 2, effects: [{ type: 'deflate', amount: 3, perRound: true }] },
          { id: 'elite_3', name: 'Elite 3', phase: 2, effects: [{ type: 'deflate', amount: 3, perRound: true }] }
        ],
        extraLineupSlots: 0,
        isCpu: true,
        hasWonAuction: false
      },
      '1': { team: TEAMS.find(t => t.id === 'jets'), coins: 5, psi: 35, lineup: [], isCpu: true, hasWonAuction: false }
    },
    board: {
      round: 4,
      auctionPlayers: [
        { id: 'mediocre_card', name: 'Mediocre Player', minBid: 2, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] }
      ],
      activeAuctionCardIndex: 0,
      highestBid: 2,
      highestBidder: '1',
      passedAuctionPlayers: []
    }
  };

  const decision = evaluateCpuAuctionBid(G, '0');
  console.log('Full roster evaluating downgrade/lateral card decision:', decision);
  if (!decision.shouldBid) {
    console.log('✅ PASS: CPU rejected bidding on a card that is a downgrade over existing active lineup!');
  } else {
    console.error('❌ FAIL: CPU bid on a downgrade card despite full roster!');
  }

  // Subtest 1B: Board Strength Preservation (User scenario)
  // Roster: all 2 coins/round. Auction has Card A (2 coins/round) and Card B (1 coin/round).
  // Bidding on Card A at cheap cost avoids the -1 coin/round downgrade from Card B!
  const cardA = { id: 'card_a_2c', name: '2 Coins Player', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] };
  const cardB = { id: 'card_b_1c', name: '1 Coin Player', minBid: 1, maxBid: 4, phase: 1, effects: [{ type: 'coins', amount: 1, perRound: true }] };
  const G_preserve = {
    players: {
      '0': {
        team: TEAMS.find(t => t.id === 'patriots'),
        coins: 10,
        psi: 30,
        lineup: [
          { id: 'roster_1', name: 'Roster 1', phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
          { id: 'roster_2', name: 'Roster 2', phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
          { id: 'roster_3', name: 'Roster 3', phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] }
        ],
        extraLineupSlots: 0,
        isCpu: true,
        hasWonAuction: false
      },
      '1': { team: TEAMS.find(t => t.id === 'jets'), coins: 5, psi: 35, lineup: [], isCpu: true, hasWonAuction: false }
    },
    board: {
      round: 3,
      auctionPlayers: [cardA, cardB],
      activeAuctionCardIndex: 0,
      highestBid: 1,
      highestBidder: '1',
      passedAuctionPlayers: []
    }
  };

  console.log('Score cardA:', scoreCardForPlayer(G_preserve, '0', cardA));
  console.log('Score cardB:', scoreCardForPlayer(G_preserve, '0', cardB));
  const decisionPreserve = evaluateCpuAuctionBid(G_preserve, '0');
  console.log('Board strength preservation decision (2c vs 1c available):', decisionPreserve);
  if (decisionPreserve.shouldBid) {
    console.log('✅ PASS: CPU recognized board strength and bid on 2-coin player to avoid taking 1-coin downgrade!');
  } else {
    console.error('❌ FAIL: CPU passed on lateral card despite worse alternative remaining on board!');
  }
}

// Test 2: #2 Leader Denial & 2-Round Table Threat
console.log('\n[Test 2] Leader Denial & 2-Round Table Threat (Red & Yellow Threats)');
{
  // Red Threat: Opponent is 1 round / final turn away from winning (psi = 3, recurring deflate = 3)
  const G_red = {
    players: {
      '0': { team: TEAMS.find(t => t.id === 'dolphins'), coins: 8, psi: 25, lineup: [], isCpu: true, hasWonAuction: false },
      '1': {
        team: TEAMS.find(t => t.id === 'bills'),
        coins: 4,
        psi: 3, // 1 turn away from 0!
        lineup: [{ id: 'star', name: 'Star', phase: 2, effects: [{ type: 'deflate', amount: 3, perRound: true }] }],
        isCpu: true,
        hasWonAuction: false
      }
    },
    board: {
      round: 6,
      auctionPlayers: [
        { id: 'deflate_card', name: 'Deflate Card', minBid: 2, maxBid: 8, phase: 2, effects: [{ type: 'deflate', amount: 2, perRound: true }] }
      ],
      activeAuctionCardIndex: 0,
      highestBid: 2,
      highestBidder: '1', // Red Threat Leader is currently winning the auction!
      passedAuctionPlayers: []
    }
  };

  const decisionRed = evaluateCpuAuctionBid(G_red, '0');
  console.log('Red Threat auction decision:', decisionRed);
  if (decisionRed.shouldBid && decisionRed.isHateBid) {
    console.log('✅ PASS: CPU recognized Red Threat leader on final turn and executed Hate Bid blocking!');
  } else {
    console.error('❌ FAIL: CPU failed to hate-bid block the Red Threat leader!');
  }
}

// Test 3: #3 Jump Bidding & Opponent Purse Knockouts (Bully Bids)
console.log('\n[Test 3] Jump Bidding & Opponent Purse Knockouts (Bully Bids)');
{
  // User example: Contender has 4 coins. CPU values card highly (valuation >= 4) and has 8 coins.
  // CPU should jump directly to 4 coins because at 4, the rival cannot outbid (rival needs 5)!
  const G_jump = {
    players: {
      '0': { team: TEAMS.find(t => t.id === 'cowboys'), coins: 10, psi: 30, lineup: [], isCpu: true, hasWonAuction: false },
      '1': { team: TEAMS.find(t => t.id === 'giants'), coins: 4, psi: 30, lineup: [], isCpu: true, hasWonAuction: false }
    },
    board: {
      round: 4,
      auctionPlayers: [
        { id: 'strong_card', name: 'Strong Player', minBid: 1, maxBid: 10, phase: 2, effects: [{ type: 'deflate', amount: 3, perRound: true }] }
      ],
      activeAuctionCardIndex: 0,
      highestBid: 1,
      highestBidder: '1',
      passedAuctionPlayers: []
    }
  };

  const decisionJump = evaluateCpuAuctionBid(G_jump, '0');
  console.log('Jump bidding decision:', decisionJump);
  if (decisionJump.shouldBid && decisionJump.bidAmount === 4 && decisionJump.isJumpBid) {
    console.log('✅ PASS: CPU jumped directly to 4 coins, perfectly locking out 4-coin rival without needing 5 coins!');
  } else {
    console.log(`Note: Bid amount was ${decisionJump.bidAmount}, isJumpBid: ${decisionJump.isJumpBid}`);
  }
}

// Test 4: Universal Superstar Patrick Mahomes & Travis Kelce
console.log('\n[Test 4] Universal Superstar Patrick Mahomes & Travis Kelce Priority');
{
  const mahomes = { id: 'patrick_mahomes', name: 'Patrick Mahomes', minBid: 3, maxBid: 18, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const kelce = { id: 'travis_kelce', name: 'Travis Kelce', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };

  const G = {
    players: {
      '0': { team: TEAMS.find(t => t.id === 'bears'), coins: 12, psi: 40, lineup: [], isCpu: true, hasWonAuction: false },
      '1': { team: TEAMS.find(t => t.id === 'packers'), coins: 12, psi: 40, lineup: [], isCpu: true, hasWonAuction: false }
    },
    board: {
      round: 1,
      auctionPlayers: [mahomes, kelce],
      activeAuctionCardIndex: 0,
      highestBid: 3,
      highestBidder: '1',
      passedAuctionPlayers: []
    }
  };

  const mahomesNom = chooseCpuNominationCard(G, '0');
  console.log('Nomination choice with Mahomes and Kelce on board:', mahomesNom === 0 ? 'Patrick Mahomes' : 'Other');
  if (mahomesNom === 0) {
    console.log('✅ PASS: Patrick Mahomes universally prioritized in nomination!');
  }

  const mahomesBid = evaluateCpuAuctionBid(G, '0');
  console.log('Mahomes bid decision:', mahomesBid);
  if (mahomesBid.shouldBid && mahomesBid.bidAmount >= 3) {
    console.log('✅ PASS: Universal superstar Mahomes aggressively pursued!');
  }
}

// Test 5: #4 Rams early bankroll hoarding
console.log('\n[Test 5] Rams Early Bankroll Hoarding (Rounds 1-3)');
{
  const G_rams = {
    players: {
      '0': {
        team: TEAMS.find(t => t.id === 'rams'),
        coins: 8,
        psi: 44,
        lineup: [],
        ramsTokenAttached: false,
        isCpu: true,
        hasWonAuction: false
      },
      '1': { team: TEAMS.find(t => t.id === '49ers'), coins: 8, psi: 44, lineup: [], isCpu: true, hasWonAuction: false }
    },
    board: {
      round: 2,
      auctionPlayers: [
        { id: 'ordinary_p1', name: 'Ordinary P1', minBid: 2, maxBid: 6, phase: 1, effects: [{ type: 'coins', amount: 1, perRound: true }] }
      ],
      activeAuctionCardIndex: 0,
      highestBid: 2,
      highestBidder: '1',
      passedAuctionPlayers: []
    }
  };

  // With 8 coins and savingsReserve = 7, spendable coins = 1. nextBid is 3 (minNeededBid = 2 + 1 = 3).
  // So Rams will pass to protect their 7+ coins reserve for Phase 2!
  const decisionRams = evaluateCpuAuctionBid(G_rams, '0');
  console.log('Rams early round 2 decision with 8 coins on ordinary card:', decisionRams);
  if (!decisionRams.shouldBid) {
    console.log('✅ PASS: Rams preserved their 7-coin bankroll reserve for Phase 2 Double Token centerpiece!');
  } else {
    console.log('Rams bid:', decisionRams);
  }
}

console.log('\n--- All Unit Tests Complete ---');
