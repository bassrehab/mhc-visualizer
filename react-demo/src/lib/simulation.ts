/**
 * Simulation engine for deep network signal propagation.
 * TypeScript port of the Python implementation.
 */

import type {
  SimulationResult,
  ComparisonResult,
  Method,
  LayerMetrics,
  CompositeMetrics,
} from './types';
import { mulberry32, randomMatrix, eye, matmul, sinkhornKnopp } from './sinkhorn';
import { computeAllMetrics } from './metrics';

/**
 * Generate a residual mixing matrix.
 */
export function generateResidualMatrix(
  n: number,
  method: Method,
  sinkhornIters: number,
  rng: () => number
): number[][] {
  if (method === 'baseline') {
    return eye(n);
  }

  // Generate random matrix for HC and mHC
  const M = randomMatrix(n, rng);

  if (method === 'hc') {
    return M;
  }

  if (method === 'mhc') {
    // At k=0, return raw random matrix (same as HC) to show explosive behavior
    // At k>0, apply Sinkhorn projection to show transition to stability
    if (sinkhornIters === 0) {
      return M;
    }
    return sinkhornKnopp(M, sinkhornIters);
  }

  throw new Error(`Unknown method: ${method}`);
}

/**
 * Simulate signal propagation through a deep residual network.
 */
export function simulateDepth(
  depth: number,
  n: number,
  method: Method,
  sinkhornIters: number,
  seed: number
): SimulationResult {
  const rng = mulberry32(seed);

  const perLayer: LayerMetrics[] = [];
  const composite: CompositeMetrics[] = [];

  let compositeMatrix = eye(n);

  for (let layerIdx = 0; layerIdx < depth; layerIdx++) {
    // Generate this layer's residual matrix
    const H = generateResidualMatrix(n, method, sinkhornIters, rng);

    // Store per-layer metrics
    const layerMetrics = computeAllMetrics(H);
    perLayer.push({
      layer: layerIdx,
      ...layerMetrics,
    });

    // Update composite: multiply from the left
    compositeMatrix = matmul(H, compositeMatrix);

    // Store composite metrics at this depth
    const compositeMetrics = computeAllMetrics(compositeMatrix);
    composite.push({
      uptoLayer: layerIdx,
      ...compositeMetrics,
    });
  }

  return {
    method,
    depth,
    n,
    sinkhornIters,
    seed,
    perLayer,
    composite,
  };
}

/**
 * Run simulation for all three methods and return comparison.
 */
export function runComparison(
  depth: number = 64,
  n: number = 4,
  sinkhornIters: number = 20,
  seed: number = 42
): ComparisonResult {
  return {
    baseline: simulateDepth(depth, n, 'baseline', sinkhornIters, seed),
    hc: simulateDepth(depth, n, 'hc', sinkhornIters, seed),
    mhc: simulateDepth(depth, n, 'mhc', sinkhornIters, seed),
  };
}

/**
 * Get a sample residual matrix for visualization.
 */
export function getSampleMatrix(
  n: number,
  method: Method,
  sinkhornIters: number,
  seed: number
): number[][] {
  const rng = mulberry32(seed);
  return generateResidualMatrix(n, method, sinkhornIters, rng);
}
