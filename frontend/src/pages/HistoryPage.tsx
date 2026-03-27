import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listResults } from '../lib/api';
import { ArrowRight, RefreshCw, Plus } from 'lucide-react';

export default function HistoryPage() {
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchData();
  }, [page]);

  function fetchData() {
    setLoading(true);
    listResults(page * limit, limit)
      .then((data) => {
        setResults(data.items);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử xác minh</h1>
          <p className="text-sm text-slate-500 mt-1">{total} kết quả</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} /> Làm mới
          </button>
          <Link
            to="/ekyc"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} /> Xác minh mới
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-400 mt-3">Đang tải...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-400 mb-4">Chưa có kết quả nào</p>
            <Link to="/ekyc" className="text-sm text-blue-600 hover:underline">
              Bắt đầu xác minh
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase w-12">
                    #
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase">
                    Họ tên
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase hidden md:table-cell">
                    Số CCCD
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase hidden sm:table-cell">
                    Confidence
                  </th>
                  <th className="px-5 py-3 text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">
                    Thời gian
                  </th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.map((r: any, i: number) => (
                  <tr key={r.request_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {page * limit + i + 1}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {r.identity?.ho_ten || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs hidden md:table-cell">
                      {r.identity?.so_cccd || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          r.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {r.status === 'success' ? 'Thành công' : 'Lỗi'}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      {r.overall_confidence != null ? (
                        <span
                          className={`text-xs font-medium ${
                            r.overall_confidence >= 0.85
                              ? 'text-emerald-600'
                              : r.overall_confidence >= 0.6
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {Math.round(r.overall_confidence * 100)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 hidden lg:table-cell">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/result/${r.request_id}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm px-3 py-1.5 rounded border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
          >
            Trước
          </button>
          <span className="text-sm px-3 py-1.5 text-slate-500">
            Trang {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="text-sm px-3 py-1.5 rounded border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
