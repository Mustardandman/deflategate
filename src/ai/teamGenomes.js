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
  browns: { deflateWeight: 3.5, coinWeight: 0.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 5, priceBumpProb: 0.1, synergyBonus: 1.5, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.2, superstarPriorityMult: 1.4 },
  colts: { deflateWeight: 2.0, coinWeight: 0.9, recurringMult: 2.0, aggression: 1.1, reserveCoins: 0, priceBumpProb: 0.1, synergyBonus: 1.6, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  eagles: { deflateWeight: 1.5, coinWeight: 1.5, recurringMult: 1.0, aggression: 1.0, reserveCoins: 6, priceBumpProb: 0.3, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.3, superstarPriorityMult: 1.2 },
  dolphins: { deflateWeight: 2.8, coinWeight: 0.60, recurringMult: 1.25, aggression: 1.15, reserveCoins: 0, priceBumpProb: 0.28, synergyBonus: 1.3, firstClaimAggression: 1.15, postClaimAggression: 1.01, sub5UrgencyBonus: 2.39, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.0, superstarPriorityMult: 1.35, dolphinsMaxPurseAllIn: 14, dolphinsBufferThreshold: 3, dolphinsZeroSeekingThreshold: 0.0 },
  bears: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.2, reserveCoins: 3, priceBumpProb: 0.4, synergyBonus: 1.3, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.3, superstarPriorityMult: 1.1 },
  texans: { deflateWeight: 1.6, coinWeight: 1.2, recurringMult: 1.2, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.8, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  patriots: { deflateWeight: 2.4, coinWeight: 0.6, recurringMult: 1.0, aggression: 1.2, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.1 },
  steelers: { deflateWeight: 1.4, coinWeight: 1.6, recurringMult: 1.0, aggression: 0.9, reserveCoins: 4, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.0, postClaimAggression: 0.85, sub5UrgencyBonus: 2.0, richestBuffer: 2, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.2, superstarPriorityMult: 1.3 },
  lions: { deflateWeight: 1.7, coinWeight: 0.9, recurringMult: 1.0, aggression: 1.15, reserveCoins: 1, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.5, postClaimAggression: 0.85, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.2, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  bengals: { deflateWeight: 1.8, coinWeight: 1.2, recurringMult: 0.8, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.25, synergyBonus: 1.5, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  ravens: { deflateWeight: 1.6, coinWeight: 1.1, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.2, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  bills: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.04, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.79, sub5UrgencyBonus: 1.46, richestBuffer: 1, instantMaxBidAggression: 0.78, boardStrengthWeight: 0.65, threatDefenseWeight: 1.2, superstarPriorityMult: 1.25, discardCashBoostMaxCoins: 5, discardMinInstantDeflateEarly: 6, discardMinInstantDeflatePhase2: 5, discardPatienceWeight: 1.0, discardToxicCleanseBonus: 3.5, discardGoldenEngineThreshold: 10.0, discardPipelineAwareness: 1.0 },
  cardinals: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  commanders: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.25, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.2, superstarPriorityMult: 1.1 },
  raiders: { deflateWeight: 1.8, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.1, reserveCoins: 3, priceBumpProb: 0.35, synergyBonus: 1.3, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.3, superstarPriorityMult: 1.1 },
  chargers: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 0.9, reserveCoins: 3, priceBumpProb: 0.45, synergyBonus: 1.2, firstClaimAggression: 0.9, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.2, superstarPriorityMult: 1.2 },
  packers: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.1, reserveCoins: 0, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  vikings: { deflateWeight: 1.8, coinWeight: 1.3, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  saints: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  rams: { deflateWeight: 2.0, coinWeight: 0.8, recurringMult: 1.1, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.4 },
  seahawks: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.3, aggression: 1.0, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  jets: { deflateWeight: 1.8, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.2, reserveCoins: 1, priceBumpProb: 0.2, synergyBonus: 1.4, firstClaimAggression: 1.3, postClaimAggression: 1.0, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.4, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.3 },
  jaguars: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 3, priceBumpProb: 0.2, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  titans: { deflateWeight: 1.7, coinWeight: 1.0, recurringMult: 1.1, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 },
  broncos: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.0, reserveCoins: 4, priceBumpProb: 0.2, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  chiefs: { deflateWeight: 1.7, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.2, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.3, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.5 },
  cowboys: { deflateWeight: 1.8, coinWeight: 0.7, recurringMult: 1.1, aggression: 1.2, reserveCoins: 0, priceBumpProb: 0.2, synergyBonus: 1.2, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  panthers: { deflateWeight: 2.0, coinWeight: 0.9, recurringMult: 1.0, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.2, synergyBonus: 1.2, firstClaimAggression: 1.2, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  buccaneers: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.1, reserveCoins: 3, priceBumpProb: 0.25, synergyBonus: 1.3, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  '49ers': { deflateWeight: 1.7, coinWeight: 0.6, recurringMult: 1.1, aggression: 1.3, reserveCoins: 0, priceBumpProb: 0.2, synergyBonus: 1.5, firstClaimAggression: 1.3, postClaimAggression: 1.0, sub5UrgencyBonus: 3.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.1, threatDefenseWeight: 1.1, superstarPriorityMult: 1.2 },
  falcons: { deflateWeight: 1.6, coinWeight: 1.0, recurringMult: 1.0, aggression: 1.1, reserveCoins: 2, priceBumpProb: 0.25, synergyBonus: 1.2, firstClaimAggression: 1.1, postClaimAggression: 0.9, sub5UrgencyBonus: 2.0, richestBuffer: 1, instantMaxBidAggression: 1.0, boardStrengthWeight: 1.0, threatDefenseWeight: 1.0, superstarPriorityMult: 1.2 }
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
  superstarPriorityMult: { min: 0.8, max: 2.2, step: 0.05 }
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
