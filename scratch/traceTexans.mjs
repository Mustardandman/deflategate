import { DeflategateGame, evaluateCpuAuctionBid, chooseCpuNominationCard, resolveAuctionWin } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';
import { ACTIVE_TEAM_GENOMES, DEFAULT_GENOME } from '../src/ai/teamGenomes.js';
import { mulberry32, fisherYates } from './testTexansBenchmark.mjs';

function runTrace(seed = 40000) {
  const rng = mulberry32(seed);
  Math.random = rng;
  const numPlayers = 7;
  const G = DeflategateGame.setup(
    { ctx: { numPlayers }, random: { _random: rng, Shuffle: (a) => fisherYates(a, rng) } },
    { numHumans: 0, vsCpu: true }
  );
  const availableTeams = fisherYates(TEAMS.filter(t => t.id !== 'texans').map(t => t.id), rng);
  for (let i = 0; i < numPlayers; i++) {
    const seat = String(i);
    const teamId = (i === 0) ? 'texans' : availableTeams[i - 1];
    const t = TEAMS.find(item => item.id === teamId);
    const p = G.players[seat];
    p.team = t;
    p.psi = t.initialPsi;
    p.coins = t.coins;
    p.isCpu = true;
    p.genome = ACTIVE_TEAM_GENOMES[t.id] || DEFAULT_GENOME;
  }
  const texans = G.players['0'];
  console.log(`\n=================== TRACE GAME (Seed ${seed}) ===================`);
  for (let r = 1; r <= 8; r++) {
    G.board.round = r;
    G.board.firstPlayer = String((r - 1) % numPlayers);
    G.board.nominator = G.board.firstPlayer;
    Object.values(G.players).forEach(p => { p.hasWonAuction = false; p.cardsWonThisRound = 0; });
    DeflategateGame.phases.preAuctionPhase?.onBegin?.({ G, ctx: { numPlayers }, events: {} });
    
    const boardQBs = G.board.auctionPlayers.filter(c => c && c.position === 'QB').map(c => c.name);
    console.log(`\n--- ROUND ${r} (Texans coins: ${texans.coins}, PSI: ${texans.psi}) ---`);
    console.log(`  Board QBs: [${boardQBs.join(', ')}]`);
    console.log(`  Texans Lineup before auction:`, texans.lineup.map(c => `${c.name} (${c.position})`));
    
    while (Object.values(G.players).some(p => (p.cardsWonThisRound || 0) < 1)) {
      const remaining = G.board.auctionPlayers.filter(c => c !== null);
      if (remaining.length === 0) break;
      const nom = chooseCpuNominationCard(G, G.board.nominator);
      const cardIdx = (nom !== null && G.board.auctionPlayers[nom]) ? nom : G.board.auctionPlayers.findIndex(c => c !== null);
      if (cardIdx === -1) break;
      G.board.activeAuctionCardIndex = cardIdx;
      const card = G.board.auctionPlayers[cardIdx];
      G.board.highestBid = card.minBid;
      G.board.highestBidder = G.board.nominator;
      G.board.passedAuctionPlayers = [];
      
      let currentBidderIdx = (Number(G.board.highestBidder) + 1) % numPlayers;
      let safety = 0;
      while (safety++ < 50) {
        const bidderId = String(currentBidderIdx);
        currentBidderIdx = (currentBidderIdx + 1) % numPlayers;
        if (G.board.passedAuctionPlayers.includes(bidderId) || G.players[bidderId].cardsWonThisRound >= 1 || bidderId === G.board.highestBidder) continue;
        const eligible = Object.keys(G.players).filter(id => !G.board.passedAuctionPlayers.includes(id) && G.players[id].cardsWonThisRound < 1 && G.players[id].coins >= (G.board.highestBid + 1));
        if (eligible.length === 0) break;
        const dec = evaluateCpuAuctionBid(G, bidderId);
        if (bidderId === '0') {
          console.log(`    Texans bid eval on ${card.name} (${card.position}): shouldBid=${dec.shouldBid} amt=${dec.bidAmount} (highBid=${G.board.highestBid}, highBidder=${G.board.highestBidder})`);
        }
        if (dec.shouldBid && dec.bidAmount > G.board.highestBid && dec.bidAmount <= G.players[bidderId].coins) {
          G.board.highestBid = dec.bidAmount;
          G.board.highestBidder = bidderId;
        } else {
          G.board.passedAuctionPlayers.push(bidderId);
        }
      }
      const winner = G.board.highestBidder;
      const wonCard = G.board.auctionPlayers[G.board.activeAuctionCardIndex];
      if (winner === '0' || wonCard.position === 'QB') {
        console.log(`  >>> Card ${wonCard.name} (${wonCard.position}) WON by Player ${winner} (${G.players[winner].team.name}) for ${G.board.highestBid} coins`);
      }
      resolveAuctionWin(G, winner, wonCard, G.board.highestBid);
      G.board.auctionPlayers[G.board.activeAuctionCardIndex] = null;
      G.board.activeAuctionCardIndex = null;
      G.board.highestBid = 0;
      G.board.highestBidder = null;
      G.board.passedAuctionPlayers = [];
    }
    console.log(`  Texans Lineup after auction:`, texans.lineup.map(c => `${c.name} (${c.position})`));
    DeflategateGame.phases.refreshPhase?.onBegin?.({ G, ctx: { numPlayers }, events: {} });
    console.log(`  After Refresh: Texans coins: ${texans.coins}, PSI: ${texans.psi}`);
    if (texans.psi <= 0) {
      console.log(`  *** TEXANS WON IN ROUND ${r}! ***`);
      break;
    }
  }
}

runTrace(40000);
runTrace(40001);
