import { DeflategateGame, chooseCpuNominationCard, evaluateCpuAuctionBid, resolveAuctionWin, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS, PRACTICE_SQUAD_CARD } from '../src/GameData.js';
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

function runSimulation(genomeOverride, gamesCount = 100, numPlayers = 7, baseSeed = 54321) {
  let cowboysWins = 0;
  let totalFinalPsi = 0;
  let totalRounds = 0;

  for (let g = 0; g < gamesCount; g++) {
    const rng = mulberry32(baseSeed + g * 101 + numPlayers * 19);
    const origRandom = Math.random;
    Math.random = rng;

    const G = DeflategateGame.setup(
      { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
      { numHumans: 0, vsCpu: true }
    );

    const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'cowboys'), rng);
    const cowboysTeam = TEAMS.find(t => t.id === 'cowboys');

    G.players['0'].team = { ...cowboysTeam };
    G.players['0'].psi = cowboysTeam.initialPsi;
    G.players['0'].coins = cowboysTeam.coins;
    G.players['0'].isCpu = true;
    G.players['0'].genome = { 
      ...(ACTIVE_TEAM_GENOMES.cowboys || DEFAULT_GENOME),
      ...genomeOverride
    };
    G.players['0'].lineup = [];
    for (let ps = 0; ps < 3; ps++) {
      G.players['0'].lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_0_${ps}` });
    }

    for (let i = 1; i < numPlayers; i++) {
      const seat = String(i);
      const t = availableTeams[i - 1];
      const p = G.players[seat];
      p.team = { ...t };
      p.psi = t.initialPsi;
      p.coins = t.coins;
      p.isCpu = true;
      p.genome = { ...(ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME) };
      p.lineup = [];
      for (let ps = 0; ps < 3; ps++) {
        p.lineup.push({ ...PRACTICE_SQUAD_CARD, uniqueId: `ps_${seat}_${ps}` });
      }
    }

    let winner = null;
    let roundLimit = 12;

    while (G.board.round <= roundLimit && !winner) {
      if (DeflategateGame.phases.eventPhase?.onBegin) {
        DeflategateGame.phases.eventPhase.onBegin({
          G,
          ctx: { numPlayers },
          random: { Shuffle: (a) => fisherYates(a, rng) }
        });
      }
      G.board.eventConfirmed = true;

      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi <= 0) {
          winner = String(p);
          break;
        }
      }
      if (winner) break;

      // Populate board
      G.board.auctionPlayers = [];
      for (let c = 0; c < numPlayers; c++) {
        if (G.decks.activePlayers.length > 0) {
          G.board.auctionPlayers.push(G.decks.activePlayers.pop());
        }
      }

      const maxWinsThisRound = 1;
      Object.values(G.players).forEach(p => { p.cardsWonThisRound = 0; p.hasWonAuction = false; });
      G.board.activeAuctionCardIndex = null;
      G.board.highestBid = 0;
      G.board.highestBidder = null;
      G.board.passedAuctionPlayers = [];

      let auctionSafety = 0;
      while (auctionSafety++ < 50 && Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < maxWinsThisRound)) {
        const remainingBoardCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
        if (remainingBoardCards === 0) break;

        const nominatorId = String(G.board.nominator);
        let nomCardIdx = chooseCpuNominationCard(G, nominatorId);
        if (nomCardIdx === null || nomCardIdx === undefined || !G.board.auctionPlayers[nomCardIdx]) {
          nomCardIdx = G.board.auctionPlayers.findIndex(c => c !== null);
          if (nomCardIdx === -1) break;
        }

        G.board.activeAuctionCardIndex = nomCardIdx;
        const activeCard = G.board.auctionPlayers[nomCardIdx];
        G.board.highestBid = activeCard.minBid;
        G.board.highestBidder = nominatorId;
        G.board.passedAuctionPlayers = [];

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
        }

        G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
        G.board.activeAuctionCardIndex = null;
        G.board.highestBid = 0;
        G.board.highestBidder = null;
        G.board.nominator = (Number(nominatorId) + 1) % numPlayers;
      }

      // Refresh Phase
      if (DeflategateGame.phases.refreshPhase?.onBegin) {
        DeflategateGame.phases.refreshPhase.onBegin({ G });
      }

      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi <= 0) {
          winner = String(p);
          break;
        }
      }
      if (winner) break;

      G.board.round++;
    }

    if (!winner) {
      let lowestPsi = Infinity;
      let lowestPlayer = '0';
      for (let p = 0; p < numPlayers; p++) {
        if (G.players[String(p)].psi < lowestPsi) {
          lowestPsi = G.players[String(p)].psi;
          lowestPlayer = String(p);
        }
      }
      winner = lowestPlayer;
    }

    if (winner === '0') cowboysWins++;
    totalFinalPsi += G.players['0'].psi;
    totalRounds += G.board.round;
    Math.random = origRandom;
  }

  return {
    winRate: (cowboysWins / gamesCount) * 100,
    avgFinalPsi: (totalFinalPsi / gamesCount).toFixed(2),
    avgRounds: (totalRounds / gamesCount).toFixed(1)
  };
}

async function runGrid() {
  console.log('========================================================================');
  console.log('COWBOYS FINE-TUNING GRID SEARCH');
  console.log('========================================================================\n');

  const candidates = [
    { deflateWeight: 1.8, coinWeight: 0.7, label: 'Baseline (1.8 def, 0.7 coin)' },
    { deflateWeight: 2.0, coinWeight: 0.7, label: 'Deflate Boost (2.0 def, 0.7 coin)' },
    { deflateWeight: 2.2, coinWeight: 0.7, label: 'Deflate High (2.2 def, 0.7 coin)' },
    { deflateWeight: 2.4, coinWeight: 0.7, label: 'Deflate Ultra (2.4 def, 0.7 coin)' },
    { deflateWeight: 2.0, coinWeight: 0.5, label: 'Purse Lean (2.0 def, 0.5 coin)' },
    { deflateWeight: 2.2, coinWeight: 0.5, label: 'Purse Lean High (2.2 def, 0.5 coin)' },
    { deflateWeight: 2.2, coinWeight: 0.6, label: 'Sweet Spot A (2.2 def, 0.6 coin)' },
    { deflateWeight: 2.0, coinWeight: 0.6, label: 'Sweet Spot B (2.0 def, 0.6 coin)' },
    { deflateWeight: 2.4, coinWeight: 0.6, label: 'Sweet Spot C (2.4 def, 0.6 coin)' },
    { deflateWeight: 1.8, coinWeight: 0.5, label: 'Low Coin (1.8 def, 0.5 coin)' }
  ];

  const results = [];

  for (const c of candidates) {
    const res7P = runSimulation(c, 100, 7);
    const res4P = runSimulation(c, 100, 4);
    const res10P = runSimulation(c, 100, 10);

    const compositeScore = (res4P.winRate / 25.0) + (res7P.winRate / 14.3) + (res10P.winRate / 10.0);

    results.push({
      candidate: c,
      res4P,
      res7P,
      res10P,
      compositeScore
    });

    console.log(`[${c.label}]`);
    console.log(`  4P  WinRate: ${res4P.winRate.toFixed(1)}% | Final PSI: ${res4P.avgFinalPsi} (Fair: 25.0%)`);
    console.log(`  7P  WinRate: ${res7P.winRate.toFixed(1)}% | Final PSI: ${res7P.avgFinalPsi} (Fair: 14.3%)`);
    console.log(`  10P WinRate: ${res10P.winRate.toFixed(1)}% | Final PSI: ${res10P.avgFinalPsi} (Fair: 10.0%)`);
    console.log(`  Composite Multiplier vs Fair: ${(compositeScore / 3).toFixed(2)}x\n`);
  }

  results.sort((a, b) => b.compositeScore - a.compositeScore);

  console.log('========================================================================');
  console.log('TOP RANKED CANDIDATES');
  console.log('========================================================================');
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.candidate.label} -> Composite: ${(r.compositeScore / 3).toFixed(2)}x | 4P: ${r.res4P.winRate.toFixed(1)}% | 7P: ${r.res7P.winRate.toFixed(1)}% | 10P: ${r.res10P.winRate.toFixed(1)}% | Avg PSI: (4P:${r.res4P.avgFinalPsi}, 7P:${r.res7P.avgFinalPsi}, 10P:${r.res10P.avgFinalPsi})`);
  });
}

runGrid();
