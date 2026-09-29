import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, getEffectiveCardMaxBid, scoreCardForPlayer } from '../src/Game.js';
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

export function runDolphinsBenchmark(numGames = 100, numPlayers = 7, baseSeed = 2000) {
  let dolphinsWins = 0;
  let dolphinsPsiSum = 0;
  let totalBailouts = 0;
  let totalRoundsTracked = 0;
  let stuckWith1CoinCount = 0;
  let stuckWith2CoinsCount = 0;
  let coinsAtRoundEnd = [];
  let draftedCardsSummary = { coins: 0, deflate: 0, both: 0, neither: 0 };

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 43);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      // Force Seat 0 to be Dolphins
      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'dolphins').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'dolphins' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
        p.bailoutCount = 0;
      }

      const dolphinsPlayer = G.players['0'];
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

        // 1. Event Phase
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

        // 2. Pre-Auction Phase
        if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
          DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

        // 3. Auction Phase
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
              G.board.nominator = eligible[0];
              continue;
            }
            G.board.activeAuctionCardIndex = nomIdx;
            const nominatedCard = G.board.auctionPlayers[nomIdx];
            G.board.highestBid = nominatedCard.minBid;
            G.board.highestBidder = nominatorId;
            G.board.passedAuctionPlayers = [];
          }

          const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
          if (!card) break;

          let biddingSafety = 0;
          while (biddingSafety++ < 40) {
            const eligibleBidders = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
            const activeBidders = eligibleBidders.filter(id => !G.board.passedAuctionPlayers?.includes(id));
            if (activeBidders.length <= 1) {
              const winPlayerId = G.board.highestBidder || activeBidders[0] || nominatorId;
              const prevCoins = G.players[winPlayerId].coins;
              const bidPaid = G.board.highestBid;
              resolveAuctionWin(G, winPlayerId, card);
              if (winPlayerId === '0' && prevCoins - bidPaid === 0) {
                dolphinsPlayer.bailoutCount = (dolphinsPlayer.bailoutCount || 0) + 1;
              }
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
              const nextNom = eligibleBidders.find(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (nextNom) G.board.nominator = nextNom;
              break;
            }

            let anyoneBid = false;
            for (const bidderId of activeBidders) {
              if (bidderId === G.board.highestBidder) continue;
              const bidDecision = evaluateCpuAuctionBid(G, bidderId, card);
              if (bidDecision && bidDecision.shouldBid && bidDecision.bidAmount > G.board.highestBid) {
                G.board.highestBid = bidDecision.bidAmount;
                G.board.highestBidder = bidderId;
                anyoneBid = true;
              } else {
                if (!G.board.passedAuctionPlayers) G.board.passedAuctionPlayers = [];
                G.board.passedAuctionPlayers.push(bidderId);
              }
            }
            if (!anyoneBid) {
              const winPlayerId = G.board.highestBidder || activeBidders[0];
              const prevCoins = G.players[winPlayerId].coins;
              const bidPaid = G.board.highestBid;
              resolveAuctionWin(G, winPlayerId, card);
              if (winPlayerId === '0' && prevCoins - bidPaid === 0) {
                dolphinsPlayer.bailoutCount = (dolphinsPlayer.bailoutCount || 0) + 1;
              }
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
              const nextNom = eligibleBidders.find(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
              if (nextNom) G.board.nominator = nextNom;
              break;
            }
          }
        }

        // Post-Auction Phase (Bills / Discard pickups)
        if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
          DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        // Check Dolphins state at end of auction/before refresh
        totalRoundsTracked++;
        coinsAtRoundEnd.push(dolphinsPlayer.coins);
        if (dolphinsPlayer.coins === 1) stuckWith1CoinCount++;
        if (dolphinsPlayer.coins === 2) stuckWith2CoinsCount++;

        // 4. Refresh Phase
        const dolphinsCoinsBeforeRefresh = dolphinsPlayer.coins;
        calculateRefreshResults(G);
        if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
          DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
        }
        if (dolphinsPlayer.dolphinsTriggered) {
          dolphinsPlayer.bailoutCount = (dolphinsPlayer.bailoutCount || 0) + 1;
          dolphinsPlayer.dolphinsTriggered = false;
        }

        // Check for 0 PSI win condition
        const zeroPsiPlayers = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
        if (zeroPsiPlayers.length > 0) {
          zeroPsiPlayers.sort((a, b) => G.players[a].psi - G.players[b].psi);
          winnerId = zeroPsiPlayers[0];
          break;
        }
      }

      if (!winnerId) {
        const sorted = Object.keys(G.players).sort((a, b) => G.players[a].psi - G.players[b].psi);
        winnerId = sorted[0];
      }

      if (winnerId === '0') dolphinsWins++;
      dolphinsPsiSum += dolphinsPlayer.psi;
      totalBailouts += (dolphinsPlayer.bailoutCount || 0);

      // Lineup composition
      (dolphinsPlayer.lineup || []).forEach(card => {
        const hasCoin = card.effects?.some(e => e.type === 'coins');
        const hasDeflate = card.effects?.some(e => e.type === 'deflate');
        if (hasCoin && hasDeflate) draftedCardsSummary.both++;
        else if (hasCoin) draftedCardsSummary.coins++;
        else if (hasDeflate) draftedCardsSummary.deflate++;
        else draftedCardsSummary.neither++;
      });

    } finally {
      Math.random = origRandom;
    }
  }

  const avgPsi = (dolphinsPsiSum / numGames).toFixed(2);
  const winRate = ((dolphinsWins / numGames) * 100).toFixed(1);
  const avgBailouts = (totalBailouts / numGames).toFixed(2);
  const pct1Coin = ((stuckWith1CoinCount / totalRoundsTracked) * 100).toFixed(1);
  const pct2Coins = ((stuckWith2CoinsCount / totalRoundsTracked) * 100).toFixed(1);

  return {
    numPlayers,
    numGames,
    winRate: `${winRate}%`,
    avgPsi,
    avgBailouts,
    pct1Coin: `${pct1Coin}%`,
    pct2Coins: `${pct2Coins}%`,
    draftedCardsSummary
  };
}

console.log("=== Dolphins Baseline Benchmark (7 Players, 100 Games) ===");
const res7 = runDolphinsBenchmark(100, 7, 2026);
console.log(JSON.stringify(res7, null, 2));

console.log("\n=== Dolphins Baseline Benchmark (10 Players, 100 Games) ===");
const res10 = runDolphinsBenchmark(100, 10, 2026);
console.log(JSON.stringify(res10, null, 2));
