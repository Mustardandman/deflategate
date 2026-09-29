import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, getEffectiveCardMaxBid } from '../src/Game.js';
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

export function simulateGameDirect({ numPlayers = 4, forcedTeams = {}, teamGenomes = {}, seed = 42 }) {
  const rng = mulberry32(seed);
  const origRandom = Math.random;
  Math.random = rng;

  try {
    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    // Assign Teams
    const availableTeams = fisherYates(TEAMS.map(t => t.id), rng);
    for (let i = 0; i < numPlayers; i++) {
      const seat = String(i);
      let teamId = forcedTeams[seat];
      if (!teamId) {
        teamId = availableTeams.find(id => !Object.values(G.players).some(p => p.team?.id === id));
      }
      const t = TEAMS.find(item => item.id === teamId) || TEAMS[i % TEAMS.length];
      const p = G.players[seat];
      p.team = t;
      p.psi = t.initialPsi;
      p.coins = t.coins;
      p.isCpu = true;
      p.genome = teamGenomes[t.id] || ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
    }

    let winnerId = null;

    // Run up to 10 rounds
    for (let r = 1; r <= 10 && !winnerId; r++) {
      G.board.round = r;
      G.board.firstPlayer = String((r - 1) % numPlayers);
      G.board.nominator = G.board.firstPlayer;

      // Reset round states
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

      // Handle any pending interactive event states for CPUs
      if (G.board.pendingRivalry) {
        const giverId = G.board.pendingRivalry.currentGiverId;
        const targetId = Object.keys(G.players).find(id => id !== giverId) || '1';
        G.players[giverId].psi = Math.max(0, G.players[giverId].psi - 1);
        G.players[targetId].psi += 1;
        G.board.pendingRivalry = null;
      }
      G.board.pendingTradeRumors = null;
      G.board.tradeRumorsSummary = null;
      G.board.bonusAuction = null;
      G.board.pendingFreeAgency = null;
      G.board.pendingNewCapLimit = null;
      G.board.eventConfirmed = true;

      // 2. Pre-Auction Phase
      if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
        DeflategateGame.phases.preAuctionPhase.onBegin({
          G,
          ctx: { numPlayers },
          events: {}
        });
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
            // Nominator passes; pass nomination rights clockwise
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

        const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
        if (!card) {
          G.board.activeAuctionCardIndex = null;
          continue;
        }

        // Bidding Loop
        let biddingSafety = 0;
        while (biddingSafety++ < 40) {
          const eligibleBidders = Object.keys(G.players).filter(
            id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound && !G.board.passedAuctionPlayers.includes(id)
          );

          if (eligibleBidders.length <= 1) {
            // Auction won by highest bidder (or last remaining eligible)
            const winId = G.board.highestBidder !== null ? G.board.highestBidder : eligibleBidders[0];
            if (winId && G.board.activeAuctionCardIndex !== null) {
              const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
              if (wonCard) {
                G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
                resolveAuctionWin(G, winId, wonCard);
                // CPU Lineup Overflow Management
                const pWin = G.players[winId];
                const maxLineup = (pWin.team?.id === 'seahawks' ? 4 : 3) + (pWin.extraLineupSlots || 0);
                if (pWin.team?.id !== 'colts' && pWin.lineup.length > maxLineup) {
                  let worstIdx = 0, worstScore = Infinity;
                  pWin.lineup.forEach((c, idx) => {
                    let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
                    if (score < worstScore) { worstScore = score; worstIdx = idx; }
                  });
                  pWin.lineup.splice(worstIdx, 1);
                }
              }
              G.board.activeAuctionCardIndex = null;
              G.board.highestBid = 0;
              G.board.highestBidder = null;
              G.board.passedAuctionPlayers = [];
            }
            break;
          }

          // Next bidder evaluates
          const nextBidderId = eligibleBidders.find(id => id !== G.board.highestBidder);
          if (!nextBidderId) break;

          const bidDec = evaluateCpuAuctionBid(G, nextBidderId);
          if (bidDec.shouldBid && bidDec.bidAmount > G.board.highestBid) {
            G.board.highestBid = bidDec.bidAmount;
            G.board.highestBidder = nextBidderId;

            if (bidDec.isMaxBid) {
              // Instant buyout!
              const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
              G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
              resolveAuctionWin(G, nextBidderId, wonCard);
              // Overflow management
              const pWin = G.players[nextBidderId];
              const maxLineup = (pWin.team?.id === 'seahawks' ? 4 : 3) + (pWin.extraLineupSlots || 0);
              if (pWin.team?.id !== 'colts' && pWin.lineup.length > maxLineup) {
                let worstIdx = 0, worstScore = Infinity;
                pWin.lineup.forEach((c, idx) => {
                  let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
                  if (score < worstScore) { worstScore = score; worstIdx = idx; }
                });
                pWin.lineup.splice(worstIdx, 1);
              }
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

      // 4. Post-Auction Phase
      if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
        DeflategateGame.phases.postAuctionPhase.onBegin({ G });
      }

      // 5. Refresh Phase
      calculateRefreshResults(G);

      // 6. Confirm Refresh Summary
      if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
        DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
      }

      // Check win condition (PSI <= 25 threshold or 0)
      const lowestPsi = Math.min(...Object.values(G.players).map(p => p.psi));
      if (lowestPsi <= 25) {
        const potentialWinners = Object.keys(G.players).filter(id => G.players[id].psi === lowestPsi);
        winnerId = potentialWinners[0];
        break;
      }
    }

    // End of 10 rounds tiebreak if no threshold winner
    if (!winnerId) {
      let minPsi = Infinity;
      Object.keys(G.players).forEach(id => {
        if (G.players[id].psi < minPsi) {
          minPsi = G.players[id].psi;
          winnerId = id;
        }
      });
    }

    const standings = Object.keys(G.players).map(id => {
      const p = G.players[id];
      return {
        id,
        teamId: p.team?.id || 'unknown',
        teamName: p.team?.name || 'Unknown',
        psi: p.psi,
        coins: p.coins,
        lineupCount: p.lineup?.length || 0,
        won: String(winnerId) === String(id)
      };
    });
    standings.sort((a, b) => a.psi - b.psi || b.coins - a.coins);
    standings.forEach((s, idx) => { s.rank = idx + 1; });

    return {
      winnerId,
      winnerTeam: G.players[winnerId]?.team?.name || 'Unknown',
      winnerTeamId: G.players[winnerId]?.team?.id || 'unknown',
      winningPsi: G.players[winnerId]?.psi,
      roundsPlayed: G.board.round,
      standings
    };
  } finally {
    Math.random = origRandom;
  }
}

console.log('Testing 10 games with simulateGameDirect...');
const tStart = Date.now();
for (let i = 0; i < 10; i++) {
  const res = simulateGameDirect({ numPlayers: 4, seed: 1000 + i * 31 });
  console.log(`Game ${i + 1}: Winner ${res.winnerTeamId} (${res.winningPsi} PSI) in Round ${res.roundsPlayed}`);
}
console.log(`10 games finished in ${Date.now() - tStart}ms!`);
