import React, { useState, useEffect, useRef } from 'react';
import { getEffectiveTeamId, getEffectiveCardMaxBid, isGenuinePlayerCard } from '../Game';
import { TEAMS, EVENTS } from '../GameData';
import { RulesModal, RollingSlotCounter } from './RulesModal';

export const DesktopDeflategateBoardArena = ({ 
  G, 
  ctx, 
  moves, 
  playerID, 
  vsCpu, 
  playMode, 
  numHumans: initialNumHumans, 
  setIsMobile, 
  toggleDesktopUi 
}) => {
  const [showRules, setShowRules] = useState(false);
  const [showLog, setShowLog] = useState(false);
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
  const [activeToast, setActiveToast] = useState(null);
  const lastToastIdRef = useRef(null);
  const [replaceLocked, setReplaceLocked] = useState(false);
  const [selectedNominationIndex, setSelectedNominationIndex] = useState(0);

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

  const nextBid = activeCard ? (
    G.board.highestBidder !== null 
      ? (isSoleRemainingZeroCoins ? 0 : Math.max(activeCard.minBid, G.board.highestBid + bidIncrement))
      : (isSoleRemainingZeroCoins ? 0 : activeCard.minBid)
  ) : 0;
  const effectiveTeam = myPlayer && myPlayer.team ? (myPlayer.copiedTeam ? myPlayer.copiedTeam : myPlayer.team) : null;
  const isJaguars = effectiveTeam && effectiveTeam.id === 'jaguars';

  const effMaxBid = activeCard ? getEffectiveCardMaxBid(activeCard, G.board.activeEvent) : 0;
  const maxAllowedBid = activeCard && myPlayer ? (isSoleRemainingZeroCoins ? 0 : Math.min(myPlayer.coins, effMaxBid)) : 0;

  const activeCardId = activeCard?.uniqueId || G.board.activeAuctionCardIndex;
  const lastActiveCardRef = useRef(null);

  useEffect(() => {
    if (activeCardId !== lastActiveCardRef.current) {
      lastActiveCardRef.current = activeCardId;
      if (isSoleRemainingZeroCoins) {
        setCustomBid(0);
      } else if (nextBid > 0) {
        setCustomBid(nextBid);
      }
    } else {
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
    }
  }, [activeCardId, nextBid, maxAllowedBid, isSoleRemainingZeroCoins]);

  // Transient 1.8s toast for CPU / franchise abilities
  useEffect(() => {
    if (G.board.abilityNotification && G.board.abilityNotification.id !== lastToastIdRef.current) {
      lastToastIdRef.current = G.board.abilityNotification.id;
      setActiveToast(G.board.abilityNotification);
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [G.board.abilityNotification]);

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
  const isPendingReplacementForMe = Boolean(G.pendingReplacement && String(G.pendingReplacement.playerID) === String(effectivePlayerID));

  const activeActingPlayerId = (ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null)
    ? String(G.board.nominator)
    : String(ctx.currentPlayer);
  const isCpuTurn = Boolean(G.players[activeActingPlayerId]?.isCpu);
  const isMyTurnToNominate = ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null && String(G.board.nominator) === String(effectivePlayerID);
  const isMyTurnToBid = ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex !== null && String(ctx.currentPlayer) === String(effectivePlayerID) && !humanHasWonInRound;

  // 800ms mouse delay when replacement modal pops up to prevent accidental misclicks
  useEffect(() => {
    if (isPendingReplacementForMe) {
      setReplaceLocked(true);
      const timer = setTimeout(() => {
        setReplaceLocked(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setReplaceLocked(false);
    }
  }, [isPendingReplacementForMe, G.pendingReplacement?.wonCard?.uniqueId]);

  // Falcons Phase Check for Mulligan
  let currentPhaseKey = 'p1';
  if (G.board.round >= 4 && G.board.round <= 6) currentPhaseKey = 'p2';
  if (G.board.round >= 7) currentPhaseKey = 'p3';
  const canMulligan = effectiveTeam && effectiveTeam.id === 'falcons' && ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null && !myPlayer?.hasWonAuction && !myPlayer?.falconsPhaseUses?.[currentPhaseKey];

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
      if (activeActingPlayerId === effectivePlayerID || humanHasWonInRound) {
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
  }, [skipMode, activeActingPlayerId, ctx.phase, isCpuTurn, G.pendingReplacement, humanHasWonInRound, effectivePlayerID, moves]);

  // Minimal clean text pill for position
  const renderPositionTag = (position) => (
    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
      {position || 'WR'}
    </span>
  );

  // Formatter for player card effects with high readability
  const renderCardEffects = (effects, specialText) => {
    return (
      <div className="space-y-1 my-1.5">
        {effects && Array.isArray(effects) && effects.map((eff, i) => {
          const symbolElement = eff.perRound ? (
            <span 
              title="Refresh Effect: Triggers every round" 
              className="cursor-help inline-block ml-1 hover:scale-110 transition-transform select-none text-emerald-400 font-bold"
            >
              🔄
            </span>
          ) : (
            <span 
              title="Instant Effect: Triggers immediately when bought" 
              className="cursor-help inline-block ml-1 hover:scale-110 transition-transform select-none text-amber-400 font-bold"
            >
              ⚡
            </span>
          );

          if (eff.type === 'coins') {
            const isPositive = eff.amount > 0;
            return (
              <div key={i} className={`text-xs flex items-center font-bold font-mono ${isPositive ? 'text-yellow-300' : 'text-orange-400'}`}>
                <span>🪙 {isPositive ? `+${eff.amount}` : eff.amount} Coins</span>
                {symbolElement}
              </div>
            );
          } else if (eff.type === 'deflate') {
            return (
              <div key={i} className="text-xs flex items-center font-bold font-mono text-emerald-300">
                <span>🏈 -{eff.amount} PSI</span>
                {symbolElement}
              </div>
            );
          } else if (eff.type === 'inflate') {
            return (
              <div key={i} className="text-xs flex items-center font-bold font-mono text-red-400">
                <span>🏈🔺 +{eff.amount} PSI</span>
                {symbolElement}
              </div>
            );
          }
          return null;
        })}
        {specialText && (
          <div className="text-xs leading-snug font-medium text-slate-200 bg-slate-950/70 p-2 rounded-lg border border-slate-700/60 mt-1">
            {specialText}
          </div>
        )}
      </div>
    );
  };

  // Phase Badge with subtle clean finish
  const renderPhaseBadge = (phase) => {
    if (!phase || phase === 1) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Phase 1
        </span>
      );
    }
    if (phase === 2) {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-600/80">
          Phase 2
        </span>
      );
    }
    if (phase === 3 || phase === 'hof') {
      return (
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black">
          Hall of Fame
        </span>
      );
    }
    return null;
  };

  const getCardPhaseStyle = (card) => {
    if (!card) return 'border-slate-800 bg-slate-900/90 text-white';
    if (card.phase === 3 || card.phase === 'hof') {
      return 'border border-amber-500/70 bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-slate-950 text-white shadow-md';
    }
    if (card.phase === 2) {
      return 'border border-purple-500/60 bg-gradient-to-b from-purple-950/30 via-slate-900/95 to-slate-950 text-white shadow-md';
    }
    return 'border border-slate-700 bg-gradient-to-b from-slate-800/40 via-slate-900/95 to-slate-950 text-white shadow';
  };

  // Jaguars Event Deck Inspection
  const openJaguarsModal = () => {
    setTempEventDeck([...G.board.eventDeck]);
    setReorderingMode(false);
    setShowJaguarsModal(true);
  };

  const moveCardInDeck = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= tempEventDeck.length) return;
    const newDeck = [...tempEventDeck];
    const [moved] = newDeck.splice(fromIdx, 1);
    newDeck.splice(toIdx, 0, moved);
    setTempEventDeck(newDeck);
  };

  const handleSaveDeckOrder = () => {
    moves.jaguarsRearrangeEventDeck(tempEventDeck, effectivePlayerID);
    setShowJaguarsModal(false);
  };

  // Full Screen Winner Screen
  if (ctx.gameover) {
    const winnerId = ctx.gameover.winner;
    const winnerPlayer = G.players[winnerId];
    const isMeWinner = winnerId === effectivePlayerID;

    return (
      <div className="h-screen w-screen overflow-y-auto bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-2xl w-full p-8 rounded-3xl border-2 border-indigo-500/70 shadow-2xl bg-slate-900/95 relative overflow-hidden">
          <div className="text-6xl mb-3 animate-bounce">🏆</div>
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-700">
            Championship Clinched
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight mt-3">
            {winnerPlayer?.team?.name || `Player ${displayPlayerNumber(winnerId)}`} Champions!
          </h1>
          <p className="text-base text-slate-300 mt-2 font-medium">
            {isMeWinner ? "Congratulations, Coach! You executed the strategy to perfection." : "Defeated! Better luck next season."}
          </p>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 block">Final Ball Pressure</span>
              <span className="text-3xl font-mono font-bold text-emerald-400">
                {winnerPlayer?.psi.toFixed(1)} PSI
              </span>
            </div>
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 block">Remaining Treasury</span>
              <span className="text-3xl font-mono font-bold text-yellow-300">
                {winnerPlayer?.coins} Coins
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 text-left">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Final Standings</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {Object.keys(G.players)
                .sort((a, b) => G.players[a].psi - G.players[b].psi || G.players[b].coins - G.players[a].coins)
                .map((pId, idx) => (
                  <div key={pId} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-950/50 border border-slate-800">
                    <span className="font-bold flex items-center gap-2">
                      <span className="text-slate-500 font-mono">#{idx + 1}</span>
                      <span>{G.players[pId].team?.name || `Player ${displayPlayerNumber(pId)}`}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-300">
                      {G.players[pId].psi.toFixed(1)} PSI | {G.players[pId].coins} 🪙
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-3.5 rounded-xl font-bold text-base uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl cursor-pointer"
          >
            Play Again 🏈
          </button>
        </div>
      </div>
    );
  }

  // 1. TEAM SELECTION: EXACTLY 3 OPTIONS (User request: "First, I should only get 3 options when selecting a team")
  if (ctx.phase === 'teamSelection') {
    const unpickedHumans = humanPlayerIds.filter(id => !G.players[id].team);

    if (myPlayer?.team) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow"
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

    const availableChoices = (myPlayer?.teamChoices && myPlayer.teamChoices.length > 0)
      ? myPlayer.teamChoices.slice(0, 3)
      : [TEAMS[0], TEAMS[1], TEAMS[2]];

    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full text-center">
          {isMultiHuman && playMode !== 'online' && (
            <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-700 px-3 py-1 rounded-full text-xs text-blue-300 font-bold mb-3 uppercase tracking-wider">
              <span>📱 Pass & Play Active</span>
              <span>•</span>
              <span>Drafting for Player {displayPlayerNumber(effectivePlayerID)}</span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 uppercase tracking-wide mb-2">
            Player {displayPlayerNumber(effectivePlayerID)}: Select Your Franchise
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Choose wisely from your 3 scouted franchise options based on starting Coins, PSI, and Special Ability.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
            {availableChoices.map((team, idx) => (
              <div
                key={team.id}
                onClick={() => moves.selectTeam(idx, effectivePlayerID)}
                className="bg-slate-900 border-2 border-slate-800 hover:border-blue-500 p-6 rounded-3xl flex flex-col justify-between transition-all transform hover:-translate-y-1.5 shadow-xl cursor-pointer text-left"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {team.name}
                  </h3>

                  {/* Prominent Team Ability */}
                  <div className="bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-800/80 p-3.5 rounded-2xl mb-4 shadow-inner">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                      ⚡ Franchise Ability
                    </span>
                    <p className="text-xs text-purple-100 font-semibold leading-relaxed">
                      {team.ability}
                    </p>
                  </div>

                  <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-sm">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Starting Coins:</span>
                      <span className="text-yellow-400 font-bold font-mono">🪙 {team.coins}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Starting PSI:</span>
                      <span className="text-emerald-400 font-bold font-mono">🏈 {team.initialPsi}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.selectTeam(idx, effectivePlayerID);
                  }}
                  className="mt-6 w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-lg cursor-pointer"
                >
                  Select {team.name} 🏈
                </button>
              </div>
            ))}
          </div>
        </div>
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    );
  }

  // Buccaneers Copy Phase
  if (ctx.phase === 'buccaneersCopy') {
    const isChoosing = String(activeTurnPlayerId) === String(effectivePlayerID);
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white font-sans p-6 items-center justify-center">
        <div className="max-w-3xl w-full p-6 rounded-3xl bg-slate-900 border-2 border-red-600 shadow-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">
            Buccaneers Franchise Perk
          </span>
          <h2 className="text-3xl font-extrabold uppercase text-white mt-3 mb-2">
            Copy Another Team's Ability
          </h2>
          <p className="text-slate-400 text-sm mb-6">Choose any opponent's team ability to assimilate into the Buccaneers for this game.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 text-left">
            {Object.keys(G.players)
              .filter(pId => pId !== effectivePlayerID && G.players[pId].team && G.players[pId].team.id !== 'buccaneers')
              .map(pId => {
                const targetTeam = G.players[pId].team;
                return (
                  <div
                    key={pId}
                    onClick={() => isChoosing && moves.buccaneersPickTeam(targetTeam.id, effectivePlayerID)}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:border-red-500 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-lg text-white uppercase">{targetTeam.name}</h4>
                      <p className="text-xs text-slate-300 mt-1">{targetTeam.ability}</p>
                    </div>
                    {isChoosing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moves.buccaneersPickTeam(targetTeam.id, effectivePlayerID);
                        }}
                        className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold uppercase text-white bg-red-600 hover:bg-red-500"
                      >
                        Copy {targetTeam.name}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // Titans Opening Draft Screen
  if (ctx.phase === 'titansDraft' || G.board.pendingTitansDraft) {
    const isMyDraftTurn = G.board.pendingTitansDraft && String(G.board.pendingTitansDraft.playerID) === String(effectivePlayerID);
    if (!isMyDraftTurn) {
      const draftingPlayer = G.board.pendingTitansDraft ? G.players[G.board.pendingTitansDraft.playerID] : null;
      const draftingTeamName = draftingPlayer?.team?.name || 'Titans';
      return (
        <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 text-white">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">{draftingTeamName} Drafting Opening Player</h2>
            <p className="text-slate-400 text-sm">Waiting for {draftingTeamName} to choose an opening player card...</p>
          </div>
        </div>
      );
    }

    const currentDraftTeamName = myPlayer?.copiedTeam ? `${myPlayer.team?.name} (Copied Titans)` : (myPlayer?.team?.name || 'Titans');
    const draftCards = G.board.pendingTitansDraft?.cards || G.board.pendingTitansDraft?.options || [];

    return (
      <div className="h-screen w-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center font-sans">
        <div className="max-w-4xl w-full text-center">
          <span className="text-xs font-bold uppercase tracking-widest bg-blue-900/80 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
            Opening Draft
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-wide mt-2 mb-2 uppercase">
            ⚔️ {currentDraftTeamName} Free Agent Scout
          </h1>
          <p className="text-slate-400 mb-6 text-sm">Select 1 player to acquire for free into your starting lineup.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {draftCards.map((card, idx) => (
              <div 
                key={card.uniqueId || idx} 
                onClick={() => moves.titansPickCard(idx, effectivePlayerID)}
                className={`p-5 rounded-2xl flex flex-col justify-between hover:scale-102 cursor-pointer transition-all text-left ${getCardPhaseStyle(card)}`}
              >
                <div>
                  <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
                    <span className="text-slate-400">Min: {card.minBid}</span>
                    {renderPositionTag(card.position)}
                    <span className="text-slate-400">Max: {card.maxBid}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{card.name}</h3>
                  {renderCardEffects(card.effects, card.specialText || card.customText)}
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.titansPickCard(idx, effectivePlayerID);
                  }}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                >
                  Acquire {card.name} (Free)
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Team Peek Navigation helper (User request: Left and right arrows to cycle through teams)
  const allPlayerIds = Object.keys(G.players);
  const currentPeekIdx = peekLineupModal !== false ? allPlayerIds.indexOf(String(peekLineupModal)) : 0;
  const prevPeekId = allPlayerIds[(currentPeekIdx - 1 + allPlayerIds.length) % allPlayerIds.length];
  const nextPeekId = allPlayerIds[(currentPeekIdx + 1) % allPlayerIds.length];
  const peekPlayer = peekLineupModal !== false ? G.players[peekLineupModal] : null;

  const isEventFlipped = G.board.eventFlipRevealed && G.board.activeEvent && !G.board.eventConfirmed;
  const activeEvent = G.board.activeEvent;

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#070b14] text-white font-sans select-none">
      
      {/* 1. TOP HEADER BAR */}
      <header className="h-11 shrink-0 px-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
        {/* Left: Branding, Round, Card Era, and Turn Phase designations */}
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 uppercase tracking-wider">
            DEFLATEGATE
          </h1>
          <span className="font-bold text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 uppercase tracking-wider">
            Round {G.board.round}/10
          </span>
          {/* Card Era Designation next to Round */}
          <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-600/80 uppercase tracking-wider shadow" title="Card Era">
            {G.board.round >= 7 ? 'Hall of Fame' : G.board.round >= 4 ? 'Phase 2' : 'Phase 1'}
          </span>
          {/* Turn Phase Designation to the right of Card Era */}
          <span className="font-bold text-xs px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 uppercase tracking-wider shadow">
            {ctx.phase === 'auctionPhase' ? 'Auction Phase' : ctx.phase === 'preAuctionPhase' ? 'Pre-Auction' : ctx.phase === 'refreshPhase' ? 'Refresh Phase' : 'Event Phase'}
          </span>
        </div>

        {/* Center: Live Broadcast Feed Banner (Latest action entry, clickable to open full log) */}
        <div className="hidden md:flex items-center gap-2 text-xs max-w-xl truncate">
          {G.board.actionLog && G.board.actionLog.length > 0 && (
            <button
              onClick={() => setShowLog(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 cursor-pointer max-w-md truncate transition-all shadow group hover:border-slate-500"
              title="Click to view full broadcast activity log"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0"></span>
              <span className="text-blue-300 font-bold text-[10px] uppercase tracking-wider shrink-0">Broadcast:</span>
              <span className="truncate font-medium text-slate-200">{G.board.actionLog[G.board.actionLog.length - 1]}</span>
              <span className="text-[10px] text-slate-400 group-hover:text-white shrink-0 ml-0.5">▼</span>
            </button>
          )}
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          {/* Multi-Human Switcher */}
          {isMultiHuman && playMode !== 'online' && (
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">View:</span>
              {humanPlayerIds.map(hId => (
                <button
                  key={hId}
                  onClick={() => setSelectedPlayerID(hId)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${effectivePlayerID === hId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  P{displayPlayerNumber(hId)}
                </button>
              ))}
            </div>
          )}

          {/* Jaguars Deck Inspector */}
          {isJaguars && (
            <button
              onClick={openJaguarsModal}
              className="bg-purple-950/80 hover:bg-purple-900 border border-purple-600 text-purple-300 font-bold px-2.5 py-1 rounded-lg text-xs uppercase"
            >
              🃏 Jaguars Deck {!G.board.jaguarsAbilityUsed && '●'}
            </button>
          )}

          {/* Rules Guide */}
          <button
            onClick={() => setShowRules(true)}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-2.5 py-1 rounded-lg text-xs border border-slate-700"
            title="Official Rules"
          >
            📖 Rules
          </button>

          {/* Activity Log Toggle */}
          <button
            onClick={() => setShowLog(!showLog)}
            className={`font-bold px-2.5 py-1 rounded-lg text-xs border ${showLog ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
            title="Toggle Live Activity Log"
          >
            📋 Log
          </button>

          {/* Mobile Switcher */}
          {setIsMobile && (
            <button
              onClick={() => setIsMobile(true)}
              className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-bold px-2 py-1 rounded-lg text-xs"
              title="Switch to Mobile View"
            >
              📱 Mobile
            </button>
          )}

          {/* Classic Desktop UI Revert Button */}
          {toggleDesktopUi && (
            <button
              onClick={toggleDesktopUi}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider"
              title="Switch back to Classic Desktop View anytime"
            >
              🎮 Classic UI
            </button>
          )}
        </div>
      </header>

      {/* 2. TOP TIER: UNIFORM TEAM PEDESTALS (User request: uniform clean neutral color, your team differentiated, yellow star for 1st player, clear passed/won badges) */}
      <section className="h-28 shrink-0 px-4 py-2 border-b border-slate-800 bg-slate-950/80 overflow-x-auto tabletop-scroll flex items-center gap-2.5">
        {Object.keys(G.players).map(pId => {
          const p = G.players[pId];
          const isMe = pId === effectivePlayerID;
          const isFirstPlayer = G.board.firstPlayer === pId;
          const hasWon = p.hasWonAuction;
          const hasPassed = G.board.passedAuctionPlayers?.includes(pId);
          const isHighest = G.board.highestBidder !== null && String(G.board.highestBidder) === String(pId);
          const isActing = String(activeActingPlayerId) === String(pId);

          return (
            <div
              key={pId}
              onClick={() => setPeekLineupModal(pId)}
              className={`h-full min-w-[190px] max-w-[230px] flex-1 p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                hasWon
                  ? 'border-red-600 ring-2 ring-red-500/80 bg-red-950/25 shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                  : isMe 
                    ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-400' 
                    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              } ${hasWon ? 'opacity-90' : ''}`}
              title="Click to view full team lineup & ability"
            >
              {/* Header with Team Name, Star, and Tag */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Yellow star for First Player */}
                  {isFirstPlayer && (
                    <span title="First Player of the Round" className="px-1 py-0.2 rounded-full bg-amber-400 text-black font-extrabold text-[9px] flex items-center gap-0.5 shadow shrink-0">
                      ⭐ 1st
                    </span>
                  )}
                  <span className={`font-bold text-xs truncate ${hasWon ? 'text-red-300' : isMe ? 'text-blue-300' : 'text-white'}`}>
                    {p.team?.name || `Player ${displayPlayerNumber(pId)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isMe ? (
                    <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-blue-600 text-white">YOU</span>
                  ) : (
                    <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${p.isCpu ? 'bg-slate-800 text-slate-400' : 'bg-purple-900 text-purple-300'}`}>
                      {p.isCpu ? 'CPU' : `P${displayPlayerNumber(pId)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badge: Won / Passed / High Bid / In Bidding */}
              <div className="flex items-center justify-between text-[10px]">
                {hasWon ? (
                  <span className="font-black text-red-300 bg-red-950/90 px-1.5 py-0.5 rounded border border-red-600 shadow flex items-center gap-1">
                    <span>⛔</span> Won Player (Out)
                  </span>
                ) : hasPassed ? (
                  <span className="font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/80">
                    ⛔ Passed
                  </span>
                ) : isHighest ? (
                  <span className="font-bold text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-600 animate-pulse">
                    👑 High Bid ({G.board.highestBid}🪙)
                  </span>
                ) : isActing ? (
                  <span className="font-bold text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-600 animate-pulse">
                    ● Bidding
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">In Bidding</span>
                )}
              </div>

              {/* Digital PSI & Coins */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>🏈</span>
                  <RollingSlotCounter value={p.psi} isPsi={true} />
                </span>
                <span className="font-bold text-yellow-300 flex items-center gap-1">
                  <span>🪙</span>
                  <RollingSlotCounter value={p.coins} />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. CENTER TIER: EXPANDED DRAFT & AUCTION ARENA */}
      <main className="flex-1 min-h-0 flex gap-3 p-3 overflow-hidden">
        
        {/* EXPANDED DRAFT & AUCTION STAGE (User request: maximize width to fit more players without scrolling) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-900/60 rounded-3xl border border-slate-800 p-3 overflow-hidden justify-between">
          
          {/* Phase 2: Pre-Auction Reveal View */}
          {ctx.phase === 'preAuctionPhase' && (
            <div className="h-full flex flex-col justify-between items-center text-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 px-3 py-1 rounded-full border border-amber-700">
                  Pre-Auction Phase
                </span>
                <h2 className="text-xl font-bold text-white uppercase mt-1.5">
                  Revealed Players for Round {G.board.round}
                </h2>
                <p className="text-xs text-slate-400">Review all available talent before bidding starts.</p>
              </div>

              {/* Full Draft Cards Gallery */}
              <div className="flex items-center justify-start gap-3 overflow-x-auto tabletop-scroll w-full py-2 px-1">
                {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                  if (!card) return null;
                  return (
                    <div
                      key={card.uniqueId || idx}
                      className={`w-48 p-3.5 rounded-2xl flex flex-col justify-between text-left shrink-0 ${getCardPhaseStyle(card)}`}
                    >
                      <div>
                        <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                          <span className="text-yellow-300">Min: {card.minBid}</span>
                          {renderPositionTag(card.position)}
                          <span className="text-amber-400">Max: {card.maxBid}</span>
                        </div>
                        <h4 className="font-bold text-base text-white truncate">{card.name}</h4>
                        {renderCardEffects(card.effects, card.specialText || card.customText)}
                      </div>
                      <div className="mt-2 pt-1 border-t border-slate-800 flex justify-between items-center">
                        {renderPhaseBadge(card.phase)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => moves.proceedToAuction()}
                className="py-2.5 px-6 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-lg cursor-pointer"
              >
                Proceed to Auction Phase 🔨
              </button>
            </div>
          )}

          {/* Phase 3: Active Auction View */}
          {ctx.phase === 'auctionPhase' && (
            <div className="h-full flex flex-col justify-between min-h-0">
              
              {/* Top Banner: Nomination / Active Info */}
              <div className="flex items-center justify-between text-xs px-2 pb-1 border-b border-slate-800">
                {G.board.activeAuctionCardIndex === null ? (
                  <span className="font-bold text-amber-300">
                    {isMyTurnToNominate ? "Select a player card below to nominate" : `Waiting for ${G.players[G.board.nominator]?.team?.name || 'Nominator'} to nominate`}
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      Active Bidding on: <strong className="text-blue-300 text-sm">{activeCard?.name}</strong>
                    </span>
                    <span className="text-slate-400 font-mono">
                      (Min: {activeCard?.minBid}🪙 | Max: {effMaxBid}🪙)
                    </span>
                  </div>
                )}
                <span className="text-slate-400">
                  {G.board.auctionPlayers ? `${G.board.auctionPlayers.length} Draft Pool Players` : ''}
                </span>
              </div>

              {/* Full Cards Gallery (User request: DO NOT minimize the other players, show full effects, phase, position, and min/max for all cards!) */}
              <div className="flex-1 min-h-0 flex items-center justify-start gap-3 overflow-x-auto tabletop-scroll py-2 px-1">
                {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                  if (!card) {
                    return (
                      <div 
                        key={`sold-${idx}`} 
                        className="w-48 h-full max-h-[290px] p-3 rounded-2xl flex items-center justify-center border border-dashed border-slate-800 text-slate-500 italic bg-slate-950/40 shrink-0"
                      >
                        Sold
                      </div>
                    );
                  }
                  const isNominated = idx === G.board.activeAuctionCardIndex;
                  const isSelectedForNomination = G.board.activeAuctionCardIndex === null && selectedNominationIndex === idx;
                  const canAffordCard = (isSoleRemainingZeroCoins) || (myPlayer?.coins >= card.minBid);
                  const canNominate = isMyTurnToNominate && G.board.activeAuctionCardIndex === null && canAffordCard;

                  return (
                    <div
                      key={card.uniqueId || idx}
                      onClick={() => {
                        if (canNominate) {
                          setSelectedNominationIndex(idx);
                          moves.selectCard(idx, effectivePlayerID);
                        }
                      }}
                      className={`w-52 h-full max-h-[290px] p-3 rounded-2xl flex flex-col justify-between text-left shrink-0 transition-all ${
                        isNominated
                          ? 'ring-2 ring-blue-400 border-2 border-blue-400 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-slate-900'
                          : isSelectedForNomination
                            ? 'ring-2 ring-emerald-400 border-2 border-emerald-400 bg-slate-900 scale-[1.02]'
                            : 'opacity-90 hover:opacity-100'
                      } ${canNominate ? 'cursor-pointer hover:border-emerald-400' : ''} ${getCardPhaseStyle(card)}`}
                    >
                      <div>
                        {/* Header: Min, Pos, Max */}
                        <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                          <span className="text-yellow-300">Min: {card.minBid}</span>
                          {renderPositionTag(card.position)}
                          <span className="text-amber-400">Max: {getEffectiveCardMaxBid(card, G.board.activeEvent)}</span>
                        </div>

                        {/* Nominated / Active Badge */}
                        {isNominated && (
                          <div className="mb-1">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600 text-white shadow">
                              🏈 ACTIVE AUCTION
                            </span>
                          </div>
                        )}

                        <h4 className="font-bold text-base text-white truncate">{card.name}</h4>
                        {renderCardEffects(card.effects, card.specialText || card.customText)}
                      </div>

                      <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center text-xs">
                        {renderPhaseBadge(card.phase)}
                        {G.board.activeAuctionCardIndex === null && isMyTurnToNominate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moves.selectCard(idx, effectivePlayerID);
                            }}
                            disabled={!canAffordCard}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 cursor-pointer shadow"
                          >
                            Nominate ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nomination Action when waiting for human nominator */}
              {G.board.activeAuctionCardIndex === null && isMyTurnToNominate && G.board.auctionPlayers?.[selectedNominationIndex] && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
                  <span className="text-xs text-slate-300">
                    Ready to nominate <strong className="text-white">{G.board.auctionPlayers[selectedNominationIndex]?.name}</strong>:
                  </span>
                  <button
                    onClick={() => {
                      moves.selectCard(selectedNominationIndex, effectivePlayerID);
                    }}
                    className="py-2.5 px-6 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-lg cursor-pointer"
                  >
                    Nominate {G.board.auctionPlayers[selectedNominationIndex]?.name} 🏈
                  </button>
                </div>
              )}

            </div>
          )}

          {/* Phase 4: Refresh Phase Step Resolution */}
          {ctx.phase === 'refreshPhase' && (
            <div className="h-full flex flex-col justify-between items-center text-center p-3 sm:p-5">
              <div>
                <span className="text-xs font-black uppercase tracking-widest bg-emerald-950/90 text-emerald-300 px-3.5 py-1 rounded-full border border-emerald-600/80 shadow">
                  🔄 Refresh Phase
                </span>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide mt-2">
                  Round {G.board.round} Revenue & Deflation
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Lineup contracts and passive franchise abilities calculated.</p>
              </div>

              {/* Processing Teams Container */}
              <div className="max-w-2xl w-full p-4 rounded-3xl bg-slate-950/90 border-2 border-slate-800 text-left shadow-2xl flex flex-col justify-between">
                <div className="flex justify-between items-center pb-2 mb-3 border-b border-slate-800/80">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Processing Teams:
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Payouts & Deflation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto tabletop-scroll pr-1">
                  {G.board.refreshResults && G.board.refreshResults.slice(0, (G.board.refreshStepIndex || 0) + 1).map((res, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md transition-all hover:border-slate-500"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-black text-sm text-white block truncate">{res.teamName}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Processed</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 font-mono font-bold shrink-0">
                        <span className="text-xs text-yellow-300 bg-yellow-950/60 border border-yellow-700/60 px-2 py-0.5 rounded-lg shadow-sm">
                          +{res.coinsGained} 🪙
                        </span>
                        <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-lg shadow-sm">
                          -{res.psiDeflated} PSI
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {G.board.refreshStage === 'intro' ? (
                  <button
                    onClick={() => moves.startRefreshSequence()}
                    className="py-3 px-8 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-xl cursor-pointer transition-all hover:scale-102 active:scale-98"
                  >
                    Start Refresh Phase 🔄
                  </button>
                ) : G.board.refreshStage === 'complete' ? (
                  <button
                    onClick={() => moves.confirmRefreshSummary()}
                    className="py-3 px-8 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl cursor-pointer transition-all hover:scale-102 active:scale-98"
                  >
                    Advance to Round {G.board.round + 1} 🏈
                  </button>
                ) : (
                  <button
                    onClick={() => moves.advanceRefreshStep()}
                    className="py-2.5 px-6 rounded-2xl text-xs font-black uppercase text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors shadow"
                  >
                    Skip Step ⏩
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Event Card & Field Modifiers (User request: event moved to right) */}
        <div className="w-64 shrink-0 flex flex-col gap-2.5 min-h-0">
          
          {/* Active Round Event Card */}
          <div className="p-3.5 rounded-2xl border border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-950 flex flex-col justify-between shrink-0 shadow">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold uppercase tracking-wider text-indigo-300">Round Event</span>
                <span className="text-base">📢</span>
              </div>
              <h3 className="font-bold text-base text-white">
                {activeEvent ? activeEvent.name : 'Awaiting Reveal'}
              </h3>
              <p className="text-xs text-slate-300 leading-snug mt-1 font-medium">
                {activeEvent ? activeEvent.effect : 'Modifies gameplay rules for the round.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-950 flex justify-between items-center text-[10px] text-slate-400 uppercase font-mono">
              <span>Deck: {G.board.eventDeck ? G.board.eventDeck.length : 0} Left</span>
              <span>Round {G.board.round}/10</span>
            </div>
          </div>

          {/* Match Controls (User request: moved to spot where Game Status was, so user clicks in the same place) */}
          <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex-1 flex flex-col justify-between shadow">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Match Controls
                </span>
                <span className="text-xs">{isCpuTurn ? '⏳' : '⚡'}</span>
              </div>

              {isCpuTurn ? (
                <div className="space-y-2">
                  <button
                    onClick={() => moves.stepCpuTurn()}
                    className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 shadow cursor-pointer transition-transform hover:scale-102"
                  >
                    Next CPU Action ➔
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setSkipMode('myTurn')}
                      className="py-1.5 rounded-lg text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 cursor-pointer"
                    >
                      Skip to My Turn ⏩
                    </button>
                    <button
                      onClick={() => setSkipMode('refresh')}
                      className="py-1.5 rounded-lg text-[11px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 cursor-pointer"
                    >
                      Skip to Refresh ⏭️
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/80 text-xs text-center font-bold text-emerald-300 animate-pulse">
                  ● Your Turn to Act
                </div>
              )}
            </div>

            {/* Falcons Mulligan */}
            {canMulligan && (
              <button
                onClick={() => moves.falconsMulligan(effectivePlayerID)}
                className="w-full mt-2 py-2 rounded-xl text-xs font-bold uppercase text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border border-amber-400 shadow cursor-pointer"
              >
                🔄 Falcons Mulligan Swap
              </button>
            )}
          </div>
        </div>

      </main>

      {/* 4. BOTTOM TIER: COMMAND DECK & PROMINENT BIDDING CONSOLE (User request: info right next to your bid section) */}
      <footer className="h-44 shrink-0 border-t border-slate-800 bg-slate-950/95 px-4 py-2 flex items-center justify-between gap-3">
        
        {/* Left: Your Franchise Status (~190px) */}
        <div className="w-48 shrink-0 p-2.5 rounded-2xl border border-blue-500/60 bg-blue-950/20 flex flex-col justify-between h-full shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-blue-300 truncate">
                {myPlayer?.team?.name || 'Your Team'}
              </span>
              {G.board.firstPlayer === effectivePlayerID && (
                <span title="First Player Token" className="text-sm">⭐</span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-tight">
              {effectiveTeam?.ability || 'Franchise passive perk'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 font-mono text-xs">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Football PSI</span>
              <div className="flex items-center gap-1 font-bold text-xl text-emerald-400">
                <span>🏈</span>
                <RollingSlotCounter value={myPlayer?.psi || 0} isPsi={true} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Coins</span>
              <div className="flex items-center gap-1 font-bold text-lg text-yellow-300">
                <span>🪙</span>
                <RollingSlotCounter value={myPlayer?.coins || 0} />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Your 5-Player Starting Lineup */}
        <div className="flex-1 min-w-0 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="font-bold uppercase text-slate-400">
              Active Starting Lineup
            </span>
            {isPendingReplacementForMe && (
              <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 animate-pulse">
                Click a card below to replace with {G.pendingReplacement?.wonCard?.name}
              </span>
            )}
          </div>

          <div className="flex-1 flex gap-2 min-h-0 overflow-x-auto tabletop-scroll">
            {myPlayer?.lineup && myPlayer.lineup.map((card, idx) => (
              <div
                key={card.uniqueId || idx}
                onClick={() => {
                  if (isPendingReplacementForMe && !replaceLocked) {
                    moves.replaceLineupCard(idx, effectivePlayerID);
                  }
                }}
                className={`flex-1 min-w-[125px] p-2 rounded-xl flex flex-col justify-between text-left transition-all ${
                  isPendingReplacementForMe 
                    ? 'cursor-pointer hover:border-red-400 hover:scale-102 ring-1 ring-red-500/50' 
                    : ''
                } ${getCardPhaseStyle(card)}`}
              >
                <div>
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                    <span className="text-slate-400">Slot {idx + 1}</span>
                    {renderPositionTag(card.position)}
                  </div>
                  <h5 className="font-bold text-xs text-white truncate mt-0.5">{card.name}</h5>
                  <div className="scale-90 origin-top-left">
                    {renderCardEffects(card.effects, null)}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-400">
                  <span>{renderPhaseBadge(card.phase)}</span>
                  {isPendingReplacementForMe && (
                    <span className="text-red-400 font-bold uppercase">Replace</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: STREAMLINED BIDDING CONSOLE */}
        <div className="w-80 shrink-0 h-full p-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between shadow">
          {ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex !== null ? (
            <div className="h-full flex flex-col justify-between">
              
              {/* 1. Status "your turn to bid" at the top of the box */}
              <div>
                {isMyTurnToBid ? (
                  <div className="py-1 px-2 rounded-xl bg-emerald-950/90 border border-emerald-500 text-center text-xs font-black uppercase text-emerald-300 tracking-wider shadow animate-pulse">
                    🚨 Your Turn to Bid
                  </div>
                ) : humanHasWonInRound ? (
                  <div className="py-1 px-2 rounded-xl bg-slate-800 text-center text-xs font-bold text-slate-400">
                    ✓ Won Player This Round
                  </div>
                ) : G.board.passedAuctionPlayers?.includes(effectivePlayerID) ? (
                  <div className="py-1 px-2 rounded-xl bg-red-950/80 border border-red-800 text-center text-xs font-bold text-red-300">
                    ⛔ Passed
                  </div>
                ) : (
                  <div className="py-1 px-2 rounded-xl bg-slate-800/80 text-center text-xs text-slate-400">
                    Waiting for {G.players[ctx.currentPlayer]?.team?.name || 'opponent'}...
                  </div>
                )}
              </div>

              {/* 2. Current bid indicator & Bid + and - buttons in the middle */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 rounded-xl border border-slate-800/90">
                {/* Current Bid indicator */}
                <div className="text-left">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Bid</div>
                  <div className="font-mono font-black text-sm text-amber-300">
                    {G.board.highestBid !== null ? `${G.board.highestBid} 🪙` : '1 🪙 (Open)'}
                  </div>
                  {highestBidderPlayer && (
                    <div className="text-[10px] text-slate-400 truncate max-w-[95px]">
                      by {highestBidderPlayer.team?.name || 'Opponent'}
                    </div>
                  )}
                </div>

                {/* Bid + and - buttons to alter your bid in the middle of the middle */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Your Bid</div>
                  <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-0.5 shadow-inner">
                    <button
                      onClick={() => setCustomBid(b => Math.max(nextBid, b - 1))}
                      disabled={!isMyTurnToBid || customBid <= nextBid}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-800 hover:bg-slate-750 active:scale-95 text-white font-black text-lg flex items-center justify-center disabled:opacity-30 cursor-pointer border border-slate-700 transition-all"
                      title="Decrease bid"
                    >
                      −
                    </button>
                    <span className="px-3 font-mono font-black text-yellow-300 text-sm sm:text-base min-w-[44px] text-center">
                      {customBid}🪙
                    </span>
                    <button
                      onClick={() => setCustomBid(b => Math.min(maxAllowedBid, b + 1))}
                      disabled={!isMyTurnToBid || customBid >= maxAllowedBid}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-800 hover:bg-slate-750 active:scale-95 text-white font-black text-lg flex items-center justify-center disabled:opacity-30 cursor-pointer border border-slate-700 transition-all"
                      title="Increase bid"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Bottom Row: Pass on bottom left, Bid X on bottom middle, Buy Max on bottom right */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* Bottom Left: Pass */}
                <button
                  onClick={() => moves.pass(effectivePlayerID)}
                  disabled={!isMyTurnToBid || G.board.highestBidder === null}
                  className="py-2 rounded-xl font-bold text-xs uppercase text-slate-300 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 cursor-pointer border border-slate-700 transition-colors"
                >
                  Pass
                </button>

                {/* Bottom Middle: Bid X */}
                <button
                  onClick={() => moves.bid(customBid, effectivePlayerID)}
                  disabled={!isMyTurnToBid || customBid < nextBid || customBid > maxAllowedBid}
                  className="py-2 rounded-xl font-bold text-xs uppercase text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 shadow cursor-pointer transition-transform hover:scale-102"
                >
                  Bid {customBid}🪙
                </button>

                {/* Bottom Right: Buy Max */}
                <button
                  onClick={() => moves.bid(effMaxBid, effectivePlayerID)}
                  disabled={!isMyTurnToBid || myPlayer?.coins < effMaxBid || effMaxBid < nextBid}
                  className="py-2 rounded-xl font-bold text-xs uppercase text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-30 shadow cursor-pointer transition-transform hover:scale-102"
                >
                  Buy Max
                </button>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col justify-center items-center text-center text-xs text-slate-400 p-2">
              <span className="text-xl mb-1">🛡️</span>
              <span>Controls active during bidding turns.</span>
            </div>
          )}
        </div>

      </footer>

      {/* 5. POPUP MODALS */}

      {/* EVENT REVEAL POPUP MODAL (User request: "I want the event to still have a pop up screen like the last version does") */}
      {isEventFlipped && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 px-3 py-1 rounded-full border border-indigo-700">
              Round {G.board.round} Event Revealed
            </span>
            <h2 className="text-2xl font-bold text-white mt-4 mb-2">{G.board.activeEvent.name}</h2>
            <div className="bg-slate-950 p-5 rounded-2xl border border-indigo-900/60 my-5">
              <p className="text-slate-200 text-sm leading-relaxed font-medium">"{G.board.activeEvent.effect}"</p>
            </div>
            <button 
              onClick={() => moves.confirmEventReveal()}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-base shadow-lg uppercase tracking-wider cursor-pointer transition-all hover:scale-102"
            >
              Continue to Round {G.board.round} Auction 🏈
            </button>
          </div>
        </div>
      )}

      {/* OPPONENT ROSTER & ABILITY MODAL with Left/Right Arrows on sides of box, centered team name, horizontal lineup */}
      {peekLineupModal !== false && peekPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full flex items-center justify-center">
            
            {/* Left Side Button: Prev Team */}
            <button
              onClick={() => setPeekLineupModal(prevPeekId)}
              className="absolute -left-3 sm:-left-12 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-slate-800/95 hover:bg-blue-600 text-white font-black text-lg flex items-center justify-center cursor-pointer border border-slate-600 shadow-2xl transition-all hover:scale-110 active:scale-95"
              title="Previous Team"
            >
              ◀
            </button>

            {/* Main Modal Box */}
            <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl w-full text-left shadow-2xl relative">
              {/* Header with Centered Team Name */}
              <div className="relative flex justify-center items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-2xl font-black text-white uppercase tracking-wider text-center">
                  {peekPlayer.team?.name || `Player ${displayPlayerNumber(peekLineupModal)}`}
                </h3>
                <button
                  onClick={() => setPeekLineupModal(false)}
                  className="absolute right-0 text-slate-400 hover:text-white font-bold p-1 text-xl cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Prominent Hero Team Ability */}
              <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border-2 border-indigo-500/70 p-4 rounded-2xl mb-4 shadow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">⚡</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Franchise Special Ability
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed">
                  {peekPlayer.team?.ability || 'Standard franchise ability.'}
                </p>
              </div>

              {/* Starting Lineup Cards: Single Horizontal Row Left to Right */}
              <div className="flex flex-row gap-3 overflow-x-auto tabletop-scroll pb-2">
                {peekPlayer.lineup.map((card, idx) => (
                  <div key={idx} className={`min-w-[170px] flex-1 p-3 rounded-xl border flex flex-col justify-between ${getCardPhaseStyle(card)}`}>
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                        <span className="text-slate-400">Slot {idx + 1}</span>
                        {renderPositionTag(card.position)}
                      </div>
                      <h4 className="font-bold text-sm text-white">{card.name}</h4>
                      <div className="mt-1">
                        {renderCardEffects(card.effects, card.specialText || card.customText)}
                      </div>
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
                      <span>{renderPhaseBadge(card.phase)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side Button: Next Team */}
            <button
              onClick={() => setPeekLineupModal(nextPeekId)}
              className="absolute -right-3 sm:-right-12 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-slate-800/95 hover:bg-blue-600 text-white font-black text-lg flex items-center justify-center cursor-pointer border border-slate-600 shadow-2xl transition-all hover:scale-110 active:scale-95"
              title="Next Team"
            >
              ▶
            </button>

          </div>
        </div>
      )}

      {/* Card Won Celebration Overlay */}
      {G.board.cardWonFlyAnimation && G.board.cardWonFlyAnimation.timestamp !== clientDismissedCardFlyTimestamp && (
        <div 
          onClick={() => {
            setClientDismissedCardFlyTimestamp(G.board.cardWonFlyAnimation?.timestamp);
            if (moves.dismissCardWonFlyAnimation) moves.dismissCardWonFlyAnimation();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer"
        >
          <div className="bg-slate-900 border-2 border-yellow-400 p-6 rounded-3xl max-w-md w-full text-center shadow-2xl animate-fly-card" onClick={e => e.stopPropagation()}>
            <span className="text-4xl animate-bounce inline-block">🏈</span>
            <span className="text-xs font-black uppercase tracking-widest bg-yellow-400 text-black px-3.5 py-1 rounded-full inline-block my-2 shadow">
              Player Acquired!
            </span>
            <h3 className="text-2xl font-black text-white uppercase tracking-wide">
              {G.board.cardWonFlyAnimation.winnerTeamName}
            </h3>
            <p className="text-yellow-300 font-mono font-bold text-sm mb-4">
              Won for {G.board.cardWonFlyAnimation.bidAmount} Coins!
            </p>

            {/* FULL CARD RENDER */}
            {G.board.cardWonFlyAnimation.card && (
              <div className={`p-4 rounded-2xl border text-left shadow-lg mb-4 ${getCardPhaseStyle(G.board.cardWonFlyAnimation.card)}`}>
                <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
                  <span className="text-yellow-300">Min: {G.board.cardWonFlyAnimation.card.minBid}</span>
                  {renderPositionTag(G.board.cardWonFlyAnimation.card.position)}
                  <span className="text-amber-400">Max: {G.board.cardWonFlyAnimation.card.maxBid}</span>
                </div>
                <h4 className="font-extrabold text-xl text-white mb-2">{G.board.cardWonFlyAnimation.card.name}</h4>
                <div className="text-xs mb-3 space-y-1">
                  {renderCardEffects(G.board.cardWonFlyAnimation.card.effects, G.board.cardWonFlyAnimation.card.specialText || G.board.cardWonFlyAnimation.card.customText)}
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                  {renderPhaseBadge(G.board.cardWonFlyAnimation.card.phase)}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setClientDismissedCardFlyTimestamp(G.board.cardWonFlyAnimation?.timestamp);
                if (moves.dismissCardWonFlyAnimation) moves.dismissCardWonFlyAnimation();
              }}
              className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 shadow-lg cursor-pointer transition-transform hover:scale-102"
            >
              Continue ➔
            </button>
          </div>
        </div>
      )}

      {/* Activity Log Modal (opened when clicking top broadcast ticker or Log button) */}
      {showLog && (
        <div 
          onClick={() => setShowLog(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl max-w-lg w-full text-left shadow-2xl relative flex flex-col max-h-[80vh] cursor-default"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-xl font-black text-white uppercase tracking-wider">
                  Live Broadcast Feed
                </h3>
              </div>
              <button
                onClick={() => setShowLog(false)}
                className="text-slate-400 hover:text-white font-bold text-xl cursor-pointer p-1"
                title="Close Log"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto tabletop-scroll space-y-2 pr-1 text-xs">
              {G.board.actionLog && G.board.actionLog.length > 0 ? (
                G.board.actionLog.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 leading-snug">
                    {entry}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic text-center py-8">No action logs yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* End of Auction Phase / Refresh Phase Intro Popup */}
      {ctx.phase === 'refreshPhase' && G.board.inRefreshSummary && G.board.refreshStage === 'intro' && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-5 animate-bounce-short">
            <div className="w-14 h-14 bg-blue-500/20 border-2 border-blue-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
              🔄
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest bg-blue-900/60 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
                Round {G.board.round} Auction Complete
              </span>
              <h2 className="text-2xl font-bold text-white uppercase tracking-wide mt-2">
                Time for the Refresh Phase
              </h2>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Lineup cards will generate passive coins and deflation. Team abilities and active events will be calculated sequentially across all teams.
            </p>
            <button
              onClick={() => moves.startRefreshSequence()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-xl uppercase tracking-wider cursor-pointer transition-all"
            >
              Start Refresh Phase 🔄
            </button>
          </div>
        </div>
      )}

      {/* Replacement Modal with 800ms protection */}
      {isPendingReplacementForMe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 p-6 rounded-3xl max-w-2xl w-full text-center shadow-2xl space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">
                Roster Limit Reached
              </span>
              <h2 className="text-2xl font-bold text-white uppercase mt-2">
                Replace a Player with {G.pendingReplacement?.wonCard?.name}
              </h2>
              <p className="text-xs text-slate-400">Select which active player to send to the discard pile.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {myPlayer?.lineup.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => !replaceLocked && moves.replaceLineupCard(idx, effectivePlayerID)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    replaceLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-red-400 hover:scale-102'
                  } ${getCardPhaseStyle(card)}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                      <span>Slot {idx + 1}</span>
                      {renderPositionTag(card.position)}
                    </div>
                    <h4 className="font-bold text-sm text-white">{card.name}</h4>
                    {renderCardEffects(card.effects, card.specialText)}
                  </div>
                  <button
                    disabled={replaceLocked}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!replaceLocked) moves.replaceLineupCard(idx, effectivePlayerID);
                    }}
                    className="mt-3 w-full py-1.5 rounded-lg text-xs font-bold uppercase text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 cursor-pointer"
                  >
                    Replace This Player
                  </button>
                </div>
              ))}
            </div>

            {getEffectiveTeamId(myPlayer) === 'bengals' && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  disabled={replaceLocked}
                  onClick={() => !replaceLocked && moves.discardWonCard(effectivePlayerID)}
                  className="py-2.5 px-6 rounded-xl text-xs font-bold uppercase text-amber-300 bg-amber-950 border border-amber-700 hover:bg-amber-900 cursor-pointer shadow"
                >
                  Bengals: Discard Won Card
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Rumors Modal: Pass 1 Active Player to the Right */}
      {G.board.pendingTradeRumors && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-6 md:p-8 rounded-3xl max-w-2xl w-full text-center shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <span className="text-4xl block">🔄</span>
            <span className="text-xs font-bold uppercase tracking-widest bg-blue-900/60 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
              Round {G.board.round} Event: Trade Rumors
            </span>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Pass 1 Active Player to the Right</h2>
            {(() => {
              const hasPicked = G.board.pendingTradeRumors.picks && G.board.pendingTradeRumors.picks[effectivePlayerID] !== undefined;
              const unpickedHumans = humanPlayerIds.filter(hId => !G.board.pendingTradeRumors.picks || G.board.pendingTradeRumors.picks[hId] === undefined);

              if (hasPicked) {
                const pickedIdx = G.board.pendingTradeRumors.picks[effectivePlayerID];
                const pickedCard = myPlayer?.lineup?.[pickedIdx];
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
                    Player {displayPlayerNumber(effectivePlayerID)} ({myPlayer?.team?.name}): Select one of your active lineup players to pass to the team on your right (clockwise).
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 overflow-y-auto flex-1">
                    {myPlayer?.lineup?.map((card, cidx) => (
                      <div key={card.uniqueId || cidx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between text-left">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-blue-400 px-2 py-0.5 rounded font-bold uppercase">{card.position || 'WR'}</span>
                          <h4 className="font-bold text-white text-sm mt-1">{card.name}</h4>
                          <div className="mt-1">{renderCardEffects(card.effects, card.specialText || card.customText)}</div>
                        </div>
                        <button
                          onClick={() => moves.tradeRumorsPickCard(cidx, effectivePlayerID)}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider cursor-pointer"
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
            <h2 className="text-2xl font-bold text-blue-400 uppercase tracking-wide">Trade Rumors Complete!</h2>
            <div className="space-y-2 text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
              {G.board.tradeRumorsSummary.map((line, idx) => (
                <p key={idx} className="text-xs text-slate-200">🏈 {line}</p>
              ))}
            </div>
            <button
              onClick={() => moves.dismissTradeRumorsSummary()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Free Agency Modal */}
      {G.board.pendingFreeAgency && G.board.pendingFreeAgency.card && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4 animate-bounce-short">
            <span className="text-4xl block">✍️</span>
            <span className="text-xs font-bold uppercase tracking-widest bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full border border-purple-700">
              Round {G.board.round} Event: Free Agency
            </span>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Sign Free Agent</h2>
            {String(G.board.pendingFreeAgency.playerID) === String(effectivePlayerID) ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed">
                  You drew <span className="font-bold text-white">{G.board.pendingFreeAgency.card.name}</span> ({G.board.pendingFreeAgency.card.position}). You may pay the Maximum price ({getEffectiveCardMaxBid(G.board.pendingFreeAgency.card, G.board.activeEvent)} Coins) to sign them immediately!
                </p>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                  <div className="my-1">{renderCardEffects(G.board.pendingFreeAgency.card.effects, G.board.pendingFreeAgency.card.specialText || G.board.pendingFreeAgency.card.customText)}</div>
                  <p className="text-xs text-yellow-400 font-mono font-bold mt-2">
                    Cost: {getEffectiveCardMaxBid(G.board.pendingFreeAgency.card, G.board.activeEvent)} Coins | Your Coins: {myPlayer?.coins}
                  </p>
                </div>
                {getEffectiveTeamId(myPlayer) !== 'colts' && myPlayer?.lineup?.length >= (getEffectiveTeamId(myPlayer) === 'seahawks' ? 4 : 3) + (myPlayer?.extraLineupSlots || 0) && (
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
                    const canAfford = (myPlayer?.coins || 0) >= cost;
                    return (
                      <>
                        <button
                          disabled={!canAfford}
                          onClick={() => moves.freeAgencySign(getEffectiveTeamId(myPlayer) === 'colts' ? -1 : selectedReplaceIdx, effectivePlayerID)}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider ${
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
                    className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingFreeAgency.playerID)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rivalry Modal: Give 1 PSI to Opponent */}
      {G.board.pendingRivalry && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 p-6 md:p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl space-y-4">
            <span className="text-4xl block">⚔️</span>
            <span className="text-xs font-bold uppercase tracking-widest bg-red-900/60 text-red-300 px-3 py-1 rounded-full border border-red-700">
              Round {G.board.round} Event: Rivalry
            </span>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Give 1 PSI to an Opponent</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {String(G.board.pendingRivalry.currentGiverId) === String(effectivePlayerID)
                ? "It is your turn! Select an opponent below to give them 1 PSI (you deflate -1 PSI, they inflate +1 PSI unless protected by Saints immunity)."
                : `Waiting for Player ${parseInt(G.board.pendingRivalry.currentGiverId || '0') + 1} (${G.players[G.board.pendingRivalry.currentGiverId]?.team?.name || 'CPU'}) to choose an opponent...`}
            </p>
            {String(G.board.pendingRivalry.currentGiverId) === String(effectivePlayerID) ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {Object.keys(G.players).filter(id => id !== effectivePlayerID).map(oppId => {
                  const opp = G.players[oppId];
                  const oppName = opp?.team?.name || `Team ${displayPlayerNumber(oppId)}`;
                  const oppPsi = opp && typeof opp.psi === 'number' ? opp.psi.toFixed(1) : opp?.psi || 0;
                  return (
                    <button
                      key={oppId}
                      onClick={() => moves.rivalryGivePsi(oppId, effectivePlayerID)}
                      className="bg-slate-950 border border-slate-800 hover:border-red-500 p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:bg-slate-850 cursor-pointer transition-all shadow group"
                    >
                      <span className="text-sm font-bold text-white group-hover:text-red-300">{oppName}</span>
                      <span className="text-xs font-mono text-slate-400 font-bold">Player {displayPlayerNumber(oppId)}</span>
                      <span className="text-xs text-red-400 font-mono font-bold">{oppPsi} PSI</span>
                      <span className="mt-1 text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold uppercase">Give 1 PSI</span>
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
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingRivalry.currentGiverId)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Cap Limit Modal */}
      {G.board.pendingNewCapLimit && G.board.pendingNewCapLimit.active && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 p-6 md:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4">
            <span className="text-4xl block">🧢</span>
            <span className="text-xs font-bold uppercase tracking-widest bg-emerald-900/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700">
              Round {G.board.round} Event: New Cap Limit
            </span>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Buy Practice Squad Player</h2>
            {String(G.board.pendingNewCapLimit.playerID) === String(effectivePlayerID) ? (
              <>
                <p className="text-slate-300 text-sm leading-relaxed">
                  You may pay <span className="text-yellow-400 font-bold font-mono">10 Coins</span> to permanently add an additional Practice Squad Player (+1 Lineup Slot) to your team.
                </p>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                  Your Coins: <span className="text-yellow-400 font-bold font-mono">{myPlayer?.coins}</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={(myPlayer?.coins || 0) < 10}
                    onClick={() => moves.buyPracticeSquad(effectivePlayerID)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow ${
                      (myPlayer?.coins || 0) >= 10
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow"
                  >
                    Switch to Player {displayPlayerNumber(G.board.pendingNewCapLimit.playerID)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Puka Nacua Teammate Selection Modal */}
      {G.board.pendingPukaChoice && String(G.board.pendingPukaChoice.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-cyan-500 p-6 md:p-8 rounded-3xl max-w-xl w-full text-center shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <span className="text-4xl block">🎯</span>
            <span className="text-xs font-bold uppercase tracking-widest bg-cyan-900/60 text-cyan-300 px-3 py-1 rounded-full border border-cyan-700">
              Puka Nacua Special Ability
            </span>
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">
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
                    <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">{card.name}</h4>
                    <div className="mt-2 space-y-1">
                      {renderCardEffects(card.effects, card.specialText || card.customText)}
                    </div>
                  </div>
                  <span className="mt-3 text-xs font-bold uppercase tracking-wider text-cyan-400 block border-t border-slate-800 pt-2 text-center group-hover:underline">
                    Copy This Teammate ➔
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Notification Alert for Jaguars Ability Use */}
      {G.board.jaguarsPopupNotification && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 p-6 md:p-8 rounded-3xl max-w-md w-full text-center shadow-2xl space-y-4">
            <span className="text-4xl block">🐆</span>
            <h2 className="text-2xl font-bold text-amber-400 uppercase tracking-wide">Jaguars Ability Used!</h2>
            <p className="text-slate-200 text-sm leading-relaxed">{G.board.jaguarsPopupNotification}</p>
            <button 
              onClick={() => moves.dismissJaguarsPopup()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl text-sm uppercase tracking-wider cursor-pointer transition-all"
            >
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* Jaguars Secret Event Deck Modal */}
      {showJaguarsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-3xl max-w-2xl w-full text-left shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-purple-300 uppercase">
                  🃏 Jaguars Secret Event Deck
                </h3>
                <p className="text-xs text-slate-400">Order of upcoming event cards.</p>
              </div>
              <button onClick={() => setShowJaguarsModal(false)} className="text-slate-400 hover:text-white font-bold p-1">✕</button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {tempEventDeck.map((ev, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-purple-400 font-bold mr-2">#{idx + 1}</span>
                    <strong className="text-white">{ev.name}</strong>: <span className="text-slate-300">{ev.effect}</span>
                  </div>
                  {reorderingMode && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveCardInDeck(idx, idx - 1)} disabled={idx === 0} className="px-2 py-0.5 rounded bg-slate-800 text-white disabled:opacity-30">▲</button>
                      <button onClick={() => moveCardInDeck(idx, idx + 1)} disabled={idx === tempEventDeck.length - 1} className="px-2 py-0.5 rounded bg-slate-800 text-white disabled:opacity-30">▼</button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              {!G.board.jaguarsAbilityUsed ? (
                reorderingMode ? (
                  <button onClick={handleSaveDeckOrder} className="py-2 px-6 rounded-xl text-xs font-bold uppercase text-white bg-purple-600 hover:bg-purple-500">
                    Confirm New Order (1-Use)
                  </button>
                ) : (
                  <button onClick={() => setReorderingMode(true)} className="py-2 px-6 rounded-xl text-xs font-bold uppercase text-white bg-purple-600 hover:bg-purple-500">
                    Rearrange Deck (1-Use)
                  </button>
                )
              ) : (
                <span className="text-xs text-slate-500 italic">Rearrange ability already used.</span>
              )}
              <button onClick={() => setShowJaguarsModal(false)} className="py-2 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Guide Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};
