"""
Basic usage example for mHC PyTorch module.

This example demonstrates:
1. How to wrap a simple MLP with mHC residual connections
2. A tiny training loop on synthetic data
3. Verifying the module works correctly

Run this script:
    cd python
    python examples/basic_usage.py
"""

import torch
import torch.nn as nn
import torch.optim as optim
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from mhc.torch_module import mHCBlock, mHCResidual, create_mhc_mlp, SinkhornKnopp


def demo_sinkhorn():
    """Demonstrate Sinkhorn-Knopp projection."""
    print("=" * 60)
    print("Demo 1: Sinkhorn-Knopp Projection")
    print("=" * 60)

    sinkhorn = SinkhornKnopp(iterations=20)

    # Random matrix
    M = torch.randn(4, 4)
    print(f"\nInput matrix (random):")
    print(f"  Row sums: {M.sum(dim=1).tolist()}")
    print(f"  Col sums: {M.sum(dim=0).tolist()}")

    # Project to doubly stochastic
    P = sinkhorn(M)
    print(f"\nAfter Sinkhorn projection:")
    print(f"  Row sums: {[f'{x:.4f}' for x in P.sum(dim=1).tolist()]}")
    print(f"  Col sums: {[f'{x:.4f}' for x in P.sum(dim=0).tolist()]}")
    print(f"  All entries >= 0: {(P >= 0).all().item()}")


def demo_mhc_block():
    """Demonstrate wrapping a layer with mHC."""
    print("\n" + "=" * 60)
    print("Demo 2: Wrapping a Linear Layer with mHC")
    print("=" * 60)

    # Create a simple linear layer
    linear = nn.Linear(64, 64)

    # Wrap it with mHC residuals
    mhc_layer = mHCBlock(linear, dim=64, n_streams=4)

    # Input: (batch=8, n_streams=4, dim=64)
    x = torch.randn(8, 4, 64)

    # Forward pass
    y = mhc_layer(x)

    print(f"\nInput shape:  {x.shape}")
    print(f"Output shape: {y.shape}")
    print(f"Shapes match: {x.shape == y.shape}")


def demo_training():
    """Demonstrate a tiny training loop with mHC MLP."""
    print("\n" + "=" * 60)
    print("Demo 3: Training an mHC MLP on Synthetic Data")
    print("=" * 60)

    # Hyperparameters
    dim = 32
    n_streams = 4
    n_layers = 3
    batch_size = 16
    n_steps = 100

    # Create mHC MLP
    model = create_mhc_mlp(dim=dim, n_layers=n_layers, n_streams=n_streams)

    # Count parameters
    n_params = sum(p.numel() for p in model.parameters())
    print(f"\nModel: {n_layers}-layer mHC MLP")
    print(f"Parameters: {n_params:,}")

    # Optimizer
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    # Training loop
    print(f"\nTraining for {n_steps} steps...")
    losses = []

    for step in range(n_steps):
        # Generate synthetic data: x -> 2x (simple target)
        x = torch.randn(batch_size, n_streams, dim)
        target = 2 * x  # Simple target function

        # Forward pass
        optimizer.zero_grad()
        output = model(x)

        # Compute loss
        loss = criterion(output, target)
        losses.append(loss.item())

        # Backward pass
        loss.backward()
        optimizer.step()

        if (step + 1) % 20 == 0:
            print(f"  Step {step+1:3d}: Loss = {loss.item():.6f}")

    print(f"\nInitial loss: {losses[0]:.6f}")
    print(f"Final loss:   {losses[-1]:.6f}")
    print(f"Improvement:  {losses[0]/losses[-1]:.1f}x")


def demo_gradient_stability():
    """Show that mHC maintains stable gradients."""
    print("\n" + "=" * 60)
    print("Demo 4: Gradient Stability Check")
    print("=" * 60)

    # Deep mHC MLP
    model = create_mhc_mlp(dim=32, n_layers=10, n_streams=4)

    # Forward pass
    x = torch.randn(8, 4, 32, requires_grad=True)
    y = model(x)

    # Backward pass
    loss = y.sum()
    loss.backward()

    # Check gradient statistics
    grad_norm = x.grad.norm().item()
    grad_max = x.grad.abs().max().item()
    grad_mean = x.grad.abs().mean().item()

    print(f"\nWith 10-layer mHC MLP:")
    print(f"  Input gradient norm: {grad_norm:.4f}")
    print(f"  Input gradient max:  {grad_max:.4f}")
    print(f"  Input gradient mean: {grad_mean:.4f}")
    print(f"  Gradients are finite: {torch.isfinite(x.grad).all().item()}")


def main():
    """Run all demos."""
    print("\n" + "#" * 60)
    print("# mHC PyTorch Module - Basic Usage Examples")
    print("#" * 60)

    demo_sinkhorn()
    demo_mhc_block()
    demo_training()
    demo_gradient_stability()

    print("\n" + "=" * 60)
    print("All demos completed successfully!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
