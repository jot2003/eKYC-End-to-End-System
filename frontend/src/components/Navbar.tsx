import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="font-semibold text-lg text-slate-900">DocuMind</span>
        </Link>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/jot2003/DocuMind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            GitHub
          </a>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            API Docs
          </a>
          <Link
            to="/verify"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Xác minh
          </Link>
        </div>
      </div>
    </nav>
  );
}
