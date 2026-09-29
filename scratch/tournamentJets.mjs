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

export function evaluateJetsGenome(candidateGenome, numGames = 100, numPlayers = 7, baseSeed = 8000) {
  let jetsWins = 0;
  let jetsPsiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoins = 0;
  let totalRounds = 0;
  let averageCoinsEndRound = 0;
  let maxBidsCount = 0;
  let gamesNeverTriggered = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    let gameMaxBids = 0;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      // Force Seat 0 to be Jets with candidate genome
      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'jets').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'jets' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = (i === 0) ? { ...candidateGenome } : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      }

      const jetsPlayer = G.players['0'];

      for (let r = 1; r <= 10; r++) {
        G.board.round = r;
        G.board.firstPlayer = String((r - 1) % numPlayers);
        G.board.nominator = G.board.firstPlayer;

        Object.values(G.players).forEach(p => {
          p.hasWonAuction = false;
          p.cardsWonThisRound = 0;
          p.outbidCount = 0;
        });

        // Event Phase
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

        // Pre-Auction
        if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
          DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

        // Auction Phase
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
              if (winPlayerId === '0' && isMax) gameMaxBids++;
              resolveAuctionWin(G, winPlayerId, card, isMax);
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

                // Max bid instant resolution
                const effMax = card.maxBid + (G.board.activeEvent?.maxAdd || 0);
                if (decision.bidAmount >= effMax) {
                  if (bidderId === '0') gameMaxBids++;
                  resolveAuctionWin(G, bidderId, card, true);
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
              if (winPlayerId === '0' && isMax) gameMaxBids++;
              resolveAuctionWin(G, winPlayerId, card, isMax);
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

        // Post-Auction Cleanup
        if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
          DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        totalRounds++;
        averageCoinsEndRound += jetsPlayer.coins;
        if (jetsPlayer.coins === 0) roundsWithZeroCoins++;

        // Refresh Phase
        if (DeflategateGame.phases.refreshPhase?.onBegin) {
          DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        // Check for winner
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
            jetsWins++;
            winRounds.push(r);
          }
          break;
        }
      }

      jetsPsiSum += jetsPlayer.psi;
      maxBidsCount += gameMaxBids;
      if (gameMaxBids === 0) gamesNeverTriggered++;
    } finally {
      Math.random = origRandom;
    }
  }

  return {
    winRate: (jetsWins / numGames * 100).toFixed(1) + '%',
    avgPsi: (jetsPsiSum / numGames).toFixed(2),
    avgWinRound: winRounds.length > 0 ? (winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(1) : 'N/A',
    avgMaxBidsPerGame: (maxBidsCount / numGames).toFixed(2),
    avgCoins: (averageCoinsEndRound / totalRounds).toFixed(2),
    pctZeroCoins: ((roundsWithZeroCoins / totalRounds) * 100).toFixed(1) + '%'
  };
}

console.log('=== Running Jets Tournament Calibration ===');

const baseGenome = { ...ACTIVE_TEAM_GENOMES.jets };

const candidates = [
  { name: 'C1: Deflate 2.0, Gap 3, Res 1, Agg 1.2', genome: { ...baseGenome, deflateWeight: 2.0, jetsMaxBidGap: 3, reserveCoins: 1, aggression: 1.2 } },
  { name: 'C2: Deflate 2.4, Gap 3, Res 0, Agg 1.25', genome: { ...baseGenome, deflateWeight: 2.4, jetsMaxBidGap: 3, reserveCoins: 0, aggression: 1.25 } },
  { name: 'C3: Deflate 2.4, Gap 2, Res 1, Agg 1.2', genome: { ...baseGenome, deflateWeight: 2.4, jetsMaxBidGap: 2, reserveCoins: 1, aggression: 1.2 } },
  { name: 'C4: Deflate 2.4, Gap 4, Res 0, Agg 1.25', genome: { ...baseGenome, deflateWeight: 2.4, jetsMaxBidGap: 4, reserveCoins: 0, aggression: 1.25 } },
  { name: 'C5: Deflate 2.8, Gap 3, Res 0, Agg 1.2', genome: { ...baseGenome, deflateWeight: 2.8, jetsMaxBidGap: 3, reserveCoins: 0, aggression: 1.2 } },
  { name: 'C6: Deflate 2.6, Gap 3, Res 1, Agg 1.15', genome: { ...baseGenome, deflateWeight: 2.6, jetsMaxBidGap: 3, reserveCoins: 1, aggression: 1.15 } }
];

for (const c of candidates) {
  console.log(`\nEvaluating: ${c.name}`);
  const res7P = evaluateJetsGenome(c.genome, 100, 7, 8500);
  const res10P = evaluateJetsGenome(c.genome, 100, 10, 8500);
  console.log(`  7P: Win Rate: ${res7P.winRate} | Avg PSI: ${res7P.avgPsi} | MaxBids: ${res7P.avgMaxBidsPerGame} | 0-Coins: ${res7P.pctZeroCoins} | Avg Coins: ${res7P.avgCoins}`);
  console.log(` 10P: Win Rate: ${res10P.winRate} | Avg PSI: ${res10P.avgPsi} | MaxBids: ${res10P.avgMaxBidsPerGame} | 0-Coins: ${res10P.pctZeroCoins} | Avg Coins: ${res10P.avgCoins}`);
}
