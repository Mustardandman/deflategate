import fs from 'fs';
import path from 'path';
import { TEAMS } from '../src/GameData.js';
import { BASELINE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const resultsPath = path.resolve('scratch/optimization_round2_results.json');
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log('=== SUMMARY OF EVOLVED WEIGHT CHANGES (ALL 31 TEAMS) ===\n');

data.teamReports.forEach(r => {
  const team = TEAMS.find(t => t.id === r.teamId);
  const teamName = team ? team.name : r.teamId;
  const base = BASELINE_TEAM_GENOMES[r.teamId] || {};
  const best = r.bestGenome || {};

  const changes = [];
  for (const k of Object.keys(best)) {
    if (base[k] !== undefined && base[k] !== best[k]) {
      changes.push(`${k}: ${base[k]} -> ${best[k]}`);
    } else if (base[k] === undefined) {
      changes.push(`${k}: new (${best[k]})`);
    }
  }

  console.log(`[${teamName.toUpperCase()}]`);
  console.log(`  Initial WinRate: ${r.initialBenchmark?.candidateWinRate?.toFixed(1)}% | Final WinRate: ${r.finalResult?.candidateWinRate?.toFixed(1)}% (vs Base: ${r.finalResult?.baselineWinRate?.toFixed(1)}%)`);
  console.log(`  Avg Final PSI: ${r.finalResult?.avgPsi?.toFixed(1)} (PSI Advantage: ${r.finalResult?.psiAdvantage >= 0 ? '+' : ''}${r.finalResult?.psiAdvantage?.toFixed(1)})`);
  console.log(`  Weight Deltas: ${changes.length > 0 ? changes.join(' | ') : 'No change'}`);
  console.log('');
});
