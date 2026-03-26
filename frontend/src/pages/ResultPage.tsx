import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResult } from '../lib/api';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getResult(id)
      .then(setResult)
      .catch(() => setError('Không tìm thấy kết quả.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 mt-4">Đang tải kết quả...</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-red-500 mb-4">{error || 'Không tìm thấy kết quả.'}</p>
        <Link to="/verify" className="text-blue-600 hover:underline">Quay lại xác minh</Link>
      </main>
    );
  }

  const identity = result.identity || {};
  const verification = result.verification || {};

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kết quả xác minh</h1>
          <p className="text-sm text-slate-400 mt-1">ID: {result.request_id}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${result.request_id}.json`;
              a.click();
            }}
            className="text-sm bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Tải JSON
          </button>
          <Link
            to="/verify"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Xác minh mới
          </Link>
        </div>
      </div>

      {result.status === 'quality_error' ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-red-800 mb-4">Ảnh không đạt chất lượng</h2>
          <ul className="space-y-2">
            {result.quality_issues?.map((issue: string, i: number) => (
              <li key={i} className="text-red-700 text-sm">{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Extracted Info */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Thông tin trích xuất</h2>
            {Object.keys(identity).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(identity).map(([key, value]) => (
                  <div key={key} className="flex border-b border-slate-50 pb-3">
                    <span className="w-40 text-sm text-slate-400 shrink-0">{formatFieldName(key)}</span>
                    <span className="text-sm text-slate-900 font-medium">{value as string || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Chưa có dữ liệu trích xuất (AI pipeline chưa kết nối).</p>
            )}
          </div>

          {/* Verification Scores */}
          <div className="space-y-6">
            <ScoreCard
              label="OCR-VLM Agreement"
              score={verification.ocr_vlm_agreement}
            />
            <ScoreCard
              label="Face Match"
              score={verification.face_match?.score}
              status={verification.face_match?.status}
            />
            <ScoreCard
              label="Overall Confidence"
              score={verification.overall_confidence}
            />
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Thời gian xử lý</p>
              <p className="text-2xl font-bold text-slate-900">
                {(result.processing_time_ms / 1000).toFixed(1)}s
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ScoreCard({ label, score, status }: { label: string; score?: number; status?: string }) {
  const pct = score != null ? Math.round(score * 100) : null;
  const color = pct == null ? 'slate' : pct >= 85 ? 'green' : pct >= 60 ? 'yellow' : 'red';

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {pct != null ? (
        <>
          <p className={`text-2xl font-bold text-${color}-600`}>{pct}%</p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-${color}-500 rounded-full transition-all duration-700`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {status && <p className="text-xs text-slate-400 mt-2 capitalize">{status}</p>}
        </>
      ) : (
        <p className="text-sm text-slate-300">—</p>
      )}
    </div>
  );
}

function formatFieldName(key: string): string {
  const names: Record<string, string> = {
    so_cccd: 'Số CCCD',
    ho_ten: 'Họ và tên',
    ngay_sinh: 'Ngày sinh',
    gioi_tinh: 'Giới tính',
    quoc_tich: 'Quốc tịch',
    que_quan: 'Quê quán',
    noi_thuong_tru: 'Nơi thường trú',
    ngay_het_han: 'Ngày hết hạn',
  };
  return names[key] || key;
}
