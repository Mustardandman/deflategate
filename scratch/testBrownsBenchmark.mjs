import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function mulberry32(a) {
  let s = a >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fisherYates(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function evaluateBrowns(candidateGenome, numGames = 200, numPlayers = 7, baseSeed = 10000) {
  let wins = 0;
  let psiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoinsR1to5 = 0;
  let totalRoundsR1to5 = 0;
  let roundsWithZeroCoinsTotal = 0;
  let totalRounds = 0;
  let coinsEndRoundSum = 0;
  let coinsAtRound5End = 0;
  let cardsWonPerGame = 0;
  let deflationCardsWonPerGame = 0;
  let uselessCoinCardsWonPerGame = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 47);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'browns').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'browns' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = (i === 0) ? { ...candidateGenome } : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      }

      const brownsPlayer = G.players['0'];

      for (let r = 1; r <= 10; r++) {
        G.board.round = r;
        G.board.firstPlayer = String((r - 1) % numPlayers);
        G.board.nominator = G.board.firstPlayer;

        Object.values(G.players).forEach(p => {
          p.hasWonAuction = false;
          p.cardsWonThisRound = 0;
          p.outbidCount = 0;
        });

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
            const nomIdx = chooseCpuNominationCard(G, nominatorId);
            if (nomIdx === -1 || !G.board.auctionPlayers[nomIdx]) {
              const eligible = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (eligible.length === 0) break;
              G.board.nominator = eligible[0];
              continue;
            }
            G.board.activeAuctionCardIndex = nomIdx;
            const nominatedCard = G.board.auctionPlayers[nomIdx];
            G.board.highestBid = nominatedCard.minBid;
            G.board.highestBidder = nominatorId;
            G.board.passedAuctionPlayers = [];
          }

          const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
          if (!card) break;

          let biddingSafety = 0;
          while (biddingSafety++ < 40) {
            const eligibleBidders = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
            const activeBidders = eligibleBidders.filter(id => !G.board.passedAuctionPlayers?.includes(id));
            if (activeBidders.length <= 1) {
              const winPlayerId = G.board.highestBidder || activeBidders[0] || nominatorId;
              const isMax = G.board.highestBid >= (card.maxBid + (G.board.activeEvent?.maxAdd || 0));
              resolveAuctionWin(G, winPlayerId, card, isMax);
              if (winPlayerId === '0') {
                cardsWonPerGame++;
                const hasDeflate = card.effects?.some(e => e.type === 'deflate');
                const hasCoinsOnly = card.effects?.every(e => e.type === 'coins');
                if (hasDeflate) deflationCardsWonPerGame++;
                if (hasCoinsOnly) uselessCoinCardsWonPerGame++;
              }

              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
              const nextNom = eligibleBidders.find(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (nextNom) G.board.nominator = nextNom;
              break;
            }

            let anyoneBid = false;
            for (const bidderId of activeBidders) {
              if (bidderId === G.board.highestBidder) continue;
              const nextBid = G.board.highestBid + 1;
              const bPlayer = G.players[bidderId];
              if (bPlayer.coins < nextBid) {
                G.board.passedAuctionPlayers.push(bidderId);
                continue;
              }
              const decision = evaluateCpuAuctionBid(G, bidderId);
              if (decision.shouldBid && decision.bidAmount >= nextBid) {
                G.board.highestBid = decision.bidAmount;
                G.board.highestBidder = bidderId;
                anyoneBid = true;

                const effMax = card.maxBid + (G.board.activeEvent?.maxAdd || 0);
                if (decision.bidAmount >= effMax) {
                  resolveAuctionWin(G, bidderId, card, true);
                  if (bidderId === '0') {
                    cardsWonPerGame++;
                    const hasDeflate = card.effects?.some(e => e.type === 'deflate');
                    const hasCoinsOnly = card.effects?.every(e => e.type === 'coins');
                    if (hasDeflate) deflationCardsWonPerGame++;
                    if (hasCoinsOnly) uselessCoinCardsWonPerGame++;
                  }
                  G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
                  G.board.activeAuctionCardIndex = null;
                  G.board.highestBid = 0;
                  G.board.highestBidder = null;
                  G.board.passedAuctionPlayers = [];
                  const nextNom = eligibleBidders.find(id => id !== bidderId && (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
                  if (nextNom) G.board.nominator = nextNom;
                  break;
                }
                break;
              } else {
                G.board.passedAuctionPlayers.push(bidderId);
              }
            }
            if (!anyoneBid && G.board.activeAuctionCardIndex !== null) {
              const winPlayerId = G.board.highestBidder || activeBidders[0] || nominatorId;
              const isMax = G.board.highestBid >= (card.maxBid + (G.board.activeEvent?.maxAdd || 0));
              resolveAuctionWin(G, winPlayerId, card, isMax);
              if (winPlayerId === '0') {
                cardsWonPerGame++;
                const hasDeflate = card.effects?.some(e => e.type === 'deflate');
                const hasCoinsOnly = card.effects?.every(e => e.type === 'coins');
                if (hasDeflate) deflationCardsWonPerGame++;
                if (hasCoinsOnly) uselessCoinCardsWonPerGame++;
              }
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
              const nextNom = eligibleBidders.find(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (nextNom) G.board.nominator = nextNom;
              break;
            }
          }
        }

        if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
          DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        totalRounds++;
        coinsEndRoundSum += brownsPlayer.coins;
        if (brownsPlayer.coins === 0) roundsWithZeroCoinsTotal++;
        if (r <= 5) {
          totalRoundsR1to5++;
          if (brownsPlayer.coins === 0) roundsWithZeroCoinsR1to5++;
          if (r === 5) coinsAtRound5End += brownsPlayer.coins;
        }

        if (DeflategateGame.phases.refreshPhase?.onBegin) {
          DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
        if (winners.length > 0) {
          let bestId = winners[0];
          let bestPsi = G.players[bestId].psi;
          for (const wid of winners) {
            if (G.players[wid].psi < bestPsi) {
              bestPsi = G.players[wid].psi;
              bestId = wid;
            }
          }
          if (bestId === '0') {
            wins++;
            winRounds.push(r);
          }
          break;
        }
      }

      psiSum += brownsPlayer.psi;
    } finally {
      Math.random = origRandom;
    }
  }

  const winRateNum = (wins / numGames) * 100;
  return {
    wins,
    numGames,
    winRateNum,
    winRate: winRateNum.toFixed(1) + '%',
    avgPsi: (psiSum / numGames).toFixed(2),
    avgWinRound: winRounds.length > 0 ? (winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(1) : 'N/A',
    avgCardsWon: (cardsWonPerGame / numGames).toFixed(2),
    avgDeflateCardsWon: (deflationCardsWonPerGame / numGames).toFixed(2),
    avgUselessCoinsWon: (uselessCoinCardsWonPerGame / numGames).toFixed(2),
    pctZeroCoinsR1to5: ((roundsWithZeroCoinsR1to5 / totalRoundsR1to5) * 100).toFixed(1) + '%',
    pctZeroCoinsTotal: ((roundsWithZeroCoinsTotal / totalRounds) * 100).toFixed(1) + '%',
    avgCoinsR5BeforeBonus: (coinsAtRound5End / numGames).toFixed(2)
  };
}

console.log('=== Benchmarking Current Browns CPU ===');
const currentGenome = ACTIVE_TEAM_GENOMES.browns;
console.log('Current Genome:', currentGenome);
const res7P = evaluateBrowns(currentGenome, 200, 7, 2026);
const res10P = evaluateBrowns(currentGenome, 200, 10, 2026);
console.log('\n7-Player Results (200 games):', res7P);
console.log('\n10-Player Results (200 games):', res10P);
