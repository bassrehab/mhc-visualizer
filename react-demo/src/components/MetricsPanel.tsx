/**
 * Display computed metrics in a readable format.
 */

import { COLORS, LABELS, type ComparisonResult, type Method } from '../lib/types';

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
        <div className="flex justify-between">
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
      </div>

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
              }}
              isFinal={isFinal}
            />
          );
        })}
      </div>
    </div>
  );
}
