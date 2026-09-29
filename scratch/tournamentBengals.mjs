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

export function evaluateBengalsGenome(candidateGenome, numGames = 100, numPlayers = 7, baseSeed = 9000) {
  let bengalsWins = 0;
  let bengalsPsiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoins = 0;
  let totalRounds = 0;
  let averageCoinsEndRound = 0;
  let instantCardsWon = 0;
  let cardsDiscardedOnAcquire = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 43);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'bengals').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'bengals' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = (i === 0) ? { ...candidateGenome } : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      }

      const bengalsPlayer = G.players['0'];

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
              
              const discardLenBefore = (G.decks.discard || []).length;
              resolveAuctionWin(G, winPlayerId, card, isMax);
              if (winPlayerId === '0') {
                if (card.effects?.some(e => !e.perRound)) instantCardsWon++;
                if ((G.decks.discard || []).length > discardLenBefore) cardsDiscardedOnAcquire++;
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
                  const discardLenBefore = (G.decks.discard || []).length;
                  resolveAuctionWin(G, bidderId, card, true);
                  if (bidderId === '0') {
                    if (card.effects?.some(e => !e.perRound)) instantCardsWon++;
                    if ((G.decks.discard || []).length > discardLenBefore) cardsDiscardedOnAcquire++;
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
              const discardLenBefore = (G.decks.discard || []).length;
              resolveAuctionWin(G, winPlayerId, card, isMax);
              if (winPlayerId === '0') {
                if (card.effects?.some(e => !e.perRound)) instantCardsWon++;
                if ((G.decks.discard || []).length > discardLenBefore) cardsDiscardedOnAcquire++;
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
        averageCoinsEndRound += bengalsPlayer.coins;
        if (bengalsPlayer.coins === 0) roundsWithZeroCoins++;

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
            bengalsWins++;
            winRounds.push(r);
          }
          break;
        }
      }

      bengalsPsiSum += bengalsPlayer.psi;
    } finally {
      Math.random = origRandom;
    }
  }

  return {
    winRate: (bengalsWins / numGames * 100).toFixed(1) + '%',
    avgPsi: (bengalsPsiSum / numGames).toFixed(2),
    avgWinRound: winRounds.length > 0 ? (winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(1) : 'N/A',
    avgInstantCardsWonPerGame: (instantCardsWon / numGames).toFixed(2),
    avgDiscardedOnAcquirePerGame: (cardsDiscardedOnAcquire / numGames).toFixed(2),
    avgCoins: (averageCoinsEndRound / totalRounds).toFixed(2),
    pctZeroCoins: ((roundsWithZeroCoins / totalRounds) * 100).toFixed(1) + '%'
  };
}

console.log('=== Running Bengals Tournament Calibration ===');

const baseGenome = { ...ACTIVE_TEAM_GENOMES.bengals };

const candidates = [
  { name: 'C1: Evolved Baseline (deflate 1.78, coins 1.09, recur 0.63, res 2)', genome: { ...baseGenome, deflateWeight: 1.78, coinWeight: 1.09, recurringMult: 0.63, reserveCoins: 2 } },
  { name: 'C2: Strategy B Balanced (deflate 2.2, coins 1.15, recur 1.0, res 2, agg 1.15)', genome: { ...baseGenome, deflateWeight: 2.2, coinWeight: 1.15, recurringMult: 1.0, reserveCoins: 2, aggression: 1.15 } },
  { name: 'C3: Cash Engine Builder (deflate 2.0, coins 1.3, recur 1.1, res 2, agg 1.1)', genome: { ...baseGenome, deflateWeight: 2.0, coinWeight: 1.3, recurringMult: 1.1, reserveCoins: 2, aggression: 1.1 } },
  { name: 'C4: Aggressive Nuke Hunter (deflate 2.6, coins 1.0, recur 0.9, res 1, agg 1.25)', genome: { ...baseGenome, deflateWeight: 2.6, coinWeight: 1.0, recurringMult: 0.9, reserveCoins: 1, aggression: 1.25 } },
  { name: 'C5: Hybrid Tycoon (deflate 2.3, coins 1.25, recur 1.0, res 3, agg 1.15)', genome: { ...baseGenome, deflateWeight: 2.3, coinWeight: 1.25, recurringMult: 1.0, reserveCoins: 3, aggression: 1.15 } },
  { name: 'C6: Pure Deflation Sprint (deflate 2.7, coins 0.9, recur 0.9, res 1, agg 1.2)', genome: { ...baseGenome, deflateWeight: 2.7, coinWeight: 0.9, recurringMult: 0.9, reserveCoins: 1, aggression: 1.2 } }
];

for (const c of candidates) {
  console.log(`\nEvaluating: ${c.name}`);
  const res7P = evaluateBengalsGenome(c.genome, 100, 7, 9100);
  const res10P = evaluateBengalsGenome(c.genome, 100, 10, 9100);
  console.log(`  7P: Win Rate: ${res7P.winRate} | Avg PSI: ${res7P.avgPsi} | InstWon: ${res7P.avgInstantCardsWonPerGame} | Discard: ${res7P.avgDiscardedOnAcquirePerGame} | 0-Coins: ${res7P.pctZeroCoins} | Avg Coins: ${res7P.avgCoins}`);
  console.log(` 10P: Win Rate: ${res10P.winRate} | Avg PSI: ${res10P.avgPsi} | InstWon: ${res10P.avgInstantCardsWonPerGame} | Discard: ${res10P.avgDiscardedOnAcquirePerGame} | 0-Coins: ${res10P.pctZeroCoins} | Avg Coins: ${res10P.avgCoins}`);
}
