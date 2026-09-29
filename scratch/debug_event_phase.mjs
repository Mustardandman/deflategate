import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  setupData: { numHumans: 0 }
});
client.start();

let state = client.getState();
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

console.log('Event Name:', state.G.board.activeEvent?.name, 'Category:', state.G.board.activeEvent?.category);
console.log('Before confirmEventReveal: phase =', state.ctx.phase, 'eventConfirmed =', state.G.board.eventConfirmed);

client.moves.confirmEventReveal();
state = client.getState();

console.log('After confirmEventReveal: phase =', state.ctx.phase);
console.log('Checks:');
console.log('eventConfirmed:', state.G.board.eventConfirmed);
console.log('pendingRivalry:', !!state.G.board.pendingRivalry);
console.log('pendingTradeRumors:', !!state.G.board.pendingTradeRumors);
console.log('tradeRumorsSummary:', !!state.G.board.tradeRumorsSummary);
console.log('bonusAuction:', !!state.G.board.bonusAuction);
console.log('pendingFreeAgency:', !!state.G.board.pendingFreeAgency);
console.log('pendingNewCapLimit:', !!state.G.board.pendingNewCapLimit);

process.exit(0);
