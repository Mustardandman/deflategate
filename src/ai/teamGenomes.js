/**
 * Team Genomes and Genetic Operators for Deflategate CPU Optimization
 */

import { EVOLVED_TEAM_GENOMES } from './evolvedWeights.js';

export const DEFAULT_GENOME = {
  deflateWeight: 1.6,
  coinWeight: 1.0,
  recurringMult: 1.0,
  aggression: 1.0,
  reserveCoins: 3,
  priceBumpProb: 0.25,
  synergyBonus: 1.2,
  firstClaimAggression: 1.2,
  postClaimAggression: 0.9,
  sub5UrgencyBonus: 2.0,
  richestBuffer: 1,
  instantMaxBidAggression: 1.0,
  boardStrengthWeight: 1.0,
  threatDefenseWeight: 1.0,
  superstarPriorityMult: 1.0
};

export const BASELINE_TEAM_GENOMES = {
  "bills": {
    "deflateWeight": 1.6,
    "coinWeight": 1,
    "recurringMult": 1,
    "aggression": 1,
    "reserveCoins": 2,
    "priceBumpProb": 0.04,
    "synergyBonus": 1.2,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.79,
    "sub5UrgencyBonus": 1.46,
    "richestBuffer": 1,
    "instantMaxBidAggression": 0.78,
    "boardStrengthWeight": 0.65,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.25,
    "discardCashBoostMaxCoins": 5,
    "discardMinInstantDeflateEarly": 6,
    "discardMinInstantDeflatePhase2": 5,
    "discardPatienceWeight": 1,
    "discardToxicCleanseBonus": 3.5,
    "discardGoldenEngineThreshold": 10,
    "discardPipelineAwareness": 1
  },
  "dolphins": {
    "deflateWeight": 2.8,
    "coinWeight": 0.5,
    "recurringMult": 1.25,
    "aggression": 1.15,
    "reserveCoins": 0,
    "priceBumpProb": 0.28,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.15,
    "postClaimAggression": 1.01,
    "sub5UrgencyBonus": 2.39,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1,
    "superstarPriorityMult": 1.35,
    "dolphinsMaxPurseAllIn": 14,
    "dolphinsBufferThreshold": 3,
    "dolphinsZeroSeekingThreshold": 0
  },
  "patriots": {
    "deflateWeight": 2.4,
    "coinWeight": 1.05,
    "recurringMult": 1.1,
    "aggression": 1.08,
    "reserveCoins": 2,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.4,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.15,
    "superstarPriorityMult": 1.35
  },
  "jets": {
    "deflateWeight": 2.4,
    "coinWeight": 1.25,
    "recurringMult": 1,
    "aggression": 1.2,
    "reserveCoins": 1,
    "priceBumpProb": 0.23,
    "synergyBonus": 1.62,
    "firstClaimAggression": 1.3,
    "postClaimAggression": 1,
    "sub5UrgencyBonus": 2.41,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.42,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.16,
    "superstarPriorityMult": 1.3,
    "jetsMaxBidGap": 3
  },
  "ravens": {
    "deflateWeight": 2.1,
    "coinWeight": 1,
    "recurringMult": 1.1,
    "aggression": 1.1,
    "reserveCoins": 2,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.5,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2.2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.05,
    "boardStrengthWeight": 1.2,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.4
  },
  "bengals": {
    "deflateWeight": 2.2,
    "coinWeight": 1.15,
    "recurringMult": 1,
    "aggression": 1.15,
    "reserveCoins": 2,
    "priceBumpProb": 0.25,
    "synergyBonus": 1.5,
    "firstClaimAggression": 1.23,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2.15,
    "richestBuffer": 2,
    "instantMaxBidAggression": 1.06,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.14,
    "superstarPriorityMult": 1.2
  },
  "browns": {
    "deflateWeight": 4.5,
    "coinWeight": 0,
    "recurringMult": 1,
    "aggression": 1,
    "reserveCoins": 1,
    "priceBumpProb": 0.14,
    "synergyBonus": 1.5,
    "firstClaimAggression": 1.35,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.15,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.7
  },
  "steelers": {
    "deflateWeight": 2,
    "coinWeight": 2.2,
    "recurringMult": 1.2,
    "aggression": 1,
    "reserveCoins": 1,
    "priceBumpProb": 0,
    "synergyBonus": 1.4,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.85,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.4,
    "closerPsiThreshold": 18,
    "r1MaxCoinBid": 2,
    "altCapRatio": 0.65
  },
  "texans": {
    "deflateWeight": 1.75,
    "coinWeight": 1.03,
    "recurringMult": 1.37,
    "aggression": 1.17,
    "reserveCoins": 2,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.8,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 0.83,
    "superstarPriorityMult": 1.2
  },
  "colts": {
    "deflateWeight": 2,
    "coinWeight": 0.9,
    "recurringMult": 2.25,
    "aggression": 1.21,
    "reserveCoins": 0,
    "priceBumpProb": 0.1,
    "synergyBonus": 1.78,
    "firstClaimAggression": 1.15,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 1.95,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.22,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.02,
    "superstarPriorityMult": 1.08
  },
  "jaguars": {
    "deflateWeight": 1.86,
    "coinWeight": 1.24,
    "recurringMult": 1.45,
    "aggression": 0.9,
    "reserveCoins": 3,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.2,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.82,
    "sub5UrgencyBonus": 1.66,
    "richestBuffer": 1,
    "instantMaxBidAggression": 0.98,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 0.93,
    "superstarPriorityMult": 1.32
  },
  "titans": {
    "deflateWeight": 2.3,
    "coinWeight": 1,
    "recurringMult": 1.1,
    "aggression": 1.1,
    "reserveCoins": 3,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.15,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 1.52,
    "richestBuffer": 2,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1,
    "superstarPriorityMult": 1.28
  },
  "broncos": {
    "deflateWeight": 1.6,
    "coinWeight": 1,
    "recurringMult": 1.25,
    "aggression": 1.15,
    "reserveCoins": 4,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.28,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2.43,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.16,
    "boardStrengthWeight": 0.79,
    "threatDefenseWeight": 1,
    "superstarPriorityMult": 1.2
  },
  "chiefs": {
    "deflateWeight": 1.6,
    "coinWeight": 1,
    "recurringMult": 1,
    "aggression": 1.1,
    "reserveCoins": 2,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.5
  },
  "raiders": {
    "deflateWeight": 1,
    "coinWeight": 0.85,
    "recurringMult": 1,
    "aggression": 1,
    "reserveCoins": 0,
    "priceBumpProb": 0.25,
    "synergyBonus": 1,
    "firstClaimAggression": 1,
    "postClaimAggression": 1,
    "sub5UrgencyBonus": 1,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1
  },
  "chargers": {
    "deflateWeight": 2.5,
    "coinWeight": 0.6,
    "recurringMult": 1.2,
    "aggression": 1.15,
    "reserveCoins": 0,
    "priceBumpProb": 0.5,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 1,
    "sub5UrgencyBonus": 2.2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.2,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.4
  },
  "cowboys": {
    "deflateWeight": 2.4,
    "coinWeight": 0.5,
    "recurringMult": 1.1,
    "aggression": 1.2,
    "reserveCoins": 0,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.2,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.2
  },
  "eagles": {
    "deflateWeight": 1.4,
    "coinWeight": 1.7,
    "recurringMult": 1,
    "aggression": 1,
    "reserveCoins": 3,
    "priceBumpProb": 0.3,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.3,
    "superstarPriorityMult": 1.2
  },
  "commanders": {
    "deflateWeight": 2.2,
    "coinWeight": 1,
    "recurringMult": 1.2,
    "aggression": 1.15,
    "reserveCoins": 1,
    "priceBumpProb": 0.25,
    "synergyBonus": 1.2,
    "firstClaimAggression": 1.15,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.1
  },
  "bears": {
    "deflateWeight": 2,
    "coinWeight": 1.1,
    "recurringMult": 1,
    "aggression": 1.2,
    "reserveCoins": 0,
    "priceBumpProb": 0.35,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.3,
    "superstarPriorityMult": 1.1
  },
  "lions": {
    "deflateWeight": 2.35,
    "coinWeight": 0.8,
    "recurringMult": 1,
    "aggression": 1.15,
    "reserveCoins": 0,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.5,
    "postClaimAggression": 0.85,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.2,
    "threatDefenseWeight": 1,
    "superstarPriorityMult": 1.2
  },
  "packers": {
    "deflateWeight": 2.55,
    "coinWeight": 0.95,
    "recurringMult": 1,
    "aggression": 1.1,
    "reserveCoins": 0,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.4,
    "firstClaimAggression": 1.25,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.2
  },
  "vikings": {
    "deflateWeight": 2.35,
    "coinWeight": 0.9,
    "recurringMult": 1.2,
    "aggression": 1.15,
    "reserveCoins": 1,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.25,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.15,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.35
  },
  "falcons": {
    "deflateWeight": 2.55,
    "coinWeight": 1,
    "recurringMult": 1,
    "aggression": 1.18,
    "reserveCoins": 1,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.25,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.25
  },
  "saints": {
    "deflateWeight": 2.15,
    "coinWeight": 1,
    "recurringMult": 1.25,
    "aggression": 1.15,
    "reserveCoins": 1,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.25
  },
  "panthers": {
    "deflateWeight": 2.15,
    "coinWeight": 0.95,
    "recurringMult": 1.2,
    "aggression": 1.18,
    "reserveCoins": 1,
    "priceBumpProb": 0.25,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.25,
    "superstarPriorityMult": 1.25
  },
  "buccaneers": {
    "deflateWeight": 1.6,
    "coinWeight": 1,
    "recurringMult": 1,
    "aggression": 1.27,
    "reserveCoins": 3,
    "priceBumpProb": 0.25,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.1,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.2,
    "boardStrengthWeight": 1.18,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.08
  },
  "cardinals": {
    "deflateWeight": 2.38,
    "coinWeight": 0.8,
    "recurringMult": 1.2,
    "aggression": 1.18,
    "reserveCoins": 1,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.25,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1.1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.2,
    "superstarPriorityMult": 1.35
  },
  "rams": {
    "deflateWeight": 2.5,
    "coinWeight": 0.75,
    "recurringMult": 1.25,
    "aggression": 1.18,
    "reserveCoins": 1,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.5
  },
  "49ers": {
    "deflateWeight": 2.55,
    "coinWeight": 0.35,
    "recurringMult": 1.1,
    "aggression": 1.25,
    "reserveCoins": 0,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.5,
    "firstClaimAggression": 1.3,
    "postClaimAggression": 1,
    "sub5UrgencyBonus": 3.8,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.2
  },
  "seahawks": {
    "deflateWeight": 2.75,
    "coinWeight": 0.75,
    "recurringMult": 1.25,
    "aggression": 1.18,
    "reserveCoins": 0,
    "priceBumpProb": 0.2,
    "synergyBonus": 1.3,
    "firstClaimAggression": 1.2,
    "postClaimAggression": 0.9,
    "sub5UrgencyBonus": 2,
    "richestBuffer": 1,
    "instantMaxBidAggression": 1,
    "boardStrengthWeight": 1.1,
    "threatDefenseWeight": 1.1,
    "superstarPriorityMult": 1.3
  }
};

