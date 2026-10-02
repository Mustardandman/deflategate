import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD, PHASE_1_PLAYERS, PHASE_2_PLAYERS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fisherYates(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function testPlaytest50Chiefs(gamesToPlay = 100, numPlayers = 7, baseSeed = 54321) {
  console.log(`\n========================================`);
  console.log(`PLAYTEST 50: CHIEFS VERIFICATION SUITE (${gamesToPlay} Games, ${numPlayers}P)`);

  // 1. Verify Card Changes
  const kirk = PHASE_1_PLAYERS.find(c => c.id === 'kirk_cousins');
  const ceedee = PHASE_2_PLAYERS.find(c => c.id === 'ceedee_lamb');

  console.log(`\n--- Card Adjustments Check ---`);
  console.log(`Kirk Cousins: effects=`, kirk.effects);
  const kirkDeflate = kirk.effects.find(e => e.type === 'deflate');
  if (kirkDeflate && !kirkDeflate.perRound && kirkDeflate.amount === 4) {
    console.log(`✅ Kirk Cousins correctly updated to 4 deflate instant!`);
  } else {
    throw new Error(`Kirk Cousins not updated properly: ${JSON.stringify(kirk)}`);
  }

  console.log(`CeeDee Lamb: maxBid=${ceedee.maxBid}`);
  if (ceedee.maxBid === 17) {
    console.log(`✅ CeeDee Lamb correctly updated to max cost 17!`);
  } else {
    throw new Error(`CeeDee Lamb maxBid is not 17: ${ceedee.maxBid}`);
  }

  let chiefsWins = 0;
  let totalPsi = 0;
  let totalEndingCoins = 0;
  let draftedCards = {};
  let abilityClaimCards = {};
  let abilityClaimRounds = {};
  let abilityUnusedCount = 0;
  let duplicateCardErrors = 0;

  for (let g = 0; g < gamesToPlay; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'chiefs').map(t => t.id), rng);
    for (let i = 0; i < numPlayers; i++) {
      const seat = String(i);
      const teamId = (i === 0) ? 'chiefs' : availableTeams[i - 1];
      const t = TEAMS.find(item => item.id === teamId);
      const p = G.players[seat];
      p.team = t;
      p.psi = t.initialPsi;
      p.coins = t.coins;
      p.isCpu = true;
      p.genome = { ...(ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME) };
      p.lineup = [];
      const psCount = t.id === 'seahawks' ? 4 : 3;
      for (let ps = 0; ps < psCount; ps++) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
      }
    }

    const chiefsPlayer = G.players['0'];

    for (let r = 1; r <= 10; r++) {
      G.board.round = r;
      G.board.firstPlayer = String((r - 1) % numPlayers);
      G.board.nominator = G.board.firstPlayer;

      if (DeflategateGame.phases.eventPhase?.onBegin) {
        DeflategateGame.phases.eventPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }

      G.board.pendingRivalry = null;
      G.board.pendingTradeRumors = null;
      G.board.bonusAuction = null;
      G.board.pendingFreeAgency = null;
      G.board.eventConfirmed = true;

      const abilityUsedBefore = chiefsPlayer.hasUsedChiefsAbility;
      const prevLineupIds = new Set(chiefsPlayer.lineup.map(c => c.uniqueId || c.id));

      // Real in-game preAuctionPhase.onBegin
      if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
        DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }

      if (!abilityUsedBefore && chiefsPlayer.hasUsedChiefsAbility) {
        abilityClaimRounds[r] = (abilityClaimRounds[r] || 0) + 1;
        const newCard = chiefsPlayer.lineup.find(c => !prevLineupIds.has(c.uniqueId || c.id));
        if (newCard) {
          abilityClaimCards[newCard.name] = (abilityClaimCards[newCard.name] || 0) + 1;

          // Check board nullification: newCard should NOT exist in G.board.auctionPlayers!
          const duplicateOnBoard = (G.board.auctionPlayers || []).some(c => c && (c.id === newCard.id || c.name === newCard.name));
          if (duplicateOnBoard) {
            duplicateCardErrors++;
          }
        }
      }

      const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

      let auctionSafety = 0;
      while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
        const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
        if (remainingBoardCards === 0) break;

        const nominatorId = String(G.board.nominator);
        if (G.board.activeAuctionCardIndex === null) {
          const nomCardIdx = chooseCpuNominationCard(G, nominatorId);
          if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
            const firstValid = G.board.auctionPlayers.findIndex(c => c !== null);
            if (firstValid === -1) break;
            G.board.activeAuctionCardIndex = firstValid;
          } else {
            G.board.activeAuctionCardIndex = nomCardIdx;
          }

          const activeCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
          G.board.highestBid = activeCard.minBid;
          G.board.highestBidder = nominatorId;
          G.board.passedAuctionPlayers = [];
        }

        let bidLoopSafety = 0;
        let currentBidderIdx = (numPlayers > 0) ? (Number(G.board.highestBidder) + 1) % numPlayers : 0;
        while (bidLoopSafety++ < 100) {
          const eligibleBidders = Object.keys(G.players).filter(id =>
            !G.board.passedAuctionPlayers.includes(id) &&
            (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound &&
            G.players[id].coins >= (G.board.highestBid + 1)
          );

          if (eligibleBidders.length === 0 || (eligibleBidders.length === 1 && eligibleBidders[0] === G.board.highestBidder)) {
            break;
          }

          const bidderId = String(currentBidderIdx);
          currentBidderIdx = (currentBidderIdx + 1) % numPlayers;

          if (G.board.passedAuctionPlayers.includes(bidderId) || (G.players[bidderId].cardsWonThisRound || 0) >= maxWinsThisRound) {
            continue;
          }
          if (bidderId === G.board.highestBidder) {
            continue;
          }

          const decision = evaluateCpuAuctionBid(G, bidderId);
          if (decision.shouldBid && decision.bidAmount > G.board.highestBid && decision.bidAmount <= G.players[bidderId].coins) {
            G.board.highestBid = decision.bidAmount;
            G.board.highestBidder = bidderId;
          } else {
            if (!G.board.passedAuctionPlayers.includes(bidderId)) {
              G.board.passedAuctionPlayers.push(bidderId);
            }
          }
        }

        const winningPlayerId = G.board.highestBidder;
        const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];

        if (winningPlayerId && wonCard) {
          resolveAuctionWin(G, winningPlayerId, wonCard);
          if (winningPlayerId === '0') {
            draftedCards[wonCard.name] = (draftedCards[wonCard.name] || 0) + 1;
          }
        }

        G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.passedAuctionPlayers = [];

        const activeRemaining = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
        if (activeRemaining.length > 0) {
          const currentNomIdx = activeRemaining.indexOf(String(G.board.nominator));
          const nextNom = activeRemaining[(currentNomIdx + 1) % activeRemaining.length];
          if (nextNom) G.board.nominator = nextNom;
        }
      }

      if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
        DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }

      if (DeflategateGame.phases.refreshPhase?.onBegin) {
        DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
      }
      if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
        DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
      } else {
        Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; });
      }

      const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
      if (winners.length > 0) {
        let bestId = winners[0];
        let bestPsi = G.players[bestId].psi;
        for (let w = 1; w < winners.length; w++) {
          if (G.players[winners[w]].psi < bestPsi) {
            bestId = winners[w];
            bestPsi = G.players[bestId].psi;
          }
        }
        if (bestId === '0') {
          chiefsWins++;
        }
        break;
      }
    }

    if (!chiefsPlayer.hasUsedChiefsAbility) {
      abilityUnusedCount++;
    }

    totalPsi += chiefsPlayer.psi;
    totalEndingCoins += chiefsPlayer.coins;
    Math.random = origRandom;
  }

  const winRate = (chiefsWins / gamesToPlay) * 100;
  const avgPsi = (totalPsi / gamesToPlay).toFixed(1);
  const avgCoins = (totalEndingCoins / gamesToPlay).toFixed(1);

  console.log(`\n--- Chiefs Benchmark Results ---`);
  console.log(`Win Rate: ${winRate.toFixed(1)}% (Fair share: ${(100 / numPlayers).toFixed(1)}%)`);
  console.log(`Avg Ending PSI: ${avgPsi}`);
  console.log(`Avg Ending Coins: ${avgCoins}`);
  console.log(`Ability Trigger Rounds:`, abilityClaimRounds);
  console.log(`Ability Unused Count: ${abilityUnusedCount} / ${gamesToPlay}`);
  console.log(`Duplicate Card Board Errors: ${duplicateCardErrors}`);
  console.log(`Top Ability Claims:`);
  Object.entries(abilityClaimCards)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([name, count]) => {
      console.log(`  - ${name}: ${count}`);
    });

  if (duplicateCardErrors > 0) {
    throw new Error(`Duplicate card errors detected: ${duplicateCardErrors}`);
  }
  if (abilityClaimRounds['2'] || abilityClaimRounds['3']) {
    throw new Error(`Ability triggered in Round 2 or 3: ${JSON.stringify(abilityClaimRounds)}`);
  }
  if (abilityUnusedCount > 0) {
    throw new Error(`Ability left unused in ${abilityUnusedCount} games!`);
  }

  console.log(`\n🎉 ALL CHIEFS VERIFICATIONS PASSED!`);
  console.log(`========================================\n`);

  return { winRate, avgPsi, avgCoins, abilityClaimRounds, abilityClaimCards };
}

testPlaytest50Chiefs(100, 7, 54321);
