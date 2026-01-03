"""
PyTorch implementation of mHC (Manifold-Constrained Hyper-Connections).

This module provides differentiable implementations that can be used
directly in neural network training:

- SinkhornKnopp: Differentiable projection onto doubly stochastic matrices
- mHCResidual: Complete mHC residual connection module
- mHCBlock: Wrapper to add mHC residuals to any layer

Usage:
    # Wrap any layer with mHC residuals
    layer = nn.Linear(256, 256)
    mhc_layer = mHCBlock(layer, dim=256, n_streams=4)

    # Forward pass
    x = torch.randn(32, 4, 256)  # (batch, n_streams, dim)
    output = mhc_layer(x)

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

import torch
import torch.nn as nn
from typing import Optional


class SinkhornKnopp(nn.Module):
    """
    Differentiable Sinkhorn-Knopp projection onto doubly stochastic matrices.

    Projects any matrix onto the Birkhoff polytope (set of doubly stochastic
    matrices) using alternating row and column normalization.

    Args:
        iterations: Number of normalization iterations (default: 20)
        eps: Small value for numerical stability (default: 1e-8)

    Example:
        >>> sinkhorn = SinkhornKnopp(iterations=20)
        >>> M = torch.randn(4, 4)
        >>> P = sinkhorn(M)
        >>> P.sum(dim=1)  # Should be close to 1
        tensor([1., 1., 1., 1.])
    """

    def __init__(self, iterations: int = 20, eps: float = 1e-8):
        super().__init__()
        self.iterations = iterations
        self.eps = eps

    def forward(self, matrix: torch.Tensor) -> torch.Tensor:
        """
        Project matrix onto doubly stochastic matrices.

        Args:
            matrix: Input tensor of shape (..., n, n)

        Returns:
            Approximately doubly stochastic matrix of same shape
        """
        # Subtract max for numerical stability before exp
        P = torch.exp(matrix - matrix.max())

        for _ in range(self.iterations):
            # Row normalization
            P = P / (P.sum(dim=-1, keepdim=True) + self.eps)
            # Column normalization
            P = P / (P.sum(dim=-2, keepdim=True) + self.eps)

        return P


class mHCResidual(nn.Module):
    """
    Manifold-Constrained Hyper-Connection residual module.

    Implements the mHC residual connection with learnable mixing matrices
    that are projected onto doubly stochastic matrices via Sinkhorn-Knopp.

    The module maintains multiple "streams" of hidden states and mixes them
    using constrained matrices to ensure stable signal propagation.

    Args:
        dim: Hidden dimension size
        n_streams: Number of parallel streams (default: 4)
        sinkhorn_iters: Number of Sinkhorn iterations (default: 20)

    Example:
        >>> mhc = mHCResidual(dim=256, n_streams=4)
        >>> x = torch.randn(32, 4, 256)  # (batch, n_streams, dim)
        >>> layer_out = torch.randn(32, 256)  # Output from layer F
        >>> y = mhc(x, layer_out)
        >>> y.shape
        torch.Size([32, 4, 256])
    """

    def __init__(
        self,
        dim: int,
        n_streams: int = 4,
        sinkhorn_iters: int = 20
    ):
        super().__init__()
        self.dim = dim
        self.n_streams = n_streams

        # Sinkhorn projection
        self.sinkhorn = SinkhornKnopp(iterations=sinkhorn_iters)

        # Learnable mixing matrices (before projection)
        # H_res: mixing within residual streams
        self.H_res = nn.Parameter(torch.randn(n_streams, n_streams) * 0.01)

        # H_pre: aggregating streams to layer input (1 x n_streams)
        self.H_pre = nn.Parameter(torch.ones(1, n_streams) / n_streams)

        # H_post: distributing layer output to streams (n_streams x 1)
        self.H_post = nn.Parameter(torch.ones(n_streams, 1) / n_streams)

        # Learnable gating scalars (initialized small for stable training)
        self.alpha_res = nn.Parameter(torch.tensor(0.01))
        self.alpha_pre = nn.Parameter(torch.tensor(0.01))
        self.alpha_post = nn.Parameter(torch.tensor(0.01))

        # Bias terms
        self.bias_res = nn.Parameter(torch.zeros(n_streams, dim))
        self.bias_post = nn.Parameter(torch.zeros(n_streams, dim))

    def forward(
        self,
        x: torch.Tensor,
        layer_output: torch.Tensor
    ) -> torch.Tensor:
        """
        Apply mHC residual connection.

        Args:
            x: Input hidden state, shape (batch, n_streams, dim)
            layer_output: Output from layer function F, shape (batch, dim)

        Returns:
            Updated hidden state, shape (batch, n_streams, dim)
        """
        batch_size = x.shape[0]

        # Project H_res onto doubly stochastic
        H_res_proj = self.sinkhorn(self.H_res)

        # Mix residual streams: (batch, n_streams, dim) @ (n_streams, n_streams)^T
        # Equivalent to applying H_res to each position
        x_mixed = torch.einsum('bsd,rs->brd', x, H_res_proj)

        # Scale by alpha_res and add bias
        x_mixed = self.alpha_res * x_mixed + self.bias_res

        # Distribute layer output to streams
        # layer_output: (batch, dim) -> (batch, n_streams, dim)
        layer_contrib = layer_output.unsqueeze(1) * self.H_post  # (batch, n_streams, dim)
        layer_contrib = self.alpha_post * layer_contrib + self.bias_post

        # Combine: residual mixing + layer contribution + original input
        output = x + x_mixed + layer_contrib

        return output

    def get_aggregated_input(self, x: torch.Tensor) -> torch.Tensor:
        """
        Aggregate multi-stream input for layer function.

        Args:
            x: Hidden state, shape (batch, n_streams, dim)

        Returns:
            Aggregated input for layer, shape (batch, dim)
        """
        # Weighted sum across streams
        # H_pre: (1, n_streams), x: (batch, n_streams, dim)
        aggregated = torch.einsum('bsd,os->bd', x, self.H_pre.abs())
        return self.alpha_pre * aggregated


class mHCBlock(nn.Module):
    """
    Wrapper that adds mHC residual connections to any layer.

    This is the main interface for using mHC in your models. It wraps
    any PyTorch module (e.g., Linear, Attention) with mHC residuals.

    Args:
        layer: The layer module to wrap (e.g., nn.Linear)
        dim: Hidden dimension
        n_streams: Number of parallel streams (default: 4)
        sinkhorn_iters: Number of Sinkhorn iterations (default: 20)

    Example:
        >>> # Wrap a linear layer
        >>> layer = nn.Linear(256, 256)
        >>> block = mHCBlock(layer, dim=256, n_streams=4)
        >>>
        >>> # Input has shape (batch, n_streams, dim)
        >>> x = torch.randn(32, 4, 256)
        >>> output = block(x)
        >>> output.shape
        torch.Size([32, 4, 256])
    """

    def __init__(
        self,
        layer: nn.Module,
        dim: int,
        n_streams: int = 4,
        sinkhorn_iters: int = 20
    ):
        super().__init__()
        self.layer = layer
        self.mhc = mHCResidual(dim, n_streams, sinkhorn_iters)
        self.n_streams = n_streams

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass with mHC residual.

        Args:
            x: Input tensor, shape (batch, n_streams, dim)

        Returns:
            Output tensor, shape (batch, n_streams, dim)
        """
        # Aggregate streams for layer input
        layer_input = self.mhc.get_aggregated_input(x)

        # Apply the wrapped layer
        layer_output = self.layer(layer_input)

        # Apply mHC residual
        output = self.mhc(x, layer_output)

        return output


def create_mhc_mlp(
    dim: int,
    n_layers: int,
    n_streams: int = 4,
    sinkhorn_iters: int = 20
) -> nn.Sequential:
    """
    Create an MLP with mHC residual connections.

    Convenience function to create a multi-layer perceptron where
    each layer is wrapped with mHC residuals. All layers maintain
    the same dimension for mHC stream compatibility.

    Args:
        dim: Hidden dimension (constant throughout)
        n_layers: Number of mHC blocks
        n_streams: Number of mHC streams
        sinkhorn_iters: Sinkhorn iterations

    Returns:
        nn.Sequential module with mHC blocks

    Example:
        >>> mlp = create_mhc_mlp(dim=256, n_layers=4)
        >>> x = torch.randn(32, 4, 256)  # (batch, n_streams, dim)
        >>> y = mlp(x)
        >>> y.shape
        torch.Size([32, 4, 256])
    """
    layers = []

    for i in range(n_layers):
        layer = nn.Linear(dim, dim)
        layers.append(mHCBlock(layer, dim, n_streams, sinkhorn_iters))
        if i < n_layers - 1:
            layers.append(nn.GELU())

    return nn.Sequential(*layers)
