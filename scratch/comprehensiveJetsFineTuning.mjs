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

export function simulateJets(candidateGenome, numGames = 300, numPlayers = 7, baseSeed = 55000) {
  let wins = 0;
  let psiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoins = 0;
  let totalRounds = 0;
  let averageCoinsEndRound = 0;
  let maxBidsCount = 0;

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
              if (winPlayerId === '0' && isMax) gameMaxBids++;

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
                  if (bidderId === '0') gameMaxBids++;
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
              if (winPlayerId === '0' && isMax) gameMaxBids++;
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
        averageCoinsEndRound += jetsPlayer.coins;
        if (jetsPlayer.coins === 0) roundsWithZeroCoins++;

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

      psiSum += jetsPlayer.psi;
      maxBidsCount += gameMaxBids;
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
    avgMaxBids: (maxBidsCount / numGames).toFixed(2),
    avgCoins: (averageCoinsEndRound / totalRounds).toFixed(2),
    pctZeroCoins: ((roundsWithZeroCoins / totalRounds) * 100).toFixed(1) + '%'
  };
}

async function runJetsDeepTournament() {
  console.log('========================================================================');
  console.log('   DEEP FINE-TUNING SUITE: NEW YORK JETS GENOME CALIBRATION             ');
  console.log('   Testing 12 Parameter Configurations over 7,200 Competitive Matches   ');
  console.log('========================================================================\n');

  const base = { ...ACTIVE_TEAM_GENOMES.jets };

  const candidateList = [
    {
      name: 'Baseline C3 (Current: Def 2.4, Gap 2, Res 1, Agg 1.2)',
      genome: { ...base, deflateWeight: 2.4, jetsMaxBidGap: 2, reserveCoins: 1, aggression: 1.2 }
    },
    {
      name: 'Gap-3 Baseline (Def 2.4, Gap 3, Res 1, Agg 1.2)',
      genome: { ...base, deflateWeight: 2.4, jetsMaxBidGap: 3, reserveCoins: 1, aggression: 1.2 }
    },
    {
      name: 'Gap-4 Aggressive (Def 2.4, Gap 4, Res 0, Agg 1.25)',
      genome: { ...base, deflateWeight: 2.4, jetsMaxBidGap: 4, reserveCoins: 0, aggression: 1.25 }
    },
    {
      name: 'Deflate-2.60 + Gap 3 (Sharper Deflation Rush)',
      genome: { ...base, deflateWeight: 2.6, jetsMaxBidGap: 3, reserveCoins: 1, aggression: 1.2 }
    },
    {
      name: 'Deflate-2.80 + Gap 2 (Heavy Deflation Precision Sniper)',
      genome: { ...base, deflateWeight: 2.8, jetsMaxBidGap: 2, reserveCoins: 1, aggression: 1.2 }
    },
    {
      name: 'Deflate-2.20 + Gap 3 (Patient Builder)',
      genome: { ...base, deflateWeight: 2.2, jetsMaxBidGap: 3, reserveCoins: 2, aggression: 1.15 }
    },
    {
      name: 'MaxBid-Agg-1.55 + Gap 3 (Hyper Instant Buyouts)',
      genome: { ...base, instantMaxBidAggression: 1.55, jetsMaxBidGap: 3, aggression: 1.25 }
    },
    {
      name: 'MaxBid-Agg-1.30 + Gap 2 (Disciplined Max Buyer)',
      genome: { ...base, instantMaxBidAggression: 1.30, jetsMaxBidGap: 2, aggression: 1.15 }
    },
    {
      name: 'Coin-1.15 + Recur-1.10 (Stronger Cash Engine Foundation)',
      genome: { ...base, coinWeight: 1.15, recurringMult: 1.10, jetsMaxBidGap: 3, reserveCoins: 1 }
    },
    {
      name: 'Reserve-0 All-In (reserveCoins: 0, Agg 1.25, Gap 3)',
      genome: { ...base, reserveCoins: 0, aggression: 1.25, jetsMaxBidGap: 3 }
    },
    {
      name: 'Reserve-2 Deep Bankroll (reserveCoins: 2, Agg 1.15, Gap 2)',
      genome: { ...base, reserveCoins: 2, aggression: 1.15, jetsMaxBidGap: 2 }
    },
    {
      name: 'Synthesis Champion (Def 2.50, Gap 3, Res 1, Agg 1.20, InstMax 1.45)',
      genome: { ...base, deflateWeight: 2.50, jetsMaxBidGap: 3, reserveCoins: 1, aggression: 1.20, instantMaxBidAggression: 1.45 }
    }
  ];

  const GAMES_PER_TEST = 300;
  console.log(`Running ${candidateList.length} candidates x ${GAMES_PER_TEST} games (7P & 10P) = ${candidateList.length * GAMES_PER_TEST * 2} total matches...\n`);

  const results = [];

  for (let i = 0; i < candidateList.length; i++) {
    const c = candidateList[i];
    process.stdout.write(`[${i + 1}/${candidateList.length}] Testing "${c.name}"... `);
    const tStart = Date.now();
    
    const r7 = simulateJets(c.genome, GAMES_PER_TEST, 7, 72000 + i * 1000);
    const r10 = simulateJets(c.genome, GAMES_PER_TEST, 10, 82000 + i * 1000);
    const dt = ((Date.now() - tStart) / 1000).toFixed(1);

    const blendedWinRate = (0.5 * r7.winRateNum + 0.5 * r10.winRateNum).toFixed(1);
    const avgPsi = ((parseFloat(r7.avgPsi) + parseFloat(r10.avgPsi)) / 2).toFixed(2);

    results.push({
      name: c.name,
      genome: c.genome,
      r7,
      r10,
      blendedWinRate: parseFloat(blendedWinRate),
      avgPsi: parseFloat(avgPsi),
      dt
    });

    console.log(`Done (${dt}s) -> 7P: ${r7.winRate} | 10P: ${r10.winRate} | Blended: ${blendedWinRate}% | Avg PSI: ${avgPsi}`);
  }

  results.sort((a, b) => b.blendedWinRate - a.blendedWinRate || a.avgPsi - b.avgPsi);

  console.log('\n========================================================================');
  console.log('                   JETS TOURNAMENT LEADERBOARD                          ');
  console.log('========================================================================');
  console.log('Rank | Candidate Name                               | 7P Win% | 10P Win% | Blended | Avg PSI | MaxBids/Gm | 0-Coin%');
  console.log('----------------------------------------------------------------------------------------------------------------');

  results.forEach((r, idx) => {
    const rankStr = String(idx + 1).padEnd(4);
    const nameStr = r.name.padEnd(44);
    const win7Str = r.r7.winRate.padEnd(7);
    const win10Str = r.r10.winRate.padEnd(8);
    const blendStr = (r.blendedWinRate.toFixed(1) + '%').padEnd(7);
    const psiStr = r.avgPsi.toFixed(2).padEnd(7);
    const maxBidsStr = (((parseFloat(r.r7.avgMaxBids) + parseFloat(r.r10.avgMaxBids)) / 2).toFixed(2)).padEnd(10);
    const zeroStr = r.r7.pctZeroCoins;
    console.log(`${rankStr} | ${nameStr} | ${win7Str} | ${win10Str} | ${blendStr} | ${psiStr} | ${maxBidsStr} | ${zeroStr}`);
  });

  const best = results[0];
  console.log('\n========================================================================');
  console.log(`🏆 OPTIMAL JETS GENOME IDENTIFIED: "${best.name}"`);
  console.log(`   Blended Win Rate: ${best.blendedWinRate}% (7P: ${best.r7.winRate}, 10P: ${best.r10.winRate})`);
  console.log(`   Average PSI: ${best.avgPsi} | Max Bids / Game: ${((parseFloat(best.r7.avgMaxBids) + parseFloat(best.r10.avgMaxBids)) / 2).toFixed(2)}`);
  console.log('   Genome Configuration:');
  console.log(JSON.stringify(best.genome, null, 2));
  console.log('========================================================================\n');
}

runJetsDeepTournament();
