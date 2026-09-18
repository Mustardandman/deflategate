import { Client } from 'boardgame.io/dist/cjs/client.js';

const TestGame = {
  phases: {
    phaseA: {
      start: true,
      moves: {
        goNext: ({ events }) => { events.endPhase(); }
      },
      next: 'phaseB'
    },
    phaseB: {
      onBegin: ({ events }) => {
        console.log('Inside phaseB onBegin, calling events.endPhase()');
        events.endPhase();
      },
      moves: {
        dummy: () => {}
      },
      endIf: () => true,
      next: 'phaseC'
    },
    phaseC: {
      moves: {
        cMove: () => {}
      }
    }
  }
};

const client = Client({ game: TestGame });
client.start();
console.log('Start phase:', client.getState().ctx.phase);
client.moves.goNext();
console.log('After goNext, phase:', client.getState().ctx.phase);
