/**
 * Utility functions for the mHC visualizer.
 */

import type { SimulationConfig } from './types';

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Encode config to URL search params.
 */
export function configToUrl(config: SimulationConfig): string {
  const params = new URLSearchParams({
    depth: config.depth.toString(),
    n: config.n.toString(),
    sinkhornIters: config.sinkhornIters.toString(),
    seed: config.seed.toString(),
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

/**
 * Parse config from URL search params.
 */
export function urlToConfig(defaultConfig: SimulationConfig): SimulationConfig {
  const params = new URLSearchParams(window.location.search);

  return {
    depth: parseInt(params.get('depth') || '') || defaultConfig.depth,
    n: parseInt(params.get('n') || '') || defaultConfig.n,
    sinkhornIters: parseInt(params.get('sinkhornIters') || '') || defaultConfig.sinkhornIters,
    seed: parseInt(params.get('seed') || '') || defaultConfig.seed,
  };
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
