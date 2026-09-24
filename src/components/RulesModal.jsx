import React, { useState, useEffect, useRef } from 'react';

// Comprehensive Deflategate Rules & Guide Modal
export const RulesModal = ({ isOpen, onClose }) => {
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
                  Better player cards will be shuffled into the player deck throughout the game.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-slate-950 border border-blue-500/50 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-blue-400 uppercase">Phase 1</h4>
                    <span className="bg-blue-900/80 text-blue-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-blue-600">Beginning of the game</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Budget-friendly starters, steady baseline coin generators, and consistent single-point deflators. Essential for building your early economic engine.
                  </p>
                </div>

                <div className="bg-slate-950 border border-purple-500/50 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-purple-400 uppercase">Phase 2</h4>
                    <span className="bg-purple-900/80 text-purple-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-purple-600">Enters round 4</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pro-bowl caliber stars with multi-point deflation swings, heavy instant burst rewards, and advanced roster synergies.
                  </p>
                </div>

                <div className="bg-slate-950 border border-amber-500/60 p-4 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-amber-300 uppercase">Hall of Fame</h4>
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">Enters round 7</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    All-time NFL greats and legendary franchise icons! Massive game-defining abilities capable of double-digit deflation, opponent disruption, and championship clinch moves.
                  </p>
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

// Animated slot-machine style counter for instant Coins and PSI updates
export const RollingSlotCounter = ({ value, isPsi = false, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(false);
  const [diffBadge, setDiffBadge] = useState(null);
  const prevValRef = useRef(value);

  useEffect(() => {
    const prev = prevValRef.current;
    if (prev !== value) {
      const diff = value - prev;
      prevValRef.current = value;
      setDiffBadge(diff);
      setAnimating(true);

      const steps = 6;
      const stepDuration = 40;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayValue(value);
          setAnimating(false);
          clearInterval(interval);
        } else {
          const progress = currentStep / steps;
          const interpolated = prev + diff * progress;
          setDisplayValue(isPsi ? Math.round(interpolated * 10) / 10 : Math.round(interpolated));
        }
      }, stepDuration);

      const badgeTimer = setTimeout(() => {
        setDiffBadge(null);
      }, 1800);

      return () => {
        clearInterval(interval);
        clearTimeout(badgeTimer);
      };
    }
  }, [value, isPsi]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <span className={`${className} ${animating ? 'scale-105 font-mono tracking-wider' : 'font-mono'} transition-transform`}>
        {isPsi ? (typeof displayValue === 'number' ? displayValue.toFixed(1) : displayValue) : Math.round(displayValue)}
      </span>
      {diffBadge !== null && (
        <span
          className={`absolute -top-3.5 right-0 text-[10px] font-black font-mono px-1 py-0.2 rounded-full animate-bounce ${
            diffBadge > 0
              ? (isPsi ? 'bg-red-900 text-red-300 border border-red-700' : 'bg-yellow-900 text-yellow-300 border border-yellow-700')
              : (isPsi ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-300 border border-slate-700')
          }`}
        >
          {diffBadge > 0 ? `+${isPsi ? diffBadge.toFixed(1) : diffBadge}` : `${isPsi ? diffBadge.toFixed(1) : diffBadge}`}
        </span>
      )}
    </div>
  );
};
