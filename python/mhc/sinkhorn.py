"""
Sinkhorn-Knopp algorithm for projecting matrices onto doubly stochastic matrices.

A doubly stochastic matrix has:
- All entries >= 0
- All rows sum to 1
- All columns sum to 1

The Sinkhorn-Knopp algorithm projects any matrix onto this set by:
1. Exponentiating the matrix to make all entries positive
2. Alternating row and column normalization until convergence

Mathematical background:
The set of doubly stochastic matrices forms the Birkhoff polytope. Sinkhorn-Knopp
finds the unique doubly stochastic matrix of the form D1 * exp(M) * D2 where
D1 and D2 are diagonal matrices with positive entries.

Key property for mHC: The product of doubly stochastic matrices is also
doubly stochastic (closure under multiplication), which bounds composite gains.

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

import numpy as np


def sinkhorn_knopp(matrix: np.ndarray, iterations: int = 20, eps: float = 1e-8) -> np.ndarray:
    """
    Project a matrix onto the set of doubly stochastic matrices.

    Algorithm:
    1. P = exp(matrix - max(matrix)) for numerical stability
    2. For each iteration:
       a. Normalize rows: P[i,:] = P[i,:] / sum(P[i,:])
       b. Normalize columns: P[:,j] = P[:,j] / sum(P[:,j])
    3. Return P

    Args:
        matrix: Input matrix of shape (n, n). Can have any real values.
        iterations: Number of normalization iterations. 20 is typically
                   sufficient for 1e-3 accuracy.
        eps: Small value for numerical stability to prevent division by zero.

    Returns:
        Approximately doubly stochastic matrix of shape (n, n) where:
        - All entries are >= 0
        - All row sums are approximately 1
        - All column sums are approximately 1

    Example:
        >>> M = np.random.randn(4, 4)
        >>> P = sinkhorn_knopp(M, iterations=20)
        >>> np.allclose(P.sum(axis=1), 1, atol=1e-3)
        True
        >>> np.allclose(P.sum(axis=0), 1, atol=1e-3)
        True
    """
    # Subtract max for numerical stability before exponentiation
    # This prevents overflow when matrix has large positive values
    P = np.exp(matrix - matrix.max())

    for _ in range(iterations):
        # Row normalization: make each row sum to 1
        row_sums = P.sum(axis=1, keepdims=True)
        P = P / np.maximum(row_sums, eps)

        # Column normalization: make each column sum to 1
        col_sums = P.sum(axis=0, keepdims=True)
        P = P / np.maximum(col_sums, eps)

    return P


def is_doubly_stochastic(matrix: np.ndarray, tol: float = 1e-3) -> bool:
    """
    Check if a matrix is approximately doubly stochastic.

    A matrix is doubly stochastic if:
    - All entries are non-negative
    - All row sums equal 1
    - All column sums equal 1

    Args:
        matrix: Input matrix to check, shape (n, n)
        tol: Tolerance for row/column sum deviation from 1.0

    Returns:
        True if matrix satisfies all doubly stochastic conditions
        within the given tolerance.

    Example:
        >>> I = np.eye(4)
        >>> is_doubly_stochastic(I)
        True
        >>> M = np.random.randn(4, 4)
        >>> is_doubly_stochastic(M)
        False
    """
    # Check non-negativity
    if matrix.min() < -tol:
        return False

    # Check row sums
    row_sums = matrix.sum(axis=1)
    if not np.allclose(row_sums, 1.0, atol=tol):
        return False

    # Check column sums
    col_sums = matrix.sum(axis=0)
    if not np.allclose(col_sums, 1.0, atol=tol):
        return False

    return True


def projection_error(matrix: np.ndarray) -> dict:
    """
    Compute how far a matrix is from being doubly stochastic.

    This is useful for:
    - Verifying Sinkhorn-Knopp convergence
    - Debugging numerical issues
    - Visualizing the projection process

    Args:
        matrix: Input matrix to analyze, shape (n, n)

    Returns:
        Dict containing:
        - 'row_sum_max_dev': Maximum absolute deviation of any row sum from 1
        - 'col_sum_max_dev': Maximum absolute deviation of any column sum from 1
        - 'min_entry': Minimum entry in the matrix (should be >= 0 for DS)

    Example:
        >>> P = sinkhorn_knopp(np.random.randn(4, 4), iterations=20)
        >>> err = projection_error(P)
        >>> err['row_sum_max_dev'] < 1e-3
        True
    """
    row_sums = matrix.sum(axis=1)
    col_sums = matrix.sum(axis=0)

    return {
        'row_sum_max_dev': float(np.abs(row_sums - 1.0).max()),
        'col_sum_max_dev': float(np.abs(col_sums - 1.0).max()),
        'min_entry': float(matrix.min()),
    }
