import React, { useRef } from 'react';
import { getEffectiveCardMaxBid } from '../Game.js';

export const renderCardEffectsHelper = (effects, specialText) => {
  return (
    <div className="space-y-1 my-1">
      {effects && Array.isArray(effects) && effects.map((eff, i) => {
        const symbolElement = eff.perRound ? (
          <span 
            title="Every Round: Triggers every round in Refresh Phase" 
            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 text-[9px] font-black uppercase tracking-wider shadow-sm select-none"
          >
            <svg className="w-2.5 h-2.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            <span>TURN</span>
          </span>
        ) : (
          <span 
            title="Instant Effect: Triggers immediately when bought" 
            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-950/90 border border-amber-500/70 text-amber-300 text-[9px] font-black uppercase tracking-wider shadow-sm select-none"
          >
            <svg className="w-2 h-2 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>INSTANT</span>
          </span>
        );

        if (eff.type === 'coins') {
          const isPositive = eff.amount > 0;
          return (
            <span key={i} className={`text-xs flex items-center gap-1.5 font-black font-mono leading-tight ${isPositive ? 'text-yellow-300' : 'text-orange-400'}`}>
              <span>🪙 {isPositive ? `+${eff.amount}` : eff.amount} Coins</span>
              {symbolElement}
            </span>
          );
        } else if (eff.type === 'deflate') {
          return (
            <span key={i} className="text-xs flex items-center gap-1.5 font-black font-mono text-emerald-300 leading-tight">
              <span>🏈 -{eff.amount} PSI</span>
              {symbolElement}
            </span>
          );
        } else if (eff.type === 'inflate') {
          return (
            <span key={i} className="text-xs flex items-center gap-1.5 font-black font-mono text-red-400 leading-tight">
              <span>🏈🔺 +{eff.amount} PSI</span>
              {symbolElement}
            </span>
          );
        }
        return null;
      })}
      {specialText && (
        <span className="text-[11px] block font-bold text-amber-200 bg-amber-950/85 border border-amber-500/80 rounded px-2 py-1 mt-1 leading-snug text-left shadow-md">
          ✨ {specialText}
        </span>
      )}
    </div>
  );
};

export const renderPhaseBadgeHelper = (phase) => {
  if (phase === 'hof') return <span className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow">⭐ HOF</span>;
  if (phase === 2) return <span className="bg-purple-900/90 border border-purple-400 text-purple-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">PHASE 2</span>;
  if (phase === 1) return <span className="bg-blue-900/90 border border-blue-400 text-blue-200 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">PHASE 1</span>;
  return <span className="bg-slate-800 text-slate-400 font-bold text-[10px] px-2 py-0.5 rounded uppercase">PRACTICE SQUAD</span>;
};

export const getCardPhaseStyleHelper = (card) => {
  if (!card) return 'border-slate-800 bg-slate-900';
  if (card.phase === 'hof') return 'border-amber-400 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
  if (card.phase === 2) return 'border-purple-500 bg-gradient-to-b from-purple-950/40 to-slate-900 shadow-[0_0_12px_rgba(168,85,247,0.2)]';
  if (card.phase === 1) return 'border-blue-500 bg-gradient-to-b from-blue-950/30 to-slate-900 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
  return 'border-slate-800 bg-slate-950';
};

