import { getEffectiveTeamId, calculateEstimatedGameEndRound, isGenuinePlayerCard } from '../src/Game.js';
import { TEAMS, PHASE_1_PLAYERS, PHASE_2_PLAYERS } from '../src/GameData.js';
const ALL_PLAYERS = [...PHASE_1_PLAYERS, ...PHASE_2_PLAYERS];
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function evaluateBillsDiscardClaimWithPipeline(G, billsId) {
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
  const cashBoostMaxCoins = teamGenome.discardCashBoostMaxCoins !== undefined ? teamGenome.discardCashBoostMaxCoins : 5;
  const minDeflateEarly = teamGenome.discardMinInstantDeflateEarly !== undefined ? teamGenome.discardMinInstantDeflateEarly : 6;
  const minDeflatePhase2 = teamGenome.discardMinInstantDeflatePhase2 !== undefined ? teamGenome.discardMinInstantDeflatePhase2 : 5;
  const toxicCleanseBonus = teamGenome.discardToxicCleanseBonus !== undefined ? teamGenome.discardToxicCleanseBonus : 3.5;
  const goldenThreshold = teamGenome.discardGoldenEngineThreshold !== undefined ? teamGenome.discardGoldenEngineThreshold : 10.0;
  const pipelineAwareness = teamGenome.discardPipelineAwareness !== undefined ? teamGenome.discardPipelineAwareness : 1.0;

  const affordableCards = G.decks.discard.filter(c => isGenuinePlayerCard(c) && c.minBid <= billsPlayer.coins);
  if (affordableCards.length === 0) return null;

  // Pipeline Analysis: Scan opponents' active rosters for instant players waiting to be cut
  let maxPipelineInstantDeflate = 0;
  let maxPipelineInstantCoins = 0;
  let pipelineTopCardName = '';

  if (pipelineAwareness > 0 && G.players) {
    Object.keys(G.players).forEach(oppId => {
      if (String(oppId) === String(billsId)) return;
      const opp = G.players[oppId];
      if (!opp || !opp.lineup) return;
      const oppMax = (getEffectiveTeamId(opp) === 'seahawks' ? 4 : 3) + (opp.extraLineupSlots || 0);
      const isOppRosterFull = opp.lineup.length >= oppMax && getEffectiveTeamId(opp) !== 'colts';

      opp.lineup.forEach(c => {
        const isInstantPlayer = c.effects && c.effects.length > 0 && c.effects.every(e => !e.perRound);
        if (isInstantPlayer) {
          const cDeflate = c.effects.filter(e => e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0);
          const cCoins = c.effects.filter(e => e.type === 'coins').reduce((sum, e) => sum + e.amount, 0);

          if (cDeflate > maxPipelineInstantDeflate) {
            maxPipelineInstantDeflate = cDeflate;
            pipelineTopCardName = c.name;
          }
          if (cCoins > maxPipelineInstantCoins) {
            maxPipelineInstantCoins = cCoins;
          }
        }
      });
    });
  }

  let weakestStarterIdx = -1;
  let minStarterLostValue = Infinity;
  let weakestStarterDeflateLoss = 0;
  let weakestStarterCoinLoss = 0;
  let hasToxicStarter = false;

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
      const sRecurringCoins = starter.effects?.filter(e => e.perRound && e.type === 'coins' && e.amount > 0).reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringInflate = starter.effects?.filter(e => e.perRound && e.type === 'inflate').reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringNegCoins = starter.effects?.filter(e => e.perRound && e.type === 'coins' && e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0;

      const isToxic = sRecurringInflate > 0 || sRecurringNegCoins > 0;
      if (isToxic) hasToxicStarter = true;

      const sNetDeflate = (sRecurringDeflate - sRecurringInflate) * roundsLeft;
      const sNetCoins = (sRecurringCoins - sRecurringNegCoins) * roundsLeft;
      const sLostScore = (sNetDeflate * deflateWeight) + (sNetCoins * coinWeight);

      if (sLostScore < minStarterLostValue) {
        minStarterLostValue = sLostScore;
        weakestStarterIdx = idx;
        weakestStarterDeflateLoss = sNetDeflate;
        weakestStarterCoinLoss = sNetCoins;
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
    let netGainScore = (netDeflateGain * deflateWeight) + (netCoinGain * coinWeight);

    if (hasToxicStarter && minStarterLostValue <= 0) {
      netGainScore += toxicCleanseBonus;
    }

    // Championship Instant Win: Always win right now regardless of pipeline!
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
      const minRecurringThreshold = currentRound <= 3 ? (goldenThreshold * patienceWeight) : ((goldenThreshold - 3) * patienceWeight);
      if (netGainScore >= minRecurringThreshold && (netDeflateGain > 0 || netCoinGain >= 6)) {
        shouldClaim = true;
        reason = 'Golden Every-Round Engine';
      }
    } else if (isHeavyInstantDeflate) {
      // Pipeline Check: If an opponent holds an impending superior instant nuke (e.g. Aaron Jones 7 deflate),
      // and this card only has 4 or 5 deflate, wait for the pipeline rather than burning the ability now!
      const hasSuperiorPipelineNuke = (maxPipelineInstantDeflate >= 6 && maxPipelineInstantDeflate > instantDeflate);

      if (hasSuperiorPipelineNuke && currentRound <= 7) {
        // Defer to upcoming pipeline nuke!
        shouldClaim = false;
      } else if (currentRound <= 3) {
        if (instantDeflate >= minDeflateEarly && netDeflateGain >= 4) {
          shouldClaim = true;
          reason = 'Massive Early Instant Deflate';
        }
      } else if (currentRound <= 6) {
        if (instantDeflate >= minDeflatePhase2 && netDeflateGain >= 3) {
          shouldClaim = true;
          reason = 'Phase 2 Instant Deflate Nuke';
        } else if (instantDeflate >= 4 && (currentLineup.length < maxLineup || minStarterLostValue <= 0)) {
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
      const hasImpendingNuke = maxPipelineInstantDeflate >= 6;
      const isCashPoor = billsPlayer.coins <= cashBoostMaxCoins;
      const canSafelyCut = (currentLineup.length < maxLineup || minStarterLostValue <= 2.0);
      // If an impending 6-7 deflate nuke is on an opponent's roster, don't take coins unless completely broke (<= 2 coins)
      const cashEmergency = hasImpendingNuke ? (billsPlayer.coins <= 2) : isCashPoor;

      if (cashEmergency && canSafelyCut && currentRound <= 5) {
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

// Run unit tests
console.log('Testing Pipeline Awareness...');

const G = {
  players: {
    '0': { team: { id: 'bills' }, psi: 30, coins: 8, lineup: [
      { name: 'Starter1', effects: [{ type: 'deflate', amount: 2, perRound: true }] },
      { name: 'Starter2', effects: [{ type: 'coins', amount: 2, perRound: true }] },
      { name: 'SpentStarter', effects: [{ type: 'coins', amount: 5, perRound: false }] }
    ], hasUsedBillsAbility: false, isCpu: true },
    '1': { team: { id: 'chiefs' }, psi: 28, coins: 10, lineup: [
      { name: 'Mahomes', effects: [{ type: 'deflate', amount: 5, perRound: true }] },
      { name: 'Kelce', effects: [{ type: 'deflate', amount: 6, perRound: true }] },
      { name: 'Aaron Jones', effects: [{ type: 'deflate', amount: 7, perRound: false }] } // Instant nuke on full roster!
    ]}
  },
  board: { round: 5 },
  decks: { discard: [] }
};

const kyren = ALL_PLAYERS.find(c => c.id === 'kyren_williams'); // 4 deflate instant
const aaronJones = ALL_PLAYERS.find(c => c.id === 'aaron_jones'); // 7 deflate instant

// Scenario 1: Kyren in discard, but Rival holds Aaron Jones (7 deflate) on full roster in R5
G.decks.discard = [kyren];
let res = evaluateBillsDiscardClaimWithPipeline(G, '0');
console.log('Scenario 1 - Kyren (4 deflate) in discard while Rival holds Aaron Jones (7 deflate):', res === null ? 'PASS (Waits for Aaron Jones!)' : `FAIL (Claimed: ${res.card.name})`);

// Scenario 2: Opponent Aaron Jones gets cut and is now in discard
G.decks.discard = [aaronJones];
res = evaluateBillsDiscardClaimWithPipeline(G, '0');
console.log('Scenario 2 - Aaron Jones (7 deflate) in discard:', res ? `PASS (Claimed: ${res.card.name} for ${res.reason})` : 'FAIL');

// Scenario 3: Kyren in discard, rival holds Aaron Jones, but Bills PSI is 3 (Championship Win)
G.decks.discard = [kyren];
G.players['0'].psi = 3;
res = evaluateBillsDiscardClaimWithPipeline(G, '0');
console.log('Scenario 3 - Championship Win (PSI <= 4):', res && res.reason === 'Championship Instant Win' ? 'PASS (Secured Championship Immediately!)' : 'FAIL');
