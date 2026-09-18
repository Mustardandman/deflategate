import assert from 'assert';
import { PHASE_2_PLAYERS, HOF_PLAYERS, TEAMS } from '../src/GameData.js';
import { DeflategateGame, resolveAuctionWin, calculateRefreshResults, getEffectiveTeamId } from '../src/Game.js';

console.log('--- TEST 1: Phase 2 & HOF Roster Verification ---');
assert.strictEqual(PHASE_2_PLAYERS.length, 46, `Expected 46 Phase 2 players, got ${PHASE_2_PLAYERS.length}`);
assert.strictEqual(HOF_PLAYERS.length, 10, `Expected 10 HOF players, got ${HOF_PLAYERS.length}`);

// Check specific key players exist
const requiredP2Ids = ['dj_moore', 'puka_nacua', 'brock_purdy', 'tyreek_hill', 'amon_ra_st_brown'];
requiredP2Ids.forEach(id => {
  const p = PHASE_2_PLAYERS.find(c => c.id === id);
  assert(p, `Missing required Phase 2 player: ${id}`);
  console.log(`✓ Found Phase 2 player: ${p.name} (${p.position}, Min: ${p.minBid}, Max: ${p.maxBid})`);
});

const requiredHofIds = ['calvin_johnson', 'tony_gonzalez', 'peyton_manning', 'jerry_rice', 'brett_favre', 'rob_gronkowski', 'tom_brady', 'joe_montana', 'john_elway', 'randy_moss'];
requiredHofIds.forEach(id => {
  const h = HOF_PLAYERS.find(c => c.id === id);
  assert(h, `Missing required HOF legend: ${id}`);
  console.log(`✓ Found HOF legend: ${h.name} (${h.position})`);
});
console.log('✓ TEST 1 PASSED\n');

console.log('--- TEST 2: DJ Moore Rule ---');
// Only teams with <= 10 coins may nominate or bid on DJ Moore
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  G.players['0'].team = TEAMS[0];
  G.players['0'].coins = 15; // > 10 coins
  G.board.auctionPlayers = [PHASE_2_PLAYERS.find(c => c.id === 'dj_moore')];
  G.board.nominator = '0';
  G.board.activeAuctionCardIndex = null;

  // Attempt nomination with 15 coins -> INVALID_MOVE
  const nomResult = DeflategateGame.phases.auctionPhase.moves.selectCard({ G, playerID: '0' }, 0);
  assert.strictEqual(nomResult, 'INVALID_MOVE', 'Player with 15 coins should not be able to nominate DJ Moore');
  console.log('✓ DJ Moore nomination blocked for player with 15 coins');

  // Now set active auction card to DJ Moore and attempt bid with 15 coins -> INVALID_MOVE
  G.board.activeAuctionCardIndex = 0;
  const bidResult = DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '0', events: {} }, 5);
  assert.strictEqual(bidResult, 'INVALID_MOVE', 'Player with 15 coins should not be able to bid on DJ Moore');
  console.log('✓ DJ Moore bid blocked for player with 15 coins');

  // Change coins to 10 -> nomination & bidding should be allowed!
  G.board.activeAuctionCardIndex = null;
  G.players['0'].coins = 10;
  const nomResultOk = DeflategateGame.phases.auctionPhase.moves.selectCard({ G, playerID: '0' }, 0);
  assert.notStrictEqual(nomResultOk, 'INVALID_MOVE', 'Player with 10 coins should be able to nominate DJ Moore');
  assert.strictEqual(G.board.activeAuctionCardIndex, 0);
  console.log('✓ DJ Moore nomination allowed for player with 10 coins');

  const bidResultOk = DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '0', events: {} }, 4);
  assert.notStrictEqual(bidResultOk, 'INVALID_MOVE', 'Player with 10 coins should be able to bid on DJ Moore');
  assert.strictEqual(G.board.highestBid, 4);
  console.log('✓ DJ Moore bid allowed for player with 10 coins');
}
console.log('✓ TEST 2 PASSED\n');

console.log('--- TEST 3: Tyreek Hill Bidding Deflation ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  G.players['0'].team = TEAMS[0];
  G.players['0'].coins = 20;
  G.players['0'].psi = 15;
  const tyreekCard = PHASE_2_PLAYERS.find(c => c.id === 'tyreek_hill');
  G.board.auctionPlayers = [tyreekCard];
  G.board.activeAuctionCardIndex = 0;
  G.board.nominator = '0';

  DeflategateGame.phases.auctionPhase.moves.bid({ G, playerID: '0', events: {} }, 5);
  assert.strictEqual(G.players['0'].psi, 14, `Expected Tyreek bidder PSI to deflate from 15 to 14, got ${G.players['0'].psi}`);
  assert(G.board.tyreekHillAlert, 'Expected tyreekHillAlert to be set on bid');
  console.log('✓ Bidding on Tyreek Hill immediately deflated 1 PSI and triggered alert');
}
console.log('✓ TEST 3 PASSED\n');

