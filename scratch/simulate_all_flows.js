import { DeflategateGame, resolveAuctionWin, getEffectiveTeamId } from '../src/Game.js';
import { TEAMS } from '../src/GameData.js';

console.log('=== SIMULATING FULL MULTI-PHASE ABILITY FLOWS ===');

const createGame = () => {
  return DeflategateGame.setup({
    ctx: { numPlayers: 4 },
    random: { Shuffle: arr => [...arr] }
  });
};

// SIM 1: Titans Draft Flow
{
  const G = createGame();
  const titansTeam = TEAMS.find(t => t.id === 'titans');
  G.players['0'].teamChoices = [titansTeam];

  // 1. Select Team
  DeflategateGame.phases.teamSelection.moves.selectTeam({ G, playerID: '0', events: { endPhase: () => {} } }, 0);
  console.assert(G.players['0'].team.id === 'titans', 'Titans selected');

  // 2. Buccaneers Phase (CPU or skipped)
  DeflategateGame.phases.buccaneersCopy.onBegin({ G, events: { endPhase: () => {} } });

  // 3. Titans Draft Phase
  let endPhaseCalled = false;
  DeflategateGame.phases.titansDraft.onBegin({ G, events: { endPhase: () => { endPhaseCalled = true; } } });
  console.assert(G.board.pendingTitansDraft !== null, 'pendingTitansDraft is active for human Titans');
  console.assert(G.board.pendingTitansDraft.cards.length === 3, 'Draft has 3 cards');

  // Human drafts card 1
  const draftedCard = G.board.pendingTitansDraft.cards[1];
  DeflategateGame.phases.titansDraft.moves.titansPickCard({ G, playerID: '0', events: { endPhase: () => { endPhaseCalled = true; } } }, 1);
  console.assert(G.board.pendingTitansDraft === null, 'pendingTitansDraft cleared');
  console.assert(G.board.titansDraftComplete === true, 'titansDraftComplete is true');
  console.assert(G.players['0'].lineup.some(c => c.name === draftedCard.name), 'Drafted card is in Titans lineup');
  console.log('✔ Simulation 1: Titans Opening Draft Flow PASSED');
}

// SIM 2: Chiefs "Use Ability" Pre-Auction Flow
{
  const G = createGame();
  const chiefsTeam = TEAMS.find(t => t.id === 'chiefs');
  G.players['0'].team = chiefsTeam;
  G.players['0'].coins = 15;
  G.players['1'].team = TEAMS.find(t => t.id === 'patriots');
  G.players['2'].team = TEAMS.find(t => t.id === 'jets');
  G.players['3'].team = TEAMS.find(t => t.id === 'bills');

  // Run Pre-Auction onBegin
  DeflategateGame.phases.preAuctionPhase.onBegin({
    G,
    ctx: { numPlayers: 4 },
    events: { endPhase: () => {} }
  });

  console.assert(G.board.pendingChiefs !== null, 'pendingChiefs active for human Chiefs');
  console.assert(G.board.auctionPlayers.length === 4, 'Auction has 4 cards');

  // Human uses ability to claim card index 0
  const claimedCard = G.board.auctionPlayers[0];
  const initialCoins = G.players['0'].coins;
  DeflategateGame.phases.preAuctionPhase.moves.chiefsClaimCard({
    G,
    playerID: '0',
    events: { endPhase: () => {} }
  }, 0);

  console.assert(G.players['0'].hasUsedChiefsAbility === true, 'Chiefs ability marked used');
  console.assert(G.players['0'].hasWonAuction === true, 'Chiefs marked as won auction');
  console.assert(G.players['0'].coins === initialCoins - claimedCard.minBid, 'Deducted minBid coins');
  console.assert(G.board.pendingChiefs === null, 'pendingChiefs cleared');
  console.assert(G.board.preAuctionComplete === true, 'preAuctionComplete is true');
  console.log('✔ Simulation 2: Chiefs Pre-Auction Use Ability Flow PASSED');
}

