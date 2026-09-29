import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const candidates = [
  {
    name: 'Candidate A (Current Evolved)',
    genome: { ...ACTIVE_TEAM_GENOMES.dolphins }
  },
  {
    name: 'Candidate B (High Deflate, Low Coin, High Recurring)',
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.6,
      coinWeight: 0.45,
      recurringMult: 1.25,
      aggression: 1.25,
      superstarPriorityMult: 1.35
    }
  },
  {
    name: 'Candidate C (Ultra Deflation Aggressor)',
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 3.0,
      coinWeight: 0.35,
      recurringMult: 1.35,
      aggression: 1.35,
      superstarPriorityMult: 1.4
    }
  },
  {
    name: 'Candidate D (Balanced Aggression)',
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.4,
      coinWeight: 0.6,
      recurringMult: 1.15,
      aggression: 1.2,
      superstarPriorityMult: 1.3
    }
  }
];

console.log("=== Testing 4 Dolphins Genome Candidates (100 Games 7P & 10P) ===");

for (const cand of candidates) {
  ACTIVE_TEAM_GENOMES.dolphins = cand.genome;
  const r7 = runDolphinsBenchmark(100, 7, 4000);
  const r10 = runDolphinsBenchmark(100, 10, 4000);
  console.log(`\n${cand.name}:`);
  console.log(`  7P: Win Rate ${r7.winRate}, Avg PSI: ${r7.avgPsi}, Bailouts: ${r7.avgBailouts}`);
  console.log(`  10P: Win Rate ${r10.winRate}, Avg PSI: ${r10.avgPsi}, Bailouts: ${r10.avgBailouts}`);
}
