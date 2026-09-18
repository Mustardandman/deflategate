import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({ game: DeflategateGame, numPlayers: 4, playerID: '0' });
client.start();

client.moves.selectTeam(0);
console.log('Phase 1:', client.getState().ctx.phase);
client.moves.confirmEventReveal();
console.log('Phase 2:', client.getState().ctx.phase);

// Let's force auction end by using skipToHumanTurn or buying cards
// In App.jsx, how does the user play?
// User selects card, bids max or passes, CPU steps.
// Let's simulate exact moves:
for (let round = 1; round <= 2; round++) {
  console.log(`\n=== STARTING ROUND ${client.getState().G.board.round} (phase: ${client.getState().ctx.phase}) ===`);
  
  if (client.getState().ctx.phase === 'eventPhase') {
    console.log('Active event:', client.getState().G.board.activeEvent?.name);
    console.log('eventFlipRevealed:', client.getState().G.board.eventFlipRevealed);
    client.moves.confirmEventReveal();
    console.log('After confirmEventReveal, phase:', client.getState().ctx.phase);
  }

  // preAuction
  if (client.getState().ctx.phase === 'preAuctionPhase') {
    console.log('In preAuctionPhase, advancing...');
    client.moves.cardinalsPass();
    client.moves.chiefsPass();
  }

  console.log('Phase now:', client.getState().ctx.phase);

  // Auction: simulate 4 card purchases
  while (client.getState().ctx.phase === 'auctionPhase') {
    const s = client.getState();
    const curP = s.ctx.currentPlayer;
    const isCpu = s.G.players[curP].isCpu;
    if (s.G.board.activeAuctionCardIndex === null) {
      if (curP === '0') {
        const cIdx = s.G.board.auctionPlayers.findIndex(c => c !== null);
        if (cIdx !== -1) client.moves.selectCard(cIdx);
      } else {
        client.moves.stepCpuTurn();
      }
    } else {
      if (curP === '0') {
        // Human bids max or passes
        const card = s.G.board.auctionPlayers[s.G.board.activeAuctionCardIndex];
        if (s.G.players['0'].coins >= card.minBid) {
          client.moves.bid(Math.min(s.G.players['0'].coins, card.maxBid));
        } else {
          client.moves.pass();
        }
      } else {
        client.moves.stepCpuTurn();
      }
    }
  }

  console.log('After auction, phase:', client.getState().ctx.phase);

  // postAuction
  if (client.getState().ctx.phase === 'postAuctionPhase') {
    client.moves.billsPass();
    client.moves.eaglesPass();
  }

  console.log('Phase now (should be refreshPhase):', client.getState().ctx.phase);
  console.log('inRefreshSummary:', client.getState().G.board.inRefreshSummary);
  console.log('refreshConfirmed:', client.getState().G.board.refreshConfirmed);

  // Now in refreshPhase:
  // Call confirmRefreshSummary
  console.log('Calling confirmRefreshSummary()...');
  client.moves.confirmRefreshSummary();

  console.log('After confirmRefreshSummary:');
  console.log('Phase:', client.getState().ctx.phase);
  console.log('Round:', client.getState().G.board.round);
  console.log('Active Event:', client.getState().G.board.activeEvent?.name);
  console.log('eventFlipRevealed:', client.getState().G.board.eventFlipRevealed);
  console.log('inRefreshSummary:', client.getState().G.board.inRefreshSummary);
}
