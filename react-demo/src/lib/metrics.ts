/**
 * Stability metrics for analyzing residual mixing matrices.
 * TypeScript port of the Python implementation.
 */

import type { Metrics } from './types';

/**
 * Compute eigenvalues using QR iteration (for small matrices).
 * Returns eigenvalues sorted by magnitude (descending).
 */
export function eigenvaluesSorted(matrix: number[][]): { real: number; imag: number }[] {
  const n = matrix.length;

  // Make a copy to work with
  let A = matrix.map(row => [...row]);

  // QR iteration - converges to Schur form
  const maxIters = 100;
  for (let iter = 0; iter < maxIters; iter++) {
    // QR decomposition using Gram-Schmidt
    const { Q, R } = qrDecomposition(A);
    // A = R * Q (reverse multiply)
    A = matrixMultiply(R, Q);
  }

  // Extract eigenvalues from diagonal (for real eigenvalues)
  // For 2x2 blocks on diagonal, compute complex eigenvalues
  const eigenvalues: { real: number; imag: number }[] = [];

  let i = 0;
  while (i < n) {
    if (i === n - 1 || Math.abs(A[i + 1][i]) < 1e-10) {
      // Real eigenvalue on diagonal
      eigenvalues.push({ real: A[i][i], imag: 0 });
      i++;
    } else {
      // 2x2 block - compute complex eigenvalue pair
      const a = A[i][i];
      const b = A[i][i + 1];
      const c = A[i + 1][i];
      const d = A[i + 1][i + 1];

      const trace = a + d;
      const det = a * d - b * c;
      const discriminant = trace * trace - 4 * det;

      if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        eigenvalues.push({ real: (trace + sqrtDisc) / 2, imag: 0 });
        eigenvalues.push({ real: (trace - sqrtDisc) / 2, imag: 0 });
      } else {
        const realPart = trace / 2;
        const imagPart = Math.sqrt(-discriminant) / 2;
        eigenvalues.push({ real: realPart, imag: imagPart });
        eigenvalues.push({ real: realPart, imag: -imagPart });
      }
      i += 2;
    }
  }

  // Sort by magnitude descending
  eigenvalues.sort((a, b) => {
    const magA = Math.sqrt(a.real * a.real + a.imag * a.imag);
    const magB = Math.sqrt(b.real * b.real + b.imag * b.imag);
    return magB - magA;
  });

  return eigenvalues;
}

/**
 * QR decomposition using modified Gram-Schmidt.
 */
function qrDecomposition(A: number[][]): { Q: number[][]; R: number[][] } {
  const n = A.length;
  const Q: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const R: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  // Copy columns of A
  const columns: number[][] = [];
  for (let j = 0; j < n; j++) {
    columns.push(A.map(row => row[j]));
  }

  for (let j = 0; j < n; j++) {
    let v = [...columns[j]];

    // Subtract projections onto previous q vectors
    for (let i = 0; i < j; i++) {
      const qi = Q.map(row => row[i]);
      R[i][j] = dotProduct(qi, columns[j]);
      v = v.map((val, idx) => val - R[i][j] * qi[idx]);
    }

    R[j][j] = Math.sqrt(dotProduct(v, v));

    if (R[j][j] > 1e-10) {
      for (let i = 0; i < n; i++) {
        Q[i][j] = v[i] / R[j][j];
      }
    } else {
      // Handle zero column
      for (let i = 0; i < n; i++) {
        Q[i][j] = i === j ? 1 : 0;
      }
    }
  }

  return { Q, R };
}

/**
 * Matrix multiplication helper.
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        result[i][j] += A[i][k] * B[k][j];
      }
    }
  }

  return result;
}

/**
 * Dot product of two vectors.
 */
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Get the magnitude of the second-largest eigenvalue.
 * This determines how fast the matrix product converges to uniform.
 */
export function secondLargestEigenvalueMagnitude(matrix: number[][]): number {
  const eigs = eigenvaluesSorted(matrix);
  if (eigs.length < 2) return 0;
  const e = eigs[1];
  return Math.sqrt(e.real * e.real + e.imag * e.imag);
}

/**
 * Get the magnitude of the largest eigenvalue.
 */
export function largestEigenvalueMagnitude(matrix: number[][]): number {
  const eigs = eigenvaluesSorted(matrix);
  if (eigs.length < 1) return 0;
  const e = eigs[0];
  return Math.sqrt(e.real * e.real + e.imag * e.imag);
}

/**
 * Compute Frobenius norm distance from the uniform averaging matrix.
 * Shows how much "information mixing" has occurred.
 */
export function distanceFromUniform(matrix: number[][]): number {
  const n = matrix.length;
  const uniformVal = 1 / n;
  let sumSq = 0;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const diff = matrix[i][j] - uniformVal;
      sumSq += diff * diff;
    }
  }

  return Math.sqrt(sumSq);
}

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
    largestEigenvalueMag: largestEigenvalueMagnitude(matrix),
    secondEigenvalueMag: secondLargestEigenvalueMagnitude(matrix),
    distanceFromUniform: distanceFromUniform(matrix),
  };
}
