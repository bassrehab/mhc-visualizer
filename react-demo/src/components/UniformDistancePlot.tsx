/**
 * Line chart showing distance from uniform matrix vs layer depth.
 * This visualizes how close the composite matrix is to the uniform averaging matrix (1/n).
 * Directly answers: "Do the last layers only have the average of the first layer?"
 */

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

interface UniformDistancePlotProps {
  data: {
    baseline: number[];
    hc: number[];
    mhc: number[];
  };
  n: number; // matrix size, needed to show max distance
  height?: number;
  selectedLayer?: number;
  onLayerSelect?: (layer: number) => void;
}

export function UniformDistancePlot({
  data,
  n,
  height = 250,
  selectedLayer,
  onLayerSelect,
}: UniformDistancePlotProps) {
  // Transform data for Recharts
  const chartData = data.baseline.map((_, index) => ({
    layer: index,
    baseline: data.baseline[index],
    hc: data.hc[index],
    mhc: data.mhc[index],
  }));

  // Max distance for identity matrix is sqrt(n - 1)
  const maxDistance = Math.sqrt(n - 1);

  // Custom tooltip formatter
  const formatValue = (value: number) => {
    if (value < 0.001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Distance from Uniform Matrix
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Shows convergence to averaging matrix (1/n). Distance = 0 means complete uniformity.
      </p>
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
            domain={[1e-10, 'auto']}
            tickFormatter={(value) =>
              value >= 1 ? value.toFixed(1) : value.toExponential(0)
            }
            label={{
              value: '||M - U||_F (log scale)',
              angle: -90,
              position: 'insideLeft',
              dx: -35,
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (typeof value === 'number') {
                return [formatValue(value), LABELS[name as Method]];
              }
              return [String(value), name];
            }}
            labelFormatter={(label) => `Layer ${label}`}
          />
          <Legend formatter={(value: string) => LABELS[value as Method]} />

          {/* Reference line at identity distance */}
          <ReferenceLine
            y={maxDistance}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: `Identity (${maxDistance.toFixed(2)})`,
              position: 'right',
              fill: '#6b7280',
              fontSize: 10,
            }}
          />

          {/* Reference line showing "nearly uniform" threshold */}
          <ReferenceLine
            y={0.1}
            stroke="#fbbf24"
            strokeDasharray="3 3"
            label={{
              value: 'Nearly uniform',
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
