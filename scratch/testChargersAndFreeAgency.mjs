import { DeflategateGame, calculateRefreshResults, triggerAbilityNotification } from '../src/Game.js';

// Setup basic game state
const G = DeflategateGame.setup({ ctx: { numPlayers: 4 } }, { numHumans: 1 });

// Assign Chargers to Player 0
G.players['0'].team = { id: 'chargers', name: 'Chargers' };
G.players['0'].outbidCount = 3;
G.players['0'].coins = 10;
G.players['0'].psi = 40;

// Assign other teams
G.players['1'].team = { id: 'chiefs', name: 'Chiefs' };
G.players['2'].team = { id: 'bills', name: 'Bills' };
G.players['3'].team = { id: 'eagles', name: 'Eagles' };

console.log('Testing calculateRefreshResults for Chargers...');
calculateRefreshResults(G);

const bannerHistory = G.board.gameLogBannerHistory || [];
const latestBanner = bannerHistory[0];

console.log('Latest Banner:', latestBanner);

if (!latestBanner) {
  console.error('FAIL: No banner event recorded in gameLogBannerHistory!');
  process.exit(1);
}

if (!latestBanner.text.includes('Chargers gained 3 coins by outbiding opposing teams')) {
  console.error(`FAIL: Banner text mismatch: "${latestBanner.text}"`);
  process.exit(1);
}

if (latestBanner.title !== 'Chargers Ability') {
  console.error(`FAIL: Banner title mismatch: "${latestBanner.title}"`);
  process.exit(1);
}

console.log('SUCCESS: Chargers ability banner verified!');
console.log('Banner Text:', latestBanner.text);
console.log('Banner Icon:', latestBanner.icon);
console.log('Banner Title:', latestBanner.title);
