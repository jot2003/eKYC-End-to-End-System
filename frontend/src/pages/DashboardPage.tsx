import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  History,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { listResults, getStats, healthCheck } from '../lib/api';

export default function DashboardPage() {
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, avg_processing_time_ms: 0 });
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    listResults(0, 5)
      .then((data) => setRecentResults(data.items))
      .catch(() => {});

    getStats()
      .then(setStats)
      .catch(() => {});

    healthCheck()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Tổng quan hệ thống DocuMind</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/ekyc"
          className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <ShieldCheck size={20} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Xác minh mới</h3>
          <p className="text-xs text-slate-500">Bắt đầu quy trình eKYC</p>
        </Link>

        <Link
          to="/ekyc/history"
          className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
            <History size={20} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Lịch sử xác minh</h3>
          <p className="text-xs text-slate-500">Xem lại các kết quả trước</p>
        </Link>

        <Link
          to="/document"
          className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-md transition-all"
        >
          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-100 transition-colors">
            <FileText size={20} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">Tài liệu</h3>
          <p className="text-xs text-slate-500">Trích xuất hóa đơn, biên lai</p>
          <span className="inline-block mt-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            Coming soon
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Tổng xác minh"
          value={stats.total.toString()}
          icon={<ShieldCheck size={18} className="text-blue-500" />}
        />
        <StatCard
          label="Thành công"
          value={stats.success.toString()}
          icon={<CheckCircle size={18} className="text-emerald-500" />}
        />
        <StatCard
          label="Thất bại"
          value={stats.failed.toString()}
          icon={<XCircle size={18} className="text-red-500" />}
        />
        <StatCard
          label="Thời gian TB"
          value={`${(stats.avg_processing_time_ms / 1000).toFixed(1)}s`}
          icon={<Clock size={18} className="text-amber-500" />}
        />
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div
          className={`w-2 h-2 rounded-full ${
            healthy === true ? 'bg-emerald-500' : healthy === false ? 'bg-red-500' : 'bg-slate-300 animate-pulse'
          }`}
        />
        <span className="text-xs text-slate-500">
          {healthy === true
            ? 'API đang hoạt động'
            : healthy === false
              ? 'API không phản hồi'
              : 'Đang kiểm tra...'}
        </span>
      </div>

      {recentResults.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-900 text-sm">Xác minh gần đây</h2>
            </div>
            <Link
              to="/ekyc/history"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentResults.map((r: any) => (
              <Link
                key={r.request_id}
                to={`/result/${r.request_id}`}
                className="flex items-center px-6 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {r.identity?.ho_ten || 'Không xác định'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">{r.request_id}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                      r.status === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {r.status === 'success' ? 'Thành công' : 'Lỗi'}
                  </span>
                  {r.overall_confidence != null && (
                    <span className="text-xs text-slate-500 font-medium">
                      {Math.round(r.overall_confidence * 100)}%
                    </span>
                  )}
                  <ArrowRight size={14} className="text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-slate-400 font-medium">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
