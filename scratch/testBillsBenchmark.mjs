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

export function runBillsBenchmark(numGames = 100, numPlayers = 7, baseSeed = 1000) {
  let billsWins = 0;
  let billsPsiSum = 0;
  let abilityUsedCount = 0;
  let abilityRounds = [];
  let abilityCardNames = [];

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 37);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

      // Force Seat 0 to be Bills
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
        p.genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
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

        const billsBefore = G.players['0'].hasUsedBillsAbility;

        // 4. Post-Auction Phase
        if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
          DeflategateGame.phases.postAuctionPhase.onBegin({ G });
        }

        if (!billsBefore && G.players['0'].hasUsedBillsAbility) {
          abilityUsedCount++;
          abilityRounds.push(r);
          const lastStarter = G.players['0'].lineup[G.players['0'].lineup.length - 1];
          if (lastStarter) abilityCardNames.push(`${lastStarter.name} (R${r})`);
        }

        // 5. Refresh Phase
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
  console.log(`=== Bills Benchmark (${numGames} games, ${numPlayers}P) ===`);
  console.log(`Wins: ${billsWins}/${numGames} (${((billsWins / numGames) * 100).toFixed(1)}%)`);
  console.log(`Average Final PSI: ${(billsPsiSum / numGames).toFixed(2)}`);
  console.log(`Ability Used: ${abilityUsedCount}/${numGames} times (${((abilityUsedCount / numGames) * 100).toFixed(1)}%)`);
  console.log(`Average Round Ability Used: ${avgRound}`);
  console.log(`Sample Claimed Cards: ${abilityCardNames.slice(0, 10).join(', ')}`);
}

runBillsBenchmark(100, 10, 2024);
