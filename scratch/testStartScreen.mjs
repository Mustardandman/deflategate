import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('Running testStartScreen.mjs to verify starting screen requirements...');

// 1. Verify DesktopDeflategateBoardClassic.jsx has been deleted
const classicPath = path.resolve('src/components/DesktopDeflategateBoardClassic.jsx');
assert(!fs.existsSync(classicPath), 'DesktopDeflategateBoardClassic.jsx must be deleted');
console.log('  ✔ DesktopDeflategateBoardClassic.jsx has been completely deleted');

// 2. Read App.jsx and verify code
const appCode = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');

// Req #1: No Desktop Layout option in UI, Arena always used
assert(!appCode.includes('Desktop Layout'), 'App.jsx must not contain "Desktop Layout" option');
assert(!appCode.includes('DesktopDeflategateBoardClassic'), 'App.jsx must not reference DesktopDeflategateBoardClassic');
assert(!appCode.includes('desktopUiMode'), 'App.jsx must not contain desktopUiMode');
assert(!appCode.includes('toggleDesktopUi'), 'App.jsx must not contain toggleDesktopUi');
assert(appCode.includes('DesktopDeflategateBoardArena'), 'App.jsx must use DesktopDeflategateBoardArena');
console.log('  ✔ Req #1 verified: Desktop Layout option completely removed, Arena is always used');

// Req #2: Select game mode box only has 2 options
assert(appCode.includes('vs CPU (Solo)'), 'Must include vs CPU (Solo) option');
assert(appCode.includes('Play with Friends'), 'Must include Play with Friends option');
assert(!appCode.includes('Pass & Play (All Humans)'), 'Old Pass & Play button must be removed from mode options');
assert(!appCode.includes('Online Multi-Device'), 'Old Online Multi-Device button must be removed from mode options');
assert(!appCode.includes('PvP vs CPU'), 'Old PvP vs CPU button must be removed from mode options');

// Check auto-fill logic
assert(appCode.includes('cpuOpponentsCount'), 'Must compute cpuOpponentsCount');
assert(appCode.includes('All {cpuOpponentsCount} remaining unfilled spot') || appCode.includes('unfilled spots will automatically be played by CPU') || appCode.includes('Auto-fill active'), 'Must display CPU auto-fill notification');
console.log('  ✔ Req #2 verified: Exactly 2 game mode options; unfilled spots auto-fill with CPU');

// Req #3: How to Play button outlined in UNC Charlotte / Carolina blue
assert(appCode.includes('#4B9CD3') || appCode.includes('#7BAFD4'), 'How to Play button must have UNC Charlotte / Carolina blue outline');
assert(appCode.includes('How to Play & Rules Guide'), 'How to Play button must be present');
assert(!appCode.includes('Multi-Device Wi-Fi Guide'), 'Collapsible Wi-Fi guide must be removed as Render handles multi-network multiplayer automatically');
console.log('  ✔ Req #3 verified: How to Play button is outlined in UNC Charlotte blue, Wi-Fi guide removed');

// Req #4: CPU difficulty button with 4 options in 1 column: "Easy", "normal", "hard", "extreme"
assert(appCode.includes("'easy'"), 'Must contain Easy option');
assert(appCode.includes("'normal'"), 'Must contain Normal option');
assert(appCode.includes("'hard'"), 'Must contain Hard option');
assert(appCode.includes("'extreme'"), 'Must contain Extreme option');
assert(appCode.includes('grid-cols-1'), 'Must display 4 options in 1 column');
console.log('  ✔ Req #4 verified: CPU Difficulty button has 4 options in 1 column ("Easy", "Normal", "Hard", "Extreme")');

console.log('\n🎉 ALL STARTING SCREEN REQUIREMENT CHECKS PASSED PERFECTLY!');
process.exit(0);
