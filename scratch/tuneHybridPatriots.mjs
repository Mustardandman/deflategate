import { runPatriotsBenchmark } from './testPatriotsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const CANDIDATES = [
  {
    name: "Hybrid 1: The Modern Belichick (2.5 Deflate / 0.95 Coins / Reserve 3)",
    genome: {
      deflateWeight: 2.50,
      coinWeight: 0.95,
      recurringMult: 1.05,
      reserveCoins: 3,
      aggression: 1.10,
      superstarPriorityMult: 1.30,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Hybrid 2: Engine First, Sprint Finish (2.4 Deflate / 1.05 Coins / Reserve 3)",
    genome: {
      deflateWeight: 2.40,
      coinWeight: 1.05,
      recurringMult: 1.10,
      reserveCoins: 3,
      aggression: 1.08,
      superstarPriorityMult: 1.35,
      threatDefenseWeight: 1.15,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Hybrid 3: Aggressive Phase 2 Fund (2.6 Deflate / 0.90 Coins / Reserve 3 / Agg 1.15)",
    genome: {
      deflateWeight: 2.60,
      coinWeight: 0.90,
      recurringMult: 1.05,
      reserveCoins: 3,
      aggression: 1.15,
      superstarPriorityMult: 1.30,
      threatDefenseWeight: 1.15,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Hybrid 4: Archetype D Champion (2.2 Deflate / 1.10 Coins / Reserve 4)",
    genome: {
      deflateWeight: 2.20,
      coinWeight: 1.10,
      recurringMult: 1.10,
      reserveCoins: 4,
      aggression: 1.00,
      superstarPriorityMult: 1.35,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.0
    }
  },
  {
    name: "Hybrid 5: 10P King Archetype C (2.7 Deflate / 0.75 Coins / Reserve 2)",
    genome: {
      deflateWeight: 2.70,
      coinWeight: 0.75,
      recurringMult: 1.00,
      reserveCoins: 2,
      aggression: 1.15,
      superstarPriorityMult: 1.20,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.1
    }
  }
];

async function runHybridTuning() {
  console.log("=========================================================================================");
  console.log("         HYBRID PATRIOTS OPTIMIZATION: MERGING SPRINT + PHASE 2 ENGINE");
  console.log("=========================================================================================\n");

  const results = [];

  for (const cand of CANDIDATES) {
    console.log(`>>> Testing: ${cand.name}`);
    ACTIVE_TEAM_GENOMES.patriots = { ...cand.genome };

    // Run 150 games each for higher statistical power
    const r7 = runPatriotsBenchmark(150, 7, 7000);
    const r10 = runPatriotsBenchmark(150, 10, 7000);

    const winRate7 = parseFloat(r7.winRate);
    const winRate10 = parseFloat(r10.winRate);
    const combinedScore = (winRate7 * 0.5) + (winRate10 * 0.5);

    const result = {
      name: cand.name,
      genome: cand.genome,
      r7,
      r10,
      combinedScore,
      avgPsi: ((parseFloat(r7.avgPsi) + parseFloat(r10.avgPsi)) / 2).toFixed(2),
      avgCoins: ((parseFloat(r7.avgCoins) + parseFloat(r10.avgCoins)) / 2).toFixed(2),
      pctZeroCoins: ((parseFloat(r7.pctZeroCoins) + parseFloat(r10.pctZeroCoins)) / 2).toFixed(1) + '%'
    };
    results.push(result);

    console.log(`    7P:  ${r7.winRate.padStart(5)} | Avg PSI: ${r7.avgPsi} | 0c: ${r7.pctZeroCoins}`);
    console.log(`    10P: ${r10.winRate.padStart(5)} | Avg PSI: ${r10.avgPsi} | 0c: ${r10.pctZeroCoins}`);
    console.log(`    Combined: ${combinedScore.toFixed(1)}%\n`);
  }

  results.sort((a, b) => b.combinedScore - a.combinedScore);

  console.log("=========================================================================================");
  console.log("                           HYBRID OPTIMIZATION LEADERBOARD");
  console.log("=========================================================================================");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.combinedScore.toFixed(1)}%] ${r.name} (7P: ${r.r7.winRate}, 10P: ${r.r10.winRate}, Avg PSI: ${r.avgPsi})`);
  });

  const best = results[0];
  console.log("\n>>> WINNER GENOME JSON <<<");
  console.log(JSON.stringify(best.genome, null, 2));
}

runHybridTuning().catch(console.error);
