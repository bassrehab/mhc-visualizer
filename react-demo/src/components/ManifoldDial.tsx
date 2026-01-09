/**
 * Main orchestrating component for the Manifold Dial visualization.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, Check, Keyboard, Info, Github } from 'lucide-react';
import { Controls } from './Controls';
import { InsightBanner } from './InsightBanner';
import { StickySinkhornControl } from './StickySinkhornControl';
import { ChartTabs, type ChartTab } from './ChartTabs';
import { GainPlot } from './GainPlot';
import { EigenvaluePlot } from './EigenvaluePlot';
import { UniformDistancePlot } from './UniformDistancePlot';
import { MatrixHeatmap } from './MatrixHeatmap';
import { MetricsPanel } from './MetricsPanel';
import { TourOverlay, TourButton } from './TourOverlay';
import { runComparison, getSampleMatrix } from '../lib/simulation';
import { configToUrl, urlToConfig, urlToTab, copyToClipboard } from '../lib/utils';
import type { SimulationConfig, ComparisonResult } from '../lib/types';

const DEFAULT_CONFIG: SimulationConfig = {
  depth: 64,
  n: 4,
  sinkhornIters: 20,
  seed: 42,
};

const TOUR_COMPLETED_KEY = 'mhc-tour-completed';

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
  const [showStickyControl, setShowStickyControl] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>(() => urlToTab('all'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [isTourActive, setIsTourActive] = useState(false);

  // Refs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controlsRef = useRef<HTMLDivElement>(null);
  const playbackRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

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
      const url = configToUrl(newConfig, activeChartTab);
      window.history.replaceState({}, '', url);
    }, 500);
  }, [activeChartTab]);

  // Handle tab change with URL update
  const handleTabChange = useCallback((tab: ChartTab) => {
    setActiveChartTab(tab);
    const url = configToUrl(config, tab);
    window.history.replaceState({}, '', url);
  }, [config]);

  // Run on mount
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Auto-start tour on first visit
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!hasCompletedTour) {
      // Small delay to let initial render complete
      const timer = setTimeout(() => {
        setIsTourActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Tour handlers
  const handleTourClose = useCallback(() => {
    setIsTourActive(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true'); // Don't show again if skipped
  }, []);

  const handleTourComplete = useCallback(() => {
    setIsTourActive(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  }, []);

  const handleStartTour = useCallback(() => {
    setIsTourActive(true);
  }, []);

  // Show sticky control when Controls scrolls out of view
  useEffect(() => {
    const controlsEl = controlsRef.current;
    if (!controlsEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky when controls are less than 50% visible
        setShowStickyControl(!entry.isIntersecting || entry.intersectionRatio < 0.5);
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(controlsEl);
    return () => observer.disconnect();
  }, []);

  // Playback animation effect
  useEffect(() => {
    if (isPlaying) {
      const speedMs = playbackSpeed === 'slow' ? 500 : playbackSpeed === 'normal' ? 200 : 50;

      playbackRef.current = setInterval(() => {
        setConfig((c) => {
          if (c.sinkhornIters >= 30) {
            // Stop at 30
            setIsPlaying(false);
            return c;
          }
          return { ...c, sinkhornIters: c.sinkhornIters + 1 };
        });
      }, speedMs);

      return () => {
        if (playbackRef.current) {
          clearInterval(playbackRef.current);
        }
      };
    }
  }, [isPlaying, playbackSpeed]);

  // Handle play toggle
  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      // Reset to 0 if at 30, then start
      if (config.sinkhornIters >= 30) {
        setConfig((c) => ({ ...c, sinkhornIters: 0 }));
      }
      setIsPlaying(true);
    }
  }, [isPlaying, config.sinkhornIters]);

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

  // Prepare eigenvalue data
  const eigenvalueData = useMemo(() => {
    if (!results) {
      return {
        baseline: [],
        hc: [],
        mhc: [],
      };
    }

    return {
      baseline: results.baseline.composite.map((c) => ({
        largest: c.largestEigenvalueMag,
        second: c.secondEigenvalueMag,
      })),
      hc: results.hc.composite.map((c) => ({
        largest: c.largestEigenvalueMag,
        second: c.secondEigenvalueMag,
      })),
      mhc: results.mhc.composite.map((c) => ({
        largest: c.largestEigenvalueMag,
        second: c.secondEigenvalueMag,
      })),
    };
  }, [results]);

  // Prepare uniform distance data
  const uniformDistanceData = useMemo(() => {
    if (!results) {
      return { baseline: [], hc: [], mhc: [] };
    }

    return {
      baseline: results.baseline.composite.map((c) => c.distanceFromUniform),
      hc: results.hc.composite.map((c) => c.distanceFromUniform),
      mhc: results.mhc.composite.map((c) => c.distanceFromUniform),
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
      {/* Sticky Sinkhorn control - appears when scrolled */}
      <StickySinkhornControl
        value={config.sinkhornIters}
        onChange={(value) => handleConfigChange({ ...config, sinkhornIters: value })}
        isVisible={showStickyControl}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
      />

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          The Manifold Dial
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Visualizing mHC Stability: How Sinkhorn Projection Tames Signal Explosion
        </p>

        {/* Action buttons */}
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          <a
            href="https://github.com/bassrehab/mhc-visualizer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-800 text-white hover:bg-gray-900 rounded-md transition-colors"
            title="View source on GitHub"
          >
            <Github size={14} />
            <span>GitHub</span>
          </a>
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
          <TourButton onClick={handleStartTour} />
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

      {/* Insight Banner */}
      <InsightBanner
        sinkhornIters={config.sinkhornIters}
        finalGain={results?.mhc.composite[results.mhc.composite.length - 1]?.forwardGain}
      />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1" ref={controlsRef}>
          <Controls
            config={config}
            onChange={handleConfigChange}
            onRandomize={randomizeSeed}
            isComputing={isComputing}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onPlayToggle={handlePlayToggle}
            onSpeedChange={setPlaybackSpeed}
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
          <ChartTabs
            activeTab={activeChartTab}
            onTabChange={handleTabChange}
            gainChart={
              <GainPlot
                data={plotData}
                height={300}
                selectedLayer={selectedLayer}
                onLayerSelect={setSelectedLayer}
              />
            }
            eigenvalueChart={
              <EigenvaluePlot
                data={eigenvalueData}
                height={250}
                selectedLayer={selectedLayer}
                onLayerSelect={setSelectedLayer}
              />
            }
            uniformityChart={
              <UniformDistancePlot
                data={uniformDistanceData}
                n={config.n}
                height={250}
                selectedLayer={selectedLayer}
                onLayerSelect={setSelectedLayer}
              />
            }
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
          <strong>Eigenvalue decay:</strong> The second chart shows how |λ₂| decays with depth.
          For doubly stochastic matrices, |λ₂| &lt; 1, so products converge toward uniformity.
        </p>
        <p className="text-blue-800 text-sm">
          <strong>Distance from uniform:</strong> The third chart directly answers "do we end up
          with just the average?" - it shows the Frobenius distance from the 1/n matrix. For mHC,
          this decreases with depth, showing gradual convergence to uniform averaging.
        </p>
        <p className="text-blue-800 text-sm">
          <strong>Try it:</strong> Drag the "Sinkhorn Iterations" slider from 0 to 20
          and watch the mHC line transform from explosive behavior to stable behavior!
        </p>
      </div>

      {/* Guided tour overlay */}
      <TourOverlay
        isActive={isTourActive}
        onClose={handleTourClose}
        onComplete={handleTourComplete}
      />
    </div>
  );
}
