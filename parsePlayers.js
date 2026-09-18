import fs from 'fs';

const text = fs.readFileSync('./src/GameRules.js', 'utf8');

const parsePlayer = (line) => {
  // e.g. "Juju Smith-Schuster - 2P coins (12) Max: 6"
  // e.g. "Michael Thomas - 2P coins (12) Max: 5"
  // e.g. "Chuba Hubbard - 2 deflate Max: 3"
  // e.g. "Josh Allen - 2P deflate, 4 coins Max: 11"
  
  if (!line.includes('-') || !line.includes('Max:')) return null;

  const parts = line.split('Max:');
  const maxBid = parseInt(parts[1].trim());
  
  const left = parts[0].trim(); // "Juju Smith-Schuster - 2P coins (12)"
  const firstDash = left.indexOf('-');
  const name = left.substring(0, firstDash).trim();
  const effectsStr = left.substring(firstDash + 1).trim();

  // Effects parsing
  // split by comma if multiple effects
  const effectStrings = effectsStr.split(',');
  const effects = effectStrings.map(es => {
    let s = es.trim();
    // remove parentheses stuff for now like "(12)" or "(If you paid...)"
    s = s.replace(/\(.*?\)/g, '').trim();

    let isPerRound = false;
    if (s.includes('P')) {
      isPerRound = true;
      s = s.replace('P', '');
    }

    // e.g. "2 coins", "-2 coins", "2 deflate", "4 inflate"
    const match = s.match(/(-?\d+)\s*([a-zA-Z]+)/);
    if (match) {
      return {
        amount: parseInt(match[1]),
        type: match[2].toLowerCase(), // 'coins', 'deflate', 'inflate'
        perRound: isPerRound
      };
    } else {
      // It might be a custom string effect like "Steal 1 coin..."
      return {
        type: 'custom',
        description: s,
        perRound: isPerRound
      };
    }
  });

  return {
    id: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''),
    name,
    maxBid,
    effects
  };
};

// Extremely rudimentary extraction
const lines = text.split('\n').map(l => l.trim());

let currentPhase = null;
const p1 = [];
const p2 = [];
const hof = [];

for (const line of lines) {
  if (line.includes('Phase 1 - 45')) { currentPhase = 1; continue; }
  if (line.includes('Phase 2 - 46')) { currentPhase = 2; continue; }
  if (line.includes('Hall of Famers - 10')) { currentPhase = 'hof'; continue; }
  if (line.includes('91 total')) { currentPhase = null; continue; }

  if (currentPhase === 1) {
    const p = parsePlayer(line);
    if (p) { p.minBid = 1; p1.push(p); }
  } else if (currentPhase === 2) {
    const p = parsePlayer(line);
    if (p) { p.minBid = 2; p2.push(p); }
  } else if (currentPhase === 'hof') {
    // HoF line format is different: "Tom Brady - 10 D"
    if (line.includes('-')) {
      const parts = line.split('-');
      const name = parts[0].trim();
      const right = parts[1].trim(); // "10 D"
      const match = right.match(/(\d+)\s*([a-zA-Z]+)/);
      if (match) {
        hof.push({
          id: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''),
          name,
          minBid: 5,
          maxBid: 99, // Unknown max bid for HoF
          effects: [{ type: 'deflate', amount: parseInt(match[1]), perRound: false }] // D = deflate
        });
      }
    }
  }
}

const out = `
export const PHASE_1_PLAYERS = ${JSON.stringify(p1, null, 2)};
export const PHASE_2_PLAYERS = ${JSON.stringify(p2, null, 2)};
export const HOF_PLAYERS = ${JSON.stringify(hof, null, 2)};
`;

fs.appendFileSync('./src/GameData.js', out);
