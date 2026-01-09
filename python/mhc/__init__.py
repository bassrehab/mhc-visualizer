"""
mHC (Manifold-Constrained Hyper-Connections) visualization library.

This package provides tools for demonstrating the stability properties
of mHC residual connections compared to unconstrained HC and baseline methods.

Modules:
- sinkhorn: Sinkhorn-Knopp projection onto doubly stochastic matrices
- metrics: Stability metrics (forward_gain, backward_gain, spectral_norm)
- simulation: Deep network signal propagation simulation
- torch_module: PyTorch implementation for use in neural networks

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

from .sinkhorn import sinkhorn_knopp, is_doubly_stochastic, projection_error
from .metrics import (
    forward_gain,
    backward_gain,
    spectral_norm,
    compute_all_metrics,
    eigenvalues_sorted,
    second_largest_eigenvalue_magnitude,
    distance_from_uniform,
)
from .simulation import generate_residual_matrix, simulate_depth, run_comparison

# PyTorch modules (optional import - requires torch)
try:
    from .torch_module import SinkhornKnopp, mHCResidual, mHCBlock, create_mhc_mlp
except ImportError:
    pass  # torch not installed

__version__ = "0.1.0"