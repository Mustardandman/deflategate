import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

// Create game with refreshPhase starting or test transition
const ModifiedGame = {
  ...DeflategateGame,
  phases: {
    ...DeflategateGame.phases,
    refreshPhase: {
      ...DeflategateGame.phases.refreshPhase,
      start: true
    }
  }
};

const client = Client({ game: ModifiedGame, numPlayers: 4, playerID: '0' });
client.start();

console.log('Phase at start:', client.getState().ctx.phase);
console.log('refreshStage at start:', client.getState().G.board.refreshStage);
console.log('inRefreshSummary:', client.getState().G.board.inRefreshSummary);

console.log('\nCalling startRefreshSequence()...');
client.moves.startRefreshSequence();
console.log('refreshStage:', client.getState().G.board.refreshStage, 'step:', client.getState().G.board.refreshStepIndex);

console.log('Calling advanceRefreshStep()...');
client.moves.advanceRefreshStep();
console.log('refreshStage:', client.getState().G.board.refreshStage, 'step:', client.getState().G.board.refreshStepIndex);

console.log('\nCalling confirmRefreshSummary()...');
client.moves.confirmRefreshSummary();

const nextState = client.getState();
console.log('Phase after confirmRefreshSummary:', nextState.ctx.phase);
console.log('Round after confirmRefreshSummary:', nextState.G.board.round);
console.log('Active event:', nextState.G.board.activeEvent?.name);
console.log('eventFlipRevealed:', nextState.G.board.eventFlipRevealed);
console.log('inRefreshSummary:', nextState.G.board.inRefreshSummary);
console.log('eventConfirmed:', nextState.G.board.eventConfirmed);
