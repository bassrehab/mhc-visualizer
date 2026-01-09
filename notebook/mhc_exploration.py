import marimo

__generated_with = "0.18.4"
app = marimo.App(width="medium", app_title="Mhc Exploration")

with app.setup(hide_code=True):
    import sys
    import subprocess
    import tempfile
    from pathlib import Path

    # Try local path first, clone repo if not available
    _local_python = Path(__file__).parent.parent / "python"
    if _local_python.exists():
        sys.path.insert(0, str(_local_python))
    else:
        # Clone repo to temp directory for standalone usage
        _tmp_dir = Path(tempfile.gettempdir()) / "mhc-visualizer"
        if not (_tmp_dir / "python").exists():
            subprocess.run(
                [
                    "git",
                    "clone",
                    "--depth=1",
                    "https://github.com/bassrehab/mhc-visualizer.git",
                    str(_tmp_dir),
                ],
                check=True,
                capture_output=True,
            )
        sys.path.insert(0, str(_tmp_dir / "python"))

    import numpy as np
    import altair as alt
    import pandas as pd
    import marimo as mo

    from mhc import run_comparison, sinkhorn_knopp, compute_all_metrics


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    # Exploring Manifold-Constrained Hyper-Connections (mHC)

    [![Open in molab](https://marimo.io/molab-shield.svg)](https://molab.marimo.io/github/bassrehab/mhc-visualizer/blob/main/notebook/mhc_exploration.py)

    This interactive notebook demonstrates the key insight from DeepSeek's mHC paper:
    **unconstrained residual mixing matrices cause signal explosion in deep networks,
    while doubly stochastic constraints keep signals bounded.**

    Use the controls below to explore how Sinkhorn iterations affect stability!

    **Paper:** https://arxiv.org/abs/2512.24880

    **Author:** Subhadip Mitra (contact@subhadipmitra.com)

    **Repository:** https://github.com/bassrehab/mhc-visualizer
    """)
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## The Sinkhorn-Knopp Algorithm

    The Sinkhorn-Knopp algorithm projects any positive matrix onto the set of **doubly stochastic matrices** - matrices where all rows and columns sum to 1.

    ### Why Doubly Stochastic?

    Doubly stochastic matrices have a crucial property: **they are closed under multiplication**. This means:
    - If A and B are doubly stochastic, then A @ B is also doubly stochastic
    - The spectral norm is bounded: ||A|| <= 1
    - Signal propagation stays bounded even through many layers

    ### The Algorithm

    Starting from any positive matrix, we alternate between:
    1. Normalizing rows to sum to 1
    2. Normalizing columns to sum to 1

    This converges to a doubly stochastic matrix!
    """)
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Interactive Controls

    Adjust the parameters below to see how they affect signal propagation stability.
    """)
    return


@app.cell(hide_code=True)
def _(active_config):
    # Sliders initialized from active config (re-created when preset clicked)
    sinkhorn_slider = mo.ui.slider(
        start=0,
        stop=30,
        value=active_config["k"],
        step=1,
        label="Sinkhorn Iterations (k)",
        show_value=True,
    )
    depth_slider = mo.ui.slider(
        start=10,
        stop=200,
        value=active_config["depth"],
        step=10,
        label="Network Depth",
        show_value=True,
    )
    n_dropdown = mo.ui.dropdown(
        options={"2": 2, "4": 4, "8": 8},
        value=active_config["n"],
        label="Number of Streams (n)",
    )
    seed_input = mo.ui.number(
        value=active_config["seed"], start=0, stop=10000, label="Random Seed"
    )

    controls = mo.hstack(
        [sinkhorn_slider, depth_slider, n_dropdown, seed_input], justify="start", gap=2
    )
    controls
    return depth_slider, n_dropdown, seed_input, sinkhorn_slider


@app.cell(hide_code=True)
def _():
    # Preset buttons - clicking triggers re-run with new defaults
    preset_default = mo.ui.run_button(label="Default")
    preset_explosion = mo.ui.run_button(label="HC Explosion (k=0)")
    preset_minimal = mo.ui.run_button(label="Minimal Projection (k=5)")
    preset_deep = mo.ui.run_button(label="Deep Network (200)")
    randomize_btn = mo.ui.run_button(label="Randomize Seed")

    presets = mo.hstack(
        [preset_default, preset_explosion, preset_minimal, preset_deep, randomize_btn],
        justify="start",
        gap=1,
    )
    presets
    return preset_deep, preset_explosion, preset_minimal, randomize_btn


@app.cell
def _(depth_slider, n_dropdown, seed_input, sinkhorn_slider):
    # Run the simulation with current parameters
    results = run_comparison(
        depth=depth_slider.value,
        n=int(n_dropdown.value),
        sinkhorn_iters=sinkhorn_slider.value,
        seed=seed_input.value,
    )
    return (results,)


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Signal Propagation: The Explosion Problem

    The real issue isn't single-layer behavior - it's what happens when we **compose many layers**.

    In a deep network, the effective transformation is:
    $$H_{composite} = H_L \cdot H_{L-1} \cdot ... \cdot H_1$$

    Watch the chart below: **HC (red) explodes exponentially, while mHC (blue) stays bounded!**
    """)
    return


