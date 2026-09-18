import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  playerID: '0',
});

client.start();

console.log("Initial state phase:", client.getState().ctx.phase);
console.log("Initial player 0 team:", client.getState().G.players['0'].team);

// Call selectTeam(0)
client.moves.selectTeam(0);

const stateAfter = client.getState();
console.log("State after selectTeam phase:", stateAfter.ctx.phase);
console.log("Player 0 team after:", stateAfter.G.players['0'].team?.name);
console.log("Player 1 team after (CPU):", stateAfter.G.players['1'].team?.name);
console.log("Logs:", stateAfter.G.logs);
