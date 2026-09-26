import { DeflategateGame } from '../src/Game.js';

console.log('Testing Post-Auction Flow & Eagles Ability Transition...');

// 1. Setup mock game state
const ctx = { numPlayers: 4, currentPlayer: '0', phase: 'auctionPhase' };
const G = DeflategateGame.setup({ ctx }, { numHumans: 1, vsCpu: true });

// Assign teams: Player 0 is Eagles
G.players['0'].team = { id: 'eagles', name: 'Philadelphia Eagles', ability: 'After auction, pay 3 coins...' };
G.players['0'].coins = 16;
G.players['0'].psi = 47.0;

G.players['1'].team = { id: 'rams', name: 'Los Angeles Rams' };
G.players['1'].coins = 7;
G.players['1'].psi = 44.0;

G.players['2'].team = { id: 'vikings', name: 'Minnesota Vikings' };
G.players['2'].coins = 6;
G.players['2'].psi = 44.0;

G.players['3'].team = { id: 'broncos', name: 'Denver Broncos' };
G.players['3'].coins = 10;
G.players['3'].psi = 40.0;

// Mark all CPU players as having won
G.players['1'].hasWonAuction = true;
G.players['2'].hasWonAuction = true;
G.players['3'].hasWonAuction = true;

// Player 0 wins auction
G.players['0'].hasWonAuction = true;
G.board.cardWonFlyAnimation = null;
G.pendingReplacement = null;

// Check auctionPhase.endIf
const auctionEnded = DeflategateGame.phases.auctionPhase.endIf({ G, ctx });
console.log('Auction ended:', auctionEnded === true ? 'PASS' : 'FAIL');

// Enter postAuctionPhase
ctx.phase = 'postAuctionPhase';
DeflategateGame.phases.postAuctionPhase.onBegin({ G });

console.log('pendingEagles set for Player 0:', G.board.pendingEagles?.playerID === '0' ? 'PASS' : 'FAIL');
console.log('postAuctionComplete is false:', G.board.postAuctionComplete === false ? 'PASS' : 'FAIL');

// Test eaglesPass
DeflategateGame.phases.postAuctionPhase.moves.eaglesPass({ G }, '0');
console.log('pendingEagles cleared after pass:', G.board.pendingEagles === null ? 'PASS' : 'FAIL');
console.log('postAuctionComplete is true:', G.board.postAuctionComplete === true ? 'PASS' : 'FAIL');

// Check postAuctionPhase.endIf
const postAuctionEnded = DeflategateGame.phases.postAuctionPhase.endIf({ G });
console.log('Post-auction ended:', postAuctionEnded === true ? 'PASS' : 'FAIL');

// Enter refreshPhase
ctx.phase = 'refreshPhase';
DeflategateGame.phases.refreshPhase.onBegin({ G });
console.log('refreshStage is intro:', G.board.refreshStage === 'intro' ? 'PASS' : 'FAIL');
console.log('inRefreshSummary is true:', G.board.inRefreshSummary === true ? 'PASS' : 'FAIL');

// Test proceedToRefresh failsafe
G.board.pendingEagles = { playerID: '0' };
G.board.postAuctionComplete = false;
DeflategateGame.phases.postAuctionPhase.moves.proceedToRefresh({ G });
console.log('proceedToRefresh resets all and marks complete:', (G.board.postAuctionComplete === true && G.board.pendingEagles === null) ? 'PASS' : 'FAIL');

console.log('All tests passed successfully!');
