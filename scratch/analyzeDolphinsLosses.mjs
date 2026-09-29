import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, getEffectiveCardMaxBid, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './testDolphinsBenchmark.mjs';

function analyzeLosses(numGames = 30, numPlayers = 7, baseSeed = 3000) {
  let lossCount = 0;
  console.log(`\n=== Analyzing Dolphins Losses (${numGames} Games, ${numPlayers}P) ===\n`);

  for (let g = 0; g < numGames; g++) {
    const rng = mulberry32(baseSeed + g * 53);
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

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
    }

    let winnerId = null;
    let endRound = 10;

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
        DeflategateGame.phases.postAuctionPhase.onBegin({ G });
      }

      calculateRefreshResults(G);
      if (DeflategateGame.phases.refreshPhase?.moves?.confirmRefreshSummary) {
        DeflategateGame.phases.refreshPhase.moves.confirmRefreshSummary({ G, events: {} });
      }

      const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
      if (winners.length > 0) {
        winners.sort((a, b) => G.players[a].psi - G.players[b].psi);
        winnerId = winners[0];
        endRound = r;
        break;
      }
    }

    if (!winnerId) {
      const sorted = Object.keys(G.players).sort((a, b) => G.players[a].psi - G.players[b].psi);
      winnerId = sorted[0];
    }

    const dolph = G.players['0'];
    if (winnerId !== '0') {
      lossCount++;
      const winPlayer = G.players[winnerId];
      console.log(`Game #${g + 1} LOSS: Round ${endRound}, Winner: ${winPlayer.team.name} (0 PSI). Dolphins: ${dolph.psi} PSI, ${dolph.coins} Coins. Lineup: [${(dolph.lineup || []).map(c => c.name).join(', ')}]`);
    } else {
      console.log(`Game #${g + 1} WIN: Round ${endRound}, Dolphins won with ${dolph.psi} PSI! Lineup: [${(dolph.lineup || []).map(c => c.name).join(', ')}]`);
    }
  }
}

analyzeLosses(20, 7, 3000);
