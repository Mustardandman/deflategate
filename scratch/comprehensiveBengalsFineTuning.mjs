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

export function simulateBengals(candidateGenome, numGames = 300, numPlayers = 7, baseSeed = 42000) {
  let wins = 0;
  let psiSum = 0;
  let winRounds = [];
  let roundsWithZeroCoins = 0;
  let totalRounds = 0;
  let averageCoinsEndRound = 0;
  let instantCardsWon = 0;
  let cardsDiscardedOnAcquire = 0;

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
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
            wins++;
            winRounds.push(r);
          }
          break;
        }
      }

      psiSum += bengalsPlayer.psi;
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
    avgInstantCardsWon: (instantCardsWon / numGames).toFixed(2),
    avgDiscarded: (cardsDiscardedOnAcquire / numGames).toFixed(2),
    avgCoins: (averageCoinsEndRound / totalRounds).toFixed(2),
    pctZeroCoins: ((roundsWithZeroCoins / totalRounds) * 100).toFixed(1) + '%'
  };
}

async function runFineTuningSuite() {
  console.log('========================================================================');
  console.log('   DEEP FINE-TUNING SUITE: CINCINNATI BENGALS GENOME CALIBRATION        ');
  console.log('   Simulating thousands of high-stakes competitive matches (7P & 10P)   ');
  console.log('========================================================================\n');

  const base = { ...ACTIVE_TEAM_GENOMES.bengals };

  // Candidates exploring parameter space:
  const candidateList = [
    {
      name: 'Baseline C2 (Current Commited)',
      genome: { ...base }
    },
    // Variation 1: Deflate Weight Sweep
    {
      name: 'Deflate-2.00 (Lower deflate, higher patience)',
      genome: { ...base, deflateWeight: 2.00 }
    },
    {
      name: 'Deflate-2.40 (Higher deflate urgency)',
      genome: { ...base, deflateWeight: 2.40 }
    },
    {
      name: 'Deflate-2.60 (Extreme deflation sprint)',
      genome: { ...base, deflateWeight: 2.60 }
    },
    // Variation 2: Coin Weight & Recurring Mult
    {
      name: 'Cash-Booster (coinWeight: 1.30, recurringMult: 1.10)',
      genome: { ...base, coinWeight: 1.30, recurringMult: 1.10 }
    },
    {
      name: 'Light-Recurring (recurringMult: 0.85, coinWeight: 1.10)',
      genome: { ...base, recurringMult: 0.85, coinWeight: 1.10 }
    },
    {
      name: 'Heavy-Strategy-B (recurringMult: 1.15, coinWeight: 1.20)',
      genome: { ...base, recurringMult: 1.15, coinWeight: 1.20 }
    },
    // Variation 3: Aggression & Reserve Coins
    {
      name: 'Aggression-1.25 + Reserve-1 (Hyper-aggressive buyer)',
      genome: { ...base, aggression: 1.25, reserveCoins: 1 }
    },
    {
      name: 'Aggression-1.10 + Reserve-3 (Conservative liquidity)',
      genome: { ...base, aggression: 1.10, reserveCoins: 3 }
    },
    // Variation 4: Instant Max Bid & Synergy Bonus
    {
      name: 'MaxBid-Aggression-1.15 + Synergy-1.6',
      genome: { ...base, instantMaxBidAggression: 1.15, synergyBonus: 1.6 }
    },
    {
      name: 'Sub5-Urgency-2.50 + FirstClaim-1.30',
      genome: { ...base, sub5UrgencyBonus: 2.50, firstClaimAggression: 1.30 }
    },
    // Variation 5: Optimal Hybrid Synthesized
    {
      name: 'Synthesis: Deflate-2.30, Coin-1.20, Recur-1.05, Agg-1.15, Res-2',
      genome: { ...base, deflateWeight: 2.30, coinWeight: 1.20, recurringMult: 1.05, aggression: 1.15, reserveCoins: 2 }
    }
  ];

  const GAMES_PER_TEST = 300; // 300 games 7P + 300 games 10P = 600 games per candidate * 12 candidates = 7,200 games!
  console.log(`Running ${candidateList.length} candidates x ${GAMES_PER_TEST} games (7P & 10P) = ${candidateList.length * GAMES_PER_TEST * 2} total matches...\n`);

  const results = [];

  for (let i = 0; i < candidateList.length; i++) {
    const c = candidateList[i];
    process.stdout.write(`[${i + 1}/${candidateList.length}] Testing "${c.name}"... `);
    const tStart = Date.now();
    
    const r7 = simulateBengals(c.genome, GAMES_PER_TEST, 7, 70000 + i * 1000);
    const r10 = simulateBengals(c.genome, GAMES_PER_TEST, 10, 80000 + i * 1000);
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

  // Sort by Blended Win Rate descending, then lowest Avg PSI
  results.sort((a, b) => b.blendedWinRate - a.blendedWinRate || a.avgPsi - b.avgPsi);

  console.log('\n========================================================================');
  console.log('                       FINAL LEADERBOARD RANKINGS                       ');
  console.log('========================================================================');
  console.log('Rank | Candidate Name                               | 7P Win% | 10P Win% | Blended | Avg PSI | Avg Discards | 0-Coin%');
  console.log('----------------------------------------------------------------------------------------------------------------');

  results.forEach((r, idx) => {
    const rankStr = String(idx + 1).padEnd(4);
    const nameStr = r.name.padEnd(44);
    const win7Str = r.r7.winRate.padEnd(7);
    const win10Str = r.r10.winRate.padEnd(8);
    const blendStr = (r.blendedWinRate.toFixed(1) + '%').padEnd(7);
    const psiStr = r.avgPsi.toFixed(2).padEnd(7);
    const discStr = (((parseFloat(r.r7.avgDiscarded) + parseFloat(r.r10.avgDiscarded)) / 2).toFixed(2)).padEnd(12);
    const zeroStr = r.r7.pctZeroCoins;
    console.log(`${rankStr} | ${nameStr} | ${win7Str} | ${win10Str} | ${blendStr} | ${psiStr} | ${discStr} | ${zeroStr}`);
  });

  const best = results[0];
  console.log('\n========================================================================');
  console.log(`🏆 OPTIMAL BENGALS GENOME IDENTIFIED: "${best.name}"`);
  console.log(`   Blended Win Rate: ${best.blendedWinRate}% (7P: ${best.r7.winRate}, 10P: ${best.r10.winRate})`);
  console.log(`   Average PSI: ${best.avgPsi} | Discards/Game: ${((parseFloat(best.r7.avgDiscarded) + parseFloat(best.r10.avgDiscarded)) / 2).toFixed(2)}`);
  console.log('   Genome Configuration:');
  console.log(JSON.stringify(best.genome, null, 2));
  console.log('========================================================================\n');
}

runFineTuningSuite();
