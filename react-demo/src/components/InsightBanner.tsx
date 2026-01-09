/**
 * Dynamic insight banner that guides users on what to observe
 * based on the current Sinkhorn iteration value.
 */

import { AlertTriangle, TrendingUp, CheckCircle, Lightbulb } from 'lucide-react';

interface InsightBannerProps {
  sinkhornIters: number;
  finalGain?: number;
}

interface InsightConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

function getInsight(sinkhornIters: number, finalGain?: number): InsightConfig {
  if (sinkhornIters === 0) {
    return {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: 'HC Mode (Unconstrained)',
      message: 'Watch the red line explode! Without Sinkhorn projection, gains compound exponentially.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    };
  }

  if (sinkhornIters < 5) {
    return {
      icon: <TrendingUp className="w-5 h-5" />,
      title: 'Partial Projection',
      message: `Only ${sinkhornIters} iteration${sinkhornIters > 1 ? 's' : ''} - matrix isn't fully doubly stochastic yet. Increase for stability.`,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
    };
  }

  if (sinkhornIters < 15) {
    return {
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'Getting Stable',
      message: 'The mHC projection is working - notice how the blue line stays bounded while HC explodes.',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
    };
  }

  // sinkhornIters >= 15
  const gainInfo = finalGain !== undefined && finalGain < 5
    ? ` Final gain: ${finalGain.toFixed(2)}x`
    : '';

  return {
    icon: <CheckCircle className="w-5 h-5" />,
    title: 'Stable mHC',
    message: `Fully projected onto doubly stochastic manifold. Gains bounded, converging to uniform.${gainInfo}`,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
  };
}

export function InsightBanner({ sinkhornIters, finalGain }: InsightBannerProps) {
  const insight = getInsight(sinkhornIters, finalGain);

  return (
    <div
      className={`${insight.bgColor} ${insight.borderColor} ${insight.textColor} border rounded-lg px-4 py-3 flex items-start gap-3 transition-all duration-300`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {insight.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{insight.title}</div>
        <div className="text-sm opacity-90">{insight.message}</div>
      </div>
      <div className="flex-shrink-0 text-xs opacity-60 font-mono">
        k={sinkhornIters}
      </div>
    </div>
  );
}
