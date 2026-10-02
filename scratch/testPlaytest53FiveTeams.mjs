import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer, GENERAL_HUMAN_HEURISTIC_TEAMS } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fisherYates(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function testFiveTeamsFineTuningAndHumanHeuristics() {
  console.log(`========================================================================`);
  console.log(`VERIFYING FINE-TUNING & HUMAN HEURISTICS FOR BILLS, DOLPHINS, PATRIOTS, JETS, RAVENS`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  // 1. BILLS
  console.log(`--- [1/5] BUFFALO BILLS ---`);
  {
    // A. Verify in GENERAL_HUMAN_HEURISTIC_TEAMS
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('bills');
    console.log(`Bills in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // B. Era Horizon Cap in Round 3 (preserves 5 coins on ordinary card)
    const G = {
      board: { round: 3, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'bills' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'titans' }, coins: 6, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const ordinaryCard = { id: 'ord_card', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [ordinaryCard];
    const dec = evaluateCpuAuctionBid(G, '0');
    const horizonPassed = dec.shouldBid && dec.bidAmount <= 3;
    console.log(`Bills Era Horizon Cap (R3 bid <= 3 with 8 coins): ${horizonPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${dec.bidAmount})`);
    if (!horizonPassed) allPassed = false;

    // C. Lockout Hammer
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];
    G.board.highestBid = 2;
    G.players['0'].coins = 12;
    G.players['1'].coins = 5;
    const hammerDec = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = hammerDec.shouldBid && hammerDec.bidAmount >= 4 && hammerDec.bidAmount <= 6;
    console.log(`Bills Lockout Hammer on Bowers vs 5-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${hammerDec.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 2. DOLPHINS
  console.log(`\n--- [2/5] MIAMI DOLPHINS ---`);
  {
    // A. Verify in GENERAL_HUMAN_HEURISTIC_TEAMS
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('dolphins');
    console.log(`Dolphins in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // B. Critical Bailout Check: Must NOT be blocked by Era Horizon Cap when holding <= 3 coins!
    const G = {
      board: { round: 3, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'dolphins' }, coins: 2, psi: 45, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 6, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const cheapCard = { id: 'cheap_card', minBid: 1, maxBid: 5, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [cheapCard];
    const decBailout = evaluateCpuAuctionBid(G, '0');
    // Dolphins should fearlessly spend their 2 coins to trigger +3 bailout!
    const bailoutPassed = decBailout.shouldBid && decBailout.bidAmount === 2;
    console.log(`Dolphins 0-Coin Bailout Spend in R3 (spends 2 to reach 0): ${bailoutPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decBailout.bidAmount})`);
    if (!bailoutPassed) allPassed = false;

    // C. Lockout Hammer
    G.players['0'].coins = 10;
    G.players['1'].coins = 4;
    const goodCard = { id: 'good_card', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'deflate', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [goodCard];
    G.board.highestBid = 2;
    const decHammer = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decHammer.shouldBid && decHammer.bidAmount >= 4 && decHammer.bidAmount <= 6;
    console.log(`Dolphins Lockout Hammer on 3-deflate card: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHammer.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 3. PATRIOTS
  console.log(`\n--- [3/5] NEW ENGLAND PATRIOTS ---`);
  {
    // A. Round 1 Premier Centerpiece All-In (7 coins on Bowers)
    const G = {
      board: { round: 1, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'patriots' }, coins: 7, psi: 36, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 12, psi: 44, isCpu: true, lineup: [] }
      }
    };
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];
    G.board.highestBid = 5;
    const decBowers = evaluateCpuAuctionBid(G, '0');
    // Patriots should be willing to bid up to all 7 coins on Bowers in R1
    const r1PremierPassed = decBowers.shouldBid && decBowers.bidAmount >= 6;
    console.log(`Patriots R1 All-In Willingness on Bowers: ${r1PremierPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decBowers.bidAmount})`);
    if (!r1PremierPassed) allPassed = false;

    // B. Round 1 Ordinary Card Cheap Discipline (caps at 3)
    const ordinaryCard = { id: 'chigoziem_okonkwo', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [ordinaryCard];
    G.board.highestBid = 3;
    const decOrd = evaluateCpuAuctionBid(G, '0');
    const cheapPassed = !decOrd.shouldBid || decOrd.bidAmount === 0;
    console.log(`Patriots R1 Cheap Discipline on Ordinary Card: ${cheapPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decOrd.shouldBid})`);
    if (!cheapPassed) allPassed = false;

    // C. Pump & Dump: Hunter Henry cut priority
    G.decks = { discard: [] };
    G.players['0'].lineup = [
      { id: 'hunter_henry', effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
    ];
    const newCard = { id: 'new_guy', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
    resolveAuctionWin(G, '0', newCard);
    const henryDiscarded = !G.players['0'].lineup.some(c => c.id === 'hunter_henry');
    console.log(`Patriots Pump & Dump (Hunter Henry replaced immediately): ${henryDiscarded ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!henryDiscarded) allPassed = false;
  }

  // 4. JETS
  console.log(`\n--- [4/5] NEW YORK JETS ---`);
  {
    // A. Small Max Buyout Priority (Rome Odunze: max 3 -> triggers 4 deflation!)
    const G = {
      board: { round: 1, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'jets' }, coins: 7, psi: 44, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 12, psi: 44, isCpu: true, lineup: [] }
      }
    };
    const odunze = { id: 'rome_odunze', minBid: 1, maxBid: 3, phase: 1, effects: [{ type: 'coins', amount: 5, perRound: false }] };
    G.board.auctionPlayers = [odunze];
    const decOdunze = evaluateCpuAuctionBid(G, '0');
    const odunzeMaxPassed = decOdunze.shouldBid && decOdunze.bidAmount === 3 && decOdunze.isMaxBid;
    console.log(`Jets Small Max Buyout on Odunze (bids 3 max): ${odunzeMaxPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decOdunze.bidAmount}, isMax: ${decOdunze.isMaxBid})`);
    if (!odunzeMaxPassed) allPassed = false;

    // B. Lockout Hammer when NOT paying max
    const highMaxCard = { id: 'high_max', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] };
    G.board.auctionPlayers = [highMaxCard];
    G.players['0'].coins = 7;
    G.players['1'].coins = 3;
    G.board.highestBid = 2;
    const decJetsHammer = evaluateCpuAuctionBid(G, '0');
    // Jets doesn't pay max 12 (gap too large), but uses lockout hammer against 3-coin rival!
    const hammerPassed = decJetsHammer.shouldBid && decJetsHammer.bidAmount >= 3 && decJetsHammer.bidAmount <= 4;
    console.log(`Jets Lockout Hammer on High Max Card: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decJetsHammer.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 5. RAVENS
  console.log(`\n--- [5/5] BALTIMORE RAVENS ---`);
  {
    // A. Round 1 Anchor Spend (~9 coins on star)
    const G = {
      board: { round: 1, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'ravens' }, coins: 14, psi: 42, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 12, psi: 44, isCpu: true, lineup: [] }
      }
    };
    const kittleCard = { id: 'george_kittle', position: 'TE', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
    G.board.auctionPlayers = [kittleCard];
    G.board.highestBid = 6;
    const decKittle = evaluateCpuAuctionBid(G, '0');
    const r1StarPassed = decKittle.shouldBid && decKittle.bidAmount >= 7 && decKittle.bidAmount <= 10;
    console.log(`Ravens R1 Star Anchor Bid on Kittle: ${r1StarPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decKittle.bidAmount})`);
    if (!r1StarPassed) allPassed = false;

    // B. Completing 3-Position Engine in Round 3
    G.board.round = 3;
    G.players['0'].coins = 6;
    G.players['0'].lineup = [
      { id: 'c1', position: 'QB', effects: [{ type: 'coins', amount: 2, perRound: true }] },
      { id: 'c2', position: 'RB', effects: [{ type: 'coins', amount: 1, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' }
    ];
    const missingWR = { id: 'wr_target', position: 'WR', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [missingWR];
    G.board.highestBid = 2;
    const decWR = evaluateCpuAuctionBid(G, '0');
    // Completing 3rd position unlocks +3 coins/round; Ravens bids aggressively to complete it!
    const engineCompletePassed = decWR.shouldBid && decWR.bidAmount >= 3;
    console.log(`Ravens 3-Position Completion Bid on WR: ${engineCompletePassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decWR.bidAmount})`);
    if (!engineCompletePassed) allPassed = false;
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL 5 TEAMS PASSED ALL CHECKS WITH ZERO REGRESSIONS! ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================================================\n`);

  return allPassed;
}

testFiveTeamsFineTuningAndHumanHeuristics();
