import React, { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local, SocketIO } from 'boardgame.io/multiplayer';
import { DeflategateGame } from './Game';
import { TEAMS } from './GameData';
import { MobileDeflategateBoard } from './components/MobileDeflategateBoard';
import { DesktopDeflategateBoardClassic } from './components/DesktopDeflategateBoardClassic';
import { DesktopDeflategateBoardArena } from './components/DesktopDeflategateBoardArena';
import { RulesModal } from './components/RulesModal';

const DeflategateBoard = (props) => {
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isMobileWidth = window.innerWidth <= 768;
    const isIPhoneOrMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    return isMobileWidth || isIPhoneOrMobile;
  });

  const [desktopUiMode, setDesktopUiMode] = useState(() => {
    if (typeof window === 'undefined') return 'arena';
    return localStorage.getItem('deflategate_desktop_ui') || 'arena';
  });

  const toggleDesktopUi = () => {
    setDesktopUiMode(prev => {
      const next = prev === 'arena' ? 'classic' : 'arena';
      try {
        localStorage.setItem('deflategate_desktop_ui', next);
      } catch (e) {}
      return next;
    });
  };

  if (isMobileView) {
    return <MobileDeflategateBoard {...props} setIsMobile={setIsMobileView} />;
  }

  if (desktopUiMode === 'classic') {
    return (
      <DesktopDeflategateBoardClassic 
        {...props} 
        setIsMobile={setIsMobileView} 
        toggleDesktopUi={toggleDesktopUi} 
      />
    );
  }

  return (
    <DesktopDeflategateBoardArena 
      {...props} 
      setIsMobile={setIsMobileView} 
      toggleDesktopUi={toggleDesktopUi} 
    />
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
  const [desktopUiChoice, setDesktopUiChoice] = useState(() => {
    if (typeof window === 'undefined') return 'arena';
    return localStorage.getItem('deflategate_desktop_ui') || 'arena';
  });

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
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 font-body">
        <div className="bg-slate-900 p-8 sm:p-10 rounded-3xl border-2 border-slate-800 max-w-lg w-full text-center shadow-2xl space-y-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-wide uppercase px-1">
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

          {/* Desktop UI Style Choice */}
          <div className="text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-400 font-bold uppercase text-[10px] tracking-wider font-sans">
                Desktop Layout
              </label>
              <span className="text-[10px] text-slate-500">Switchable anytime</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wider">
              <button
                type="button"
                onClick={() => {
                  setDesktopUiChoice('arena');
                  localStorage.setItem('deflategate_desktop_ui', 'arena');
                }}
                className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  desktopUiChoice === 'arena'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🏟️ Arena (New)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesktopUiChoice('classic');
                  localStorage.setItem('deflategate_desktop_ui', 'classic');
                }}
                className={`py-2 px-2 rounded-xl transition-all text-center cursor-pointer border ${
                  desktopUiChoice === 'classic'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                🎮 Classic
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
