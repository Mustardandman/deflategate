// src/ai/v2/auctionTactics.js
// Layer 3: Opportunity Cost & Tactical Execution Engine
// Decides nominations and auction bids by balancing intrinsic roster delta,
// board-wide opportunity cost, opponent synergy awareness, and soft tax-bidding.

import { calculateMarginalRosterDelta, evaluateCardProduction } from './rosterValuation.js';
import { buildMarketRadar, isCardToxicToTeam } from './marketRadar.js';
import { getEffectiveTeamId, getEffectiveCardMaxBid } from '../../Game.js';

/**
 * Chooses the best card to nominate for CPU player in V2.
 */
export const chooseCpuNominationCardV2 = (G, playerId) => {
  const player = G.players[playerId];
  if (!player) return -1;

  const effectiveTeamId = getEffectiveTeamId(player);
  const auctionCards = G.board.auctionPlayers || [];
  const affordableIndices = [];

  auctionCards.forEach((card, index) => {
    if (card && player.coins >= card.minBid) {
      affordableIndices.push(index);
    }
  });

  if (affordableIndices.length === 0) return -1;

  const round = G.board.round || 1;
  const psi = player.psi || 40;
  const isLateGame = round >= 7 || psi <= 18;

  // 1. Falcons Phase Mulligan Check:
  // If Falcons is nominating and has not won an auction this round:
  if (effectiveTeamId === 'falcons' && !player.hasWonAuction) {
    let phaseKey = 'p1';
    if (round >= 4 && round <= 6) phaseKey = 'p2';
    if (round >= 7) phaseKey = 'p3';

    if (!player.falconsPhaseUses?.[phaseKey]) {
      const remainingBoardCards = (G.board.auctionPlayers || []).filter(c => c !== null);
      const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
      const remainingBiddersCount = eligibleBidders.length;
      const isLateAuction = remainingBiddersCount <= 2;
      const isEndOfPhaseRound = (round === 3 || round === 6 || round >= 9);

      if (remainingBoardCards.length > 0 && G.decks?.activePlayers?.length > 0) {
        // Evaluate quality of remaining cards
        const bestDelta = Math.max(...remainingBoardCards.map(c => calculateMarginalRosterDelta(G, player, c)));
        const shouldMulligan = (isLateAuction && bestDelta < 7.0) ||
                               (isEndOfPhaseRound && bestDelta < 8.0) ||
                               (bestDelta < 5.0);

        if (shouldMulligan) {
          if (!G.decks.discard) G.decks.discard = [];
          G.decks.discard.push(...remainingBoardCards);
          G.board.auctionPlayers = G.board.auctionPlayers.map(c => {
            if (c === null) return null;
            return (G.decks.activePlayers && G.decks.activePlayers.length > 0) ? G.decks.activePlayers.pop() : null;
          });
          if (!player.falconsPhaseUses) player.falconsPhaseUses = {};
          player.falconsPhaseUses[phaseKey] = true;
          // Re-evaluate nomination with fresh cards!
          return chooseCpuNominationCardV2(G, playerId);
        }
      }
    }
  }

  if (affordableIndices.length === 1) return affordableIndices[0];

  const radar = buildMarketRadar(G, playerId);

  // 2. Late-Game / Closer Mode: Check for immediate championship winning card
  let effectivePsi = psi;
  if (effectiveTeamId === 'jaguars') {
    const hasColdAirAhead = (G.decks?.events || []).some(e => e?.id === 'cold_air' || e?.category === 'cold_air');
    if (hasColdAirAhead) effectivePsi = Math.max(1, psi - 7);
  }
  const isCloserTriggered = isLateGame || effectivePsi <= 14;

  if (isCloserTriggered) {
    const winningCloser = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return prod.instDeflate >= psi;
    });
    if (winningCloser !== undefined) return winningCloser;

    // Prioritize high deflation engines (HOF, CMC, Derrick Henry, Aaron Jones)
    const premierDeflation = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return card.phase === 'hof' || prod.recDeflate >= 3 || prod.instDeflate >= 5 || card.id === 'derrick_henry' || card.id === 'christian_mccaffrey';
    });
    if (premierDeflation !== undefined) return premierDeflation;
  }

  // 3. Franchise-Specific Signature Nomination Priorities:
  // Jets Small Max Gem Priority (effMax <= 6):
  if (effectiveTeamId === 'jets') {
    const smallMaxGemIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      return effMax <= 6 && player.coins >= effMax && !isCardToxicToTeam(card, 'jets', round);
    });
    if (smallMaxGemIdx !== undefined) return smallMaxGemIdx;
  }

  // Broncos Round 1-3 Anchor Priority:
  if (effectiveTeamId === 'broncos' && round <= 3) {
    // 1. True Permanent Recurring Anchors (Bowers, Kittle, Cousins, recDeflate >= 2, HOF)
    const trueAnchorIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return !isCardToxicToTeam(card, 'neutral') && (prod.recDeflate >= 2 || card.phase === 'hof' || card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'kirk_cousins');
    });
    if (trueAnchorIdx !== undefined) return trueAnchorIdx;

    // 2. High-Yield Instant / Secondary fallback
    const secondaryIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return prod.instDeflate >= 5 || card.id === 'hunter_henry' || card.id === 'ezekiel_elliott';
    });
    if (secondaryIdx !== undefined) return secondaryIdx;
  }

  // Commanders Marked Card Priority:
  if (effectiveTeamId === 'commanders') {
    const markedIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const isMarked = (idx === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(idx));
      return isMarked && !isCardToxicToTeam(card, 'commanders', round);
    });
    if (markedIdx !== undefined) return markedIdx;
  }

  // Lions Strategic Nomination (Playtest 61):
  // In Rounds 1-3, if Detroit has not won a card yet:
  // If Detroit is NOT strictly richest, bypass superstar priority; target Low Max Gems (effMax <= 5) or winnable mid-tier
  if (effectiveTeamId === 'lions' && round <= 3 && (player.cardsWonThisRound || 0) === 0) {
    const richestRivalCoins = Math.max(0, ...Object.values(G.players).filter(p => p !== player).map(p => p.coins || 0));
    const isRichest = (player.coins || 0) > richestRivalCoins;
    
    // 1. Low Max Gems (effMax <= 5 and coins >= effMax)
    const lowMaxIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);
      return effMax <= 5 && player.coins >= effMax && !isCardToxicToTeam(card, 'lions', round);
    });
    if (lowMaxIdx !== undefined) return lowMaxIdx;

    // 2. Winnable Mid-Tier target
    if (!isRichest) {
      const winnableMidIdx = affordableIndices.find(idx => {
        const card = auctionCards[idx];
        const delta = calculateMarginalRosterDelta(G, player, card);
        const cardMarket = radar[idx];
        const isNotSuperstar = card.phase !== 'hof' && card.id !== 'patrick_mahomes' && card.id !== 'travis_kelce' && card.id !== 'brock_bowers' && card.id !== 'george_kittle';
        return isNotSuperstar && delta >= 5.0 && (player.coins >= (cardMarket?.highestRivalWilling || card.minBid)) && !isCardToxicToTeam(card, 'lions', round);
      });
      if (winnableMidIdx !== undefined) return winnableMidIdx;
    }
  }

  // Packers Quality Phase 1 Nomination (Playtest 62):
  if (effectiveTeamId === 'packers') {
    const p1Indices = affordableIndices.filter(idx => auctionCards[idx]?.phase === 1);
    if (p1Indices.length > 0) {
      let bestP1Idx = p1Indices[0];
      let bestP1Score = -Infinity;
      p1Indices.forEach(idx => {
        const delta = calculateMarginalRosterDelta(G, player, auctionCards[idx]);
        if (delta > bestP1Score) {
          bestP1Score = delta;
          bestP1Idx = idx;
        }
      });
      if (bestP1Score > 5.0) return bestP1Idx;
    }
  }

  // Chargers Crown Jewel or Bait Nomination (Playtest 56):
  if (effectiveTeamId === 'chargers') {
    const crownJewelIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return card.id === 'brock_bowers' || card.id === 'travis_kelce' || card.id === 'patrick_mahomes' || card.phase === 'hof' || prod.recDeflate >= 3 || prod.instDeflate >= 5;
    });
    if (crownJewelIdx !== undefined) return crownJewelIdx;

    const baitIdx = affordableIndices.find(idx => {
      const cardMarket = radar[idx];
      return cardMarket?.highSynergyRival && (cardMarket.highestRivalWilling || 0) >= auctionCards[idx].minBid + 1;
    });
    if (baitIdx !== undefined) return baitIdx;
  }

  // Ravens 3-Position Diversity Priority:
  // Prioritize nominating a card that matches the missing 3rd position
  if (effectiveTeamId === 'ravens') {
    const activePositions = new Set(
      (player.lineup || [])
        .filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') && c.id !== 'practice_squad')
        .map(c => c.position)
        .filter(Boolean)
    );
    if (activePositions.size === 2) {
      const missingPosIdx = affordableIndices.find(idx => {
        const card = auctionCards[idx];
        return card && !activePositions.has(card.position) && !isCardToxicToTeam(card, 'ravens', round);
      });
      if (missingPosIdx !== undefined) return missingPosIdx;
    }
  }

  // Chiefs Patrick Mahomes / Travis Kelce Covenant Priority:
  if (effectiveTeamId === 'chiefs') {
    const covenantIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      return card && (card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'tony_gonzalez');
    });
    if (covenantIdx !== undefined) return covenantIdx;
  }

  // Vikings, Falcons & Lions High-PSI Deflation Priority:
  // When burdened by 44-48 starting PSI, strictly prioritize securing deflation engines over pure coins
  if ((effectiveTeamId === 'vikings' || effectiveTeamId === 'falcons' || effectiveTeamId === 'lions') && psi >= 27) {
    const deflationCardIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return (prod.instDeflate > 0 || prod.recDeflate > 0) && !isCardToxicToTeam(card, effectiveTeamId, round);
    });
    if (deflationCardIdx !== undefined) return deflationCardIdx;
  }

  // Browns Deflation Purity: Never nominate pure coin cards
  if (effectiveTeamId === 'browns') {
    const pureDeflateIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      const prod = evaluateCardProduction(card, player, G);
      return (prod.instDeflate > 0 || prod.recDeflate > 0);
    });
    if (pureDeflateIdx !== undefined) return pureDeflateIdx;
  }

  // Cowboys Round 1 Centerpiece Conviction:
  if (effectiveTeamId === 'cowboys' && round === 1) {
    const centerpieceIdx = affordableIndices.find(idx => {
      const card = auctionCards[idx];
      return card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'drake_london';
    });
    if (centerpieceIdx !== undefined) return centerpieceIdx;
  }

  // 4. Net Opportunity Valuation: Find card with the highest expected net surplus
  const nonToxicAffordable = affordableIndices.filter(idx => !isCardToxicToTeam(auctionCards[idx], effectiveTeamId, round));
  const candidateIndices = nonToxicAffordable.length > 0 ? nonToxicAffordable : affordableIndices;

  let bestIdx = candidateIndices[0];
  let bestScore = -Infinity;

  candidateIndices.forEach(idx => {
    const card = auctionCards[idx];
    const delta = calculateMarginalRosterDelta(G, player, card);
    const cardMarket = radar[idx];
    const rivalMax = cardMarket?.highestRivalWilling || card.minBid;

    // Expected purchase cost is near the second highest bidder or minBid
    const expectedCost = Math.min(player.coins, Math.max(card.minBid, rivalMax));
    const netSurplus = delta - (expectedCost * 0.7);

    if (netSurplus > bestScore) {
      bestScore = netSurplus;
      bestIdx = idx;
    }
  });

  return bestIdx;
};

