import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults } from '../src/Game.js';
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

const CANDIDATES = {
  'A_Baseline': {
    deflateWeight: 1.6, coinWeight: 1.1, recurringMult: 1.0, aggression: 1.0,
    reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.1,
    postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0,
    boardStrengthWeight: 1.2, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2
  },
  'B_DeflationRusher': {
    deflateWeight: 2.4, coinWeight: 0.8, recurringMult: 1.1, aggression: 1.15,
    reserveCoins: 1, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.2,
    postClaimAggression: 0.9, sub5UrgencyBonus: 2.5, richestBuffer: 1, instantMaxBidAggression: 1.1,
    boardStrengthWeight: 1.2, threatDefenseWeight: 1.1, superstarPriorityMult: 1.35
  },
  'C_BalancedCloser': {
    deflateWeight: 2.1, coinWeight: 1.0, recurringMult: 1.1, aggression: 1.1,
    reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.5, firstClaimAggression: 1.2,
    postClaimAggression: 0.9, sub5UrgencyBonus: 2.2, richestBuffer: 1, instantMaxBidAggression: 1.05,
    boardStrengthWeight: 1.2, threatDefenseWeight: 1.1, superstarPriorityMult: 1.3
  },
  'D_HighDeflation': {
    deflateWeight: 2.7, coinWeight: 0.7, recurringMult: 1.15, aggression: 1.2,
    reserveCoins: 1, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.25,
    postClaimAggression: 0.95, sub5UrgencyBonus: 2.8, richestBuffer: 1, instantMaxBidAggression: 1.15,
    boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.4
  },
  'E_ConservativeTycoon': {
    deflateWeight: 1.8, coinWeight: 1.2, recurringMult: 1.0, aggression: 0.95,
    reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.05,
    postClaimAggression: 0.85, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0,
    boardStrengthWeight: 1.2, threatDefenseWeight: 1.0, superstarPriorityMult: 1.25
  },
  'F_SuperstarPredator': {
    deflateWeight: 2.3, coinWeight: 0.9, recurringMult: 1.2, aggression: 1.2,
    reserveCoins: 2, priceBumpProb: 0.25, synergyBonus: 1.5, firstClaimAggression: 1.3,
    postClaimAggression: 0.95, sub5UrgencyBonus: 2.4, richestBuffer: 1, instantMaxBidAggression: 1.1,
    boardStrengthWeight: 1.3, threatDefenseWeight: 1.1, superstarPriorityMult: 1.5
  }
};

function runCandidateTest(candidateKey, genome, numGames = 100, numPlayers = 7, baseSeed = 5000) {
  let wins = 0;
  let psiSum = 0;
  let winRounds = [];
  let abilityTriggerRounds = 0;
  let totalRounds = 0;
  let coinsEndRound = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'ravens').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'ravens' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = (i === 0) ? genome : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      }

      const ravPlayer = G.players['0'];

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
              resolveAuctionWin(G, winPlayerId, card);
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
              const decision = evaluateCpuAuctionBid(G, bidderId, card, nextBid);
              if (decision.shouldBid && decision.bidAmount >= nextBid) {
                G.board.highestBid = decision.bidAmount;
                G.board.highestBidder = bidderId;
                anyoneBid = true;
                break;
              } else {
                G.board.passedAuctionPlayers.push(bidderId);
              }
            }
            if (!anyoneBid) {
              const winPlayerId = G.board.highestBidder || activeBidders[0] || nominatorId;
              resolveAuctionWin(G, winPlayerId, card);
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

        // Check Ravens position counts
        const nonPs = ravPlayer.lineup.filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
        const distinctPos = new Set(nonPs.map(c => c.position).filter(pos => ['QB', 'RB', 'WR', 'TE'].includes(pos)));
        totalRounds++;
        coinsEndRound += ravPlayer.coins;
        if (distinctPos.size >= 3) {
          abilityTriggerRounds++;
        }

        // Refresh Phase
        if (DeflategateGame.phases.refreshPhase?.onBegin) {
          DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        // Check for winner
        const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
        if (winners.length > 0) {
          winners.sort((a, b) => G.players[a].psi - G.players[b].psi);
          G.winner = winners[0];
          break;
        }
      }

      if (G.winner === '0') {
        wins++;
        winRounds.push(G.board.round);
      }
      psiSum += ravPlayer.psi;
    } finally {
      Math.random = origRandom;
    }
  }

  return {
    candidate: candidateKey,
    numPlayers,
    numGames,
    winRate: ((wins / numGames) * 100).toFixed(1) + '%',
    avgPsi: (psiSum / numGames).toFixed(2),
    avgWinRound: winRounds.length > 0 ? (winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(1) : 'N/A',
    abilityTriggerPct: ((abilityTriggerRounds / totalRounds) * 100).toFixed(1) + '%',
    avgCoins: (coinsEndRound / totalRounds).toFixed(2)
  };
}

console.log('=== Ravens Optimization Tournament (6 Genomes x 200 Games each: 100 7P + 100 10P) ===\n');

const results = [];
for (const [key, genome] of Object.entries(CANDIDATES)) {
  const r7 = runCandidateTest(key, genome, 100, 7, 6000);
  const r10 = runCandidateTest(key, genome, 100, 10, 7000);
  const totalWins = (parseFloat(r7.winRate) + parseFloat(r10.winRate)) / 2;
  results.push({
    candidate: key,
    winRate7P: r7.winRate,
    winRate10P: r10.winRate,
    combinedWinRate: totalWins.toFixed(1) + '%',
    avgPsi7P: r7.avgPsi,
    avgPsi10P: r10.avgPsi,
    abilityTriggerPct: r7.abilityTriggerPct,
    avgWinRound: r7.avgWinRound
  });
}

console.table(results);
