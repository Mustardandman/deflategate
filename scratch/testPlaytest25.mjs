import { EVENTS } from '../src/GameData.js';
import { getEffectiveCardMaxBid } from '../src/Game.js';

console.log('--- Testing Playtest 25 Changes ---');

// 1. Check New Cap Limit event definition
const newCapLimit = EVENTS.find(e => e.name === 'New Cap Limit');
console.log('New Cap Limit event:', newCapLimit);
if (!newCapLimit) {
  throw new Error('New Cap Limit event not found!');
}
if (newCapLimit.category !== 'overpaid') {
  throw new Error(`Expected category "overpaid", got "${newCapLimit.category}"`);
}
if (newCapLimit.maxAdd !== 4) {
  throw new Error(`Expected maxAdd 4, got "${newCapLimit.maxAdd}"`);
}

// 2. Check getEffectiveCardMaxBid with New Cap Limit
const testCard = { id: 'c1', name: 'Test Player', minBid: 2, maxBid: 8 };
const effBid = getEffectiveCardMaxBid(testCard, newCapLimit);
console.log(`Original maxBid: ${testCard.maxBid}, Effective maxBid with New Cap Limit: ${effBid}`);
if (effBid !== 12) {
  throw new Error(`Expected effective max bid 12, got ${effBid}`);
}

// 3. Check getEffectiveCardMaxBid without event
const normalBid = getEffectiveCardMaxBid(testCard, null);
if (normalBid !== 8) {
  throw new Error(`Expected normal max bid 8, got ${normalBid}`);
}

console.log('✅ All Playtest 25 test assertions passed!');
