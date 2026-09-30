import { simulateTexans } from './testTexansBenchmark.mjs';
import { BASELINE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const baseTexans = BASELINE_TEAM_GENOMES.texans;

const candidates = [
  { name: 'Baseline Genome', genome: { ...baseTexans } },
  { name: 'High Deflate (2.0)', genome: { ...baseTexans, deflateWeight: 2.0, coinWeight: 1.1 } },
  { name: 'High Deflate (2.2) + Aggression 1.15', genome: { ...baseTexans, deflateWeight: 2.2, coinWeight: 1.0, aggression: 1.15 } },
  { name: 'High Deflate (2.4) + Superstar 1.3', genome: { ...baseTexans, deflateWeight: 2.4, coinWeight: 1.0, superstarPriorityMult: 1.3 } },
  { name: 'Balanced Deflate (1.8) + Recurring 1.3', genome: { ...baseTexans, deflateWeight: 1.8, coinWeight: 1.1, recurringMult: 1.3 } },
];

console.log('=== TESTING CANDIDATE GENOMES (200 GAMES EACH, 7P & 10P) ===');

for (const c of candidates) {
  const res7 = simulateTexans(c.genome, 200, 7, 50000);
  const res10 = simulateTexans(c.genome, 200, 10, 50000);
  console.log(`\nCandidate: ${c.name}`);
  console.log(`  7P: WinRate=${res7.winRate}% AvgPsi=${res7.avgPsi} AvgQBs=${res7.avgQBsInLineup}`);
  console.log(`  10P: WinRate=${res10.winRate}% AvgPsi=${res10.avgPsi} AvgQBs=${res10.avgQBsInLineup}`);
}
