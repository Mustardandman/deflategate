import { simulateJets } from './comprehensiveJetsFineTuning.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

async function runJetsMicroTune() {
  console.log('========================================================================');
  console.log('   JETS MICRO-TUNING SUITE: ADJACENT NEIGHBORHOOD SWEEP                ');
  console.log('   500 games 7P + 500 games 10P per variant (1,000 matches per config) ');
  console.log('========================================================================\n');

  const base = {
    ...ACTIVE_TEAM_GENOMES.jets,
    deflateWeight: 2.4,
    coinWeight: 1.15,
    recurringMult: 1.10,
    aggression: 1.20,
    reserveCoins: 1,
    priceBumpProb: 0.23,
    synergyBonus: 1.62,
    firstClaimAggression: 1.3,
    postClaimAggression: 1.0,
    sub5UrgencyBonus: 2.41,
    richestBuffer: 1,
    instantMaxBidAggression: 1.42,
    boardStrengthWeight: 1.1,
    threatDefenseWeight: 1.16,
    superstarPriorityMult: 1.3,
    jetsMaxBidGap: 3
  };

  const microCandidates = [
    { name: 'Champion Base (Def 2.4, Coin 1.15, Recur 1.10, Gap 3, Res 1)', genome: { ...base } },
    { name: 'Gap-2 (Def 2.4, Coin 1.15, Recur 1.10, Gap 2, Res 1)', genome: { ...base, jetsMaxBidGap: 2 } },
    { name: 'Gap-4 (Def 2.4, Coin 1.15, Recur 1.10, Gap 4, Res 1)', genome: { ...base, jetsMaxBidGap: 4 } },
    { name: 'Coin-1.10 (Slightly lower coin weight)', genome: { ...base, coinWeight: 1.10 } },
    { name: 'Coin-1.20 (Slightly higher coin weight)', genome: { ...base, coinWeight: 1.20 } },
    { name: 'Recur-1.05 (Slightly lower recurring mult)', genome: { ...base, recurringMult: 1.05 } },
    { name: 'Recur-1.15 (Slightly higher recurring mult)', genome: { ...base, recurringMult: 1.15 } },
    { name: 'Def-2.30 (Slightly softer deflate weight)', genome: { ...base, deflateWeight: 2.30 } },
    { name: 'Def-2.50 (Slightly sharper deflate weight)', genome: { ...base, deflateWeight: 2.50 } },
    { name: 'InstMax-1.32 (Disciplined max buyer)', genome: { ...base, instantMaxBidAggression: 1.32 } },
    { name: 'Reserve-2 (Deeper reserve buffer)', genome: { ...base, reserveCoins: 2 } }
  ];

  const GAMES_PER_TEST = 500;
  console.log(`Running ${microCandidates.length} micro-variants x ${GAMES_PER_TEST} games (7P & 10P) = ${microCandidates.length * GAMES_PER_TEST * 2} total matches...\n`);

  const results = [];

  for (let i = 0; i < microCandidates.length; i++) {
    const c = microCandidates[i];
    process.stdout.write(`[${i + 1}/${microCandidates.length}] Micro-testing "${c.name}"... `);
    const tStart = Date.now();
    
    const r7 = simulateJets(c.genome, GAMES_PER_TEST, 7, 91000 + i * 2000);
    const r10 = simulateJets(c.genome, GAMES_PER_TEST, 10, 101000 + i * 2000);
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
  console.log('               JETS MICRO-TUNING LEADERBOARD RANKINGS                   ');
  console.log('========================================================================');
  console.log('Rank | Variant Name                                 | 7P Win% | 10P Win% | Blended | Avg PSI | MaxBids/Gm');
  console.log('---------------------------------------------------------------------------------------------------------');

  results.forEach((r, idx) => {
    const rankStr = String(idx + 1).padEnd(4);
    const nameStr = r.name.padEnd(44);
    const win7Str = r.r7.winRate.padEnd(7);
    const win10Str = r.r10.winRate.padEnd(8);
    const blendStr = (r.blendedWinRate.toFixed(1) + '%').padEnd(7);
    const psiStr = r.avgPsi.toFixed(2).padEnd(7);
    const maxBidsStr = (((parseFloat(r.r7.avgMaxBids) + parseFloat(r.r10.avgMaxBids)) / 2).toFixed(2)).padEnd(10);
    console.log(`${rankStr} | ${nameStr} | ${win7Str} | ${win10Str} | ${blendStr} | ${psiStr} | ${maxBidsStr}`);
  });

  const best = results[0];
  console.log('\n========================================================================');
  console.log(`🏆 ABSOLUTE BEST MICRO-TUNED JETS CONFIGURATION: "${best.name}"`);
  console.log(`   Blended Win Rate: ${best.blendedWinRate}% (7P: ${best.r7.winRate}, 10P: ${best.r10.winRate})`);
  console.log(`   Avg PSI: ${best.avgPsi} | Max Bids / Game: ${((parseFloat(best.r7.avgMaxBids) + parseFloat(best.r10.avgMaxBids)) / 2).toFixed(2)}`);
  console.log('   Genome Configuration:');
  console.log(JSON.stringify(best.genome, null, 2));
  console.log('========================================================================\n');
}

runJetsMicroTune();
