import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

// Base baseline
const BASE_GENOME = { ...ACTIVE_TEAM_GENOMES.dolphins };

function evaluateConfig(label, overrides, games = 100) {
  ACTIVE_TEAM_GENOMES.dolphins = { ...BASE_GENOME, ...overrides };
  const r7 = runDolphinsBenchmark(games, 7, 5000);
  const r10 = runDolphinsBenchmark(games, 10, 5000);
  
  const score = (parseFloat(r7.winRate) * 0.5) + (parseFloat(r10.winRate) * 0.5);
  console.log(`\n[${label}]`);
  console.log(`  7P: Win Rate ${r7.winRate} | Avg PSI: ${r7.avgPsi} | Bailouts: ${r7.avgBailouts} | 1c: ${r7.pct1Coin}`);
  console.log(`  10P: Win Rate ${r10.winRate} | Avg PSI: ${r10.avgPsi} | Bailouts: ${r10.avgBailouts} | 1c: ${r10.pct1Coin}`);
  console.log(`  Combined Win Score: ${score.toFixed(1)}%`);
  return { label, overrides, r7, r10, score };
}

async function run() {
  console.log("================================================================================");
  console.log("       DOLPHINS DEEP AI FINE-TUNING & STRATEGY REFINEMENT EXPERIMENT");
  console.log("================================================================================");

  // -------------------------------------------------------------
  // EXPERIMENT 1: Max Purse for Fearless All-In (8 vs 10 vs 12 vs 14 vs 18)
  // User insight: "If dolphins have 20 coins maybe this is too many... if they have 8 coins,
  // targeting more expensive players with no fear... Better to bid 8 immediately."
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 1: Max Purse All-In Cap <<<");
  const purseResults = [];
  for (const purse of [6, 8, 10, 12, 14, 18]) {
    purseResults.push(evaluateConfig(`Max Purse All-In = ${purse}`, { dolphinsMaxPurseAllIn: purse }, 100));
  }

  // -------------------------------------------------------------
  // EXPERIMENT 2: Buffer Round-Up Threshold (2 vs 3 vs 4)
  // User insight: "No good saving 3 coins if those 3 coins could have been used to dissuade opponents."
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 2: Buffer Round-Up Threshold <<<");
  const bufferResults = [];
  for (const buf of [1, 2, 3, 4]) {
    bufferResults.push(evaluateConfig(`Buffer Threshold = ${buf} coins`, { dolphinsBufferThreshold: buf }, 100));
  }

  // -------------------------------------------------------------
  // EXPERIMENT 3: Zero-Seeking Minimum Card Score (0.0 vs 2.0 vs 5.0 vs 15.0)
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 3: Zero-Seeking Score Threshold <<<");
  const zeroScoreResults = [];
  for (const zScore of [0.0, 2.0, 5.0, 10.0, 15.0]) {
    zeroScoreResults.push(evaluateConfig(`Zero-Seeking Score Threshold = ${zScore}`, { dolphinsZeroSeekingThreshold: zScore }, 100));
  }

  // -------------------------------------------------------------
  // EXPERIMENT 4: Deflate Weight vs Coin Weight Archetype Grids
  // What if the best strategy is high coins, or ultra deflation, or pure hybrid?
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 4: Deflation vs Coin Core Weights <<<");
  const weightPairs = [
    { name: "Extreme Deflation (3.4 Deflate / 0.25 Coins)", deflateWeight: 3.4, coinWeight: 0.25, dolphinsPureCoinMult: 0.25 },
    { name: "Heavy Deflation (3.0 Deflate / 0.35 Coins)", deflateWeight: 3.0, coinWeight: 0.35, dolphinsPureCoinMult: 0.35 },
    { name: "User Recommended (2.6 Deflate / 0.45 Coins)", deflateWeight: 2.6, coinWeight: 0.45, dolphinsPureCoinMult: 0.40 },
    { name: "Balanced Hybrid (2.4 Deflate / 0.60 Coins)", deflateWeight: 2.4, coinWeight: 0.60, dolphinsPureCoinMult: 0.55 },
    { name: "Coin Fuel Engine (2.0 Deflate / 0.85 Coins)", deflateWeight: 2.0, coinWeight: 0.85, dolphinsPureCoinMult: 0.80 },
  ];
  const weightResults = [];
  for (const wp of weightPairs) {
    weightResults.push(evaluateConfig(wp.name, wp, 100));
  }

  // -------------------------------------------------------------
  // EXPERIMENT 5: Instant Coin Rockets (Launchpad) Valuation
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 5: Instant Coin Rocket Multiplier <<<");
  const rocketResults = [];
  for (const mult of [1.5, 3.0, 4.5, 6.0]) {
    rocketResults.push(evaluateConfig(`Instant Coin Rocket Mult = ${mult}`, { dolphinsInstantCoinMult: mult }, 100));
  }
}

run().catch(console.error);
