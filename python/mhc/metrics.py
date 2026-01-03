"""
Stability metrics for analyzing residual mixing matrices.

These metrics quantify how a matrix amplifies signals during forward/backward
propagation through a neural network layer.

Key insight from the mHC paper:
- Unconstrained matrices (HC) can have unbounded gains, causing signal explosion
- Doubly stochastic matrices (mHC) have all gains bounded by 1, ensuring stability

Metrics:
- forward_gain: Worst-case signal amplification in forward pass (max row sum)
- backward_gain: Worst-case gradient amplification in backward pass (max column sum)
- spectral_norm: Largest singular value (general operator norm)

For doubly stochastic matrices, all three equal exactly 1.

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

import numpy as np


def forward_gain(matrix: np.ndarray) -> float:
    """
    Compute maximum absolute row sum (worst-case signal amplification).

    This is the infinity norm ||M||_∞, which equals the maximum amplification
    a unit input vector can experience in the forward pass:
        ||Mx||_∞ <= ||M||_∞ * ||x||_∞

    For a doubly stochastic matrix, all row sums equal 1, so forward_gain = 1.
    For unconstrained matrices, can be arbitrarily large.

    Args:
        matrix: Input matrix of shape (n, n)

    Returns:
        Maximum absolute row sum: max_i |sum_j M[i,j]|

    Example:
        >>> forward_gain(np.eye(4))
        1.0
        >>> forward_gain(np.ones((4, 4)))
        4.0
    """
    return float(np.abs(matrix.sum(axis=1)).max())


def backward_gain(matrix: np.ndarray) -> float:
    """
    Compute maximum absolute column sum (worst-case gradient amplification).

    This is the one norm ||M||_1, which equals the maximum amplification
    a gradient vector can experience in the backward pass:
        ||M^T g||_1 <= ||M||_1 * ||g||_1

    For a doubly stochastic matrix, all column sums equal 1, so backward_gain = 1.
    For unconstrained matrices, can be arbitrarily large.

    Args:
        matrix: Input matrix of shape (n, n)

    Returns:
        Maximum absolute column sum: max_j |sum_i M[i,j]|

    Example:
        >>> backward_gain(np.eye(4))
        1.0
        >>> backward_gain(np.ones((4, 4)))
        4.0
    """
    return float(np.abs(matrix.sum(axis=0)).max())


def spectral_norm(matrix: np.ndarray, iterations: int = 20) -> float:
    """
    Estimate spectral norm (largest singular value) via power iteration.

    The spectral norm ||M||_2 is the maximum amplification of a unit vector
    in the L2 sense. For any input x with ||x||_2 = 1:
        ||Mx||_2 <= ||M||_2

    For doubly stochastic matrices, spectral_norm <= 1.

    Algorithm (power iteration):
    1. Start with random unit vector v
    2. Iterate: v = M @ v / ||M @ v||
    3. Estimate: ||M @ v|| converges to largest singular value

    Args:
        matrix: Input matrix of shape (n, n)
        iterations: Number of power iterations (20 is usually sufficient)

    Returns:
        Estimated spectral norm (largest singular value)

    Example:
        >>> spectral_norm(np.eye(4))  # doctest: +ELLIPSIS
        1.0...
        >>> spectral_norm(2 * np.eye(4))  # doctest: +ELLIPSIS
        2.0...
    """
    n = matrix.shape[0]

    # Initialize with random unit vector
    rng = np.random.default_rng(42)  # Fixed seed for reproducibility
    v = rng.standard_normal(n)
    v = v / np.linalg.norm(v)

    for _ in range(iterations):
        # Power iteration: v = M @ v, then normalize
        w = matrix @ v
        norm = np.linalg.norm(w)
        if norm < 1e-10:
            return 0.0
        v = w / norm

    # Final estimate: ||M @ v||
    return float(np.linalg.norm(matrix @ v))


def compute_all_metrics(matrix: np.ndarray) -> dict:
    """
    Compute all stability metrics for a matrix.

    This is the main function for analyzing residual mixing matrices.
    It returns all metrics needed to assess training stability.

    Args:
        matrix: Input matrix of shape (n, n)

    Returns:
        Dict containing:
        - spectral_norm: Largest singular value
        - forward_gain: Max absolute row sum
        - backward_gain: Max absolute column sum
        - row_sum_max_dev: Max deviation of row sums from 1
        - col_sum_max_dev: Max deviation of column sums from 1
        - min_entry: Minimum matrix entry

    Example:
        >>> metrics = compute_all_metrics(np.eye(4))
        >>> metrics['forward_gain']
        1.0
        >>> metrics['backward_gain']
        1.0
    """
    row_sums = matrix.sum(axis=1)
    col_sums = matrix.sum(axis=0)

    return {
        'spectral_norm': spectral_norm(matrix),
        'forward_gain': float(np.abs(row_sums).max()),
        'backward_gain': float(np.abs(col_sums).max()),
        'row_sum_max_dev': float(np.abs(row_sums - 1).max()),
        'col_sum_max_dev': float(np.abs(col_sums - 1).max()),
        'min_entry': float(matrix.min()),
    }
