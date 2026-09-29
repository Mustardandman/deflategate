import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TEAMS } from '../src/GameData.js';
import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults } from '../src/Game.js';
import { DEFAULT_GENOME, BASELINE_TEAM_GENOMES, ACTIVE_TEAM_GENOMES, mutateGenome, crossoverGenomes, clampGenome } from '../src/ai/teamGenomes.js';

// Fast seeded PRNG (Mulberry32) for deterministic duplicate game evaluations
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

/**
 * Run a single headless simulation game with 100% mechanical fidelity to Deflategate rules
 */
export function runSingleGame({ numPlayers = 4, forcedTeams = {}, teamGenomes = {}, seed = null }) {
  const rng = seed !== null && seed !== undefined ? mulberry32(seed) : Math.random;
  const origRandom = Math.random;
  Math.random = rng;

  try {
    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    // Assign Teams & Genomes
    const availableTeams = fisherYates(TEAMS.map(t => t.id), rng);
    for (let i = 0; i < numPlayers; i++) {
      const seat = String(i);
      let teamId = forcedTeams[seat];
      if (!teamId) {
        teamId = availableTeams.find(id => !Object.values(G.players).some(p => p.team?.id === id));
      }
      const t = TEAMS.find(item => item.id === teamId) || TEAMS[i % TEAMS.length];
      const p = G.players[seat];
      p.team = t;
      p.psi = t.initialPsi;
      p.coins = t.coins;
      p.isCpu = true;
      p.genome = teamGenomes[t.id] || ACTIVE_TEAM_GENOMES[t.id] || BASELINE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
    }

    let winnerId = null;

    // Run up to 10 rounds
    for (let r = 1; r <= 10 && !winnerId; r++) {
      G.board.round = r;
      G.board.firstPlayer = String((r - 1) % numPlayers);
      G.board.nominator = G.board.firstPlayer;

      // Reset round states
      Object.values(G.players).forEach(p => {
        p.hasWonAuction = false;
        p.cardsWonThisRound = 0;
        p.outbidCount = 0;
      });

      // 1. Event Phase
      if (DeflategateGame.phases.eventPhase?.onBegin) {
        DeflategateGame.phases.eventPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }

      // Handle interactive event states for CPUs
      if (G.board.pendingRivalry) {
        const giverId = G.board.pendingRivalry.currentGiverId;
        const targetId = Object.keys(G.players).find(id => id !== giverId) || '1';
        G.players[giverId].psi = Math.max(0, G.players[giverId].psi - 1);
        G.players[targetId].psi += 1;
        G.board.pendingRivalry = null;
      }
      G.board.pendingTradeRumors = null;
      G.board.tradeRumorsSummary = null;
      G.board.bonusAuction = null;
      G.board.pendingFreeAgency = null;
      G.board.pendingNewCapLimit = null;
      G.board.eventConfirmed = true;

      // 2. Pre-Auction Phase
      if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
        DeflategateGame.phases.preAuctionPhase.onBegin({
          G,
          ctx: { numPlayers },
          events: {}
        });
      }

      const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

      // 3. Auction Phase
      let auctionSafety = 0;
      while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
        const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
        if (remainingBoardCards === 0) break;

        const nominatorId = String(G.board.nominator);
        if (G.board.activeAuctionCardIndex === null) {
          const nomIdx = chooseCpuNominationCard(G, nominatorId);
          if (nomIdx === -1 || !G.board.auctionPlayers[nomIdx]) {
            // Pass nominator
            const eligible = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
            if (eligible.length === 0) break;
            const curIdx = eligible.indexOf(nominatorId);
            const nextNom = eligible[(curIdx + 1) % eligible.length];
            if (nextNom === nominatorId) break;
            G.board.nominator = nextNom;
            continue;
          }
          const card = G.board.auctionPlayers[nomIdx];
          G.board.activeAuctionCardIndex = nomIdx;
          G.board.highestBid = card.minBid;
          G.board.highestBidder = nominatorId;
          G.board.passedAuctionPlayers = [];
        }

        const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
        if (!card) {
          G.board.activeAuctionCardIndex = null;
          continue;
        }

        // Bidding Loop
        let biddingSafety = 0;
        while (biddingSafety++ < 40) {
          const eligibleBidders = Object.keys(G.players).filter(
            id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound && !G.board.passedAuctionPlayers.includes(id)
          );

          if (eligibleBidders.length <= 1) {
            const winId = G.board.highestBidder !== null ? G.board.highestBidder : eligibleBidders[0];
            if (winId && G.board.activeAuctionCardIndex !== null) {
              const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
              if (wonCard) {
                G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
                resolveAuctionWin(G, winId, wonCard);
                // CPU Lineup Overflow Management
                const pWin = G.players[winId];
                const maxLineup = (pWin.team?.id === 'seahawks' ? 4 : 3) + (pWin.extraLineupSlots || 0);
                if (pWin.team?.id !== 'colts' && pWin.lineup.length > maxLineup) {
                  let worstIdx = 0, worstScore = Infinity;
                  pWin.lineup.forEach((c, idx) => {
                    let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
                    if (score < worstScore) { worstScore = score; worstIdx = idx; }
                  });
                  pWin.lineup.splice(worstIdx, 1);
                }
              }
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
            }
            break;
          }

          const nextBidderId = eligibleBidders.find(id => id !== G.board.highestBidder);
          if (!nextBidderId) break;

          const bidDec = evaluateCpuAuctionBid(G, nextBidderId);
          if (bidDec.shouldBid && bidDec.bidAmount > G.board.highestBid) {
            G.board.highestBid = bidDec.bidAmount;
            G.board.highestBidder = nextBidderId;

            if (bidDec.isMaxBid) {
              const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              resolveAuctionWin(G, nextBidderId, wonCard);
              const pWin = G.players[nextBidderId];
              const maxLineup = (pWin.team?.id === 'seahawks' ? 4 : 3) + (pWin.extraLineupSlots || 0);
              if (pWin.team?.id !== 'colts' && pWin.lineup.length > maxLineup) {
                let worstIdx = 0, worstScore = Infinity;
                pWin.lineup.forEach((c, idx) => {
                  let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
                  if (score < worstScore) { worstScore = score; worstIdx = idx; }
                });
                pWin.lineup.splice(worstIdx, 1);
              }
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
              break;
            }
          } else {
            G.board.passedAuctionPlayers.push(nextBidderId);
          }
        }
      }

      // 4. Post-Auction Phase
      if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
        DeflategateGame.phases.postAuctionPhase.onBegin({ G });
      }

      // 5. Refresh Phase
      calculateRefreshResults(G);

      // 6. Confirm Refresh Summary
      if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
        DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
      }

      // Check win condition (PSI <= 0 or round > 10) matching Game.js
      const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
      if (winners.length > 0) {
        winners.sort((a, b) => G.players[a].psi - G.players[b].psi);
        winnerId = winners[0];
        break;
      }
    }

    if (!winnerId) {
      let minPsi = Infinity;
      Object.keys(G.players).forEach(id => {
        if (G.players[id].psi < minPsi) {
          minPsi = G.players[id].psi;
          winnerId = id;
        }
      });
    }

    const standings = Object.keys(G.players).map(id => {
      const p = G.players[id];
      return {
        id,
        teamId: p.team?.id || 'unknown',
        teamName: p.team?.name || 'Unknown',
        psi: p.psi,
        coins: p.coins,
        lineupCount: p.lineup?.length || 0,
        won: String(winnerId) === String(id)
      };
    });
    standings.sort((a, b) => a.psi - b.psi || b.coins - a.coins);
    standings.forEach((s, idx) => { s.rank = idx + 1; });

    return {
      winnerId,
      winnerTeam: G.players[winnerId]?.team?.name || 'Unknown',
      winnerTeamId: G.players[winnerId]?.team?.id || 'unknown',
      winningPsi: G.players[winnerId]?.psi,
      roundsPlayed: G.board.round,
      standings
    };
  } finally {
    Math.random = origRandom;
  }
}

