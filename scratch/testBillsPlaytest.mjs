import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, getEffectiveCardMaxBid, getEffectiveTeamId, calculateEstimatedGameEndRound, isGenuinePlayerCard, applyCoinsGained, applyPsiDeflated, applyPsiInflated } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

export function mulberry32(a) {
  let s = a >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fisherYates(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function evaluateBillsDiscardClaimCustom(G, billsId, genome) {
  const billsPlayer = G.players[billsId];
  if (!billsPlayer || billsPlayer.hasUsedBillsAbility) return null;
  if (!G.decks.discard || G.decks.discard.length === 0) return null;

  const billsEffTeam = getEffectiveTeamId(billsPlayer);
  const maxLineup = (billsEffTeam === 'seahawks' ? 4 : 3) + (billsPlayer.extraLineupSlots || 0);
  const currentLineup = billsPlayer.lineup || [];
  const currentRound = G.board?.round || 1;
  const estimatedEnd = calculateEstimatedGameEndRound(G);
  const roundsLeft = Math.max(1, estimatedEnd - currentRound);

  const deflateWeight = genome.deflateWeight || 1.6;
  const coinWeight = genome.coinWeight || 1.0;
  const patienceWeight = genome.discardPatienceWeight !== undefined ? genome.discardPatienceWeight : 1.0;
  const cashBoostMaxCoins = genome.discardCashBoostMaxCoins !== undefined ? genome.discardCashBoostMaxCoins : 5;
  const minDeflateEarly = genome.discardMinInstantDeflateEarly !== undefined ? genome.discardMinInstantDeflateEarly : 6;
  const minDeflatePhase2 = genome.discardMinInstantDeflatePhase2 !== undefined ? genome.discardMinInstantDeflatePhase2 : 5;
  const toxicCleanseBonus = genome.discardToxicCleanseBonus !== undefined ? genome.discardToxicCleanseBonus : 3.5;
  const goldenThreshold = genome.discardGoldenEngineThreshold !== undefined ? genome.discardGoldenEngineThreshold : 10.0;

  const affordableCards = G.decks.discard.filter(c => isGenuinePlayerCard(c) && c.minBid <= billsPlayer.coins);
  if (affordableCards.length === 0) return null;

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

      // Net recurring loss if this card is removed
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
      if (currentRound <= 3) {
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
      const isCashPoor = billsPlayer.coins <= cashBoostMaxCoins;
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

export function testCandidateStrategy(candidateName, candidateGenome, numGames = 100, numPlayers = 7, baseSeed = 2026) {
  let billsWins = 0;
  let billsPsiSum = 0;
  let abilityUsedCount = 0;
  let abilityRounds = [];
  let abilityReasons = {};

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'bills').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'bills' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = (i === 0) ? { ...ACTIVE_TEAM_GENOMES.bills, ...candidateGenome } : (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
      }

      let winnerId = null;

      for (let r = 1; r <= 10 && !winnerId; r++) {
        G.board.round = r;
        G.board.firstPlayer = String((r - 1) % numPlayers);
        G.board.nominator = G.board.firstPlayer;

        Object.values(G.players).forEach(p => {
          p.hasWonAuction = false;
          p.cardsWonThisRound = 0;
          p.outbidCount = 0;
        });

        if (DeflategateGame.phases.eventPhase?.onBegin) {
          DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers }, random: { Shuffle: (a) => fisherYates(a, rng) } });
        }
        G.board.pendingRivalry = null;
        G.board.pendingTradeRumors = null;
        G.board.bonusAuction = null;
        G.board.pendingFreeAgency = null;
        G.board.eventConfirmed = true;

        if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
          DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

        // Auction Phase
        let auctionSafety = 0;
        while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
          const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
          if (remainingBoardCards === 0) break;

          const nominatorId = String(G.board.nominator);
          if (G.board.activeAuctionCardIndex === null) {
            const nomIdx = chooseCpuNominationCard(G, nominatorId);
            if (nomIdx === -1 || !G.board.auctionPlayers[nomIdx]) {
              const eligible = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (eligible.length === 0) break;
              const curIdx = eligible.indexOf(nominatorId);
              const nextNom = eligible[(curIdx + 1) % eligible.length];
              if (nextNom === nominatorId) break;
              G.board.nominator = nextNom;
              continue;
            }
            const card = G.board.auctionPlayers[nomIdx];
            G.board.activeAuctionCardIndex = nomIdx;
            G.board.highestBid = card.minBid;
            G.board.highestBidder = nominatorId;
            G.board.passedAuctionPlayers = [];
          }

          let biddingSafety = 0;
          while (biddingSafety++ < 40) {
            const eligibleBidders = Object.keys(G.players).filter(
              id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound && !G.board.passedAuctionPlayers.includes(id)
            );

            if (eligibleBidders.length <= 1) {
              const winId = G.board.highestBidder !== null ? G.board.highestBidder : eligibleBidders[0];
              if (winId && G.board.activeAuctionCardIndex !== null) {
                const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
                if (wonCard) {
                  G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
                  resolveAuctionWin(G, winId, wonCard);
                }
                G.board.activeAuctionCardIndex = null;
                G.board.highestBid = 0;
                G.board.highestBidder = null;
                G.board.passedAuctionPlayers = [];
              }
              break;
            }

            const nextBidderId = eligibleBidders.find(id => id !== G.board.highestBidder);
            if (!nextBidderId) break;

            const bidDec = evaluateCpuAuctionBid(G, nextBidderId);
            if (bidDec.shouldBid && bidDec.bidAmount > G.board.highestBid) {
              G.board.highestBid = bidDec.bidAmount;
              G.board.highestBidder = nextBidderId;
              if (bidDec.isMaxBid) {
                const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
                G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
                resolveAuctionWin(G, nextBidderId, wonCard);
                G.board.activeAuctionCardIndex = null;
                G.board.highestBid = 0;
                G.board.highestBidder = null;
                G.board.passedAuctionPlayers = [];
                break;
              }
            } else {
              G.board.passedAuctionPlayers.push(nextBidderId);
            }
          }
        }

        // Post-Auction Phase: Execute Custom Bills Evaluation
        const billsPlayer = G.players['0'];
        if (!billsPlayer.hasUsedBillsAbility) {
          const claim = evaluateBillsDiscardClaimCustom(G, '0', billsPlayer.genome);
          if (claim) {
            const { card, replaceIdx, reason } = claim;
            const dIdx = G.decks.discard.indexOf(card);
            if (dIdx !== -1) G.decks.discard.splice(dIdx, 1);
            billsPlayer.coins -= card.minBid;
            billsPlayer.hasUsedBillsAbility = true;

            // Apply instant effects!
            if (card.effects) {
              card.effects.forEach(eff => {
                if (!eff.perRound) {
                  let amt = eff.amount;
                  if (eff.type === 'coins') applyCoinsGained(G, '0', amt);
                  if (eff.type === 'deflate') applyPsiDeflated(G, '0', amt);
                  if (eff.type === 'inflate') applyPsiInflated(G, '0', amt);
                }
              });
            }

            const maxLineup = 3 + (billsPlayer.extraLineupSlots || 0);
            if (billsPlayer.lineup.length < maxLineup) {
              billsPlayer.lineup.push(card);
            } else if (replaceIdx !== -1 && replaceIdx < billsPlayer.lineup.length) {
              const old = billsPlayer.lineup[replaceIdx];
              billsPlayer.lineup[replaceIdx] = card;
              G.decks.discard.push(old);
            }

            abilityUsedCount++;
            abilityRounds.push(r);
            abilityReasons[reason] = (abilityReasons[reason] || 0) + 1;
          }
        }

        // Refresh Phase
        calculateRefreshResults(G);
        if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
          DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
        }

        const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
        if (winners.length > 0) {
          winners.sort((a, b) => G.players[a].psi - G.players[b].psi);
          winnerId = winners[0];
          break;
        }
      }

      if (!winnerId) {
        let minPsi = Infinity;
        Object.keys(G.players).forEach(id => {
          if (G.players[id].psi < minPsi) {
            minPsi = G.players[id].psi;
            winnerId = id;
          }
        });
      }

      if (winnerId === '0') billsWins++;
      billsPsiSum += G.players['0'].psi;
    } finally {
      Math.random = origRandom;
    }
  }

  const avgRound = abilityRounds.length > 0 ? (abilityRounds.reduce((a, b) => a + b, 0) / abilityRounds.length).toFixed(2) : 'N/A';
  console.log(`\n--- ${candidateName} (100 games, 7P) ---`);
  console.log(`Wins: ${billsWins}/100 (${((billsWins / 100) * 100).toFixed(1)}%) | Avg PSI: ${(billsPsiSum / 100).toFixed(2)}`);
  console.log(`Ability Used: ${abilityUsedCount}/100 (${abilityUsedCount}%) | Avg Round: ${avgRound}`);
  console.log(`Claim Reasons: ${JSON.stringify(abilityReasons)}`);
  return { candidateName, wins: billsWins, avgPsi: billsPsiSum / 100, abilityUsedCount, avgRound };
}

