import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

// Custom setup where player 0 gets Buccaneers
const CustomGame = {
  ...DeflategateGame,
  setup: (ctx_args) => {
    const orig = DeflategateGame.setup(ctx_args);
    // Force player 0 choices to include Buccaneers
    const bucs = TEAMS.find(t => t.id === 'buccaneers');
    const saints = TEAMS.find(t => t.id === 'saints');
    orig.players['0'].teamChoices[0] = bucs;
    orig.players['1'].teamChoices[0] = saints;
    return orig;
  }
};

const client = Client({
  game: CustomGame,
  numPlayers: 4,
  playerID: '0',
});

client.start();

console.log("Phase before:", client.getState().ctx.phase);
// Player 0 selects Buccaneers (index 0)
client.moves.selectTeam(0);

console.log("Phase after selectTeam:", client.getState().ctx.phase);
console.log("Player 0 team:", client.getState().G.players['0'].team?.name);

// Now in buccaneersCopy, try calling copyAbility('saints')
client.moves.copyAbility('saints');

const stateAfter = client.getState();
console.log("Phase after copyAbility:", stateAfter.ctx.phase);
console.log("Player 0 copiedTeam:", stateAfter.G.players['0'].copiedTeam?.name);
console.log("Logs:", stateAfter.G.logs);