console.log('--- TEST 4: Brock Purdy Mr. Irrelevant Mechanic ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  Object.keys(G.players).forEach((id, i) => {
    G.players[id].team = TEAMS[i];
    G.players[id].coins = 10;
    G.players[id].psi = 20;
    G.players[id].cardsWonThisRound = 0;
  });

  const purdyCard = PHASE_2_PLAYERS.find(c => c.id === 'brock_purdy');

  // Case A: Purdy is won as 1st acquisition in round -> No bonus
  resolveAuctionWin(G, '0', { ...purdyCard, uniqueId: 'bp_1' });
  assert.strictEqual(G.players['0'].coins, 10, 'Purdy won 1st should NOT gain +5 coins');
  assert.strictEqual(G.players['0'].psi, 20, 'Purdy won 1st should NOT deflate -3 PSI');
  console.log('✓ Brock Purdy won 1st does not trigger last-2 bonus');

  // Win 2nd player
  resolveAuctionWin(G, '1', { ...PHASE_2_PLAYERS[0], uniqueId: 'other_1' });

  // Case B: Purdy is won as 3rd acquisition (out of 4 total wins needed) -> Last 2!
  resolveAuctionWin(G, '2', { ...purdyCard, uniqueId: 'bp_2' });
  assert.strictEqual(G.players['2'].coins, 15, `Purdy won 3rd (last 2) should gain +5 coins, got ${G.players['2'].coins}`);
  assert.strictEqual(G.players['2'].psi, 17, `Purdy won 3rd (last 2) should deflate -3 PSI (20->17), got ${G.players['2'].psi}`);
  console.log('✓ Brock Purdy won as 3rd of 4 players gained +5 coins and -3 PSI');

  // Case C: Purdy is won as 4th acquisition (last of 4) -> Last 2!
  resolveAuctionWin(G, '3', { ...purdyCard, uniqueId: 'bp_3' });
  assert.strictEqual(G.players['3'].coins, 15, `Purdy won 4th should gain +5 coins, got ${G.players['3'].coins}`);
  assert.strictEqual(G.players['3'].psi, 17, `Purdy won 4th should deflate -3 PSI (20->17), got ${G.players['3'].psi}`);
  console.log('✓ Brock Purdy won as 4th of 4 players gained +5 coins and -3 PSI');
}
console.log('✓ TEST 4 PASSED\n');

console.log('--- TEST 5: Puka Nacua Teammate Effect Copying ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  Object.keys(G.players).forEach((id, i) => {
    G.players[id].team = TEAMS[i];
    G.players[id].coins = 10;
    G.players[id].psi = 20;
    G.players[id].lineup = [];
  });

  const puka = { ...PHASE_2_PLAYERS.find(c => c.id === 'puka_nacua'), uniqueId: 'puka_u1' };
  // Teammate: 2 coins and 1 deflate recurring
  const teammate = {
    id: 'test_teammate',
    name: 'Star Teammate',
    position: 'WR',
    phase: 2,
    uniqueId: 'tm_u1',
    effects: [
      { type: 'coins', amount: 3, perRound: true },
      { type: 'deflate', amount: 2, perRound: true }
    ]
  };

  G.players['0'].lineup = [puka, teammate];

  // Trigger refreshPhase onBegin -> should set pendingPukaChoice for human player '0'
  DeflategateGame.phases.refreshPhase.onBegin({ G });
  assert(G.board.pendingPukaChoice, 'Expected pendingPukaChoice to be created for human');
  assert.strictEqual(G.board.pendingPukaChoice.playerID, '0');
  assert.strictEqual(G.board.pendingPukaChoice.options.length, 1);
  console.log('✓ Puka Nacua pending choice prompted for human player');

  // Human chooses teammate
  DeflategateGame.phases.refreshPhase.moves.pukaChooseTeammate({ G, playerID: '0' }, 'tm_u1');
  assert.strictEqual(G.board.pendingPukaChoice, null, 'pendingPukaChoice should be cleared');
  assert(G.board.pukaCopiedEffects['puka_u1'], 'Copied effects should be stored in G.board.pukaCopiedEffects');

  // Teammate gives: 3 coins, 2 deflate
  // Puka copies teammate: 3 coins, 2 deflate
  // Total expected from lineup: +6 coins, -4 deflate
  // Initial: 10 coins, 20 psi -> 16 coins, 16 psi
  const p0 = G.players['0'];
  assert.strictEqual(p0.coins, 16, `Expected 16 coins (10 + 3 + 3), got ${p0.coins}`);
  assert.strictEqual(p0.psi, 16, `Expected 16 PSI (20 - 2 - 2), got ${p0.psi}`);
  console.log('✓ Puka Nacua successfully copied teammate recurring effects in refresh calculation');
}
console.log('✓ TEST 5 PASSED\n');

