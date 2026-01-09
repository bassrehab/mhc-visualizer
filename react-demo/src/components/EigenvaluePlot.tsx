/**
 * Line chart showing eigenvalue decay vs layer depth.
 * This visualizes how the second-largest eigenvalue magnitude decreases
 * as matrices are multiplied together, showing convergence to uniformity.
 */

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { COLORS, LABELS, type Method } from '../lib/types';

interface EigenvaluePlotProps {
  data: {
    baseline: { largest: number; second: number }[];
    hc: { largest: number; second: number }[];
    mhc: { largest: number; second: number }[];
  };
  height?: number;
  selectedLayer?: number;
  onLayerSelect?: (layer: number) => void;
}

export function EigenvaluePlot({
  data,
  height = 300,
  selectedLayer,
  onLayerSelect,
}: EigenvaluePlotProps) {
  const [showTheoretical, setShowTheoretical] = useState(true);

  // Get initial mHC |λ₂| for theoretical decay prediction
  const initialLambda2 = data.mhc.length > 0 ? data.mhc[0].second : 0.9;

  // Transform data for Recharts - show second-largest eigenvalue magnitude
  const chartData = data.baseline.map((_, index) => {
    // Theoretical: |λ₂(0)|^L - predicted decay if eigenvalue stayed constant
    const theoretical = Math.pow(initialLambda2, index);

    return {
      layer: index,
      baseline: data.baseline[index].second,
      hc: data.hc[index].second,
      mhc: data.mhc[index].second,
      theoretical: theoretical > 1e-16 ? theoretical : 1e-16, // Clamp for log scale
    };
  });

  // Custom tooltip formatter
  const formatValue = (value: number) => {
    if (value < 0.001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Second-Largest Eigenvalue |λ₂| vs Layer Depth
          </h3>
          <p className="text-sm text-gray-600">
            Shows convergence rate to uniform matrix. Lower |λ₂| = faster averaging.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showTheoretical}
            onChange={(e) => setShowTheoretical(e.target.checked)}
            className="rounded"
          />
          <span>Show |λ₂|<sup>L</sup></span>
        </label>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          onClick={(e) => {
            if (e && e.activeLabel !== undefined && onLayerSelect) {
              onLayerSelect(Number(e.activeLabel));
            }
          }}
        >
          <XAxis
            dataKey="layer"
            label={{
              value: 'Layer Depth',
              position: 'insideBottomRight',
              offset: -5,
            }}
          />
          <YAxis
            scale="log"
            domain={[1e-16, 'auto']}
            tickFormatter={(value) =>
              value >= 1000 ? value.toExponential(0) : value >= 1 ? value.toFixed(1) : value.toExponential(0)
            }
            label={{
              value: '|λ₂| (log scale)',
              angle: -90,
              position: 'insideLeft',
              dx: -35,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (typeof value === 'number') {
                if (name === 'theoretical') {
                  return [formatValue(value), `Predicted (|λ₂|^L)`];
                }
                return [formatValue(value), LABELS[name as Method]];
              }
              return [String(value), name];
            }}
            labelFormatter={(label) => `Layer ${label}`}
          />
          <Legend formatter={(value: string) => LABELS[value as Method]} />

          {/* Reference line at y=1 (no decay) */}
          <ReferenceLine
            y={1}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: 'No decay',
              position: 'right',
              fill: '#6b7280',
              fontSize: 10,
            }}
          />

          {/* Reference line showing where eigenvalue becomes negligible */}
          <ReferenceLine
            y={0.01}
            stroke="#fbbf24"
            strokeDasharray="3 3"
            label={{
              value: '~Uniform',
              position: 'right',
              fill: '#d97706',
              fontSize: 10,
            }}
          />

          {selectedLayer !== undefined && (
            <ReferenceLine x={selectedLayer} stroke="#9ca3af" strokeDasharray="3 3" />
          )}

          <Line
            type="monotone"
            dataKey="baseline"
            stroke={COLORS.baseline}
            strokeWidth={2.5}
            dot={false}
            name="baseline"
          />
          <Line
            type="monotone"
            dataKey="hc"
            stroke={COLORS.hc}
            strokeWidth={2.5}
            dot={false}
            name="hc"
          />
          <Line
            type="monotone"
            dataKey="mhc"
            stroke={COLORS.mhc}
            strokeWidth={2.5}
            dot={false}
            name="mhc"
          />
          {showTheoretical && (
            <Line
              type="monotone"
              dataKey="theoretical"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="theoretical"
              legendType="none"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
