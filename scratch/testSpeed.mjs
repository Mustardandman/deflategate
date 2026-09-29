import { runSingleGame } from '../scripts/optimize_team_ai.mjs';

for (const pCount of [4, 7, 10]) {
  const start = Date.now();
  for (let i = 0; i < 20; i++) {
    runSingleGame({ numPlayers: pCount, seed: 1000 + i });
  }
  const elapsed = (Date.now() - start) / 1000;
  console.log(`20 ${pCount}P games took ${elapsed.toFixed(2)}s (${(20 / elapsed).toFixed(1)} games/sec)`);
}
