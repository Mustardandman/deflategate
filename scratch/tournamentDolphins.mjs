import { runDolphinsBenchmark } from './testDolphinsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const CANDIDATES = [
  {
    name: "Cand 1 (User Strategy Foundation)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.6,
      coinWeight: 0.45,
      recurringMult: 1.25,
      aggression: 1.25,
      superstarPriorityMult: 1.35,
      dolphinsMaxPurseAllIn: 12,
      dolphinsBufferThreshold: 3,
      dolphinsZeroSeekingThreshold: 10.0
    }
  },
  {
    name: "Cand 2 (Deep Deflation Finisher)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 3.0,
      coinWeight: 0.35,
      recurringMult: 1.30,
      aggression: 1.25,
      superstarPriorityMult: 1.40,
      dolphinsMaxPurseAllIn: 14,
      dolphinsBufferThreshold: 4,
      dolphinsZeroSeekingThreshold: 10.0
    }
  },
  {
    name: "Cand 3 (Elite 4-Buffer Maximizer)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.8,
      coinWeight: 0.40,
      recurringMult: 1.25,
      aggression: 1.25,
      superstarPriorityMult: 1.35,
      dolphinsMaxPurseAllIn: 14,
      dolphinsBufferThreshold: 4,
      dolphinsZeroSeekingThreshold: 8.0
    }
  },
  {
    name: "Cand 4 (High Aggression Powerhouse)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.8,
      coinWeight: 0.40,
      recurringMult: 1.30,
      aggression: 1.35,
      superstarPriorityMult: 1.45,
      dolphinsMaxPurseAllIn: 14,
      dolphinsBufferThreshold: 3,
      dolphinsZeroSeekingThreshold: 10.0
    }
  },
  {
    name: "Cand 5 (Economic Dynamo — Instant Coins Engine)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 2.5,
      coinWeight: 0.50,
      recurringMult: 1.20,
      aggression: 1.25,
      superstarPriorityMult: 1.35,
      dolphinsInstantCoinMult: 3.5,
      dolphinsMaxPurseAllIn: 12,
      dolphinsBufferThreshold: 3,
      dolphinsZeroSeekingThreshold: 8.0
    }
  },
  {
    name: "Cand 6 (Ultra Fearless 16-Coin All-In)",
    genome: {
      ...ACTIVE_TEAM_GENOMES.dolphins,
      deflateWeight: 3.0,
      coinWeight: 0.35,
      recurringMult: 1.35,
      aggression: 1.30,
      superstarPriorityMult: 1.40,
      dolphinsMaxPurseAllIn: 16,
      dolphinsBufferThreshold: 4,
      dolphinsZeroSeekingThreshold: 10.0
    }
  }
];

console.log("================================================================================");
console.log("    DOLPHINS CHAMPIONSHIP TOURNAMENT: 6 CANDIDATES (200 GAMES 7P & 10P)");
console.log("================================================================================");

const results = [];

for (const c of CANDIDATES) {
  ACTIVE_TEAM_GENOMES.dolphins = c.genome;
  console.log(`\nTesting ${c.name}...`);
  const r7 = runDolphinsBenchmark(200, 7, 7000);
  const r10 = runDolphinsBenchmark(200, 10, 7000);
  const score = (parseFloat(r7.winRate) * 0.5) + (parseFloat(r10.winRate) * 0.5);
  const res = {
    name: c.name,
    genome: c.genome,
    r7,
    r10,
    combinedScore: score.toFixed(1)
  };
  results.push(res);
  console.log(`  -> 7P: Win Rate ${r7.winRate}, Avg PSI: ${r7.avgPsi}, Bailouts: ${r7.avgBailouts}`);
  console.log(`  -> 10P: Win Rate ${r10.winRate}, Avg PSI: ${r10.avgPsi}, Bailouts: ${r10.avgBailouts}`);
  console.log(`  -> Combined Score: ${res.combinedScore}%`);
}

results.sort((a, b) => parseFloat(b.combinedScore) - parseFloat(a.combinedScore));

console.log("\n================================================================================");
console.log("                         FINAL TOURNAMENT STANDINGS");
console.log("================================================================================");
results.forEach((r, idx) => {
  console.log(`${idx + 1}. ${r.name}: Combined ${r.combinedScore}% | 7P: ${r.r7.winRate} (${r.r7.avgPsi} PSI) | 10P: ${r.r10.winRate} (${r.r10.avgPsi} PSI)`);
});

console.log("\nWinning Genome Details:");
console.log(JSON.stringify(results[0].genome, null, 2));
