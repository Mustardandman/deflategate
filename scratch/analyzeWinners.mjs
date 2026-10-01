import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './testJaguarsBenchmark.mjs';

const winnerCounts = {};
let jagsWins = 0;

for (let g = 0; g < 100; g++) {
  const rng = mulberry32(50000 + g * 37);
  const origRandom = Math.random;
  Math.random = rng;

  const numPlayers = 7;
  const G = DeflategateGame.setup(
    { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
    { numHumans: 0, vsCpu: true }
  );

  const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'jaguars').map(t => t.id), rng);
  for (let i = 0; i < numPlayers; i++) {
    const seat = String(i);
    const teamId = (i === 0) ? 'jaguars' : availableTeams[i - 1];
    const t = TEAMS.find(item => item.id === teamId);
    const p = G.players[seat];
    p.team = t;
    p.psi = t.initialPsi;
    p.coins = t.coins;
    p.isCpu = true;
    p.genome = (ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME);
    p.lineup = [];
    const psCount = t.id === 'seahawks' ? 4 : (t.id === 'colts' ? 3 : 3);
    for (let ps = 0; ps < psCount; ps++) {
      p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
    }
  }

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
        const nomCardIdx = chooseCpuNominationCard(G, nominatorId);
        if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
          const firstValid = G.board.auctionPlayers.findIndex(c => c !== null);
          if (firstValid === -1) break;
          G.board.activeAuctionCardIndex = firstValid;
        } else {
          G.board.activeAuctionCardIndex = nomCardIdx;
        }
      }

      const cardIdx = G.board.activeAuctionCardIndex;
      const currentCard = G.board.auctionPlayers[cardIdx];
      if (!currentCard) {
        G.board.activeAuctionCardIndex = null;
        continue;
      }

      let highBid = 0;
      let highBidder = null;
      let activeBidders = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);

      while (activeBidders.length > 0) {
        let bidsThisRound = 0;
        for (const bidderId of [...activeBidders]) {
          G.board.highestBid = highBid;
          G.board.highestBidder = highBidder;
          const evalResult = evaluateCpuAuctionBid(G, bidderId);
          if (evalResult.shouldBid && evalResult.bidAmount > highBid) {
            highBid = evalResult.bidAmount;
            highBidder = bidderId;
            bidsThisRound++;
          } else {
            activeBidders = activeBidders.filter(id => id !== bidderId);
          }
        }
        if (bidsThisRound === 0) break;
        if (activeBidders.length === 1 && highBidder === activeBidders[0]) break;
      }

      if (highBidder !== null) {
        resolveAuctionWin(G, highBidder, currentCard);
      }
      G.board.auctionPlayers[cardIdx] = null;
      G.board.activeAuctionCardIndex = null;
    }

    if (DeflategateGame.phases.refreshPhase?.onBegin) {
      DeflategateGame.phases.refreshPhase.onBegin({ G, ctx: { numPlayers } });
    }
    Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; });

    const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
    if (winners.length > 0) {
      let bestId = winners[0];
      for (const w of winners) {
        if (G.players[w].psi < G.players[bestId].psi) bestId = w;
      }
      const winTeam = G.players[bestId].team.id;
      winnerCounts[winTeam] = (winnerCounts[winTeam] || 0) + 1;
      if (bestId === '0') jagsWins++;
      break;
    }
  }
  Math.random = origRandom;
}

console.log('Winner Counts across 100 games:');
console.log(Object.entries(winnerCounts).sort((a, b) => b[1] - a[1]));
console.log('Jags Wins:', jagsWins);
