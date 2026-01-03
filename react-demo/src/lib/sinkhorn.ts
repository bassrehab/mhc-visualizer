/**
 * Sinkhorn-Knopp algorithm for projecting matrices onto doubly stochastic matrices.
 * TypeScript port of the Python implementation.
 */

/**
 * Seeded PRNG using Mulberry32 algorithm.
 * Returns a function that generates random numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate normal random number using Box-Muller transform.
 */
export function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Create an identity matrix.
 */
export function eye(n: number): number[][] {
  return Array(n)
    .fill(null)
    .map((_, i) =>
      Array(n)
        .fill(0)
        .map((_, j) => (i === j ? 1 : 0))
    );
}

/**
 * Create a random matrix with normal entries.
 */
export function randomMatrix(n: number, rng: () => number): number[][] {
  return Array(n)
    .fill(null)
    .map(() =>
      Array(n)
        .fill(null)
        .map(() => normalRandom(rng))
    );
}

/**
 * Matrix multiplication.
 */
export function matmul(A: number[][], B: number[][]): number[][] {
  const n = A.length;
  const m = B[0].length;
  const k = B.length;

  const C: number[][] = Array(n)
    .fill(null)
    .map(() => Array(m).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let l = 0; l < k; l++) {
        sum += A[i][l] * B[l][j];
      }
      C[i][j] = sum;
    }
  }

  return C;
}

/**
 * Find the maximum value in a matrix.
 */
function matrixMax(matrix: number[][]): number {
  let max = -Infinity;
  for (const row of matrix) {
    for (const val of row) {
      if (val > max) max = val;
    }
  }
  return max;
}

/**
 * Apply Sinkhorn-Knopp algorithm to project matrix onto doubly stochastic matrices.
 */
export function sinkhornKnopp(
  matrix: number[][],
  iterations: number = 20
): number[][] {
  const n = matrix.length;
  const eps = 1e-8;

  // Find max for numerical stability
  const maxVal = matrixMax(matrix);

  // Exponentiate (with stability)
  let P: number[][] = matrix.map((row) =>
    row.map((val) => Math.exp(val - maxVal))
  );

  for (let iter = 0; iter < iterations; iter++) {
    // Row normalization
    for (let i = 0; i < n; i++) {
      const rowSum = P[i].reduce((a, b) => a + b, 0);
      const divisor = Math.max(rowSum, eps);
      for (let j = 0; j < n; j++) {
        P[i][j] /= divisor;
      }
    }

    // Column normalization
    for (let j = 0; j < n; j++) {
      let colSum = 0;
      for (let i = 0; i < n; i++) {
        colSum += P[i][j];
      }
      const divisor = Math.max(colSum, eps);
      for (let i = 0; i < n; i++) {
        P[i][j] /= divisor;
      }
    }
  }

  return P;
}