@app.cell
def _(base_chart):
    mo.ui.altair_chart(base_chart)
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Eigenvalue Decay: The Convergence Story

    The commenter on Reddit raised an excellent point: while doubly stochastic matrices keep gains bounded,
    their eigenvalues (except λ₁=1) get pushed toward zero with each multiplication.

    This means the composite matrix converges toward the **uniform averaging matrix** (all entries = 1/n).

    The chart below shows |λ₂| (second-largest eigenvalue magnitude) - this controls the rate of convergence:
    - **Baseline (Identity)**: |λ₂| = 1 forever (no mixing)
    - **HC**: Eigenvalues can grow unboundedly
    - **mHC**: |λ₂| < 1, decays toward 0 (gradual averaging)

    This is the fundamental tradeoff: **bounded gains** (stable training) vs **information mixing** (convergence to uniformity).
    """)
    return


@app.cell
def _(eigenvalue_chart):
    mo.ui.altair_chart(eigenvalue_chart)
    return


@app.cell
def _(depth_slider, results):
    # Build eigenvalue DataFrame from results
    eig_data = []
    for method in ["baseline", "hc", "mhc"]:
        for _i, _m in enumerate(results[method]["composite"]):
            eig_data.append(
                {
                    "layer": _i + 1,
                    "eigenvalue": _m["second_eigenvalue_mag"],
                    "method": method.upper() if method != "mhc" else "mHC",
                }
            )
    eig_df = pd.DataFrame(eig_data)

    # Altair chart with log scale for eigenvalues
    eigenvalue_chart = (
        alt.Chart(eig_df)
        .mark_line(strokeWidth=2.5)
        .encode(
            x=alt.X(
                "layer:Q",
                title="Layer Depth",
                scale=alt.Scale(domain=[1, depth_slider.value]),
            ),
            y=alt.Y(
                "eigenvalue:Q",
                scale=alt.Scale(type="log", domain=[1e-16, 10]),
                title="|λ₂| Second Eigenvalue (log scale)",
            ),
            color=alt.Color(
                "method:N",
                scale=alt.Scale(
                    domain=["BASELINE", "HC", "mHC"],
                    range=["#10b981", "#ef4444", "#3b82f6"],
                ),
                legend=alt.Legend(title="Method"),
            ),
        )
        .properties(
            width=700,
            height=300,
            title="Eigenvalue Decay: Convergence to Uniform Matrix",
        )
    )
    return eig_df, eigenvalue_chart


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Stability Metrics

    The table below shows metrics at the selected layer:
    - **Forward Gain**: Maximum row sum (worst-case signal amplification)
    - **Backward Gain**: Maximum column sum (gradient flow)
    - **Spectral Norm**: Largest singular value (operator norm)

    For doubly stochastic matrices (mHC), all these should be close to 1!
    """)
    return


