import { INVALID_MOVE, ActivePlayers } from 'boardgame.io/dist/cjs/core.js';
import { TEAMS, EVENTS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from './GameData.js';

export const getEffectiveTeamId = (p) => {
  if (!p) return '';
  return p.copiedTeam ? p.copiedTeam.id : (p.team ? p.team.id : '');
};

const addLog = (G, text) => {
  if (!G.logs) G.logs = [];
  G.logs.unshift({ id: Date.now() + Math.random(), text, round: G.board.round });
  if (G.logs.length > 50) G.logs.pop();
};

export const applyCoinsGained = (G, playerID, amount) => {
  if (amount <= 0) return 0;
  const p = G.players[playerID];
  if (!p) return 0;
  const ev = G.board.activeEvent;
  let allowed = amount;
  if (ev?.category === 'cap_coins' && typeof ev.maxCoins === 'number') {
    if (!G.board.roundStats) G.board.roundStats = {};
    if (!G.board.roundStats[playerID]) G.board.roundStats[playerID] = { coinsGained: 0, psiDeflated: 0 };
    const current = G.board.roundStats[playerID].coinsGained || 0;
    const remaining = Math.max(0, ev.maxCoins - current);
    allowed = Math.min(amount, remaining);
  }
  p.coins += allowed;
  if (!G.board.roundStats) G.board.roundStats = {};
  if (!G.board.roundStats[playerID]) G.board.roundStats[playerID] = { coinsGained: 0, psiDeflated: 0 };
  G.board.roundStats[playerID].coinsGained += allowed;
  return allowed;
};

export const applyPsiDeflated = (G, playerID, amount) => {
  if (amount <= 0) return 0;
  const p = G.players[playerID];
  if (!p) return 0;
  const ev = G.board.activeEvent;
  let allowed = amount;
  if (ev?.category === 'cap_deflate' && typeof ev.maxDeflate === 'number') {
    if (!G.board.roundStats) G.board.roundStats = {};
    if (!G.board.roundStats[playerID]) G.board.roundStats[playerID] = { coinsGained: 0, psiDeflated: 0 };
    const current = G.board.roundStats[playerID].psiDeflated || 0;
    const remaining = Math.max(0, ev.maxDeflate - current);
    allowed = Math.min(amount, remaining);
  }
  p.psi = Math.max(0, p.psi - allowed);
  if (!G.board.roundStats) G.board.roundStats = {};
  if (!G.board.roundStats[playerID]) G.board.roundStats[playerID] = { coinsGained: 0, psiDeflated: 0 };
  G.board.roundStats[playerID].psiDeflated += allowed;
  return allowed;
};

export const applyPsiInflated = (G, playerID, amount) => {
  if (amount <= 0) return 0;
  const p = G.players[playerID];
  if (!p) return 0;
  const effectiveTeamId = getEffectiveTeamId(p);
  if (effectiveTeamId === 'saints') {
    addLog(G, `Saints Immunity: Player ${parseInt(playerID) + 1} (${p.team?.name || 'Saints'}) ignored +${amount} PSI inflation.`);
    return 0;
  }
  p.psi += amount;
  return amount;
};

export const applyPenaltyCoinLoss = (G, playerID, amount) => {
  if (amount <= 0) return 0;
  const p = G.players[playerID];
  if (!p) return 0;
  const effectiveTeamId = getEffectiveTeamId(p);
  if (effectiveTeamId === 'saints') {
    addLog(G, `Saints Immunity: Player ${parseInt(playerID) + 1} (${p.team?.name || 'Saints'}) ignored -${amount} penalty coin loss.`);
    return 0;
  }
  const deducted = Math.min(p.coins, amount);
  p.coins -= deducted;
  return deducted;
};

export const getEffectiveCardMaxBid = (card, activeEvent) => {
  if (!card) return 0;
  let max = card.maxBid;
  if (activeEvent?.category === 'overpaid') {
    max += (activeEvent.maxAdd || 4);
  }
  return max;
};

export const resolveAuctionWin = (G, playerID, card) => {
  const p = G.players[playerID];
  if (!p) return;
  p.cardsWonThisRound = (p.cardsWonThisRound || 0) + 1;
  const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;
  p.hasWonAuction = p.cardsWonThisRound >= maxWinsThisRound;
  p.coins -= G.board.highestBid;

  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
  const isMaxBid = G.board.highestBid >= effMax;
  const displayId = parseInt(playerID) + 1;

  // Isaiah Pacheco Custom Mechanic: Shuffles player deck, draws top card to replace Pacheco, discards Pacheco
  if (card.id === 'isaiah_pacheco') {
    if (!G.decks.discard) G.decks.discard = [];
    G.decks.discard.push(card);
    if (G.decks.activePlayers && G.decks.activePlayers.length > 0) {
      G.decks.activePlayers.sort(() => Math.random() - 0.5);
      const replacementCard = G.decks.activePlayers.pop();
      replacementCard.uniqueId = `${replacementCard.id}_${Date.now()}_${Math.random()}`;
      G.board.pachecoSwapAlert = {
        playerID,
        oldCard: card,
        newCard: replacementCard
      };
      addLog(G, `🏈 Isaiah Pacheco Ability: Shuffled deck and Player ${displayId} acquired ${replacementCard.name} instead!`);
      card = replacementCard;
    }
  }

  // Brandon Aiyuk Custom Mechanic: If acquired for maximum price, upgrades per-round earnings from 2 to 4 coins/round
  if (card.id === 'brandon_aiyuk' && isMaxBid) {
    card.effects = [{ type: 'coins', amount: 4, perRound: true }];
    addLog(G, `Brandon Aiyuk Max Bid Bonus: Upgraded to 4 coins per round!`);
  }

  // Brock Purdy Custom Mechanic: If among last 2 players acquired in the round, immediately gains +5 coins and -3 PSI deflation
  if (card.id === 'brock_purdy') {
    const totalWinsInRound = Object.keys(G.players).length * maxWinsThisRound;
    const currentTotalWins = Object.values(G.players).reduce((sum, pl) => sum + (pl.cardsWonThisRound || 0), 0);
    if (currentTotalWins >= totalWinsInRound - 1) {
      applyCoinsGained(G, playerID, 5);
      applyPsiDeflated(G, playerID, 3);
      addLog(G, `🏈 Brock Purdy Mr. Irrelevant Bonus: Acquired as one of the last 2 players in Round ${G.board.round}! Gained +5 coins and deflated -3 PSI!`);
    }
  }

  // Acquisition Card Won Fly Animation
  G.board.cardWonFlyAnimation = {
    card: { ...card },
    winnerId: playerID,
    winnerTeamName: p.team ? p.team.name : `Player ${displayId}`,
    bidAmount: G.board.highestBid,
    timestamp: Date.now()
  };

  addLog(G, `Player ${displayId} (${p.team ? p.team.name : 'Team'}) won ${card.name} for ${G.board.highestBid} coins.`);

  const effectiveTeamId = getEffectiveTeamId(p);

  // Lions Ability: First player to claim a card in the auction gains coins equal to number of players
  if (G.board.firstClaimThisRound === null) {
    G.board.firstClaimThisRound = playerID;
    if (effectiveTeamId === 'lions') {
      const numP = Object.keys(G.players).length;
      applyCoinsGained(G, playerID, numP);
      addLog(G, `🦁 Lions Ability: First player to claim an auction card! Gained +${numP} coins.`);
    }
  }

  // Jets Ability: Deflate 4 on max bid
  if (effectiveTeamId === 'jets' && isMaxBid) {
    applyPsiDeflated(G, playerID, 4);
    addLog(G, `Jets Ability: Paid max bid! Deflated 4 PSI.`);
  }

  // Packers Ability: Gain 1 coin on Phase 1 acquisition
  if (effectiveTeamId === 'packers' && card.phase === 1) {
    applyCoinsGained(G, playerID, 1);
    addLog(G, `Packers Ability: Acquired Phase 1 player, gained +1 coin.`);
  }

  // Broncos Ability: Flag card acquired this round so its recurring effects are ignored in the first refresh
  if (effectiveTeamId === 'broncos') {
    card.broncosRoundAcquired = G.board.round;
    addLog(G, `Broncos Ability: ${card.name} acquired this round; its recurring effects will be ignored in this round's refresh.`);
  }

  // Commanders Ability: Once the First Player acquires any player this round, the restriction lifts immediately
  if (String(playerID) === String(G.board.firstPlayer) && G.board.commandersMarkedCardIndex !== null) {
    const markedCard = G.board.auctionPlayers ? G.board.auctionPlayers[G.board.commandersMarkedCardIndex] : null;
    const cardName = markedCard ? markedCard.name : 'The marked player';
    addLog(G, `🎖️ Commanders Mark Lifted: First Player ${displayId} acquired a card. ${cardName} is now unlocked for all teams!`);
    G.board.commandersMarkedCardIndex = null;
  }

  // If winner has reached maxWinsThisRound and was nominator, pass nominator rights to next player without enough wins
  if (p.hasWonAuction && String(playerID) === String(G.board.nominator)) {
    const numP = Object.keys(G.players).length;
    let nextNom = (parseInt(playerID) + 1) % numP;
    let count = 0;
    while (G.players[nextNom.toString()]?.hasWonAuction && count < numP) {
      nextNom = (nextNom + 1) % numP;
      count++;
    }
    G.board.nominator = nextNom.toString();
  }

  // Remove card from auction block
  if (G.board.activeAuctionCardIndex !== null && G.board.auctionPlayers) {
    if (G.board.activeAuctionCardIndex === G.board.commandersMarkedCardIndex) {
      G.board.commandersMarkedCardIndex = null;
    }
    G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
  }
  G.board.activeAuctionCardIndex = null;
  G.board.passedAuctionPlayers = [];
  G.board.highestBid = 0;
  G.board.highestBidder = null;

  // Apply one-time / immediate card effects (with Bengals +2 bonus & event multipliers)
  if (card.effects) {
    let instantMult = 1;
    if (G.board.activeEvent?.category === 'double_all') instantMult *= 2;
    if (G.board.activeEvent?.category === 'double_phase1' && card.phase === 1) instantMult *= 2;

    const qbChoice = G.board.qbChoices?.[card.uniqueId];
    const isQbChoiceEvent = G.board.activeEvent?.category === 'qb_choice' && card.position === 'QB';

    card.effects.forEach(eff => {
      if (!eff.perRound) {
        if (isQbChoiceEvent && qbChoice && eff.type !== qbChoice) {
          return; // Skip non-chosen effect for Refs Check
        }
        let effAmount = eff.amount * instantMult;
        if (effectiveTeamId === 'bengals') {
          effAmount += 2;
          addLog(G, `Bengals Ability: +2 boost to instant ${eff.type}!`);
        }
        if (eff.type === 'coins' && effectiveTeamId !== 'browns') {
          applyCoinsGained(G, playerID, effAmount);
        }
        if (eff.type === 'deflate') {
          applyPsiDeflated(G, playerID, effAmount);
        }
        if (eff.type === 'inflate') {
          applyPsiInflated(G, playerID, effAmount);
        }
      }
    });
  }

  // Handle Lineup Insertion
  const maxLineup = (effectiveTeamId === 'seahawks' ? 4 : 3) + (p.extraLineupSlots || 0);
  if (effectiveTeamId === 'colts' || p.lineup.length < maxLineup) {
    p.lineup.push(card);
  } else {
    if (p.isCpu) {
      // Bengals ability: May discard acquired player instead of replacing a player.
      // If CPU Bengals wins an instant player and all current lineup players are valuable per-round engines,
      // discard the acquired player after triggering its instant effect to preserve core engines.
      if (effectiveTeamId === 'bengals') {
        const isWonCardInstant = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound);
        const hasDeadCardInLineup = p.lineup.some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_') || (c.effects && c.effects.every(e => !e.perRound)));
        if (isWonCardInstant && !hasDeadCardInLineup) {
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(card);
          addLog(G, `Bengals Ability: CPU Player ${displayId} discarded acquired card ${card.name} after triggering its instant effect.`);
          return;
        }
      }

      let replaceIdx = 0;
      let worstScore = Infinity;

      p.lineup.forEach((c, idx) => {
        let score = 0;
        const hasPerRound = c.effects ? c.effects.some(e => e.perRound) : false;
        if (!hasPerRound) {
          score = -100;
        } else {
          c.effects.forEach(e => {
            if (e.perRound) {
              if (e.type === 'coins' && effectiveTeamId !== 'browns') score += e.amount;
              if (e.type === 'deflate') score += e.amount * 2;
            }
          });
        }
        if (score < worstScore) {
          worstScore = score;
          replaceIdx = idx;
        }
      });

      const discarded = p.lineup[replaceIdx];
      p.lineup[replaceIdx] = card;
      if (!G.decks.discard) G.decks.discard = [];
      G.decks.discard.push(discarded);
      addLog(G, `CPU Player ${displayId} replaced ${discarded.name} with ${card.name}.`);
    } else {
      G.pendingReplacement = {
        playerID,
        wonCard: card
      };
      addLog(G, `Player ${displayId} must select a lineup card to replace with ${card.name}.`);
    }
  }
};

// ============================================================================
// HUMAN-LIKE CPU AUCTION EVALUATION & VARIANCE SYSTEM
// ============================================================================

export const CPU_ARCHETYPES = ['rusher', 'tycoon', 'opportunist', 'bully', 'wildcard'];

export const getCpuArchetype = (player, playerId) => {
  if (player && player.personality) return player.personality;
  const hash = Math.abs((playerId ? parseInt(playerId) : 0) * 31 + (player?.team?.id?.charCodeAt(0) || 0));
  return CPU_ARCHETYPES[hash % CPU_ARCHETYPES.length];
};

const scoreCardRaw = (card, roundsLeft, deflateWeight, coinWeight) => {
  if (!card) return -999;
  if (card.isPracticeSquad || card.uniqueId?.startsWith('ps_')) return 0;
  let d = 0;
  let c = 0;
  if (card.effects) {
    card.effects.forEach(eff => {
      const amt = eff.amount || 0;
      if (eff.perRound) {
        if (eff.type === 'deflate') d += amt * roundsLeft;
        if (eff.type === 'coins') c += amt * roundsLeft;
        if (eff.type === 'inflate') d -= amt * roundsLeft;
      } else {
        if (eff.type === 'deflate') d += amt;
        if (eff.type === 'coins') c += amt;
        if (eff.type === 'inflate') d -= amt;
      }
    });
  }
  return (d * deflateWeight) + (c * coinWeight);
};

export const doesCardFitTeamStrategy = (teamId, card, player, G) => {
  if (!card || !teamId) return false;
  if (teamId === 'browns') {
    return card.effects?.some(e => e.type === 'deflate');
  }
  if (teamId === 'texans') {
    return card.position === 'QB';
  }
  if (teamId === 'bengals') {
    return card.effects?.some(e => !e.perRound);
  }
  if (teamId === 'packers') {
    return card.phase === 1;
  }
  if (teamId === 'jets') {
    const effMax = getEffectiveCardMaxBid(card, G?.board?.activeEvent);
    return effMax <= (player?.coins || 0);
  }
  if (teamId === 'ravens') {
    const existingPositions = new Set((player?.lineup || []).map(c => c.position));
    return !existingPositions.has(card.position);
  }
  if (teamId === '49ers') {
    return (player?.coins || 0) >= 5 && ((player?.coins || 0) - card.minBid < 5);
  }
  if (teamId === 'saints') {
    return card.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0));
  }
  return false;
};

export const isCardEspeciallyGood = (card, G, playerID) => {
  if (!card) return false;
  if (card.phase === 'hof' || card.phase === 2) return true;
  const effMax = getEffectiveCardMaxBid(card, G?.board?.activeEvent);
  if (effMax >= 14) return true;
  if (card.effects?.some(e => (e.type === 'coins' && e.amount >= 3 && e.perRound) || (e.type === 'deflate' && e.amount >= 2 && e.perRound))) {
    return true;
  }
  if (card.effects?.some(e => (e.type === 'deflate' && e.amount >= 3 && !e.perRound) || (e.type === 'coins' && e.amount >= 5 && !e.perRound))) {
    return true;
  }
  return false;
};