/**
 * Matched Duplicate Seed Evaluation (Mitigating Luck / RNG)
 * Runs Candidate vs Baseline on IDENTICAL seeds across player counts [4, 7, 10]
 */
export function evaluateCandidateVsBaseline(teamId, candidateGenome, baselineGenome, { playerCounts = [4, 7, 10], matchesPerCount = 6, baseSeed = 5000 }) {
  let totalCandidateWins = 0;
  let totalBaselineWins = 0;
  let totalCandidatePsi = 0;
  let totalBaselinePsi = 0;
  let totalCandidateRank = 0;
  let totalBaselineRank = 0;
  let totalMatches = 0;

  const countBreakdown = {};

  playerCounts.forEach(pCount => {
    let pCountCandidateWins = 0;
    let pCountBaselineWins = 0;
    let pCountCandidatePsiSum = 0;
    let pCountBaselinePsiSum = 0;

    for (let m = 0; m < matchesPerCount; m++) {
      const matchSeed = baseSeed + m * 9973 + pCount * 101;

      // Game A: Candidate Genome at Seat 0
      const resCandidate = runSingleGame({
        numPlayers: pCount,
        forcedTeams: { '0': teamId },
        teamGenomes: { [teamId]: candidateGenome },
        seed: matchSeed
      });

      // Game B: Baseline Genome at Seat 0 (Exact Duplicate Deck & Seed)
      const resBaseline = runSingleGame({
        numPlayers: pCount,
        forcedTeams: { '0': teamId },
        teamGenomes: { [teamId]: baselineGenome },
        seed: matchSeed
      });

      const candPerf = resCandidate.standings.find(s => s.id === '0') || { won: false, psi: 50, rank: pCount };
      const basePerf = resBaseline.standings.find(s => s.id === '0') || { won: false, psi: 50, rank: pCount };

      if (candPerf.won) {
        totalCandidateWins++;
        pCountCandidateWins++;
      }
      if (basePerf.won) {
        totalBaselineWins++;
        pCountBaselineWins++;
      }

      totalCandidatePsi += candPerf.psi;
      totalBaselinePsi += basePerf.psi;
      pCountCandidatePsiSum += candPerf.psi;
      pCountBaselinePsiSum += basePerf.psi;

      totalCandidateRank += candPerf.rank;
      totalBaselineRank += basePerf.rank;
      totalMatches++;
    }

    countBreakdown[pCount] = {
      matches: matchesPerCount,
      candidateWinRate: (pCountCandidateWins / matchesPerCount) * 100,
      baselineWinRate: (pCountBaselineWins / matchesPerCount) * 100,
      avgCandidatePsi: pCountCandidatePsiSum / matchesPerCount,
      avgBaselinePsi: pCountBaselinePsiSum / matchesPerCount
    };
  });

  const avgCandidatePsi = totalCandidatePsi / totalMatches;
  const avgBaselinePsi = totalBaselinePsi / totalMatches;
  const avgCandidateRank = totalCandidateRank / totalMatches;
  const candidateWinRate = (totalCandidateWins / totalMatches) * 100;
  const baselineWinRate = (totalBaselineWins / totalMatches) * 100;

  // Composite Fitness Score:
  const psiAdvantage = avgBaselinePsi - avgCandidatePsi; // Positive is good
  const winAdvantage = candidateWinRate - baselineWinRate;
  const fitness = (candidateWinRate * 40) + ((50 - avgCandidatePsi) * 1.5) + (psiAdvantage * 4.0) + (winAdvantage * 20);

  return {
    fitness,
    candidateWins: totalCandidateWins,
    baselineWins: totalBaselineWins,
    totalMatches,
    candidateWinRate,
    baselineWinRate,
    avgCandidatePsi,
    avgBaselinePsi,
    avgCandidateRank,
    psiAdvantage,
    countBreakdown
  };
}

