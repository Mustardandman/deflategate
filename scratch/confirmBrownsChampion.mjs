import { simulateBrowns } from './comprehensiveBrownsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const CHAMPION_GENOME = {
  deflateWeight: 4.5,
  coinWeight: 0,
  recurringMult: 1,
  aggression: 1,
  reserveCoins: 1,
  priceBumpProb: 0.14,
  synergyBonus: 1.5,
  firstClaimAggression: 1.35,
  postClaimAggression: 0.9,
  sub5UrgencyBonus: 2,
  richestBuffer: 1,
  instantMaxBidAggression: 1.15,
  boardStrengthWeight: 1,
  threatDefenseWeight: 1.2,
  superstarPriorityMult: 1.7
};

console.log('=== CONFIRMING CHAMPION BROWNS GENOME (1,000 MATCHES) ===\n');

console.log('Testing 7-Player (500 matches)...');
const res7P = simulateBrowns(CHAMPION_GENOME, 500, 7, 11111);
console.log('7P Result:', res7P);

console.log('\nTesting 10-Player (500 matches)...');
const res10P = simulateBrowns(CHAMPION_GENOME, 500, 10, 22222);
console.log('10P Result:', res10P);

const combinedWR = ((res7P.winRate + res10P.winRate) / 2).toFixed(2);
const combinedPSI = ((res7P.avgPsi + res10P.avgPsi) / 2).toFixed(2);

console.log('\n======================================================');
console.log(`COMBINED CONFIRMED WIN RATE: ${combinedWR}% | AVERAGE FINAL PSI: ${combinedPSI}`);
console.log('======================================================');
