"""
Simulation engine for deep network signal propagation.

This module simulates how signals propagate through deep residual networks
with different residual mixing strategies:

- baseline: Identity matrices (no mixing, standard residual connections)
- hc: Random unconstrained matrices (Hyper-Connections)
- mhc: Sinkhorn-projected doubly stochastic matrices (Manifold-Constrained HC)

Key insight from the mHC paper:
The COMPOSITE mapping (product of all layer matrices H_L @ H_{L-1} @ ... @ H_0)
is what matters for signal propagation:
- For HC: composite gains explode exponentially (3000x+ at depth 64)
- For mHC: composite gains stay bounded (~1.6x at depth 64)

This happens because doubly stochastic matrices are closed under multiplication.

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

import numpy as np
from typing import Dict, Literal, Optional

from .sinkhorn import sinkhorn_knopp
from .metrics import compute_all_metrics


def generate_residual_matrix(
    n: int,
    method: Literal['baseline', 'hc', 'mhc'],
    sinkhorn_iters: int = 20,
    rng: Optional[np.random.Generator] = None
) -> np.ndarray:
    """
    Generate a residual mixing matrix.

    Args:
        n: Size of square matrix (number of streams)
        method: One of:
            - 'baseline': Identity matrix (no mixing)
            - 'hc': Random matrix with N(0, 1) entries
            - 'mhc': Random matrix projected to doubly stochastic via Sinkhorn
        sinkhorn_iters: Number of Sinkhorn iterations for mHC method
        rng: Random number generator for reproducibility

    Returns:
        Residual mixing matrix of shape (n, n)

    Example:
        >>> rng = np.random.default_rng(42)
        >>> M = generate_residual_matrix(4, 'mhc', sinkhorn_iters=20, rng=rng)
        >>> M.shape
        (4, 4)
    """
    if rng is None:
        rng = np.random.default_rng()

    if method == 'baseline':
        return np.eye(n)

    # Generate random matrix for HC and mHC
    M = rng.standard_normal((n, n))

    if method == 'hc':
        return M

    if method == 'mhc':
        # At k=0, return raw random matrix (same as HC) to show explosive behavior
        # At k>0, apply Sinkhorn projection to show transition to stability
        if sinkhorn_iters == 0:
            return M
        return sinkhorn_knopp(M, iterations=sinkhorn_iters)

    raise ValueError(f"Unknown method: {method}. Expected 'baseline', 'hc', or 'mhc'.")


def simulate_depth(
    depth: int,
    n: int,
    method: Literal['baseline', 'hc', 'mhc'],
    sinkhorn_iters: int = 20,
    seed: int = 42
) -> Dict:
    """
    Simulate signal propagation through a deep residual network.

    This function generates `depth` residual matrices and computes both
    per-layer metrics and cumulative composite metrics at each depth.

    The composite mapping at layer l is:
        Composite(l) = H_l @ H_{l-1} @ ... @ H_1 @ H_0

    This represents the total transformation applied to signals from
    the input to layer l.

    Args:
        depth: Number of layers to simulate
        n: Matrix size (number of streams in multi-stream residual)
        method: Residual mixing strategy ('baseline', 'hc', or 'mhc')
        sinkhorn_iters: Number of Sinkhorn iterations for mHC
        seed: Random seed for reproducibility

    Returns:
        Dict containing:
        - 'method': str - the method used
        - 'depth': int - number of layers
        - 'n': int - matrix size
        - 'sinkhorn_iters': int - Sinkhorn iterations used
        - 'seed': int - random seed used
        - 'per_layer': list of dicts with metrics for each layer's matrix
        - 'composite': list of dicts with metrics for composite at each depth

    Example:
        >>> result = simulate_depth(64, 4, 'mhc', seed=42)
        >>> result['composite'][-1]['forward_gain'] < 5
        True
    """
    rng = np.random.default_rng(seed)

    per_layer = []
    composite_metrics = []

    composite = np.eye(n)  # Start with identity

    for layer_idx in range(depth):
        # Generate this layer's residual matrix
        H = generate_residual_matrix(n, method, sinkhorn_iters, rng)

        # Store per-layer metrics
        per_layer.append({
            'layer': layer_idx,
            **compute_all_metrics(H)
        })

        # Update composite: multiply from the left
        # Composite(l) = H_l @ Composite(l-1) = H_l @ H_{l-1} @ ... @ H_0
        composite = H @ composite

        # Store composite metrics at this depth
        composite_metrics.append({
            'upto_layer': layer_idx,
            **compute_all_metrics(composite)
        })

    return {
        'method': method,
        'depth': depth,
        'n': n,
        'sinkhorn_iters': sinkhorn_iters,
        'seed': seed,
        'per_layer': per_layer,
        'composite': composite_metrics,
    }


def run_comparison(
    depth: int = 64,
    n: int = 4,
    sinkhorn_iters: int = 20,
    seed: int = 42
) -> Dict:
    """
    Run simulation for all three methods and return comparison.

    This is the main entry point for generating comparison data.
    It runs simulate_depth for baseline, HC, and mHC with the same
    parameters, making direct comparison possible.

    Args:
        depth: Number of layers to simulate
        n: Matrix size (number of streams)
        sinkhorn_iters: Number of Sinkhorn iterations for mHC
        seed: Random seed (same seed used for all methods for fair comparison)

    Returns:
        Dict with keys 'baseline', 'hc', 'mhc' containing simulation results

    Example:
        >>> results = run_comparison(depth=64, n=4, seed=42)
        >>> # Baseline should stay at 1
        >>> results['baseline']['composite'][-1]['forward_gain']
        1.0
        >>> # HC should explode
        >>> results['hc']['composite'][-1]['forward_gain'] > 10
        True
        >>> # mHC should stay bounded
        >>> results['mhc']['composite'][-1]['forward_gain'] < 5
        True
    """
    return {
        'baseline': simulate_depth(depth, n, 'baseline', sinkhorn_iters, seed),
        'hc': simulate_depth(depth, n, 'hc', sinkhorn_iters, seed),
        'mhc': simulate_depth(depth, n, 'mhc', sinkhorn_iters, seed),
    }


if __name__ == "__main__":
    # Quick demo when run directly
    print("Running mHC simulation comparison...")
    print("=" * 50)

    results = run_comparison(depth=64, n=4, seed=42)

    for method in ['baseline', 'hc', 'mhc']:
        final_composite = results[method]['composite'][-1]
        print(f"\n{method.upper()}:")
        print(f"  Final composite forward_gain:  {final_composite['forward_gain']:.4f}")
        print(f"  Final composite backward_gain: {final_composite['backward_gain']:.4f}")
        print(f"  Final composite spectral_norm: {final_composite['spectral_norm']:.4f}")
