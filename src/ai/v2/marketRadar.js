// src/ai/v2/marketRadar.js
// Layer 2: Market Radar & Opponent Threat Modeling
// Evaluates cards through the eyes of rivals to identify market clearing prices,
// leader clinch threats, high-synergy targets, and safe price-bumping windows.

import { calculateMarginalRosterDelta, evaluateCardProduction } from './rosterValuation.js';
import { getEffectiveCardMaxBid, getEffectiveTeamId } from '../../Game.js';

/**
 * Checks if a card contains toxic drawbacks (inflation or recurring negative coins)
 * for a specific team.
 */
export const isCardToxicToTeam = (card, teamId, round = 1) => {
  if (!card) return false;
  if (teamId === 'saints' || teamId === 'bengals') return false;
  if (teamId === 'broncos') {
    // In R1-2, Broncos pump-and-dumps Henry and Zeke with 0 cumulative drawbacks, and in R7+ games end before recurring penalties accumulate
    if ((round <= 2 || round >= 7) && (card.id === 'hunter_henry' || card.id === 'ezekiel_elliott')) return false;
  }
  if (teamId === 'patriots' && round <= 2 && card.id === 'hunter_henry') return false;
  const hasInflation = card.effects?.some(e => e.type === 'inflate' && (e.amount >= 2 || e.perRound));
  const hasNegativeCoins = card.effects?.some(e => e.type === 'coins' && e.amount < 0 && (e.perRound || e.trigger === 'refresh'));
  return Boolean(hasInflation || hasNegativeCoins);
};

/**
 * Builds a comprehensive market map for every card on the board across all active bidders.
 */
export const buildMarketRadar = (G, actingPlayerId) => {
  const auctionCards = G?.board?.auctionPlayers || [];
  const eligiblePlayerIds = Object.keys(G?.players || {}).filter(id => !G.players[id].hasWonAuction);
  const activeEvent = G?.board?.activeEvent;
  const passedBidders = G?.board?.passedAuctionPlayers || [];

  const cardMarketData = {};

  auctionCards.forEach((card, cardIndex) => {
    if (!card) return;

    const effMax = getEffectiveCardMaxBid(card, activeEvent);
    const bidderProfiles = [];
    let leaderThreatPlayerId = null;
    let highSynergyRival = null;
    let highestSynergyScore = 0;

    const isToxicToGeneral = isCardToxicToTeam(card, 'neutral');

    eligiblePlayerIds.forEach(pId => {
      const player = G.players[pId];
      if (!player) return;

      const delta = calculateMarginalRosterDelta(G, player, card);
      const prod = evaluateCardProduction(card, player, G);
      const effCoins = player.coins || 0;
      const teamId = getEffectiveTeamId(player);
      const hasPassed = passedBidders.includes(pId);

      // Base willingness to pay (approx 60-75% of marginal delta in coins)
      const rawWilling = Math.round(delta * 0.65);
      const maxWilling = Math.min(effCoins, Math.min(effMax, Math.max(card.minBid, rawWilling)));

      // Clinch threat detection:
      // If opponent could win the game immediately (or drop to <= 3 PSI) by winning this card
      const potentialPsiAfter = player.psi - prod.instDeflate;
      const isClinchThreat = potentialPsiAfter <= 0 || (player.psi <= 8 && prod.instDeflate >= 4);

      if (isClinchThreat && pId !== actingPlayerId && effCoins >= card.minBid) {
        leaderThreatPlayerId = pId;
      }

      // High-Synergy Target Detection:
      // Identify when a rival team has a signature synergy with this card:
      // 1. Saints on toxic drawback cards (negates inflation / negative coins)
      // 2. Texans on QBs (+2 coins / +2 deflate per QB)
      // 3. Packers on Phase 1 cards (+1 coin / +4 deflate synergy)
      // 4. Chiefs on Mahomes, Kelce, or Gonzalez
      // 5. Jets on small max gems (effMax <= 4)
      // 6. Ravens on missing 3rd position
      // 7. Lions on first claim when unclaimed
      // 8. Runaway leader or high delta (> 14)
      let synergyScore = 0;
      if (teamId === 'saints' && isToxicToGeneral) {
        synergyScore = 25; // Massive signature synergy
      } else if (teamId === 'texans' && card.position === 'QB' && card.id !== 'deshaun_watson') {
        synergyScore = 20;
      } else if (teamId === 'chiefs' && (card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'tony_gonzalez')) {
        synergyScore = 22;
      } else if (teamId === 'packers' && card.phase === 1) {
        synergyScore = 15;
      } else if (teamId === 'jets' && effMax <= 5 && effCoins >= effMax && !isToxicToGeneral) {
        synergyScore = 18;
      } else if (teamId === 'ravens') {
        const activePositions = new Set(
          (player.lineup || [])
            .filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') && c.id !== 'practice_squad')
            .map(c => c.position)
            .filter(Boolean)
        );
        if (activePositions.size === 2 && !activePositions.has(card.position)) {
          synergyScore = 18;
        }
      } else if (teamId === 'lions' && Object.values(G.players).every(p => (p.cardsWonThisRound || 0) === 0)) {
        synergyScore = 16;
      } else if (delta >= 14) {
        synergyScore = delta;
      }

      if (pId !== actingPlayerId && !hasPassed && synergyScore > highestSynergyScore) {
        highestSynergyScore = synergyScore;
        highSynergyRival = {
          playerId: pId,
          teamId,
          coins: effCoins,
          delta,
          maxWilling,
          synergyScore,
          isToxicToThem: isCardToxicToTeam(card, teamId)
        };
      }

      bidderProfiles.push({
        playerId: pId,
        teamId,
        isMe: pId === actingPlayerId,
        delta,
        maxWilling,
        isClinchThreat,
        coins: effCoins,
        hasPassed
      });
    });

    // Sort rivals by willingness to pay
    const rivalProfiles = bidderProfiles
      .filter(b => !b.isMe && !b.hasPassed)
      .sort((a, b) => b.maxWilling - a.maxWilling);

    const highestRivalWilling = rivalProfiles.length > 0 ? rivalProfiles[0].maxWilling : 0;
    const secondRivalWilling = rivalProfiles.length > 1 ? rivalProfiles[1].maxWilling : 0;

    cardMarketData[cardIndex] = {
      card,
      cardIndex,
      effMax,
      bidderProfiles,
      rivalProfiles,
      highestRivalWilling,
      secondRivalWilling,
      leaderThreatPlayerId,
      highSynergyRival,
      isToxicToGeneral
    };
  });

  return cardMarketData;
};

