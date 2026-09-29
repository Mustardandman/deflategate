import { runPatriotsBenchmark } from './testPatriotsBenchmark.mjs';
import { ACTIVE_TEAM_GENOMES } from '../src/ai/teamGenomes.js';

const ARCHETYPES = [
  {
    name: "Archetype A: Pure Deflation Sprinter (No Hoarding)",
    desc: "All-in on deflation from Turn 1. Lowest reserve coins. Tries to finish before Phase 2.",
    genome: {
      deflateWeight: 3.4,
      coinWeight: 0.25,
      recurringMult: 0.9,
      reserveCoins: 0,
      aggression: 1.15,
      superstarPriorityMult: 1.1,
      threatDefenseWeight: 1.0,
      boardStrengthWeight: 1.0
    }
  },
  {
    name: "Archetype B: Sprint & 2-Coin Safety Cushion",
    desc: "Heavy deflation focus (3.0), but holds 2 coins reserve to prevent Phase 2 paralysis.",
    genome: {
      deflateWeight: 3.0,
      coinWeight: 0.50,
      recurringMult: 0.95,
      reserveCoins: 2,
      aggression: 1.15,
      superstarPriorityMult: 1.15,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Archetype C: Balanced Sprinter & Engine (User Intuition)",
    desc: "Strong deflation (2.7), moderate coin respect (0.75), reserveCoins = 2. Aggressive R1 on Bowers/engines.",
    genome: {
      deflateWeight: 2.7,
      coinWeight: 0.75,
      recurringMult: 1.0,
      reserveCoins: 2,
      aggression: 1.15,
      superstarPriorityMult: 1.2,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Archetype D: Economic Capitalist (Phase 2 Fund)",
    desc: "Builds coin engine early (coinWeight 1.1), hoards 4 coins for Phase 2/HOF bomb drops.",
    genome: {
      deflateWeight: 2.2,
      coinWeight: 1.10,
      recurringMult: 1.1,
      reserveCoins: 4,
      aggression: 1.0,
      superstarPriorityMult: 1.35,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.0
    }
  },
  {
    name: "Archetype E: Hyper-Aggressive Closer (3.2 Deflate / 0.55 Coins / Reserve 1)",
    desc: "High deflation weight with reserveCoins = 1, tuned for fast closings and high bid pressure.",
    genome: {
      deflateWeight: 3.2,
      coinWeight: 0.55,
      recurringMult: 0.95,
      reserveCoins: 1,
      aggression: 1.25,
      superstarPriorityMult: 1.2,
      threatDefenseWeight: 1.2,
      boardStrengthWeight: 1.1
    }
  },
  {
    name: "Archetype F: Deep Machine Evolved Baseline (2.83 Deflate / 0.72 Coins / Reserve 2)",
    desc: "Original evolved weights from initial multi-team genetic algorithm.",
    genome: {
      deflateWeight: 2.83,
      coinWeight: 0.72,
      recurringMult: 0.69,
      reserveCoins: 2,
      aggression: 1.12,
      superstarPriorityMult: 1.1,
      threatDefenseWeight: 1.1,
      boardStrengthWeight: 1.1
    }
  }
];

async function runTournament() {
  console.log("=========================================================================================");
  console.log("             NEW ENGLAND PATRIOTS: STRATEGIC ARCHETYPE TOURNAMENT");
  console.log("             Testing 6 Diverse Strategies Across 200 Games Each (7P & 10P)");
  console.log("=========================================================================================\n");

  const results = [];

  for (const arch of ARCHETYPES) {
    console.log(`>>> Testing: ${arch.name}`);
    console.log(`    Strategy: ${arch.desc}`);
    
    // Apply genome
    ACTIVE_TEAM_GENOMES.patriots = { ...arch.genome };

    const r7 = runPatriotsBenchmark(100, 7, 5500);
    const r10 = runPatriotsBenchmark(100, 10, 5500);

    const winRate7 = parseFloat(r7.winRate);
    const winRate10 = parseFloat(r10.winRate);
    const combinedScore = (winRate7 * 0.5) + (winRate10 * 0.5);

    const result = {
      name: arch.name,
      r7,
      r10,
      winRate7,
      winRate10,
      combinedScore,
      avgPsi: ((parseFloat(r7.avgPsi) + parseFloat(r10.avgPsi)) / 2).toFixed(2),
      avgCoins: ((parseFloat(r7.avgCoins) + parseFloat(r10.avgCoins)) / 2).toFixed(2),
      pctZeroCoins: ((parseFloat(r7.pctZeroCoins) + parseFloat(r10.pctZeroCoins)) / 2).toFixed(1) + '%',
      avgWinRound: r7.avgWinRound
    };
    results.push(result);

    console.log(`    -> 7P Win Rate:  ${r7.winRate.padStart(5)} | Avg PSI: ${r7.avgPsi} | Win Rnd: ${r7.avgWinRound} | 0c: ${r7.pctZeroCoins}`);
    console.log(`    -> 10P Win Rate: ${r10.winRate.padStart(5)} | Avg PSI: ${r10.avgPsi} | Win Rnd: ${r10.avgWinRound} | 0c: ${r10.pctZeroCoins}`);
    console.log(`    => COMBINED WIN SCORE: ${combinedScore.toFixed(1)}%\n`);
  }

  // Sort and print leaderboard
  results.sort((a, b) => b.combinedScore - a.combinedScore);

  console.log("=========================================================================================");
  console.log("                            FINAL TOURNAMENT LEADERBOARD");
  console.log("=========================================================================================");
  console.log("Rank | Strategy Name                                 | 7P Win | 10P Win | Combined | Avg PSI | 0c Rnds");
  console.log("-----------------------------------------------------------------------------------------");
  results.forEach((r, idx) => {
    console.log(
      `${String(idx + 1).padStart(4)} | ` +
      `${r.name.padEnd(45).slice(0, 45)} | ` +
      `${r.r7.winRate.padStart(6)} | ` +
      `${r.r10.winRate.padStart(7)} | ` +
      `${r.combinedScore.toFixed(1).padStart(7)}% | ` +
      `${r.avgPsi.padStart(7)} | ` +
      `${r.pctZeroCoins.padStart(7)}`
    );
  });
  console.log("=========================================================================================\n");

  const winner = results[0];
  console.log(`🏆 CHAMPION ARCHETYPE: ${winner.name}`);
  console.log(`   Combined Win Score: ${winner.combinedScore.toFixed(1)}% (7P: ${winner.r7.winRate}, 10P: ${winner.r10.winRate})`);
  console.log(`   Avg PSI: ${winner.avgPsi}, Avg Win Round: ${winner.avgWinRound}\n`);
}

runTournament().catch(console.error);