console.log('--- TEST 6: Amon-Ra St. Brown Coin Stealing ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  // Player 0: Has Amon-Ra St. Brown (Patriots, 5 coins)
  G.players['0'].team = TEAMS.find(t => t.id === 'patriots') || TEAMS[0];
  G.players['0'].coins = 5;
  G.players['0'].psi = 20;
  G.players['0'].lineup = [{ ...PHASE_2_PLAYERS.find(c => c.id === 'amon_ra_st_brown'), uniqueId: 'amon_u1' }];

  // Player 1: Has 4 coins (Normal team)
  G.players['1'].team = TEAMS.find(t => t.id === 'rams') || TEAMS[1];
  G.players['1'].coins = 4;
  G.players['1'].psi = 20;
  G.players['1'].lineup = [];

  // Player 2: Has 0 coins (0-floor check, use Bears who have no passive coin gain in refresh)
  G.players['2'].team = TEAMS.find(t => t.id === 'bears') || TEAMS[2];
  G.players['2'].coins = 0;
  G.players['2'].psi = 20;
  G.players['2'].lineup = [];

  // Player 3: Saints team (Saints immunity check)
  const saintsTeam = TEAMS.find(t => t.id === 'saints');
  assert(saintsTeam, 'Saints team must exist');
  G.players['3'].team = saintsTeam;
  G.players['3'].coins = 8;
  G.players['3'].psi = 20;
  G.players['3'].lineup = [];

  calculateRefreshResults(G);

  // Player 1 (4 coins) -> should lose 1 coin -> 3 coins
  assert.strictEqual(G.players['1'].coins, 3, `Player 1 should have lost 1 coin (4 -> 3), got ${G.players['1'].coins}`);

  // Player 2 (0 coins) -> cannot go below 0 -> 0 coins
  assert.strictEqual(G.players['2'].coins, 0, `Player 2 should remain at 0 coins, got ${G.players['2'].coins}`);

  // Player 3 (Saints, 8 coins) -> immune to coin loss -> 8 coins
  assert.strictEqual(G.players['3'].coins, 8, `Player 3 (Saints) should remain at 8 coins due to immunity, got ${G.players['3'].coins}`);

  // Player 0 (Amon-Ra owner, 5 coins) -> stole 1 coin from Player 1 (none from P2, none from P3)
  // Amon-Ra only has the stealing ability -> 5 + 1 (stolen) = 6 coins
  assert.strictEqual(G.players['0'].coins, 6, `Player 0 should have 6 coins (5 + 1 stolen), got ${G.players['0'].coins}`);
  console.log('✓ Amon-Ra St. Brown stole 1 coin from eligible opponents while respecting 0-floor and Saints immunity');
}
console.log('✓ TEST 6 PASSED\n');

console.log('--- TEST 7: Round 5 and Round 8 Deck Shuffle Timing ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  Object.keys(G.players).forEach((id, i) => {
    G.players[id].team = TEAMS[i];
    G.players[id].coins = 10;
    G.players[id].psi = 20;
  });

  const initialDeckCount = G.decks.activePlayers.length;
  assert.strictEqual(G.board.phase2Shuffled, false);
  assert.strictEqual(G.board.hofShuffled, false);

  // Round 1-4: Phase 2 players not shuffled
  G.board.round = 4;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  assert.strictEqual(G.board.phase2Shuffled, false, 'Phase 2 should not be shuffled at Round 4');

  // Round 5: Phase 2 players shuffled!
  G.board.round = 5;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  assert.strictEqual(G.board.phase2Shuffled, true, 'Phase 2 should be shuffled at Round 5');
  assert(G.decks.activePlayers.length > initialDeckCount, 'Active player deck should grow when Phase 2 is added');
  console.log('✓ Phase 2 players correctly shuffled into deck at Round 5');

  // Round 7: HOF not shuffled yet
  G.board.round = 7;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  assert.strictEqual(G.board.hofShuffled, false, 'HOF should not be shuffled at Round 7');

  // Round 8: HOF legends shuffled!
  const preHofCount = G.decks.activePlayers.length;
  G.board.round = 8;
  DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  assert.strictEqual(G.board.hofShuffled, true, 'HOF should be shuffled at Round 8');
  assert(G.decks.activePlayers.length > preHofCount, 'Active player deck should grow when HOF is added');
  console.log('✓ HOF legends correctly shuffled into deck at Round 8');
}
console.log('✓ TEST 7 PASSED\n');

console.log('--- TEST 8: Card Won Fly Animation Data ---');
{
  const G = DeflategateGame.setup({ ctx: { numPlayers: 4 }, random: { Shuffle: (a) => a } });
  G.players['0'].team = TEAMS[0];
  G.players['0'].coins = 10;
  G.board.highestBid = 4;
  const card = PHASE_2_PLAYERS[0];

  resolveAuctionWin(G, '0', card);
  assert(G.board.cardWonFlyAnimation, 'Expected cardWonFlyAnimation to be populated');
  assert.strictEqual(G.board.cardWonFlyAnimation.winnerId, '0');
  assert.strictEqual(G.board.cardWonFlyAnimation.bidAmount, 4);
  assert.strictEqual(G.board.cardWonFlyAnimation.card.id, card.id);
  console.log('✓ resolveAuctionWin sets cardWonFlyAnimation data correctly');
}
console.log('✓ TEST 8 PASSED\n');

console.log('🎉 ALL 8 PLAYTEST #11 UNIT TESTS PASSED PERFECTLY!');
