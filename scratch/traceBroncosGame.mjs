import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './diagnoseBroncos.mjs';

function traceBroncos(seed = 54321, numPlayers = 7) {
  const rng = mulberry32(seed);
  const origRandom = Math.random;
  Math.random = rng;

  const G = DeflategateGame.setup(
    { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
    { numHumans: 0, vsCpu: true }
  );

  const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'broncos').map(t => t.id), rng);
  for (let i = 0; i < numPlayers; i++) {
    const seat = String(i);
    const teamId = (i === 0) ? 'broncos' : availableTeams[i - 1];
    const t = TEAMS.find(item => item.id === teamId);
    const p = G.players[seat];
    p.team = t;
    p.psi = t.initialPsi;
    p.coins = t.coins;
    p.isCpu = true;
    p.genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
    p.lineup = [];
    const psCount = t.id === 'seahawks' ? 4 : 3;
    for (let ps = 0; ps < psCount; ps++) {
      p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
    }
  }

  console.log(`\n=== TRACING BRONCOS (Seed: ${seed}, ${numPlayers}P) ===`);
  console.log(`Opponents: ${Object.keys(G.players).filter(id => id !== '0').map(id => G.players[id].team.name).join(', ')}`);

  const broncos = G.players['0'];

  for (let r = 1; r <= 10; r++) {
    G.board.round = r;
    G.board.firstPlayer = String((r - 1) % numPlayers);
    G.board.nominator = G.board.firstPlayer;

    if (DeflategateGame.phases.eventPhase?.onBegin) {
      DeflategateGame.phases.eventPhase.onBegin({ G, ctx: { numPlayers }, random: { Shuffle: (a) => fisherYates(a, rng) } });
    }
    G.board.eventConfirmed = true;

    if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
      DeflategateGame.phases.preAuctionPhase.onBegin({ G, ctx: { numPlayers }, events: {} });
    }

    console.log(`\n--- ROUND ${r} (Event: ${G.board.activeEvent?.name}) ---`);
    console.log(`Broncos Start: PSI=${broncos.psi}, Coins=${broncos.coins}, Lineup=[${broncos.lineup.map(c => c.name).join(', ')}]`);
    console.log(`Auction Board: [${G.board.auctionPlayers.filter(c => c).map(c => `${c.name} (${c.minBid}-${c.maxBid})`).join(', ')}]`);

    const maxWinsThisRound = (G.board.activeEvent?.category === 'double_draft') ? 2 : 1;
    let safety = 0;

    while (safety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
      const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
      if (remainingBoardCards === 0) break;

      const nominatorId = String(G.board.nominator);
      if (G.board.activeAuctionCardIndex === null) {
        const nomCardIdx = chooseCpuNominationCard(G, nominatorId);
        G.board.activeAuctionCardIndex = (nomCardIdx !== null && nomCardIdx !== undefined && G.board.auctionPlayers[nomCardIdx]) ? nomCardIdx : G.board.auctionPlayers.findIndex(c => c !== null);
        const activeCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
        G.board.highestBid = activeCard.minBid;
        G.board.highestBidder = nominatorId;
        G.board.passedAuctionPlayers = [];
        if (nominatorId === '0') {
          console.log(`  > Broncos nominated ${activeCard.name} for ${activeCard.minBid} coins`);
        }
      }

      const activeCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
      let currentBidderIdx = (Number(G.board.highestBidder) + 1) % numPlayers;
      let bidSafety = 0;

      while (bidSafety++ < 100) {
        const eligibleBidders = Object.keys(G.players).filter(id =>
          !G.board.passedAuctionPlayers.includes(id) &&
          (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound &&
          G.players[id].coins >= (G.board.highestBid + 1)
        );
        if (eligibleBidders.length === 0 || (eligibleBidders.length === 1 && eligibleBidders[0] === G.board.highestBidder)) break;

        const bidderId = String(currentBidderIdx);
        currentBidderIdx = (currentBidderIdx + 1) % numPlayers;

        if (G.board.passedAuctionPlayers.includes(bidderId) || (G.players[bidderId].cardsWonThisRound || 0) >= maxWinsThisRound) continue;
        if (bidderId === G.board.highestBidder) continue;

        const decision = evaluateCpuAuctionBid(G, bidderId);
        if (decision.shouldBid && decision.bidAmount > G.board.highestBid && decision.bidAmount <= G.players[bidderId].coins) {
          if (bidderId === '0') {
            console.log(`    Broncos raised bid to ${decision.bidAmount} on ${activeCard.name} (val: score=${scoreCardForPlayer(G, '0', activeCard).toFixed(1)})`);
          }
          G.board.highestBid = decision.bidAmount;
          G.board.highestBidder = bidderId;
        } else {
          if (!G.board.passedAuctionPlayers.includes(bidderId)) {
            G.board.passedAuctionPlayers.push(bidderId);
            if (bidderId === '0') {
              console.log(`    Broncos passed on ${activeCard.name} at ${G.board.highestBid} coins (eval: shouldBid=${decision.shouldBid}, bidAmount=${decision.bidAmount}, score=${scoreCardForPlayer(G, '0', activeCard).toFixed(1)})`);
            }
          }
        }
      }

      const winnerId = G.board.highestBidder;
      const winner = G.players[winnerId];
      if (winner && activeCard) {
        resolveAuctionWin(G, winnerId, activeCard);
        console.log(`  * ${winner.team.name} won ${activeCard.name} for ${G.board.highestBid} coins.`);
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
    }

    console.log(`Broncos End of R${r}: PSI=${broncos.psi}, Coins=${broncos.coins}, Lineup=[${broncos.lineup.map(c => c.name).join(', ')}]`);

    const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
    if (winners.length > 0) {
      console.log(`\n🏆 GAME OVER in Round ${r}! Winner: ${winners.map(id => `${G.players[id].team.name} (${G.players[id].psi} PSI)`).join(', ')}`);
      break;
    }
  }

  Math.random = origRandom;
}

traceBroncos(54321, 7);
