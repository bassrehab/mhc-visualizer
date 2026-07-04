import { ManifoldDial } from './components/ManifoldDial';
import './index.css';

function App() {
  // When embedded by the site (which passes ?theme=…), the host provides the
  // page chrome, theme control, and a back-link, so hide our own header/footer.
  const embedded =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('theme');

  return (
    <div className={embedded ? 'bg-gray-50' : 'min-h-screen bg-gray-50'}>
      {/* Header */}
      {!embedded && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Manifold Dial</h1>
                <p className="text-sm text-gray-500">
                  Interactive visualization of Manifold-Constrained Hyper-Connections
                </p>
              </div>
              <div className="flex items-center gap-4 whitespace-nowrap">
                <a
                  href="https://subhadipmitra.com/instruments/"
                  target="_top"
                  className="text-sm text-gray-500 hover:text-gray-800 hover:underline"
                >
                  ← All instruments
                </a>
                <a
                  href="https://arxiv.org/abs/2512.24880"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Read the Paper →
                </a>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={embedded ? 'py-4' : 'py-8'}>
        <ManifoldDial />
      </main>

      {/* Footer */}
      {!embedded && (
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <p className="text-center text-sm text-gray-400">
              Based on{' '}
              <a
                href="https://arxiv.org/abs/2512.24880"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:underline"
              >
                DeepSeek's mHC paper
              </a>
              {' · '}
              <a
                href="https://subhadipmitra.com/instruments/"
                target="_top"
                className="text-gray-500 hover:underline"
              >
                More instruments
              </a>
              {' · '}
              <a
                href="https://subhadipmitra.com"
                target="_top"
                className="text-gray-500 hover:underline"
              >
                subhadipmitra.com
              </a>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