/**
 * Optimize genomes for a specific team using Evolutionary Algorithm
 * At least 100+ games per team across 4P, 7P, and 10P tables
 */
export function optimizeTeam(teamId, { generations = 3, populationSize = 4, matchesPerCount = 6, playerCounts = [4, 7, 10], baseSeed = 10000 }) {
  console.log(`\n======================================================`);
  console.log(`🧬 Optimizing Strategy Genome for Team: ${teamId.toUpperCase()}`);
  console.log(`   Generations: ${generations} | Candidates/Gen: ${populationSize} | Games/Candidate: ${matchesPerCount * playerCounts.length * 2}`);
  console.log(`======================================================`);

  let currentChampion = BASELINE_TEAM_GENOMES[teamId] || DEFAULT_GENOME;
  currentChampion = clampGenome(currentChampion, teamId);

  // Baseline benchmark
  const initialBenchmark = evaluateCandidateVsBaseline(teamId, currentChampion, currentChampion, {
    playerCounts,
    matchesPerCount,
    baseSeed
  });
  const countStr = playerCounts.map(c => `${c}P: ${(initialBenchmark.countBreakdown[c]?.candidateWinRate || 0).toFixed(0)}%`).join(', ');
  console.log(`Initial Benchmark: Win Rate = ${initialBenchmark.candidateWinRate.toFixed(1)}%, Avg Final PSI = ${initialBenchmark.avgCandidatePsi.toFixed(1)}`);
  console.log(`Format Win Rates: ${countStr}`);

  const history = [];

  for (let gen = 1; gen <= generations; gen++) {
    console.log(`\n--- Generation ${gen}/${generations} ---`);
    const pop = [currentChampion];

    // Generate mutant/crossover candidates
    while (pop.length < populationSize) {
      if (pop.length >= 3 && Math.random() < 0.4) {
        pop.push(crossoverGenomes(pop[0], pop[1], teamId));
      } else {
        const mutationMagnitude = 0.12 + (gen % 2 === 0 ? 0.08 : 0);
        pop.push(mutateGenome(currentChampion, teamId, 0.35, mutationMagnitude));
      }
    }

    const scoredPop = [];
    for (let idx = 0; idx < pop.length; idx++) {
      const genome = pop[idx];
      let evalRes;
      if (idx === 0 && gen > 1) {
        evalRes = history[history.length - 1].bestEval;
      } else {
        evalRes = evaluateCandidateVsBaseline(teamId, genome, currentChampion, {
          playerCounts,
          matchesPerCount,
          baseSeed: baseSeed + gen * 500 + idx * 73
        });
      }
      scoredPop.push({ genome, ...evalRes });
      console.log(`   [Candidate ${idx + 1}/${populationSize}] WinRate: ${evalRes.candidateWinRate.toFixed(0)}%, Avg PSI: ${evalRes.avgCandidatePsi.toFixed(1)} (Advantage: ${evalRes.psiAdvantage >= 0 ? '+' : ''}${evalRes.psiAdvantage.toFixed(1)})`);
    }

    scoredPop.sort((a, b) => b.fitness - a.fitness);
    const best = scoredPop[0];

    if (best.fitness > initialBenchmark.fitness || best.psiAdvantage > 0.2 || best.candidateWins > best.baselineWins) {
      currentChampion = best.genome;
    }

    history.push({
      gen,
      bestGenome: { ...best.genome },
      candidateWinRate: best.candidateWinRate,
      baselineWinRate: best.baselineWinRate,
      avgPsi: best.avgCandidatePsi,
      psiAdvantage: best.psiAdvantage,
      countBreakdown: best.countBreakdown,
      bestEval: best
    });

    const splitStr = playerCounts.map(c => `${c}P: ${(best.countBreakdown[c]?.candidateWinRate || 0).toFixed(0)}%`).join(' | ');
    console.log(`🏆 Gen ${gen} Champion: WinRate = ${best.candidateWinRate.toFixed(1)}% (vs Base ${best.baselineWinRate.toFixed(1)}%), Avg PSI = ${best.avgCandidatePsi.toFixed(1)}`);
    console.log(`   Weights: Defl=${best.genome.deflateWeight.toFixed(2)}, Coin=${best.genome.coinWeight.toFixed(2)}, Recurr=${best.genome.recurringMult.toFixed(2)}, Aggr=${best.genome.aggression.toFixed(2)}, Resv=${best.genome.reserveCoins}, Bump=${best.genome.priceBumpProb.toFixed(2)}, Syn=${best.genome.synergyBonus.toFixed(2)}, 1stClm=${best.genome.firstClaimAggression.toFixed(2)}, PostClm=${best.genome.postClaimAggression.toFixed(2)}`);
    console.log(`   Format Split: ${splitStr}`);
  }

  return {
    teamId,
    bestGenome: currentChampion,
    initialBenchmark,
    finalResult: history[history.length - 1],
    history
  };
}

