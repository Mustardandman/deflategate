import React, { useState, useEffect, useRef } from 'react';
import { getEffectiveTeamId, getEffectiveCardMaxBid, isGenuinePlayerCard } from '../Game';
import { TEAMS, EVENTS } from '../GameData';
import { RulesModal, RollingSlotCounter } from './RulesModal';
import { getTeamTheme } from '../utils/teamThemes';

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
  const [activeToast, setActiveToast] = useState(null);
  const lastToastIdRef = useRef(null);
  const [replaceLocked, setReplaceLocked] = useState(false);
  const [dismissedAbilityIds, setDismissedAbilityIds] = useState([]);
  const [abilityCarouselIdx, setAbilityCarouselIdx] = useState(0);
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

  // Minimal position badge (clean text pill, NO enamel badges!)
  const renderPositionTag = (position) => (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-slate-900/90 text-slate-300 border border-slate-700/80">
      {position || 'WR'}
    </span>
  );

  // Formatter for player card effects with larger fonts, high readability, and specialText badges
  const renderCardEffects = (effects, specialText) => {
    return (
      <div className="space-y-1 my-1">
        {effects && Array.isArray(effects) && effects.map((eff, i) => {
          const symbolElement = eff.perRound ? (
            <span 
              title="Refresh Effect: Happens every round" 
              className="cursor-help inline-block ml-1 hover:scale-125 transition-transform select-none text-emerald-400 font-bold"
            >
              🔄
            </span>
          ) : (
            <span 
              title="Instant Effect: Happens immediately when acquired" 
              className="cursor-help inline-block ml-1 hover:scale-125 transition-transform select-none text-amber-400 font-bold"
            >
              ⚡
            </span>
          );

          if (eff.type === 'coins') {
            const isPositive = eff.amount > 0;
            return (
              <span key={i} className={`text-xs flex items-center font-black font-tech leading-tight ${isPositive ? 'text-yellow-300' : 'text-orange-400'}`}>
                <span>🪙 {isPositive ? `+${eff.amount}` : eff.amount} Coins</span>
                {symbolElement}
              </span>
            );
          } else if (eff.type === 'deflate') {
            return (
              <span key={i} className="text-xs flex items-center font-black font-tech text-emerald-300 leading-tight">
                <span>🏈 -{eff.amount} PSI</span>
                {symbolElement}
              </span>
            );
          } else if (eff.type === 'inflate') {
            return (
              <span key={i} className="text-xs flex items-center font-black font-tech text-red-400 leading-tight">
                <span>🏈🔺 +{eff.amount} PSI</span>
                {symbolElement}
              </span>
            );
          }
          return null;
        })}
        {specialText && (
          <div className="text-[11px] leading-snug font-medium text-slate-200 bg-slate-900/80 p-1.5 rounded-lg border border-slate-700/60 mt-1">
            {specialText}
          </div>
        )}
      </div>
    );
  };

  // Phase Badge with subtle metallic finish
  const renderPhaseBadge = (phase) => {
    if (!phase || phase === 1) {
      return (
        <span className="text-[10px] font-display font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Phase 1
        </span>
      );
    }
    if (phase === 2) {
      return (
        <span className="text-[10px] font-display font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-600/80 shadow-sm shadow-purple-500/20">
          Phase 2
        </span>
      );
    }
    if (phase === 3 || phase === 'hof') {
      return (
        <span className="text-[10px] font-display font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-black shadow-sm shadow-amber-500/30">
          Hall of Fame
        </span>
      );
    }
    return null;
  };

  const getCardPhaseStyle = (card) => {
    if (!card) return 'border-slate-800 bg-slate-900/90 text-white';
    if (card.phase === 3 || card.phase === 'hof') {
      return 'card-tier-hof bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-slate-950 text-white';
    }
    if (card.phase === 2) {
      return 'card-tier-p2 bg-gradient-to-b from-purple-950/30 via-slate-900/95 to-slate-950 text-white';
    }
    return 'card-tier-p1 bg-gradient-to-b from-slate-800/40 via-slate-900/95 to-slate-950 text-white';
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
    const winnerTheme = getTeamTheme(winnerPlayer?.team?.id);

    return (
      <div className="h-screen w-screen overflow-y-auto bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none font-body">
        <div className="max-w-2xl w-full p-8 rounded-3xl border-2 shadow-2xl backdrop-blur-md relative overflow-hidden"
          style={{ borderColor: winnerTheme.primary, backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
          <div className="text-6xl mb-3 animate-bounce">🏆</div>
          <span className="text-xs font-display font-black uppercase tracking-widest px-3 py-1 rounded-full border"
            style={{ backgroundColor: winnerTheme.tagBg, color: winnerTheme.tagText, borderColor: winnerTheme.borderGlow }}>
            Championship Clinched
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-black text-white uppercase tracking-tight mt-3">
            {winnerPlayer?.team?.name || `Player ${displayPlayerNumber(winnerId)}`} Champions!
          </h1>
          <p className="text-lg text-slate-300 font-tech mt-2">
            {isMeWinner ? "Congratulations, Coach! You executed the strategy to perfection." : "Defeated! Better luck next season."}
          </p>

          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 block">Final Ball Pressure</span>
              <span className="text-3xl font-tech font-black text-emerald-400">
                {winnerPlayer?.psi.toFixed(1)} PSI
              </span>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs uppercase font-bold text-slate-400 block">Remaining Treasury</span>
              <span className="text-3xl font-tech font-black text-yellow-300">
                {winnerPlayer?.coins} Coins
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-4 text-left">
            <h3 className="text-xs font-display font-black uppercase text-slate-400 mb-2">Final Standings</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {Object.keys(G.players)
                .sort((a, b) => G.players[a].psi - G.players[b].psi || G.players[b].coins - G.players[a].coins)
                .map((pId, idx) => (
                  <div key={pId} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-900/50 border border-slate-800">
                    <span className="font-bold flex items-center gap-2">
                      <span className="text-slate-500 font-mono">#{idx + 1}</span>
                      <span>{G.players[pId].team?.name || `Player ${displayPlayerNumber(pId)}`}</span>
                    </span>
                    <span className="font-tech font-bold text-slate-300">
                      {G.players[pId].psi.toFixed(1)} PSI | {G.players[pId].coins} 🪙
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-3.5 rounded-xl font-display font-black text-base uppercase tracking-wider text-white shadow-xl cursor-pointer transition-transform hover:scale-102 active:scale-98"
            style={{ background: `linear-gradient(to right, ${winnerTheme.primary}, ${winnerTheme.secondary || '#3b82f6'})` }}
          >
            Play Again 🏈
          </button>
        </div>
      </div>
    );
  }

  // Titans Opening Draft View
  if (G.board.pendingTitansDraft && isPendingReplacementForMe) {
    const currentDraftTeamName = myPlayer?.copiedTeam ? `${myPlayer.team?.name} (Copied Titans)` : (myPlayer?.team?.name || 'Titans');
    return (
      <div className="h-screen w-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center font-body">
        <div className="max-w-4xl w-full text-center">
          <span className="text-xs font-display font-black uppercase tracking-widest bg-blue-900/80 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
            Opening Draft
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-wide mt-2 mb-2 uppercase">
            ⚔️ {currentDraftTeamName} Free Agent Scout
          </h1>
          <p className="text-slate-400 mb-6 text-sm">Select 1 player to acquire for free into your starting lineup.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {G.board.pendingTitansDraft.cards.map((card, idx) => (
              <div 
                key={card.uniqueId || idx} 
                onClick={() => moves.titansPickCard(idx, effectivePlayerID)}
                className={`p-5 rounded-2xl flex flex-col justify-between hover:scale-102 cursor-pointer transition-all text-left ${getCardPhaseStyle(card)}`}
              >
                <div>
                  <div className="flex justify-between items-center text-xs font-tech font-bold mb-2">
                    <span className="text-slate-400">Min: {card.minBid}</span>
                    {renderPositionTag(card.position)}
                    <span className="text-slate-400">Max: {card.maxBid}</span>
                  </div>
                  <h3 className="text-xl font-display font-black text-white mb-1">{card.name}</h3>
                  {renderCardEffects(card.effects, card.specialText || card.customText)}
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.titansPickCard(idx, effectivePlayerID);
                  }}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-display font-black py-2 rounded-xl text-xs uppercase tracking-wider"
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

  // Team Selection Phase
  if (ctx.phase === 'teamSelection') {
    const isChoosing = humanPlayerIds.includes(effectivePlayerID) && !myPlayer?.team;
    return (
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white font-body">
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-wider">
              DEFLATEGATE
            </h1>
            <span className="text-xs font-display font-black uppercase tracking-wider bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
              Franchise Selection
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRules(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700"
            >
              📖 Rules
            </button>
            {toggleDesktopUi && (
              <button
                onClick={toggleDesktopUi}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700"
              >
                🎮 Classic UI
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-display font-black uppercase text-white tracking-wide">
              {isChoosing ? `Select Your NFL Franchise (Player ${displayPlayerNumber(effectivePlayerID)})` : `Waiting for Player ${displayPlayerNumber(activeTurnPlayerId)} to Select`}
            </h2>
            <p className="text-slate-400 text-sm mt-1">Each franchise features unique starting ball PSI, coin reserves, and team passive abilities.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {TEAMS.map(team => {
              const theme = getTeamTheme(team.id);
              const takenBy = Object.keys(G.players).find(pId => G.players[pId].team?.id === team.id);
              const isTaken = Boolean(takenBy);

              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (!isTaken && isChoosing) {
                      moves.selectTeam(team.id, effectivePlayerID);
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                    isTaken 
                      ? 'opacity-40 border-slate-800 bg-slate-900 cursor-not-allowed'
                      : isChoosing 
                        ? 'hover:scale-102 cursor-pointer shadow-lg hover:shadow-2xl'
                        : 'border-slate-800 bg-slate-900'
                  }`}
                  style={{
                    borderColor: isTaken ? '#334155' : theme.primary,
                    backgroundColor: isTaken ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.85)'
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display font-black text-xl text-white uppercase tracking-wide">
                        {team.name}
                      </h3>
                      {isTaken && (
                        <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                          Taken (P{displayPlayerNumber(takenBy)})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs font-tech font-bold my-2">
                      <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                        🏈 {team.initialPsi} PSI
                      </span>
                      <span className="text-yellow-300 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-800/80">
                        🪙 {team.coins} Coins
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug mt-2 line-clamp-3">
                      {team.ability}
                    </p>
                  </div>

                  {!isTaken && isChoosing && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moves.selectTeam(team.id, effectivePlayerID);
                      }}
                      className="mt-4 w-full py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider text-white shadow"
                      style={{ background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary || '#3b82f6'})` }}
                    >
                      Choose {team.name}
                    </button>
                  )}
                </div>
              );
            })}
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
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-white font-body p-6 items-center justify-center">
        <div className="max-w-3xl w-full p-6 rounded-3xl bg-slate-900 border-2 border-red-600 shadow-2xl text-center">
          <span className="text-xs font-display font-black uppercase tracking-widest bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">
            Buccaneers Franchise Perk
          </span>
          <h2 className="text-3xl font-display font-black uppercase text-white mt-3 mb-2">
            Copy Another Team's Ability
          </h2>
          <p className="text-slate-400 text-sm mb-6">Choose any opponent's team ability to assimilate into the Buccaneers for this game.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 text-left">
            {Object.keys(G.players)
              .filter(pId => pId !== effectivePlayerID && G.players[pId].team && G.players[pId].team.id !== 'buccaneers')
              .map(pId => {
                const targetTeam = G.players[pId].team;
                const theme = getTeamTheme(targetTeam.id);
                return (
                  <div
                    key={pId}
                    onClick={() => isChoosing && moves.buccaneersPickTeam(targetTeam.id, effectivePlayerID)}
                    className="p-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:border-red-500 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h4 className="font-display font-black text-lg text-white uppercase">{targetTeam.name}</h4>
                      <p className="text-xs text-slate-300 mt-1">{targetTeam.ability}</p>
                    </div>
                    {isChoosing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moves.buccaneersPickTeam(targetTeam.id, effectivePlayerID);
                        }}
                        className="mt-3 w-full py-1.5 rounded-lg text-xs font-display font-black uppercase text-white bg-red-600 hover:bg-red-500"
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

  // MAIN ZERO-SCROLL WAR ROOM ARENA
  const myTheme = getTeamTheme(effectiveTeam?.id);
  const activeEvent = G.board.activeEvent;
  const opponentPlayerIds = Object.keys(G.players).filter(id => id !== effectivePlayerID);

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-[#070b14] text-white font-body select-none">
      
      {/* 1. TOP HEADER BAR (~44px) */}
      <header className="h-11 shrink-0 px-4 border-b border-slate-800/90 bg-slate-900/90 flex items-center justify-between gap-4">
        {/* Left: Branding & Game State */}
        <div className="flex items-center gap-3">
          <h1 className="font-display font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 uppercase tracking-wider">
            DEFLATEGATE
          </h1>
          <span className="font-display font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 uppercase tracking-wider">
            Round {G.board.round}/10
          </span>
          <span className="font-display font-black text-xs px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 uppercase tracking-wider">
            {ctx.phase === 'auctionPhase' ? 'Auction Phase' : ctx.phase === 'preAuctionPhase' ? 'Pre-Auction' : ctx.phase === 'refreshPhase' ? 'Refresh Phase' : 'Event Phase'}
          </span>
        </div>

        {/* Center: Active Turn / Decision Status */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {ctx.phase === 'auctionPhase' && (
            G.board.activeAuctionCardIndex === null ? (
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                Waiting for <strong className="text-amber-300">{G.players[G.board.nominator]?.team?.name || `Player ${displayPlayerNumber(G.board.nominator)}`}</strong> to Nominate
              </span>
            ) : (
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Bidding on <strong className="text-white">{activeCard?.name}</strong>: Turn is <strong className="text-emerald-400">{G.players[ctx.currentPlayer]?.team?.name || `Player ${displayPlayerNumber(ctx.currentPlayer)}`}</strong>
              </span>
            )
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
              className="bg-purple-950/80 hover:bg-purple-900 border border-purple-600 text-purple-300 font-display font-black px-2.5 py-1 rounded-lg text-xs uppercase"
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
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600 text-emerald-300 font-display font-black px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider"
              title="Switch back to Classic Desktop View anytime"
            >
              🎮 Classic UI
            </button>
          )}
        </div>
      </header>

      {/* 2. TOP TIER: OPPONENTS PEDESTALS (~110px) */}
      <section className="h-28 shrink-0 px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 overflow-x-auto tabletop-scroll flex items-center gap-3">
        {opponentPlayerIds.map(pId => {
          const opponent = G.players[pId];
          const oppTheme = getTeamTheme(opponent?.team?.id);
          const isActing = String(activeTurnPlayerId) === String(pId);
          const isHighest = G.board.highestBidder !== null && String(G.board.highestBidder) === String(pId);
          const isFirstPlayer = G.board.firstPlayer === pId;

          return (
            <div
              key={pId}
              onClick={() => setPeekLineupModal(pId)}
              className={`h-full min-w-[210px] max-w-[250px] flex-1 p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                isActing ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : isHighest ? 'ring-1 ring-amber-400' : ''
              }`}
              style={{
                borderColor: isActing ? '#34d399' : oppTheme.primary,
                backgroundColor: 'rgba(15, 23, 42, 0.75)'
              }}
              title="Click to view full opponent roster"
            >
              {/* Top: Team Name & Badges */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-display font-black text-sm uppercase tracking-wide text-white truncate">
                  {opponent.team?.name || `Player ${displayPlayerNumber(pId)}`}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {isFirstPlayer && <span title="First Player Token" className="text-xs">⭐</span>}
                  {opponent.hasWonAuction && <span title="Acquired player this round" className="text-[10px] font-black text-emerald-400">✓ Won</span>}
                  <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${opponent.isCpu ? 'bg-slate-800 text-slate-400' : 'bg-purple-900 text-purple-300'}`}>
                    {opponent.isCpu ? 'CPU' : `P${displayPlayerNumber(pId)}`}
                  </span>
                </div>
              </div>

              {/* Middle: PSI & Coins (Clean digital readout, NO manometer/zones!) */}
              <div className="flex items-center justify-between my-1">
                <div className="flex items-center gap-1 font-tech font-black text-base text-emerald-300">
                  <span>🏈</span>
                  <RollingSlotCounter value={opponent.psi} isPsi={true} />
                  <span className="text-[10px] text-slate-400 font-normal">PSI</span>
                </div>
                <div className="flex items-center gap-1 font-tech font-bold text-sm text-yellow-300">
                  <span>🪙</span>
                  <RollingSlotCounter value={opponent.coins} />
                </div>
              </div>

              {/* Bottom: Mini Roster Slots (5 slots) */}
              <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80">
                {opponent.lineup && opponent.lineup.map((card, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-3.5 rounded text-[8px] font-mono font-black flex items-center justify-center border ${
                      card.name.includes('Practice Squad') 
                        ? 'bg-slate-900 text-slate-500 border-slate-800' 
                        : 'bg-blue-950 text-blue-300 border-blue-800'
                    }`}
                    title={`${card.position || 'WR'}: ${card.name}`}
                  >
                    {card.position || 'WR'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. CENTER TIER: TABLETOP ACTION ARENA (FLEX-1, OVERFLOW-HIDDEN) */}
      <main className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
        
        {/* Left Column: Event Deck & Modifiers (~240px wide) */}
        <div className="w-60 shrink-0 flex flex-col gap-3 min-h-0">
          {/* Active Event Card */}
          <div className="p-3.5 rounded-2xl border-2 border-indigo-500/70 bg-gradient-to-b from-indigo-950/40 via-slate-900/95 to-slate-950 flex flex-col justify-between shrink-0 shadow-lg">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-display font-black uppercase tracking-wider text-indigo-300">Round Event</span>
                <span className="text-base">📢</span>
              </div>
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">
                {activeEvent ? activeEvent.name : 'Awaiting Reveal'}
              </h3>
              <p className="text-xs text-slate-300 leading-snug mt-1.5 font-medium">
                {activeEvent ? activeEvent.effect : 'The round event will modify costs and outcomes for all franchises.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-950 flex justify-between items-center text-[10px] text-slate-400 uppercase font-tech">
              <span>Deck: {G.board.eventDeck ? G.board.eventDeck.length : 0} Remaining</span>
              <span>R{G.board.round}/10</span>
            </div>
          </div>

          {/* Quick Match Modifiers & Cap Limit */}
          <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/80 flex-1 flex flex-col justify-between text-xs space-y-2">
            <div>
              <span className="text-[10px] uppercase font-display font-black tracking-wider text-slate-400 block mb-1">
                Field Conditions
              </span>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Card Era:</span>
                  <span className="font-bold text-amber-300">
                    {G.board.round >= 7 ? 'Hall of Fame' : G.board.round >= 4 ? 'Phase 2' : 'Phase 1'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">First Player:</span>
                  <span className="font-bold text-white">
                    {G.players[G.board.firstPlayer]?.team?.name || `Player ${displayPlayerNumber(G.board.firstPlayer)}`}
                  </span>
                </div>
                {G.board.newCapLimitUsed && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>New Cap:</span>
                    <span>Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Falcons Mulligan Button */}
            {canMulligan && (
              <button
                onClick={() => moves.falconsMulligan(effectivePlayerID)}
                className="w-full py-2 rounded-xl text-xs font-display font-black uppercase text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 border border-amber-400 shadow cursor-pointer"
              >
                🔄 Falcons Mulligan Swap
              </button>
            )}
          </div>
        </div>

        {/* Center Column: The Main Draft & Bidding Arena (Flex-1) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-900/60 rounded-3xl border border-slate-800/90 p-4 overflow-hidden justify-between">
          
          {/* Phase 2: Pre-Auction Reveal View */}
          {ctx.phase === 'preAuctionPhase' && (
            <div className="h-full flex flex-col justify-between items-center text-center">
              <div>
                <span className="text-xs font-display font-black uppercase tracking-widest bg-amber-950/80 text-amber-300 px-3 py-1 rounded-full border border-amber-700">
                  Pre-Auction Phase
                </span>
                <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mt-2">
                  Scouted Player Pool for Round {G.board.round}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Review the available talent before nominations begin.</p>
              </div>

              {/* Revealed Draft Cards Tray */}
              <div className="flex items-center justify-center gap-3 overflow-x-auto tabletop-scroll w-full py-2">
                {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => (
                  <div
                    key={card.uniqueId || idx}
                    className={`w-44 p-3.5 rounded-2xl flex flex-col justify-between text-left shrink-0 ${getCardPhaseStyle(card)}`}
                  >
                    <div>
                      <div className="flex justify-between items-center text-[11px] font-tech font-bold mb-1">
                        <span className="text-slate-400">Min: {card.minBid}</span>
                        {renderPositionTag(card.position)}
                        <span className="text-slate-400">Max: {card.maxBid}</span>
                      </div>
                      <h4 className="font-display font-black text-base text-white truncate">{card.name}</h4>
                      {renderCardEffects(card.effects, card.specialText || card.customText)}
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-800/80 flex justify-between items-center">
                      {renderPhaseBadge(card.phase)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Start Auction Phase Action */}
              <button
                onClick={() => moves.proceedToAuction()}
                className="py-3 px-8 rounded-xl font-display font-black text-base uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-xl cursor-pointer transition-transform hover:scale-102 active:scale-98"
              >
                Proceed to Auction Phase 🔨
              </button>
            </div>
          )}

          {/* Phase 3: Active Auction View */}
          {ctx.phase === 'auctionPhase' && (
            <div className="h-full flex flex-col justify-between min-h-0">
              
              {/* NOMINATION STAGE (No active card currently nominated) */}
              {G.board.activeAuctionCardIndex === null ? (
                <div className="h-full flex flex-col justify-between items-center text-center">
                  <div>
                    <span className="text-xs font-display font-black uppercase tracking-widest bg-blue-950/80 text-blue-300 px-3 py-1 rounded-full border border-blue-700">
                      Player Nomination
                    </span>
                    <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mt-2">
                      {isMyTurnToNominate ? "Select a Player from the Pool to Nominate" : `Waiting for ${G.players[G.board.nominator]?.team?.name || `Player ${displayPlayerNumber(G.board.nominator)}`} to Nominate`}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isMyTurnToNominate ? "Click any player card below, choose your starting bid, and start the auction." : "The nominator selects which player enters the bidding ring."}
                    </p>
                  </div>

                  {/* Available Draft Pool */}
                  <div className="flex items-center justify-center gap-3 overflow-x-auto tabletop-scroll w-full py-2">
                    {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                      const isSelected = selectedNominationIndex === idx;
                      return (
                        <div
                          key={card.uniqueId || idx}
                          onClick={() => isMyTurnToNominate && setSelectedNominationIndex(idx)}
                          className={`w-44 p-3.5 rounded-2xl flex flex-col justify-between text-left shrink-0 transition-all ${
                            isSelected && isMyTurnToNominate ? 'ring-2 ring-blue-400 scale-102' : ''
                          } ${isMyTurnToNominate ? 'cursor-pointer hover:border-blue-400' : ''} ${getCardPhaseStyle(card)}`}
                        >
                          <div>
                            <div className="flex justify-between items-center text-[11px] font-tech font-bold mb-1">
                              <span className="text-slate-400">Min: {card.minBid}</span>
                              {renderPositionTag(card.position)}
                              <span className="text-slate-400">Max: {card.maxBid}</span>
                            </div>
                            <h4 className="font-display font-black text-base text-white truncate">{card.name}</h4>
                            {renderCardEffects(card.effects, card.specialText || card.customText)}
                          </div>
                          <div className="mt-2 pt-1 border-t border-slate-800/80 flex justify-between items-center">
                            {renderPhaseBadge(card.phase)}
                            {isSelected && isMyTurnToNominate && (
                              <span className="text-[10px] font-black uppercase text-blue-400">Selected</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Nominate Action Button for Human */}
                  {isMyTurnToNominate ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const chosenCard = G.board.auctionPlayers[selectedNominationIndex];
                          const startBid = isSoleRemainingZeroCoins ? 0 : Math.max(chosenCard.minBid, 1);
                          moves.nominatePlayer(selectedNominationIndex, startBid, effectivePlayerID);
                        }}
                        className="py-3 px-8 rounded-xl font-display font-black text-base uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl cursor-pointer transition-transform hover:scale-102"
                      >
                        Nominate {G.board.auctionPlayers?.[selectedNominationIndex]?.name} 🏈
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      CPU is evaluating talent and preparing nomination...
                    </div>
                  )}
                </div>
              ) : (
                /* ACTIVE BIDDING STAGE (Card nominated, bidding in progress) */
                <div className="h-full flex flex-col justify-between min-h-0">
                  
                  {/* Electronic Bidding Board (Modern draft war room style - NO gavel, NO podium!) */}
                  <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-4 shrink-0 shadow-inner">
                    {/* Current High Bid Readout */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl">
                        💰
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-display font-black text-slate-400 tracking-wider block">
                          Current Highest Bid
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-tech font-black text-2xl text-amber-300">
                            {G.board.highestBid !== null ? `${G.board.highestBid} 🪙` : 'None'}
                          </span>
                          {highestBidderPlayer && (
                            <span className="font-display font-black text-xs uppercase px-2 py-0.5 rounded border"
                              style={{
                                backgroundColor: getTeamTheme(highestTeamId).tagBg,
                                color: getTeamTheme(highestTeamId).tagText,
                                borderColor: getTeamTheme(highestTeamId).borderGlow
                              }}>
                              by {highestBidderPlayer.team?.name || `Player ${displayPlayerNumber(G.board.highestBidder)}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Minimum Required Next Bid */}
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-display font-black text-slate-400 tracking-wider block">
                        Minimum Next Bid
                      </span>
                      <span className="font-tech font-black text-xl text-emerald-400">
                        {nextBid} 🪙
                      </span>
                    </div>
                  </div>

                  {/* Active Card Showcase (Center Stage) */}
                  <div className="flex-1 min-h-0 flex items-center justify-center p-2">
                    {activeCard && (
                      <div className={`w-80 max-w-full p-4 rounded-3xl flex flex-col justify-between shadow-2xl relative ${getCardPhaseStyle(activeCard)}`}>
                        {/* Top: Min / Max & Position */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-tech font-bold mb-2">
                            <span className="text-yellow-300">Min: {activeCard.minBid} 🪙</span>
                            {renderPositionTag(activeCard.position)}
                            <span className="text-amber-400 font-black">Max: {effMaxBid} 🪙</span>
                          </div>

                          <h3 className="font-display font-black text-2xl text-white tracking-wide uppercase mb-1">
                            {activeCard.name}
                          </h3>

                          {renderCardEffects(activeCard.effects, activeCard.specialText || activeCard.customText)}
                        </div>

                        {/* Bottom: Card Tier Badge */}
                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center">
                          {renderPhaseBadge(activeCard.phase)}
                          <span className="text-[10px] font-tech text-slate-400">
                            ID: #{activeCard.uniqueId || activeCard.id}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Remaining Un-Nominated Players (Draft Tray Reel) */}
                  <div className="shrink-0 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] uppercase font-display font-black tracking-wider text-slate-400 block mb-1">
                      Remaining Draft Reel ({G.board.auctionPlayers ? G.board.auctionPlayers.filter((_, idx) => idx !== G.board.activeAuctionCardIndex).length : 0})
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto tabletop-scroll py-1">
                      {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                        if (idx === G.board.activeAuctionCardIndex) return null;
                        return (
                          <div
                            key={card.uniqueId || idx}
                            className={`min-w-[120px] max-w-[140px] p-2 rounded-xl border text-left shrink-0 ${getCardPhaseStyle(card)}`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-mono">
                              <span>{card.minBid}🪙</span>
                              {renderPositionTag(card.position)}
                            </div>
                            <span className="font-display font-bold text-xs text-white truncate block mt-0.5">{card.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* Phase 4: Refresh Phase Step Animation View */}
          {ctx.phase === 'refreshPhase' && (
            <div className="h-full flex flex-col justify-between items-center text-center p-4">
              <div>
                <span className="text-xs font-display font-black uppercase tracking-widest bg-emerald-950/80 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700">
                  Refresh Phase
                </span>
                <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight mt-2">
                  Calculating Round {G.board.round} Revenue & Deflation
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Lineup perks and passive abilities trigger across all teams.</p>
              </div>

              {/* Refresh Progress Board */}
              <div className="max-w-md w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-2">
                  <span>Processing Teams:</span>
                  <span className="font-tech text-white">{(G.board.refreshStepIndex || 0) + 1} / {Object.keys(G.players).length}</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {G.board.refreshResults && G.board.refreshResults.slice(0, (G.board.refreshStepIndex || 0) + 1).map((res, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="font-bold text-white">{res.teamName}</span>
                      <div className="flex items-center gap-3 font-tech font-bold">
                        <span className="text-yellow-300">+{res.coinsGained} 🪙</span>
                        <span className="text-emerald-400">-{res.psiDeflated} PSI</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance Button when Refresh Complete */}
              {G.board.refreshStage === 'complete' ? (
                <button
                  onClick={() => moves.confirmRefreshSummary()}
                  className="py-3 px-8 rounded-xl font-display font-black text-base uppercase tracking-wider text-white bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 shadow-xl cursor-pointer animate-pulse"
                >
                  Advance to Round {G.board.round + 1} 🏈
                </button>
              ) : (
                <button
                  onClick={() => moves.advanceRefreshStep()}
                  className="py-2 px-6 rounded-xl text-xs font-display font-black uppercase text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
                >
                  Skip Step ⏩
                </button>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Broadcast Feed & Turn Stepper (~280px wide) */}
        <div className="w-72 shrink-0 flex flex-col gap-3 min-h-0">
          
          {/* Turn Stepper & Quick Skip Controls */}
          <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col gap-2 shrink-0 shadow-lg">
            <span className="text-[10px] uppercase font-display font-black tracking-wider text-slate-400 block">
              Match Controls
            </span>

            {/* Stepper Buttons for CPU Turn */}
            {isCpuTurn ? (
              <div className="space-y-1.5">
                <button
                  onClick={() => moves.stepCpuTurn()}
                  className="w-full py-2.5 rounded-xl font-display font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow cursor-pointer transition-transform hover:scale-102"
                >
                  Next CPU Action ⏩
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSkipMode('myTurn')}
                    className="py-1.5 rounded-lg text-xs font-display font-bold uppercase text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700"
                  >
                    Skip To My Turn
                  </button>
                  <button
                    onClick={() => setSkipMode('refresh')}
                    className="py-1.5 rounded-lg text-xs font-display font-bold uppercase text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700"
                  >
                    Skip To Refresh
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-xs text-center font-bold text-emerald-300">
                ● Your Turn to Act
              </div>
            )}
          </div>

          {/* Live Action Feed (Play-by-Play Ticker) */}
          {showLog && (
            <div className="flex-1 min-h-0 p-3 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col overflow-hidden">
              <span className="text-[10px] uppercase font-display font-black tracking-wider text-slate-400 block mb-2">
                Live Broadcast Feed
              </span>
              <div className="flex-1 overflow-y-auto tabletop-scroll space-y-1.5 text-xs font-body pr-1">
                {G.board.actionLog && G.board.actionLog.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] leading-snug text-slate-300">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* 4. BOTTOM TIER: HUMAN GM COMMAND DECK (~170px) */}
      <footer className="h-44 shrink-0 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4">
        
        {/* Left: Your Franchise Status Command Station (~210px) */}
        <div className="w-52 shrink-0 p-2.5 rounded-2xl border flex flex-col justify-between h-full shadow-lg"
          style={{ borderColor: myTheme.primary, backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
          
          <div>
            <div className="flex items-center justify-between">
              <span className="font-display font-black text-lg uppercase tracking-wide text-white truncate">
                {myPlayer?.team?.name || 'Your Team'}
              </span>
              {G.board.firstPlayer === effectivePlayerID && (
                <span title="First Player Token" className="text-sm">⭐</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 line-clamp-1 italic">
              {effectiveTeam?.ability || 'Franchise passive perk active'}
            </p>
          </div>

          {/* Large Clean Digital Readouts (NO manometer/nanometer, NO hazard zones!) */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <div>
              <span className="text-[9px] uppercase font-display font-black text-slate-400 block">Football PSI</span>
              <div className="flex items-center gap-1 font-tech font-black text-2xl text-emerald-400">
                <span>🏈</span>
                <RollingSlotCounter value={myPlayer?.psi || 0} isPsi={true} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-display font-black text-slate-400 block">Treasury</span>
              <div className="flex items-center gap-1 font-tech font-black text-xl text-yellow-300">
                <span>🪙</span>
                <RollingSlotCounter value={myPlayer?.coins || 0} />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Your 5-Player Starting Lineup (Flex-1) */}
        <div className="flex-1 min-w-0 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-display font-black uppercase tracking-wider text-slate-400">
              Active Starting Lineup ({myPlayer?.lineup ? myPlayer.lineup.length : 0}/5)
            </span>
            {isPendingReplacementForMe && (
              <span className="font-display font-black text-xs uppercase px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 animate-pulse">
                Click Player to Replace with {G.pendingReplacement?.wonCard?.name}
              </span>
            )}
          </div>

          {/* 5 Lineup Cards Side-by-Side */}
          <div className="flex-1 flex gap-2 min-h-0 overflow-x-auto tabletop-scroll">
            {myPlayer?.lineup && myPlayer.lineup.map((card, idx) => {
              const isReplaceTarget = isPendingReplacementForMe && selectedReplaceIdx === idx;
              return (
                <div
                  key={card.uniqueId || idx}
                  onClick={() => {
                    if (isPendingReplacementForMe && !replaceLocked) {
                      moves.confirmCardReplacement(idx, effectivePlayerID);
                    }
                  }}
                  className={`flex-1 min-w-[130px] p-2 rounded-xl flex flex-col justify-between text-left transition-all ${
                    isPendingReplacementForMe 
                      ? 'cursor-pointer hover:border-red-400 hover:scale-102 ring-1 ring-red-500/50' 
                      : ''
                  } ${getCardPhaseStyle(card)}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-tech font-bold mb-0.5">
                      <span className="text-slate-400">Slot {idx + 1}</span>
                      {renderPositionTag(card.position)}
                    </div>
                    <h5 className="font-display font-black text-sm text-white truncate">{card.name}</h5>
                    <div className="scale-90 origin-top-left">
                      {renderCardEffects(card.effects, null)}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/80 flex justify-between items-center text-[9px] text-slate-400">
                    <span>{renderPhaseBadge(card.phase)}</span>
                    {isPendingReplacementForMe && (
                      <span className="text-red-400 font-bold uppercase">Replace</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Action Controls (~240px) */}
        <div className="w-60 shrink-0 h-full p-2.5 rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col justify-between shadow-lg">
          {ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex !== null ? (
            /* Human Bidding Controls */
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-black uppercase text-slate-400">Your Bid</span>
                <span className="font-tech font-bold text-yellow-300">Cap: {maxAllowedBid}🪙</span>
              </div>

              {/* Quick Bid Increment Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 5].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomBid(b => Math.min(maxAllowedBid, b + amt))}
                    disabled={humanHasWonInRound || customBid + amt > maxAllowedBid}
                    className="py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-tech font-bold disabled:opacity-30 cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomBid(maxAllowedBid)}
                  disabled={humanHasWonInRound || maxAllowedBid === 0}
                  className="py-1 rounded bg-amber-950 text-amber-300 border border-amber-700/60 text-xs font-tech font-black disabled:opacity-30 cursor-pointer"
                >
                  Max
                </button>
              </div>

              {/* Bid Stepper & Action Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-slate-950 p-1 rounded-lg border border-slate-800 font-tech">
                  <button
                    onClick={() => setCustomBid(b => Math.max(nextBid, b - 1))}
                    disabled={customBid <= nextBid}
                    className="w-7 h-6 rounded bg-slate-800 text-white font-bold disabled:opacity-30"
                  >
                    -
                  </button>
                  <span className="font-black text-sm text-yellow-300">{customBid} 🪙</span>
                  <button
                    onClick={() => setCustomBid(b => Math.min(maxAllowedBid, b + 1))}
                    disabled={customBid >= maxAllowedBid}
                    className="w-7 h-6 rounded bg-slate-800 text-white font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => moves.placeBid(customBid, effectivePlayerID)}
                    disabled={humanHasWonInRound || customBid < nextBid || customBid > maxAllowedBid}
                    className="py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-30 shadow cursor-pointer"
                  >
                    Bid {customBid}🪙
                  </button>
                  <button
                    onClick={() => moves.passAuction(effectivePlayerID)}
                    disabled={humanHasWonInRound}
                    className="py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider text-slate-300 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 cursor-pointer border border-slate-700"
                  >
                    Pass
                  </button>
                </div>
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

      {/* MODALS & OVERLAYS */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Opponent Roster Full Peek Modal */}
      {peekLineupModal !== false && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl max-w-2xl w-full text-left shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-xl font-display font-black text-white uppercase">
                  {G.players[peekLineupModal]?.team?.name || `Player ${displayPlayerNumber(peekLineupModal)}`} Lineup
                </h3>
                <p className="text-xs text-slate-400">
                  {G.players[peekLineupModal]?.team?.ability}
                </p>
              </div>
              <button
                onClick={() => setPeekLineupModal(false)}
                className="text-slate-400 hover:text-white font-bold p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {G.players[peekLineupModal]?.lineup.map((card, idx) => (
                <div key={idx} className={`p-3 rounded-xl border ${getCardPhaseStyle(card)}`}>
                  <div className="flex justify-between items-center text-xs font-tech font-bold mb-1">
                    <span>Slot {idx + 1}</span>
                    {renderPositionTag(card.position)}
                  </div>
                  <h4 className="font-display font-black text-base text-white">{card.name}</h4>
                  {renderCardEffects(card.effects, card.specialText || card.customText)}
                </div>
              ))}
            </div>
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
          <div className="bg-slate-900 border-2 border-yellow-400 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-fly-card" onClick={e => e.stopPropagation()}>
            <span className="text-3xl">🏈</span>
            <span className="text-xs font-display font-black uppercase tracking-widest bg-yellow-400 text-black px-3 py-0.5 rounded-full block my-2">
              Player Acquired!
            </span>
            <h3 className="text-2xl font-display font-black text-white uppercase">
              {G.board.cardWonFlyAnimation.winnerTeamName}
            </h3>
            <p className="text-yellow-300 font-tech font-bold text-sm">
              Won for {G.board.cardWonFlyAnimation.bidAmount} Coins!
            </p>
            <div className={`mt-3 p-3 rounded-xl border text-left ${getCardPhaseStyle(G.board.cardWonFlyAnimation.card)}`}>
              <div className="flex justify-between items-center text-xs font-tech font-bold">
                <span>{G.board.cardWonFlyAnimation.card?.name}</span>
                {renderPositionTag(G.board.cardWonFlyAnimation.card?.position)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Modal with 800ms protection */}
      {isPendingReplacementForMe && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500 p-6 rounded-3xl max-w-2xl w-full text-center shadow-2xl space-y-4">
            <div>
              <span className="text-xs font-display font-black uppercase tracking-widest bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">
                Roster Limit Reached
              </span>
              <h2 className="text-2xl font-display font-black text-white uppercase mt-2">
                Replace a Player with {G.pendingReplacement?.wonCard?.name}
              </h2>
              <p className="text-xs text-slate-400">Select which active player to send to the discard pile.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {myPlayer?.lineup.map((card, idx) => (
                <div
                  key={idx}
                  onClick={() => !replaceLocked && moves.confirmCardReplacement(idx, effectivePlayerID)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                    replaceLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-red-400 hover:scale-102'
                  } ${getCardPhaseStyle(card)}`}
                >
                  <div>
                    <div className="flex justify-between items-center text-xs font-tech font-bold mb-1">
                      <span>Slot {idx + 1}</span>
                      {renderPositionTag(card.position)}
                    </div>
                    <h4 className="font-display font-black text-base text-white">{card.name}</h4>
                    {renderCardEffects(card.effects, card.specialText)}
                  </div>
                  <button
                    disabled={replaceLocked}
                    className="mt-3 w-full py-1.5 rounded-lg text-xs font-display font-black uppercase text-white bg-red-600 hover:bg-red-500 disabled:opacity-40"
                  >
                    Replace This Player
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Jaguars Secret Event Deck Inspector Modal */}
      {showJaguarsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-3xl max-w-2xl w-full text-left shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-display font-black text-purple-300 uppercase">
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
                    <span className="font-tech text-purple-400 font-bold mr-2">#{idx + 1}</span>
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
                  <button onClick={handleSaveDeckOrder} className="py-2 px-6 rounded-xl text-xs font-display font-black uppercase text-white bg-purple-600 hover:bg-purple-500">
                    Confirm New Order (1-Use)
                  </button>
                ) : (
                  <button onClick={() => setReorderingMode(true)} className="py-2 px-6 rounded-xl text-xs font-display font-black uppercase text-white bg-purple-600 hover:bg-purple-500">
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

    </div>
  );
};
