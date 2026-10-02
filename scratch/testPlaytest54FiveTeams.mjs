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

export function testPlaytest54FiveTeams() {
  console.log(`========================================================================`);
  console.log(`VERIFYING BENGALS, BROWNS, STEELERS, TEXANS, COLTS FINE-TUNING & HUMAN HEURISTICS`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  // 1. BENGALS
  console.log(`--- [1/5] CINCINNATI BENGALS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('bengals');
    console.log(`Bengals in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Hunter Henry boosted nuke & lockout hammer
    const G = {
      board: { round: 1, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'bengals' }, coins: 9, psi: 46, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'titans' }, coins: 4, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const henryCard = { id: 'hunter_henry', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [henryCard];
    const decHenry = evaluateCpuAuctionBid(G, '0');
    // Lockout hammer on rival with 4 coins: jumps to rival willingness (~4)
    const hammerPassed = decHenry.shouldBid && decHenry.bidAmount >= 3 && decHenry.bidAmount <= 5;
    console.log(`Bengals Lockout Hammer on Hunter Henry vs 4-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHenry.bidAmount})`);
    if (!hammerPassed) allPassed = false;

    // B. Instant Discard Churn (discards Henry immediately so no recurring inflation)
    G.players['0'].lineup = [
      { id: 'eng1', effects: [{ type: 'coins', amount: 2, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
    ];
    resolveAuctionWin(G, '0', henryCard);
    const henryDiscarded = G.decks.discard.some(c => c.id === 'hunter_henry');
    const lineupClean = !G.players['0'].lineup.some(c => c.id === 'hunter_henry');
    const churnPassed = henryDiscarded && lineupClean;
    console.log(`Bengals Instant Discard Churn (Henry discarded, not in lineup): ${churnPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!churnPassed) allPassed = false;
  }

  // 2. BROWNS
  console.log(`\n--- [2/5] CLEVELAND BROWNS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('browns');
    console.log(`Browns in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Strict Deflation Purity: pure coin cards score <= -50 and are rejected
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'browns' }, coins: 20, psi: 45, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const pureCoinCard = { id: 'justin_jefferson', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'coins', amount: 4, perRound: true }] };
    G.board.auctionPlayers = [pureCoinCard];
    const scoreCoin = scoreCardForPlayer(G, '0', pureCoinCard);
    const decCoin = evaluateCpuAuctionBid(G, '0');
    const purityPassed = scoreCoin <= -50.0 && (!decCoin.shouldBid || decCoin.bidAmount === 0);
    console.log(`Browns Deflation Purity (score <= -50 on pure coin card): ${purityPassed ? 'PASSED ✅' : 'FAILED ❌'} (score: ${scoreCoin}, shouldBid: ${decCoin.shouldBid})`);
    if (!purityPassed) allPassed = false;

    // B. Lockout Hammer on Brock Bowers
    const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
    G.board.auctionPlayers = [bowersCard];
    G.players['1'].coins = 6;
    G.board.highestBid = 2;
    const decBowers = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decBowers.shouldBid && decBowers.bidAmount >= 5 && decBowers.bidAmount <= 8;
    console.log(`Browns Lockout Hammer on Bowers vs 6-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decBowers.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 3. STEELERS
  console.log(`\n--- [3/5] PITTSBURGH STEELERS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('steelers');
    console.log(`Steelers in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Richest title protection (Austerity): Folds when bidding sacrifices richest status
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 3, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'steelers' }, coins: 10, psi: 48, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'ravens' }, coins: 8, psi: 42, isCpu: true, lineup: [] }
      }
    };
    const fillerCard = { id: 'filler', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [fillerCard];
    // Next bid is 4 coins. Spending 4 leaves Steelers with 6 coins, losing richest title to Ravens (8 coins).
    // Steelers should fold to protect richest title!
    const decAusterity = evaluateCpuAuctionBid(G, '0');
    const austerityPassed = !decAusterity.shouldBid || decAusterity.bidAmount === 0;
    console.log(`Steelers Austerity (folds when bidding sacrifices richest title): ${austerityPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decAusterity.shouldBid})`);
    if (!austerityPassed) allPassed = false;

    // B. Safe Lockout Hammer when safely richest
    G.players['0'].coins = 18;
    G.players['1'].coins = 6;
    G.board.highestBid = 2;
    const goodCoinCard = { id: 'good_coin', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'coins', amount: 3, perRound: true }] };
    G.board.auctionPlayers = [goodCoinCard];
    const decHammer = evaluateCpuAuctionBid(G, '0');
    // Steelers has 18 coins (surplus of 11 over Ravens 6). Can safely bid lockout hammer (around 5-6 coins)
    const hammerPassed = decHammer.shouldBid && decHammer.bidAmount >= 4 && decHammer.bidAmount <= 7;
    console.log(`Steelers Safe Lockout Hammer on Coin Engine: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decHammer.bidAmount})`);
    if (!hammerPassed) allPassed = false;
  }

  // 4. TEXANS
  console.log(`\n--- [4/5] HOUSTON TEXANS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('texans');
    console.log(`Texans in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. 1-Win Turn Discipline: strictly PASSES on non-QB if an affordable QB is waiting in the auction row!
    const nonQbCard = { id: 'drake_london', position: 'WR', minBid: 2, maxBid: 12, phase: 1, effects: [{ type: 'coins', amount: 4, perRound: true }] };
    const waitingQb = { id: 'kirk_cousins', position: 'QB', minBid: 2, maxBid: 10, phase: 1, effects: [{ type: 'deflate', amount: 4, perRound: false }] };
    const G = {
      board: { round: 1, auctionPlayers: [nonQbCard, waitingQb], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': { id: '0', team: { id: 'texans' }, coins: 8, psi: 47, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'bills' }, coins: 12, psi: 44, isCpu: true, lineup: [] }
      }
    };
    const decNonQb = evaluateCpuAuctionBid(G, '0');
    const disciplinePassed = !decNonQb.shouldBid || decNonQb.bidAmount === 0;
    console.log(`Texans 1-Win Discipline (passes on non-QB when QB is waiting): ${disciplinePassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decNonQb.shouldBid})`);
    if (!disciplinePassed) allPassed = false;

    // B. Lockout Hammer on QB
    G.board.activeAuctionCardIndex = 1; // Now bidding on Cousins (QB)
    G.board.highestBid = 2;
    G.players['1'].coins = 4; // Rival has 4 coins
    const decQb = evaluateCpuAuctionBid(G, '0');
    const hammerPassed = decQb.shouldBid && decQb.bidAmount >= 3 && decQb.bidAmount <= 6;
    console.log(`Texans Lockout Hammer on Kirk Cousins vs 4-coin rival: ${hammerPassed ? 'PASSED ✅' : 'FAILED ❌'} (bid: ${decQb.bidAmount})`);
    if (!hammerPassed) allPassed = false;

    // C. Lineup Replacement Protection: Active QBs never cut for non-QB
    G.players['0'].lineup = [
      { id: 'qb1', position: 'QB', effects: [{ type: 'coins', amount: 2, perRound: true }] },
      { id: 'wr1', position: 'WR', effects: [{ type: 'coins', amount: 1, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' }
    ];
    const incomingSuperstar = { id: 'derrick_henry', position: 'RB', effects: [{ type: 'deflate', amount: 4, perRound: true }] };
    resolveAuctionWin(G, '0', incomingSuperstar);
    const qbPreserved = G.players['0'].lineup.some(c => c.id === 'qb1');
    console.log(`Texans Dynamic Lineup Replacement (QB protected from cut): ${qbPreserved ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!qbPreserved) allPassed = false;
  }

  // 5. COLTS
  console.log(`\n--- [5/5] INDIANAPOLIS COLTS ---`);
  {
    const inSet = GENERAL_HUMAN_HEURISTIC_TEAMS.has('colts');
    console.log(`Colts in GENERAL_HUMAN_HEURISTIC_TEAMS: ${inSet ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!inSet) allPassed = false;

    // A. Unlimited Roster Expansion: never replaces starters!
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      decks: { discard: [] },
      players: {
        '0': {
          id: '0', team: { id: 'colts' }, coins: 10, psi: 45, isCpu: true,
          lineup: [
            { id: 'c1', effects: [{ type: 'coins', amount: 1, perRound: true }] },
            { id: 'c2', effects: [{ type: 'coins', amount: 1, perRound: true }] },
            { id: 'c3', effects: [{ type: 'coins', amount: 1, perRound: true }] }
          ]
        },
        '1': { id: '1', team: { id: 'bills' }, coins: 8, psi: 40, isCpu: true, lineup: [] }
      }
    };
    const cleanEngine = { id: 'c4', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
    resolveAuctionWin(G, '0', cleanEngine);
    const expandedPassed = G.players['0'].lineup.length === 4;
    console.log(`Colts Unlimited Roster Expansion (holds 4 starters): ${expandedPassed ? 'PASSED ✅' : 'FAILED ❌'} (count: ${G.players['0'].lineup.length})`);
    if (!expandedPassed) allPassed = false;

    // B. Absolute Zero-Tolerance for Poison: Never bids on toxic/poison card
    const poisonCard = { id: 'deshaun_watson', minBid: 1, maxBid: 8, phase: 1, effects: [{ type: 'inflate', amount: 4, perRound: true }] };
    G.board.auctionPlayers = [poisonCard];
    const decPoison = evaluateCpuAuctionBid(G, '0');
    const poisonPassed = !decPoison.shouldBid || decPoison.bidAmount === 0;
    console.log(`Colts Zero-Tolerance Poison Rejection (folds on Watson): ${poisonPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decPoison.shouldBid})`);
    if (!poisonPassed) allPassed = false;

    // C. Bargain Hunter Cap (passes at 5+ coins on clean engine)
    const cheapEngine = { id: 'clean_eng', minBid: 2, maxBid: 8, phase: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] };
    G.board.auctionPlayers = [cheapEngine];
    G.board.highestBid = 4; // next bid is 5
    const decBargain = evaluateCpuAuctionBid(G, '0');
    const bargainPassed = !decBargain.shouldBid || decBargain.bidAmount === 0;
    console.log(`Colts Bargain Hunter Cap (passes at 5 coins on cheap engine): ${bargainPassed ? 'PASSED ✅' : 'FAILED ❌'} (shouldBid: ${decBargain.shouldBid})`);
    if (!bargainPassed) allPassed = false;
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL 5 TEAMS PASSED ALL CHECKS WITH ZERO REGRESSIONS! ✅' : 'FAILURES OCCURRED ❌'}`);
  console.log(`========================================================================\n`);

  return allPassed;
}

testPlaytest54FiveTeams();
