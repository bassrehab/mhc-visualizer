/**
 * Visual display of a matrix as a colored grid.
 */

import { useMemo, useState } from 'react';

interface MatrixHeatmapProps {
  matrix: number[][];
  title?: string;
  size?: number;
}

export function MatrixHeatmap({
  matrix,
  title,
  size = 200,
}: MatrixHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    i: number;
    j: number;
    value: number;
  } | null>(null);

  const n = matrix.length;
  const cellSize = size / n;

  // Compute statistics
  const stats = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const row of matrix) {
      for (const val of row) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
    }

    const rowSums = matrix.map((row) => row.reduce((a, b) => a + b, 0));
    const colSums: number[] = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        colSums[j] += matrix[i][j];
      }
    }

    return { min, max, rowSums, colSums };
  }, [matrix, n]);

  // Color function for doubly stochastic (sequential: white to blue)
  const getColor = (value: number) => {
    // Normalize to [0, 1] based on expected range for doubly stochastic
    const normalizedVal = Math.max(0, Math.min(1, value));
    const intensity = Math.round(255 * (1 - normalizedVal));
    return `rgb(${intensity}, ${intensity}, 255)`;
  };

  // Color for sum deviation indicator
  const getSumColor = (sum: number) => {
    const dev = Math.abs(sum - 1);
    if (dev < 0.01) return '#10b981'; // Green - good
    if (dev < 0.1) return '#f59e0b'; // Yellow - ok
    return '#ef4444'; // Red - bad
  };

  return (
    <div className="inline-block">
      {title && (
        <h4 className="text-sm font-medium text-gray-700 mb-2">{title}</h4>
      )}

      <div className="flex">
        {/* Main matrix grid */}
        <div
          className="grid border border-gray-300"
          style={{
            gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
            width: size,
            height: size,
          }}
        >
          {matrix.map((row, i) =>
            row.map((val, j) => (
              <div
                key={`${i}-${j}`}
                className="border border-gray-200 cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: getColor(val),
                  width: cellSize,
                  height: cellSize,
                }}
                onMouseEnter={() => setHoveredCell({ i, j, value: val })}
                onMouseLeave={() => setHoveredCell(null)}
              />
            ))
          )}
        </div>

        {/* Row sums on right */}
        <div className="flex flex-col ml-1">
          {stats.rowSums.map((sum, i) => (
            <div
              key={`row-${i}`}
              className="text-xs flex items-center justify-center"
              style={{
                height: cellSize,
                width: 24,
                color: getSumColor(sum),
              }}
              title={`Row ${i} sum: ${sum.toFixed(3)}`}
            >
              {sum.toFixed(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Column sums on bottom */}
      <div className="flex mt-1" style={{ width: size }}>
        {stats.colSums.map((sum, j) => (
          <div
            key={`col-${j}`}
            className="text-xs flex items-center justify-center"
            style={{
              width: cellSize,
              height: 20,
              color: getSumColor(sum),
            }}
            title={`Col ${j} sum: ${sum.toFixed(3)}`}
          >
            {sum.toFixed(1)}
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="mt-2 text-xs text-gray-600">
          [{hoveredCell.i}, {hoveredCell.j}] = {hoveredCell.value.toFixed(4)}
        </div>
      )}

      {/* Legend */}
      <div className="mt-2 flex items-center text-xs text-gray-500">
        <div
          className="w-4 h-4 mr-1"
          style={{ backgroundColor: 'rgb(255,255,255)' }}
        />
        <span>0</span>
        <div className="flex-1 mx-2 h-2 bg-gradient-to-r from-white to-blue-500" />
        <span>1</span>
      </div>
    </div>
  );
}
