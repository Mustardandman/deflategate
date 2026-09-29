import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES, BASELINE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const goldenGenome = {
  ...ACTIVE_TEAM_GENOMES.dolphins,
  deflateWeight: 2.8,
  coinWeight: 0.60,
  recurringMult: 1.25,
  aggression: 1.15,
  superstarPriorityMult: 1.35,
  reserveCoins: 0,
  dolphinsMaxPurseAllIn: 14,
  dolphinsBufferThreshold: 3,
  dolphinsZeroSeekingThreshold: 0.0
};

console.log("=== 300-Game Confirmation Benchmark: Golden Rank 1 Dolphins ===");
ACTIVE_TEAM_GENOMES.dolphins = goldenGenome;

const r7 = runDolphinsBenchmark(300, 7, 25000);
const r10 = runDolphinsBenchmark(300, 10, 25000);

console.log("\n[Golden Rank 1 Dolphins - 300 Games Benchmark]");
console.log(`7-Player Tables:`);
console.log(`  Win Rate: ${r7.winRate}`);
console.log(`  Avg PSI: ${r7.avgPsi}`);
console.log(`  Avg Bailouts: ${r7.avgBailouts} / game`);
console.log(`  Rounds with 1 Coin: ${r7.pct1Coin}`);
console.log(`  Rounds with 2 Coins: ${r7.pct2Coins}`);
console.log(`  Card Drafting Distribution:`, r7.draftedCardsSummary);

console.log(`\n10-Player Tables:`);
console.log(`  Win Rate: ${r10.winRate}`);
console.log(`  Avg PSI: ${r10.avgPsi}`);
console.log(`  Avg Bailouts: ${r10.avgBailouts} / game`);
console.log(`  Rounds with 1 Coin: ${r10.pct1Coin}`);
console.log(`  Rounds with 2 Coins: ${r10.pct2Coins}`);
console.log(`  Card Drafting Distribution:`, r10.draftedCardsSummary);
