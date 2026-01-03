/**
 * Stability metrics for analyzing residual mixing matrices.
 * TypeScript port of the Python implementation.
 */

import type { Metrics } from './types';

/**
 * Compute forward gain (max absolute row sum).
 */
export function forwardGain(matrix: number[][]): number {
  const rowSums = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  return Math.max(...rowSums.map(Math.abs));
}

/**
 * Compute backward gain (max absolute column sum).
 */
export function backwardGain(matrix: number[][]): number {
  const n = matrix.length;
  const colSums: number[] = Array(n).fill(0);

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  return Math.max(...colSums.map(Math.abs));
}

/**
 * Estimate spectral norm via power iteration.
 */
export function spectralNorm(
  matrix: number[][],
  iterations: number = 20
): number {
  const n = matrix.length;

  // Random unit vector (using fixed seed for reproducibility)
  let v = Array(n)
    .fill(null)
    .map((_, i) => Math.sin(i + 1));
  let norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
  v = v.map((x) => x / norm);

  for (let iter = 0; iter < iterations; iter++) {
    // w = M @ v
    const w = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        w[i] += matrix[i][j] * v[j];
      }
    }

    norm = Math.sqrt(w.reduce((a, b) => a + b * b, 0));
    if (norm < 1e-10) return 0;
    v = w.map((x) => x / norm);
  }

  // Final norm estimate
  const Mv = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      Mv[i] += matrix[i][j] * v[j];
    }
  }
  return Math.sqrt(Mv.reduce((a, b) => a + b * b, 0));
}

/**
 * Compute row sum max deviation from 1.
 */
export function rowSumMaxDev(matrix: number[][]): number {
  const rowSums = matrix.map((row) => row.reduce((a, b) => a + b, 0));
  return Math.max(...rowSums.map((s) => Math.abs(s - 1)));
}

/**
 * Compute column sum max deviation from 1.
 */
export function colSumMaxDev(matrix: number[][]): number {
  const n = matrix.length;
  const colSums: number[] = Array(n).fill(0);

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      colSums[j] += matrix[i][j];
    }
  }

  return Math.max(...colSums.map((s) => Math.abs(s - 1)));
}

/**
 * Find minimum entry in matrix.
 */
export function minEntry(matrix: number[][]): number {
  let min = Infinity;
  for (const row of matrix) {
    for (const val of row) {
      if (val < min) min = val;
    }
  }
  return min;
}

/**
 * Compute all metrics for a matrix.
 */
export function computeAllMetrics(matrix: number[][]): Metrics {
  return {
    spectralNorm: spectralNorm(matrix),
    forwardGain: forwardGain(matrix),
    backwardGain: backwardGain(matrix),
    rowSumMaxDev: rowSumMaxDev(matrix),
    colSumMaxDev: colSumMaxDev(matrix),
    minEntry: minEntry(matrix),
  };
}
