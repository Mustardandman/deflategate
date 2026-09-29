import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const base = {
  ...ACTIVE_TEAM_GENOMES.dolphins,
  deflateWeight: 2.6,
  coinWeight: 0.45,
  recurringMult: 1.25,
  aggression: 1.25,
  superstarPriorityMult: 1.35,
  reserveCoins: 0,
  dolphinsMaxPurseAllIn: 14,
  dolphinsBufferThreshold: 3
};

console.log("=== Verifying Zero-Seeking Score Threshold (200 Games 7P & 10P) ===");

for (const z of [0.0, 3.0, 6.0, 10.0]) {
  ACTIVE_TEAM_GENOMES.dolphins = { ...base, dolphinsZeroSeekingThreshold: z };
  const r7 = runDolphinsBenchmark(200, 7, 9000);
  const r10 = runDolphinsBenchmark(200, 10, 9000);
  console.log(`\nThreshold = ${z}:`);
  console.log(`  7P: Win Rate ${r7.winRate}, Avg PSI: ${r7.avgPsi}, Bailouts: ${r7.avgBailouts}`);
  console.log(`  10P: Win Rate ${r10.winRate}, Avg PSI: ${r10.avgPsi}, Bailouts: ${r10.avgBailouts}`);
}
