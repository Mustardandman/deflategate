import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';

export function testPlaytest57AntiChargers() {
  console.log(`========================================================================`);
  console.log(`VERIFYING ANTI-CHARGERS OPPONENT BIDDING & NOMINATION TECHNIQUES`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  // 1. Opponent Bidding when Chargers is in game:
  // "Alter opponents bidding technique if the chargers are in the game so that they are 40% more likely than normal to bid the max they think they can win a player for. Instead of starting at 1 and increasing it everytime, if they think they can win the player for 4 and no one will outbid them, they start at 4."
  {
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '2', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chargers' }, coins: 4, psi: 45, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'patriots' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '2': { id: '2', team: { id: 'saints' }, coins: 2, psi: 40, isCpu: true, lineup: [] }
      }
    };

    // Card where Patriots has valuation ~6.
    // Chargers has 4 coins, Saints has 2 coins -> max rival willingness is 4 coins (Chargers).
    // Current highest bid is 1. Next bid is 2.
    // Without anti-chargers logic, Patriots would bid nextBid (2).
    // With anti-chargers logic, Patriots jumps directly to 4 coins to win the card and deny Chargers outbid farming!
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];

    const decOpponent = evaluateCpuAuctionBid(G, '1');
    const jumpPassed = decOpponent.shouldBid && decOpponent.bidAmount === 4 && decOpponent.isJumpBid;
    console.log(`Opponent Jump Bid against Chargers (jumps to 4 instead of 2): ${jumpPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decOpponent.bidAmount}, isJumpBid: ${decOpponent.isJumpBid})`);
    if (!jumpPassed) allPassed = false;
  }

  // 2. Opponent Nominating when Chargers is in game:
  // "Instead of starting at 1 and increasing it everytime, if they think they can win the player for 4 and no one will outbid them, they start at 4."
  {
    const bowersCard = { id: 'brock_bowers', minBid: 1, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    const G = {
      board: { round: 2, auctionPlayers: [bowersCard], activeAuctionCardIndex: null, highestBid: 0, highestBidder: null, nominator: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chargers' }, coins: 4, psi: 45, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'patriots' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '2': { id: '2', team: { id: 'saints' }, coins: 2, psi: 40, isCpu: true, lineup: [] }
      }
    };

    // When Patriots (1) nominates bowersCard:
    // With Chargers in the game, Patriots should start at 4 coins instead of minBid (1)!
    G.board.activeAuctionCardIndex = 0;
    const nomDecision = evaluateCpuAuctionBid(G, '1');
    const nomStartPassed = nomDecision && nomDecision.shouldBid && nomDecision.bidAmount === 4;
    console.log(`Opponent Opening Nomination Start Price (starts at 4 instead of 1): ${nomStartPassed ? 'PASSED ✅' : 'FAILED ❌'} (opening price: ${nomDecision?.bidAmount})`);
    if (!nomStartPassed) allPassed = false;
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL ANTI-CHARGERS OPPONENT CHECKS PASSED! ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================================================\n`);

  return allPassed;
}

testPlaytest57AntiChargers();
