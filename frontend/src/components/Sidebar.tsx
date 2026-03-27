import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  MessageSquareText,
  Search,
  History,
  Plus,
  ChevronDown,
  ExternalLink,
  X,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const [ekycOpen, setEkycOpen] = useState(
    location.pathname.startsWith('/ekyc') || location.pathname.startsWith('/result')
  );

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (prefix: string) =>
    location.pathname.startsWith(prefix);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 flex flex-col
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 shrink-0">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-lg">DocuMind</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <SectionLabel text="Menu" />

          <NavItem
            to="/"
            icon={LayoutDashboard}
            label="Dashboard"
            active={isActive('/')}
            onClick={onClose}
          />

          <SectionLabel text="AI Services" className="pt-5" />

          <button
            onClick={() => setEkycOpen(!ekycOpen)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isGroupActive('/ekyc') || isGroupActive('/result')
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }
            `}
          >
            <ShieldCheck size={18} />
            <span className="flex-1 text-left">eKYC</span>
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${ekycOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {ekycOpen && (
            <div className="ml-4 pl-4 border-l border-slate-800 space-y-0.5">
              <NavItem to="/ekyc" icon={Plus} label="Xác minh mới" active={isActive('/ekyc')} onClick={onClose} small />
              <NavItem to="/ekyc/history" icon={History} label="Lịch sử" active={isActive('/ekyc/history')} onClick={onClose} small />
            </div>
          )}

          <NavItem to="/document" icon={FileText} label="Tài liệu" active={isActive('/document')} onClick={onClose} badge="Soon" />
          <NavItem to="/feedback" icon={MessageSquareText} label="Feedback" active={isActive('/feedback')} onClick={onClose} badge="Soon" />
          <NavItem to="/search" icon={Search} label="Tìm kiếm" active={isActive('/search')} onClick={onClose} badge="Soon" />
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-0.5 shrink-0">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors rounded-lg"
          >
            <ExternalLink size={16} />
            API Docs
          </a>
          <a
            href="https://github.com/jot2003/DocuMind"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors rounded-lg"
          >
            <ExternalLink size={16} />
            GitHub
          </a>
        </div>
      </aside>
    </>
  );
}

function SectionLabel({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p className={`px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 ${className}`}>
      {text}
    </p>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  small,
}: {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 rounded-lg font-medium transition-colors
        ${small ? 'py-2 text-xs' : 'py-2.5 text-sm'}
        ${active
          ? 'bg-blue-600/20 text-blue-400'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      <Icon size={small ? 14 : 18} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </Link>
  );
}
