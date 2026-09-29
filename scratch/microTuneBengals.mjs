import { simulateBengals } from './comprehensiveBengalsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

async function runMicroTune() {
  console.log('========================================================================');
  console.log('   MICRO-TUNING SUITE: BENGALS ADJACENT NEIGHBORHOOD SWEEP             ');
  console.log('   500 games 7P + 500 games 10P per variant (1,000 matches per config) ');
  console.log('========================================================================\n');

  const base = { ...ACTIVE_TEAM_GENOMES.bengals };

  const microCandidates = [
    { name: 'C2 Baseline (Def 2.20, Coin 1.15, Recur 1.00, Agg 1.15, InstMax 1.06)', genome: { ...base } },
    { name: 'Deflate-2.15 (Slightly softer deflate weight)', genome: { ...base, deflateWeight: 2.15 } },
    { name: 'Deflate-2.25 (Slightly sharper deflate weight)', genome: { ...base, deflateWeight: 2.25 } },
    { name: 'Coin-1.12 (Slightly lower coin priority)', genome: { ...base, coinWeight: 1.12 } },
    { name: 'Coin-1.18 (Slightly higher coin priority)', genome: { ...base, coinWeight: 1.18 } },
    { name: 'Recur-0.95 (Slightly lower recurring mult)', genome: { ...base, recurringMult: 0.95 } },
    { name: 'Recur-1.05 (Slightly higher recurring mult)', genome: { ...base, recurringMult: 1.05 } },
    { name: 'Agg-1.12 (Slightly calmer auction bidding)', genome: { ...base, aggression: 1.12 } },
    { name: 'Agg-1.18 (Slightly fiercer auction bidding)', genome: { ...base, aggression: 1.18 } },
    { name: 'InstMax-1.03 (Slightly stricter instant max-bid limit)', genome: { ...base, instantMaxBidAggression: 1.03 } },
    { name: 'InstMax-1.09 (Slightly looser instant max-bid limit)', genome: { ...base, instantMaxBidAggression: 1.09 } }
  ];

  const GAMES_PER_TEST = 500;
  console.log(`Running ${microCandidates.length} micro-variants x ${GAMES_PER_TEST} games (7P & 10P) = ${microCandidates.length * GAMES_PER_TEST * 2} total matches...\n`);

  const results = [];

  for (let i = 0; i < microCandidates.length; i++) {
    const c = microCandidates[i];
    process.stdout.write(`[${i + 1}/${microCandidates.length}] Micro-testing "${c.name}"... `);
    const tStart = Date.now();
    
    const r7 = simulateBengals(c.genome, GAMES_PER_TEST, 7, 95000 + i * 2000);
    const r10 = simulateBengals(c.genome, GAMES_PER_TEST, 10, 105000 + i * 2000);
    const dt = ((Date.now() - tStart) / 1000).toFixed(1);

    const blendedWinRate = (0.5 * r7.winRateNum + 0.5 * r10.winRateNum).toFixed(1);
    const avgPsi = ((parseFloat(r7.avgPsi) + parseFloat(r10.avgPsi)) / 2).toFixed(2);

    results.push({
      name: c.name,
      genome: c.genome,
      r7,
      r10,
      blendedWinRate: parseFloat(blendedWinRate),
      avgPsi: parseFloat(avgPsi),
      dt
    });

    console.log(`Done (${dt}s) -> 7P: ${r7.winRate} | 10P: ${r10.winRate} | Blended: ${blendedWinRate}% | Avg PSI: ${avgPsi}`);
  }

  results.sort((a, b) => b.blendedWinRate - a.blendedWinRate || a.avgPsi - b.avgPsi);

  console.log('\n========================================================================');
  console.log('                   MICRO-TUNING LEADERBOARD RANKINGS                    ');
  console.log('========================================================================');
  console.log('Rank | Variant Name                                 | 7P Win% | 10P Win% | Blended | Avg PSI | Avg Discards');
  console.log('---------------------------------------------------------------------------------------------------------');

  results.forEach((r, idx) => {
    const rankStr = String(idx + 1).padEnd(4);
    const nameStr = r.name.padEnd(44);
    const win7Str = r.r7.winRate.padEnd(7);
    const win10Str = r.r10.winRate.padEnd(8);
    const blendStr = (r.blendedWinRate.toFixed(1) + '%').padEnd(7);
    const psiStr = r.avgPsi.toFixed(2).padEnd(7);
    const discStr = (((parseFloat(r.r7.avgDiscarded) + parseFloat(r.r10.avgDiscarded)) / 2).toFixed(2)).padEnd(12);
    console.log(`${rankStr} | ${nameStr} | ${win7Str} | ${win10Str} | ${blendStr} | ${psiStr} | ${discStr}`);
  });

  const best = results[0];
  console.log('\n========================================================================');
  console.log(`🏆 ABSOLUTE BEST MICRO-TUNED CONFIGURATION: "${best.name}"`);
  console.log(`   Blended Win Rate: ${best.blendedWinRate}% (7P: ${best.r7.winRate}, 10P: ${best.r10.winRate})`);
  console.log(`   Avg PSI: ${best.avgPsi} | Discards/Game: ${((parseFloat(best.r7.avgDiscarded) + parseFloat(best.r10.avgDiscarded)) / 2).toFixed(2)}`);
  console.log('========================================================================\n');
}

runMicroTune();
