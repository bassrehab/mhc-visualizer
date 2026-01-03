"""
Tests for PyTorch mHC module.

Tests verify:
1. SinkhornKnopp produces doubly stochastic matrices
2. Gradients flow through all operations
3. mHCResidual and mHCBlock work correctly
4. Initialization produces near-identity behavior
"""

import pytest
import torch
import torch.nn as nn

from mhc.torch_module import SinkhornKnopp, mHCResidual, mHCBlock, create_mhc_mlp


class TestSinkhornKnopp:
    """Tests for differentiable Sinkhorn-Knopp."""

    def test_produces_doubly_stochastic(self):
        """Output should have row and column sums close to 1."""
        sinkhorn = SinkhornKnopp(iterations=20)
        M = torch.randn(4, 4)
        P = sinkhorn(M)

        assert torch.allclose(P.sum(dim=1), torch.ones(4), atol=0.01)
        assert torch.allclose(P.sum(dim=0), torch.ones(4), atol=0.01)

    def test_non_negative_entries(self):
        """Output should have all non-negative entries."""
        sinkhorn = SinkhornKnopp(iterations=20)
        M = torch.randn(4, 4)
        P = sinkhorn(M)

        assert (P >= 0).all()

    def test_differentiable(self):
        """Gradients should flow through Sinkhorn."""
        sinkhorn = SinkhornKnopp(iterations=20)
        M = torch.randn(4, 4, requires_grad=True)
        P = sinkhorn(M)
        loss = P.sum()
        loss.backward()

        assert M.grad is not None
        assert M.grad.shape == M.shape

    def test_batched_input(self):
        """Should work with batched input."""
        sinkhorn = SinkhornKnopp(iterations=20)
        M = torch.randn(8, 4, 4)  # Batch of 8 matrices
        P = sinkhorn(M)

        assert P.shape == (8, 4, 4)
        # Check each matrix in batch
        for i in range(8):
            assert torch.allclose(P[i].sum(dim=1), torch.ones(4), atol=0.01)


class TestMHCResidual:
    """Tests for mHCResidual module."""

    def test_output_shape(self):
        """Output should match input shape."""
        mhc = mHCResidual(dim=64, n_streams=4)
        x = torch.randn(8, 4, 64)
        layer_out = torch.randn(8, 64)
        y = mhc(x, layer_out)

        assert y.shape == x.shape

    def test_gradients_flow(self):
        """Gradients should flow to input and all parameters."""
        mhc = mHCResidual(dim=64, n_streams=4)
        x = torch.randn(8, 4, 64, requires_grad=True)
        layer_out = torch.randn(8, 64, requires_grad=True)

        y = mhc(x, layer_out)
        loss = y.sum()
        loss.backward()

        # Check input gradients
        assert x.grad is not None
        assert layer_out.grad is not None

        # Check parameter gradients
        assert mhc.H_res.grad is not None
        assert mhc.alpha_res.grad is not None

    def test_aggregated_input(self):
        """get_aggregated_input should reduce streams to single vector."""
        mhc = mHCResidual(dim=64, n_streams=4)
        x = torch.randn(8, 4, 64)
        agg = mhc.get_aggregated_input(x)

        assert agg.shape == (8, 64)


class TestMHCBlock:
    """Tests for mHCBlock wrapper."""

    def test_wraps_linear_layer(self):
        """Should correctly wrap a linear layer."""
        layer = nn.Linear(64, 64)
        block = mHCBlock(layer, dim=64, n_streams=4)

        x = torch.randn(8, 4, 64)
        y = block(x)

        assert y.shape == x.shape

    def test_gradients_to_wrapped_layer(self):
        """Gradients should flow to the wrapped layer."""
        layer = nn.Linear(64, 64)
        block = mHCBlock(layer, dim=64, n_streams=4)

        x = torch.randn(8, 4, 64, requires_grad=True)
        y = block(x)
        loss = y.sum()
        loss.backward()

        # Wrapped layer should have gradients
        assert layer.weight.grad is not None
        assert layer.bias.grad is not None


class TestInitialization:
    """Tests for proper initialization."""

    def test_alpha_values_start_small(self):
        """Alpha values should start small (0.01)."""
        mhc = mHCResidual(dim=64, n_streams=4)

        assert mhc.alpha_res.item() == pytest.approx(0.01)
        assert mhc.alpha_pre.item() == pytest.approx(0.01)
        assert mhc.alpha_post.item() == pytest.approx(0.01)

    def test_initial_behavior_near_identity(self):
        """Initial mHC should behave close to identity (small perturbation)."""
        mhc = mHCResidual(dim=64, n_streams=4)
        x = torch.randn(8, 4, 64)
        layer_out = torch.zeros(8, 64)  # Zero layer output

        y = mhc(x, layer_out)

        # With small alphas and zero layer output, y should be close to x
        # (identity + small mixing perturbation)
        diff = (y - x).abs().mean()
        assert diff < 1.0  # Should be relatively small


class TestCreateMHCMLP:
    """Tests for the MLP creation helper."""

    def test_creates_correct_structure(self):
        """Should create an MLP with correct number of blocks."""
        mlp = create_mhc_mlp(dim=64, n_layers=3, n_streams=4)

        x = torch.randn(8, 4, 64)
        y = mlp(x)

        assert y.shape == x.shape

    def test_gradients_flow_through_mlp(self):
        """Gradients should flow through entire MLP."""
        mlp = create_mhc_mlp(dim=64, n_layers=3, n_streams=4)

        x = torch.randn(8, 4, 64, requires_grad=True)
        y = mlp(x)
        loss = y.sum()
        loss.backward()

        assert x.grad is not None
