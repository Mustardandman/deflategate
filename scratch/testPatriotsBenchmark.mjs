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

export function runPatriotsBenchmark(numGames = 100, numPlayers = 7, baseSeed = 3000) {
  let patriotsWins = 0;
  let patriotsPsiSum = 0;
  let winRounds = [];
  let draftedCardsSummary = { coins: 0, deflate: 0, both: 0, neither: 0 };
  let roundsWithZeroCoins = 0;
  let totalRounds = 0;
  let averageCoinsEndRound = 0;
  let lossReasons = { outpacedByEngine: 0, starvedForCoins: 0, overpaidEarly: 0 };
  let winningOpponents = {};

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 43);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      // Force Seat 0 to be Patriots
      const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'patriots').map(t => t.id), rng);
      for (let i = 0; i < numPlayers; i++) {
        const seat = String(i);
        const teamId = (i === 0) ? 'patriots' : availableTeams[i - 1];
        const t = TEAMS.find(item => item.id === teamId);
        const p = G.players[seat];
        p.team = t;
        p.psi = t.initialPsi;
        p.coins = t.coins;
        p.isCpu = true;
        p.genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
      }

      const patPlayer = G.players['0'];
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
              resolveAuctionWin(G, winPlayerId, card);
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
              resolveAuctionWin(G, winPlayerId, card);
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

        totalRounds++;
        if (patPlayer.coins === 0) roundsWithZeroCoins++;
        averageCoinsEndRound += patPlayer.coins;

        // 4. Refresh Phase
        calculateRefreshResults(G);
        if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
          DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
        }

        // Check for 0 PSI win condition
        const zeroPsiPlayers = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
        if (zeroPsiPlayers.length > 0) {
          zeroPsiPlayers.sort((a, b) => G.players[a].psi - G.players[b].psi);
          winnerId = zeroPsiPlayers[0];
          winRounds.push(r);
          break;
        }
      }

      if (!winnerId) {
        const sorted = Object.keys(G.players).sort((a, b) => G.players[a].psi - G.players[b].psi);
        winnerId = sorted[0];
        winRounds.push(10);
      }

      if (winnerId === '0') {
        patriotsWins++;
      } else {
        const winningTeam = G.players[winnerId]?.team?.id || 'unknown';
        winningOpponents[winningTeam] = (winningOpponents[winningTeam] || 0) + 1;
      }
      patriotsPsiSum += patPlayer.psi;

      (patPlayer.lineup || []).forEach(card => {
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

  return {
    numPlayers,
    numGames,
    winRate: ((patriotsWins / numGames) * 100).toFixed(1) + '%',
    avgPsi: (patriotsPsiSum / numGames).toFixed(2),
    avgWinRound: winRounds.length > 0 ? (winRounds.reduce((a, b) => a + b, 0) / winRounds.length).toFixed(1) : 'N/A',
    pctZeroCoins: ((roundsWithZeroCoins / totalRounds) * 100).toFixed(1) + '%',
    avgCoins: (averageCoinsEndRound / totalRounds).toFixed(2),
    draftedCardsSummary,
    topWinningRivals: Object.entries(winningOpponents).sort((a, b) => b[1] - a[1]).slice(0, 5)
  };
}

console.log("=== Running Patriots Baseline Benchmark (100 Games 7P & 10P) ===");
const r7 = runPatriotsBenchmark(100, 7, 3000);
console.log("\n7-Player Table Results:", JSON.stringify(r7, null, 2));

const r10 = runPatriotsBenchmark(100, 10, 3000);
console.log("\n10-Player Table Results:", JSON.stringify(r10, null, 2));
