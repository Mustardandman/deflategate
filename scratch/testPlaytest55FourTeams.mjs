import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer, GENERAL_HUMAN_HEURISTIC_TEAMS } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function testPlaytest55FourTeams() {
  console.log(`========================================================================`);
  console.log(`VERIFYING JAGUARS, TITANS, BRONCOS, CHIEFS FINE-TUNING & HUMAN HEURISTICS`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  // 1. JAGUARS
  console.log(`--- [1/4] JACKSONVILLE JAGUARS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('jaguars');
    console.log(`Jaguars in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Lockout Hammer on 3-deflate card vs 4-coin rival
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'jaguars' }, coins: 10, psi: 43, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 4, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const goodCard = { id: 'derrick_henry', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'deflate', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [goodCard];
    const decHammer = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decHammer.shouldBid && decHammer.bidAmount >= 3 && decHammer.bidAmount <= 5;
    console.log(`Jaguars Lockout Hammer on Henry vs 4-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHammer.bidAmount})`);
    if (!hammerPassed) allPassed = false;

    // B. Era Horizon Cap (R3 bid preserves 5 coins on ordinary card)
    G.board.round = 3;
    const ordCard = { id: 'ord_filler', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [ordCard];
    G.board.highestBid = 1;
    const decOrd = evaluateCpuAuctionBid(G, '0');
    // 10 coins - 5 reserve = max spend 5. Bid should be <= 5
    const horizonPassed = decOrd.shouldBid && decOrd.bidAmount <= 5;
    console.log(`Jaguars Era Horizon Cap in R3: ${horizonPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decOrd.bidAmount})`);
    if (!horizonPassed) allPassed = false;
  }

  // 2. TITANS
  console.log(`\n--- [2/4] TENNESSEE TITANS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('titans');
    console.log(`Titans in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Round 1 Anchor Conviction (bids all-in on Bowers with 7 coins)
    const G = {
      board: { round: 1, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 4, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'titans' }, coins: 7, psi: 44, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 12, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];
    const decBowers = evaluateCpuAuctionBid(G, '0');
    const r1AnchorPassed = decBowers.shouldBid && decBowers.bidAmount >= 5 && decBowers.bidAmount <= 7;
    console.log(`Titans R1 Anchor Conviction on Bowers (bids 5-7): ${r1AnchorPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decBowers.bidAmount})`);
    if (!r1AnchorPassed) allPassed = false;

    // B. Lockout Hammer vs 4-coin rival
    G.players['0'].coins = 9;
    G.players['1'].coins = 4;
    G.board.highestBid = 2;
    const decHammer = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decHammer.shouldBid && decHammer.bidAmount >= 3 && decHammer.bidAmount <= 5;
    console.log(`Titans Lockout Hammer on Bowers vs 4-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHammer.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 3. BRONCOS
  console.log(`\n--- [3/4] DENVER BRONCOS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('broncos');
    console.log(`Broncos in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Pump & Dump on Hunter Henry: Henry is NOT toxic for Broncos
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'broncos' }, coins: 20, psi: 40, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 6, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const henryCard = { id: 'hunter_henry', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [henryCard];
    const decHenry = evaluateCpuAuctionBid(G, '0');
    // Broncos should bid on Henry (not fold due to poison taxing!)
    const pumpPassed = decHenry.shouldBid && decHenry.bidAmount >= 3;
    console.log(`Broncos Pump & Dump on Hunter Henry (shouldBid is true): ${pumpPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHenry.bidAmount})`);
    if (!pumpPassed) allPassed = false;

    // B. Lockout Hammer on Bowers vs 6-coin rival
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];
    G.board.highestBid = 2;
    const decBowers = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decBowers.shouldBid && decBowers.bidAmount >= 5 && decBowers.bidAmount <= 8;
    console.log(`Broncos Lockout Hammer on Bowers vs 6-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decBowers.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 4. CHIEFS
  console.log(`\n--- [4/4] KANSAS CITY CHIEFS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('chiefs');
    console.log(`Chiefs in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Lockout Hammer on Travis Kelce
    const G = {
      board: { round: 4, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 3, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'chiefs' }, coins: 14, psi: 35, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'chargers' }, coins: 6, psi: 35, isCpu: true, lineup: [] }
      }
    };
    const kelceCard = { id: 'travis_kelce', minBid: 3, maxBid: 20, phase: 2, effects: [{ type: 'deflate', amount: 6, perRound: true }] };
    G.board.auctionPlayers = [kelceCard];
    const decKelce = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decKelce.shouldBid && decKelce.bidAmount >= 5 && decKelce.bidAmount <= 8;
    console.log(`Chiefs Lockout Hammer on Travis Kelce vs 6-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decKelce.bidAmount})`);
    if (!hammerPassed) allPassed = false;

    // B. Roster Complementarity & Engine Balance
    G.players['0'].lineup = [
      { id: 'c1', effects: [{ type: 'coins', amount: 3, perRound: true }] },
      { id: 'c2', effects: [{ type: 'coins', amount: 3, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' }
    ];
    // Lineup is heavy on coins (6 coins/round), lacking deflation. Deflation engine should be boosted!
    const deflateTarget = { id: 'def_card', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
    const scoreDeflate = scoreCardForPlayer(G, '0', deflateTarget);
    const coinTarget = { id: 'coin_card', effects: [{ type: 'coins', amount: 2, perRound: true }] };
    const scoreCoin = scoreCardForPlayer(G, '0', coinTarget);
    const balancePassed = scoreDeflate > scoreCoin;
    console.log(`Chiefs Roster Complementarity (deflation prioritized when coins saturated): ${balancePassed ? 'PASSED ✅' : 'FAILED ❌'} (def: ${scoreDeflate.toFixed(1)}, coin: ${scoreCoin.toFixed(1)})`);
    if (!balancePassed) allPassed = false;
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL 4 TEAMS PASSED ALL CHECKS WITH ZERO REGRESSIONS! ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================================================\n`);

  return allPassed;
}

testPlaytest55FourTeams();
