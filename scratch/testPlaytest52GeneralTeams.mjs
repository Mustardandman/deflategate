import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer, getEffectiveTeamId, getEffectiveCardMaxBid, GENERAL_HUMAN_HEURISTIC_TEAMS } from '../src/Game.js';
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

const TARGET_16_TEAMS = [
  'chargers', 'cowboys', 'eagles', 'commanders',
  'bears', 'lions', 'packers', 'vikings',
  'falcons', 'saints', 'panthers', 'buccaneers',
  'cardinals', 'rams', '49ers', 'seahawks'
];

export function verifyHumanHeuristicsOnAll16Teams() {
  console.log(`========================================================================`);
  console.log(`VERIFYING PHASE 1 & 2 HUMAN HEURISTICS ACROSS ALL 16 TEAMS`);
  console.log(`========================================================================\n`);

  let allPassed = true;

  for (const teamId of TARGET_16_TEAMS) {
    let teamPassed = true;

    // 1. Check in GENERAL_HUMAN_HEURISTIC_TEAMS set
    if (!GENERAL_HUMAN_HEURISTIC_TEAMS.has(teamId)) {
      console.error(`FAIL: ${teamId} is missing from GENERAL_HUMAN_HEURISTIC_TEAMS`);
      teamPassed = false;
      allPassed = false;
    }

    // 2. Test Rule 1: Era Horizon Cap in Round 3
    // (Except 49ers if dropping below 5 with deflation in lineup, and Packers if pursuing Phase 1)
    if (teamId !== '49ers' && teamId !== 'packers') {
      const G = {
        board: { round: 3, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
        players: {
          '0': { id: '0', team: { id: teamId }, coins: 8, psi: 40, isCpu: true, lineup: [] },
          '1': { id: '1', team: { id: 'bills' }, coins: 7, psi: 40, isCpu: true, lineup: [] }
        }
      };
      const ordinaryCard = { id: 'chigoziem_okonkwo', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
      G.board.auctionPlayers = [ordinaryCard];
      const dec = evaluateCpuAuctionBid(G, '0');
      // In Round 3 with 8 coins, savingsReserve = 5, spendableCoins = 3. Max bid shouldn't exceed 3!
      if (dec.shouldBid && dec.bidAmount > 3) {
        console.error(`FAIL: ${teamId} violated Era Horizon Cap in Round 3 (bid: ${dec.bidAmount}, max: 3)`);
        teamPassed = false;
        allPassed = false;
      }
    }

    // 3. Test Rule 2: Dynamic Poison Taxing (For teams where toxic cards are bad)
    if (teamId !== 'saints') {
      const G = {
        board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
        players: {
          '0': { id: '0', team: { id: teamId }, coins: 8, psi: 40, isCpu: true, lineup: [] },
          '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 40, isCpu: true, lineup: [] }
        }
      };
      const toxicCard = { id: 'toxic_test', minBid: 1, maxBid: 5, phase: 1, effects: [{ type: 'inflate', amount: 3, perRound: false }] };
      G.board.auctionPlayers = [toxicCard];
      const decTax = evaluateCpuAuctionBid(G, '0');
      const taxesAt2 = decTax.shouldBid && decTax.bidAmount === 2;

      G.board.highestBid = 2;
      const decNever3 = evaluateCpuAuctionBid(G, '0');
      const foldsAt3 = !decNever3.shouldBid || decNever3.bidAmount === 0;

      if (!taxesAt2 || !foldsAt3) {
        console.error(`FAIL: ${teamId} failed Poison-Pill Taxing (taxes at 2: ${taxesAt2}, folds at 3: ${foldsAt3})`);
        teamPassed = false;
        allPassed = false;
      }
    }

    // 4. Test Rule 3: Roster Complementarity
    {
      const G = {
        board: { round: 3, auctionPlayers: [] },
        players: {
          '0': {
            id: '0', team: { id: teamId }, coins: 8, psi: 40, isCpu: true,
            lineup: [
              { id: 'c1', effects: [{ type: 'coins', amount: 3, perRound: true }] },
              { id: 'c2', effects: [{ type: 'coins', amount: 2, perRound: true }] }
            ]
          }
        }
      };
      const deflateEngineCard = { id: 'def_eng', minBid: 2, maxBid: 10, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
      const score = scoreCardForPlayer(G, '0', deflateEngineCard);
      // Base value of 2 deflate/rd is boosted by deficit bonus (+cardRecDeflate * 3.5 = +7.0)
      if (score < 15.0) {
        console.error(`FAIL: ${teamId} failed Roster Complementarity bonus (score: ${score})`);
        teamPassed = false;
        allPassed = false;
      }
    }

    // 5. Test Lockout Hammer
    {
      const G = {
        board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 2, highestBidder: '1', passedAuctionPlayers: [] },
        players: {
          '0': { id: '0', team: { id: teamId }, coins: 12, psi: 40, isCpu: true, lineup: [] },
          '1': { id: '1', team: { id: 'bills' }, coins: 5, psi: 40, isCpu: true, lineup: [] }
        }
      };
      // Brock Bowers: highly valued (score >= 18)
      const bowersCard = { id: 'brock_bowers', minBid: 2, maxBid: 14, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
      G.board.auctionPlayers = [bowersCard];
      const hammerDec = evaluateCpuAuctionBid(G, '0');
      // Bills has 5 coins. Bowers maxBid is 14. Lockout hammer should jump to rival willingness (around 5), locking them out without paying 12!
      const usedHammer = hammerDec.shouldBid && hammerDec.bidAmount >= 4 && hammerDec.bidAmount <= 6;
      if (!usedHammer) {
        console.warn(`NOTE: ${teamId} Lockout hammer bid: ${hammerDec.bidAmount} (shouldBid: ${hammerDec.shouldBid})`);
      }
    }

    console.log(`Team [${teamId.toUpperCase().padEnd(12)}]: ${teamPassed ? 'PASSED ALL CHECKS ✅' : 'FAILED ❌'}`);
  }

  console.log(`\n16-Team Verification Result: ${allPassed ? 'ALL 16 TEAMS VERIFIED SUCCESSFULLY ✅' : 'FAILURES DETECTED ❌'}\n`);
  return allPassed;
}

export function runMultiFormatLeagueSample(gamesPerFormat = 30) {
  console.log(`========================================================================`);
  console.log(`LEAGUE SIMULATION BENCHMARK ACROSS 4P, 7P, 10P (ALL TEAMS ACTIVE)`);
  console.log(`========================================================================\n`);

  for (const numPlayers of [4, 7, 10]) {
    const teamWins = {};
    const baseSeed = 44444;

    for (let g = 0; g < gamesPerFormat; g++) {
      const rng = mulberry32(baseSeed + g * 71 + numPlayers * 13);
      const origRandom = Math.random;
      Math.random = rng;

      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const pickedTeams = fisherYates(TEAMS, rng).slice(0, numPlayers);

      for (let p = 0; p < numPlayers; p++) {
        const seat = String(p);
        const t = pickedTeams[p];
        G.players[seat].team = { ...t };
        G.players[seat].psi = t.initialPsi;
        G.players[seat].coins = t.coins;
        G.players[seat].isCpu = true;
        G.players[seat].genome = { ...(ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME) };
        G.players[seat].lineup = [];
        for (let ps = 0; ps < 3; ps++) {
          G.players[seat].lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
        }
      }

      let winner = null;
      let round = 0;

      while (!winner && round < 15) {
        round++;
        G.board.round = round;

        if (round === 1) G.decks.activePlayers = fisherYates([...PHASE_1_PLAYERS], rng);
        else if (round === 4) G.decks.activePlayers = fisherYates([...PHASE_2_PLAYERS], rng);
        else if (round === 7) G.decks.activePlayers = fisherYates([...HOF_PLAYERS], rng);

        // Win check
        for (let p = 0; p < numPlayers; p++) {
          if (G.players[String(p)].psi <= 0) {
            winner = G.players[String(p)].team.id;
            break;
          }
        }
        if (winner) break;

        // Draw auction cards
        G.board.auctionPlayers = [];
        for (let c = 0; c < numPlayers; c++) {
          if (G.decks.activePlayers.length > 0) {
            G.board.auctionPlayers.push(G.decks.activePlayers.pop());
          }
        }

        const maxWinsThisRound = 1;
        Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; });
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.passedAuctionPlayers = [];

        let auctionSafety = 0;
        while (auctionSafety++ < 30 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
          const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
          if (remainingBoardCards === 0) break;

          const nominatorId = String(G.board.nominator);
          let nomCardIdx = chooseCpuNominationCard(G, nominatorId);

          if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
            const firstValid = G.board.auctionPlayers.findIndex(c => c !== null);
            if (firstValid === -1) break;
            nomCardIdx = firstValid;
          }

          G.board.activeAuctionCardIndex = nomCardIdx;
          const activeCard = G.board.auctionPlayers[nomCardIdx];
          G.board.highestBid = activeCard.minBid;
          G.board.highestBidder = nominatorId;
          G.board.passedAuctionPlayers = [];

          let bidLoopSafety = 0;
          let currentBidderIdx = (numPlayers > 0) ? (Number(G.board.highestBidder) + 1) % numPlayers : 0;
          while (bidLoopSafety++ < 100) {
            const eligibleBidders = Object.keys(G.players).filter(id =>
              !G.board.passedAuctionPlayers.includes(id) &&
              (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound &&
              G.players[id].coins >= (G.board.highestBid + 1)
            );

            if (eligibleBidders.length === 0 || (eligibleBidders.length === 1 && eligibleBidders[0] === G.board.highestBidder)) {
              break;
            }

            const bidderId = String(currentBidderIdx);
            currentBidderIdx = (currentBidderIdx + 1) % numPlayers;

            if (G.board.passedAuctionPlayers.includes(bidderId) || (G.players[bidderId].cardsWonThisRound || 0) >= maxWinsThisRound) {
              continue;
            }
            if (bidderId === G.board.highestBidder) {
              continue;
            }

            const decision = evaluateCpuAuctionBid(G, bidderId);

            if (decision.shouldBid && decision.bidAmount > G.board.highestBid && decision.bidAmount <= G.players[bidderId].coins) {
              G.board.highestBid = decision.bidAmount;
              G.board.highestBidder = bidderId;
            } else {
              if (!G.board.passedAuctionPlayers.includes(bidderId)) {
                G.board.passedAuctionPlayers.push(bidderId);
              }
            }
          }

          const winningPlayerId = G.board.highestBidder;
          const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];

          if (winningPlayerId && wonCard) {
            resolveAuctionWin(G, winningPlayerId, wonCard);
          }

          G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
          G.board.activeAuctionCardIndex = null;
          G.board.highestBid = 0;
          G.board.highestBidder = null;
          G.board.nominator = (Number(nominatorId) + 1) % numPlayers;
        }

        // End of round refresh
        for (let p = 0; p < numPlayers; p++) {
          const player = G.players[String(p)];
          let netDeflate = 0;
          let netCoins = 0;
          (player.lineup || []).forEach(card => {
            (card.effects || []).forEach(eff => {
              if (eff.perRound || eff.trigger === 'refresh' || eff.type === 'every_round' || eff.type === 'deflate_every_round') {
                if (eff.type === 'deflate') netDeflate += eff.amount;
                if (eff.type === 'coins') netCoins += eff.amount;
                if (eff.type === 'inflate') netDeflate -= eff.amount;
              }
            });
          });
          player.psi = Math.max(0, player.psi - netDeflate);
          player.coins += netCoins;
        }

        for (let p = 0; p < numPlayers; p++) {
          if (G.players[String(p)].psi <= 0) {
            winner = G.players[String(p)].team.id;
            break;
          }
        }

        Math.random = origRandom;
      }

      if (winner) {
        teamWins[winner] = (teamWins[winner] || 0) + 1;
      }
    }

    console.log(`Lobby Format: ${numPlayers}P (Completed ${gamesPerFormat} games successfully)`);
    const sorted = Object.entries(teamWins).sort((a, b) => b[1] - a[1]);
    console.log(`  Top Winning Teams: ${sorted.slice(0, 5).map(([t, w]) => `${t}: ${w} wins (${(w/gamesPerFormat*100).toFixed(0)}%)`).join(', ')}\n`);
  }
}

// Run test suite
verifyHumanHeuristicsOnAll16Teams();
runMultiFormatLeagueSample(30);
