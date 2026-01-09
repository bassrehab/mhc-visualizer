/**
 * Interactive controls for the simulation.
 */

import { useState, useEffect } from 'react';
import { Shuffle, RotateCcw, Play, Pause, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import type { SimulationConfig } from '../lib/types';

type PlaybackSpeed = 'slow' | 'normal' | 'fast';

interface ControlsProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onRandomize: () => void;
  isComputing: boolean;
  isPlaying?: boolean;
  playbackSpeed?: PlaybackSpeed;
  onPlayToggle?: () => void;
  onSpeedChange?: (speed: PlaybackSpeed) => void;
}

interface Preset {
  name: string;
  description: string;
  depth: number;
  n: number;
  sinkhornIters: number;
  seed: number;
}

const PRESETS: Preset[] = [
  {
    name: 'Default',
    description: 'Stable mHC with standard settings',
    depth: 64,
    n: 4,
    sinkhornIters: 20,
    seed: 42,
  },
  {
    name: 'HC Explosion',
    description: 'Watch gains explode without projection (k=0)',
    depth: 64,
    n: 4,
    sinkhornIters: 0,
    seed: 42,
  },
  {
    name: 'Minimal Projection',
    description: 'Only 5 iterations - partial stability',
    depth: 64,
    n: 4,
    sinkhornIters: 5,
    seed: 42,
  },
  {
    name: 'Deep Network',
    description: '200 layers - stress test stability',
    depth: 200,
    n: 4,
    sinkhornIters: 20,
    seed: 42,
  },
  {
    name: 'Large Matrix',
    description: '8x8 streams - more complex mixing',
    depth: 64,
    n: 8,
    sinkhornIters: 20,
    seed: 42,
  },
];

// Check if two configs match (ignoring seed for preset matching)
function configMatchesPreset(config: SimulationConfig, preset: Preset): boolean {
  return (
    config.depth === preset.depth &&
    config.n === preset.n &&
    config.sinkhornIters === preset.sinkhornIters
  );
}

export function Controls({
  config,
  onChange,
  onRandomize,
  isComputing,
  isPlaying = false,
  playbackSpeed = 'normal',
  onPlayToggle,
  onSpeedChange,
}: ControlsProps) {
  // Mobile collapse state - default collapsed on small screens
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      // Auto-collapse on mobile by default
      if (mobile && !isMobileCollapsed) {
        setIsMobileCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    onChange({
      depth: preset.depth,
      n: preset.n,
      sinkhornIters: preset.sinkhornIters,
      seed: preset.seed,
    });
  };

  // On mobile, show just the Sinkhorn slider when collapsed
  const showCollapsed = isMobile && isMobileCollapsed;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
      {/* Header with collapse toggle for mobile */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Settings size={18} className="text-gray-500" />
          Controls
        </h3>
        {isMobile && (
          <button
            onClick={() => setIsMobileCollapsed(!isMobileCollapsed)}
            className="lg:hidden flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
          >
            {isMobileCollapsed ? (
              <>
                <span>Expand</span>
                <ChevronDown size={16} />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <ChevronUp size={16} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Presets - always visible */}
      <div data-tour="presets">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isActive = configMatchesPreset(config, preset);
            return (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset)}
                title={preset.description}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sinkhorn Iterations (The Manifold Dial) */}
      <div data-tour="sinkhorn-slider">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          <span className="text-blue-600 font-semibold">Sinkhorn Iterations</span>
          <span className="text-gray-500 ml-1">(The Manifold Dial)</span>
        </label>
        <div className="flex items-center gap-2">
          {onPlayToggle && (
            <button
              onClick={onPlayToggle}
              data-tour="play-button"
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isPlaying ? 'Pause animation' : 'Animate 0→30'}
            >
              {isPlaying ? (
                <Pause size={16} className="text-gray-700" />
              ) : (
                <Play size={16} className="text-gray-700" />
              )}
            </button>
          )}
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
        {/* Speed selector */}
        {onSpeedChange && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Speed:</span>
            {(['slow', 'normal', 'fast'] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {speed.charAt(0).toUpperCase() + speed.slice(1)}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          0 = unconstrained (HC-like), 20+ = doubly stochastic (mHC)
        </p>
      </div>

      {/* Advanced controls - hidden when collapsed on mobile */}
      {!showCollapsed && (
        <>
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
        </>
      )}

      {/* Randomize Button - hidden when collapsed */}
      {!showCollapsed && (
        <div className="flex gap-2">
          <button
            onClick={onRandomize}
            disabled={isComputing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            <Shuffle size={16} />
            Randomize Seed
          </button>
          <button
            onClick={() => handlePreset(PRESETS[0])}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
