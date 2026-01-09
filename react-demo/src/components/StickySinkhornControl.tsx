/**
 * Compact sticky control bar that appears when scrolling past main controls.
 * Shows the Sinkhorn slider - the key "Manifold Dial" control.
 */

import { Play, Pause } from 'lucide-react';

interface StickySinkhornControlProps {
  value: number;
  onChange: (value: number) => void;
  isVisible: boolean;
  // Placeholder for Phase 3 animation
  isPlaying?: boolean;
  onPlayToggle?: () => void;
}

export function StickySinkhornControl({
  value,
  onChange,
  isVisible,
  isPlaying = false,
  onPlayToggle,
}: StickySinkhornControlProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200 transition-transform duration-200">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Sinkhorn k=
        </span>

        {/* Play button placeholder for Phase 3 */}
        {onPlayToggle && (
          <button
            onClick={onPlayToggle}
            className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
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
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 max-w-md"
        />

        <span className="font-mono text-lg font-semibold text-blue-600 w-8 text-right">
          {value}
        </span>

        <span className="text-xs text-gray-500 hidden sm:block">
          {value === 0
            ? 'HC (unstable)'
            : value < 5
            ? 'Partial'
            : value < 15
            ? 'Stabilizing'
            : 'mHC (stable)'}
        </span>
      </div>
    </div>
  );
}
