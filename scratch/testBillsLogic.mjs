import { DeflategateGame, applyCoinsGained, applyPsiDeflated, applyPsiInflated, getEffectiveTeamId, calculateEstimatedGameEndRound, isGenuinePlayerCard } from '../src/Game.js';
import { TEAMS, PHASE_1_PLAYERS, PHASE_2_PLAYERS } from '../src/GameData.js';
const ALL_PLAYERS = [...PHASE_1_PLAYERS, ...PHASE_2_PLAYERS];
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function evaluateBillsDiscardClaim(G, billsId) {
  const billsPlayer = G.players[billsId];
  if (!billsPlayer || billsPlayer.hasUsedBillsAbility) return null;
  if (!G.decks.discard || G.decks.discard.length === 0) return null;

  const billsEffTeam = getEffectiveTeamId(billsPlayer);
  const maxLineup = (billsEffTeam === 'seahawks' ? 4 : 3) + (billsPlayer.extraLineupSlots || 0);
  const currentLineup = billsPlayer.lineup || [];
  const currentRound = G.board?.round || 1;
  const estimatedEnd = calculateEstimatedGameEndRound(G);
  const roundsLeft = Math.max(1, estimatedEnd - currentRound);

  const teamGenome = billsPlayer.genome || G.teamGenomes?.bills || ACTIVE_TEAM_GENOMES.bills || DEFAULT_GENOME;
  const deflateWeight = teamGenome.deflateWeight || 1.6;
  const coinWeight = teamGenome.coinWeight || 1.0;
  const patienceWeight = teamGenome.discardPatienceWeight !== undefined ? teamGenome.discardPatienceWeight : 1.0;
  const coinThreshold = teamGenome.discardCoinThreshold !== undefined ? teamGenome.discardCoinThreshold : 6;

  const affordableCards = G.decks.discard.filter(c => isGenuinePlayerCard(c) && c.minBid <= billsPlayer.coins);
  if (affordableCards.length === 0) return null;

  let weakestStarterIdx = -1;
  let minStarterLostValue = Infinity;
  let weakestStarterDeflateLoss = 0;
  let weakestStarterCoinLoss = 0;

  if (currentLineup.length >= maxLineup && billsEffTeam !== 'colts') {
    currentLineup.forEach((starter, idx) => {
      if (starter.isPracticeSquad || starter.uniqueId?.startsWith('ps_')) {
        weakestStarterIdx = idx;
        minStarterLostValue = 0;
        weakestStarterDeflateLoss = 0;
        weakestStarterCoinLoss = 0;
        return;
      }
      const sRecurringDeflate = starter.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringCoins = starter.effects?.filter(e => e.perRound && e.type === 'coins').reduce((sum, e) => sum + e.amount, 0) || 0;

      const sTotalLostDeflate = sRecurringDeflate * roundsLeft;
      const sTotalLostCoins = sRecurringCoins * roundsLeft;
      const sLostScore = (sTotalLostDeflate * deflateWeight) + (sTotalLostCoins * coinWeight);

      if (sLostScore < minStarterLostValue) {
        minStarterLostValue = sLostScore;
        weakestStarterIdx = idx;
        weakestStarterDeflateLoss = sTotalLostDeflate;
        weakestStarterCoinLoss = sTotalLostCoins;
      }
    });
  }

  let bestCandidateScore = -Infinity;
  let bestCandidateAction = null;

  for (const card of affordableCards) {
    const hasRecurringNegative = card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate'));
    if (hasRecurringNegative) continue;

    const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0;
    const instantCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((sum, e) => sum + e.amount, 0) || 0;
    const netInstantCoins = instantCoins - card.minBid;

    const recurringDeflate = card.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0;
    const recurringCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((sum, e) => sum + e.amount, 0) || 0;

    const totalCardDeflate = instantDeflate + (recurringDeflate * roundsLeft);
    const totalCardCoins = netInstantCoins + (recurringCoins * roundsLeft);

    const netDeflateGain = totalCardDeflate - (weakestStarterIdx !== -1 ? weakestStarterDeflateLoss : 0);
    const netCoinGain = totalCardCoins - (weakestStarterIdx !== -1 ? weakestStarterCoinLoss : 0);
    const netGainScore = (netDeflateGain * deflateWeight) + (netCoinGain * coinWeight);

    if (billsPlayer.psi - instantDeflate <= 0) {
      return { card, replaceIdx: weakestStarterIdx, reason: 'Championship Instant Win', netGainScore: 999 };
    }

    const isEveryRounder = (recurringDeflate > 0 || recurringCoins > 0);
    const isHeavyInstantDeflate = instantDeflate >= 4;
    const isInstantCoinBoost = netInstantCoins >= 4;

    let shouldClaim = false;
    let reason = '';

    const isEndgame = currentRound >= 8 || Object.values(G.players).some(p => p.psi <= 8);
    if (isEndgame) {
      if (netGainScore >= 2.0 || netDeflateGain > 0) {
        shouldClaim = true;
        reason = 'Endgame Urgency';
      }
    } else if (isEveryRounder) {
      const minRecurringThreshold = currentRound <= 3 ? (12.0 * patienceWeight) : (8.0 * patienceWeight);
      if (netGainScore >= minRecurringThreshold && (netDeflateGain > 0 || netCoinGain >= 6)) {
        shouldClaim = true;
        reason = 'Golden Every-Round Engine';
      }
    } else if (isHeavyInstantDeflate) {
      if (currentRound <= 3) {
        if (instantDeflate >= 6 && netDeflateGain >= 4) {
          shouldClaim = true;
          reason = 'Massive Early Instant Deflate';
        }
      } else if (currentRound <= 6) {
        if (instantDeflate >= 5 && netDeflateGain >= 3) {
          shouldClaim = true;
          reason = 'Phase 2 Instant Deflate Nuke';
        } else if (instantDeflate >= 4 && (currentLineup.length < maxLineup || minStarterLostValue === 0)) {
          shouldClaim = true;
          reason = 'Free Roster Slot Instant Deflate';
        }
      } else {
        if (instantDeflate >= 4 && netDeflateGain >= 2) {
          shouldClaim = true;
          reason = 'Late-Game Instant Deflate';
        }
      }
    } else if (isInstantCoinBoost) {
      const isCashPoor = billsPlayer.coins <= coinThreshold;
      const canSafelyCut = (currentLineup.length < maxLineup || minStarterLostValue <= 2.0);
      if (isCashPoor && canSafelyCut && currentRound <= 5) {
        shouldClaim = true;
        reason = `Instant Cash Injection (+${netInstantCoins} coins)`;
      }
    }

    if (shouldClaim && netGainScore > bestCandidateScore) {
      bestCandidateScore = netGainScore;
      bestCandidateAction = { card, replaceIdx: weakestStarterIdx, reason, netGainScore };
    }
  }

  return bestCandidateAction;
}