console.log('Starting Bills Playtest Experiment across 4 Strategy Archetypes...\n');

// 1. Candidate A: Pure Deflation Hoarder (NEVER take cash boosts, wait for 6+ deflate or golden engine)
testCandidateStrategy('Candidate A: Pure Deflation Hoarder (No Cash Boosts)', {
  discardCashBoostMaxCoins: 0,
  discardMinInstantDeflateEarly: 6,
  discardMinInstantDeflatePhase2: 5,
  discardToxicCleanseBonus: 2.0
});

// 2. Candidate B: Balanced Strategic (Take cash boost only if broke <= 5 coins, 5+ deflate in P2, 3.5 cleanse)
testCandidateStrategy('Candidate B: Balanced Strategic (Cash if <= 5 coins)', {
  discardCashBoostMaxCoins: 5,
  discardMinInstantDeflateEarly: 6,
  discardMinInstantDeflatePhase2: 5,
  discardToxicCleanseBonus: 3.5
});

// 3. Candidate C: Cash Opportunist (Take cash boost if <= 7 coins, 4+ deflate in P2, 4.0 cleanse)
testCandidateStrategy('Candidate C: Cash Opportunist (Cash if <= 7 coins)', {
  discardCashBoostMaxCoins: 7,
  discardMinInstantDeflateEarly: 5,
  discardMinInstantDeflatePhase2: 4,
  discardToxicCleanseBonus: 4.0
});

// 4. Candidate D: Aggressive Endgame Closer (Patience in R1-3, heavy trigger in R4-7, 5.0 cleanse)
testCandidateStrategy('Candidate D: Aggressive Endgame Closer (P2 Nuke Priority)', {
  discardCashBoostMaxCoins: 4,
  discardMinInstantDeflateEarly: 7,
  discardMinInstantDeflatePhase2: 4,
  discardToxicCleanseBonus: 5.0,
  discardPatienceWeight: 0.9
});