export const ACTIVE_TEAM_GENOMES = {
  ...BASELINE_TEAM_GENOMES,
  ...EVOLVED_TEAM_GENOMES
};

export const GENOME_BOUNDS = {
  deflateWeight: { min: 0.5, max: 5.0, step: 0.05 },
  coinWeight: { min: 0.0, max: 3.0, step: 0.05 },
  recurringMult: { min: 0.4, max: 3.0, step: 0.05 },
  aggression: { min: 0.5, max: 2.0, step: 0.05 },
  reserveCoins: { min: 0, max: 10, step: 1 },
  priceBumpProb: { min: 0.0, max: 0.8, step: 0.02 },
  synergyBonus: { min: 0.8, max: 3.0, step: 0.05 },
  firstClaimAggression: { min: 0.8, max: 2.5, step: 0.05 },
  postClaimAggression: { min: 0.5, max: 1.5, step: 0.05 },
  sub5UrgencyBonus: { min: 0.0, max: 5.0, step: 0.1 },
  richestBuffer: { min: 0, max: 6, step: 1 },
  instantMaxBidAggression: { min: 0.5, max: 2.5, step: 0.05 },
  boardStrengthWeight: { min: 0.5, max: 2.5, step: 0.05 },
  threatDefenseWeight: { min: 0.5, max: 2.5, step: 0.05 },
  superstarPriorityMult: { min: 0.8, max: 2.2, step: 0.05 },
  jetsMaxBidGap: { min: 1, max: 6, step: 1 }
};

