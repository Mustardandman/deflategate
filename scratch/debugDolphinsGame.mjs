import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin, calculateRefreshResults, getEffectiveCardMaxBid, scoreCardForPlayer } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './testDolphinsBenchmark.mjs';

function debugGame(seed, numPlayers = 7) {
  const rng = mulberry32(seed);
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

  const dolph = G.players['0'];
  console.log(`\n=================== GAME SEED ${seed} (Dolphins Start: ${dolph.psi} PSI, ${dolph.coins} Coins) ===================`);

  for (let r = 1; r <= 10; r++) {
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

    console.log(`\n--- ROUND ${r} --- [Dolphins: ${dolph.psi} PSI, ${dolph.coins} Coins] Event: ${G.board.activeEvent?.name || 'None'}`);

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
        if (nominatorId === '0') {
          console.log(`  🐬 Dolphins NOMINATED: ${nominatedCard.name} (min: ${nominatedCard.minBid}, max: ${nominatedCard.maxBid})`);
        }
      }

      const card = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
      if (!card) break;

      let biddingSafety = 0;
      while (biddingSafety++ < 40) {
        const eligibleBidders = Object.keys(G.players).filter(id => (G.players[id].cardsWonThisRound || 0) < maxWinsThisRound);
        const activeBidders = eligibleBidders.filter(id => !G.board.passedAuctionPlayers?.includes(id));
        if (activeBidders.length <= 1) {
          const winPlayerId = G.board.highestBidder || activeBidders[0] || nominatorId;
          const prevCoins = G.players[winPlayerId].coins;
          resolveAuctionWin(G, winPlayerId, card);
          if (winPlayerId === '0') {
            console.log(`  🐬 Dolphins WON ${card.name} for ${G.board.highestBid} coins! (Coins: ${prevCoins} -> ${dolph.coins}, Bailout: ${dolph.dolphinsTriggered})`);
            dolph.dolphinsTriggered = false;
          }
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
            if (bidderId === '0') {
              console.log(`    🐬 Dolphins BID ${bidDecision.bidAmount} on ${card.name} (High was ${G.board.highestBid}, Jump: ${bidDecision.isJumpBid || false})`);
            }
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
          const prevCoins = G.players[winPlayerId].coins;
          resolveAuctionWin(G, winPlayerId, card);
          if (winPlayerId === '0') {
            console.log(`  🐬 Dolphins WON ${card.name} for ${G.board.highestBid} coins! (Coins: ${prevCoins} -> ${dolph.coins}, Bailout: ${dolph.dolphinsTriggered})`);
            dolph.dolphinsTriggered = false;
          }
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

    console.log(`  End of Round ${r}: Dolphins has ${dolph.psi} PSI, ${dolph.coins} Coins. Lineup: [${(dolph.lineup || []).map(c => c.name).join(', ')}]`);

    const winners = Object.keys(G.players).filter(id => G.players[id].psi <= 0);
    if (winners.length > 0) {
      console.log(`🎉 GAME OVER in Round ${r}! Winner: Player ${winners[0]} (${G.players[winners[0]].team.name})`);
      return;
    }
  }
}

debugGame(2026);
