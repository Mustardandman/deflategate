import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('Testing all-CPU headless game execution...');

const startTime = Date.now();

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  setupData: { numHumans: 0 } // All 4 are CPU!
});
client.start();

let state = client.getState();
console.log('Initial phase:', state.ctx.phase);

// In teamSelection: let CPUs pick teams
// In Game.js, if all are CPU, let's see how teamSelection handles it
for (let i = 0; i < 4; i++) {
  if (!state.G.players[i.toString()].team) {
    client.moves.selectTeam(0, i.toString());
    state = client.getState();
  }
}

console.log('After team selection, phase:', state.ctx.phase);
console.log('Teams:', Object.values(state.G.players).map(p => p.team?.name || 'none'));

// Handle buccaneersCopy if active
if (state.ctx.phase === 'buccaneersCopy') {
  const bucsId = Object.keys(state.G.players).find(id => state.G.players[id].team?.id === 'buccaneers');
  if (bucsId) {
    const otherTeam = Object.values(state.G.players).find(p => p.team?.id !== 'buccaneers')?.team;
    if (otherTeam) client.moves.copyAbility(otherTeam.id, bucsId);
  }
  state = client.getState();
}

console.log('After bucs, phase:', state.ctx.phase);

// Check if titansDraft is active
if (state.ctx.phase === 'titansDraft') {
  client.moves.titansPickCard(0);
  state = client.getState();
}

console.log('After titans, phase:', state.ctx.phase);
console.log('Execution time so far:', Date.now() - startTime, 'ms');
process.exit(0);
