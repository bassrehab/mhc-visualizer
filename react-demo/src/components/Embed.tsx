/**
 * Embeddable version of the Manifold Dial visualization.
 * Simplified for embedding in blog posts.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GainPlot } from './GainPlot';
import { runComparison } from '../lib/simulation';
import type { SimulationConfig, ComparisonResult } from '../lib/types';

interface EmbedProps {
  initialConfig?: Partial<SimulationConfig>;
  showControls?: boolean;
  height?: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  depth: 64,
  n: 4,
  sinkhornIters: 20,
  seed: 42,
};

export function Embed({
  initialConfig = {},
  showControls = true,
  height = 300,
}: EmbedProps) {
  const [config, setConfig] = useState<SimulationConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [results, setResults] = useState<ComparisonResult | null>(null);

  // Run simulation
  const runSimulation = useCallback(() => {
    const newResults = runComparison(
      config.depth,
      config.n,
      config.sinkhornIters,
      config.seed
    );
    setResults(newResults);
  }, [config]);

  // Run on mount and config change
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

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

  return (
    <div className="manifold-dial-embed bg-white rounded-lg shadow-sm p-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          The Manifold Dial
        </h3>
        <p className="text-sm text-gray-600">
          HC vs mHC Signal Propagation
        </p>
      </div>

      {showControls && (
        <div className="mb-4 space-y-3">
          {/* Sinkhorn Iterations slider */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Sinkhorn Iterations: {config.sinkhornIters}
            </label>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={config.sinkhornIters}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  sinkhornIters: parseInt(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0 (HC-like)</span>
              <span>20+ (mHC stable)</span>
            </div>
          </div>

          {/* Depth slider */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Network Depth: {config.depth}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="10"
              value={config.depth}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  depth: parseInt(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      <GainPlot data={plotData} height={height} />

      <div className="mt-3 text-xs text-gray-500 text-center space-y-1">
        <div>
          <a
            href="https://arxiv.org/abs/2512.24880"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Based on DeepSeek's mHC paper
          </a>
        </div>
        <div>
          Built by{' '}
          <a
            href="https://github.com/bassrehab/mhc-visualizer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Subhadip Mitra
          </a>
        </div>
      </div>
    </div>
  );
}

// Export for standalone use
export default Embed;
