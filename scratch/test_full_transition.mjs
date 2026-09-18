import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Client } = require('boardgame.io/client');
import { DeflategateGame } from '../src/Game.js';

console.log('Testing full game transition to Round 2...');

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  playerID: '0'
});

client.start();

// 1. Pick team for P0
client.moves.selectTeam(0);
let state = client.getState();
console.log('Phase after selectTeam:', state.ctx.phase);

// 2. Buccaneers copy if active
if (state.ctx.phase === 'buccaneersCopy') {
  if (client.moves.copyAbility) {
    client.moves.copyAbility('dolphins');
  }
  state = client.getState();
  console.log('Phase after buccaneersCopy:', state.ctx.phase);
}

// 3. Titans draft if active
if (state.ctx.phase === 'titansDraft') {
  if (client.moves.draftTitansPlayer) {
    client.moves.draftTitansPlayer(0);
  }
  state = client.getState();
  console.log('Phase after titansDraft:', state.ctx.phase);
}

// 4. In eventPhase:
console.log('Round 1 Phase:', state.ctx.phase);
console.log('Round 1 Event Revealed:', state.G.board.activeEvent?.name);
console.log('Event flip revealed:', state.G.board.eventFlipRevealed);

// Confirm event reveal
client.moves.confirmEventReveal();
state = client.getState();
console.log('Phase after confirmEventReveal:', state.ctx.phase);

// 5. In preAuctionPhase:
if (state.ctx.phase === 'preAuctionPhase') {
  if (state.G.board.pendingRaiders && client.moves.raidersPass) client.moves.raidersPass();
  if (state.G.board.pendingCardinals && client.moves.cardinalsPass) client.moves.cardinalsPass();
  if (state.G.board.pendingChiefs && client.moves.chiefsPass) client.moves.chiefsPass();
  state = client.getState();
  console.log('Phase after preAuction:', state.ctx.phase);
}

// 6. In auctionPhase:
console.log('Phase is now:', state.ctx.phase);
let safety = 0;
while (state.ctx.phase === 'auctionPhase' && safety < 80) {
  safety++;
  if (state.G.pendingReplacement) {
    client.moves.replaceLineupCard(0);
    state = client.getState();
    continue;
  }
  
  const currentP = state.ctx.currentPlayer;
  if (state.G.players[currentP]?.isCpu) {
    client.moves.stepCpuTurn();
    state = client.getState();
    continue;
  }

  // Player 0 turn
  if (state.G.board.activeAuctionCardIndex === null) {
    const cardIdx = state.G.board.auctionPlayers.findIndex(c => c !== null);
    if (cardIdx !== -1) {
      console.log(`P0 Nominating card index ${cardIdx}...`);
      client.moves.selectCard(cardIdx);
      state = client.getState();
    }
  } else {
    const card = state.G.board.auctionPlayers[state.G.board.activeAuctionCardIndex];
    if (card) {
      const maxBid = (card.maxBid || 10) + (state.G.board.activeEvent?.category === 'overpaid' ? 4 : 0);
      const bidAmount = Math.min(maxBid, state.G.players['0'].coins);
      if (bidAmount >= (card.minBid || 1)) {
        console.log(`P0 Bidding ${bidAmount} on ${card.name}...`);
        client.moves.bid(bidAmount);
        state = client.getState();
      } else {
        client.moves.passBid();
        state = client.getState();
      }
    }
  }

  if (state.G.pendingReplacement) {
    client.moves.replaceLineupCard(0);
    state = client.getState();
  }
}

console.log('After auction, phase is:', state.ctx.phase);

// In postAuctionPhase
if (state.ctx.phase === 'postAuctionPhase') {
  client.moves.passEaglesAbility();
  state = client.getState();
  console.log('After postAuction, phase is:', state.ctx.phase);
}

// In refreshPhase
if (state.ctx.phase === 'refreshPhase') {
  console.log('In refreshPhase! Stage:', state.G.board.refreshStage);
  client.moves.startRefreshSequence();
  state = client.getState();
  console.log('Stage after startRefreshSequence:', state.G.board.refreshStage);
  
  while (state.G.board.refreshStage === 'animating') {
    client.moves.advanceRefreshStep();
    state = client.getState();
  }
  console.log('Stage after all steps:', state.G.board.refreshStage);
  console.log('About to click confirmRefreshSummary! Round is currently:', state.G.board.round);
  console.log('Current event is:', state.G.board.activeEvent?.name);
  console.log('eventConfirmed is:', state.G.board.eventConfirmed);

  // THIS IS THE MOVE THAT FAILS IN CURRENT CODE:
  client.moves.confirmRefreshSummary();
  state = client.getState();

  console.log('================ RESULT AFTER confirmRefreshSummary ================');
  console.log('ctx.phase:', state.ctx.phase);
  console.log('Round:', state.G.board.round);
  console.log('activeEvent:', state.G.board.activeEvent?.name);
  console.log('eventFlipRevealed:', state.G.board.eventFlipRevealed);
  console.log('===================================================================');

  // Now verify Round 2 event confirmation works and goes to auction/refresh
  if (state.ctx.phase === 'eventPhase' && state.G.board.eventFlipRevealed) {
    console.log('\n--- CONFIRMING ROUND 2 EVENT ---');
    client.moves.confirmEventReveal();
    state = client.getState();
    console.log('Phase after Round 2 confirmEventReveal:', state.ctx.phase);
  }
}
