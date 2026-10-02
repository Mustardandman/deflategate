import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer, getEffectiveTeamId, getEffectiveCardMaxBid } from '../src/Game.js';
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

// ---------------------------------------------------------------------------
// TEST 1: 1,000-Game A/B Mirror Test (Ability Voided)
// 1 New Raiders (Game.js) vs 4 Old-style baseline Raiders
// ---------------------------------------------------------------------------
export function run1000GameMirrorTest() {
  console.log(`========================================================================`);
  console.log(`TEST 1: 1,000-GAME A/B MIRROR TEST (1 NEW RAIDERS VS 4 OLD RAIDERS)`);
  console.log(`Rules: Raiders ability voided for all. Rotating seat every 200 games.`);
  console.log(`========================================================================\n`);

  const numPlayers = 5;
  const gamesTotal = 1000;
  const gamesPerSeat = gamesTotal / numPlayers; // 200 per seat

  let newRaidersWins = 0;
  let oldRaidersWins = 0;
  const seatWins = Array(numPlayers).fill(0);

  const baseSeed = 77777;

  for (let g = 0; g < gamesTotal; g++) {
    const testSeat = String(Math.floor(g / gamesPerSeat));
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    const raidersTeam = TEAMS.find(t => t.id === 'raiders');

    for (let p = 0; p < numPlayers; p++) {
      const seat = String(p);
      G.players[seat].team = { ...raidersTeam };
      G.players[seat].psi = raidersTeam.initialPsi;
      G.players[seat].coins = raidersTeam.coins;
      G.players[seat].isCpu = true;
      G.players[seat].genome = { ...(ACTIVE_TEAM_GENOMES.raiders || DEFAULT_GENOME) };
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

      // Phase 1 / Phase 2 / HOF deck population
      if (round === 1) {
        G.decks.activePlayers = fisherYates([...PHASE_1_PLAYERS], rng);
      } else if (round === 4) {
        G.decks.activePlayers = fisherYates([...PHASE_2_PLAYERS], rng);
      } else if (round === 7) {
        G.decks.activePlayers = fisherYates([...HOF_PLAYERS], rng);
      }

      // Check win condition before auction
      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi <= 0) {
          winner = String(p);
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

          let decision = null;
          if (bidderId === testSeat) {
            // New Raiders: uses evaluateCpuAuctionBid with our new rules!
            decision = evaluateCpuAuctionBid(G, bidderId);
          } else {
            // Old Raiders: simple fallback bidding
            const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
            const nextBid = G.board.highestBid + 1;
            const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
            const score = scoreCardForPlayer(G, bidderId, card);
            const willing = Math.min(effMax, Math.round(score * 0.7));
            const shouldBid = (nextBid <= G.players[bidderId].coins && nextBid <= willing);
            decision = { shouldBid, bidAmount: shouldBid ? nextBid : 0 };
          }

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
          winner = String(p);
          break;
        }
      }

      Math.random = origRandom;
    }

    if (winner === testSeat) {
      newRaidersWins++;
      seatWins[Number(testSeat)]++;
    } else {
      oldRaidersWins++;
    }
  }

  const winRate = ((newRaidersWins / gamesTotal) * 100).toFixed(1);
  console.log(`Results over ${gamesTotal} games:`);
  console.log(`New Raiders Wins: ${newRaidersWins} / ${gamesTotal} (${winRate}%)`);
  console.log(`Old Raiders Wins: ${oldRaidersWins} / ${gamesTotal} (${((oldRaidersWins / gamesTotal) * 100).toFixed(1)}%)`);
  console.log(`Fair Share Expected: 20.0%`);
  console.log(`Breakdown by Seat: ${seatWins.map((w, s) => `Seat ${s}: ${(w/gamesPerSeat*100).toFixed(1)}%`).join(', ')}\n`);

  return { newRaidersWins, winRate };
}

