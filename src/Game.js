import { INVALID_MOVE, ActivePlayers } from 'boardgame.io/dist/cjs/core.js';
import { TEAMS, EVENTS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS, HOF_PLAYERS } from './GameData.js';
import { DEFAULT_GENOME, BASELINE_TEAM_GENOMES, ACTIVE_TEAM_GENOMES } from './ai/teamGenomes.js';

export const fisherYatesShuffle = (array) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const getEffectiveTeamId = (p) => {
  if (!p) return '';
  if (p.copiedTeam) return p.copiedTeam.id || p.copiedTeam;
  if (p.team) return p.team.id || p.team;
  return '';
};

export const isGenuinePlayerCard = (c) => {
  if (!c) return false;
  if (c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_')) return false;
  return c.phase === 1 || c.phase === 2 || c.phase === 3 || c.isHof || c.phase === 'hof';
};

const addLog = (G, text) => {
  if (!G.logs) G.logs = [];
  G.logs.unshift({ id: Date.now() + Math.random(), text, round: G.board.round });
  if (G.logs.length > 50) G.logs.pop();
};

export const addBannerEvent = (G, { icon = '⚡', title, text, round }) => {
  if (!G.board) return;
  if (!G.board.gameLogBannerHistory) G.board.gameLogBannerHistory = [];
  const entry = {
    id: `${Date.now()}_${Math.random()}`,
    icon,
    title,
    text,
    round: round ?? G.board.round ?? 1,
    timestamp: Date.now()
  };
  G.board.gameLogBannerHistory.unshift(entry);
  if (G.board.gameLogBannerHistory.length > 50) {
    G.board.gameLogBannerHistory = G.board.gameLogBannerHistory.slice(0, 50);
  }

  // Also push to abilityNotification and abilityNotificationHistory so Mobile and Desktop banners stay synchronized
  const notif = {
    id: entry.id,
    icon: entry.icon || '⚡',
    teamName: entry.title || 'Event',
    title: entry.title,
    message: entry.text,
    round: entry.round,
    timestamp: entry.timestamp
  };
  G.board.abilityNotification = notif;
  if (!G.board.abilityNotificationHistory) G.board.abilityNotificationHistory = [];
  G.board.abilityNotificationHistory.unshift(notif);
  if (G.board.abilityNotificationHistory.length > 50) {
    G.board.abilityNotificationHistory = G.board.abilityNotificationHistory.slice(0, 50);
  }
};

export const triggerAbilityNotification = (G, playerID, teamId, title, message) => {
  const icons = {
    chargers: '⚡',
    eagles: '🦅',
    dolphins: '🐬',
    cardinals: '🦤',
    lions: '🦁',
    raiders: '☠️',
    chiefs: '🏹',
    steelers: '💛',
    jets: '✈️',
    falcons: '🦅',
    rams: '🐏',
    bills: '🦬',
    saints: '⚜️',
    packers: '🧀',
    texans: '🐂',
    bengals: '🐅',
    vikings: '⚔️',
    ravens: '🐦',
    commanders: '🎖️',
    panthers: '🐆',
    cowboys: '🤠',
    seahawks: '🦅',
    '49ers': '⛏️'
  };
  const icon = icons[teamId] || '⚡';
  const p = G.players[playerID];
  const teamName = p?.team?.name || (teamId ? teamId.toUpperCase() : 'TEAM');
  const notif = {
    id: `${Date.now()}_${Math.random()}`,
    playerID,
    teamId,
    teamName,
    title,
    message,
    icon,
    round: G.board?.round || 1,
    timestamp: Date.now()
  };
  G.board.abilityNotification = notif;
  if (!G.board.abilityNotificationHistory) G.board.abilityNotificationHistory = [];
  G.board.abilityNotificationHistory.unshift(notif);
  if (G.board.abilityNotificationHistory.length > 50) {
    G.board.abilityNotificationHistory = G.board.abilityNotificationHistory.slice(0, 50);
  }

  // Also record in central Banner Log history for player recollection
  const bannerTitle = (title && teamId && title.toLowerCase().includes(teamId.toLowerCase()))
    ? title
    : `${teamName}: ${title}`;
  if (!G.board.gameLogBannerHistory) G.board.gameLogBannerHistory = [];
  G.board.gameLogBannerHistory.unshift({
    id: notif.id,
    icon,
    title: bannerTitle,
    text: message,
    round: G.board?.round || 1,
    timestamp: notif.timestamp
  });
  if (G.board.gameLogBannerHistory.length > 50) {
    G.board.gameLogBannerHistory = G.board.gameLogBannerHistory.slice(0, 50);
  }
};

export const checkDolphinsEmergencyCoins = (G, playerID) => {
  const p = G.players[playerID];
  if (!p) return;
  const effectiveTeamId = getEffectiveTeamId(p);
  if (effectiveTeamId === 'dolphins' && p.coins === 0) {
    p.coins = 3;
    p.dolphinsTriggered = true;
    triggerAbilityNotification(G, playerID, 'dolphins', 'Dolphins Bailout', 'Whenever you have 0 coins, gain 3! Recharged with +3 coins.');
    addLog(G, `🐬 Dolphins Ability Triggered: 0 coins triggers +3 emergency coins!`);
  }
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
  if (p.coins === 0) {
    checkDolphinsEmergencyCoins(G, playerID);
  }
  return deducted;
};

export const getEffectiveCardMaxBid = (card, activeEvent) => {
  if (!card) return 0;
  let max = card.maxBid;
  if (activeEvent?.category === 'overpaid' || activeEvent?.name === 'New Cap Limit' || activeEvent?.name === 'Overpaid') {
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
  const bidCost = G.board.highestBid || 0;
  p.coins = Math.max(0, (p.coins || 0) - bidCost);
  checkDolphinsEmergencyCoins(G, playerID);

  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
  const isMaxBid = G.board.highestBid >= effMax;
  const displayId = parseInt(playerID) + 1;

  // Isaiah Pacheco Custom Mechanic: Shuffles player deck, draws top card to replace Pacheco, discards Pacheco
  if (card.id === 'isaiah_pacheco') {
    if (!G.decks.discard) G.decks.discard = [];
    G.decks.discard.push(card);
    if (G.decks.activePlayers && G.decks.activePlayers.length > 0) {
      G.decks.activePlayers = fisherYatesShuffle(G.decks.activePlayers);
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

  // Acquisition Card Won Fly Animation (only needed when human players are present)
  if (G.numHumans > 0) {
    G.board.cardWonFlyAnimation = {
      card: { ...card },
      winnerId: playerID,
      winnerTeamName: p.team ? p.team.name : `Player ${displayId}`,
      bidAmount: G.board.highestBid,
      timestamp: Date.now()
    };
  }

  addLog(G, `Player ${displayId} (${p.team ? p.team.name : 'Team'}) won ${card.name} for ${G.board.highestBid} coins.`);

  const effectiveTeamId = getEffectiveTeamId(p);

  // Lions Ability: First player to claim a card in the auction gains coins equal to number of players
  if (G.board.firstClaimThisRound === null) {
    G.board.firstClaimThisRound = playerID;
    if (effectiveTeamId === 'lions') {
      const numP = Object.keys(G.players).length;
      applyCoinsGained(G, playerID, numP);
      addLog(G, `🦁 Lions Ability: Player ${displayId} (${p.team?.name || 'Lions'}) acquired the 1st player of Round ${G.board.round}! Gained +${numP} coins.`);
      triggerAbilityNotification(G, playerID, 'lions', 'Lions: First Claimed Player!', `Player ${displayId} (${p.team?.name || 'Lions'}) claimed the 1st player of Round ${G.board.round} and gained +${numP} coins!`);
    }
  }

  // Jets Ability: Deflate 4 on max bid
  if (effectiveTeamId === 'jets' && isMaxBid) {
    applyPsiDeflated(G, playerID, 4);
    addLog(G, `Jets Ability: Paid max bid! Deflated 4 PSI.`);
    triggerAbilityNotification(G, playerID, 'jets', 'Jets: Max Bid Jet Boost', `Paid maximum bid! Deflated 4 PSI.`);
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
  if (String(playerID) === String(G.board.firstPlayer) && (G.board.commandersMarkedCardIndex !== null || (G.board.commandersMarkedIndices && G.board.commandersMarkedIndices.length > 0))) {
    addLog(G, `🎖️ Commanders Mark Lifted: First Player ${displayId} acquired a card. All marked players are now unlocked for all teams!`);
    G.board.commandersMarkedCardIndex = null;
    G.board.commandersMarkedIndices = [];
  }

  // Pass nominator rights clockwise to next player with fewest wins if nominator won or is now maxed
  const numP = Object.keys(G.players).length;
  const eligiblePlayers = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
  
  if (eligiblePlayers.length > 0) {
    const currentNom = String(G.board.nominator);
    const nominatorMustPass = String(playerID) === currentNom || (G.players[currentNom]?.cardsWonThisRound || 0) >= maxWinsThisRound;
    
    if (nominatorMustPass) {
      const minWins = Math.min(...eligiblePlayers.map(id => G.players[id].cardsWonThisRound || 0));
      let found = null;
      for (let i = 1; i <= numP; i++) {
        const candidate = ((parseInt(currentNom) + i) % numP).toString();
        if ((G.players[candidate]?.cardsWonThisRound || 0) === minWins && (G.players[candidate]?.cardsWonThisRound || 0) < maxWinsThisRound) {
          found = candidate;
          break;
        }
      }
      if (!found) {
        for (let i = 1; i <= numP; i++) {
          const candidate = ((parseInt(currentNom) + i) % numP).toString();
          if ((G.players[candidate]?.cardsWonThisRound || 0) < maxWinsThisRound) {
            found = candidate;
            break;
          }
        }
      }
      if (found) {
        G.board.nominator = found;
      }
    }
  }

  // Remove card from auction block
  if (G.board.activeAuctionCardIndex !== null && G.board.auctionPlayers) {
    if (G.board.activeAuctionCardIndex === G.board.commandersMarkedCardIndex) {
      G.board.commandersMarkedCardIndex = null;
    }
    if (G.board.commandersMarkedIndices) {
      G.board.commandersMarkedIndices = G.board.commandersMarkedIndices.filter(i => i !== G.board.activeAuctionCardIndex);
    }
    G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
  }
  G.board.activeAuctionCardIndex = null;
  G.board.passedAuctionPlayers = [];
  G.board.highestBid = 0;
  G.board.highestBidder = null;

  // Apply one-time / immediate card effects (with Bengals +2 bonus, Vikings 2x under 27 PSI & event multipliers)
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
          if (effectiveTeamId === 'vikings' && p.psi < 27) {
            effAmount *= 2;
            addLog(G, `⚔️ Vikings Ability: Under 27 PSI! Instant coin reward doubled to ${effAmount}.`);
            triggerAbilityNotification(G, playerID, 'vikings', 'Vikings: Under 27 PSI Boost', `Under 27 PSI! Instant coins doubled to +${effAmount}!`);
          }
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

  // Handle Player Demands a Trade bonus auction transition:
  if (G.board.isTradeDemandBidding) {
    p.cardsWonThisRound = Math.max(0, (p.cardsWonThisRound || 1) - 1);
    p.hasWonAuction = false;
    addLog(G, `🚨 Trade Demand Auction Concluded! Player ${displayId} acquired ${card.name}! Regular auction phase now begins.`);
    
    // Swap in the regular auction row
    G.board.isTradeDemandBidding = false;
    G.board.isTradeDemandActive = false;
    G.board.tradeDemandCard = null;
    G.board.auctionPlayers = G.board.pendingRegularAuctionPlayers || [];
    G.board.pendingRegularAuctionPlayers = null;
    G.board.activeAuctionCardIndex = null;
    G.board.highestBid = 0;
    G.board.highestBidder = null;
    G.board.passedAuctionPlayers = [];
    G.board.nominator = G.board.firstPlayer || '0';
  }

  // Handle Lineup Insertion
  const maxLineup = (effectiveTeamId === 'seahawks' ? 4 : 3) + (p.extraLineupSlots || 0);
  if (effectiveTeamId === 'colts' || p.lineup.length < maxLineup) {
    p.lineup.push(card);
  } else {
    if (p.isCpu) {
      // Bengals ability: May discard acquired player instead of replacing a player.
      if (effectiveTeamId === 'bengals') {
        const hasNegativeRecurring = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && (e.type === 'inflate' || (e.type === 'coins' && e.amount < 0)));
        const isPureInstant = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound);
        const realLineup = p.lineup.filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
        const recurringEngines = realLineup.filter(c => c.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0))));

        // 1. Toxic/Negative Recurring Cards (e.g. Hunter Henry, Ezekiel Elliott):
        // Discard immediately after claiming the boosted instant effect so toxic penalties never enter the lineup!
        if (hasNegativeRecurring) {
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(card);
          addLog(G, `🐅 Bengals Ability: CPU Player ${displayId} discarded ${card.name} after claiming its instant effect, avoiding recurring penalties.`);
          triggerAbilityNotification(G, playerID, 'bengals', 'Bengals Discard', `Player ${displayId} discarded ${card.name} to avoid recurring penalties.`);
          return;
        }

        // 2. Pure Instant Cards (e.g. Aaron Jones, Malik Nabers, Gibbs, Swift, Deebo, Olave):
        // Discard instant cards directly after triggering their instant effect to keep the lineup clean!
        if (isPureInstant) {
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(card);
          addLog(G, `🐅 Bengals Ability: CPU Player ${displayId} discarded instant card ${card.name} after triggering its instant effect.`);
          triggerAbilityNotification(G, playerID, 'bengals', 'Bengals Discard', `Player ${displayId} discarded instant card ${card.name} after triggering effect.`);
          return;
        }

        // 3. Recurring Cards when Lineup already has 3 solid recurring engines:
        // If all 3 slots are full and the acquired recurring card is NOT better than the worst active engine, discard it!
        if (recurringEngines.length >= 3) {
          const roundsLeft = Math.max(1, 10 - (G.board?.round || 1));
          const deflateW = p.genome?.deflateWeight || 2.0;
          const coinW = p.genome?.coinWeight || 1.0;
          const newCardVal = scoreCardRaw(card, roundsLeft, deflateW, coinW);
          const worstStarterVal = Math.min(...recurringEngines.map(c => scoreCardRaw(c, roundsLeft, deflateW, coinW)));
          if (newCardVal <= worstStarterVal) {
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(card);
            addLog(G, `🐅 Bengals Ability: CPU Player ${displayId} discarded ${card.name} to preserve existing superior active lineup.`);
            triggerAbilityNotification(G, playerID, 'bengals', 'Bengals Discard', `Player ${displayId} discarded ${card.name} to preserve active lineup.`);
            return;
          }
        }
      }

      let replaceIdx = 0;
      let worstScore = Infinity;

      const isTexans = effectiveTeamId === 'texans';
      const isRavens = effectiveTeamId === 'ravens';
      const isSaints = effectiveTeamId === 'saints';
      const hasPracticeSquad = p.lineup.some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));

      // Priority 0: Universal Negative Recurring Replacement
      // If a non-Saints CPU team has any starter with negative recurring effects (e.g. Deshaun Watson [+4 inflate/rd],
      // Ezekiel Elliott [-2 coins/rd], Hunter Henry [+3 inflate/rd]), replace that player FIRST
      // (even before replacing Practice Squad players) so the penalty is only suffered for 1 turn not the entire game!
      let toxicStarterIdx = -1;
      if (!isSaints) {
        let worstToxicPenalty = -Infinity;
        p.lineup.forEach((c, idx) => {
          if (!c || c.isPracticeSquad || c.uniqueId?.startsWith('ps_')) return;
          const recInflate = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
          const recNegCoins = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0) || 0;
          if (recInflate > 0 || recNegCoins > 0) {
            const penalty = (recInflate * 3.0) + recNegCoins;
            if (penalty > worstToxicPenalty) {
              worstToxicPenalty = penalty;
              toxicStarterIdx = idx;
            }
          }
        });
      }

      if (toxicStarterIdx !== -1) {
        replaceIdx = toxicStarterIdx;
      } else if (isTexans) {
        // Priority 1: Always replace Practice Squad first
        const psIdx = p.lineup.findIndex(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
        if (psIdx !== -1) {
          replaceIdx = psIdx;
        } else {
          // User directive: "I wouldn't say they should never replace a qb with a non qb. YOu can replace watson, in a vacumm travis kelce or a hof player would be better than a qb in your lineup so you can replace a qb for them. But generally yes you want to keep the qbs. Just add a value of 2 every turn coins and 2 every turn deflation to qb cards when evaluating what to replace."
          const currentRound = G.board?.round || 1;
          const roundsLeft = Math.max(1, 10 - currentRound);
          const deflateWeight = p.genome?.deflateWeight || 1.6;
          const coinWeight = p.genome?.coinWeight || 1.2;

          let worstScore = Infinity;
          let worstIdx = 0;

          const evaluateLineupCard = (c) => {
            const hasRecurringInflation = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
            const hasRecurringNegativeCoins = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0);
            if (hasRecurringInflation || hasRecurringNegativeCoins) {
              return -300; // Toxic recurring damage card: replace immediately!
            }
            const hasPerRound = c.effects ? c.effects.some(e => e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') : false;
            if (!hasPerRound) {
              return -100; // Consumed instant / cycle card: designate as revolving cycle spot!
            }
            if (c.id === 'deshaun_watson') {
              // Watson evaluation: half as bad as other teams (negative score, replaced naturally)
              return scoreCardForPlayer(G, playerID, c);
            }
            let defPerRound = 0;
            let coinPerRound = 0;
            (c.effects || []).forEach(e => {
              const isRec = e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round';
              if (isRec) {
                if (e.type === 'deflate' || e.type === 'deflate_every_round') defPerRound += (e.amount || 0);
                if (e.type === 'coins') coinPerRound += (e.amount || 0);
                if (e.type === 'inflate') defPerRound -= (e.amount || 0);
              }
            });

            // "Just add a value of 2 every turn coins and 2 every turn deflation to qb cards when evaluating what to replace."
            if (c.position === 'QB') {
              defPerRound += 2;
              coinPerRound += 2;
            }

            let s = ((defPerRound * deflateWeight) + (coinPerRound * coinWeight)) * roundsLeft;
            const effMax = getEffectiveCardMaxBid(c, G.board?.activeEvent);
            const isSuperstar = (c.phase === 'hof' || effMax >= 16 || c.id === 'patrick_mahomes' || c.id === 'travis_kelce' || c.id === 'christian_mccaffrey' || c.id === 'lamar_jackson' || c.id === 'justin_jefferson');
            if (c.phase === 'hof') {
              s = Math.max(s, 24.0) * 1.2;
            } else if (isSuperstar) {
              s = Math.max(s, 20.0) * 1.2;
            }
            return s;
          };

          p.lineup.forEach((c, idx) => {
            const score = evaluateLineupCard(c);
            if (score < worstScore) {
              worstScore = score;
              replaceIdx = idx;
            }
          });
        }
      } else if (isRavens && !hasPracticeSquad) {
        let bestTotalLineupScore = -Infinity;
        let bestCandidateIdx = 0;
        const roundsLeft = Math.max(1, 10 - (G.board?.round || 1));
        const coinWeight = p.genome?.coinWeight || 1.1;
        const abilityValue = 3.0 * coinWeight * Math.min(5, roundsLeft);

        p.lineup.forEach((c, idx) => {
          const candidateLineup = p.lineup.map((oldCard, i) => (i === idx ? card : oldCard));
          const candDistinct = new Set(candidateLineup.map(x => x.position));
          const candHasAbility = candDistinct.size >= 3;

          let candidateScore = 0;
          candidateLineup.forEach(x => {
            const hasRecurringInflation = x.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
            const hasRecurringNegativeCoins = x.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0);
            if (hasRecurringInflation || hasRecurringNegativeCoins) {
              candidateScore -= 300;
            } else if (x === card) {
              candidateScore += scoreCardForPlayer(G, playerID, x);
            } else {
              const hasPerRound = x.effects ? x.effects.some(e => e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') : false;
              if (!hasPerRound) {
                candidateScore += 0; // Consumed instant card has 0 future recurring value
              } else {
                candidateScore += scoreCardForPlayer(G, playerID, x);
              }
            }
          });
          if (candHasAbility) {
            candidateScore += abilityValue;
          }

          if (candidateScore > bestTotalLineupScore) {
            bestTotalLineupScore = candidateScore;
            bestCandidateIdx = idx;
          }
        });
        replaceIdx = bestCandidateIdx;
      } else {
        p.lineup.forEach((c, idx) => {
          let score = 0;
          const hasRecurringInflation = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
          const hasRecurringNegativeCoins = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0);
          const isPracticeSquad = c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_');

          if (!isSaints && (hasRecurringInflation || hasRecurringNegativeCoins)) {
            score = -300; // Toxic recurring damage card: replace immediately!
          } else if (isPracticeSquad) {
            score = -200; // Practice Squad placeholder: replace as soon as real cards are acquired!
          } else {
            const hasPerRound = c.effects ? c.effects.some(e => e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') : false;
            if (!hasPerRound) {
              score = -100; // Consumed instant / cycle card: designate as revolving cycle spot!
            } else {
              score = scoreCardForPlayer(G, playerID, c);
            }
          }
          if (score < worstScore) {
            worstScore = score;
            replaceIdx = idx;
          }
        });
      }

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

  // Check CPU Falcons Mulligan opportunity between card acquisitions:
  // User directive: "Their ability is good for if things don't work out in the auction phase and they are one of the last teams
  // (last one or one of the last 2 teams). They can refresh late in the auction to switch a bad player (tier 3) to something random."
  let phaseKey = 'p1';
  if (G.board.round >= 4 && G.board.round <= 6) phaseKey = 'p2';
  if (G.board.round >= 7) phaseKey = 'p3';

  const falconsCpuIds = Object.keys(G.players).filter(id => {
    const pl = G.players[id];
    return pl && pl.isCpu && !pl.hasWonAuction && getEffectiveTeamId(pl) === 'falcons' && !pl.falconsPhaseUses?.[phaseKey];
  });

  falconsCpuIds.forEach(fId => {
    const falconsPlayer = G.players[fId];
    const remainingCards = (G.board.auctionPlayers || []).filter(c => c !== null);
    const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
    const remainingBiddersCount = eligibleBidders.length;
    const isLateAuction = (G.ctx?.numPlayers || Object.keys(G.players).length) >= 10 ? remainingBiddersCount <= 3 : remainingBiddersCount <= 2;
    const isEndOfPhaseRound = (G.board.round === 3 || G.board.round === 6 || G.board.round >= 9);

    if (remainingCards.length > 0 && falconsPlayer.coins >= 1) {
      const bestScore = Math.max(...remainingCards.map(c => scoreCardForPlayer(G, fId, c)));
      const isTier3OrScrap = (c) => {
        if (!c) return true;
        const hasRec = c.effects?.some(e => e.perRound || e.trigger === 'refresh');
        const instD = c.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        const instC = c.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
        return !hasRec && instD <= 2 && instC <= 3;
      };
      const allScraps = remainingCards.every(c => isTier3OrScrap(c) || scoreCardForPlayer(G, fId, c) < 18.0);

      const shouldMulligan = (isLateAuction && (bestScore < 20.0 || allScraps)) ||
                            (isEndOfPhaseRound && bestScore < 20.0) ||
                            (bestScore < 15.0);

      if (shouldMulligan) {
        if (!G.decks.discard) G.decks.discard = [];
        G.decks.discard.push(...remainingCards);
        G.board.auctionPlayers = G.board.auctionPlayers.map(c => {
          if (c === null) return null;
          return G.decks.activePlayers && G.decks.activePlayers.length > 0 ? G.decks.activePlayers.pop() : null;
        });
        falconsPlayer.falconsPhaseUses[phaseKey] = true;
        const fDisplayId = parseInt(fId) + 1;
        triggerAbilityNotification(G, fId, 'falcons', 'Falcons Mulligan', `CPU Player ${fDisplayId} mulliganed remaining cards! Fresh draft prospects revealed.`);
        addLog(G, `🦅 Falcons Ability: CPU Player ${fDisplayId} mulliganed remaining auction cards! New players revealed.`);
      }
    }
  });
};

// ============================================================================
// HUMAN-LIKE CPU AUCTION EVALUATION & VARIANCE SYSTEM
// ============================================================================

export const CPU_ARCHETYPES = ['rusher', 'tycoon', 'opportunist', 'bully', 'wildcard'];

export const GENERAL_HUMAN_HEURISTIC_TEAMS = new Set([
  'raiders',
  'chargers', 'cowboys', 'eagles', 'commanders',
  'bears', 'lions', 'packers', 'vikings',
  'falcons', 'saints', 'panthers', 'buccaneers',
  'cardinals', 'rams', '49ers', 'seahawks',
  'bills', 'dolphins', 'patriots', 'jets', 'ravens',
  'bengals', 'browns', 'steelers', 'texans', 'colts',
  'jaguars', 'titans', 'broncos', 'chiefs'
]);

export const getCpuArchetype = (player, playerId) => {
  if (player && player.personality) return player.personality;
  const hash = Math.abs((playerId ? parseInt(playerId) : 0) * 31 + (player?.team?.id?.charCodeAt(0) || 0));
  return CPU_ARCHETYPES[hash % CPU_ARCHETYPES.length];
};

export const selectCpuTeamFromChoices = (choices, personality) => {
  if (!choices || choices.length === 0) return null;
  if (choices.length === 1) return choices[0];
  if (personality === 'rusher') {
    return [...choices].sort((a, b) => a.initialPsi - b.initialPsi)[0];
  } else if (personality === 'tycoon') {
    return [...choices].sort((a, b) => b.coins - a.coins)[0];
  } else if (personality === 'bully') {
    const bullyIds = ['bears', 'eagles', 'raiders', 'steelers', 'commanders'];
    const match = choices.find(t => bullyIds.includes(t.id));
    if (match) return match;
  }
  return choices[Math.floor(Math.random() * choices.length)];
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

export const calculateEstimatedGameEndRound = (G) => {
  if (!G || !G.players) return 8;
  const currentRound = G.board?.round || 1;
  const players = Object.values(G.players);
  if (players.length === 0) return 8;

  const getEffectivePsi = (p) => {
    if (p.psi > 0) return p.psi;
    if (p.psi <= 0 && p.lineup && p.lineup.length > 0) return 0;
    return p.team?.initialPsi || 44;
  };

  const minPsi = Math.min(...players.map(getEffectivePsi));
  const hasEagles = players.some(p => getEffectiveTeamId(p) === 'eagles');
  const hasPanthers = players.some(p => getEffectiveTeamId(p) === 'panthers');
  const hasPatriots = players.some(p => getEffectiveTeamId(p) === 'patriots');

  let totalDeflationVelocity = 0;
  let fastestPlayerWinRound = 10;

  players.forEach(p => {
    const lineupDeflate = (p.lineup || []).reduce((sum, c) => {
      return sum + (c.effects || []).reduce((effSum, eff) => {
        return (eff.perRound && eff.type === 'deflate') ? effSum + eff.amount : effSum;
      }, 0);
    }, 0);
    const passiveDeflate = getEffectiveTeamId(p) === 'panthers' ? 2 : 0;
    const pVelocity = lineupDeflate + passiveDeflate;
    totalDeflationVelocity += pVelocity;

    const effPsi = getEffectivePsi(p);
    if (pVelocity > 0 && effPsi > 0) {
      const roundsNeeded = Math.ceil(effPsi / pVelocity);
      const estWinRound = currentRound + roundsNeeded;
      if (estWinRound < fastestPlayerWinRound) {
        fastestPlayerWinRound = estWinRound;
      }
    } else if (effPsi <= 0) {
      fastestPlayerWinRound = currentRound;
    }
  });
  const avgVelocityPerPlayer = totalDeflationVelocity / players.length;

  let estimatedEnd = 8; // baseline round 8 (typically 7-9)

  if (minPsi <= 18 || avgVelocityPerPlayer >= 4.0 || (hasPatriots && minPsi <= 24)) {
    estimatedEnd = 7;
  } else if (minPsi <= 26 || avgVelocityPerPlayer >= 3.0) {
    estimatedEnd = 8;
  } else if (minPsi >= 38 && avgVelocityPerPlayer < 2.0) {
    estimatedEnd = 9;
  }

  // If a player is on track to win before estimatedEnd, adjust
  if (fastestPlayerWinRound < estimatedEnd) {
    estimatedEnd = fastestPlayerWinRound;
  }

  // Eagles active inflation pushes game out towards Round 10 if table isn't already about to win immediately
  if (hasEagles && estimatedEnd > currentRound + 2) {
    estimatedEnd = Math.min(10, estimatedEnd + 1);
    const eaglesPlayer = players.find(p => getEffectiveTeamId(p) === 'eagles');
    if (eaglesPlayer && eaglesPlayer.coins >= 6) {
      estimatedEnd = Math.min(10, estimatedEnd + 1);
    }
  }

  return Math.max(currentRound + 1, Math.min(10, estimatedEnd));
};

export const calculate49ersIncomingCoins = (player, G, incomingCard = null) => {
  let incoming = 0;
  const ev = G?.board?.activeEvent;
  (player?.lineup || []).forEach(card => {
    if (!card || card.isPracticeSquad || card.uniqueId?.startsWith('ps_')) return;
    let coinMult = 1;
    if (ev?.category === 'double_all') coinMult *= 2;
    if (ev?.category === 'double_phase1' && card.phase === 1) coinMult *= 2;
    if (ev?.category === 'double_wr' && card.position === 'WR') coinMult *= 2;
    if (ev?.category === 'double_te' && card.position === 'TE') coinMult *= 2;
    if (card.ramsDoubleToken) coinMult *= 2;

    card.effects?.forEach(eff => {
      if (eff.perRound && eff.type === 'coins') {
        incoming += eff.amount * coinMult;
      }
    });
  });

  if (incomingCard) {
    let coinMult = 1;
    if (ev?.category === 'double_all') coinMult *= 2;
    if (ev?.category === 'double_phase1' && incomingCard.phase === 1) coinMult *= 2;
    if (ev?.category === 'double_wr' && incomingCard.position === 'WR') coinMult *= 2;
    if (ev?.category === 'double_te' && incomingCard.position === 'TE') coinMult *= 2;
    incomingCard.effects?.forEach(eff => {
      if (eff.perRound && eff.type === 'coins') {
        incoming += eff.amount * coinMult;
      }
    });
  }
  return incoming;
};

export const isRamsDoublingSuperstar = (card) => {
  if (!card || card.phase === 1 || card.isPracticeSquad) return { isSuperstar: false, type: 'none', value: 0 };
  const recurringDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
  const recurringCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

  // Primary target: 4+ deflate every round (Henry, Peterson, Mahomes, Jackson, McCaffrey, Barkley, Moore, Kelce, Lynch, HOF)
  // User directive: "A superstar player I would double in round 4 is 4 deflate every round or 5 coins every round. But usually you want to lean towards deflate over coins if you had to choose between the two for the ability."
  if (card.phase === 'hof' || recurringDeflate >= 4) return { isSuperstar: true, type: 'deflate', value: recurringDeflate || 7 };
  // Secondary target: 5+ coins every round (Jefferson, Chase, Lamb)
  if (recurringCoins >= 5) return { isSuperstar: true, type: 'coins', value: recurringCoins };

  return { isSuperstar: false, type: 'none', value: 0 };
};

export const doesCardFitTeamStrategy = (teamId, card, player, G) => {
  if (!card || !teamId) return false;
  if (teamId === 'browns') {
    return card.effects?.some(e => e.type === 'deflate');
  }
  if (teamId === 'texans') {
    return card.position === 'QB' && card.id !== 'deshaun_watson';
  }
  if (teamId === 'bengals') {
    return card.effects?.some(e => !e.perRound) || (card.position === 'QB' && card.effects?.some(e => !e.perRound));
  }
  if (teamId === 'packers') {
    return card.phase === 1;
  }
  if (teamId === 'jets') {
    const effMax = getEffectiveCardMaxBid(card, G?.board?.activeEvent);
    return effMax <= Math.max(8, player?.coins || 0) || card.effects?.some(e => e.type === 'deflate');
  }
  if (teamId === 'ravens') {
    const realStarters = (player?.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const existingPositions = new Set(realStarters.map(c => c.position));
    return !existingPositions.has(card.position);
  }
  if (teamId === '49ers') {
    const hasDeflate = card.effects?.some(e => e.type === 'deflate');
    const recCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    return hasDeflate && recCoins < 2;
  }
  if (teamId === 'saints') {
    return card.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0) || e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'colts') {
    const hasNegative = card.effects?.some(e => ((e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze')) || (!e.perRound && e.type === 'inflate'));
    const hasPositiveRecurring = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round' || e.type === 'deflate_every_round') && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0)));
    return !hasNegative && hasPositiveRecurring;
  }
  if (teamId === 'vikings') {
    if ((player?.psi || 44) >= 27) {
      return card.effects?.some(e => e.type === 'deflate' || (e.type === 'coins' && e.amount >= 2));
    }
    // Under 27 PSI: Franchise priority is strictly DEFLATION (ability already provides 2x coins)!
    return card.effects?.some(e => e.type === 'deflate');
  }
  if (teamId === 'seahawks') {
    return card.effects?.some(e => e.perRound || e.type === 'deflate');
  }
  if (teamId === 'eagles') {
    return card.effects?.some(e => (e.type === 'coins' && e.amount >= 2) || (e.type === 'deflate' && e.amount >= 2));
  }
  if (teamId === 'steelers') {
    return card.effects?.some(e => e.type === 'coins');
  }
  if (teamId === 'patriots') {
    return card.effects?.some(e => e.type === 'deflate');
  }
  if (teamId === 'bills') {
    return true; // BPA - Best Player Available
  }
  if (teamId === 'dolphins') {
    return card.effects?.some(e => e.type === 'deflate') || card.minBid <= (player?.coins || 0);
  }
  if (teamId === 'bears') {
    return card.effects?.some(e => e.type === 'deflate' || (e.type === 'coins' && e.amount >= 2));
  }
  if (teamId === 'lions') {
    const isFirst = G && Object.values(G.players || {}).every(p => !p.hasWonAuction);
    return isFirst || card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'chargers') {
    return card.effects?.some(e => e.type === 'coins' || e.type === 'deflate');
  }
  if (teamId === 'cowboys') {
    return card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'panthers') {
    return card.effects?.some(e => (e.type === 'coins' && e.amount >= 2) || (e.type === 'deflate' && e.amount >= 2));
  }
  if (teamId === 'rams') {
    if (card.phase !== 1) {
      const star = isRamsDoublingSuperstar(card);
      if (star.isSuperstar) return true;
      return card.effects?.some(e => e.perRound);
    }
    return card.effects?.some(e => e.perRound || (e.type === 'coins' && e.amount >= 2));
  }
  if (teamId === 'chiefs') {
    return card.effects?.some(e => e.type === 'deflate' && e.amount >= 2);
  }
  if (teamId === 'raiders') {
    return card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'commanders') {
    return card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'falcons') {
    return card.effects?.some(e => e.type === 'deflate' || (e.type === 'coins' && e.amount >= 2));
  }
  if (teamId === 'cardinals') {
    return card.effects?.some(e => (e.type === 'deflate' && (e.amount >= 2 || e.perRound)) || (e.type === 'coins' && e.amount >= 2));
  }
  if (teamId === 'titans') {
    return card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'jaguars') {
    const foresight = evaluateJaguarsEventForesight(G, player?.id);
    if (foresight?.upcomingDoublePhase1) {
      return card.phase === 1;
    }
    if (foresight?.upcomingDoubleAll) {
      return card.effects?.some(e => e.perRound);
    }
    return card.effects?.some(e => e.type === 'deflate' || e.type === 'coins');
  }
  if (teamId === 'broncos') {
    return card.effects?.some(e => !e.perRound) || 
           card.phase === 2 || 
           card.phase === 'hof' || 
           card.id === 'hunter_henry' || 
           card.id === 'ezekiel_elliott' ||
           card.id === 'brock_bowers' ||
           card.id === 'kirk_cousins' ||
           card.id === 'george_kittle';
  }
  if (teamId === 'buccaneers') {
    const copiedTeam = getEffectiveTeamId(player);
    return copiedTeam && copiedTeam !== 'buccaneers' ? doesCardFitTeamStrategy(copiedTeam, card, player, G) : true;
  }
  return false;
};

// Jacksonville Jaguars Event Foresight & Strategic Rearrangement Engine:
// "Look at the order of the event deck at any time. Once per game rearrange the order of the event deck."
export const evaluateJaguarsEventForesight = (G, jaguarsPlayerId) => {
  if (!G?.decks?.event) return null;
  const p = jaguarsPlayerId ? G.players?.[jaguarsPlayerId] : null;

  // Next round's event is G.decks.event[0], 2 rounds out is G.decks.event[1]
  const nextEvent = G.decks.event[0] || null;
  const inTwoRoundsEvent = G.decks.event[1] || null;

  // Cold Air position tracking
  const coldAirIndex = G.decks.event.findIndex(e => e && e.category === 'instant_deflate');
  const coldAirRoundsAway = coldAirIndex !== -1 ? (coldAirIndex + 1) : null;
  const upcomingColdAirSoon = (coldAirIndex === 0 || coldAirIndex === 1);

  return {
    nextEvent,
    inTwoRoundsEvent,
    coldAirIndex,
    coldAirRoundsAway,
    upcomingColdAirSoon,
    upcomingDoubleAll: nextEvent?.category === 'double_all' || inTwoRoundsEvent?.category === 'double_all',
    upcomingDoublePhase1: nextEvent?.category === 'double_phase1' || inTwoRoundsEvent?.category === 'double_phase1',
    upcomingDoubleDraft: nextEvent?.category === 'double_draft',
    upcomingDoubleDraftSoon: nextEvent?.category === 'double_draft' || inTwoRoundsEvent?.category === 'double_draft',
    upcomingFreeAgency: nextEvent?.category === 'free_agency',
    upcomingFreeAgencySoon: nextEvent?.category === 'free_agency' || inTwoRoundsEvent?.category === 'free_agency',
    upcomingHotAir: nextEvent?.category === 'instant_inflate' || inTwoRoundsEvent?.category === 'instant_inflate',
    upcomingLegendReturns: nextEvent?.category === 'legend_returns' || inTwoRoundsEvent?.category === 'legend_returns',
    upcomingLegendReturnsNext: nextEvent?.category === 'legend_returns',
    upcomingTradeRumors: nextEvent?.category === 'pass_right'
  };
};

export const shouldJaguarsRearrangeNow = (G, jaguarsPlayerId) => {
  if (G.board.jaguarsAbilityUsed) return false;
  const p = G.players[jaguarsPlayerId];
  if (!p) return false;
  const currentRound = G.board.round || 1;

  // Calculate Jaguars' current lineup deflation output
  const lineupDeflate = (p.lineup || []).reduce((sum, c) => {
    return sum + (c.effects || []).filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0);
  }, 0);

  // 1. Immediate Win Trigger:
  // If Cold Air (-7) plus lineup deflation reaches <= 0 PSI on this upcoming turn:
  const hasColdAir = G.decks.event.some(e => e && e.category === 'instant_deflate');
  if (hasColdAir && (p.psi - (lineupDeflate + 7) <= 0)) {
    return true; // WIN NOW!
  }

  // 2. Red Threat Defense (Anti-Loss Veto):
  // If an opponent has <= 6 PSI (or <= 8 in 8-10P) and about to win, and Jaguars is trailing:
  const activeOpponents = Object.keys(G.players).filter(id => id !== jaguarsPlayerId);
  const minOpponentPsi = Math.min(...activeOpponents.map(id => G.players[id]?.psi || 99));
  const hasHotAir = G.decks.event.some(e => e && e.category === 'instant_inflate');
  const numP = Object.keys(G.players).length;
  const threatThreshold = numP >= 8 ? 8 : 6;
  if (minOpponentPsi <= threatThreshold && p.psi > minOpponentPsi && hasHotAir) {
    return true; // Defend from loss with Hot Air!
  }

  // User Directive: "I think the best time to rearrange is based on where the game changing cards are in the deck.
  // I would label the following as game changing: Offensive battle, cold air, rookie class, raw talent, team legend returns."
  const gameChangingCats = ['double_all', 'instant_deflate', 'double_draft', 'double_phase1', 'legend_returns'];
  const top1 = G.decks.event[0];
  const top2 = G.decks.event[1];
  const isTop1GameChanger = top1 && gameChangingCats.includes(top1.category);
  const isTop2GameChanger = top2 && gameChangingCats.includes(top2.category);

  // 3. Misaligned Game-Changer on Top (Save it before it's wasted!):
  // - Offensive Battle on top in Round 1: No real engines yet, only practice squads! Save it for later!
  if (top1?.category === 'double_all' && currentRound === 1) {
    return true;
  }
  // - Cold Air on top in Round 1: Compresses game prematurely before engines can cook! Save it for closer!
  if (top1?.category === 'instant_deflate' && currentRound === 1) {
    return true;
  }
  // - Rookie Class on top when broke (< 6 coins or poorest player in Round 2+): Opponents will win both picks! Save it!
  const richestOppCoins = Math.max(...activeOpponents.map(id => G.players[id]?.coins || 0));
  if (top1?.category === 'double_draft' && currentRound >= 2 && (p.coins < 6 || p.coins < richestOppCoins)) {
    return true;
  }
  // - Cold Air on top when Jaguars is engine-heavy and trailing at high PSI:
  //   Compresses the game prematurely before engines can cook! Save it for when closer!
  const isEngineHeavy = (p.lineup || []).filter(c => !c.isPracticeSquad && c.id !== 'practice_squad' && !c.uniqueId?.startsWith('ps_') && (c.effects || []).some(e => e.perRound)).length >= 2;
  if (top1?.category === 'instant_deflate' && isEngineHeavy && p.psi > minOpponentPsi + 4 && p.psi >= 25) {
    return true;
  }

  // 4. Buried Game Changers (Neither top 1 nor top 2 is a game changer in Round 2+):
  // If the next 2 rounds are mediocre filler events while game changers are buried >= 3 cards deep:
  const hasGameChangersRemaining = G.decks.event.some(e => e && gameChangingCats.includes(e.category));
  if (!isTop1GameChanger && !isTop2GameChanger && hasGameChangersRemaining && currentRound >= 2 && currentRound <= 5) {
    return true; // Bring game changers forward!
  }

  // 5. Opportunistic Advantage Triggers (Round 2+):
  // - Coin Leader Seize: If Jaguars holds >= 8 coins and is richest, and Rookie Class is in deck but not on top:
  const hasRookieClass = G.decks.event.some(e => e && e.category === 'double_draft');
  if (hasRookieClass && p.coins >= 8 && p.coins > richestOppCoins && top1?.category !== 'double_draft' && currentRound >= 2 && currentRound <= 5) {
    return true;
  }

  // - Engine Maturity Seize: If Jaguars has 2+ real engines and Offensive Battle is in deck but not on top:
  const nonPsCount = (p.lineup || []).filter(c => !c.isPracticeSquad && c.id !== 'practice_squad' && !c.uniqueId?.startsWith('ps_')).length;
  const hasOffensiveBattle = G.decks.event.some(e => e && e.category === 'double_all');
  if (hasOffensiveBattle && nonPsCount >= 2 && top1?.category !== 'double_all' && currentRound >= 2 && currentRound <= 5) {
    return true;
  }

  // 6. Round 5 Deadline:
  // "Normally I would rearrange event cards by round 5, usually round 1,2,3,4,5. And then you can plan the whole game around the order you set."
  if (currentRound >= 5) {
    return true;
  }

  return false;
};

export const buildJaguarsMasterDeckOrder = (G, jaguarsPlayerId) => {
  const p = G.players[jaguarsPlayerId];
  const currentRound = G.board.round || 1;
  const remainingEvents = [...G.decks.event];

  // Helper to extract an event by category
  const takeEvent = (cat) => {
    const idx = remainingEvents.findIndex(e => e && e.category === cat);
    if (idx !== -1) {
      return remainingEvents.splice(idx, 1)[0];
    }
    return null;
  };

  // Game-Changing Cards (per user directive):
  // Offensive battle (double_all), Cold air (instant_deflate), Rookie class (double_draft),
  // Raw talent (double_phase1), Team legend returns (legend_returns), plus Hot air (instant_inflate)
  const offensiveBattle = takeEvent('double_all');
  const coldAir = takeEvent('instant_deflate');
  const rookieClass = takeEvent('double_draft');
  const rawTalent = takeEvent('double_phase1');
  const teamLegend = takeEvent('legend_returns');
  const hotAir = takeEvent('instant_inflate');

  const activeOpponents = Object.keys(G.players).filter(id => id !== jaguarsPlayerId);
  const minOpponentPsi = Math.min(...activeOpponents.map(id => G.players[id]?.psi || 99));
  const richestOppCoins = Math.max(...activeOpponents.map(id => G.players[id]?.coins || 0));
  const isCoinLeader = p.coins >= richestOppCoins && p.coins >= 8;
  const lineupDeflate = (p.lineup || []).reduce((sum, c) => sum + (c.effects || []).filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0), 0);
  const nonPsLineup = (p.lineup || []).filter(c => !c.isPracticeSquad && c.id !== 'practice_squad' && !c.uniqueId?.startsWith('ps_'));
  const engineCount = nonPsLineup.filter(c => (c.effects || []).some(e => e.perRound)).length;
  const instantCount = nonPsLineup.filter(c => (c.effects || []).some(e => !e.perRound && e.type === 'deflate')).length;
  const isBehindOnPsi = p.psi > minOpponentPsi + 4;

  // Immediate Win Check: Can Cold Air win immediately on turn 1?
  if (coldAir && (p.psi - (lineupDeflate + 7) <= 0)) {
    const reordered = [coldAir];
    if (offensiveBattle) reordered.push(offensiveBattle);
    if (teamLegend) reordered.push(teamLegend);
    if (rookieClass) reordered.push(rookieClass);
    if (rawTalent) reordered.push(rawTalent);
    if (hotAir) reordered.push(hotAir);
    return [...reordered, ...remainingEvents];
  }

  // Red Threat Defense: Opponent about to win? Put Hot Air first to inflate all opponents by +7!
  const numPlayers = Object.keys(G.players).length;
  const threatThreshold = numPlayers >= 8 ? 8 : 6;
  if (hotAir && minOpponentPsi <= threatThreshold && p.psi > minOpponentPsi) {
    const reordered = [hotAir];
    if (rookieClass) reordered.push(rookieClass);
    if (offensiveBattle) reordered.push(offensiveBattle);
    if (teamLegend) reordered.push(teamLegend);
    if (coldAir) reordered.push(coldAir);
    if (rawTalent) reordered.push(rawTalent);
    return [...reordered, ...remainingEvents];
  }

  // User Clock Management Directive:
  // "Hot Air makes the game longer, Cold air makes the game shorter, if you have a lot of reoccuring
  // engines and are behind on the coin/PSI race then Hot air is better to give you more time for your
  // engines to cook and out pace your opponents. The opposite is true as well if you have acquired a lot of
  // instants and are currently in the lead."
  const needsMoreTimeToCook = (engineCount >= 2 && isBehindOnPsi);
  const hasLeadAndWantsShorter = (!isBehindOnPsi && (p.psi <= 24 || instantCount >= 2));

  const plannedSequence = [];

  // Slot 1 (Immediate Next Round Event):
  if (needsMoreTimeToCook && hotAir) {
    plannedSequence.push(hotAir); // Extend the clock!
  } else if (hasLeadAndWantsShorter && coldAir) {
    plannedSequence.push(coldAir); // Shorten the clock / win immediately!
  } else if (isCoinLeader && rookieClass && currentRound <= 3) {
    plannedSequence.push(rookieClass); // Bully double draft with coin lead!
  } else if (currentRound <= 2 && rawTalent && nonPsLineup.some(c => c.phase === 1)) {
    plannedSequence.push(rawTalent); // Double Phase 1 cards!
  } else if (currentRound === 4 && teamLegend) {
    plannedSequence.push(teamLegend); // Round 4: Team legend returns for Round 5 HOF auction!
  } else if (currentRound >= 5 && offensiveBattle && engineCount >= 2) {
    plannedSequence.push(offensiveBattle); // Double mature engine!
  } else if (currentRound >= 5 && coldAir && p.psi <= 16) {
    plannedSequence.push(coldAir); // Closer mode!
  } else if (rookieClass && isCoinLeader) {
    plannedSequence.push(rookieClass);
  } else if (rawTalent && currentRound <= 3) {
    plannedSequence.push(rawTalent);
  }

  // Multi-Turn Synergy Combo: If Rookie Class in Slot 1, follow up with Offensive Battle in Slot 2!
  if (plannedSequence.includes(rookieClass) && offensiveBattle && !plannedSequence.includes(offensiveBattle)) {
    plannedSequence.push(offensiveBattle);
  }

  // Build the remaining strategic progression:
  // User Blueprint:
  // - Early (R2-3): Raw Talent, Rookie Class
  // - Mid (Round 4): Team Legend Returns (user directive: "Maybe you have legend returns on round 4 so you can get a HOF player on round 5 out.")
  // - Late Mid (Round 5): Offensive Battle (doubles full 3-player lineup + HOF superstar!)
  // - Endgame (Round 6+): Cold Air (guillotine closer)
  const remainingGameChangers = [
    { event: rawTalent, prefRound: 2 },
    { event: rookieClass, prefRound: 3 },
    { event: teamLegend, prefRound: 4 },
    { event: offensiveBattle, prefRound: 5 },
    { event: coldAir, prefRound: (hasLeadAndWantsShorter && p.psi <= 16) ? 4.5 : (isBehindOnPsi || numPlayers >= 8 ? 8 : 6.5) },
    { event: hotAir, prefRound: (needsMoreTimeToCook || isBehindOnPsi || numPlayers >= 8) ? 2.5 : 7 }
  ];

  remainingGameChangers.sort((a, b) => a.prefRound - b.prefRound);

  remainingGameChangers.forEach(item => {
    if (item.event && !plannedSequence.includes(item.event)) {
      plannedSequence.push(item.event);
    }
  });

  return [...plannedSequence, ...remainingEvents];
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

export const scoreCardForPlayer = (arg1, arg2, arg3) => {
  let G, playerID, card, p;
  if (arg1 && arg1.players) {
    // Called as (G, playerID, card)
    G = arg1;
    card = arg3;
    if (typeof arg2 === 'object') {
      p = arg2;
      playerID = G.players ? (Object.keys(G.players).find(k => G.players[k] === p) || '0') : '0';
    } else {
      playerID = String(arg2);
      p = G.players ? G.players[playerID] : null;
    }
  } else {
    // Called as (card, playerOrId, G)
    card = arg1;
    G = arg3;
    if (typeof arg2 === 'object') {
      p = arg2;
      playerID = G && G.players ? (Object.keys(G.players).find(k => G.players[k] === p) || '0') : '0';
    } else {
      playerID = String(arg2);
      p = G && G.players ? G.players[playerID] : null;
    }
  }

  if (!card) return -999;
  if (!p) return 0;
  const effectiveTeamId = getEffectiveTeamId(p);
  const archetype = getCpuArchetype(p, playerID);
  
  const currentRound = G?.board?.round || 1;
  const estimatedEndRound = G ? calculateEstimatedGameEndRound(G) : 10;
  const roundsLeft = Math.max(1, estimatedEndRound - currentRound);

  const teamGenome = p?.genome || G?.teamGenomes?.[effectiveTeamId] || ACTIVE_TEAM_GENOMES[effectiveTeamId] || BASELINE_TEAM_GENOMES[effectiveTeamId] || DEFAULT_GENOME;

  let deflateWeight = teamGenome.deflateWeight;
  let coinWeight = teamGenome.coinWeight;
  const recurringMult = teamGenome.recurringMult || 1.0;
  const synergyBonus = teamGenome.synergyBonus || 1.2;

  if (archetype === 'rusher') {
    deflateWeight *= 1.15;
    coinWeight *= 0.85;
  } else if (archetype === 'tycoon') {
    deflateWeight *= 0.85;
    coinWeight *= 1.25;
  } else if (archetype === 'bully') {
    deflateWeight *= 1.1;
    coinWeight *= 1.05;
  } else if (archetype === 'wildcard') {
    deflateWeight *= (0.9 + Math.random() * 0.2);
    coinWeight *= (0.9 + Math.random() * 0.2);
  }

  // Playtest 20 & 34 User Directive: Turns-to-Zero Countdown Calculus
  // Calculate exact turns until player reaches 0 PSI based on active roster engine
  let playerRecurringDeflate = 0;
  (p.lineup || []).forEach(c => {
    c.effects?.forEach(e => {
      if (e.perRound && e.type === 'deflate') playerRecurringDeflate += e.amount * (c.ramsDoubleToken ? 2 : 1);
    });
  });
  if (effectiveTeamId === 'panthers') playerRecurringDeflate += 2;
  if (effectiveTeamId === 'packers' && (p.lineup || []).every(c => c.phase === 1)) playerRecurringDeflate += 4;
  if (effectiveTeamId === '49ers' && ((p.coins || 0) + calculate49ersIncomingCoins(p, G)) < 5) playerRecurringDeflate *= 2;

  const personalTurnsToZero = playerRecurringDeflate > 0 ? Math.ceil(p.psi / playerRecurringDeflate) : 10;

  if (personalTurnsToZero <= 2 || p.psi <= 8) {
    deflateWeight *= 2.8;
    coinWeight *= 0.15;
  } else if (roundsLeft <= 2 || currentRound >= 8) {
    deflateWeight *= 2.4;
    coinWeight *= 0.35;
  } else if (currentRound >= 5) {
    deflateWeight *= 1.4;
    coinWeight *= 0.85;
  }

  // Hard constraints: Browns cannot gain coins under any circumstance
  if (effectiveTeamId === 'browns') {
    coinWeight = 0.0;
  }

  // Colts absolute rule: CANNOT replace players! Recurring negative cards are lethal!
  if (effectiveTeamId === 'colts') {
    const hasRecurringNegative = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze'));
    if (hasRecurringNegative) {
      return -100; // Strictly avoid poison!
    }
    if (currentRound <= 3) {
      // User Directive 4: Every round coins should be marginally prioritized early game over deflate, but not by much
      coinWeight = Math.max(coinWeight, deflateWeight * 1.10);
    }
  }

  // Deshaun Watson & Recurring Inflation:
  // For Saints: Saints is immune to inflation and negative coins, so Watson gives +5 coins/round with 0 penalty!
  // For Texans: User directive: "Have the texans evaluation be half as bad as other teams' evaluation for watson."
  // For all other teams: Watson's +4 inflate EVERY round is catastrophic (death sentence over 9 rounds).
  // Clean players like Xavier Legette (+2 coins) are valued significantly higher than Watson.
  if (card.id === 'deshaun_watson') {
    if (effectiveTeamId === 'saints') {
      // Saints gets full +5 coins/round benefit with zero inflation penalty
      const saintsWatsonCoins = 5 * roundsLeft * recurringMult;
      return Math.round((saintsWatsonCoins * coinWeight + 7.0) * 10) / 10;
    } else if (effectiveTeamId === 'texans') {
      return -25.0; // Half as bad as other teams (-50 / 2)
    } else {
      return -50.0; // Heavily negative: strictly de-prioritized behind Xavier Legette and clean cards!
    }
  }

  // Non-QB recurring inflation (e.g. Hunter Henry) avoidance for Texans:
  if (effectiveTeamId === 'texans') {
    const hasRecurringInflation = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && e.type === 'inflate');
    if (hasRecurringInflation) {
      return -50; // Strictly avoid non-QB recurring inflation (e.g. Hunter Henry)
    }
  }

  let totalDeflate = 0;
  let totalCoins = 0;

  if (card.effects) {
    card.effects.forEach(eff => {
      let amt = eff.amount || 0;
      const isRecurring = eff.perRound || eff.trigger === 'refresh' || eff.trigger === 'end_round' || eff.type === 'deflate_every_round' || eff.type === 'every_round';
      if (isRecurring) {
        // Bengals Ability: Can discard any acquired player instead of replacing a starter.
        // If a card has positive instant effect and negative recurring effect (e.g. Hunter Henry, Ezekiel Elliott),
        // Bengals discards the player immediately upon acquisition, completely avoiding the negative recurring effect!
        const isBengalsDiscardableNegative = (effectiveTeamId === 'bengals' && (eff.type === 'inflate' || (eff.type === 'coins' && amt < 0)) && card.effects?.some(e => !e.perRound));
        if (!isBengalsDiscardableNegative) {
          if (eff.type === 'deflate' || eff.type === 'deflate_every_round') totalDeflate += amt * roundsLeft * recurringMult;
          if (eff.type === 'coins') {
            if (amt < 0 && effectiveTeamId === 'saints') {
              // Saints ignores negative coins
            } else {
              totalCoins += amt * roundsLeft * recurringMult;
            }
          }
          if (eff.type === 'inflate') {
            if (effectiveTeamId !== 'saints') {
              totalDeflate -= amt * roundsLeft * recurringMult;
            }
          }
        }
      } else {
        // Bengals Ability: +2 coins/deflate for instant abilities
        if (effectiveTeamId === 'bengals' && (eff.type === 'deflate' || eff.type === 'coins')) {
          amt += 2;
        }
        if (eff.type === 'deflate') totalDeflate += amt;
        if (eff.type === 'coins') totalCoins += amt;
        if (eff.type === 'inflate' && effectiveTeamId !== 'saints') totalDeflate -= amt;
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

  // Universal Dual QB Recognition (Josh Allen, Jayden Daniels, Kirk Cousins, and top hybrid QBs):
  // User Directive: "Dual qbs should be high, like 8.5 or 9 pts. Make sure that every team in the game isn't undervalueing good qbs like josh allen or jayden daniels."
  // QBs that deliver BOTH deflation and coins provide premier two-way roster value in a single slot.
  const isCleanDualQb = card.position === 'QB' &&
    card.effects?.some(e => e.type === 'deflate' && e.amount > 0) &&
    card.effects?.some(e => e.type === 'coins' && e.amount > 0) &&
    !card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');

  if (isCleanDualQb) {
    rawScore += 8.5;
  }

  // Universal Cycle Strategy across ALL teams:
  // "Every turn [recurring] is better until you get 2 and then use the third spot to cycle."
  const recurringCardsInLineup = (p.lineup || []).filter(c =>
    !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') &&
    c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') &&
      ((e.type === 'deflate' && e.amount > 0) || (e.type === 'coins' && e.amount > 0)))
  ).length;

  const cardHasPositiveRecurring = card.effects?.some(e =>
    (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') &&
    ((e.type === 'deflate' && e.amount > 0) || (e.type === 'coins' && e.amount > 0))
  );

  const cardIsPureInstant = card.effects?.length > 0 && card.effects?.every(e => !e.perRound && e.trigger !== 'refresh' && e.type !== 'every_round');

  if (recurringCardsInLineup < 2) {
    // Stage 1 of Cycle Strategy: Lock in the 2 recurring engine anchors
    if (cardHasPositiveRecurring) {
      rawScore += 4.5;
    } 
  } else {
    // Stage 2 of Cycle Strategy: 2 core engines active -> 3rd spot is the Cycle Spot!
    if (cardIsPureInstant) {
      rawScore += 2.5; // Valued properly as an active cycle weapon
    }
  }

  // Playtest 20: Isaiah Pacheco Expected Value (Draws fresh card from active era deck)
  if (card.id === 'isaiah_pacheco') {
    if (currentRound >= 7) {
      rawScore += 40.0; // HOF deck
    } else if (currentRound >= 4) {
      rawScore += 28.0; // Phase 2 deck
    } else {
      rawScore += 18.0; // Phase 1 deck
    }
  }

  // Playtest 20: Puka Nacua Expected Value (Copies teammate's recurring effect each round)
  if (card.id === 'puka_nacua') {
    const bestLineupDeflate = p.lineup?.reduce((max, c) => {
      const d = (c.effects || []).filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0);
      return Math.max(max, d);
    }, 0) || 0;
    const bestLineupCoins = p.lineup?.reduce((max, c) => {
      const co = (c.effects || []).filter(e => e.perRound && e.type === 'coins').reduce((sum, e) => sum + e.amount, 0);
      return Math.max(max, co);
    }, 0) || 0;
    const estCopyValue = Math.max(16.0, (bestLineupDeflate * deflateWeight + bestLineupCoins * coinWeight) * roundsLeft);
    rawScore += estCopyValue;
  }

  // Universal Elite Powerhouses (HOF Legends, Mahomes, Kelce, McCaffrey, Lamar Jackson, Jefferson, 3+ Recurring Engines)
  // Per user directive: These cards are so strong that only a few cards can compare.
  // They are a high priority for ALL teams regardless of franchise strategy, and naturally contested by the richest players!
  const hasBigRecurringDeflate = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3);
  const hasBigRecurringCoins = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount >= 3);
  const hasRecurringInflation = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
  const hasInstantInflation = card.effects?.some(e => !e.perRound && e.type === 'inflate' && e.amount > 0);
  const isTier1Elite = (
    !hasRecurringInflation && !hasInstantInflation && (
      card.phase === 'hof' || 
      card.id === 'patrick_mahomes' || 
      card.id === 'travis_kelce' || 
      card.id === 'christian_mccaffrey' || 
      card.id === 'lamar_jackson' || 
      card.id === 'justin_jefferson' || 
      hasBigRecurringDeflate || 
      (hasBigRecurringCoins && effectiveTeamId !== 'browns')
    )
  );

  const superstarMult = teamGenome?.superstarPriorityMult || 1.0;
  if (card.phase === 'hof') {
    rawScore = Math.max(rawScore, 24.0) * superstarMult;
  } else if (card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'christian_mccaffrey') {
    rawScore = Math.max(rawScore, 20.0) * superstarMult;
  } else if (isTier1Elite) {
    rawScore = Math.max(rawScore, 18.0) * superstarMult;
  }

  // Franchise synergies:
  if (effectiveTeamId === 'texans' && card.position === 'QB') {
    rawScore += 10.0;
  }
  if (effectiveTeamId === '49ers') {
    const incomingCoins = calculate49ersIncomingCoins(p, G, card);
    const hasDeflateInLineup = (p.lineup || []).some(c => c.effects?.some(e => e.perRound && e.type === 'deflate')) || card.effects?.some(e => e.perRound && e.type === 'deflate');
    const cardRecDeflate = card.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    // Double deflation multiplier: 49ers doubles deflation when under 5 coins, so recurring deflation is 2x value!
    if (cardRecDeflate > 0) {
      rawScore += cardRecDeflate * 4.0;
    }

    // Heavily penalize recurring coins that ruin the under-5-coins double deflation threshold
    if (cardRecCoins >= 2) {
      rawScore -= (cardRecCoins * 4.0);
    } else if (cardRecCoins === 1) {
      rawScore -= 2.0;
    }

    // Urgency to spend down below 5 coins on deflation cards
    if (hasDeflateInLineup && (p.coins || 0) + incomingCoins >= 5) {
      rawScore += 8.0;
    }
  }
  if (effectiveTeamId === 'saints') {
    const hasDrawback = card.effects?.some(e => (e.type === 'coins' && e.amount < 0) || e.type === 'inflate');
    if (hasDrawback) {
      rawScore += 7.0; // Drawback exploiter: zero penalty, great bargain
    }

    // Closer awareness: When Saints is in striking distance of 0 PSI (psi <= 16),
    // an instant closer that clinches the championship gets top priority over toxic coin generators!
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    if (instDeflate >= p.psi && p.psi <= 16) {
      rawScore += 35.0;
    } else if (p.psi <= 16 && instDeflate >= 3) {
      rawScore += 8.0;
    }

    // Best Player Available (BPA) & No Target Lock:
    // User directive: "You should still value the second toxic card a lot.
    // Diminishing Returns on Duplicate Positions: If Saints already owns a toxic QB (Watson or Lawrence),
    // do NOT overvalue a second QB; evaluate board needs normally.
    // You are basically taking the best player available and usually thats the toxic card."
    const hasToxicQbInLineup = (p.lineup || []).some(c => c && (c.id === 'deshaun_watson' || c.id === 'trevor_lawrence'));
    if (hasToxicQbInLineup && card.position === 'QB' && (card.id === 'deshaun_watson' || card.id === 'trevor_lawrence')) {
      rawScore -= 5.0; // Still high value, but allows elite skill position players (Bowers, Jefferson, Henry) to compete
    }

    const isSuperstar = (card.phase === 'hof' || card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'brock_bowers' || card.id === 'christian_mccaffrey' || card.id === 'justin_jefferson');
    if (isSuperstar && !hasDrawback) {
      rawScore += 4.0; // Superstars evaluated alongside toxic cards as top BPA candidates
    }
  }
  if (effectiveTeamId === 'colts') {
    const isPoison = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze'));
    if (isPoison) {
      return -100.0;
    }
    const hasInstantInflation = card.effects?.some(e => !e.perRound && e.type === 'inflate');
    const hasCleanRecurring = !hasInstantInflation && card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round' || e.type === 'deflate_every_round') && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0)));
    const isPureInstant = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound && e.trigger !== 'refresh' && e.trigger !== 'end_round' && e.type !== 'every_round' && e.type !== 'deflate_every_round');
    const isCloser = (p.psi <= 16) || (card.effects?.some(e => !e.perRound && e.type === 'deflate' && (p.psi - e.amount <= 0)));

    if (hasCleanRecurring) {
      rawScore += 8.0; // Infinite lineup permanent expansion
      // User Directive 3: Cheap clean recurring engine bonus
      // Other teams face replacement opportunity cost, but Colts gains full benefit permanently
      const recCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (card.minBid <= 3 && card.maxBid <= 8 && (recCoins <= 2 && recDeflate <= 1)) {
        rawScore += 4.0;
      }
      // User Directive 4: Early Game (Rounds 1-3) Marginal Coin Priority
      if (currentRound <= 3 && recCoins > 0 && recDeflate === 0) {
        rawScore += 6.0;
      }
    } else if (hasInstantInflation) {
      // User Directive: Cards with instant inflation (like Trevor Lawrence +8 inflate) are NOT poison like Zeke/Henry,
      // but they are NOT high-priority stars either. Score realistically without the recurringMult boost on net output,
      // accounting for the heavy upfront setback.
      const instantInflateAmount = card.effects?.filter(e => !e.perRound && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const netLifetimeDeflate = (recDeflate * roundsLeft) - (instantInflateAmount * 1.25);
      rawScore = Math.max(5.0, netLifetimeDeflate * deflateWeight * 0.75);
    } else if (isPureInstant && currentRound <= 5 && !isCloser) {
      // User Directive 2: Early game recurring focus - de-prioritize pure instants unless close to winning
      rawScore *= 0.25;
    }
  }
  if (effectiveTeamId === 'packers') {
    const roundsLeft = Math.max(1, 10 - currentRound);
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recDeflate = card.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const instCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    const realStarters = (p.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const hasOnlyPhase1 = realStarters.length > 0 && realStarters.every(c => c.phase === 1);
    const hasAnyPracticeSquad = (p.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));

    // 1. Instant closer check: if card instantly deflates Packers to 0 PSI, unconditionally outweighs!
    if (instDeflate >= p.psi) {
      rawScore += 35.0;
    } else if (card.phase === 1) {
      // User Directive: "value the best phase 1 players more than the not good ones"
      // User Directive: "Malik Nabers would not be a super good one unless it is in the third spot. See you need to get your practice squad players replaced as fast as possible, so instants don't do much the first two round. since you can't replace them . Dual qbs should be high, like 8.5 or 9 pts."
      const isThirdSpot = realStarters.length >= 2;
      const isEliteEngine = (card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'kirk_cousins');
      const isDualQb = card.position === 'QB' &&
        card.effects?.some(e => e.type === 'deflate' && e.amount > 0) &&
        card.effects?.some(e => e.type === 'coins' && e.amount > 0) &&
        !card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');

      if (isEliteEngine) {
        rawScore += 12.0; // Tier 1 centerpiece
      } else if (isDualQb) {
        rawScore += 9.0;  // User Directive: "Dual qbs should be high, like 8.5 or 9 pts" (Josh Allen, Jayden Daniels)
      } else if (recDeflate >= 2) {
        rawScore += 8.5;  // Tier 1 recurring deflaters (Goedert, LaPorta, Ertz, Andrews, Hockenson, Pitts, Waller)
      } else if (recCoins >= 3) {
        rawScore += 6.5;  // Tier 1 recurring coin generators (London, Higgins, AJ Brown, Cooper)
      } else if (card.id === 'malik_nabers' || card.id === 'rome_odunze') {
        // User Directive: "Malik Nabers would not be a super good one unless it is in the third spot"
        // In the first two spots (Rounds 1 & 2), instant cards do not establish a recurring engine.
        // In the 3rd spot, they complete the 3-Phase-1 lineup to activate the -4 deflation and inject coins!
        rawScore += isThirdSpot ? 6.5 : 1.5;
      } else if (recDeflate >= 1 || recCoins >= 2) {
        rawScore += 4.5;  // Tier 2 solid utility
      } else if (instDeflate >= 3) {
        rawScore += isThirdSpot ? 4.0 : 1.5;
      } else {
        rawScore += 1.0;  // Tier 3 vanilla
      }
    } else {
      // Card is Phase 2 or HOF:
      // User Directive: "Have green bay target phase 2 or HOF players if it outweighs the benefits of the 4 deflate"
      const forfeitsAbility = hasOnlyPhase1 || (realStarters.length < 3 && realStarters.every(c => c.phase === 1));

      if (forfeitsAbility) {
        const lostDeflate = 4 * roundsLeft;
        const cardNetLifetimeDeflate = instDeflate + (recDeflate * roundsLeft);
        const cardNetLifetimeCoins = instCoins + (recCoins * roundsLeft);

        let replacedDeflate = 0;
        let replacedCoins = 0;
        if (!hasAnyPracticeSquad && realStarters.length >= 3) {
          const weakest = realStarters[realStarters.length - 1];
          const wInstD = weakest.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const wRecD = weakest.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const wRecC = weakest.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
          replacedDeflate = wInstD + (wRecD * roundsLeft);
          replacedCoins = wRecC * roundsLeft;
        }

        const netDeflateGain = cardNetLifetimeDeflate - replacedDeflate;
        const netCoinGain = cardNetLifetimeCoins - replacedCoins;
        const netAdvantage = (netDeflateGain + (netCoinGain * 0.4)) - lostDeflate;

        const outweighs = netAdvantage > 0 || (roundsLeft <= 2 && instDeflate >= 6);

        if (outweighs) {
          rawScore += Math.max(4.0, netAdvantage * 1.5);
        } else {
          rawScore = -25.0; // Does not outweigh: protect the 4-deflate/round engine!
        }
      } else {
        rawScore *= 1.0;
      }
    }
  }
  if (effectiveTeamId === 'jets') {
    const effMax = getEffectiveCardMaxBid(card, G.board?.activeEvent);
    const instantDeflateWorth = 4.0 * (deflateWeight || 3.5);
    
    // User Directive 1: Small Max-Bid Players Focus
    // E.g. Malik Nabers, Rome Odunze: max 3 for 5 instant coins (net +2 coins AND deflates 4 PSI)
    const instantCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    if (effMax <= 3 && instantCoins >= 4) {
      rawScore += 16.0; // Premier instant gem: pays <=3, nets +2 profit and 4 deflation
    } else if (effMax <= 3) {
      rawScore += 10.0;
    } else if (effMax <= 5) {
      rawScore += 6.5;
    } else if (effMax <= 8) {
      rawScore += 3.5;
    }

    // Efficiency bonus for low buyout costs
    const efficiencyBonus = Math.max(0, (14 - effMax) * 0.75);
    if (p.coins >= effMax) {
      rawScore += (instantDeflateWorth * 0.5) + efficiencyBonus;
    }

    // User Directive 2: Early Round Practice Squad vs Economic Engine Awareness
    // While buying instant cards in round 1/2 delays replacing a practice squad player,
    // for Jets it is less bad because of the -4 PSI bonus.
    // However, if cash-poor (<= 6 coins) in early rounds (1-3), boost recurring coin generators
    // so Jets builds a sustainable cash engine and avoids spending 30% of rounds broke!
    const round = G.board?.round || 1;
    if (round <= 3 && p.coins <= 6) {
      const recurringCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      if (recurringCoins >= 2) {
        rawScore += 5.5; // Secure early recurring economy
      }
    }
  }
  if (effectiveTeamId === 'dolphins') {
    const hasRecurringInflation = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
    if (hasRecurringInflation) {
      return -50;
    }

    // 1. Instant Coin Rockets (Malik Nabers, Deebo Samuel, Chris Olave, Keenan Allen, George Pickens, Marvin Harrison Jr.):
    // Only cards where instant coin payout substantially exceeds cost to create a massive single-round cash spike:
    const instantCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const effMax = getEffectiveCardMaxBid(card, G.board?.activeEvent);
    const instantMultiplier = teamGenome?.dolphinsInstantCoinMult !== undefined ? teamGenome.dolphinsInstantCoinMult : 3.0;
    const instantBaseBonus = teamGenome?.dolphinsInstantCoinBase !== undefined ? teamGenome.dolphinsInstantCoinBase : 12.0;
    if (instantCoins >= 4 && instantCoins > effMax) {
      rawScore += (instantCoins * instantMultiplier) + instantBaseBonus;
    }

    // 2. Heavy Recurring Deflation Priority (45 starting PSI burden):
    // Dolphins has base income covered by the 3-coin bailout floor, so roster slots must be heavy deflation engines.
    const recurringDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recurringDeflateBonus = teamGenome?.dolphinsRecurringDeflateBonus !== undefined ? teamGenome.dolphinsRecurringDeflateBonus : 5.0;
    if (recurringDeflate >= 2) {
      rawScore += recurringDeflate * recurringDeflateBonus * roundsLeft;
    }

    // 3. Heavy Instant Deflation Nukes (Aaron Jones, Kenneth Walker, etc.):
    const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const instantDeflateBonus = teamGenome?.dolphinsInstantDeflateBonus !== undefined ? teamGenome.dolphinsInstantDeflateBonus : 4.0;
    if (instantDeflate >= 4) {
      rawScore += instantDeflate * instantDeflateBonus;
    }

    // 4. De-prioritize pure recurring coin cards (avoid clogging 3-slot lineup with weak income):
    const pureRecurringCoins = card.effects?.every(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins');
    const pureRecurringMult = teamGenome?.dolphinsPureCoinMult !== undefined ? teamGenome.dolphinsPureCoinMult : 0.40;
    if (pureRecurringCoins) {
      rawScore *= pureRecurringMult;
    }
  }
  if (effectiveTeamId === 'lions') {
    const isFirstPlayerOfRound = G && Object.values(G.players || {}).every(pl => !pl.hasWonAuction);
    if (isFirstPlayerOfRound) {
      const numP = Object.keys(G.players || {}).length;
      rawScore += numP * (coinWeight || 1.0);
    }
  }
  if (effectiveTeamId === 'rams' && !p.ramsTokenAttached) {
    const starInfo = isRamsDoublingSuperstar(card);
    if (starInfo.isSuperstar) {
      // User directive: "A superstar player I would double in round 4 is 4 deflate every round or 5 coins every round. But usually you want to lean towards deflate over coins if you had to choose between the two for the ability."
      if (starInfo.type === 'deflate') {
        rawScore += 28.0 + (starInfo.value * 4.0);
      } else if (starInfo.type === 'coins') {
        rawScore += 18.0 + (starInfo.value * 2.5);
      }
    } else if (card.phase !== 1) {
      const recurringDeflate = card.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0;
      const recurringCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((sum, e) => sum + e.amount, 0) || 0;
      if (recurringDeflate >= 2 || recurringCoins >= 2) {
        rawScore += (recurringDeflate * 2.5) + (recurringCoins * 1.2);
      }
    }
  }
  if (effectiveTeamId === 'steelers') {
    const activeOpponents = Object.keys(G.players || {}).filter(id => id !== playerID);
    const maxOppCoins = activeOpponents.length > 0 ? Math.max(...activeOpponents.map(id => G.players[id]?.coins || 0)) : 0;
    const coinMargin = (p.coins || 0) - maxOppCoins;
    
    const currentRound = G.board?.round || 1;
    const estimatedEnd = calculateEstimatedGameEndRound(G);
    const roundsRemaining = Math.max(1, estimatedEnd - currentRound + 1);

    const cardRecurringCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const cardInstantCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecurringDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardInstantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;

    // If Steelers has a comfortable coin lead (>= 4 coins ahead of everyone),
    // they don't need excessive coin hoarding; pivot value to deflation and efficiency!
    if (coinMargin >= 4) {
      rawScore += (cardInstantDeflate * 3.5) + (cardRecurringDeflate * 4.0);
      if (cardRecurringCoins > 0) rawScore += cardRecurringCoins * 2.0;
    } else {
      // In a tight race or trailing: compounding coin engines are high priority to establish richest dominance
      const lifetimeCoins = cardInstantCoins + (cardRecurringCoins * roundsRemaining);
      rawScore += lifetimeCoins * 2.5;
      rawScore += (cardInstantDeflate * 2.0) + (cardRecurringDeflate * 2.5);
    }
  }
  if (effectiveTeamId === 'patriots') {
    // 1. Pump & Dump Valuation:
    // Hunter Henry deflates 8, inflates 3 once, then is cut next auction -> Net +5 deflation!
    // Ezekiel Elliott deflates 5, loses 2 coins once, then is cut next auction -> Net +5 deflation / -2 coins.
    // In Turn 1 or 2, keeping a practice squad player around another round delays permanent lineup development.
    const r12Penalty = (currentRound <= 2) ? 3.5 : 0;
    if (card.id === 'hunter_henry') {
      rawScore = (5.0 * deflateWeight) + 4.5 - r12Penalty;
    } else if (card.id === 'ezekiel_elliott') {
      rawScore = (5.0 * deflateWeight) - (2.0 * coinWeight) + 4.5 - r12Penalty;
    } else {
      const hasDeflate = card.effects?.some(e => e.type === 'deflate');
      if (hasDeflate) rawScore += 4.5;
    }

    // 2. Round 1 Premier Centerpiece Evaluation:
    // Fearlessly pursue game-defining engines (Bowers, Cousins, Kittle, 3+ coins/round)
    if (currentRound === 1) {
      const isPremierR1Centerpiece = (
        card.id === 'brock_bowers' || 
        card.id === 'kirk_cousins' || 
        card.id === 'george_kittle' || 
        card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3)
      );
      if (isPremierR1Centerpiece) {
        rawScore += 12.0;
      }
    }

    // 3. Distance-to-Zero Endgame Closer Acceleration:
    // Starting at 36 PSI, when Patriots reaches <= 18 PSI, instant deflation nukes are game closers!
    if ((p.psi || 36) <= 18) {
      const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instantDeflate >= 3) {
        rawScore += instantDeflate * 3.5;
      }
    }
  }
  if (effectiveTeamId === 'broncos') {
    // 1. Pump & Dump Tactical Exploitation:
    // Hunter Henry deflates 8, and the +3 inflation is completely IGNORED during the first refresh!
    // Ezekiel Elliott deflates 5, and the -2 coins is completely IGNORED during the first refresh!
    // When cycled out in subsequent rounds, Broncos captures massive instant deflation with zero ongoing penalty!
    const r12Penalty = (currentRound <= 2) ? 3.0 : 0;
    if (card.id === 'hunter_henry') {
      rawScore = (6.0 * deflateWeight) + 5.0 - r12Penalty;
    } else if (card.id === 'ezekiel_elliott') {
      rawScore = (5.0 * deflateWeight) - (1.0 * coinWeight) + 4.0 - r12Penalty;
    } else {
      // 2. The 1-Round Onboarding Delay on Recurring Engines:
      // The first refresh after purchase skips every-turn abilities.
      // Therefore, recurring cards only produce for (roundsLeft - 1) rounds instead of roundsLeft!
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const recCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      if (recDeflate > 0 || recCoins > 0) {
        rawScore -= (recDeflate * deflateWeight) + (recCoins * coinWeight);
        // Late-game recurring penalty (Rounds 4+): with games ending ~R6-7 and 1 refresh skipped, recurring cards have low ROI
        const isSuperstar = card.phase === 'hof' || card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || recDeflate >= 3;
        if (currentRound >= 4 && !isSuperstar) {
          rawScore *= 0.65;
        }
      }

      // 3. Instant Cards Suffer ZERO Delay:
      // Instant deflation directly attacks Broncos' 40 starting PSI without missing a beat!
      const instDef = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const instCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      if (instDef > 0) {
        rawScore += (instDef * deflateWeight * 1.35) + 4.0;
      }
      if (instCoins >= 4 && (p.coins || 20) <= 8) {
        rawScore += 4.0;
      }
    }

    // 4. Round 1-2 20-Coin Bully Centerpiece Conviction:
    // Starting with 20 coins and 40 PSI, fearlessly secure elite deflation anchors early!
    if (currentRound <= 2) {
      const isAnchor = (
        card.id === 'brock_bowers' ||
        card.id === 'kirk_cousins' ||
        card.id === 'george_kittle' ||
        card.phase === 'hof' ||
        card.effects?.some(e => e.perRound && e.type === 'deflate' && e.amount >= 2)
      );
      if (isAnchor) {
        rawScore += 10.0;
      }
    }

    // 5. Distance-to-Zero Endgame Closer Acceleration (40 PSI baseline):
    if ((p.psi || 40) <= 16) {
      const instDef = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instDef >= 3) {
        rawScore += instDef * 3.5;
      }
    }
  }
  if (effectiveTeamId === 'chiefs') {
    // 1. Franchise Icons: Patrick Mahomes, Travis Kelce, Tony Gonzalez
    if (card.id === 'patrick_mahomes') {
      rawScore += 20.0;
    } else if (card.id === 'travis_kelce') {
      rawScore += 18.0;
    } else if (card.id === 'tony_gonzalez') {
      rawScore += 18.0;
    }

    // 2. Phase 2 Instant Closers if close to winning soon (<= 18 PSI)
    if ((p.psi || 46) <= 18) {
      const instDef = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instDef >= 4) {
        rawScore += instDef * 3.5;
      }
    }

    // 3. Conditional Coin Engines (CeeDee Lamb, Justin Jefferson, Ja'Marr Chase)
    if ((card.id === 'ceedee_lamb' || card.id === 'justin_jefferson' || card.id === 'jamarr_chase') && (p.coins || 9) <= 6) {
      rawScore += 6.0;
    }
  }
  if (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId)) {
    // Roster Complementarity & Engine Deficit Check:
    // If team lacks a recurring coin engine in Round 2+, heavily boost coin engines (+1.4x equivalent).
    // If team lacks a recurring deflation engine, heavily boost deflation!
    const realStarters = (p.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const recCoinsInLineup = realStarters.reduce((sum, c) => sum + (c.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0), 0);
    const recDeflateInLineup = realStarters.reduce((sum, c) => sum + (c.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0), 0);

    const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;

    const currentRound = G.board?.round || 1;
    if (recCoinsInLineup === 0 && currentRound >= 2 && cardRecCoins >= 2 && effectiveTeamId !== 'browns') {
      rawScore += cardRecCoins * 3.5;
    } else if (recDeflateInLineup === 0 && currentRound >= 2 && cardRecDeflate >= 2) {
      rawScore += cardRecDeflate * 3.5;
    } else if (recCoinsInLineup >= 5 && cardRecCoins > 0 && cardRecDeflate === 0) {
      rawScore *= 0.75;
    } else if (recDeflateInLineup >= 6 && cardRecDeflate > 0 && cardRecCoins === 0) {
      rawScore *= 0.75;
    }
  }
  if (effectiveTeamId === 'vikings') {
    const psi = p.psi || 44;
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const instCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    // 1. Instant closer check: if card instantly deflates Vikings to 0 PSI, unconditionally win!
    if (instDeflate >= psi) {
      rawScore += 35.0;
    } else if (psi >= 27) {
      // Phase 1 (PSI >= 27): Urgent sprint to crack 27 PSI barrier and unlock 2x coins!
      if (recDeflate >= 2) {
        rawScore += 8.5; // Tier 1 recurring deflaters (Bowers, Kittle, Goedert, LaPorta)
      } else if (instDeflate >= 3) {
        rawScore += 6.0; // Fast deflation bursts (Josh Allen, Jayden Daniels, Cousins, Bijan)
      } else if (recDeflate >= 1) {
        rawScore += 4.0;
      }
    } else {
      // Phase 2 (PSI < 27): Economic Superpower mode!
      // Ability ALREADY doubles all coin income!
      // Convert massive coin surplus into heavy deflation engines and closer nukes.
      // Strictly avoid buying dead-end coin cards that cause coin clutter!
      if (instCoins > 0 && recDeflate === 0 && instDeflate === 0) {
        rawScore -= 5.0; // Reject raw instant coins (Vikings already has infinite coins)
      }
      if (recDeflate >= 3 || card.phase === 'hof') {
        rawScore += 12.0; // Premier deflation engines & HOF legends (Brady, Manning, Favre)
      } else if (recDeflate >= 2) {
        rawScore += 8.5;  // Core recurring deflaters
      } else if (instDeflate >= 5) {
        rawScore += 10.0; // Big closer nukes (Aaron Jones, Tony Pollard, Derrick Henry)
      } else if (instDeflate >= 3) {
        rawScore += 6.0;
      }
    }
  }
  if (effectiveTeamId === 'eagles') {
    // Check if Saints is in the game and is top contender
    const saintsPlayer = G?.players ? Object.values(G.players).find(pl => getEffectiveTeamId(pl) === 'saints') : null;
    let isSaintsTopContender = false;
    if (saintsPlayer && G?.players) {
      const allPsi = Object.values(G.players).map(pl => pl.psi || 40);
      const minPsi = Math.min(...allPsi);
      if ((saintsPlayer.psi || 40) <= minPsi + 1) {
        isSaintsTopContender = true;
      }
    }

    if (isSaintsTopContender) {
      // Play like a normal team: focus directly on deflation
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (recDeflate >= 2) rawScore += 5.0;
    } else {
      // Normal Eagles doctrine: Need 1 deflation card, 1 coin card. Balance is key. Value coins over deflation.
      const realStarters = (p.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
      const hasLineupRecDeflate = realStarters.some(c => c.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate' && e.amount > 0));
      const hasLineupRecCoins = realStarters.some(c => c.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins' && e.amount > 0));

      const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      const cardCoinsTotal = card.effects?.filter(e => e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

      if (!hasLineupRecDeflate && cardRecDeflate >= 2) {
        rawScore += 5.5; // High urgency: must secure at least 1 deflation anchor!
      }
      if (!hasLineupRecCoins && cardRecCoins >= 2) {
        rawScore += 6.0; // High urgency: must secure at least 1 coin engine!
      }

      // Value coins over deflation to fuel constant Tush Push
      if (cardCoinsTotal >= 2) {
        rawScore += cardCoinsTotal * 1.5;
      }
    }
  }

  if (effectiveTeamId === 'commanders') {
    // Avoid self-inflation poison (Trevor Lawrence +8 inflate, Hunter Henry +3 recurring inflate)
    const instInflate = card.effects?.filter(e => !e.perRound && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recInflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
    if (instInflate > 0) rawScore -= (instInflate * 30.0 + 100.0); // Severe poison penalty: never ruin 43 starting PSI
    if (recInflate > 0) rawScore -= (recInflate * 40.0 + 100.0);
  }
  if (effectiveTeamId === 'cowboys') {
    if (card.effects?.some(e => e.type === 'deflate' && e.amount >= 2)) rawScore += 3.5;
  }
  if (effectiveTeamId === 'panthers') {
    // User directive: "Panthers: Reoccuring deflate engine already. They like it when the game goes longer
    // since it gives them more time to catch up. Besides that probably normal values, but check to see."
    // When game goes longer, recurring deflation stacks with passive -2 PSI/rd to generate 4-5 PSI/rd engine!
    const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    if (recDeflate >= 2) {
      rawScore += 6.0; // Stacks with passive ability for unstoppable late-game snowball
    } else if (recDeflate === 1) {
      rawScore += 3.0;
    }

    // Closer awareness: When PSI <= 16, instant deflation closer allows Panthers to strike the winning blow!
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    if (instDeflate >= p.psi && p.psi <= 16) {
      rawScore += 35.0;
    } else if (p.psi <= 16 && instDeflate >= 3) {
      rawScore += 8.0;
    }
  }
  if (effectiveTeamId === 'ravens') {
    const realStarters = (p.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const existingPositions = new Set(realStarters.map(c => c.position));
    const hasPracticeSquad = (p.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));

    // 1. Permanent Starter Focus in Rounds 1-2:
    // Ravens wants to clear Practice Squad scrubs with permanent keepers.
    // Avoid toxic drawback cards (Hunter Henry, Zeke) and pure instant cards early.
    const isPureInstant = card.effects?.length > 0 && card.effects?.every(e => !e.perRound);
    const hasDrawback = card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate'));
    if (currentRound <= 2) {
      if (hasDrawback) rawScore -= 8.0;
      else if (isPureInstant) rawScore -= 4.0;
    }

    // 2. Round 1 Star Anchor Player:
    // With 14 coins, Ravens wants to spend ~9 coins on an elite permanent player
    if (currentRound === 1) {
      const isEliteR1Star = (
        card.id === 'brock_bowers' || 
        card.id === 'george_kittle' || 
        card.id === 'kirk_cousins' || 
        card.id === 'drake_london' || 
        card.id === 'tee_higgins' || 
        card.id === 'josh_allen' || 
        card.id === 'greg_olsen' || 
        card.id === 'aj_brown' ||
        card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2)))
      );
      if (isEliteR1Star) rawScore += 8.0;
    }

    // 3. 3-Position Engine Evaluation:
    // If this card is the 3rd distinct position, it unlocks +3 coins/round for the rest of the game!
    if (!existingPositions.has(card.position)) {
      if (existingPositions.size === 2) {
        // The Golden Key: completes 3 distinct positions!
        const engineBonus = 3.0 * (coinWeight || 1.1) * Math.min(6, roundsLeft);
        rawScore += engineBonus;
      } else if (existingPositions.size === 1) {
        // 2nd distinct position: strong stepping stone
        rawScore += 5.0;
      } else {
        // 1st position (Round 1)
        rawScore += 2.0;
      }
    } else if (hasPracticeSquad && existingPositions.size < 3) {
      // Duplicate position while Practice Squad remains: small penalty to encourage position diversity
      rawScore -= 3.0;
    }
  }
  if (effectiveTeamId === 'seahawks') {
    // 4 roster spots: aggressively build engines across all 4 slots throughout the entire game
    const hasPracticeSquad = (p.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
    const isRecurring = card.effects?.some(e => e.perRound);
    const hasDeflate = card.effects?.some(e => e.type === 'deflate');

    if (isRecurring) {
      rawScore += 5.5;
    }
    if (hasDeflate) {
      rawScore += 3.5;
    }
    // Early urgency: sprint to replace Practice Squad players in Rounds 1-4
    if (hasPracticeSquad && (G?.board?.round || 1) <= 4) {
      rawScore += 6.0;
    }
  }
  if (effectiveTeamId === 'bengals') {
    const hasInstant = card.effects && card.effects.some(e => !e.perRound);
    const hasRecurring = card.effects && card.effects.some(e => e.perRound);
    const hasNegativeRecurring = card.effects?.some(e => e.perRound && (e.type === 'inflate' || (e.type === 'coins' && e.amount < 0)));

    if (hasInstant) {
      rawScore += 6.0; // High base affinity for boosted instant effects (+2 coins or +2 deflation)
      if (card.minBid <= 3) rawScore += 3.0; // Cheap instant bargains
    }
    if (hasInstant && hasNegativeRecurring) {
      // Hunter Henry & Ezekiel Elliott: Free boosted nuke without the recurring downside!
      rawScore += 12.0;
    }
    if (hasInstant && hasRecurring && !hasNegativeRecurring) {
      rawScore += 7.0; // Dual threat filling two roles cleanly
    }

    // Instant Coin Rockets for Bengals:
    // Odunze / Nabers give 7 coins! Deebo gives 8 coins! Olave gives 7 coins!
    const instantCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    if (instantCoins >= 4) {
      rawScore += 6.0;
    }

    // Strategy B Cash Engine Foundation:
    // When cash-poor (<= 6 coins) in early rounds (1-3), boost recurring coin generators
    // so Bengals locks in steady round-by-round income to continuously fund instant purchases and discard churn.
    const round = G?.board?.round || 1;
    if (round <= 3 && p.coins <= 6) {
      const recurringCoins = card.effects?.filter(e => e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      if (recurringCoins >= 2) {
        rawScore += 5.5;
      }
    }
  }
  if (effectiveTeamId === 'browns') {
    const hasAnyDeflate = card.effects?.some(e => e.type === 'deflate' || e.type === 'deflate_every_round');
    // Hard Rule: Pure coin cards give Browns 0 coins and zero deflation. Strictly avoid!
    if (!hasAnyDeflate && card.id !== 'tyreek_hill') {
      return -100.0;
    }

    const currentRound = G?.board?.round || 1;
    const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const isDualThreatPhase1 = (card.phase === 1 || currentRound <= 3) && recDeflate >= 2 && instDeflate >= 1;

    if (currentRound <= 3) {
      if (isDualThreatPhase1) {
        // Dual-threat Phase 1 centerpiece (2+ recurring + instant, e.g. Bowers or equivalent)
        rawScore = Math.max(rawScore, 24.0);
      } else if (recDeflate >= 2) {
        rawScore = Math.max(rawScore, 18.0);
      } else {
        // For other Phase 1 deflation cards: seek best deflation for lowest cost (bang-for-buck)
        const deflateAmt = recDeflate + instDeflate;
        const efficiency = deflateAmt / Math.max(1, card.minBid);
        rawScore = (deflateAmt * 3.5) + (efficiency * 2.5);
      }
    } else {
      // Phase 2+ (Rounds 4+): High deflation superstars are paramount!
      if (recDeflate >= 5 || card.phase === 'hof') {
        rawScore = Math.max(rawScore, 30.0);
      } else if (recDeflate >= 4 || instDeflate >= 6) {
        rawScore = Math.max(rawScore, 26.0);
      } else if (recDeflate >= 2 || instDeflate >= 4) {
        rawScore = Math.max(rawScore, 18.0);
      }
    }
  }

  if (effectiveTeamId === 'jaguars') {
    const foresight = evaluateJaguarsEventForesight(G, p?.id);
    const currentRound = G?.board?.round || 1;
    const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    // User Directive: "Plan around by acting like you have 7 less PSI than you actually do"
    const effectivePsi = foresight?.upcomingColdAirSoon ? Math.max(0, p.psi - 7) : p.psi;

    // 1. Championship / Immediate Closer Winner:
    if (instDeflate > 0 && effectivePsi - instDeflate <= 0) {
      rawScore = Math.max(rawScore, 50.0);
    } else if (effectivePsi <= 14 && instDeflate >= 2) {
      // In closer range: value instant deflation nukes heavily!
      rawScore += 16.0 + (instDeflate * 3.5);
    }

    // 2. Event Foresight Synergies:
    if (foresight?.upcomingDoubleAll) {
      // Offensive Battle doubles all effects next round or in 2 rounds!
      if (recDeflate > 0) rawScore += recDeflate * 4.0;
      if (recCoins > 0) rawScore += recCoins * 3.0;
    }
    if (foresight?.upcomingDoublePhase1 && card.phase === 1) {
      // Raw Talent doubles Phase 1 players!
      rawScore += 7.0;
    }
    if (foresight?.upcomingHotAir) {
      // Hot Air extends the game (+7 PSI to all), giving engines more time to cook!
      if (recDeflate > 0) rawScore += recDeflate * 3.0;
      if (recCoins > 0) rawScore += recCoins * 2.5;
    }
    if (foresight?.upcomingLegendReturns) {
      // Legend Returns incoming: hoard coins to be richest for HOF auction!
      if (recCoins >= 2) rawScore += 4.5;
    }

    // 3. Round 1 Anchor Star Conviction (12 starting coins, 43 PSI):
    if (currentRound === 1) {
      const isDualOrDeflateAnchor = (recDeflate >= 2 || (recDeflate >= 1 && recCoins >= 2) || card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'kirk_cousins');
      if (isDualOrDeflateAnchor) {
        rawScore = Math.max(rawScore, 26.0);
      } else if (recCoins >= 3) {
        rawScore = Math.max(rawScore, 18.0);
      }
    }

    // 4. Lineup Deflation Balance: If Jaguars has 0 deflation engines in lineup, prioritize deflation engines!
    const realLineup = (p.lineup || []).filter(c => !c.isPracticeSquad && c.id !== 'practice_squad' && !c.uniqueId?.startsWith('ps_'));
    const lineupDeflateRate = realLineup.reduce((sum, c) => sum + (c.effects || []).filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0), 0);
    const lineupCoinProducers = realLineup.filter(c => (c.effects || []).some(e => e.perRound && e.type === 'coins' && e.amount >= 2)).length;

    if (lineupDeflateRate === 0 && recDeflate >= 2) {
      rawScore += 10.0;
    }
    if (lineupCoinProducers >= 1 && recDeflate === 0 && instDeflate === 0) {
      rawScore -= 6.0;
    }
  }

  if (effectiveTeamId === 'falcons') {
    // 1. Strict ban on Deshaun Watson and recurring inflation poison
    if (card.id === 'deshaun_watson' || card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate')) {
      return -50.0;
    }

    const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const recCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const instCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    // 2. High starting PSI (48) requires strong deflation urgency
    if (recDeflate >= 2) rawScore += 7.0;
    if (instDeflate >= 3) rawScore += 5.0;

    // 3. Early economic boost (Rounds 1-3) to build up beyond starting 9 coins
    const currentRound = G?.board?.round || 1;
    if (currentRound <= 3) {
      if (recCoins >= 3) rawScore += 5.0;
      else if (instCoins >= 4) rawScore += 4.0;
    }

    // 4. Closer awareness
    if (p.psi <= 16 && instDeflate >= p.psi) {
      rawScore += 35.0;
    }
  }

  // Cards with low Max Bid
  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
  if (effMax <= 4 && p.coins >= effMax) {
    rawScore += 2.0;
  }

  // Universal Superstars (Mahomes, Kelce, McCaffrey, Lamar, Jefferson, HOF legends)
  // Superstars are universally coveted; ensure floor valuation is strong for all teams
  const isSuperstar = (card.phase === 'hof' || effMax >= 16 || card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'christian_mccaffrey' || card.id === 'lamar_jackson' || card.id === 'justin_jefferson');
  if (isSuperstar && effectiveTeamId !== 'browns') {
    rawScore = Math.max(rawScore, 15.0);
  }

  // Roster Composition & Universal 3-Slot Rotation / Cycle Strategy (for non-Colts)
  const isSeahawks = effectiveTeamId === 'seahawks';
  const targetEngineQuota = isSeahawks ? 3 : 2;
  const maxLineup = (isSeahawks ? 4 : 3) + (p.extraLineupSlots || 0);
  const currentLineup = p.lineup || [];

  const realLineup = currentLineup.filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
  // Clean recurring engines: excludes toxic recurring cards (inflation, negative coins)
  const cleanRecurringEngines = realLineup.filter(c => 
    c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0))) &&
    !c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate')
  );
  const recurringCount = cleanRecurringEngines.length;

  const isCandidatePerRound = card.effects && card.effects.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0)));
  const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
  const cardInstCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
  const isCandidateInstantOnly = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound);

  if (effectiveTeamId !== 'colts') {
    if (recurringCount < targetEngineQuota) {
      if (isCandidatePerRound) {
        const earlyRoundBonus = (G.board?.round || 1) <= 3 ? 5.0 : 3.0;
        rawScore += earlyRoundBonus;
      } else if (effectiveTeamId === 'titans' && recurringCount === 1 && (G.board?.round || 1) === 1) {
        // User Directive: "Since you start the game with one filled (hopefully) you can value instant effects slightly more since you are one step ahead... if you have to go instant round 1 it isn't as bad as it would be for other teams."
        rawScore += 4.0;
      }
    } else {
      // User Directive: "usually best strategy is to have 2 every turn and then cycle the last spot with instants or players that are easy to replace."
      // The core 2-engine setup is satisfied! The remaining spot is the designated cycle spot.
      if (cardInstDeflate > 0) {
        const cycleDeflateBonus = (cardInstDeflate * (deflateWeight || 1.7) * 1.5) + (cardInstDeflate >= 4 ? 5.0 : 2.5);
        rawScore += cycleDeflateBonus;
        if (effectiveTeamId === 'titans') rawScore += 3.0; // Titans hones in on instants once 2 engines are established
        if (effectiveTeamId === 'bengals') rawScore += 7.5;
      }
      if (cardInstCoins > 0) {
        const cycleCoinBonus = (cardInstCoins * (coinWeight || 1.0) * 1.2) + (cardInstCoins >= 4 ? 2.5 : 1.0);
        rawScore += cycleCoinBonus;
        if (effectiveTeamId === 'bengals') rawScore += 6.0;
      }
      if (isCandidateInstantOnly && cardInstDeflate === 0 && cardInstCoins === 0) {
        rawScore += 5.0;
        if (effectiveTeamId === 'bengals') rawScore += 7.5;
      }
      if (isCandidatePerRound && currentLineup.length >= targetEngineQuota) {
        // If team already has 2+ engines, a mediocre redundant recurring filler is inferior to cycling instant cards:
        const isComplementaryEngine = (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId) && (
          (cleanRecurringEngines.every(c => !c.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate')) && card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate')) ||
          (cleanRecurringEngines.every(c => !c.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins')) && card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins'))
        ));
        if (!isSuperstar && rawScore < 22 && !isComplementaryEngine) {
          rawScore *= (effectiveTeamId === 'bengals' ? 0.70 : 0.65);
        }
      }
    }
  }

  if (currentLineup.length >= maxLineup && effectiveTeamId !== 'colts') {
    const isCandidateInstant = card.effects && card.effects.some(e => !e.perRound);
    if (effectiveTeamId === 'bengals' && isCandidateInstant) {
      return rawScore;
    }

    let lowestOpportunityCost = Infinity;
    currentLineup.forEach(activeC => {
      const hasRecurring = activeC.effects && activeC.effects.some(e => e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round');
      const hasRecurringInflation = activeC.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
      const hasRecurringNegativeCoins = activeC.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0);
      if (activeC.isPracticeSquad || activeC.uniqueId?.startsWith('ps_') || !hasRecurring || hasRecurringInflation || hasRecurringNegativeCoins) {
        lowestOpportunityCost = Math.min(lowestOpportunityCost, 0);
      } else {
        const activeScore = scoreCardRaw(activeC, roundsLeft, deflateWeight, coinWeight);
        if (activeScore < lowestOpportunityCost) {
          lowestOpportunityCost = activeScore;
        }
      }
    });

    let finalScore = rawScore - lowestOpportunityCost;
    if (doesCardFitTeamStrategy(effectiveTeamId, card, p, G)) {
      finalScore *= synergyBonus;
    }
    return Math.round(finalScore * 10) / 10;
  }

  let finalScore = rawScore;
  if (doesCardFitTeamStrategy(effectiveTeamId, card, p, G)) {
    finalScore *= synergyBonus;
  }
  return Math.round(finalScore * 10) / 10;
};

export const chooseCpuCommandersMarkCard = (G, commandersId) => {
  const firstPlayerId = G.board.firstPlayer;
  if (!firstPlayerId || firstPlayerId === commandersId) return -1;
  const availableCards = G.board.auctionPlayers;
  if (!availableCards || availableCards.length === 0) return -1;

  const firstPlayer = G.players[firstPlayerId];
  const commanders = G.players[commandersId];
  if (!firstPlayer || !commanders) return -1;

  const firstCoins = firstPlayer.coins || 0;
  const commCoins = commanders.coins || 0;
  const isFirstDangerous = (firstPlayer.psi || 40) <= 18;

  const alreadyMarked = G.board.commandersMarkedIndices || (G.board.commandersMarkedCardIndex !== undefined && G.board.commandersMarkedCardIndex !== null ? [G.board.commandersMarkedCardIndex] : []);

  // Filter cards the First Player can ACTUALLY afford (prevents wasted marks!)
  const affordableForFirst = [];
  availableCards.forEach((c, idx) => {
    if (!c || alreadyMarked.includes(idx)) return;
    if (firstCoins >= c.minBid) {
      const scoreFirst = scoreCardForPlayer(G, firstPlayerId, c);
      const scoreComm = scoreCardForPlayer(G, commandersId, c);
      const commCanAfford = commCoins >= c.minBid;
      affordableForFirst.push({ card: c, idx, scoreFirst, scoreComm, commCanAfford });
    }
  });

  if (affordableForFirst.length === 0) {
    let bestIdx = -1, maxScore = -Infinity;
    availableCards.forEach((c, idx) => {
      if (c && !alreadyMarked.includes(idx)) {
        const s = scoreCardForPlayer(G, commandersId, c);
        if (s > maxScore) { maxScore = s; bestIdx = idx; }
      }
    });
    if (bestIdx !== -1) return bestIdx;
    return availableCards.findIndex((c, idx) => c && !alreadyMarked.includes(idx));
  }

  // Strategy A: Defensive Embargo if First Player is dangerous / leader
  if (isFirstDangerous) {
    affordableForFirst.sort((a, b) => b.scoreFirst - a.scoreFirst);
    return affordableForFirst[0].idx;
  }

  // Strategy B: The "Shield / Dibs" Strategy:
  // If there's an elite card Commanders loves and can afford, and First Player also can afford and wants it
  const shieldTargets = affordableForFirst.filter(item => item.commCanAfford && item.scoreComm >= 16 && item.scoreFirst >= 12);
  if (shieldTargets.length > 0) {
    shieldTargets.sort((a, b) => b.scoreComm - a.scoreComm);
    return shieldTargets[0].idx;
  }

  // Strategy C: Target Denial (Block First Player's best affordable card)
  affordableForFirst.sort((a, b) => b.scoreFirst - a.scoreFirst);
  return affordableForFirst[0].idx;
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
    const isCommandersMarked = (idx === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(idx));
    if (String(currentPlayerId) === String(G.board.firstPlayer) && isCommandersMarked && remainingCardsCount > 1) {
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
  const richestOpponentCoins = activeOpponents.length > 0
    ? Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0))
    : 0;

  // Commanders Strategic Nomination: Prioritize previously shielded marked card if unlocked and affordable!
  if (getEffectiveTeamId(currentPlayer) === 'commanders') {
    let shieldedCardItem = null;
    if (G.board?.commandersShieldedCardId) {
      shieldedCardItem = eligibleCards.find(item => item.card.id === G.board.commandersShieldedCardId);
    } else if (G.board?.commandersMarkedIndices?.length > 0) {
      const markedIdx = G.board.commandersMarkedIndices[0];
      shieldedCardItem = eligibleCards.find(item => item.index === markedIdx);
    }
    if (shieldedCardItem && currentPlayer.coins >= shieldedCardItem.card.minBid) {
      const s = scoreCardForPlayer(G, currentPlayerId, shieldedCardItem.card);
      if (s >= 12) {
        return shieldedCardItem.index;
      }
    }
  }

  const effectiveTeamId = getEffectiveTeamId(currentPlayer);

  // Universal Superstar Priority: Everyone wants Patrick Mahomes and Travis Kelce!
  // User directive: Lions only nominates Tier 1 superstars if they are the richest player and can win them!
  const isLionsTeam = effectiveTeamId === 'lions';
  const isRichestPlayer = currentPlayer.coins > richestOpponentCoins;
  if (!isLionsTeam || isRichestPlayer) {
    const eliteChiefsSuperstar = eligibleCards.find(item => item.card.id === 'patrick_mahomes' || item.card.id === 'travis_kelce');
    if (eliteChiefsSuperstar && currentPlayer.coins >= eliteChiefsSuperstar.card.minBid) {
      return eliteChiefsSuperstar.index;
    }
  }

  // Chargers Strategic Nomination:
  // 1. If an elite deflation centerpiece is available (Bowers, Kelce, Mahomes, HOF legends), Chargers nominates it directly!
  // 2. Otherwise, Chargers finds cards that rivals CRAVE to farm outbid bonus coins!
  if (effectiveTeamId === 'chargers') {
    const crownJewel = eligibleCards.find(item => {
      const isAnchor = item.card.id === 'brock_bowers' || item.card.id === 'travis_kelce' || item.card.id === 'patrick_mahomes' || item.card.phase === 'hof';
      const isHugeDeflate = item.card.effects?.some(e => (e.perRound && e.type === 'deflate' && e.amount >= 2) || (!e.perRound && e.type === 'deflate' && e.amount >= 4));
      return (isAnchor || isHugeDeflate) && item.score >= 16.0 && currentPlayer.coins >= item.card.minBid;
    });

    if (crownJewel) {
      return crownJewel.index;
    }

    let bestBait = null;
    let maxOppScore = -Infinity;

    eligibleCards.forEach(item => {
      activeOpponents.forEach(oppId => {
        const oppScore = scoreCardForPlayer(G, oppId, item.card);
        if (oppScore > maxOppScore && oppScore >= 8.0 && G.players[oppId]?.coins >= item.card.minBid + 1) {
          maxOppScore = oppScore;
          bestBait = item;
        }
      });
    });

    if (bestBait) {
      return bestBait.index;
    }
  }

  // Team-Specific Nomination Strategies:
  const isFirstPlayerOfRound = Object.values(G.players).every(p => !p.hasWonAuction);

  // Detroit Lions Strategic Nomination:
  // User directive:
  // "target whoever they think they can win in the early rounds. They need to acquire that first player early on.
  // Then later once they are already rich they can focus on the deflation if needed.
  // So when they are the nominating player they should target the player they can win.
  // Maybe a low max bid player like Nabers or if they are the richest player they can get the best one and outbid everyone.
  // Or maybe someone in the middle if they have enough coins.
  // Only nominate the tier 1 superstar if you are the richest player and can win him"
  if (effectiveTeamId === 'lions') {
    // 1. Endgame closer mode (PSI <= 16): Prioritize instant deflation closer nukes
    if ((currentPlayer.psi || 47) <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= 3 && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. Early Rounds (Rounds 1-3) & First Claim of the Round:
    if (isFirstPlayerOfRound && (G.board.round || 1) <= 3) {
      // Condition A: If Lions is strictly the richest player, Lions CAN win the Tier 1 superstar!
      if (currentPlayer.coins > richestOpponentCoins) {
        const superstar = eligibleCards.find(item =>
          (item.card.id === 'brock_bowers' ||
           item.card.id === 'travis_kelce' ||
           item.card.id === 'patrick_mahomes' ||
           item.card.id === 'george_kittle' ||
           item.card.id === 'kirk_cousins' ||
           item.card.phase === 'hof') && currentPlayer.coins >= item.card.minBid
        );
        if (superstar) return superstar.index;

        eligibleCards.sort((a, b) => b.score - a.score);
        return eligibleCards[0].index;
      }

      // Condition B: Lions is NOT the richest player. Target who Lions CAN win:
      // 1. Low max-bid gems (e.g. Nabers, Odunze, effMax <= 5) where Lions has enough coins to pay max:
      const lowMaxGems = eligibleCards.filter(item => {
        const effMax = getEffectiveCardMaxBid(item.card, G.board.activeEvent);
        return effMax <= 5 && currentPlayer.coins >= effMax && item.score >= 0;
      }).sort((a, b) => b.score - a.score);
      if (lowMaxGems.length > 0) {
        return lowMaxGems[0].index;
      }

      // 2. Mid-tier cards where Lions has enough coins to win:
      const winnableMidTier = eligibleCards.filter(item => {
        const effMax = getEffectiveCardMaxBid(item.card, G.board.activeEvent);
        const isAffordable = currentPlayer.coins >= effMax;
        const isGoodMid = item.card.minBid <= 2 && item.score >= 4.0;
        return isAffordable || isGoodMid;
      }).sort((a, b) => b.score - a.score);
      if (winnableMidTier.length > 0) {
        return winnableMidTier[0].index;
      }
    }

    // 3. Later in game (Rounds 4+ or coins >= 12): Lions is already rich, focus on deflation!
    if ((G.board.round || 1) >= 4 || currentPlayer.coins >= 12) {
      const heavyDeflate = eligibleCards.filter(item => {
        const recD = item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate');
        const instD = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return (recD || instD >= 2) && item.score >= 8.0;
      }).sort((a, b) => b.score - a.score);
      if (heavyDeflate.length > 0) {
        return heavyDeflate[0].index;
      }
    }

    // Default Lions fallback: pick highest scored card
    eligibleCards.sort((a, b) => b.score - a.score);
    return eligibleCards[0].index;
  }

  // Bengals Nomination Strategy:
  // 1. Exploit cards with positive instant + negative recurring (Hunter Henry, Ezekiel Elliott): free boosted nukes!
  // 2. Instant coin rockets when low on purse (<= 6 coins): Nabers, Odunze, Deebo, Olave, Harrison Jr.
  // 3. Premier recurring centerpieces if needing engines (< 2 recurring): Bowers, Cousins, Kittle
  // 4. Instant deflation nukes: Aaron Jones, Jahmyr Gibbs, D'Andre Swift, Tony Pollard
  // 5. Cheap instant bargains (minBid <= 2)
  if (effectiveTeamId === 'bengals') {
    const realLineup = (currentPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const recurringCount = realLineup.filter(c => c.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0)))).length;

    // 1. Hunter Henry / Ezekiel Elliott: absolute top tier for Bengals
    const exploitCard = eligibleCards.find(item => 
      (item.card.id === 'hunter_henry' || item.card.id === 'ezekiel_elliott') &&
      currentPlayer.coins >= item.card.minBid
    );
    if (exploitCard) return exploitCard.index;

    // 2. Instant coin rockets if cash-poor (<= 6 coins)
    if (currentPlayer.coins <= 6) {
      const instantCoinRocket = eligibleCards.find(item => 
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => !e.perRound && e.type === 'coins' && e.amount >= 4)
      );
      if (instantCoinRocket) return instantCoinRocket.index;
    }

    // 3. If needing to establish initial recurring engines (recurringCount < 2), nominate premier centerpiece
    if (recurringCount < 2) {
      const premierCenterpiece = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        (item.card.id === 'brock_bowers' || 
         item.card.id === 'kirk_cousins' || 
         item.card.id === 'george_kittle' ||
         item.card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3))
      );
      if (premierCenterpiece) return premierCenterpiece.index;
    }

    // 4. Instant deflation nukes (Aaron Jones, Jahmyr Gibbs, D'Andre Swift, etc.)
    const instantDeflateNuke = eligibleCards.find(item =>
      item.card.minBid <= currentPlayer.coins &&
      item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 4)
    );
    if (instantDeflateNuke) return instantDeflateNuke.index;

    // 5. Cheap instant cards (minBid <= 2)
    const cheapInstant = eligibleCards.find(item =>
      item.card.minBid <= Math.min(2, currentPlayer.coins) &&
      item.card.effects?.some(e => !e.perRound)
    );
    if (cheapInstant) return cheapInstant.index;
  }

  // Broncos Nomination Strategy:
  // 1. Endgame Closer (PSI <= 16): Nominate high-impact instant deflation nuke
  // 2. Tactical Drawback Exploitation: Hunter Henry / Ezekiel Elliott (free instant deflation with 0 refresh drawback)
  // 3. Rounds 1-2 Anchor Bully: Nominate premier recurring anchors (Bowers, Cousins, Kittle, London)
  // 4. Instant Deflation Nukes (Kyren Williams, D'Andre Swift, Bijan Robinson, etc.)
  if (effectiveTeamId === 'broncos') {
    const currentRound = G.board.round || 1;
    if ((currentPlayer.psi || 40) <= 16) {
      const closerNuke = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 3)
      );
      if (closerNuke) return closerNuke.index;
    }

    const exploitCard = eligibleCards.find(item => 
      (item.card.id === 'hunter_henry' || item.card.id === 'ezekiel_elliott') &&
      currentPlayer.coins >= item.card.minBid
    );
    if (exploitCard) return exploitCard.index;

    if (currentRound <= 2) {
      const premierCenterpiece = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        (item.card.id === 'brock_bowers' || 
         item.card.id === 'kirk_cousins' || 
         item.card.id === 'george_kittle' ||
         item.card.phase === 'hof' ||
         item.card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2))))
      );
      if (premierCenterpiece) return premierCenterpiece.index;
    }

    const instantNuke = eligibleCards.find(item =>
      item.card.minBid <= currentPlayer.coins &&
      item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 3)
    );
    if (instantNuke) return instantNuke.index;
  }

  // Jets Nomination Strategy:
  // 1. Prioritize small max-bid cards (effMax <= 5), sorted by lowest effMax (cheapest 4 PSI ROI) and highest score.
  // 2. If cash-poor (<= 5 coins) and no small max cards affordable, nominate recurring cash engines (2+ coins/round) to rebuild bankroll.
  // 3. Otherwise, nominate affordable cards where paying max is an attractive buyout.
  if (effectiveTeamId === 'jets') {
    // 1. Small max gems & bargains (effMax <= 5)
    const smallMaxAffordable = eligibleCards
      .filter(item => {
        const effMax = getEffectiveCardMaxBid(item.card, G.board.activeEvent);
        return currentPlayer.coins >= effMax && effMax <= 5 && item.score >= 0;
      })
      .sort((a, b) => {
        const effMaxA = getEffectiveCardMaxBid(a.card, G.board.activeEvent);
        const effMaxB = getEffectiveCardMaxBid(b.card, G.board.activeEvent);
        if (effMaxA !== effMaxB) return effMaxA - effMaxB; // Cheapest max buyout first
        return b.score - a.score;
      });
    if (smallMaxAffordable.length > 0) {
      return smallMaxAffordable[0].index;
    }

    // 2. If cash-poor (<= 5 coins), nominate recurring coin engines to restore purse
    if (currentPlayer.coins <= 5) {
      const coinEngine = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 2)
      );
      if (coinEngine) return coinEngine.index;
    }

    // 3. General affordable max bid cards with high score
    const affordableMaxJets = eligibleCards
      .filter(item => {
        const effMax = getEffectiveCardMaxBid(item.card, G.board.activeEvent);
        return currentPlayer.coins >= effMax && item.score >= 6.0;
      })
      .sort((a, b) => {
        const effMaxA = getEffectiveCardMaxBid(a.card, G.board.activeEvent);
        const effMaxB = getEffectiveCardMaxBid(b.card, G.board.activeEvent);
        return effMaxA - effMaxB; // Prefer lower max bid cost
      });
    if (affordableMaxJets.length > 0) {
      return affordableMaxJets[0].index;
    }
  }

  // Browns Nomination Strategy:
  // User Strategic Vision:
  // - Strictly NEVER nominate pure coin cards (score <= 0).
  // - Phase 1 (Rounds 1-3):
  //   1. Nominate Brock Bowers if revealed and affordable (Phase 1 crown jewel).
  //   2. Nominate best deflation card for lowest minBid (highest efficiency bang-for-buck).
  // - Phase 2+ (Rounds 4+):
  //   1. Nominate high deflation superstars (Patrick Mahomes, Travis Kelce, Adrian Peterson, Marshawn Lynch, Derrick Henry, HOF legends).
  //   2. Nominate high instant deflation nukes (Aaron Jones, Jahmyr Gibbs, Kenneth Walker).
  //   3. Nominate any card with positive deflation.
  if (effectiveTeamId === 'browns') {
    const deflateEligible = eligibleCards.filter(item => item.score > 0);
    if (deflateEligible.length > 0) {
      const currentRound = G.board.round || 1;
      if (currentRound <= 3) {
        // Phase 1: Dual-threat deflaters first (2+ recurring + instant, e.g. Bowers or equivalent)
        const dualThreat = deflateEligible.find(item => {
          const rec = item.card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const inst = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          return rec >= 2 && inst >= 1 && currentPlayer.coins >= item.card.minBid;
        });
        if (dualThreat) return dualThreat.index;

        // Next: Any 2+ recurring deflaters
        const rec2 = deflateEligible.find(item => {
          const rec = item.card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          return rec >= 2 && currentPlayer.coins >= item.card.minBid;
        });
        if (rec2) return rec2.index;

        // Otherwise highest efficiency (deflate / minBid)
        const sortedEfficiency = [...deflateEligible].sort((a, b) => {
          const defA = a.card.effects?.filter(e => e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const defB = b.card.effects?.filter(e => e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const effA = defA / Math.max(1, a.card.minBid);
          const effB = defB / Math.max(1, b.card.minBid);
          if (effB !== effA) return effB - effA;
          return a.card.minBid - b.card.minBid; // cheaper first
        });
        return sortedEfficiency[0].index;
      } else {
        // Phase 2+ (Rounds 4+): highest raw score / deflation superstars first
        deflateEligible.sort((a, b) => b.score - a.score);
        return deflateEligible[0].index;
      }
    }
  }

  // Dolphins: Prioritize instant coins (Malik, Deebo, etc.) to trigger bailout recharge + coin spike,
  // or cards whose minBid matches exactly 1 coin if Dolphins has 1 coin, or premier deflation targets!
  if (effectiveTeamId === 'dolphins') {
    if (currentPlayer.coins === 1) {
      const min1Card = eligibleCards.find(item => item.card.minBid === 1);
      if (min1Card) return min1Card.index;
    }
    // When cash-poor (<= 5 coins), hunt instant coin launchpads (Malik, Deebo, etc.)
    if (currentPlayer.coins <= 5) {
      const instantCoinTarget = eligibleCards.find(item => item.card.effects?.some(e => !e.perRound && e.type === 'coins' && e.amount >= 3));
      if (instantCoinTarget) {
        return instantCoinTarget.index;
      }
    }
    // When well-funded (or no launchpad available), nominate premier deflation engines!
    const premierDeflate = eligibleCards.find(item => item.card.effects?.some(e => e.type === 'deflate' && (e.amount >= 3 || (e.perRound && e.amount >= 2))));
    if (premierDeflate) {
      return premierDeflate.index;
    }
    const fallbackCoinTarget = eligibleCards.find(item => item.card.effects?.some(e => !e.perRound && e.type === 'coins' && e.amount >= 3));
    if (fallbackCoinTarget) {
      return fallbackCoinTarget.index;
    }
  }

  // Patriots Nomination Strategy:
  // - In Round 1, aggressively nominate premier centerpieces (Bowers, Cousins, Kittle, 3+ coins/rnd, or Hunter Henry).
  //   If no premier card is available, nominate a cheap, decent card (minBid <= 3, score >= 0) to avoid early overspend.
  // - In Endgame (PSI <= 18), nominate instant deflation nukes (deflate >= 4) that can close the game immediately.
  // - If cash-poor (coins <= 3), nominate affordable cards (minBid <= coins) to guarantee a legal bid.
  if (effectiveTeamId === 'patriots') {
    const currentRound = G.board.round || 1;
    if (currentRound === 1) {
      const premierCard = eligibleCards.find(item => 
        item.card.id === 'brock_bowers' || 
        item.card.id === 'kirk_cousins' || 
        item.card.id === 'george_kittle' ||
        item.card.id === 'hunter_henry' ||
        item.card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3)
      );
      if (premierCard) return premierCard.index;

      const cheapAffordable = eligibleCards.find(item => item.card.minBid <= 3 && item.score >= 0);
      if (cheapAffordable) return cheapAffordable.index;
    } else {
      if ((currentPlayer.psi || 36) <= 18) {
        const closerNuke = eligibleCards.find(item => 
          item.card.minBid <= currentPlayer.coins &&
          item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 4)
        );
        if (closerNuke) return closerNuke.index;
      }

      if (currentPlayer.coins <= 3) {
        const affordable = eligibleCards.find(item => item.card.minBid <= currentPlayer.coins && item.score >= 0);
        if (affordable) return affordable.index;
      }
    }
  }

  // Ravens Nomination Strategy:
  // - In Round 1, use 14 coins to nominate an elite star anchor (Bowers, Kittle, Cousins, London, Higgins, Allen, Olsen, Brown).
  // - In Rounds 2-4, identify missing positions from { QB, RB, WR, TE }.
  //   If cash is tight (<= 6 coins), nominate an affordable player (minBid <= 3) matching a missing position to complete the set.
  //   If well-funded, nominate the best player matching a missing position.
  if (effectiveTeamId === 'ravens') {
    const currentRound = G.board.round || 1;
    const realStarters = (currentPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const existingPositions = new Set(realStarters.map(c => c.position));

    if (currentRound === 1) {
      const eliteStar = eligibleCards.find(item => 
        item.card.id === 'brock_bowers' || 
        item.card.id === 'george_kittle' || 
        item.card.id === 'kirk_cousins' || 
        item.card.id === 'drake_london' || 
        item.card.id === 'tee_higgins' || 
        item.card.id === 'josh_allen' || 
        item.card.id === 'greg_olsen' || 
        item.card.id === 'aj_brown' ||
        item.card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2)))
      );
      if (eliteStar) return eliteStar.index;
    } else if (currentRound <= 4 && existingPositions.size < 3) {
      const missingPosCards = eligibleCards.filter(item => !existingPositions.has(item.card.position) && item.score >= 0);
      if (missingPosCards.length > 0) {
        if (currentPlayer.coins <= 6) {
          const cheapMissing = missingPosCards.find(item => item.card.minBid <= 3);
          if (cheapMissing) return cheapMissing.index;
        }
        return missingPosCards[0].index;
      }
    }
  }

  // Texans Nomination Strategy:
  // - Priority 1: Pick the best viable QB (highest score, no recurring inflation)
  // - Priority 2: If no viable QBs exist:
  //   * Endgame closer: If PSI <= 16, nominate an instant deflation nuke.
  //   * Low funds (<= 3 coins): Bait wealthy rivals with a high-cost superstar to drain their coins!
  //   * Otherwise nominate top scored player.
  if (effectiveTeamId === 'texans') {
    const viableQbs = eligibleCards.filter(item => 
      item.card.position === 'QB' && 
      scoreCardForPlayer(G, currentPlayerId, item.card) > 0
    );
    if (viableQbs.length > 0) {
      return viableQbs[0].index;
    }

    if ((currentPlayer.psi || 47) <= 16) {
      const closerNuke = eligibleCards.find(item => 
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 3)
      );
      if (closerNuke) return closerNuke.index;
    }

    if (currentPlayer.coins <= 3) {
      const baitCard = eligibleCards.find(item => item.card.maxBid >= 8 || item.card.phase >= 2 || item.score >= 18.0);
      if (baitCard) return baitCard.index;
      const affordable = eligibleCards.find(item => item.card.minBid <= currentPlayer.coins && item.score >= 0);
      if (affordable) return affordable.index;
    }

    if (eligibleCards.length > 0) return eligibleCards[0].index;
  }

  // Colts Nomination Strategy:
  // - 1. Zero tolerance for poison: Filter out negative recurring cards (Watson, Hunter Henry, Zeke, etc.)
  // - 2. Endgame Closer Pivot: If PSI <= 16 or Round >= 7, nominate an affordable instant deflation nuke
  // - 3. Early Game (Rounds 1-3):
  //      * Marginally prioritize recurring coins (User Directive 4): nominate clean 2+ coins/round card
  //      * Bargain Hunter (User Directive 3): nominate cheap clean recurring engines (minBid <= 3)
  //      * Otherwise nominate best affordable clean recurring deflater
  // - 4. Rounds 4+: Nominate best scored clean recurring deflater or superstar
  if (effectiveTeamId === 'colts') {
    const currentRound = G.board.round || 1;
    const isPoisonCard = (c) => c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze'));
    const hasInstantDrawback = (c) => c.effects?.some(e => !e.perRound && ((e.type === 'inflate' && e.amount > 0) || (e.type === 'coins' && e.amount < 0)));
    const cleanEligible = eligibleCards.filter(item => !isPoisonCard(item.card) && !hasInstantDrawback(item.card) && item.score >= 0);

    // 1. Endgame Closer
    if ((currentPlayer.psi || 36) <= 16 || currentRound >= 7) {
      const closerNuke = cleanEligible.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 3)
      );
      if (closerNuke) return closerNuke.index;
    }

    // 2. Early Game (Rounds 1-3)
    if (currentRound <= 3) {
      // Prioritize recurring coins marginally (Rule 4)
      const recurringCoinCard = cleanEligible.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount >= 2)
      );
      if (recurringCoinCard) return recurringCoinCard.index;

      // Bargain Hunter on cheap clean recurring engines (minBid <= 3) (Rule 3)
      const cheapRecurringCard = cleanEligible.find(item =>
        item.card.minBid <= Math.min(3, currentPlayer.coins) &&
        item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && ((e.type === 'coins' && e.amount > 0) || (e.type === 'deflate' && e.amount > 0)))
      );
      if (cheapRecurringCard) return cheapRecurringCard.index;

      // Any affordable clean recurring deflater
      const recurringDeflateCard = cleanEligible.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') && e.type === 'deflate' && e.amount > 0)
      );
      if (recurringDeflateCard) return recurringDeflateCard.index;
    } else {
      // Mid-to-Late Game: Best clean recurring deflater or superstar
      const premierRecurring = cleanEligible.find(item =>
        item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') && e.type === 'deflate' && e.amount >= 2)
      );
      if (premierRecurring) return premierRecurring.index;
    }

    if (cleanEligible.length > 0) {
      return cleanEligible[0].index;
    }

    // Fallback: non-poison eligible (e.g. Trevor Lawrence or pure instant)
    const fallbackEligible = eligibleCards.filter(item => !isPoisonCard(item.card) && item.score >= 0);
    if (fallbackEligible.length > 0) return fallbackEligible[0].index;
  }

  // Jaguars Nomination Strategy:
  // - 1. Endgame Closer Pivot: If effective PSI <= 14 (acting like 7 less PSI when Cold Air is upcoming),
  //      nominate an instant deflation nuke that can win or set up a win!
  // - 2. Foresight Synergy Nominations:
  //      * Upcoming Double Phase 1 (Raw Talent): Nominate best affordable Phase 1 card
  //      * Upcoming Double All (Offensive Battle): Nominate best affordable recurring engine
  // - 3. Round 1 Anchor Conviction: Nominate premier anchor (recCoins >= 3, recDeflate >= 2, or superstar)
  // - 4. Bait Rivals When Low on Funds: If coins <= 3, nominate expensive card to drain opponents
  // - 5. Otherwise nominate top scored card
  if (effectiveTeamId === 'jaguars') {
    const foresight = evaluateJaguarsEventForesight(G, currentPlayerId);
    const effectivePsi = foresight?.upcomingColdAirSoon ? Math.max(0, (currentPlayer.psi || 43) - 7) : (currentPlayer.psi || 43);
    const currentRound = G.board.round || 1;

    // 1. Endgame Closer Pivot
    if (effectivePsi <= 14) {
      const closerNuke = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        item.card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 2)
      );
      if (closerNuke) return closerNuke.index;
    }

    // 2. Foresight Synergy Nominations
    if (foresight?.upcomingDoublePhase1 && currentRound <= 3) {
      const topPhase1 = eligibleCards.find(item => item.card.phase === 1 && item.card.minBid <= currentPlayer.coins && item.score >= 10.0);
      if (topPhase1) return topPhase1.index;
    }
    if (foresight?.upcomingDoubleAll) {
      const topRecurring = eligibleCards.find(item =>
        item.card.effects?.some(e => e.perRound) &&
        item.card.minBid <= currentPlayer.coins &&
        item.score >= 12.0
      );
      if (topRecurring) return topRecurring.index;
    }

    // 3. Round 1 Anchor Conviction
    if (currentRound === 1) {
      const r1Anchor = eligibleCards.find(item =>
        item.card.minBid <= currentPlayer.coins &&
        (item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2))) ||
         item.card.id === 'brock_bowers' || item.card.id === 'george_kittle' || item.card.id === 'kirk_cousins')
      );
      if (r1Anchor) return r1Anchor.index;
    }

    // 4. Low Funds Bait
    if (currentPlayer.coins <= 3 && richestOpponentCoins >= 8) {
      const baitCard = eligibleCards.find(item => item.card.maxBid >= 8 || item.card.phase >= 2 || item.score >= 18.0);
      if (baitCard) return baitCard.index;
    }

    if (eligibleCards.length > 0) return eligibleCards[0].index;
  }

  // Packers Strategic Nomination:
  // User directive:
  // "Practice squad are not phase 1 players so the ability shouldn't count until round 3 at least. 
  // Have green bay target phase 2 or HOF players if it outweighs the benefits of the 4 deflate. Otherwise target the phase 1 players, value the best phase 1 players more than the not good ones."
  if (effectiveTeamId === 'packers') {
    // 1. Instant closer check (<= 16 PSI closer mode)
    if ((currentPlayer.psi || 50) <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= (currentPlayer.psi || 50) && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. High priority: Top Phase 1 cards (sorted by score)
    const phase1Cards = eligibleCards.filter(item => item.card.phase === 1 && item.score >= 0);
    if (phase1Cards.length > 0) {
      phase1Cards.sort((a, b) => b.score - a.score);
      return phase1Cards[0].index;
    }

    // 3. Phase 2/HOF cards that genuinely outweigh the 4 deflate
    const highImpactCards = eligibleCards.filter(item => item.card.phase !== 1 && item.score >= 10.0);
    if (highImpactCards.length > 0) {
      highImpactCards.sort((a, b) => b.score - a.score);
      return highImpactCards[0].index;
    }

    // 4. Fallback: nominate highest scored card (or bait)
    eligibleCards.sort((a, b) => b.score - a.score);
    return eligibleCards[0].index;
  }

  // Vikings Strategic Nomination:
  // - Phase 1 (PSI >= 27): Sprint to crack the 27 PSI barrier!
  //   Nominate top deflation cards (Bowers, Kittle, Goedert, Allen, Daniels, Cousins, Bijan)
  //   that accelerate Vikings toward the 2x coin threshold.
  // - Phase 2 (PSI < 27): Economic Superpower mode!
  //   1. Closer Nuke: If PSI <= 16, nominate game-winning instant closer nukes.
  //   2. Bully Tier 1 Superstars / HOF Legends: If richest (or holding high stack),
  //      nominate Tom Brady, Peyton Manning, Mahomes, Kelce, or 3+ recurring deflaters to bully-bid and lock out rivals.
  //   3. Deflation Engines: Nominate highest scored deflation cards, avoiding raw coin distractions.
  if (effectiveTeamId === 'vikings') {
    const psi = currentPlayer.psi || 44;

    // 1. Instant closer check (<= 16 PSI closer mode)
    if (psi <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= psi && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. Phase 2 (< 27 PSI) & Richest Player: bully out rivals on HOF Legends & Tier 1 Superstars
    if (psi < 27 && currentPlayer.coins >= richestOpponentCoins) {
      const superstar = eligibleCards.find(item =>
        item.card.phase === 'hof' ||
        item.card.id === 'patrick_mahomes' ||
        item.card.id === 'travis_kelce' ||
        item.card.id === 'christian_mccaffrey' ||
        item.card.effects?.some(e => e.perRound && e.type === 'deflate' && e.amount >= 3)
      );
      if (superstar) return superstar.index;
    }

    // 3. Phase 1 (PSI >= 27): Nominate high deflation cards to unlock 2x coins
    if (psi >= 27) {
      const deflaters = eligibleCards.filter(item =>
        item.card.effects?.some(e => e.type === 'deflate' && e.amount >= 2) &&
        currentPlayer.coins >= item.card.minBid
      );
      if (deflaters.length > 0) {
        deflaters.sort((a, b) => b.score - a.score);
        return deflaters[0].index;
      }
    }

    // 4. Default: Highest scored card
    eligibleCards.sort((a, b) => b.score - a.score);
    return eligibleCards[0].index;
  }

  // Falcons Strategic Nomination:
  // - If <= 16 PSI: Prioritize game-winning instant closer nukes.
  // - Clean card selection: Strictly filter out Deshaun Watson / recurring inflation poison.
  // - In early rounds, prioritize winnable deflation and economic anchors.
  if (effectiveTeamId === 'falcons') {
    const psi = currentPlayer.psi || 48;

    // 1. Instant closer check (<= 16 PSI closer mode)
    if (psi <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= psi && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. Filter out poison cards
    const cleanCards = eligibleCards.filter(item =>
      item.card.id !== 'deshaun_watson' &&
      !item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate')
    );

    if (cleanCards.length > 0) {
      cleanCards.sort((a, b) => b.score - a.score);
      return cleanCards[0].index;
    }
  }

  // Saints Strategic Nomination:
  // User directive: "Saint: need to target the toxic players, but know when to bid on other players
  // instead of being target locked and not just looking at toxic. Know when to go for others as well but also mostly for toxic players if they can."
  if (effectiveTeamId === 'saints') {
    const psi = currentPlayer.psi || 42;

    // 1. Instant closer check (<= 16 PSI closer mode)
    if (psi <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= psi && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. Toxic card nomination: Target unowned toxic cards (Deshaun Watson, Hunter Henry, Trevor Lawrence, Zeke)
    // because Saints is immune to drawbacks, so Saints can acquire them cheaply at minBid without competition!
    const toxicTarget = eligibleCards.find(item => {
      const hasDrawback = item.card.effects?.some(e => (e.type === 'coins' && e.amount < 0) || e.type === 'inflate');
      if (!hasDrawback) return false;
      const isAffordable = currentPlayer.coins >= item.card.minBid;
      const alreadyHasExactCard = (currentPlayer.lineup || []).some(c => c && c.id === item.card.id);
      return isAffordable && !alreadyHasExactCard;
    });
    if (toxicTarget) return toxicTarget.index;

    // 3. Otherwise: Best Player Available (highest score among eligible cards)
    return eligibleCards[0].index;
  }

  // Panthers Strategic Nomination:
  // User directive: "Panthers: Reoccuring deflate engine already. They like it when the game goes longer
  // since it gives them more time to catch up. Besides that probably normal values, but check to see."
  if (effectiveTeamId === 'panthers') {
    const psi = currentPlayer.psi || 49;

    // 1. Instant closer check (<= 16 PSI closer mode)
    if (psi <= 16) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= psi && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    // 2. High recurring deflation engine: Stacks with passive -2 PSI/rd to burn 49 starting PSI
    const recEngine = eligibleCards.find(item => {
      const recDeflate = item.card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      return recDeflate >= 2 && currentPlayer.coins >= item.card.minBid;
    });
    if (recEngine) return recEngine.index;

    // 3. Fallback: Best Player Available
    return eligibleCards[0].index;
  }

  // Steelers Nomination Strategy:
  // - If NOT yet coin leader (e.g. Rounds 1-2): Bait rivals by nominating high-cost or high-demand cards
  //   that competitors will fight over, draining their purses so Steelers can overtake them!
  // - If IS coin leader: Nominate recurring coin cards to solidify dominance, or cheap utility cards
  //   that Steelers can win comfortably within their spendable surplus.
  if (effectiveTeamId === 'steelers') {
    const isLeadingCoins = currentPlayer.coins > richestOpponentCoins;
    if (!isLeadingCoins) {
      const baitCard = eligibleCards.find(item => item.card.maxBid >= 8 || item.card.phase >= 2 || item.card.effects?.some(e => e.type === 'deflate' && e.amount >= 3));
      if (baitCard) return baitCard.index;
    } else {
      const coinCard = eligibleCards.find(item => item.card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins' && e.amount >= 2));
      if (coinCard) return coinCard.index;
      const cheapTarget = eligibleCards.find(item => item.card.minBid <= 2 && item.card.effects?.some(e => e.type === 'deflate' || e.type === 'coins'));
      if (cheapTarget) return cheapTarget.index;
    }
  }

  // 49ers: Nominate deflation cards that allow spending down below 5 coins (accounting for incoming coins)
  if (effectiveTeamId === '49ers') {
    const incomingCoins = calculate49ersIncomingCoins(currentPlayer, G);
    const targetPurse = 4 - incomingCoins;
    if (targetPurse >= 0 && currentPlayer.coins > targetPurse) {
      const spendDownNeeded = currentPlayer.coins - targetPurse;
      const sub5Target = eligibleCards.find(item => {
        const hasDeflate = item.card.effects?.some(e => e.type === 'deflate');
        const recCoins = item.card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
        return hasDeflate && recCoins === 0 && item.card.minBid >= spendDownNeeded && currentPlayer.coins >= item.card.minBid;
      });
      if (sub5Target) return sub5Target.index;

      const anyCleanDeflate = eligibleCards.find(item => {
        const hasDeflate = item.card.effects?.some(e => e.type === 'deflate');
        const recCoins = item.card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
        return hasDeflate && recCoins === 0 && currentPlayer.coins >= item.card.minBid;
      });
      if (anyCleanDeflate) return anyCleanDeflate.index;
    }
  }

  // Rams: When doubling token is unattached, nominate doubling superstars (preferring deflate)
  if (effectiveTeamId === 'rams' && !currentPlayer.ramsTokenAttached) {
    const deflateStar = eligibleCards.find(item => {
      const info = isRamsDoublingSuperstar(item.card);
      return info.isSuperstar && info.type === 'deflate' && currentPlayer.coins >= item.card.minBid;
    });
    if (deflateStar) return deflateStar.index;

    const coinStar = eligibleCards.find(item => {
      const info = isRamsDoublingSuperstar(item.card);
      return info.isSuperstar && info.type === 'coins' && currentPlayer.coins >= item.card.minBid;
    });
    if (coinStar) return coinStar.index;
  }

  // Seahawks: In early rounds with practice squad, nominate recurring engines or deflation
  if (effectiveTeamId === 'seahawks') {
    const hasPracticeSquad = (currentPlayer.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
    if (hasPracticeSquad && (G.board?.round || 1) <= 4) {
      const earlyEngine = eligibleCards.find(item =>
        item.card.effects?.some(e => e.perRound || e.type === 'deflate') && currentPlayer.coins >= item.card.minBid
      );
      if (earlyEngine) return earlyEngine.index;
    }
  }

  // Bears Nomination Strategy:
  // - "The 1-Coin Opening Bully":
  //   * Rounds 1-2: Nominate Tier 1 centerpieces (Kelce, Bowers, Mahomes, Kittle, Cousins, HOF) to bully with 13 coins + 2-coin raise wall.
  //   * Endgame (PSI <= 18): Nominate instant deflation nukes (deflate >= 3) to cross 0 PSI.
  //   * 1-Coin Steal Bully: Nominate high-value 1-coin minBid cards (score >= 10.0), forcing rivals to leap immediately to 3 coins or let Chicago steal for 1 coin.
  if (effectiveTeamId === 'bears' && eligibleCards.length > 0) {
    const currentRound = G.board.round || 1;
    const isEndgame = (currentPlayer.psi || 42) <= 18;

    if (isEndgame) {
      const closerNuke = eligibleCards.find(item => {
        const instDeflate = item.card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
        return instDeflate >= 3 && currentPlayer.coins >= item.card.minBid;
      });
      if (closerNuke) return closerNuke.index;
    }

    if (currentRound <= 2) {
      const centerpiece = eligibleCards.find(item => 
        (item.card.id === 'brock_bowers' || 
         item.card.id === 'travis_kelce' || 
         item.card.id === 'patrick_mahomes' || 
         item.card.id === 'george_kittle' ||
         item.card.id === 'kirk_cousins' ||
         item.card.phase === 'hof') && currentPlayer.coins >= item.card.minBid
      );
      if (centerpiece) return centerpiece.index;
    }

    const bullySteal = eligibleCards.find(item => item.card.minBid === 1 && item.score >= 10.0 && currentPlayer.coins >= 1);
    if (bullySteal) return bullySteal.index;
  }

  // Tactical Nomination Engine for General Human Heuristic Franchises:
  // - Extraction Bait: If top card is an expensive superstar dominated by a richer opponent, nominate to drain them!
  // - Greed Standoff Sneak: If top card is dominated, sneak a high-utility Tier 2 card while leaders hesitate.
  // - Primary Target: If we can contest or lead, nominate our top target directly.
  if (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId) && eligibleCards.length > 0) {
    const topCard = eligibleCards[0];
    const canContestTop = (currentPlayer.coins >= Math.min(topCard?.card.maxBid || 8, 8) && currentPlayer.coins >= richestOpponentCoins - 1);

    if (!canContestTop && richestOpponentCoins >= (topCard?.card.maxBid || 10) * 0.6) {
      return topCard.index;
    }

    if (!canContestTop && eligibleCards.length >= 2) {
      const tier2 = eligibleCards.find(item => item.score >= 10.0 && item.card.minBid <= currentPlayer.coins && item.index !== topCard.index);
      if (tier2) return tier2.index;
    }

    const affordableTop = eligibleCards.find(item => item.card.minBid <= currentPlayer.coins && item.score > 0);
    if (affordableTop) return affordableTop.index;
  }

  // Playtest 19 Note 8: Tactical Middle-Player Targeting
  // When low on coins or cannot compete with the richest opponent for the top card:
  // Instead of futilely nominating the top superstar (which a richer rival will take),
  // nominate a quality middle-tier player (ranked #2 or #3 with positive score)
  // that the CPU CAN comfortably afford to win for cheap!
  const topCardEffMax = getEffectiveCardMaxBid(eligibleCards[0].card, G.board.activeEvent);
  if (eligibleCards.length >= 2 && currentPlayer.coins < richestOpponentCoins && currentPlayer.coins < topCardEffMax) {
    const middleTargets = eligibleCards.filter((item, idx) => {
      if (idx === 0) return false;
      const affordableMin = currentPlayer.coins >= item.card.minBid;
      const goodQuality = item.score >= 4.0;
      const affordableExpected = currentPlayer.coins >= Math.min(item.card.maxBid, item.card.minBid + 2);
      return affordableMin && goodQuality && affordableExpected;
    });

    if (middleTargets.length > 0 && Math.random() < 0.70) {
      return middleTargets[0].index;
    }
  }

  // Decoy Nomination: only decoy if top affordable card is not already a prime quality target
  const archetype = getCpuArchetype(currentPlayer, currentPlayerId);
  const decoyChance = archetype === 'opportunist' ? 0.35 : (archetype === 'tycoon' ? 0.30 : 0.15);

  if (activeOpponents.length >= 2 && eligibleCards.length >= 2 && eligibleCards[0].score < 4.0 && Math.random() < decoyChance) {
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

export const evaluateBillsDiscardClaim = (G, billsId) => {
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

  const wonThisRound = (billsPlayer.cardsWonThisRound || 0) > 0;
  const lastAcquiredCard = wonThisRound && currentLineup.length > 0 ? currentLineup[currentLineup.length - 1] : null;

  if (currentLineup.length >= maxLineup && billsEffTeam !== 'colts') {
    currentLineup.forEach((starter, idx) => {
      const isPS = starter.isPracticeSquad || starter.uniqueId?.startsWith('ps_');
      const sRecurringDeflate = starter.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringCoins = starter.effects?.filter(e => e.perRound && e.type === 'coins' && e.amount > 0).reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringInflate = starter.effects?.filter(e => e.perRound && e.type === 'inflate').reduce((sum, e) => sum + e.amount, 0) || 0;
      const sRecurringNegCoins = starter.effects?.filter(e => e.perRound && e.type === 'coins' && e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0) || 0;

      const isToxic = sRecurringInflate > 0 || sRecurringNegCoins > 0;
      if (isToxic) hasToxicStarter = true;

      let sLostScore = 0;
      let sNetDeflate = 0;
      let sNetCoins = 0;

      if (isToxic) {
        sNetDeflate = -sRecurringInflate * roundsLeft;
        sNetCoins = -sRecurringNegCoins * roundsLeft;
        sLostScore = -300; // Toxic recurring cards: replace first before Practice Squad!
      } else if (isPS) {
        sLostScore = -100; // Practice Squad placeholder: replace before good cards, but after toxic!
      } else {
        sNetDeflate = (sRecurringDeflate - sRecurringInflate) * roundsLeft;
        sNetCoins = (sRecurringCoins - sRecurringNegCoins) * roundsLeft;
        sLostScore = (sNetDeflate * deflateWeight) + (sNetCoins * coinWeight);
      }

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

    // Extra incentive if cleansing a toxic starter or fresh drawback/instant starter from auction
    if (hasToxicStarter && minStarterLostValue <= 0) {
      netGainScore += toxicCleanseBonus;
    }

    // Championship Instant Win
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
      // and this candidate card only has 4 or 5 deflate, wait for the pipeline rather than burning the ability now!
      const hasSuperiorPipelineNuke = (pipelineAwareness > 0 && maxPipelineInstantDeflate >= 6 && maxPipelineInstantDeflate > instantDeflate);

      if (hasSuperiorPipelineNuke && currentRound <= 7) {
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
      const hasImpendingNuke = (pipelineAwareness > 0 && maxPipelineInstantDeflate >= 6);
      const isCashPoor = billsPlayer.coins <= cashBoostMaxCoins;
      const canSafelyCut = (currentLineup.length < maxLineup || minStarterLostValue <= 2.0);
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
};

// Predicts opponents' projected coin purses at the start of next round
export const predictRivalsNextRoundPurse = (G, currentPlayerId, card, currentHighBid, currentBidderId, ifPlayerWins = false) => {
  const activeOpponents = Object.keys(G.players).filter(id => id !== currentPlayerId);
  const oppPurses = {};

  activeOpponents.forEach(id => {
    const opp = G.players[id];
    let coins = opp.coins;
    const oppLineup = opp.lineup || [];

    // Recurring coins from lineup
    const recurring = oppLineup.reduce((sum, c) => {
      return sum + (c.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0);
    }, 0);
    coins += recurring;

    // Franchise refresh bonuses
    const teamId = getEffectiveTeamId(opp);
    if (teamId === 'cowboys') coins += 2;
    if (teamId === 'ravens') {
      const distinctPos = new Set(oppLineup.map(c => c.position).filter(pos => ['QB', 'WR', 'TE', 'RB'].includes(pos)));
      if (distinctPos.size >= 3) coins += 3;
    }
    if (teamId === 'texans') {
      const qbs = oppLineup.filter(c => c.position === 'QB').length;
      coins += qbs * 2;
    }
    if (teamId === 'browns') {
      // Browns cannot get coins from players, but get 30 coins at start of R5
      if ((G.board.round + 1) >= 5 && !opp.hasBrownsBonus) {
        coins = opp.coins + 30;
      } else {
        coins = opp.coins; // Ignore lineup coins
      }
    }
    if (teamId === 'dolphins' && coins === 0) coins += 3;

    // Bills discard ability threat: if Bills hasn't used ability and discard has high coin card
    if (teamId === 'bills' && !opp.hasUsedBillsAbility && G.decks?.discard) {
      const nabers = G.decks.discard.find(c => c.id === 'malik_nabers' || (c.effects?.some(e => e.type === 'coins' && e.amount >= 3)));
      if (nabers && coins >= nabers.minBid) {
        const nabersCoins = nabers.effects?.filter(e => e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
        coins += (nabersCoins - nabers.minBid);
      }
    }

    // Auction activity:
    const hasWon = opp.hasWonAuction || (opp.cardsWonThisRound || 0) >= 1;
    if (hasWon) {
      // Opponent already finished bidding
      oppPurses[id] = coins;
    } else if (!ifPlayerWins && currentBidderId === id) {
      // Opponent is currently winning the active card!
      coins = Math.max(0, coins - currentHighBid);
      const cardRec = card?.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      coins += cardRec;
      oppPurses[id] = coins;
    } else {
      // Opponent has not won yet and is not currently high bidder (or player wins this card)
      // They will likely spend at least 1-2 coins to win a card
      coins = Math.max(0, coins - 2);
      oppPurses[id] = coins;
    }
  });

  return oppPurses;
};

export const evaluateCpuAuctionBid = (G, currentPlayerId) => {
  const currentPlayer = G.players[currentPlayerId];
  const cardIndex = G.board.activeAuctionCardIndex;
  const card = G.board.auctionPlayers[cardIndex];
  if (!card) return { shouldBid: false, bidAmount: 0 };

  const effectiveTeamId = getEffectiveTeamId(currentPlayer);
  const teamGenome = currentPlayer?.genome || G?.teamGenomes?.[effectiveTeamId] || ACTIVE_TEAM_GENOMES[effectiveTeamId] || BASELINE_TEAM_GENOMES[effectiveTeamId] || DEFAULT_GENOME;
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
  const isCommandersMarked = (cardIndex === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(cardIndex));
  if (String(currentPlayerId) === String(G.board.firstPlayer) && isCommandersMarked && remainingCardsCount > 1) {
    return { shouldBid: false, bidAmount: 0 };
  }
  if (card.id === 'dj_moore' && currentPlayer.coins > 10) {
    return { shouldBid: false, bidAmount: 0 };
  }

  const cardScore = scoreCardForPlayer(G, currentPlayerId, card);
  const archetype = getCpuArchetype(currentPlayer, currentPlayerId);
  const isChiefsSuperstar = (card.id === 'patrick_mahomes' || card.id === 'travis_kelce');
  let isSuperstar = (
    card.phase === 'hof' || 
    effMax >= 17 || 
    isChiefsSuperstar ||
    card.id === 'patrick_mahomes' || 
    card.id === 'travis_kelce' || 
    card.id === 'christian_mccaffrey' || 
    card.id === 'lamar_jackson' || 
    card.id === 'justin_jefferson' || 
    card.id === 'adrian_peterson' || 
    card.id === 'derrick_henry' ||
    card.id === 'brock_bowers' ||
    card.id === 'drake_london' ||
    card.id === 'trevor_lawrence' ||
    card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount >= 3) ||
    card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3)
  );

  const isPatriotsR1Premier = (
    effectiveTeamId === 'patriots' && 
    (G.board.round || 1) === 1 && 
    (
      card.id === 'brock_bowers' || 
      card.id === 'kirk_cousins' || 
      card.id === 'george_kittle' || 
      card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3)
    )
  );

  const isRavensR1Star = (
    effectiveTeamId === 'ravens' && 
    (G.board.round || 1) === 1 && 
    (
      card.id === 'brock_bowers' || 
      card.id === 'george_kittle' || 
      card.id === 'kirk_cousins' || 
      card.id === 'drake_london' || 
      card.id === 'tee_higgins' || 
      card.id === 'josh_allen' || 
      card.id === 'greg_olsen' || 
      card.id === 'aj_brown' ||
      card.effects?.some(e => e.perRound && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2)))
    )
  );

  const nonPsRavensInit = (effectiveTeamId === 'ravens')
    ? (currentPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'))
    : [];
  const ravensPositionsInit = new Set(nonPsRavensInit.map(c => c.position).filter(pos => ['QB', 'RB', 'WR', 'TE'].includes(pos)));
  const isRavensCompletingEngine = (
    effectiveTeamId === 'ravens' && 
    (G.board.round || 1) <= 4 && 
    ravensPositionsInit.size === 2 && 
    !ravensPositionsInit.has(card.position)
  );

  const isCowboys = effectiveTeamId === 'cowboys';
  const cowboysRecInflate = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
  const cowboysRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
  const cowboysRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount > 0).reduce((s, e) => s + e.amount, 0) || 0;
  const cowboysInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
  const cowboysInstCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins' && e.amount > 0).reduce((s, e) => s + e.amount, 0) || 0;

  const isCowboysElite = isCowboys && !cowboysRecInflate && (
    isSuperstar ||
    card.id === 'brock_bowers' ||
    card.id === 'george_kittle' ||
    card.id === 'drake_london' ||
    card.id === 'tee_higgins' ||
    card.id === 'greg_olsen' ||
    card.id === 'josh_allen' ||
    card.id === 'sam_laporta' ||
    card.id === 'dallas_goedert' ||
    card.id === 'mark_andrews' ||
    card.id === 'zach_ertz' ||
    card.id === 'tj_hockenson' ||
    card.id === 'kyle_pitts' ||
    cowboysRecDeflate >= 2 ||
    cowboysRecCoins >= 3
  );

  const isCowboysTier2 = isCowboys && !cowboysRecInflate && !isCowboysElite && (
    cowboysRecCoins >= 2 ||
    cowboysRecDeflate >= 1 ||
    cowboysInstDeflate >= 3 ||
    cowboysInstCoins >= 4 ||
    card.id === 'kirk_cousins' ||
    card.id === 'jayden_daniels' ||
    card.id === 'dalton_schultz'
  );

  const isCowboysTarget = isCowboys && (G.board.round || 1) === 1 && (isCowboysElite || isCowboysTier2);

  const otherAvailableCards = G.board.auctionPlayers.filter((c, idx) => c !== null && idx !== cardIndex);
  const scoredOtherCards = otherAvailableCards.map(c => ({
    card: c,
    score: scoreCardForPlayer(G, currentPlayerId, c)
  }));
  const otherScores = scoredOtherCards.map(o => o.score).sort((a, b) => b - a);
  const secondBestScore = otherScores.length > 0 ? otherScores[0] : 0;
  const floorScore = otherScores.length > 0 ? otherScores[otherScores.length - 1] : 0;

  const maxLineup = (effectiveTeamId === 'seahawks' ? 4 : 3) + (currentPlayer.extraLineupSlots || 0);
  const currentLineup = currentPlayer.lineup || [];
  const avoidsDowngrade = (
    otherAvailableCards.length > 0 && 
    floorScore < cardScore && 
    floorScore < 0 && 
    (cardScore >= -0.5 || (cardScore - floorScore) >= 0.4) && 
    currentLineup.length >= maxLineup && 
    effectiveTeamId !== 'colts'
  );

  // #5 Exact Turns-to-Zero Endgame Calculus: Championship Instant Win
  // If purchasing this card immediately reduces PSI to <= 0, go all-in to secure the title!
  const cardInstantDeflate = (card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0) + (effectiveTeamId === 'bengals' && card.effects?.some(e => !e.perRound && e.type === 'deflate') ? 2 : 0);
  const jagsForesightInit = (effectiveTeamId === 'jaguars') ? evaluateJaguarsEventForesight(G, currentPlayerId) : null;
  const currentEffPsiInit = (effectiveTeamId === 'jaguars' && jagsForesightInit?.upcomingColdAirSoon)
    ? Math.max(0, currentPlayer.psi - 7)
    : currentPlayer.psi;
  if (currentEffPsiInit - cardInstantDeflate <= 0 && currentPlayer.coins >= nextBid) {
    const winBid = Math.min(effMax, currentPlayer.coins);
    return { shouldBid: true, bidAmount: Math.max(nextBid, winBid), isChampionshipBid: true };
  }

  // #1 Marginal Lineup Upgrade Value (Roster Replacement Delta with Board Strength Protection)
  // When the roster is full, winning this card forces cutting an active starter.
  // Take into account board strength:
  // If your active lineup has all 2 coins/round players, and this card gives 2 coins/round (cardScore ~ 0),
  // but another card on the board gives 1 coin/round (floorScore < 0 downgrade),
  // bidding on the 2 coins/round player prevents losing a coin per round later in the round!
  const hasDeadStarter = currentLineup.some(c => 
    c.isPracticeSquad || 
    c.id === 'practice_squad' || 
    c.uniqueId?.startsWith('ps_') || 
    !c.effects?.some(e => e.perRound || e.trigger === 'refresh' || e.type === 'every_round' || e.type === 'deflate_every_round') ||
    c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && (e.type === 'inflate' || (e.type === 'coins' && e.amount < 0)))
  );
  if (currentLineup.length >= maxLineup && !hasDeadStarter && effectiveTeamId !== 'colts') {
    const isCandidateInstant = card.effects && card.effects.some(e => !e.perRound);
    const isBengalsInstant = (effectiveTeamId === 'bengals' && isCandidateInstant);
    const isTexansQb = (effectiveTeamId === 'texans' && card.position === 'QB' && card.id !== 'deshaun_watson');
    const isHighValueCycleTarget = isCandidateInstant && (cardScore >= 8.0 || (card.effects?.some(e => !e.perRound && ((e.type === 'deflate' && e.amount >= 3) || (e.type === 'coins' && e.amount >= 4)))));
    if (!isBengalsInstant && !isTexansQb && !isSuperstar && !isHighValueCycleTarget) {
      if (avoidsDowngrade) {
        if (nextBid > Math.max(card.minBid + 1, 3)) {
          return { shouldBid: false, bidAmount: 0 };
        }
      } else {
        const isDolphins1CoinMandate = (effectiveTeamId === 'dolphins' && currentPlayer.coins === 1 && nextBid === 1);
        if (cardScore <= 0.5 && !isDolphins1CoinMandate) {
          return { shouldBid: false, bidAmount: 0 };
        }
        if (cardScore < 2.5 && nextBid >= 3) {
          return { shouldBid: false, bidAmount: 0 };
        }
        if (cardScore < nextBid * 0.75 && !isDolphins1CoinMandate) {
          return { shouldBid: false, bidAmount: 0 };
        }
      }
    }
  }

  // Dynamic Poison-Pill Taxing
  // If card is toxic (cardScore <= 0.5 or gives inflate >= 2), but an immune rival (Saints or score >= 15) is bidding/active:
  // Safely price-tax up to 2 coins (nextBid <= 2) knowing they will outbid, but NEVER bid >= 3!
  // Note: Saints ignores inflation, so cards with inflation are NOT toxic for Saints.
  // Note: Colts has unlimited roster and zero tolerance for poison - Colts NEVER buys or taxes poison cards!
  // Note: Browns cannot receive coins, so pure coin cards are not taxed by Browns.
  // Note: Steelers strictly protects its richest title and never bumps unwanted cards.
  // Note: Texans 1-win discipline passes on non-QBs when an affordable QB is waiting.
  const isToxicTaxingTeamExempt = (effectiveTeamId === 'colts' || effectiveTeamId === 'browns' || effectiveTeamId === 'steelers');
  const isTexansWaitingQb = (effectiveTeamId === 'texans' && otherAvailableCards.some(c => c && c.position === 'QB' && c.id !== 'deshaun_watson' && currentPlayer.coins >= c.minBid));
  const isBengalsInstantDiscard = (effectiveTeamId === 'bengals' && card.effects?.some(e => !e.perRound));
  const isBroncosPumpAndDump = (effectiveTeamId === 'broncos' && (card.id === 'hunter_henry' || card.id === 'ezekiel_elliott'));
  const isToxicForMe = effectiveTeamId !== 'saints' && !isBengalsInstantDiscard && !isBroncosPumpAndDump && (cardScore <= 0.5 || card.effects?.some(e => e.type === 'inflate' && e.amount >= 2));
  if (isToxicForMe && GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId)) {
    if (isToxicTaxingTeamExempt || isTexansWaitingQb) {
      return { shouldBid: false, bidAmount: 0 };
    }
    const immuneOpponent = Object.keys(G.players).some(oppId => {
      if (oppId === currentPlayerId) return false;
      const opp = G.players[oppId];
      if (!opp || opp.hasWonAuction || G.board.passedAuctionPlayers?.includes(oppId)) return false;
      return (getEffectiveTeamId(opp) === 'saints' || scoreCardForPlayer(G, oppId, card) >= 15.0);
    });
    if (immuneOpponent && nextBid <= 2 && currentPlayer.coins >= nextBid) {
      return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
    }
    return { shouldBid: false, bidAmount: 0 };
  }

  // #2 Leader Denial & 2-Round Table Threat Analysis
  let redThreatLeaderId = null; // 1 round / final turn away from winning
  let yellowThreatLeaderId = null; // 2 rounds away from winning

  const cardDeflateInstant = cardInstantDeflate;
  const cardDeflateRecurring = card.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;

  Object.keys(G.players).forEach(oppId => {
    if (oppId === currentPlayerId) return;
    const opp = G.players[oppId];
    if (!opp || !opp.team) return;

    let oppRecurring = 0;
    (opp.lineup || []).forEach(c => {
      c.effects?.forEach(e => {
        if (e.perRound && e.type === 'deflate') oppRecurring += e.amount * (c.ramsDoubleToken ? 2 : 1);
      });
    });
    const oppTeam = getEffectiveTeamId(opp);
    if (oppTeam === 'panthers') oppRecurring += 2;
    if (oppTeam === 'packers' && (opp.lineup || []).every(c => c.phase === 1)) oppRecurring += 4;
    if (oppTeam === '49ers' && ((opp.coins || 0) + calculate49ersIncomingCoins(opp, G)) < 5) oppRecurring *= 2;

    const projectedPerTurn = Math.max(1, oppRecurring);
    const willWinNextTurn = (opp.psi - (projectedPerTurn + cardDeflateInstant + cardDeflateRecurring)) <= 0;
    const willWinTwoTurns = (opp.psi - (projectedPerTurn * 2 + cardDeflateInstant + cardDeflateRecurring * 2)) <= 0;

    if (willWinNextTurn || opp.psi <= 6) {
      redThreatLeaderId = oppId;
    } else if (willWinTwoTurns || opp.psi <= 14) {
      if (!yellowThreatLeaderId) yellowThreatLeaderId = oppId;
    }
  });

  // Table Threat Reactions:
  // 1 Round Out (Red Threat): Final turn before rival wins!
  // Aggressively price-bump and hate-bid up to maximum spending power to block immediate championship loss!
  if (redThreatLeaderId !== null && G.board.highestBidder === redThreatLeaderId) {
    const defenseAgg = teamGenome.threatDefenseWeight || 1.0;
    const givesLeaderDeflate = (cardDeflateInstant > 0 || cardDeflateRecurring > 0 || cardScore >= 0);
    if (givesLeaderDeflate && currentPlayer.coins >= nextBid && nextBid <= Math.min(effMax, Math.round(effMax * defenseAgg))) {
      return { shouldBid: true, bidAmount: nextBid, isHateBid: true };
    }
  }

  // Playtest 19 Note 9: Worst Card Outbid Protection
  // If the human or another team nominates the worst card on the board for 1 coin,
  // no CPU should outbid them for 2+ coins when better cards are available on the board!
  if (otherAvailableCards.length > 0 && effectiveTeamId !== 'colts') {
    const betterAvailableCards = scoredOtherCards.filter(o => o.score > cardScore && o.card.minBid <= nextBid);
    const isLowestScoringOnBoard = scoredOtherCards.every(o => o.score >= cardScore);
    
    if (isLowestScoringOnBoard && nextBid >= 2 && betterAvailableCards.length > 0 && cardScore < 10.0) {
      return { shouldBid: false, bidAmount: 0 };
    }
  }

  // Playtest 19 Note 14 & user comments on Chargers:
  // 1. If highest bidder is Chargers, opponents intentionally pass on mediocre cards early in round to stick Chargers with the win!
  if (highestTeamId === 'chargers' && effectiveTeamId !== 'chargers') {
    const isEarlyInRound = remainingCardsCount >= 3;
    const isMediocreCard = cardScore < 8.0 && !isSuperstar;
    if (isEarlyInRound && isMediocreCard) {
      return { shouldBid: false, bidAmount: 0 };
    }
  }

  // 2. If current bidder is Chargers: Chargers does NOT want to win early because winning blocks future outbid farming!
  if (effectiveTeamId === 'chargers') {
    const isEarlyInRound = remainingCardsCount >= 3;
    if (isEarlyInRound && !isSuperstar) {
      const capableOpponents = Object.keys(G.players).filter(id => id !== currentPlayerId && !G.players[id].hasWonAuction && G.players[id].coins >= nextBid + 1);
      if (capableOpponents.length === 0) {
        return { shouldBid: false, bidAmount: 0 };
      }
    }
  }

  // Scarcity & Drop-Off Factor (FOMO)

  let scarcityMultiplier = 1.0;
  if (otherScores.length > 0) {
    const dropOff = cardScore - secondBestScore;
    if (dropOff <= 1.5 && secondBestScore > 0) {
      scarcityMultiplier = 0.75;
    } else if (dropOff >= 5.0 || floorScore < 0) {
      scarcityMultiplier = 1.35;
    }
  }

  // Era Anticipation Savings (Rounds 3 & 6)
  let savingsReserve = teamGenome.reserveCoins !== undefined ? teamGenome.reserveCoins : 0;
  const isApproachingPhase2 = (G.board.round === 3);
  const isApproachingHoF = (G.board.round === 6);
  const teamExemptFromHoarding = (effectiveTeamId === 'packers' || effectiveTeamId === 'browns' || effectiveTeamId === 'dolphins' || effectiveTeamId === 'colts' || effectiveTeamId === 'broncos');

  if ((isApproachingPhase2 || isApproachingHoF) && !teamExemptFromHoarding) {
    const remainingBoardCards = (G.board.auctionPlayers || []).filter(c => c !== null);
    const anyEspeciallyGoodOnBoard = remainingBoardCards.some(c => isCardEspeciallyGood(c, G, currentPlayerId));
    const anyFitsStrategyOnBoard = remainingBoardCards.some(c => doesCardFitTeamStrategy(effectiveTeamId, c, currentPlayer, G));
    const thisCardFits = doesCardFitTeamStrategy(effectiveTeamId, card, currentPlayer, G);
    const thisCardGood = isCardEspeciallyGood(card, G, currentPlayerId);

    if (!anyEspeciallyGoodOnBoard && !anyFitsStrategyOnBoard) {
      if (archetype === 'tycoon') savingsReserve = Math.max(savingsReserve, isApproachingHoF ? 6 : 5);
      else if (archetype === 'opportunist') savingsReserve = Math.max(savingsReserve, isApproachingHoF ? 5 : 4);
      else if (archetype === 'rusher') savingsReserve = Math.max(savingsReserve, isApproachingHoF ? 3 : 2);
      else savingsReserve = Math.max(savingsReserve, isApproachingHoF ? 4 : 3);
    } else if (!thisCardGood && !thisCardFits) {
      savingsReserve = Math.max(savingsReserve, 4);
    }
  }

  // Playtest 20: Early-Game Bankroll Management (Rounds 1-3)
  // Prevents CPUs from blowing entire purse on ordinary Phase 1 players and going broke!
  const isEarlyGame = G.board.round <= 3;
  if (isEarlyGame && !teamExemptFromHoarding && !isSuperstar) {
    const earlyReserve = Math.max(3, Math.round(currentPlayer.coins * 0.35));
    savingsReserve = Math.max(savingsReserve, earlyReserve);
  }

  // Era Horizon Cap (Rounds 3 & 6 Spending Cap):
  // Preserve funds for Phase 2 explosion (Round 3) and HOF era (Round 6) on non-superstars.
  if (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId) && !isSuperstar) {
    const isDolphinsBailout = (effectiveTeamId === 'dolphins');
    const incoming49ers = effectiveTeamId === '49ers' ? calculate49ersIncomingCoins(currentPlayer, G, card) : 0;
    const is49ersDroppingBelow5 = (effectiveTeamId === '49ers' && ((currentPlayer.coins || 0) + incoming49ers >= 5) && (
      (currentPlayer.lineup || []).some(c => c.effects?.some(e => e.perRound && e.type === 'deflate')) ||
      card.effects?.some(e => e.perRound && e.type === 'deflate')
    ));
    const isPackersPhase1Pursuit = (effectiveTeamId === 'packers' && card.phase === 1 && (currentPlayer.lineup || []).every(c => c.phase === 1 || c.isPracticeSquad));
    const isPatriotsR1PremierCard = (effectiveTeamId === 'patriots' && isPatriotsR1Premier);
    const isRavensEngineCard = (effectiveTeamId === 'ravens' && (isRavensR1Star || isRavensCompletingEngine));
    const isJetsMaxBuyout = (effectiveTeamId === 'jets' && (effMax <= 5 || currentPlayer.coins >= effMax));
    const isBengalsInstantBuyout = (effectiveTeamId === 'bengals' && (card.effects?.some(e => !e.perRound) || cardScore >= 12.0));
    const isBrownsDeflateCard = (effectiveTeamId === 'browns' && ((G.board?.round || 1) >= 4 || (card.effects?.filter(e => e.type === 'deflate').reduce((s, e) => s + e.amount, 0) >= 3) || (card.effects?.some(e => e.perRound && e.type === 'deflate' && e.amount >= 2))));
    const isTexansQbCard = (effectiveTeamId === 'texans' && ((card.position === 'QB' && card.id !== 'deshaun_watson') || (currentPlayer.psi || 47) <= 16));
    const isColtsCleanEngine = (effectiveTeamId === 'colts');
    const isSteelersSafeSpend = (effectiveTeamId === 'steelers');
    const isBroncosAnchor = (effectiveTeamId === 'broncos' && (card.phase === 'hof' || card.id === 'brock_bowers' || card.id === 'george_kittle' || card.effects?.some(e => e.type === 'deflate' && (e.amount >= 3 || (e.perRound && e.amount >= 2)))));
    const isChiefsHighTarget = (effectiveTeamId === 'chiefs' && (isChiefsSuperstar || cardScore >= 18.0));
    const isJaguarsHighTarget = (effectiveTeamId === 'jaguars' && cardScore >= 16.0);
    const isTitansAnchor = (effectiveTeamId === 'titans' && (G.board.round || 1) === 1 && (card.effects?.some(e => e.perRound && (e.type === 'deflate' || e.type === 'coins'))));

    const isExemptFromHorizonCap = isDolphinsBailout || is49ersDroppingBelow5 || isPackersPhase1Pursuit ||
      isPatriotsR1PremierCard || isRavensEngineCard || isJetsMaxBuyout ||
      isBengalsInstantBuyout || isBrownsDeflateCard || isTexansQbCard ||
      isColtsCleanEngine || isSteelersSafeSpend || isBroncosAnchor ||
      isChiefsHighTarget || isJaguarsHighTarget || isTitansAnchor;

    if (!isExemptFromHorizonCap) {
      if (G.board.round === 3) savingsReserve = Math.max(savingsReserve, 5);
      else if (G.board.round === 6) savingsReserve = Math.max(savingsReserve, 6);
      else if (G.board.round <= 2) savingsReserve = Math.max(savingsReserve, 2);
    }
  }

  // Rams Bankroll Preservation & Patience Strategy:
  // User directive: "they want to have the coins entering phase 2 to get the best player available to double them.
  // Maybe that superstar player doesn't come out in round 4 and you have to wait till round 5, that is okay,
  // you still want to make sure you have coins to get them in round 5 so in round 4 you don't want to just spend them all on a decent to good player...
  // If nothing really good comes out it might be worth waiting for the HOF players"
  const ramsStarInfo = effectiveTeamId === 'rams' ? isRamsDoublingSuperstar(card) : { isSuperstar: false };
  if (effectiveTeamId === 'rams' && !currentPlayer.ramsTokenAttached) {
    if (ramsStarInfo.isSuperstar) {
      savingsReserve = 0;
      isSuperstar = true;
    } else {
      // In Rounds 1-7, if card is not a superstar, preserve bankroll (>= 8 coins) for Phase 2 / HOF!
      savingsReserve = Math.max(savingsReserve, 8);
    }
  }

  // Playtest 20: 4-Deflate Superstars & 1-2 Turns Endgame Urgency
  const is4DeflateCard = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3);
  const estimatedEnd = G ? calculateEstimatedGameEndRound(G) : 10;
  const isEndgameTurns = (estimatedEnd - G.board.round <= 2) || G.board.round >= 7;

  if (is4DeflateCard || (isEndgameTurns && card.effects?.some(e => e.type === 'deflate')) || isChiefsSuperstar) {
    isSuperstar = true;
    savingsReserve = 0; // Never hoard savings when game-winning deflation or Patrick Mahomes / Travis Kelce is available!
  }

  // Dolphins can spend down to 0 without reserve because of instant 3-coin bailout!
  // Patriots can spend all coins in Round 1 on premier centerpieces!
  // Ravens can spend freely on Round 1 anchor stars & completing 3-position engine!
  // Jets can spend full purse on affordable max bid buyouts without hoarding restriction!
  // Bengals can spend freely on high-value instant cards without hoarding restriction!
  const isJetsMaxTarget = (effectiveTeamId === 'jets' && (effMax <= 5 || currentPlayer.coins >= effMax));
  const isBengalsInstantTarget = (effectiveTeamId === 'bengals' && (card.effects?.some(e => !e.perRound) || cardScore >= 12.0));
  const isBrownsTarget = (effectiveTeamId === 'browns' && (
    (G.board?.round || 1) >= 4 || 
    (card.effects?.filter(e => e.type === 'deflate').reduce((s, e) => s + e.amount, 0) >= 3) ||
    (card.effects?.some(e => e.perRound && e.type === 'deflate' && e.amount >= 2))
  ));
  const isSteelersTarget = (effectiveTeamId === 'steelers');
  const isTexansTarget = (effectiveTeamId === 'texans' && ((card.position === 'QB' && card.id !== 'deshaun_watson') || (currentPlayer.psi || 47) <= 16));
  const isColtsTarget = (effectiveTeamId === 'colts');
  // Jaguars Foresight Cash Management
  if (effectiveTeamId === 'jaguars') {
    const jForesight = evaluateJaguarsEventForesight(G, currentPlayerId);
    const jEffPsi = jForesight?.upcomingColdAirSoon ? Math.max(0, (currentPlayer.psi || 43) - 7) : (currentPlayer.psi || 43);
    if (jEffPsi <= 14 || isSuperstar) {
      savingsReserve = 0; // Closer mode: all-in on victory!
    } else if (jForesight?.upcomingLegendReturnsNext || G.board.activeEvent?.category === 'legend_returns' || (G.board.round === 4 && jForesight?.upcomingLegendReturns)) {
      // User Directive: "Maybe you have legend returns on round 4 so you can get a HOF player on round 5 out. Just make sure you are the richest player on round 5."
      savingsReserve = Math.max(savingsReserve, 7);
    } else if (jForesight?.upcomingDoubleDraft) {
      // Rookie Class double draft: preserve funds to win 2 players
      savingsReserve = Math.max(savingsReserve, 5);
    } else if (jForesight?.upcomingFreeAgency) {
      savingsReserve = Math.max(savingsReserve, 4);
    }
  }

  const isJaguarsR1Anchor = (
    effectiveTeamId === 'jaguars' &&
    (G.board.round || 1) === 1 &&
    (
      card.id === 'brock_bowers' ||
      card.id === 'george_kittle' ||
      card.id === 'kirk_cousins' ||
      card.effects?.some(e => (e.perRound || e.trigger === 'refresh') && ((e.type === 'coins' && e.amount >= 3) || (e.type === 'deflate' && e.amount >= 2)))
    )
  );
  const cardRecDeflateInit = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
  const cardRecCoinsInit = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
  const isJaguarsTarget = (effectiveTeamId === 'jaguars' && (
    currentEffPsiInit <= 16 || 
    isSuperstar || 
    isJaguarsR1Anchor || 
    cardScore >= 16.0 ||
    ((G.board.round || 1) <= 4 && (cardRecDeflateInit >= 2 || cardRecCoinsInit >= 2))
  ));
  const isTitansR1Anchor = (
    effectiveTeamId === 'titans' &&
    (G.board.round || 1) === 1 &&
    (
      card.id === 'brock_bowers' ||
      card.id === 'george_kittle' ||
      card.id === 'kirk_cousins' ||
      cardRecDeflateInit >= 1 ||
      cardRecCoinsInit >= 2
    )
  );
  const isTitansTarget = (effectiveTeamId === 'titans' && (
    isTitansR1Anchor ||
    cardScore >= 16.0 ||
    isSuperstar ||
    (currentPlayer.psi || 44) <= 16
  ));
  const isBroncosTarget = (effectiveTeamId === 'broncos' && (
    isSuperstar ||
    cardScore >= 12.0 ||
    card.id === 'hunter_henry' ||
    card.id === 'ezekiel_elliott' ||
    ((G.board.round || 1) <= 2 && (cardRecDeflateInit >= 2 || cardRecCoinsInit >= 3 || card.id === 'brock_bowers' || card.id === 'kirk_cousins' || card.id === 'george_kittle')) ||
    (currentPlayer.psi || 40) <= 16
  ));
  const isCommandersTarget = (effectiveTeamId === 'commanders' && (
    cardIndex === G.board?.commandersMarkedCardIndex || 
    G.board?.commandersMarkedIndices?.includes(cardIndex) || 
    G.board?.commandersShieldedCardId === card.id
  ) && cardScore >= 14.0);
  const isCardinalsBankrollTarget = (effectiveTeamId === 'cardinals' && (
    (G.board?.round || 1) <= 2 &&
    (cardScore >= 12.0 || isSuperstar || cardRecDeflateInit >= 1 || cardRecCoinsInit >= 2)
  ));
  const spendableCoins = (isSuperstar || isCardinalsBankrollTarget || isCommandersTarget || isPatriotsR1Premier || isRavensR1Star || isRavensCompletingEngine || isJetsMaxTarget || isBengalsInstantTarget || isBrownsTarget || isSteelersTarget || isTexansTarget || isColtsTarget || isJaguarsTarget || isTitansTarget || isTitansR1Anchor || isBroncosTarget || isCowboysTarget || savingsReserve === 0 || effectiveTeamId === 'dolphins') 
    ? currentPlayer.coins 
    : Math.max(0, currentPlayer.coins - savingsReserve);

  const activeOpponents = Object.keys(G.players).filter(
    id => id !== currentPlayerId && !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers?.includes(id)
  );
  const richestOpponentCoins = activeOpponents.length > 0
    ? Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0))
    : 0;

  const isCoinLeader = currentPlayer.coins > richestOpponentCoins;

  // Bills Discard Coordination: If a viable discard claim exists, reserve its minBid so Bills does not get locked out
  if (effectiveTeamId === 'bills' && !currentPlayer.hasUsedBillsAbility && G.decks?.discard && G.decks.discard.length > 0) {
    const discardTarget = evaluateBillsDiscardClaim(G, currentPlayerId);
    if (discardTarget && discardTarget.card) {
      savingsReserve = Math.max(savingsReserve, discardTarget.card.minBid);
    }
  }



  // Lions Dynamic Aggression & First Claim Eagerness:
  // Eager for the first claim of the round (+numPlayers coins bonus).
  // After the first claim is gone, behave slightly less aggressive than normal to preserve funds!
  const isFirstPlayerOfRound = Object.values(G.players).every(p => !p.hasWonAuction);
  let aggression = teamGenome.aggression || 1.0;
  if (effectiveTeamId === 'lions') {
    if (isFirstPlayerOfRound) {
      aggression = teamGenome.firstClaimAggression !== undefined ? teamGenome.firstClaimAggression : 1.50;
    } else {
      aggression = teamGenome.postClaimAggression !== undefined ? teamGenome.postClaimAggression : 0.85;
    }
  } else if (teamGenome.firstClaimAggression !== undefined && isFirstPlayerOfRound) {
    aggression = teamGenome.firstClaimAggression;
  } else if (teamGenome.postClaimAggression !== undefined && !isFirstPlayerOfRound) {
    aggression = teamGenome.postClaimAggression;
  }

  let baseValuation = Math.max(card.minBid, Math.min(effMax, Math.round(cardScore * 0.75 * scarcityMultiplier * aggression)));
  if (avoidsDowngrade) {
    const floorMult = teamGenome.boardStrengthWeight || 1.0;
    const floorValuation = Math.max(card.minBid + 1, Math.round((card.minBid + 1) * floorMult));
    baseValuation = Math.max(baseValuation, Math.min(Math.round(3 * floorMult), floorValuation));
  }
  if (is4DeflateCard && G.board.round >= 5) {
    baseValuation = Math.max(baseValuation, Math.round(effMax * 0.85)); // Fight aggressively for 4-deflate cards!
  }
  // Universal Elite Powerhouses: All teams bid aggressively on elite powerhouse players; richest player naturally prevails!
  if (isSuperstar) {
    const superstarMult = teamGenome.superstarPriorityMult || 1.0;
    baseValuation = Math.max(baseValuation, Math.min(effMax, Math.round(currentPlayer.coins * Math.min(0.95, 0.85 * superstarMult))));
  }

  // #2 Yellow Threat Reaction (2 Rounds Out): Lower, conservative price bump to avoid blowing purse early
  if (yellowThreatLeaderId !== null && G.board.highestBidder === yellowThreatLeaderId) {
    const givesLeaderDeflate = (cardDeflateInstant > 0 || cardDeflateRecurring > 0);
    if (givesLeaderDeflate) {
      const defenseAgg = teamGenome.threatDefenseWeight || 1.0;
      const yellowCeiling = Math.min(effMax - 2, Math.round(effMax * 0.50 * defenseAgg), Math.round(currentPlayer.coins * 0.45 * defenseAgg));
      baseValuation = Math.max(baseValuation, Math.min(yellowCeiling, baseValuation + 2));
    }
  }

  // General Human Valuation Strategy:
  // VORP / Board Quality Spread Scaling:
  // - High spread (e.g. Bowers vs bad scrubs): pay up for the top player!
  // - Flat board (multiple comparable players): do not overpay; let rivals fight while securing good value.
  if (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId) && effectiveTeamId !== 'dolphins') {
    const boardCards = (G.board.auctionPlayers || []).filter(c => c !== null);
    const allScores = boardCards.map(c => scoreCardForPlayer(G, currentPlayerId, c)).sort((a, b) => b - a);
    const topScore = allScores[0] || cardScore;
    const medianScore = allScores[Math.floor(allScores.length / 2)] || 0;
    const spread = topScore - medianScore;

    if (spread <= 1.5 && allScores.length >= 3 && !isSuperstar) {
      // Flat board: quality across cards is similar; do not overpay!
      baseValuation = Math.min(spendableCoins, Math.max(card.minBid, 3));
    } else {
      const spreadBoost = Math.min(1.35, 1.0 + (spread / 15.0));
      baseValuation = Math.round(Math.min(effMax, cardScore * 0.75 * spreadBoost));
      baseValuation = Math.min(spendableCoins, Math.max(card.minBid, baseValuation));
    }
  }

  // 49ers Ability: Double Deflation when purse < 5 during refresh
  // CRITICAL USER DIRECTIVE: Account for every round coin intake at refresh phase since coins happen before deflate!
  // If 49ers has 3 coins, but gains 2 coins at refresh, resultingCoins = 5 (>= 5), so they do not get ability.
  if (effectiveTeamId === '49ers') {
    const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const incomingCoinsWithCard = calculate49ersIncomingCoins(currentPlayer, G, card);
    const targetPurse = 4 - incomingCoinsWithCard; // Maximum coins allowed entering refresh

    // If card adds heavy recurring coins, penalize heavily as it ruins the under-5 threshold permanently!
    if (cardRecCoins >= 2) {
      baseValuation = Math.max(0, baseValuation - (cardRecCoins * 3));
    }

    const hasDeflateInLineup = (currentPlayer.lineup || []).some(c => c.effects?.some(e => e.perRound && e.type === 'deflate')) || card.effects?.some(e => e.perRound && e.type === 'deflate');

    if (hasDeflateInLineup && targetPurse >= 0) {
      const urgency = teamGenome.sub5UrgencyBonus !== undefined ? teamGenome.sub5UrgencyBonus : 3.0;
      const spendDownNeeded = currentPlayer.coins - targetPurse;
      if (spendDownNeeded > 0 && currentPlayer.coins >= spendDownNeeded) {
        // Bid aggressively to spend down below 5 coins so double deflation triggers at refresh!
        const spendTarget = Math.min(effMax, Math.min(currentPlayer.coins, spendDownNeeded + urgency));
        baseValuation = Math.max(baseValuation, spendTarget);
      }
    }
  }

  // Dolphins Ability: Spend down to 0 coins fearlessly to trigger +3 coins bailout
  if (effectiveTeamId === 'dolphins') {
    if (currentPlayer.coins === 1 && nextBid === 1) {
      baseValuation = Math.max(baseValuation, 1);
    } else {
      const hasBigRecurringDeflate = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3);
      const hasBigInstantDeflate = card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 5);
      const hasBigInstantCoins = card.effects?.some(e => !e.perRound && e.type === 'coins' && e.amount >= 4 && (e.amount - card.maxBid >= 1));
      const isSoloBestCard = otherScores.length >= 2 && cardScore >= 50.0 && otherScores.every(s => cardScore - s >= 20.0);
      const isHighDemandTarget = (isSuperstar || hasBigRecurringDeflate || hasBigInstantDeflate || hasBigInstantCoins || isSoloBestCard);

      const maxAllInPurse = teamGenome?.dolphinsMaxPurseAllIn !== undefined ? teamGenome.dolphinsMaxPurseAllIn : 14;
      const zeroSeekingMinScore = teamGenome?.dolphinsZeroSeekingThreshold !== undefined ? teamGenome.dolphinsZeroSeekingThreshold : 0.0;

      const isExactEffMaxMatch = (effMax === currentPlayer.coins && cardScore >= zeroSeekingMinScore);
      if (currentPlayer.coins <= maxAllInPurse && (isHighDemandTarget || isExactEffMaxMatch)) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, currentPlayer.coins));
      } else if (currentPlayer.coins <= 3 && nextBid <= currentPlayer.coins && cardScore >= zeroSeekingMinScore) {
        baseValuation = Math.max(baseValuation, currentPlayer.coins);
      }
    }
  }

  // Rams Doubling Superstar Valuation & Spending Discipline:
  // User directive: "they want to have the coins entering phase 2 to get the best player available to double them.
  // Maybe that superstar player doesn't come out in round 4 and you have to wait till round 5, that is okay,
  // you still want to make sure you have coins to get them in round 5 so in round 4 you don't want to just spend them all on a decent to good player...
  // A superstar player I would double in round 4 is 4 deflate every round or 5 coins every round. But usually you want to lean towards deflate over coins"
  if (effectiveTeamId === 'rams' && !currentPlayer.ramsTokenAttached) {
    const starInfo = isRamsDoublingSuperstar(card);
    if (starInfo.isSuperstar) {
      if (starInfo.type === 'deflate') {
        const deflateCeiling = Math.min(effMax, currentPlayer.coins, Math.max(card.minBid, 14));
        baseValuation = Math.max(baseValuation, deflateCeiling);
      } else if (starInfo.type === 'coins') {
        const coinCeiling = Math.min(effMax, currentPlayer.coins, Math.max(card.minBid, 11));
        baseValuation = Math.max(baseValuation, coinCeiling);
      }
    } else {
      // Non-superstar: protect bankroll so we have >= 8 coins for Round 5 or HOF!
      const maxSpendWithoutStar = Math.max(card.minBid, currentPlayer.coins - 8);
      baseValuation = Math.min(baseValuation, maxSpendWithoutStar);
    }
  }

  // Seahawks 4-Slot Early Deployment & Mid/Late Wealth Deployment:
  if (effectiveTeamId === 'seahawks') {
    const hasPracticeSquad = (currentPlayer.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
    const isEngine = card.effects?.some(e => e.perRound || e.type === 'deflate');
    if (hasPracticeSquad && (G.board?.round || 1) <= 4 && isEngine) {
      // Do not let early engines slip away; bid up to 4 coins to rapidly replace practice squad
      const earlyEngineTarget = Math.min(effMax, currentPlayer.coins, Math.max(card.minBid, 4));
      baseValuation = Math.max(baseValuation, earlyEngineTarget);
    } else if ((G.board?.round || 1) >= 5 && currentPlayer.coins >= 12) {
      // Mid/late game: deploy accumulated wealth into elite deflation across 4 slots
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const instDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (recDeflate >= 3 || instDeflate >= 4 || isSuperstar) {
        const wealthDeploymentBid = Math.min(effMax, currentPlayer.coins, Math.max(card.minBid + 2, Math.round(currentPlayer.coins * 0.45)));
        baseValuation = Math.max(baseValuation, wealthDeploymentBid);
      }
    }
  }

  // Commanders Shielded Mark Conviction:
  if (effectiveTeamId === 'commanders') {
    const wasMarked = (cardIndex === G.board?.commandersMarkedCardIndex || G.board?.commandersMarkedIndices?.includes(cardIndex) || G.board?.commandersShieldedCardId === card.id);
    if (wasMarked && cardScore >= 14) {
      baseValuation = Math.max(baseValuation, Math.min(spendableCoins, Math.min(5, effMax)));
    }
  }

  // Patriots Valuation Strategy:
  // - Round 1: Willing to spend up to all 7 coins on premier centerpieces (Bowers, Cousins, Kittle, 3+ coins/round).
  //   If not a premier card in Round 1, play cheap: cap baseValuation at min(baseValuation, Math.max(card.minBid, 3)).
  // - Endgame Closer (PSI <= 18): Value instant deflation nukes aggressively to cross 0 PSI.
  if (effectiveTeamId === 'patriots') {
    const currentRound = G.board.round || 1;
    if (currentRound === 1) {
      const isPremierR1Centerpiece = (
        card.id === 'brock_bowers' || 
        card.id === 'kirk_cousins' || 
        card.id === 'george_kittle' || 
        card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3)
      );
      if (isPremierR1Centerpiece) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, currentPlayer.coins));
      } else {
        baseValuation = Math.min(baseValuation, Math.max(card.minBid, 3));
      }
    } else if ((currentPlayer.psi || 36) <= 18) {
      const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instantDeflate >= 3) {
        const closerBonus = (instantDeflate >= (currentPlayer.psi || 36)) ? currentPlayer.coins : (instantDeflate * 2);
        baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(currentPlayer.coins, card.minBid + closerBonus)));
      }
    }
  }

  // Ravens Valuation Strategy:
  // - Round 1: Use 14-coin purse to acquire an elite anchor player (Bowers, Kittle, Cousins, 3+ coins/rd, 2+ deflate/rd).
  //   Spend around 9 coins if a star is revealed. If not a star player, remain disciplined: cap baseValuation at min(baseValuation, Math.max(card.minBid, 3)).
  // - Rounds 2-4: Assemble 3 distinct positions { QB, RB, WR, TE } to unlock the +3 coins/round engine!
  //   If Ravens has a recurring coin producer, bid more aggressively on missing positions.
  //   If missing the 3rd position, heavily value securing the engine.
  //   If card is a duplicate position during early game (while Practice Squad cards remain), avoid it unless superstar.
  if (effectiveTeamId === 'ravens') {
    const currentRound = G.board.round || 1;
    const nonPsRavens = (currentPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
    const ravensPositions = new Set(nonPsRavens.map(c => c.position).filter(pos => ['QB', 'RB', 'WR', 'TE'].includes(pos)));
    const isNewPosition = !ravensPositions.has(card.position);
    const hasCoinProducer = nonPsRavens.some(c => c.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 2));

    if (currentRound === 1) {
      if (isRavensR1Star) {
        // User directive: Spend around 9 coins on the star player in Round 1
        baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(9, currentPlayer.coins)));
      } else {
        // Non-star in Round 1: do not waste capital; expect cheap pickup or pass
        baseValuation = Math.min(baseValuation, Math.max(card.minBid, 3));
      }
    } else if (currentRound <= 4) {
      if (isNewPosition) {
        if (ravensPositions.size === 2) {
          // Completes 3 distinct positions -> activates +3 coins/round engine!
          const engineUrgency = hasCoinProducer ? 7 : 5;
          baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(currentPlayer.coins, card.minBid + engineUrgency)));
        } else if (ravensPositions.size === 1) {
          // Stepping stone (2nd position)
          const stepUrgency = hasCoinProducer ? 5 : 3;
          baseValuation = Math.max(baseValuation, Math.min(effMax, Math.max(card.minBid, Math.min(card.minBid + stepUrgency, 5))));
        }
      } else {
        // Duplicate position while still trying to build 3-position engine
        if (nonPsRavens.length < 3 && !isSuperstar) {
          baseValuation = Math.min(baseValuation, card.minBid);
        }
      }
    }
  }

  // Cowboys Valuation Strategy:
  // - Starts with 5 coins and guaranteed passive +2 coins at the end of every round.
  // - Round 1:
  //   * If an elite centerpiece is available, use all 5 coins!
  //   * Even a Tier 2 starter is worth up to 4 coins (passive 2 coins/turn replenishes purse).
  if (isCowboys && (G.board.round || 1) === 1) {
    if (isCowboysElite) {
      baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(5, currentPlayer.coins)));
    } else if (isCowboysTier2) {
      baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(4, currentPlayer.coins)));
    }
  }

  // Cardinals Valuation & Bankroll Bully Strategy:
  // 1. Rounds 1-2 Bankroll Bully:
  //    Cardinals starts with 15 coins (tied for richest normal team). Opponents have only 5-8 coins.
  //    When an elite deflation engine or high-synergy anchor appears, bully the table!
  //    Spend up to 8-9 coins to lock in a cornerstone player before rivals can afford to contest.
  // 2. Rusher-Specific Price Bumping (Patriots / Browns / Low-PSI rushers):
  //    If highest bidder is a low-PSI rusher (e.g. Patriots or opponent with PSI <= 25 and coins <= 7)
  //    bidding on a pure deflation card, actively bump the price to force them to pay up or drain their purse!
  if (effectiveTeamId === 'cardinals') {
    const currentRound = G.board.round || 1;
    if (currentRound <= 2) {
      const isCardinalsR1Anchor = (
        isSuperstar ||
        cardScore >= 14.0 ||
        card.id === 'brock_bowers' ||
        card.id === 'george_kittle' ||
        card.id === 'kirk_cousins' ||
        card.id === 'derrick_henry' ||
        card.id === 'saquon_barkley' ||
        card.effects?.some(e => e.perRound && ((e.type === 'deflate' && e.amount >= 2) || (e.type === 'coins' && e.amount >= 2)))
      );
      if (isCardinalsR1Anchor) {
        const bullyCeiling = Math.min(effMax, currentPlayer.coins, 8);
        baseValuation = Math.max(baseValuation, bullyCeiling);
      }
    }

    // Rusher-Specific Counter-Bidding:
    // If the current leader is a cash-strapped rusher (e.g. Patriots at 36 PSI with <= 7 coins)
    // trying to steal cheap deflation, force them to pay or drop out!
    if (highestBidderPlayer && highestBidderPlayer.id !== currentPlayerId) {
      const rivalPsi = highestBidderPlayer.psi || 40;
      const rivalCoins = highestBidderPlayer.coins || 0;
      const givesDeflate = card.effects?.some(e => e.type === 'deflate');
      const isRusherThreat = (highestTeamId === 'patriots' || rivalPsi <= 25) && rivalCoins <= 7;
      if (isRusherThreat && givesDeflate && currentPlayer.coins >= nextBid + 2 && nextBid <= 5) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, nextBid + 1));
      }
    }
  }

  // Browns Valuation Strategy:
  // Human-like Strategic & Board-Tier Forward-Thinking Valuation:
  // - Pure coin cards: zero deflation and zero coins -> strictly zero valuation / do not bid.
  // - Evaluates card's lifetime deflation: instant + (recurring * roundsRemaining).
  // - Evaluates all alternative cards on the board and their deflation tiers:
  //   * If other top-tier deflation cards exist, don't get into an overpriced war; let rival overspend and buy the alternative.
  //   * If this is the ONLY viable deflation card on the board (all others are pure coins/junk), the fallback is literally ZERO,
  //     so Browns bids with extreme urgency to avoid a wasted round.
  //   * In Phase 1 (Rounds 1-3): Budgets against the 20-coin initial purse and rounds until the Round 5 +30 bonus.
  //     Dual-threat cards (e.g. Bowers or any 2+ recurring + instant) are prized centerpieces worth bidding up aggressively (leaving 1-2 coins/round).
  //     Ordinary cards are bought for low cost (bang-for-buck).
  //   * Round 4: Spend remaining Phase 1 purse before the Round 5 cash drop.
  //   * Round 5+: With 30+ coins, bully auctions on high-deflation targets (Mahomes, Kelce, HOF, nukes), budgeting spendable
  //     coins per remaining round so coins are never left unspent when the game ends.
  if (effectiveTeamId === 'browns') {
    if (cardScore <= -50) {
      return { shouldBid: false, bidAmount: 0 };
    }

    const currentRound = G.board.round || 1;
    const estimatedEnd = calculateEstimatedGameEndRound(G);
    const roundsRemaining = Math.max(1, estimatedEnd - currentRound + 1);

    // Dynamic Deflation Output of this card
    const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardLifetimeDeflate = cardInstDeflate + (cardRecDeflate * roundsRemaining);

    // Dual-threat Phase 1 centerpiece (e.g. Bowers or any 2+ recurring + instant)
    const isDualThreatPhase1 = (card.phase === 1 || currentRound <= 3) && cardRecDeflate >= 2 && cardInstDeflate >= 1;

    // Analyze ALL other available cards on the board for their deflation value to Browns
    const otherDeflateCards = otherAvailableCards.map(c => {
      const rec = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const inst = c.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const lifetime = inst + (rec * roundsRemaining);
      const isDual = (c.phase === 1 || currentRound <= 3) && rec >= 2 && inst >= 1;
      return { card: c, rec, inst, lifetime, isDual, minBid: c.minBid };
    }).filter(c => c.lifetime > 0);

    otherDeflateCards.sort((a, b) => b.lifetime - a.lifetime);

    const bestAlt = otherDeflateCards.length > 0 ? otherDeflateCards[0] : null;
    const bestAltLifetime = bestAlt ? bestAlt.lifetime : 0;

    // Board Competition & Scarcity Analysis
    const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;
    const rivalsNeedingCards = Object.keys(G.players).filter(
      id => id !== currentPlayerId && (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound && !G.board.passedAuctionPlayers.includes(id)
    );
    const numRivals = rivalsNeedingCards.length;

    // Is this the ONLY deflation card remaining on the board? (Monopoly on deflation)
    const isSolitaryDeflationCard = (otherDeflateCards.length === 0);
    // Are there more deflation cards than rivals needing cards? (Guaranteed deflation without bidding war)
    const hasDeflationSurplus = (otherDeflateCards.length >= numRivals && numRivals > 0);

    let targetValuation = card.minBid;

    if (currentRound <= 3) {
      // -------------------------------------------------------------
      // PHASE 1 (Rounds 1-3): Budgeting 20 Starting Coins
      // -------------------------------------------------------------
      const roundsUntilBonus = Math.max(1, 5 - currentRound);
      const budgetPerPhase1Round = Math.floor(currentPlayer.coins / roundsUntilBonus);

      if (isDualThreatPhase1) {
        // Dual-threat (2 recurring + instant, e.g. Bowers or equivalent):
        // Crown jewel of Phase 1! Delivers ~16 lifetime deflation.
        if (isSolitaryDeflationCard) {
          // Solitary dual-threat: alternative is 0 deflation!
          // Willing to spend up to currentPlayer.coins - (roundsUntilBonus - 1)
          const keepReserve = Math.max(1, roundsUntilBonus - 1);
          targetValuation = Math.max(card.minBid, Math.min(effMax, currentPlayer.coins - keepReserve));
        } else if (bestAltLifetime >= 12) {
          // Another great 2-deflate card is on the board!
          // Marginal advantage is small -> don't overpay; cap bid reasonably
          targetValuation = Math.max(card.minBid, Math.min(effMax, Math.min(budgetPerPhase1Round + 4, 8)));
        } else {
          // Alternative is mediocre (1-deflate or junk) -> strong priority
          const keepReserve = Math.max(2, roundsUntilBonus);
          targetValuation = Math.max(card.minBid, Math.min(effMax, currentPlayer.coins - keepReserve));
        }
      } else if (cardRecDeflate >= 2) {
        // Solid 2-deflate card in Phase 1:
        if (isSolitaryDeflationCard) {
          const keepReserve = Math.max(2, roundsUntilBonus * 2);
          targetValuation = Math.max(card.minBid, Math.min(effMax, currentPlayer.coins - keepReserve));
        } else if (hasDeflationSurplus) {
          targetValuation = Math.min(card.minBid + 1, 4);
        } else {
          targetValuation = Math.min(card.minBid + 2, Math.max(card.minBid, 5));
        }
      } else {
        // Ordinary 1-deflate or minor instant card in Phase 1:
        // Bang-for-buck! Cap at low cost to preserve bankroll for future rounds
        if (isSolitaryDeflationCard) {
          targetValuation = Math.min(card.minBid + 3, Math.max(card.minBid, 6));
        } else {
          targetValuation = Math.min(card.minBid + 1, Math.max(card.minBid, 4));
        }
      }
    } else if (currentRound === 4) {
      // -------------------------------------------------------------
      // ROUND 4 (Phase 2 Arrival, Pre-Bonus):
      // -------------------------------------------------------------
      // Next turn is Round 5 (+30 coins guaranteed). Spend freely on best player!
      if (cardLifetimeDeflate >= 12 || isSolitaryDeflationCard) {
        targetValuation = Math.min(effMax, currentPlayer.coins);
      } else if (cardLifetimeDeflate >= 6) {
        targetValuation = Math.min(effMax, Math.max(card.minBid, Math.round(currentPlayer.coins * 0.80)));
      } else {
        targetValuation = Math.min(card.minBid + 2, 5);
      }
    } else {
      // -------------------------------------------------------------
      // ROUNDS 5+ (Post-Bonus War Chest): 30+ Coins In Hand!
      // -------------------------------------------------------------
      // Unspent coins at game end are WORTHLESS!
      const spendPowerPerRound = Math.ceil(currentPlayer.coins / roundsRemaining);

      const isEliteSuperstar = (
        cardRecDeflate >= 4 || 
        cardInstDeflate >= 6 || 
        cardLifetimeDeflate >= 15 || 
        card.phase === 'hof' || 
        card.id === 'patrick_mahomes' || 
        card.id === 'travis_kelce'
      );

      if (isEliteSuperstar) {
        if (isSolitaryDeflationCard) {
          // Solitary monster card (e.g. Mahomes/Kelce and all other cards are coins):
          // Bully auction! Spend up to full purse (keeping tiny reserve for subsequent rounds if roundsRemaining > 1)
          const keepForFuture = (roundsRemaining > 1) ? Math.min(6, Math.round(currentPlayer.coins * 0.15)) : 0;
          targetValuation = Math.min(effMax, Math.max(card.minBid, currentPlayer.coins - keepForFuture));
        } else if (bestAlt && (bestAlt.rec >= 4 || bestAlt.lifetime >= 14)) {
          // Another elite card exists on the board (e.g. both Mahomes and Kelce)!
          // Don't blow full purse; let rivals fight over the first, take the second
          targetValuation = Math.min(effMax, Math.max(card.minBid + 4, spendPowerPerRound + 4));
        } else {
          // Solitary elite card among mediocre deflation cards:
          const keepForFuture = (roundsRemaining > 1) ? Math.min(6, Math.round(currentPlayer.coins * 0.20)) : 0;
          targetValuation = Math.min(effMax, Math.max(card.minBid, currentPlayer.coins - keepForFuture));
        }
      } else if (cardLifetimeDeflate >= 8) {
        // Solid Tier 2 deflater in Phase 2
        if (isSolitaryDeflationCard) {
          targetValuation = Math.min(effMax, Math.max(card.minBid, Math.round(currentPlayer.coins * 0.65)));
        } else {
          targetValuation = Math.min(effMax, Math.max(card.minBid, Math.min(spendPowerPerRound, 10)));
        }
      } else {
        // Minor floor deflater
        targetValuation = Math.min(effMax, Math.max(card.minBid, 4));
      }
    }

    baseValuation = targetValuation;
  }

  // Steelers Valuation Strategy:
  // Human-Level Economic Prediction & Bankroll Dominance:
  // - Ability: Strictly richest at start of round siphons 1 PSI from every opponent (Steelers -6 to -9 PSI, opponents +1 PSI)!
  // - 1. Endgame Closer Pivot: If PSI <= 18 or Round >= 7, crossing 0 PSI is prioritized over hoarding coins.
  //      Bid up to full purse on game-winning deflation (Mahomes, Kelce, legends, 4-7 instant deflation nukes).
  // - 2. Predict Opponent End-of-Round Purses:
  //      * Considers active rosters, recurring income, and franchise abilities (Cowboys, Ravens, Texans, Browns, Dolphins, Bills).
  //      * Tracks if opponents have already won this round or are currently winning.
  // - 3. Critical Trade-Off (Austerity vs Investment):
  //      * If PASSING makes Steelers strictly richest, but BIDDING would surrender the title, PASS!
  //        (Guaranteed 6 to 9 deflation next round vastly outweighs any ordinary player).
  //      * If Steelers can WIN and STILL be strictly richest, bid within safe surplus.
  //      * If alternatives exist in the auction row, do not overpay on the first card (cap at 60% maxBid).
  // - 4. If Steelers cannot be richest this round regardless (e.g. Round 1 against 20-coin Browns/Broncos):
  //      * Strict austerity: cap bids at 2 coins on compounding engines; let rivals blow purses so Steelers takes the lead next round!
  if (effectiveTeamId === 'steelers') {
    const currentRound = G.board.round || 1;
    const currentHighBid = G.board.highestBid || 0;
    const currentBidderId = G.board.highestBidder;
    const nextBid = (currentBidderId === null) ? card.minBid : (currentHighBid + 1);

    const myLineup = currentPlayer.lineup || [];
    const myLineupCoins = myLineup.reduce((sum, c) => {
      return sum + (c.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0);
    }, 0);

    const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const cardInstCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;

    // 1. Endgame Closer Pivot
    const closerThreshold = teamGenome.closerPsiThreshold !== undefined ? teamGenome.closerPsiThreshold : 18;
    if (currentPlayer.psi <= closerThreshold || currentRound >= 7) {
      const roundsLeft = Math.max(1, 10 - currentRound);
      const totalDeflate = cardInstDeflate + (cardRecDeflate * roundsLeft);
      if (totalDeflate >= 3 || cardInstDeflate >= currentPlayer.psi) {
        if (nextBid <= currentPlayer.coins) {
          return { shouldBid: true, bidAmount: nextBid, isChampionshipBid: (cardInstDeflate >= currentPlayer.psi) };
        }
      }
    }

    // 2. Predict opponent end-of-round purses (evaluating both pass and win scenarios)
    const oppPursesIfPass = predictRivalsNextRoundPurse(G, currentPlayerId, card, currentHighBid, currentBidderId, false);
    const oppPursesIfWin = predictRivalsNextRoundPurse(G, currentPlayerId, card, currentHighBid, currentBidderId, true);
    const maxOppCoinsIfPass = Math.max(0, ...Object.values(oppPursesIfPass));
    const maxOppCoinsIfWin = Math.max(0, ...Object.values(oppPursesIfWin));

    // 3. Projected Steelers Purses
    const projectedWinCoins = currentPlayer.coins - nextBid + myLineupCoins + cardRecCoins + cardInstCoins;
    const projectedPassCoins = currentPlayer.coins - 1 + myLineupCoins;

    const staysRichestIfWin = (projectedWinCoins > maxOppCoinsIfWin);
    const isRichestIfPass = (projectedPassCoins > maxOppCoinsIfPass);

    // Scan remaining cards on the board
    const otherCards = (G.board.auctionPlayers || []).filter((c, idx) => c !== null && idx !== cardIndex);
    const otherHasCoins = otherCards.some(c => c.effects?.some(e => e.type === 'coins'));
    const otherHasDeflate = otherCards.some(c => c.effects?.some(e => e.type === 'deflate'));

    // 4. Critical User Trade-Off:
    // If PASSING guarantees richest (+6 to +9 PSI deflation swing!), but BIDDING loses the title: PASS!
    if (isRichestIfPass && !staysRichestIfWin) {
      return { shouldBid: false, bidAmount: 0 };
    }

    // 5. If we stay richest with this bid:
    if (staysRichestIfWin) {
      const safeSurplus = (currentPlayer.coins + myLineupCoins + cardRecCoins + cardInstCoins) - (maxOppCoinsIfWin + 1);
      let bidLimit = Math.min(currentPlayer.coins, nextBid + safeSurplus);

      if (otherHasCoins || otherHasDeflate) {
        const altCapRatio = teamGenome.altCapRatio !== undefined ? teamGenome.altCapRatio : 0.60;
        const reasonableCap = Math.max(card.minBid + 1, Math.round(card.maxBid * altCapRatio));
        bidLimit = Math.min(bidLimit, reasonableCap);
      }

      baseValuation = Math.min(effMax, bidLimit);
    } else {
      // 6. If we CANNOT be richest this round regardless:
      // Austere investment: cap bids at 2 coins on compounding engines; let rivals blow their purses!
      const r1MaxCoinBid = teamGenome.r1MaxCoinBid !== undefined ? teamGenome.r1MaxCoinBid : 2;
      let allowedBid = 0;
      if (cardRecCoins >= 2 && nextBid <= r1MaxCoinBid) {
        allowedBid = nextBid;
      } else if (cardRecCoins >= 1 && nextBid <= Math.min(2, r1MaxCoinBid)) {
        allowedBid = nextBid;
      } else if (cardInstDeflate >= 3 && nextBid <= 2) {
        allowedBid = nextBid;
      }
      baseValuation = allowedBid;
    }
  }

  // Houston Texans Strategic Valuation & QB Engine Hegemony:
  // Texans Ability: During Refresh Phase gain 2 coins and 2 deflate for each QB on your team.
  // Profile: Starts with 47 PSI (heavy burden) and 8 Coins (low starting capital).
  // Strategy:
  // 1. Board-Scan & 1-Win Discipline:
  //    - Each round, a team can only win 1 card (unless Double Draft).
  //    - If viable QBs exist on the auction board (affordable and not toxic inflation):
  //      * If active card is a NON-QB: PASS! Winning it locks Texans out of bidding on the QB for the rest of the round!
  //        (Exception: Championship-winning instant deflation).
  // 2. QB Valuation:
  //    - Every QB delivers (cardDeflate + 2) deflate/round and (cardCoins + 2) coins/round.
  //    - Calculate true lifetime deflation and coins over remaining rounds.
  //    - Viable QBs (Cousins, Allen, Daniels, Lawrence, Murray, Mahomes, Burrow, Lamar, Hurts, Herbert, Purdy, HOF QBs)
  //      are worth spending up to full available purse (currentPlayer.coins).
  //    - Board Alternatives / Multi-QB Awareness:
  //      * If MULTIPLE viable QBs exist on the board, don't get baited into an overpriced war if a second QB can be won cheaper!
  //      * If this is the SOLE viable QB on the board, bid with maximum urgency to ensure Texans wins it.
  // 3. Normal Gameplay (When NO viable QBs exist on the board):
  //    - "Play normally": Value high deflation, elite powerhouses (Bowers, Jefferson, etc.), and coin producers.
  //    - Capital preservation: In early rounds (R1-R3), cap spending on ordinary non-QBs so Texans retains bankroll for upcoming QBs.
  // 4. Endgame Closer Pivot (PSI <= 16):
  //    - Pivot purse to raw instant deflation to close out the championship at 0 PSI.
  if (effectiveTeamId === 'texans') {
    const currentRound = G.board.round || 1;
    const estimatedEnd = calculateEstimatedGameEndRound(G);
    const roundsRemaining = Math.max(1, estimatedEnd - currentRound + 1);
    const isEndgameCloser = (currentPlayer.psi <= 16 || currentRound >= 7);

    // 1. Endgame Closer: If card gives instant deflation to reach <= 0 PSI, go all-in!
    const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    if (currentPlayer.psi - cardInstDeflate <= 0 && nextBid <= currentPlayer.coins) {
      return { shouldBid: true, bidAmount: Math.min(effMax, currentPlayer.coins), isChampionshipBid: true };
    }

    // Helper to evaluate if a QB is viable (positive value, not toxic recurring inflation like Deshaun Watson)
    const isViableQb = (c) => {
      if (!c || c.position !== 'QB') return false;
      return scoreCardForPlayer(G, currentPlayerId, c) > 0;
    };

    const isCurrentCardViableQb = isViableQb(card);
    const otherViableQbs = otherAvailableCards.filter(c => isViableQb(c) && currentPlayer.coins >= c.minBid);

    const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;
    const winsRemainingForMe = maxWinsThisRound - (currentPlayer.cardsWonThisRound || 0);

    // 2. The 1-Win Constraint:
    // If viable QBs exist on the board that Texans can afford, DO NOT win a non-QB and lock ourselves out!
    if (!isCurrentCardViableQb && otherViableQbs.length > 0 && winsRemainingForMe <= 1) {
      if (!isEndgameCloser || cardInstDeflate < (currentPlayer.psi - 4)) {
        return { shouldBid: false, bidAmount: 0 };
      }
    }

    if (isCurrentCardViableQb) {
      // 3. Current Card IS a Viable QB:
      const qbsInLineup = (currentPlayer.lineup || []).filter(c => c.position === 'QB');
      const isLineupFullOfQbs = qbsInLineup.length >= maxLineup;

      const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
      const cardInstCoins = card.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

      let qbValuation = Math.min(effMax, currentPlayer.coins);

      if (isLineupFullOfQbs) {
        // Lineup already has 3 QBs! Only replace a QB if this card is an upgrade or superstar
        let worstQbScore = Infinity;
        qbsInLineup.forEach(q => {
          const sc = scoreCardForPlayer(G, currentPlayerId, q);
          if (sc < worstQbScore) worstQbScore = sc;
        });

        const myScore = scoreCardForPlayer(G, currentPlayerId, card);
        const isUpgrade = (myScore > worstQbScore) || isSuperstar;
        if (!isUpgrade) {
          qbValuation = Math.min(card.minBid, 2);
        } else {
          qbValuation = Math.min(effMax, Math.max(card.minBid + 1, Math.round(currentPlayer.coins * 0.70)));
        }
      } else {
        const netRecDeflate = cardRecDeflate + 2;
        const lifetimeDeflate = cardInstDeflate + (netRecDeflate * roundsRemaining);

        const hasOtherQbs = otherViableQbs.length > 0;
        if (hasOtherQbs) {
          const otherQbLifetimes = otherViableQbs.map(c => {
            const instD = c.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
            const recD = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
            return instD + ((recD + 2) * roundsRemaining);
          }).sort((a, b) => b - a);

          const bestAltLifetime = otherQbLifetimes[0] || 0;
          if (bestAltLifetime >= lifetimeDeflate * 0.80 && currentPlayer.coins >= 8) {
            qbValuation = Math.min(effMax, Math.max(card.minBid + 2, Math.round(effMax * 0.70), Math.round(currentPlayer.coins * 0.80)));
          }
        }
      }

      baseValuation = qbValuation;
    } else {
      // 4. Current Card is a Non-QB and NO viable QBs exist on the board:
      if (isEndgameCloser) {
        if (cardInstDeflate >= 3) {
          baseValuation = Math.max(baseValuation, Math.min(effMax, currentPlayer.coins));
        }
      } else if (currentRound <= 3) {
        if (!isSuperstar && cardScore < 20.0) {
          baseValuation = Math.min(baseValuation, Math.max(card.minBid, Math.round(currentPlayer.coins * 0.50)));
        }
      }
    }
  }

  // Colts Valuation & Bidding Strategy:
  // 1. Absolute Zero-Tolerance for Poison:
  //    - Negative recurring cards (Hunter Henry, Deshaun Watson, Ezekiel Elliott) permanently damage
  //      Colts' unlimited roster. Under NO circumstances should Colts bid on them!
  //      (Trevor Lawrence is NOT poison because his +8 inflate is a one-time instant effect, and his +3 deflate is recurring).
  // 2. 1-Win Discipline & Early-Game Recurring Priority (Rounds 1-5):
  //    - In Rounds 1-5, if clean recurring cards exist on the board:
  //      * If current card is pure instant and Colts is NOT close to winning (PSI > 16): PASS!
  //        Winning it burns Colts' sole card claim for the round.
  // 3. Bargain Hunter on Cheap Clean Recurring Engines:
  //    - Cards with 2 coins/round, 1 coin + 1 deflate/round, or 1 deflate/round with minBid <= 3.
  //    - Other teams only gain a +1 marginal delta over Practice Squad (+1 coin/round), so they drop out at 1-2 coins.
  //    - Colts adds them directly to their unlimited lineup for full permanent benefit!
  //    - Colts bids up to 4-5 coins (within available purse) to easily secure these bargains without overpaying.
  // 4. Endgame Closer Pivot:
  //    - If PSI <= 16 or Round >= 7, pivot purse to instant deflation nukes to cross 0 PSI and win the championship!
  // 5. No Reserve / No Fear:
  //    - Practice Squad produces at least 3 coins/round; Colts can spend down to 0 coins fearlessly.
  if (effectiveTeamId === 'colts') {
    const currentRound = G.board.round || 1;
    const isEndgameCloser = (currentPlayer.psi <= 16 || currentRound >= 7);

    // 1. Poison Rejection: Veto negative recurring cards immediately
    const isColtsPoison = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze'));
    if (isColtsPoison) {
      return { shouldBid: false, bidAmount: 0 };
    }

    const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    const hasInstantDrawback = card.effects?.some(e => !e.perRound && ((e.type === 'inflate' && e.amount > 0) || (e.type === 'coins' && e.amount < 0)));
    const isCleanRecurring = (cardRecDeflate > 0 || cardRecCoins > 0) && !isColtsPoison && !hasInstantDrawback;
    const isPureInstant = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound && e.trigger !== 'refresh' && e.trigger !== 'end_round' && e.type !== 'every_round' && e.type !== 'deflate_every_round');

    // 2. Championship Instant Win / Closer
    if (currentPlayer.psi - cardInstDeflate <= 0 && nextBid <= currentPlayer.coins) {
      return { shouldBid: true, bidAmount: Math.min(effMax, currentPlayer.coins), isChampionshipBid: true };
    }

    // 3. The 1-Win Constraint: Protect recurring claims in early game (R1-R5)
    // If clean recurring cards exist on the board that Colts can afford, do NOT win a pure instant card first!
    const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;
    const winsRemainingForMe = maxWinsThisRound - (currentPlayer.cardsWonThisRound || 0);

    const otherCleanRecurring = otherAvailableCards.filter(c => {
      const isP = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'every_round') && ((e.type === 'coins' && e.amount < 0) || e.type === 'inflate' || e.type === 'freeze'));
      if (isP) return false;
      const hasDrawback = c.effects?.some(e => !e.perRound && ((e.type === 'inflate' && e.amount > 0) || (e.type === 'coins' && e.amount < 0)));
      if (hasDrawback) return false;
      const recD = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate' && e.amount > 0);
      const recC = c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount > 0);
      return (recD || recC) && currentPlayer.coins >= c.minBid;
    });

    if (currentRound <= 5 && !isEndgameCloser && isPureInstant && otherCleanRecurring.length > 0 && winsRemainingForMe <= 1) {
      return { shouldBid: false, bidAmount: 0 };
    }

    // 4. Valuation Calculation
    if (isEndgameCloser && cardInstDeflate >= 3) {
      // Closer mode: aggressively acquire instant deflation to reach 0 PSI
      const closerBonus = cardInstDeflate * 2;
      baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(currentPlayer.coins, card.minBid + closerBonus)));
    } else if (isCleanRecurring) {
      // Bargain Hunter on Cheap Clean Recurring Engines:
      // E.g. 2 coins/round, 1 coin + 1 deflate/round, or 1-2 deflate/round with minBid <= 3
      const isCheapEngine = card.minBid <= 3 && card.maxBid <= 8 && (cardRecCoins <= 2 && cardRecDeflate <= 1);
      if (isCheapEngine) {
        // User Directive & Situational Board-State Awareness:
        // "3-4 coin max is just a guide. You have it coded so that it depends on the board state and situation, right?"
        // Target: Strive to secure these bargains for 1-2 coins.
        // Ceiling dynamically adapts based on:
        // 1. Alternative quality on the board (comparable clean engine vs weaker/no options).
        // 2. Purse capital (spending 5 coins when holding 6+ coins vs 3 coins).
        // 3. Early game compounding urgency (Rounds 1-3 lifetime value).

        const cleanAlternatives = otherCleanRecurring.map(c => ({
          card: c,
          score: scoreCardForPlayer(G, currentPlayerId, c)
        })).sort((a, b) => b.score - a.score);

        const bestAlt = cleanAlternatives[0];
        const hasComparableEngine = bestAlt && bestAlt.score >= (cardScore * 0.70);
        const hasOtherOptions = otherAvailableCards.length > 0;

        if (hasComparableEngine) {
          // Situation A: Strong/comparable clean alternative exists on the board!
          // We have a great fallback, so don't get baited into a bidding war.
          // Target 1-2 coins, willing to bid up to 3 coins; fold at 4+ to claim the cheaper alternate.
          baseValuation = Math.min(effMax, Math.min(currentPlayer.coins, 3));
          if (nextBid >= 4) {
            return { shouldBid: false, bidAmount: 0 };
          }
        } else if (cleanAlternatives.length > 0) {
          // Situation B: Only weaker clean alternatives exist on the board.
          // Willing to contest up to 4 coins. Once next bid reaches 5, consider options and pass.
          baseValuation = Math.min(effMax, Math.min(currentPlayer.coins, 4));
          if (nextBid >= 5) {
            return { shouldBid: false, bidAmount: 0 };
          }
        } else {
          // Situation C: NO other clean recurring engines exist on the board!
          // If next bid is 5+ and other card options exist on the board, consider other options / pass.
          if (nextBid >= 5 && hasOtherOptions) {
            return { shouldBid: false, bidAmount: 0 };
          }
          // If strictly solitary (last card in auction) and holding funds in early game, willing to bid up to 5 coins
          const hasCapital = currentPlayer.coins >= 5;
          const maxSolitaryBid = (currentRound <= 3 && hasCapital && !hasOtherOptions) ? 5 : 4;
          baseValuation = Math.min(effMax, Math.min(currentPlayer.coins, maxSolitaryBid));
          if (nextBid > maxSolitaryBid) {
            return { shouldBid: false, bidAmount: 0 };
          }
        }
        baseValuation = Math.max(card.minBid, baseValuation);
      } else {
        // High-end clean recurring engine (e.g. 3+ coins/round or 2+ deflate/round with NO drawbacks, like Bowers, Kittle, London)
        const premiumCeiling = Math.min(effMax, Math.min(currentPlayer.coins, Math.max(card.minBid + 3, Math.round(currentPlayer.coins * 0.80))));
        baseValuation = Math.max(baseValuation, premiumCeiling);
      }
    } else if (hasInstantDrawback) {
      // User Directive: Trevor Lawrence has instant inflate (+8 inflate). Not bad, but not a priority.
      // Pick him up only if cheap (1-3 coins); never overpay or prioritize over clean engines.
      const hasOtherOptions = otherCleanRecurring.length > 0 || otherAvailableCards.some(c => {
        const sc = scoreCardForPlayer(G, currentPlayerId, c);
        return sc >= 4.0 && currentPlayer.coins >= c.minBid;
      });
      if (nextBid >= 4 && hasOtherOptions) {
        return { shouldBid: false, bidAmount: 0 };
      }
      baseValuation = Math.min(baseValuation, Math.max(card.minBid, Math.min(currentPlayer.coins, 3)));
    } else if (isPureInstant && currentRound <= 5 && !isEndgameCloser) {
      // Early pure instant card: cap at minBid or 1-2 coins max (do not waste purse)
      baseValuation = Math.min(baseValuation, Math.min(card.minBid, 2));
    }
  }

  // Jaguars Auction Strategy:
  // - 1. Championship / Effective PSI Closer:
  //      "Plan around by acting like you have 7 less PSI than you actually do"
  //      If effectivePsi <= 14, bid aggressively on instant deflation nukes to reach <= 7 PSI (or <= 0)
  // - 2. Foresight Multipliers:
  //      * Upcoming Double All (Offensive Battle): value recurring engines heavily (+3-4 coins)
  //      * Upcoming Double Phase 1 (Raw Talent): value Phase 1 cards heavily (+2-3 coins)
  //      * Upcoming Hot Air: value recurring engines (+2-3 coins) because clock is extended
  // - 3. Round 1 Anchor Conviction:
  //      With 12 starting coins, bid up to 7-9 coins for elite anchors (Bowers, Kittle, Cousins, 3+ coins/rd)
  // - 4. Legend Returns Cash Preservation:
  //      If Legend Returns is upcoming and card is not superstar/closer, preserve purse to be richest!
  if (effectiveTeamId === 'jaguars') {
    const foresight = evaluateJaguarsEventForesight(G, currentPlayerId);
    const effectivePsi = foresight?.upcomingColdAirSoon ? Math.max(0, (currentPlayer.psi || 43) - 7) : (currentPlayer.psi || 43);
    const currentRound = G.board.round || 1;
    const cardInstDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const cardRecCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;

    // 1. Closer Mode:
    if (effectivePsi <= 14 && (cardInstDeflate >= 2 || cardRecDeflate >= 2)) {
      const closerBonus = Math.max(cardInstDeflate * 3, cardRecDeflate * 2.5);
      baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(spendableCoins, Math.max(card.minBid + closerBonus, 6))));
    } else if (currentRound === 1 && isJaguarsR1Anchor) {
      // Round 1 Anchor Conviction:
      baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(spendableCoins, Math.min(9, Math.max(card.minBid + 5, 8)))));
    } else {
      // Foresight boosts:
      if (foresight?.upcomingDoubleAll && (cardRecDeflate > 0 || cardRecCoins > 0)) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(spendableCoins, card.minBid + (cardRecDeflate * 2) + cardRecCoins)));
      }
      if (foresight?.upcomingDoublePhase1 && card.phase === 1) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(spendableCoins, card.minBid + 3)));
      }
      if (foresight?.upcomingHotAir && (cardRecDeflate > 0 || cardRecCoins > 0)) {
        baseValuation = Math.max(baseValuation, Math.min(effMax, Math.min(spendableCoins, card.minBid + cardRecDeflate + cardRecCoins)));
      }
      if ((foresight?.upcomingLegendReturns || G.board.activeEvent?.category === 'legend_returns') && !isSuperstar && effectivePsi > 14) {
        // Hoard cash: do not pay more than 3-4 coins for ordinary players
        baseValuation = Math.min(baseValuation, Math.min(card.minBid + 1, 4));
      }
    }
  }

  // Playtest 20 Tuning: Board Parity Principle (e.g. TJ Hockenson when all board cards are good)
  // When multiple cards remain on board and all are roughly equal high-tier strength,
  // the marginal value of winning THIS specific card over whoever is left is tiny (1-2 coins).
  const isHighBoardParity = otherScores.length >= 2 && floorScore >= 12 && (cardScore - floorScore) <= 3.5;
  if (isHighBoardParity && !is4DeflateCard && !isSuperstar && !isJaguarsR1Anchor && !isJaguarsTarget && !isRavensR1Star && !isPatriotsR1Premier) {
    baseValuation = Math.max(card.minBid, Math.min(3, card.minBid + 1));
  }

  // Playtest 20 Tuning: Opportunity Cost & Tier Ranking (e.g. Jalen Coker when Drake London / AJ Brown are available)
  // If significantly better cards exist on the board, mid-tier Phase 1 players (e.g. +2 coins or +1 deflate)
  // are capped at 3-4 coins max so CPUs don't waste funds before bidding on the true superstars.
  const betterCardsCount = otherScores.filter(s => s >= cardScore + 4).length;
  const isMidTierPhase1 = card.phase === 1 && (card.maxBid <= 8 || card.effects?.every(e => (e.type === 'coins' ? e.amount <= 2 : e.amount <= 1)));
  if (betterCardsCount >= 1 && isMidTierPhase1) {
    baseValuation = Math.min(baseValuation, 4);
  }

  // Bills Guaranteed Discard Target: If a major nuke or golden engine is already waiting in discard,
  // do not get dragged into an overpriced auction bidding war for board cards.
  if (effectiveTeamId === 'bills' && !currentPlayer.hasUsedBillsAbility && !isSuperstar && G.decks?.discard && G.decks.discard.length > 0) {
    const discardTarget = evaluateBillsDiscardClaim(G, currentPlayerId);
    if (discardTarget && discardTarget.card && (discardTarget.reason?.includes('Nuke') || discardTarget.reason?.includes('Engine'))) {
      const fallbackCap = Math.max(card.minBid, Math.min(Math.round(effMax * 0.70), Math.round(cardScore * 0.70)));
      baseValuation = Math.min(baseValuation, fallbackCap);
    }
  }

  // Lions 1st-Player Aggression
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

  const jitter = 0.90 + Math.random() * 0.20;
  let valuation = Math.min(effMax, Math.round(baseValuation * archetypeMult * jitter));

  if (isHighBoardParity && !is4DeflateCard && !isSuperstar && !isJaguarsR1Anchor && !isJaguarsTarget && !isTitansR1Anchor && !isTitansTarget && !isBroncosTarget && !isRavensR1Star && !isPatriotsR1Premier && !isCowboysTarget && effectiveTeamId !== '49ers' && effectiveTeamId !== 'rams' && effectiveTeamId !== 'seahawks') {
    valuation = Math.min(valuation, 3);
  }
  if (betterCardsCount >= 1 && isMidTierPhase1 && !isCowboysTarget && effectiveTeamId !== '49ers' && effectiveTeamId !== 'seahawks') {
    valuation = Math.min(valuation, 4);
  }
  if (effectiveTeamId === 'ravens' && (G.board.round || 1) === 1 && !isRavensR1Star) {
    valuation = Math.min(valuation, 3);
  }
  if (effectiveTeamId === 'patriots' && (G.board.round || 1) === 1 && !isPatriotsR1Premier) {
    valuation = Math.min(valuation, 3);
  }
  if (effectiveTeamId === 'rams' && !currentPlayer.ramsTokenAttached && !ramsStarInfo.isSuperstar) {
    valuation = Math.min(valuation, Math.max(card.minBid, currentPlayer.coins - 8));
  }
  if (effectiveTeamId === 'browns' || effectiveTeamId === 'steelers' || effectiveTeamId === 'texans' || effectiveTeamId === 'colts' || effectiveTeamId === 'jaguars' || effectiveTeamId === 'titans' || effectiveTeamId === 'broncos' || (isCowboys && (G.board.round || 1) === 1)) {
    valuation = Math.min(effMax, Math.min(spendableCoins, baseValuation));
  }

  if (isCoinLeader) {
    const monopolyCap = Math.max(card.minBid, (G.board?.highestBid || 0) + 1, richestOpponentCoins + 1);
    if (valuation > monopolyCap) {
      valuation = monopolyCap;
    }
  }

  valuation = Math.min(valuation, spendableCoins);
  if (isEarlyGame && !isSuperstar && !isLionsFirstBonus && !isPatriotsR1Premier && !isRavensR1Star && !isRavensCompletingEngine && effectiveTeamId !== 'dolphins' && effectiveTeamId !== 'jets' && effectiveTeamId !== 'bengals' && effectiveTeamId !== 'browns' && effectiveTeamId !== 'steelers' && effectiveTeamId !== 'texans' && effectiveTeamId !== 'colts' && effectiveTeamId !== 'jaguars' && effectiveTeamId !== 'titans' && effectiveTeamId !== 'broncos' && effectiveTeamId !== 'cowboys' && effectiveTeamId !== '49ers' && effectiveTeamId !== 'rams' && effectiveTeamId !== 'seahawks') {
    valuation = Math.min(valuation, Math.max(card.minBid, Math.round(currentPlayer.coins * 0.65)));
  }

  if (isLionsFirstBonus || isPatriotsR1Premier) {
    valuation = Math.min(effMax, currentPlayer.coins);
  }
  if (isRavensR1Star || isJaguarsR1Anchor || isTitansR1Anchor) {
    valuation = Math.min(effMax, Math.min(9, currentPlayer.coins));
  }
  if (effectiveTeamId === 'broncos' && (G.board.round || 1) <= 2 && isBroncosTarget) {
    valuation = Math.min(effMax, Math.min(14, currentPlayer.coins));
  }
  if (isCowboys && (G.board.round || 1) === 1) {
    if (isCowboysElite) {
      valuation = Math.min(effMax, Math.min(5, currentPlayer.coins));
    } else if (isCowboysTier2) {
      valuation = Math.min(effMax, Math.min(4, currentPlayer.coins));
    }
  }

  // Falcons Bidding Discipline & Late-Auction Leverage (User Directive):
  // User insight: Falcons' ability is strongest late in the auction (when only 1 or 2 teams remain, or 3 in 10P).
  // In early bidding (when multiple active bidders remain):
  // - If card is Deshaun Watson or recurring inflation: strictly PASS ({ shouldBid: false, bidAmount: 0 }).
  // - If card is mediocre (score < 20 and not recurring deflate), or contested:
  //   Falcons INTENTIONALLY PASSES to let rivals exhaust coins and exit!
  // - Only bid early if the card is an elite centerpiece (score >= 20 or recurring deflate >= 2) or a cheap bargain (nextBid <= 2 && score >= 12).
  // - When remaining active bidders <= lateAuctionThreshold: Falcons is now in their power window! Bid normally or aggressively.
  if (effectiveTeamId === 'falcons') {
    if (card.id === 'deshaun_watson' || card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate')) {
      return { shouldBid: false, bidAmount: 0 };
    }

    const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
    const remainingBiddersCount = eligibleBidders.length;
    const isLateAuction = (G.ctx?.numPlayers || Object.keys(G.players).length) >= 10 ? remainingBiddersCount <= 3 : remainingBiddersCount <= 2;

    if (!isLateAuction) {
      const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      const isPremier = cardScore >= 20.0 || recDeflate >= 2 || isSuperstar;
      const isCheapBargain = (nextBid <= 2 && cardScore >= 12.0);

      if (!isPremier && !isCheapBargain) {
        return { shouldBid: false, bidAmount: 0 };
      }
    }
  }

  // Jets Ability: Pay Maximum -> Deflate 4 PSI instantly
  // User Strategy: "When thinking should I max this player at 15 coins just to get my ability,
  // I would think first, what is the most I would pay for this player (valuation based on other board options)?
  // If the most I would pay is only a few coins away (2-4 coins away) from the max of the player,
  // I would pay max to get the bonus."
  if (effectiveTeamId === 'jets' && currentPlayer.coins >= effMax) {
    const maxBidGap = teamGenome.jetsMaxBidGap !== undefined ? teamGenome.jetsMaxBidGap : 3;
    const gap = effMax - valuation;
    
    // Immediate win / championship buyout: if deflating 4 (plus card instant deflate) reaches 0 PSI, BUY OUT NOW!
    const instantCardDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
    const isChampionshipBuyout = (currentPlayer.psi - (4 + instantCardDeflate) <= 0);

    // Small max gems (effMax <= 3, e.g. Nabers, Odunze): Net positive cash or trivial cost for 4 deflation
    const isSmallMaxGem = (effMax <= 3 && cardScore >= -1.0);

    // Cheap max cards (effMax <= 5): great value if within gap + 1
    const isCheapMaxCard = (effMax <= 5 && gap <= (maxBidGap + 1) && cardScore >= 0.5);

    // Endgame urgency (PSI <= 12): slightly expand gap tolerance to close out game
    const isEndgame = (currentPlayer.psi <= 12);
    const allowedGap = isEndgame ? (maxBidGap + 1) : maxBidGap;

    const shouldPayMax = isChampionshipBuyout ||
                         isSmallMaxGem ||
                         isCheapMaxCard ||
                         (gap <= 0 && cardScore >= 0) ||
                         (gap <= allowedGap && (cardScore >= 2.0 || isSuperstar));

    if (shouldPayMax) {
      return { shouldBid: true, bidAmount: effMax, isMaxBid: true };
    }
  }

  // Non-Lions Counter-Play:
  // User directive:
  // "I like D as a counterplay that sometimes happens but not always. I think the real problem is that the oppenents
  // are bidding way more than they should just because. Can we have them raise the bid by 1-2 more than they normally
  // would bid on that player instead? Then have D happen like 10% of the time?"
  const lionsPlayerId = Object.keys(G.players).find(
    id => getEffectiveTeamId(G.players[id]) === 'lions' && !G.players[id].hasWonAuction
  );
  if (isFirstPlayerOfRound && effectiveTeamId !== 'lions' && lionsPlayerId) {
    const isLionsHighest = G.board.highestBidder === lionsPlayerId;
    const lionsPlayer = G.players[lionsPlayerId];

    if (isLionsHighest && lionsPlayer && lionsPlayer.coins >= nextBid + 1) {
      // 10% Spite Block ("D" ceiling)
      const isSpiteBlock = Math.random() < 0.10;
      if (isSpiteBlock) {
        const blockCeiling = Math.min(effMax - 1, Math.round(effMax * 0.75));
        if (nextBid <= blockCeiling && currentPlayer.coins >= nextBid + 1) {
          return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
        }
      }

      // 90% Normal Counterplay: Raise 1-2 more than normal valuation
      const stretchAmount = Math.random() < 0.5 ? 2 : 1;
      const counterplayCeiling = Math.min(effMax - 1, valuation + stretchAmount);
      if (nextBid <= counterplayCeiling && currentPlayer.coins >= nextBid + 1) {
        return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
      }
    }
  }

  // Playtest 19 Note 15 & Playtest 34: Strategic Price Bumping on Opponent Preferences & Threat Levels
  if (nextBid > valuation) {
    // Chargers Outbid Farming on Coin/Player Cards:
    // If Chargers' own valuation is lower than nextBid, BUT Chargers projects that an active rival
    // will outbid them (rival willingness >= nextBid + 1 and rival has coins):
    // Chargers bids nextBid to extract a +1 outbid bonus coin at the end of the round!
    if (effectiveTeamId === 'chargers' && !isSuperstar) {
      const isCleanCard = !card.effects?.some(e => e.perRound && e.type === 'inflate');
      if (isCleanCard && nextBid <= 5 && currentPlayer.coins >= nextBid + 1) {
        const activeRivals = Object.keys(G.players).filter(
          id => id !== currentPlayerId && !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers?.includes(id)
        );

        const rivalWillOutbid = activeRivals.some(oppId => {
          const opp = G.players[oppId];
          const oppScore = scoreCardForPlayer(G, oppId, card);
          const oppEffMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          const oppWilling = Math.min(opp.coins, Math.min(oppEffMax, Math.round(oppScore * 0.75)));
          return (oppWilling >= nextBid + 1 && opp.coins >= nextBid + 1);
        });

        if (rivalWillOutbid) {
          return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
        }
      }
    }

    const oppTeamId = highestTeamId;
    const oppLovesCard = doesCardFitTeamStrategy(oppTeamId, card, highestBidderPlayer, G);
    const opponentRaiseStep = (effectiveTeamId === 'bears') ? 2 : 1;
    const opponentCanAffordRaise = highestBidderPlayer && highestBidderPlayer.coins >= nextBid + opponentRaiseStep;
    const safeRiskForMe = (effectiveTeamId === 'browns')
      ? ((G.board?.round || 1) >= 5 && nextBid <= Math.round(currentPlayer.coins * 0.40))
      : (effectiveTeamId === 'steelers' ? false : (cardScore >= 0)); // Colts strictly avoid bumping negative cards!

    // #2 Threat Level Price Bump Scaling:
    // 1 Round Out (Red Threat): HIGHER price bump aggression (emergency table defense up to effMax)
    if (redThreatLeaderId !== null && G.board.highestBidder === redThreatLeaderId) {
      const givesLeaderDeflate = (cardDeflateInstant > 0 || cardDeflateRecurring > 0 || cardScore >= 0);
      if (givesLeaderDeflate && opponentCanAffordRaise && currentPlayer.coins >= nextBid && nextBid <= effMax) {
        return { shouldBid: true, bidAmount: nextBid, isHateBid: true };
      }
    }

    // 2 Rounds Out (Yellow Threat): LOWER price bump (conservative, only cheap bumps up to 4 coins / 40% cap)
    if (yellowThreatLeaderId !== null && G.board.highestBidder === yellowThreatLeaderId) {
      const givesLeaderDeflate = (cardDeflateInstant > 0 || cardDeflateRecurring > 0);
      const defenseAgg = teamGenome.threatDefenseWeight || 1.0;
      const isCheapBump = nextBid <= Math.min(Math.round(4 * defenseAgg), Math.round(effMax * 0.40 * defenseAgg));
      if (givesLeaderDeflate && opponentCanAffordRaise && isCheapBump && safeRiskForMe && currentPlayer.coins >= nextBid && Math.random() < Math.min(0.85, 0.45 * defenseAgg)) {
        return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
      }
    }

    const isBargainForOpponent = G.board.highestBid < Math.round(effMax * 0.55);
    if (oppLovesCard && opponentCanAffordRaise && isBargainForOpponent && safeRiskForMe && spendableCoins >= nextBid) {
      if (Math.random() < 0.65) {
        return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
      }
    }

    const isBullyOrOpportunist = (archetype === 'bully' || archetype === 'opportunist');
    const bumpChance = teamGenome.priceBumpProb !== undefined ? teamGenome.priceBumpProb : (isBullyOrOpportunist ? 0.35 : 0.15);
    const isBargainPrice = G.board.highestBid < Math.round(effMax * 0.45);

    if (opponentCanAffordRaise && isBargainPrice && safeRiskForMe && spendableCoins >= nextBid && Math.random() < bumpChance) {
      return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
    }
    return { shouldBid: false, bidAmount: 0 };
  }

  // #3 Jump Bidding & Opponent Purse Knockouts (Bully Bids)
  // If CPU valuation meets or exceeds the richest active contender's coins (e.g. 4 coins):
  // Jumping directly to 4 coins immediately locks out all opponents because they need 5 coins to outbid!
  const activeContenders = Object.keys(G.players).filter(
    id => id !== currentPlayerId && !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers?.includes(id)
  );
  const richestContenderCoins = activeContenders.length > 0
    ? Math.max(0, ...activeContenders.map(id => G.players[id]?.coins || 0))
    : 0;

  let targetBid = nextBid;
  let isJumpBid = false;

  const isChargersRichestFarm = (
    effectiveTeamId === 'chargers' && 
    currentPlayer.coins > richestContenderCoins && 
    effMax > richestContenderCoins
  );

  const isChargersInGame = Object.values(G.players || {}).some(
    p => getEffectiveTeamId(p) === 'chargers'
  );

  // Anti-Chargers Opponent Bidding Strategy:
  // When Chargers are in the game, opponents want to DENY Chargers free outbid farming!
  // Instead of starting at 1 and slowly incrementing (which lets Chargers farm +1 outbids over and over),
  // opponents are 40% more likely than normal to bid the max they think they can win a player for!
  // If they think they can win the player for 4 and no one will outbid them, they start at 4.
  if (isChargersInGame && effectiveTeamId !== 'chargers' && valuation >= nextBid && spendableCoins >= nextBid) {
    const rivalContenders = activeContenders.map(id => {
      const opp = G.players[id];
      const oppScore = scoreCardForPlayer(G, id, card);
      const oppEffMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      const oppWilling = Math.min(opp.coins, Math.min(oppEffMax, Math.round(oppScore * 0.75)));
      return { id, willing: oppWilling, score: oppScore };
    });

    const maxRivalWilling = rivalContenders.length > 0
      ? Math.max(0, ...rivalContenders.map(r => r.willing))
      : 0;

    const winTarget = Math.min(effMax, Math.min(valuation, Math.min(spendableCoins, Math.max(nextBid, maxRivalWilling))));

    if (winTarget > nextBid && (valuation >= maxRivalWilling || cardScore >= 4.0)) {
      // Balanced anti-Chargers jump probability (calibrated at 0.50)
      const antiChargersJumpProb = 0.50;
      if (Math.random() < antiChargersJumpProb) {
        targetBid = winTarget;
        isJumpBid = true;
      }
    }
  } else if (!isChargersRichestFarm) {
    const generalLockoutDiscount = (effectiveTeamId === 'bears') ? 1 : 0;
    const generalLockoutTarget = Math.max(nextBid, richestContenderCoins - generalLockoutDiscount);
    if (generalLockoutTarget >= nextBid && 
        generalLockoutTarget <= valuation && 
        generalLockoutTarget <= effMax && 
        currentPlayer.coins >= generalLockoutTarget) {
      const shouldJumpBid = (cardScore >= 6.0 || isSuperstar || redThreatLeaderId !== null || archetype === 'bully' || archetype === 'tycoon' || Math.random() < 0.70);
      if (shouldJumpBid) {
        targetBid = generalLockoutTarget;
        isJumpBid = (targetBid > nextBid);
      }
    }
  }

  // Dolphins Franchise Mechanics: Exact-Zero Calibration, 1-3 Coins Buffer All-In, & High Demand Knockout Bids
  if (effectiveTeamId === 'dolphins') {
    const isDoubleDraft = G.board.activeEvent?.category === 'double_draft';
    const isFirstDoubleDraftClaim = isDoubleDraft && (currentPlayer.cardsWonThisRound || 0) === 0;
    const hasBigRecurringDeflate = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3);
    const hasBigInstantDeflate = card.effects?.some(e => !e.perRound && e.type === 'deflate' && e.amount >= 5);
    const hasBigInstantCoins = card.effects?.some(e => !e.perRound && e.type === 'coins' && e.amount >= 4 && (e.amount - card.maxBid >= 1));
    const isSoloBestCard = otherScores.length >= 2 && cardScore >= 50.0 && otherScores.every(s => cardScore - s >= 20.0);

    const isHighDemandTarget = (
      isSuperstar || 
      hasBigRecurringDeflate || 
      hasBigInstantDeflate || 
      hasBigInstantCoins || 
      isSoloBestCard || 
      isFirstDoubleDraftClaim
    );

    const maxAllInPurse = teamGenome?.dolphinsMaxPurseAllIn !== undefined ? teamGenome.dolphinsMaxPurseAllIn : 14;
    const bufferThreshold = teamGenome?.dolphinsBufferThreshold !== undefined ? teamGenome.dolphinsBufferThreshold : 3;
    const zeroSeekingMinScore = teamGenome?.dolphinsZeroSeekingThreshold !== undefined ? teamGenome.dolphinsZeroSeekingThreshold : 0.0;

    // 1. High Demand / Premier Card Fearless All-In Bidding (purse <= maxAllInPurse coins or exact effMax match)
    // When good/great players come out whose max bid equals coin value, bid max immediately for guaranteed win + bailout!
    // And for players whose max bid > coins, bid all coins with no fear (if purse <= maxAllInPurse coins).
    const isExactEffMaxMatch = (effMax === currentPlayer.coins && cardScore >= zeroSeekingMinScore);
    if ((isHighDemandTarget || isExactEffMaxMatch) && currentPlayer.coins <= maxAllInPurse && currentPlayer.coins >= nextBid) {
      const allInBid = Math.min(effMax, currentPlayer.coins);
      if (allInBid >= nextBid) {
        targetBid = allInBid;
        isJumpBid = true;
      }
    }

    // 2. The 1, 2, or 3 Coins Buffer Rule:
    // If targetBid would leave Dolphins with 1 to bufferThreshold coins, round up to all-in!
    // No point saving 1-3 coins when spending all-in hits 0 coins and refills to 3 coins immediately,
    // while presenting a stronger bid that dissuades rivals.
    const leftover = currentPlayer.coins - targetBid;
    if (leftover >= 1 && leftover <= bufferThreshold && currentPlayer.coins <= effMax && cardScore >= zeroSeekingMinScore) {
      targetBid = currentPlayer.coins;
      isJumpBid = true;
    }

    // 3. 1-Coin Spend Mandate on Last Available Player / Cheap Scrub:
    // If Dolphins has exactly 1 coin and nextBid is 1, always bid to spend the coin and recharge to 3 coins!
    if (currentPlayer.coins === 1 && nextBid === 1) {
      targetBid = 1;
    }
  }

  // Patriots Target Bid Refinements:
  if (effectiveTeamId === 'patriots') {
    const currentRound = G.board.round || 1;
    if (currentRound === 1) {
      const isPremierR1Centerpiece = (
        card.id === 'brock_bowers' || 
        card.id === 'kirk_cousins' || 
        card.id === 'george_kittle' || 
        card.effects?.some(e => e.perRound && e.type === 'coins' && e.amount >= 3)
      );
      if (isPremierR1Centerpiece && currentPlayer.coins >= nextBid) {
        // Human player rule: Don't be afraid to spend all 7 coins on the best player revealed
        targetBid = Math.min(effMax, currentPlayer.coins);
        isJumpBid = true;
      }
    } else if ((currentPlayer.psi || 36) <= 18) {
      const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instantDeflate >= (currentPlayer.psi || 36) && currentPlayer.coins >= nextBid) {
        // Game-winning closer: Bid whatever is necessary up to effMax/purse to secure victory!
        targetBid = Math.min(effMax, currentPlayer.coins);
        isJumpBid = true;
      }
    }
  }

  // Ravens Target Bid Refinements:
  if (effectiveTeamId === 'ravens') {
    const currentRound = G.board.round || 1;
    if (currentRound === 1) {
      if (isRavensR1Star && currentPlayer.coins >= nextBid) {
        // Human player rule: spend around 9 coins on the anchor star player
        const r1AnchorTarget = Math.min(effMax, Math.min(9, currentPlayer.coins));
        if (r1AnchorTarget >= nextBid) {
          targetBid = Math.max(targetBid, Math.min(nextBid + 1, r1AnchorTarget));
        }
      }
    } else if (currentRound >= 2 && currentRound <= 4) {
      const nonPsRavens = (currentPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
      const ravensPositions = new Set(nonPsRavens.map(c => c.position).filter(pos => ['QB', 'RB', 'WR', 'TE'].includes(pos)));
      const isMissingPos = !ravensPositions.has(card.position);
      // If this card completes the 3 distinct positions engine, ensure bid meets nextBid up to valuation
      if (isMissingPos && ravensPositions.size === 2 && valuation >= nextBid && currentPlayer.coins >= nextBid) {
        targetBid = Math.max(targetBid, nextBid);
      }
    }
  }

  // Cowboys Target Bid Refinements:
  // - In Round 1: If an elite player is available, use all 5 coins to lock out rivals and secure the centerpiece!
  // - Even a Tier 2 starter is worth up to 4 coins (passive +2 coins every turn guarantees quick recovery).
  if (isCowboys && (G.board.round || 1) === 1) {
    if (isCowboysElite && currentPlayer.coins >= nextBid) {
      targetBid = Math.min(effMax, Math.min(5, currentPlayer.coins));
      isJumpBid = (targetBid > nextBid);
    } else if (isCowboysTier2 && currentPlayer.coins >= nextBid) {
      targetBid = Math.min(effMax, Math.min(4, currentPlayer.coins));
      isJumpBid = (targetBid > nextBid);
    }
  }

  // Broncos Target Bid Refinements:
  if (effectiveTeamId === 'broncos') {
    const currentRound = G.board.round || 1;
    if (currentRound <= 2 && isBroncosTarget && currentPlayer.coins >= nextBid) {
      const bullyBidTarget = Math.min(effMax, Math.min(valuation, currentPlayer.coins));
      if (bullyBidTarget >= nextBid) {
        if (richestContenderCoins >= nextBid && richestContenderCoins <= bullyBidTarget) {
          targetBid = Math.max(targetBid, richestContenderCoins);
          isJumpBid = true;
        } else {
          targetBid = Math.max(targetBid, Math.min(nextBid + 1, bullyBidTarget));
        }
      }
    } else if ((currentPlayer.psi || 40) <= 16) {
      const instantDeflate = card.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
      if (instantDeflate >= 3 && currentPlayer.coins >= nextBid) {
        const closerTarget = Math.min(effMax, Math.min(valuation, currentPlayer.coins));
        if (closerTarget >= nextBid) {
          targetBid = Math.max(targetBid, Math.min(nextBid + 2, closerTarget));
        }
      }
    }
  }

  // Target Bid Refinements for General Human Heuristic Franchises:
  // Pre-emptive Lockout Hammer: Jump to rival's maximum willing bid (min(rival purse, rival valuation)),
  // locking them out immediately without needlessly overspending to our own ceiling.
  if (GENERAL_HUMAN_HEURISTIC_TEAMS.has(effectiveTeamId) && cardScore >= 8.0 && valuation > nextBid) {
    // Chargers Custom Lockout Hammer Rule:
    // If Chargers is strictly the richest player, and effMax > richestContenderCoins:
    // Chargers is in no danger of being locked out by anyone!
    // Chargers bids nextBid (currentBid + 1) instead of jumping, letting rivals outbid so Chargers can outbid back and farm extra coins!
    const isChargersRichestFarm = (
      effectiveTeamId === 'chargers' && 
      currentPlayer.coins > richestContenderCoins && 
      effMax > richestContenderCoins
    );

    if (!isChargersRichestFarm && !(isCowboys && (G.board.round || 1) === 1)) {
      const rivalTargets = activeContenders.map(id => ({
        id,
        coins: G.players[id].coins,
        score: scoreCardForPlayer(G, id, card)
      })).filter(o => o.score >= 4.0 && o.coins < currentPlayer.coins).sort((a, b) => b.coins - a.coins);

      if (rivalTargets.length > 0) {
        const topRival = rivalTargets[0];
        const rivalEffMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
        const rivalWilling = Math.min(topRival.coins, Math.min(rivalEffMax, Math.round(topRival.score * 0.75)));
        const lockoutDiscount = (effectiveTeamId === 'bears') ? 1 : 0;
        const lockoutTarget = Math.max(nextBid, rivalWilling - lockoutDiscount);
        if (lockoutTarget >= nextBid && lockoutTarget <= valuation && lockoutTarget <= spendableCoins && currentPlayer.coins >= lockoutTarget) {
          targetBid = lockoutTarget;
          isJumpBid = (targetBid > nextBid);
        }
      }
    }
  }

  // Final safety checks: bidAmount must never exceed player coins or effective maximum bid!
  targetBid = Math.min(currentPlayer.coins || 0, Math.min(effMax, targetBid));
  if (targetBid < nextBid) {
    return { shouldBid: false, bidAmount: 0 };
  }

  return { shouldBid: true, bidAmount: targetBid, isJumpBid };
};

const executeCpuMoveInternal = (G, ctx, events) => {
  if (G.pendingReplacement) return;

  // Determine who is actively taking the turn
  let actingPlayerId = ctx.currentPlayer;
  if (G.board.activeAuctionCardIndex === null) {
    // When no card is nominated, the nominator acts
    actingPlayerId = String(G.board.nominator);
    // Safety check: if nominator has already won, pick next eligible bidder
    const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
    if (G.players[actingPlayerId]?.hasWonAuction && eligibleBidders.length > 0) {
      actingPlayerId = eligibleBidders[0];
      G.board.nominator = actingPlayerId;
    }
  } else {
    // During an active card auction:
    // If ctx.currentPlayer has won or passed, find next active bidder
    const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
    const activeBidders = eligibleBidders.filter(id => !G.board.passedAuctionPlayers?.includes(id));
    if (activeBidders.length === 0) return;
    if (!activeBidders.includes(String(actingPlayerId))) {
      actingPlayerId = activeBidders[0];
    }
  }

  const currentPlayer = G.players[actingPlayerId];
  if (!currentPlayer || !currentPlayer.isCpu) return;

  const currentPlayerId = actingPlayerId;
  const displayId = parseInt(currentPlayerId) + 1;

  // Case 1: No active card nominated yet
  if (G.board.activeAuctionCardIndex === null) {
    const effectiveTeamId = getEffectiveTeamId(currentPlayer);
    if (effectiveTeamId === 'falcons' && !currentPlayer.hasWonAuction) {
      let phaseKey = 'p1';
      if (G.board.round >= 4 && G.board.round <= 6) phaseKey = 'p2';
      if (G.board.round >= 7) phaseKey = 'p3';
      if (!currentPlayer.falconsPhaseUses[phaseKey]) {
        const remainingCards = G.board.auctionPlayers.filter(c => c !== null);
        const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
        const remainingBiddersCount = eligibleBidders.length;
        const isLateAuction = (G.ctx?.numPlayers || Object.keys(G.players).length) >= 10 ? remainingBiddersCount <= 3 : remainingBiddersCount <= 2;
        const isEndOfPhaseRound = (G.board.round === 3 || G.board.round === 6 || G.board.round >= 9);

        if (remainingCards.length > 0) {
          const bestScore = Math.max(...remainingCards.map(c => scoreCardForPlayer(G, currentPlayerId, c)));
          const isTier3OrScrap = (c) => {
            if (!c) return true;
            const hasRec = c.effects?.some(e => e.perRound || e.trigger === 'refresh');
            const instD = c.effects?.filter(e => !e.perRound && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
            const instC = c.effects?.filter(e => !e.perRound && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
            return !hasRec && instD <= 2 && instC <= 3;
          };
          const allScraps = remainingCards.every(c => isTier3OrScrap(c) || scoreCardForPlayer(G, currentPlayerId, c) < 18.0);

          const shouldMulligan = (isLateAuction && (bestScore < 20.0 || allScraps)) ||
                                (isEndOfPhaseRound && bestScore < 20.0) ||
                                (bestScore < 15.0);

          if (shouldMulligan) {
            const oldRemaining = G.board.auctionPlayers.filter(c => c !== null);
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(...oldRemaining);
            G.board.auctionPlayers = G.board.auctionPlayers.map(c => {
              if (c === null) return null;
              return G.decks.activePlayers.length > 0 ? G.decks.activePlayers.pop() : null;
            });
            currentPlayer.falconsPhaseUses[phaseKey] = true;
            triggerAbilityNotification(G, currentPlayerId, 'falcons', 'Falcons Mulligan', `CPU Player ${displayId} mulliganed remaining cards! Fresh draft prospects revealed.`);
            addLog(G, `🦅 Falcons Ability: CPU Player ${displayId} mulliganed remaining auction cards! New players revealed.`);
          }
        }
      }
    }

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

      const isChargersInGame = Object.values(G.players || {}).some(p => getEffectiveTeamId(p) === 'chargers');

      if (isLionsFirstBonus) {
        const activeOpponents = Object.keys(G.players).filter(id => id !== currentPlayerId && !G.players[id].hasWonAuction);
        const richestOpponentCoins = Math.max(0, ...activeOpponents.map(id => G.players[id]?.coins || 0));

        if (effMax <= 5 && currentPlayer.coins >= effMax) {
          // Target low max bid player (e.g. Nabers, Odunze) and immediately pay max bid to lock out rivals
          G.board.highestBid = effMax;
        } else if (currentPlayer.coins > richestOpponentCoins) {
          // Richest player: lowest price possible that cannot be outbid by any rival
          const lockoutBid = Math.min(effMax, Math.max(card.minBid, richestOpponentCoins));
          G.board.highestBid = Math.min(currentPlayer.coins, lockoutBid);
        } else {
          G.board.highestBid = card.minBid;
        }
      } else if (isChargersInGame && effectiveTeamId !== 'chargers') {
        // Anti-Chargers Opponent Nomination Strategy:
        // When Chargers are in the game, opponents don't start at minBid (e.g. 1) and increase by 1 each time.
        // If they think they can win the player for 4 and no one will outbid them, they start at 4!
        const nomDecision = evaluateCpuAuctionBid(G, currentPlayerId);
        if (nomDecision && nomDecision.shouldBid && nomDecision.bidAmount > card.minBid) {
          G.board.highestBid = Math.min(currentPlayer.coins, Math.min(effMax, nomDecision.bidAmount));
        } else {
          G.board.highestBid = (isSoleRemainingBidder && currentPlayer.coins === 0) ? 0 : card.minBid;
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
        return;
      }
    }
  } else if (G.board.highestBidder !== currentPlayerId) {
    const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
    const decision = evaluateCpuAuctionBid(G, currentPlayerId);

    if (decision.shouldBid) {
      const nextBid = decision.bidAmount;
      if (G.board.highestBidder !== null && G.board.highestBidder !== currentPlayerId) {
        G.players[currentPlayerId].outbidCount = (G.players[currentPlayerId].outbidCount || 0) + 1;
      }
      G.board.highestBid = nextBid;
      G.board.highestBidder = currentPlayerId;
      if (G.board.passedAuctionPlayers && G.board.passedAuctionPlayers.includes(currentPlayerId)) {
        G.board.passedAuctionPlayers = G.board.passedAuctionPlayers.filter(id => id !== currentPlayerId);
      }
      G.board.lastActionText = decision.isChampionshipBid
        ? `🏆 Player ${displayId} placed a CHAMPIONSHIP bid of ${nextBid} coins on ${card.name}!`
        : (decision.isJumpBid
            ? `⚡ Player ${displayId} placed a knockout jump bid to ${nextBid} coins on ${card.name}!`
            : (decision.isHateBid
                ? `🛡️ Player ${displayId} hate-bid ${nextBid} coins on ${card.name} to block the leader!`
                : (decision.isPriceBump 
                    ? `Player ${displayId} bumped the bid to ${nextBid} coins on ${card.name}!`
                    : `Player ${displayId} bid ${nextBid} coins on ${card.name}.`)));
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
      const giverName = giver.team?.name ? `${giver.team.name} (Player ${parseInt(giverId) + 1})` : `Player ${parseInt(giverId) + 1}`;
      const targetPlayer = G.players[targetId];
      const targetName = targetPlayer?.team?.name ? `${targetPlayer.team.name} (Player ${parseInt(targetId) + 1})` : `Player ${parseInt(targetId) + 1}`;
      giver.psi = Math.max(0, giver.psi - 1);
      applyPsiInflated(G, targetId, 1);
      const rivalryMsg = `${giverName} gave 1 PSI to ${targetName}.`;
      addLog(G, `⚔️ Rivalry: ${rivalryMsg}`);
      addBannerEvent(G, {
        icon: '⚔️',
        title: 'Rivalry Action',
        text: rivalryMsg
      });
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
  checkDolphinsEmergencyCoins(G, winnerId);
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
      const winnerEffTeam = getEffectiveTeamId(winner);
      const isWinnerSaints = winnerEffTeam === 'saints';
      let toxicIdx = -1;
      if (!isWinnerSaints) {
        let worstToxicPenalty = -Infinity;
        winner.lineup.forEach((c, idx) => {
          if (!c || c.isPracticeSquad || c.uniqueId?.startsWith('ps_')) return;
          const recInflate = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
          const recNegCoins = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0) || 0;
          if (recInflate > 0 || recNegCoins > 0) {
            const penalty = (recInflate * 3.0) + recNegCoins;
            if (penalty > worstToxicPenalty) {
              worstToxicPenalty = penalty;
              toxicIdx = idx;
            }
          }
        });
      }
      let replaceIdx = 0;
      if (toxicIdx !== -1) {
        replaceIdx = toxicIdx;
      } else {
        let worstScore = Infinity;
        winner.lineup.forEach((c, idx) => {
          const isPracticeSquad = c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_');
          let score = isPracticeSquad ? -200 : (c.effects ? c.effects.reduce((a, e) => a + e.amount, 0) : 0);
          if (score < worstScore) {
            worstScore = score;
            replaceIdx = idx;
          }
        });
      }
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
        // User Directive: "The only bit of strategy is what to pick at the start of the game. I would first target every round deflation or coins players. But mostly, I would just look at the best player available and take that one. Usually best player available will be an every turn player. That is how you get ahead of the opposition."
        let score = scoreCardForPlayer(G, currentId, card);
        const hasRecurringInflation = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate');
        const hasRecurringNegativeCoins = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0);
        if (hasRecurringInflation || hasRecurringNegativeCoins) {
          score = -100; // Never pick toxic drawback cards as starting keepers!
        } else {
          const recDeflate = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'deflate_every_round' || e.type === 'every_round') && e.type === 'deflate').reduce((s, e) => s + e.amount, 0) || 0;
          const recCoins = card.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins').reduce((s, e) => s + e.amount, 0) || 0;
          if (recDeflate >= 1 || recCoins >= 1) {
            score += (recDeflate * 5.0) + (recCoins * 3.0);
          }
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

      // Apply instant effects of chosenCard upon drafting
      if (chosenCard.effects) {
        chosenCard.effects.forEach(eff => {
          if (!eff.perRound) {
            if (eff.type === 'coins') applyCoinsGained(G, currentId, eff.amount);
            if (eff.type === 'deflate') applyPsiDeflated(G, currentId, eff.amount);
            if (eff.type === 'inflate') applyPsiInflated(G, currentId, eff.amount);
          }
        });
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
        triggerAbilityNotification(G, playerID, 'ravens', 'Ravens Tri-Position Mastery', `Controlled 3 positions (${[...distinctPos].join(', ')}), gained +3 coins!`);
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

    if (effectiveTeamId === 'chargers') {
      const outbidCoins = p.outbidCount || 0;
      if (outbidCoins > 0) {
        if (effectiveTeamId !== 'browns') bonusCoins += outbidCoins;
        addLog(G, `Chargers Ability: Outbid opposing teams ${outbidCoins} time(s), gained +${outbidCoins} bonus coins.`);
      }
      const chargersMsg = `Chargers gained ${outbidCoins} coins by outbiding opposing teams`;
      triggerAbilityNotification(G, id, 'chargers', 'Chargers Ability', chargersMsg);
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
            if (opp.coins === 0) {
              checkDolphinsEmergencyCoins(G, oppId);
            }
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

export const BUCCANEERS_ABILITY_TIERS = {
  // S-Tier (God Tier / Elite game changers)
  colts: { tier: 'S', tierScore: 100, reason: 'Unlimited roster spots permanently compounds engines' },
  panthers: { tier: 'S', tierScore: 92, reason: 'Passive -2 PSI every single round without requirements' },
  packers: { tier: 'S', tierScore: 88, reason: 'Phase 1 -4 PSI/round deflation engine + coins' },
  texans: { tier: 'S', tierScore: 84, reason: 'Dual +2 coins and +2 deflate per QB on refresh' },
  lions: { tier: 'S', tierScore: 80, reason: 'First claim bounty yields huge coin purse' },
  rams: { tier: 'S', tierScore: 76, reason: 'x2 token doubles premier deflation/closer engine' },
  cowboys: { tier: 'S', tierScore: 72, reason: 'Passive +2 coins guaranteed every round' },

  // A-Tier (High Impact Premier Abilities)
  falcons: { tier: 'A', tierScore: 60, reason: 'Auction mulligan provides full board control' },
  bengals: { tier: 'A', tierScore: 56, reason: 'Instant abilities +2 coins/deflate + discard flexibility' },
  seahawks: { tier: 'A', tierScore: 54, reason: 'Starts with 4th permanent roster spot' },
  steelers: { tier: 'A', tierScore: 50, reason: 'Damages all opponents +1 PSI when richest' },
  saints: { tier: 'A', tierScore: 48, reason: 'Immune to all drawback penalties and inflation' },
  chiefs: { tier: 'A', tierScore: 46, reason: 'Free claim steal of elite superstar at minimum' },
  eagles: { tier: 'A', tierScore: 44, reason: 'Tush push raises opponent PSI' },
  jets: { tier: 'A', tierScore: 42, reason: 'Deflates 4 PSI on max bid purchases' },

  // B-Tier (Solid / Situational)
  chargers: { tier: 'B', tierScore: 30, reason: 'Outbid coin bonus' },
  raiders: { tier: 'B', tierScore: 28, reason: 'Give 1 PSI to opponent before auction every round' },
  bears: { tier: 'B', tierScore: 26, reason: '+2 coin outbid barrier' },
  vikings: { tier: 'B', tierScore: 24, reason: '2x coins when under 27 PSI' },
  '49ers': { tier: 'B', tierScore: 22, reason: '2x deflation when under 5 coins' },
  dolphins: { tier: 'B', tierScore: 20, reason: '3 coin emergency bailout at 0 coins' },

  // C-Tier (Mediocre / Low Impact)
  commanders: { tier: 'C', tierScore: 14, reason: 'Mark player auction lockout' },
  cardinals: { tier: 'C', tierScore: 12, reason: 'Swap auction player with deck' },
  ravens: { tier: 'C', tierScore: 10, reason: '+3 coins if 3 different positions' },
  bills: { tier: 'C', tierScore: 8, reason: '1-time discard purchase' },
  jaguars: { tier: 'C', tierScore: 6, reason: 'Rearrange event deck once' },
  titans: { tier: 'C', tierScore: 4, reason: '1-time initial card draft' },

  // F-Tier (Bad / Detrimental / Non-Abilities) - STRICTLY BLACKLISTED
  patriots: { tier: 'F', tierScore: -999, reason: 'No ability ("Starts with low PSI")' },
  broncos: { tier: 'F', tierScore: -999, reason: 'Drawback: ignores every turn abilities on turn 1' },
  browns: { tier: 'F', tierScore: -999, reason: 'Drawback: cannot gain coins in rounds 1-4' },
  buccaneers: { tier: 'F', tierScore: -999, reason: 'Cannot copy self' }
};

export const scoreBucsCandidateTeam = (team) => {
  if (!team || !team.id) return -9999;
  const info = BUCCANEERS_ABILITY_TIERS[team.id] || { tier: 'C', tierScore: 5 };
  if (info.tier === 'F' || info.tierScore < 0) return -9999;
  // User principle: Usually high starting PSI and low starting coins means the ability is better
  const handicap = (team.initialPsi || 45) * 1.5 - (team.coins || 10);
  return info.tierScore + handicap;
};

export const selectCpuBucsTeamToCopy = (availableTeams) => {
  // Never copy negative, non-ability, or self teams
  const BLACKLIST = ['broncos', 'browns', 'patriots', 'buccaneers'];
  const candidates = (availableTeams || []).filter(t => t && !BLACKLIST.includes(t.id));
  if (candidates.length === 0) {
    const fallbackCandidates = TEAMS.filter(t => !BLACKLIST.includes(t.id));
    return fallbackCandidates[0] || availableTeams[0];
  }

  // Score candidate teams using tier ranking + starting handicap
  const scored = candidates.map(team => ({
    team,
    score: scoreBucsCandidateTeam(team),
    tier: BUCCANEERS_ABILITY_TIERS[team.id]?.tier || 'C'
  })).filter(item => item.score > 0);

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return candidates[0];

  // User directive:
  // "I want the bucs to 10% pick not the absolute best ability, but never the F tier abilities. But allow them to still pick B and C tier abilities in this 10%."
  // - 90% of the time: Pick the absolute top-ranked candidate (scored[0].team).
  // - 10% of the time: Pick not the absolute best ability (from scored.slice(1)), but NEVER the F tier abilities.
  //   Allow them to still pick B and C tier abilities in this 10%.
  const rand = typeof randomFn === 'function' ? randomFn() : Math.random();
  if (rand < 0.90 || scored.length === 1) {
    return scored[0].team;
  }

  const nonBestCandidates = scored.slice(1).filter(item => item.tier !== 'F' && item.score > 0);
  if (nonBestCandidates.length > 0) {
    const pickRand = typeof randomFn === 'function' ? randomFn() : Math.random();
    return nonBestCandidates[Math.floor(pickRand * nonBestCandidates.length)].team;
  }

  return scored[0].team;
};

export const checkPreAuctionCompletion = (G) => {
  if (!G.board.pendingRaiders &&
      !G.board.pendingCardinals &&
      !G.board.pendingChiefs &&
      !G.board.pendingCommanders &&
      (!G.board.pendingRaidersQueue || G.board.pendingRaidersQueue.length === 0) &&
      (!G.board.pendingCardinalsQueue || G.board.pendingCardinalsQueue.length === 0) &&
      (!G.board.pendingChiefsQueue || G.board.pendingChiefsQueue.length === 0) &&
      (!G.board.pendingCommandersQueue || G.board.pendingCommandersQueue.length === 0)) {
    G.board.preAuctionComplete = true;
  }
};

export const executeCpuRaiders = (G, raidersId) => {
  const raidersPlayer = G.players[raidersId];
  if (!raidersPlayer) return;
  let targetId = null;
  let minRoundsToWin = Infinity;
  Object.keys(G.players).forEach(id => {
    if (id !== String(raidersId)) {
      const opp = G.players[id];
      let oppNetDeflate = 0;
      opp.lineup.forEach(c => {
        if (c.effects) {
          c.effects.forEach(e => {
            if (e.trigger === 'refresh' || e.trigger === 'end_round' || e.type === 'deflate_every_round' || e.type === 'every_round') {
              if (e.type === 'deflate' || e.type === 'deflate_every_round') oppNetDeflate += (e.amount || 0);
              if (e.type === 'inflate') oppNetDeflate -= (e.amount || 0);
            }
          });
        }
      });
      const effTeam = getEffectiveTeamId(opp);
      if (effTeam === 'saints') return; // Saints ignores inflation; giving PSI to Saints is completely wasted!
      if (effTeam === 'panthers') oppNetDeflate += 2;
      if (effTeam === 'packers' && opp.lineup.every(c => c.phase === 'p1' || c.isPracticeSquad)) oppNetDeflate += 4;
      const velocity = Math.max(0.5, oppNetDeflate + (opp.coins >= 8 ? 2 : (opp.coins >= 4 ? 1 : 0)));
      const roundsToWin = opp.psi / velocity;
      if (roundsToWin < minRoundsToWin) {
        minRoundsToWin = roundsToWin;
        targetId = id;
      }
    }
  });
  if (targetId !== null) {
    raidersPlayer.psi = Math.max(0, raidersPlayer.psi - 1);
    applyPsiInflated(G, targetId, 1);
    const teamTitle = raidersPlayer.team?.id === 'buccaneers' ? 'Bucs (Raiders Ability)' : 'Raiders';
    triggerAbilityNotification(G, raidersId, 'raiders', 'Raiders Menace', `Gave 1 PSI to Player ${parseInt(targetId) + 1} (${G.players[targetId]?.team?.name || 'Rival'}) to slow down their lead!`);
    addLog(G, `☠️ ${teamTitle} Ability: CPU Player ${parseInt(raidersId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);
  }
};

export const advanceRaidersQueue = (G) => {
  while (G.board.pendingRaidersQueue && G.board.pendingRaidersQueue.length > 0) {
    const nextItem = G.board.pendingRaidersQueue.shift();
    const nextPlayer = G.players[nextItem.playerID];
    if (!nextPlayer) continue;
    if (nextPlayer.isCpu) {
      executeCpuRaiders(G, nextItem.playerID);
    } else {
      G.board.pendingRaiders = nextItem;
      return;
    }
  }
  G.board.pendingRaiders = null;
  if (G.board.pendingCardinalsQueue && G.board.pendingCardinalsQueue.length > 0 && !G.board.pendingCardinals) {
    advanceCardinalsQueue(G);
  } else if (G.board.pendingChiefsQueue && G.board.pendingChiefsQueue.length > 0 && !G.board.pendingChiefs) {
    advanceChiefsQueue(G);
  } else if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0 && !G.board.pendingCommanders) {
    advanceCommandersQueue(G);
  }
  checkPreAuctionCompletion(G);
};

export const executeCpuCardinals = (G, cardinalsId) => {
  if (!G.decks.activePlayers || G.decks.activePlayers.length === 0) return;
  const topCard = G.decks.activePlayers[G.decks.activePlayers.length - 1];
  const cardinalsPlayer = G.players[cardinalsId];
  if (!cardinalsPlayer) return;

  const teamTitle = cardinalsPlayer.team?.id === 'buccaneers' ? 'Bucs (Cardinals Ability)' : 'Cardinals';
  const displayId = parseInt(cardinalsId) + 1;
  const cardinalsCoins = cardinalsPlayer.coins || 0;
  const numPlayers = Object.keys(G.players).length;

  const currentNominator = G.board.nominator || G.board.firstPlayer || '0';
  const nomDistance = (parseInt(cardinalsId) - parseInt(currentNominator) + numPlayers) % numPlayers;

  const rivals = Object.keys(G.players)
    .filter(id => id !== String(cardinalsId))
    .map(id => ({ id, player: G.players[id], teamId: getEffectiveTeamId(G.players[id]) }));

  const richerRivalsCount = rivals.filter(r => (r.player.coins || 0) > cardinalsCoins).length;
  const poorerRivalsCount = rivals.filter(r => (r.player.coins || 0) < cardinalsCoins).length;
  const isRichest = richerRivalsCount === 0;

  const scoredRow = (G.board.auctionPlayers || []).map((card, idx) => {
    if (!card) return null;
    const score = scoreCardForPlayer(card, cardinalsPlayer, G);
    const isToxic = card.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0));
    return { card, idx, score, isToxic };
  }).filter(Boolean);

  const topCardScore = scoreCardForPlayer(topCard, cardinalsPlayer, G);
  const topIsToxic = topCard.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0));

  let doSwap = false;
  let swapIdx = -1;
  let swapReason = '';

  // 1. DEFENSIVE DENIAL: Deny game-ending cards to leading rivals near victory
  const leadingRivalObj = rivals.reduce((best, r) => (!best || r.player.psi < best.player.psi) ? r : best, null);
  if (leadingRivalObj && leadingRivalObj.player.psi <= 16) {
    let maxRivalThreat = -Infinity;
    let threatIdx = -1;
    scoredRow.forEach(item => {
      const rivalScore = scoreCardForPlayer(item.card, leadingRivalObj.player, G);
      const rivalCanAfford = (leadingRivalObj.player.coins || 0) >= (item.card.minBid || 1);
      const cardinalsCannotBlock = (cardinalsCoins < (leadingRivalObj.player.coins || 0)) || (item.score < 12);
      if (rivalCanAfford && rivalScore >= 18.0 && cardinalsCannotBlock) {
        if (rivalScore > maxRivalThreat) {
          maxRivalThreat = rivalScore;
          threatIdx = item.idx;
        }
      }
    });
    if (threatIdx !== -1) {
      doSwap = true;
      swapIdx = threatIdx;
      swapReason = 'denial';
    }
  }

  // 2. TOXIC PURGING: ONLY if Cardinals predicts it is the most likely team to get stuck with it
  if (!doSwap && !topIsToxic) {
    const toxicItem = scoredRow.find(item => item.isToxic);
    if (toxicItem) {
      // Cardinals is likely to get stuck with it IF broke (<= 1 coin) AND no non-Saints rival has fewer coins
      const someoneElsePoorer = rivals.some(r => r.teamId !== 'saints' && (r.player.coins || 0) < cardinalsCoins);
      const cardinalsAtRisk = cardinalsCoins <= 1 && !someoneElsePoorer;

      if (cardinalsAtRisk) {
        doSwap = true;
        swapIdx = toxicItem.idx;
        swapReason = 'toxic_purge';
      }
    }
  }

  // 3. POSITIVE UPGRADE: Swap in top card when Cardinals has position/purchasing power to claim it
  if (!doSwap && !topIsToxic) {
    const canAcquire =
      nomDistance === 0 || // Cardinals nominates right now!
      isRichest || // Cardinals has the most coins
      cardinalsCoins >= 8 || // Cardinals has massive war chest
      (nomDistance <= 1 && cardinalsCoins >= (topCard.minBid || 1) + 2) || // Near front with good cash
      (topCardScore >= 25 && cardinalsCoins >= (topCard.minBid || 1) + 3 && richerRivalsCount <= 2);

    // Only replace non-toxic cards during an upgrade to keep toxic traps on the board for rivals
    const candidatesToReplace = scoredRow.filter(item => !item.isToxic);
    const validCandidates = candidatesToReplace.length > 0 ? candidatesToReplace : scoredRow;

    let minScore = Infinity;
    let minIdx = -1;
    validCandidates.forEach(item => {
      if (item.score < minScore) {
        minScore = item.score;
        minIdx = item.idx;
      }
    });

    // Active Roster Delta Check:
    // When the roster is full of real starters (no practice squads), only bring in topCard if it strictly upgrades our active lineup!
    let actualRosterUpgrade = true;
    const hasPracticeSquad = (cardinalsPlayer.lineup || []).some(c => c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_'));
    if (!hasPracticeSquad && (cardinalsPlayer.lineup || []).length >= 3) {
      const starterScores = (cardinalsPlayer.lineup || []).map(c => scoreCardForPlayer(G, cardinalsId, c));
      const minStarterScore = Math.min(...starterScores);
      if (topCardScore <= minStarterScore) {
        actualRosterUpgrade = false;
      }
    }

    if (canAcquire && actualRosterUpgrade && minIdx !== -1 && topCardScore > minScore + 2.0) {
      doSwap = true;
      swapIdx = minIdx;
      swapReason = 'upgrade';
    }
  }

  if (doSwap && swapIdx !== -1) {
    const oldCard = G.board.auctionPlayers[swapIdx];
    G.board.auctionPlayers[swapIdx] = G.decks.activePlayers.pop();
    G.decks.activePlayers.push(oldCard);

    let reasonDesc = `swapped auction card ${oldCard.name} with deck card ${topCard.name}`;
    if (swapReason === 'denial') {
      reasonDesc = `defensively swapped away ${oldCard.name} with deck card ${topCard.name} to deny rival scoring`;
    } else if (swapReason === 'toxic_purge') {
      reasonDesc = `purged high-risk penalty card ${oldCard.name} with deck card ${topCard.name}`;
    }

    triggerAbilityNotification(G, cardinalsId, 'cardinals', 'Cardinals Deck Swap', `CPU Player ${displayId} ${reasonDesc}.`);
    addLog(G, `🦤 ${teamTitle} Ability: CPU Player ${displayId} ${reasonDesc}.`);
  } else {
    addLog(G, `🦤 ${teamTitle} Ability: CPU Player ${displayId} chose to keep the auction row.`);
  }
};

export const advanceCardinalsQueue = (G) => {
  if (G.board.pendingRaiders) return;
  while (G.board.pendingCardinalsQueue && G.board.pendingCardinalsQueue.length > 0) {
    const nextItem = G.board.pendingCardinalsQueue.shift();
    const nextPlayer = G.players[nextItem.playerID];
    if (!nextPlayer) continue;
    if (nextPlayer.isCpu) {
      executeCpuCardinals(G, nextItem.playerID);
    } else {
      if (G.decks.activePlayers && G.decks.activePlayers.length > 0) {
        const currentTopCard = G.decks.activePlayers[G.decks.activePlayers.length - 1];
        G.board.pendingCardinals = { playerID: nextItem.playerID, topCard: currentTopCard };
        return;
      }
    }
  }
  G.board.pendingCardinals = null;
  if (G.board.pendingChiefsQueue && G.board.pendingChiefsQueue.length > 0 && !G.board.pendingChiefs) {
    advanceChiefsQueue(G);
  } else if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0 && !G.board.pendingCommanders) {
    advanceCommandersQueue(G);
  }
  checkPreAuctionCompletion(G);
};

export const executeCpuChiefs = (G, chiefsId) => {
  const chiefsPlayer = G.players[chiefsId];
  if (!chiefsPlayer || chiefsPlayer.hasUsedChiefsAbility) return;
  const affordableCards = (G.board.auctionPlayers || [])
    .map((c, idx) => ({ card: c, index: idx }))
    .filter(item => item.card && item.card.minBid <= chiefsPlayer.coins);

  if (affordableCards.length > 0) {
    affordableCards.forEach(item => {
      item.score = scoreCardForPlayer(G, chiefsId, item.card);
    });
    affordableCards.sort((a, b) => b.score - a.score);

    const currentRound = G.board.round || 1;
    const estimatedEnd = calculateEstimatedGameEndRound(G);
    const isNearGameEnd = currentRound >= (estimatedEnd - 1);
    const isCloseToWinningSoon = (chiefsPlayer.psi <= 18) || (currentRound >= (estimatedEnd - 2));

    let chosenItem = null;

    if (currentRound === 1) {
      const r1Targets = affordableCards.filter(item =>
        item.card.id === 'drake_london' ||
        item.card.id === 'tee_higgins' ||
        item.card.id === 'brock_bowers' ||
        item.card.id === 'george_kittle' ||
        item.card.id === 'greg_olsen' ||
        item.card.id === 'josh_allen'
      );
      if (r1Targets.length > 0) {
        chosenItem = r1Targets[0];
      }
    } else if (currentRound === 2 || currentRound === 3) {
      chosenItem = null;
    } else if (currentRound >= 4 && currentRound <= 5) {
      const p2PrimaryTargets = affordableCards.filter(item =>
        item.card.id === 'travis_kelce' ||
        item.card.id === 'patrick_mahomes' ||
        item.card.id === 'adrian_peterson' ||
        item.card.id === 'marshawn_lynch' ||
        item.card.id === 'christian_mccaffrey' ||
        item.card.id === 'derrick_henry' ||
        item.card.id === 'saquon_barkley' ||
        item.card.id === 'dj_moore' ||
        item.card.id === 'lamar_jackson' ||
        item.card.phase === 'hof'
      );

      const p2InstantClosers = affordableCards.filter(item =>
        item.card.id === 'aaron_jones' ||
        item.card.id === 'jahmyr_gibbs' ||
        item.card.id === 'kenneth_walker' ||
        item.card.id === 'drew_brees' ||
        item.card.id === 'cam_newton'
      );

      const p2CoinEngines = affordableCards.filter(item =>
        item.card.id === 'ceedee_lamb' ||
        item.card.id === 'justin_jefferson' ||
        item.card.id === 'jamarr_chase'
      );

      if (isCloseToWinningSoon && p2InstantClosers.length > 0) {
        chosenItem = p2InstantClosers[0];
      } else if (p2PrimaryTargets.length > 0) {
        chosenItem = p2PrimaryTargets[0];
      } else if (p2CoinEngines.length > 0) {
        const realLineupDeflate = (chiefsPlayer.lineup || []).filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_')).reduce((s, c) => s + (c.effects?.filter(e => e.perRound && e.type === 'deflate').reduce((sum, e) => sum + e.amount, 0) || 0), 0);
        const hasPracticeSquad = (chiefsPlayer.lineup || []).some(c => c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
        if (chiefsPlayer.coins <= 8 || hasPracticeSquad || realLineupDeflate >= 3) {
          chosenItem = p2CoinEngines[0];
        }
      } else if (p2InstantClosers.length > 0 && chiefsPlayer.psi <= 25) {
        chosenItem = p2InstantClosers[0];
      }
    } else if (currentRound >= 6) {
      if (isNearGameEnd || currentRound >= 7) {
        chosenItem = affordableCards[0];
      }
    }

    if (chosenItem) {
      const card = chosenItem.card;
      chiefsPlayer.coins -= card.minBid;
      chiefsPlayer.hasUsedChiefsAbility = true;
      G.board.auctionPlayers[chosenItem.index] = null;
      resolveAuctionWin(G, chiefsId, card);
      const teamTitle = chiefsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Chiefs Ability)' : 'Chiefs';
      triggerAbilityNotification(G, chiefsId, 'chiefs', 'Chiefs Instant Claim', `Claimed ${card.name} for ${card.minBid} coins without bidding!`);
      addLog(G, `${teamTitle} Ability: CPU Player ${parseInt(chiefsId) + 1} claimed ${card.name} for ${card.minBid} coins without bidding!`);
    }
  }
};

export const advanceChiefsQueue = (G) => {
  if (G.board.pendingRaiders || G.board.pendingCardinals) return;
  if (!G.board.pendingChiefsQueue) G.board.pendingChiefsQueue = [];
  while (G.board.pendingChiefsQueue.length > 0) {
    const nextItem = G.board.pendingChiefsQueue.shift();
    const nextPlayer = G.players[nextItem.playerID];
    if (!nextPlayer || nextPlayer.hasUsedChiefsAbility) continue;
    if (nextPlayer.isCpu) {
      executeCpuChiefs(G, nextItem.playerID);
    } else {
      G.board.pendingChiefs = { playerID: nextItem.playerID };
      return;
    }
  }
  G.board.pendingChiefs = null;
  if (G.board.pendingCommandersQueue && G.board.pendingCommandersQueue.length > 0 && !G.board.pendingCommanders) {
    advanceCommandersQueue(G);
  }
  checkPreAuctionCompletion(G);
};

export const executeCpuCommanders = (G, commandersId) => {
  const chosenIdx = chooseCpuCommandersMarkCard(G, commandersId);
  if (chosenIdx !== -1) {
    if (!G.board.commandersMarkedIndices) G.board.commandersMarkedIndices = [];
    if (!G.board.commandersMarkedIndices.includes(chosenIdx)) {
      G.board.commandersMarkedIndices.push(chosenIdx);
    }
    G.board.commandersMarkedCardIndex = chosenIdx;
    const card = G.board.auctionPlayers[chosenIdx];
    if (card) {
      G.board.commandersShieldedCardId = card.id;
    }
    const displayId = parseInt(commandersId) + 1;
    const firstDisplayId = parseInt(G.board.firstPlayer) + 1;
    const commandersPlayer = G.players[commandersId];
    const teamTitle = commandersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Commanders Ability)' : 'Commanders';
    triggerAbilityNotification(G, commandersId, 'commanders', 'Commanders Blockade', `Marked ${card.name}! First Player (Player ${firstDisplayId}) cannot nominate or bid on this player.`);
    addLog(G, `🎖️ ${teamTitle} Ability: CPU Player ${displayId} marked ${card.name}. First Player (Player ${firstDisplayId}) cannot nominate or bid on this player!`);
  }
};

export const advanceCommandersQueue = (G) => {
  if (G.board.pendingRaiders || G.board.pendingCardinals || G.board.pendingChiefs) return;
  if (!G.board.pendingCommandersQueue) G.board.pendingCommandersQueue = [];
  while (G.board.pendingCommandersQueue.length > 0) {
    const nextItem = G.board.pendingCommandersQueue.shift();
    const commandersId = String(nextItem.playerID);
    const commandersPlayer = G.players[commandersId];
    if (!commandersPlayer) continue;

    if (String(commandersId) === String(G.board.firstPlayer)) {
      const displayId = parseInt(commandersId) + 1;
      const teamTitle = commandersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Commanders Ability)' : 'Commanders';
      addLog(G, `🎖️ ${teamTitle} Ability Skipped: Player ${displayId} is the First Player this round.`);
      continue;
    }

    if (commandersPlayer.isCpu) {
      executeCpuCommanders(G, commandersId);
    } else {
      G.board.pendingCommanders = { playerID: commandersId };
      return;
    }
  }
  G.board.pendingCommanders = null;
  checkPreAuctionCompletion(G);
};

export const executeCpuBills = (G, billsId) => {
  if (!G.decks.discard || G.decks.discard.length === 0) return;
  const billsPlayer = G.players[billsId];
  if (!billsPlayer || billsPlayer.hasUsedBillsAbility) return;

  const claim = evaluateBillsDiscardClaim(G, billsId);
  if (claim && claim.card) {
    const { card, replaceIdx, reason } = claim;
    const dIdx = G.decks.discard.indexOf(card);
    if (dIdx !== -1) G.decks.discard.splice(dIdx, 1);
    billsPlayer.coins -= card.minBid;
    billsPlayer.hasUsedBillsAbility = true;

    if (card.effects) {
      const billsEffTeam = getEffectiveTeamId(billsPlayer);
      card.effects.forEach(eff => {
        if (!eff.perRound) {
          let effAmount = eff.amount;
          if (billsEffTeam === 'bengals') effAmount += 2;
          if (eff.type === 'coins' && billsEffTeam !== 'browns') applyCoinsGained(G, billsId, effAmount);
          if (eff.type === 'deflate') applyPsiDeflated(G, billsId, effAmount);
          if (eff.type === 'inflate') applyPsiInflated(G, billsId, effAmount);
        }
      });
    }

    const billsEffTeam = getEffectiveTeamId(billsPlayer);
    const maxLineup = (billsEffTeam === 'seahawks' ? 4 : 3) + (billsPlayer.extraLineupSlots || 0);
    if (billsEffTeam === 'colts' || billsPlayer.lineup.length < maxLineup) {
      billsPlayer.lineup.push(card);
    } else if (replaceIdx !== -1 && replaceIdx < billsPlayer.lineup.length) {
      const replaced = billsPlayer.lineup[replaceIdx];
      billsPlayer.lineup[replaceIdx] = card;
      G.decks.discard.push(replaced);
    } else {
      let replaceCardIdx = -1;
      if (billsEffTeam !== 'saints') {
        let worstToxicPenalty = -Infinity;
        billsPlayer.lineup.forEach((c, idx) => {
          const isPS = c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_');
          if (!c || isPS) return;
          const recInflate = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'inflate').reduce((s, e) => s + e.amount, 0) || 0;
          const recNegCoins = c.effects?.filter(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'coins' && e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0) || 0;
          if (recInflate > 0 || recNegCoins > 0) {
            const penalty = (recInflate * 3.0) + recNegCoins;
            if (penalty > worstToxicPenalty) {
              worstToxicPenalty = penalty;
              replaceCardIdx = idx;
            }
          }
        });
      }

      if (replaceCardIdx === -1) {
        const psIdx = billsPlayer.lineup.findIndex(c => c.isPracticeSquad || c.id === 'practice_squad' || c.uniqueId?.startsWith('ps_'));
        if (psIdx !== -1) {
          replaceCardIdx = psIdx;
        } else {
          let minScore = Infinity;
          billsPlayer.lineup.forEach((c, idx) => {
            const s = scoreCardForPlayer(G, billsId, c);
            if (s < minScore) { minScore = s; replaceCardIdx = idx; }
          });
        }
      }

      if (replaceCardIdx === -1) replaceCardIdx = 0;
      const replaced = billsPlayer.lineup[replaceCardIdx];
      billsPlayer.lineup[replaceCardIdx] = card;
      G.decks.discard.push(replaced);
    }

    const teamTitle = billsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Bills Ability)' : 'Bills';
    triggerAbilityNotification(G, billsId, 'bills', 'Bills Discard Claim', `Claimed ${card.name} (${reason}) from discard for ${card.minBid} coins!`);
    addLog(G, `🦬 ${teamTitle} Ability: CPU Player ${parseInt(billsId) + 1} bought ${card.name} (${reason}) from discard for ${card.minBid} coins.`);
  }
};

export const advanceBillsQueue = (G) => {
  if (!G.board.pendingBillsQueue) G.board.pendingBillsQueue = [];
  while (G.board.pendingBillsQueue.length > 0) {
    const nextItem = G.board.pendingBillsQueue.shift();
    const billsId = String(nextItem.playerID);
    const billsPlayer = G.players[billsId];
    if (!billsPlayer || billsPlayer.hasUsedBillsAbility) continue;
    if (!G.decks.discard || G.decks.discard.length === 0) continue;

    if (billsPlayer.isCpu) {
      executeCpuBills(G, billsId);
    } else {
      G.board.pendingBills = { playerID: billsId };
      return;
    }
  }
  G.board.pendingBills = null;
  if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0 && !G.board.pendingEagles) {
    advanceEaglesQueue(G);
  }
  checkPostAuctionCompletion(G);
};

export const executeCpuEagles = (G, eaglesId) => {
  const eaglesPlayer = G.players[eaglesId];
  if (!eaglesPlayer) return;
  const usedThisRound = eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0;
  if (usedThisRound >= 2) return;

  const round = G.board.round || 1;
  const saintsPlayer = Object.values(G.players).find(p => getEffectiveTeamId(p) === 'saints');
  let isSaintsTop = false;
  if (saintsPlayer) {
    const allPsi = Object.values(G.players).map(p => p.psi || 40);
    const minPsi = Math.min(...allPsi);
    if ((saintsPlayer.psi || 40) <= minPsi + 1) isSaintsTop = true;
  }

  let timesToUse = 0;
  if (!isSaintsTop && round >= 3) {
    timesToUse = (usedThisRound === 0 && eaglesPlayer.coins >= 8) ? 2 : (eaglesPlayer.coins >= 5 ? 1 : 0);
  }

  if (timesToUse > 0) {
    const cost = timesToUse * 3;
    eaglesPlayer.coins -= cost;
    eaglesPlayer.eaglesUsedRound = G.board.round;
    eaglesPlayer.eaglesUsedCount = usedThisRound + timesToUse;
    Object.keys(G.players).forEach(id => {
      if (id !== eaglesId && getEffectiveTeamId(G.players[id]) !== 'saints') {
        applyPsiInflated(G, id, timesToUse * 3);
      }
    });
    const teamTitle = eaglesPlayer?.team?.id === 'buccaneers' ? 'Bucs (Eagles Ability)' : 'Eagles';
    triggerAbilityNotification(G, eaglesId, 'eagles', 'Eagles Tush Push', `Paid ${cost} coins to inflate all opponents +${timesToUse * 3} PSI!`);
    addLog(G, `🦅 ${teamTitle} Ability: CPU Player ${parseInt(eaglesId) + 1} paid ${cost} coins to inflate all opponents +${timesToUse * 3} PSI! (${timesToUse}x)`);
  }
};

export const advanceEaglesQueue = (G) => {
  if (G.board.pendingBills || G.pendingReplacement) return;
  if (!G.board.pendingEaglesQueue) G.board.pendingEaglesQueue = [];
  while (G.board.pendingEaglesQueue.length > 0) {
    const nextItem = G.board.pendingEaglesQueue.shift();
    const eaglesId = String(nextItem.playerID);
    const eaglesPlayer = G.players[eaglesId];
    if (!eaglesPlayer) continue;

    const usedThisRound = eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0;
    if (usedThisRound >= 2) continue;

    if (eaglesPlayer.isCpu) {
      executeCpuEagles(G, eaglesId);
    } else {
      G.board.pendingEagles = { playerID: eaglesId };
      return;
    }
  }
  G.board.pendingEagles = null;
  checkPostAuctionCompletion(G);
};

export const checkPostAuctionCompletion = (G) => {
  if (!G.board.pendingBills &&
      !G.board.pendingEagles &&
      !G.pendingReplacement &&
      (!G.board.pendingBillsQueue || G.board.pendingBillsQueue.length === 0) &&
      (!G.board.pendingEaglesQueue || G.board.pendingEaglesQueue.length === 0)) {
    G.board.postAuctionComplete = true;
  }
};

export const resolveTradeRumors = (G) => {
  if (!G.board.pendingTradeRumors || !G.board.pendingTradeRumors.picks) return;
  const numP = Object.keys(G.players).length;
  const passedCards = {};
  Object.keys(G.players).forEach(id => {
    const pl = G.players[id];
    const pickIdx = G.board.pendingTradeRumors.picks[id];
    passedCards[id] = (pickIdx !== undefined && pl.lineup[pickIdx]) ? pl.lineup[pickIdx] : pl.lineup[0];
  });

  const summaries = [];
  Object.keys(G.players).forEach(id => {
    const idx = parseInt(id);
    const giverId = ((idx - 1 + numP) % numP).toString();
    const receivedCard = passedCards[giverId];
    const givenCard = passedCards[id];

    const pl = G.players[id];
    if (givenCard && receivedCard) {
      const cardLoc = pl.lineup.findIndex(c => c.uniqueId === givenCard.uniqueId);
      if (cardLoc !== -1) {
        pl.lineup[cardLoc] = receivedCard;
      } else {
        pl.lineup.push(receivedCard);
      }
      summaries.push(`Player ${parseInt(giverId) + 1} passed ${receivedCard.name} to Player ${idx + 1}`);
    }
  });

  const hasHumans = Object.values(G.players).some(p => !p.isCpu);
  G.board.tradeRumorsSummary = hasHumans ? summaries : null;
  addLog(G, `Trade Rumors Complete: All players passed 1 active player to the right.`);
  G.board.pendingTradeRumors = null;
};

export const executeActiveEvent = (G) => {
  const ev = G.board.activeEvent;
  if (!ev) return;

  if (ev.category === 'instant_inflate') {
    Object.keys(G.players).forEach(id => applyPsiInflated(G, id, ev.amount || 7));
    G.board.eventNotification = `🔥 Hot Air: All eligible players inflated by +${ev.amount || 7} PSI!`;
    addLog(G, G.board.eventNotification);
  } else if (ev.category === 'instant_deflate') {
    Object.keys(G.players).forEach(id => applyPsiDeflated(G, id, ev.amount || 7));
    G.board.eventNotification = `❄️ Cold Air: All players deflated by -${ev.amount || 7} PSI!`;
    addLog(G, G.board.eventNotification);
  } else if (ev.category === 'match_second_psi') {
    const sorted = Object.entries(G.players).sort((a, b) => b[1].psi - a[1].psi);
    if (sorted.length >= 2) {
      const [highestId, highest] = sorted[0];
      const [, secondHighest] = sorted[1];
      if (highest.psi === secondHighest.psi) {
        G.board.eventNotification = `1st Overall Pick: Tie for highest PSI (${highest.psi}). No deflation occurred.`;
      } else {
        const diff = highest.psi - secondHighest.psi;
        applyPsiDeflated(G, highestId, diff);
        G.board.eventNotification = `1st Overall Pick: ${highest.team?.name || 'Player'} deflated by -${diff} PSI to match 2nd highest (${secondHighest.psi}).`;
      }
      addLog(G, G.board.eventNotification);
      addBannerEvent(G, {
        icon: '🎯',
        title: '1st Overall Pick',
        text: G.board.eventNotification
      });
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
  } else if (ev.category === 'overpaid') {
    addLog(G, `Round ${G.board.round} Event: ${ev.name} — Player card maximum purchase prices increased by +${ev.maxAdd || 4}!`);
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
    const allPicked = Object.keys(G.players).every(id => G.board.pendingTradeRumors?.picks?.[id] !== undefined);
    if (allPicked) {
      resolveTradeRumors(G);
    }
  } else if (ev.category === 'bonus_auction') {
    if (G.decks.activePlayers.length > 0) {
      const card = G.decks.activePlayers.pop();
      const tradeCard = { ...card, uniqueId: `trade_demand_${G.board.round}` };
      G.board.tradeDemandCard = tradeCard;
      G.board.isTradeDemandActive = true;
      G.board.bonusAuction = null;
      G.board.eventNotification = `🚨 Player Demands a Trade! ${tradeCard.name} (Min: ${tradeCard.minBid}, Max: ${tradeCard.maxBid}) will be auctioned first before the regular auction!`;
      addLog(G, G.board.eventNotification);
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
          checkDolphinsEmergencyCoins(G, id);
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
};

export const DeflategateGame = {
  name: 'deflategate',

  setup: ({ ctx, random }, setupData) => {
    const eventDeck = fisherYatesShuffle([...EVENTS]).slice(0, 10);
    const phase1Deck = fisherYatesShuffle([...PHASE_1_PLAYERS]);
    const phase2Deck = fisherYatesShuffle([...PHASE_2_PLAYERS]);
    const hofDeck = fisherYatesShuffle([...HOF_PLAYERS]);

    const shuffledTeams = fisherYatesShuffle([...TEAMS]);
    const numPlayers = (ctx && ctx.numPlayers) || 4;
    const numHumans = typeof setupData?.numHumans === 'number'
      ? Math.max(0, Math.min(numPlayers, setupData.numHumans))
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
      cpuDifficulty: setupData?.cpuDifficulty || 'normal',
      teamGenomes: setupData?.teamGenomes || null,
      forcedTeams: setupData?.forcedTeams || null,
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
        isTradeDemandActive: false,
        isTradeDemandBidding: false,
        tradeDemandCard: null,
        pendingRegularAuctionPlayers: null,
        abilityNotification: null,
        abilityNotificationHistory: [],
        auctionPlayers: [],
        activeAuctionCardIndex: null,
        commandersMarkedCardIndex: null,
        commandersMarkedIndices: [],
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
        tyreekHillAlert: null,
        gameLogBannerHistory: []
      }
    };
  },

  moves: {
    setVsCpu: ({ G }, value) => {
      G.vsCpu = value;
    },
    setCpuDifficulty: ({ G }, difficulty) => {
      G.cpuDifficulty = difficulty;
    },
    setNumHumans: ({ G }, count) => {
      if (typeof count !== 'number' || count < 0) return;
      const numPlayers = Object.keys(G.players).length;
      G.numHumans = Math.min(numPlayers, count);
      G.vsCpu = G.numHumans < numPlayers;
      Object.keys(G.players).forEach(id => {
        G.players[id].isCpu = parseInt(id) >= G.numHumans;
      });
    },
    setTeamGenome: ({ G }, teamId, genome) => {
      if (!G.teamGenomes) G.teamGenomes = {};
      G.teamGenomes[teamId] = genome;
    },
    setAllTeamGenomes: ({ G }, genomes) => {
      G.teamGenomes = { ...(G.teamGenomes || {}), ...genomes };
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
          cpu.team = selectCpuTeamFromChoices(cpu.teamChoices, cpu.personality) || cpu.teamChoices[0];
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
    },
    copyAbility: ({ G, playerID }, targetTeamId, actingPlayerId) => {
      const bucsPlayerId = Object.keys(G.players).find(id => G.players[id].team && G.players[id].team.id === 'buccaneers');
      const targetPlayerId = actingPlayerId || (G.players[playerID]?.team?.id === 'buccaneers' ? playerID : bucsPlayerId || Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
      const targetTeam = TEAMS.find(t => t.id === targetTeamId);
      if (!targetTeam) return INVALID_MOVE;

      p.copiedTeam = targetTeam;
      p.buccaneersCopiedTeamId = targetTeam.id;
      p.genome = G?.teamGenomes?.[targetTeam.id] || ACTIVE_TEAM_GENOMES[targetTeam.id] || BASELINE_TEAM_GENOMES[targetTeam.id];
      if (targetTeam.id === 'seahawks' && p.lineup.length < 4) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_3` });
        addLog(G, `Seahawks Ability: Buccaneers gained a 4th Practice Squad player!`);
      }
      const displayId = parseInt(targetPlayerId) + 1;
      const msg = `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability: "${targetTeam.ability}"!`;
      addLog(G, msg);
      addBannerEvent(G, {
        icon: '🏴‍☠️',
        title: 'Buccaneers Assimilation',
        text: msg
      });
      G.board.bucsCopyComplete = true;
    },
    buccaneersPickTeam: ({ G, playerID }, targetTeamId, actingPlayerId) => {
      const bucsPlayerId = Object.keys(G.players).find(id => G.players[id].team && G.players[id].team.id === 'buccaneers');
      const targetPlayerId = actingPlayerId || (G.players[playerID]?.team?.id === 'buccaneers' ? playerID : bucsPlayerId || Object.keys(G.players)[0]);
      const p = G.players[targetPlayerId];
      if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
      const targetTeam = TEAMS.find(t => t.id === targetTeamId);
      if (!targetTeam) return INVALID_MOVE;

      p.copiedTeam = targetTeam;
      p.buccaneersCopiedTeamId = targetTeam.id;
      p.genome = G?.teamGenomes?.[targetTeam.id] || ACTIVE_TEAM_GENOMES[targetTeam.id] || BASELINE_TEAM_GENOMES[targetTeam.id];
      if (targetTeam.id === 'seahawks' && p.lineup.length < 4) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_3` });
        addLog(G, `Seahawks Ability: Buccaneers gained a 4th Practice Squad player!`);
      }
      const displayId = parseInt(targetPlayerId) + 1;
      const msg = `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability: "${targetTeam.ability}"!`;
      addLog(G, msg);
      addBannerEvent(G, {
        icon: '🏴‍☠️',
        title: 'Buccaneers Assimilation',
        text: msg
      });
      G.board.bucsCopyComplete = true;
    },
    replaceLineupCard: ({ G, playerID }, discardIndex, actingPlayerId) => {
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
      }
    },
    discardWonCard: ({ G, playerID }, actingPlayerId) => {
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
      triggerAbilityNotification(G, targetPlayerId, 'bengals', 'Bengals Discard', `Player ${displayId} discarded ${wonCard.name} instead of adding to lineup!`);
      G.pendingReplacement = null;

      if (G.board.postAuctionComplete === false && !G.board.pendingBills && !G.board.pendingEagles) {
        G.board.postAuctionComplete = true;
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
      triggerAbilityNotification(G, playerID, 'jaguars', 'Jaguars Foresight', `Player ${displayId} (${p.team.name}) reordered the Event Deck!`);
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
      targetCard.ramsMultiplier = true;
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

      if (!G.board.commandersMarkedIndices) G.board.commandersMarkedIndices = [];
      if (!G.board.commandersMarkedIndices.includes(auctionCardIndex)) {
        G.board.commandersMarkedIndices.push(auctionCardIndex);
      }
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
      }
    },
    buyPracticeSquad: ({ G, playerID }, actingPlayerId) => {
      if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
        return INVALID_MOVE;
      }
      const p = G.players[targetPlayerId];
      if (!p || p.coins < 10) return INVALID_MOVE;

      p.coins -= 10;
      checkDolphinsEmergencyCoins(G, targetPlayerId);
      p.extraLineupSlots = (p.extraLineupSlots || 0) + 1;
      p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_cap_${targetPlayerId}_${Date.now()}` });
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `New Cap Limit: Player ${displayId} paid 10 coins to add an extra Practice Squad Player (+1 Lineup Slot)!`);
      advanceNewCapLimitQueue(G);
    },
    passPracticeSquad: ({ G, playerID }, actingPlayerId) => {
      if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
      const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
      if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
        return INVALID_MOVE;
      }
      const displayId = parseInt(targetPlayerId) + 1;
      addLog(G, `New Cap Limit: Player ${displayId} passed.`);
      advanceNewCapLimitQueue(G);
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

      const giverName = giver.team?.name ? `${giver.team.name} (Player ${parseInt(giverId) + 1})` : `Player ${parseInt(giverId) + 1}`;
      const targetName = target?.team?.name ? `${target.team.name} (Player ${parseInt(targetId) + 1})` : `Player ${parseInt(targetId) + 1}`;
      giver.psi = Math.max(0, giver.psi - 1);
      applyPsiInflated(G, targetId, 1);
      const rivalryMsg = `${giverName} gave 1 PSI to ${targetName}.`;
      addLog(G, `⚔️ Rivalry: ${rivalryMsg}`);
      addBannerEvent(G, {
        icon: '⚔️',
        title: 'Rivalry Action',
        text: rivalryMsg
      });

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
        addBannerEvent(G, {
          icon: '🔄',
          title: 'Trade Rumors',
          text: summaries.join('; ')
        });
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
      const actualTargetId = (typeof replaceIndex === 'string' && !actingPlayerId) ? replaceIndex : (actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]));
      const actualReplaceIdx = (typeof replaceIndex === 'number') ? replaceIndex : -1;
      if (G.board.pendingFreeAgency.playerID && String(actualTargetId) !== String(G.board.pendingFreeAgency.playerID)) {
        return INVALID_MOVE;
      }
      const p = G.players[actualTargetId];
      if (!p) return INVALID_MOVE;
      const card = G.board.pendingFreeAgency.card;
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      if ((p.coins || 0) < effMax) return INVALID_MOVE;

      p.coins = Math.max(0, (p.coins || 0) - effMax);
      checkDolphinsEmergencyCoins(G, actualTargetId);
      const displayId = parseInt(actualTargetId) + 1;
      const isColts = getEffectiveTeamId(p) === 'colts';
      if (!isColts && actualReplaceIdx >= 0 && actualReplaceIdx < p.lineup.length) {
        const discarded = p.lineup[actualReplaceIdx];
        p.lineup[actualReplaceIdx] = card;
        if (!G.decks.discard) G.decks.discard = [];
        G.decks.discard.push(discarded);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
      } else {
        p.lineup.push(card);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
      }

      // Jets Ability: Deflate 4 on max bid!
      if (getEffectiveTeamId(p) === 'jets') {
        applyPsiDeflated(G, actualTargetId, 4);
        addLog(G, `✈️ Jets Ability: Paid max price for Free Agent ${card.name}! Deflated 4 PSI.`);
        triggerAbilityNotification(G, actualTargetId, 'jets', 'Jets: Max Bid Free Agent', `Paid maximum price (${effMax} coins) for ${card.name}! Deflated 4 PSI.`);
      }

      // Instant card effects & triggers
      addAcquiredCardEffects(G, actualTargetId, card, effMax, true);

      advanceFreeAgencyQueue(G);
      if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
        if (events && events.setPhase) {
          events.setPhase('preAuctionPhase');
        } else if (events && events.endPhase) {
          events.endPhase();
        }
      }
    },
    freeAgencyBuy: ({ G, playerID, events }, replaceIndex, actingPlayerId) => {
      if (!G.board.pendingFreeAgency || !G.board.pendingFreeAgency.card) return INVALID_MOVE;
      const actualTargetId = (typeof replaceIndex === 'string' && !actingPlayerId) ? replaceIndex : (actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]));
      const actualReplaceIdx = (typeof replaceIndex === 'number') ? replaceIndex : -1;
      const p = G.players[actualTargetId];
      if (!p) return INVALID_MOVE;
      const card = G.board.pendingFreeAgency.card;
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      if ((p.coins || 0) < effMax) return INVALID_MOVE;

      p.coins = Math.max(0, (p.coins || 0) - effMax);
      checkDolphinsEmergencyCoins(G, actualTargetId);
      const displayId = parseInt(actualTargetId) + 1;
      const isColts = getEffectiveTeamId(p) === 'colts';
      if (!isColts && actualReplaceIdx >= 0 && actualReplaceIdx < p.lineup.length) {
        const discarded = p.lineup[actualReplaceIdx];
        p.lineup[actualReplaceIdx] = card;
        if (!G.decks.discard) G.decks.discard = [];
        G.decks.discard.push(discarded);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
      } else {
        p.lineup.push(card);
        addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
      }

      if (getEffectiveTeamId(p) === 'jets') {
        applyPsiDeflated(G, actualTargetId, 4);
        addLog(G, `✈️ Jets Ability: Paid max price for Free Agent ${card.name}! Deflated 4 PSI.`);
        triggerAbilityNotification(G, actualTargetId, 'jets', 'Jets: Max Bid Free Agent', `Paid maximum price (${effMax} coins) for ${card.name}! Deflated 4 PSI.`);
      }

      addAcquiredCardEffects(G, actualTargetId, card, effMax, true);

      advanceFreeAgencyQueue(G);
      if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
        if (events && events.setPhase) {
          events.setPhase('preAuctionPhase');
        } else if (events && events.endPhase) {
          events.endPhase();
        }
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
      if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
        if (events && events.setPhase) {
          events.setPhase('preAuctionPhase');
        } else if (events && events.endPhase) {
          events.endPhase();
        }
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
      executeActiveEvent(G);
      if (!G.board.pendingRivalry && !G.board.pendingTradeRumors && !G.board.tradeRumorsSummary && !G.board.bonusAuction && !G.board.pendingFreeAgency && !G.board.pendingNewCapLimit) {
        if (events && events.setPhase) {
          events.setPhase('preAuctionPhase');
        } else if (events && events.endPhase) {
          events.endPhase();
        }
      }
    },
    proceedToRefresh: ({ G, events }) => {
      G.board.pendingBills = null;
      G.board.pendingBillsQueue = [];
      G.board.pendingEagles = null;
      G.board.pendingEaglesQueue = [];
      G.pendingReplacement = null;
      G.board.postAuctionComplete = true;
      if (events && events.setPhase) {
        events.setPhase('refreshPhase');
      } else if (events && events.endPhase) {
        events.endPhase();
      }
    },
    confirmRefreshSummary: ({ G }) => {
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
    },
    dismissTradeRumorsSummary: ({ G }) => {
      G.board.tradeRumorsSummary = null;
      G.board.eventConfirmed = true;
    },
    eaglesUseAbility: ({ G, playerID }, times) => {
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
      }
    },
    eaglesInflate: ({ G, playerID }) => {
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
      }
    },
    eaglesPass: ({ G }) => {
      if (G.board.pendingEaglesQueue && G.board.pendingEaglesQueue.length > 0) {
        G.board.pendingEagles = G.board.pendingEaglesQueue.shift();
      } else {
        G.board.pendingEagles = null;
      }
      if (!G.board.pendingBills && !G.board.pendingEagles && !G.pendingReplacement) {
        G.board.postAuctionComplete = true;
      }
    },
    proceedToRefresh: ({ G }) => {
      G.board.pendingBills = null;
      G.board.pendingBillsQueue = [];
      G.board.pendingEagles = null;
      G.board.pendingEaglesQueue = [];
      G.pendingReplacement = null;
      G.board.postAuctionComplete = true;
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
      onBegin: ({ G }) => {
        // If all players are CPU (e.g. headless AI simulation), auto-assign all teams immediately
        const humanCount = Object.values(G.players).filter(p => !p.isCpu).length;
        if (humanCount === 0) {
          Object.keys(G.players).forEach(id => {
            const cpu = G.players[id];
            if (cpu && !cpu.team) {
              if (G.forcedTeams?.[id]) {
                const forced = TEAMS.find(t => t.id === G.forcedTeams[id]);
                if (forced) cpu.team = forced;
              }
              if (!cpu.team) {
                if (!cpu.personality) cpu.personality = CPU_ARCHETYPES[parseInt(id) % CPU_ARCHETYPES.length];
                cpu.team = selectCpuTeamFromChoices(cpu.teamChoices, cpu.personality) || cpu.teamChoices[0];
              }
              cpu.psi = cpu.team.initialPsi;
              cpu.coins = cpu.team.coins;
              const cpuPsCount = cpu.team.id === 'seahawks' ? 4 : 3;
              for (let i = 0; i < cpuPsCount; i++) {
                cpu.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${id}_${i}` });
              }
              addLog(G, `CPU Player ${parseInt(id) + 1} selected team ${cpu.team.name}.`);
            }
          });
        }
      },
      moves: {
        setCpuDifficulty: ({ G }, difficulty) => {
          G.cpuDifficulty = difficulty;
        },
        setTeamGenome: ({ G }, teamId, genome) => {
          if (!G.teamGenomes) G.teamGenomes = {};
          G.teamGenomes[teamId] = genome;
        },
        setAllTeamGenomes: ({ G }, genomes) => {
          G.teamGenomes = { ...(G.teamGenomes || {}), ...genomes };
        },
        setNumHumans: ({ G }, count) => {
          if (typeof count !== 'number' || count < 0) return;
          const numPlayers = Object.keys(G.players).length;
          G.numHumans = Math.min(numPlayers, count);
          G.vsCpu = G.numHumans < numPlayers;
          Object.keys(G.players).forEach(id => {
            G.players[id].isCpu = parseInt(id) >= G.numHumans;
          });
          // If set to 0 humans, immediately auto-assign teams for any CPU that hasn't picked
          if (G.numHumans === 0) {
            Object.keys(G.players).forEach(id => {
              const cpu = G.players[id];
              if (cpu && !cpu.team) {
                if (!cpu.personality) cpu.personality = CPU_ARCHETYPES[parseInt(id) % CPU_ARCHETYPES.length];
                cpu.team = selectCpuTeamFromChoices(cpu.teamChoices, cpu.personality) || cpu.teamChoices[0];
                cpu.psi = cpu.team.initialPsi;
                cpu.coins = cpu.team.coins;
                const cpuPsCount = cpu.team.id === 'seahawks' ? 4 : 3;
                for (let i = 0; i < cpuPsCount; i++) {
                  cpu.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${id}_${i}` });
                }
                addLog(G, `CPU Player ${parseInt(id) + 1} selected team ${cpu.team.name}.`);
              }
            });
          }
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
          if (typeof p.isCpu !== 'boolean') {
            p.isCpu = false;
          }
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
                cpu.team = selectCpuTeamFromChoices(cpu.teamChoices, cpu.personality) || cpu.teamChoices[0];
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
          return;
        }

        const bucsPlayer = G.players[bucsPlayerId];
        const otherDrafted = Object.values(G.players).filter(p => p.team && p.team.id !== 'buccaneers').map(p => p.team);

        if (bucsPlayer.isCpu) {
          const chosenTeam = selectCpuBucsTeamToCopy(otherDrafted);
          bucsPlayer.copiedTeam = chosenTeam;
          bucsPlayer.buccaneersCopiedTeamId = chosenTeam.id;
          bucsPlayer.genome = G?.teamGenomes?.[chosenTeam.id] || ACTIVE_TEAM_GENOMES[chosenTeam.id] || BASELINE_TEAM_GENOMES[chosenTeam.id];
          if (chosenTeam.id === 'seahawks' && bucsPlayer.lineup.length < 4) {
            bucsPlayer.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${bucsPlayerId}_3` });
            addLog(G, `Seahawks Ability: Buccaneers gained a 4th Practice Squad player!`);
          }
          const msg = `Buccaneers (CPU Player ${parseInt(bucsPlayerId) + 1}) copied ${chosenTeam.name}'s ability: "${chosenTeam.ability}".`;
          addLog(G, msg);
          addBannerEvent(G, {
            icon: '🏴‍☠️',
            title: 'Buccaneers Assimilation',
            text: msg
          });
          G.board.bucsCopyComplete = true;
        }
      },
      moves: {
        copyAbility: ({ G, playerID }, targetTeamId, actingPlayerId) => {
          const bucsPlayerId = Object.keys(G.players).find(id => G.players[id].team && G.players[id].team.id === 'buccaneers');
          const targetPlayerId = actingPlayerId || (G.players[playerID]?.team?.id === 'buccaneers' ? playerID : bucsPlayerId || Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
          const targetTeam = TEAMS.find(t => t.id === targetTeamId);
          if (!targetTeam) return INVALID_MOVE;

          p.copiedTeam = targetTeam;
          p.buccaneersCopiedTeamId = targetTeam.id;
          p.genome = G?.teamGenomes?.[targetTeam.id] || ACTIVE_TEAM_GENOMES[targetTeam.id] || BASELINE_TEAM_GENOMES[targetTeam.id];
          if (targetTeam.id === 'seahawks' && p.lineup.length < 4) {
            p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_3` });
            addLog(G, `Seahawks Ability: Buccaneers gained a 4th Practice Squad player!`);
          }
          const displayId = parseInt(targetPlayerId) + 1;
          const msg = `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability: "${targetTeam.ability}"!`;
          addLog(G, msg);
          addBannerEvent(G, {
            icon: '🏴‍☠️',
            title: 'Buccaneers Assimilation',
            text: msg
          });
          G.board.bucsCopyComplete = true;
        },
        buccaneersPickTeam: ({ G, playerID }, targetTeamId, actingPlayerId) => {
          const bucsPlayerId = Object.keys(G.players).find(id => G.players[id].team && G.players[id].team.id === 'buccaneers');
          const targetPlayerId = actingPlayerId || (G.players[playerID]?.team?.id === 'buccaneers' ? playerID : bucsPlayerId || Object.keys(G.players)[0]);
          const p = G.players[targetPlayerId];
          if (!p || !p.team || p.team.id !== 'buccaneers') return INVALID_MOVE;
          const targetTeam = TEAMS.find(t => t.id === targetTeamId);
          if (!targetTeam) return INVALID_MOVE;

          p.copiedTeam = targetTeam;
          p.buccaneersCopiedTeamId = targetTeam.id;
          p.genome = G?.teamGenomes?.[targetTeam.id] || ACTIVE_TEAM_GENOMES[targetTeam.id] || BASELINE_TEAM_GENOMES[targetTeam.id];
          if (targetTeam.id === 'seahawks' && p.lineup.length < 4) {
            p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${targetPlayerId}_3` });
            addLog(G, `Seahawks Ability: Buccaneers gained a 4th Practice Squad player!`);
          }
          const displayId = parseInt(targetPlayerId) + 1;
          const msg = `Buccaneers (Player ${displayId}) copied ${targetTeam.name}'s ability: "${targetTeam.ability}"!`;
          addLog(G, msg);
          addBannerEvent(G, {
            icon: '🏴‍☠️',
            title: 'Buccaneers Assimilation',
            text: msg
          });
          G.board.bucsCopyComplete = true;
        }
      },
      endIf: ({ G }) => G.board.bucsCopyComplete === true,
      next: 'titansDraft'
    },

    titansDraft: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, events }) => {
        G.board.titansDraftComplete = false;
        const titansQueue = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'titans');
        // Real Titans always acts first, then Buccaneers!
        titansQueue.sort((a, b) => (G.players[a].team?.id === 'titans' ? 0 : 1) - (G.players[b].team?.id === 'titans' ? 0 : 1));
        G.board.titansDraftQueue = titansQueue;
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

          // Apply instant effects of chosenCard upon drafting
          if (chosenCard.effects) {
            chosenCard.effects.forEach(eff => {
              if (!eff.perRound) {
                if (eff.type === 'coins') applyCoinsGained(G, targetPlayerId, eff.amount);
                if (eff.type === 'deflate') applyPsiDeflated(G, targetPlayerId, eff.amount);
                if (eff.type === 'inflate') applyPsiInflated(G, targetPlayerId, eff.amount);
              }
            });
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
        steelersTeams.sort((a, b) => (G.players[a].team?.id === 'steelers' ? 0 : 1) - (G.players[b].team?.id === 'steelers' ? 0 : 1));
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
            const teamTitle = steelersPlayer.team?.id === 'buccaneers' ? 'Bucs (Steelers Ability)' : 'Steelers';
            G.board.steelersAlert = `⚡ ${teamTitle} Ability: Strictly richest! Transferred 1 PSI to opponents (PSI -${givenCount}).`;
            addLog(G, G.board.steelersAlert);
            triggerAbilityNotification(G, steelersId, 'steelers', 'Steelers Richest Bounty', `Strictly richest! Transferred 1 PSI to rivals (-${givenCount} PSI).`);
          }
        });

        // CPU Jaguars check: Reorder deck once per game BEFORE the upcoming round's event is drawn
        const jaguarsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'jaguars');
        jaguarsTeams.sort((a, b) => (G.players[a].team?.id === 'jaguars' ? 0 : 1) - (G.players[b].team?.id === 'jaguars' ? 0 : 1));
        jaguarsTeams.forEach(jaguarsPlayerId => {
          const jaguarsPlayer = G.players[jaguarsPlayerId];
          if (jaguarsPlayer && jaguarsPlayer.isCpu && !jaguarsPlayer.hasUsedJaguarsAbility && !G.board.jaguarsAbilityUsed) {
            if (shouldJaguarsRearrangeNow(G, jaguarsPlayerId)) {
              G.decks.event = buildJaguarsMasterDeckOrder(G, jaguarsPlayerId);
              jaguarsPlayer.hasUsedJaguarsAbility = true;
              G.board.jaguarsAbilityUsed = true;
              const displayId = parseInt(jaguarsPlayerId) + 1;
              const teamTitle = jaguarsPlayer.team?.id === 'buccaneers' ? 'Bucs (Jaguars Ability)' : 'Jaguars';
              triggerAbilityNotification(G, jaguarsPlayerId, 'jaguars', 'Jaguars Foresight', `Masterfully reordered the Event Deck!`);
              G.board.jaguarsPopupNotification = `🔮 ${teamTitle} Ability Used! CPU Player ${displayId} (${jaguarsPlayer.team.name}) has masterfully reordered the Event Deck!`;
              addLog(G, G.board.jaguarsPopupNotification);
            }
          }
        });

        // Deck progression shuffles at the start of new eras
        if (G.board.round >= 4 && !G.board.phase2Shuffled) {
          G.board.phase2Shuffled = true;
          G.decks.activePlayers = fisherYatesShuffle([...G.decks.activePlayers, ...G.decks.phase2]);
          addLog(G, `🏈 Phase 2 players shuffled into the player deck at Round 4!`);
        }
        if (G.board.round >= 7 && !G.board.hofShuffled) {
          G.board.hofShuffled = true;
          G.decks.activePlayers = fisherYatesShuffle([...G.decks.activePlayers, ...G.decks.hof]);
          addLog(G, `⭐ Hall of Fame legends shuffled into the player deck at Round 7!`);
        }

        // Browns Ability: At start of Round 5, gain +30 coins
        Object.keys(G.players).forEach(id => {
          const p = G.players[id];
          const effTeam = getEffectiveTeamId(p);
          if (effTeam === 'browns' && G.board.round >= 5 && !p.hasBrownsBonus) {
            p.coins += 30;
            p.hasBrownsBonus = true;
            addLog(G, `Browns Ability: Start of Round 5! Gained +30 coins.`);
          }
        });

        // Reveal Event (with safety if deck runs low) - draws from top of deck (index 0)
        let ev = G.decks.event.shift();
        if (!ev) {
          G.decks.event = fisherYatesShuffle([...EVENTS]);
          ev = G.decks.event.shift();
        }
        G.board.activeEvent = ev;
        G.board.eventFlipRevealed = true;
        G.board.eventsRevealed++;

        addLog(G, `Round ${G.board.round} Event Revealed: ${ev.name} — ${ev.effect}`);

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
          executeActiveEvent(G);
          if (!G.board.pendingRivalry && !G.board.pendingTradeRumors && !G.board.tradeRumorsSummary && !G.board.bonusAuction && !G.board.pendingFreeAgency && !G.board.pendingNewCapLimit) {
            if (events && events.setPhase) {
              events.setPhase('preAuctionPhase');
            } else if (events && events.endPhase) {
              events.endPhase();
            }
          }
        },
        buyPracticeSquad: ({ G, playerID }, actingPlayerId) => {
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
        },
        passPracticeSquad: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingNewCapLimit) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (G.board.pendingNewCapLimit.playerID && String(targetPlayerId) !== String(G.board.pendingNewCapLimit.playerID)) {
            return INVALID_MOVE;
          }
          const displayId = parseInt(targetPlayerId) + 1;
          addLog(G, `New Cap Limit: Player ${displayId} passed.`);
          advanceNewCapLimitQueue(G);
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

          const giverName = giver.team?.name ? `${giver.team.name} (Player ${parseInt(giverId) + 1})` : `Player ${parseInt(giverId) + 1}`;
          const targetName = target?.team?.name ? `${target.team.name} (Player ${parseInt(targetId) + 1})` : `Player ${parseInt(targetId) + 1}`;
          giver.psi = Math.max(0, giver.psi - 1);
          applyPsiInflated(G, targetId, 1);
          addLog(G, `⚔️ Rivalry: ${giverName} gave 1 PSI to ${targetName}.`);

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
            resolveTradeRumors(G);
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
          const actualTargetId = (typeof replaceIndex === 'string' && !actingPlayerId) ? replaceIndex : (actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]));
          const actualReplaceIdx = (typeof replaceIndex === 'number') ? replaceIndex : -1;
          if (G.board.pendingFreeAgency.playerID && String(actualTargetId) !== String(G.board.pendingFreeAgency.playerID)) {
            return INVALID_MOVE;
          }
          const p = G.players[actualTargetId];
          if (!p) return INVALID_MOVE;
          const card = G.board.pendingFreeAgency.card;
          const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          if ((p.coins || 0) < effMax) return INVALID_MOVE;

          p.coins = Math.max(0, (p.coins || 0) - effMax);
          checkDolphinsEmergencyCoins(G, actualTargetId);
          const displayId = parseInt(actualTargetId) + 1;
          const isColts = getEffectiveTeamId(p) === 'colts';
          if (!isColts && actualReplaceIdx >= 0 && actualReplaceIdx < p.lineup.length) {
            const discarded = p.lineup[actualReplaceIdx];
            p.lineup[actualReplaceIdx] = card;
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(discarded);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
          } else {
            p.lineup.push(card);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
          }

          // Jets Ability: Deflate 4 on max bid!
          if (getEffectiveTeamId(p) === 'jets') {
            applyPsiDeflated(G, actualTargetId, 4);
            addLog(G, `✈️ Jets Ability: Paid max price for Free Agent ${card.name}! Deflated 4 PSI.`);
            triggerAbilityNotification(G, actualTargetId, 'jets', 'Jets: Max Bid Free Agent', `Paid maximum price (${effMax} coins) for ${card.name}! Deflated 4 PSI.`);
          }

          // Instant card effects & triggers
          addAcquiredCardEffects(G, actualTargetId, card, effMax, true);

          advanceFreeAgencyQueue(G);
          if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
            if (events && events.setPhase) {
              events.setPhase('preAuctionPhase');
            } else if (events && events.endPhase) {
              events.endPhase();
            }
          }
        },
        freeAgencyBuy: ({ G, playerID, events }, replaceIndex, actingPlayerId) => {
          if (!G.board.pendingFreeAgency || !G.board.pendingFreeAgency.card) return INVALID_MOVE;
          const actualTargetId = (typeof replaceIndex === 'string' && !actingPlayerId) ? replaceIndex : (actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]));
          const actualReplaceIdx = (typeof replaceIndex === 'number') ? replaceIndex : -1;
          const p = G.players[actualTargetId];
          if (!p) return INVALID_MOVE;
          const card = G.board.pendingFreeAgency.card;
          const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
          if ((p.coins || 0) < effMax) return INVALID_MOVE;

          p.coins = Math.max(0, (p.coins || 0) - effMax);
          checkDolphinsEmergencyCoins(G, actualTargetId);
          const displayId = parseInt(actualTargetId) + 1;
          const isColts = getEffectiveTeamId(p) === 'colts';
          if (!isColts && actualReplaceIdx >= 0 && actualReplaceIdx < p.lineup.length) {
            const discarded = p.lineup[actualReplaceIdx];
            p.lineup[actualReplaceIdx] = card;
            if (!G.decks.discard) G.decks.discard = [];
            G.decks.discard.push(discarded);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins, replacing ${discarded.name}!`);
          } else {
            p.lineup.push(card);
            addLog(G, `Free Agency: Player ${displayId} signed ${card.name} for ${effMax} coins!`);
          }

          if (getEffectiveTeamId(p) === 'jets') {
            applyPsiDeflated(G, actualTargetId, 4);
            addLog(G, `✈️ Jets Ability: Paid max price for Free Agent ${card.name}! Deflated 4 PSI.`);
            triggerAbilityNotification(G, actualTargetId, 'jets', 'Jets: Max Bid Free Agent', `Paid maximum price (${effMax} coins) for ${card.name}! Deflated 4 PSI.`);
          }

          addAcquiredCardEffects(G, actualTargetId, card, effMax, true);

          advanceFreeAgencyQueue(G);
          if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
            if (events && events.setPhase) {
              events.setPhase('preAuctionPhase');
            } else if (events && events.endPhase) {
              events.endPhase();
            }
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
          if (!G.board.pendingFreeAgency && !G.board.pendingNewCapLimit && !G.board.pendingTradeRumors && !G.board.bonusAuction) {
            if (events && events.setPhase) {
              events.setPhase('preAuctionPhase');
            } else if (events && events.endPhase) {
              events.endPhase();
            }
          }
        },
        setQbChoice: ({ G, playerID }, cardUniqueId, choice) => {
          if (!G.board.qbChoices) G.board.qbChoices = {};
          G.board.qbChoices[cardUniqueId] = choice;
          const displayId = parseInt(playerID) + 1;
          addLog(G, `Refs Check: Player ${displayId} selected ${choice.toUpperCase()} for Quarterback.`);
        },
        dismissTradeRumorsSummary: ({ G }) => {
          G.board.tradeRumorsSummary = null;
          G.board.eventConfirmed = true;
        },
        dismissLegendNotification: ({ G }) => {
          G.board.legendNotification = null;
        },
        dismissEventNotification: ({ G }) => {
          G.board.eventNotification = null;
        }
      },
      endIf: ({ G }) => G.board.eventConfirmed === true && !G.board.pendingRivalry && !G.board.pendingTradeRumors && !G.board.tradeRumorsSummary && !G.board.bonusAuction && !G.board.pendingFreeAgency && !G.board.pendingNewCapLimit,
      next: 'preAuctionPhase'
    },

    preAuctionPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G, ctx, events }) => {
        G.board.preAuctionComplete = false;

        // Browns Ability: At start of Round 5, gain +30 coins (safety check)
        Object.keys(G.players).forEach(id => {
          const p = G.players[id];
          const effTeam = getEffectiveTeamId(p);
          if (effTeam === 'browns' && G.board.round >= 5 && !p.hasBrownsBonus) {
            p.coins += 30;
            p.hasBrownsBonus = true;
            addLog(G, `Browns Ability: Start of Round 5! Gained +30 coins.`);
          }
        });

        // Draw auction cards for the round
        const regularCards = [];
        const drawCount = G.board.activeEvent?.category === 'double_draft' ? ctx.numPlayers * 2 : ctx.numPlayers;
        for (let i = 0; i < drawCount; i++) {
          if (G.decks.activePlayers.length > 0) {
            regularCards.push({ ...G.decks.activePlayers.pop(), uniqueId: `auc_${G.board.round}__${i}` });
          }
        }

        if (G.board.isTradeDemandActive && G.board.tradeDemandCard) {
          G.board.isTradeDemandBidding = true;
          G.board.pendingRegularAuctionPlayers = regularCards;
          G.board.auctionPlayers = [G.board.tradeDemandCard];
        } else {
          G.board.isTradeDemandBidding = false;
          G.board.pendingRegularAuctionPlayers = null;
          G.board.auctionPlayers = regularCards;
        }

        G.board.commandersMarkedCardIndex = null;
        G.board.commandersMarkedIndices = [];
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

        // Check Raiders Ability (queue multi-teams: real Raiders acts before Buccaneers)
        const raidersTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'raiders');
        raidersTeams.sort((a, b) => (G.players[a].team?.id === 'raiders' ? 0 : 1) - (G.players[b].team?.id === 'raiders' ? 0 : 1));
        G.board.pendingRaidersQueue = raidersTeams.map(id => ({ playerID: id }));

        // Check Cardinals Ability (queue multi-teams: real Cardinals acts before Buccaneers)
        const cardinalsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'cardinals');
        cardinalsTeams.sort((a, b) => (G.players[a].team?.id === 'cardinals' ? 0 : 1) - (G.players[b].team?.id === 'cardinals' ? 0 : 1));
        G.board.pendingCardinalsQueue = cardinalsTeams.map(id => ({ playerID: id }));

        // Check Chiefs Ability (queue multi-teams: real Chiefs acts before Buccaneers)
        const chiefsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'chiefs');
        chiefsTeams.sort((a, b) => (G.players[a].team?.id === 'chiefs' ? 0 : 1) - (G.players[b].team?.id === 'chiefs' ? 0 : 1));
        G.board.pendingChiefsQueue = chiefsTeams.map(id => ({ playerID: id }));

        // Check Commanders Ability (queue multi-teams: real Commanders acts before Buccaneers)
        const commandersTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'commanders');
        commandersTeams.sort((a, b) => (G.players[a].team?.id === 'commanders' ? 0 : 1) - (G.players[b].team?.id === 'commanders' ? 0 : 1));
        G.board.pendingCommandersQueue = commandersTeams.map(id => ({ playerID: id }));

        advanceRaidersQueue(G);
      },
      moves: {
        dismissTradeRumorsSummary: ({ G }) => {
          G.board.tradeRumorsSummary = null;
        },
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        raidersGivePsi: ({ G, playerID }, targetPlayerId) => {
          if (!G.board.pendingRaiders) return INVALID_MOVE;
          const targetId = String(targetPlayerId);
          const raidersId = String(G.board.pendingRaiders.playerID);
          if (targetId === raidersId) return INVALID_MOVE;

          const raidersPlayer = G.players[raidersId];
          raidersPlayer.psi = Math.max(0, raidersPlayer.psi - 1);
          applyPsiInflated(G, targetId, 1);

          const teamTitle = raidersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Raiders Ability)' : 'Raiders';
          triggerAbilityNotification(G, raidersId, 'raiders', 'Raiders Menace', `Gave 1 PSI to Player ${parseInt(targetId) + 1} (${G.players[targetId]?.team?.name || 'Rival'}) to slow down their lead!`);
          addLog(G, `☠️ ${teamTitle} Ability: Player ${parseInt(raidersId) + 1} gave 1 PSI to Player ${parseInt(targetId) + 1}.`);
          advanceRaidersQueue(G);
        },
        raidersPass: ({ G, playerID }) => {
          if (!G.board.pendingRaiders) return INVALID_MOVE;
          const actingId = String(G.board.pendingRaiders.playerID || playerID);
          const displayId = parseInt(actingId) + 1;
          const raidersPlayer = G.players[actingId];
          const teamTitle = raidersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Raiders Ability)' : 'Raiders';
          addLog(G, `☠️ ${teamTitle} Ability: Player ${displayId} chose to pass.`);
          advanceRaidersQueue(G);
        },
        cardinalsSwap: ({ G, playerID }, auctionCardIndex) => {
          if (!G.board.pendingCardinals) return INVALID_MOVE;
          const actingId = String(G.board.pendingCardinals.playerID || playerID);
          if (auctionCardIndex < 0 || auctionCardIndex >= G.board.auctionPlayers.length) return INVALID_MOVE;
          const oldCard = G.board.auctionPlayers[auctionCardIndex];
          if (!oldCard) return INVALID_MOVE;

          const newCard = G.decks.activePlayers.pop();
          G.board.auctionPlayers[auctionCardIndex] = newCard;
          G.decks.activePlayers.push(oldCard);

          const displayId = parseInt(actingId) + 1;
          const actingPlayer = G.players[actingId];
          const teamTitle = actingPlayer?.team?.id === 'buccaneers' ? 'Bucs (Cardinals Ability)' : 'Cardinals';
          triggerAbilityNotification(G, actingId, 'cardinals', 'Cardinals Deck Swap', `Player ${displayId} swapped ${oldCard.name} with ${newCard.name}!`);
          addLog(G, `🦤 ${teamTitle} Ability: Player ${displayId} swapped auction card ${oldCard.name} with ${newCard.name}.`);
          advanceCardinalsQueue(G);
        },
        cardinalsPass: ({ G, playerID }) => {
          if (!G.board.pendingCardinals) return INVALID_MOVE;
          const actingId = String(G.board.pendingCardinals.playerID || playerID);
          const displayId = parseInt(actingId) + 1;
          const actingPlayer = G.players[actingId];
          const teamTitle = actingPlayer?.team?.id === 'buccaneers' ? 'Bucs (Cardinals Ability)' : 'Cardinals';
          addLog(G, `🦤 ${teamTitle} Ability: Player ${displayId} chose to keep the auction row.`);
          advanceCardinalsQueue(G);
        },
        chiefsClaimCard: ({ G, playerID }, auctionCardIndex, actingPlayerId) => {
          if (!G.board.pendingChiefs) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(G.board.pendingChiefs.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const chiefsId = String(targetPlayerId);
          const chiefsPlayer = G.players[chiefsId];
          if (chiefsPlayer.hasUsedChiefsAbility) return INVALID_MOVE;

          const card = G.board.auctionPlayers[auctionCardIndex];
          if (!card || chiefsPlayer.coins < card.minBid) return INVALID_MOVE;

          chiefsPlayer.coins -= card.minBid;
          chiefsPlayer.hasUsedChiefsAbility = true;
          G.board.auctionPlayers[auctionCardIndex] = null;
          G.board.highestBid = 0;
          resolveAuctionWin(G, chiefsId, card);

          const displayId = parseInt(chiefsId) + 1;
          const teamTitle = chiefsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Chiefs Ability)' : 'Chiefs';
          triggerAbilityNotification(G, chiefsId, 'chiefs', 'Chiefs Instant Claim', `Claimed ${card.name} for ${card.minBid} coins without bidding!`);
          addLog(G, `${teamTitle} Ability: Player ${displayId} claimed ${card.name} for ${card.minBid} coins without bidding!`);

          advanceChiefsQueue(G);
        },
        chiefsPass: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingChiefs) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingChiefs.playerID);
          if (String(G.board.pendingChiefs.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const chiefsPlayer = G.players[targetPlayerId];
          const displayId = parseInt(targetPlayerId) + 1;
          const teamTitle = chiefsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Chiefs Ability)' : 'Chiefs';
          addLog(G, `${teamTitle} Ability: Player ${displayId} chose to pass.`);
          advanceChiefsQueue(G);
        },
        commandersMarkCard: ({ G, playerID }, auctionCardIndex, actingPlayerId) => {
          if (!G.board.pendingCommanders) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);
          if (String(G.board.pendingCommanders.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          if (auctionCardIndex < 0 || auctionCardIndex >= G.board.auctionPlayers.length) return INVALID_MOVE;
          const card = G.board.auctionPlayers[auctionCardIndex];
          if (!card) return INVALID_MOVE;

          if (!G.board.commandersMarkedIndices) G.board.commandersMarkedIndices = [];
          if (!G.board.commandersMarkedIndices.includes(auctionCardIndex)) {
            G.board.commandersMarkedIndices.push(auctionCardIndex);
          }
          G.board.commandersMarkedCardIndex = auctionCardIndex;
          if (card) {
            G.board.commandersShieldedCardId = card.id;
          }
          const displayId = parseInt(targetPlayerId) + 1;
          const firstDisplayId = parseInt(G.board.firstPlayer) + 1;
          const commandersPlayer = G.players[targetPlayerId];
          const teamTitle = commandersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Commanders Ability)' : 'Commanders';
          triggerAbilityNotification(G, targetPlayerId, 'commanders', 'Commanders Blockade', `Marked ${card.name}! First player blocked from bidding.`);
          addLog(G, `🎖️ ${teamTitle} Ability: Player ${displayId} marked ${card.name}. First Player (Player ${firstDisplayId}) cannot nominate or bid on this player!`);

          advanceCommandersQueue(G);
        },
        commandersPass: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingCommanders) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingCommanders.playerID);
          if (String(G.board.pendingCommanders.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const commandersPlayer = G.players[targetPlayerId];
          const displayId = parseInt(targetPlayerId) + 1;
          const teamTitle = commandersPlayer?.team?.id === 'buccaneers' ? 'Bucs (Commanders Ability)' : 'Commanders';
          addLog(G, `🎖️ ${teamTitle} Ability: Player ${displayId} chose to pass.`);
          advanceCommandersQueue(G);
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
        dismissTradeRumorsSummary: ({ G }) => {
          G.board.tradeRumorsSummary = null;
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
          if (events && events.endTurn) events.endTurn();
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
          triggerAbilityNotification(G, targetPlayerId, 'bengals', 'Bengals Discard', `Player ${displayId} discarded ${wonCard.name} instead of adding to lineup!`);
          G.pendingReplacement = null;
          if (events && events.endTurn) events.endTurn();
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
          const isCommandersMarked = (cardIndex === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(cardIndex));
          if (String(targetPlayerId) === String(G.board.firstPlayer) && isCommandersMarked && remainingCardsCount > 1) {
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
          if (G.board.activeAuctionCardIndex !== null) return INVALID_MOVE;
          if (p.hasWonAuction) return INVALID_MOVE;

          let phaseKey = 'p1';
          if (G.board.round >= 4 && G.board.round <= 6) phaseKey = 'p2';
          if (G.board.round >= 7) phaseKey = 'p3';

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
          triggerAbilityNotification(G, targetPlayerId, 'falcons', 'Falcons Mulligan', `Player ${displayId} mulliganed remaining cards! Fresh draft prospects revealed.`);
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
          const isCommandersMarked = (G.board.activeAuctionCardIndex === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(G.board.activeAuctionCardIndex));
          if (String(targetPlayerId) === String(G.board.firstPlayer) && isCommandersMarked && remainingCardsCount > 1) {
            return INVALID_MOVE;
          }

          const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === targetPlayerId;
          if (isSoleRemainingBidder && G.players[targetPlayerId].coins === 0 && amount === 0) {
            G.board.highestBid = 0;
            G.board.highestBidder = targetPlayerId;
            addLog(G, `Player ${parseInt(targetPlayerId) + 1} claimed ${card.name} for 0 Coins (Sole Remaining Zero-Coin Claim).`);
            resolveAuctionWin(G, targetPlayerId, card);
            return;
          }

          const effMaxBid = getEffectiveCardMaxBid(card, G.board.activeEvent);
          if (amount < card.minBid || amount > effMaxBid || amount > G.players[targetPlayerId].coins) {
            return INVALID_MOVE;
          }

          // Bears Ability: Opponents must outbid by 2 coins instead of 1
          const activeHighestBidder = G.board.highestBidder;
          const isHighestBidderBears = activeHighestBidder !== null && getEffectiveTeamId(G.players[activeHighestBidder]) === 'bears';
          const minRaise = (isHighestBidderBears && activeHighestBidder !== targetPlayerId) ? 2 : 1;

          if (G.board.highestBidder !== null && amount < G.board.highestBid + minRaise) {
            return INVALID_MOVE;
          }

          if (G.board.highestBidder !== null && G.board.highestBidder !== targetPlayerId) {
            G.players[targetPlayerId].outbidCount = (G.players[targetPlayerId].outbidCount || 0) + 1;
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

          // If max bid is reached OR no other player can possibly outbid (e.g. sole remaining team without a card, or all other contenders passed/can't afford)
          const otherEligibleBidders = Object.keys(G.players).filter(id => 
            String(id) !== String(targetPlayerId) && 
            !G.players[id].hasWonAuction && 
            !(G.board.passedAuctionPlayers || []).includes(id) &&
            G.players[id].coins >= (amount + minRaise)
          );

          if (amount === effMaxBid || otherEligibleBidders.length === 0) {
            resolveAuctionWin(G, targetPlayerId, card);
          }
          if (events && events.endTurn) events.endTurn();
        },
        pass: ({ G, playerID, events }, actingPlayerId) => {
          if (G.board.activeAuctionCardIndex === null) return INVALID_MOVE;
          if (G.board.highestBidder === null) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : Object.keys(G.players)[0]);

          if (!G.board.passedAuctionPlayers) G.board.passedAuctionPlayers = [];
          if (!G.board.passedAuctionPlayers.includes(targetPlayerId)) {
            G.board.passedAuctionPlayers.push(targetPlayerId);
          }

          const displayId = parseInt(targetPlayerId) + 1;
          const cardName = G.board.auctionPlayers?.[G.board.activeAuctionCardIndex]?.name || 'card';
          G.board.lastActionText = `Player ${displayId} passed on ${cardName}.`;
          addLog(G, G.board.lastActionText);

          const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          const remainingBidders = eligibleBidders.filter(id => !G.board.passedAuctionPlayers.includes(id));

          if (remainingBidders.length === 1 && G.board.highestBidder === remainingBidders[0]) {
            resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
          } else if (remainingBidders.length === 0) {
            if (G.board.highestBidder !== null) {
              resolveAuctionWin(G, G.board.highestBidder, G.board.auctionPlayers[G.board.activeAuctionCardIndex]);
            } else {
              const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
              addLog(G, `All players passed on ${card.name}. Card is discarded.`);
              if (!G.decks.discard) G.decks.discard = [];
              G.decks.discard.push(card);
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              G.board.activeAuctionCardIndex = null;
              G.board.passedAuctionPlayers = [];
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              advanceAuctionCard(G);
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
          targetCard.ramsMultiplier = true;
          p.ramsTokenAttached = true;
          const displayId = parseInt(targetPlayerId) + 1;
          triggerAbilityNotification(G, targetPlayerId, 'rams', 'Rams 2x Multiplier', `Attached 2x token to ${targetCard.name}!`);
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
          triggerAbilityNotification(G, targetPlayerId, 'jaguars', 'Jaguars Foresight', `Reordered the Event Deck!`);
          G.board.jaguarsPopupNotification = `🐆 Jaguars Ability Used! Player ${displayId} (${p.team.name}) has secretly reordered the Event Deck!`;
          addLog(G, G.board.jaguarsPopupNotification);
        },
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        proceedToRefresh: ({ G, events }) => {
          G.board.pendingBills = null;
          G.board.pendingBillsQueue = [];
          G.board.pendingEagles = null;
          G.board.pendingEaglesQueue = [];
          G.pendingReplacement = null;
          G.board.postAuctionComplete = true;
          if (events && events.setPhase) {
            events.setPhase('refreshPhase');
          } else if (events && events.endPhase) {
            events.endPhase();
          }
        }
      },
      endIf: ({ G }) => (
        Object.values(G.players).every(p => p.hasWonAuction === true) ||
        (G.board.auctionPlayers && G.board.auctionPlayers.length > 0 && G.board.auctionPlayers.every(c => c === null))
      ) && G.pendingReplacement === null && G.board.cardWonFlyAnimation === null,
      next: 'postAuctionPhase'
    },

    postAuctionPhase: {
      turn: { activePlayers: ActivePlayers.ALL },
      onBegin: ({ G }) => {
        G.board.postAuctionComplete = false;

        // 1. Check Bills Ability (queue multi-teams: real Bills acts before Buccaneers)
        const billsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'bills');
        billsTeams.sort((a, b) => (G.players[a].team?.id === 'bills' ? 0 : 1) - (G.players[b].team?.id === 'bills' ? 0 : 1));
        G.board.pendingBillsQueue = billsTeams.map(id => ({ playerID: id }));

        // 2. Check Eagles Ability (queue multi-teams: real Eagles acts before Buccaneers)
        const eaglesTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'eagles');
        eaglesTeams.sort((a, b) => (G.players[a].team?.id === 'eagles' ? 0 : 1) - (G.players[b].team?.id === 'eagles' ? 0 : 1));
        G.board.pendingEaglesQueue = eaglesTeams.map(id => ({ playerID: id }));

        // 3. Check Rams Ability (CPU Automation, sorted real Rams first, Buccaneers second)
        const ramsTeams = Object.keys(G.players).filter(id => getEffectiveTeamId(G.players[id]) === 'rams');
        ramsTeams.sort((a, b) => (G.players[a].team?.id === 'rams' ? 0 : 1) - (G.players[b].team?.id === 'rams' ? 0 : 1));
        ramsTeams.forEach(ramsId => {
          const ramsPlayer = G.players[ramsId];
          if (ramsPlayer && ramsPlayer.isCpu && !ramsPlayer.ramsTokenAttached) {
            const eligibleCards = (ramsPlayer.lineup || []).filter(c => c && c.phase !== 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_'));
            if (eligibleCards.length > 0) {
              // 1. Look for true superstar: 4+ deflate/round or 5+ coins/round (leaning deflate)
              const superstarDeflate = eligibleCards.find(c => {
                const info = isRamsDoublingSuperstar(c);
                return info.isSuperstar && info.type === 'deflate';
              });
              const superstarCoin = eligibleCards.find(c => {
                const info = isRamsDoublingSuperstar(c);
                return info.isSuperstar && info.type === 'coins';
              });

              // User directive: "lean towards deflate over coins if you had to choose between the two"
              let targetCard = superstarDeflate || superstarCoin;

              // 2. If no superstar, check if HOF card with recurring deflate >= 3
              if (!targetCard) {
                targetCard = eligibleCards.find(c => c.phase === 'hof' && c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && e.type === 'deflate' && e.amount >= 3));
              }

              // 3. Endgame fallback: Only if Round >= 8 or Rams/rival PSI <= 12, don't let token expire unused
              if (!targetCard) {
                const minOppPsi = Math.min(...Object.keys(G.players).map(id => G.players[id].psi));
                if (G.board.round >= 8 || ramsPlayer.psi <= 12 || minOppPsi <= 12) {
                  eligibleCards.sort((a, b) => {
                    const getCardTokenValue = (c) => {
                      let val = 0;
                      c.effects?.forEach(e => {
                        if (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') {
                          if (e.type === 'deflate') val += e.amount * 5;
                          if (e.type === 'coins' && e.amount > 0) val += e.amount * 2;
                        }
                      });
                      return val;
                    };
                    return getCardTokenValue(b) - getCardTokenValue(a);
                  });
                  targetCard = eligibleCards[0];
                }
              }

              if (targetCard) {
                targetCard.ramsDoubleToken = true;
                targetCard.ramsMultiplier = true;
                ramsPlayer.ramsTokenAttached = true;
                const displayId = parseInt(ramsId) + 1;
                const teamTitle = ramsPlayer.team?.id === 'buccaneers' ? 'Bucs (Rams Ability)' : 'Rams';
                triggerAbilityNotification(G, ramsId, 'rams', 'Rams 2x Multiplier', `Attached 2x token to ${targetCard.name}!`);
                addLog(G, `🐏 ${teamTitle} Ability: CPU Player ${displayId} attached 2x Token to ${targetCard.name}!`);
              }
            }
          }
        });

        advanceBillsQueue(G);
      },
      moves: {
        dismissJaguarsPopup: ({ G }) => {
          G.board.jaguarsPopupNotification = null;
        },
        billsBuyDiscard: ({ G, playerID }, discardIndex, actingPlayerId) => {
          if (!G.board.pendingBills) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingBills.playerID);
          if (String(G.board.pendingBills.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const billsId = String(targetPlayerId);
          const billsPlayer = G.players[billsId];
          if (billsPlayer.hasUsedBillsAbility) return INVALID_MOVE;

          const card = G.decks.discard[discardIndex];
          if (!card || !isGenuinePlayerCard(card) || billsPlayer.coins < card.minBid) return INVALID_MOVE;

          G.decks.discard.splice(discardIndex, 1);
          billsPlayer.coins -= card.minBid;
          billsPlayer.hasUsedBillsAbility = true;

          // Apply instant card effects (coins, deflate, inflate)
          if (card.effects) {
            const billsEffTeam = getEffectiveTeamId(billsPlayer);
            card.effects.forEach(eff => {
              if (!eff.perRound) {
                let effAmount = eff.amount;
                if (billsEffTeam === 'bengals') effAmount += 2;
                if (eff.type === 'coins' && billsEffTeam !== 'browns') applyCoinsGained(G, billsId, effAmount);
                if (eff.type === 'deflate') applyPsiDeflated(G, billsId, effAmount);
                if (eff.type === 'inflate') applyPsiInflated(G, billsId, effAmount);
              }
            });
          }

          const displayId = parseInt(billsId) + 1;
          const teamTitle = billsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Bills Ability)' : 'Bills';
          triggerAbilityNotification(G, billsId, 'bills', 'Bills Discard Claim', `Claimed ${card.name} from discard for ${card.minBid} coins!`);
          addLog(G, `🦬 ${teamTitle} Ability: Player ${displayId} bought ${card.name} from discard pile for ${card.minBid} coins.`);

          const billsEffTeam = getEffectiveTeamId(billsPlayer);
          const maxLineup = (billsEffTeam === 'seahawks' ? 4 : 3) + (billsPlayer.extraLineupSlots || 0);
          if (billsEffTeam === 'colts' || billsPlayer.lineup.length < maxLineup) {
            billsPlayer.lineup.push(card);
            advanceBillsQueue(G);
          } else {
            G.pendingReplacement = { playerID: billsId, wonCard: card };
          }
        },
        billsPass: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingBills) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingBills.playerID);
          if (String(G.board.pendingBills.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const displayId = parseInt(targetPlayerId) + 1;
          const billsPlayer = G.players[targetPlayerId];
          const teamTitle = billsPlayer?.team?.id === 'buccaneers' ? 'Bucs (Bills Ability)' : 'Bills';
          addLog(G, `🦬 ${teamTitle} Ability: Player ${displayId} passed on discard claim.`);
          advanceBillsQueue(G);
        },
        eaglesUseAbility: ({ G, playerID }, times, actingPlayerId) => {
          if (!G.board.pendingEagles) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingEagles.playerID);
          if (String(G.board.pendingEagles.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const eaglesId = String(targetPlayerId);
          const eaglesPlayer = G.players[eaglesId];
          const count = times === 2 ? 2 : 1;
          const cost = count * 3;
          if (eaglesPlayer.coins < cost) return INVALID_MOVE;

          eaglesPlayer.coins -= cost;
          eaglesPlayer.eaglesUsedRound = G.board.round;
          eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + count;

          Object.keys(G.players).forEach(id => {
            if (id !== eaglesId && getEffectiveTeamId(G.players[id]) !== 'saints') {
              applyPsiInflated(G, id, count * 3);
            }
          });

          const displayId = parseInt(eaglesId) + 1;
          const teamTitle = eaglesPlayer?.team?.id === 'buccaneers' ? 'Bucs (Eagles Ability)' : 'Eagles';
          triggerAbilityNotification(G, eaglesId, 'eagles', 'Eagles Tush Push', `Paid ${cost} coins to inflate all opponents by +${count * 3} PSI!`);
          addLog(G, `🦅 ${teamTitle} Ability: Player ${displayId} paid ${cost} coins to inflate all opponents by +${count * 3} PSI! (${count}x this round).`);

          advanceEaglesQueue(G);
        },
        eaglesInflate: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingEagles) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingEagles.playerID);
          if (String(G.board.pendingEagles.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const eaglesId = String(targetPlayerId);
          const eaglesPlayer = G.players[eaglesId];
          if (eaglesPlayer.coins < 3) return INVALID_MOVE;

          eaglesPlayer.coins -= 3;
          eaglesPlayer.eaglesUsedRound = G.board.round;
          eaglesPlayer.eaglesUsedCount = (eaglesPlayer.eaglesUsedRound === G.board.round ? (eaglesPlayer.eaglesUsedCount || 0) : 0) + 1;

          Object.keys(G.players).forEach(id => {
            if (id !== eaglesId && getEffectiveTeamId(G.players[id]) !== 'saints') {
              applyPsiInflated(G, id, 3);
            }
          });

          const displayId = parseInt(eaglesId) + 1;
          const teamTitle = eaglesPlayer?.team?.id === 'buccaneers' ? 'Bucs (Eagles Ability)' : 'Eagles';
          addLog(G, `🦅 ${teamTitle} Ability: Player ${displayId} paid 3 coins to inflate all opponents by +3 PSI!`);

          advanceEaglesQueue(G);
        },
        eaglesPass: ({ G, playerID }, actingPlayerId) => {
          if (!G.board.pendingEagles) return INVALID_MOVE;
          const targetPlayerId = actingPlayerId || (G.players[playerID] ? playerID : G.board.pendingEagles.playerID);
          if (String(G.board.pendingEagles.playerID) !== String(targetPlayerId)) return INVALID_MOVE;
          const displayId = parseInt(targetPlayerId) + 1;
          const eaglesPlayer = G.players[targetPlayerId];
          const teamTitle = eaglesPlayer?.team?.id === 'buccaneers' ? 'Bucs (Eagles Ability)' : 'Eagles';
          addLog(G, `🦅 ${teamTitle} Ability: Player ${displayId} passed on Tush Push.`);
          advanceEaglesQueue(G);
        },
        dismissCardWonFlyAnimation: ({ G }) => {
          G.board.cardWonFlyAnimation = null;
        },
        replaceLineupCard: ({ G, playerID }, discardIndex, actingPlayerId) => {
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

          advanceBillsQueue(G);
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
          triggerAbilityNotification(G, targetPlayerId, 'bengals', 'Bengals Discard', `Player ${displayId} discarded ${wonCard.name} instead of adding to lineup!`);
          G.pendingReplacement = null;

          if (!G.board.pendingBills && !G.board.pendingEagles) {
            G.board.postAuctionComplete = true;
          }
        },
        proceedToRefresh: ({ G }) => {
          G.board.pendingBills = null;
          G.board.pendingBillsQueue = [];
          G.board.pendingEagles = null;
          G.board.pendingEaglesQueue = [];
          G.pendingReplacement = null;
          G.board.postAuctionComplete = true;
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
          G.board.eventFlipRevealed = false;
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

export const createDeflategateGame = (customOptions = {}) => ({
  ...DeflategateGame,
  setup: (context, setupData) => DeflategateGame.setup(context, { ...setupData, ...customOptions })
});
