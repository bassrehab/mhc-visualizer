/**
 * Interactive controls for the simulation.
 */

import { Play, RotateCcw } from 'lucide-react';
import type { SimulationConfig } from '../lib/types';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onRun: () => void;
  isComputing: boolean;
}

const PRESETS = [
  { name: 'Default', depth: 64, n: 4, sinkhornIters: 20, seed: 42 },
  { name: 'HC Explosion', depth: 64, n: 4, sinkhornIters: 0, seed: 42 },
  { name: 'Minimal Projection', depth: 64, n: 4, sinkhornIters: 5, seed: 42 },
  { name: 'Deep Network', depth: 200, n: 4, sinkhornIters: 20, seed: 42 },
];

export function Controls({
  config,
  onChange,
  onRun,
  isComputing,
}: ControlsProps) {
  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    onChange({
      depth: preset.depth,
      n: preset.n,
      sinkhornIters: preset.sinkhornIters,
      seed: preset.seed,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Controls</h3>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sinkhorn Iterations (The Manifold Dial) */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          <span className="text-blue-600 font-semibold">Sinkhorn Iterations</span>
          <span className="text-gray-500 ml-1">(The Manifold Dial)</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={config.sinkhornIters}
            onChange={(e) =>
              onChange({ ...config, sinkhornIters: parseInt(e.target.value) })
            }
            className="flex-1"
          />
          <span className="text-lg font-mono w-8 text-right">
            {config.sinkhornIters}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          0 = unconstrained (HC-like), 20+ = doubly stochastic (mHC)
        </p>
      </div>

      {/* Network Depth */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Network Depth
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="10"
            max="200"
            step="10"
            value={config.depth}
            onChange={(e) =>
              onChange({ ...config, depth: parseInt(e.target.value) })
            }
            className="flex-1"
          />
          <span className="text-lg font-mono w-12 text-right">
            {config.depth}
          </span>
        </div>
      </div>

      {/* Number of Streams */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Number of Streams
        </label>
        <select
          value={config.n}
          onChange={(e) => onChange({ ...config, n: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={2}>2</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </div>

      {/* Random Seed */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Random Seed
        </label>
        <input
          type="number"
          value={config.seed}
          onChange={(e) =>
            onChange({ ...config, seed: parseInt(e.target.value) || 42 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Run Button */}
      <div className="flex gap-2">
        <button
          onClick={onRun}
          disabled={isComputing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {isComputing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Computing...
            </>
          ) : (
            <>
              <Play size={16} />
              Run Simulation
            </>
          )}
        </button>
        <button
          onClick={() => handlePreset(PRESETS[0])}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
