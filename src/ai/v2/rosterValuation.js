// src/ai/v2/rosterValuation.js
// Layer 1: State-Aware Dynamic Card Valuation Engine
// Calculates the true marginal value of adding a card to a specific team's roster,
// incorporating active lineup replacement, position synergies, event multipliers,
// team abilities, and time-horizon decay.

import { getEffectiveTeamId, getEffectiveCardMaxBid } from '../../Game.js';

/**
 * Calculates remaining round horizon factor for recurring engines.
 * Round 1-2: Engines trigger 7-8 times.
 * Round 7-8: Engines trigger 1-2 times.
 */
export const getHorizonFactor = (round = 1) => {
  return Math.max(1, 11 - round);
};

/**
 * Team Trait Valuation Profiles:
 * Clean, state-aware strategic multipliers based on franchise unique win conditions.
 */
export const TEAM_VALUATION_PROFILES = {
  // 1. BILLS
  bills: {
    // Ability: "After the Auction Phase, you may pay the Minimum cost for a player in the discard pile (once per game)"
    discardFallback: true,
    reserveForDiscard: 2,
    getCoinMultiplier: (round) => (round <= 3 ? 1.15 : 0.95),
    getDeflateMultiplier: () => 1.10,
  },

  // 2. DOLPHINS
  dolphins: {
    // Ability: "Whenever you have 0 coins, gain 3"
    // Emergency bailout economy: actively hit 0 coins to recharge 3 coins! Avoid 1-coin dead zone.
    zeroCoinSafetyReserve: 3,
    getCoinMultiplier: (round, player) => ((player?.coins || 0) <= 4 ? 0.70 : 0.50),
    getDeflateMultiplier: (round, player) => ((player?.psi || 45) <= 25 ? 1.45 : 1.25),
  },

  // 3. PATRIOTS
  patriots: {
    // Ability: "Starts with low PSI" (Starts at 36 PSI instead of 44+)
    // Sprint to the finish line: get to 0 PSI before Phase 2/HOF superstars dominate.
    sprintCloser: true,
    getCoinMultiplier: (round) => (round <= 2 ? 1.20 : 0.80),
    getDeflateMultiplier: (round, player) => ((player?.psi || 36) <= 20 ? 1.80 : 1.35),
  },

  // 4. JETS
  jets: {
    // Ability: "Every time you pay the Maximum for a player deflate 4 PSI"
    maxPayDeflateBurst: 4.0,
    getCoinMultiplier: (round, player) => ((player?.coins || 0) <= 6 ? 1.45 : 1.15),
    getDeflateMultiplier: () => 1.35,
  },

  // 5. RAVENS
  ravens: {
    // Ability: "At the end of the round, if you control 3 different positions in your lineup, gain 3 coins"
    positionDiversityBonus: 3.5,
    getCoinMultiplier: () => 1.0,
    getDeflateMultiplier: (round) => (round >= 5 ? 1.25 : 1.05),
  },

  // 6. BENGALS
  bengals: {
    // Ability: "Players with instant abilities give you +2 coins/deflate. When acquiring a player, you may discard them instead of replacing a player."
    instantBonusDeflate: 2.0,
    instantBonusCoins: 2.0,
    discardOnAcquire: true,
    getCoinMultiplier: () => 1.0,
    getDeflateMultiplier: () => 1.15,
  },

  // 7. BROWNS
  browns: {
    // Ability: "Players can’t give you coins. Gain 30 coins at the start of round 5"
    // Coin effects from players give 0 coins. Pure deflation focus.
    noCoinsFromPlayers: true,
    getCoinMultiplier: () => 0.0,
    getDeflateMultiplier: (round) => (round >= 5 ? 1.65 : 1.40),
  },

  // 8. STEELERS
  steelers: {
    // Ability: "At the start of the round, if you are the richest player, give every other player a PSI"
    // Coins establish and protect the #1 ranking in Rounds 1-5, creating a massive relative PSI lead every round.
    richestHegemony: true,
    getCoinMultiplier: (round, player, G) => {
      const allPlayers = Object.values(G?.players || {});
      const myCoins = player?.coins || 0;
      const highestRivalCoins = Math.max(0, ...allPlayers.filter(p => p !== player).map(p => p.coins || 0));
      const isRichestOrClose = myCoins >= highestRivalCoins - 2;

      if (round <= 3) return isRichestOrClose ? 1.85 : 1.60;
      if (round <= 5) return isRichestOrClose ? 1.65 : 1.40;
      if (round <= 7) return 1.15;
      return 0.50; // Rounds 8-10: Must pivot to pure deflation closers
    },
    getDeflateMultiplier: (round) => (round >= 7 ? 1.45 : 1.0),
  },

  // 9. TEXANS
  texans: {
    // Ability: "During the Refresh Phase gain 2 coins and 2 deflate for each QB on your team"
    qbBonusDeflate: 2.0,
    qbBonusCoins: 2.0,
    getCoinMultiplier: () => 1.05,
    getDeflateMultiplier: (round) => (round >= 5 ? 1.35 : 1.15),
  },

  // 10. COLTS
  colts: {
    // Ability: "You have unlimited player spots in your lineup. When you acquire a player, add them to your lineup as an additional member."
    unlimitedRoster: true,
    getCoinMultiplier: (round) => (round <= 4 ? 1.35 : 1.05),
    getDeflateMultiplier: () => 1.25,
  },

  // 11. JAGUARS
  jaguars: {
    // Ability: "You can secretly look at the order of the event deck at any time. Once per game you can rearrange the order of the event deck."
    eventAware: true,
    getCoinMultiplier: (round) => (round <= 3 ? 1.15 : 0.95),
    getDeflateMultiplier: (round, player, G) => {
      const hasColdAirAhead = (G?.decks?.events || []).some(e => e?.id === 'cold_air' || e?.category === 'cold_air');
      const effPsi = hasColdAirAhead ? Math.max(1, (player?.psi || 40) - 7) : (player?.psi || 40);
      return effPsi <= 16 ? 1.55 : (round >= 5 ? 1.35 : 1.15);
    },
  },

  // 12. TITANS
  titans: {
    // Ability: "At the beginning of the game, look at top 3 cards of player deck. Acquire one for free."
    openingDraftLead: true,
    getCoinMultiplier: (round) => (round <= 2 ? 1.15 : 0.95),
    getDeflateMultiplier: (round) => (round >= 4 ? 1.35 : 1.20),
  },

  // 13. BRONCOS
  broncos: {
    // Ability: "The first Refresh Phase after you buy a player, ignore their every turn abilities"
    temporaryDrawbackImmunity: true,
    recurringHorizonDelay: 1, // Recurring cards skip the first refresh
    instantDeflateBoost: 1.45, // Pure instants attack 40 starting PSI with zero delay
    getCoinMultiplier: (round, player) => ((player?.coins || 0) <= 5 ? 1.15 : 0.65),
    getDeflateMultiplier: (round) => (round <= 3 ? 1.65 : 1.45),
  },

  // 14. CHIEFS
  chiefs: {
    // Ability: "At start of Auction Phase you may pay the Minimum cost of a player without bidding (once per game)"
    freeClaimPerk: true,
    superstarCovenant: true,
    getCoinMultiplier: () => 1.05,
    getDeflateMultiplier: (round) => (round >= 5 ? 1.30 : 1.10),
  },

  // 15. RAIDERS
  raiders: {
    // Ability: "Before the Auction Phase, you may give 1 PSI you control to another player"
    psiTransferPerk: true,
    getCoinMultiplier: () => 0.85,
    getDeflateMultiplier: () => 1.15,
  },

  // 16. CHARGERS
  chargers: {
    // Ability: "Each time you outbid a player, gain 1 coin at the end of the round"
    outbidCoinFarmer: true,
    getCoinMultiplier: (round) => (round <= 2 ? 0.85 : 0.60),
    getDeflateMultiplier: (round) => (round >= 4 ? 1.50 : 1.30),
  },

  // 17. COWBOYS
  cowboys: {
    // Ability: "Gain 2 coins at the end of every round"
    passiveCoinIncome: 2.0,
    getCoinMultiplier: () => 0.50, // Guaranteed +2 coins/round means low coin craving
    getDeflateMultiplier: () => 1.25,
  },

  // 18. EAGLES
  eagles: {
    // Ability: "After Auction Phase, you may pay 3 coins to raise every other player's PSI by 3 (Limit twice per round)"
    reserveCoinsForGriefing: 3,
    getCoinMultiplier: (round) => (round <= 3 ? 1.40 : 1.25),
    getDeflateMultiplier: (round) => (round >= 4 ? 1.35 : 1.20),
  },

  // 19. COMMANDERS
  commanders: {
    // Ability: "At start of Auction Phase, mark a revealed player. The first player cannot bid on that player."
    markCardBlocker: true,
    getCoinMultiplier: (round) => (round <= 2 ? 1.05 : 0.85),
    getDeflateMultiplier: (round) => (round >= 3 ? 1.50 : 1.35),
  },

  // 20. BEARS
  bears: {
    // Ability: "Players have to outbid you by two coins instead of one"
    outbidProtection: 2,
    getCoinMultiplier: () => 1.0,
    getDeflateMultiplier: () => 1.15,
  },

  // 21. LIONS
  lions: {
    // Ability: "During Auction Phase, if you are the first player to claim a player, gain coins equal to number of players"
    // Bounty refunds purse; Lions aggressively prioritizes deflation engines to conquer 47 starting PSI
    firstClaimBonus: true,
    getCoinMultiplier: () => 0.90,
    getDeflateMultiplier: (round) => (round >= 3 ? 1.55 : 1.35),
  },

  // 22. PACKERS
  packers: {
    // Ability: "If all your players are Phase 1 players, deflate 4 at end of round. Gain 1 coin every time you acquire Phase 1 player"
    phase1BonusCoins: 1.0,
    allPhase1Synergy: 4.0,
    getCoinMultiplier: (round) => (round <= 2 ? 1.15 : 0.85),
    getDeflateMultiplier: () => 1.40,
  },

  // 23. VIKINGS
  vikings: {
    // Ability: "If you have less than 27 PSI, your players receive twice as many coins"
    // Two-Phase Doctrine: Rush to < 27 PSI with pure deflation! Avoid coin clutter early.
    getCoinMultiplier: (round, player) => ((player?.psi || 44) < 27 ? 1.70 : 0.40),
    getDeflateMultiplier: (round, player) => ((player?.psi || 44) < 27 ? 1.50 : 1.65),
  },

  // 24. FALCONS
  falcons: {
    // Ability: "Whenever starting the bid during Auction, you may swap all available players with new ones (once per phase)"
    phaseMulligan: true,
    getCoinMultiplier: (round) => (round <= 2 ? 1.15 : 0.85),
    getDeflateMultiplier: (round) => (round >= 3 ? 1.50 : 1.35),
  },

  // 25. SAINTS
  saints: {
    // Ability: "Negative coins and inflation don't affect you"
    immuneToDrawbacks: true,
    getCoinMultiplier: () => 1.0,
    getDeflateMultiplier: () => 1.15,
  },

  // 26. PANTHERS
  panthers: {
    // Ability: "Deflate 2 PSI at the end of every round"
    passiveDeflation: 2.0,
    getCoinMultiplier: () => 1.0,
    getDeflateMultiplier: () => 1.15,
  },

  // 27. BUCCANEERS
  buccaneers: {
    // Ability: "After setup, choose another player's team ability. The Buccaneers gain that ability"
    dynamicCopy: true,
    getCoinMultiplier: (round, player, G) => {
      const eff = getEffectiveTeamId(player);
      if (eff !== 'buccaneers' && TEAM_VALUATION_PROFILES[eff]?.getCoinMultiplier) {
        return TEAM_VALUATION_PROFILES[eff].getCoinMultiplier(round, player, G);
      }
      return 1.0;
    },
    getDeflateMultiplier: (round, player, G) => {
      const eff = getEffectiveTeamId(player);
      if (eff !== 'buccaneers' && TEAM_VALUATION_PROFILES[eff]?.getDeflateMultiplier) {
        return TEAM_VALUATION_PROFILES[eff].getDeflateMultiplier(round, player, G);
      }
      return 1.10;
    },
  },

  // 28. CARDINALS
  cardinals: {
    // Ability: "During Auction Phase, look at top card of Player Deck and swap with one revealed player"
    deckSwapPerk: true,
    getCoinMultiplier: () => 0.80,
    getDeflateMultiplier: () => 1.20,
  },

  // 29. RAMS
  rams: {
    // Ability: "Once per game, you may put a x2 token on one of your non-Phase 1 players"
    ramsTokenMultiplier: 2.0,
    getCoinMultiplier: (round) => (round <= 4 ? 1.15 : 0.85),
    getDeflateMultiplier: (round) => (round >= 5 ? 1.45 : 1.10),
  },

  // 30. 49ERS
  '49ers': {
    // Ability: "If you have less than 5 coins during the Refresh Phase, your players generate double deflation."
    spendDownCalculus: true,
    getCoinMultiplier: (round, player) => (player?.coins <= 4 ? 0.40 : 0.65),
    getDeflateMultiplier: (round, player) => (player?.coins <= 4 ? 1.75 : 1.30),
  },

  // 31. SEAHAWKS
  seahawks: {
    // Ability: "Start the game with 4 Practice Squad Players on your team"
    extraRosterSlots: 1,
    starterCostDiscount: true,
    getCoinMultiplier: (round) => (round <= 3 ? 1.25 : 1.0),
    getDeflateMultiplier: () => 1.10,
  },
};

