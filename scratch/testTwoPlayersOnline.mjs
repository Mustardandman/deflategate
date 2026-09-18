import assert from 'assert';
import { Server } from 'boardgame.io/dist/cjs/server.js';
import { Client } from 'boardgame.io/dist/cjs/client.js';
import { SocketIO } from 'boardgame.io/dist/cjs/multiplayer.js';
import { DeflategateGame } from '../src/Game.js';

console.log('Testing two online clients playing in the same room with setNumHumans(2)...');

const server = Server({ games: [DeflategateGame], origins: [/.*/] });
const testPort = 8015;

server.run(testPort, async () => {
  const matchID = `couples-test-${Date.now()}`;

  const clientHost = Client({
    game: DeflategateGame,
    multiplayer: SocketIO({ server: `http://localhost:${testPort}` }),
    matchID,
    playerID: '0',
    numPlayers: 4
  });

  const clientWife = Client({
    game: DeflategateGame,
    multiplayer: SocketIO({ server: `http://localhost:${testPort}` }),
    matchID,
    playerID: '1',
    numPlayers: 4
  });

  clientHost.start();
  clientWife.start();

  await new Promise(r => setTimeout(r, 1000));

  // Host sets 2 humans
  clientHost.moves.setNumHumans(2);
  await new Promise(r => setTimeout(r, 500));

  assert.strictEqual(clientHost.getState().G.numHumans, 2, 'Host should see numHumans = 2');
  assert.strictEqual(clientWife.getState().G.numHumans, 2, 'Wife should see numHumans = 2');
  assert.strictEqual(clientHost.getState().G.players['0'].isCpu, false, 'Player 0 is human');
  assert.strictEqual(clientHost.getState().G.players['1'].isCpu, false, 'Player 1 is human');
  assert.strictEqual(clientHost.getState().G.players['2'].isCpu, true, 'Player 2 is CPU');
  assert.strictEqual(clientHost.getState().G.players['3'].isCpu, true, 'Player 3 is CPU');
  console.log('  ✔ setNumHumans(2) synced across both host and wife clients');

  // Host drafts team
  const hostTeamChoice = clientHost.getState().G.players['0'].teamChoices[0];
  clientHost.moves.selectTeam(0, '0');
  await new Promise(r => setTimeout(r, 500));

  assert.strictEqual(clientHost.getState().G.players['0'].team?.id, hostTeamChoice.id);
  assert.strictEqual(clientWife.getState().G.players['0'].team?.id, hostTeamChoice.id);
  assert.strictEqual(clientWife.getState().ctx.phase, 'teamSelection', 'Phase must remain teamSelection until Wife drafts');
  console.log(`  ✔ Host selected team ${hostTeamChoice.name}; phase stays in teamSelection for wife`);

  // Wife drafts team
  const wifeTeamChoice = clientWife.getState().G.players['1'].teamChoices[0];
  clientWife.moves.selectTeam(0, '1');
  await new Promise(r => setTimeout(r, 500));

  assert.strictEqual(clientHost.getState().G.players['1'].team?.id, wifeTeamChoice.id);
  assert.strictEqual(clientWife.getState().G.players['1'].team?.id, wifeTeamChoice.id);
  console.log(`  ✔ Wife selected team ${wifeTeamChoice.name}; both humans have drafted!`);

  // Verify CPUs 2 and 3 were auto-assigned and phase transitioned
  assert(clientHost.getState().G.players['2'].team !== null, 'CPU 2 auto-assigned team');
  assert(clientHost.getState().G.players['3'].team !== null, 'CPU 3 auto-assigned team');
  console.log('  ✔ CPUs automatically assigned remaining teams, phase advanced smoothly!');

  console.log('\n🎉 ALL TWO-PLAYER ONLINE SYNC CHECKS PASSED WITH ZERO ERRORS!');

  clientHost.stop();
  clientWife.stop();
  process.exit(0);
});
