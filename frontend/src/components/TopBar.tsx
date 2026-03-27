import { useLocation } from 'react-router-dom';
import { Menu, ChevronRight } from 'lucide-react';

interface TopBarProps {
  onMenuToggle: () => void;
}

function getBreadcrumbs(pathname: string): string[] {
  if (pathname === '/') return ['Dashboard'];
  if (pathname === '/ekyc') return ['eKYC', 'Xác minh mới'];
  if (pathname === '/ekyc/history') return ['eKYC', 'Lịch sử'];
  if (pathname.startsWith('/result/')) return ['eKYC', 'Kết quả'];
  if (pathname === '/document') return ['Tài liệu'];
  if (pathname === '/feedback') return ['Feedback'];
  if (pathname === '/search') return ['Tìm kiếm'];
  return ['DocuMind'];
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Menu size={20} />
      </button>

      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-slate-300" />}
            <span
              className={
                i === breadcrumbs.length - 1
                  ? 'text-slate-900 font-medium'
                  : 'text-slate-400'
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>
    </header>
  );
}