@app.cell(hide_code=True)
def _(layer_selector, results):
    layer_idx = layer_selector.value - 1

    baseline_m = results["baseline"]["composite"][layer_idx]
    hc_m = results["hc"]["composite"][layer_idx]
    mhc_m = results["mhc"]["composite"][layer_idx]

    def _format_gain(g):
        if g > 1000:
            return f"{g:.2e}"
        return f"{g:.4f}"

    def _status_badge(g):
        if g < 2:
            return mo.md(f"**{_format_gain(g)}** :green_circle:")
        elif g < 10:
            return mo.md(f"**{_format_gain(g)}** :yellow_circle:")
        else:
            return mo.md(f"**{_format_gain(g)}** :red_circle:")

    metrics_md = mo.md(f"""
    ### Metrics at Layer {layer_selector.value}

    | Metric | Baseline | HC (Unconstrained) | mHC (Sinkhorn) |
    |--------|----------|-------------------|----------------|
    | Forward Gain | {_format_gain(baseline_m["forward_gain"])} | {_format_gain(hc_m["forward_gain"])} | {_format_gain(mhc_m["forward_gain"])} |
    | Backward Gain | {_format_gain(baseline_m["backward_gain"])} | {_format_gain(hc_m["backward_gain"])} | {_format_gain(mhc_m["backward_gain"])} |
    | Spectral Norm | {_format_gain(baseline_m["spectral_norm"])} | {_format_gain(hc_m["spectral_norm"])} | {_format_gain(mhc_m["spectral_norm"])} |
    | \|λ₁\| (largest) | {_format_gain(baseline_m["largest_eigenvalue_mag"])} | {_format_gain(hc_m["largest_eigenvalue_mag"])} | {_format_gain(mhc_m["largest_eigenvalue_mag"])} |
    | \|λ₂\| (2nd) | {_format_gain(baseline_m["second_eigenvalue_mag"])} | {_format_gain(hc_m["second_eigenvalue_mag"])} | {_format_gain(mhc_m["second_eigenvalue_mag"])} |
    | Row Sum Dev | {baseline_m["row_sum_max_dev"]:.2e} | {hc_m["row_sum_max_dev"]:.2e} | {mhc_m["row_sum_max_dev"]:.2e} |
    | Col Sum Dev | {baseline_m["col_sum_max_dev"]:.2e} | {hc_m["col_sum_max_dev"]:.2e} | {mhc_m["col_sum_max_dev"]:.2e} |
    """)

    metrics_md
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Matrix Visualization

    Compare a sample residual mixing matrix before and after Sinkhorn projection.

    - **HC (left)**: Random matrix with arbitrary row/column sums
    - **mHC (right)**: Sinkhorn-projected doubly stochastic matrix (all rows and columns sum to 1)
    """)
    return


@app.cell
def _(heatmaps):
    heatmaps
    return


@app.cell(hide_code=True)
def _(hc_sample, mhc_sample):
    # Show row and column sums
    hc_row_sums = hc_sample.sum(axis=1)
    hc_col_sums = hc_sample.sum(axis=0)
    mhc_row_sums = mhc_sample.sum(axis=1)
    mhc_col_sums = mhc_sample.sum(axis=0)

    sums_md = mo.md(f"""
    **Row/Column Sums:**

    | | HC | mHC |
    |---|---|---|
    | Row Sums | {np.array2string(hc_row_sums, precision=2)} | {np.array2string(mhc_row_sums, precision=3)} |
    | Col Sums | {np.array2string(hc_col_sums, precision=2)} | {np.array2string(mhc_col_sums, precision=3)} |
    | Max Row Dev from 1 | {np.abs(hc_row_sums - 1).max():.4f} | {np.abs(mhc_row_sums - 1).max():.2e} |
    | Max Col Dev from 1 | {np.abs(hc_col_sums - 1).max():.4f} | {np.abs(mhc_col_sums - 1).max():.2e} |

    Notice how mHC row/column sums are all ~1.0 (doubly stochastic)!
    """)
    sums_md
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## The Manifold Dial: Varying Sinkhorn Iterations

    Watch how the matrix transforms as we increase iterations:
    - **k=0**: Raw random matrix (same as HC) - unconstrained
    - **k=1-5**: Partial projection, rapid stabilization
    - **k=10-20**: Fully doubly stochastic
    """)
    return


