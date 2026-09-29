import { runPatriotsBenchmark } from './testPatriotsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const BASE_GENOME = { ...ACTIVE_TEAM_GENOMES.patriots };

function evaluateConfig(label, overrides, games = 100) {
  ACTIVE_TEAM_GENOMES.patriots = { ...BASE_GENOME, ...overrides };
  const r7 = runPatriotsBenchmark(games, 7, 6000);
  const r10 = runPatriotsBenchmark(games, 10, 6000);
  
  const score = (parseFloat(r7.winRate) * 0.5) + (parseFloat(r10.winRate) * 0.5);
  console.log(`\n[${label}]`);
  console.log(`  7P: Win Rate ${r7.winRate} | Avg PSI: ${r7.avgPsi} | Avg Coins: ${r7.avgCoins} | 0c: ${r7.pctZeroCoins}`);
  console.log(`  10P: Win Rate ${r10.winRate} | Avg PSI: ${r10.avgPsi} | Avg Coins: ${r10.avgCoins} | 0c: ${r10.pctZeroCoins}`);
  console.log(`  Combined Win Score: ${score.toFixed(1)}%`);
  return { label, overrides, r7, r10, score };
}

async function run() {
  console.log("================================================================================");
  console.log("       PATRIOTS DEEP AI FINE-TUNING & STRATEGY EXPERIMENTATION");
  console.log("================================================================================");

  // -------------------------------------------------------------
  // EXPERIMENT 1: Deflate Weight vs Coin Weight Archetype Grids
  // Does Patriots sprint best with pure deflation or with early coin fuel?
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 1: Deflation vs Coin Core Weights <<<");
  const weightPairs = [
    { name: "Extreme Deflation Sprint (3.4 Deflate / 0.35 Coins)", deflateWeight: 3.4, coinWeight: 0.35, recurringMult: 0.9 },
    { name: "Heavy Deflation (3.0 Deflate / 0.50 Coins)", deflateWeight: 3.0, coinWeight: 0.50, recurringMult: 0.95 },
    { name: "Current Evolved Baseline (2.83 Deflate / 0.72 Coins)", deflateWeight: 2.83, coinWeight: 0.72, recurringMult: 0.69 },
    { name: "Balanced Sprint & Fuel (2.6 Deflate / 0.85 Coins)", deflateWeight: 2.6, coinWeight: 0.85, recurringMult: 1.0 },
    { name: "High Coin Engine Early (2.2 Deflate / 1.10 Coins)", deflateWeight: 2.2, coinWeight: 1.10, recurringMult: 1.1 },
  ];
  for (const wp of weightPairs) {
    evaluateConfig(wp.name, wp, 100);
  }

  // -------------------------------------------------------------
  // EXPERIMENT 2: General Aggression (1.05 vs 1.15 vs 1.25 vs 1.35)
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 2: Bidding Aggression <<<");
  for (const agg of [1.05, 1.15, 1.25, 1.35]) {
    evaluateConfig(`Aggression = ${agg}`, { aggression: agg }, 100);
  }

  // -------------------------------------------------------------
  // EXPERIMENT 3: Reserve Coins in Early Game (0 vs 1 vs 2 vs 3)
  // Should Patriots save coins or spend freely in Rounds 1-3?
  // -------------------------------------------------------------
  console.log("\n>>> EXPERIMENT 3: Reserve Coins <<<");
  for (const res of [0, 1, 2, 3]) {
    evaluateConfig(`Reserve Coins = ${res}`, { reserveCoins: res }, 100);
  }
}

run().catch(console.error);
