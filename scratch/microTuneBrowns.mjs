import { simulateBrowns } from './comprehensiveBrownsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const BASE = { ...ACTIVE_TEAM_GENOMES.browns, coinWeight: 0.0, reserveCoins: 1 };

const microCandidates = [
  {
    name: 'Micro 1: FCA 1.35 + SS 1.40 (Sweep Winner)',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.40, deflateWeight: 3.93 }
  },
  {
    name: 'Micro 2: FCA 1.35 + SS 1.65 (High Synergy)',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.65, deflateWeight: 3.93 }
  },
  {
    name: 'Micro 3: FCA 1.35 + Deflate 4.40 + SS 1.55',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.55, deflateWeight: 4.40 }
  },
  {
    name: 'Micro 4: FCA 1.40 + Deflate 4.30 + SS 1.65 + R1',
    genome: { ...BASE, firstClaimAggression: 1.40, superstarPriorityMult: 1.65, deflateWeight: 4.30, reserveCoins: 1 }
  },
  {
    name: 'Micro 5: FCA 1.35 + Deflate 4.50 + SS 1.70 + R1',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.70, deflateWeight: 4.50, reserveCoins: 1 }
  },
  {
    name: 'Micro 6: FCA 1.35 + SS 1.60 + Bump 0.22 + R1',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.60, deflateWeight: 4.20, priceBumpProb: 0.22, reserveCoins: 1 }
  },
  {
    name: 'Micro 7: FCA 1.35 + Deflate 4.40 + SS 1.60 + R2',
    genome: { ...BASE, firstClaimAggression: 1.35, superstarPriorityMult: 1.60, deflateWeight: 4.40, reserveCoins: 2 }
  },
  {
    name: 'Micro 8: FCA 1.45 + Deflate 4.50 + SS 1.70 + R1',
    genome: { ...BASE, firstClaimAggression: 1.45, superstarPriorityMult: 1.70, deflateWeight: 4.50, reserveCoins: 1 }
  }
];

console.log('================================================================');
console.log('  CLEVELAND BROWNS MICRO-TUNING TOURNAMENT (4,000 MATCHES)');
console.log('================================================================\n');

const results = [];
const GAMES_PER_TEST = 250; // 250 in 7P + 250 in 10P = 500 per candidate = 4,000 games total

for (let i = 0; i < microCandidates.length; i++) {
  const { name, genome } = microCandidates[i];
  process.stdout.write(`Evaluating [${i + 1}/${microCandidates.length}] ${name}... `);

  const res7P = simulateBrowns(genome, GAMES_PER_TEST, 7, 90000 + i * 1500);
  const res10P = simulateBrowns(genome, GAMES_PER_TEST, 10, 95000 + i * 1500);

  const combinedWinRate = Number(((res7P.winRate + res10P.winRate) / 2).toFixed(2));
  const combinedAvgPsi = Number(((res7P.avgPsi + res10P.avgPsi) / 2).toFixed(2));

  results.push({
    name,
    genome,
    combinedWinRate,
    combinedAvgPsi,
    winRate7P: res7P.winRate,
    winRate10P: res10P.winRate,
    avgPsi7P: res7P.avgPsi,
    avgPsi10P: res10P.avgPsi
  });

  console.log(`Combined WR: ${combinedWinRate}% | 7P: ${res7P.winRate}%, 10P: ${res10P.winRate}%, Avg PSI: ${combinedAvgPsi}`);
}

results.sort((a, b) => b.combinedWinRate - a.combinedWinRate || a.combinedAvgPsi - b.combinedAvgPsi);

console.log('\n================================================================');
console.log('                    MICRO-TUNING LEADERBOARD');
console.log('================================================================');
console.table(results.map(r => ({
  Name: r.name,
  'Combined WR': r.combinedWinRate + '%',
  '7P WR': r.winRate7P + '%',
  '10P WR': r.winRate10P + '%',
  'Avg PSI': r.combinedAvgPsi
})));

console.log('\n=== CROWN WINNING GENOME ===');
console.log(JSON.stringify(results[0].genome, null, 2));
