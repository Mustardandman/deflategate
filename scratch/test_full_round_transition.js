import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({ game: DeflategateGame, numPlayers: 4, playerID: '0' });
client.start();

client.moves.selectTeam(0);
let state = client.getState();
console.log('After team select, phase:', state.ctx.phase);

// Confirm event
client.moves.confirmEventReveal();
state = client.getState();
console.log('After event confirm, phase:', state.ctx.phase);

// Now in auctionPhase: let everyone pass on all 4 cards or buy max
while (state.ctx.phase === 'auctionPhase') {
  if (state.G.board.activeAuctionCardIndex === null) {
    if (state.G.board.nominator === '0') {
      const idx = state.G.board.auctionPlayers.findIndex(c => c !== null);
      if (idx !== -1) client.moves.selectCard(idx);
    } else {
      client.moves.stepCpuTurn();
    }
  } else {
    // There is active card, all pass or current bids
    if (state.ctx.currentPlayer === '0') {
      client.moves.pass();
    } else {
      client.moves.stepCpuTurn();
    }
  }
  state = client.getState();
}

console.log('After auction, phase:', state.ctx.phase);

// postAuctionPhase if needed
if (state.ctx.phase === 'postAuctionPhase') {
  client.moves.billsPass();
  client.moves.eaglesPass();
  state = client.getState();
}

console.log('Phase before refresh:', state.ctx.phase);
console.log('inRefreshSummary:', state.G.board.inRefreshSummary);
console.log('refreshConfirmed:', state.G.board.refreshConfirmed);

// Call confirmRefreshSummary
console.log('Calling confirmRefreshSummary...');
client.moves.confirmRefreshSummary();

state = client.getState();
console.log('Phase AFTER confirmRefreshSummary:', state.ctx.phase);
console.log('Round AFTER confirmRefreshSummary:', state.G.board.round);
console.log('activeEvent AFTER confirmRefreshSummary:', state.G.board.activeEvent?.name);
console.log('eventFlipRevealed AFTER confirmRefreshSummary:', state.G.board.eventFlipRevealed);
console.log('inRefreshSummary AFTER confirmRefreshSummary:', state.G.board.inRefreshSummary);
