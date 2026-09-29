import { DeflategateGame, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PHASE_1_PLAYERS, PHASE_2_PLAYERS } from '../src/GameData.js';

const G = DeflategateGame.setup({ ctx: { numPlayers: 7 } }, { numHumans: 0, vsCpu: true });
G.players['0'].team = TEAMS.find(t => t.id === 'dolphins');
G.players['0'].psi = 45;
G.players['0'].coins = 9;

console.log("=== Phase 1 Card Scores for Dolphins (Round 1) ===");
PHASE_1_PLAYERS.forEach(c => {
  const score = scoreCardForPlayer(G, '0', c);
  console.log(`${c.name.padEnd(22)} (max: ${String(c.maxBid).padStart(2)}): ${score.toFixed(1)}`);
});

console.log("\n=== Phase 2 Card Scores for Dolphins (Round 4) ===");
G.board.round = 4;
PHASE_2_PLAYERS.slice(0, 15).forEach(c => {
  const score = scoreCardForPlayer(G, '0', c);
  console.log(`${c.name.padEnd(22)} (max: ${String(c.maxBid).padStart(2)}): ${score.toFixed(1)}`);
});
