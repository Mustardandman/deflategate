import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, resolveAuctionWin, getEffectiveTeamId, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log('========================================================================');
console.log('TEST SUITE: PLAYTEST 65 - SAINTS & PANTHERS + TOXIC REPLACEMENT VERIFICATION');
console.log('========================================================================\n');

// Test 1: Non-Saints CPU replaces recurring toxic card before practice squad on auction win
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'vikings' };
  p.lineup = [
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 1' },
    { id: 'hunter_henry', name: 'Hunter Henry', effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 2' }
  ];
  const newCard = { id: 'justin_jefferson', name: 'Justin Jefferson', effects: [{ type: 'deflate', amount: 3, perRound: true }] };
  resolveAuctionWin(G, '0', newCard);
  const replacedHenry = !p.lineup.some(c => c.id === 'hunter_henry');
  const keptPs = p.lineup.filter(c => c.isPracticeSquad).length === 2;
  assert(replacedHenry && keptPs, 'Non-Saints CPU (Vikings) replaces toxic Hunter Henry before Practice Squad');
}

// Test 2: Non-Saints CPU replaces Ezekiel Elliott (-2 coins/rd) before practice squad
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'packers' };
  p.lineup = [
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 1' },
    { id: 'ezekiel_elliott', name: 'Ezekiel Elliott', effects: [{ type: 'deflate', amount: 5, perRound: false }, { type: 'coins', amount: -2, perRound: true }] },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 2' }
  ];
  const newCard = { id: 'christian_watson', name: 'Christian Watson', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  resolveAuctionWin(G, '0', newCard);
  const replacedZeke = !p.lineup.some(c => c.id === 'ezekiel_elliott');
  const keptPs = p.lineup.filter(c => c.isPracticeSquad).length === 2;
  assert(replacedZeke && keptPs, 'Non-Saints CPU (Packers) replaces toxic Ezekiel Elliott before Practice Squad');
}

// Test 3: Saints keeps Deshaun Watson (+5 coins/rd) and replaces Practice Squad instead
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'saints' };
  p.lineup = [
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 1' },
    { id: 'deshaun_watson', name: 'Deshaun Watson', effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 2' }
  ];
  const newCard = { id: 'christian_watson', name: 'Christian Watson', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  resolveAuctionWin(G, '0', newCard);
  const keptWatson = p.lineup.some(c => c.id === 'deshaun_watson');
  const replacedPs = p.lineup.filter(c => c.isPracticeSquad).length === 1;
  assert(keptWatson && replacedPs, 'Saints immune to drawback keeps Deshaun Watson and replaces Practice Squad');
}

// Test 4: Saints Nomination targets unowned toxic card when affordable
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'saints' };
  p.psi = 40;
  p.coins = 12;
  p.lineup = [
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 1' },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 2' },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 3' }
  ];
  G.board.auctionPlayers = [
    { id: 'xavier_legette', name: 'Xavier Legette', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { id: 'hunter_henry', name: 'Hunter Henry', minBid: 1, effects: [{ type: 'deflate', amount: 8, perRound: false }, { type: 'inflate', amount: 3, perRound: true }] },
    { id: 'rome_odunze', name: 'Rome Odunze', minBid: 1, effects: [{ type: 'coins', amount: 3, perRound: false }] },
    { id: 'brian_thomas_jr', name: 'Brian Thomas Jr', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: false }] }
  ];
  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert(nominatedIdx === 1, 'Saints nomination targets unowned toxic bargain (Hunter Henry) over generic cards');
}

// Test 5: Saints Nomination prioritizes instant closer nuke when <= 16 PSI
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'saints' };
  p.psi = 8;
  p.coins = 10;
  p.lineup = [
    { id: 'deshaun_watson', name: 'Deshaun Watson', effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 2' },
    { id: 'practice_squad', isPracticeSquad: true, name: 'Practice Squad 3' }
  ];
  G.board.auctionPlayers = [
    { id: 'ezekiel_elliott', name: 'Ezekiel Elliott', minBid: 1, effects: [{ type: 'deflate', amount: 5, perRound: false }, { type: 'coins', amount: -2, perRound: true }] },
    { id: 'tony_pollard', name: 'Tony Pollard', minBid: 2, effects: [{ type: 'deflate', amount: 8, perRound: false }] },
    { id: 'rome_odunze', name: 'Rome Odunze', minBid: 1, effects: [{ type: 'coins', amount: 3, perRound: false }] },
    { id: 'brian_thomas_jr', name: 'Brian Thomas Jr', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: false }] }
  ];
  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert(nominatedIdx === 1, 'Saints closer mode (PSI <= 16) prioritizes instant 8 deflate closer (Tony Pollard)');
}

// Test 6: Panthers Card Evaluation gives +6 bonus to recurring deflation >= 2
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'panthers' };
  p.psi = 40;
  p.coins = 10;
  const bowers = { id: 'brock_bowers', name: 'Brock Bowers', effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const score = scoreCardForPlayer(G, '0', bowers);
  assert(score >= 25.0, `Panthers scores recurring deflation engine exceptionally high (score: ${score})`);
}

// Test 7: Panthers Nomination prioritizes recurring deflation engine in early rounds
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'panthers' };
  p.psi = 45;
  p.coins = 10;
  G.board.auctionPlayers = [
    { id: 'rome_odunze', name: 'Rome Odunze', minBid: 1, effects: [{ type: 'coins', amount: 3, perRound: false }] },
    { id: 'brock_bowers', name: 'Brock Bowers', minBid: 2, effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { id: 'xavier_legette', name: 'Xavier Legette', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { id: 'brian_thomas_jr', name: 'Brian Thomas Jr', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: false }] }
  ];
  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert(nominatedIdx === 1, 'Panthers nomination selects recurring deflation engine (Brock Bowers)');
}

// Test 8: Panthers Nomination switches to closer mode when <= 16 PSI
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { _random: Math.random, Shuffle: (a) => a } }, { numHumans: 0, vsCpu: true });
  const p = G.players['0'];
  p.team = { id: 'panthers' };
  p.psi = 8;
  p.coins = 10;
  G.board.auctionPlayers = [
    { id: 'brock_bowers', name: 'Brock Bowers', minBid: 2, effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { id: 'derrick_henry', name: 'Derrick Henry', minBid: 2, effects: [{ type: 'deflate', amount: 8, perRound: false }] },
    { id: 'xavier_legette', name: 'Xavier Legette', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { id: 'brian_thomas_jr', name: 'Brian Thomas Jr', minBid: 1, effects: [{ type: 'coins', amount: 2, perRound: false }] }
  ];
  const nominatedIdx = chooseCpuNominationCard(G, '0');
  assert(nominatedIdx === 1, 'Panthers switches to game-winning closer (Derrick Henry) when PSI <= 16');
}

// Test 9: Active genomes in teamGenomes and evolvedWeights match target calibrations
{
  const sGenome = ACTIVE_TEAM_GENOMES.saints;
  const pGenome = ACTIVE_TEAM_GENOMES.panthers;
  const sValid = sGenome.deflateWeight === 2.15 && sGenome.reserveCoins === 1 && sGenome.superstarPriorityMult === 1.25;
  const pValid = pGenome.deflateWeight === 2.15 && pGenome.recurringMult === 1.20 && pGenome.threatDefenseWeight === 1.25;
  assert(sValid && pValid, 'Genomes for Saints and Panthers are calibrated with calibrated weights');
}

console.log(`\nResults: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
