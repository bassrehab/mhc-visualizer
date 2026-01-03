import { ManifoldDial } from './components/ManifoldDial';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Manifold Dial</h1>
              <p className="text-sm text-gray-500">
                Interactive visualization of Manifold-Constrained Hyper-Connections
              </p>
            </div>
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
      </header>

      {/* Main content */}
      <main className="py-8">
        <ManifoldDial />
      </main>

      {/* Footer */}
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
              href="https://github.com/bassrehab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:underline"
            >
              Subhadip Mitra
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
