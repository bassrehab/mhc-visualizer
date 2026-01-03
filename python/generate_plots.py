"""
Generate publication-quality plots for mHC visualization.

Creates three main visualizations:
1. Hero plot: Composite forward gain vs layer depth (log scale)
2. Manifold dial plot: Effect of Sinkhorn iterations on stability
3. Conservation error plot: Row sum deviation vs depth

Output directory: output/

Author: Subhadip Mitra <contact@subhadipmitra.com>
Based on DeepSeek's mHC paper: https://arxiv.org/abs/2512.24880
"""

import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

from mhc.simulation import run_comparison, simulate_depth


# Style configuration
COLORS = {
    'baseline': '#2ecc71',  # Green
    'hc': '#e74c3c',        # Red
    'mhc': '#3498db',       # Blue
}

LABELS = {
    'baseline': 'Baseline (Identity)',
    'hc': 'HC (Unconstrained)',
    'mhc': 'mHC (Doubly Stochastic)',
}

STYLE_CONFIG = {
    'figure.figsize': (10, 6),
    'font.size': 12,
    'axes.titlesize': 14,
    'axes.labelsize': 12,
    'legend.fontsize': 10,
    'figure.dpi': 100,
    'savefig.dpi': 300,
    'axes.spines.top': False,
    'axes.spines.right': False,
}


def setup_output_dir():
    """Create output directory if it doesn't exist."""
    output_dir = Path(__file__).parent / 'output'
    output_dir.mkdir(exist_ok=True)
    return output_dir


def plot_composite_gains(results: dict, output_path: Path = None):
    """
    Create the hero plot comparing composite gains.

    X-axis: Layer depth (0 to depth)
    Y-axis: Composite Forward Gain (log scale)
    Three lines: baseline (flat at 1), hc (explodes), mhc (bounded)
    """
    plt.style.use('seaborn-v0_8-whitegrid')

    with plt.rc_context(STYLE_CONFIG):
        fig, ax = plt.subplots(figsize=(10, 6))

        for method in ['baseline', 'hc', 'mhc']:
            data = results[method]['composite']
            layers = [d['upto_layer'] for d in data]
            gains = [d['forward_gain'] for d in data]

            ax.semilogy(
                layers, gains,
                color=COLORS[method],
                label=LABELS[method],
                linewidth=2.5
            )

        ax.set_xlabel('Layer Depth')
        ax.set_ylabel('Composite Forward Gain')
        ax.set_title('Composite Mapping Gain vs Network Depth')
        ax.legend(loc='upper left')

        # Set reasonable y-axis limits
        ax.set_ylim(bottom=0.1)

        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            print(f"Saved: {output_path}")
        else:
            plt.show()

        plt.close()


def plot_manifold_dial(depth: int = 64, n: int = 4, seed: int = 42, output_path: Path = None):
    """
    Create the manifold dial plot showing effect of Sinkhorn iterations.

    X-axis: Number of Sinkhorn iterations
    Y-axis: Final composite forward gain at given depth
    Shows transition from HC-like (0 iters) to stable mHC (20 iters)
    """
    sinkhorn_iters_list = [0, 1, 2, 5, 10, 15, 20]
    final_gains = []

    for iters in sinkhorn_iters_list:
        if iters == 0:
            # 0 iterations means no projection (HC behavior)
            result = simulate_depth(depth, n, 'hc', sinkhorn_iters=0, seed=seed)
        else:
            result = simulate_depth(depth, n, 'mhc', sinkhorn_iters=iters, seed=seed)
        final_gains.append(result['composite'][-1]['forward_gain'])

    plt.style.use('seaborn-v0_8-whitegrid')

    with plt.rc_context(STYLE_CONFIG):
        fig, ax = plt.subplots(figsize=(8, 5))

        ax.semilogy(
            sinkhorn_iters_list, final_gains,
            color=COLORS['mhc'],
            marker='o',
            markersize=8,
            linewidth=2.5,
            label='mHC composite gain'
        )

        # Add reference line for baseline
        ax.axhline(y=1.0, color=COLORS['baseline'], linestyle='--',
                   linewidth=2, label='Baseline (gain = 1)')

        ax.set_xlabel('Sinkhorn Iterations')
        ax.set_ylabel('Final Composite Forward Gain')
        ax.set_title(f'The Manifold Dial: Stabilization via Sinkhorn Projection\n(depth={depth})')
        ax.legend(loc='upper right')

        ax.set_xticks(sinkhorn_iters_list)

        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            print(f"Saved: {output_path}")
        else:
            plt.show()

        plt.close()


def plot_conservation_error(results: dict, output_path: Path = None):
    """
    Create conservation error plot showing row sum deviation.

    X-axis: Layer depth
    Y-axis: Row sum max deviation from 1
    Shows how well each method preserves the conservation property.
    """
    plt.style.use('seaborn-v0_8-whitegrid')

    with plt.rc_context(STYLE_CONFIG):
        fig, ax = plt.subplots(figsize=(8, 5))

        for method in ['baseline', 'hc', 'mhc']:
            data = results[method]['composite']
            layers = [d['upto_layer'] for d in data]
            deviations = [d['row_sum_max_dev'] for d in data]

            ax.semilogy(
                layers, deviations,
                color=COLORS[method],
                label=LABELS[method],
                linewidth=2
            )

        ax.set_xlabel('Layer Depth')
        ax.set_ylabel('Row Sum Max Deviation')
        ax.set_title('Conservation Error: Deviation from Doubly Stochastic')
        ax.legend(loc='best')

        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=300, bbox_inches='tight')
            print(f"Saved: {output_path}")
        else:
            plt.show()

        plt.close()


def main():
    """Generate all plots."""
    print("Generating mHC visualization plots...")
    print("=" * 50)

    # Setup output directory
    output_dir = setup_output_dir()

    # Run comparison simulation
    print("\nRunning simulation (depth=64, n=4)...")
    results = run_comparison(depth=64, n=4, sinkhorn_iters=20, seed=42)

    # Print summary
    print("\nSimulation results:")
    for method in ['baseline', 'hc', 'mhc']:
        final = results[method]['composite'][-1]
        print(f"  {method.upper()}: forward_gain = {final['forward_gain']:.2e}")

    # Generate plots
    print("\nGenerating plots...")

    # 1. Hero plot
    plot_composite_gains(results, output_dir / 'hero_composite_gain.png')

    # 2. Manifold dial plot
    plot_manifold_dial(depth=64, n=4, seed=42, output_path=output_dir / 'manifold_dial.png')

    # 3. Conservation error plot
    plot_conservation_error(results, output_dir / 'conservation_error.png')

    print("\n" + "=" * 50)
    print("All plots generated successfully!")
    print(f"Output directory: {output_dir}")


if __name__ == "__main__":
    main()