@app.cell(hide_code=True)
def _(seed_input):
    # Show progression of Sinkhorn iterations
    iters_to_show = [0, 1, 2, 5, 10, 20]
    rng_dial = np.random.default_rng(seed_input.value)
    dial_base = rng_dial.standard_normal((4, 4))

    dial_data = []
    for k in iters_to_show:
        if k == 0:
            mat = dial_base  # Raw random matrix (same as HC)
        else:
            mat = sinkhorn_knopp(dial_base, iterations=k)

        for _i in range(4):
            for _j in range(4):
                dial_data.append(
                    {
                        "row": str(_i),
                        "col": str(_j),
                        "value": float(mat[_i, _j]),
                        "k": f"k={k}",
                    }
                )

    dial_df = pd.DataFrame(dial_data)

    dial_chart = (
        alt.Chart(dial_df)
        .mark_rect()
        .encode(
            x=alt.X("col:O", title=None, axis=alt.Axis(labels=False)),
            y=alt.Y("row:O", title=None, axis=alt.Axis(labels=False)),
            color=alt.Color(
                "value:Q", scale=alt.Scale(scheme="blues", domain=[0, 0.6]), legend=None
            ),
            tooltip=["row", "col", alt.Tooltip("value:Q", format=".3f")],
        )
        .properties(width=100, height=100)
        .facet(
            column=alt.Column("k:N", title="Sinkhorn Iterations", sort=iters_to_show)
        )
        .properties(
            title="The Manifold Dial: Sinkhorn Iterations Transform Random to Doubly Stochastic"
        )
    )

    dial_chart
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Why Does This Work?

    ### The Mathematics of Stability

    Doubly stochastic matrices have three key properties:

    1. **Spectral norm <= 1**: The matrix doesn't amplify signals
    2. **Closed under multiplication**: Products remain doubly stochastic
    3. **Convex combinations of permutations**: Acts like a weighted average (Birkhoff-von Neumann theorem)

    When you multiply many doubly stochastic matrices together, the result stays bounded because each multiplication is **non-expansive**.

    In contrast, unconstrained matrices compound their gains exponentially:
    - If each matrix has gain 1.1, after 64 layers: $1.1^{64} \approx 300$
    - If each matrix has gain 1.5, after 64 layers: $1.5^{64} \approx 10^{11}$!
    """)
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ## Key Takeaways

    1. **HC (Hyper-Connections)** use unconstrained residual mixing matrices
       - Each layer's matrix can have arbitrary row/column sums
       - Over many layers, these compound into **exponential explosion**

    2. **mHC (Manifold-Constrained HC)** projects matrices onto the Birkhoff polytope
       - Uses Sinkhorn-Knopp to ensure doubly stochastic matrices
       - Spectral norm <= 1, so products stay bounded - **stable signals**

    3. **The "Manifold Dial"** is the Sinkhorn iteration count (k)
       - k=0: Unconstrained (like HC) - unstable
       - k>=10: Well-projected - stable
       - Sweet spot around k=20 for most applications

    4. **Eigenvalue Decay: The Tradeoff**
       - For doubly stochastic matrices, |λ₂| < 1 (except permutations)
       - Products push |λ₂|^L → 0, converging to uniform averaging matrix
       - This is the price of stability: gradual information mixing
       - In practice, residual connections (`x + αHx + layer_output`) mitigate this

    ---

    **Try it yourself!** Modify the sliders above and re-run to explore:
    - Different depths (try 100, 200)
    - Different matrix sizes (n=2, 8)
    - Different random seeds

    **Interactive Demo:** https://github.com/bassrehab/mhc-visualizer
    """)
    return


@app.cell(hide_code=True)
def _():
    mo.md(r"""
    ---

    ## References

    - **mHC Paper**: [DeepSeek-AI, arXiv:2512.24880](https://arxiv.org/abs/2512.24880)
    - **Sinkhorn-Knopp Algorithm**: Sinkhorn & Knopp (1967)
    - **This Notebook**: [github.com/bassrehab/mhc-visualizer](https://github.com/bassrehab/mhc-visualizer)

    **Author**: Subhadip Mitra (contact@subhadipmitra.com)
    """)
    return