/**
 * Evaluates the net standalone production score of a card for a player.
 */
export const evaluateCardProduction = (card, player, G) => {
  if (!card) return { totalScore: 0, instDeflate: 0, recDeflate: 0, instCoins: 0, recCoins: 0 };

  const round = G?.board?.round || 1;
  const horizon = getHorizonFactor(round);
  const activeEvent = G?.board?.activeEvent;
  const effectiveTeamId = getEffectiveTeamId(player);
  const profile = TEAM_VALUATION_PROFILES[effectiveTeamId];

  let instDeflate = 0;
  let recDeflate = 0;
  let instCoins = 0;
  let recCoins = 0;
  let drawbacks = 0;

  // Process all card effects
  (card.effects || []).forEach(eff => {
    const isRecurring = Boolean(eff.perRound || eff.trigger === 'refresh' || eff.type === 'every_round' || eff.type === 'deflate_every_round');
    let amt = eff.amount || 0;

    // Event multipliers
    if (activeEvent?.category === 'double_all') {
      amt *= 2;
    } else if (activeEvent?.category === 'double_phase1' && card.phase === 1) {
      amt *= 2;
    }

    if (eff.type === 'deflate') {
      if (isRecurring) {
        recDeflate += amt;
      } else {
        instDeflate += amt;
      }
    } else if (eff.type === 'coins') {
      if (effectiveTeamId === 'browns') {
        // Browns cannot receive coins from players
        amt = 0;
      }
      if (isRecurring) {
        if (amt < 0 && !profile?.immuneToDrawbacks) {
          drawbacks += Math.abs(amt);
        } else if (amt > 0) {
          recCoins += amt;
        }
      } else {
        if (amt > 0) {
          instCoins += amt;
        }
      }
    } else if (eff.type === 'inflate') {
      if (!profile?.immuneToDrawbacks) {
        drawbacks += amt * (isRecurring ? horizon * 1.5 : 1.2);
      }
    }
  });

  // 1. Broncos delay & pump-and-dump overrides
  let effectiveHorizon = horizon;
  if (profile?.recurringHorizonDelay) {
    effectiveHorizon = Math.max(0, horizon - profile.recurringHorizonDelay);
  }

  if (effectiveTeamId === 'broncos') {
    if (card.id === 'hunter_henry') {
      instDeflate = 8;
      recDeflate = 0;
      recCoins = 0;
      // Broncos ability ignores drawbacks on turn 1 refresh, and replacement cuts Henry on next auction win with 0 cumulative drawbacks!
      drawbacks = 0;
    } else if (card.id === 'ezekiel_elliott') {
      instDeflate = 5;
      recDeflate = 0;
      recCoins = 0;
      drawbacks = 0;
    }
    if (instDeflate > 0 && profile?.instantDeflateBoost) {
      instDeflate *= profile.instantDeflateBoost;
    }
  }

  // 2. Bengals Free Nukes: Instant boost + immediate discard (0 recurring drawbacks)
  if (effectiveTeamId === 'bengals') {
    if (card.id === 'hunter_henry') {
      instDeflate = 10; // +8 base + 2 ability bonus
      recDeflate = 0;
      recCoins = 0;
      drawbacks = 0; // Discard-on-acquire avoids recurring inflation completely!
    } else if (card.id === 'ezekiel_elliott') {
      instDeflate = 7; // +5 base + 2 ability bonus
      recDeflate = 0;
      recCoins = 0;
      drawbacks = 0; // Discard-on-acquire avoids recurring negative coins completely!
    }
  }

  // 3. Patriots Round 1-2 Sprint Pump-and-Dump:
  if (effectiveTeamId === 'patriots' && round <= 2 && card.id === 'hunter_henry') {
    instDeflate = 8;
    recDeflate = 0;
    recCoins = 0;
    drawbacks = 0; // Anticipate replacing next round before inflation accumulates
  }

  // 4. Falcons Drawback & Engine Calibrations:
  if (effectiveTeamId === 'falcons') {
    const hasInflation = card.effects?.some(e => e.type === 'inflate' && (e.amount > 0 || e.perRound));
    if (hasInflation) {
      drawbacks += 50.0;
    }
    if (recDeflate >= 2) {
      recDeflate += 1.5;
    }
    if (instDeflate >= 3) {
      instDeflate += 1.5;
    }
  }

  // 5. Commanders Self-Inflation Poison Avoidance:
  if (effectiveTeamId === 'commanders') {
    const hasRecInflate = card.effects?.some(e => e.type === 'inflate' && (e.perRound || e.type === 'every_round'));
    if (hasRecInflate || card.id === 'deshaun_watson' || card.id === 'hunter_henry' || card.id === 'trevor_lawrence') {
      drawbacks += 50.0; // Strictly avoid inflation poison (43 starting PSI)
    }
  }

  // Bengals Franchise Ability: +2 coins and +2 deflate on instant abilities
  if (profile?.instantBonusDeflate && instDeflate > 0 && card.id !== 'hunter_henry' && card.id !== 'ezekiel_elliott') {
    instDeflate += profile.instantBonusDeflate;
  }
  if (profile?.instantBonusCoins && instCoins > 0) {
    instCoins += profile.instantBonusCoins;
  }

  // Texans Franchise Ability: +2 coins and +2 deflate per QB
  if (profile?.qbBonusDeflate && card.position === 'QB' && card.id !== 'deshaun_watson') {
    recCoins += profile.qbBonusCoins;
    recDeflate += profile.qbBonusDeflate;
  }

  // Packers Franchise Ability: +1 coin when acquiring Phase 1 player
  if (profile?.phase1BonusCoins && card.phase === 1) {
    instCoins += profile.phase1BonusCoins;
  }

  // Universal Dual QB Recognition (Josh Allen, Jayden Daniels, etc.)
  let dualQbBonus = 0;
  if (card.position === 'QB' && (instDeflate > 0 || recDeflate > 0) && (instCoins > 0 || recCoins > 0) && card.id !== 'deshaun_watson') {
    dualQbBonus = 8.5;
  }

  // Hall of fame prestige weighting
  const hofBonus = card.phase === 'hof' ? 5.0 : 0;

  // Deflation is the win condition. Each point of deflation is worth ~2.0 value in early rounds,
  // scaling up to ~4.0 value in late rounds as victory nears.
  const currentPsi = player?.psi || 40;
  const baseDeflateWeight = currentPsi <= 18 ? 3.5 : (round >= 6 ? 2.8 : 2.0);
  
  // Coins are fuel. Early game coins are worth ~1.5 (compounding). Late game coins decay to ~0.5.
  const baseCoinWeight = round <= 3 ? 1.5 : (round >= 7 ? 0.6 : 1.0);

  // Apply Team-Specific Strategic Trait Multipliers
  const teamCoinMult = profile?.getCoinMultiplier ? profile.getCoinMultiplier(round, player, G) : 1.0;
  const teamDeflateMult = profile?.getDeflateMultiplier ? profile.getDeflateMultiplier(round, player, G) : 1.0;

  const finalDeflateWeight = baseDeflateWeight * teamDeflateMult;
  const finalCoinWeight = baseCoinWeight * teamCoinMult;

  const totalDeflateValue = (instDeflate * finalDeflateWeight) + (recDeflate * effectiveHorizon * finalDeflateWeight);
  const totalCoinValue = (instCoins * finalCoinWeight) + (recCoins * effectiveHorizon * finalCoinWeight);

  // Jets Franchise Ability: Deflate 4 when paying Maximum
  let jetsMaxBurst = 0;
  if (effectiveTeamId === 'jets' && card) {
    const effMax = getEffectiveCardMaxBid(card, activeEvent);
    const myCoins = player?.coins || 0;
    if (myCoins >= effMax && effMax <= 9) {
      jetsMaxBurst = 4.0 * finalDeflateWeight * 0.95;
      if (effMax <= 5) {
        jetsMaxBurst += 7.5; // Small max gem efficiency bonus (Nabers, Odunze, Hall, etc.)
      } else if (effMax <= 7) {
        jetsMaxBurst += 4.0;
      }
    }
  }

  // Dolphins Instant Coin Launchpad:
  let dolphinsAdjustment = 0;
  if (effectiveTeamId === 'dolphins') {
    if (instCoins >= 4) {
      dolphinsAdjustment += 6.0; // Instant launchpad to 8-10 coins
    }
  }

  // Packers Phase 1 Quality Stratification:
  let packersAdjustment = 0;
  if (effectiveTeamId === 'packers') {
    if (card.phase === 1) {
      if (card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'kirk_cousins') {
        packersAdjustment += 12.0;
      } else if (card.id === 'josh_allen' || card.id === 'jayden_daniels') {
        packersAdjustment += 9.0;
      } else if (recDeflate >= 2) {
        packersAdjustment += 8.5;
      } else if (recCoins >= 2) {
        packersAdjustment += 6.5;
      } else if (card.id === 'malik_nabers' || card.id === 'rome_odunze') {
        const p1Count = (player?.lineup || []).filter(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_')).length;
        packersAdjustment += (p1Count >= 2 ? 6.5 : 1.5);
      } else if (instDeflate >= 2) {
        packersAdjustment += 3.5;
      } else {
        packersAdjustment += 1.5;
      }
    }
  }

  // Commanders Franchise Priority: Reward dual engines in lineup
  let commandersAdjustment = 0;
  if (effectiveTeamId === 'commanders') {
    if (recDeflate >= 1 && recCoins >= 1) {
      commandersAdjustment += 5.0;
    }
  }

  // Browns Deflation Purity: Pure coin cards score 0; dual-threat centerpieces get massive bonus
  let brownsAdjustment = 0;
  if (effectiveTeamId === 'browns') {
    if (instDeflate === 0 && recDeflate === 0) {
      return { totalScore: 0, instDeflate: 0, recDeflate: 0, instCoins: 0, recCoins: 0, drawbacks: 0 };
    }
    if (round <= 3 && (card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'greg_olsen' || card.id === 'kirk_cousins')) {
      brownsAdjustment = 6.0;
    }
  }

  // Chiefs Superstar Covenant: Mahomes, Kelce, Gonzalez get crown jewel bonus
  let chiefsSuperstarBonus = 0;
  if (effectiveTeamId === 'chiefs') {
    if (card.id === 'patrick_mahomes' || card.id === 'travis_kelce' || card.id === 'tony_gonzalez') {
      chiefsSuperstarBonus = 7.0;
    }
  }

  // 49ers Coin Clutter Penalty: Recurring coins >= 2 permanently ruin the < 5 coins double deflation window
  let coinClutterPenalty = 0;
  if (effectiveTeamId === '49ers' && recCoins >= 2) {
    coinClutterPenalty = recCoins * effectiveHorizon * 1.5;
  }

  const totalScore = Math.max(0, totalDeflateValue + totalCoinValue + hofBonus + dualQbBonus + jetsMaxBurst + dolphinsAdjustment + packersAdjustment + commandersAdjustment + brownsAdjustment + chiefsSuperstarBonus - coinClutterPenalty - (drawbacks * 2.5));

  return {
    totalScore,
    instDeflate,
    recDeflate,
    instCoins,
    recCoins,
    drawbacks
  };
};

/**
 * Evaluates the marginal value of adding a card to a team's active roster:
 * Delta = Production(Candidate) - Production(ReplacedStarter) + Synergies
 */
export const calculateMarginalRosterDelta = (G, player, card) => {
  if (!card || !player) return 0;
  if (typeof player === 'string') player = G?.players?.[player];
  if (!player) return 0;

  const candidateProd = evaluateCardProduction(card, player, G);
  const effectiveTeamId = getEffectiveTeamId(player);
  const isColts = effectiveTeamId === 'colts';
  const lineup = player.lineup || [];
  const maxSlots = isColts ? 999 : ((effectiveTeamId === 'seahawks' ? 4 : 3) + (player.extraLineupSlots || 0));

  let replacementCost = 0;

  // Bengals Ability: When acquiring a player, may discard them instead of replacing a player.
  // For pure instant cards and toxic nukes, Bengals claim the instant effect and discard the card without losing any starter!
  const isBengals = effectiveTeamId === 'bengals';
  const isPureInstant = card.effects && card.effects.length > 0 && card.effects.every(e => !e.perRound && e.type !== 'every_round');
  const isDiscardCandidate = isBengals && (isPureInstant || card.id === 'hunter_henry' || card.id === 'ezekiel_elliott');

  // Check if lineup is at max capacity
  if (!isColts && lineup.length >= maxSlots) {
    if (isDiscardCandidate) {
      replacementCost = 0;
    } else {
      // Find the weakest starter in the active lineup
      let lowestStarterScore = Infinity;
      lineup.forEach(starter => {
        if (starter.isPracticeSquad || starter.uniqueId?.startsWith('ps_') || starter.id === 'practice_squad') {
          lowestStarterScore = Math.min(lowestStarterScore, 0.5); // Practice squad is almost free to replace
        } else {
          const prod = evaluateCardProduction(starter, player, G);
          lowestStarterScore = Math.min(lowestStarterScore, prod.totalScore);
        }
      });

      if (lowestStarterScore !== Infinity) {
        replacementCost = lowestStarterScore * 0.85;
      }
    }
  }

  // Roster-wide contextual synergies:
  let synergyBonus = 0;

  // Universal Toxic Starter Replacement (All teams except Saints):
  // If active lineup contains a toxic starter (Watson, Henry, Zeke), replacing them is urgent!
  if (effectiveTeamId !== 'saints') {
    const hasToxicStarter = lineup.some(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') && (c.id === 'deshaun_watson' || c.id === 'hunter_henry' || c.id === 'ezekiel_elliott'));
    const isCandidateClean = card.id !== 'deshaun_watson' && card.id !== 'hunter_henry' && card.id !== 'ezekiel_elliott' && !card.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0));
    if (hasToxicStarter && isCandidateClean) {
      replacementCost = 0; // Cut the poison free!
      synergyBonus += 6.5;
    }
  }

  // Universal Cycle Strategy (Playtest 59 across all 32 franchises):
  // Spots 1 & 2 build recurring engines (+4.5). Spot 3 cycles 1-shot instant weapons (+2.5).
  const realStarters = lineup.filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') && c.id !== 'practice_squad');
  const recurringStarters = realStarters.filter(c => c.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && ((e.type === 'deflate' && e.amount > 0) || (e.type === 'coins' && e.amount > 0)))).length;
  const cardHasPositiveRecurring = card.effects?.some(e => (e.perRound || e.trigger === 'refresh' || e.type === 'every_round') && ((e.type === 'deflate' && e.amount > 0) || (e.type === 'coins' && e.amount > 0)));
  const cardIsPureInstant = card.effects?.length > 0 && card.effects?.every(e => !e.perRound && e.trigger !== 'refresh' && e.type !== 'every_round');

  if (recurringStarters < 2) {
    if (cardHasPositiveRecurring) {
      synergyBonus += 4.5;
    }
  } else {
    if (cardIsPureInstant) {
      synergyBonus += 2.5;
    }
  }

  // Ravens: 3 distinct positions in lineup gives +3 coins/round
  if (effectiveTeamId === 'ravens') {
    const activePositions = new Set(
      lineup
        .filter(c => !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_') && c.id !== 'practice_squad')
        .map(c => c.position)
        .filter(Boolean)
    );
    if (!activePositions.has(card.position)) {
      if (activePositions.size === 2) {
        // Completes the 3 distinct positions engine!
        synergyBonus += 3.5 * getHorizonFactor(G?.board?.round || 1);
      } else if (activePositions.size === 1) {
        synergyBonus += 2.0 * getHorizonFactor(G?.board?.round || 1) * 0.5;
      }
    } else if (activePositions.size === 2 && (G?.board?.round || 1) <= 5) {
      // Duplicates an existing position early when diversity is needed
      synergyBonus -= 3.0 * getHorizonFactor(G?.board?.round || 1) * 0.7;
    }
  }

  // Packers: Quality-Scaled Phase 1 & Phase 2/HOF Outweigh Calculus
  if (effectiveTeamId === 'packers') {
    const p1Count = lineup.filter(c => c.phase === 1 && !c.isPracticeSquad && !c.uniqueId?.startsWith('ps_')).length;
    const allPhase1 = lineup.every(c => c.phase === 1 || c.isPracticeSquad || c.uniqueId?.startsWith('ps_'));
    if (card.phase === 1) {
      if (allPhase1) {
        const horizon = getHorizonFactor(G?.board?.round || 1);
        synergyBonus += (p1Count === 2 ? 16.0 : 9.0) * (horizon / 7.0);
      }
    } else {
      // Non-phase 1 card: Phase 2 / HOF Outweigh-Calculus
      // Packers only forfeits ability deflation if all 3 starters are ALREADY Phase 1!
      const roundsLeft = Math.max(1, 10 - (G?.board?.round || 1));
      const lostAbilityDeflate = (p1Count === 3) ? (4 * roundsLeft) : 0;
      const candidateDeflateOutput = candidateProd.instDeflate + (candidateProd.recDeflate * roundsLeft);
      
      if (candidateProd.instDeflate >= (player.psi || 40) || card.phase === 'hof') {
        synergyBonus += 30.0; // Instant closer or HOF superstar
      } else if (candidateDeflateOutput >= lostAbilityDeflate) {
        synergyBonus += (candidateDeflateOutput - lostAbilityDeflate) * 1.5;
      } else if (lostAbilityDeflate > 0 && candidateProd.recDeflate < 2) {
        synergyBonus -= Math.min(10.0, (lostAbilityDeflate - candidateDeflateOutput) * 1.0);
      }
    }
  }

  // Colts: Unlimited lineup volume bonus - every acquired card is pure additive engine!
  if (effectiveTeamId === 'colts') {
    synergyBonus += 3.5;
  }

  // Jets: Early Coin Foundation (when coins <= 8)
  if (effectiveTeamId === 'jets' && (player.coins || 0) <= 8) {
    if (candidateProd.recCoins >= 1) {
      synergyBonus += candidateProd.recCoins * 3.5;
    } else if (candidateProd.instCoins >= 3) {
      synergyBonus += 4.5;
    }
  }

  // Lions: First Claim Bounty & Low Max Gems:
  if (effectiveTeamId === 'lions' && (G?.board?.round || 1) <= 3 && (player.cardsWonThisRound || 0) === 0) {
    const effMax = getEffectiveCardMaxBid(card, G?.board?.activeEvent);
    if (effMax <= 5 && (player.coins || 0) >= effMax) {
      synergyBonus += 5.5;
    }
  }

  // 49ers: Less than 5 coins generates double deflation
  if (effectiveTeamId === '49ers') {
    const incomingCoins = lineup.reduce((sum, c) => {
      const coinEff = c.effects?.find(e => e.type === 'coins' && (e.perRound || e.trigger === 'refresh' || e.type === 'every_round'));
      return sum + (coinEff ? (coinEff.amount || 0) : 0);
    }, 0);
    if ((player.coins || 0) + incomingCoins <= 4) {
      synergyBonus += (candidateProd.recDeflate * getHorizonFactor(G?.board?.round || 1)) * 1.5;
    }
  }

  // Rams: 2x token on non-Phase 1 player elevates recurring production
  if (effectiveTeamId === 'rams' && !player.ramsTokenAttached && card.phase !== 1) {
    if (candidateProd.recDeflate >= 3) {
      synergyBonus += (candidateProd.recDeflate * getHorizonFactor(G?.board?.round || 1) * 0.8) + 4.0;
    } else {
      synergyBonus += (candidateProd.recDeflate * getHorizonFactor(G?.board?.round || 1) * 0.5) + (candidateProd.recCoins * 0.5);
    }
  }

  // Eagles: Late-game griefing leverage
  if (effectiveTeamId === 'eagles' && (G?.board?.round || 1) >= 6) {
    const oppCloseToVictory = Object.values(G?.players || {}).some(p => p !== player && (p.psi || 40) <= 12);
    if (oppCloseToVictory && player.coins >= 6) {
      synergyBonus += 2.0;
    }
  }

  // Broncos 20-Coin Bully Anchor: In R1-3, secure elite permanent centers fearlessly
  if (effectiveTeamId === 'broncos' && (G?.board?.round || 1) <= 3) {
    const hasDrawbacks = card.effects?.some(e => e.type === 'inflate' || (e.type === 'coins' && e.amount < 0));
    const isPermanentAnchor = !hasDrawbacks && (candidateProd.recDeflate >= 2 || card.phase === 'hof' || card.id === 'brock_bowers' || card.id === 'george_kittle' || card.id === 'kirk_cousins');
    if (isPermanentAnchor) {
      synergyBonus += 10.0;
    }
  }

  // Commanders Marked Card Snipe: If 1st player is blocked, card is a discount opportunity
  if (effectiveTeamId === 'commanders') {
    const cardIdx = (G?.board?.auctionPlayers || []).findIndex(c => c === card || (c && card && c.uniqueId && c.uniqueId === card.uniqueId) || (c && card && c.id === card.id));
    const isMarked = cardIdx !== -1 && (G?.board?.commandersMarkedCardIndex === cardIdx || G?.board?.commandersMarkedIndices?.includes(cardIdx));
    if (isMarked) {
      synergyBonus += 5.5;
    }
  }

  const netDelta = Math.max(0.1, candidateProd.totalScore - replacementCost + synergyBonus);
  return Number(netDelta.toFixed(2));
};