// Test cases
function runTests() {
  console.log('Running Bills Discard Evaluation Test Suite...\n');

  // Setup basic mock game
  const G = {
    players: {
      '0': {
        team: { id: 'bills', name: 'Bills' },
        psi: 44,
        coins: 12,
        lineup: [],
        hasUsedBillsAbility: false,
        isCpu: true
      },
      '1': { team: { id: 'chiefs' }, psi: 40, coins: 10, lineup: [] }
    },
    board: { round: 1 },
    decks: { discard: [] }
  };

  const nabers = ALL_PLAYERS.find(c => c.id === 'malik_nabers'); // +5 coins instant, minBid 1
  const kyren = ALL_PLAYERS.find(c => c.id === 'kyren_williams'); // 4 deflate instant, minBid 1
  const aaronJones = ALL_PLAYERS.find(c => c.id === 'aaron_jones'); // 7 deflate instant, minBid 2
  const derrickHenry = ALL_PLAYERS.find(c => c.id === 'derrick_henry'); // 4 deflate/round, minBid 2

  // Test 1: Malik Nabers in Round 1 when Bills has 12 coins
  G.decks.discard = [nabers];
  G.board.round = 1;
  G.players['0'].coins = 12;
  let dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 1 - Nabers in R1 with 12 coins (Should PASS and save ability):', dec === null ? 'PASS (Ignored)' : `FAIL (Claimed: ${dec.reason})`);

  // Test 2: Malik Nabers in Round 2 when Bills is cash-poor (3 coins)
  G.players['0'].coins = 3;
  dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 2 - Nabers in R2 with 3 coins (Should BUY cash injection):', dec ? `PASS (${dec.reason})` : 'FAIL (Ignored)');

  // Test 3: Kyren Williams (4 deflate) in Round 1 when Bills has full 3 every-rounders
  G.players['0'].coins = 10;
  G.players['0'].lineup = [
    { name: 'Starter1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { name: 'Starter2', effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { name: 'Starter3', effects: [{ type: 'deflate', amount: 1, perRound: true }] }
  ];
  G.decks.discard = [kyren];
  dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 3 - Kyren (4 deflate) in R1 with full 3 every-rounders (Should PASS, don\'t sacrifice starter):', dec === null ? 'PASS (Ignored)' : `FAIL (Claimed: ${dec.reason})`);

  // Test 4: Aaron Jones (7 deflate) in Round 4 with spent instant starter
  G.board.round = 4;
  G.players['0'].lineup = [
    { name: 'Starter1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
    { name: 'Starter2', effects: [{ type: 'coins', amount: 2, perRound: true }] },
    { name: 'SpentStarter', effects: [{ type: 'coins', amount: 5, perRound: false }] } // Instant card, 0 recurring
  ];
  G.decks.discard = [aaronJones];
  dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 4 - Aaron Jones (7 deflate) in R4 replacing spent starter (Should BUY Nuke):', dec ? `PASS (${dec.reason}, replaces ${G.players['0'].lineup[dec.replaceIdx].name})` : 'FAIL (Ignored)');

  // Test 5: Derrick Henry (4 deflate/round) in Round 2 from Free Agency pass
  G.board.round = 2;
  G.decks.discard = [derrickHenry];
  dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 5 - Derrick Henry (4/round) in R2 from Free Agency (Should BUY Golden Engine):', dec ? `PASS (${dec.reason})` : 'FAIL (Ignored)');

  // Test 6: Kyren Williams (4 deflate) in Round 9 when Bills PSI is 3 (Instant Championship Win)
  G.board.round = 9;
  G.players['0'].psi = 3;
  G.decks.discard = [kyren];
  dec = evaluateBillsDiscardClaim(G, '0');
  console.log('Test 6 - Kyren in R9 when PSI is 3 (Should BUY Championship Win):', dec && dec.reason === 'Championship Instant Win' ? `PASS (${dec.reason})` : 'FAIL');
}

runTests();
