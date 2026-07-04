/**
 * Type definitions for mHC visualization.
 */

export interface SimulationConfig {
  depth: number;
  n: number;
  sinkhornIters: number;
  seed: number;
}

export interface Metrics {
  spectralNorm: number;
  forwardGain: number;
  backwardGain: number;
  rowSumMaxDev: number;
  colSumMaxDev: number;
  minEntry: number;
  largestEigenvalueMag: number;
  secondEigenvalueMag: number;
  distanceFromUniform: number;
}

export interface LayerMetrics extends Metrics {
  layer: number;
}

export interface CompositeMetrics extends Metrics {
  uptoLayer: number;
}

export interface SimulationResult {
  method: 'baseline' | 'hc' | 'mhc';
  depth: number;
  n: number;
  sinkhornIters: number;
  seed: number;
  perLayer: LayerMetrics[];
  composite: CompositeMetrics[];
}

export interface ComparisonResult {
  baseline: SimulationResult;
  hc: SimulationResult;
  mhc: SimulationResult;
}

export type Method = 'baseline' | 'hc' | 'mhc';

// Quiet Authority series palette (mirrors --color-* in index.css):
// baseline = deep green, HC = red (exploding), mHC = Blueprint navy (bounded).
export const COLORS: Record<Method, string> = {
  baseline: '#047857',
  hc: '#c0392b',
  mhc: '#1b3a8f',
};

export const LABELS: Record<Method, string> = {
  baseline: 'Baseline (Identity)',
  hc: 'HC (Unconstrained)',
  mhc: 'mHC (Doubly Stochastic)',
};