export const scoreCardForPlayer = (G, playerID, card) => {
  if (!card) return -999;
  const p = G.players[playerID];
  if (!p) return 0;
  const effectiveTeamId = getEffectiveTeamId(p);
  const archetype = getCpuArchetype(p, playerID);
  const roundsLeft = Math.max(1, 10 - G.board.round);

  let deflateWeight = 1.6;
  let coinWeight = 1.0;

  if (archetype === 'rusher') {
    deflateWeight = 2.2;
    coinWeight = 0.7;
  } else if (archetype === 'tycoon') {
    deflateWeight = 1.1;
    coinWeight = 1.6;
  } else if (archetype === 'bully') {
    deflateWeight = 1.8;
    coinWeight = 1.1;
  } else if (archetype === 'wildcard') {
    deflateWeight = 1.3 + Math.random() * 0.8;
    coinWeight = 0.8 + Math.random() * 0.8;
  }

  if (effectiveTeamId === 'browns') {
    deflateWeight = 3.5;
    coinWeight = 0.1;
  }

  let totalDeflate = 0;
  let totalCoins = 0;

  if (card.effects) {
    card.effects.forEach(eff => {
      let amt = eff.amount || 0;
      if (eff.perRound) {
        if (eff.type === 'deflate') totalDeflate += amt * roundsLeft;
        if (eff.type === 'coins') totalCoins += amt * roundsLeft;
        if (eff.type === 'inflate') totalDeflate -= amt * roundsLeft;
      } else {
        // Bengals Ability: +2 coins/deflate for instant abilities
        if (effectiveTeamId === 'bengals' && (eff.type === 'deflate' || eff.type === 'coins')) {
          amt += 2;
        }
        if (eff.type === 'deflate') totalDeflate += amt;
        if (eff.type === 'coins') totalCoins += amt;
        if (eff.type === 'inflate') totalDeflate -= amt;
      }
    });
  }

  // Texans Ability: During Refresh Phase gain 2 coins and 2 deflate for each QB on team
  if (effectiveTeamId === 'texans' && card.position === 'QB') {
    totalDeflate += 2 * roundsLeft;
    totalCoins += 2 * roundsLeft;
  }

  if (card.id === 'tyreek_hill') {
    totalDeflate += 2;
  }
  if (card.id === 'amon_st_brown') {
    const oppCount = Object.keys(G.players).length - 1;
    totalCoins += oppCount * roundsLeft;
  }
  if (card.id === 'dj_moore' && p.coins <= 10) {
    totalDeflate += 2;
  }

  let rawScore = (totalDeflate * deflateWeight) + (totalCoins * coinWeight);

  // Texans heavily target QBs due to their passive +2 coins & -2 PSI per QB Refresh Phase ability
  if (effectiveTeamId === 'texans' && card.position === 'QB') {
    rawScore += 8.0;
  }

  // Situational team synergy: 49ers want to be <5 coins to trigger double deflation
  if (effectiveTeamId === '49ers' && p.coins >= 5 && p.coins - card.minBid < 5) {
    rawScore += 5;
  }

  // Cards with low Max Bid (cheap max bonus synergy)
  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
  if (effMax <= 4 && p.coins >= effMax) {
    rawScore += 2;
  }

  // -------------------------------------------------------------
  // Roster Composition & 3-Slot Rotation Strategy
  // 3 roster spots:
  // - Optimal state: 2 "every turn" passive engines + 1 rotating slot for Instant cards.
  // - If team has 0 or 1 per-round engines: Per-round card is high priority (build core engine).
  //   Getting an every-turn 3-coins card on the first turn is fantastic!
  // - If team has 2 per-round engines: Instant cards get strong rotation bonus (+5.0).
  //   A 3rd per-round card clogs the rotation slot; heavily discounted unless elite/HoF superstar.
  // - If team has 3 per-round engines: Roster is clogged!
  //   Upgrading a 2-coin to a 3-coin card is only a net +1 coin/round, NOT a big upgrade.
  //   Candidate per-round cards are scored strictly by marginal difference and penalized for keeping roster locked.
  // -------------------------------------------------------------
  const realLineup = (p.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  const perRoundCardsInLineup = realLineup.filter(c => c.effects && c.effects.some(e => e.perRound));
  const perRoundCount = perRoundCardsInLineup.length;
  const isCandidatePerRound = card.effects && card.effects.some(e => e.perRound);
  const isCandidateInstantOnly = card.effects && card.effects.every(e => !e.perRound);

  if (effectiveTeamId !== 'colts') {
    if (perRoundCount < 2) {
      // Early engine building: prioritize per-round cards to establish the 2 core engines
      if (isCandidatePerRound) {
        const earlyRoundBonus = G.board.round <= 3 ? 4.5 : 2.5;
        rawScore += earlyRoundBonus;
      }
    } else if (perRoundCount === 2) {
      // The ideal meta state: 2 core engines established, slot 3 is the rotation slot!
      if (isCandidateInstantOnly) {
        rawScore += 5.0;
        if (effectiveTeamId === 'bengals') rawScore += 5.0;
      } else if (isCandidatePerRound) {
        // A 3rd per-round card clogs the flexible rotation slot!
        // Unless it's an elite Hall of Fame superstar or massive production (rawScore >= 20), discount it
        if (card.phase !== 'hof' && rawScore < 20) {
          rawScore *= 0.55;
        }
      }
    } else if (perRoundCount >= 3) {
      // Roster is currently clogged with 3 per-round engines!
      if (isCandidatePerRound) {
        // "if you have three 2 coins every turn players it isn't that much of an upgrade"
        rawScore *= 0.60;
      } else if (isCandidateInstantOnly) {
        rawScore += 2.0;
        if (effectiveTeamId === 'bengals') rawScore += 8.0;
      }
    }
  }

  // Bengals specific instant targeting:
  // Bengals heavily target instant ability players after securing 1–2 per-round engines, capitalizing on their +2 instant bonus and discard flexibility.
  if (effectiveTeamId === 'bengals') {
    const hasInstant = card.effects && card.effects.some(e => !e.perRound);
    if (hasInstant) {
      if (perRoundCount >= 2) {
        rawScore += 5.0; // Pairs with rotation bonuses above for +10.0 total boost
      } else if (perRoundCount === 1) {
        rawScore += 7.0;
      }
    }
  }

  // Marginal Utility: Practice Squad cards and spent instant cards have 0 future value.
  // Replacing an active per-round engine loses that engine's future stream.
  const maxLineup = (effectiveTeamId === 'seahawks' ? 4 : 3) + (p.extraLineupSlots || 0);
  const currentLineup = p.lineup || [];

  if (currentLineup.length >= maxLineup && effectiveTeamId !== 'colts') {
    // Bengals Discard Flexibility:
    // When acquiring a card with instant abilities, Bengals can discard the card instead of replacing an active player.
    // Thus, they sacrifice NO opportunity cost from their existing lineup engines!
    const isCandidateInstant = card.effects && card.effects.some(e => !e.perRound);
    if (effectiveTeamId === 'bengals' && isCandidateInstant) {
      return rawScore;
    }

    let lowestOpportunityCost = Infinity;
    currentLineup.forEach(activeC => {
      const isInstantOnly = activeC.effects && activeC.effects.length > 0 && activeC.effects.every(e => !e.perRound);
      if (activeC.isPracticeSquad || activeC.uniqueId?.startsWith('ps_') || isInstantOnly) {
        lowestOpportunityCost = Math.min(lowestOpportunityCost, 0);
      } else {
        const activeScore = scoreCardRaw(activeC, roundsLeft, deflateWeight, coinWeight);
        if (activeScore < lowestOpportunityCost) {
          lowestOpportunityCost = activeScore;
        }
      }
    });

    return rawScore - lowestOpportunityCost;
  }

  return rawScore;
};

export const chooseCpuCommandersMarkCard = (G, commandersId) => {
  const firstPlayerId = G.board.firstPlayer;
  if (!firstPlayerId || firstPlayerId === commandersId) return -1;
  const availableCards = G.board.auctionPlayers;
  if (!availableCards || availableCards.length === 0) return -1;

  let bestIdx = -1;
  let highestScore = -Infinity;

  availableCards.forEach((card, idx) => {
    if (!card) return;
    const targetScore = scoreCardForPlayer(G, firstPlayerId, card);
    if (targetScore > highestScore) {
      highestScore = targetScore;
      bestIdx = idx;
    }
  });

  return bestIdx !== -1 ? bestIdx : 0;
};

export const chooseCpuNominationCard = (G, currentPlayerId) => {
  const currentPlayer = G.players[currentPlayerId];
  const remainingCardsCount = G.board.auctionPlayers.filter(c => c !== null).length;
  const eligibleCards = [];

  const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
  const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === currentPlayerId;

  G.board.auctionPlayers.forEach((c, idx) => {
    if (!c) return;
    if (c.id === 'dj_moore' && currentPlayer.coins > 10) return;
    if (String(currentPlayerId) === String(G.board.firstPlayer) && idx === G.board.commandersMarkedCardIndex && remainingCardsCount > 1) {
      return;
    }
    // Must be able to afford the opening minimum bid (unless sole remaining bidder with 0 coins)
    if (!isSoleRemainingBidder && currentPlayer.coins < c.minBid) {
      return;
    }
    const score = scoreCardForPlayer(G, currentPlayerId, c);
    eligibleCards.push({ card: c, index: idx, score });
  });

  if (eligibleCards.length === 0) return -1;
  eligibleCards.sort((a, b) => b.score - a.score);

  const activeOpponents = Object.keys(G.players).filter(
    id => id !== currentPlayerId && !G.players[id].hasWonAuction
  );

  // Lions 1st Player of Round Strategy:
  // Aggressively target a card they can buy max to win immediately, or lockout as coin leader
  const isFirstPlayerOfRound = Object.values(G.players).every(p => !p.hasWonAuction);
  const effectiveTeamId = getEffectiveTeamId(currentPlayer);
  const isLionsFirstBonus = isFirstPlayerOfRound && effectiveTeamId === 'lions';

  if (isLionsFirstBonus) {
    // 1. Target a player whose max bid Lions can immediately afford
    const maxAffordable = eligibleCards.filter(item => {
      const effMax = getEffectiveCardMaxBid(item.card, G.board.activeEvent);
      return currentPlayer.coins >= effMax;
    });
    if (maxAffordable.length > 0) {
      return maxAffordable[0].index;
    }

    // 2. If richest player at table, target the best player available
    const richestOpponentCoins = Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0));
    if (currentPlayer.coins > richestOpponentCoins) {
      return eligibleCards[0].index;
    }
  }

  // #1 User Strategy: Decoy Nomination

  const archetype = getCpuArchetype(currentPlayer, currentPlayerId);
  const decoyChance = archetype === 'opportunist' ? 0.40 : (archetype === 'tycoon' ? 0.35 : 0.20);

  if (activeOpponents.length >= 2 && eligibleCards.length >= 2 && Math.random() < decoyChance) {
    const cheapDecoys = eligibleCards.filter((item, i) => i > 0 && item.card.minBid <= 2 && item.score >= 0);
    if (cheapDecoys.length > 0) {
      return cheapDecoys[0].index;
    }
  }

  // Weighted choice between #1 and #2 so nomination isn't 100% deterministic
  if (eligibleCards.length >= 2 && eligibleCards[0].score - eligibleCards[1].score < 3 && Math.random() < 0.35) {
    return eligibleCards[1].index;
  }

  return eligibleCards[0].index;
};

export const evaluateCpuAuctionBid = (G, currentPlayerId) => {
  const currentPlayer = G.players[currentPlayerId];
  const cardIndex = G.board.activeAuctionCardIndex;
  const card = G.board.auctionPlayers[cardIndex];
  if (!card) return { shouldBid: false, bidAmount: 0 };

  const effectiveTeamId = getEffectiveTeamId(currentPlayer);
  const highestBidderPlayer = G.board.highestBidder !== null ? G.players[G.board.highestBidder] : null;
  const highestTeamId = getEffectiveTeamId(highestBidderPlayer);
  const bidStep = (highestTeamId === 'bears') ? 2 : 1;
  const minNeededBid = G.board.highestBidder !== null ? G.board.highestBid + bidStep : card.minBid;
  const nextBid = Math.max(card.minBid, minNeededBid);
  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);

  if (currentPlayer.coins < nextBid) {
    return { shouldBid: false, bidAmount: 0 };
  }

  const remainingCardsCount = G.board.auctionPlayers.filter(c => c !== null).length;
  if (String(currentPlayerId) === String(G.board.firstPlayer) && cardIndex === G.board.commandersMarkedCardIndex && remainingCardsCount > 1) {
    return { shouldBid: false, bidAmount: 0 };
  }
  if (card.id === 'dj_moore' && currentPlayer.coins > 10) {
    return { shouldBid: false, bidAmount: 0 };
  }

  const cardScore = scoreCardForPlayer(G, currentPlayerId, card);
  const archetype = getCpuArchetype(currentPlayer, currentPlayerId);

  // #1B Scarcity & Drop-Off Factor (FOMO)
  const otherScores = [];
  G.board.auctionPlayers.forEach((c, idx) => {
    if (c && idx !== cardIndex) {
      otherScores.push(scoreCardForPlayer(G, currentPlayerId, c));
    }
  });
  otherScores.sort((a, b) => b - a);
  const secondBestScore = otherScores.length > 0 ? otherScores[0] : 0;
  const floorScore = otherScores.length > 0 ? otherScores[otherScores.length - 1] : 0;

  let scarcityMultiplier = 1.0;
  if (otherScores.length > 0) {
    const dropOff = cardScore - secondBestScore;
    if (dropOff <= 1.5 && secondBestScore > 0) {
      scarcityMultiplier = 0.75; // Similar quality alternatives exist, avoid overbidding
    } else if (dropOff >= 5.0 || floorScore < 0) {
      scarcityMultiplier = 1.35; // Big drop-off or negative player (Ezekiel Elliott) lurking, fight harder!
    }
  }

  // #3 Phase 2 & Hall of Fame Anticipation Savings (Rounds 3 & 6)
  // Situational: Don't do this for every team (Packers love Phase 1, Browns get 30 free coins after R5, Dolphins re-up at 0).
  // Hold reserve if there is no one on the board that is especially good and none fit team strategy.
  let savingsReserve = 0;
  const isApproachingPhase2 = (G.board.round === 3);
  const isApproachingHoF = (G.board.round === 6);

  const teamExemptFromHoarding = (effectiveTeamId === 'packers' || effectiveTeamId === 'browns' || effectiveTeamId === 'dolphins');

  if ((isApproachingPhase2 || isApproachingHoF) && !teamExemptFromHoarding) {
    const remainingBoardCards = (G.board.auctionPlayers || []).filter(c => c !== null);
    const anyEspeciallyGoodOnBoard = remainingBoardCards.some(c => isCardEspeciallyGood(c, G, currentPlayerId));
    const anyFitsStrategyOnBoard = remainingBoardCards.some(c => doesCardFitTeamStrategy(effectiveTeamId, c, currentPlayer, G));

    const thisCardFits = doesCardFitTeamStrategy(effectiveTeamId, card, currentPlayer, G);
    const thisCardGood = isCardEspeciallyGood(card, G, currentPlayerId);

    if (!anyEspeciallyGoodOnBoard && !anyFitsStrategyOnBoard) {
      if (archetype === 'tycoon') savingsReserve = isApproachingHoF ? 6 : 5;
      else if (archetype === 'opportunist') savingsReserve = isApproachingHoF ? 5 : 4;
      else if (archetype === 'rusher') savingsReserve = isApproachingHoF ? 3 : 2;
      else savingsReserve = isApproachingHoF ? 4 : 3;
    } else if (!thisCardGood && !thisCardFits) {
      // There is an especially good or strategy card on the board, but this card isn't it: save coins for it!
      savingsReserve = 4;
    }
  }

  const isSuperstar = (card.phase === 'hof' || effMax >= 18 || cardScore >= 18);
  const spendableCoins = (isSuperstar || savingsReserve === 0) 
    ? currentPlayer.coins 
    : Math.max(0, currentPlayer.coins - savingsReserve);

  // #4 Relative Purchasing Power & Monopoly Leverage
  const activeOpponents = Object.keys(G.players).filter(
    id => id !== currentPlayerId && !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers.includes(id)
  );
  const richestOpponentCoins = activeOpponents.length > 0
    ? Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0))
    : 0;

  const isCoinLeader = currentPlayer.coins > richestOpponentCoins;

  // Base valuation mapped to card score
  let baseValuation = Math.max(card.minBid, Math.min(effMax, Math.round(cardScore * 0.75 * scarcityMultiplier)));

  // Lions 1st-Player Aggression: Bonus coins equal to number of players (+4 to +10) if won!
  const isFirstPlayerOfRound = Object.values(G.players).every(p => !p.hasWonAuction);
  const isLionsFirstBonus = isFirstPlayerOfRound && effectiveTeamId === 'lions';
  if (isLionsFirstBonus) {
    const numP = Object.keys(G.players).length;
    baseValuation = Math.max(baseValuation, card.minBid + numP + 4);
  }

  let archetypeMult = 1.0;
  if (archetype === 'rusher') archetypeMult = 1.25;
  if (archetype === 'tycoon') archetypeMult = 0.80;
  if (archetype === 'bully') archetypeMult = 1.15;
  if (archetype === 'wildcard') archetypeMult = 0.85 + Math.random() * 0.35;

  const jitter = 0.90 + Math.random() * 0.20; // Natural +/- 10% variance
  let valuation = Math.min(effMax, Math.round(baseValuation * archetypeMult * jitter));

  // Monopoly leverage: cap bid at richestOpponentCoins (NOT richestOpponentCoins + 1).
  // If 2nd richest has 8 coins, bidding 8 prices them out because they need 9 to outbid!
  if (isCoinLeader) {
    const monopolyCap = Math.max(card.minBid, richestOpponentCoins);
    if (valuation > monopolyCap) {
      valuation = monopolyCap;
    }
  }

  valuation = Math.min(valuation, spendableCoins);

  if (isLionsFirstBonus) {
    // Lions are willing to spend up to their entire purse or effMax to secure the first player
    valuation = Math.min(effMax, currentPlayer.coins);
  }

  // Non-Lions Counter-Play: Aggressively block Lions from obtaining the 1st player or drive the price up
  const lionsPlayerId = Object.keys(G.players).find(
    id => getEffectiveTeamId(G.players[id]) === 'lions' && !G.players[id].hasWonAuction
  );
  if (isFirstPlayerOfRound && effectiveTeamId !== 'lions' && lionsPlayerId) {
    const isLionsHighest = G.board.highestBidder === lionsPlayerId;
    const lionsPlayer = G.players[lionsPlayerId];

    if (isLionsHighest && lionsPlayer && lionsPlayer.coins >= nextBid + 1) {
      // Opponents drive up the price until the price of blocking them outweighs benefits
      const blockCeiling = Math.min(effMax - 1, Math.max(valuation + 3, Math.round(effMax * 0.75)));
      if (nextBid <= blockCeiling && currentPlayer.coins >= nextBid + 1) {
        return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
      }
    }
  }

  // #2 Price Bumping / Trap Bidding
  if (nextBid > valuation) {
    const isBullyOrOpportunist = (archetype === 'bully' || archetype === 'opportunist');
    const bumpChance = isBullyOrOpportunist ? 0.35 : 0.15;
    const opponentCanAffordRaise = highestBidderPlayer && highestBidderPlayer.coins >= nextBid + 1;
    const isBargainPrice = G.board.highestBid < Math.round(effMax * 0.45);

    if (opponentCanAffordRaise && isBargainPrice && currentPlayer.coins >= nextBid && Math.random() < bumpChance) {
      return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
    }
    return { shouldBid: false, bidAmount: 0 };
  }

  return { shouldBid: true, bidAmount: nextBid };
};

