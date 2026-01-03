/**
 * Line chart showing composite gain vs layer depth.
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

interface GainPlotProps {
  data: {
    baseline: number[];
    hc: number[];
    mhc: number[];
  };
  height?: number;
  selectedLayer?: number;
  onLayerSelect?: (layer: number) => void;
}

export function GainPlot({
  data,
  height = 400,
  selectedLayer,
  onLayerSelect,
}: GainPlotProps) {
  // Transform data for Recharts
  const chartData = data.baseline.map((_, index) => ({
    layer: index,
    baseline: data.baseline[index],
    hc: data.hc[index],
    mhc: data.mhc[index],
  }));

  // Custom tooltip formatter
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Composite Forward Gain vs Layer Depth
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={(value) =>
              value >= 1000 ? value.toExponential(0) : value.toFixed(1)
            }
            label={{
              value: 'Composite Forward Gain (log)',
              angle: -90,
              position: 'insideLeft',
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
          <Legend
            formatter={(value: string) => LABELS[value as Method]}
          />

          {selectedLayer !== undefined && (
            <ReferenceLine
              x={selectedLayer}
              stroke="#9ca3af"
              strokeDasharray="3 3"
            />
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
