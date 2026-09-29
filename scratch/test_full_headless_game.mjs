import { Client } from 'boardgame.io/dist/cjs/client.js';
import { DeflategateGame } from '../src/Game.js';

console.log('Testing full 10-round headless game execution...');
const startTime = Date.now();

const client = Client({
  game: DeflategateGame,
  numPlayers: 4,
  setupData: { numHumans: 0 }
});
client.start();
client.moves.setNumHumans(0);

let state = client.getState();
console.log('Initial Players isCpu:', Object.keys(state.G.players).map(id => [id, state.G.players[id].isCpu]));

// Step function to advance the game automatically
function stepAuto() {
  state = client.getState();
  if (state.ctx.gameover) return false;

  const phase = state.ctx.phase;

  // Dismiss any fly animation immediately in headless mode
  if (state.G.board.cardWonFlyAnimation) {
    client.moves.dismissCardWonFlyAnimation();
    state = client.getState();
    return true;
  }

  // Handle pending replacement for CPU
  if (state.G.pendingReplacement) {
    const pId = state.G.pendingReplacement.playerID;
    const p = state.G.players[pId];
    if (p && p.lineup.length > 0) {
      // replace practice squad or lowest card
      let worstIdx = 0;
      let worstScore = Infinity;
      p.lineup.forEach((c, idx) => {
        let score = c.isPracticeSquad ? -10 : (c.effects ? c.effects.reduce((a, e) => a + (e.amount || 0), 0) : 0);
        if (score < worstScore) {
          worstScore = score;
          worstIdx = idx;
        }
      });
      client.moves.confirmReplacement(worstIdx, pId);
    } else {
      client.moves.confirmReplacement(0, pId);
    }
    state = client.getState();
    return true;
  }

  if (phase === 'teamSelection') {
    for (let i = 0; i < 4; i++) {
      if (!state.G.players[i.toString()].team) {
        client.moves.selectTeam(0, i.toString());
        state = client.getState();
      }
    }
    return true;
  }

  if (phase === 'buccaneersCopy') {
    const bucsId = Object.keys(state.G.players).find(id => state.G.players[id].team?.id === 'buccaneers');
    if (bucsId) {
      const otherTeam = Object.values(state.G.players).find(p => p.team?.id !== 'buccaneers')?.team;
      if (otherTeam) client.moves.copyAbility(otherTeam.id, bucsId);
    }
    state = client.getState();
    return true;
  }

  if (phase === 'titansDraft') {
    client.moves.titansPickCard(0);
    state = client.getState();
    return true;
  }

  if (phase === 'eventPhase') {
    if (state.G.board.pendingRivalry) {
      // Process rivalry
      const giverId = state.G.board.pendingRivalry.currentGiverId;
      const targetId = Object.keys(state.G.players).find(id => id !== giverId) || '1';
      client.moves.rivalryGivePsi(targetId, giverId);
    } else if (state.G.board.pendingTradeRumors) {
      // Trade rumors pick card
      Object.keys(state.G.players).forEach(id => {
        if (!state.G.board.pendingTradeRumors.picks?.[id]) {
          client.moves.tradeRumorsPickCard(0, id);
        }
      });
    } else if (state.G.board.tradeRumorsSummary) {
      client.moves.dismissTradeRumorsSummary();
    } else if (state.G.board.pendingFreeAgency) {
      client.moves.freeAgencyPass();
    } else if (state.G.board.pendingNewCapLimit) {
      client.moves.passPracticeSquad();
    } else if (!state.G.board.eventConfirmed) {
      client.moves.confirmEventReveal();
    }
    state = client.getState();
    return true;
  }

  if (phase === 'preAuctionPhase') {
    // Check pending preAuction queues
    if (state.G.board.pendingChiefs) {
      client.moves.chiefsPass();
    }
    if (state.G.board.pendingRaiders) {
      client.moves.passRaiders();
    }
    if (state.G.board.pendingCardinals) {
      client.moves.passCardinals();
    }
    if (state.G.board.pendingCommanders) {
      client.moves.passCommanders();
    }
    state = client.getState();
    return true;
  }

  if (phase === 'auctionPhase') {
    client.moves.stepCpuTurn();
    state = client.getState();
    if (state.G.board.cardWonFlyAnimation) {
      client.moves.dismissCardWonFlyAnimation();
      state = client.getState();
    }
    return true;
  }

  if (phase === 'postAuctionPhase') {
    if (state.G.board.pendingBills) {
      client.moves.passBills();
    }
    if (state.G.board.pendingEagles) {
      client.moves.passEagles();
    }
    client.moves.proceedToRefresh();
    state = client.getState();
    return true;
  }

  if (phase === 'refreshPhase') {
    if (state.G.board.pendingPukaChoice) {
      client.moves.confirmPukaChoice(0);
    }
    client.moves.confirmRefreshSummary();
    state = client.getState();
    return true;
  }

  return false;
}

let loopCount = 0;
while (!state.ctx.gameover && loopCount < 2000) {
  const stepped = stepAuto();
  state = client.getState();
  loopCount++;
  if (!stepped) {
    console.log('stepAuto returned false! Stalled at:', {
      phase: state.ctx.phase,
      round: state.G.board.round,
      board: {
        activeAuctionCardIndex: state.G.board.activeAuctionCardIndex,
        highestBidder: state.G.board.highestBidder,
        passed: state.G.board.passedAuctionPlayers
      },
      pendingReplacement: state.G.pendingReplacement
    });
    break;
  }
}

state = client.getState();
console.log(`\n🎉 GAME COMPLETED in ${Date.now() - startTime}ms after ${loopCount} steps!`);
console.log('Final Round:', state.G.board.round);
console.log('Winner:', state.ctx.gameover?.winner ? `Player ${parseInt(state.ctx.gameover.winner) + 1} (${state.G.players[state.ctx.gameover.winner]?.team?.name})` : 'None');
console.log('Final Standings:');
Object.keys(state.G.players).forEach(id => {
  const p = state.G.players[id];
  console.log(`  Player ${parseInt(id) + 1} (${p.team?.name}): PSI = ${p.psi}, Coins = ${p.coins}, Lineup = ${p.lineup?.length} players`);
});

process.exit(0);
