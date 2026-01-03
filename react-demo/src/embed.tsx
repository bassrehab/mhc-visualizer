/**
 * Entry point for the embeddable Manifold Dial widget.
 *
 * Usage:
 *   <div id="manifold-dial"></div>
 *   <script src="embed.umd.js"></script>
 *   <script>
 *     ManifoldDial.render(document.getElementById('manifold-dial'), {
 *       depth: 64,
 *       sinkhornIters: 20,
 *       showControls: true
 *     });
 *   </script>
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Embed } from './components/Embed';
import './embed.css';

interface RenderOptions {
  depth?: number;
  n?: number;
  sinkhornIters?: number;
  seed?: number;
  showControls?: boolean;
  height?: number;
}

function render(element: HTMLElement, options: RenderOptions = {}) {
  const root = ReactDOM.createRoot(element);
  root.render(
    <React.StrictMode>
      <Embed
        initialConfig={{
          depth: options.depth,
          n: options.n,
          sinkhornIters: options.sinkhornIters,
          seed: options.seed,
        }}
        showControls={options.showControls ?? true}
        height={options.height ?? 300}
      />
    </React.StrictMode>
  );

  return {
    unmount: () => root.unmount(),
  };
}

// Export for UMD bundle
const ManifoldDial = { render };

// Attach to window for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { ManifoldDial: typeof ManifoldDial }).ManifoldDial = ManifoldDial;
}

export { render, ManifoldDial };
