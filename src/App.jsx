import React, { useState, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { DeflategateGame } from './Game';
import { MobileDeflategateBoard } from './components/MobileDeflategateBoard';
import { DesktopDeflategateBoardArena } from './components/DesktopDeflategateBoardArena';
import { RulesModal } from './components/RulesModal';

const DeflategateBoard = (props) => {
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isMobileWidth = window.innerWidth <= 768;
    const isIPhoneOrMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    return isMobileWidth || isIPhoneOrMobile;
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobileWidth = window.innerWidth <= 768;
      const isIPhoneOrMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
      setIsMobileView(isMobileWidth || isIPhoneOrMobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobileView) {
    return <MobileDeflategateBoard {...props} onReturnHome={props.onReturnHome} />;
  }

  // Always use Arena layout on desktop
  return <DesktopDeflategateBoardArena {...props} onReturnHome={props.onReturnHome} />;
};

const DIFFICULTY_OPTIONS = [
  {
    id: 'easy',
    label: 'Easy',
    icon: '🟢',
    description: 'Relaxed pacing & conservative bids',
    borderActive: 'border-emerald-400 bg-emerald-950/60 text-emerald-200 shadow-md shadow-emerald-500/20'
  },
  {
    id: 'normal',
    label: 'Normal',
    icon: '🔵',
    description: 'Balanced strategy & standard bids (Default)',
    borderActive: 'border-blue-400 bg-blue-950/60 text-blue-200 shadow-md shadow-blue-500/20'
  },
  {
    id: 'hard',
    label: 'Hard',
    icon: '🟠',
    description: 'Aggressive nominations & roster counter-picks',
    borderActive: 'border-amber-400 bg-amber-950/60 text-amber-200 shadow-md shadow-amber-500/20'
  },
  {
    id: 'extreme',
    label: 'Extreme',
    icon: '🔴',
    description: 'Ruthless cap pressure & maximum competition',
    borderActive: 'border-red-400 bg-red-950/60 text-red-200 shadow-md shadow-red-500/20'
  }
];

const App = () => {
  const [inGame, setInGame] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Game Mode: Only 2 options ('solo_cpu' or 'with_friends')
  const [gameMode, setGameMode] = useState('solo_cpu');
  const [numPlayers, setNumPlayers] = useState(4);
  const [numHumansChoice, setNumHumansChoice] = useState(2);
  const [playerID, setPlayerID] = useState('0');
  const [matchIdChoice, setMatchIdChoice] = useState('room-1');

  // CPU Difficulty: 4 options in 1 column
  const [cpuDifficulty, setCpuDifficulty] = useState('normal');
  const [difficultyExpanded, setDifficultyExpanded] = useState(true);

  // AI Bidding Engine: 'v2' (Market Engine) or 'v1' (Classic)
  const [aiEngine, setAiEngine] = useState('v2');

  // Calculate actual humans & CPU counts
  let actualNumHumans = 1;
  if (gameMode === 'solo_cpu') {
    actualNumHumans = 1;
  } else {
    // In "Play with Friends", defaults to 2, can range from 1 to numPlayers
    actualNumHumans = Math.max(1, Math.min(numPlayers, numHumansChoice));
  }
  const cpuOpponentsCount = Math.max(0, numPlayers - actualNumHumans);

  // Keep playerID within bounds of available human slots
  useEffect(() => {
    if (parseInt(playerID, 10) >= actualNumHumans) {
      setPlayerID('0');
    }
  }, [actualNumHumans, playerID]);

  const DeflategateClient = React.useMemo(() => {
    const config = {
      game: DeflategateGame,
      board: DeflategateBoard,
      numPlayers: numPlayers,
      debug: false,
      setupData: { 
        numHumans: actualNumHumans,
        cpuDifficulty: cpuDifficulty,
        aiEngine: aiEngine,
        forceTeam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('team') : null
      }
    };

    if (gameMode === 'with_friends') {
      let serverUrl;
      if (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' || 
        window.location.port === '3000' || 
        window.location.port === '5173'
      ) {
        serverUrl = `http://${window.location.hostname || 'localhost'}:8000`;
      } else {
        serverUrl = window.location.origin;
      }
      config.multiplayer = SocketIO({ server: serverUrl });
    }

    return Client(config);
  }, [numPlayers, gameMode, actualNumHumans, cpuDifficulty, aiEngine]);

  if (!inGame) {
    const selectedDiffObj = DIFFICULTY_OPTIONS.find(d => d.id === cpuDifficulty) || DIFFICULTY_OPTIONS[1];

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-3 sm:p-6 font-body">
        <div className="bg-slate-900 p-5 sm:p-8 rounded-3xl border-2 border-slate-800 max-w-lg w-full text-center shadow-2xl space-y-4">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 tracking-wide uppercase px-1">
              DEFLATEGATE
            </h1>
            <p className="text-slate-400 mt-0.5 italic text-xs sm:text-sm">
              The Ultimate NFL Auction & Strategy Game
            </p>
          </div>

          {/* Mode Selector - Exactly 2 Options */}
          <div className="text-left">
            <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
              Select Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-wider">
              <button 
                type="button"
                id="btn-mode-solo-cpu"
                onClick={() => setGameMode('solo_cpu')}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border flex flex-col items-center justify-center gap-1 ${
                  gameMode === 'solo_cpu' 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">🤖</span>
                  <span className="font-black text-xs sm:text-sm tracking-wide">vs CPU (Solo)</span>
                </div>
                <span className="text-[10px] font-sans font-medium opacity-75 normal-case tracking-normal">
                  Play solo against bots
                </span>
              </button>

              <button 
                type="button"
                id="btn-mode-with-friends"
                onClick={() => {
                  setGameMode('with_friends');
                  if (numHumansChoice < 2) setNumHumansChoice(2);
                }}
                className={`py-3 px-2 rounded-xl transition-all text-center cursor-pointer border flex flex-col items-center justify-center gap-1 ${
                  gameMode === 'with_friends' 
                    ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/30' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">👥</span>
                  <span className="font-black text-xs sm:text-sm tracking-wide">Play with Friends</span>
                </div>
                <span className="text-[10px] font-sans font-medium opacity-75 normal-case tracking-normal">
                  Unjoined spots fill with CPU
                </span>
              </button>
            </div>
          </div>

          {/* If Play with Friends is selected: Room / Match ID */}
          {gameMode === 'with_friends' && (
            <div className="bg-purple-950/30 border border-purple-500/40 p-3.5 rounded-2xl text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-purple-300 flex items-center gap-1.5 font-sans">
                  <span>🌐</span> Room / Match ID
                </span>
                <span className="text-[10px] text-slate-400">Match room on friend devices</span>
              </div>
              <input 
                type="text"
                id="input-room-id"
                value={matchIdChoice}
                onChange={e => setMatchIdChoice(e.target.value || 'room-1')}
                placeholder="e.g. room-1"
                className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-3.5 py-2 text-white font-mono font-bold text-sm outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          )}

          {/* Steppers & View Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Total Teams (4-10) */}
            <div>
              <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
                Total Teams (4-10)
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-inner">
                <button
                  type="button"
                  id="btn-decrease-teams"
                  onClick={() => {
                    const next = Math.max(4, numPlayers - 1);
                    setNumPlayers(next);
                    if (numHumansChoice > next) setNumHumansChoice(next);
                  }}
                  disabled={numPlayers <= 4}
                  className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black text-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow"
                  title="Decrease teams"
                >
                  −
                </button>
                <div className="flex-1 text-center font-black text-xl text-white font-mono select-none">
                  {numPlayers} <span className="text-xs text-slate-400 font-sans font-medium">Teams</span>
                </div>
                <button
                  type="button"
                  id="btn-increase-teams"
                  onClick={() => {
                    const next = Math.min(10, numPlayers + 1);
                    setNumPlayers(next);
                  }}
                  disabled={numPlayers >= 10}
                  className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black text-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow"
                  title="Increase teams"
                >
                  +
                </button>
              </div>
            </div>

            {/* Human Players count (only shown if Play with Friends) */}
            {gameMode === 'with_friends' ? (
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
                  Human Players (1 to {numPlayers})
                </label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 shadow-inner">
                  <button
                    type="button"
                    id="btn-decrease-humans"
                    onClick={() => setNumHumansChoice(Math.max(1, actualNumHumans - 1))}
                    disabled={actualNumHumans <= 1}
                    className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black text-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow"
                    title="Decrease human players"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center font-black text-xl text-white font-mono select-none">
                    {actualNumHumans} <span className="text-xs text-slate-400 font-sans font-medium">Humans</span>
                  </div>
                  <button
                    type="button"
                    id="btn-increase-humans"
                    onClick={() => setNumHumansChoice(Math.min(numPlayers, actualNumHumans + 1))}
                    disabled={actualNumHumans >= numPlayers}
                    className="w-10 h-10 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-25 disabled:cursor-not-allowed text-white font-black text-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow"
                    title="Increase human players"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
                  Default View As
                </label>
                <div className="h-[52px] bg-slate-950 border border-slate-800 rounded-xl px-4 flex items-center text-white font-bold text-base font-mono">
                  Player 1 <span className="ml-2 text-xs text-blue-400 font-sans font-medium">(You)</span>
                </div>
              </div>
            )}

            {/* Play on this device as (for multi-human with_friends mode) */}
            {gameMode === 'with_friends' && actualNumHumans > 1 && (
              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[10px] tracking-wider font-sans">
                  Play On This Device As
                </label>
                <select 
                  id="select-player-device"
                  value={playerID} 
                  onChange={e => setPlayerID(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-bold text-base outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  {[...Array(actualNumHumans)].map((_, i) => (
                    <option key={i} value={i.toString()}>
                      Player {i + 1} {i === 0 ? '(Host)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* CPU Difficulty Selector - Button with 4 options in 1 column */}
          <div className="text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <button
              type="button"
              id="btn-toggle-difficulty"
              onClick={() => setDifficultyExpanded(prev => !prev)}
              className="w-full flex items-center justify-between cursor-pointer group text-left"
              title="Click to expand/collapse difficulty options"
            >
              <div className="flex items-center gap-2">
                <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider font-sans cursor-pointer flex items-center gap-1.5">
                  <span>⚙️</span> CPU Difficulty
                </label>
                <span className="text-[10px] font-sans text-slate-500">
                  (4 options)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-750 text-blue-300 flex items-center gap-1.5 shadow-sm">
                  <span>{selectedDiffObj.icon}</span>
                  <span>{selectedDiffObj.label}</span>
                </span>
                <span className={`text-slate-400 text-xs transition-transform duration-200 ${difficultyExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {/* 4 Options in 1 Column */}
            {difficultyExpanded && (
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {DIFFICULTY_OPTIONS.map((opt) => {
                  const isSelected = cpuDifficulty === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`btn-diff-${opt.id}`}
                      onClick={() => setCpuDifficulty(opt.id)}
                      className={`w-full py-2 px-3 rounded-xl transition-all cursor-pointer border flex items-center justify-between text-left ${
                        isSelected 
                          ? opt.borderActive
                          : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm select-none">{opt.icon}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black text-xs uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {opt.label}
                            </span>
                            {opt.id === 'normal' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80 text-blue-300 font-sans uppercase font-semibold">
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-sans font-normal opacity-70 block -mt-0.5">
                            {opt.description}
                          </span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-xs font-black text-emerald-400">● Active</span>
                      ) : (
                        <span className="text-[10px] text-slate-600 font-medium">Select</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Bidding Engine Selector */}
          <div className="text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider font-sans flex items-center gap-1.5">
                <span>🧠</span> AI Bidding Model
              </label>
              <span className="text-[10px] font-sans text-indigo-400 font-bold">
                {aiEngine === 'v2' ? 'Market Engine (V2 Default)' : 'Classic (V1)'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                id="btn-ai-engine-v1"
                onClick={() => setAiEngine('v1')}
                className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer border text-left flex flex-col justify-between ${
                  aiEngine === 'v1'
                    ? 'border-blue-400 bg-blue-950/60 text-blue-200 shadow-md shadow-blue-500/20'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs">Classic (V1)</span>
                  {aiEngine === 'v1' && <span className="text-[10px] text-emerald-400 font-black">● Active</span>}
                </div>
                <span className="text-[9px] text-slate-400 leading-tight mt-1 font-sans">
                  Rule-based legacy logic
                </span>
              </button>
              <button
                type="button"
                id="btn-ai-engine-v2"
                onClick={() => setAiEngine('v2')}
                className={`py-2 px-2.5 rounded-xl transition-all cursor-pointer border text-left flex flex-col justify-between ${
                  aiEngine === 'v2'
                    ? 'border-purple-400 bg-purple-950/60 text-purple-200 shadow-md shadow-purple-500/20'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs flex items-center gap-1">
                    Market (V2) <span className="px-1 py-0.2 text-[8px] bg-purple-900 text-purple-300 rounded font-black">BETA</span>
                  </span>
                  {aiEngine === 'v2' && <span className="text-[10px] text-emerald-400 font-black">● Active</span>}
                </div>
                <span className="text-[9px] text-slate-400 leading-tight mt-1 font-sans">
                  Opportunity cost & dynamic row valuation
                </span>
              </button>
            </div>
          </div>

          {/* Roster & Auto-Fill Summary Card */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 text-xs text-slate-400 text-left space-y-1.5">
            <div className="flex justify-between font-mono">
              <span className="flex items-center gap-1.5">
                <span>👤</span> Human Players:
              </span>
              <span className="text-emerald-400 font-bold">{actualNumHumans}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="flex items-center gap-1.5">
                <span>🤖</span> CPU Opponents:
              </span>
              <span className="text-yellow-400 font-bold">{cpuOpponentsCount}</span>
            </div>

            {gameMode === 'with_friends' && cpuOpponentsCount > 0 && (
              <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-indigo-300/90 flex items-start gap-1.5 font-sans leading-tight">
                <span className="text-xs">⚡</span>
                <span>
                  <strong>Auto-fill active:</strong> All {cpuOpponentsCount} remaining unfilled spot{cpuOpponentsCount > 1 ? 's' : ''} will automatically be played by CPU opponents!
                </span>
              </div>
            )}
          </div>

          {/* How to Play Button - OUTLINED IN UNC CHARLOTTE / CAROLINA BLUE (#4B9CD3) */}
          <button 
            type="button"
            id="btn-how-to-play"
            onClick={() => setShowRules(true)}
            className="w-full bg-[#4B9CD3]/10 hover:bg-[#4B9CD3]/20 border-2 border-[#4B9CD3] hover:border-[#7BAFD4] text-[#93c5fd] hover:text-white font-bold text-xs py-3 rounded-2xl shadow-lg shadow-[#4B9CD3]/15 hover:shadow-[#4B9CD3]/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span className="text-base">📖</span>
            <span className="tracking-wide">How to Play & Rules Guide</span>
          </button>

          {/* Start Game Button */}
          <button 
            type="button"
            id="btn-start-game"
            onClick={() => setInGame(true)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-lg py-3.5 sm:py-4 rounded-2xl shadow-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] cursor-pointer tracking-wider"
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
      playMode={gameMode === 'with_friends' ? 'online' : 'local_vs_cpu'}
      numHumans={actualNumHumans}
      cpuDifficulty={cpuDifficulty}
      onReturnHome={() => setInGame(false)}
      setupData={{ 
        numHumans: actualNumHumans,
        cpuDifficulty: cpuDifficulty,
        aiEngine: aiEngine,
        forceTitans: typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('team') === 'titans'
      }}
    />
  );
};

export default App;
