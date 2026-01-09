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

export const COLORS: Record<Method, string> = {
  baseline: '#10b981',
  hc: '#ef4444',
  mhc: '#3b82f6',
};

export const LABELS: Record<Method, string> = {
  baseline: 'Baseline (Identity)',
  hc: 'HC (Unconstrained)',
  mhc: 'mHC (Doubly Stochastic)',
};
