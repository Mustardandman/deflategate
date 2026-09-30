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

export function simulateBrowns(candidateGenome, numGames = 250, numPlayers = 7, baseSeed = 55000) {
  let wins = 0;
  let psiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoinsR1to4 = 0;
  let totalRoundsR1to4 = 0;
  let cardsWonSum = 0;
  let deflateCardsWonSum = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
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
              cardsWonSum++;
              if (wonCard.effects?.some(e => e.type === 'deflate')) {
                deflateCardsWonSum++;
              }
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

        if (r <= 4) {
          totalRoundsR1to4++;
          if (brownsPlayer.coins === 0) roundsWithZeroCoinsR1to4++;
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

  const winRate = (wins / numGames) * 100;
  return {
    wins,
    numGames,
    winRate: Number(winRate.toFixed(2)),
    avgPsi: Number((psiSum / numGames).toFixed(2)),
    avgWinRound: winRounds.length > 0 ? Number((winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(2)) : null,
    pctZeroCoinsR1to4: Number(((roundsWithZeroCoinsR1to4 / totalRoundsR1to4) * 100).toFixed(1)),
    avgDeflateCardsWon: Number((deflateCardsWonSum / numGames).toFixed(2))
  };
}

// -------------------------------------------------------------
// Tournament Sweep Candidates
// -------------------------------------------------------------
const BASE = { ...ACTIVE_TEAM_GENOMES.browns, coinWeight: 0.0 };

const candidates = [
  { name: 'Cand 0: Current Evolved', genome: { ...BASE } },
  { name: 'Cand 1: Zero Reserve (R0)', genome: { ...BASE, reserveCoins: 0 } },
  { name: 'Cand 2: Lean Reserve (R1)', genome: { ...BASE, reserveCoins: 1 } },
  { name: 'Cand 3: Mod Reserve (R2)', genome: { ...BASE, reserveCoins: 2 } },
  { name: 'Cand 4: High Aggression (1.20, R1)', genome: { ...BASE, aggression: 1.20, reserveCoins: 1 } },
  { name: 'Cand 5: High Deflate (4.50, R1)', genome: { ...BASE, deflateWeight: 4.50, reserveCoins: 1 } },
  { name: 'Cand 6: High Deflate (5.00, R0)', genome: { ...BASE, deflateWeight: 5.00, reserveCoins: 0 } },
  { name: 'Cand 7: Aggressive Closer (Sub5=3.0, R1)', genome: { ...BASE, sub5UrgencyBonus: 3.0, reserveCoins: 1 } },
  { name: 'Cand 8: Superstar Dominance (SS=1.70, R1)', genome: { ...BASE, superstarPriorityMult: 1.70, reserveCoins: 1 } },
  { name: 'Cand 9: First Claim Bully (FCA=1.35, R1)', genome: { ...BASE, firstClaimAggression: 1.35, reserveCoins: 1 } },
  { name: 'Cand 10: Price Bumper (Bump=0.28, R1)', genome: { ...BASE, priceBumpProb: 0.28, reserveCoins: 1 } },
  { name: 'Cand 11: Pure Aggressor Hybrid', genome: { ...BASE, deflateWeight: 4.40, aggression: 1.18, reserveCoins: 1, superstarPriorityMult: 1.60, sub5UrgencyBonus: 2.80, priceBumpProb: 0.22 } },
  { name: 'Cand 12: Zero-Reserve Maximalist', genome: { ...BASE, deflateWeight: 4.50, aggression: 1.22, reserveCoins: 0, superstarPriorityMult: 1.65, sub5UrgencyBonus: 3.00, priceBumpProb: 0.20 } }
];

console.log('================================================================');
console.log('  CLEVELAND BROWNS COMPREHENSIVE FINE-TUNING SWEEP (6,500 MATCHES)');
console.log('================================================================\n');

const results = [];
const GAMES_PER_TEST = 250; // 250 in 7P + 250 in 10P = 500 games per candidate = 6,500 games total

for (let i = 0; i < candidates.length; i++) {
  const { name, genome } = candidates[i];
  process.stdout.write(`Testing [${i + 1}/${candidates.length}] ${name}... `);

  const res7P = simulateBrowns(genome, GAMES_PER_TEST, 7, 70000 + i * 1000);
  const res10P = simulateBrowns(genome, GAMES_PER_TEST, 10, 80000 + i * 1000);

  const combinedWinRate = Number(((res7P.winRate + res10P.winRate) / 2).toFixed(2));
  const combinedAvgPsi = Number(((res7P.avgPsi + res10P.avgPsi) / 2).toFixed(2));

  results.push({
    name,
    genome,
    combinedWinRate,
    combinedAvgPsi,
    winRate7P: res7P.winRate,
    winRate10P: res10P.winRate,
    avgPsi7P: res7P.avgPsi,
    avgPsi10P: res10P.avgPsi,
    pctZeroCoinsR1to4_7P: res7P.pctZeroCoinsR1to4,
    pctZeroCoinsR1to4_10P: res10P.pctZeroCoinsR1to4
  });

  console.log(`Combined Win Rate: ${combinedWinRate}% | 7P: ${res7P.winRate}%, 10P: ${res10P.winRate}%, Avg PSI: ${combinedAvgPsi}`);
}

results.sort((a, b) => b.combinedWinRate - a.combinedWinRate || a.combinedAvgPsi - b.combinedAvgPsi);

console.log('\n================================================================');
console.log('                     FINAL LEADERBOARD');
console.log('================================================================');
console.table(results.map(r => ({
  Name: r.name,
  'Combined WR': r.combinedWinRate + '%',
  '7P WR': r.winRate7P + '%',
  '10P WR': r.winRate10P + '%',
  'Avg PSI': r.combinedAvgPsi
})));

console.log('\nTop 3 Genomes:');
for (let k = 0; k < Math.min(3, results.length); k++) {
  console.log(`\n#${k + 1}: ${results[k].name}`);
  console.log(JSON.stringify(results[k].genome, null, 2));
}
