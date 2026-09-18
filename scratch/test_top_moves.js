import { Client } from 'boardgame.io/dist/cjs/client.js';
import { TEAMS } from '../src/GameData.js';

const TestGame = {
  name: 'deflategate-test',
  setup: (ctx) => {
    const players = {};
    const bucs = TEAMS.find(t => t.id === 'buccaneers');
    const saints = TEAMS.find(t => t.id === 'saints');
    const bills = TEAMS.find(t => t.id === 'bills');
    const rams = TEAMS.find(t => t.id === 'rams');

    players['0'] = { isCpu: false, teamChoices: [bucs, bills, rams], team: null, copiedTeam: null, coins: 0, psi: 0, lineup: [] };
    players['1'] = { isCpu: true, teamChoices: [saints, bills, rams], team: null, copiedTeam: null, coins: 0, psi: 0, lineup: [] };
    players['2'] = { isCpu: true, teamChoices: [bills, saints, rams], team: null, copiedTeam: null, coins: 0, psi: 0, lineup: [] };
    players['3'] = { isCpu: true, teamChoices: [rams, saints, bills], team: null, copiedTeam: null, coins: 0, psi: 0, lineup: [] };

    return { players, logs: [] };
  },
  moves: {
    selectTeam: ({ G, playerID, events }, teamIndex) => {
      const p = G.players[playerID || '0'];
      p.team = p.teamChoices[teamIndex];
      // Auto-assign CPU
      Object.keys(G.players).forEach(id => {
        if (id !== '0') {
          G.players[id].team = G.players[id].teamChoices[0];
        }
      });
      if (events && events.endPhase) events.endPhase();
    },
    copyAbility: ({ G, playerID, events }, targetTeamId) => {
      const p = G.players[playerID || '0'];
      const targetTeam = TEAMS.find(t => t.id === targetTeamId);
      p.copiedTeam = targetTeam;
      if (events && events.endPhase) events.endPhase();
    }
  },
  phases: {
    teamSelection: {
      start: true,
      turn: { activePlayers: { all: 'action' } },
      moves: {
        selectTeam: ({ G, playerID, events }, teamIndex) => {
          const p = G.players[playerID || '0'];
          p.team = p.teamChoices[teamIndex];
          Object.keys(G.players).forEach(id => {
            if (id !== '0') {
              G.players[id].team = G.players[id].teamChoices[0];
            }
          });
          if (events && events.endPhase) events.endPhase();
        }
      },
      next: 'buccaneersCopy'
    },
    buccaneersCopy: {
      turn: { activePlayers: { all: 'action' } },
      onBegin: ({ G, events }) => {
        const bucsPlayer = Object.values(G.players).find(p => p.team && p.team.id === 'buccaneers');
        if (!bucsPlayer) {
          if (events && events.endPhase) events.endPhase();
        }
      },
      moves: {
        copyAbility: ({ G, playerID, events }, targetTeamId) => {
          const p = G.players[playerID || '0'];
          const targetTeam = TEAMS.find(t => t.id === targetTeamId);
          p.copiedTeam = targetTeam;
          if (events && events.endPhase) events.endPhase();
        }
      },
      next: 'eventPhase'
    },
    eventPhase: {
      onBegin: ({ G }) => {
        G.started = true;
      }
    }
  }
};

const client = Client({
  game: TestGame,
  numPlayers: 4,
  playerID: '0',
});

client.start();

console.log("Initial phase:", client.getState().ctx.phase);
client.moves.selectTeam(0);
console.log("Phase after selectTeam:", client.getState().ctx.phase);
console.log("Player 0 team:", client.getState().G.players['0'].team?.name);

client.moves.copyAbility('saints');
console.log("Phase after copyAbility:", client.getState().ctx.phase);
console.log("Player 0 copiedTeam:", client.getState().G.players['0'].copiedTeam?.name);
