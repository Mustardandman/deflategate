import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({
  game: DeflategateGame,
  numPlayers: 4
});

client.start();
console.log('Initial phase:', client.getState().ctx.phase);

// Select teams
client.moves.selectTeam(0);
console.log('After team selection phase:', client.getState().ctx.phase);

// Advance if bucs/titans
let state = client.getState();
if (state.ctx.phase === 'buccaneersCopy') {
  client.moves.copyAbility('saints');
}
state = client.getState();
if (state.ctx.phase === 'titansDraft') {
  client.moves.titansPickCard(0);
}

state = client.getState();
console.log('Event phase reached:', state.ctx.phase, 'Round:', state.G.board.round, 'Event:', state.G.board.activeEvent?.name);

// Confirm event
client.moves.confirmEventReveal();
state = client.getState();
console.log('Phase after confirmEventReveal:', state.ctx.phase);

// If preAuction, advance
if (state.ctx.phase === 'preAuctionPhase') {
  console.log('In preAuctionPhase, checking pending...');
}

// Let's force G into refreshPhase or advance all auctions
console.log('Nominator:', state.G.board.nominator, 'FirstPlayer:', state.G.board.firstPlayer);

// Helper to resolve an auction
while (state.ctx.phase === 'auctionPhase' && !Object.values(state.G.players).every(p => p.hasWonAuction)) {
  const nom = state.G.board.nominator;
  const nomClient = Client({ game: DeflategateGame, numPlayers: 4, playerID: nom });
  // We can also directly run moves via client if activePlayers allows all:
  const cardIdx = state.G.board.auctionPlayers.findIndex(c => c !== null);
  if (cardIdx === -1) break;
  if (state.G.board.activeAuctionCardIndex === null) {
    client.moves.selectCard(cardIdx);
  }
  state = client.getState();
  if (state.G.board.activeAuctionCardIndex !== null) {
    const card = state.G.board.auctionPlayers[state.G.board.activeAuctionCardIndex];
    client.moves.bid(card.maxBid);
  }
  state = client.getState();
}

console.log('After loop, phase:', state.ctx.phase);
if (state.ctx.phase === 'auctionPhase') {
  // Let's check why auctionPhase didn't end:
  console.log('hasWonAuction status:', Object.keys(state.G.players).map(id => `${id}: ${state.G.players[id].hasWonAuction}`));
  console.log('pendingReplacement:', state.G.pendingReplacement);
}

state = client.getState();
console.log('Phase after auction:', state.ctx.phase);

// If postAuctionPhase
if (state.ctx.phase === 'postAuctionPhase') {
  console.log('In postAuctionPhase');
}

state = client.getState();
console.log('Current phase:', state.ctx.phase);
console.log('inRefreshSummary:', state.G.board.inRefreshSummary);
console.log('refreshResults:', state.G.board.refreshResults?.length);

// Call confirmRefreshSummary
console.log('Calling confirmRefreshSummary...');
client.moves.confirmRefreshSummary();

state = client.getState();
console.log('Phase after confirmRefreshSummary:', state.ctx.phase);
console.log('Round after confirmRefreshSummary:', state.G.board.round);
console.log('activeEvent:', state.G.board.activeEvent?.name);
console.log('eventFlipRevealed:', state.G.board.eventFlipRevealed);
console.log('inRefreshSummary:', state.G.board.inRefreshSummary);
