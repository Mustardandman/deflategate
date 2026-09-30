import { simulateTexans } from './testTexansBenchmark.mjs';

console.log('=== 1,000 MATCH TOURNAMENT VALIDATION FOR HOUSTON TEXANS (PLAYTEST 45) ===');

console.log('Simulating 500 Matches in 7-Player Tournament...');
const res7 = simulateTexans(null, 500, 7, 70000);
console.log('7-Player Results:', res7);

console.log('\nSimulating 500 Matches in 10-Player Tournament...');
const res10 = simulateTexans(null, 500, 10, 80000);
console.log('10-Player Results:', res10);