/**
 * Evaluates whether to bid, pass, jump-bid, or price-bump on the active auction card in V2.
 */
export const evaluateCpuAuctionBidV2 = (G, playerId) => {
  const player = G.players[playerId];
  const cardIndex = G.board.activeAuctionCardIndex;
  const card = G.board.auctionPlayers[cardIndex];

  if (!player || !card) return { shouldBid: false, bidAmount: 0 };

  const effectiveTeamId = getEffectiveTeamId(player);
  const highestBidderPlayer = G.board.highestBidder !== null ? G.players[G.board.highestBidder] : null;
  const highestTeamId = getEffectiveTeamId(highestBidderPlayer);
  const bidStep = (highestTeamId === 'bears') ? 2 : 1;
  const minNeededBid = G.board.highestBidder !== null ? G.board.highestBid + bidStep : card.minBid;
  const nextBid = Math.max(card.minBid, minNeededBid);
  const effMax = getEffectiveCardMaxBid(card, G.board.activeEvent);

  // If cannot afford minimum required bid, pass immediately
  if ((player.coins || 0) < nextBid) {
    return { shouldBid: false, bidAmount: 0 };
  }

  const round = G.board.round || 1;
  const psi = player.psi || 40;
  const isLateGame = round >= 7 || psi <= 18;
  const cardProd = evaluateCardProduction(card, player, G);
  const cardDelta = calculateMarginalRosterDelta(G, player, card);
  const isToxicToMe = isCardToxicToTeam(card, effectiveTeamId);

  // Identify all OTHER available cards on the board
  const otherCards = (G.board.auctionPlayers || []).filter((c, idx) => c !== null && idx !== cardIndex);
  const remainingBoardCardsCount = (G.board.auctionPlayers || []).filter(c => c !== null).length;
  const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
  const eligibleBiddersCount = eligibleBidders.length;

  const radar = buildMarketRadar(G, playerId);
  const cardMarket = radar[cardIndex];

  // 1. CHAMPIONSHIP CLINCH: If winning this card drops our PSI <= 0, BID TO WIN!
  if (psi - cardProd.instDeflate <= 0) {
    const winBid = Math.min(player.coins, effMax);
    return { shouldBid: true, bidAmount: Math.max(nextBid, winBid), isChampionshipBid: true };
  }

  // 2. LEADER CLINCH THREAT (Hate Bidding): If an opponent would win the championship with this card
  if (cardMarket?.leaderThreatPlayerId && G.board.highestBidder === cardMarket.leaderThreatPlayerId) {
    // If the card is toxic to ME, NEVER hate-bid high (cap at 3 to prevent self-destruction)
    const maxDefense = isToxicToMe ? 3 : Math.min(effMax, Math.round(cardDelta * 0.9) + 2);
    const threatDefenseCap = Math.min(player.coins, maxDefense);
    if (threatDefenseCap >= nextBid) {
      return { shouldBid: true, bidAmount: nextBid, isHateBid: true };
    }
  }

  // 2b. FALCONS DISCIPLINE (Playtest 64):
  // Falcons starts at 48 PSI; strictly reject toxic cards, but compete for genuine engines normally.
  if (effectiveTeamId === 'falcons') {
    if (isToxicToMe) {
      return { shouldBid: false, bidAmount: 0 };
    }
  }

  // 3. JETS MAX BUYOUT RULE (Playtest 41):
  // Jets gets -4 PSI every time they pay Maximum for a player!
  if (effectiveTeamId === 'jets' && cardProd.totalScore > 0 && !isToxicToMe && player.coins >= effMax) {
    // Small Max Gem (effMax <= 5, e.g. Odunze, Nabers, Hubbard, Legette, Achane, Samuel, Hall):
    if (effMax <= 5) {
      return { shouldBid: true, bidAmount: effMax, isMaxBid: true };
    }
    // High-value gems (effMax <= 6):
    if (effMax <= 6 && cardDelta >= 4.0) {
      return { shouldBid: true, bidAmount: effMax, isMaxBid: true };
    }
    // Max Bid Gap Rule: If card delta is good (>= 4.0) and effMax <= 9, and within 3 coins of willingness:
    const baseWilling = Math.round(cardDelta * 0.70);
    if (cardDelta >= 4.0 && effMax <= 9 && effMax <= baseWilling + 3) {
      return { shouldBid: true, bidAmount: effMax, isMaxBid: true };
    }
  }

  // 3b. DOLPHINS EMERGENCY BAILOUT ECONOMY (Playtest 37 & 38):
  // Avoid leaving 1, 2, or 3 coins in wallet! Spend down to 0 coins to trigger +3 emergency bailout!
  if (effectiveTeamId === 'dolphins' && !isToxicToMe) {
    const coins = player.coins || 0;
    // When coins <= 3: zero-seeking mandate! Jump straight to all-in so winning triggers +3 bailout!
    if (coins <= 3 && cardDelta >= 3.5) {
      return { shouldBid: true, bidAmount: coins, isJumpBid: true };
    }
    // When coins <= 7: avoid leaving 1, 2, or 3 coins (dead zone)
    if (coins <= 7 && cardDelta >= 5.0) {
      const leftover = coins - nextBid;
      if (leftover >= 1 && leftover <= 3) {
        return { shouldBid: true, bidAmount: coins, isJumpBid: true };
      }
    }
    // Premier centerpieces when coins <= 12: fearless all-in
    if (coins <= 12 && cardDelta >= 9.0 && nextBid >= 4) {
      return { shouldBid: true, bidAmount: coins, isJumpBid: true };
    }
  }

  // 3c. BILLS DISCARD RESERVATION:
  // If a viable target exists in discard, reserve minBid coins so Bills isn't locked out post-auction!
  if (effectiveTeamId === 'bills' && !player.hasUsedBillsAbility && (G.decks?.discard?.length || 0) > 0) {
    const hasValuableDiscard = G.decks.discard.some(c => c && (c.phase === 'hof' || c.effects?.some(e => e.type === 'deflate' && (e.amount >= 3 || e.perRound))));
    if (hasValuableDiscard) {
      const discardReserve = 2;
      if ((player.coins - nextBid) < discardReserve && cardDelta < 10.0) {
        return { shouldBid: false, bidAmount: 0 };
      }
    }
  }

  // 4. LATE-GAME CLOSER DISCIPLINE:
  if (isLateGame && (player.cardsWonThisRound || 0) === 0 && cardProd.instDeflate === 0 && cardProd.recDeflate === 0) {
    const hasMajorDeflationWaiting = otherCards.some(c => {
      if (!c || player.coins < c.minBid) return false;
      const otherProd = evaluateCardProduction(c, player, G);
      return (otherProd.instDeflate >= 4 || otherProd.recDeflate >= 2 || c.phase === 'hof');
    });
    if (hasMajorDeflationWaiting) {
      return { shouldBid: false, bidAmount: 0 };
    }
  }

  // 5. SUPERIOR CENTERPIECE PROTECTION (Opportunity Cost):
  const superiorCenterpieceWaiting = otherCards.find(c => {
    if (!c || player.coins < c.minBid) return false;
    const otherDelta = calculateMarginalRosterDelta(G, player, c);
    return (otherDelta >= cardDelta + 6.0 || c.phase === 'hof');
  });

  if (superiorCenterpieceWaiting) {
    const centerpieceNeededReserve = Math.max(superiorCenterpieceWaiting.minBid, Math.min(player.coins, 10));
    const maxSpendableOnSecondary = Math.max(card.minBid, player.coins - centerpieceNeededReserve);
    if (nextBid > maxSpendableOnSecondary) {
      return { shouldBid: false, bidAmount: 0 };
    }
  }

  // 5b. COMMANDERS MARKED CARD PATIENCE:
  // If we marked a card and it's still available on the board, save our single auction win and purse for our marked target!
  if (effectiveTeamId === 'commanders') {
    const isMarked = (cardIndex === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(cardIndex));
    if (!isMarked) {
      const markedCardWaiting = otherCards.find(c => {
        if (!c) return false;
        const cIdx = (G.board.auctionPlayers || []).indexOf(c);
        return (cIdx === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(cIdx));
      });
      if (markedCardWaiting && player.coins >= markedCardWaiting.minBid) {
        const markedDelta = calculateMarginalRosterDelta(G, player, markedCardWaiting);
        // Save our win for our marked card unless current card is a transcendent HOF superstar
        if (cardDelta < markedDelta + 6.0 && card.phase !== 'hof') {
          return { shouldBid: false, bidAmount: 0 };
        }
      }
    }
  }

  // 6. Calculate Base Valuation:
  let valuation = isToxicToMe ? 0 : Math.max(card.minBid, Math.round(cardDelta * 0.70));

  // Broncos Bully Spending:
  if (effectiveTeamId === 'broncos') {
    if (round <= 3) {
      const isTrueAnchor = cardProd.recDeflate >= 2 || card.phase === 'hof' || card.id === 'brock_bowers' || card.id === 'george_kittle';
      if (isTrueAnchor && player.coins >= 8) {
        valuation = Math.max(valuation, Math.min(player.coins - 6, 8));
      } else if (card.id === 'hunter_henry' || card.id === 'ezekiel_elliott') {
        // Pump-and-dump targets: claim cheaply (<= 5 coins), never bankrupt starting purse!
        valuation = Math.min(valuation, 5);
      }
    } else if (round >= 4 && player.coins >= 6) {
      const isDeflationCloser = cardProd.instDeflate >= 3 || cardProd.recDeflate >= 2 || card.phase === 'hof';
      if (isDeflationCloser) {
        valuation = Math.max(valuation, Math.min(player.coins - 2, 11));
      }
    }
  }

  // Browns Round 5 Bully Bidding:
  if (effectiveTeamId === 'browns' && round >= 5 && player.coins >= 15) {
    const isPremierCloser = cardProd.instDeflate >= 4 || cardProd.recDeflate >= 3 || card.phase === 'hof';
    if (isPremierCloser) {
      valuation = Math.max(valuation, Math.min(player.coins - 4, 15));
    }
  }

  // Steelers Richest Hegemony Protection:
  if (effectiveTeamId === 'steelers' && round <= 5) {
    const highestRivalCoins = Math.max(0, ...Object.values(G.players).filter(p => p !== player).map(p => p.coins || 0));
    const isCrownJewel = cardDelta >= 14.0 || card.phase === 'hof';
    if (!isCrownJewel) {
      const richestSafetyCap = Math.max(card.minBid, player.coins - highestRivalCoins + 1);
      valuation = Math.min(valuation, richestSafetyCap);
    }
  }

  // Lions First Claim Bounty Aggression:
  if (effectiveTeamId === 'lions') {
    const noOneClaimedYet = Object.values(G.players).every(p => (p.cardsWonThisRound || 0) === 0);
    if (noOneClaimedYet && !isToxicToMe) {
      const tableSize = Object.keys(G.players).length;
      valuation = Math.min(player.coins, valuation + tableSize);
    }
  }

  // Patriots Round 1-2 Sprint Conviction & Discipline (Playtest 39 & 53):
  if (effectiveTeamId === 'patriots' && !isToxicToMe) {
    if (round === 1) {
      const isTier1 = cardDelta >= 9.0;
      if (isTier1) {
        valuation = Math.max(valuation, Math.min(player.coins, 7));
      } else {
        // Enforce cheap discipline on ordinary cards
        valuation = Math.min(valuation, Math.max(card.minBid, 3));
      }
    } else if (psi <= 18) {
      // Sprint Closer: finish game before opponents build unstoppable engines
      if (cardProd.instDeflate >= psi || cardProd.recDeflate >= 2 || card.phase === 'hof') {
        valuation = Math.max(valuation, player.coins);
      }
    }
  }

  // Bears Outbid Barrier (Playtest 60): Opponents must outbid Bears by 2 coins
  if (effectiveTeamId === 'bears') {
    valuation = Math.min(player.coins, valuation + 1);
  }

  // Cowboys Round 1 Conviction:
  if (effectiveTeamId === 'cowboys' && round === 1 && !isToxicToMe) {
    const isTier1 = cardDelta >= 9.0;
    if (isTier1) {
      valuation = Math.max(valuation, Math.min(player.coins, 5));
    }
  }

  // Commanders Marked Card Conviction:
  if (effectiveTeamId === 'commanders') {
    const isMarked = (cardIndex === G.board.commandersMarkedCardIndex || G.board.commandersMarkedIndices?.includes(cardIndex));
    if (isMarked && !isToxicToMe) {
      // 1st player is blocked; win marked card with high conviction
      valuation = Math.max(valuation, Math.min(player.coins, Math.max(card.minBid + 2, Math.round(cardDelta * 0.85) + 1)));
    }
  }

  // 2-PLAYER / 2-CARD ENDGAME CLAMP:
  const isLastTwoContest = (remainingBoardCardsCount === 2 && eligibleBiddersCount === 2);
  if (isLastTwoContest && otherCards.length >= 1) {
    const otherCard = otherCards[0];
    const otherDelta = calculateMarginalRosterDelta(G, player, otherCard);
    const valueDifferential = Math.max(0, cardDelta - otherDelta);
    const differentialPremium = Math.round(valueDifferential * 0.75);
    const lastTwoValuationCap = Math.max(card.minBid, Math.min(valuation, (otherCard?.minBid || 1) + differentialPremium + 1));
    valuation = Math.min(valuation, lastTwoValuationCap);
  }

  // Isaiah Pacheco ceiling safeguard
  if (card.id === 'isaiah_pacheco') {
    const hasDrawbacksOnBoard = otherCards.some(c => c && c.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0)));
    valuation = Math.min(valuation, hasDrawbacksOnBoard ? 7 : 5);
  }

  // 7. OPPONENT AWARENESS & SAFE PRICE-BUMPING (ANTI-SYNERGY TAXING):
  // When nextBid exceeds our valuation, check if we should tax an opponent:
  // User Rule: Do NOT let opponents steal cards for min bid (bump to 3-5 coins).
  // But NEVER hate-draft or overbid on toxic cards (cap toxic tax at 3-4 coins, non-toxic at 4-5 coins).
  // Evaluated flexibly as a situational tactic, not a rigid hard rule.
  if (nextBid > valuation) {
    const targetRival = cardMarket?.highSynergyRival || (cardMarket?.rivalProfiles && cardMarket.rivalProfiles[0]);
    const passedBidders = G.board.passedAuctionPlayers || [];

    const rivalCanRebid = targetRival && 
                          !passedBidders.includes(targetRival.playerId) && 
                          (targetRival.coins >= nextBid + 1) &&
                          (targetRival.maxWilling >= nextBid + 1);

    const currentHighBid = G.board.highestBid || 0;
    const currentHighBidder = G.board.highestBidder;
    const rivalIsHighBidder = targetRival && currentHighBidder === targetRival.playerId;

    // Ceilings for safe taxing:
    // Toxic cards: cap at 3 (or 4 if rival is wealthy >= 8 coins).
    // Safe/normal cards: cap at 4 (or 5 if rival is wealthy and bidder has reserve).
    const maxSafeTaxBid = isToxicToMe ? ((targetRival?.coins >= 8) ? 4 : 3) : 5;

    const isUnderTaxCap = nextBid <= maxSafeTaxBid;
    const bidderHasReserve = (player.coins || 0) >= (isToxicToMe ? nextBid + 3 : nextBid + 2);
    const isSafeToTax = rivalCanRebid && isUnderTaxCap && bidderHasReserve && !isLastTwoContest;

    if (isSafeToTax) {
      // If rival is already paying fair price (>= 3 on toxic, >= 4 on safe), stop bumping!
      if (rivalIsHighBidder && currentHighBid >= (isToxicToMe ? 3 : 4)) {
        return { shouldBid: false, bidAmount: 0 };
      }

      // Situational probability: Chargers loves outbid wars (0.85); others (0.70)
      const taxProbability = (effectiveTeamId === 'chargers') ? 0.85 : 0.70;
      if (Math.random() < taxProbability) {
        return { shouldBid: true, bidAmount: nextBid, isPriceBump: true };
      }
    }

    return { shouldBid: false, bidAmount: 0 };
  }

  // 8. TACTICAL BIDDING EXECUTION:
  let targetBid = nextBid;
  let isJumpBid = false;

  // Chargers Ability Leverage:
  // If Chargers is richest, step-bid (+1) without jumping to invite opponents to re-raise and farm coins!
  const isChargers = effectiveTeamId === 'chargers';
  const isRichest = Object.values(G.players || {}).every(p => p === player || (player.coins || 0) >= (p.coins || 0));

  if (isChargers && isRichest) {
    targetBid = nextBid;
    isJumpBid = false;
  } else {
    // Anti-Chargers Outbid Denial:
    // If Chargers is in the game and NOT the 2-player endgame, bid to the estimated clearing price directly
    // to avoid giving Chargers incremental +1 outbid coin farming.
    const isChargersInGame = Object.values(G.players || {}).some(p => getEffectiveTeamId(p) === 'chargers');
    if (isChargersInGame && !isChargers && !isLastTwoContest) {
      const rivalMax = cardMarket?.highestRivalWilling || 0;
      const winTarget = Math.min(effMax, Math.min(valuation, Math.min(player.coins, Math.max(nextBid, rivalMax))));
      if (winTarget > nextBid && Math.random() < 0.50) {
        targetBid = winTarget;
        isJumpBid = true;
      }
    }
  }

  targetBid = Math.min(player.coins, Math.min(effMax, targetBid));
  if (targetBid < nextBid) {
    return { shouldBid: false, bidAmount: 0 };
  }

  return { shouldBid: true, bidAmount: targetBid, isJumpBid };
};
