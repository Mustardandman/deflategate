import React from 'react';

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

export const TeamDetailModal = ({ teamPlayerId, G, onClose }) => {
  if (teamPlayerId === null || teamPlayerId === undefined) return null;
  const player = G.players[String(teamPlayerId)];
  if (!player || !player.team) return null;

  const displayId = parseInt(teamPlayerId) + 1;
  const team = player.team;
  const isCpu = Boolean(player.isCpu);
  const psiVal = typeof player.psi === 'number' ? player.psi.toFixed(1) : player.psi;

  // Calculate passive income & deflation from active lineup
  let totalCoinsPerRound = 0;
  let totalDeflatePerRound = 0;
  (player.lineup || []).forEach(c => {
    if (!c.effects) return;
    c.effects.forEach(eff => {
      if (eff.perRound) {
        if (eff.type === 'coins') totalCoinsPerRound += eff.amount;
        if (eff.type === 'deflate') totalDeflatePerRound += eff.amount;
      }
    });
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border-2 border-indigo-500/80 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🏈
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white truncate drop-shadow">
                  {team.name}
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isCpu 
                    ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                }`}>
                  Player {displayId} • {isCpu ? 'CPU' : 'Human'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Full Roster & Franchise Overview</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-black transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Key Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-0.5">Deflation</span>
              <span className="text-xl font-black font-mono text-emerald-400">{psiVal}</span>
              <span className="text-[10px] text-slate-500 font-mono block">Target: 0 PSI</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-0.5">Coins</span>
              <span className="text-xl font-black font-mono text-yellow-400">🪙 {player.coins}</span>
              <span className="text-[10px] text-slate-500 font-mono block">Initial: {team.coins}</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-0.5">Per-Round Gain</span>
              <span className="text-base font-black font-mono text-yellow-300">+{totalCoinsPerRound} 🪙</span>
              <span className="text-base font-black font-mono text-emerald-400 ml-1">-{totalDeflatePerRound} 🏈</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-0.5">Lineup</span>
              <span className="text-xl font-black font-mono text-blue-400">
                {(player.lineup || []).length} / {(team.id === 'colts' ? '∞' : (team.id === 'seahawks' ? 4 : 3) + (player.extraLineupSlots || 0))}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">Slots</span>
            </div>
          </div>

          {/* Franchise Ability Card */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/40 border border-amber-500/40 p-4 rounded-2xl space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-300">
                Franchise Power: {team.name}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {team.ability}
            </p>
            {player.copiedTeam && (
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-cyan-300 font-bold">
                🏴‍☠️ Buccaneers Copied: <span className="text-white">{player.copiedTeam.name}</span> — {player.copiedTeam.ability}
              </div>
            )}
          </div>

          {/* Active Lineup Cards */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Active Lineup</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  {(player.lineup || []).length} Active
                </span>
              </h4>
              <span className="text-[11px] text-slate-400 italic">🔄 = Per Round Effect</span>
            </div>

            {(!player.lineup || player.lineup.length === 0) ? (
              <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs italic">
                No active players in lineup yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {player.lineup.map((card, cidx) => {
                  const isBroncosIgnored = team.id === 'broncos' && card.broncosRoundAcquired === G.board.round;
                  const hasRamsMultiplier = Boolean(card.ramsMultiplier);

                  return (
                    <div 
                      key={card.uniqueId || cidx} 
                      className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between text-left transition-all relative ${
                        isBroncosIgnored
                          ? 'border-red-500 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                          : getCardPhaseStyleHelper(card)
                      }`}
                    >
                      {/* Rams 2x badge if attached */}
                      {hasRamsMultiplier && (
                        <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-yellow-200 uppercase tracking-wider animate-bounce">
                          ✨ 2x MULTIPLIER
                        </div>
                      )}

                      {/* Broncos Ignored badge */}
                      {isBroncosIgnored && (
                        <div className="absolute -top-2.5 -left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow border border-red-300 uppercase tracking-wider">
                          🚫 Ignored (1st Round)
                        </div>
                      )}

                      <div>
                        <div className="flex justify-between items-center mb-1 text-[11px]">
                          <span className="bg-slate-900 border border-slate-700 text-cyan-400 font-mono font-black px-2 py-0.5 rounded uppercase">
                            {card.position || 'WR'}
                          </span>
                          <div className="flex items-center gap-1">
                            {renderPhaseBadgeHelper(card.phase)}
                          </div>
                        </div>

                        <h5 className="font-extrabold text-white text-sm sm:text-base mt-1 leading-snug">
                          {card.name}
                        </h5>

                        <div className="mt-2 text-xs">
                          {renderCardEffectsHelper(card.effects, card.specialText || card.customText)}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Min: {card.minBid || 1} Coins</span>
                        <span>Max: {card.maxBid || 8} Coins</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 text-right shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
