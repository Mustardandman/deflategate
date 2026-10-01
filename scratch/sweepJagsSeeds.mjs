import { simulateJaguars } from './testJaguarsBenchmark.mjs';

console.log('Testing Jaguars consistency across 5 different 100-game seeds in 7P:');
let totalWins = 0;
let totalGames = 0;

for (let seed = 10000; seed <= 50000; seed += 10000) {
  const res = simulateJaguars(null, 100, 7, seed);
  console.log(`Seed ${seed}: Wins=${res.wins}/100 (${res.winRate}%), AvgPsi=${res.avgPsi}`);
  totalWins += res.wins;
  totalGames += 100;
}

console.log(`\nOverall 500-game 7P Win Rate: ${((totalWins / totalGames) * 100).toFixed(1)}% (${totalWins}/${totalGames})`);

console.log('\nTesting Jaguars consistency across 5 different 100-game seeds in 10P:');
let totalWins10 = 0;
let totalGames10 = 0;

for (let seed = 10000; seed <= 50000; seed += 10000) {
  const res = simulateJaguars(null, 100, 10, seed);
  console.log(`Seed ${seed}: Wins=${res.wins}/100 (${res.winRate}%), AvgPsi=${res.avgPsi}`);
  totalWins10 += res.wins;
  totalGames10 += 100;
}

console.log(`\nOverall 500-game 10P Win Rate: ${((totalWins10 / totalGames10) * 100).toFixed(1)}% (${totalWins10}/${totalGames10})`);
