import { Client } from 'boardgame.io/dist/cjs/client.js';
import { SocketIO } from 'boardgame.io/dist/cjs/multiplayer.js';
import { DeflategateGame } from '../src/Game.js';

console.log('Testing boardgame.io client connection to server...');

const client1 = Client({
  game: DeflategateGame,
  multiplayer: SocketIO({ server: 'http://localhost:8000' }),
  matchID: 'test-room-1',
  playerID: '0',
  numPlayers: 4
});

client1.start();

client1.subscribe(state => {
  if (state) {
    console.log('Client 1 received state! Round:', state.G?.board?.round, 'Phase:', state.ctx?.phase);
    console.log('Player 0 teamChoices:', state.G?.players?.['0']?.teamChoices?.map(t => t.name));
    
    // Clean up and exit
    client1.stop();
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('Timeout waiting for state from server');
  client1.stop();
  process.exit(1);
}, 5000);
