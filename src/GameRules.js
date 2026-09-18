/**
 * Deflategate - Custom Board Game Rules
 * Theme: NFL Football, Auction, Team Building
 * Mechanics: Bidding on active NFL players. Each player gives coins or deflates football.
 * Win Condition: First team to get to 0 PSI wins.
 */

// This file contains the data structures and constants for the game

export const INITIAL_TEAMS = {
  teamA: { id: 'teamA', name: 'Patriots', initialPsi: 12.5, coins: 100 },
  teamB: { id: 'teamB', name: 'Colts', initialPsi: 13.0, coins: 100 }
};

export const INITIAL_PLAYERS = [
  { id: 'p1', name: 'Tom Brady', cost: 50, effectType: 'deflate', effectValue: 2.0 },
  { id: 'p2', name: 'Peyton Manning', cost: 40, effectType: 'coins', effectValue: 20 },
  // Add more players here as needed
];
