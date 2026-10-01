import { simulateColts } from './testColtsBenchmark.mjs';
import { BASELINE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

console.log('=== SYSTEMATIC COLTS GENOME FINE-TUNING SWEEP ===\n');

const coltsBase = { ...BASELINE_TEAM_GENOMES.colts };
console.log('Current Colts Base Genome:', coltsBase);

const candidates = [
  { name: 'Current Baseline', genome: { ...coltsBase } },
  
  // Deflate vs Coin Balance
  { name: 'Deflate 2.0, Coin 0.9', genome: { ...coltsBase, deflateWeight: 2.0, coinWeight: 0.9 } },
  { name: 'Deflate 2.0, Coin 1.0', genome: { ...coltsBase, deflateWeight: 2.0, coinWeight: 1.0 } },
  { name: 'Deflate 2.0, Coin 1.1', genome: { ...coltsBase, deflateWeight: 2.0, coinWeight: 1.1 } },
  { name: 'Deflate 2.2, Coin 0.9', genome: { ...coltsBase, deflateWeight: 2.2, coinWeight: 0.9 } },
  { name: 'Deflate 2.2, Coin 1.0', genome: { ...coltsBase, deflateWeight: 2.2, coinWeight: 1.0 } },
  { name: 'Deflate 2.2, Coin 1.1', genome: { ...coltsBase, deflateWeight: 2.2, coinWeight: 1.1 } },
  { name: 'Deflate 2.3, Coin 1.0', genome: { ...coltsBase, deflateWeight: 2.3, coinWeight: 1.0 } },
  { name: 'Deflate 2.4, Coin 0.9', genome: { ...coltsBase, deflateWeight: 2.4, coinWeight: 0.9 } },

  // Recurring Multiplier variations
  { name: 'recurringMult 1.7', genome: { ...coltsBase, recurringMult: 1.7 } },
  { name: 'recurringMult 1.85', genome: { ...coltsBase, recurringMult: 1.85 } },
  { name: 'recurringMult 2.15', genome: { ...coltsBase, recurringMult: 2.15 } },

  // Aggression tuning
  { name: 'Aggression 1.10, firstClaim 1.20', genome: { ...coltsBase, aggression: 1.10, firstClaimAggression: 1.20 } },
  { name: 'Aggression 1.20, firstClaim 1.30', genome: { ...coltsBase, aggression: 1.20, firstClaimAggression: 1.30 } },
  { name: 'Aggression 1.25, firstClaim 1.35', genome: { ...coltsBase, aggression: 1.25, firstClaimAggression: 1.35 } },

  // Synergy & Threat Defense
  { name: 'Synergy 1.7, ThreatDef 1.1', genome: { ...coltsBase, synergyBonus: 1.7, threatDefenseWeight: 1.1 } },
  { name: 'Synergy 1.5, ThreatDef 1.1', genome: { ...coltsBase, synergyBonus: 1.5, threatDefenseWeight: 1.1 } },

  // Best of Combinations
  { name: 'Combo A (Def 2.2, Coin 0.95, Rec 1.9, Agg 1.2)', genome: { ...coltsBase, deflateWeight: 2.2, coinWeight: 0.95, recurringMult: 1.9, aggression: 1.2, firstClaimAggression: 1.3 } },
  { name: 'Combo B (Def 2.3, Coin 1.0, Rec 1.85, Agg 1.15)', genome: { ...coltsBase, deflateWeight: 2.3, coinWeight: 1.0, recurringMult: 1.85, aggression: 1.15, firstClaimAggression: 1.25 } },
  { name: 'Combo C (Def 2.1, Coin 1.05, Rec 2.1, Agg 1.2)', genome: { ...coltsBase, deflateWeight: 2.1, coinWeight: 1.05, recurringMult: 2.1, aggression: 1.2, firstClaimAggression: 1.3 } }
];

let bestCandidate = null;
let bestCompositeScore = -999;

for (const cand of candidates) {
  const r7 = simulateColts(cand.genome, 120, 7, 70000);
  const r10 = simulateColts(cand.genome, 120, 10, 80000);
  const compositeWinRate = (r7.winRate + r10.winRate) / 2;
  const compositePsi = (Number(r7.avgPsi) + Number(r10.avgPsi)) / 2;
  // Composite score: win rate + 0.5 * (50 - PSI)
  const score = compositeWinRate - (compositePsi * 0.5);

  console.log(`[${cand.name.padEnd(52)}] 7P: ${r7.winRate}% (PSI ${r7.avgPsi}) | 10P: ${r10.winRate}% (PSI ${r10.avgPsi}) | CompWin: ${compositeWinRate.toFixed(1)}% | CompPSI: ${compositePsi.toFixed(2)} | Score: ${score.toFixed(2)}`);

  if (score > bestCompositeScore) {
    bestCompositeScore = score;
    bestCandidate = { ...cand, compositeWinRate, compositePsi };
  }
}

console.log('\n======================================================');
console.log('🏆 BEST CANDIDATE:', bestCandidate.name);
console.log('Genome:', JSON.stringify(bestCandidate.genome, null, 2));
console.log(`Composite Win Rate: ${bestCandidate.compositeWinRate.toFixed(1)}%, Composite PSI: ${bestCandidate.compositePsi.toFixed(2)}`);
console.log('======================================================\n');
