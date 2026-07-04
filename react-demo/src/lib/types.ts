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

// Quiet Authority series palette (mirrors --color-* in index.css).
// Light: mHC = Blueprint navy; Dark: lightened so it reads on a dark chart.
const SERIES_LIGHT: Record<Method, string> = { baseline: '#047857', hc: '#c0392b', mhc: '#1b3a8f' };
const SERIES_DARK: Record<Method, string> = { baseline: '#34d399', hc: '#e0796a', mhc: '#6b8cef' };

function isDark(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.getAttribute('data-theme') === 'dark';
}

// Theme-reactive: read at access time so charts (re-rendered via useThemeSignal
// in ManifoldDial) pick up the right colors when the theme flips.
export const COLORS: Record<Method, string> = {
  get baseline() { return isDark() ? SERIES_DARK.baseline : SERIES_LIGHT.baseline; },
  get hc() { return isDark() ? SERIES_DARK.hc : SERIES_LIGHT.hc; },
  get mhc() { return isDark() ? SERIES_DARK.mhc : SERIES_LIGHT.mhc; },
} as Record<Method, string>;

export const LABELS: Record<Method, string> = {
  baseline: 'Baseline (Identity)',
  hc: 'HC (Unconstrained)',
  mhc: 'mHC (Doubly Stochastic)',
};
