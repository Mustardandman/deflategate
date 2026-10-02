import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer, GENERAL_HUMAN_HEURISTIC_TEAMS } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function testPlaytest56Chargers() {
  console.log(`========================================================================`);
  console.log(`VERIFYING CHARGERS FINE-TUNING & HUMAN HEURISTICS`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  // 1. In GENERAL_HUMAN_HEURISTIC_TEAMS
  const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('chargers');
  console.log(`Chargers in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
  if (!inSet) allPassed = false;

  // 2. User's Lockout Hammer Rule:
  // "If chargers are the richest player, they can still just bid the current bid +1 since they are in no danger of being locked out since they are the richest (this is if the max bid is higher than any other team's coins)."
  {
    const G = {
      board: { round: 4, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chargers' }, coins: 15, psi: 35, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 6, psi: 35, isCpu: true, lineup: [] }
      }
    };
    // Card with maxBid 18 > rival's 6 coins
    const kelceCard = { id: 'travis_kelce', minBid: 3, maxBid: 18, phase: 2, effects: [{ type: 'deflate', amount: 6, perRound: true }] };
    G.board.auctionPlayers = [kelceCard];
    
    // Chargers has 15 coins > Bills 6 coins, and effMax 18 > Bills 6 coins.
    // Chargers is strictly richest: Should NOT jump! Should bid nextBid (3) to farm outbids!
    const decRichestFarm = evaluateCpuAuctionBid(G, '0');
    const farmPassed = decRichestFarm.shouldBid && decRichestFarm.bidAmount === 3 && !decRichestFarm.isJumpBid;
    console.log(`Chargers Richest Farm (bids currentBid + 1 without jumping): ${farmPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decRichestFarm.bidAmount}, isJumpBid: ${decRichestFarm.isJumpBid})`);
    if (!farmPassed) allPassed = false;

    // Now test when Chargers is NOT richest (rival has 12 coins, Chargers has 8 coins, or rival can contest ceiling):
    G.players['0'].coins = 10;
    G.players['1'].coins = 5; // Rival has 5 coins. Card maxBid is 5 (effMax <= rival coins).
    // Bills has high score on cappedCard
    const cappedCard = { id: 'cheap_gem', minBid: 2, maxBid: 5, phase: 1, effects: [{ type: 'deflate', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [cappedCard];
    const decJump = evaluateCpuAuctionBid(G, '0');
    // effMax (5) <= rival coins (5), so rival could lock out. Lockout Hammer jumps to rival willingness (5)!
    const jumpPassed = decJump.shouldBid && decJump.bidAmount === 5 && decJump.isJumpBid;
    console.log(`Chargers Lockout Hammer when rival can contest ceiling: ${jumpPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decJump.bidAmount}, isJumpBid: ${decJump.isJumpBid})`);
    if (!jumpPassed) allPassed = false;
  }

  // 3. User's Outbid Farming on Coin Cards:
  // "I am fine with the weight of deflate being more than coins since we are generating coins through the ability, but as long as the chargers are still bidding on coin cards that they think they will be outbid for."
  {
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 3, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chargers' }, coins: 8, psi: 45, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 40, isCpu: true, lineup: [] }
      }
    };
    // Burst card: score is ~4.1, valuation is 3. NextBid is 4 > valuation.
    const burstCard = { id: 'burst', minBid: 1, maxBid: 8, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [burstCard];
    // Saints has 10 coins and wants the card -> Chargers bids 4 to farm the outbid!
    const decCoinFarm = evaluateCpuAuctionBid(G, '0');
    const coinFarmPassed = decCoinFarm.shouldBid && decCoinFarm.bidAmount === 4 && decCoinFarm.isPriceBump;
    console.log(`Chargers Outbid Farming on Coin Card (bids nextBid when rival will outbid): ${coinFarmPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decCoinFarm.shouldBid}, bid: ${decCoinFarm.bidAmount})`);
    if (!coinFarmPassed) allPassed = false;

    // Now test when rival will NOT outbid (rival has only 2 coins): Chargers folds and doesn't get stuck!
    G.players['1'].coins = 2; // Rival cannot afford 4+ coins
    const decFold = evaluateCpuAuctionBid(G, '0');
    const foldPassed = !decFold.shouldBid || decFold.bidAmount === 0;
    console.log(`Chargers Safety Fold on Coin Card when rival cannot outbid: ${foldPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decFold.shouldBid})`);
    if (!foldPassed) allPassed = false;
  }

  // 4. Strategic Nomination:
  // Crown jewel (Kelce/Mahomes/Bowers) nominated first, otherwise bait rivals crave!
  {
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    const coinBait = { id: 'tee_higgins', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'coins', amount: 4, perRound: true }] };
    const fillerCard = { id: 'filler', minBid: 1, maxBid: 4, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };

    const G = {
      board: { round: 1, auctionPlayers: [coinBait, bowersCard, fillerCard], activeAuctionCardIndex: null, highestBid: 0, highestBidder: null, nominator: '0' },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chargers' }, coins: 8, psi: 50, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 40, isCpu: true, lineup: [] }
      }
    };

    // Bowers is crown jewel -> should nominate index 1!
    const nomCrown = chooseCpuNominationCard(G, '0');
    const crownPassed = nomCrown === 1;
    console.log(`Chargers Nominates Crown Jewel (Bowers) when available: ${crownPassed ? 'PASSED ✅' : 'FAILED ❌'} (nominated index: ${nomCrown})`);
    if (!crownPassed) allPassed = false;

    // When no crown jewel is present -> should nominate coinBait (index 0) because Saints craves it!
    G.board.auctionPlayers = [coinBait, fillerCard, null];
    const nomBait = chooseCpuNominationCard(G, '0');
    const baitPassed = nomBait === 0;
    console.log(`Chargers Nominates Bait Rivals Crave when no crown jewel: ${baitPassed ? 'PASSED ✅' : 'FAILED ❌'} (nominated index: ${nomBait})`);
    if (!baitPassed) allPassed = false;
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL CHARGERS CHECKS PASSED WITH ZERO REGRESSIONS! ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================================================\n`);

  return allPassed;
}

testPlaytest56Chargers();
