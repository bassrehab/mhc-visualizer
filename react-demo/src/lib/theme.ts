import { useSyncExternalStore } from 'react';

/**
 * Subscribe to data-theme changes on <html> and return the current theme.
 * Calling this in a component makes it (and its children) re-render when the
 * theme flips, so theme-reactive values like COLORS in ./types update.
 */
export function useThemeSignal(): string {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light');
}

function subscribe(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getSnapshot(): string {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') || 'light';
}
