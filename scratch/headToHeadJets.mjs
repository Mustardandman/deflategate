import { simulateJets } from './comprehensiveJetsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Head-to-Head 4,000 Match Showdown: Old Jets vs New Calibrated Jets ===');
const base = { ...ACTIVE_TEAM_GENOMES.jets };

const oldJets = {
  name: 'Old Jets Baseline (Def 2.4, Coin 1.0, Recur 1.0, Gap 3)',
  genome: {
    ...base,
    deflateWeight: 2.4,
    coinWeight: 1.0,
    recurringMult: 1.0,
    jetsMaxBidGap: 3,
    reserveCoins: 1,
    aggression: 1.2
  }
};

const newJets = {
  name: 'New Calibrated Champion (Def 2.4, Coin 1.15, Recur 1.10, Gap 2)',
  genome: {
    ...base,
    deflateWeight: 2.4,
    coinWeight: 1.15,
    recurringMult: 1.10,
    jetsMaxBidGap: 2,
    reserveCoins: 1,
    aggression: 1.2
  }
};

const N = 1000; // 1,000 7P + 1,000 10P = 2,000 games per candidate = 4,000 total games!
console.log(`Simulating ${N} games per bracket (7P & 10P) = ${N * 4} total games...`);

const rOld7 = simulateJets(oldJets.genome, N, 7, 12345);
const rOld10 = simulateJets(oldJets.genome, N, 10, 23456);

const rNew7 = simulateJets(newJets.genome, N, 7, 12345);
const rNew10 = simulateJets(newJets.genome, N, 10, 23456);

console.log('\n--- RESULTS ---');
console.log(`Old Jets [${oldJets.name}]:`);
console.log(`  7P: ${rOld7.winRate} (Avg PSI: ${rOld7.avgPsi}, MaxBids: ${rOld7.avgMaxBids}, 0-Coin: ${rOld7.pctZeroCoins})`);
console.log(` 10P: ${rOld10.winRate} (Avg PSI: ${rOld10.avgPsi}, MaxBids: ${rOld10.avgMaxBids}, 0-Coin: ${rOld10.pctZeroCoins})`);
const blendOld = (0.5 * rOld7.winRateNum + 0.5 * rOld10.winRateNum).toFixed(2);
console.log(`  Blended: ${blendOld}%`);

console.log(`\nNew Calibrated Jets [${newJets.name}]:`);
console.log(`  7P: ${rNew7.winRate} (Avg PSI: ${rNew7.avgPsi}, MaxBids: ${rNew7.avgMaxBids}, 0-Coin: ${rNew7.pctZeroCoins})`);
console.log(` 10P: ${rNew10.winRate} (Avg PSI: ${rNew10.avgPsi}, MaxBids: ${rNew10.avgMaxBids}, 0-Coin: ${rNew10.pctZeroCoins})`);
const blendNew = (0.5 * rNew7.winRateNum + 0.5 * rNew10.winRateNum).toFixed(2);
console.log(`  Blended: ${blendNew}%`);
