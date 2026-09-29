import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './testPatriotsBenchmark.mjs';

function diagnoseLosses(numGames = 50, numPlayers = 7) {
  const losses = [];

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(1000 + g * 53);
    const origRandom = Math.random;
    Math.random = rng;

    try {
      const G = DeflategateGame.setup(
        { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
        { numHumans: 0, vsCpu: true }
      );

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

        if (DeflategateGame.phases.eventPhase?.onBegin) {
          DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers }, random: { Shuffle: (a) => fisherYates(a, rng) } });
        }
        G.board.eventConfirmed = true;

        if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
          DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;

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

        if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
          DeflategateGame.phases.postAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
        }

        calculateRefreshResults(G);
        if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
          DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
        }

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

      if (winnerId !== '0') {
        const winner = G.players[winnerId];
        losses.push({
          game: g + 1,
          winnerTeam: winner.team?.name,
          winnerPsi: winner.psi,
          patriotsPsi: patPlayer.psi,
          patriotsCoins: patPlayer.coins,
          patriotsLineup: (patPlayer.lineup || []).map(c => ({
            name: c.name,
            phase: c.phase,
            effects: c.effects
          })),
          round: G.board.round
        });
      }
    } finally {
      Math.random = origRandom;
    }
  }

  console.log(`Analyzed ${losses.length} losses out of ${numGames} games:`);
  console.log('Sample Loss Diagnoses (First 5):');
  losses.slice(0, 5).forEach((l, i) => {
    console.log(`\nLoss #${i+1} (Round ${l.round} vs ${l.winnerTeam}):`);
    console.log(`  Patriots Final PSI: ${l.patriotsPsi}, Coins: ${l.patriotsCoins}`);
    console.log(`  Lineup:`);
    l.patriotsLineup.forEach(c => {
      const effStr = (c.effects || []).map(e => `${e.type} ${e.amount}${e.perRound ? '/rnd' : ' (instant)'}`).join(', ');
      console.log(`    - ${c.name} (Phase ${c.phase}): ${effStr}`);
    });
  });

  // Calculate aggregates
  const avgPatPsiLoss = losses.reduce((s, l) => s + l.patriotsPsi, 0) / losses.length;
  const avgPatCoinsLoss = losses.reduce((s, l) => s + l.patriotsCoins, 0) / losses.length;
  const avgLossRound = losses.reduce((s, l) => s + l.round, 0) / losses.length;
  const phase1Count = losses.reduce((s, l) => s + l.patriotsLineup.filter(c => c.phase === 1).length, 0);
  const phase2Count = losses.reduce((s, l) => s + l.patriotsLineup.filter(c => c.phase === 2 || c.phase === 'hof').length, 0);

  console.log('\nAggregates across all losses:');
  console.log(`  Avg Patriots PSI in losses: ${avgPatPsiLoss.toFixed(2)}`);
  console.log(`  Avg Patriots Coins in losses: ${avgPatCoinsLoss.toFixed(2)}`);
  console.log(`  Avg Loss Round: ${avgLossRound.toFixed(1)}`);
  console.log(`  Phase 1 cards kept at end: ${phase1Count} (${(phase1Count / (phase1Count + phase2Count) * 100).toFixed(1)}%)`);
  console.log(`  Phase 2/HOF cards kept at end: ${phase2Count} (${(phase2Count / (phase1Count + phase2Count) * 100).toFixed(1)}%)`);
}

diagnoseLosses(50, 7);