@app.cell
def _(depth_slider, results):
    # Build DataFrame from results
    data = []
    for method in ["baseline", "hc", "mhc"]:
        for _i, _m in enumerate(results[method]["composite"]):
            data.append(
                {
                    "layer": _i + 1,
                    "gain": _m["forward_gain"],
                    "method": method.upper() if method != "mhc" else "mHC",
                }
            )
    df = pd.DataFrame(data)

    # Layer selector
    layer_selector = mo.ui.slider(
        start=1,
        stop=depth_slider.value,
        value=depth_slider.value,
        label="Inspect Layer",
        show_value=True,
    )

    # Altair chart with log scale
    base_chart = (
        alt.Chart(df)
        .mark_line(strokeWidth=2.5)
        .encode(
            x=alt.X(
                "layer:Q",
                title="Layer Depth",
                scale=alt.Scale(domain=[1, depth_slider.value]),
            ),
            y=alt.Y(
                "gain:Q",
                scale=alt.Scale(type="log"),
                title="Composite Forward Gain (log scale)",
            ),
            color=alt.Color(
                "method:N",
                scale=alt.Scale(
                    domain=["BASELINE", "HC", "mHC"],
                    range=["#10b981", "#ef4444", "#3b82f6"],
                ),
                legend=alt.Legend(title="Method"),
            ),
            strokeDash=alt.StrokeDash(
                "method:N",
                scale=alt.Scale(
                    domain=["BASELINE", "HC", "mHC"], range=[[1, 0], [1, 0], [1, 0]]
                ),
                legend=None,
            ),
        )
        .properties(
            width=700,
            height=400,
            title="The Manifold Dial: HC Explosion vs mHC Stability",
        )
    )
    return base_chart, layer_selector


@app.cell
def _(n_dropdown, seed_input, sinkhorn_slider):
    n_val = int(n_dropdown.value)
    rng = np.random.default_rng(seed_input.value)

    # Generate matrices
    base_matrix = rng.standard_normal((n_val, n_val))
    hc_sample = base_matrix  # Unconstrained
    mhc_sample = sinkhorn_knopp(base_matrix, iterations=sinkhorn_slider.value)

    # Create heatmap data
    def matrix_to_df(mat, name):
        rows = []
        for i in range(mat.shape[0]):
            for j in range(mat.shape[1]):
                rows.append(
                    {
                        "row": str(i),
                        "col": str(j),
                        "value": float(mat[i, j]),
                        "type": name,
                    }
                )
        return pd.DataFrame(rows)

    hc_df = matrix_to_df(hc_sample, "HC")
    mhc_df = matrix_to_df(mhc_sample, "mHC")

    # HC heatmap - use diverging colorscale
    hc_heatmap = (
        alt.Chart(hc_df)
        .mark_rect()
        .encode(
            x=alt.X("col:O", title="Column", axis=alt.Axis(labelAngle=0)),
            y=alt.Y("row:O", title="Row"),
            color=alt.Color(
                "value:Q",
                scale=alt.Scale(scheme="redblue", domain=[-2, 2]),
                legend=alt.Legend(title="Value"),
            ),
            tooltip=["row", "col", alt.Tooltip("value:Q", format=".3f")],
        )
        .properties(width=180, height=180, title=f"HC (Random)")
    )

    # mHC heatmap - use sequential colorscale
    mhc_heatmap = (
        alt.Chart(mhc_df)
        .mark_rect()
        .encode(
            x=alt.X("col:O", title="Column", axis=alt.Axis(labelAngle=0)),
            y=alt.Y("row:O", title="Row"),
            color=alt.Color(
                "value:Q",
                scale=alt.Scale(scheme="blues", domain=[0, 0.6]),
                legend=alt.Legend(title="Value"),
            ),
            tooltip=["row", "col", alt.Tooltip("value:Q", format=".3f")],
        )
        .properties(width=180, height=180, title=f"mHC (k={sinkhorn_slider.value})")
    )

    heatmaps = hc_heatmap | mhc_heatmap
    return hc_sample, heatmaps, mhc_sample


@app.cell(hide_code=True)
def _(preset_deep, preset_explosion, preset_minimal, randomize_btn):
    # Active config based on which preset button was clicked
    if preset_explosion.value:
        active_config = {"k": 0, "depth": 64, "n": "4", "seed": 42}
    elif preset_minimal.value:
        active_config = {"k": 5, "depth": 64, "n": "4", "seed": 42}
    elif preset_deep.value:
        active_config = {"k": 20, "depth": 200, "n": "4", "seed": 42}
    elif randomize_btn.value:
        active_config = {
            "k": 20,
            "depth": 64,
            "n": "4",
            "seed": int(np.random.randint(0, 10000)),
        }
    else:  # default (including preset_default.value)
        active_config = {"k": 20, "depth": 64, "n": "4", "seed": 42}
    return (active_config,)


if __name__ == "__main__":
    app.run()
