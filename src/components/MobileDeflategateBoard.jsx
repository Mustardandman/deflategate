import React, { useState, useEffect, useRef } from 'react';
import { TeamDetailModal, renderCardEffectsHelper, renderPhaseBadgeHelper, getCardPhaseStyleHelper } from './TeamDetailModal.jsx';
import { getEffectiveTeamId, getEffectiveCardMaxBid } from '../Game.js';

export const MobileDeflategateBoard = ({
  G,
  ctx,
  moves,
  playerID,
  vsCpu,
  playMode,
  numHumans
}) => {
  // Mobile Tab Navigation: 'auction', 'myRoster', 'teams', 'log'
  const [activeTab, setActiveTab] = useState('auction');
  const [selectedTeamDetailId, setSelectedTeamDetailId] = useState(null);
  const [customBid, setCustomBid] = useState(0);
  const [replaceLocked, setReplaceLocked] = useState(false);
  const [showEventInfoModal, setShowEventInfoModal] = useState(false);
  const [showAllBannerMessagesModal, setShowAllBannerMessagesModal] = useState(false);

  // Inspected Player Card Modal State with Carousel Navigation
  const [inspectedCard, setInspectedCard] = useState(null);
  const [inspectedCardList, setInspectedCardList] = useState([]);
  const [inspectedCardIndex, setInspectedCardIndex] = useState(0);

  const openInspectCard = (card, list = null) => {
    if (!card) return;
    const cleanList = (list && Array.isArray(list)) ? list.filter(Boolean) : [card];
    const activeIdx = cleanList.findIndex(c => (c.uniqueId && c.uniqueId === card.uniqueId) || (c.id === card.id && c.name === card.name));
    setInspectedCardList(cleanList.length > 0 ? cleanList : [card]);
    setInspectedCardIndex(activeIdx >= 0 ? activeIdx : 0);
    setInspectedCard(cleanList.length > 0 && activeIdx >= 0 ? cleanList[activeIdx] : card);
  };

  const handlePrevInspectedCard = () => {
    if (!inspectedCardList || inspectedCardList.length <= 1) return;
    const nextIdx = (inspectedCardIndex - 1 + inspectedCardList.length) % inspectedCardList.length;
    setInspectedCardIndex(nextIdx);
    setInspectedCard(inspectedCardList[nextIdx]);
  };

  const handleNextInspectedCard = () => {
    if (!inspectedCardList || inspectedCardList.length <= 1) return;
    const nextIdx = (inspectedCardIndex + 1) % inspectedCardList.length;
    setInspectedCardIndex(nextIdx);
    setInspectedCard(inspectedCardList[nextIdx]);
  };

  // Touch swipe handling for Inspected Player Card
  const inspectTouchStartRef = useRef({ x: 0, y: 0 });
  const handleInspectTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    inspectTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const handleInspectTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - inspectTouchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - inspectTouchStartRef.current.y;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNextInspectedCard();
      } else {
        handlePrevInspectedCard();
      }
    }
  };

  // Touch swipe handling for Main Screen Tabs
  const mainTabTouchStartRef = useRef({ x: 0, y: 0 });
  const handleMainTabTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    mainTabTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const handleMainTabTouchEnd = (e) => {
    // Only switch tabs if not currently looking at a team modal or player inspect modal
    if (selectedTeamDetailId !== null || inspectedCard !== null || showEventInfoModal || showAllBannerMessagesModal) return;
    if (G.board.pendingFreeAgency || G.board.pendingPukaChoice || G.board.pendingRivalry) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const deltaX = e.changedTouches[0].clientX - mainTabTouchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - mainTabTouchStartRef.current.y;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const tabs = ['auction', 'myRoster', 'teams', 'log'];
      const curIdx = tabs.indexOf(activeTab);
      if (curIdx !== -1) {
        if (deltaX < 0 && curIdx < tabs.length - 1) {
          setActiveTab(tabs[curIdx + 1]);
        } else if (deltaX > 0 && curIdx > 0) {
          setActiveTab(tabs[curIdx - 1]);
        }
      }
    }
  };

  useEffect(() => {
    if (!inspectedCard) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrevInspectedCard();
      else if (e.key === 'ArrowRight') handleNextInspectedCard();
      else if (e.key === 'Escape') setInspectedCard(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedCard, inspectedCardList, inspectedCardIndex]);

  const displayPlayerNumber = (id) => (parseInt(id) + 1).toString();
  const humanPlayerIds = Object.keys(G.players).filter(id => !G.players[id].isCpu);
  const isMultiHuman = (G.numHumans && G.numHumans > 1) || humanPlayerIds.length > 1 || playMode === 'pass_and_play' || playMode === 'pvp_cpu';

  // Determine who the game is actively waiting for in interactive decisions
  let activeTurnPlayerId = null;
  if (ctx.phase === 'teamSelection') {
    activeTurnPlayerId = humanPlayerIds.find(id => !G.players[id]?.team) || ctx.currentPlayer || '0';
  } else if (ctx.phase === 'buccaneersCopy') {
    activeTurnPlayerId = humanPlayerIds.find(id => G.players[id]?.team?.id === 'buccaneers' && !G.players[id]?.copiedTeam) || '0';
  } else if (G.board.pendingTitansDraft) {
    activeTurnPlayerId = String(G.board.pendingTitansDraft.playerID);
  } else if (G.board.pendingFreeAgency && G.board.pendingFreeAgency.card) {
    activeTurnPlayerId = String(G.board.pendingFreeAgency.playerID);
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
      if (moves.setVsCpu) moves.setVsCpu(vsCpu);
    }
    if (numHumans !== undefined && G.numHumans !== numHumans) {
      if (moves.setNumHumans) moves.setNumHumans(numHumans);
    }
  }, [vsCpu, G.vsCpu, numHumans, G.numHumans, moves]);

  const myPlayer = G.players[effectivePlayerID] || {};
  const effectiveTeam = myPlayer.copiedTeam || myPlayer.team;
  const humanHasWonInRound = Boolean(myPlayer && myPlayer.hasWonAuction);
  const isPendingReplacementForMe = Boolean(G.pendingReplacement && String(G.pendingReplacement.playerID) === String(effectivePlayerID));

  // Determine active acting player & whether it is CPU turn
  const activeActingPlayerId = (ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null)
    ? String(G.board.nominator)
    : String(ctx.currentPlayer);
  const remainingAuctionProspects = (G.board.auctionPlayers || []).filter(Boolean);
  const isAuctionPoolEmpty = remainingAuctionProspects.length === 0 && G.board.activeAuctionCardIndex === null;
  const isAuctionComplete = (ctx.phase === 'auctionPhase' || ctx.phase === 'postAuctionPhase') && isAuctionPoolEmpty && !G.pendingReplacement && !G.board.pendingBills && !G.board.pendingEagles;
  const isCpuTurn = Boolean(G.players[activeActingPlayerId]?.isCpu) && !isAuctionComplete;
  const isMyTurnToNominate = ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex === null && !isAuctionPoolEmpty && String(G.board.nominator) === String(effectivePlayerID);

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

  // 800ms click delay lock on lineup replacement to prevent misclicks
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

  // Auto-switch to Auction tab when human turn starts, in refreshPhase, or when auction finishes
  const isMyBiddingTurn = ctx.phase === 'auctionPhase' && G.board.activeAuctionCardIndex !== null && String(ctx.currentPlayer) === String(effectivePlayerID);
  useEffect(() => {
    if (isMyBiddingTurn || isMyTurnToNominate || ctx.phase === 'refreshPhase' || isAuctionComplete) {
      setActiveTab('auction');
    }
  }, [isMyBiddingTurn, isMyTurnToNominate, ctx.phase, isAuctionComplete]);

  // Active auction card calculations
  const activeCard = G.board.activeAuctionCardIndex !== null ? G.board.auctionPlayers[G.board.activeAuctionCardIndex] : null;
  const isBearsActive = G.board.highestBidder !== null && getEffectiveTeamId(G.players[G.board.highestBidder]) === 'bears';
  const bidIncrement = isBearsActive ? 2 : 1;
  const minRequiredBid = activeCard ? (G.board.highestBid === null ? activeCard.minBid : G.board.highestBid + bidIncrement) : 1;
  const effMaxBid = activeCard ? getEffectiveCardMaxBid(activeCard, G.board.activeEvent) : 8;
  const maxAllowedBid = Math.min(myPlayer.coins || 0, effMaxBid);
  const nextBid = Math.min(minRequiredBid, maxAllowedBid);

  // Update custom bid to next valid minimum whenever turn / card updates
  useEffect(() => {
    if (activeCard) {
      setCustomBid(nextBid);
    }
  }, [activeCard?.id, G.board.highestBid, nextBid]);

  const isCommandersBlockedForBid = activeCard && activeCard.commandersBlocked && String(effectivePlayerID) === String(G.board.firstPlayer);
  const isDjMooreBlockedForBid = activeCard && activeCard.id === 'dj_moore' && (myPlayer.coins || 0) < 5;
  const isSoleRemainingZeroCoins = activeCard && G.board.highestBid === null && (myPlayer.coins || 0) === 0;

  // -------------------------------------------------------------
  // PHASE 1: TEAM SELECTION (DRAFT FRANCHISE)
  // -------------------------------------------------------------
  if (ctx.phase === 'teamSelection') {
    const unpickedHumans = humanPlayerIds.filter(id => !G.players[id]?.team);

    if (myPlayer.team) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white text-center">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <h2 className="text-xl font-bold">Team Drafted: {myPlayer.team.name}!</h2>
            <p className="text-slate-400 text-xs">Waiting for remaining players to select their franchise...</p>
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
      <div className="min-h-screen bg-slate-950 text-white p-4 font-sans max-w-md mx-auto flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400">Player {displayPlayerNumber(effectivePlayerID)}</span>
          </div>

          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 uppercase mb-1">
            Draft Your Franchise
          </h1>
          <p className="text-slate-400 text-xs mb-4">
            Select 1 of 3 NFL teams based on starting Coins, PSI, and Ability:
          </p>

          <div className="space-y-3">
            {(myPlayer.teamChoices || []).map((team, idx) => (
              <div
                key={team.id}
                onClick={() => moves.selectTeam(idx, effectivePlayerID)}
                className="bg-slate-900 border-2 border-slate-800 hover:border-blue-500 p-4 rounded-2xl flex flex-col justify-between cursor-pointer transition-all shadow-lg active:scale-98"
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <h3 className="text-lg font-black text-white">{team.name}</h3>
                    <div className="flex gap-2 text-xs font-mono font-bold">
                      <span className="text-yellow-400">🪙 {team.coins}</span>
                      <span className="text-emerald-400">🏈 {team.initialPsi} PSI</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-800/60 p-2.5 rounded-xl mb-3 text-xs">
                    <span className="text-[10px] font-black uppercase text-purple-300 block mb-0.5">⚡ Ability</span>
                    <p className="text-slate-200 leading-snug">{team.ability}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moves.selectTeam(idx, effectivePlayerID);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded-xl text-xs uppercase tracking-wider shadow"
                >
                  Draft {team.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 2: BUCCANEERS COPY
  // -------------------------------------------------------------
  if (ctx.phase === 'buccaneersCopy') {
    const isBucs = myPlayer.team && myPlayer.team.id === 'buccaneers';
    if (!isBucs || myPlayer.copiedTeam) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white text-center">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
            <h2 className="text-xl font-bold">Buccaneers Drafting Ability</h2>
            <p className="text-slate-400 text-xs">Waiting for Buccaneers to copy a team ability...</p>
          </div>
        </div>
      );
    }

    const otherDraftedTeams = Object.values(G.players).filter(p => p.team && p.team.id !== 'buccaneers').map(p => p.team);

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 font-sans max-w-md mx-auto">
        <h1 className="text-xl font-black text-amber-400 uppercase mb-1">🏴‍☠️ Buccaneers Ability Draft</h1>
        <p className="text-slate-400 text-xs mb-3">Select another drafted team to copy their power:</p>

        <div className="space-y-2.5">
          {otherDraftedTeams.map(team => (
            <div
              key={team.id}
              onClick={() => moves.copyAbility(team.id, effectivePlayerID)}
              className="bg-slate-900 border-2 border-amber-500/50 p-3.5 rounded-2xl cursor-pointer shadow"
            >
              <h3 className="text-base font-black text-amber-300 mb-1">{team.name}</h3>
              <p className="text-xs text-slate-300 mb-2">{team.ability}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moves.copyAbility(team.id, effectivePlayerID);
                }}
                className="w-full bg-amber-500 text-black font-black py-2 rounded-xl text-xs uppercase"
              >
                Copy {team.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: TITANS DRAFT
  // -------------------------------------------------------------
  if (ctx.phase === 'titansDraft') {
    const isMyDraftTurn = G.board.pendingTitansDraft && String(G.board.pendingTitansDraft.playerID) === String(effectivePlayerID);
    if (!isMyDraftTurn) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white text-center">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <h2 className="text-xl font-bold">Titans Opening Draft</h2>
            <p className="text-slate-400 text-xs">Waiting for Titans to draft starting player...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 font-sans max-w-md mx-auto">
        <h1 className="text-xl font-black text-blue-400 uppercase mb-1">⚔️ Titans Opening Draft</h1>
        <p className="text-slate-400 text-xs mb-3">Choose 1 of the top 3 cards to acquire for free:</p>

        <div className="space-y-2.5">
          {G.board.pendingTitansDraft.options.map((card, idx) => (
            <div
              key={card.uniqueId || idx}
              onClick={() => moves.titansPickCard(idx, effectivePlayerID)}
              className="bg-slate-900 border-2 border-blue-500/50 p-3.5 rounded-2xl cursor-pointer shadow"
            >
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-cyan-400">{card.position || 'WR'}</span>
                {renderPhaseBadgeHelper(card.phase)}
              </div>
              <h3 className="text-base font-black text-white">{card.name}</h3>
              <div className="mt-1 text-xs">{renderCardEffectsHelper(card.effects, card.specialText)}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moves.titansPickCard(idx, effectivePlayerID);
                }}
                className="mt-2.5 w-full bg-blue-600 text-white font-black py-2 rounded-xl text-xs uppercase"
              >
                Draft {card.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE GAMEPLAY DASHBOARD (AUCTION / REFRESH / EVENTS)
  // -------------------------------------------------------------

  // Top ability announcement banner - strictly single line
  const renderAbilityCarousel = () => {
    const history = G.board.abilityNotificationHistory || (G.board.abilityNotification ? [G.board.abilityNotification] : []);
    if (!history || history.length === 0) return null;

    const currentNotif = history[0];
    if (!currentNotif) return null;

    return (
      <div 
        onClick={() => setShowAllBannerMessagesModal(true)}
        className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-amber-950/90 border border-amber-500/70 px-2.5 py-1.5 rounded-xl shadow-md text-white mb-2.5 flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] transition-all group"
        title="Tap to view all ability & event announcements"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-base shrink-0">{currentNotif.icon || '⚡'}</span>
          <span className="text-[9px] uppercase tracking-wider font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-600/50 shrink-0">
            {currentNotif.teamName || 'Ability'}
          </span>
          <span className="text-xs font-semibold text-slate-200 truncate">
            {currentNotif.message}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-[10px] text-amber-400 font-bold bg-amber-900/40 border border-amber-600/40 px-1.5 py-0.5 rounded group-hover:bg-amber-800/60 transition-colors">
          <span>📜 History</span>
        </div>
      </div>
    );
  };

  // Rivalry Event Banner with direct target buttons
  const renderRivalryBanner = () => {
    if (!G.board.pendingRivalry || G.board.eventFlipRevealed || !G.board.eventConfirmed) return null;
    const isMyTurnToGive = String(G.board.pendingRivalry.currentGiverId) === String(effectivePlayerID);

    return (
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border border-red-500/80 p-3 rounded-2xl shadow-lg mb-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xl">⚔️</span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-red-900 text-red-300 px-2 py-0.5 rounded">
            Round {G.board.round} Event: Rivalry
          </span>
        </div>
        <p className="text-xs text-white font-medium mb-2">
          {isMyTurnToGive 
            ? "Your turn! Give 1 PSI to an opponent (-1 your PSI, +1 their PSI):"
            : `Waiting for ${G.players[G.board.pendingRivalry.currentGiverId]?.team?.name || `Player ${parseInt(G.board.pendingRivalry.currentGiverId || '0') + 1}`} to choose...`}
        </p>

        {isMyTurnToGive && (
          <div className="grid grid-cols-1 gap-1.5">
            {Object.keys(G.players).filter(id => id !== effectivePlayerID).map(oppId => {
              const opp = G.players[oppId];
              const oppName = opp?.team?.name || `Player ${displayPlayerNumber(oppId)}`;
              const oppPsi = typeof opp?.psi === 'number' ? opp.psi.toFixed(1) : opp?.psi || 0;
              return (
                <button
                  key={oppId}
                  onClick={() => moves.rivalryGivePsi(oppId, effectivePlayerID)}
                  className="bg-red-600 hover:bg-red-500 text-white font-black py-2 px-3 rounded-xl text-xs flex items-center justify-between shadow"
                >
                  <span>Give 1 PSI to {oppName}</span>
                  <span className="bg-red-950 px-2 py-0.5 rounded text-[10px] font-mono">{oppPsi} PSI</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col pb-36 px-3 pt-2 max-w-md mx-auto relative select-none">
      {/* Top Header: Brand, Round, and View Switcher */}
      <header className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏈</span>
          <div>
            <h1 className="text-sm font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 uppercase">
              Deflategate
            </h1>
            <span className="text-[10px] font-bold text-slate-400 block -mt-0.5">
              Round {G.board.round} / 10 • {ctx.phase === 'auctionPhase' ? 'Auction' : ctx.phase === 'refreshPhase' ? 'Refresh' : 'Event'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {G.board.activeEvent && (
            <button
              type="button"
              onClick={() => setShowEventInfoModal(true)}
              className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 hover:border-indigo-400 px-2.5 py-1 rounded-xl text-[10px] font-black text-indigo-300 hover:text-white truncate max-w-[150px] flex items-center cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Click to view event details"
            >
              <span>{G.board.activeEvent.name}</span>
            </button>
          )}
        </div>
      </header>

      {/* Active Tab === 'auction' Only Top Elements: Ability Banner & User Team Quick Vitals Box */}
      {activeTab === 'auction' && (
        <>
          {renderAbilityCarousel()}
          {renderRivalryBanner()}

          {/* Persistent Quick Vitals Card for Human Player - Jumps to My Team Tab */}
          <div 
            onClick={() => setActiveTab('myRoster')}
            className="bg-gradient-to-r from-slate-900 to-indigo-950/70 border border-indigo-500/40 hover:border-indigo-400/70 p-3 rounded-2xl shadow-md mb-3 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group"
            title="Tap to jump to My Team tab & Franchise Powers"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                🛡️
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate block">
                    {effectiveTeam?.name || `Player ${displayPlayerNumber(effectivePlayerID)}`}
                  </span>
                  <span className="text-[9px] text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform shrink-0">➔</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Lineup: {(myPlayer.lineup || []).length}/{(effectiveTeam?.id === 'colts' ? '∞' : (effectiveTeam?.id === 'seahawks' ? 4 : 3) + (myPlayer.extraLineupSlots || 0))} • <span className="text-indigo-300 font-bold">My Team</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Coins</span>
                <span className="text-sm font-black font-mono text-yellow-400">🪙 {myPlayer.coins || 0}</span>
              </div>
              <div className="text-right pl-2 border-l border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Deflation</span>
                <span className="text-sm font-black font-mono text-emerald-400">
                  {typeof myPlayer.psi === 'number' ? myPlayer.psi.toFixed(1) : myPlayer.psi || 0} PSI
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Game Over Banner */}
      {ctx.gameover && (
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 text-white p-4 rounded-2xl text-center shadow-xl mb-3">
          <h2 className="text-xl font-black">🏆 Game Over!</h2>
          <p className="text-sm mt-1">Winner: {G.players[ctx.gameover.winner]?.team?.name || `Player ${displayPlayerNumber(ctx.gameover.winner)}`}</p>
        </div>
      )}

      {/* Main Tab Content Panels with Horizontal Touch Swipe Navigation */}
      <main 
        className="flex-1"
        onTouchStart={handleMainTabTouchStart}
        onTouchEnd={handleMainTabTouchEnd}
      >
        {/* TAB 1: AUCTION BLOCK / REFRESH IN-TAB */}
        {activeTab === 'auction' && (
          <div className="space-y-3">
            {ctx.phase === 'refreshPhase' ? (
              /* Phase 4: Refresh Phase Team Results on Auction Tab */
              <div className="space-y-3">
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-600">
                        🔄 Refresh Phase
                      </span>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide">
                        Round {G.board.round} Revenue & Deflation
                      </h3>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Passive lineup effects and team contracts calculated. Ready to proceed to the next round.
                  </p>
                </div>

                <div className="space-y-2">
                  {(G.board.refreshResults && G.board.refreshResults.length > 0
                    ? G.board.refreshResults
                    : Object.keys(G.players).map(id => ({
                        id,
                        teamName: G.players[id]?.team?.name || `Player ${displayPlayerNumber(id)}`,
                        coinsGained: 0,
                        psiDeflated: 0,
                        currentPsi: G.players[id]?.psi || 0,
                        currentCoins: G.players[id]?.coins || 0
                      }))
                  ).map((res, i) => {
                    const isMyTeam = String(res.id) === String(effectivePlayerID);
                    const pObj = G.players[res.id];
                    const teamObj = pObj?.team;
                    return (
                      <div
                        key={res.id || i}
                        className={`p-3 rounded-2xl border shadow-md flex items-center justify-between gap-2 transition-all ${
                          isMyTeam
                            ? 'bg-blue-950/70 border-blue-500/80 ring-1 ring-blue-500/50'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-2.5 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                            {teamObj?.icon || '🏈'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-black text-xs text-white truncate">
                                {res.teamName}
                              </h4>
                              {isMyTeam && (
                                <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-blue-600 text-white shrink-0">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              🪙 {pObj?.coins ?? res.currentCoins ?? 0} • 🏈 {typeof (pObj?.psi ?? res.currentPsi) === 'number' ? (pObj?.psi ?? res.currentPsi).toFixed(1) : (pObj?.psi ?? res.currentPsi)} PSI
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono font-black shrink-0 text-xs">
                          <span className="text-yellow-300 bg-yellow-950/80 border border-yellow-700/70 px-2 py-1 rounded-lg text-xs shadow-sm">
                            +{res.coinsGained} 🪙
                          </span>
                          <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-700/70 px-2 py-1 rounded-lg text-xs shadow-sm">
                            -{res.psiDeflated} PSI
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : isAuctionComplete ? (
              /* Auction Complete -> Transition Screen */
              <div className="p-5 bg-gradient-to-b from-slate-900 to-indigo-950/80 border-2 border-indigo-500/60 rounded-3xl text-center shadow-2xl space-y-4 my-2">
                <div className="w-14 h-14 bg-indigo-500/20 border-2 border-indigo-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                  🏁
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-900/70 text-indigo-300 px-3 py-1 rounded-full border border-indigo-600">
                    Round {G.board.round} Auction Complete
                  </span>
                  <h3 className="text-xl font-black text-white uppercase tracking-wide mt-2">
                    All Prospects Acquired
                  </h3>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed max-w-xs mx-auto">
                  All auction players have been drafted. Ready to calculate round revenue, contracts, and passive deflation.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (moves.proceedToRefresh) moves.proceedToRefresh();
                    else if (moves.startRefreshSequence) moves.startRefreshSequence();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-black py-3.5 px-4 rounded-2xl text-sm shadow-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
                >
                  <span>Proceed to Refresh Phase 🔄</span>
                </button>
              </div>
            ) : (
              <>
                {/* Active Nominated Player Card - Compact & Clean */}
                {activeCard ? (
                  <div 
                    onClick={() => openInspectCard(activeCard, G.board.auctionPlayers)}
                    className={`p-3 rounded-2xl border-2 shadow-lg cursor-pointer transition-all active:scale-[0.99] ${getCardPhaseStyleHelper(activeCard)}`}
                  >
                    <div className="flex justify-between items-center mb-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black px-1.5 py-0.5 rounded text-[10px] uppercase">
                          {activeCard.position || 'WR'}
                        </span>
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-300 font-bold px-1.5 py-0.5 rounded border border-yellow-500/40 uppercase">
                          ON BLOCK 🔨
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {renderPhaseBadgeHelper(activeCard.phase)}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInspectCard(activeCard, G.board.auctionPlayers);
                          }}
                          className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 font-bold"
                          title="Inspect full details"
                        >
                          🔍
                        </button>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-black text-white truncate">{activeCard.name}</h3>
                      <div className="font-mono text-xs text-slate-300 shrink-0">
                        <span className="text-yellow-400 font-bold">Min: {activeCard.minBid}</span> • <span className="text-amber-400 font-bold">Max: {effMaxBid}</span>
                      </div>
                    </div>

                    <div className="mt-1 text-xs">
                      {renderCardEffectsHelper(activeCard.effects, activeCard.specialText || activeCard.customText)}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="text-left">
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Current High Bid</span>
                        <span className="text-sm font-black font-mono text-yellow-400">
                          {G.board.highestBid === null ? 'None' : `${G.board.highestBid} Coins`}
                        </span>
                      </div>
                      {G.board.highestBidder !== null ? (
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Leader</span>
                          <span className="text-xs font-bold text-blue-300 truncate max-w-[140px] block">
                            {G.players[G.board.highestBidder]?.team?.name || `Player ${displayPlayerNumber(G.board.highestBidder)}`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No bids yet</span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Awaiting Nomination Banner */
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xl">⭐</span>
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        {isMyTurnToNominate ? "Your Turn to Nominate!" : "Awaiting Nomination"}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {isMyTurnToNominate
                        ? "Tap any highlighted prospect card below to place on the auction block."
                        : `Waiting for ${G.players[G.board.nominator]?.team?.name || `Player ${displayPlayerNumber(G.board.nominator)}`} to select a player...`}
                    </p>
                  </div>
                )}

                {/* Auction Block Prospects Pool */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Auction Prospects ({G.board.auctionPlayers.filter(Boolean).length})
                    </h4>
                    {isMyTurnToNominate && (
                      <span className="text-[10px] font-black uppercase text-yellow-300 animate-pulse">
                        Tap to Nominate
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {G.board.auctionPlayers.map((card, idx) => {
                      if (!card) return null;
                      const isCurrentActive = G.board.activeAuctionCardIndex === idx;

                      return (
                        <div
                          key={card.uniqueId || idx}
                          onClick={() => {
                            if (isMyTurnToNominate && !isCurrentActive) {
                              moves.selectCard(idx, effectivePlayerID);
                            } else {
                              openInspectCard(card, G.board.auctionPlayers);
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer shadow-md select-none relative group ${
                            isCurrentActive 
                              ? 'border-yellow-400 bg-yellow-950/30 ring-1 ring-yellow-400' 
                              : isMyTurnToNominate 
                                ? 'border-yellow-500/70 bg-slate-900/95 hover:border-yellow-400 active:scale-[0.98]' 
                                : `${getCardPhaseStyleHelper(card)} hover:border-slate-500 active:scale-[0.98]`
                          }`}
                        >
                          {/* Top Header Row: Position, Phase, and Inspect */}
                          <div className="flex items-center justify-between gap-1 mb-1 text-[10px]">
                            <span className="bg-slate-950 border border-slate-700 text-cyan-400 font-mono font-black px-1.5 py-0.5 rounded uppercase shrink-0">
                              {card.position || 'WR'}
                            </span>
                            <div className="flex items-center gap-1">
                              {renderPhaseBadgeHelper(card.phase)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInspectCard(card, G.board.auctionPlayers);
                                }}
                                className="text-slate-400 hover:text-white p-0.5 rounded text-[10px]"
                                title="Inspect details"
                              >
                                🔍
                              </button>
                            </div>
                          </div>

                          {/* Card Name */}
                          <h5 className="text-xs font-black text-white truncate mb-0.5">
                            {card.name}
                          </h5>

                          {/* Min / Max Bids */}
                          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80">
                            <span>Min <b className="text-yellow-400">{card.minBid}</b></span>
                            <span>Max <b className="text-amber-400">{getEffectiveCardMaxBid(card, G.board.activeEvent)}</b></span>
                          </div>

                          {/* Card Effects */}
                          <div className="text-[10px] flex-1 my-1">
                            {renderCardEffectsHelper(card.effects, null)}
                            {(card.specialText || card.customText) && (
                              <div className="text-[9px] line-clamp-2 text-amber-200 bg-amber-950/60 border border-amber-500/50 rounded px-1.5 py-0.5 mt-1 font-medium leading-tight">
                                ⚡ {card.specialText || card.customText}
                              </div>
                            )}
                          </div>

                          {/* Bottom Action Footer */}
                          <div className="mt-2 pt-1.5 border-t border-slate-800/80">
                            {isCurrentActive ? (
                              <div className="w-full text-center py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-black text-[10px] uppercase tracking-wider">
                                Active
                              </div>
                            ) : isMyTurnToNominate ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moves.selectCard(idx, effectivePlayerID);
                                }}
                                className="w-full py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-wider cursor-pointer shadow transition-all"
                              >
                                Nominate ➔
                              </button>
                            ) : (
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                <span>Prospect</span>
                                <span className="text-slate-400 group-hover:text-blue-400 transition-colors">Details ➔</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

          {/* TAB 2: MY ROSTER */}
          {activeTab === 'myRoster' && (
            <div className="space-y-3">
              {/* Franchise Power Hero Card */}
              {effectiveTeam && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border-2 border-indigo-500/50 shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/60 flex items-center justify-center text-xl shrink-0 shadow-inner">
                        🏈
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-white tracking-wide truncate">
                            {effectiveTeam.name}
                          </h3>
                          {myPlayer.copiedTeam && (
                            <span className="text-[9px] bg-purple-900 text-purple-200 border border-purple-500 px-1 py-0.2 rounded font-bold uppercase shrink-0">
                              Copied
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                          Franchise Power
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-yellow-950/90 border border-yellow-500/60 text-yellow-300 text-xs font-black px-2 py-0.5 rounded-lg font-mono shadow-sm">
                        🪙 {myPlayer.coins || 0}
                      </span>
                      <span className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-xs font-black px-2 py-0.5 rounded-lg font-mono shadow-sm">
                        🏈 {typeof myPlayer.psi === 'number' ? myPlayer.psi.toFixed(1) : myPlayer.psi || 0} PSI
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400 shadow-md ring-1 ring-indigo-400/30 text-xs text-indigo-100 leading-relaxed">
                    <div className="flex items-center gap-1 font-bold text-amber-300 mb-1 text-[10px] uppercase tracking-wider">
                      <span>⚡ Special Ability</span>
                    </div>
                    {effectiveTeam.ability || 'No special ability active.'}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  My Active Lineup ({(myPlayer.lineup || []).length})
                </h4>
                <span className="text-[10px] text-indigo-400 font-bold">Tap card to inspect</span>
              </div>

              {(!myPlayer.lineup || myPlayer.lineup.length === 0) ? (
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs italic">
                  No active players in lineup. Win an auction to draft players!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myPlayer.lineup.map((card, idx) => (
                    <div
                      key={card.uniqueId || idx}
                      onClick={() => openInspectCard(card, myPlayer.lineup)}
                      className={`p-3.5 rounded-2xl border-2 shadow-md cursor-pointer hover:border-slate-500 active:scale-[0.99] transition-all ${getCardPhaseStyleHelper(card)}`}
                    >
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <span className="bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black px-1.5 py-0.5 rounded uppercase text-[10px] shrink-0">
                            {card.position || 'WR'}
                          </span>
                          <h4 className="text-sm font-black text-white leading-tight truncate">{card.name}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {renderPhaseBadgeHelper(card.phase)}
                          <span className="text-slate-400 hover:text-white text-xs font-bold">🔍</span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs">
                        {renderCardEffectsHelper(card.effects, card.specialText || card.customText)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        {/* TAB 3: ALL TEAMS & STANDINGS (DRILLDOWN FEATURE) */}
        {activeTab === 'teams' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Standings & Team Overview
              </h4>
              <span className="text-[10px] text-indigo-400 font-bold">Tap team to inspect</span>
            </div>

            {Object.keys(G.players).map((pId) => {
              const p = G.players[pId];
              if (!p.team) return null;
              const isMe = String(pId) === String(effectivePlayerID);
              const pPsi = typeof p.psi === 'number' ? p.psi.toFixed(1) : p.psi || 0;

              return (
                <div
                  key={pId}
                  onClick={() => setSelectedTeamDetailId(pId)}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition-all cursor-pointer shadow-md ${
                    isMe
                      ? 'border-indigo-500 bg-slate-900'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-lg shrink-0">
                        🏈
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-sm font-black text-white truncate">
                            {p.team.name}
                          </h5>
                          {isMe && (
                            <span className="text-[9px] bg-indigo-900 text-indigo-200 px-1.5 py-0.2 rounded font-black">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Player {displayPlayerNumber(pId)} • {p.isCpu ? 'CPU' : 'Human'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 uppercase block">Coins</span>
                        <span className="text-xs font-black font-mono text-yellow-400">🪙 {p.coins || 0}</span>
                      </div>
                      <div className="text-right pl-2 border-l border-slate-800">
                        <span className="text-[9px] text-slate-400 uppercase block">Deflation</span>
                        <span className="text-xs font-black font-mono text-emerald-400">{pPsi} PSI</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate max-w-[200px]">
                      ⭐ {p.team.ability}
                    </span>
                    <span className="text-indigo-400 font-black shrink-0 flex items-center gap-1">
                      <span>Roster ({(p.lineup || []).length})</span>
                      <span>➔</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: EVENT & LOGS */}
        {activeTab === 'log' && (
          <div className="space-y-3">
            {/* Active Round Event Card */}
            {G.board.activeEvent && (
              <div className="p-3.5 bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/50 rounded-2xl">
                <span className="text-[10px] uppercase tracking-wider font-black text-blue-300 block mb-1">
                  Round {G.board.round} Event
                </span>
                <h4 className="text-base font-black text-white">{G.board.activeEvent.name}</h4>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {G.board.activeEvent.effect}
                </p>
              </div>
            )}

            {/* Action Logs Feed */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Action History
              </h4>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl max-h-80 overflow-y-auto space-y-1.5 text-xs font-mono">
                {(!G.logs || G.logs.length === 0) ? (
                  <p className="text-slate-500 italic">No actions recorded yet.</p>
                ) : (
                  G.logs.map((log) => (
                    <div key={log.id} className="text-slate-300 leading-snug border-b border-slate-900 pb-1">
                      {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------------------------------------- */}
      {/* MODALS & OVERLAYS FOR MOBILE GAMEPLAY                       */}
      {/* ----------------------------------------------------------- */}

      {/* Round Event Reveal Modal */}
      {G.board.eventFlipRevealed && G.board.activeEvent && !G.board.eventConfirmed && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-bounce-short">
            <span className="text-xs font-black uppercase tracking-widest bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full border border-purple-700">
              Round {G.board.round} Event
            </span>
            <h2 className="text-2xl font-black text-white mt-3 mb-2">{G.board.activeEvent.name}</h2>
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-800/50 my-4">
              <p className="text-slate-200 text-sm leading-relaxed italic">"{G.board.activeEvent.effect}"</p>
            </div>
            <button 
              onClick={() => moves.confirmEventReveal()}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl text-sm shadow-lg uppercase tracking-wider cursor-pointer"
            >
              Continue to Round {G.board.round} Auction 🏈
            </button>
          </div>
        </div>
      )}

      {/* Interactive Team Detail Modal (drill-down on click) */}
      <TeamDetailModal
        teamPlayerId={selectedTeamDetailId}
        G={G}
        onClose={() => setSelectedTeamDetailId(null)}
        onSelectTeamPlayerId={(id) => setSelectedTeamDetailId(id)}
        onInspectCard={(card, list) => openInspectCard(card, list)}
      />

      {/* Inspected Player Card Full Detail Modal with Left/Right Navigation & Screen-Wide Touch Swipe for Mobile */}
      {inspectedCard && (
        <div 
          onClick={() => setInspectedCard(null)}
          onTouchStart={handleInspectTouchStart}
          onTouchEnd={handleInspectTouchEnd}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 cursor-pointer select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm w-full flex items-center justify-center cursor-default"
          >
            {/* Main Player Card Modal Box */}
            <div className="bg-slate-900 border-2 border-slate-700 p-4 rounded-3xl w-full text-left shadow-2xl space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🔍</span>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Player Card Details
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {inspectedCardList.length > 1 && (
                    <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700 text-xs font-mono font-bold text-slate-300">
                      <button
                        type="button"
                        onClick={handlePrevInspectedCard}
                        className="hover:text-blue-400 cursor-pointer p-0.5"
                        title="Previous Player"
                      >
                        ◀
                      </button>
                      <span>{inspectedCardIndex + 1}/{inspectedCardList.length}</span>
                      <button
                        type="button"
                        onClick={handleNextInspectedCard}
                        className="hover:text-blue-400 cursor-pointer p-0.5"
                        title="Next Player"
                      >
                        ▶
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectedCard(null)}
                    className="text-slate-400 hover:text-white font-bold p-1 text-base cursor-pointer"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border text-left shadow-lg ${getCardPhaseStyleHelper(inspectedCard)}`}>
                <div className="flex justify-between items-center text-xs font-mono font-bold mb-2">
                  <span className="text-yellow-300">Min: {inspectedCard.minBid}</span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    {inspectedCard.position || 'WR'}
                  </span>
                  <span className="text-amber-400">Max: {getEffectiveCardMaxBid(inspectedCard, G.board.activeEvent)}</span>
                </div>
                <h4 className="font-extrabold text-lg text-white mb-1.5">{inspectedCard.name}</h4>
                <div className="text-xs mb-2 space-y-1">
                  {renderCardEffectsHelper(inspectedCard.effects, null)}
                </div>
                {(inspectedCard.specialText || inspectedCard.customText) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/60 my-2 text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold text-amber-300 block mb-0.5">⚡ Special Ability:</span>
                    {inspectedCard.specialText || inspectedCard.customText}
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                  {renderPhaseBadgeHelper(inspectedCard.phase)}
                </div>
              </div>

              <div className="flex gap-2">
                {inspectedCardList.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevInspectedCard}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-slate-700 shadow flex items-center justify-center gap-1 transition-all"
                  >
                    <span>◀</span> Prev
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedCard(null)}
                  className={`${inspectedCardList.length > 1 ? 'flex-1' : 'w-full'} bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-slate-700 shadow transition-all`}
                >
                  Close
                </button>
                {inspectedCardList.length > 1 && (
                  <button
                    type="button"
                    onClick={handleNextInspectedCard}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer border border-slate-700 shadow flex items-center justify-center gap-1 transition-all"
                  >
                    Next <span>▶</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Rumors Card Picker Modal */}
      {G.board.pendingTradeRumors && !G.board.pendingTradeRumors?.picks?.[effectivePlayerID] && !G.board.eventFlipRevealed && G.board.eventConfirmed && myPlayer.lineup && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-5 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3">
            <span className="text-3xl block">🤝</span>
            <h3 className="text-lg font-black text-white uppercase">Trade Rumors Active!</h3>
            <p className="text-xs text-slate-300">Select one active player from your lineup to pass to the right:</p>
            <div className="space-y-2">
              {myPlayer.lineup.map((card, cidx) => (
                <button
                  key={card.uniqueId || cidx}
                  onClick={() => moves.tradeRumorsPickCard(cidx, effectivePlayerID)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-white truncate">{card.name}</span>
                  <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-black uppercase">Pass ➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade Rumors Summary Modal */}
      {G.board.tradeRumorsSummary && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-blue-500 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3 animate-bounce-short">
            <span className="text-3xl block">🤝</span>
            <h2 className="text-xl font-black text-blue-400 uppercase tracking-wide">Trade Rumors Complete!</h2>
            <div className="space-y-1.5 text-left bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              {G.board.tradeRumorsSummary.map((line, idx) => (
                <p key={idx} className="text-slate-200">🏈 {line}</p>
              ))}
            </div>
            <button
              onClick={() => {
                if (moves.dismissTradeRumorsSummary) moves.dismissTradeRumorsSummary();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Raiders Modal: Choose opponent to give 1 PSI */}
      {G.board.pendingRaiders && String(G.board.pendingRaiders.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 p-5 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3 animate-bounce-short">
            <span className="text-3xl block">☠️</span>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide">Raiders Ability: Give 1 PSI</h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Before the auction, you may give 1 PSI you control to an opponent. (You deflate -1 PSI, and they inflate +1 PSI).
            </p>
            <div className="space-y-2 pt-1">
              {Object.keys(G.players).filter(id => id !== effectivePlayerID).map(oppId => {
                const opp = G.players[oppId];
                return (
                  <button
                    key={oppId}
                    onClick={() => moves.raidersGivePsi(oppId, effectivePlayerID)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-blue-500 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all shadow"
                  >
                    <div className="text-left min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 font-bold block">Player {displayPlayerNumber(oppId)}</span>
                      <span className="text-xs font-black text-white truncate block">{opp.team?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400 font-mono font-bold">{typeof opp.psi === 'number' ? opp.psi.toFixed(1) : opp.psi} PSI</span>
                      <span className="text-[10px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-bold uppercase">Give 1 ➔</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cardinals Modal: Top Deck Peek & Swap */}
      {G.board.pendingCardinals && String(G.board.pendingCardinals.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-red-500 p-4 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-2 justify-center border-b border-slate-800 pb-2">
              <span className="text-2xl">🐦</span>
              <h2 className="text-base font-black text-red-400 uppercase tracking-wide">Cardinals: Peek & Swap</h2>
            </div>
            {G.board.pendingCardinals.topCard && (
              <div className="bg-slate-950 p-2.5 rounded-xl border border-red-500/50 text-left">
                <span className="text-[10px] font-black uppercase text-red-400 block mb-0.5">Top Deck Card (Incoming):</span>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{G.board.pendingCardinals.topCard.name} ({G.board.pendingCardinals.topCard.position})</span>
                  <span className="text-yellow-400 font-mono">Min: {G.board.pendingCardinals.topCard.minBid}</span>
                </div>
                <div className="text-[11px] mt-1">{renderCardEffectsHelper(G.board.pendingCardinals.topCard.effects, G.board.pendingCardinals.topCard.specialText)}</div>
              </div>
            )}
            <p className="text-slate-300 text-xs font-bold text-left">Select an auction card to swap out:</p>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-left">
              {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                if (!card) return null;
                return (
                  <div key={card.uniqueId || idx} className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-mono">{card.position} • Min: {card.minBid}</span>
                      <p className="text-xs font-bold text-white truncate">{card.name}</p>
                    </div>
                    <button
                      onClick={() => moves.cardinalsSwap(idx, effectivePlayerID)}
                      className="bg-red-600 hover:bg-red-500 text-white font-black text-[10px] py-1.5 px-2.5 rounded-lg uppercase shrink-0"
                    >
                      Swap ➔
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => moves.cardinalsPass(effectivePlayerID)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs uppercase border border-slate-700"
            >
              Pass (Keep Current Cards)
            </button>
          </div>
        </div>
      )}

      {/* Commanders Ability Interactive Selection Modal */}
      {G.board.pendingCommanders && String(G.board.pendingCommanders.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-amber-500/90 p-4 rounded-3xl max-w-sm w-full shadow-2xl space-y-3 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="text-2xl">🎖️</span>
              <div>
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">Commanders Blockade</h3>
                <p className="text-[10px] text-slate-300">Mark 1 player to block First Player from bidding on them:</p>
              </div>
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-left">
              {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                if (!card) return null;
                return (
                  <div key={card.uniqueId || idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-mono">{card.position} • Min: {card.minBid}</span>
                      <h4 className="text-xs font-black text-white truncate">{card.name}</h4>
                    </div>
                    <button
                      onClick={() => moves.commandersMarkCard(idx, effectivePlayerID)}
                      className="bg-amber-600 hover:bg-amber-500 text-black font-black py-1.5 px-3 rounded-lg text-[10px] uppercase shrink-0"
                    >
                      Block 🚫
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Chiefs Claim Modal */}
      {G.board.pendingChiefs && String(G.board.pendingChiefs.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-red-500 p-4 rounded-3xl max-w-sm w-full shadow-2xl space-y-3 max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <span className="text-2xl">👑</span>
              <div>
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">Chiefs Special Ability</h3>
                <p className="text-[10px] text-slate-300">Claim 1 auction player for minimum cost without bidding:</p>
              </div>
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-left">
              {G.board.auctionPlayers && G.board.auctionPlayers.map((card, idx) => {
                if (!card) return null;
                const canAfford = (myPlayer.coins || 0) >= card.minBid;
                return (
                  <div key={card.uniqueId || idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-mono">{card.position} • Min: {card.minBid}</span>
                      <h4 className="text-xs font-black text-white truncate">{card.name}</h4>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => moves.chiefsClaimCard(idx, effectivePlayerID)}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-black py-1.5 px-3 rounded-lg text-[10px] uppercase disabled:opacity-40 shrink-0"
                    >
                      Claim ({card.minBid}🪙)
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => moves.chiefsPass(effectivePlayerID)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs uppercase border border-slate-700"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      {/* Bills Discard Pile Picker Modal */}
      {G.board.pendingBills && String(G.board.pendingBills.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-blue-500 p-4 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3 max-h-[90vh] flex flex-col">
            <span className="text-3xl block">🦬</span>
            <h2 className="text-base font-black text-blue-400 uppercase tracking-wide">Bills: Discard Market</h2>
            <p className="text-slate-300 text-[10px] leading-relaxed">
              Pay minimum cost for a player in the discard pile, or pass:
            </p>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-left">
              {(G.decks.discard || []).map((card, originalIdx) => {
                if (!card || card.isPracticeSquad) return null;
                const canAfford = (myPlayer.coins || 0) >= card.minBid;
                return (
                  <div key={card.uniqueId || originalIdx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-mono">{card.position} • Min: {card.minBid}</span>
                      <h4 className="text-xs font-black text-white truncate">{card.name}</h4>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => moves.billsBuyDiscard(originalIdx, effectivePlayerID)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black py-1.5 px-2.5 rounded-lg text-[10px] uppercase disabled:opacity-40 shrink-0"
                    >
                      Buy ({card.minBid}🪙)
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => moves.billsPass(effectivePlayerID)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs uppercase border border-slate-700"
            >
              Pass
            </button>
          </div>
        </div>
      )}

      {/* Eagles Ability Modal */}
      {G.board.pendingEagles && String(G.board.pendingEagles.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500 p-5 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3">
            <span className="text-3xl block">🦅</span>
            <h4 className="text-base font-black text-emerald-400 uppercase tracking-wide">Eagles Franchise Ability</h4>
            <p className="text-xs text-slate-200">
              Pay 3 coins to inflate all opponents +3 PSI, or 6 coins for +6 PSI. You have <strong>{myPlayer.coins} Coins</strong>.
            </p>
            <div className="space-y-2 pt-1">
              <button
                disabled={(myPlayer.coins || 0) < 3}
                onClick={() => moves.eaglesUseAbility(1, effectivePlayerID)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs uppercase disabled:opacity-40"
              >
                Use Once (-3 Coins, +3 Opponent PSI)
              </button>
              <button
                disabled={(myPlayer.coins || 0) < 6}
                onClick={() => moves.eaglesUseAbility(2, effectivePlayerID)}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black py-2.5 rounded-xl text-xs uppercase disabled:opacity-40"
              >
                Use Twice (-6 Coins, +6 Opponent PSI)
              </button>
              <button
                onClick={() => moves.eaglesPass(effectivePlayerID)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs uppercase border border-slate-700"
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jaguars Notification Popup */}
      {G.board.jaguarsPopupNotification && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-teal-500 p-5 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3 animate-bounce-short">
            <span className="text-3xl block">🐆</span>
            <h3 className="text-lg font-black text-teal-300 uppercase">Jaguars Alert!</h3>
            <p className="text-slate-200 text-xs leading-relaxed">{G.board.jaguarsPopupNotification}</p>
            <button
              onClick={() => moves.dismissJaguarsPopup()}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Free Agency Event Modal */}
      {G.board.pendingFreeAgency && G.board.pendingFreeAgency.card && !G.board.eventFlipRevealed && G.board.eventConfirmed && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 p-5 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-3">
            <span className="text-3xl block">💼</span>
            <h3 className="text-lg font-black text-indigo-300 uppercase">Free Agency!</h3>
            {String(G.board.pendingFreeAgency.playerID) === String(effectivePlayerID) ? (
              <>
                <p className="text-slate-300 text-xs">
                  You drew <strong className="text-white">{G.board.pendingFreeAgency.card.name}</strong> ({G.board.pendingFreeAgency.card.position}). Pay maximum price ({G.board.pendingFreeAgency.card.maxBid} Coins) to sign them immediately:
                </p>
                <div className="text-xs">{renderCardEffectsHelper(G.board.pendingFreeAgency.card.effects, G.board.pendingFreeAgency.card.specialText)}</div>
                <div className="space-y-2 pt-2">
                  <button
                    disabled={(myPlayer.coins || 0) < G.board.pendingFreeAgency.card.maxBid}
                    onClick={() => moves.freeAgencyBuy(effectivePlayerID)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs uppercase disabled:opacity-40"
                  >
                    Sign for {G.board.pendingFreeAgency.card.maxBid} Coins
                  </button>
                  <button
                    onClick={() => moves.freeAgencyPass(effectivePlayerID)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs uppercase border border-slate-700"
                  >
                    Pass
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-xs">
                Waiting for Player {displayPlayerNumber(G.board.pendingFreeAgency.playerID)} to decide...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Event Details Info Modal (opened by clicking header event name) */}
      {showEventInfoModal && G.board.activeEvent && (
        <div 
          onClick={() => setShowEventInfoModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 cursor-pointer select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl p-5 max-w-sm w-full text-center shadow-2xl space-y-4 cursor-default animate-in zoom-in-95 duration-150 text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400">
                Round {G.board.round} / 10 Event
              </span>
              <button
                type="button"
                onClick={() => setShowEventInfoModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-4xl block">📣</span>
              <h3 className="text-xl font-black text-white tracking-wide uppercase drop-shadow">
                {G.board.activeEvent.name}
              </h3>
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-xs sm:text-sm text-indigo-100 leading-relaxed font-medium">
                {G.board.activeEvent.effect || G.board.activeEvent.description}
              </div>
              {(G.board.activeEvent.category === 'overpaid' || G.board.activeEvent.name === 'New Cap Limit' || G.board.activeEvent.name === 'Overpaid') && (
                <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-300 font-bold leading-snug">
                  ⚡ All auction prospects have their Max Bid increased by +{G.board.activeEvent.maxAdd || 4} this round!
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowEventInfoModal(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Full Announcements History Modal */}
      {showAllBannerMessagesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/70 p-4 rounded-3xl max-w-sm w-full shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📜</span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Announcements History
                  </h3>
                  <span className="text-[10px] text-slate-400 block">
                    All ability & event triggers across all rounds
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllBannerMessagesModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {(() => {
                const history = G.board.abilityNotificationHistory || (G.board.abilityNotification ? [G.board.abilityNotification] : []);
                if (!history || history.length === 0) {
                  return (
                    <div className="p-6 text-center text-slate-500 text-xs italic">
                      No ability or event announcements recorded yet.
                    </div>
                  );
                }
                return history.map((item, idx) => (
                  <div 
                    key={item.id || idx} 
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{item.icon || '⚡'}</span>
                        <span className="text-[9px] uppercase tracking-wider font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-600/50 truncate">
                          {item.teamName || 'Franchise'}
                        </span>
                        {item.title && item.title !== item.teamName && (
                          <span className="text-xs font-bold text-white truncate">{item.title}</span>
                        )}
                      </div>
                      <span className="text-[9px] font-black font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-1.5 py-0.5 rounded shrink-0">
                        Round {item.round || 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed break-words">
                      {item.message}
                    </p>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-2 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowAllBannerMessagesModal(false)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-black py-2 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Puka Nacua Choice Modal */}
      {G.board.pendingPukaChoice && String(G.board.pendingPukaChoice.playerID) === String(effectivePlayerID) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-blue-500 p-4 rounded-3xl max-w-sm w-full shadow-2xl space-y-3">
            <div className="text-center">
              <span className="text-3xl block">⚡</span>
              <h3 className="text-base font-black text-white uppercase">Puka Nacua Ability</h3>
              <p className="text-xs text-slate-300">Choose 1 of the top 3 cards to take for free:</p>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-60">
              {G.board.pendingPukaChoice.options.map((card, idx) => (
                <button
                  key={card.uniqueId || idx}
                  onClick={() => moves.pukaPickCard(idx, effectivePlayerID)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl text-left flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono">{card.position}</span>
                    <h4 className="text-xs font-bold text-white">{card.name}</h4>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white font-black px-2 py-1 rounded">Draft ➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lineup Replacement Modal for Mobile (with 800ms click delay, clean layout) */}
      {isPendingReplacementForMe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-2">
          <div className="bg-slate-900 border-2 border-yellow-500 p-4 rounded-3xl max-w-md w-full shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="text-center">
              <span className="text-3xl block">🏆</span>
              <h3 className="text-lg font-black text-white uppercase">Auction Won!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Select an active player to replace with <strong className="text-yellow-300">{G.pendingReplacement.wonCard?.name}</strong>:
              </p>
            </div>

            <div className="space-y-2">
              {myPlayer.lineup.map((card, idx) => (
                <div
                  key={card.uniqueId || idx}
                  onClick={() => {
                    if (!replaceLocked) moves.replaceLineupCard(idx, effectivePlayerID);
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    replaceLocked
                      ? 'border-slate-800 opacity-60 pointer-events-none cursor-not-allowed'
                      : 'border-slate-800 hover:border-red-500 cursor-pointer bg-slate-950'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                      {card.position || 'WR'}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5 truncate">{card.name}</h4>
                  </div>
                  <button
                    disabled={replaceLocked}
                    className="bg-red-600/20 text-red-300 border border-red-500/40 text-xs font-bold px-3 py-1 rounded-lg shrink-0"
                  >
                    Replace
                  </button>
                </div>
              ))}
            </div>

            {getEffectiveTeamId(myPlayer) === 'bengals' && (
              <button
                disabled={replaceLocked}
                onClick={() => {
                  if (!replaceLocked) moves.discardWonCard(effectivePlayerID);
                }}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-xl text-xs uppercase"
              >
                🗑️ Discard Won Player
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Dock: Navigation Tabs + Bidding / Turn Stepper Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] max-w-md mx-auto shadow-2xl">
        {/* Row 1: Action Controls (if Bidding, CPU Turn, or Auction Complete) */}
        {(ctx.phase === 'auctionPhase' || ctx.phase === 'postAuctionPhase') && (
          <div className="mb-2">
            {isAuctionComplete ? (
              <button
                type="button"
                onClick={() => {
                  if (moves.proceedToRefresh) moves.proceedToRefresh();
                  else if (moves.startRefreshSequence) moves.startRefreshSequence();
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 active:scale-[0.98] text-white font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Refresh Phase 🔄</span>
              </button>
            ) : isMyBiddingTurn ? (
              /* Human Bidding Action Controls */
              <div className="flex items-center gap-1.5 justify-between">
                <button
                  onClick={() => moves.pass(effectivePlayerID)}
                  disabled={G.board.highestBidder === null && !isCommandersBlockedForBid}
                  className="px-4 py-2.5 min-w-[64px] rounded-xl text-xs font-bold bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 disabled:opacity-40 shrink-0 text-center transition-colors cursor-pointer"
                >
                  Pass
                </button>

                {/* Stepper */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shrink-0">
                  <button
                    onClick={() => setCustomBid(Math.max(nextBid, customBid - 1))}
                    className="text-base px-3 py-2 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
                  >
                    ◀
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-sm text-white">
                    {customBid}
                  </span>
                  <button
                    onClick={() => setCustomBid(Math.min(maxAllowedBid, customBid + 1))}
                    className="text-base px-3 py-2 text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
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
                  className="flex-1 py-2.5 px-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 shadow transition-colors cursor-pointer text-center truncate"
                >
                  {isSoleRemainingZeroCoins ? 'Acquire (0)' : `Bid ${customBid}`}
                </button>

                <button
                  onClick={() => moves.bid(effMaxBid, effectivePlayerID)}
                  disabled={isCommandersBlockedForBid || isDjMooreBlockedForBid || myPlayer.coins < effMaxBid || effMaxBid < nextBid}
                  className="px-3.5 py-2.5 min-w-[78px] rounded-xl text-xs font-black bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black disabled:opacity-40 shrink-0 text-center transition-colors cursor-pointer"
                >
                  Max ({effMaxBid})
                </button>
              </div>
            ) : isCpuTurn ? (
              /* CPU Turn Progression Controls - Clean full-width stepper */
              <button
                type="button"
                onClick={() => moves.stepCpuTurn()}
                className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] text-black font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Next CPU Action ➔
              </button>
            ) : null}
          </div>
        )}

        {/* Row 1: Action Controls during Refresh Phase */}
        {ctx.phase === 'refreshPhase' && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => moves.confirmRefreshSummary()}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 active:scale-[0.98] text-white font-black rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-xl border border-indigo-400/60 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Proceed to Next Round ➔</span>
            </button>
          </div>
        )}

        {/* Row 2: Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 border-t border-slate-800/80 pt-1.5">
          <button
            onClick={() => setActiveTab('auction')}
            className={`py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'auction' ? 'text-blue-400 bg-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🏈</span>
            <span className="text-[10px]">Auction</span>
          </button>

          <button
            onClick={() => setActiveTab('myRoster')}
            className={`py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'myRoster' ? 'text-indigo-400 bg-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🛡️</span>
            <span className="text-[10px]">My Team</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'teams' ? 'text-amber-400 bg-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>👥</span>
            <span className="text-[10px]">Teams</span>
          </button>

          <button
            onClick={() => setActiveTab('log')}
            className={`py-1.5 rounded-xl text-xs font-black flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'log' ? 'text-purple-400 bg-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📜</span>
            <span className="text-[10px]">Event/Log</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
