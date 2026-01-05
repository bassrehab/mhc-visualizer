/**
 * Main orchestrating component for the Manifold Dial visualization.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, Check, Keyboard, Info } from 'lucide-react';
import { Controls } from './Controls';
import { GainPlot } from './GainPlot';
import { MatrixHeatmap } from './MatrixHeatmap';
import { MetricsPanel } from './MetricsPanel';
import { runComparison, getSampleMatrix } from '../lib/simulation';
import { configToUrl, urlToConfig, copyToClipboard } from '../lib/utils';
import type { SimulationConfig, ComparisonResult } from '../lib/types';

const DEFAULT_CONFIG: SimulationConfig = {
  depth: 64,
  n: 4,
  sinkhornIters: 20,
  seed: 42,
};

export function ManifoldDial() {
  // Initialize from URL params if present
  const [config, setConfig] = useState<SimulationConfig>(() =>
    urlToConfig(DEFAULT_CONFIG)
  );
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Ref for debouncing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Run simulation
  const runSimulation = useCallback(() => {
    setIsComputing(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const newResults = runComparison(
        config.depth,
        config.n,
        config.sinkhornIters,
        config.seed
      );
      setResults(newResults);
      setSelectedLayer(config.depth - 1);
      setIsComputing(false);
    }, 10);
  }, [config]);

  // Randomize seed
  const randomizeSeed = useCallback(() => {
    const newSeed = Math.floor(Math.random() * 10000);
    setConfig((c) => ({ ...c, seed: newSeed }));
  }, []);

  // Debounced config change handler
  const handleConfigChange = useCallback((newConfig: SimulationConfig) => {
    setConfig(newConfig);

    // Debounce the URL update (not the simulation)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      // Update URL without triggering navigation
      const url = configToUrl(newConfig);
      window.history.replaceState({}, '', url);
    }, 500);
  }, []);

  // Run on mount
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setConfig((c) => ({
            ...c,
            sinkhornIters: Math.max(0, c.sinkhornIters - 1),
          }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setConfig((c) => ({
            ...c,
            sinkhornIters: Math.min(30, c.sinkhornIters + 1),
          }));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setConfig((c) => ({
            ...c,
            sinkhornIters: Math.min(30, c.sinkhornIters + 5),
          }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setConfig((c) => ({
            ...c,
            sinkhornIters: Math.max(0, c.sinkhornIters - 5),
          }));
          break;
        case ' ':
          e.preventDefault();
          randomizeSeed();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setConfig(DEFAULT_CONFIG);
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp((s) => !s);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [randomizeSeed]);

  // Copy URL handler
  const handleCopyUrl = useCallback(async () => {
    const url = configToUrl(config);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [config]);

  // Prepare plot data
  const plotData = useMemo(() => {
    if (!results) {
      return { baseline: [], hc: [], mhc: [] };
    }

    return {
      baseline: results.baseline.composite.map((c) => c.forwardGain),
      hc: results.hc.composite.map((c) => c.forwardGain),
      mhc: results.mhc.composite.map((c) => c.forwardGain),
    };
  }, [results]);

  // Sample matrices for visualization
  const sampleMatrices = useMemo(() => {
    return {
      hc: getSampleMatrix(config.n, 'hc', config.sinkhornIters, config.seed),
      mhc: getSampleMatrix(config.n, 'mhc', config.sinkhornIters, config.seed),
    };
  }, [config.n, config.sinkhornIters, config.seed]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          The Manifold Dial
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Visualizing mHC Stability: How Sinkhorn Projection Tames Signal Explosion
        </p>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 mt-3">
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Copy shareable URL"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Link size={14} />
                <span>Share</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowKeyboardHelp((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard size={14} />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
          <button
            onClick={() => setShowAbout((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="About"
          >
            <Info size={14} />
            <span className="hidden sm:inline">About</span>
          </button>
        </div>
      </div>

      {/* Keyboard help modal */}
      {showKeyboardHelp && (
        <div className="bg-gray-800 text-white rounded-lg p-4 text-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowKeyboardHelp(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">←/→</kbd> Sinkhorn ±1</div>
            <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">↑/↓</kbd> Sinkhorn ±5</div>
            <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">Space</kbd> Randomize seed</div>
            <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">R</kbd> Reset to defaults</div>
            <div><kbd className="bg-gray-700 px-2 py-0.5 rounded">?</kbd> Toggle this help</div>
          </div>
        </div>
      )}

      {/* About modal */}
      {showAbout && (
        <div className="bg-gray-800 text-white rounded-lg p-4 text-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">About</h3>
            <button
              onClick={() => setShowAbout(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2">
            <p>
              <span className="text-gray-400">Created by:</span>{' '}
              <a
                href="https://github.com/bassrehab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Subhadip Mitra
              </a>
            </p>
            <p>
              <span className="text-gray-400">Source:</span>{' '}
              <a
                href="https://github.com/bassrehab/mhc-visualizer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                github.com/bassrehab/mhc-visualizer
              </a>
            </p>
            <p>
              <span className="text-gray-400">Based on:</span>{' '}
              <a
                href="https://arxiv.org/abs/2512.24880"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                DeepSeek's mHC paper
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1">
          <Controls
            config={config}
            onChange={handleConfigChange}
            onRandomize={randomizeSeed}
            isComputing={isComputing}
          />

          {/* Matrix previews */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Sample Residual Matrices
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <MatrixHeatmap
                matrix={sampleMatrices.hc}
                title="HC (Random)"
                size={120}
              />
              <MatrixHeatmap
                matrix={sampleMatrices.mhc}
                title={`mHC (${config.sinkhornIters} iters)`}
                size={120}
              />
            </div>
          </div>
        </div>

        {/* Chart and metrics */}
        <div className="lg:col-span-2 space-y-6">
          <GainPlot
            data={plotData}
            height={350}
            selectedLayer={selectedLayer}
            onLayerSelect={setSelectedLayer}
          />

          {/* Layer selector */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Selected Layer: {selectedLayer}
            </label>
            <input
              type="range"
              min="0"
              max={config.depth - 1}
              step="1"
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <MetricsPanel results={results} selectedLayer={selectedLayer} />
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-blue-900">What You're Seeing</h3>
        <p className="text-blue-800 text-sm">
          <strong>The key insight:</strong> Standard Hyper-Connections (HC) use
          unconstrained matrices for residual mixing. When signals propagate through
          many layers, the composite mapping explodes exponentially - gains can reach
          10^16 or more at depth 64!
        </p>
        <p className="text-blue-800 text-sm">
          <strong>The solution:</strong> mHC (Manifold-Constrained HC) projects these
          matrices onto <em>doubly stochastic</em> matrices using Sinkhorn-Knopp.
          Because doubly stochastic matrices are closed under multiplication, composite
          gains stay bounded near 1.
        </p>
        <p className="text-blue-800 text-sm">
          <strong>Try it:</strong> Drag the "Sinkhorn Iterations" slider from 0 to 20
          and watch the mHC line transform from explosive behavior to stable behavior!
        </p>
      </div>
    </div>
  );
}
