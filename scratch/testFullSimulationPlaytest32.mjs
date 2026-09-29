import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

function simulateGame(teamIds, seed = 42) {
  // Simple Mulberry32 deterministic PRNG
  let s = seed >>> 0;
  const rng = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const numPlayers = teamIds.length;
  const G = DeflategateGame.setup({ ctx: { numPlayers }, random: { _random: rng } }, { numHumans: 0, vsCpu: true });
  
  teamIds.forEach((id, idx) => {
    const t = TEAMS.find(item => item.id === id);
    const p = G.players[String(idx)];
    p.team = t;
    p.psi = t.initialPsi;
    p.coins = t.coins;
    p.isCpu = true;
    p.genome = ACTIVE_TEAM_GENOMES[id];
  });

  // Run up to 10 rounds
  let winner = null;
  for (let r = 1; r <= 10 && !winner; r++) {
    G.board.round = r;
    G.board.firstPlayer = String((r - 1) % numPlayers);
    G.board.nominator = G.board.firstPlayer;

    // Reset round states
    Object.values(G.players).forEach(p => {
      p.hasWonAuction = false;
      p.cardsWonThisRound = 0;
    });

    // Pre-Auction Phase
    if (DeflategateGame.phases.preAuctionPhase?.onBegin) {
      DeflategateGame.phases.preAuctionPhase.onBegin({ G, events: {}, ctx: { numPlayers } });
    }

    // Run Auction Rounds
    let safety = 0;
    while (safety++ < 40 && Object.values(G.players).some(p => !p.hasWonAuction)) {
      const nominatorId = G.board.nominator;
      if (G.board.activeAuctionCardIndex === null) {
        const nomIdx = chooseCpuNominationCard(G, nominatorId);
        if (nomIdx === -1 || !G.board.auctionPlayers[nomIdx]) {
          // Pass nominator
          const eligible = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
          if (eligible.length === 0) break;
          const curIdx = eligible.indexOf(String(nominatorId));
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

      // Run bidding until 1 winner
      let bSafety = 0;
      while (bSafety++ < 30) {
        const eligible = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction && !G.board.passedAuctionPlayers.includes(id));
        if (eligible.length <= 1) {
          // Winner resolves
          const winId = G.board.highestBidder !== null ? G.board.highestBidder : eligible[0];
          const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
          if (winId && card) {
            const p = G.players[winId];
            p.coins = Math.max(0, p.coins - G.board.highestBid);
            p.hasWonAuction = true;
            p.lineup.push(card);
            G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
            G.board.activeAuctionCardIndex = null;
            G.board.highestBid = 0;
            G.board.highestBidder = null;
          }
          break;
        }

        // Next bidder acts
        const nextBidderId = eligible.find(id => id !== G.board.highestBidder);
        if (!nextBidderId) break;
        const bidDec = evaluateCpuAuctionBid(G, nextBidderId);
        if (bidDec.shouldBid && bidDec.bidAmount > G.board.highestBid) {
          G.board.highestBid = bidDec.bidAmount;
          G.board.highestBidder = nextBidderId;
          if (bidDec.isMaxBid) {
            // Instant resolution on max bid!
            const winId = nextBidderId;
            const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
            const p = G.players[winId];
            p.coins = Math.max(0, p.coins - G.board.highestBid);
            p.hasWonAuction = true;
            // Jets deflate 4 on max bid!
            if (p.team?.id === 'jets') p.psi = Math.max(0, p.psi - 4);
            p.lineup.push(card);
            G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
            G.board.activeAuctionCardIndex = null;
            G.board.highestBid = 0;
            G.board.highestBidder = null;
            break;
          }
        } else {
          G.board.passedAuctionPlayers.push(nextBidderId);
        }
      }
    }

    // Post-Auction Phase
    if (DeflategateGame.phases.postAuctionPhase?.onBegin) {
      DeflategateGame.phases.postAuctionPhase.onBegin({ G });
    }

    // Refresh Phase: Deflation & Coins
    Object.keys(G.players).forEach(id => {
      const p = G.players[id];
      // Basic refresh deflation
      let d = 0;
      let c = 0;
      p.lineup.forEach(card => {
        if (!card || card.broncosRoundAcquired === r) return;
        let dMult = 1;
        let cMult = 1;
        if (card.ramsDoubleToken) { dMult *= 2; cMult *= 2; }
        if (p.team?.id === '49ers' && p.coins < 5) dMult *= 2;
        card.effects?.forEach(eff => {
          if (eff.perRound && eff.type === 'deflate') d += eff.amount * dMult;
          if (eff.perRound && eff.type === 'coins' && p.team?.id !== 'browns') c += eff.amount * cMult;
        });
      });
      // Team specific passive passives
      if (p.team?.id === 'panthers') d += 2;
      if (p.team?.id === 'cowboys') c += 2;
      if (p.team?.id === 'browns' && r === 5) c += 30;

      p.psi = Math.max(0, p.psi - d);
      p.coins += c;
      if (p.psi <= 25) {
        if (!winner || p.psi < G.players[winner].psi) {
          winner = id;
        }
      }
    });

    if (winner) break;
  }

  // End of game evaluation
  if (!winner) {
    let minPsi = Infinity;
    Object.keys(G.players).forEach(id => {
      if (G.players[id].psi < minPsi) {
        minPsi = G.players[id].psi;
        winner = id;
      }
    });
  }

  return {
    winnerId: winner,
    winningTeam: G.players[winner]?.team?.id || 'unknown',
    winningPsi: G.players[winner]?.psi,
    roundsPlayed: G.board.round
  };
}

console.log("=== RUNNING MULTI-TABLE SIMULATION ACROSS 4P, 7P, 10P ===");

const tableConfigs = [
  { name: '4-Player Tables', count: 4, pool: ['rams', 'jets', 'lions', '49ers'] },
  { name: '7-Player Tables', count: 7, pool: ['rams', 'jets', 'lions', '49ers', 'steelers', 'chiefs', 'bills'] },
  { name: '10-Player Tables', count: 10, pool: ['rams', 'jets', 'lions', '49ers', 'steelers', 'chiefs', 'bills', 'bears', 'browns', 'patriots'] }
];

for (const cfg of tableConfigs) {
  console.log(`\n--- Simulating 20 games on ${cfg.name} ---`);
  const wins = {};
  cfg.pool.forEach(t => wins[t] = 0);
  let totalRounds = 0;

  for (let g = 0; g < 20; g++) {
    const res = simulateGame(cfg.pool, 1000 + g * 37);
    wins[res.winningTeam] = (wins[res.winningTeam] || 0) + 1;
    totalRounds += res.roundsPlayed;
  }

  console.log(`Avg Game Length: ${(totalRounds / 20).toFixed(1)} rounds`);
  console.log("Win Distribution:");
  Object.entries(wins)
    .sort((a, b) => b[1] - a[1])
    .forEach(([team, count]) => {
      const pct = ((count / 20) * 100).toFixed(0);
      console.log(`  ${team.padEnd(12)}: ${count} wins (${pct}%)`);
    });
}

console.log("\n=== SIMULATION COMPLETE ===");
