import { simulateBengals } from './comprehensiveBengalsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== Head-to-Head 2,000 Match Showdown ===');
const base = { ...ACTIVE_TEAM_GENOMES.bengals };

const candidateA = {
  name: 'Baseline C2 (Commited)',
  genome: { ...base }
};

const candidateB = {
  name: 'Micro-Tuned Champion (Agg 1.12, InstMax 1.04, Recur 1.05)',
  genome: {
    ...base,
    aggression: 1.12,
    instantMaxBidAggression: 1.04,
    recurringMult: 1.05
  }
};

const N = 1000; // 1,000 games 7P + 1,000 games 10P = 2,000 games each!
console.log(`Simulating ${N} games per bracket (7P & 10P) = ${N * 4} total games...`);

const rA7 = simulateBengals(candidateA.genome, N, 7, 55555);
const rA10 = simulateBengals(candidateA.genome, N, 10, 66666);

const rB7 = simulateBengals(candidateB.genome, N, 7, 55555);
const rB10 = simulateBengals(candidateB.genome, N, 10, 66666);

console.log('\n--- RESULTS ---');
console.log(`Candidate A [${candidateA.name}]:`);
console.log(`  7P: ${rA7.winRate} (Avg PSI: ${rA7.avgPsi}, Discard: ${rA7.avgDiscarded})`);
console.log(` 10P: ${rA10.winRate} (Avg PSI: ${rA10.avgPsi}, Discard: ${rA10.avgDiscarded})`);
const blendA = (0.5 * rA7.winRateNum + 0.5 * rA10.winRateNum).toFixed(2);
console.log(`  Blended: ${blendA}%`);

console.log(`\nCandidate B [${candidateB.name}]:`);
console.log(`  7P: ${rB7.winRate} (Avg PSI: ${rB7.avgPsi}, Discard: ${rB7.avgDiscarded})`);
console.log(` 10P: ${rB10.winRate} (Avg PSI: ${rB10.avgPsi}, Discard: ${rB10.avgDiscarded})`);
const blendB = (0.5 * rB7.winRateNum + 0.5 * rB10.winRateNum).toFixed(2);
console.log(`  Blended: ${blendB}%`);
