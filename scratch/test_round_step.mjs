import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

console.log('Testing full round execution...');
const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  setupData: { numHumans: 0 }
});
client.start();

let state = client.getState();

// 1. Team selection
for (let i = 0; i < 4; i++) {
  if (!state.G.players[i.toString()].team) {
    client.moves.selectTeam(0, i.toString());
    state = client.getState();
  }
}
if (state.ctx.phase === 'buccaneersCopy') {
  const bucsId = Object.keys(state.G.players).find(id => state.G.players[id].team?.id === 'buccaneers');
  if (bucsId) {
    const otherTeam = Object.values(state.G.players).find(p => p.team?.id !== 'buccaneers')?.team;
    if (otherTeam) client.moves.copyAbility(otherTeam.id, bucsId);
  }
  state = client.getState();
}
if (state.ctx.phase === 'titansDraft') {
  client.moves.titansPickCard(0);
  state = client.getState();
}

console.log('Round 1 phase:', state.ctx.phase);

// 2. Event phase
if (state.ctx.phase === 'eventPhase') {
  client.moves.confirmEventReveal();
  state = client.getState();
}
console.log('After confirmEventReveal:', state.ctx.phase);

// 3. Pre-auction phase (if Chiefs or similar)
if (state.ctx.phase === 'preAuctionPhase') {
  state = client.getState();
}
console.log('After preAuctionPhase:', state.ctx.phase);

// 4. Auction phase: step CPU turns
let steps = 0;
while (state.ctx.phase === 'auctionPhase' && steps < 100) {
  // If replacement pending for a CPU, CPU auto-replaces
  if (state.G.pendingReplacement) {
    const pId = state.G.pendingReplacement.playerID;
    client.moves.confirmReplacement(0, pId);
  } else {
    client.moves.stepCpuTurn();
  }
  state = client.getState();
  steps++;
}
console.log(`Auction phase completed after ${steps} steps! Next phase:`, state.ctx.phase);
console.log('Cards won this round:', Object.values(state.G.players).map(p => p.team?.name + ': ' + (p.hasWonAuction ? 'WON' : 'NOT WON')));

// 5. Post auction phase (if proceeding to refresh)
if (state.ctx.phase === 'postAuctionPhase') {
  if (state.G.board.cardWonFlyAnimation) {
    client.moves.dismissCardWonFlyAnimation();
  }
  client.moves.proceedToRefresh();
  state = client.getState();
}
console.log('After postAuctionPhase:', state.ctx.phase);

// 6. Refresh phase
if (state.ctx.phase === 'refreshPhase') {
  // If Puka pending choice
  if (state.G.board.pendingPukaChoice) {
    client.moves.confirmPukaChoice(0);
  }
  client.moves.confirmRefreshSummary();
  state = client.getState();
}
console.log('After confirmRefreshSummary: Round', state.G.board.round, 'Phase:', state.ctx.phase);
process.exit(0);
