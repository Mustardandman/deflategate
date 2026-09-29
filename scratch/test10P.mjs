import { testCandidateStrategy } from './testBillsPlaytest.mjs';

console.log('Testing 10-Player Table Performance...');
testCandidateStrategy('Candidate B (10 Players)', {
  discardCashBoostMaxCoins: 5,
  discardMinInstantDeflateEarly: 6,
  discardMinInstantDeflatePhase2: 5,
  discardToxicCleanseBonus: 3.5
}, 100, 10, 7777);