export function clampGenome(genome, teamId) {
  const g = { ...genome };
  for (const key of Object.keys(GENOME_BOUNDS)) {
    const { min, max, step } = GENOME_BOUNDS[key];
    let val = typeof g[key] === 'number' ? g[key] : (DEFAULT_GENOME[key] || 1.0);
    val = Math.max(min, Math.min(max, val));
    if (step === 1) {
      val = Math.round(val);
    } else {
      val = Math.round(val * 100) / 100;
    }
    g[key] = val;
  }
  // Hard constraint: Browns cannot gain coins under any circumstance
  if (teamId === 'browns') {
    g.coinWeight = 0.0;
  }
  return g;
}

export function mutateGenome(parent, teamId, mutationRate = 0.25, mutationMagnitude = 0.15) {
  const mutated = { ...parent };
  for (const key of Object.keys(GENOME_BOUNDS)) {
    if (Math.random() < mutationRate) {
      const { min, max, step } = GENOME_BOUNDS[key];
      const range = max - min;
      const delta = (Math.random() * 2 - 1) * range * mutationMagnitude;
      mutated[key] += delta;
    }
  }
  return clampGenome(mutated, teamId);
}

export function crossoverGenomes(parentA, parentB, teamId) {
  const child = {};
  for (const key of Object.keys(GENOME_BOUNDS)) {
    // Blended crossover with random bias
    const weight = Math.random();
    child[key] = parentA[key] * weight + parentB[key] * (1 - weight);
  }
  return clampGenome(child, teamId);
}
