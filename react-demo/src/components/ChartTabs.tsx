/**
 * Tabbed container for charts - reduces scrolling and focuses attention.
 * On mobile, hides "All" tab to force single-chart view.
 */

import { type ReactNode } from 'react';

export type ChartTab = 'gain' | 'eigenvalues' | 'uniformity' | 'all';

interface Tab {
  id: ChartTab;
  label: string;
  shortLabel: string;
}

const TABS: Tab[] = [
  { id: 'gain', label: 'Gain', shortLabel: 'Gain' },
  { id: 'eigenvalues', label: 'Eigenvalues', shortLabel: '|λ₂|' },
  { id: 'uniformity', label: 'Uniformity', shortLabel: 'Unif.' },
  { id: 'all', label: 'All Charts', shortLabel: 'All' },
];

interface ChartTabsProps {
  activeTab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
  gainChart: ReactNode;
  eigenvalueChart: ReactNode;
  uniformityChart: ReactNode;
}

export function ChartTabs({
  activeTab,
  onTabChange,
  gainChart,
  eigenvalueChart,
  uniformityChart,
}: ChartTabsProps) {
  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex border-b border-gray-200" data-tour="chart-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              // Hide "All" tab on mobile
              tab.id === 'all' ? 'hidden md:block' : ''
            } ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {/* Show short label on small screens */}
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>

            {/* Active indicator */}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Chart content */}
      <div className="space-y-6">
        {(activeTab === 'gain' || activeTab === 'all') && gainChart}
        {(activeTab === 'eigenvalues' || activeTab === 'all') && eigenvalueChart}
        {(activeTab === 'uniformity' || activeTab === 'all') && uniformityChart}
      </div>
    </div>
  );
}