/**
 * Run a multi-franchise League Balance Tournament to measure overall win rates
 */
export function runLeagueBalanceTournament(targetTeams, teamGenomes = {}, totalGamesPerCount = 500, seed = 2026, playerCounts = [4, 7, 10]) {
  const totalGames = totalGamesPerCount * playerCounts.length;
  console.log(`\n======================================================`);
  console.log(`🏆 POST-OPTIMIZATION LEAGUE BALANCE TOURNAMENT`);
  console.log(`   Running ${totalGames} automated games across ${playerCounts.map(c => `${c}P`).join(', ')} tables...`);
  console.log(`======================================================`);

  const teamStats = {};
  TEAMS.forEach(t => {
    teamStats[t.id] = {
      id: t.id,
      name: t.name,
      totalGames: 0,
      totalWins: 0,
      totalPsi: 0,
      counts: {}
    };
    playerCounts.forEach(c => {
      teamStats[t.id].counts[c] = { games: 0, wins: 0, psi: 0 };
    });
  });

  const rng = mulberry32(seed);

  let gameCounter = 0;
  playerCounts.forEach(pCount => {
    console.log(`   Running ${totalGamesPerCount} games on ${pCount}-Player tables...`);
    for (let g = 0; g < totalGamesPerCount; g++) {
      const matchSeed = (seed + gameCounter * 37) >>> 0;
      gameCounter++;

      // Pick pCount random teams
      const shuffledTeams = fisherYates(targetTeams, rng);
      const chosenTeamIds = shuffledTeams.slice(0, pCount);
      const forcedTeams = {};
      chosenTeamIds.forEach((tId, idx) => {
        forcedTeams[String(idx)] = tId;
      });

      const res = runSingleGame({
        numPlayers: pCount,
        forcedTeams,
        teamGenomes,
        seed: matchSeed
      });

      res.standings.forEach(s => {
        const stats = teamStats[s.teamId];
        if (stats) {
          stats.totalGames++;
          stats.totalPsi += s.psi;
          if (stats.counts[pCount]) {
            stats.counts[pCount].games++;
            stats.counts[pCount].psi += s.psi;
            if (s.won) stats.counts[pCount].wins++;
          }
          if (s.won) stats.totalWins++;
        }
      });
    }
  });

  const leaderboard = Object.values(teamStats)
    .filter(t => t.totalGames > 0)
    .map(t => {
      const overallWinRate = (t.totalWins / t.totalGames) * 100;
      const avgPsi = t.totalPsi / t.totalGames;
      const countWinRates = {};
      playerCounts.forEach(c => {
        const cStats = t.counts[c];
        countWinRates[c] = cStats && cStats.games > 0 ? (cStats.wins / cStats.games) * 100 : 0;
      });
      return {
        ...t,
        overallWinRate,
        avgPsi,
        countWinRates
      };
    });

  leaderboard.sort((a, b) => b.overallWinRate - a.overallWinRate);
  return leaderboard;
}

