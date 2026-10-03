import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, scoreCardForPlayer, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  PASS: ${message}`);
  } else {
    console.error(`  FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('PLAYTEST 62: GREEN BAY PACKERS VERIFICATION SUITE');
console.log('========================================================================================\n');

function createPackersState({ packersCoins = 8, packersPsi = 50, round = 1, lineupCards = [] } = {}) {
  const G = {
    board: {
      round,
      nominator: '0',
      auctionPlayers: [],
      activeEvent: null,
      passedAuctionPlayers: []
    },
    players: {
      '0': {
        team: { id: 'packers', name: 'Packers', initialPsi: 50, coins: 8 },
        coins: packersCoins,
        psi: packersPsi,
        lineup: lineupCards.length > 0 ? lineupCards : [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
        ],
        hasWonAuction: false,
        genome: { ...ACTIVE_TEAM_GENOMES.packers }
      },
      '1': {
        team: { id: 'bears', name: 'Bears', initialPsi: 42, coins: 13 },
        coins: 13,
        psi: 42,
        lineup: [
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_0' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_1' },
          { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1_2' }
        ],
        hasWonAuction: false,
        genome: { ...ACTIVE_TEAM_GENOMES.bears }
      }
    }
  };
  return G;
}

// Test 1: Practice Squad are NOT phase 1 players
console.log('Test 1: Practice Squad Rule Verification (Ability Requires 3 Phase 1 Starters)');
{
  const p0 = {
    lineup: [
      { id: 'malik_nabers', name: 'Malik Nabers', phase: 1, uniqueId: 'c1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
    ]
  };
  const r1Ability = p0.lineup.length > 0 && p0.lineup.every(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  assert(!r1Ability, 'Round 1 (1 Phase 1, 2 Practice Squad): Ability is FALSE');

  const p0R2 = {
    lineup: [
      { id: 'malik_nabers', name: 'Malik Nabers', phase: 1, uniqueId: 'c1' },
      { id: 'zach_ertz', name: 'Zach Ertz', phase: 1, uniqueId: 'c2' },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
    ]
  };
  const r2Ability = p0R2.lineup.length > 0 && p0R2.lineup.every(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  assert(!r2Ability, 'Round 2 (2 Phase 1, 1 Practice Squad): Ability is FALSE');

  const p0R3 = {
    lineup: [
      { id: 'malik_nabers', name: 'Malik Nabers', phase: 1, uniqueId: 'c1' },
      { id: 'zach_ertz', name: 'Zach Ertz', phase: 1, uniqueId: 'c2' },
      { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, uniqueId: 'c3' }
    ]
  };
  const r3Ability = p0R3.lineup.length > 0 && p0R3.lineup.every(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  assert(r3Ability, 'Round 3+ (All 3 Phase 1): Ability is TRUE (-4 deflation)');
}

// Test 2: Best Phase 1 players valued significantly higher than mediocre ones
console.log('\nTest 2: Quality-Scaled Phase 1 Valuation');
{
  const G = createPackersState({ packersCoins: 8, round: 1 });
  const bowers = { id: 'brock_bowers', name: 'Brock Bowers', phase: 1, position: 'TE', minBid: 1, maxBid: 15, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
  const goedert = { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, position: 'TE', minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 2, perRound: true }] };
  const chuba = { id: 'chuba_hubbard', name: 'Chuba Hubbard', phase: 1, position: 'RB', minBid: 1, maxBid: 3, effects: [{ type: 'deflate', amount: 2, perRound: false }] };

  const bowersScore = scoreCardForPlayer(G, '0', bowers);
  const goedertScore = scoreCardForPlayer(G, '0', goedert);
  const chubaScore = scoreCardForPlayer(G, '0', chuba);

  assert(bowersScore > goedertScore, `Bowers (${bowersScore.toFixed(1)}) valued higher than Goedert (${goedertScore.toFixed(1)})`);
  assert(goedertScore > chubaScore, `Goedert (${goedertScore.toFixed(1)}) valued higher than Chuba (${chubaScore.toFixed(1)})`);
  assert(bowersScore - chubaScore >= 10.0, `Substantial quality premium: Bowers exceeds Chuba by ${(bowersScore - chubaScore).toFixed(1)} pts`);
}

// Test 3: Phase 2 / HOF Evaluation: Outweighs vs Does NOT Outweigh
console.log('\nTest 3: Phase 2 / HOF Outweighs 4 Deflate Calculus');
{
  // Setup Packers with all 3 Phase 1 cards in Round 4 (ability active!)
  const G = createPackersState({
    packersCoins: 10,
    packersPsi: 38,
    round: 4,
    lineupCards: [
      { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, position: 'TE', uniqueId: 'c1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
      { id: 'sam_laporta', name: 'Sam LaPorta', phase: 1, position: 'TE', uniqueId: 'c2', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
      { id: 'amari_cooper', name: 'Amari Cooper', phase: 1, position: 'WR', uniqueId: 'c3', effects: [{ type: 'coins', amount: 3, perRound: true }] }
    ]
  });

  // A mediocre Phase 2 card (e.g. 2 instant coins or 1 deflate): does NOT outweigh 4 deflate (4 * 6 = 24 deflation lost!)
  const weakPhase2 = { id: 'tank_dell', name: 'Tank Dell', phase: 2, position: 'WR', minBid: 2, maxBid: 9, effects: [{ type: 'coins', amount: 3, perRound: true }] };
  const weakScore = scoreCardForPlayer(G, '0', weakPhase2);
  assert(weakScore < 0, `Weak Phase 2 card does NOT outweigh 4 deflate (score: ${weakScore})`);

  // Game-winning closer: Packers has 4 PSI in Round 8. A card with 6 instant deflation:
  const closerState = createPackersState({
    packersCoins: 8,
    packersPsi: 4,
    round: 8,
    lineupCards: G.players['0'].lineup
  });
  const instantCloser = { id: 'aaron_jones', name: 'Aaron Jones', phase: 2, position: 'RB', minBid: 2, maxBid: 8, effects: [{ type: 'deflate', amount: 6, perRound: false }] };
  const closerScore = scoreCardForPlayer(closerState, '0', instantCloser);
  assert(closerScore > 20.0, `Game-winning instant closer DOES outweigh 4 deflate (score: ${closerScore.toFixed(1)})`);

  // Late-game massive instant nuke (Round 8, 1 round left = only 4 deflate lost): Tom Brady 10 instant deflate
  const brady = { id: 'tom_brady', name: 'Tom Brady', phase: 'hof', position: 'QB', minBid: 3, maxBid: 15, effects: [{ type: 'deflate', amount: 10, perRound: false }] };
  const bradyScore = scoreCardForPlayer(closerState, '0', brady);
  assert(bradyScore > 20.0, `Late-game Tom Brady 10-deflate nuke DOES outweigh 4 deflate (score: ${bradyScore.toFixed(1)})`);
}

// Test 4: Strategic Nomination
console.log('\nTest 4: Strategic Nomination (Best Phase 1 & Closer Awareness)');
{
  const G = createPackersState({ packersCoins: 8, round: 1 });
  const bowers = { id: 'brock_bowers', name: 'Brock Bowers', phase: 1, position: 'TE', minBid: 1, maxBid: 15, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'deflate', amount: 2, perRound: false }] };
  const chuba = { id: 'chuba_hubbard', name: 'Chuba Hubbard', phase: 1, position: 'RB', minBid: 1, maxBid: 3, effects: [{ type: 'deflate', amount: 2, perRound: false }] };
  const weakPhase2 = { id: 'tank_dell', name: 'Tank Dell', phase: 2, position: 'WR', minBid: 2, maxBid: 9, effects: [{ type: 'coins', amount: 3, perRound: true }] };

  G.board.auctionPlayers = [chuba, weakPhase2, bowers];
  const nomIdx = chooseCpuNominationCard(G, '0');
  const nomCard = G.board.auctionPlayers[nomIdx];
  assert(nomCard.id === 'brock_bowers', `Packers nominates top Phase 1 centerpiece (${nomCard.name}) over mediocre Phase 1 or Phase 2`);

  // Closer mode check: at 5 PSI, instant closer is nominated
  const closerG = createPackersState({ packersCoins: 8, packersPsi: 5, round: 8 });
  const pollard = { id: 'tony_pollard', name: 'Tony Pollard', phase: 2, position: 'RB', minBid: 2, maxBid: 7, effects: [{ type: 'deflate', amount: 5, perRound: false }] };
  closerG.board.auctionPlayers = [chuba, pollard];
  const closerNomIdx = chooseCpuNominationCard(closerG, '0');
  const closerNomCard = closerG.board.auctionPlayers[closerNomIdx];
  assert(closerNomCard.id === 'tony_pollard', `Packers nominates instant closer nuke (${closerNomCard.name}) to win the game`);
}

// Test 6: Malik Nabers Spot 1/2 vs 3rd Spot
console.log('\nTest 6: Malik Nabers in Spot 1/2 vs 3rd Spot');
{
  const nabers = { id: 'malik_nabers', name: 'Malik Nabers', position: 'WR', phase: 1, minBid: 1, maxBid: 3, effects: [{ type: 'coins', amount: 5, perRound: false }] };

  // Spot 1 (Round 1, 3 Practice Squad cards)
  const G_R1 = createPackersState({ packersCoins: 8, round: 1 });
  const scoreSpot1 = scoreCardForPlayer(G_R1, '0', nabers);

  // Spot 3 (Round 3, 2 real starters, 1 Practice Squad card left)
  const G_R3 = createPackersState({
    packersCoins: 8,
    round: 3,
    lineupCards: [
      { id: 'dallas_goedert', name: 'Dallas Goedert', phase: 1, position: 'TE', uniqueId: 'c1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
      { id: 'sam_laporta', name: 'Sam LaPorta', phase: 1, position: 'TE', uniqueId: 'c2', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
      { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
    ]
  });
  const scoreSpot3 = scoreCardForPlayer(G_R3, '0', nabers);

  assert(scoreSpot3 > scoreSpot1, `Nabers is valued higher in 3rd spot (${scoreSpot3.toFixed(1)}) than spot 1 (${scoreSpot1.toFixed(1)})`);
  assert(scoreSpot3 - scoreSpot1 >= 5.0, `Nabers 3rd spot premium: +${(scoreSpot3 - scoreSpot1).toFixed(1)} pts higher when completing 3-Phase-1 lineup`);
}

// Test 7: Universal Dual QB Recognition (Josh Allen, Jayden Daniels)
console.log('\nTest 7: Universal Dual QB Recognition (Josh Allen, Jayden Daniels across teams)');
{
  const joshAllen = { id: 'josh_allen', name: 'Josh Allen', position: 'QB', phase: 1, minBid: 1, maxBid: 11, effects: [{ type: 'deflate', amount: 2, perRound: true }, { type: 'coins', amount: 4, perRound: false }] };
  const jaydenDaniels = { id: 'jayden_daniels', name: 'Jayden Daniels', position: 'QB', phase: 1, minBid: 1, maxBid: 10, effects: [{ type: 'deflate', amount: 3, perRound: false }, { type: 'coins', amount: 2, perRound: true }] };
  const watson = { id: 'deshaun_watson', name: 'Deshaun Watson', position: 'QB', phase: 1, minBid: 1, maxBid: 5, effects: [{ type: 'inflate', amount: 4, perRound: true }, { type: 'coins', amount: 5, perRound: true }] };

  const G = createPackersState({ packersCoins: 8, round: 1 });
  const allenPackersScore = scoreCardForPlayer(G, '0', joshAllen);
  const danielsPackersScore = scoreCardForPlayer(G, '0', jaydenDaniels);
  assert(allenPackersScore >= 80.0, `Josh Allen scored high for Packers (${allenPackersScore.toFixed(1)})`);
  assert(danielsPackersScore >= 55.0, `Jayden Daniels scored high for Packers (${danielsPackersScore.toFixed(1)})`);

  // Check other teams (e.g. Cowboys, Commanders, Chargers)
  const teamsToCheck = ['cowboys', 'commanders', 'chargers', 'bears'];
  for (const teamId of teamsToCheck) {
    const teamObj = TEAMS.find(t => t.id === teamId);
    const testG = {
      board: { round: 1, nominator: '0', auctionPlayers: [] },
      players: {
        '0': {
          team: { ...teamObj },
          coins: teamObj.coins,
          psi: teamObj.initialPsi,
          lineup: [
            { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_0' },
            { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_1' },
            { ...PRACTICE_SQUAD_CARD, uniqueId: 'ps_2' }
          ],
          genome: { ...(ACTIVE_TEAM_GENOMES[teamId] || {}) }
        }
      }
    };
    const allenScore = scoreCardForPlayer(testG, '0', joshAllen);
    const danielsScore = scoreCardForPlayer(testG, '0', jaydenDaniels);
    const watsonScore = scoreCardForPlayer(testG, '0', watson);

    assert(allenScore >= 60.0, `${teamId.toUpperCase()}: Josh Allen valued high (${allenScore.toFixed(1)})`);
    assert(danielsScore >= 40.0, `${teamId.toUpperCase()}: Jayden Daniels valued high (${danielsScore.toFixed(1)})`);
    assert(watsonScore < 0, `${teamId.toUpperCase()}: Deshaun Watson properly rejected (${watsonScore})`);
  }
}

console.log(`\nResults: ${passedTests} / ${totalTests} tests passed.`);
if (passedTests === totalTests) {
  console.log('ALL PLAYTEST 62 PACKERS TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('SOME TESTS FAILED!');
  process.exit(1);
}