export const TeamDetailModal = ({ teamPlayerId, G, onClose, onSelectTeamPlayerId, onInspectCard }) => {
  if (teamPlayerId === null || teamPlayerId === undefined) return null;
  const player = G.players[String(teamPlayerId)];
  if (!player || !player.team) return null;

  const displayId = parseInt(teamPlayerId) + 1;
  const team = player.team;
  const isCpu = Boolean(player.isCpu);
  const psiVal = typeof player.psi === 'number' ? player.psi.toFixed(1) : player.psi;

  const allTeamPlayerIds = Object.keys(G.players).filter(id => G.players[id]?.team);
  const currentIndex = allTeamPlayerIds.indexOf(String(teamPlayerId));
  const hasMultipleTeams = allTeamPlayerIds.length > 1;

  const handlePrevTeam = () => {
    if (!hasMultipleTeams || !onSelectTeamPlayerId) return;
    const prevIdx = (currentIndex - 1 + allTeamPlayerIds.length) % allTeamPlayerIds.length;
    onSelectTeamPlayerId(allTeamPlayerIds[prevIdx]);
  };

  const handleNextTeam = () => {
    if (!hasMultipleTeams || !onSelectTeamPlayerId) return;
    const nextIdx = (currentIndex + 1) % allTeamPlayerIds.length;
    onSelectTeamPlayerId(allTeamPlayerIds[nextIdx]);
  };

  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNextTeam();
      } else {
        handlePrevTeam();
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white select-none"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-base shadow-inner shrink-0">
              🏈
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white truncate drop-shadow">
                  {team.name}
                </h3>
                {hasMultipleTeams && (
                  <span className="font-mono text-slate-300 bg-slate-950/80 border border-slate-700/80 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                    {currentIndex + 1} / {allTeamPlayerIds.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 -mt-0.5">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Player {displayId} • {isCpu ? 'CPU' : 'Human'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-black transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {/* Key Vitals Grid - Condensed Single-Row Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Deflation</span>
              <span className="text-sm font-black font-mono text-emerald-400">🏈 {psiVal} PSI</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Coins</span>
              <span className="text-sm font-black font-mono text-yellow-400">🪙 {player.coins}</span>
            </div>
          </div>

          {/* Franchise Ability Card - Condensed */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-950 to-amber-950/30 border border-amber-500/35 px-3 py-2 rounded-xl text-xs shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">
              <span>⭐</span>
              <span>Power: {team.name}</span>
            </div>
            <p className="text-[11px] text-slate-200 leading-snug font-medium">
              {team.ability}
            </p>
            {player.copiedTeam && (
              <div className="mt-1 pt-1 border-t border-amber-500/20 text-[10px] text-cyan-300 font-bold">
                🏴‍☠️ Copied: <span className="text-white">{player.copiedTeam.name}</span> — {player.copiedTeam.ability}
              </div>
            )}
          </div>

          {/* Active Lineup Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Active Lineup</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {(player.lineup || []).length} Active
                </span>
              </h4>
              <span className="text-[10px] text-indigo-400 font-bold">Tap card to inspect</span>
            </div>

            {(!player.lineup || player.lineup.length === 0) ? (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-slate-500 text-xs italic">
                No active players in lineup yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {player.lineup.map((card, cidx) => {
                  const isBroncosIgnored = team.id === 'broncos' && card.broncosRoundAcquired === G.board.round;
                  const hasRamsMultiplier = Boolean(card.ramsMultiplier);
                  const effMax = getEffectiveCardMaxBid ? getEffectiveCardMaxBid(card, G.board.activeEvent) : (card.maxBid || 8);

                  return (
                    <div 
                      key={card.uniqueId || cidx} 
                      onClick={() => onInspectCard && onInspectCard(card, player.lineup)}
                      className={`p-2.5 rounded-xl border-2 flex flex-col justify-between text-left transition-all relative cursor-pointer hover:border-indigo-400 active:scale-[0.98] ${
                        isBroncosIgnored
                          ? 'border-red-500 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                          : getCardPhaseStyleHelper(card)
                      }`}
                      title="Tap to inspect player"
                    >
                      {/* Rams 2x badge if attached */}
                      {hasRamsMultiplier && (
                        <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-yellow-200 uppercase tracking-wider animate-bounce">
                          ✨ 2x MULTIPLIER
                        </div>
                      )}

                      {/* Broncos Ignored badge */}
                      {isBroncosIgnored && (
                        <div className="absolute -top-2.5 -left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow border border-red-300 uppercase tracking-wider">
                          🚫 Ignored (1st Round)
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-0.5 text-[10px]">
                          <span className="bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black px-1.5 py-0.2 rounded uppercase">
                            {card.position || 'WR'}
                          </span>
                          <div className="flex items-center gap-1">
                            {renderPhaseBadgeHelper(card.phase)}
                          </div>
                        </div>

                        <h5 className="font-extrabold text-white text-xs sm:text-sm leading-snug truncate">
                          {card.name}
                        </h5>

                        <div className="mt-1 text-xs">
                          {renderCardEffectsHelper(card.effects, card.specialText || card.customText)}
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Min: {card.minBid || 1} Coins</span>
                        <span>Max: {effMax} Coins</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Swipe / Prev-Next Controls */}
        <div className="bg-slate-950 px-3 py-2 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {hasMultipleTeams ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevTeam}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Previous Team"
              >
                ◀ Prev Team
              </button>
              <button
                type="button"
                onClick={handleNextTeam}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Next Team"
              >
                Next Team ▶
              </button>
            </div>
          ) : <div />}

          <button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
