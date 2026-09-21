import React, { useState, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { Local, SocketIO } from 'boardgame.io/multiplayer';
import { DeflategateGame, getEffectiveTeamId, getEffectiveCardMaxBid } from './Game';
import { TEAMS } from './GameData';

// Comprehensive Deflategate Rules & Guide Modal
const RulesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('goal');
  if (!isOpen) return null;

  const tabs = [
    { id: 'goal', label: 'Goal & Victory', icon: '🏆' },
    { id: 'phases', label: 'Round Flow', icon: '🔄' },
    { id: 'symbols', label: 'Card Symbols', icon: '🎴' },
    { id: 'phases_era', label: 'Phases', icon: '⏳' },
    { id: 'bidding', label: 'Bidding Rules', icon: '💰' }
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-indigo-500/80 p-5 sm:p-7 rounded-3xl max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl">📖</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 uppercase tracking-wide">
                Deflategate Official Guide & Rules
              </h2>
              <p className="text-xs text-slate-400">Master the auction, manage your cap, and deflate your ball to victory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-black text-xl p-2 cursor-pointer transition-colors"
            title="Close Guide"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs - Hidden scrollbar while allowing smooth swipe/scroll */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 border-b border-slate-800/80 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs sm:text-sm text-slate-300">
          {activeTab === 'goal' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-950/40 to-purple-950/40 border border-blue-500/40 p-4 rounded-2xl">
                <h3 className="text-base font-black text-blue-300 uppercase tracking-wide flex items-center gap-2 mb-1">
                  <span>🎯</span> The Primary Objective
                </h3>
                <p className="leading-relaxed">
                  You are the General Manager of an NFL franchise competing in the high-stakes world of ball manipulation. Every franchise starts with a regulation football with a starting PSI determined by the team you select. Your goal is to <strong className="text-amber-400">deflate your ball down to 0 PSI</strong>!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    <span>⚡</span> Instant Knockout Victory
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The very instant any team's PSI reaches <strong className="text-emerald-400">0 PSI</strong> (or below), the game ends immediately and that franchise is crowned Champion!
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-black uppercase text-yellow-400 flex items-center gap-1.5">
                    <span>⏱️</span> 10-Round Final Whistle
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If no team reaches 0 PSI by the end of Round 10, the team with the <strong className="text-yellow-400">Lowest Total PSI</strong> wins the game!
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black uppercase text-purple-300 flex items-center gap-1.5">
                  <span>⚖️</span> Official Tiebreaker Rules
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1">
                  <li><strong className="text-slate-200">Most Remaining Coins</strong> wins the tiebreaker.</li>
                  <li>If still tied, the team with the <strong className="text-slate-200">Highest Total Roster Acquisition Value</strong> wins.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'phases' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 italic">
                Each of the 10 game rounds is played across four distinct sequential phases:
              </p>

              <div className="space-y-2.5">
                <div className="bg-slate-950 border border-purple-800/60 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-900/80 text-purple-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-purple-700">Phase 1</span>
                    <h4 className="text-sm font-black text-purple-300 uppercase">Event Phase</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    An event card is drawn from the event deck that will alter the game in some way that round.
                  </p>
                </div>

                <div className="bg-slate-950 border border-amber-800/60 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-900/80 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-700">Phase 2</span>
                    <h4 className="text-sm font-black text-amber-300 uppercase">Pre-Auction Phase</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    New auction player cards for the round are revealed.
                  </p>
                </div>

                <div className="bg-slate-950 border border-blue-800/60 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-900/80 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-blue-700">Phase 3</span>
                    <h4 className="text-sm font-black text-blue-300 uppercase">Auction Phase</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Teams bid on revealed players until each team has acquired 1 new player.
                  </p>
                </div>

                <div className="bg-slate-950 border border-emerald-800/60 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-emerald-900/80 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-emerald-700">Phase 4</span>
                    <h4 className="text-sm font-black text-emerald-300 uppercase">Refresh Phase</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Teams collect all their end of round (🔄) bonuses which usually involve collecting coins and deflating PSI. The round counter advances and the First Player rotates clockwise.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'symbols' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 italic">
                Pay close attention to card icons when bidding—timing is everything!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-950 border-2 border-amber-500/50 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h4 className="text-sm font-black text-amber-400 uppercase">Lightning Bolt: Instant Effect</h4>
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-1.5 py-0.2 rounded font-mono font-bold uppercase">Triggers on Buy</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Triggers <strong className="text-white">immediately and only once</strong> at the exact moment you win or acquire the card in the auction!
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    ⚡ Instant effects do <strong className="text-amber-300">NOT</strong> repeat during the end-of-round Refresh Phase.
                  </p>
                </div>

                <div className="bg-slate-950 border-2 border-emerald-500/50 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <h4 className="text-sm font-black text-emerald-400 uppercase">Recurring Arrow: Refresh Effect</h4>
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.2 rounded font-mono font-bold uppercase">Triggers Every Round</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Triggers <strong className="text-white">at the end of every round</strong> during the Refresh Phase, for as long as this player stays in your Active Lineup!
                  </p>
                  <p className="text-[11px] text-slate-400 italic">
                    🔄 Generates recurring coin revenue and steady per-round PSI deflation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phases_era' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/40 p-3.5 rounded-2xl">
                <p className="text-xs sm:text-sm font-bold text-blue-200">
                  Better cards will be shuffled into the player deck throughout the game.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-950 border border-blue-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900/80 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-blue-600">Beginning of the game</span>
                      <h4 className="text-sm font-black text-blue-400 uppercase">Phase 1</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Budget-friendly starters, steady baseline coin generators, and consistent single-point deflators. Essential for building your early economic engine.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-purple-500/50 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-purple-900/80 text-purple-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-purple-600">Enters round 4</span>
                      <h4 className="text-sm font-black text-purple-400 uppercase">Phase 2</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      Pro-bowl caliber stars with multi-point deflation swings, heavy instant burst rewards, and advanced roster synergies.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 border border-amber-500/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">Enters round 7</span>
                      <h4 className="text-sm font-black text-amber-300 uppercase">Hall of Fame</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      All-time NFL greats and legendary franchise icons! Massive game-defining abilities capable of double-digit deflation, opponent disruption, and championship clinch moves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bidding' && (
            <div className="space-y-3.5">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h4 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
                  <span>🔨</span> Nomination
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The round's First Player selects any player from the auction block to bid on. They must bid on the player selected and bidding moves clockwise around the table.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                  <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <span>⚡</span> Buy Max Instant Win
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Every card has an official <strong className="text-white">Max Bid</strong>. Placing a bid equal to the card's Max Bid immediately wins the card on the spot and ends bidding on that player!
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
                  <h4 className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
                    <span>🛑</span> Pass is Final
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    When you click <strong className="text-white">Pass</strong> on a nominated player, you cannot re-enter the bidding for that specific player this round.
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/50 p-4 rounded-2xl space-y-1.5">
                <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <span>🪙</span> The Sole Remaining 0-Coin Rule
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  If every other eligible team has already acquired their player card for the round, and you have <strong className="text-white">0 Coins</strong>, you are protected! You may nominate and acquire the final remaining player card for <strong className="text-emerald-400">0 Coins</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow cursor-pointer transition-all"
          >
            Close Guide ✕
          </button>
        </div>
      </div>
    </div>
  );
};

const DeflategateBoard = ({ G, ctx, moves, playerID, vsCpu, playMode, numHumans: initialNumHumans }) => {
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(true);
  const [peekLineupModal, setPeekLineupModal] = useState(false);
  const [customBid, setCustomBid] = useState(0);
  const [skipMode, setSkipMode] = useState(null); // null, 'myTurn', 'refresh'
  const [showJaguarsModal, setShowJaguarsModal] = useState(false);
  const [reorderingMode, setReorderingMode] = useState(false);
  const [tempEventDeck, setTempEventDeck] = useState([]);
  const [chiefsClaimActive, setChiefsClaimActive] = useState(false);
  const [ramsSelectionMode, setRamsSelectionMode] = useState(false);
  const [selectedReplaceIdx, setSelectedReplaceIdx] = useState(0);
  const [clientDismissedCardFlyTimestamp, setClientDismissedCardFlyTimestamp] = useState(null);
  const [clientDismissedTyreekTimestamp, setClientDismissedTyreekTimestamp] = useState(null);
  const [cardinalsMinimized, setCardinalsMinimized] = useState(false);
  const [coltsExpandedMap, setColtsExpandedMap] = useState({});
  const [coltsHoveredId, setColtsHoveredId] = useState(null);

  const displayPlayerNumber = (id) => (parseInt(id) + 1).toString();

  const humanPlayerIds = Object.keys(G.players).filter(id => !G.players[id].isCpu);
  const isMultiHuman = (G.numHumans && G.numHumans > 1) || humanPlayerIds.length > 1 || playMode === 'pass_and_play' || playMode === 'pvp_cpu';

  // Determine who the game is actively waiting for in interactive decisions
  let activeTurnPlayerId = null;
  if (ctx.phase === 'teamSelection') {
    activeTurnPlayerId = humanPlayerIds.find(id => !G.players[id].team) || ctx.currentPlayer || '0';
  } else if (ctx.phase === 'buccaneersCopy') {
    activeTurnPlayerId = humanPlayerIds.find(id => G.players[id]?.team?.id === 'buccaneers' && !G.players[id]?.copiedTeam) || '0';
  } else if (G.board.pendingTitansDraft) {
    activeTurnPlayerId = String(G.board.pendingTitansDraft.playerID);
  } else if (G.board.pendingFreeAgency && G.board.pendingFreeAgency.card) {
    activeTurnPlayerId = String(G.board.pendingFreeAgency.playerID);
  } else if (G.board.pendingNewCapLimit && G.board.pendingNewCapLimit.active) {
    activeTurnPlayerId = String(G.board.pendingNewCapLimit.playerID);
  } else if (G.board.pendingPukaChoice) {
    activeTurnPlayerId = String(G.board.pendingPukaChoice.playerID);
  } else if (G.board.pendingRivalry) {
    activeTurnPlayerId = String(G.board.pendingRivalry.currentGiverId);
  } else if (G.board.pendingTradeRumors) {
    activeTurnPlayerId = humanPlayerIds.find(id => !G.board.pendingTradeRumors?.picks?.[id]) || humanPlayerIds[0] || '0';
  } else if (G.pendingReplacement) {
    activeTurnPlayerId = String(G.pendingReplacement.playerID);
  } else if (G.board.pendingBills) {
    activeTurnPlayerId = String(G.board.pendingBills.playerID);
  } else if (G.board.pendingEagles) {
    activeTurnPlayerId = String(G.board.pendingEagles.playerID);
  } else if (G.board.pendingRaiders) {
    activeTurnPlayerId = String(G.board.pendingRaiders.playerID);
  } else if (G.board.pendingCardinals) {
    activeTurnPlayerId = String(G.board.pendingCardinals.playerID);
  } else if (G.board.pendingChiefs) {
    activeTurnPlayerId = String(G.board.pendingChiefs.playerID);
  } else if (G.board.pendingCommanders) {
    activeTurnPlayerId = String(G.board.pendingCommanders.playerID);
  } else if (ctx.phase === 'auctionPhase') {
    if (G.board.activeAuctionCardIndex === null) {
      activeTurnPlayerId = String(G.board.nominator);
    } else {
      activeTurnPlayerId = String(ctx.currentPlayer);
    }
  } else {
    activeTurnPlayerId = String(ctx.currentPlayer || '0');
  }

  const [selectedPlayerID, setSelectedPlayerID] = useState(playerID || '0');

  useEffect(() => {
    if (playMode !== 'online' && activeTurnPlayerId && activeTurnPlayerId !== selectedPlayerID) {
      if (!G.players[activeTurnPlayerId]?.isCpu) {
        setSelectedPlayerID(activeTurnPlayerId);
      }
    }
  }, [activeTurnPlayerId, playMode]);

  const effectivePlayerID = (playMode === 'online') ? (playerID || '0') : (selectedPlayerID || playerID || '0');

  useEffect(() => {
    if (vsCpu !== undefined && G.vsCpu !== vsCpu) {
      moves.setVsCpu(vsCpu);
    }
    if (initialNumHumans !== undefined && G.numHumans !== initialNumHumans) {
      if (moves.setNumHumans) moves.setNumHumans(initialNumHumans);
    }
  }, [vsCpu, G.vsCpu, initialNumHumans, G.numHumans, moves]);

  const activeCard = G.board.activeAuctionCardIndex !== null && G.board.auctionPlayers ? G.board.auctionPlayers[G.board.activeAuctionCardIndex] : null;
  const highestBidderPlayer = G.board.highestBidder !== null ? G.players[G.board.highestBidder] : null;
  const highestTeamId = highestBidderPlayer ? getEffectiveTeamId(highestBidderPlayer) : null;
  const bidIncrement = (highestTeamId === 'bears') ? 2 : 1;

  const myPlayer = G.players[effectivePlayerID];
  const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
  const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === effectivePlayerID;
  const isSoleRemainingZeroCoins = isSoleRemainingBidder && myPlayer?.coins === 0;

  // Minimum required bid amount: if no bid placed yet, min is card.minBid (or 0 if sole remaining bidder with 0 coins)
  const nextBid = activeCard ? (
    G.board.highestBidder !== null 
      ? (isSoleRemainingZeroCoins ? 0 : Math.max(activeCard.minBid, G.board.highestBid + bidIncrement))
      : (isSoleRemainingZeroCoins ? 0 : activeCard.minBid)
  ) : 0;
  const effectiveTeam = myPlayer && myPlayer.team ? (myPlayer.copiedTeam ? myPlayer.copiedTeam : myPlayer.team) : null;
  const isJaguars = effectiveTeam && effectiveTeam.id === 'jaguars';

  const effMaxBid = activeCard ? getEffectiveCardMaxBid(activeCard, G.board.activeEvent) : 0;
  const maxAllowedBid = activeCard && myPlayer ? (isSoleRemainingZeroCoins ? 0 : Math.min(myPlayer.coins, effMaxBid)) : 0;

  useEffect(() => {
    if (isSoleRemainingZeroCoins) {
      setCustomBid(0);
    } else {
      if (nextBid > 0 && customBid < nextBid) {
        setCustomBid(nextBid);
      }
      if (maxAllowedBid > 0 && customBid > maxAllowedBid) {
        setCustomBid(maxAllowedBid);
      }
    }
  }, [nextBid, maxAllowedBid, isSoleRemainingZeroCoins]);

  // Automatic timer progression for refresh phase team-by-team animation
  useEffect(() => {
    if (ctx.phase === 'refreshPhase' && G.board.refreshStage === 'animating') {
      const numP = Object.keys(G.players).length;
      if (G.board.refreshStepIndex < numP) {
        const timer = setTimeout(() => {
          moves.advanceRefreshStep();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [ctx.phase, G.board.refreshStage, G.board.refreshStepIndex, G.players, moves]);

  // Auto-dismiss Acquisition Card Fly Animation after 2.2 seconds
  useEffect(() => {
    if (G.board.cardWonFlyAnimation && G.board.cardWonFlyAnimation.timestamp !== clientDismissedCardFlyTimestamp) {
      const timer = setTimeout(() => {
        setClientDismissedCardFlyTimestamp(G.board.cardWonFlyAnimation?.timestamp);
        if (moves.dismissCardWonFlyAnimation) moves.dismissCardWonFlyAnimation();
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [G.board.cardWonFlyAnimation, clientDismissedCardFlyTimestamp, moves]);

  // Auto-dismiss Tyreek Hill speed tax alert after 2.8 seconds
  useEffect(() => {
    if (G.board.tyreekHillAlert && G.board.tyreekHillAlert.timestamp !== clientDismissedTyreekTimestamp) {
      const timer = setTimeout(() => {
        setClientDismissedTyreekTimestamp(G.board.tyreekHillAlert?.timestamp);
        if (moves.dismissTyreekHillAlert) moves.dismissTyreekHillAlert();
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [G.board.tyreekHillAlert, clientDismissedTyreekTimestamp, moves]);

  const humanHasWonInRound = myPlayer && myPlayer.hasWonAuction;
  const currentPlayerObj = G.players[ctx.currentPlayer];
  const isCpuTurn = currentPlayerObj && currentPlayerObj.isCpu;
  const isMyTurnToNominate = ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null && String(G.board.nominator) === String(effectivePlayerID);

  // Falcons Phase Check for Mulligan
  let currentPhaseKey = 'p1';
  if (G.board.round >= 5 && G.board.round <= 7) currentPhaseKey = 'p2';
  if (G.board.round >= 8) currentPhaseKey = 'p3';
  const canMulligan = effectiveTeam && effectiveTeam.id === 'falcons' && isMyTurnToNominate && !myPlayer?.falconsPhaseUses?.[currentPhaseKey];

  // Automated turn stepper for Skip buttons
  useEffect(() => {
    if (!skipMode) return;

    if (G.pendingReplacement) {
      setSkipMode(null);
      return;
    }

    if (ctx.phase !== 'auctionPhase') {
      setSkipMode(null);
      return;
    }

    if (skipMode === 'myTurn') {
      if (ctx.currentPlayer === effectivePlayerID || humanHasWonInRound) {
        setSkipMode(null);
        return;
      }
    }

    if (isCpuTurn) {
      if (playMode === 'online' && String(playerID) !== '0') return;
      const timer = setTimeout(() => {
        moves.stepCpuTurn();
      }, 150);
      return () => clearTimeout(timer);
    } else if (skipMode === 'refresh' && !humanHasWonInRound) {
      setSkipMode(null);
    }
  }, [skipMode, ctx.currentPlayer, ctx.phase, isCpuTurn, G.pendingReplacement, humanHasWonInRound, effectivePlayerID, moves]);

  // Formatter for player card effects with larger fonts, high readability, and specialText badges
  const renderCardEffects = (effects, specialText) => {
    return (
      <div className="space-y-1 my-1">
        {effects && Array.isArray(effects) && effects.map((eff, i) => {
          const symbolElement = eff.perRound ? (
            <span 
              title="End of Round Effect: Happens at the end of every round" 
              className="cursor-help inline-block ml-1 hover:scale-125 transition-transform select-none"
            >
              🔄
            </span>
          ) : (
            <span 
              title="Instant effect: Happens immediately when bought" 
              className="cursor-help inline-block ml-1 hover:scale-125 transition-transform select-none"
            >
              ⚡
            </span>
          );

          if (eff.type === 'coins') {
            const isPositive = eff.amount > 0;
            return (
              <span key={i} className={`text-xs sm:text-sm flex items-center font-black font-mono leading-tight ${isPositive ? 'text-yellow-300' : 'text-orange-400'}`}>
                <span>🪙 {isPositive ? `+${eff.amount}` : eff.amount} Coins</span>
                {symbolElement}
              </span>
            );
          } else if (eff.type === 'deflate') {
            return (
              <span key={i} className="text-xs sm:text-sm flex items-center font-black font-mono text-emerald-300 leading-tight">
                <span>🏈 -{eff.amount} PSI</span>
                {symbolElement}
              </span>
            );
          } else if (eff.type === 'inflate') {
            return (
              <span key={i} className="text-xs sm:text-sm flex items-center font-black font-mono text-red-400 leading-tight">
                <span>🏈🔺 +{eff.amount} PSI</span>
                {symbolElement}
              </span>
            );
          }
          return null;
        })}
        {specialText && (
          <span className="text-[11px] sm:text-xs block font-bold text-amber-200 bg-amber-950/85 border border-amber-500/80 rounded px-2 py-1 mt-1 leading-snug text-left shadow-md">
            ✨ {specialText}
          </span>
        )}
      </div>
    );
  };

  const getCardPhaseStyle = (card) => {
    if (!card) return 'border-slate-800 bg-slate-850';
    if (card.phase === 'hof') return 'border-amber-400 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
    if (card.phase === 2) return 'border-purple-500 bg-gradient-to-b from-purple-950/40 to-slate-900 shadow-[0_0_12px_rgba(168,85,247,0.2)]';
    if (card.phase === 1) return 'border-blue-500 bg-gradient-to-b from-blue-950/30 to-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
    return 'border-slate-800 bg-slate-950';
  };

  const renderPhaseBadge = (phase) => {
    if (phase === 'hof') return <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">⭐ HOF LEGEND</span>;
    if (phase === 2) return <span className="bg-purple-900/90 border border-purple-400 text-purple-200 font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">PHASE 2</span>;
    if (phase === 1) return <span className="bg-blue-900/90 border border-blue-400 text-blue-200 font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">PHASE 1</span>;
    return <span className="bg-slate-800 text-slate-400 font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded uppercase">PRACTICE SQUAD</span>;
  };

  const openJaguarsModal = () => {
    setTempEventDeck([...(G.decks.event || [])]);
    setReorderingMode(false);
    setShowJaguarsModal(true);
  };

  const moveEventCard = (index, direction) => {
    const newDeck = [...tempEventDeck];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newDeck.length) return;
    const temp = newDeck[index];
    newDeck[index] = newDeck[targetIndex];
    newDeck[targetIndex] = temp;
    setTempEventDeck(newDeck);
  };

  const saveReorderedEvents = () => {
    moves.reorderEventDeck(tempEventDeck);
    setShowJaguarsModal(false);
    setReorderingMode(false);
  };

  // Team Selection Screen
  if (ctx.phase === 'teamSelection') {
    const unpickedHumans = humanPlayerIds.filter(id => !G.players[id].team);

    if (myPlayer.team) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <h2 className="text-2xl font-bold text-white">Team Drafted: {myPlayer.team.name}!</h2>
            <p className="text-slate-400 text-sm">Waiting for remaining players to select their franchise...</p>
            {isMultiHuman && playMode !== 'online' && unpickedHumans.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Pass Device:</span>
                {unpickedHumans.map(uId => (
                  <button
                    key={uId}
                    onClick={() => setSelectedPlayerID(uId)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow"
                  >
                    Draft as Player {displayPlayerNumber(uId)} ➔
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
        <div className="max-w-4xl mx-auto text-center">
          {isMultiHuman && playMode !== 'online' && (
            <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-700 px-3 py-1 rounded-full text-xs text-blue-300 font-bold mb-3 uppercase tracking-wider">
              <span>📱 Pass & Play Active</span>
              <span>•</span>
              <span>Drafting for Player {displayPlayerNumber(effectivePlayerID)}</span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-wider mb-2 uppercase px-2">
            Player {displayPlayerNumber(effectivePlayerID)}: Draft Your Franchise
          </h1>
          <p className="text-slate-400 mb-8 italic text-sm">Select one starting NFL team. Choose wisely based on starting Coins, PSI, and Ability.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
            {myPlayer.teamChoices.map((team, idx) => (
              <div 
                key={team.id} 
                onClick={() => moves.selectTeam(idx, effectivePlayerID)}
                className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl flex flex-col justify-between hover:border-blue-500 hover:shadow-[0_0_25px_rgba(96,165,250,0.2)] cursor-pointer transition-all transform hover:-translate-y-1 text-left"
              >
                <div>
                  <h2 className="text-2xl font-black text-white mb-3 flex justify-between items-center">
                    <span>{team.name}</span>
                  </h2>

                  <div className="bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-800/80 p-3.5 rounded-xl mb-4 shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block mb-1">⚡ Team Ability</span>
                    <p className="text-xs text-purple-100 font-semibold leading-relaxed">{team.ability}</p>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <p className="flex justify-between text-sm"><span className="text-slate-400 font-medium">Starting Coins:</span> <span className="text-yellow-400 font-bold font-mono">{team.coins}</span></p>
                    <p className="flex justify-between text-sm"><span className="text-slate-400 font-medium">Starting PSI:</span> <span className="text-red-400 font-bold font-mono">{team.initialPsi}</span></p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.selectTeam(idx, effectivePlayerID);
                  }}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-sm transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Select {team.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Buccaneers Draft Copy Screen
  if (ctx.phase === 'buccaneersCopy') {
    const isBucs = myPlayer.team && myPlayer.team.id === 'buccaneers';

    if (!isBucs || myPlayer.copiedTeam) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">Buccaneers Drafting Ability</h2>
            <p className="text-slate-400 text-sm">Waiting for Buccaneers player to copy another team's ability...</p>
          </div>
        </div>
      );
    }

    const otherDraftedTeams = Object.values(G.players).filter(p => p.team && p.team.id !== 'buccaneers').map(p => p.team);

    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-black text-amber-400 tracking-wider mb-2 uppercase">🏴‍☠️ Buccaneers Special Ability Draft</h1>
          <p className="text-slate-400 mb-8 italic text-sm">Select one of the other drafted teams to copy their team ability for the rest of the game!</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
            {otherDraftedTeams.map(team => (
              <div 
                key={team.id}
                onClick={() => moves.copyAbility(team.id, effectivePlayerID)}
                className="bg-slate-900 border-2 border-amber-500/50 p-6 rounded-2xl flex flex-col justify-between hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all text-left"
              >
                <div>
                  <h2 className="text-xl font-black text-amber-300 mb-3">{team.name}</h2>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Ability to Copy</span>
                    <p className="text-xs text-slate-200 leading-relaxed italic">{team.ability}</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.copyAbility(team.id, effectivePlayerID);
                  }}
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Copy Ability
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Titans Opening Draft Screen
  if (ctx.phase === 'titansDraft') {
    const isMyDraftTurn = G.board.pendingTitansDraft && String(G.board.pendingTitansDraft.playerID) === String(effectivePlayerID);
    if (!isMyDraftTurn) {
      const draftingPlayer = G.board.pendingTitansDraft ? G.players[G.board.pendingTitansDraft.playerID] : null;
      const draftingTeamName = draftingPlayer?.team?.name || 'Titans';
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">{draftingTeamName} Drafting Opening Player</h2>
            <p className="text-slate-400 text-sm">Waiting for {draftingTeamName} to choose an opening player card...</p>
          </div>
        </div>
      );
    }

    const currentDraftTeamName = myPlayer?.copiedTeam ? `${myPlayer.team?.name} (Copied Titans)` : (myPlayer?.team?.name || 'Titans');

    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-black text-blue-400 tracking-wider mb-2 uppercase">⚔️ {currentDraftTeamName} Opening Player Draft</h1>
          <p className="text-slate-400 mb-8 italic text-sm">Select 1 player card to acquire for free. This will replace one Practice Squad player, and the other cards will return to the deck.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
            {G.board.pendingTitansDraft.cards.map((card, idx) => (
              <div 
                key={card.uniqueId || idx} 
                onClick={() => moves.titansPickCard(idx, effectivePlayerID)}
                className={`border-2 p-6 rounded-2xl flex flex-col justify-between hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] cursor-pointer transition-all text-left ${getCardPhaseStyle(card)}`}
              >
                <div>
                  <div className="flex justify-between items-center text-xs font-extrabold mb-2">
                    <span className="text-slate-400">Min: {card.minBid}</span>
                    <span className="bg-slate-900 px-2 py-0.5 rounded text-blue-400 border border-slate-700 uppercase font-mono font-black">{card.position || 'WR'}</span>
                    <span className="text-slate-400">Max: {card.maxBid}</span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">{card.name}</h2>
                  <div className="space-y-1 mb-4">
                    {renderCardEffects(card.effects, card.specialText || card.customText)}
                  </div>
                  {renderPhaseBadge(card.phase)}
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.titansPickCard(idx, effectivePlayerID);
                  }}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Draft {card.name} (Free)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEventFlipped = G.board.eventFlipRevealed && G.board.activeEvent;
  const isMyTurn = ctx.currentPlayer === effectivePlayerID;
  const isPendingReplacementForMe = G.pendingReplacement && String(G.pendingReplacement.playerID) === String(effectivePlayerID);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col gap-6 font-sans">
      {/* Pass & Play Multi-Human Player Switcher Bar */}
      {isMultiHuman && playMode !== 'online' && (
        <div className="bg-slate-900/90 backdrop-blur-sm border-2 border-slate-850 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-900/80 text-blue-300 border border-blue-700 px-2.5 py-0.5 rounded-full shadow">
              📱 Pass & Play
            </span>
            <span className="text-xs text-slate-300 font-bold">
              Viewing: <span className="text-white font-extrabold">{G.players[effectivePlayerID]?.team?.name || `Player ${displayPlayerNumber(effectivePlayerID)}`}</span>
              {String(activeTurnPlayerId) === String(effectivePlayerID) ? (
                <span className="ml-2 text-emerald-400 font-extrabold animate-pulse">● Active Turn</span>
              ) : (
                <span className="ml-2 text-slate-400 font-normal">(Waiting for Player {displayPlayerNumber(activeTurnPlayerId)})</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Switch View:</span>
            {humanPlayerIds.map(hId => {
              const hPlayer = G.players[hId];
              const isCurrent = effectivePlayerID === hId;
              const isHisTurn = String(activeTurnPlayerId) === String(hId);
              return (
                <button
                  key={hId}
                  onClick={() => setSelectedPlayerID(hId)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow ring-2 ring-blue-400'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  {isHisTurn && <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>}
                  <span>P{displayPlayerNumber(hId)} {hPlayer?.team ? `(${hPlayer.team.name.split(' ').pop()})` : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* End of Auction Phase / Refresh Phase Intro Popup */}
      {ctx.phase === 'refreshPhase' && G.board.inRefreshSummary && G.board.refreshStage === 'intro' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-6 animate-bounce-short">
            <div className="w-16 h-16 bg-blue-500/20 border-2 border-blue-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
              🔄
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest bg-blue-900/60 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
                Round {G.board.round} Auction Complete
              </span>
              <h2 className="text-3xl font-black text-white uppercase tracking-wide mt-3">
                End of the Auction Phase
              </h2>
              <p className="text-blue-400 font-bold text-lg mt-1">Time for the Refresh Phase</p>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Lineup cards will generate passive coins and deflation. Team abilities and active events will be calculated sequentially across all teams.
            </p>
            <button
              onClick={() => moves.startRefreshSequence()}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-black py-4 rounded-xl text-xl shadow-xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-emerald-400/50"
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Refresh Phase Completed: Advance to Round {round + 1} Button */}
      {ctx.phase === 'refreshPhase' && G.board.refreshStage === 'complete' && (
        <div className="fixed bottom-6 inset-x-0 mx-auto max-w-md z-50 px-4">
          <button
            onClick={() => moves.confirmRefreshSummary()}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 px-6 rounded-2xl text-xl shadow-2xl uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-indigo-400/50 flex items-center justify-center gap-3 animate-bounce-short"
          >
            <span>Advance to Round {G.board.round + 1} Event 🏈</span>
          </button>
        </div>
      )}

      {/* Refresh Phase Active Stepping Floating Banner */}
      {ctx.phase === 'refreshPhase' && G.board.refreshStage === 'animating' && (
        <div className="bg-gradient-to-r from-blue-950/90 to-purple-950/90 border-2 border-blue-500 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-yellow-400 animate-ping"></span>
            <div>
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Processing Refresh: {G.board.refreshResults?.[G.board.refreshStepIndex]?.teamName || 'Team'}
              </h4>
              <p className="text-xs text-slate-300">Team {(G.board.refreshStepIndex || 0) + 1} of {Object.keys(G.players).length}</p>
            </div>
          </div>
          <button
            onClick={() => moves.advanceRefreshStep()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
          >
            Skip Step ⏩
          </button>
        </div>
      )}

      {/* Legend Returns Notification Banner */}
      {G.board.legendNotification && (
        <div className="bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border-2 border-purple-500 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⭐</span>
            <div>
              <h4 className="text-sm font-black text-purple-300 uppercase tracking-wide">Team Legend Returns</h4>
              <p className="text-xs text-slate-200">{G.board.legendNotification}</p>
            </div>
          </div>
          <button
            onClick={() => moves.dismissLegendNotification()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Event Notification Banner (Cold Air, Hot Air, 1st Overall Pick) */}
      {G.board.eventNotification && (
        <div className="bg-gradient-to-r from-cyan-950/90 to-blue-950/90 border-2 border-cyan-500 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📢</span>
            <div>
              <h4 className="text-sm font-black text-cyan-300 uppercase tracking-wide">Event Update</h4>
              <p className="text-xs text-slate-200">{G.board.eventNotification}</p>
            </div>
          </div>
          <button
            onClick={() => moves.dismissEventNotification()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl text-xs uppercase cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tyreek Hill Speed Tax Toast Alert */}
      {G.board.tyreekHillAlert && G.board.tyreekHillAlert.timestamp !== clientDismissedTyreekTimestamp && (
        <div className="fixed top-20 right-4 z-50 bg-amber-500/20 border-2 border-amber-400 backdrop-blur-md px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center gap-3 animate-bounce-short max-w-sm">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-300 block">
              Tyreek Hill Speed Tax
            </span>
            <p className="text-xs text-white font-bold">
              {G.board.tyreekHillAlert.playerName} placed a bid and immediately deflated <span className="text-emerald-400 font-black">-1 PSI</span>!
            </p>
          </div>
          <button
            onClick={() => {
              setClientDismissedTyreekTimestamp(G.board.tyreekHillAlert?.timestamp);
              if (moves.dismissTyreekHillAlert) moves.dismissTyreekHillAlert();
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase cursor-pointer border border-slate-700"
          >
            OK
          </button>
        </div>
      )}

      {/* Acquisition Card Won Fly Animation Overlay */}
      {G.board.cardWonFlyAnimation && G.board.cardWonFlyAnimation.timestamp !== clientDismissedCardFlyTimestamp && (
        <div 
          onClick={() => {
            setClientDismissedCardFlyTimestamp(G.board.cardWonFlyAnimation?.timestamp);
            if (moves.dismissCardWonFlyAnimation) moves.dismissCardWonFlyAnimation();
          }}
          className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <div className="relative flex flex-col items-center animate-fly-card" onClick={(e) => e.stopPropagation()}>
            {/* Radiant celebratory glow behind */}
            <div className="absolute -inset-8 bg-gradient-to-r from-yellow-500/40 via-amber-500/40 to-blue-500/40 rounded-3xl blur-2xl animate-pulse"></div>

            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-yellow-400 p-6 sm:p-8 rounded-3xl max-w-sm sm:max-w-md w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.7)]">
              <div className="w-16 h-16 bg-yellow-400/20 border-2 border-yellow-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner mb-3">
                🏈
              </div>
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest bg-yellow-400 text-black px-3 py-1 rounded-full shadow inline-block">
                Player Acquired!
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-3 mb-1">
                {G.board.cardWonFlyAnimation.winnerTeamName}
              </h2>
              <p className="text-yellow-300 font-extrabold text-sm sm:text-base">
                Won for {G.board.cardWonFlyAnimation.bidAmount} Coins!
              </p>

              {/* The Card preview */}
              <div className={`mt-4 p-4 rounded-2xl border-2 text-left bg-slate-950 shadow-inner ${getCardPhaseStyle(G.board.cardWonFlyAnimation.card)}`}>
                <div className="flex justify-between items-center text-xs font-black mb-1 gap-1.5">
                  <span className="whitespace-nowrap shrink-0 text-yellow-300 font-mono">Min: {G.board.cardWonFlyAnimation.card?.minBid}</span>
                  <span className="shrink-0 bg-slate-900 px-2 py-0.5 rounded text-blue-400 border border-slate-700 uppercase font-mono font-black text-xs">
                    {G.board.cardWonFlyAnimation.card?.position || 'WR'}
                  </span>
                  <span className="whitespace-nowrap shrink-0 text-slate-300 font-mono">Max: {G.board.cardWonFlyAnimation.card?.maxBid}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-1 mb-2">{G.board.cardWonFlyAnimation.card?.name}</h3>
                <div className="space-y-1">
                  {renderCardEffects(G.board.cardWonFlyAnimation.card?.effects, G.board.cardWonFlyAnimation.card?.specialText)}
                </div>
                <div className="mt-3 flex justify-center">
                  {renderPhaseBadge(G.board.cardWonFlyAnimation.card?.phase)}
                </div>
              </div>

              <button
                onClick={() => {
                  setClientDismissedCardFlyTimestamp(G.board.cardWonFlyAnimation?.timestamp);
                  if (moves.dismissCardWonFlyAnimation) moves.dismissCardWonFlyAnimation();
                }}
                className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black px-6 py-2 rounded-xl text-sm uppercase cursor-pointer shadow-lg tracking-wide transition-all transform hover:scale-105"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Puka Nacua Teammate Selection Modal */}
      {G.board.pendingPukaChoice && String(G.board.pendingPukaChoice.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 p-6 md:p-8 rounded-3xl max-w-xl w-full text-center shadow-2xl space-y-4 animate-bounce-short max-h-[90vh] flex flex-col">
            <span className="text-4xl block">🎯</span>
            <span className="text-xs font-black uppercase tracking-widest bg-cyan-900/60 text-cyan-300 px-3 py-1 rounded-full border border-cyan-700">
              Puka Nacua Special Ability
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
              Copy Teammate Recurring Effects
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Player {displayPlayerNumber(effectivePlayerID)}: Select an active teammate below. Puka Nacua will copy all of that teammate's recurring (🔄) per-round effects for this Refresh Phase!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 overflow-y-auto flex-1">
              {G.board.pendingPukaChoice.options.map((card) => (
                <button
                  key={card.uniqueId}
                  onClick={() => moves.pukaChooseTeammate(card.uniqueId, effectivePlayerID)}
                  className="bg-slate-950 border-2 border-slate-800 hover:border-cyan-400 p-4 rounded-xl flex flex-col justify-between text-left hover:bg-slate-900 transition-all cursor-pointer shadow group"
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase">{card.position || 'WR'}</span>
                      {renderPhaseBadge(card.phase)}
                    </div>
                    <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">{card.name}</h4>
                    <div className="mt-2 space-y-1">
                      {renderCardEffects(card.effects, card.specialText || card.customText)}
                    </div>
                  </div>
                  <span className="mt-3 text-xs font-black uppercase tracking-wider text-cyan-400 block border-t border-slate-800 pt-2 text-center group-hover:underline">
                    Copy This Teammate ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Cap Limit Modal */}
      {G.board.pendingNewCapLimit && G.board.pendingNewCapLimit.active && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 p-6 md:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">🧢</span>
            <span className="text-xs font-black uppercase tracking-widest bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700">
              Round {G.board.round} Event: New Cap Limit
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Buy Practice Squad Player</h2>
            {String(G.board.pendingNewCapLimit.playerID) === String(effectivePlayerID) ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed">
                  You may pay <span className="text-yellow-400 font-bold font-mono">10 Coins</span> to permanently add an additional Practice Squad Player (+1 Lineup Slot) to your team.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                  Your Coins: <span className="text-yellow-400 font-bold font-mono">{myPlayer.coins}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={myPlayer.coins < 10}
                    onClick={() => moves.buyPracticeSquad(effectivePlayerID)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow ${
                      myPlayer.coins >= 10
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    Pay 10 Coins
                  </button>
                  <button
                    onClick={() => moves.passPracticeSquad(effectivePlayerID)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Pass
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 space-y-3">
                <p className="text-slate-300 text-sm">
                  Waiting for Player {displayPlayerNumber(G.board.pendingNewCapLimit.playerID)} ({G.players[G.board.pendingNewCapLimit.playerID]?.team?.name || 'Player'}) to decide...
                </p>
                {isMultiHuman && playMode !== 'online' && (
                  <button
                    onClick={() => setSelectedPlayerID(String(G.board.pendingNewCapLimit.playerID))}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingNewCapLimit.playerID)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rivalry Modal: Give 1 PSI to Opponent (shown after Event Reveal banner is dismissed) */}
      {G.board.pendingRivalry && !G.board.eventFlipRevealed && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">⚔️</span>
            <span className="text-xs font-black uppercase tracking-widest bg-red-900/60 text-red-300 px-3 py-1 rounded-full border border-red-700">
              Round {G.board.round} Event: Rivalry
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Give 1 PSI to an Opponent</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {String(G.board.pendingRivalry.currentGiverId) === String(effectivePlayerID)
                ? "It is your turn! Select an opponent below to give them 1 PSI (you deflate -1 PSI, they inflate +1 PSI unless protected by Saints immunity)."
                : `Waiting for Player ${parseInt(G.board.pendingRivalry.currentGiverId || '0') + 1} (${G.players[G.board.pendingRivalry.currentGiverId]?.team?.name || 'CPU'}) to choose an opponent...`}
            </p>
            {String(G.board.pendingRivalry.currentGiverId) === String(effectivePlayerID) ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {Object.keys(G.players).filter(id => id !== effectivePlayerID).map(oppId => {
                  const opp = G.players[oppId];
                  return (
                    <button
                      key={oppId}
                      onClick={() => moves.rivalryGivePsi(oppId, effectivePlayerID)}
                      className="bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-850 cursor-pointer transition-all shadow"
                    >
                      <span className="text-xs font-mono text-slate-400 font-bold">Player {displayPlayerNumber(oppId)}</span>
                      <span className="text-sm font-black text-white">{opp?.team?.name}</span>
                      <span className="text-xs text-red-400 font-mono font-bold">{opp && typeof opp.psi === 'number' ? opp.psi.toFixed(1) : opp?.psi || 0} PSI</span>
                      <span className="mt-2 text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold uppercase">Give 1 PSI</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></span>
                {isMultiHuman && playMode !== 'online' && !G.players[G.board.pendingRivalry.currentGiverId]?.isCpu && (
                  <button
                    onClick={() => setSelectedPlayerID(String(G.board.pendingRivalry.currentGiverId))}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingRivalry.currentGiverId)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Rumors Modal: Pass 1 Active Player to the Right */}
      {G.board.pendingTradeRumors && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full text-center shadow-2xl space-y-4 animate-bounce-short max-h-[90vh] flex flex-col">
            <span className="text-4xl block">🔄</span>
            <span className="text-xs font-black uppercase tracking-widest bg-blue-900/60 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
              Round {G.board.round} Event: Trade Rumors
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Pass 1 Active Player to the Right</h2>
            {(() => {
              const hasPicked = G.board.pendingTradeRumors.picks && G.board.pendingTradeRumors.picks[effectivePlayerID] !== undefined;
              const unpickedHumans = humanPlayerIds.filter(hId => !G.board.pendingTradeRumors.picks || G.board.pendingTradeRumors.picks[hId] === undefined);

              if (hasPicked) {
                const pickedIdx = G.board.pendingTradeRumors.picks[effectivePlayerID];
                const pickedCard = myPlayer.lineup[pickedIdx];
                return (
                  <div className="py-6 space-y-4 text-center">
                    <span className="text-3xl block">⏳</span>
                    <h3 className="text-lg font-bold text-emerald-400">Card Selected!</h3>
                    <p className="text-slate-300 text-sm">
                      Player {displayPlayerNumber(effectivePlayerID)} passed: <span className="font-bold text-white">{pickedCard?.name || 'Player'}</span>
                    </p>
                    <p className="text-slate-400 text-xs italic">
                      Waiting for remaining players to select their card...
                    </p>
                    {isMultiHuman && playMode !== 'online' && unpickedHumans.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider block">Pass Device to Next Player:</span>
                        <div className="flex justify-center gap-2 flex-wrap">
                          {unpickedHumans.map(uId => (
                            <button
                              key={uId}
                              onClick={() => setSelectedPlayerID(uId)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow"
                            >
                              Pick as Player {displayPlayerNumber(uId)} ➔
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Player {displayPlayerNumber(effectivePlayerID)} ({myPlayer.team?.name}): Select one of your active lineup players to pass to the team on your right (clockwise).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 overflow-y-auto flex-1">
                    {myPlayer.lineup.map((card, cidx) => (
                      <div key={card.uniqueId || cidx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between text-left">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">{card.position || 'WR'}</span>
                          <h4 className="font-bold text-white text-sm mt-1">{card.name}</h4>
                          <div className="mt-1">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                        </div>
                        <button
                          onClick={() => moves.tradeRumorsPickCard(cidx, effectivePlayerID)}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-lg text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Pass This Player ➡️
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Trade Rumors Summary Modal */}
      {G.board.tradeRumorsSummary && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">🤝</span>
            <h2 className="text-2xl font-black text-blue-400 uppercase tracking-wide">Trade Rumors Complete!</h2>
            <div className="space-y-2 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
              {G.board.tradeRumorsSummary.map((line, idx) => (
                <p key={idx} className="text-xs text-slate-200">🏈 {line}</p>
              ))}
            </div>
            <button
              onClick={() => moves.dismissTradeRumorsSummary()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Bonus Auction Modal (Player Demands a Trade) */}
      {G.board.bonusAuction && G.board.bonusAuction.active && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 p-6 md:p-8 rounded-3xl max-w-xl w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">📣</span>
            <span className="text-xs font-black uppercase tracking-widest bg-amber-900/60 text-amber-300 px-3 py-1 rounded-full border border-amber-700">
              Bonus Auction: Player Demands a Trade
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">
              {G.board.bonusAuction.card?.name}
            </h2>
            <p className="text-xs text-slate-300">
              This bonus auction does not count toward your normal 1-player acquisition limit for this round!
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="flex justify-between items-center text-xs font-bold mb-2 gap-1.5">
                <span className="whitespace-nowrap shrink-0 text-yellow-400">Min: {G.board.bonusAuction.card?.minBid}</span>
                <span className="shrink-0 bg-slate-900 px-2 py-0.5 rounded text-blue-400 font-mono font-black border border-slate-800">{G.board.bonusAuction.card?.position}</span>
                <span className={`whitespace-nowrap shrink-0 font-mono ${G.board.activeEvent?.category === 'overpaid' ? 'text-amber-300 font-black' : 'text-slate-400'}`}>
                  Max: {getEffectiveCardMaxBid(G.board.bonusAuction.card, G.board.activeEvent)}
                  {G.board.activeEvent?.category === 'overpaid' && <span className="ml-1 text-amber-400 font-black">▲</span>}
                </span>
              </div>
              <div className="my-2">{renderCardEffects(G.board.bonusAuction.card?.effects)}</div>
              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-around">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current High Bid</span>
                  <span className="text-xl font-black text-yellow-400 font-mono">{G.board.bonusAuction.highestBid} Coins</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">High Bidder</span>
                  <span className="text-base font-black text-white">
                    {G.board.bonusAuction.highestBidder !== null
                      ? `Player ${parseInt(G.board.bonusAuction.highestBidder) + 1} (${G.players[G.board.bonusAuction.highestBidder]?.team?.name})`
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              {(() => {
                const effMax = getEffectiveCardMaxBid(G.board.bonusAuction.card, G.board.activeEvent);
                const nextB = G.board.bonusAuction.highestBidder !== null ? G.board.bonusAuction.highestBid + 1 : G.board.bonusAuction.card.minBid;
                const canBid = myPlayer.coins >= nextB;
                const canMax = myPlayer.coins >= effMax;
                return (
                  <>
                    <button
                      disabled={!canBid}
                      onClick={() => moves.bonusAuctionBid(nextB, effectivePlayerID)}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                        canBid ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Bid {nextB} Coins
                    </button>
                    <button
                      disabled={!canMax}
                      onClick={() => moves.bonusAuctionBid(effMax, effectivePlayerID)}
                      className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                        canMax ? 'bg-yellow-400 hover:bg-yellow-300 text-black cursor-pointer shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Buy Max ({effMax})
                    </button>
                    <button
                      onClick={() => moves.bonusAuctionPass(effectivePlayerID)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
                    >
                      Pass
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Free Agency Modal */}
      {G.board.pendingFreeAgency && G.board.pendingFreeAgency.card && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">✍️</span>
            <span className="text-xs font-black uppercase tracking-widest bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full border border-purple-700">
              Round {G.board.round} Event: Free Agency
            </span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wide">Sign Free Agent</h2>
            {String(G.board.pendingFreeAgency.playerID) === String(effectivePlayerID) ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed">
                  You drew <span className="font-bold text-white">{G.board.pendingFreeAgency.card.name}</span> ({G.board.pendingFreeAgency.card.position}). You may pay the Maximum price ({getEffectiveCardMaxBid(G.board.pendingFreeAgency.card, G.board.activeEvent)} Coins) to sign them immediately!
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="my-1">{renderCardEffects(G.board.pendingFreeAgency.card.effects, G.board.pendingFreeAgency.card.specialText || G.board.pendingFreeAgency.card.customText)}</div>
                  <p className="text-xs text-yellow-400 font-mono font-bold mt-2">
                    Cost: {getEffectiveCardMaxBid(G.board.pendingFreeAgency.card, G.board.activeEvent)} Coins | Your Coins: {myPlayer.coins}
                  </p>
                </div>
                {getEffectiveTeamId(myPlayer) !== 'colts' && myPlayer.lineup.length >= (getEffectiveTeamId(myPlayer) === 'seahawks' ? 4 : 3) + (myPlayer.extraLineupSlots || 0) && (
                  <div className="text-left">
                    <p className="text-xs text-slate-400 mb-2 font-bold">Select an active player to replace if you sign:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {myPlayer.lineup.map((c, i) => (
                        <button
                          key={c.uniqueId || i}
                          type="button"
                          onClick={() => setSelectedReplaceIdx(i)}
                          className={`p-2 rounded-lg border text-[11px] font-bold ${
                            selectedReplaceIdx === i ? 'border-purple-500 bg-purple-950/60 text-white ring-2 ring-purple-400' : 'border-slate-800 bg-slate-950 text-slate-400'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  {(() => {
                    const cost = getEffectiveCardMaxBid(G.board.pendingFreeAgency.card, G.board.activeEvent);
                    const canAfford = myPlayer.coins >= cost;
                    return (
                      <>
                        <button
                          disabled={!canAfford}
                          onClick={() => moves.freeAgencySign(getEffectiveTeamId(myPlayer) === 'colts' ? -1 : selectedReplaceIdx, effectivePlayerID)}
                          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                            canAfford ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          Sign ({cost} Coins)
                        </button>
                        <button
                          onClick={() => moves.freeAgencyPass(effectivePlayerID)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
                        >
                          Pass
                        </button>
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="py-6 space-y-3 text-center">
                <span className="text-3xl block">⏳</span>
                <h3 className="text-lg font-bold text-purple-300">Free Agency Decision Pending</h3>
                <p className="text-slate-300 text-sm">
                  Waiting for Player {displayPlayerNumber(G.board.pendingFreeAgency.playerID)} ({G.players[G.board.pendingFreeAgency.playerID]?.team?.name || 'Player'}) to decide...
                </p>
                {isMultiHuman && playMode !== 'online' && (
                  <button
                    onClick={() => setSelectedPlayerID(String(G.board.pendingFreeAgency.playerID))}
                    className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingFreeAgency.playerID)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pop-up Notification Alert for Jaguars Ability Use */}
      {G.board.jaguarsPopupNotification && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 p-6 md:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">🐆</span>
            <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide">Jaguars Ability Used!</h2>
            <p className="text-slate-200 text-sm leading-relaxed">{G.board.jaguarsPopupNotification}</p>
            <button 
              onClick={() => moves.dismissJaguarsPopup()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl text-sm uppercase tracking-wider cursor-pointer transition-all"
            >
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* Secret Event Deck Modal for Jaguars */}
      {showJaguarsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 md:p-8 rounded-3xl max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-black text-purple-300 flex items-center gap-2">
                <span>🃏</span> Secret Event Deck Inspector
              </h2>
              <button 
                onClick={() => setShowJaguarsModal(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 italic">
              {reorderingMode 
                ? "Use the Up (▲) and Down (▼) buttons to reorder the upcoming events. The top card will trigger next."
                : "You are secretly viewing the remaining event deck order from top (next to trigger) to bottom."}
            </p>

            {/* Event Deck List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {(reorderingMode ? tempEventDeck : (G.decks.event || [])).map((ev, idx) => (
                <div key={ev.id || idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">
                      {idx === 0 ? '🔥 NEXT EVENT' : `Event #${idx + 1}`}
                    </span>
                    <h3 className="font-bold text-white text-sm">{ev.name}</h3>
                    <p className="text-[11px] text-slate-400 italic">{ev.effect}</p>
                  </div>
                  {reorderingMode && (
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveEventCard(idx, -1)}
                        disabled={idx === 0}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-2 py-0.5 rounded font-black text-xs"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => moveEventCard(idx, 1)}
                        disabled={idx === tempEventDeck.length - 1}
                        className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-2 py-0.5 rounded font-black text-xs"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Controls */}
            <div className="border-t border-slate-800 pt-4 flex gap-3">
              {!reorderingMode ? (
                <>
                  {!G.board.jaguarsAbilityUsed ? (
                    <button 
                      onClick={() => setReorderingMode(true)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer"
                    >
                      ⚡ Use Ability: Reorder Event Deck (1-Time)
                    </button>
                  ) : (
                    <span className="flex-1 text-center bg-slate-950 border border-slate-800 text-slate-500 font-bold py-2.5 rounded-xl text-xs uppercase">
                      🔒 Reorder Ability Already Used
                    </span>
                  )}
                  <button 
                    onClick={() => setShowJaguarsModal(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={saveReorderedEvents}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer"
                  >
                    💾 Save Reordered Deck
                  </button>
                  <button 
                    onClick={() => setReorderingMode(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

                       {/* Raiders Modal: Choose opponent to give 1 PSI */}
      {G.board.pendingRaiders && String(G.board.pendingRaiders.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">☠️</span>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-wide">Raiders Ability: Give 1 PSI</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Before the auction, you may give 1 PSI you control to an opponent. (You deflate -1 PSI, and they inflate +1 PSI unless protected by Saints immunity).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {Object.keys(G.players).filter(id => id !== effectivePlayerID).map(oppId => {
                const opp = G.players[oppId];
                return (
                  <button
                    key={oppId}
                    onClick={() => moves.raidersGivePsi(oppId, effectivePlayerID)}
                    className="bg-slate-950 border border-slate-800 hover:border-blue-500 p-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-850 cursor-pointer transition-all shadow"
                  >
                    <span className="text-xs font-mono text-slate-400 font-bold">Player {displayPlayerNumber(oppId)}</span>
                    <span className="text-sm font-black text-white">{opp.team?.name}</span>
                    <span className="text-xs text-red-400 font-mono font-bold">{opp.psi.toFixed(1)} PSI</span>
                    <span className="mt-2 text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-bold uppercase">Give 1 PSI</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cardinals Ability: Inspection Banner (When Minimized) */}
      {G.board.pendingCardinals && String(G.board.pendingCardinals.playerID) === String(effectivePlayerID) && cardinalsMinimized && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border-2 border-yellow-400 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 max-w-xl w-[92%] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐦</span>
            <div className="text-left">
              <p className="font-black text-yellow-300 text-sm flex items-center gap-1.5">
                <span>Cardinals Peek Active</span>
                <span className="bg-yellow-400/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/40 uppercase">Inspecting Board</span>
              </p>
              <p className="text-xs text-slate-300">
                Top Deck Card: <strong className="text-white">{G.board.pendingCardinals.topCard?.name}</strong> ({G.board.pendingCardinals.topCard?.position}, Min: {G.board.pendingCardinals.topCard?.minBid})
              </p>
            </div>
          </div>
          <button
            onClick={() => setCardinalsMinimized(false)}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-lg cursor-pointer"
          >
            👀 Return to Card Swap
          </button>
        </div>
      )}

      {/* Cardinals Modal: Top Deck Peek & Swap */}
      {G.board.pendingCardinals && String(G.board.pendingCardinals.playerID) === String(effectivePlayerID) && !cardinalsMinimized && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 p-6 md:p-8 rounded-3xl max-w-3xl w-full text-center shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">🐦</span>
                <h2 className="text-xl sm:text-2xl font-black text-red-400 uppercase tracking-wide">Cardinals Ability: Top Deck Card Peek</h2>
              </div>
              <button
                onClick={() => setCardinalsMinimized(true)}
                className="bg-slate-800 hover:bg-slate-700 text-yellow-300 hover:text-yellow-200 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider border border-yellow-500/40 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                🔍 Inspect Board State
              </button>
            </div>

            {/* Prominent Peeked Card View */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-red-500/40 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <span>🃏</span> Top Card of Player Deck (Incoming Swap)
                </span>
                <span className="text-[10px] text-slate-400">Available to swap into auction block</span>
              </div>
              
              {G.board.pendingCardinals.topCard && (
                <div className={`border-2 p-3.5 rounded-xl ${getCardPhaseStyle(G.board.pendingCardinals.topCard)} border-red-500/60 shadow-lg`}>
                  <div className="flex justify-between items-center text-xs font-black mb-1.5 gap-1.5">
                    <span className="text-yellow-300 font-mono bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-800/60 text-xs">
                      Min: {G.board.pendingCardinals.topCard.minBid}
                    </span>
                    <span className="bg-slate-900 px-2.5 py-0.5 rounded text-blue-300 border border-slate-700 uppercase font-mono font-black text-xs tracking-wider">
                      {G.board.pendingCardinals.topCard.position}
                    </span>
                    <span className="font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-200 text-xs">
                      Max: {getEffectiveCardMaxBid(G.board.pendingCardinals.topCard, G.board.activeEvent)}
                    </span>
                  </div>

                  <p className="font-black text-white text-base leading-snug">{G.board.pendingCardinals.topCard.name}</p>

                  <div className="my-1.5">
                    {renderCardEffects(
                      G.board.pendingCardinals.topCard.effects, 
                      G.board.pendingCardinals.topCard.specialText || G.board.pendingCardinals.topCard.customText
                    )}
                  </div>

                  <div className="border-t border-slate-750/50 pt-1.5 flex justify-between items-center text-[11px]">
                    {renderPhaseBadge(G.board.pendingCardinals.topCard.phase)}
                    <span className="text-red-400 font-bold uppercase text-[10px] tracking-wider">Peeked Card</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-left">
              <p className="text-slate-300 text-xs font-bold uppercase tracking-wider">
                Select an Auction Block Card to Swap Out (or Pass):
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-y-auto flex-1 py-1">
              {G.board.auctionPlayers.map((card, idx) => {
                if (!card) return null;
                return (
                  <div key={card.uniqueId || idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1">
                        <span>{card.position}</span>
                        <span>Min: {card.minBid}</span>
                      </div>
                      <p className="text-xs font-bold text-white">{card.name}</p>
                      <div className="mt-1">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                    </div>
                    <button
                      onClick={() => {
                        setCardinalsMinimized(false);
                        moves.cardinalsSwap(idx, effectivePlayerID);
                      }}
                      className="mt-3 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] py-2 px-2 rounded-lg uppercase tracking-wider cursor-pointer shadow transition-all transform hover:scale-102"
                    >
                      Swap with This ➔
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => setCardinalsMinimized(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                🔍 Inspect Rosters First
              </button>
              <button
                onClick={() => {
                  setCardinalsMinimized(false);
                  moves.cardinalsPass(effectivePlayerID);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-slate-700"
              >
                Pass (Keep Current Cards)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bills Discard Pile Picker Modal */}
      {G.board.pendingBills && String(G.board.pendingBills.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full text-center shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <span className="text-4xl block">🦬</span>
            <h2 className="text-2xl font-black text-blue-400 uppercase tracking-wide">Bills Ability: Discard Pile Market</h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              After the auction, you may pay the Minimum cost for a player in the discard pile (once per game), or pass.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-y-auto flex-1 py-2 pr-1">
              {G.decks.discard && G.decks.discard.map((card, idx) => {
                const canAfford = myPlayer.coins >= card.minBid;
                return (
                  <div key={card.uniqueId || idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-mono font-bold uppercase">{card.position}</span>
                        {renderPhaseBadge(card.phase)}
                      </div>
                      <h3 className="font-bold text-white text-sm mt-1">{card.name}</h3>
                      <p className="text-xs text-yellow-400 font-mono font-bold mt-1">Min: {card.minBid} Coins</p>
                      <div className="mt-2">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => moves.billsBuyDiscard(idx, effectivePlayerID)}
                      className={`mt-3 w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider ${
                        canAfford 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow' 
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Buy for {card.minBid} Coins
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-center">
              <button
                onClick={() => moves.billsPass(effectivePlayerID)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Reveal Flip Overlay */}
      {isEventFlipped && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl animate-bounce-short">
            <span className="text-xs font-black uppercase tracking-widest bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full border border-purple-700">
              Round {G.board.round} Event Revealed
            </span>
            <h2 className="text-3xl font-black text-white mt-4 mb-2">{G.board.activeEvent.name}</h2>
            <div className="bg-slate-950 p-6 rounded-2xl border border-purple-800/50 my-6">
              <p className="text-slate-200 text-base leading-relaxed italic font-serif">"{G.board.activeEvent.effect}"</p>
            </div>
            <button 
              onClick={() => moves.confirmEventReveal()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3.5 rounded-xl text-lg shadow-lg uppercase tracking-wider transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              Continue to Round {G.board.round} Auction 🏈
            </button>
          </div>
        </div>
      )}

      {/* Interactive Lineup Replacement Modal with "Discard Acquired Player" Option */}
      {isPendingReplacementForMe && !peekLineupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wide">Lineup Full! Select Player to Replace</h2>
              <button 
                onClick={() => setPeekLineupModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-700 font-sans cursor-pointer"
                title="Hide modal to view board"
              >
                👁️ Peek Teams Board
              </button>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              You acquired <span className="font-bold text-white">{G.pendingReplacement.wonCard.name}</span>. Select one of your active players to swap out:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {myPlayer.lineup.map((card, idx) => (
                <div 
                  key={card.uniqueId || idx} 
                  onClick={() => moves.replaceLineupCard(idx, effectivePlayerID)}
                  className="bg-slate-950 border-2 border-slate-800 hover:border-red-500 p-4 rounded-2xl cursor-pointer transition-all hover:scale-105 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-bold uppercase">{card.position || 'WR'}</span>
                    <h3 className="font-bold text-white text-base mt-2">{card.name}</h3>
                    <div className="mt-2">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                  </div>
                  <button className="mt-4 w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 py-1.5 rounded-xl font-bold text-xs transition-colors">
                    Replace Card
                  </button>
                </div>
              ))}
            </div>

            {/* Discard Acquired Player Button - Exclusively for Bengals (or Bucs copying Bengals) */}
            {getEffectiveTeamId(myPlayer) === 'bengals' && (
              <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
                <button 
                  onClick={() => moves.discardWonCard(effectivePlayerID)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 px-5 rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer flex items-center gap-2"
                >
                  🗑️ Discard Acquired Player
                </button>
                <span className="text-xs text-slate-400 italic">Bengals Ability: Discard card & keep existing lineup</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Peek Lineup Floating Restore Button */}
      {isPendingReplacementForMe && peekLineupModal && (
        <button 
          onClick={() => setPeekLineupModal(false)}
          className="fixed bottom-6 right-6 bg-yellow-500 text-black font-black px-5 py-3 rounded-2xl shadow-2xl z-50 border-2 border-yellow-300 flex items-center gap-2 text-sm animate-bounce cursor-pointer"
        >
          👁️ Restore Replacement Screen
        </button>
      )}

      {/* Steelers PSI Transfer Visual Alert */}
      {G.board.steelersAlert && (
        <div className="bg-gradient-to-r from-amber-950/80 to-slate-900 border-2 border-amber-500/80 p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide">Steelers Franchise Ability Triggered</h4>
              <p className="text-xs text-slate-200">{G.board.steelersAlert}</p>
            </div>
          </div>
        </div>
      )}

      {/* Jaylen Waddle Coin Bonus Alert */}
      {G.board.waddleBonusAlert && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/80 p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🪙</span>
            <div>
              <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wide">Jaylen Waddle Ability Triggered</h4>
              <p className="text-xs text-slate-200">
                {G.board.waddleBonusAlert.playerName} gained <strong>+1 Coin</strong> immediately for placing a bid on Jaylen Waddle!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Isaiah Pacheco Deck Swap Alert */}
      {G.board.pachecoSwapAlert && (
        <div className="bg-gradient-to-r from-red-950/80 to-amber-950/80 border-2 border-amber-500/80 p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 animate-bounce-short">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide">Isaiah Pacheco Ability Triggered</h4>
              <p className="text-xs text-slate-200">
                Player deck was shuffled! Pacheco was discarded and replaced with <strong>{G.board.pachecoSwapAlert.newCard?.name}</strong>!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chiefs Claim Banner / Button */}
      {G.board.pendingChiefs && String(G.board.pendingChiefs.playerID) === String(effectivePlayerID) && (
        <div className="bg-gradient-to-r from-red-950/80 to-amber-950/80 border-2 border-red-500 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <h4 className="text-base font-black text-amber-400 uppercase tracking-wide">Chiefs Special Ability (Once Per Game)</h4>
              <p className="text-xs text-slate-200">
                {chiefsClaimActive 
                  ? "Click any available auction card below to claim it for its minimum cost without bidding!" 
                  : "You may claim a revealed player for their minimum cost without bidding."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!chiefsClaimActive ? (
              <button
                onClick={() => setChiefsClaimActive(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow cursor-pointer"
              >
                Use Ability
              </button>
            ) : (
              <button
                onClick={() => setChiefsClaimActive(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
              >
                Cancel Selection
              </button>
            )}
            <button
              onClick={() => { setChiefsClaimActive(false); moves.chiefsPass(effectivePlayerID); }}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      {/* Commanders Ability Interactive Selection Modal */}
      {G.board.pendingCommanders && String(G.board.pendingCommanders.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/90 p-5 sm:p-7 rounded-3xl max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <span className="text-3xl">🎖️</span>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-amber-400 uppercase tracking-wide">
                  Washington Commanders Franchise Ability
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select 1 revealed auction player to mark. The First Player (<strong className="text-white">Player {parseInt(G.board.firstPlayer) + 1} - {G.players[G.board.firstPlayer]?.team?.name}</strong>) will be blocked from nominating or bidding on this player until they acquire another card!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1 max-h-[55vh]">
              {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                if (!card) return null;
                return (
                  <div
                    key={card.uniqueId || idx}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-400/80 p-3.5 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.02] shadow"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-xs font-bold text-yellow-400 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-800/50">
                          Min: {card.minBid}
                        </span>
                        <span className="bg-slate-850 px-2 py-0.5 rounded text-blue-300 text-xs font-mono font-black border border-slate-700">
                          {card.position || 'WR'}
                        </span>
                        <span className="font-mono text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-750">
                          Max: {getEffectiveCardMaxBid(card, G.board.activeEvent)}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-white">{card.name}</h4>
                      <div className="mt-1 text-xs">
                        {renderCardEffects(card.effects, card.specialText || card.customText)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => moves.commandersMarkCard(idx, effectivePlayerID)}
                      className="mt-3 w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs py-2.5 rounded-xl uppercase tracking-wider cursor-pointer shadow transition-all"
                    >
                      🎖️ Mark {card.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Eagles Inflation Banner Prompt */}
      {G.board.pendingEagles && String(G.board.pendingEagles.playerID) === String(effectivePlayerID) && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border-2 border-emerald-500 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦅</span>
            <div>
              <h4 className="text-base font-black text-emerald-400 uppercase tracking-wide">Eagles Franchise Ability</h4>
              <p className="text-xs text-slate-200">
                Pay 3 coins to raise every opponent’s PSI by 3, or pay 6 coins to raise by 6 (Limit twice per round). You have <strong>{myPlayer.coins} Coins</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={myPlayer.coins < 3}
              onClick={() => moves.eaglesUseAbility(1, effectivePlayerID)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow ${
                myPlayer.coins >= 3
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
              }`}
              title={myPlayer.coins < 3 ? "Requires 3 coins" : "Pay 3 coins to inflate all opponents +3 PSI"}
            >
              Use Once (-3 Coins)
            </button>
            <button
              disabled={myPlayer.coins < 6}
              onClick={() => moves.eaglesUseAbility(2, effectivePlayerID)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow ${
                myPlayer.coins >= 6
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold cursor-pointer'
                  : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
              }`}
              title={myPlayer.coins < 6 ? "Requires 6 coins" : "Pay 6 coins to inflate all opponents +6 PSI"}
            >
              Use Twice (-6 Coins)
            </button>
            <button
              onClick={() => moves.eaglesPass(effectivePlayerID)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer border border-slate-700"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-wide uppercase">DEFLATEGATE</h1>
          <p className="text-slate-400 text-xs mt-1 uppercase font-bold tracking-widest">Round {G.board.round} / 10 | Phase: {ctx.phase}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Rules Guide Button */}
          <button 
            type="button"
            onClick={() => setShowRules(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs shadow flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span>📖</span> Rules Guide
          </button>

          {/* Jaguars Ability Secret Deck Inspector Button */}
          {isJaguars && (
            <button 
              onClick={openJaguarsModal}
              className="bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 border border-purple-500 text-white font-black px-4 py-2.5 rounded-xl text-xs shadow flex items-center gap-2 cursor-pointer transition-all"
            >
              🃏 Jaguars Secret Event Deck
              {!G.board.jaguarsAbilityUsed && <span className="bg-amber-400 text-black text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase">1-Use Ready</span>}
            </button>
          )}

          {G.board.activeEvent && (
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-800 p-4 rounded-xl max-w-md w-full md:w-auto text-left md:text-right">
              <p className="text-xs text-purple-400 font-extrabold uppercase tracking-wider">Active Round Event</p>
              <p className="text-white font-bold text-lg">{G.board.activeEvent.name}</p>
              <p className="text-slate-300 text-xs mt-1 leading-normal italic">{G.board.activeEvent.effect}</p>
            </div>
          )}
        </div>
      </header>

      {ctx.gameover && (
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 text-white p-8 rounded-2xl text-3xl font-black text-center shadow-xl border border-green-600 animate-pulse">
          🏆 Game Over! Winner: {G.players[ctx.gameover.winner]?.team?.name} (Player {displayPlayerNumber(ctx.gameover.winner)})
        </div>
      )}

      {/* Main Board Content */}
      <div className="space-y-6">
        {/* Auction Block Section */}
        {(ctx.phase === 'auctionPhase' || ctx.phase === 'preAuctionPhase') && (
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                  Auction Block
                </h2>
                {/* Falcons Mulligan Button */}
                {canMulligan && (
                  <button
                    onClick={() => moves.falconsMulligan(effectivePlayerID)}
                    className="bg-red-700 hover:bg-red-600 text-white font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    🦅 Mulligan Remaining Auction Cards (1/Phase)
                  </button>
                )}
              </div>

              {G.board.activeAuctionCardIndex === null ? (
                <div className="flex items-center flex-wrap gap-2">
                  <span className={`text-xs sm:text-sm px-4 py-2 rounded-full font-black uppercase tracking-wide border ${
                    isMyTurnToNominate 
                      ? 'bg-yellow-950/90 border-2 border-yellow-400 text-yellow-300 ring-2 ring-yellow-400/50 shadow-[0_0_25px_rgba(234,179,8,0.5)] animate-pulse' 
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    {isMyTurnToNominate 
                      ? (G.board.auctionPlayers?.filter(c => c !== null).length === 1
                          ? '👉 LAST AVAILABLE PLAYER: Click card to place winning bid!'
                          : (G.board.auctionPlayers?.some(c => c && ((Object.keys(G.players).filter(id => !G.players[id].hasWonAuction).length === 1 && myPlayer?.coins === 0) || myPlayer?.coins >= c.minBid))
                              ? '⭐ YOUR TURN TO NOMINATE! Click any available player card below.'
                              : '⚠️ Insufficient coins to nominate any card'))
                      : `Awaiting Player ${displayPlayerNumber(G.board.nominator)} (${G.players[G.board.nominator]?.team?.name}) to nominate a player card...`}
                  </span>
                  {isMyTurnToNominate && !G.board.auctionPlayers?.some(c => c && ((Object.keys(G.players).filter(id => !G.players[id].hasWonAuction).length === 1 && myPlayer?.coins === 0) || myPlayer?.coins >= c.minBid)) && (
                    <button
                      onClick={() => moves.passNomination && moves.passNomination(effectivePlayerID)}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-3 py-1.5 rounded-full uppercase tracking-wider cursor-pointer shadow ml-2"
                    >
                      Pass Nomination ➔
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  {Object.keys(G.players).filter(id => !G.players[id].hasWonAuction).length === 1 
                    ? 'Sole remaining team! Submit your bid to acquire this player immediately.' 
                    : 'Select a player card to start bidding. Minimum bid applies automatically.'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
              {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                if (!card) {
                  return (
                    <div key={`empty-${idx}`} className="bg-slate-950/40 border border-dashed border-slate-850 p-3.5 sm:p-4 rounded-2xl flex items-center justify-center text-slate-600 italic min-h-[12.5rem] sm:min-h-[13.5rem]">
                      Sold
                    </div>
                  );
                }
                const isSelected = G.board.activeAuctionCardIndex === idx;
                const isCommandersMarked = G.board.commandersMarkedCardIndex === idx;
                const isDjMooreBlockedForMe = card.id === 'dj_moore' && myPlayer?.coins > 10;
                const remainingCardsCount = G.board.auctionPlayers.filter(c => c !== null).length;
                const isCommandersBlockedForMe = isCommandersMarked && String(effectivePlayerID) === String(G.board.firstPlayer) && remainingCardsCount > 1;
                const eligibleBidders = Object.keys(G.players).filter(id => !G.players[id].hasWonAuction);
                const isSoleRemainingBidder = eligibleBidders.length === 1 && eligibleBidders[0] === effectivePlayerID;
                const canAffordCard = (isSoleRemainingBidder && myPlayer?.coins === 0) || (myPlayer?.coins >= card.minBid);
                const canSelect = isMyTurnToNominate && G.board.activeAuctionCardIndex === null && !isDjMooreBlockedForMe && !isCommandersBlockedForMe && canAffordCard;
                const canChiefsClaim = chiefsClaimActive && myPlayer.coins >= card.minBid;

                return (
                  <div 
                    key={card.uniqueId || idx} 
                    onClick={() => { 
                      if (chiefsClaimActive && canChiefsClaim) {
                        moves.chiefsClaimCard(idx, effectivePlayerID);
                        setChiefsClaimActive(false);
                      } else if (canSelect && !isCommandersBlockedForMe) {
                        moves.selectCard(idx, effectivePlayerID); 
                      }
                    }}
                    className={`border-2 p-3.5 sm:p-4 rounded-2xl transition-all flex flex-col justify-between min-h-[12.5rem] sm:min-h-[13.5rem] select-none relative ${getCardPhaseStyle(card)} ${
                      isSelected ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)] bg-slate-850 ring-2 ring-yellow-400 scale-[1.02]' :
                      chiefsClaimActive && canChiefsClaim ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer ring-2 ring-amber-400 animate-pulse' :
                      isCommandersBlockedForMe ? 'opacity-50 border-red-900/80 cursor-not-allowed bg-red-950/20' :
                      canSelect ? 'border-yellow-400 bg-yellow-950/20 ring-2 ring-yellow-400/80 shadow-[0_0_22px_rgba(234,179,8,0.5)] animate-pulse cursor-pointer hover:border-yellow-300 hover:scale-[1.03]' :
                      isDjMooreBlockedForMe ? 'opacity-70 border-red-900/60 cursor-not-allowed' :
                      isMyTurnToNominate && !canAffordCard ? 'opacity-40 border-slate-800 cursor-not-allowed' :
                      'opacity-85'
                    }`}
                  >
                    {/* Top Row: Min (Left) | Position (Middle) | Max (Right) */}
                    <div className="flex justify-between items-center text-xs font-black mb-1 gap-1.5">
                      <span className="whitespace-nowrap shrink-0 text-yellow-300 font-mono bg-yellow-950/80 px-2 py-0.5 rounded border border-yellow-800/60 shadow-sm text-[11px] sm:text-xs">
                        Min: {card.minBid}
                      </span>
                      <span className="shrink-0 bg-slate-900 px-2 py-0.5 rounded text-blue-300 border border-slate-700 uppercase font-mono font-black text-[11px] sm:text-xs tracking-wider">
                        {card.position || 'WR'}
                      </span>
                      <span className={`whitespace-nowrap shrink-0 font-mono px-2 py-0.5 rounded border shadow-sm text-[11px] sm:text-xs flex items-center gap-1 ${
                        G.board.activeEvent?.category === 'overpaid'
                          ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 font-black ring-1 ring-amber-500/50'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
                      }`}>
                        Max: {getEffectiveCardMaxBid(card, G.board.activeEvent)}
                        {G.board.activeEvent?.category === 'overpaid' && (
                          <span className="text-amber-400 font-black">▲</span>
                        )}
                      </span>
                    </div>

                    {G.board.activeEvent?.category === 'overpaid' && (
                      <span className="text-[10px] sm:text-xs bg-amber-950 border border-amber-700 text-amber-300 px-1.5 py-0.5 rounded font-black tracking-tighter uppercase my-0.5 text-center animate-pulse">
                        ⚡ +4 Overpaid Max ▲
                      </span>
                    )}

                    {/* Middle: Player Name & Primary Attributes */}
                    <div className="my-1 text-left">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-white leading-tight">
                          {card.name}
                        </span>
                        {isCommandersMarked && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            isCommandersBlockedForMe
                              ? 'bg-red-800 text-white border border-red-500 animate-pulse'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}>
                            {isCommandersBlockedForMe ? '🚫 Blocked for First Player' : '🎖️ Commanders Targeted'}
                          </span>
                        )}
                      </div>
                      <div className="mt-1">
                        {renderCardEffects(card.effects, card.specialText || card.customText)}
                      </div>
                    </div>

                    {/* Bottom: Phase Label & Badges */}
                    <div className="border-t border-slate-750/50 pt-2 text-center flex flex-col items-center gap-1.5">
                      {renderPhaseBadge(card.phase)}

                      {chiefsClaimActive && canChiefsClaim && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moves.chiefsClaimCard(idx);
                            setChiefsClaimActive(false);
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black text-xs py-1.5 rounded-lg uppercase tracking-wider cursor-pointer shadow"
                        >
                          Use Ability
                        </button>
                      )}

                      {canSelect && (
                        <span className="text-[11px] sm:text-xs bg-yellow-400 text-black px-2.5 py-1 rounded-md font-black tracking-wider uppercase block shadow hover:bg-yellow-300">
                          👉 Click to Nominate
                        </span>
                      )}

                      {isCommandersBlockedForMe && isMyTurnToNominate && (
                        <span className="text-[10px] sm:text-xs bg-red-950 text-red-400 border border-red-800 px-2.5 py-0.5 rounded-md font-bold block shadow">
                          🚫 Blocked for First Player
                        </span>
                      )}

                      {isSelected && (
                        <span className="text-xs bg-yellow-400 text-black px-2.5 py-0.5 rounded-md font-black tracking-wider uppercase block shadow">
                          Nominated
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Bidding Panel & Step-By-Step Controls */}
        {ctx.phase === 'auctionPhase' && (
          <div className="bg-slate-900 p-6 rounded-2xl border-2 border-yellow-500/50 shadow-xl space-y-4">
            {/* CPU Advancement & Turn Skip Control Bar */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-4 transition-all ${
              G.board.activeAuctionCardIndex === null && isMyTurnToNominate
                ? 'bg-gradient-to-r from-yellow-950/90 via-amber-950/80 to-slate-950 border-2 border-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.4)]'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  G.board.activeAuctionCardIndex === null && isMyTurnToNominate
                    ? 'bg-yellow-400 ring-4 ring-yellow-400/40 animate-ping'
                    : 'bg-yellow-500 animate-ping'
                }`}></span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {G.board.activeAuctionCardIndex === null ? (
                      isMyTurnToNominate ? (
                        <span className="text-yellow-300 font-extrabold flex items-center gap-2">
                          <span>⭐ Current Turn: Player {displayPlayerNumber(effectivePlayerID)} (YOU)</span>
                          <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-black uppercase tracking-wider">Your Nomination</span>
                        </span>
                      ) : (
                        <span>Current Turn: Player {displayPlayerNumber(G.board.nominator)} ({G.players[G.board.nominator]?.team?.name || 'Player'} {G.players[G.board.nominator]?.isCpu ? 'CPU' : ''})</span>
                      )
                    ) : (
                      <span>Current Turn: Player {displayPlayerNumber(ctx.currentPlayer)} ({currentPlayerObj ? currentPlayerObj.team?.name : ''} {isCpuTurn ? 'CPU' : 'Player'})</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 italic">
                    {G.board.activeAuctionCardIndex === null
                      ? (isMyTurnToNominate ? '⭐ It is your turn! Click any highlighted player card above to start the auction.' : `Awaiting Player ${displayPlayerNumber(G.board.nominator)} nomination...`)
                      : (G.board.lastActionText || (isCpuTurn ? 'CPU is thinking...' : 'Awaiting player decision...'))}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {isCpuTurn && (
                  <button 
                    onClick={() => moves.stepCpuTurn()}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex-1 sm:flex-none shadow cursor-pointer"
                  >
                    Next CPU Action ➔
                  </button>
                )}

                {!humanHasWonInRound && isCpuTurn && (
                  <button 
                    onClick={() => setSkipMode('myTurn')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex-1 sm:flex-none border border-slate-700 cursor-pointer"
                  >
                    Skip to My Turn ⏩
                  </button>
                )}

                {/* Skip to Refresh Phase button (Active only after human acquires a player in the round) */}
                <button 
                  onClick={() => { if (humanHasWonInRound) setSkipMode('refresh'); }}
                  disabled={!humanHasWonInRound}
                  title={humanHasWonInRound ? 'Skip remaining CPU auction turns to Refresh Phase' : 'Acquire a player first to enable Skip to Refresh Phase'}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex-1 sm:flex-none transition-all ${
                    humanHasWonInRound
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg cursor-pointer'
                      : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
                  }`}
                >
                  Skip to Refresh Phase ⏩
                </button>
              </div>
            </div>

            {/* Active Auction Card Info & Human Moves */}
            {activeCard && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-2">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center w-28">
                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wide">Current Bid</span>
                    <p className="text-3xl font-black text-white font-mono mt-1">{G.board.highestBid}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex flex-wrap items-center gap-2">
                      <span>Bidding on: <span className="text-blue-400">{activeCard.name}</span> <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">({activeCard.position})</span></span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        G.board.activeEvent?.category === 'overpaid'
                          ? 'bg-amber-950/90 border-amber-500/80 text-amber-300 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        Max: {effMaxBid}{G.board.activeEvent?.category === 'overpaid' ? ' ▲' : ''}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Highest Bidder:{' '}
                      <span className="font-bold text-slate-200">
                        {G.board.highestBidder !== null ? `${G.players[G.board.highestBidder]?.team?.name}` : 'None (Starts at ' + activeCard.minBid + ')'}
                      </span>
                    </p>
                  </div>
                </div>

                {isMyTurn && (() => {
                  const isDjMooreBlockedForBid = activeCard?.id === 'dj_moore' && myPlayer?.coins > 10;
                  const remainingAuctionCards = G.board.auctionPlayers ? G.board.auctionPlayers.filter(c => c !== null).length : 0;
                  const isCommandersBlockedForBid = G.board.commandersMarkedCardIndex !== null &&
                    G.board.activeAuctionCardIndex === G.board.commandersMarkedCardIndex &&
                    String(effectivePlayerID) === String(G.board.firstPlayer) &&
                    remainingAuctionCards > 1;
                  return (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-3 w-full md:w-auto">
                      {isCommandersBlockedForBid ? (
                        <span className="text-xs font-black text-red-400 uppercase tracking-wider bg-red-950/80 border border-red-800 px-3 py-1.5 rounded-lg text-center">
                          🚫 Commanders Restriction: You are the First Player and cannot bid on this player! Please Pass.
                        </span>
                      ) : isDjMooreBlockedForBid ? (
                        <span className="text-xs font-black text-red-400 uppercase tracking-wider bg-red-950/80 border border-red-800 px-3 py-1.5 rounded-lg text-center">
                          🚫 DJ Moore Restriction: Only teams with ≤10 coins may bid (You have {myPlayer.coins} Coins)
                        </span>
                      ) : (
                        <span className="text-xs font-black text-green-400 uppercase tracking-wider">
                          🚨 YOUR TURN TO BID
                        </span>
                      )}

                      {activeCard?.id === 'tyreek_hill' && (
                        <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded text-center">
                          ⚡ Tyreek Hill Speed Tax: Placed bid will deflate 1 PSI immediately!
                        </span>
                      )}

                      <div className="flex flex-wrap gap-3 items-center justify-center">
                        <button 
                          onClick={() => moves.pass(effectivePlayerID)}
                          disabled={G.board.highestBidder === null && !isCommandersBlockedForBid}
                          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            (G.board.highestBidder !== null || isCommandersBlockedForBid)
                              ? 'bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 cursor-pointer'
                              : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
                          }`}
                          title={G.board.highestBidder === null && !isCommandersBlockedForBid ? 'Nominator must place the opening bid' : 'Pass on this player'}
                        >
                          Pass
                        </button>

                        {/* Custom Bid Control Stepper with Min/Max boundaries */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                          <button 
                            onClick={() => setCustomBid(Math.max(nextBid, customBid - 1))}
                            className="px-3 py-2 text-slate-400 hover:text-white font-black cursor-pointer text-xs select-none"
                            title="Decrease Bid"
                          >
                            ◀
                          </button>
                          <input 
                            type="number" 
                            value={customBid}
                            min={nextBid}
                            max={maxAllowedBid}
                            onChange={e => {
                              const val = parseInt(e.target.value);
                              if (isNaN(val)) return;
                              setCustomBid(Math.min(maxAllowedBid, Math.max(nextBid, val)));
                            }}
                            className="w-14 bg-transparent text-center font-mono font-bold text-white text-sm outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button 
                            onClick={() => setCustomBid(Math.min(maxAllowedBid, customBid + 1))}
                            className="px-3 py-2 text-slate-400 hover:text-white font-black cursor-pointer text-xs select-none"
                            title="Increase Bid"
                          >
                            ▶
                          </button>
                        </div>

                        <button 
                          onClick={() => moves.bid(customBid, effectivePlayerID)}
                          disabled={
                            isCommandersBlockedForBid || (
                              isSoleRemainingZeroCoins
                                ? false
                                : (isDjMooreBlockedForBid || myPlayer.coins < customBid || customBid < nextBid || customBid > maxAllowedBid)
                            )
                          }
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                            !isCommandersBlockedForBid && (isSoleRemainingZeroCoins || (!isDjMooreBlockedForBid && myPlayer.coins >= customBid && customBid >= nextBid && customBid <= maxAllowedBid))
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 cursor-pointer'
                              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {isSoleRemainingZeroCoins ? 'Acquire for 0 Coins' : `Bid ${customBid} Coins`}
                        </button>

                        {/* Dynamic Buy Max Button: Capped at effMaxBid, disabled & greyed out if coins < effMaxBid */}
                        <button 
                          onClick={() => moves.bid(effMaxBid, effectivePlayerID)}
                          disabled={isCommandersBlockedForBid || isDjMooreBlockedForBid || myPlayer.coins < effMaxBid || effMaxBid < nextBid}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black shadow transition-all ${
                            !isCommandersBlockedForBid && !isDjMooreBlockedForBid && myPlayer.coins >= effMaxBid && effMaxBid >= nextBid
                              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black cursor-pointer'
                              : 'bg-slate-800 text-slate-600 border border-slate-850 cursor-not-allowed opacity-50'
                          }`}
                          title={
                            isCommandersBlockedForBid 
                              ? 'First Player blocked from bidding on marked player' 
                              : myPlayer.coins < effMaxBid 
                                ? `Requires ${effMaxBid} coins to Buy Max` 
                                : `Buy Max for ${effMaxBid} coins`
                          }
                        >
                          Buy Max ({effMaxBid}{G.board.activeEvent?.category === 'overpaid' ? ' ▲' : ''})
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Player Roster Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {Object.keys(G.players).map(id => {
            const p = G.players[id];
            if (!p.team) return null;
            const isCurrent = ctx.currentPlayer === id;
            const isNominator = String(G.board.nominator) === String(id);
            const displayId = displayPlayerNumber(id);
            const hasPassed = G.board.passedAuctionPlayers ? G.board.passedAuctionPlayers.includes(id) : false;
            const isHighest = G.board.highestBidder === id;
            const effectiveTeam = p.copiedTeam ? p.copiedTeam : p.team;
            const isColts = effectiveTeam.id === 'colts';
            const isRams = effectiveTeam.id === 'rams';
            const maxLineup = (effectiveTeam.id === 'seahawks' ? 4 : 3) + (p.extraLineupSlots || 0);

            const teamIdx = Object.keys(G.players).indexOf(id);
            const isRefreshPhase = ctx.phase === 'refreshPhase';
            const isRefreshActiveTeam = isRefreshPhase && G.board.refreshStage === 'animating' && G.board.refreshStepIndex === teamIdx;
            const hasFinishedRefresh = isRefreshPhase && (
              G.board.refreshStage === 'complete' ||
              (G.board.refreshStage === 'animating' && teamIdx < G.board.refreshStepIndex)
            );
            const teamRes = G.board.refreshResults ? G.board.refreshResults.find(r => String(r.id) === String(id)) : null;

            const displayCoins = (isRefreshPhase && teamRes && !hasFinishedRefresh && G.board.refreshStage !== 'complete')
              ? teamRes.prevCoins
              : p.coins;
            const displayPsi = (isRefreshPhase && teamRes && !hasFinishedRefresh && G.board.refreshStage !== 'complete')
              ? teamRes.prevPsi
              : p.psi;

            const isOutOfBidding = (ctx.phase === 'auctionPhase' || ctx.phase === 'preAuctionPhase') && p.hasWonAuction;

            return (
              <div 
                key={id} 
                className={`border-2 rounded-2xl p-5 transition-all flex flex-col justify-between relative ${
                  isRefreshActiveTeam
                    ? 'bg-slate-900 border-yellow-400 ring-4 ring-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.6)] scale-[1.03] z-10'
                    : isOutOfBidding
                      ? 'bg-gradient-to-b from-red-950/30 to-slate-900 border-red-600 ring-2 ring-red-600/70 shadow-[0_0_20px_rgba(239,68,68,0.35)] opacity-90'
                      : isCurrent 
                        ? 'bg-slate-900 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-1 ring-blue-500/50' 
                        : 'bg-slate-900 border-slate-850'
                }`}
              >
                {/* 1st Player / Nominator Badge */}
                {isNominator && (
                  <span className="bg-yellow-500 text-black text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow inline-block mb-2 self-start">
                    ⭐ Active Nominator
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-100 flex items-center gap-1.5">
                        {p.team.name}
                        <span className="text-xs text-slate-500 font-bold font-mono">(Player {displayId})</span>
                      </h2>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {p.isCpu && (
                          <span className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            CPU
                          </span>
                        )}
                        {isOutOfBidding && (
                          <span className="bg-red-950 border border-red-600 text-red-300 text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <span>🚫</span> OUT OF BIDDING
                          </span>
                        )}
                        {hasPassed && !isOutOfBidding && (
                          <span className="bg-red-950 border border-red-800 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            PASSED
                          </span>
                        )}
                        {isHighest && (
                          <span className="bg-yellow-950 border border-yellow-700 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            HIGHEST BID
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Round Refresh Summary Badge */}
                  {hasFinishedRefresh && teamRes && (
                    <div className="bg-gradient-to-r from-emerald-950 to-slate-900 border-2 border-emerald-500/80 p-3 rounded-xl mb-3 text-center shadow-lg animate-bounce-short">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                        ✅ Round {G.board.round} Refresh Summary
                      </span>
                      <div className="flex justify-center items-center gap-3 font-mono font-black text-sm">
                        <span className="text-yellow-400">+{teamRes.coinsGained} Coins 🪙</span>
                        <span className="text-slate-600">|</span>
                        {teamRes.psiDeflated >= 0 ? (
                          <span className="text-emerald-400">-{teamRes.psiDeflated.toFixed(1)} PSI 🏈</span>
                        ) : (
                          <span className="text-red-400">+{Math.abs(teamRes.psiDeflated).toFixed(1)} PSI 🏈</span>
                        )}
                      </div>
                      {teamRes.dolphinsTriggered && (
                        <span className="text-[10px] text-cyan-300 font-bold block mt-1">
                          🐬 Dolphins +3 Coins Protection
                        </span>
                      )}
                    </div>
                  )}

                  {/* PROMINENT TEAM ABILITY HEADER BOX */}
                  <div className="bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-800/80 p-3.5 rounded-xl mb-4 shadow-inner">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-400">⚡ Team Ability</span>
                      {p.copiedTeam && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                          Copied {p.copiedTeam.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-purple-100 font-semibold leading-relaxed">{effectiveTeam.ability}</p>
                    
                    {/* Rams 2x Token Action Button */}
                    {isRams && String(id) === String(effectivePlayerID) && !p.ramsTokenAttached && (
                      <button
                        onClick={() => setRamsSelectionMode(!ramsSelectionMode)}
                        className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-1.5 rounded-lg text-xs uppercase tracking-wider shadow cursor-pointer"
                      >
                        {ramsSelectionMode ? 'Cancel 2x Selection' : '🐏 Use Ability: Attach 2x Token (1-Time)'}
                      </button>
                    )}
                  </div>

                  <div className={`grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border mb-4 transition-all ${
                    isRefreshActiveTeam ? 'border-yellow-500/80 ring-2 ring-yellow-500/40 bg-yellow-950/20' : 'border-slate-850'
                  }`}>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block">Coins</span>
                      <span className={`text-xl font-black font-mono transition-all ${
                        isRefreshActiveTeam ? 'text-yellow-300 scale-110' : 'text-slate-100'
                      }`}>
                        {displayCoins}
                      </span>
                    </div>
                    <div className="text-center border-l border-slate-850">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">PSI</span>
                      <span className={`text-xl font-black font-mono transition-all ${
                        isRefreshActiveTeam ? 'text-red-300 scale-110' : 'text-slate-100'
                      }`}>
                        {displayPsi.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 border-b border-slate-800 pb-1 flex justify-between">
                      <span>Lineup</span>
                      <span>({p.lineup.length}{isColts ? ' / ∞' : ` / ${maxLineup}`})</span>
                    </p>
                    {(() => {
                      const displayLineup = isColts ? [...p.lineup].reverse() : p.lineup;
                      const isColtsExpanded = Boolean(coltsExpandedMap[id] || coltsHoveredId === id);
                      const visibleLineup = (isColts && !isColtsExpanded && displayLineup.length > 4)
                        ? displayLineup.slice(0, 4)
                        : displayLineup;

                      return (
                        <div 
                          className="relative"
                          onMouseEnter={() => { if (isColts && displayLineup.length > 4) setColtsHoveredId(id); }}
                          onMouseLeave={() => { if (isColts) setColtsHoveredId(null); }}
                        >
                          <div className={`space-y-2 pr-0.5 ${isColts && isColtsExpanded && displayLineup.length > 4 ? 'max-h-96 overflow-y-auto' : ''}`}>
                            <ul className="space-y-2">
                              {visibleLineup.map((card, cidx) => {
                                const isBroncosIgnored = card.broncosRoundAcquired === G.board.round;
                                const hasRamsDouble = card.ramsDoubleToken;
                                const canAttachRams = ramsSelectionMode && String(id) === String(effectivePlayerID) && card.phase !== 1 && !card.isPracticeSquad && !card.uniqueId?.startsWith('ps_');

                                const isQbChoiceEvent = G.board.activeEvent?.category === 'qb_choice';
                                const hasBothQbEffects = isQbChoiceEvent && card.position === 'QB' && card.effects?.some(e => e.type === 'coins') && card.effects?.some(e => e.type === 'deflate');
                                const qbChoiceVal = G.board.qbChoices?.[card.uniqueId] || G.board.qbChoices?.[card.id] || (p.isCpu ? (p.psi > 10 ? 'deflate' : 'coins') : 'deflate');

                                return (
                                  <li 
                                    key={card.uniqueId || card.id || cidx} 
                                    className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 ${getCardPhaseStyle(card)} ${
                                      hasRamsDouble ? 'ring-2 ring-amber-400 border-amber-400' : ''
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] bg-slate-800 text-blue-400 font-bold px-1.5 py-0.5 rounded">{card.position || 'WR'}</span>
                                        <p className="text-xs font-bold text-slate-200">{card.name}</p>
                                        {isColts && cidx === 0 && !card.isPracticeSquad && !card.uniqueId?.startsWith('ps_') && (
                                          <span className="text-[9px] bg-blue-900/80 border border-blue-600 text-blue-300 font-black px-1.5 py-0.5 rounded uppercase">
                                            Latest
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {renderPhaseBadge(card.phase)}
                                        {hasRamsDouble && (
                                          <span className="text-[9px] bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black px-1.5 py-0.5 rounded uppercase shadow animate-pulse">
                                            2X RAMS
                                          </span>
                                        )}
                                        {isBroncosIgnored && (
                                          <span className="text-[9px] bg-red-950 border border-red-700 text-red-300 font-bold px-1.5 py-0.5 rounded uppercase">
                                            🚫 Ignored (1st Round)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center text-right">
                                      <div className="text-left">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                                      {canAttachRams && (
                                        <button
                                          onClick={() => {
                                            moves.ramsApplyDoubleToken(card.uniqueId, effectivePlayerID);
                                            setRamsSelectionMode(false);
                                          }}
                                          className="bg-amber-500 hover:bg-amber-400 text-black font-black px-2 py-1 rounded text-[10px] uppercase cursor-pointer"
                                        >
                                          Attach 2x
                                        </button>
                                      )}
                                    </div>

                                    {/* Refs Check Event: Quarterback Choice Toggle */}
                                    {hasBothQbEffects && (
                                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-purple-400 font-bold">Refs Check:</span>
                                        {String(id) === String(effectivePlayerID) ? (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => moves.setQbChoice(card.uniqueId || card.id, 'coins')}
                                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                                                qbChoiceVal === 'coins'
                                                  ? 'bg-yellow-400 text-black shadow'
                                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                                              }`}
                                            >
                                              🪙 Coins
                                            </button>
                                            <button
                                              onClick={() => moves.setQbChoice(card.uniqueId || card.id, 'deflate')}
                                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                                                qbChoiceVal === 'deflate'
                                                  ? 'bg-red-500 text-white shadow'
                                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                                              }`}
                                            >
                                              🏈 Deflate
                                            </button>
                                          </div>
                                        ) : (
                                          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
                                            {qbChoiceVal.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                            {isColts && displayLineup.length > 4 && (
                              <button
                                type="button"
                                onClick={() => setColtsExpandedMap(prev => ({ ...prev, [id]: !prev[id] }))}
                                title={`Full Colts Squad (${displayLineup.length} players):\n` + displayLineup.map((c, i) => `${i + 1}. ${c.name} (${c.position || 'WR'})`).join('\n')}
                                className="w-full text-center py-1.5 px-2 mt-2 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-[11px] font-black text-indigo-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <span>
                                  {isColtsExpanded
                                    ? `▲ Collapse Squad (Showing all ${displayLineup.length})`
                                    : `▼ +${displayLineup.length - 4} More on Squad (Hover / Click to View All)`}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Log / Event Feed at the Very Bottom */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl mt-8">
          <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
            <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
              📜 Debug Game Feed Log
            </h2>
            <button 
              onClick={() => setShowLog(!showLog)}
              className="text-xs text-blue-400 font-bold hover:underline cursor-pointer"
            >
              {showLog ? 'Hide Feed' : 'Show Feed'}
            </button>
          </div>

          {showLog && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
              {G.logs && G.logs.map(log => (
                <div key={log.id} className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-300 leading-normal">
                  <span className="text-blue-400 font-bold mr-1.5">[R{log.round}]</span>
                  {log.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* In-Game Rules Guide Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};

const App = () => {
  const [inGame, setInGame] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [playMode, setPlayMode] = useState('local_vs_cpu'); // 'local_vs_cpu', 'pvp_cpu', 'pass_and_play', 'online'
  const [numPlayers, setNumPlayers] = useState(4);
  const [numHumansChoice, setNumHumansChoice] = useState(2);
  const [playerID, setPlayerID] = useState('0');
  const [matchIdChoice, setMatchIdChoice] = useState('room-1');

  let actualNumHumans = 1;
  if (playMode === 'local_vs_cpu') actualNumHumans = 1;
  else if (playMode === 'pass_and_play') actualNumHumans = numPlayers;
  else if (playMode === 'pvp_cpu' || playMode === 'online') {
    actualNumHumans = Math.max(2, Math.min(numPlayers, numHumansChoice));
  }

  const DeflategateClient = React.useMemo(() => {
    const config = {
      game: DeflategateGame,
      board: DeflategateBoard,
      numPlayers: numPlayers,
      debug: false,
      setupData: { numHumans: actualNumHumans }
    };
    if (playMode === 'online') {
      let serverUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '3000') {
        serverUrl = `http://${window.location.hostname || 'localhost'}:8000`;
      } else {
        serverUrl = window.location.origin;
      }
      config.multiplayer = SocketIO({ server: serverUrl });
    }
    return Client(config);
  }, [numPlayers, playMode, actualNumHumans]);

  if (!inGame) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 font-sans">
        <div className="bg-slate-900 p-8 sm:p-10 rounded-3xl border-2 border-slate-800 max-w-lg w-full text-center shadow-2xl space-y-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-wide uppercase px-1">
              DEFLATEGATE
            </h1>
            <p className="text-slate-400 mt-1 italic text-xs sm:text-sm">The Ultimate NFL Auction & Strategy Game</p>
          </div>

          {/* Mode Selector */}
          <div className="text-left">
            <label className="block text-slate-400 font-bold mb-2 uppercase text-[10px] tracking-wider font-sans">Select Game Mode</label>
            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wider">
              <button 
                onClick={() => setPlayMode('local_vs_cpu')}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  playMode === 'local_vs_cpu' 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                vs CPU (Solo)
              </button>
              <button 
                onClick={() => setPlayMode('pvp_cpu')}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  playMode === 'pvp_cpu' 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                PvP vs CPU
              </button>
              <button 
                onClick={() => setPlayMode('pass_and_play')}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  playMode === 'pass_and_play' 
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/25' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                Pass & Play (All Humans)
              </button>
              <button 
                onClick={() => setPlayMode('online')}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  playMode === 'online' 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/25' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                Online Multi-Device
              </button>
            </div>
          </div>

          {playMode === 'online' && (
            <div className="bg-indigo-950/50 border border-indigo-500/40 p-4 rounded-2xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <span>🌐</span> Room / Match ID
                </span>
                <span className="text-[10px] text-slate-400">Must match on both laptops</span>
              </div>
              <input 
                type="text"
                value={matchIdChoice}
                onChange={e => setMatchIdChoice(e.target.value || 'room-1')}
                placeholder="e.g. room-1"
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm outline-none focus:border-indigo-400"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">Total Teams (4-10)</label>
              <input 
                type="number" 
                min="4" max="10" 
                value={numPlayers} 
                onChange={e => {
                  const val = parseInt(e.target.value) || 4;
                  setNumPlayers(val);
                  if (numHumansChoice > val) setNumHumansChoice(val);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold text-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {playMode === 'pvp_cpu' || playMode === 'online' ? (
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">Human Players (2 to {numPlayers})</label>
                <input 
                  type="number" 
                  min="2" max={numPlayers} 
                  value={actualNumHumans} 
                  onChange={e => setNumHumansChoice(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold text-lg outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
                {playMode === 'online' ? 'Play On This Computer As' : 'Default View As'}
              </label>
              <select 
                value={playerID} 
                onChange={e => setPlayerID(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold text-lg outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
              >
                {[...Array(actualNumHumans)].map((_, i) => (
                  <option key={i} value={i.toString()}>Player {i + 1} {playMode === 'online' && i === 0 ? '(Host)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-xs text-slate-400 text-left space-y-1">
            <div className="flex justify-between font-mono">
              <span>Human Players:</span>
              <span className="text-emerald-400 font-bold">{actualNumHumans}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>CPU Opponents:</span>
              <span className="text-yellow-400 font-bold">{Math.max(0, numPlayers - actualNumHumans)}</span>
            </div>
          </div>

          {playMode === 'online' && (
            <div className="bg-slate-950/80 border border-indigo-500/30 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="font-bold text-indigo-300 flex items-center gap-2">
                <span>💡</span> Wi-Fi Connection Guide:
              </div>
              <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
                <li>Host computer: Run <code className="bg-slate-900 text-amber-300 px-1 py-0.5 rounded font-mono">npm run server</code> in terminal.</li>
                <li>Wife's laptop: Open browser to <code className="bg-slate-900 text-emerald-300 px-1 py-0.5 rounded font-mono">http://{window.location.hostname || '192.168.12.74'}:3000</code></li>
                <li>Both select <strong>Online Multi-Device</strong> and match Room ID (<strong>{matchIdChoice}</strong>).</li>
                <li>Host joins as <strong>Player 1</strong>; Wife joins as <strong>Player 2</strong>!</li>
              </ul>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setShowRules(true)}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-750 hover:border-slate-500 text-slate-200 font-bold text-xs py-3 rounded-2xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📖</span> How to Play & Rules Guide
          </button>

          <button 
            onClick={() => setInGame(true)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg py-4 rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            START GAME 🏈
          </button>
        </div>

        {/* Lobby Rules Guide Modal */}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    );
  }

  return (
    <DeflategateClient 
      matchID={matchIdChoice || "deflategate-match"} 
      playerID={playerID} 
      vsCpu={actualNumHumans < numPlayers}
      playMode={playMode}
      numHumans={actualNumHumans}
      setupData={{ numHumans: actualNumHumans }}
    />
  );
};

export default App;