// SIM 3: Falcons Mulligan Flow
{
  const G = createGame();
  const falconsTeam = TEAMS.find(t => t.id === 'falcons');
  G.players['0'].team = falconsTeam;
  G.board.nominator = '0';
  G.board.round = 1;
  G.board.auctionPlayers = [
    { name: 'Old Card 1', minBid: 1 },
    { name: 'Old Card 2', minBid: 1 }
  ];

  DeflategateGame.phases.auctionPhase.moves.falconsMulligan({ G, playerID: '0' });
  console.assert(G.players['0'].falconsPhaseUses.p1 === true, 'Falcons phase 1 mulligan marked used');
  console.assert(G.decks.discard.some(c => c.name === 'Old Card 1'), 'Old cards moved to discard');
  console.log('✔ Simulation 3: Falcons Mulligan Flow PASSED');
}

// SIM 4: Bills Post-Auction Discard Market Flow
{
  const G = createGame();
  const billsTeam = TEAMS.find(t => t.id === 'bills');
  G.players['0'].team = billsTeam;
  G.players['0'].coins = 10;
  G.decks.discard = [
    { name: 'Discarded Star', minBid: 3, maxBid: 8, effects: [{ type: 'coins', amount: 2, perRound: true }] }
  ];

  DeflategateGame.phases.postAuctionPhase.onBegin({
    G,
    events: { endPhase: () => {} }
  });

  console.assert(G.board.pendingBills !== null, 'pendingBills active for human Bills');

  // Buy discarded card
  DeflategateGame.phases.postAuctionPhase.moves.billsBuyDiscard({
    G,
    playerID: '0',
    events: { endPhase: () => {} }
  }, 0);

  console.assert(G.players['0'].hasUsedBillsAbility === true, 'Bills ability marked used');
  console.assert(G.players['0'].coins === 7, 'Deducted 3 coins');
  console.assert(G.decks.discard.length === 0, 'Card removed from discard pile');
  console.assert(G.players['0'].lineup.some(c => c.name === 'Discarded Star'), 'Card added to Bills lineup');
  console.log('✔ Simulation 4: Bills Post-Auction Market Flow PASSED');
}

// SIM 5: Eagles Post-Auction Inflation Flow
{
  const G = createGame();
  const eaglesTeam = TEAMS.find(t => t.id === 'eagles');
  G.players['0'].team = eaglesTeam;
  G.players['0'].coins = 10;
  G.players['1'].team = TEAMS.find(t => t.id === 'patriots');
  G.players['1'].psi = 40;
  G.players['2'].team = TEAMS.find(t => t.id === 'saints');
  G.players['2'].psi = 42;
  G.board.round = 1;

  DeflategateGame.phases.postAuctionPhase.onBegin({
    G,
    events: { endPhase: () => {} }
  });

  console.assert(G.board.pendingEagles !== null, 'pendingEagles active for human Eagles');

  // Use ability 1st time
  DeflategateGame.phases.postAuctionPhase.moves.eaglesInflate({
    G,
    playerID: '0',
    events: { endPhase: () => {} }
  });

  console.assert(G.players['0'].coins === 7, 'Deducted 3 coins (now 7)');
  console.assert(G.players['1'].psi === 43, 'Patriots opponent inflated +3 PSI (now 43)');
  console.assert(G.players['2'].psi === 42, 'Saints opponent immune (remains 42)');
  console.assert(G.players['0'].eaglesUsedCount === 1, 'Used count is 1');

  // Use ability 2nd time
  DeflategateGame.phases.postAuctionPhase.moves.eaglesInflate({
    G,
    playerID: '0',
    events: { endPhase: () => {} }
  });

  console.assert(G.players['0'].coins === 4, 'Deducted 3 coins (now 4)');
  console.assert(G.players['1'].psi === 46, 'Patriots opponent inflated +3 PSI (now 46)');
  console.assert(G.players['0'].eaglesUsedCount === 2, 'Used count reached max 2');
  console.assert(G.board.pendingEagles === null, 'pendingEagles cleared after 2 uses');
  console.log('✔ Simulation 5: Eagles Post-Auction Inflation Flow PASSED');
}

console.log('\n🌟 ALL 5 INTERACTIVE FLOW SIMULATIONS PASSED! 🌟\n');
