import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({
  game: DeflategateGame,
  numPlayers: 4
});
client.start();

// Pick teams
client.moves.selectTeam(0);
if (client.getState().ctx.phase === 'buccaneersCopy') client.moves.copyAbility('saints');
if (client.getState().ctx.phase === 'titansDraft') client.moves.titansPickCard(0);

console.log('Phase 1:', client.getState().ctx.phase, 'Round:', client.getState().G.board.round);
client.moves.confirmEventReveal();
console.log('Phase 2:', client.getState().ctx.phase);

let cur = client.getState();
let safety = 0;
while (cur.ctx.phase === 'auctionPhase' && safety < 100) {
  safety++;
  console.log(`Step ${safety}: nominator=${cur.G.board.nominator} activeCard=${cur.G.board.activeAuctionCardIndex} currentP=${cur.ctx.currentPlayer} hasWon=${Object.keys(cur.G.players).map(id => cur.G.players[id].hasWonAuction)}`);
  if (cur.G.board.activeAuctionCardIndex === null) {
    if (String(cur.G.board.nominator) === '0') {
      const cardIdx = cur.G.board.auctionPlayers.findIndex(c => c !== null);
      if (cardIdx !== -1) client.moves.selectCard(cardIdx);
    } else {
      client.moves.stepCpuTurn();
    }
  } else {
    // There is an active card
    if (cur.ctx.currentPlayer === '0' && !cur.G.players['0'].hasWonAuction) {
      const card = cur.G.board.auctionPlayers[cur.G.board.activeAuctionCardIndex];
      if (cur.G.players['0'].coins >= card.minBid) {
        client.moves.bid(card.minBid);
      } else {
        client.moves.pass();
      }
    } else {
      client.moves.stepCpuTurn();
    }
  }
  cur = client.getState();
}

// If postAuctionPhase, postAuctionComplete = true
if (client.getState().ctx.phase === 'postAuctionPhase') {
  client.moves.billsPass();
}
console.log('Phase after postAuction:', client.getState().ctx.phase);

// Now in refreshPhase!
console.log('IN REFRESH PHASE? Phase =', client.getState().ctx.phase);
console.log('inRefreshSummary =', client.getState().G.board.inRefreshSummary);
console.log('Calling confirmRefreshSummary...');
client.moves.confirmRefreshSummary();

console.log('AFTER confirmRefreshSummary:');
console.log('Phase =', client.getState().ctx.phase);
console.log('Round =', client.getState().G.board.round);
console.log('activeEvent =', client.getState().G.board.activeEvent?.name);
console.log('eventFlipRevealed =', client.getState().G.board.eventFlipRevealed);
console.log('eventConfirmed =', client.getState().G.board.eventConfirmed);
