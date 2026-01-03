"""
Core tests for mHC library.

Test cases verify:
1. Sinkhorn-Knopp produces valid doubly stochastic matrices
2. Metrics are correct for known matrices
3. Simulation shows expected stability behaviors
4. Reproducibility via seeding
"""

import pytest
import numpy as np

from mhc.sinkhorn import sinkhorn_knopp, is_doubly_stochastic, projection_error
from mhc.metrics import forward_gain, backward_gain, spectral_norm, compute_all_metrics
from mhc.simulation import generate_residual_matrix, simulate_depth, run_comparison


class TestSinkhorn:
    """Tests for Sinkhorn-Knopp algorithm."""

    def test_produces_doubly_stochastic(self):
        """Sinkhorn output should have row and column sums close to 1."""
        np.random.seed(42)
        M = np.random.randn(4, 4)
        P = sinkhorn_knopp(M, iterations=20)

        # Row sums should be within 0.01 of 1.0
        assert np.allclose(P.sum(axis=1), 1.0, atol=0.01)
        # Col sums should be within 0.01 of 1.0
        assert np.allclose(P.sum(axis=0), 1.0, atol=0.01)

    def test_preserves_positive_entries(self):
        """Output should have all non-negative entries."""
        np.random.seed(42)
        M = np.random.randn(4, 4)
        P = sinkhorn_knopp(M, iterations=20)

        assert P.min() >= 0

    def test_convergence_with_iterations(self):
        """More iterations should produce better approximation."""
        np.random.seed(42)
        M = np.random.randn(4, 4)

        P_5 = sinkhorn_knopp(M, iterations=5)
        P_20 = sinkhorn_knopp(M, iterations=20)

        err_5 = projection_error(P_5)
        err_20 = projection_error(P_20)

        # More iterations should give smaller or equal error (within floating point tolerance)
        eps = 1e-14  # Account for floating point precision
        assert err_20['row_sum_max_dev'] <= err_5['row_sum_max_dev'] + eps
        assert err_20['col_sum_max_dev'] <= err_5['col_sum_max_dev'] + eps

    def test_identity_is_doubly_stochastic(self):
        """Identity matrix should be recognized as doubly stochastic."""
        I = np.eye(4)
        assert is_doubly_stochastic(I)

    def test_random_is_not_doubly_stochastic(self):
        """Random matrix should not be doubly stochastic."""
        np.random.seed(42)
        M = np.random.randn(4, 4)
        assert not is_doubly_stochastic(M)


class TestMetrics:
    """Tests for stability metrics."""

    def test_identity_has_unit_forward_gain(self):
        """Identity matrix should have forward_gain = 1."""
        I = np.eye(4)
        assert forward_gain(I) == 1.0

    def test_identity_has_unit_backward_gain(self):
        """Identity matrix should have backward_gain = 1."""
        I = np.eye(4)
        assert backward_gain(I) == 1.0

    def test_identity_has_unit_spectral_norm(self):
        """Identity matrix should have spectral_norm = 1."""
        I = np.eye(4)
        assert np.isclose(spectral_norm(I), 1.0, atol=1e-6)

    def test_doubly_stochastic_bounded_forward_gain(self):
        """Doubly stochastic matrix should have forward_gain = 1."""
        np.random.seed(42)
        P = sinkhorn_knopp(np.random.randn(4, 4), iterations=20)
        # Forward gain should be very close to 1 for doubly stochastic
        assert np.isclose(forward_gain(P), 1.0, atol=0.01)

    def test_doubly_stochastic_bounded_backward_gain(self):
        """Doubly stochastic matrix should have backward_gain = 1."""
        np.random.seed(42)
        P = sinkhorn_knopp(np.random.randn(4, 4), iterations=20)
        # Backward gain should be very close to 1 for doubly stochastic
        assert np.isclose(backward_gain(P), 1.0, atol=0.01)

    def test_compute_all_metrics_returns_all_keys(self):
        """compute_all_metrics should return all expected keys."""
        I = np.eye(4)
        metrics = compute_all_metrics(I)

        expected_keys = {
            'spectral_norm', 'forward_gain', 'backward_gain',
            'row_sum_max_dev', 'col_sum_max_dev', 'min_entry'
        }
        assert set(metrics.keys()) == expected_keys


class TestSimulation:
    """Tests for simulation engine."""

    def test_baseline_stays_at_one(self):
        """Baseline (identity) composite should stay at gain 1."""
        result = simulate_depth(64, 4, 'baseline', seed=42)
        final = result['composite'][-1]

        assert final['forward_gain'] == 1.0
        assert final['backward_gain'] == 1.0

    def test_hc_explodes(self):
        """HC composite gain should explode at depth 64."""
        result = simulate_depth(64, 4, 'hc', seed=42)
        final = result['composite'][-1]

        # HC should have gains much greater than 10 (typically 10^10+)
        assert final['forward_gain'] > 10

    def test_mhc_stays_bounded(self):
        """mHC composite gain should stay bounded at depth 64."""
        result = simulate_depth(64, 4, 'mhc', sinkhorn_iters=20, seed=42)
        final = result['composite'][-1]

        # mHC should have gains bounded near 1 (< 5 is conservative)
        assert final['forward_gain'] < 5
        assert final['backward_gain'] < 5

    def test_generate_baseline_is_identity(self):
        """Baseline method should generate identity matrix."""
        M = generate_residual_matrix(4, 'baseline')
        assert np.allclose(M, np.eye(4))

    def test_generate_mhc_is_doubly_stochastic(self):
        """mHC method should generate doubly stochastic matrix."""
        rng = np.random.default_rng(42)
        M = generate_residual_matrix(4, 'mhc', sinkhorn_iters=20, rng=rng)
        assert is_doubly_stochastic(M, tol=0.01)


class TestReproducibility:
    """Tests for reproducibility via seeding."""

    def test_same_seed_same_results(self):
        """Same seed should produce identical results."""
        result1 = simulate_depth(10, 4, 'hc', seed=42)
        result2 = simulate_depth(10, 4, 'hc', seed=42)

        final1 = result1['composite'][-1]['forward_gain']
        final2 = result2['composite'][-1]['forward_gain']

        assert final1 == final2

    def test_different_seed_different_results(self):
        """Different seeds should produce different results."""
        result1 = simulate_depth(10, 4, 'hc', seed=42)
        result2 = simulate_depth(10, 4, 'hc', seed=123)

        final1 = result1['composite'][-1]['forward_gain']
        final2 = result2['composite'][-1]['forward_gain']

        assert final1 != final2

    def test_run_comparison_returns_all_methods(self):
        """run_comparison should return results for all three methods."""
        results = run_comparison(depth=10, n=4, seed=42)

        assert 'baseline' in results
        assert 'hc' in results
        assert 'mhc' in results