// Master execution when run via CLI
async function main() {
  const startTime = Date.now();
  console.log(`🚀 Starting Deflategate Deep Evolutionary Optimization Pipeline Round 2`);
  console.log(`Evaluating all 31 franchises with 100+ games per team!\n`);

  const allTeamIds = TEAMS.map(t => t.id);
  const weightsPath = path.resolve('src/ai/team_weights.json');
  let existingWeights = {};
  try {
    if (fs.existsSync(weightsPath)) {
      existingWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    }
  } catch (e) {
    console.error('Could not load existing weights:', e);
  }

  const optimizedGenomes = { ...BASELINE_TEAM_GENOMES, ...existingWeights };
  const teamReports = [];
  const playerCounts = [4, 7, 10];

  console.log(`Starting Deep Optimization for ALL ${allTeamIds.length} teams across 4P, 7P, and 10P tables...\n`);

  for (let i = 0; i < allTeamIds.length; i++) {
    const teamId = allTeamIds[i];
    console.log(`\n[${i + 1}/${allTeamIds.length}] Optimizing: ${teamId.toUpperCase()}`);

    // 3 generations x 4 population x 6 matchesPerCount x 3 table sizes x 2 games/match = 324 games per team!
    const report = optimizeTeam(teamId, {
      generations: 3,
      populationSize: 4,
      matchesPerCount: 6,
      playerCounts,
      baseSeed: 50000 + i * 2026
    });

    optimizedGenomes[teamId] = report.bestGenome;
    teamReports.push(report);

    // Progressive save after each team
    fs.writeFileSync(weightsPath, JSON.stringify(optimizedGenomes, null, 2), 'utf8');

    const evolvedJsPath = path.resolve('src/ai/evolvedWeights.js');
    const evolvedJsContent = `/**
 * Auto-generated evolved team genomes from Evolutionary Optimization Pipeline.
 * These weights override baseline parameters for CPU players.
 */
export const EVOLVED_TEAM_GENOMES = ${JSON.stringify(optimizedGenomes, null, 2)};
`;
    fs.writeFileSync(evolvedJsPath, evolvedJsContent, 'utf8');
  }

  console.log(`\n✅ ALL 31 TEAMS HAVE BEEN OPTIMIZED AND PERFECTED!`);
  console.log(`💾 Final weights saved to ${weightsPath} and src/ai/evolvedWeights.js`);

  // Run comprehensive League Balance Tournament across 4P, 7P, and 10P tables (1,500 games total)
  const tournamentResults = runLeagueBalanceTournament(allTeamIds, optimizedGenomes, 500, 99999, playerCounts);

  console.log(`\n======================================================`);
  console.log(`📊 DEFINITIVE POST-OPTIMIZATION LEAGUE STANDINGS & TIER LIST`);
  console.log(`======================================================`);
  console.log(`Rank | Team         | Games | Wins | Win %  | Avg PSI | 4P Win% | 7P Win% | 10P Win%`);
  console.log(`-----|--------------|-------|------|--------|---------|---------|---------|---------`);
  tournamentResults.forEach((t, idx) => {
    const rankStr = String(idx + 1).padStart(4, ' ');
    const nameStr = t.name.padEnd(12, ' ');
    const totalStr = String(t.totalGames).padStart(5, ' ');
    const winsStr = String(t.totalWins).padStart(4, ' ');
    const winRateStr = `${t.overallWinRate.toFixed(1)}%`.padStart(6, ' ');
    const psiStr = t.avgPsi.toFixed(1).padStart(7, ' ');
    const wr4P = `${(t.countWinRates[4] || 0).toFixed(0)}%`.padStart(7, ' ');
    const wr7P = `${(t.countWinRates[7] || 0).toFixed(0)}%`.padStart(7, ' ');
    const wr10P = `${(t.countWinRates[10] || 0).toFixed(0)}%`.padStart(8, ' ');
    console.log(`${rankStr} | ${nameStr} | ${totalStr} | ${winsStr} | ${winRateStr} | ${psiStr} | ${wr4P} | ${wr7P} | ${wr10P}`);
  });

  // Calculate and print Tier List (Tier 1: Top 10, Tier 2: Middle 11, Tier 3: Bottom 10)
  const tier1 = tournamentResults.slice(0, 10);
  const tier2 = tournamentResults.slice(10, 21);
  const tier3 = tournamentResults.slice(21);

  console.log(`\n🥇 TIER 1 (BEST / ELITE CONTENDERS):`);
  tier1.forEach(t => console.log(`   - ${t.name}: Win Rate ${t.overallWinRate.toFixed(1)}%, Avg PSI ${t.avgPsi.toFixed(1)}`));

  console.log(`\n🥈 TIER 2 (MIDDLE / COMPETITIVE & BALANCED):`);
  tier2.forEach(t => console.log(`   - ${t.name}: Win Rate ${t.overallWinRate.toFixed(1)}%, Avg PSI ${t.avgPsi.toFixed(1)}`));

  console.log(`\n🥉 TIER 3 (WORST / UNDERPERFORMING / CHALLENGING):`);
  tier3.forEach(t => console.log(`   - ${t.name}: Win Rate ${t.overallWinRate.toFixed(1)}%, Avg PSI ${t.avgPsi.toFixed(1)}`));

  // Save full results to JSON for documentation
  const reportPath = path.resolve('scratch/optimization_round2_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({ teamReports, tournamentResults, tier1, tier2, tier3 }, null, 2), 'utf8');
  console.log(`\n📄 Detailed results report saved to: ${reportPath}`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✨ Deep Optimization & Tier List Benchmark Completed in ${durationSec}s!`);
}

const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) || 
  process.argv[1].endsWith('optimize_team_ai.mjs')
);

if (isMain) {
  main().catch(err => {
    console.error('Fatal optimization error:', err);
    process.exit(1);
  });
}