const executeCpuMoveInternal = (G, ctx, events) => {
  if (G.pendingReplacement) return;
  const currentPlayerId = ctx.currentPlayer;
  const currentPlayer = G.players[currentPlayerId];
  if (!currentPlayer || !currentPlayer.isCpu) return;

  const displayId = parseInt(currentPlayerId) + 1;

  // Case 1: No active card nominated yet
  if (G.board.activeAuctionCardIndex === null) {
    const cardIdx = chooseCpuNominationCard(G, currentPlayerId);

    if (cardIdx !== -1) {
      const card = G.board.auctionPlayers[cardIdx];
      G.board.activeAuctionCardIndex = cardIdx;
      G.board.passedAuctionPlayers = [];
      const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
      const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === currentPlayerId;
      const isFirstPlayerOfRound = Object.values(G.players).every(p => !p.hasWonAuction);
      const effectiveTeamId = getEffectiveTeamId(currentPlayer);
      const isLionsFirstBonus = isFirstPlayerOfRound && effectiveTeamId === 'lions';
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);

      if (isLionsFirstBonus) {
        const activeOpponents = Object.keys(G.players).filter(id => id !== currentPlayerId && !G.players[id].hasWonAuction);
        const richestOpponentCoins = Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0));

        if (currentPlayer.coins >= effMax) {
          // Target player they can afford max bid of and immediately pay max bid
          G.board.highestBid = effMax;
        } else if (currentPlayer.coins > richestOpponentCoins) {
          // Lowest price possible that can't be bid up by any other player
          const lockoutBid = Math.min(effMax, Math.max(card.minBid, richestOpponentCoins));
          G.board.highestBid = Math.min(currentPlayer.coins, lockoutBid);
        } else {
          G.board.highestBid = card.minBid;
        }
      } else {
        G.board.highestBid = (isSoleRemainingBidder && currentPlayer.coins === 0) ? 0 : card.minBid;
      }
      G.board.highestBidder = currentPlayerId;
      G.board.lastActionText = `Player ${displayId} (${currentPlayer.team ? currentPlayer.team.name : 'CPU'}) nominated ${card.name} for ${G.board.highestBid} coins.`;
      addLog(G, G.board.lastActionText);

      // Tyreek Hill custom mechanic
      if (card.id === 'tyreek_hill') {
        applyPsiDeflated(G, currentPlayerId, 1);
        G.board.tyreekHillAlert = {
          playerID: currentPlayerId,
          playerName: currentPlayer.team?.name || `Player ${displayId}`,
          timestamp: Date.now()
        };
        addLog(G, `⚡ Tyreek Hill Speed Tax: CPU Player ${displayId} nominated and deflated -1 PSI!`);
      }

      // Jaylen Waddle bonus
      if (card.id === 'jaylen_waddle') {
        applyCoinsGained(G, currentPlayerId, 1);
        G.board.waddleBonusAlert = {
          playerID: currentPlayerId,
          playerName: currentPlayer.team?.name || `Player ${displayId}`
        };
        addLog(G, `Jaylen Waddle Bonus: CPU Player ${displayId} gained +1 coin for placing a bid!`);
      }

      if ((eligibleBidders.length === 1 && eligibleBidders[0] === currentPlayerId) || G.board.highestBid >= effMax) {
        resolveAuctionWin(G, currentPlayerId, card);
      }
    } else {
      // CPU nominator cannot afford any available card on the board
      const activePlayers = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
      const otherAffordable = activePlayers.filter(id => {
        if (id === currentPlayerId) return false;
        const p = G.players[id];
        return G.board.auctionPlayers.some(c => c && p.coins >= c.minBid);
      });

      if (otherAffordable.length > 0) {
        const numP = Object.keys(G.players).length;
        let nextNom = (parseInt(currentPlayerId) + 1) % numP;
        let count = 0;
        while ((G.players[nextNom.toString()]?.hasWonAuction || !G.board.auctionPlayers.some(c => c && G.players[nextNom.toString()]?.coins >= c.minBid)) && count < numP) {
          nextNom = (nextNom + 1) % numP;
          count++;
        }
        G.board.nominator = nextNom.toString();
        addLog(G, `Player ${displayId} (${currentPlayer.team?.name || 'CPU'}) has insufficient coins to nominate. Passed nomination to Player ${nextNom + 1}.`);
      } else {
        // No remaining active player can afford any available card on the board
        addLog(G, `No remaining active teams have enough coins to nominate any available player. Concluding auction phase.`);
        activePlayers.forEach(id => {
          G.players[id].hasWonAuction = true;
        });
        if (events && events.endPhase) events.endPhase();
        return;
      }
    }
  } else if (G.board.highestBidder !== currentPlayerId) {
    const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
    const decision = evaluateCpuAuctionBid(G, currentPlayerId);

    if (decision.shouldBid) {
      const nextBid = decision.bidAmount;
      if (G.board.highestBidder !== null && G.players[G.board.highestBidder]) {
        G.players[G.board.highestBidder].outbidCount++;
      }
      G.board.highestBid = nextBid;
      G.board.highestBidder = currentPlayerId;
      G.board.lastActionText = decision.isPriceBump 
        ? `Player ${displayId} bumped the bid to ${nextBid} coins on ${card.name}!`
        : `Player ${displayId} bid ${nextBid} coins on ${card.name}.`;
      addLog(G, G.board.lastActionText);

      // Tyreek Hill custom mechanic
      if (card.id === 'tyreek_hill') {
        applyPsiDeflated(G, currentPlayerId, 1);
        G.board.tyreekHillAlert = {
          playerID: currentPlayerId,
          playerName: currentPlayer.team?.name || `Player ${displayId}`,
          timestamp: Date.now()
        };
        addLog(G, `⚡ Tyreek Hill Speed Tax: CPU Player ${displayId} placed a bid and deflated -1 PSI!`);
      }

      // Jaylen Waddle bonus
      if (card.id === 'jaylen_waddle') {
        applyCoinsGained(G, currentPlayerId, 1);
        G.board.waddleBonusAlert = {
          playerID: currentPlayerId,
          playerName: currentPlayer.team?.name || `Player ${displayId}`
        };
        addLog(G, `Jaylen Waddle Bonus: CPU Player ${displayId} gained +1 coin for placing a bid!`);
      }

      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
      if ((eligibleBidders.length === 1 && eligibleBidders[0] === currentPlayerId) || nextBid >= effMax) {
        resolveAuctionWin(G, currentPlayerId, card);
      }
    } else {
      G.board.passedAuctionPlayers.push(currentPlayerId);
      G.board.lastActionText = `Player ${displayId} passed.`;
      addLog(G, `Player ${displayId} passed on ${card.name}.`);

      const activeBidders = Object.keys(G.players).filter(
        id => !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers.includes(id)
      );
      if (activeBidders.length === 1 && G.board.highestBidder !== null) {
        resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
      } else if (activeBidders.length === 0) {
        if (G.board.highestBidder !== null) {
          resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
        } else {
          resolveAuctionWin(G, currentPlayerId, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
        }
      }
    }
  }

  if (events && events.endTurn) {
    events.endTurn();
  }
};

