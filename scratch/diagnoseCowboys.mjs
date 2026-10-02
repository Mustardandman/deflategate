import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, resolveAuctionWin, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
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

export function runCowboysDiagnosis(gamesCount = 100, numPlayers = 7) {
  const baseSeed = 54321;
  let cowboysWins = 0;
  let totalFinalPsi = 0;
  let totalRounds = 0;
  let totalAcquisitions = 0;
  const cardWins = {};

  for (let g = 0; g < gamesCount; g++) {
    const rng = mulberry32(baseSeed + g * 101 + numPlayers * 19);
    const origRandom = Math.random;
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'cowboys'), rng);
    const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');

    G.players['0'].team = { ...cowboysTeam };
    G.players['0'].psi = cowboysTeam.initialPsi;
    G.players['0'].coins = cowboysTeam.coins;
    G.players['0'].isCpu = true;
    G.players['0'].genome = { ...(ACTIVE_TEAM_GENOMES.cowboys || DEFAULT_GENOME) };
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
    let roundLimit = 12;

    while (G.board.round <= roundLimit && !winner) {
      if (DeflategateGame.phases.eventPhase?.onBegin) {
        DeflategateGame.phases.eventPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }
      G.board.eventConfirmed = true;

      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi <= 0) {
          winner = String(p);
          break;
        }
      }
      if (winner) break;

      // Populate board
      G.board.auctionPlayers = [];
      for (let c = 0; c < numPlayers; c++) {
        if (G.decks.activePlayers.length > 0) {
          G.board.auctionPlayers.push(G.decks.activePlayers.pop());
        }
      }

      const maxWinsThisRound = 1;
      Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; p.hasWonAuction = false; });
      G.board.activeAuctionCardIndex = null;
      G.board.highestBid = 0;
      G.board.highestBidder = null;
      G.board.passedAuctionPlayers = [];

      let auctionSafety = 0;
      while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
        const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
        if (remainingBoardCards === 0) break;

        const nominatorId = String(G.board.nominator);
        let nomCardIdx = chooseCpuNominationCard(G, nominatorId);
        if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
          nomCardIdx = G.board.auctionPlayers.findIndex(c => c !== null);
          if (nomCardIdx === -1) break;
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
          if (winningPlayerId === '0') {
            totalAcquisitions++;
            cardWins[wonCard.id] = (cardWins[wonCard.id] || 0) + 1;
          }
        }

        G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.nominator = (Number(nominatorId) + 1) % numPlayers;
      }

      // Refresh Phase
      if (DeflategateGame.phases.refreshPhase?.onBegin) {
        DeflategateGame.phases.refreshPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }

      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi <= 0) {
          winner = String(p);
          break;
        }
      }

      G.board.round++;
    }

    Math.random = origRandom;
    if (winner === '0') cowboysWins++;
    totalFinalPsi += G.players['0'].psi;
    totalRounds += G.board.round - 1;
  }

  const winRate = ((cowboysWins / gamesCount) * 100).toFixed(1);
  const avgFinalPsi = (totalFinalPsi / gamesCount).toFixed(2);
  const avgRounds = (totalRounds / gamesCount).toFixed(1);

  console.log(`\n========================================================================`);
  console.log(`COWBOYS DIAGNOSTIC BASELINE (${gamesCount} Games, ${numPlayers}P)`);
  console.log(`========================================================================`);
  console.log(`Win Rate: ${winRate}% (Fair Share: ${(100 / numPlayers).toFixed(1)}%)`);
  console.log(`Avg Final PSI: ${avgFinalPsi} (Starting: 42 PSI)`);
  console.log(`Avg Rounds Per Game: ${avgRounds}`);
  console.log(`Total Cards Acquired: ${totalAcquisitions} (${(totalAcquisitions / gamesCount).toFixed(1)} per game)`);
  console.log(`Top 8 Cards Acquired:`, Object.entries(cardWins).sort((a, b) => b[1] - a[1]).slice(0, 8));

  return { winRate, avgFinalPsi };
}

runCowboysDiagnosis(100, 7);
runCowboysDiagnosis(100, 4);
runCowboysDiagnosis(100, 10);
