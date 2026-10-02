import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

export function fisherYates(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function simulateBroncos(candidateGenome = null, gamesToPlay = 100, numPlayers = 7, baseSeed = 54321) {
  let broncosWins = 0;
  let totalPsi = 0;
  let totalEndingCoins = 0;
  let draftedCards = {};
  let totalRoundsPlayed = 0;

  for (let g = 0; g < gamesToPlay; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'broncos').map(t => t.id), rng);
    for (let i = 0; i < numPlayers; i++) {
      const seat = String(i);
      const teamId = (i === 0) ? 'broncos' : availableTeams[i - 1];
      const t = TEAMS.find(item => item.id === teamId);
      const p = G.players[seat];
      p.team = t;
      p.psi = t.initialPsi;
      p.coins = t.coins;
      p.isCpu = true;
      p.genome = (i === 0 && candidateGenome) ? { ...candidateGenome } : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      p.lineup = [];
      const psCount = t.id === 'seahawks' ? 4 : (t.id === 'colts' ? 3 : 3);
      for (let ps = 0; ps < psCount; ps++) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
      }
    }

    const broncosPlayer = G.players['0'];
    let roundsPlayedThisGame = 0;

    for (let r = 1; r <= 10; r++) {
      roundsPlayedThisGame = r;
      G.board.round = r;
      G.board.firstPlayer = String((r - 1) % numPlayers);
      G.board.nominator = G.board.firstPlayer;

      if (DeflategateGame.phases.eventPhase?.onBegin) {
        DeflategateGame.phases.eventPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }

      G.board.pendingRivalry = null;
      G.board.pendingTradeRumors = null;
      G.board.bonusAuction = null;
      G.board.pendingFreeAgency = null;
      G.board.eventConfirmed = true;

      if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
        DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }

      const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

      let auctionSafety = 0;
      while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
        const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
        if (remainingBoardCards === 0) break;

        const nominatorId = String(G.board.nominator);
        if (G.board.activeAuctionCardIndex === null) {
          const nomCardIdx = chooseCpuNominationCard(G, nominatorId);
          if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
            const firstValid = G.board.auctionPlayers.findIndex(c => c !== null);
            if (firstValid === -1) break;
            G.board.activeAuctionCardIndex = firstValid;
          } else {
            G.board.activeAuctionCardIndex = nomCardIdx;
          }

          const activeCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
          G.board.highestBid = activeCard.minBid;
          G.board.highestBidder = nominatorId;
          G.board.passedAuctionPlayers = [];
        }

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
        const winningBid = G.board.highestBid;
        const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];

        if (winningPlayerId && wonCard) {
          resolveAuctionWin(G, winningPlayerId, wonCard, winningBid);
          if (winningPlayerId === '0') {
            draftedCards[wonCard.name] = (draftedCards[wonCard.name] || 0) + 1;
          }
        }

        G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.passedAuctionPlayers = [];

        const activeRemaining = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
        if (activeRemaining.length > 0) {
          const currentNomIdx = activeRemaining.indexOf(String(G.board.nominator));
          const nextNom = activeRemaining[(currentNomIdx + 1) % activeRemaining.length];
          if (nextNom) G.board.nominator = nextNom;
        }
      }

      if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
        DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }

      if (DeflategateGame.phases.refreshPhase?.onBegin) {
        DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }
      if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
        DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
      } else {
        Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; });
      }

      const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
      if (winners.length > 0) {
        let bestId = winners[0];
        let bestPsi = G.players[bestId].psi;
        for (let w = 1; w < winners.length; w++) {
          if (G.players[winners[w]].psi < bestPsi) {
            bestId = winners[w];
            bestPsi = G.players[bestId].psi;
          }
        }
        if (bestId === '0') {
          broncosWins++;
        }
        break;
      }
    }

    totalPsi += broncosPlayer.psi;
    totalEndingCoins += broncosPlayer.coins;
    totalRoundsPlayed += roundsPlayedThisGame;
    Math.random = origRandom;
  }

  const winRate = (broncosWins / gamesToPlay) * 100;
  const avgPsi = (totalPsi / gamesToPlay).toFixed(1);
  const avgCoins = (totalEndingCoins / gamesToPlay).toFixed(1);
  const avgRounds = (totalRoundsPlayed / gamesToPlay).toFixed(1);

  console.log(`\n========================================`);
  console.log(`BRONCOS BENCHMARK (${gamesToPlay} Games, ${numPlayers}P)`);
  console.log(`Win Rate: ${winRate.toFixed(1)}% (Fair share: ${(100 / numPlayers).toFixed(1)}%)`);
  console.log(`Avg Ending PSI: ${avgPsi}`);
  console.log(`Avg Ending Coins: ${avgCoins}`);
  console.log(`Avg Rounds: ${avgRounds}`);
  console.log(`Top Cards Won by Broncos:`);
  Object.entries(draftedCards)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([name, count]) => {
      console.log(`  - ${name}: ${count} (${((count / gamesToPlay) * 100).toFixed(0)}%)`);
    });
  console.log(`========================================\n`);

  return { winRate, avgPsi, avgCoins };
}

simulateBroncos(null, 100, 7, 54321);
simulateBroncos(null, 100, 10, 54321);