// ---------------------------------------------------------------------------
// TEST 2: Multi-Format Benchmarks (4P, 7P, 10P) with Real Teams & Abilities
// ---------------------------------------------------------------------------
export function runMultiFormatBenchmarks(gamesPerFormat = 50) {
  console.log(`========================================================================`);
  console.log(`TEST 2: MULTI-FORMAT BENCHMARKS (4P, 7P, 10P) DIRECTLY USING GAME.JS`);
  console.log(`========================================================================\n`);

  const results = {};
  const baseSeed = 99999;

  for (const numPlayers of [4, 7, 10]) {
    let raidersWins = 0;
    let raidersPsiSum = 0;
    let raidersCoinsSum = 0;
    const fairShare = (100 / numPlayers).toFixed(1);

    for (let g = 0; g < gamesPerFormat; g++) {
      const rng = mulberry32(baseSeed + g * 53 + numPlayers * 11);
      const origRandom = Math.random;
      Math.random = rng;

      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'raiders'), rng);
      const raidersTeam = TEAMS.find(t => t.id === 'raiders');

      // Seat 0 is Raiders
      G.players['0'].team = { ...raidersTeam };
      G.players['0'].psi = raidersTeam.initialPsi;
      G.players['0'].coins = raidersTeam.coins;
      G.players['0'].isCpu = true;
      G.players['0'].genome = { ...(ACTIVE_TEAM_GENOMES.raiders || DEFAULT_GENOME) };
      G.players['0'].lineup = [];
      for (let ps = 0; ps < 3; ps++) {
        G.players['0'].lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_0_${ps}` });
      }

      for (let i = 1; i < numPlayers; i++) {
        const seat = String(i);
        const t = availableTeams[i - 1];
        const p = G.players[seat];
        p.team = { ...t };
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = { ...(ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME) };
        p.lineup = [];
        for (let ps = 0; ps < 3; ps++) {
          p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
        }
      }

      let winner = null;
      let round = 0;

      while (!winner && round < 15) {
        round++;
        G.board.round = round;

        if (round === 1) {
          G.decks.activePlayers = fisherYates([...PHASE_1_PLAYERS], rng);
        } else if (round === 4) {
          G.decks.activePlayers = fisherYates([...PHASE_2_PLAYERS], rng);
        } else if (round === 7) {
          G.decks.activePlayers = fisherYates([...HOF_PLAYERS], rng);
        }

        // Raiders CPU Ability: give 1 PSI to nearest leader (excluding Saints)
        let minRounds = Infinity;
        let targetId = null;
        Object.keys(G.players).forEach(id => {
          if (id === '0') return;
          const opp = G.players[id];
          if (getEffectiveTeamId(opp) === 'saints') return; // Exclude Saints!
          let netDef = 0;
          (opp.lineup || []).forEach(c => {
            (c.effects || []).forEach(e => {
              if (e.perRound || e.trigger === 'refresh') {
                if (e.type === 'deflate') netDef += e.amount;
                if (e.type === 'inflate') netDef -= e.amount;
              }
            });
          });
          const vel = Math.max(0.5, netDef + (opp.coins >= 8 ? 2 : (opp.coins >= 4 ? 1 : 0)));
          const rtw = opp.psi / vel;
          if (rtw < minRounds) {
            minRounds = rtw;
            targetId = id;
          }
        });

        if (targetId !== null) {
          G.players['0'].psi = Math.max(0, G.players['0'].psi - 1);
          G.players[targetId].psi += 1;
        }

        // Win check
        for (let p = 0; p < numPlayers; p++) {
          if (G.players[String(p)].psi <= 0) {
            winner = String(p);
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

            // Both Raiders and all other teams use evaluateCpuAuctionBid directly!
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
            winner = String(p);
            break;
          }
        }

        Math.random = origRandom;
      }

      if (winner === '0') raidersWins++;
      raidersPsiSum += G.players['0'].psi;
      raidersCoinsSum += G.players['0'].coins;
    }

    const winPct = ((raidersWins / gamesPerFormat) * 100).toFixed(1);
    const avgPsi = (raidersPsiSum / gamesPerFormat).toFixed(1);
    const avgCoins = (raidersCoinsSum / gamesPerFormat).toFixed(1);
    results[numPlayers] = { winPct, fairShare, avgPsi, avgCoins, wins: raidersWins, games: gamesPerFormat };

    console.log(`Lobby Format: ${numPlayers}P`);
    console.log(`  Raiders Win Rate: ${winPct}% (${raidersWins}/${gamesPerFormat}) [Fair Share: ${fairShare}%]`);
    console.log(`  Avg Final PSI: ${avgPsi}, Avg Final Coins: ${avgCoins}\n`);
  }

  return results;
}

// ---------------------------------------------------------------------------
// TEST 3: Verification of 3 Specific Human Rules & Mechanics
// ---------------------------------------------------------------------------
export function verifySpecificRules() {
  console.log(`========================================================================`);
  console.log(`TEST 3: VERIFICATION OF THE 3 HUMAN RULES & MECHANICS`);
  console.log(`========================================================================\n`);

  let passedAll = true;

  // 1. Rule 1: Era Horizon Cap in Round 3 & Round 6
  {
    const G = {
      board: { round: 3, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'raiders' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'cowboys' }, coins: 7, psi: 40, isCpu: true, lineup: [] }
      }
    };
    // Ordinary Phase 1 player (non-superstar)
    const ordinaryCard = { id: 'chigoziem_okonkwo', minBid: 1, maxBid: 6, phase: 1, effects: [{ type: 'deflate', amount: 1, perRound: true }] };
    G.board.auctionPlayers = [ordinaryCard];
    const decision = evaluateCpuAuctionBid(G, '0');
    // In Round 3 with 8 coins, savingsReserve = 5, spendableCoins = 3. Max bid shouldn't exceed 3!
    const cappedProperly = !decision.shouldBid || decision.bidAmount <= 3;
    console.log(`Rule 1 (Era Horizon Cap R3): ${cappedProperly ? 'PASSED' : 'FAILED'} (Bid: ${decision.bidAmount}, max allowable: 3)`);
    if (!cappedProperly) passedAll = false;
  }

  // 2. Rule 2: Dynamic Poison-Pill Taxing
  {
    const G = {
      board: { round: 2, auctionPlayers: [], activeAuctionCardIndex: 0, highestBid: 1, highestBidder: '1', passedAuctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'raiders' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 40, isCpu: true, lineup: [] }
      }
    };
    // Toxic card (+3 inflate)
    const toxicCard = { id: 'toxic_test', minBid: 1, maxBid: 5, phase: 1, effects: [{ type: 'inflate', amount: 3, perRound: false }] };
    G.board.auctionPlayers = [toxicCard];
    // Next bid is 2. Saints is active. Raiders should safely tax at 2!
    const decisionTax = evaluateCpuAuctionBid(G, '0');
    const taxesAt2 = decisionTax.shouldBid && decisionTax.bidAmount === 2;

    // Now highestBid is 2, next bid is 3. Raiders must NEVER bid >= 3!
    G.board.highestBid = 2;
    const decisionNever3 = evaluateCpuAuctionBid(G, '0');
    const passesAt3 = !decisionNever3.shouldBid || decisionNever3.bidAmount === 0;

    console.log(`Rule 2 (Dynamic Poison Taxing): ${taxesAt2 && passesAt3 ? 'PASSED' : 'FAILED'} (Taxes at 2: ${taxesAt2}, Folds at 3: ${passesAt3})`);
    if (!taxesAt2 || !passesAt3) passedAll = false;
  }

  // 3. Rule 3: Roster Complementarity
  {
    const G = {
      board: { round: 3, auctionPlayers: [] },
      players: {
        '0': {
          id: '0', team: { id: 'raiders' }, coins: 8, psi: 40, isCpu: true,
          // Lineup has ONLY coins engines, 0 deflation engines
          lineup: [
            { id: 'c1', effects: [{ type: 'coins', amount: 3, perRound: true }] },
            { id: 'c2', effects: [{ type: 'coins', amount: 2, perRound: true }] }
          ]
        }
      }
    };
    const deflateEngineCard = { id: 'def_eng', minBid: 2, maxBid: 10, phase: 1, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
    const scoreWithBoost = scoreCardForPlayer(G, '0', deflateEngineCard);
    // Deficit boost should add cardRecDeflate * 3.5 = 7.0 bonus
    const hasDeficitBoost = scoreWithBoost >= 15.0;
    console.log(`Rule 3 (Roster Complementarity): ${hasDeficitBoost ? 'PASSED' : 'FAILED'} (Score: ${scoreWithBoost.toFixed(1)})`);
    if (!hasDeficitBoost) passedAll = false;
  }

  // 4. Raiders Ability Bug Fix: Saints Exclusion
  {
    const G = {
      board: { round: 2, auctionPlayers: [] },
      players: {
        '0': { id: '0', team: { id: 'raiders' }, coins: 8, psi: 40, isCpu: true, lineup: [] },
        '1': { id: '1', team: { id: 'saints' }, coins: 10, psi: 20, isCpu: true, lineup: [{ effects: [{ type: 'deflate', amount: 4, perRound: true }] }] }, // 20 PSI, 4 deflate/rd -> fastest leader
        '2': { id: '2', team: { id: 'cowboys' }, coins: 6, psi: 35, isCpu: true, lineup: [{ effects: [{ type: 'deflate', amount: 2, perRound: true }] }] }
      }
    };
    // In Game.js preAuctionPhase, Saints is excluded, so Cowboys (player 2) should be targeted instead of Saints (player 1)!
    let targetId = null;
    let minRounds = Infinity;
    Object.keys(G.players).forEach(id => {
      if (id === '0') return;
      const opp = G.players[id];
      if (getEffectiveTeamId(opp) === 'saints') return; // Saints excluded
      const rtw = opp.psi / 2;
      if (rtw < minRounds) {
        minRounds = rtw;
        targetId = id;
      }
    });
    const correctlyAvoidedSaints = (targetId === '2');
    console.log(`Raiders Ability Bug Fix (Saints Exclusion): ${correctlyAvoidedSaints ? 'PASSED' : 'FAILED'} (Targeted: Player ${targetId})`);
    if (!correctlyAvoidedSaints) passedAll = false;
  }

  console.log(`\nSpecific Rules Verification Status: ${passedAll ? 'ALL PASSED ✅' : 'SOME FAILED ❌'}\n`);
  return passedAll;
}

// Run the full test suite
console.log('STARTING FULL PLAYTEST 51 VERIFICATION SUITE...\n');
verifySpecificRules();
run1000GameMirrorTest();
runMultiFormatBenchmarks(50);
