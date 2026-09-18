import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  playerID: '0',
});

client.start();

// Fast-forward setup
client.moves.selectTeam(0);
if (client.getState().ctx.phase === 'buccaneersCopy') {
  client.moves.copyAbility('bills');
}
if (client.getState().ctx.phase === 'eventPhase') {
  client.moves.confirmEventReveal();
}

console.log("Phase:", client.getState().ctx.phase);
console.log("Current nominator:", client.getState().G.board.nominator);
console.log("Current player:", client.getState().ctx.currentPlayer);

// Step 1: Human nominates card 0
console.log("\n--- Human Nominates Card 0 ---");
client.moves.selectCard(0);
console.log("Active card index:", client.getState().G.board.activeAuctionCardIndex);

// Step 2: Human bids starting bid
console.log("\n--- Human Bids ---");
const card = client.getState().G.board.auctionPlayers[0];
client.moves.bid(card.minBid);

console.log("Highest bid:", client.getState().G.board.highestBid);
console.log("Highest bidder:", client.getState().G.board.highestBidder);
console.log("Current player after bid:", client.getState().ctx.currentPlayer);
console.log("Is current player CPU?:", client.getState().G.players[client.getState().ctx.currentPlayer]?.isCpu);

// Step 3: Call stepCpuTurn()
console.log("\n--- Call stepCpuTurn() ---");
client.moves.stepCpuTurn();

console.log("Current player after 1st stepCpuTurn:", client.getState().ctx.currentPlayer);
console.log("Highest bid:", client.getState().G.board.highestBid);
console.log("Highest bidder:", client.getState().G.board.highestBidder);

// Step 4: Call stepCpuTurn() again
console.log("\n--- Call 2nd stepCpuTurn() ---");
client.moves.stepCpuTurn();

console.log("Current player after 2nd stepCpuTurn:", client.getState().ctx.currentPlayer);
console.log("Highest bid:", client.getState().G.board.highestBid);
console.log("Highest bidder:", client.getState().G.board.highestBidder);

console.log("\nRecent Logs:");
client.getState().G.logs.slice(0, 5).forEach(l => console.log("-", l.text));