export const processRivalryStep = (G) => {
  if (!G.board.pendingRivalry) return;
  const { order, step } = G.board.pendingRivalry;
  if (step >= order.length) {
    G.board.pendingRivalry = null;
    return;
  }
  const giverId = order[step];
  const giver = G.players[giverId];
  if (!giver) return;

  if (giver.isCpu) {
    let targetId = null;
    let lowestPsi = Infinity;
    Object.keys(G.players).forEach(id => {
      if (id !== giverId) {
        const opp = G.players[id];
        if (opp && typeof opp.psi === 'number' && opp.psi < lowestPsi) {
          lowestPsi = opp.psi;
          targetId = id;
        }
      }
    });
    if (targetId !== null) {
      giver.psi = Math.max(0, giver.psi - 1);
      applyPsiInflated(G, targetId, 1);
      addLog(G, `Rivalry: CPU Player ${parseInt(giverId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);
    }
    G.board.pendingRivalry.step++;
    if (G.board.pendingRivalry.step < order.length) {
      G.board.pendingRivalry.currentGiverId = order[G.board.pendingRivalry.step];
      processRivalryStep(G);
    } else {
      G.board.pendingRivalry = null;
    }
  } else {
    G.board.pendingRivalry.currentGiverId = giverId;
  }
};

export const resolveBonusAuctionWin = (G, winnerId) => {
  if (!G.board.bonusAuction) return;
  const card = G.board.bonusAuction.card;
  const winner = G.players[winnerId];
  winner.coins -= G.board.bonusAuction.highestBid;
  const displayId = parseInt(winnerId) + 1;
  addLog(G, `Player Demands a Trade: Player ${displayId} (${winner.team ? winner.team.name : 'Team'}) won ${card.name} for ${G.board.bonusAuction.highestBid} coins!`);

  // Apply instant effects
  if (card.effects) {
    const effectiveTeamId = getEffectiveTeamId(winner);
    card.effects.forEach(eff => {
      if (!eff.perRound) {
        let effAmount = eff.amount;
        if (effectiveTeamId === 'bengals') effAmount += 2;
        if (eff.type === 'coins' && effectiveTeamId !== 'browns') applyCoinsGained(G, winnerId, effAmount);
        if (eff.type === 'deflate') applyPsiDeflated(G, winnerId, effAmount);
        if (eff.type === 'inflate') applyPsiInflated(G, winnerId, effAmount);
      }
    });
  }

  const maxLineup = (getEffectiveTeamId(winner) === 'seahawks' ? 4 : 3) + (winner.extraLineupSlots || 0);
  if (getEffectiveTeamId(winner) === 'colts' || winner.lineup.length < maxLineup) {
    winner.lineup.push(card);
  } else {
    if (winner.isCpu) {
      let replaceIdx = 0;
      let worstScore = Infinity;
      winner.lineup.forEach((c, idx) => {
        let score = c.isPracticeSquad ? -5 : (c.effects ? c.effects.reduce((a, e) => a + e.amount, 0) : 0);
        if (score < worstScore) {
          worstScore = score;
          replaceIdx = idx;
        }
      });
      const discarded = winner.lineup[replaceIdx];
      winner.lineup[replaceIdx] = card;
      if (!G.decks.discard) G.decks.discard = [];
      G.decks.discard.push(discarded);
    } else {
      G.pendingReplacement = { playerID: winnerId, wonCard: card };
    }
  }
  G.board.bonusAuction = null;
};

export const resolveBonusAuctionStep = (G) => {
  if (!G.board.bonusAuction) return;
  const numP = Object.keys(G.players).length;
  const card = G.board.bonusAuction.card;
  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);

  Object.keys(G.players).forEach(id => {
    const p = G.players[id];
    if (p.isCpu && !G.board.bonusAuction.passedPlayers.includes(id)) {
      const nextNeeded = G.board.bonusAuction.highestBid + 1;
      const valuation = Math.min(effMax, Math.floor(effMax * (0.6 + Math.random() * 0.3)));
      if (p.coins >= nextNeeded && nextNeeded <= valuation && G.board.bonusAuction.highestBidder !== id) {
        G.board.bonusAuction.highestBid = nextNeeded;
        G.board.bonusAuction.highestBidder = id;
        addLog(G, `Bonus Auction: CPU Player ${parseInt(id) + 1} bid ${nextNeeded} on ${card.name}.`);
        if (nextNeeded >= effMax) {
          resolveBonusAuctionWin(G, id);
          return;
        }
      } else {
        G.board.bonusAuction.passedPlayers.push(id);
      }
    }
  });

  if (!G.board.bonusAuction) return;

  const activeCount = Object.keys(G.players).filter(id => !G.board.bonusAuction.passedPlayers.includes(id)).length;
  if (activeCount <= 1 && G.board.bonusAuction.highestBidder !== null) {
    resolveBonusAuctionWin(G, G.board.bonusAuction.highestBidder);
  } else if (G.board.bonusAuction.passedPlayers.length >= numP) {
    if (G.board.bonusAuction.highestBidder !== null) {
      resolveBonusAuctionWin(G, G.board.bonusAuction.highestBidder);
    } else {
      if (!G.decks.discard) G.decks.discard = [];
      G.decks.discard.push(G.board.bonusAuction.card);
      addLog(G, `Player Demands a Trade: All players passed on ${card.name}.`);
      G.board.bonusAuction = null;
    }
  }
};

export const advanceTitansDraftQueue = (G, events) => {
  if (!G.board.titansDraftQueue) {
    G.board.titansDraftQueue = [];
  }
  while (G.board.titansDraftQueue.length > 0) {
    const currentId = G.board.titansDraftQueue.shift();
    const titansPlayer = G.players[currentId];
    if (!titansPlayer) continue;

    const top3 = [];
    for (let i = 0; i < 3 && G.decks.activePlayers.length > 0; i++) {
      top3.push(G.decks.activePlayers.pop());
    }

    if (titansPlayer.isCpu) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      top3.forEach((card, idx) => {
        let score = 0;
        if (card.effects) {
          card.effects.forEach(e => {
            if (e.type === 'deflate') score += e.amount * 2;
            if (e.type === 'coins') score += e.amount;
          });
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });

      const chosenCard = top3[bestIdx];
      const psIndex = titansPlayer.lineup.findIndex(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
      if (psIndex !== -1) {
        titansPlayer.lineup[psIndex] = chosenCard;
      } else {
        titansPlayer.lineup.push(chosenCard);
      }

      const remaining = top3.filter((_, idx) => idx !== bestIdx);
      G.decks.activePlayers.push(...remaining);
      G.decks.activePlayers.sort(() => Math.random() - 0.5);

      const displayId = parseInt(currentId) + 1;
      const teamName = titansPlayer.team?.name || `Player ${displayId}`;
      addLog(G, `Titans Ability: CPU ${teamName} (Player ${displayId}) drafted ${chosenCard.name} for free! Deck shuffled.`);
    } else {
      G.board.pendingTitansDraft = {
        playerID: currentId,
        cards: top3
      };
      const displayId = parseInt(currentId) + 1;
      const teamName = titansPlayer.team?.name || `Player ${displayId}`;
      addLog(G, `Titans Ability: ${teamName} (Player ${displayId}) is choosing 1 of 3 cards to draft for free.`);
      return;
    }
  }

  G.board.pendingTitansDraft = null;
  G.board.titansDraftComplete = true;
  if (events && events.endPhase) events.endPhase();
};

export const advanceFreeAgencyQueue = (G) => {
  if (!G.board.pendingFreeAgencyQueue) G.board.pendingFreeAgencyQueue = [];
  while (G.board.pendingFreeAgencyQueue.length > 0) {
    const nextPlayerId = G.board.pendingFreeAgencyQueue.shift();
    const card = G.decks.activePlayers.length > 0 ? G.decks.activePlayers.pop() : null;
    if (!card) {
      addLog(G, `Free Agency: Player Deck empty. Player ${parseInt(nextPlayerId) + 1} could not draw.`);
      continue;
    }
    G.board.pendingFreeAgency = {
      playerID: nextPlayerId,
      card
    };
    addLog(G, `Free Agency: Player ${parseInt(nextPlayerId) + 1} drew ${card.name} (${card.position}) and is deciding whether to sign them.`);
    return;
  }
  G.board.pendingFreeAgency = null;
};

export const advanceNewCapLimitQueue = (G) => {
  if (!G.board.pendingNewCapLimitQueue) G.board.pendingNewCapLimitQueue = [];
  if (G.board.pendingNewCapLimitQueue.length > 0) {
    const nextPlayerId = G.board.pendingNewCapLimitQueue.shift();
    G.board.pendingNewCapLimit = {
      active: true,
      playerID: nextPlayerId
    };
    addLog(G, `New Cap Limit: Player ${parseInt(nextPlayerId) + 1} is deciding whether to add a Practice Squad Player.`);
  } else {
    G.board.pendingNewCapLimit = null;
  }
};

export const advancePukaQueue = (G) => {
  if (!G.board.pendingPukaQueue) G.board.pendingPukaQueue = [];
  if (G.board.pendingPukaQueue.length > 0) {
    const next = G.board.pendingPukaQueue.shift();
    G.board.pendingPukaChoice = next;
    G.board.refreshStage = 'pukaChoice';
    addLog(G, `Puka Nacua Ability: Player ${parseInt(next.playerID) + 1} is choosing a teammate's ability to copy.`);
  } else {
    G.board.pendingPukaChoice = null;
    calculateRefreshResults(G);
  }
};

export const calculateRefreshResults = (G) => {
  const ev = G.board.activeEvent;
  const results = [];
  const playerInitialCoins = {};
  const playerInitialPsi = {};

  Object.keys(G.players).forEach(id => {
    playerInitialCoins[id] = G.players[id].coins;
    playerInitialPsi[id] = G.players[id].psi;
  });

  Object.keys(G.players).forEach(id => {
    const p = G.players[id];
    if (!p || !p.team) return;
    const effectiveTeamId = getEffectiveTeamId(p);

    // 1. Calculate lineup coins FIRST (Essential for 49ers check)
    let lineupCoins = 0;
    p.lineup.forEach(card => {
      if (card.broncosRoundAcquired === G.board.round) return;

      // Refs Check (qb_choice): if QB has both coins and deflate, check owner's choice
      if (ev?.category === 'qb_choice' && card.position === 'QB') {
        const hasCoins = card.effects?.some(e => e.type === 'coins');
        const hasDeflate = card.effects?.some(e => e.type === 'deflate');
        if (hasCoins && hasDeflate) {
          const choice = G.board.qbChoices?.[card.uniqueId] || G.board.qbChoices?.[card.id] || (p.isCpu ? (p.psi > 10 ? 'deflate' : 'coins') : 'deflate');
          if (choice === 'deflate') return; // Skip coins
        }
      }

      let coinMult = 1;
      if (ev?.category === 'double_all') coinMult *= 2;
      if (ev?.category === 'double_phase1' && card.phase === 1) coinMult *= 2;
      if (ev?.category === 'double_wr' && card.position === 'WR') coinMult *= 2;
      if (ev?.category === 'double_te' && card.position === 'TE') coinMult *= 2;
      if (effectiveTeamId === 'vikings' && p.psi < 27) coinMult *= 2;
      if (card.ramsDoubleToken) coinMult *= 2;

      const cardEffects = [...(card.effects || [])];
      // Puka Nacua Custom Mechanic: Gains copied recurring effects
      if (card.id === 'puka_nacua' && G.board.pukaCopiedEffects?.[card.uniqueId]) {
        cardEffects.push(...G.board.pukaCopiedEffects[card.uniqueId]);
      }

      cardEffects.forEach(eff => {
        if (eff.perRound && eff.type === 'coins' && effectiveTeamId !== 'browns') {
          lineupCoins += eff.amount * coinMult;
        }
      });
    });

    // 49ers Double Deflation Check:
    // Lineup coins calculate first. If resulting coins < 5, double deflation takes effect.
    const resultingCoins = p.coins + lineupCoins;
    const is49ersDoubleDeflate = (effectiveTeamId === '49ers' && resultingCoins < 5);

    // 2. Calculate lineup deflation
    let lineupDeflate = 0;
    p.lineup.forEach(card => {
      if (card.broncosRoundAcquired === G.board.round) return;

      // Refs Check (qb_choice): if QB has both coins and deflate, check owner's choice
      if (ev?.category === 'qb_choice' && card.position === 'QB') {
        const hasCoins = card.effects?.some(e => e.type === 'coins');
        const hasDeflate = card.effects?.some(e => e.type === 'deflate');
        if (hasCoins && hasDeflate) {
          const choice = G.board.qbChoices?.[card.uniqueId] || G.board.qbChoices?.[card.id] || (p.isCpu ? (p.psi > 10 ? 'deflate' : 'coins') : 'deflate');
          if (choice === 'coins') return; // Skip deflation
        }
      }

      let deflateMult = 1;
      if (ev?.category === 'double_all') deflateMult *= 2;
      if (ev?.category === 'double_phase1' && card.phase === 1) deflateMult *= 2;
      if (is49ersDoubleDeflate) deflateMult *= 2;
      if (card.ramsDoubleToken) deflateMult *= 2;

      const cardEffects = [...(card.effects || [])];
      // Puka Nacua Custom Mechanic: Gains copied recurring effects
      if (card.id === 'puka_nacua' && G.board.pukaCopiedEffects?.[card.uniqueId]) {
        cardEffects.push(...G.board.pukaCopiedEffects[card.uniqueId]);
      }

      cardEffects.forEach(eff => {
        if (eff.perRound) {
          if (eff.type === 'deflate') {
            lineupDeflate += eff.amount * deflateMult;
          } else if (eff.type === 'inflate') {
            applyPsiInflated(G, id, eff.amount);
          }
        }
      });
    });

    // 3. Team-specific Refresh abilities:
    let bonusCoins = 0;
    let bonusDeflate = 0;

    if (effectiveTeamId === 'ravens') {
      const nonPs = p.lineup.filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
      const distinctPos = new Set(nonPs.map(c => c.position).filter(pos => ['QB', 'WR', 'TE', 'RB'].includes(pos)));
      if (distinctPos.size >= 3) {
        bonusCoins += 3;
        addLog(G, `Ravens Ability: Controlled 3 distinct positions (${[...distinctPos].join(', ')}), gained +3 coins.`);
      }
    }

    if (effectiveTeamId === 'packers') {
      const allPhase1 = p.lineup.length > 0 && p.lineup.every(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
      if (allPhase1) {
        bonusDeflate += 4;
        addLog(G, `Packers Ability: All active lineup cards are Phase 1! Deflated -4 PSI.`);
      }
    }

    if (effectiveTeamId === 'browns') {
      lineupCoins = 0;
      if (G.board.round === 5 && !p.hasBrownsBonus) {
        p.coins += 30;
        p.hasBrownsBonus = true;
        addLog(G, `Browns Ability: Reached Round 5! Gained +30 coins.`);
      }
    }

    if (effectiveTeamId === 'cowboys') bonusCoins += 2;
    if (effectiveTeamId === 'panthers') bonusDeflate += 2;

    if (effectiveTeamId === 'texans') {
      const qbCount = p.lineup.filter(c => c.position === 'QB').length;
      if (qbCount > 0) {
        if (effectiveTeamId !== 'browns') bonusCoins += qbCount * 2;
        bonusDeflate += qbCount * 2;
        addLog(G, `Texans Ability: ${qbCount} QB(s) generated deflation and coins.`);
      }
    }

    if (effectiveTeamId === 'chargers' && p.outbidCount > 0) {
      if (effectiveTeamId !== 'browns') bonusCoins += p.outbidCount;
      addLog(G, `Chargers Ability: Outbid ${p.outbidCount} times, gained +${p.outbidCount} bonus coins.`);
    }

    // Apply through full-round capping helpers
    const totalCoinsToAdd = Math.max(0, lineupCoins + bonusCoins);
    const totalDeflateToAdd = Math.max(0, lineupDeflate + bonusDeflate);

    applyCoinsGained(G, id, totalCoinsToAdd);
    applyPsiDeflated(G, id, totalDeflateToAdd);

    // Dolphins 0 coins emergency ability
    if (effectiveTeamId === 'dolphins' && p.coins === 0) {
      p.coins += 3;
      addLog(G, `🐬 Dolphins Ability Triggered: 0 coins triggers +3 emergency coins!`);
      p.dolphinsTriggered = true;
    }
  });

  // 4. Amon-Ra St. Brown Custom Mechanic: Steal 1 coin from each opponent at the end of the Refresh Phase
  Object.keys(G.players).forEach(id => {
    const p = G.players[id];
    if (!p || !p.team) return;
    const effectiveTeamId = getEffectiveTeamId(p);
    const hasAmonRa = p.lineup.some(c => c.id === 'amon_ra_st_brown' && c.broncosRoundAcquired !== G.board.round);
    if (hasAmonRa) {
      let stolenCoins = 0;
      Object.keys(G.players).forEach(oppId => {
        if (oppId !== id) {
          const opp = G.players[oppId];
          const oppTeamId = getEffectiveTeamId(opp);
          if (oppTeamId === 'saints') {
            addLog(G, `Saints Immunity: Player ${parseInt(oppId) + 1} (${opp.team?.name || 'Saints'}) ignored Amon-Ra St. Brown coin steal.`);
          } else if (opp.coins > 0) {
            opp.coins -= 1;
            stolenCoins += 1;
          }
        }
      });
      if (stolenCoins > 0 && effectiveTeamId !== 'browns') {
        applyCoinsGained(G, id, stolenCoins);
        const displayId = parseInt(id) + 1;
        addLog(G, `🦁 Amon-Ra St. Brown Ability: Player ${displayId} stole 1 coin from ${stolenCoins} opponent(s)!`);
      }
    }
  });

  // 5. Build final results summary
  Object.keys(G.players).forEach(id => {
    const p = G.players[id];
    if (!p || !p.team) return;
    const prevCoins = playerInitialCoins[id];
    const prevPsi = playerInitialPsi[id];
    const coinsGained = p.coins - prevCoins;
    const psiDeflated = prevPsi - p.psi;
    const displayId = parseInt(id) + 1;

    results.push({
      id,
      displayId,
      teamName: p.team ? p.team.name : 'Team',
      prevCoins,
      prevPsi,
      coinsGained,
      psiDeflated,
      newCoins: p.coins,
      newPsi: p.psi,
      currentPsi: p.psi,
      currentCoins: p.coins,
      dolphinsTriggered: p.dolphinsTriggered || false
    });

    const psiActionText = psiDeflated >= 0 ? `deflated -${psiDeflated} PSI` : `inflated +${Math.abs(psiDeflated)} PSI`;
    addLog(G, `Refresh: Player ${displayId} (${p.team ? p.team.name : 'Team'}) net coins ${coinsGained >= 0 ? '+' : ''}${coinsGained}, ${psiActionText} (PSI now: ${p.psi}).`);
  });

  G.board.refreshResults = results;
  G.board.refreshStage = 'intro';
  G.board.refreshStepIndex = -1;
  G.board.inRefreshSummary = true;
};

export const DeflategateGame = {
  name: 'deflategate',

  setup: ({ ctx, random }, setupData) => {
    const eventDeck = random.Shuffle([...EVENTS]).slice(0, 10);
    const phase1Deck = random.Shuffle([...PHASE_1_PLAYERS]);
    const phase2Deck = random.Shuffle([...PHASE_2_PLAYERS]);
    const hofDeck = random.Shuffle([...HOF_PLAYERS]);

    const shuffledTeams = random.Shuffle([...TEAMS]);
    const numPlayers = (ctx && ctx.numPlayers) || 4;
    const numHumans = typeof setupData?.numHumans === 'number'
      ? Math.max(1, Math.min(numPlayers, setupData.numHumans))
      : (setupData?.vsCpu === false ? numPlayers : 1);

    const players = {};
    for (let i = 0; i < numPlayers; i++) {
      players[i.toString()] = {
        isCpu: i >= numHumans,
        personality: CPU_ARCHETYPES[i % CPU_ARCHETYPES.length],
        teamChoices: [shuffledTeams.pop(), shuffledTeams.pop(), shuffledTeams.pop()],
        team: null,
        copiedTeam: null,
        psi: 0,
        coins: 0,
        lineup: [],
        hasWonAuction: false,
        outbidCount: 0,
        hasUsedChiefsAbility: false,
        hasUsedBillsAbility: false,
        falconsPhaseUses: { p1: false, p2: false, p3: false },
        eaglesUsedRound: 0,
        eaglesUsedCount: 0,
        ramsTokenAttached: false,
        extraLineupSlots: 0,
        cardsWonThisRound: 0
      };
    }

    return {
      players,
      vsCpu: numHumans < numPlayers,
      numHumans,
      pendingReplacement: null,
      logs: [],
      decks: {
        event: eventDeck,
        activePlayers: phase1Deck,
        phase2: phase2Deck,
        hof: hofDeck,
        discard: []
      },
      board: {
        activeEvent: null,
        eventFlipRevealed: false,
        eventsRevealed: 0,
        auctionPlayers: [],
        activeAuctionCardIndex: null,
        commandersMarkedCardIndex: null,
        currentBidder: null,
        highestBid: 0,
        highestBidder: null,
        passedAuctionPlayers: [],
        firstPlayer: '0',
        nominator: '0',
        round1Nominator: null,
        round: 1,
        roundStats: {},
        firstClaimThisRound: null,
        steelersAlert: null,
        lastActionText: '',
        inRefreshSummary: false,
        refreshResults: [],
        refreshStage: null,
        refreshStepIndex: 0,
        jaguarsAbilityUsed: false,
        jaguarsPopupNotification: null,
        pendingTitansDraft: null,
        titansDraftQueue: [],
        pendingRaiders: null,
        pendingRaidersQueue: [],
        pendingCardinals: null,
        pendingCardinalsQueue: [],
        pendingChiefs: null,
        pendingChiefsQueue: [],
        pendingCommanders: null,
        pendingCommandersQueue: [],
        pendingBills: null,
        pendingBillsQueue: [],
        pendingEagles: null,
        pendingEaglesQueue: [],
        pendingNewCapLimit: null,
        pendingNewCapLimitQueue: [],
        pendingRivalry: null,
        pendingTradeRumors: null,
        tradeRumorsSummary: null,
        bonusAuction: null,
        pendingFreeAgency: null,
        pendingFreeAgencyQueue: [],
        qbChoices: {},
        legendNotification: null,
        eventNotification: null,
        steelersAlert: null,
        waddleBonusAlert: null,
        pachecoSwapAlert: null,
        bucsCopyComplete: false,
        titansDraftComplete: false,
        eventConfirmed: false,
        preAuctionComplete: false,
        postAuctionComplete: false,
        refreshConfirmed: false,
        phase2Shuffled: false,
        hofShuffled: false,
        pendingPukaChoice: null,
        pendingPukaQueue: [],
        pukaCopiedEffects: {},
        cardWonFlyAnimation: null,
        tyreekHillAlert: null
      }
    };
  },

  moves: {
    setVsCpu: ({ G }, value) => {
      G.vsCpu = value;
    },
    setNumHumans: ({ G }, count) => {
      if (typeof count !== 'number' || count < 1) return;
      const numPlayers = Object.keys(G.players).length;
      G.numHumans = Math.min(numPlayers, count);
      G.vsCpu = G.numHumans < numPlayers;
      Object.keys(G.players).forEach(id => {
        G.players[id].isCpu = parseInt(id) >= G.numHumans;
      });
    },
    selectTeam: ({ G, playerID, events }, teamIndex, actingPlayerId) => {
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      if (!p || p.team) return INVALID_MOVE;

      const chosenTeam = p.teamChoices[teamIndex];
      if (!chosenTeam) return INVALID_MOVE;

      p.team = chosenTeam;
      p.psi = chosenTeam.initialPsi;
      p.coins = chosenTeam.coins;

      const psCount = chosenTeam.id === 'seahawks' ? 4 : 3;
      for (let i = 0; i < psCount; i++) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_${i}` });
      }

      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Player ${displayId} selected team ${chosenTeam.name} (Coins: ${chosenTeam.coins}, PSI: ${chosenTeam.initialPsi}).`);

      // Auto-assign teams to CPU opponents in vsCpu mode
      Object.keys(G.players).forEach(id => {
        const cpu = G.players[id];
        if (cpu && cpu.isCpu && !cpu.team) {
          if (!cpu.personality) cpu.personality = CPU_ARCHETYPES[parseInt(id) % CPU_ARCHETYPES.length];
          cpu.team = cpu.teamChoices[0];
          cpu.psi = cpu.team.initialPsi;
          cpu.coins = cpu.team.coins;
          const cpuPsCount = cpu.team.id === 'seahawks' ? 4 : 3;
          for (let i = 0; i < cpuPsCount; i++) {
            cpu.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${id}_${i}` });
          }
          const cpuDisplayId = parseInt(id) + 1;
          addLog(G, `CPU Player ${cpuDisplayId} selected team ${cpu.team.name}.`);
        }
      });

      const allSelected = Object.values(G.players).every(pl => pl.team !== null);
      if (allSelected && events && events.endPhase) {
        events.endPhase();
      }
    },
    copyAbility: ({ G, playerID, events }, targetTeamId, actingPlayerId) => {
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
      const targetTeam = TEAMS.find(t => t.id === targetTeamId);
      if (!targetTeam) return INVALID_MOVE;

      p.copiedTeam = targetTeam;
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability!`);
      G.board.bucsCopyComplete = true;
      if (events && events.endPhase) events.endPhase();
    },
    replaceLineupCard: ({ G, playerID, events }, discardIndex, actingPlayerId) => {
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
        return INVALID_MOVE;
      }
      const p = G.players[targetPlayerId];
      if (!p || discardIndex < 0 || discardIndex >= p.lineup.length) return INVALID_MOVE;

      const discarded = p.lineup[discardIndex];
      const newCard = G.pendingReplacement.wonCard;
      p.lineup[discardIndex] = newCard;

      if (!G.decks.discard) G.decks.discard = [];
      G.decks.discard.push(discarded);

      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Player ${displayId} replaced ${discarded.name} with ${newCard.name}.`);
      G.pendingReplacement = null;

      if (G.board.postAuctionComplete === false && !G.board.pendingBills && !G.board.pendingEagles) {
        G.board.postAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    discardWonCard: ({ G, playerID, events }, actingPlayerId) => {
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
        return INVALID_MOVE;
      }
      if (getEffectiveTeamId(G.players[targetPlayerId]) !== 'bengals') {
        return INVALID_MOVE;
      }
      const wonCard = G.pendingReplacement.wonCard;
      if (!G.decks.discard) G.decks.discard = [];
      G.decks.discard.push(wonCard);
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Player ${displayId} chose to discard acquired card ${wonCard.name}.`);
      G.pendingReplacement = null;

      if (G.board.postAuctionComplete === false && !G.board.pendingBills && !G.board.pendingEagles) {
        G.board.postAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    reorderEventDeck: ({ G, playerID }, newDeckOrder) => {
      const p = G.players[playerID];
      if (!p || !p.team) return INVALID_MOVE;
      const effectiveTeamId = getEffectiveTeamId(p);
      if (effectiveTeamId !== 'jaguars') return INVALID_MOVE;
      if (G.board.jaguarsAbilityUsed) return INVALID_MOVE;

      G.decks.event = newDeckOrder;
      G.board.jaguarsAbilityUsed = true;
      const displayId = parseInt(playerID) + 1;
      G.board.jaguarsPopupNotification = `🐆 Jaguars Ability Used! Player ${displayId} (${p.team.name}) has secretly reordered the Event Deck!`;
      addLog(G, G.board.jaguarsPopupNotification);
    },
    dismissJaguarsPopup: ({ G }) => {
      G.board.jaguarsPopupNotification = null;
    },
    ramsApplyDoubleToken: ({ G, playerID }, cardUniqueId, actingPlayerId) => {
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      if (!p || p.ramsTokenAttached) return INVALID_MOVE;
      const effectiveTeamId = getEffectiveTeamId(p);
      if (effectiveTeamId !== 'rams') return INVALID_MOVE;

      const targetCard = p.lineup.find(c => c.uniqueId === cardUniqueId);
      if (!targetCard || targetCard.phase === 1 || targetCard.isPracticeSquad || targetCard.uniqueId?.startsWith('ps_')) {
        return INVALID_MOVE;
      }

      targetCard.ramsDoubleToken = true;
      p.ramsTokenAttached = true;
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `🐏 Rams Ability: Player ${displayId} attached 2x Token to ${targetCard.name}!`);
    },
    commandersMarkCard: ({ G, playerID, events }, auctionCardIndex, actingPlayerId) => {
      if (!G.board.pendingCommanders) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (String(G.board.pendingCommanders.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
      if (auctionCardIndex < 0 || auctionCardIndex >= G.board.auctionPlayers.length) return INVALID_MOVE;
      const card = G.board.auctionPlayers[auctionCardIndex];
      if (!card) return INVALID_MOVE;

      G.board.commandersMarkedCardIndex = auctionCardIndex;
      const displayId = parseInt(targetPlayerId) + 1;
      const firstDisplayId = parseInt(G.board.firstPlayer) + 1;
      addLog(G, `🎖️ Commanders Ability: Player ${displayId} marked ${card.name}. First Player (Player ${firstDisplayId}) cannot nominate or bid on this player!`);

      if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0) {
        G.board.pendingCommanders = G.board.pendingCommandersQueue.shift();
      } else {
        G.board.pendingCommanders = null;
      }

      if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
        G.board.preAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    buyPracticeSquad: ({ G, playerID, events }, actingPlayerId) => {
      if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
        return INVALID_MOVE;
      }
      const p = G.players[targetPlayerId];
      if (!p || p.coins < 10) return INVALID_MOVE;

      p.coins -= 10;
      p.extraLineupSlots = (p.extraLineupSlots || 0) + 1;
      p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_cap_${targetPlayerId}_${Date.now()}` });
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `New Cap Limit: Player ${displayId} paid 10 coins to add an extra Practice Squad Player (+1 Lineup Slot)!`);
      advanceNewCapLimitQueue(G);
      if (!G.board.pendingNewCapLimit && G.board.eventConfirmed && events && events.endPhase) {
        events.endPhase();
      }
    },
    passPracticeSquad: ({ G, playerID, events }, actingPlayerId) => {
      if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
        return INVALID_MOVE;
      }
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `New Cap Limit: Player ${displayId} passed.`);
      advanceNewCapLimitQueue(G);
      if (!G.board.pendingNewCapLimit && G.board.eventConfirmed && events && events.endPhase) {
        events.endPhase();
      }
    },
    rivalryGivePsi: ({ G, playerID }, targetPlayerId, actingPlayerId) => {
      if (!G.board.pendingRivalry) return INVALID_MOVE;
      const { order, step } = G.board.pendingRivalry;
      if (step >= order.length) {
        G.board.pendingRivalry = null;
        return;
      }
      const giverId = order[step];
      const callerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (callerId && String(callerId) !== String(giverId)) return INVALID_MOVE;

      const targetId = String(targetPlayerId);
      if (targetId === giverId) return INVALID_MOVE;

      const giver = G.players[giverId];
      const target = G.players[targetId];
      if (!giver || !target) return INVALID_MOVE;

      giver.psi = Math.max(0, giver.psi - 1);
      applyPsiInflated(G, targetId, 1);
      addLog(G, `Rivalry: Player ${parseInt(giverId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);

      G.board.pendingRivalry.step++;
      if (G.board.pendingRivalry.step < order.length) {
        G.board.pendingRivalry.currentGiverId = order[G.board.pendingRivalry.step];
        processRivalryStep(G);
      } else {
        G.board.pendingRivalry = null;
      }
    },
    tradeRumorsPickCard: ({ G, playerID }, cardIndex, actingPlayerId) => {
      if (!G.board.pendingTradeRumors) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      const human = G.players[targetPlayerId];
      if (!human || cardIndex < 0 || cardIndex >= human.lineup.length) return INVALID_MOVE;

      if (!G.board.pendingTradeRumors.picks) G.board.pendingTradeRumors.picks = {};
      G.board.pendingTradeRumors.picks[targetPlayerId] = cardIndex;

      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Trade Rumors: Player ${displayId} selected a player card to pass.`);

      const numP = Object.keys(G.players).length;
      const allPicked = Object.keys(G.players).every(id => G.board.pendingTradeRumors.picks[id] !== undefined);

      if (allPicked) {
        const passedCards = {};
        Object.keys(G.players).forEach(id => {
          const pl = G.players[id];
          const pickIdx = G.board.pendingTradeRumors.picks[id];
          passedCards[id] = pl.lineup[pickIdx] || pl.lineup[0];
        });

        const summaries = [];
        Object.keys(G.players).forEach(id => {
          const idx = parseInt(id);
          const giverId = ((idx - 1 + numP) % numP).toString();
          const receivedCard = passedCards[giverId];
          const givenCard = passedCards[id];

          const pl = G.players[id];
          const cardLoc = pl.lineup.findIndex(c => c.uniqueId === givenCard.uniqueId);
          if (cardLoc !== -1) {
            pl.lineup[cardLoc] = receivedCard;
          } else {
            pl.lineup.push(receivedCard);
          }
          summaries.push(`Player ${parseInt(giverId) + 1} passed ${receivedCard.name} to Player ${idx + 1}`);
        });

        addLog(G, `Trade Rumors Complete: ${summaries.join('; ')}.`);
        G.board.tradeRumorsSummary = summaries;
        G.board.pendingTradeRumors = null;
      }
    },
    bonusAuctionBid: ({ G, playerID }, bidAmount, actingPlayerId) => {
      if (!G.board.bonusAuction || !G.board.bonusAuction.active) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      const card = G.board.bonusAuction.card;
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);

      if (bidAmount < G.board.bonusAuction.highestBid + 1 || bidAmount > p.coins || bidAmount > effMax) {
        return INVALID_MOVE;
      }

      G.board.bonusAuction.highestBid = bidAmount;
      G.board.bonusAuction.highestBidder = targetPlayerId;
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Player Demands a Trade: Player ${displayId} bid ${bidAmount} coins on ${card.name}.`);

      if (bidAmount >= effMax) {
        resolveBonusAuctionWin(G, targetPlayerId);
      } else {
        resolveBonusAuctionStep(G);
      }
    },
    bonusAuctionPass: ({ G, playerID }, actingPlayerId) => {
      if (!G.board.bonusAuction || !G.board.bonusAuction.active) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (!G.board.bonusAuction.passedPlayers.includes(targetPlayerId)) {
        G.board.bonusAuction.passedPlayers.push(targetPlayerId);
      }
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Player Demands a Trade: Player ${displayId} passed.`);
      resolveBonusAuctionStep(G);
    },
    freeAgencySign: ({ G, playerID, events }, replaceIndex, actingPlayerId) => {
      if (!G.board.pendingFreeAgency || !G.board.pendingFreeAgency.card) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingFreeAgency.playerID && String(targetPlayerId) !== String(G.board.pendingFreeAgency.playerID)) {
        return INVALID_MOVE;
      }
      const p = G.players[targetPlayerId];
      const card = G.board.pendingFreeAgency.card;
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      if (p.coins < effMax) return INVALID_MOVE;

      p.coins -= effMax;
      const displayId = parseInt(targetPlayerId) + 1;
      if (replaceIndex >= 0 && replaceIndex < p.lineup.length) {
        const discarded = p.lineup[replaceIndex];
        p.lineup[replaceIndex] = card;
        if (!G.decks.discard) G.decks.discard = [];
        G.decks.discard.push(discarded);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
      } else {
        p.lineup.push(card);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
      }
      advanceFreeAgencyQueue(G);
      if (!G.board.pendingFreeAgency && G.board.eventConfirmed && events && events.endPhase) {
        events.endPhase();
      }
    },
    freeAgencyPass: ({ G, playerID, events }, actingPlayerId) => {
      if (!G.board.pendingFreeAgency) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingFreeAgency.playerID && String(targetPlayerId) !== String(G.board.pendingFreeAgency.playerID)) {
        return INVALID_MOVE;
      }
      if (G.board.pendingFreeAgency.card) {
        if (!G.decks.discard) G.decks.discard = [];
        G.decks.discard.push(G.board.pendingFreeAgency.card);
      }
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Free Agency: Player ${displayId} passed.`);
      advanceFreeAgencyQueue(G);
      if (!G.board.pendingFreeAgency && G.board.eventConfirmed && events && events.endPhase) {
        events.endPhase();
      }
    },
    setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
      if (!G.board.qbChoices) G.board.qbChoices = {};
      G.board.qbChoices[cardUniqueId] = choice; // 'coins' | 'deflate'
      const displayId = parseInt(playerID) + 1;
      addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
    },
    startRefreshSequence: ({ G }) => {
      G.board.refreshStage = 'animating';
      G.board.refreshStepIndex = 0;
    },
    advanceRefreshStep: ({ G }) => {
      G.board.refreshStepIndex++;
      if (G.board.refreshResults && G.board.refreshStepIndex >= G.board.refreshResults.length) {
        G.board.refreshStage = 'complete';
      }
    },
    confirmEventReveal: ({ G, events }) => {
      G.board.eventFlipRevealed = false;
      G.board.eventConfirmed = true;
      if (events && events.endPhase) events.endPhase();
    },
    confirmRefreshSummary: ({ G, events }) => {
      // Remove Broncos roundAcquired state so the card's recurring effects trigger next round
      Object.values(G.players).forEach(p => {
        p.lineup?.forEach(card => {
          if (card.broncosRoundAcquired) {
            delete card.broncosRoundAcquired;
          }
        });
        if (p.practiceSquad && p.practiceSquad.broncosRoundAcquired) {
          delete p.practiceSquad.broncosRoundAcquired;
        }
      });

      G.board.inRefreshSummary = false;
      G.board.refreshStage = null;
      G.board.refreshResults = [];
      G.board.refreshConfirmed = true;
      G.board.round++;
      G.board.tradeRumorsSummary = null;
      G.board.legendNotification = null;
      G.board.eventNotification = null;

      // Reset all round flags so the next round's phases do not immediately trigger their endIf conditions
      G.board.eventConfirmed = false;
      G.board.preAuctionComplete = false;
      G.board.postAuctionComplete = false;
      G.board.activeAuctionCardIndex = null;
      G.board.highestBid = 0;
      G.board.highestBidder = null;
      G.board.passedAuctionPlayers = [];
      G.board.currentAuction = null;
      G.pendingReplacement = null;

      Object.values(G.players).forEach(p => {
        p.hasWonAuction = false;
        p.cardsWonThisRound = 0;
        p.outbidCount = 0;
      });

      if (events && events.endPhase) events.endPhase();
    },
    dismissTradeRumorsSummary: ({ G, events }) => {
      G.board.tradeRumorsSummary = null;
      if (G.board.eventConfirmed && events && events.endPhase) {
        events.endPhase();
      }
    },
    eaglesUseAbility: ({ G, playerID, events }, times) => {
      if (!G.board.pendingEagles) return INVALID_MOVE;
      const eaglesId = String(G.board.pendingEagles.playerID);
      const eaglesPlayer = G.players[eaglesId];
      const count = times === 2 ? 2 : 1;
      const cost = count * 3;
      if (eaglesPlayer.coins < cost) return INVALID_MOVE;

      eaglesPlayer.coins -= cost;
      eaglesPlayer.eaglesUsedRound = G.board.round;
      eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + count;

      Object.keys(G.players).forEach(id => {
        if (id !== eaglesId) applyPsiInflated(G, id, count * 3);
      });

      const displayId = parseInt(eaglesId) + 1;
      addLog(G, `🦅 Eagles Ability: Player ${displayId} paid ${cost} coins to inflate all opponents by +${count * 3} PSI! (${count}x this round).`);

      if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
        G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
      } else {
        G.board.pendingEagles = null;
      }

      if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
        G.board.postAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    eaglesInflate: ({ G, playerID, events }) => {
      if (!G.board.pendingEagles) return INVALID_MOVE;
      const eaglesId = String(G.board.pendingEagles.playerID);
      const eaglesPlayer = G.players[eaglesId];
      if (eaglesPlayer.coins < 3) return INVALID_MOVE;

      eaglesPlayer.coins -= 3;
      eaglesPlayer.eaglesUsedRound = G.board.round;
      eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + 1;

      Object.keys(G.players).forEach(id => {
        if (id !== eaglesId) applyPsiInflated(G, id, 3);
      });

      const displayId = parseInt(eaglesId) + 1;
      addLog(G, `🦅 Eagles Ability: Player ${displayId} paid 3 coins to inflate all opponents by +3 PSI!`);

      if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
        G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
      } else {
        G.board.pendingEagles = null;
      }

      if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
        G.board.postAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    eaglesPass: ({ G, events }) => {
      if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
        G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
      } else {
        G.board.pendingEagles = null;
      }
      if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
        G.board.postAuctionComplete = true;
        if (events && events.endPhase) events.endPhase();
      }
    },
    dismissLegendNotification: ({ G }) => {
      G.board.legendNotification = null;
    },
    dismissEventNotification: ({ G }) => {
      G.board.eventNotification = null;
    },
    setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
      if (!G.board.qbChoices) G.board.qbChoices = {};
      G.board.qbChoices[cardUniqueId] = choice;
      const displayId = parseInt(playerID) + 1;
      addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
    },
    dismissCardWonFlyAnimation: ({ G }) => {
      G.board.cardWonFlyAnimation = null;
    },
    dismissTyreekHillAlert: ({ G }) => {
      G.board.tyreekHillAlert = null;
    },
    pukaChooseTeammate: ({ G, playerID }, teammateUniqueId, actingPlayerId) => {
      if (!G.board.pendingPukaChoice) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (String(targetPlayerId) !== String(G.board.pendingPukaChoice.playerID)) return INVALID_MOVE;

      const p = G.players[targetPlayerId];
      const chosenTeammate = p.lineup.find(c => c.uniqueId === teammateUniqueId);
      if (!chosenTeammate) return INVALID_MOVE;

      if (!G.board.pukaCopiedEffects) G.board.pukaCopiedEffects = {};
      G.board.pukaCopiedEffects[G.board.pendingPukaChoice.pukaUniqueId] = (chosenTeammate.effects || []).filter(e => e.perRound);

      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `Puka Nacua Ability: Player ${displayId} copied ${chosenTeammate.name}'s recurring effects!`);
      advancePukaQueue(G);
    },
    stepCpuTurn: ({ G, ctx, events }) => {
      executeCpuMoveInternal(G, ctx, events);
    },
    skipToHumanTurn: ({ G, ctx, events }, humanPlayerId = '0') => {
      let steps = 0;
      // Continue stepping CPU moves until reaching any human player's turn or replacement modal
      while (G.players[ctx.currentPlayer]?.isCpu && steps < 30 && !G.pendingReplacement) {
        executeCpuMoveInternal(G, ctx, events);
        steps++;
      }
    }
  },

  phases: {
    teamSelection: {
      start: true,
      turn: { activePlayers: ActivePlayers.ALL },
      moves: {
        setNumHumans: ({ G }, count) => {
          if (typeof count !== 'number' || count < 1) return;
          const numPlayers = Object.keys(G.players).length;
          G.numHumans = Math.min(numPlayers, count);
          G.vsCpu = G.numHumans < numPlayers;
          Object.keys(G.players).forEach(id => {
            G.players[id].isCpu = parseInt(id) >= G.numHumans;
          });
        },
        selectTeam: ({ G, playerID, events }, teamIndex, actingPlayerId) => {
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          if (!p || p.team) return INVALID_MOVE;

          let chosenTeam;
          if (typeof teamIndex === 'number') {
            chosenTeam = p.teamChoices[teamIndex];
          } else if (typeof teamIndex === 'string') {
            chosenTeam = p.teamChoices.find(t => t.id === teamIndex) || p.teamChoices[0];
          } else {
            chosenTeam = p.teamChoices[0];
          }
          if (!chosenTeam) return INVALID_MOVE;

          p.team = chosenTeam;
          p.isCpu = false;
          p.psi = chosenTeam.initialPsi;
          p.coins = chosenTeam.coins;

          const psCount = chosenTeam.id === 'seahawks' ? 4 : 3;
          for (let i = 0; i < psCount; i++) {
            p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_${i}` });
          }

          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player ${displayId} selected team ${chosenTeam.name} (Coins: ${chosenTeam.coins}, PSI: ${chosenTeam.initialPsi}).`);

          // Auto-assign teams to CPU opponents only after all human players have selected
          const allHumansSelected = Object.values(G.players).filter(pl => !pl.isCpu).every(pl => pl.team !== null);
          if (allHumansSelected) {
            Object.keys(G.players).forEach(id => {
              const cpu = G.players[id];
              if (cpu && cpu.isCpu && !cpu.team) {
                if (!cpu.personality) cpu.personality = CPU_ARCHETYPES[parseInt(id) % CPU_ARCHETYPES.length];
                cpu.team = cpu.teamChoices[0];
                cpu.psi = cpu.team.initialPsi;
                cpu.coins = cpu.team.coins;
                const cpuPsCount = cpu.team.id === 'seahawks' ? 4 : 3;
                for (let i = 0; i < cpuPsCount; i++) {
                  cpu.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${id}_${i}` });
                }
                const cpuDisplayId = parseInt(id) + 1;
                addLog(G, `CPU Player ${cpuDisplayId} selected team ${cpu.team.name}.`);
              }
            });
          }

          const allSelected = Object.values(G.players).every(pl => pl.team !== null);
          if (allSelected && events && events.endPhase) {
            events.endPhase();
          }
        }
      },
      endIf: ({ G }) => Object.values(G.players).every(p => p.team !== null),
      next: 'buccaneersCopy'
    },

    buccaneersCopy: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, events }) => {
        G.board.bucsCopyComplete = false;
        const bucsPlayerId = Object.keys(G.players).find(id => G.players[id].team && G.players[id].team.id === 'buccaneers');
        if (!bucsPlayerId) {
          G.board.bucsCopyComplete = true;
          if (events && events.endPhase) events.endPhase();
          return;
        }

        const bucsPlayer = G.players[bucsPlayerId];
        const otherDrafted = Object.values(G.players).filter(p => p.team && p.team.id !== 'buccaneers').map(p => p.team);

        if (bucsPlayer.isCpu) {
          const chosenTeam = otherDrafted[Math.floor(Math.random() * otherDrafted.length)] || TEAMS[0];
          bucsPlayer.copiedTeam = chosenTeam;
          addLog(G, `Buccaneers (CPU Player ${parseInt(bucsPlayerId) + 1}) copied ${chosenTeam.name}'s ability.`);
          G.board.bucsCopyComplete = true;
          if (events && events.endPhase) events.endPhase();
        }
      },
      moves: {
        copyAbility: ({ G, playerID, events }, targetTeamId, actingPlayerId) => {
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
          const targetTeam = TEAMS.find(t => t.id === targetTeamId);
          if (!targetTeam) return INVALID_MOVE;

          p.copiedTeam = targetTeam;
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability!`);
          G.board.bucsCopyComplete = true;
          if (events && events.endPhase) events.endPhase();
        }
      },
      endIf: ({ G }) => G.board.bucsCopyComplete === true,
      next: 'titansDraft'
    },

    titansDraft: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, events }) => {
        G.board.titansDraftComplete = false;
        G.board.titansDraftQueue = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'titans');
        advanceTitansDraftQueue(G, events);
      },
      moves: {
        titansPickCard: ({ G, playerID, events }, cardIndex, actingPlayerId) => {
          if (!G.board.pendingTitansDraft) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(G.board.pendingTitansDraft.playerID) !== String(targetPlayerId)) return INVALID_MOVE;

          const cards = G.board.pendingTitansDraft.cards;
          if (cardIndex < 0 || cardIndex >= cards.length) return INVALID_MOVE;

          const chosenCard = cards[cardIndex];
          const p = G.players[targetPlayerId];
          const psIndex = p.lineup.findIndex(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
          if (psIndex !== -1) {
            p.lineup[psIndex] = chosenCard;
          } else {
            p.lineup.push(chosenCard);
          }

          const remaining = cards.filter((_, idx) => idx !== cardIndex);
          G.decks.activePlayers.push(...remaining);
          G.decks.activePlayers.sort(() => Math.random() - 0.5);

          const displayId = parseInt(targetPlayerId) + 1;
          const teamName = p.team?.name || `Player ${displayId}`;
          addLog(G, `Titans Ability: ${teamName} (Player ${displayId}) drafted ${chosenCard.name} for free! Deck shuffled.`);
          G.board.pendingTitansDraft = null;

          advanceTitansDraftQueue(G, events);
        }
      },
      endIf: ({ G }) => G.board.titansDraftComplete === true,
      next: 'eventPhase'
    },

    eventPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, ctx, random }) => {
        G.board.eventConfirmed = false;
        G.board.refreshConfirmed = false;
        G.board.pendingRivalry = null;
        G.board.pendingTradeRumors = null;
        G.board.tradeRumorsSummary = null;
        G.board.bonusAuction = null;
        G.board.pendingFreeAgency = null;
        G.board.pendingNewCapLimit = null;
        G.board.legendNotification = null;
        G.board.eventNotification = null;
        G.board.roundStats = {};
        Object.keys(G.players).forEach(id => {
          G.board.roundStats[id] = { coinsGained: 0, psiDeflated: 0 };
        });
        G.board.firstClaimThisRound = null;
        G.board.steelersAlert = null;

        // Ensure Broncos first-round ignore state is cleared for all players as new round begins
        Object.values(G.players).forEach(p => {
          p.lineup?.forEach(card => {
            if (card.broncosRoundAcquired && card.broncosRoundAcquired < G.board.round) {
              delete card.broncosRoundAcquired;
            }
          });
          if (p.practiceSquad?.broncosRoundAcquired && p.practiceSquad.broncosRoundAcquired < G.board.round) {
            delete p.practiceSquad.broncosRoundAcquired;
          }
        });

        // Steelers Check before Event Phase (Even Round 1)
        const steelersTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'steelers');
        steelersTeams.forEach(steelersId => {
          const steelersPlayer = G.players[steelersId];
          const steelersCoins = steelersPlayer.coins;
          const isStrictlyRichest = Object.keys(G.players).every(id => id === steelersId || G.players[id].coins < steelersCoins);

          if (isStrictlyRichest) {
            let givenCount = 0;
            Object.keys(G.players).forEach(id => {
              if (id !== steelersId) {
                const opp = G.players[id];
                const oppTeamId = getEffectiveTeamId(opp);
                if (oppTeamId !== 'saints') {
                  opp.psi += 1;
                  givenCount++;
                } else {
                  addLog(G, `Saints Immunity: Player ${parseInt(id) + 1} ignored +1 PSI from Steelers.`);
                }
              }
            });
            steelersPlayer.psi = Math.max(0, steelersPlayer.psi - givenCount);
            const teamName = steelersPlayer.team?.name || `Player ${parseInt(steelersId) + 1}`;
            G.board.steelersAlert = `⚡ Steelers Ability: Strictly richest! Transferred 1 PSI to opponents (${teamName} PSI -${givenCount}).`;
            addLog(G, G.board.steelersAlert);
          }
        });

        // CPU Jaguars check: Reorder deck once per game BEFORE the upcoming round's event is drawn
        const jaguarsPlayerId = Object.keys(G.players).find(id => getEffectiveTeamId(G.players[id]) === 'jaguars');
        if (jaguarsPlayerId && G.players[jaguarsPlayerId].isCpu && !G.board.jaguarsAbilityUsed && G.board.round >= 3) {
          const sortedDeck = [...G.decks.event].sort((a, b) => {
            if (a.category.includes('double') || a.category.includes('deflate')) return -1;
            return 1;
          });
          G.decks.event = sortedDeck;
          G.board.jaguarsAbilityUsed = true;
          G.board.jaguarsPopupNotification = `🐆 Jaguars Ability Used! CPU Player ${parseInt(jaguarsPlayerId) + 1} (${G.players[jaguarsPlayerId].team.name}) has secretly reordered the Event Deck!`;
          addLog(G, G.board.jaguarsPopupNotification);
        }

        // Deck progression shuffles at the start of new eras
        if (G.board.round >= 4 && !G.board.phase2Shuffled) {
          G.board.phase2Shuffled = true;
          const shuffleFn = (random && random.Shuffle) ? random.Shuffle : (arr) => [...arr].sort(() => Math.random() - 0.5);
          G.decks.activePlayers = shuffleFn([...G.decks.activePlayers, ...G.decks.phase2]);
          addLog(G, `🏈 Phase 2 players shuffled into the player deck at Round 4!`);
        }
        if (G.board.round >= 7 && !G.board.hofShuffled) {
          G.board.hofShuffled = true;
          const shuffleFn = (random && random.Shuffle) ? random.Shuffle : (arr) => [...arr].sort(() => Math.random() - 0.5);
          G.decks.activePlayers = shuffleFn([...G.decks.activePlayers, ...G.decks.hof]);
          addLog(G, `⭐ Hall of Fame legends shuffled into the player deck at Round 7!`);
        }

        // Reveal Event (with safety if deck runs low) - draws from top of deck (index 0)
        let ev = G.decks.event.shift();
        if (!ev) {
          G.decks.event = [...EVENTS].sort(() => Math.random() - 0.5);
          ev = G.decks.event.shift();
        }
        G.board.activeEvent = ev;
        G.board.eventFlipRevealed = true;
        G.board.eventsRevealed++;

        addLog(G, `Round ${G.board.round} Event Revealed: ${ev.name} — ${ev.effect}`);

        if (ev.category === 'instant_inflate') {
          Object.keys(G.players).forEach(id => applyPsiInflated(G, id, ev.amount || 7));
          G.board.eventNotification = `🔥 Hot Air: All eligible players inflated by +${ev.amount || 7} PSI!`;
          addLog(G, G.board.eventNotification);
        } else if (ev.category === 'instant_deflate') {
          Object.keys(G.players).forEach(id => applyPsiDeflated(G, id, ev.amount || 7));
          G.board.eventNotification = `❄️ Cold Air: All players deflated by -${ev.amount || 7} PSI!`;
          addLog(G, G.board.eventNotification);
        } else if (ev.category === 'match_second_psi') {
          const sorted = Object.values(G.players).sort((a, b) => b.psi - a.psi);
          if (sorted.length >= 2) {
            const highest = sorted[0];
            const secondHighest = sorted[1];
            if (highest.psi === secondHighest.psi) {
              G.board.eventNotification = `1st Overall Pick: Tie for highest PSI (${highest.psi}). No deflation occurred.`;
            } else {
              const diff = highest.psi - secondHighest.psi;
              highest.psi = secondHighest.psi;
              G.board.eventNotification = `1st Overall Pick: ${highest.team?.name || 'Player'} deflated by -${diff} PSI to match 2nd highest (${secondHighest.psi}).`;
            }
            addLog(G, G.board.eventNotification);
          }
        } else if (ev.category === 'legend_returns') {
          let chosenCard;
          if (G.board.round <= 6 && PHASE_2_PLAYERS.length > 0) {
            chosenCard = { ...PHASE_2_PLAYERS[Math.floor(Math.random() * PHASE_2_PLAYERS.length)], uniqueId: `p2_leg_${Date.now()}` };
          } else if (HOF_PLAYERS.length > 0) {
            chosenCard = { ...HOF_PLAYERS[Math.floor(Math.random() * HOF_PLAYERS.length)], uniqueId: `hof_leg_${Date.now()}` };
          }
          if (chosenCard) {
            G.decks.activePlayers.push(chosenCard);
            G.board.legendNotification = `⭐ Team Legend Returns! ${chosenCard.name} (${chosenCard.phase === 'hof' ? 'Hall of Fame' : 'Phase 2'}) was placed on top of the Player Deck!`;
            addLog(G, G.board.legendNotification);
          }
        } else if (ev.category === 'buy_practice_squad') {
          Object.keys(G.players).forEach(id => {
            const p = G.players[id];
            if (p.isCpu) {
              if (p.coins >= 14) {
                p.coins -= 10;
                p.extraLineupSlots = (p.extraLineupSlots || 0) + 1;
                p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_cap_${id}_${Date.now()}_${Math.random()}` });
                addLog(G, `New Cap Limit: CPU Player ${parseInt(id) + 1} (${p.team?.name}) paid 10 coins to add a Practice Squad Player!`);
              } else {
                addLog(G, `New Cap Limit: CPU Player ${parseInt(id) + 1} passed.`);
              }
            }
          });
          const humanIds = Object.keys(G.players).filter(id => !G.players[id].isCpu);
          G.board.pendingNewCapLimitQueue = [...humanIds];
          advanceNewCapLimitQueue(G);
        } else if (ev.category === 'give_psi') {
          const numP = Object.keys(G.players).length;
          const startP = parseInt(G.board.firstPlayer || '0');
          const order = [];
          for (let i = 0; i < numP; i++) {
            order.push(((startP + i) % numP).toString());
          }
          G.board.pendingRivalry = {
            order,
            step: 0,
            currentGiverId: order[0]
          };
          processRivalryStep(G);
        } else if (ev.category === 'pass_right') {
          G.board.pendingTradeRumors = {
            picks: {}
          };
          Object.keys(G.players).forEach(id => {
            const p = G.players[id];
            if (p.isCpu && p.lineup.length > 0) {
              let bestIdx = 0;
              let lowestScore = Infinity;
              p.lineup.forEach((c, idx) => {
                let score = 0;
                if (c.isPracticeSquad) score = -10;
                else if (c.effects) {
                  c.effects.forEach(e => score += (e.type === 'deflate' ? e.amount * 2 : e.amount));
                }
                if (score < lowestScore) {
                  lowestScore = score;
                  bestIdx = idx;
                }
              });
              G.board.pendingTradeRumors.picks[id] = bestIdx;
            }
          });
        } else if (ev.category === 'bonus_auction') {
          if (G.decks.activePlayers.length > 0) {
            const card = G.decks.activePlayers.pop();
            G.board.bonusAuction = {
              card,
              highestBid: card.minBid || 1,
              highestBidder: null,
              passedPlayers: [],
              active: true
            };
            addLog(G, `Player Demands a Trade: Bonus Auction revealed ${card.name} (Min: ${card.minBid}, Max: ${card.maxBid})!`);
          }
        } else if (ev.category === 'free_agency') {
          Object.keys(G.players).forEach(id => {
            const p = G.players[id];
            if (p.isCpu && G.decks.activePlayers.length > 0) {
              const cpuCard = G.decks.activePlayers.pop();
              if (p.coins >= cpuCard.maxBid) {
                let worstIdx = 0;
                let worstScore = Infinity;
                p.lineup.forEach((c, idx) => {
                  let score = c.isPracticeSquad ? -5 : (c.effects ? c.effects.reduce((a, e) => a + e.amount, 0) : 0);
                  if (score < worstScore) {
                    worstScore = score;
                    worstIdx = idx;
                  }
                });
                const discarded = p.lineup[worstIdx];
                p.coins -= cpuCard.maxBid;
                if (p.lineup.length > 0 && worstIdx < p.lineup.length) {
                  p.lineup[worstIdx] = cpuCard;
                } else {
                  p.lineup.push(cpuCard);
                }
                if (discarded) {
                  if (!G.decks.discard) G.decks.discard = [];
                  G.decks.discard.push(discarded);
                }
                addLog(G, `Free Agency: CPU Player ${parseInt(id) + 1} signed ${cpuCard.name} for ${cpuCard.maxBid} coins${discarded ? `, replacing ${discarded.name}` : ''}!`);
              } else {
                if (!G.decks.discard) G.decks.discard = [];
                G.decks.discard.push(cpuCard);
                addLog(G, `Free Agency: CPU Player ${parseInt(id) + 1} passed on ${cpuCard.name}.`);
              }
            }
          });
          const humanIds = Object.keys(G.players).filter(id => !G.players[id].isCpu);
          G.board.pendingFreeAgencyQueue = [...humanIds];
          advanceFreeAgencyQueue(G);
        }


        // Nominator & First Player Determination
        if (G.board.round === 1 || G.board.round1Nominator === null) {
          let first = '0';
          Object.keys(G.players).forEach(id => {
            if (id === '0') return;
            const p = G.players[id];
            const f = G.players[first];
            if (p.coins > f.coins) {
              first = id;
            } else if (p.coins === f.coins && p.psi < f.psi) {
              first = id;
            }
          });
          G.board.round1Nominator = first;
          G.board.firstPlayer = first;
          G.board.nominator = first;
        } else {
          const r1Nom = parseInt(G.board.round1Nominator || '0');
          const numP = (ctx && ctx.numPlayers) || (G.players ? Object.keys(G.players).length : 4);
          const nextNom = ((r1Nom + (G.board.round - 1)) % numP).toString();
          G.board.firstPlayer = nextNom;
          G.board.nominator = nextNom;
        }

        const nomDisplayId = parseInt(G.board.nominator) + 1;
        addLog(G, `Round ${G.board.round} First Player / Nominator: Player ${nomDisplayId} (${G.players[G.board.nominator]?.team?.name}).`);
      },
      turn: { activePlayers: ActivePlayers.ALL },
      moves: {
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        confirmEventReveal: ({ G, events }) => {
          G.board.eventFlipRevealed = false;
          G.board.eventConfirmed = true;
          const hasPendingInteractive = G.board.pendingRivalry || G.board.pendingTradeRumors || G.board.bonusAuction || G.board.pendingFreeAgency || G.board.pendingNewCapLimit;
          if (!hasPendingInteractive && events && events.endPhase) {
            events.endPhase();
          }
        },
        buyPracticeSquad: ({ G, playerID, events }, actingPlayerId) => {
          if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
            return INVALID_MOVE;
          }
          const p = G.players[targetPlayerId];
          if (!p || p.coins < 10) return INVALID_MOVE;

          p.coins -= 10;
          p.extraLineupSlots = (p.extraLineupSlots || 0) + 1;
          p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_cap_${targetPlayerId}_${Date.now()}` });
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `New Cap Limit: Player ${displayId} paid 10 coins to add an extra Practice Squad Player (+1 Lineup Slot)!`);
          advanceNewCapLimitQueue(G);
          if (!G.board.pendingNewCapLimit && G.board.eventConfirmed && events && events.endPhase) {
            events.endPhase();
          }
        },
        passPracticeSquad: ({ G, playerID, events }, actingPlayerId) => {
          if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
            return INVALID_MOVE;
          }
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `New Cap Limit: Player ${displayId} passed.`);
          advanceNewCapLimitQueue(G);
          if (!G.board.pendingNewCapLimit && G.board.eventConfirmed && events && events.endPhase) {
            events.endPhase();
          }
        },
        rivalryGivePsi: ({ G, events, playerID }, targetPlayerId, actingPlayerId) => {
          if (!G.board.pendingRivalry) return INVALID_MOVE;
          const { order, step } = G.board.pendingRivalry;
          if (step >= order.length) {
            G.board.pendingRivalry = null;
            return;
          }
          const giverId = order[step];
          const callerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (callerId && String(callerId) !== String(giverId)) return INVALID_MOVE;

          const targetId = String(targetPlayerId);
          if (targetId === giverId) return INVALID_MOVE;

          const giver = G.players[giverId];
          const target = G.players[targetId];
          if (!giver || !target) return INVALID_MOVE;

          giver.psi = Math.max(0, giver.psi - 1);
          applyPsiInflated(G, targetId, 1);
          addLog(G, `Rivalry: Player ${parseInt(giverId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);

          G.board.pendingRivalry.step++;
          if (G.board.pendingRivalry.step < order.length) {
            G.board.pendingRivalry.currentGiverId = order[G.board.pendingRivalry.step];
            processRivalryStep(G);
          } else {
            G.board.pendingRivalry = null;
            if (G.board.eventConfirmed && events && events.endPhase) {
              events.endPhase();
            }
          }
        },
        tradeRumorsPickCard: ({ G, playerID }, cardIndex, actingPlayerId) => {
          if (!G.board.pendingTradeRumors) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const human = G.players[targetPlayerId];
          if (!human || cardIndex < 0 || cardIndex >= human.lineup.length) return INVALID_MOVE;

          if (!G.board.pendingTradeRumors.picks) G.board.pendingTradeRumors.picks = {};
          G.board.pendingTradeRumors.picks[targetPlayerId] = cardIndex;

          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Trade Rumors: Player ${displayId} selected a player card to pass.`);

          const numP = Object.keys(G.players).length;
          const allPicked = Object.keys(G.players).every(id => G.board.pendingTradeRumors.picks[id] !== undefined);

          if (allPicked) {
            const passedCards = {};
            Object.keys(G.players).forEach(id => {
              const pl = G.players[id];
              const pickIdx = G.board.pendingTradeRumors.picks[id];
              passedCards[id] = pl.lineup[pickIdx] || pl.lineup[0];
            });

            const summaries = [];
            Object.keys(G.players).forEach(id => {
              const idx = parseInt(id);
              const giverId = ((idx - 1 + numP) % numP).toString();
              const receivedCard = passedCards[giverId];
              const givenCard = passedCards[id];

              const pl = G.players[id];
              const cardLoc = pl.lineup.findIndex(c => c.uniqueId === givenCard.uniqueId);
              if (cardLoc !== -1) {
                pl.lineup[cardLoc] = receivedCard;
              } else {
                pl.lineup.push(receivedCard);
              }
              summaries.push(`Player ${parseInt(giverId) + 1} passed ${receivedCard.name} to Player ${idx + 1}`);
            });

            G.board.tradeRumorsSummary = summaries;
            addLog(G, `Trade Rumors Complete: All players passed 1 active player to the right.`);
            G.board.pendingTradeRumors = null;
          }
        },
        bonusAuctionBid: ({ G, playerID }, amount, actingPlayerId) => {
          if (!G.board.bonusAuction || !G.board.bonusAuction.active) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          const card = G.board.bonusAuction.card;
          const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          const minBid = G.board.bonusAuction.highestBidder !== null ? G.board.bonusAuction.highestBid + 1 : card.minBid;

          if (amount < minBid || p.coins < amount) return INVALID_MOVE;

          G.board.bonusAuction.highestBid = amount;
          G.board.bonusAuction.highestBidder = targetPlayerId;
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player Demands a Trade: Player ${displayId} bid ${amount} coins on ${card.name}.`);

          if (amount >= effMax) {
            resolveBonusAuctionWin(G, targetPlayerId);
          } else {
            resolveBonusAuctionStep(G);
          }
        },
        bonusAuctionPass: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.bonusAuction || !G.board.bonusAuction.active) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (!G.board.bonusAuction.passedPlayers.includes(targetPlayerId)) {
            G.board.bonusAuction.passedPlayers.push(targetPlayerId);
          }
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player Demands a Trade: Player ${displayId} passed.`);
          resolveBonusAuctionStep(G);
        },
        freeAgencySign: ({ G, playerID, events }, replaceIndex, actingPlayerId) => {
          if (!G.board.pendingFreeAgency || !G.board.pendingFreeAgency.card) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (G.board.pendingFreeAgency.playerID && String(targetPlayerId) !== String(G.board.pendingFreeAgency.playerID)) {
            return INVALID_MOVE;
          }
          const p = G.players[targetPlayerId];
          const card = G.board.pendingFreeAgency.card;
          const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          if (p.coins < effMax) return INVALID_MOVE;

          p.coins -= effMax;
          const displayId = parseInt(targetPlayerId) + 1;
          if (replaceIndex >= 0 && replaceIndex < p.lineup.length) {
            const discarded = p.lineup[replaceIndex];
            p.lineup[replaceIndex] = card;
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(discarded);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
          } else {
            p.lineup.push(card);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
          }
          advanceFreeAgencyQueue(G);
          if (!G.board.pendingFreeAgency && G.board.eventConfirmed && events && events.endPhase) {
            events.endPhase();
          }
        },
        freeAgencyPass: ({ G, playerID, events }, actingPlayerId) => {
          if (!G.board.pendingFreeAgency) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (G.board.pendingFreeAgency.playerID && String(targetPlayerId) !== String(G.board.pendingFreeAgency.playerID)) {
            return INVALID_MOVE;
          }
          if (G.board.pendingFreeAgency.card) {
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(G.board.pendingFreeAgency.card);
          }
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Free Agency: Player ${displayId} passed.`);
          advanceFreeAgencyQueue(G);
          if (!G.board.pendingFreeAgency && G.board.eventConfirmed && events && events.endPhase) {
            events.endPhase();
          }
        },
        setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
          if (!G.board.qbChoices) G.board.qbChoices = {};
          G.board.qbChoices[cardUniqueId] = choice;
          const displayId = parseInt(playerID) + 1;
          addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
        },
        dismissTradeRumorsSummary: ({ G, events }) => {
          G.board.tradeRumorsSummary = null;
          if (G.board.eventConfirmed && events && events.endPhase) {
            events.endPhase();
          }
        },
        dismissLegendNotification: ({ G }) => {
          G.board.legendNotification = null;
        },
        dismissEventNotification: ({ G }) => {
          G.board.eventNotification = null;
        }
      },
      endIf: ({ G }) => G.board.eventConfirmed === true && !G.board.pendingRivalry && !G.board.pendingTradeRumors && !G.board.bonusAuction && !G.board.pendingFreeAgency && !G.board.pendingNewCapLimit,
      next: 'preAuctionPhase'
    },

    preAuctionPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, ctx, events }) => {
        G.board.preAuctionComplete = false;

        // Draw auction cards for the round
        G.board.auctionPlayers = [];
        const drawCount = G.board.activeEvent?.category === 'double_draft' ? ctx.numPlayers * 2 : ctx.numPlayers;
        for (let i = 0; i < drawCount; i++) {
          if (G.decks.activePlayers.length > 0) {
            G.board.auctionPlayers.push({ ...G.decks.activePlayers.pop(), uniqueId: `auc_${G.board.round}__${i}` });
          }
        }

        G.board.commandersMarkedCardIndex = null;
        G.board.pendingCommanders = null;
        G.board.pendingCommandersQueue = [];

        Object.values(G.players).forEach(p => {
          p.hasWonAuction = false;
          p.outbidCount = 0;
        });
        G.board.passedAuctionPlayers = [];
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.lastActionText = '';

        // Check Raiders Ability (queue multi-teams)
        const raidersTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'raiders');
        raidersTeams.forEach(raidersId => {
          const raidersPlayer = G.players[raidersId];
          if (raidersPlayer.isCpu) {
            let targetId = null;
            let lowestPsi = Infinity;
            Object.keys(G.players).forEach(id => {
              if (id !== raidersId) {
                if (G.players[id].psi < lowestPsi) {
                  lowestPsi = G.players[id].psi;
                  targetId = id;
                }
              }
            });
            if (targetId !== null) {
              raidersPlayer.psi = Math.max(0, raidersPlayer.psi - 1);
              applyPsiInflated(G, targetId, 1);
              addLog(G, `☠️ Raiders Ability: CPU Player ${parseInt(raidersId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);
            }
          } else {
            if (!G.board.pendingRaidersQueue) G.board.pendingRaidersQueue = [];
            G.board.pendingRaidersQueue.push({ playerID: raidersId });
          }
        });
        if (G.board.pendingRaidersQueue && G.board.pendingRaidersQueue.length > 0) {
          G.board.pendingRaiders = G.board.pendingRaidersQueue.shift();
        }

        // Check Cardinals Ability (queue multi-teams)
        const cardinalsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'cardinals');
        cardinalsTeams.forEach(cardinalsId => {
          if (G.decks.activePlayers.length === 0) return;
          const topCard = G.decks.activePlayers[G.decks.activePlayers.length - 1];
          const cardinalsPlayer = G.players[cardinalsId];
          if (cardinalsPlayer.isCpu) {
            let minScore = Infinity;
            let minIdx = -1;
            G.board.auctionPlayers.forEach((c, idx) => {
              if (c) {
                let s = c.effects ? c.effects.reduce((acc, e) => acc + (e.type === 'deflate' ? e.amount * 2 : e.amount), 0) : 0;
                if (s < minScore) {
                  minScore = s;
                  minIdx = idx;
                }
              }
            });
            const topCardScore = topCard.effects ? topCard.effects.reduce((acc, e) => acc + (e.type === 'deflate' ? e.amount * 2 : e.amount), 0) : 0;
            if (topCardScore > minScore && minIdx !== -1) {
              const oldCard = G.board.auctionPlayers[minIdx];
              G.board.auctionPlayers[minIdx] = G.decks.activePlayers.pop();
              G.decks.activePlayers.push(oldCard);
              addLog(G, `Cardinals Ability: CPU Player ${parseInt(cardinalsId) + 1} swapped auction card ${oldCard.name} with deck card ${topCard.name}.`);
            }
          } else {
            if (!G.board.pendingCardinalsQueue) G.board.pendingCardinalsQueue = [];
            G.board.pendingCardinalsQueue.push({ playerID: cardinalsId, topCard });
          }
        });
        if (G.board.pendingCardinalsQueue && G.board.pendingCardinalsQueue.length > 0) {
          G.board.pendingCardinals = G.board.pendingCardinalsQueue.shift();
        }

        // Check Chiefs Ability (queue multi-teams)
        const chiefsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'chiefs');
        chiefsTeams.forEach(chiefsId => {
          const chiefsPlayer = G.players[chiefsId];
          if (!chiefsPlayer.hasUsedChiefsAbility) {
            if (chiefsPlayer.isCpu) {
              if (G.board.round >= 4) {
                const affordableIdx = G.board.auctionPlayers.findIndex(c => c && c.minBid <= chiefsPlayer.coins && c.effects?.some(e => e.type === 'deflate' && e.amount >= 3));
                if (affordableIdx !== -1) {
                  const card = G.board.auctionPlayers[affordableIdx];
                  chiefsPlayer.coins -= card.minBid;
                  chiefsPlayer.hasUsedChiefsAbility = true;
                  resolveAuctionWin(G, chiefsId, card);
                  addLog(G, `Chiefs Ability: CPU Player ${parseInt(chiefsId) + 1} claimed ${card.name} for ${card.minBid} coins without bidding!`);
                }
              }
            } else {
              if (!G.board.pendingChiefsQueue) G.board.pendingChiefsQueue = [];
              G.board.pendingChiefsQueue.push({ playerID: chiefsId });
            }
          }
        });
        if (G.board.pendingChiefsQueue && G.board.pendingChiefsQueue.length > 0) {
          G.board.pendingChiefs = G.board.pendingChiefsQueue.shift();
        }

        // Check Commanders Ability (queue multi-teams)
        const commandersTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'commanders');
        commandersTeams.forEach(commandersId => {
          // Rule: This effect doesn't happen when the Commanders themselves are the first/nominating team
          if (String(commandersId) === String(G.board.firstPlayer)) {
            const displayId = parseInt(commandersId) + 1;
            addLog(G, `Commanders Ability Skipped: Player ${displayId} (Commanders) is the First Player this round.`);
            return;
          }
          const commandersPlayer = G.players[commandersId];
          if (commandersPlayer.isCpu) {
            const chosenIdx = chooseCpuCommandersMarkCard(G, commandersId);
            if (chosenIdx !== -1) {
              G.board.commandersMarkedCardIndex = chosenIdx;
              const card = G.board.auctionPlayers[chosenIdx];
              const displayId = parseInt(commandersId) + 1;
              const firstDisplayId = parseInt(G.board.firstPlayer) + 1;
              addLog(G, `🎖️ Commanders Ability: CPU Player ${displayId} marked ${card.name}. First Player (Player ${firstDisplayId}) cannot nominate or bid on this player!`);
            }
          } else {
            if (!G.board.pendingCommandersQueue) G.board.pendingCommandersQueue = [];
            G.board.pendingCommandersQueue.push({ playerID: commandersId });
          }
        });
        if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0) {
          G.board.pendingCommanders = G.board.pendingCommandersQueue.shift();
        }

        // If no human interactive prompts are pending, proceed to auction phase
        if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
          G.board.preAuctionComplete = true;
          if (events && events.endPhase) events.endPhase();
        }
      },
      moves: {
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        raidersGivePsi: ({ G, playerID, events }, targetPlayerId) => {
          if (!G.board.pendingRaiders) return INVALID_MOVE;
          const targetId = String(targetPlayerId);
          const raidersId = String(G.board.pendingRaiders.playerID);
          if (targetId === raidersId) return INVALID_MOVE;

          const raidersPlayer = G.players[raidersId];
          raidersPlayer.psi = Math.max(0, raidersPlayer.psi - 1);
          applyPsiInflated(G, targetId, 1);

          addLog(G, `☠️ Raiders Ability: Player ${parseInt(raidersId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);
          if (G.board.pendingRaidersQueue && G.board.pendingRaidersQueue.length > 0) {
            G.board.pendingRaiders = G.board.pendingRaidersQueue.shift();
          } else {
            G.board.pendingRaiders = null;
          }

          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        cardinalsSwap: ({ G, playerID, events }, auctionCardIndex) => {
          if (!G.board.pendingCardinals) return INVALID_MOVE;
          if (auctionCardIndex < 0 || auctionCardIndex >= G.board.auctionPlayers.length) return INVALID_MOVE;
          const oldCard = G.board.auctionPlayers[auctionCardIndex];
          if (!oldCard) return INVALID_MOVE;

          const newCard = G.decks.activePlayers.pop();
          G.board.auctionPlayers[auctionCardIndex] = newCard;
          G.decks.activePlayers.push(oldCard);

          const displayId = parseInt(playerID) + 1;
          addLog(G, `Cardinals Ability: Player ${displayId} swapped auction card ${oldCard.name} with ${newCard.name}.`);
          if (G.board.pendingCardinalsQueue && G.board.pendingCardinalsQueue.length > 0) {
            G.board.pendingCardinals = G.board.pendingCardinalsQueue.shift();
          } else {
            G.board.pendingCardinals = null;
          }

          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        cardinalsPass: ({ G, events }) => {
          if (G.board.pendingCardinalsQueue && G.board.pendingCardinalsQueue.length > 0) {
            G.board.pendingCardinals = G.board.pendingCardinalsQueue.shift();
          } else {
            G.board.pendingCardinals = null;
          }
          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        chiefsClaimCard: ({ G, playerID, events }, auctionCardIndex) => {
          if (!G.board.pendingChiefs) return INVALID_MOVE;
          const chiefsId = String(G.board.pendingChiefs.playerID);
          const chiefsPlayer = G.players[chiefsId];
          if (chiefsPlayer.hasUsedChiefsAbility) return INVALID_MOVE;

          const card = G.board.auctionPlayers[auctionCardIndex];
          if (!card || chiefsPlayer.coins < card.minBid) return INVALID_MOVE;

          chiefsPlayer.coins -= card.minBid;
          chiefsPlayer.hasUsedChiefsAbility = true;
          G.board.highestBid = 0;
          resolveAuctionWin(G, chiefsId, card);

          const displayId = parseInt(chiefsId) + 1;
          addLog(G, `Chiefs Ability: Player ${displayId} claimed ${card.name} for ${card.minBid} coins without bidding!`);
          if (G.board.pendingChiefsQueue && G.board.pendingChiefsQueue.length > 0) {
            G.board.pendingChiefs = G.board.pendingChiefsQueue.shift();
          } else {
            G.board.pendingChiefs = null;
          }

          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        chiefsPass: ({ G, events }) => {
          if (G.board.pendingChiefsQueue && G.board.pendingChiefsQueue.length > 0) {
            G.board.pendingChiefs = G.board.pendingChiefsQueue.shift();
          } else {
            G.board.pendingChiefs = null;
          }
          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        commandersMarkCard: ({ G, playerID, events }, auctionCardIndex, actingPlayerId) => {
          if (!G.board.pendingCommanders) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(G.board.pendingCommanders.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          if (auctionCardIndex < 0 || auctionCardIndex >= G.board.auctionPlayers.length) return INVALID_MOVE;
          const card = G.board.auctionPlayers[auctionCardIndex];
          if (!card) return INVALID_MOVE;

          G.board.commandersMarkedCardIndex = auctionCardIndex;
          const displayId = parseInt(targetPlayerId) + 1;
          const firstDisplayId = parseInt(G.board.firstPlayer) + 1;
          addLog(G, `🎖️ Commanders Ability: Player ${displayId} marked ${card.name}. First Player (Player ${firstDisplayId}) cannot nominate or bid on this player!`);

          if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0) {
            G.board.pendingCommanders = G.board.pendingCommandersQueue.shift();
          } else {
            G.board.pendingCommanders = null;
          }

          if (!G.board.pendingRaiders && !G.board.pendingCardinals && !G.board.pendingChiefs && !G.board.pendingCommanders) {
            G.board.preAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        }
      },
      endIf: ({ G }) => G.board.preAuctionComplete === true,
      next: 'auctionPhase'
    },

    auctionPhase: {
      turn: {
        activePlayers: ActivePlayers.ALL,
        order: {
          first: ({ G }) => {
            let nom = parseInt(G.board.nominator || G.board.firstPlayer || '0');
            let count = 0;
            const numP = Object.keys(G.players).length;
            while (G.players[nom.toString()]?.hasWonAuction && count < numP) {
              nom = (nom + 1) % numP;
              count++;
            }
            return nom;
          },
          next: ({ G, ctx }) => {
            if (G.board.activeAuctionCardIndex === null) {
              let nom = parseInt(G.board.nominator || G.board.firstPlayer || '0');
              let count = 0;
              const numP = Object.keys(G.players).length;
              while (G.players[nom.toString()]?.hasWonAuction && count < numP) {
                nom = (nom + 1) % numP;
                count++;
              }
              return nom;
            }
            let nextId = (parseInt(ctx.currentPlayer) + 1) % ctx.numPlayers;
            while (G.players[nextId.toString()]?.hasWonAuction || G.board.passedAuctionPlayers.includes(nextId.toString())) {
              nextId = (nextId + 1) % ctx.numPlayers;
              if (G.board.passedAuctionPlayers.length + Object.values(G.players).filter(p => p.hasWonAuction).length >= ctx.numPlayers) break;
            }
            return nextId;
          }
        },
        onBegin: ({ G, events }) => {
          if (G.board.activeAuctionCardIndex === null) {
            let nom = parseInt(G.board.nominator || G.board.firstPlayer || '0');
            let count = 0;
            const numP = Object.keys(G.players).length;
            while (G.players[nom.toString()]?.hasWonAuction && count < numP) {
              nom = (nom + 1) % numP;
              count++;
            }
            G.board.nominator = nom.toString();
          }

          if (G.pendingReplacement) return;

          const activePlayers = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          if (activePlayers.length === 1) {
            G.board.nominator = activePlayers[0];
          }
        }
      },
      moves: {
        replaceLineupCard: ({ G, playerID }, discardIndex) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
            return INVALID_MOVE;
          }
          const p = G.players[targetPlayerId];
          if (!p || discardIndex < 0 || discardIndex >= p.lineup.length) return INVALID_MOVE;

          const discarded = p.lineup[discardIndex];
          const newCard = G.pendingReplacement.wonCard;
          p.lineup[discardIndex] = newCard;

          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(discarded);

          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player ${displayId} replaced ${discarded.name} with ${newCard.name}.`);
          G.pendingReplacement = null;
        },
        discardWonCard: ({ G, playerID }) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
            return INVALID_MOVE;
          }
          if (getEffectiveTeamId(G.players[targetPlayerId]) !== 'bengals') {
            return INVALID_MOVE;
          }
          const wonCard = G.pendingReplacement.wonCard;
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(wonCard);
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player ${displayId} chose to discard acquired card ${wonCard.name}.`);
          G.pendingReplacement = null;
        },
        setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
          if (!G.board.qbChoices) G.board.qbChoices = {};
          G.board.qbChoices[cardUniqueId] = choice;
          const displayId = parseInt(playerID) + 1;
          addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
        },
        dismissCardWonFlyAnimation: ({ G }) => {
          G.board.cardWonFlyAnimation = null;
        },
        dismissTyreekHillAlert: ({ G }) => {
          G.board.tyreekHillAlert = null;
        },
        stepCpuTurn: ({ G, ctx, events }) => {
          executeCpuMoveInternal(G, ctx, events);
        },
        skipToHumanTurn: ({ G, ctx, events }, humanPlayerId = '0') => {
          let steps = 0;
          while (G.players[ctx.currentPlayer]?.isCpu && steps < 30 && !G.pendingReplacement) {
            executeCpuMoveInternal(G, ctx, events);
            steps++;
          }
        },
        selectCard: ({ G, playerID }, cardIndex, actingPlayerId) => {
          if (G.board.activeAuctionCardIndex != null) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(targetPlayerId) !== String(G.board.nominator)) return INVALID_MOVE;

          const card = G.board.auctionPlayers[cardIndex];
          if (!card) return INVALID_MOVE;

          // Cannot nominate if player cannot afford opening minimum bid (unless sole remaining bidder with 0 coins)
          const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === targetPlayerId;
          if (!isSoleRemainingBidder && G.players[targetPlayerId].coins < card.minBid) {
            return INVALID_MOVE;
          }

          // DJ Moore: Only teams with 10 or fewer coins may nominate
          if (card.id === 'dj_moore' && G.players[targetPlayerId].coins > 10) {
            return INVALID_MOVE;
          }

          const remainingCardsCount = G.board.auctionPlayers.filter(c => c !== null).length;
          if (String(targetPlayerId) === String(G.board.firstPlayer) && cardIndex === G.board.commandersMarkedCardIndex && remainingCardsCount > 1) {
            return INVALID_MOVE;
          }

          G.board.activeAuctionCardIndex = cardIndex;
          G.board.passedAuctionPlayers = [];
          G.board.highestBid = 0;
          G.board.highestBidder = null;

          const displayId = parseInt(targetPlayerId) + 1;
          G.board.lastActionText = `Player ${displayId} nominated ${card.name}. Bidding is now open!`;
          addLog(G, G.board.lastActionText);
        },
        passNomination: ({ G, playerID, events }, actingPlayerId) => {
          if (G.board.activeAuctionCardIndex != null) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(targetPlayerId) !== String(G.board.nominator)) return INVALID_MOVE;

          const numP = Object.keys(G.players).length;
          let nextNom = (parseInt(targetPlayerId) + 1) % numP;
          let count = 0;
          while (G.players[nextNom.toString()]?.hasWonAuction && count < numP) {
            nextNom = (nextNom + 1) % numP;
            count++;
          }

          const displayId = parseInt(targetPlayerId) + 1;
          G.board.nominator = nextNom.toString();
          addLog(G, `Player ${displayId} passed nomination. Nomination passes to Player ${nextNom + 1}.`);
          if (events && events.endTurn) events.endTurn();
        },
        falconsMulligan: ({ G, playerID }, actingPlayerId) => {
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          if (!p || getEffectiveTeamId(p) !== 'falcons') return INVALID_MOVE;
          if (String(targetPlayerId) !== String(G.board.nominator)) return INVALID_MOVE;

          let phaseKey = 'p1';
          if (G.board.round >= 5 && G.board.round <= 7) phaseKey = 'p2';
          if (G.board.round >= 8) phaseKey = 'p3';

          if (p.falconsPhaseUses[phaseKey]) return INVALID_MOVE;

          const oldRemaining = G.board.auctionPlayers.filter(c => c !== null);
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(...oldRemaining);

          G.board.auctionPlayers = G.board.auctionPlayers.map(c => {
            if (c === null) return null;
            return G.decks.activePlayers.length > 0 ? G.decks.activePlayers.pop() : null;
          });

          p.falconsPhaseUses[phaseKey] = true;
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `🦅 Falcons Ability: Player ${displayId} mulliganed remaining auction cards! New players revealed.`);
        },
        bid: ({ G, playerID, events }, amount, actingPlayerId) => {
          if (G.board.activeAuctionCardIndex === null) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];

          // DJ Moore: Only teams with 10 or fewer coins may bid
          if (card.id === 'dj_moore' && G.players[targetPlayerId].coins > 10) {
            return INVALID_MOVE;
          }

          const remainingCardsCount = G.board.auctionPlayers.filter(c => c !== null).length;
          if (String(targetPlayerId) === String(G.board.firstPlayer) && G.board.activeAuctionCardIndex === G.board.commandersMarkedCardIndex && remainingCardsCount > 1) {
            return INVALID_MOVE;
          }

          const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === targetPlayerId;
          const isSoleRemainingZeroCoins = isSoleRemainingBidder && G.players[targetPlayerId].coins === 0;

          const highestBidderPlayer = G.board.highestBidder !== null ? G.players[G.board.highestBidder] : null;
          const highestTeamId = highestBidderPlayer ? getEffectiveTeamId(highestBidderPlayer) : null;
          const bidIncrement = (highestTeamId === 'bears') ? 2 : 1;

          const minBid = G.board.highestBidder !== null
            ? (isSoleRemainingZeroCoins ? 0 : Math.max(card.minBid, G.board.highestBid + bidIncrement))
            : (isSoleRemainingBidder ? 0 : card.minBid);

          if (amount < minBid) return INVALID_MOVE;
          if (!G.players[targetPlayerId] || G.players[targetPlayerId].coins < amount) return INVALID_MOVE;

          if (G.board.highestBidder !== null && G.players[G.board.highestBidder]) {
            G.players[G.board.highestBidder].outbidCount++;
          }

          G.board.highestBid = amount;
          G.board.highestBidder = targetPlayerId;

          const displayId = parseInt(targetPlayerId) + 1;
          G.board.lastActionText = `Player ${displayId} bid ${amount} coins on ${card.name}.`;
          addLog(G, G.board.lastActionText);

          // Tyreek Hill custom mechanic: Deflates -1 PSI whenever any team bids on him
          if (card.id === 'tyreek_hill') {
            applyPsiDeflated(G, targetPlayerId, 1);
            G.board.tyreekHillAlert = {
              playerID: targetPlayerId,
              playerName: G.players[targetPlayerId].team?.name || `Player ${displayId}`,
              timestamp: Date.now()
            };
            addLog(G, `⚡ Tyreek Hill Speed Tax: Player ${displayId} placed a bid and deflated -1 PSI!`);
          }

          // Jaylen Waddle bonus: gain 1 coin immediately upon placing a bid
          if (card.id === 'jaylen_waddle') {
            applyCoinsGained(G, targetPlayerId, 1);
            G.board.waddleBonusAlert = {
              playerID: targetPlayerId,
              playerName: G.players[targetPlayerId].team?.name || `Player ${displayId}`
            };
            addLog(G, `Jaylen Waddle Bonus: Player ${displayId} gained +1 coin for placing a bid!`);
          }

          const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          if (isSoleRemainingBidder || amount >= effMax) {
            resolveAuctionWin(G, targetPlayerId, card);
          }

          if (events && events.endTurn) events.endTurn();
        },
        pass: ({ G, playerID, events }, actingPlayerId) => {
          if (G.board.activeAuctionCardIndex === null || G.board.highestBidder === null) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);

          G.board.passedAuctionPlayers.push(targetPlayerId);
          const displayId = parseInt(targetPlayerId) + 1;
          G.board.lastActionText = `Player ${displayId} passed.`;
          addLog(G, G.board.lastActionText);

          const activeBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers.includes(id));

          if (activeBidders.length === 1 && G.board.highestBidder !== null) {
            resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
          } else if (activeBidders.length === 0) {
            if (G.board.highestBidder !== null) {
              resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
            } else {
              resolveAuctionWin(G, targetPlayerId, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
            }
          }
          if (events && events.endTurn) events.endTurn();
        },
        ramsApplyDoubleToken: ({ G, playerID }, cardUniqueId) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          const p = G.players[targetPlayerId];
          if (!p || p.ramsTokenAttached) return INVALID_MOVE;
          const effectiveTeamId = getEffectiveTeamId(p);
          if (effectiveTeamId !== 'rams') return INVALID_MOVE;

          const targetCard = p.lineup.find(c => c.uniqueId === cardUniqueId);
          if (!targetCard || targetCard.phase === 1 || targetCard.isPracticeSquad || targetCard.uniqueId?.startsWith('ps_')) {
            return INVALID_MOVE;
          }

          targetCard.ramsDoubleToken = true;
          p.ramsTokenAttached = true;
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `🐏 Rams Ability: Player ${displayId} attached 2x Token to ${targetCard.name}!`);
        },
        reorderEventDeck: ({ G, playerID }, newDeckOrder) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          const p = G.players[targetPlayerId];
          if (!p || !p.team) return INVALID_MOVE;
          const effectiveTeamId = getEffectiveTeamId(p);
          if (effectiveTeamId !== 'jaguars') return INVALID_MOVE;
          if (G.board.jaguarsAbilityUsed) return INVALID_MOVE;

          G.decks.event = newDeckOrder;
          G.board.jaguarsAbilityUsed = true;
          const displayId = parseInt(targetPlayerId) + 1;
          G.board.jaguarsPopupNotification = `🐆 Jaguars Ability Used! Player ${displayId} (${p.team.name}) has secretly reordered the Event Deck!`;
          addLog(G, G.board.jaguarsPopupNotification);
        },
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        }
      },
      endIf: ({ G }) => Object.values(G.players).every(p => p.hasWonAuction === true) && G.pendingReplacement === null,
      next: 'postAuctionPhase'
    },

    postAuctionPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, events }) => {
        G.board.postAuctionComplete = false;

        // 1. Check Bills Ability (queue multi-teams)
        const billsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'bills');
        billsTeams.forEach(billsId => {
          if (G.decks.discard && G.decks.discard.length > 0) {
            const billsPlayer = G.players[billsId];
            if (!billsPlayer.hasUsedBillsAbility) {
              if (billsPlayer.isCpu) {
                const affordableCards = G.decks.discard.filter(c => c && c.minBid <= billsPlayer.coins);
                if (affordableCards.length > 0 && G.board.round >= 3) {
                  const chosen = affordableCards[0];
                  const dIdx = G.decks.discard.indexOf(chosen);
                  G.decks.discard.splice(dIdx, 1);
                  billsPlayer.coins -= chosen.minBid;
                  billsPlayer.hasUsedBillsAbility = true;
                  if (billsPlayer.lineup.length < 3) {
                    billsPlayer.lineup.push(chosen);
                  } else {
                    const psIdx = billsPlayer.lineup.findIndex(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
                    if (psIdx !== -1) {
                      const replaced = billsPlayer.lineup[psIdx];
                      billsPlayer.lineup[psIdx] = chosen;
                      G.decks.discard.push(replaced);
                    }
                  }
                  addLog(G, `Bills Ability: CPU Player ${parseInt(billsId) + 1} bought ${chosen.name} from discard for ${chosen.minBid} coins.`);
                }
              } else {
                if (!G.board.pendingBillsQueue) G.board.pendingBillsQueue = [];
                G.board.pendingBillsQueue.push({ playerID: billsId });
              }
            }
          }
        });
        if (G.board.pendingBillsQueue && G.board.pendingBillsQueue.length > 0) {
          G.board.pendingBills = G.board.pendingBillsQueue.shift();
        }

        // 2. Check Eagles Ability (queue multi-teams)
        const eaglesTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'eagles');
        eaglesTeams.forEach(eaglesId => {
          const eaglesPlayer = G.players[eaglesId];
          const usedThisRound = eaglesPlayer.eaglesUsedRound === G.board.round ? eaglesPlayer.eaglesUsedCount : 0;
          if (usedThisRound < 2) {
            if (eaglesPlayer.isCpu) {
              if (eaglesPlayer.coins >= 6) {
                eaglesPlayer.coins -= 3;
                eaglesPlayer.eaglesUsedRound = G.board.round;
                eaglesPlayer.eaglesUsedCount = usedThisRound + 1;
                Object.keys(G.players).forEach(id => {
                  if (id !== eaglesId) applyPsiInflated(G, id, 3);
                });
                addLog(G, `🦅 Eagles Ability: CPU Player ${parseInt(eaglesId) + 1} paid 3 coins to inflate all opponents +3 PSI!`);
              }
            } else {
              if (!G.board.pendingEaglesQueue) G.board.pendingEaglesQueue = [];
              G.board.pendingEaglesQueue.push({ playerID: eaglesId });
            }
          }
        });
        if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
          G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
        }

        if (!G.board.pendingBills && !G.board.pendingEagles) {
          G.board.postAuctionComplete = true;
          if (events && events.endPhase) events.endPhase();
        }
      },
      moves: {
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        billsBuyDiscard: ({ G, playerID, events }, discardIndex) => {
          if (!G.board.pendingBills) return INVALID_MOVE;
          const billsId = String(G.board.pendingBills.playerID);
          const billsPlayer = G.players[billsId];
          if (billsPlayer.hasUsedBillsAbility) return INVALID_MOVE;

          const card = G.decks.discard[discardIndex];
          if (!card || billsPlayer.coins < card.minBid) return INVALID_MOVE;

          G.decks.discard.splice(discardIndex, 1);
          billsPlayer.coins -= card.minBid;
          billsPlayer.hasUsedBillsAbility = true;

          const displayId = parseInt(billsId) + 1;
          addLog(G, `Bills Ability: Player ${displayId} bought ${card.name} from discard pile for ${card.minBid} coins.`);

          const maxLineup = getEffectiveTeamId(billsPlayer) === 'seahawks' ? 4 : 3;
          if (billsPlayer.lineup.length < maxLineup) {
            billsPlayer.lineup.push(card);
          } else {
            G.pendingReplacement = { playerID: billsId, wonCard: card };
          }

          if (G.board.pendingBillsQueue && G.board.pendingBillsQueue.length > 0) {
            G.board.pendingBills = G.board.pendingBillsQueue.shift();
          } else {
            G.board.pendingBills = null;
          }

          if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        billsPass: ({ G, events }) => {
          if (G.board.pendingBillsQueue && G.board.pendingBillsQueue.length > 0) {
            G.board.pendingBills = G.board.pendingBillsQueue.shift();
          } else {
            G.board.pendingBills = null;
          }
          if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        eaglesUseAbility: ({ G, playerID, events }, times) => {
          if (!G.board.pendingEagles) return INVALID_MOVE;
          const eaglesId = String(G.board.pendingEagles.playerID);
          const eaglesPlayer = G.players[eaglesId];
          const count = times === 2 ? 2 : 1;
          const cost = count * 3;
          if (eaglesPlayer.coins < cost) return INVALID_MOVE;

          eaglesPlayer.coins -= cost;
          eaglesPlayer.eaglesUsedRound = G.board.round;
          eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + count;

          Object.keys(G.players).forEach(id => {
            if (id !== eaglesId) applyPsiInflated(G, id, count * 3);
          });

          const displayId = parseInt(eaglesId) + 1;
          addLog(G, `🦅 Eagles Ability: Player ${displayId} paid ${cost} coins to inflate all opponents by +${count * 3} PSI! (${count}x this round).`);

          if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
            G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
          } else {
            G.board.pendingEagles = null;
          }

          if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        eaglesInflate: ({ G, playerID, events }) => {
          if (!G.board.pendingEagles) return INVALID_MOVE;
          const eaglesId = String(G.board.pendingEagles.playerID);
          const eaglesPlayer = G.players[eaglesId];
          if (eaglesPlayer.coins < 3) return INVALID_MOVE;

          eaglesPlayer.coins -= 3;
          eaglesPlayer.eaglesUsedRound = G.board.round;
          eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + 1;

          Object.keys(G.players).forEach(id => {
            if (id !== eaglesId) applyPsiInflated(G, id, 3);
          });

          const displayId = parseInt(eaglesId) + 1;
          addLog(G, `🦅 Eagles Ability: Player ${displayId} paid 3 coins to inflate all opponents by +3 PSI!`);

          if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
            G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
          } else {
            G.board.pendingEagles = null;
          }

          if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        eaglesPass: ({ G, events }) => {
          if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
            G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
          } else {
            G.board.pendingEagles = null;
          }
          if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        replaceLineupCard: ({ G, playerID, events }, discardIndex) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
            return INVALID_MOVE;
          }
          const p = G.players[targetPlayerId];
          if (!p || discardIndex < 0 || discardIndex >= p.lineup.length) return INVALID_MOVE;

          const discarded = p.lineup[discardIndex];
          const newCard = G.pendingReplacement.wonCard;
          p.lineup[discardIndex] = newCard;

          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(discarded);

          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player ${displayId} replaced ${discarded.name} with ${newCard.name}.`);
          G.pendingReplacement = null;

          if (!G.board.pendingBills && !G.board.pendingEagles) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        },
        discardWonCard: ({ G, playerID, events }) => {
          const targetPlayerId = G.players[playerID] ? playerID : Object.keys(G.players)[0];
          if (!G.pendingReplacement || String(G.pendingReplacement.playerID) !== String(targetPlayerId)) {
            return INVALID_MOVE;
          }
          if (getEffectiveTeamId(G.players[targetPlayerId]) !== 'bengals') {
            return INVALID_MOVE;
          }
          const wonCard = G.pendingReplacement.wonCard;
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(wonCard);
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Player ${displayId} chose to discard acquired card ${wonCard.name}.`);
          G.pendingReplacement = null;

          if (!G.board.pendingBills && !G.board.pendingEagles) {
            G.board.postAuctionComplete = true;
            if (events && events.endPhase) events.endPhase();
          }
        }
      },
      endIf: ({ G }) => G.board.postAuctionComplete === true,
      next: 'refreshPhase'
    },

    refreshPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G }) => {
        G.board.refreshConfirmed = false;

        // Check for Puka Nacua across all players
        const humanPukaQueue = [];
        Object.keys(G.players).forEach(id => {
          const p = G.players[id];
          if (!p || !p.lineup) return;
          const pukaCard = p.lineup.find(c => c.id === 'puka_nacua' && c.broncosRoundAcquired !== G.board.round);
          if (pukaCard) {
            const teammates = p.lineup.filter(c => c.uniqueId !== pukaCard.uniqueId && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
            if (p.isCpu) {
              if (teammates.length > 0) {
                let bestCard = teammates[0];
                let bestScore = -Infinity;
                teammates.forEach(c => {
                  let score = 0;
                  (c.effects || []).forEach(e => {
                    if (e.perRound) {
                      score += (e.type === 'deflate' ? e.amount * 2 : e.amount);
                    }
                  });
                  if (score > bestScore) {
                    bestScore = score;
                    bestCard = c;
                  }
                });
                if (!G.board.pukaCopiedEffects) G.board.pukaCopiedEffects = {};
                G.board.pukaCopiedEffects[pukaCard.uniqueId] = (bestCard.effects || []).filter(e => e.perRound);
                addLog(G, `Puka Nacua Ability: CPU Player ${parseInt(id) + 1} copied ${bestCard.name}'s recurring effects!`);
              }
            } else {
              if (teammates.length > 0) {
                humanPukaQueue.push({
                  playerID: id,
                  pukaUniqueId: pukaCard.uniqueId,
                  options: teammates
                });
              }
            }
          }
        });

        G.board.pendingPukaQueue = humanPukaQueue;
        advancePukaQueue(G);
      },
      moves: {
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        pukaChooseTeammate: ({ G, playerID }, teammateUniqueId, actingPlayerId) => {
          if (!G.board.pendingPukaChoice) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(targetPlayerId) !== String(G.board.pendingPukaChoice.playerID)) return INVALID_MOVE;

          const p = G.players[targetPlayerId];
          const chosenTeammate = p.lineup.find(c => c.uniqueId === teammateUniqueId);
          if (!chosenTeammate) return INVALID_MOVE;

          if (!G.board.pukaCopiedEffects) G.board.pukaCopiedEffects = {};
          G.board.pukaCopiedEffects[G.board.pendingPukaChoice.pukaUniqueId] = (chosenTeammate.effects || []).filter(e => e.perRound);

          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `Puka Nacua Ability: Player ${displayId} copied ${chosenTeammate.name}'s recurring effects!`);
          advancePukaQueue(G);
        },
        startRefreshSequence: ({ G }) => {
          G.board.refreshStage = 'animating';
          G.board.refreshStepIndex = 0;
        },
        advanceRefreshStep: ({ G }) => {
          G.board.refreshStepIndex++;
          if (G.board.refreshResults && G.board.refreshStepIndex >= G.board.refreshResults.length) {
            G.board.refreshStage = 'complete';
          }
        },
        setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
          if (!G.board.qbChoices) G.board.qbChoices = {};
          G.board.qbChoices[cardUniqueId] = choice;
          const displayId = parseInt(playerID) + 1;
          addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
        },
        confirmRefreshSummary: ({ G, events }) => {
          // Remove Broncos roundAcquired state so the card's recurring effects trigger next round
          Object.values(G.players).forEach(p => {
            p.lineup?.forEach(card => {
              if (card.broncosRoundAcquired) {
                delete card.broncosRoundAcquired;
              }
            });
            if (p.practiceSquad && p.practiceSquad.broncosRoundAcquired) {
              delete p.practiceSquad.broncosRoundAcquired;
            }
          });

          G.board.pukaCopiedEffects = {};
          G.board.pendingPukaChoice = null;
          G.board.cardWonFlyAnimation = null;
          G.board.tyreekHillAlert = null;

          G.board.inRefreshSummary = false;
          G.board.refreshStage = null;
          G.board.refreshStepIndex = -1;
          G.board.refreshResults = [];
          G.board.refreshConfirmed = true;
          G.board.round++;
          G.board.tradeRumorsSummary = null;
          G.board.legendNotification = null;
          G.board.eventNotification = null;

          // Reset all round flags so the next round's phases do not immediately trigger their endIf conditions
          G.board.eventConfirmed = false;
          G.board.preAuctionComplete = false;
          G.board.postAuctionComplete = false;
          G.board.activeAuctionCardIndex = null;
          G.board.highestBid = 0;
          G.board.highestBidder = null;
          G.board.passedAuctionPlayers = [];
          G.board.currentAuction = null;
          G.pendingReplacement = null;

          Object.values(G.players).forEach(p => {
            p.hasWonAuction = false;
            p.cardsWonThisRound = 0;
            p.outbidCount = 0;
          });

          if (events && events.endPhase) events.endPhase();
        }
      },
      endIf: ({ G }) => G.board.refreshConfirmed === true,
      next: 'eventPhase'
    }
  },

  endIf: ({ G }) => {
    const allPicked = Object.values(G.players).every(p => p && p.team !== null);
    if (!allPicked) return;

    let winners = [];
    Object.keys(G.players).forEach(id => {
      const p = G.players[id];
      if (p && p.team && p.psi <= 0) {
        winners.push(id);
      }
    });

    if (winners.length > 0) {
      winners.sort((a, b) => G.players[a].psi - G.players[b].psi);
      return { winner: winners[0] };
    }

    if (G.board.round > 10) {
      let lowest = '0';
      Object.keys(G.players).forEach(id => {
        const p = G.players[id];
        const lowP = G.players[lowest];
        if (p && p.team && (!lowP || !lowP.team || p.psi < lowP.psi)) lowest = id;
      });
      return { winner: lowest };
    }
  }
};
