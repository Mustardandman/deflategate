import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const baseGenome = {
  ...ACTIVE_TEAM_GENOMES.dolphins,
  dolphinsZeroSeekingThreshold: 0.0,
  dolphinsBufferThreshold: 3,
  dolphinsMaxPurseAllIn: 14,
  reserveCoins: 0
};

// Test grid for core parameters
const configs = [];

for (const dw of [2.4, 2.6, 2.8, 3.0, 3.2]) {
  for (const cw of [0.25, 0.35, 0.45, 0.60]) {
    for (const agg of [1.15, 1.25, 1.35]) {
      configs.push({
        deflateWeight: dw,
        coinWeight: cw,
        aggression: agg,
        recurringMult: dw > 2.8 ? 1.30 : 1.25,
        superstarPriorityMult: agg > 1.25 ? 1.40 : 1.35
      });
    }
  }
}

console.log(`=== Dolphins Multi-Dimensional Grid Search (${configs.length} Configurations, 100 Games 7P & 10P) ===`);

const results = [];

for (let i = 0; i < configs.length; i++) {
  const c = configs[i];
  ACTIVE_TEAM_GENOMES.dolphins = { ...baseGenome, ...c };
  
  const r7 = runDolphinsBenchmark(100, 7, 12000 + i * 37);
  const r10 = runDolphinsBenchmark(100, 10, 12000 + i * 37);
  
  const w7 = parseFloat(r7.winRate);
  const w10 = parseFloat(r10.winRate);
  const psi7 = parseFloat(r7.avgPsi);
  const psi10 = parseFloat(r10.avgPsi);
  
  // Combined Fitness: High win rate + Low PSI
  // Normalize: 7P win ~ 25%, 10P win ~ 18%, PSI ~ 9.0
  const combinedWin = (w7 * 0.5) + (w10 * 0.5);
  const avgPsi = (psi7 * 0.5) + (psi10 * 0.5);
  const fitness = combinedWin - (avgPsi * 0.5); // 1% win rate ~= 0.5 PSI reduction

  const entry = {
    index: i + 1,
    config: c,
    w7,
    w10,
    psi7,
    psi10,
    combinedWin: combinedWin.toFixed(1),
    avgPsi: avgPsi.toFixed(2),
    bailouts7: r7.avgBailouts,
    bailouts10: r10.avgBailouts,
    fitness: fitness.toFixed(2)
  };
  results.push(entry);
  
  if ((i + 1) % 5 === 0 || i === configs.length - 1) {
    console.log(`Tested ${i + 1}/${configs.length}: Top current fitness = ${Math.max(...results.map(r => parseFloat(r.fitness)))}`);
  }
}

// Sort by fitness descending
results.sort((a, b) => parseFloat(b.fitness) - parseFloat(a.fitness));

console.log("\n================================================================================");
console.log("                           TOP 10 CONFIGURATIONS");
console.log("================================================================================");
results.slice(0, 10).forEach((r, rank) => {
  console.log(`Rank ${rank + 1} (Score: ${r.fitness}, Win: ${r.combinedWin}%, Avg PSI: ${r.avgPsi}):`);
  console.log(`  Deflate: ${r.config.deflateWeight} | Coins: ${r.config.coinWeight} | Agg: ${r.config.aggression} | RecMult: ${r.config.recurringMult} | Superstar: ${r.config.superstarPriorityMult}`);
  console.log(`  7P: ${r.w7}% (${r.psi7} PSI, ${r.bailouts7} bailouts) | 10P: ${r.w10}% (${r.psi10} PSI, ${r.bailouts10} bailouts)`);
});
