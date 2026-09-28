import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'boardgame.io/dist/cjs/client.js';
import { TEAMS } from '../src/GameData.js';
import { createDeflategateGame } from '../src/Game.js';
import { DEFAULT_GENOME, BASELINE_TEAM_GENOMES, mutateGenome, crossoverGenomes, clampGenome } from '../src/ai/teamGenomes.js';

// Fast seeded PRNG (Mulberry32) for deterministic duplicate game evaluations
export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Run a single headless simulation game
 */
export function runSingleGame({ numPlayers = 4, forcedTeams = {}, teamGenomes = {}, seed = null, maxSteps = 2000 }) {
  const origRandom = Math.random;
  if (seed !== null && seed !== undefined) {
    Math.random = mulberry32(seed);
  }

  try {
    const game = createDeflategateGame({
      numHumans: 0,
      forcedTeams,
      teamGenomes
    });

    const client = Client({ game, numPlayers });
    client.start();

    let state = client.getState();

    function step() {
      state = client.getState();
      if (state.ctx.gameover) return false;
      const phase = state.ctx.phase;

      if (state.G.board.cardWonFlyAnimation) {
        client.moves.dismissCardWonFlyAnimation();
        return true;
      }
      if (state.G.pendingReplacement) {
        const pId = state.G.pendingReplacement.playerID;
        const p = state.G.players[pId];
        let worstIdx = 0, worstScore = Infinity;
        p.lineup.forEach((c, idx) => {
          let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
          if (score < worstScore) { worstScore = score; worstIdx = idx; }
        });
        client.moves.confirmReplacement(worstIdx, pId);
        return true;
      }
      if (phase === 'buccaneersCopy') {
        const bucsId = Object.keys(state.G.players).find(id => state.G.players[id].team?.id === 'buccaneers');
        if (bucsId) {
          const otherTeam = Object.values(state.G.players).find(p => p.team?.id !== 'buccaneers')?.team;
          if (otherTeam) client.moves.copyAbility(otherTeam.id, bucsId);
        }
        return true;
      }
      if (phase === 'titansDraft') {
        client.moves.titansPickCard(0);
        return true;
      }
      if (phase === 'eventPhase') {
        if (state.G.board.pendingRivalry) {
          const giverId = state.G.board.pendingRivalry.currentGiverId;
          const targetId = Object.keys(state.G.players).find(id => id !== giverId) || '1';
          client.moves.rivalryGivePsi(targetId, giverId);
        } else if (state.G.board.tradeRumorsSummary) {
          client.moves.dismissTradeRumorsSummary();
        } else if (state.G.board.pendingFreeAgency) {
          client.moves.freeAgencyPass();
        } else if (state.G.board.pendingNewCapLimit) {
          client.moves.passPracticeSquad();
        } else if (state.G.board.bonusAuction) {
          client.moves.bonusAuctionPass();
        } else if (!state.G.board.eventConfirmed) {
          client.moves.confirmEventReveal();
        }
        return true;
      }
      if (phase === 'preAuctionPhase') {
        if (state.G.board.pendingChiefs) client.moves.chiefsPass();
        if (state.G.board.pendingRaiders) client.moves.passRaiders();
        if (state.G.board.pendingCardinals) client.moves.passCardinals();
        if (state.G.board.pendingCommanders) client.moves.passCommanders();
        return true;
      }
      if (phase === 'auctionPhase') {
        client.moves.stepCpuTurn();
        return true;
      }
      if (phase === 'postAuctionPhase') {
        if (state.G.board.pendingBills) client.moves.passBills();
        if (state.G.board.pendingEagles) client.moves.passEagles();
        client.moves.proceedToRefresh();
        return true;
      }
      if (phase === 'refreshPhase') {
        if (state.G.board.pendingPukaChoice) client.moves.confirmPukaChoice(0);
        client.moves.confirmRefreshSummary();
        return true;
      }
      return false;
    }

    let steps = 0;
    while (!state.ctx.gameover && steps < maxSteps) {
      if (!step()) break;
      steps++;
    }

    state = client.getState();
    const winnerId = state.ctx.gameover?.winner !== undefined ? state.ctx.gameover.winner : null;

    // Rank players by lowest PSI, then most coins
    const standings = Object.keys(state.G.players).map(id => {
      const p = state.G.players[id];
      return {
        id,
        teamId: p.team?.id || 'unknown',
        teamName: p.team?.name || `Player ${parseInt(id) + 1}`,
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
      winnerTeam: winnerId !== null ? state.G.players[winnerId]?.team?.name : 'Tiebreak',
      winnerTeamId: winnerId !== null ? state.G.players[winnerId]?.team?.id : null,
      round: state.G.board.round,
      steps,
      standings
    };
  } finally {
    Math.random = origRandom;
  }
}

/**
 * Matched Duplicate Seed Evaluation (Mitigating Luck / RNG)
 * Runs Candidate vs Baseline on IDENTICAL seeds across player counts (4, 6, 8)
 */
export function evaluateCandidateVsBaseline(teamId, candidateGenome, baselineGenome, { playerCounts = [4, 6, 8], matchesPerCount = 2, baseSeed = 5000 }) {
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

      // Game B: Baseline Genome at Seat 0 on IDENTICAL SEED
      const resBaseline = runSingleGame({
        numPlayers: pCount,
        forcedTeams: { '0': teamId },
        teamGenomes: { [teamId]: baselineGenome },
        seed: matchSeed
      });

      const candPerf = resCandidate.standings.find(s => s.id === '0') || { psi: 50, rank: pCount, won: false };
      const basePerf = resBaseline.standings.find(s => s.id === '0') || { psi: 50, rank: pCount, won: false };

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
  // Rewards winning, lower final PSI, and beating the baseline on identical seeds
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
 */
export function optimizeTeam(teamId, { generations = 2, populationSize = 3, matchesPerCount = 2, playerCounts = [4, 7, 10], baseSeed = 10000 }) {
  console.log(`\n======================================================`);
  console.log(`🧬 Optimizing Strategy Genome for Team: ${teamId.toUpperCase()}`);
  console.log(`======================================================`);

  let currentChampion = BASELINE_TEAM_GENOMES[teamId] || DEFAULT_GENOME;
  currentChampion = clampGenome(currentChampion, teamId);

  // Baseline performance benchmark
  const initialBenchmark = evaluateCandidateVsBaseline(teamId, currentChampion, currentChampion, {
    playerCounts,
    matchesPerCount,
    baseSeed
  });
  const countStr = playerCounts.map(c => `${c}P: ${(initialBenchmark.countBreakdown[c]?.candidateWinRate || 0).toFixed(0)}%`).join(', ');
  console.log(`Initial Benchmark: Win Rate = ${initialBenchmark.candidateWinRate.toFixed(1)}%, Avg Final PSI = ${initialBenchmark.avgCandidatePsi.toFixed(1)}`);
  console.log(`Per-Player-Count Win Rates: ${countStr}`);

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

    if (best.fitness > initialBenchmark.fitness || best.psiAdvantage > 0.3 || best.candidateWins > best.baselineWins) {
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
    console.log(`   Weights: Deflate=${best.genome.deflateWeight.toFixed(2)}, Coin=${best.genome.coinWeight.toFixed(2)}, Recurr=${best.genome.recurringMult.toFixed(2)}, Aggr=${best.genome.aggression.toFixed(2)}, Reserve=${best.genome.reserveCoins}, Bump=${best.genome.priceBumpProb.toFixed(2)}, Synergy=${best.genome.synergyBonus.toFixed(2)}`);
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
export function runLeagueBalanceTournament(targetTeams, teamGenomes = {}, totalGames = 45, seed = 2026, playerCounts = [4, 7, 10]) {
  console.log(`\n======================================================`);
  console.log(`🏆 LEAGUE BALANCE TOURNAMENT: Testing Franchise Equity`);
  console.log(`   Running ${totalGames} automated games across ${playerCounts.join(', ')} player tables...`);
  console.log(`======================================================`);

  const teamStats = {};
  TEAMS.forEach(t => {
    teamStats[t.id] = {
      name: t.name,
      id: t.id,
      counts: {},
      totalGames: 0,
      totalWins: 0,
      totalPsi: 0
    };
    playerCounts.forEach(c => {
      teamStats[t.id].counts[c] = { games: 0, wins: 0 };
    });
  });

  for (let g = 0; g < totalGames; g++) {
    const numPlayers = playerCounts[g % playerCounts.length];
    const gameSeed = seed + g * 313;

    const res = runSingleGame({
      numPlayers,
      teamGenomes,
      seed: gameSeed
    });

    res.standings.forEach(s => {
      const stats = teamStats[s.teamId];
      if (stats) {
        stats.totalGames++;
        stats.totalPsi += s.psi;
        if (stats.counts[numPlayers]) {
          stats.counts[numPlayers].games++;
          if (s.won) stats.counts[numPlayers].wins++;
        }
        if (s.won) stats.totalWins++;
      }
    });

    if ((g + 1) % 10 === 0 || g === totalGames - 1) {
      console.log(`   Completed ${g + 1}/${totalGames} tournament games...`);
    }
  }

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
  console.log(`🚀 Starting Deflategate Evolutionary Optimization Pipeline`);
  console.log(`Start Time: ${new Date().toISOString()}\n`);

  // Teams already optimized in Phase 1:
  const alreadyTrainedTeams = ['browns', 'colts', 'dolphins', 'bears', 'eagles', 'texans', 'patriots', 'packers'];
  const allTeamIds = TEAMS.map(t => t.id);
  const remainingTeams = allTeamIds.filter(id => !alreadyTrainedTeams.includes(id));

  // Load existing optimized weights
  let existingWeights = {};
  const weightsPath = path.resolve('src/ai/team_weights.json');
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

  console.log(`Found ${alreadyTrainedTeams.length} previously trained teams. Retaining their genomes.`);
  console.log(`Starting Phase 1 Deep Optimization for remaining ${remainingTeams.length} teams across 4P, 7P, and 10P tables...\n`);

  for (let i = 0; i < remainingTeams.length; i++) {
    const teamId = remainingTeams[i];
    console.log(`\n[${i + 1}/${remainingTeams.length}] Running Deep Evolution for: ${teamId.toUpperCase()}`);

    const report = optimizeTeam(teamId, {
      generations: 2,
      populationSize: 3,
      matchesPerCount: 2, // 2 matches per count = 12 games per candidate evaluation
      playerCounts,
      baseSeed: 25000 + i * 1337
    });

    optimizedGenomes[teamId] = report.bestGenome;
    teamReports.push(report);

    // Save progressively after each team
    fs.writeFileSync(weightsPath, JSON.stringify(optimizedGenomes, null, 2), 'utf8');
    
    const evolvedJsPath = path.resolve('src/ai/evolvedWeights.js');
    const evolvedJsContent = `/**
 * Auto-generated evolved team genomes from Evolutionary Optimization Pipeline.
 * These weights override baseline parameters for CPU players.
 */
export const EVOLVED_TEAM_GENOMES = ${JSON.stringify(optimizedGenomes, null, 2)};
`;
    fs.writeFileSync(evolvedJsPath, evolvedJsContent, 'utf8');
    console.log(`💾 Progress saved to: ${weightsPath} and ${evolvedJsPath}`);
  }

  // Run comprehensive League Balance Tournament across 4P, 7P, and 10P tables
  const tournamentResults = runLeagueBalanceTournament(allTeamIds, optimizedGenomes, 45, 54321, playerCounts);

  console.log(`\n======================================================`);
  console.log(`📊 TOURNAMENT LEAGUE STANDINGS & BALANCE METRICS (${playerCounts.map(c => `${c}P`).join('/')})`);
  console.log(`======================================================`);
  console.log(`Team         | Total | Wins | Win %  | Avg PSI | 4P Win% | 7P Win% | 10P Win%`);
  console.log(`-------------|-------|------|--------|---------|---------|---------|---------`);
  tournamentResults.forEach(t => {
    const nameStr = t.name.padEnd(12, ' ');
    const totalStr = String(t.totalGames).padStart(5, ' ');
    const winsStr = String(t.totalWins).padStart(4, ' ');
    const winRateStr = `${t.overallWinRate.toFixed(1)}%`.padStart(6, ' ');
    const psiStr = t.avgPsi.toFixed(1).padStart(7, ' ');
    const wr4P = `${(t.countWinRates[4] || 0).toFixed(0)}%`.padStart(7, ' ');
    const wr7P = `${(t.countWinRates[7] || 0).toFixed(0)}%`.padStart(7, ' ');
    const wr10P = `${(t.countWinRates[10] || 0).toFixed(0)}%`.padStart(8, ' ');
    console.log(`${nameStr} | ${totalStr} | ${winsStr} | ${winRateStr} | ${psiStr} | ${wr4P} | ${wr7P} | ${wr10P}`);
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✨ Optimization Pipeline Completed in ${durationSec}s!`);

  return { teamReports, tournamentResults };
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
