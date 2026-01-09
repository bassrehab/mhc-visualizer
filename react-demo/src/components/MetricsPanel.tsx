/**
 * Display computed metrics in a readable format.
 * Collapsible panel showing summary or full metrics.
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COLORS, LABELS, type ComparisonResult, type Method } from '../lib/types';

const STORAGE_KEY = 'mhc-metrics-expanded';

interface MetricsPanelProps {
  results: ComparisonResult | null;
  selectedLayer: number;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toExponential(2);
  }
  return value.toFixed(4);
}

function StabilityIndicator({ gain }: { gain: number }) {
  if (gain < 2) {
    return <span className="text-green-600">✓ Stable</span>;
  }
  if (gain < 10) {
    return <span className="text-yellow-600">⚠ Warning</span>;
  }
  return <span className="text-red-600">⚠ Unstable</span>;
}

// Spectral gap indicator - larger = faster convergence to uniform
function SpectralGapIndicator({ gap }: { gap: number }) {
  let color: string;
  let label: string;

  if (gap > 0.3) {
    color = 'text-green-600';
    label = 'Fast';
  } else if (gap > 0.1) {
    color = 'text-yellow-600';
    label = 'Moderate';
  } else if (gap > 0) {
    color = 'text-red-600';
    label = 'Slow';
  } else {
    color = 'text-gray-400';
    label = 'None';
  }

  return (
    <span className={`${color} text-xs ml-1`}>({label})</span>
  );
}

// Compact summary card for collapsed view
function SummaryCard({
  method,
  forwardGain,
}: {
  method: Method;
  forwardGain: number;
}) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm p-3 flex items-center justify-between"
      style={{ borderTop: `3px solid ${COLORS[method]}` }}
    >
      <span className="font-medium text-sm" style={{ color: COLORS[method] }}>
        {LABELS[method]}
      </span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">
          {forwardGain >= 1000 ? forwardGain.toExponential(1) : forwardGain.toFixed(2)}
        </span>
        <StabilityIndicator gain={forwardGain} />
      </div>
    </div>
  );
}

function MethodCard({
  method,
  metrics,
  isFinal,
}: {
  method: Method;
  metrics: {
    forwardGain: number;
    backwardGain: number;
    spectralNorm: number;
    rowSumMaxDev: number;
    colSumMaxDev: number;
    largestEigenvalueMag: number;
    secondEigenvalueMag: number;
    distanceFromUniform: number;
  };
  isFinal: boolean;
}) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4"
      style={{ borderTop: `3px solid ${COLORS[method]}` }}
    >
      <h4
        className="font-semibold mb-3"
        style={{ color: COLORS[method] }}
      >
        {LABELS[method]}
      </h4>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Forward Gain:</span>
          <span className="font-mono">{formatNumber(metrics.forwardGain)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Backward Gain:</span>
          <span className="font-mono">{formatNumber(metrics.backwardGain)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Spectral Norm:</span>
          <span className="font-mono">{formatNumber(metrics.spectralNorm)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
          <span className="text-gray-600">|λ₁| (largest):</span>
          <span className="font-mono">{formatNumber(metrics.largestEigenvalueMag)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">|λ₂| (2nd):</span>
          <span className="font-mono">{formatNumber(metrics.secondEigenvalueMag)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Spectral Gap:</span>
          <span className="font-mono">
            {formatNumber(1 - metrics.secondEigenvalueMag)}
            <SpectralGapIndicator gap={1 - metrics.secondEigenvalueMag} />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Dist to Uniform:</span>
          <span className="font-mono">{formatNumber(metrics.distanceFromUniform)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
          <span className="text-gray-600">Row Sum Dev:</span>
          <span className="font-mono">{formatNumber(metrics.rowSumMaxDev)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Col Sum Dev:</span>
          <span className="font-mono">{formatNumber(metrics.colSumMaxDev)}</span>
        </div>
      </div>

      {isFinal && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <StabilityIndicator gain={metrics.forwardGain} />
        </div>
      )}
    </div>
  );
}

export function MetricsPanel({ results, selectedLayer }: MetricsPanelProps) {
  // Initialize from localStorage, default to collapsed (false)
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isExpanded));
  }, [isExpanded]);

  if (!results) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
        Run simulation to see metrics
      </div>
    );
  }

  const methods: Method[] = ['baseline', 'hc', 'mhc'];
  const maxLayer = results.baseline.composite.length - 1;
  const layer = Math.min(selectedLayer, maxLayer);
  const isFinal = layer === maxLayer;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Metrics at Layer {layer}
          {isFinal && <span className="text-gray-500 ml-2">(Final)</span>}
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              <span>Expand</span>
            </>
          )}
        </button>
      </div>

      {isExpanded ? (
        // Full metrics view
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {methods.map((method) => {
            const composite = results[method].composite[layer];
            return (
              <MethodCard
                key={method}
                method={method}
                metrics={{
                  forwardGain: composite.forwardGain,
                  backwardGain: composite.backwardGain,
                  spectralNorm: composite.spectralNorm,
                  rowSumMaxDev: composite.rowSumMaxDev,
                  colSumMaxDev: composite.colSumMaxDev,
                  largestEigenvalueMag: composite.largestEigenvalueMag,
                  secondEigenvalueMag: composite.secondEigenvalueMag,
                  distanceFromUniform: composite.distanceFromUniform,
                }}
                isFinal={isFinal}
              />
            );
          })}
        </div>
      ) : (
        // Collapsed summary view - Forward Gain + Stability only
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {methods.map((method) => {
            const composite = results[method].composite[layer];
            return (
              <SummaryCard
                key={method}
                method={method}
                forwardGain={composite.forwardGain}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
