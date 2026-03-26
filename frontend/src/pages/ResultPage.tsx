import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResult } from '../lib/api';

const FIELD_LABELS: Record<string, string> = {
  so_cccd: 'Số CCCD',
  ho_ten: 'Họ và tên',
  ngay_sinh: 'Ngày sinh',
  gioi_tinh: 'Giới tính',
  quoc_tich: 'Quốc tịch',
  que_quan: 'Quê quán',
  noi_thuong_tru: 'Nơi thường trú',
  ngay_het_han: 'Ngày hết hạn',
};

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'compare' | 'raw'>('summary');

  useEffect(() => {
    if (!id) return;
    getResult(id)
      .then(setResult)
      .catch(() => setError('Không tìm thấy kết quả.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 mt-4">Đang tải kết quả...</p>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <p className="text-red-500 mb-4">{error || 'Không tìm thấy kết quả.'}</p>
        <Link to="/verify" className="text-blue-600 hover:underline">Quay lại xác minh</Link>
      </main>
    );
  }

  const identity = result.identity || {};
  const verification = result.verification || {};
  const sources = result.sources || {};
  const crossDetails = verification.cross_check_details || [];

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kết quả xác minh</h1>
          <p className="text-sm text-slate-400 mt-1 font-mono">{result.request_id}</p>
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
              URL.revokeObjectURL(url);
            }}
            className="text-sm bg-white text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            JSON
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
              <li key={i} className="text-red-700 text-sm flex items-center gap-2">
                <span className="text-red-400">✕</span> {issue}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <div className="bg-white rounded-2xl p-5 border border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Thời gian xử lý</p>
              <p className="text-2xl font-bold text-slate-900">
                {(result.processing_time_ms / 1000).toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">giây</span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
              {(['summary', 'compare', 'raw'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'summary' ? 'Thông tin' : tab === 'compare' ? 'So sánh OCR vs VLM' : 'Raw JSON'}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'summary' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">Thông tin trích xuất (merged)</h2>
                <p className="text-xs text-slate-400 mt-1">Kết quả cuối cùng sau khi cross-check OCR và VLM</p>
              </div>
              <div className="divide-y divide-slate-50">
                {Object.entries(identity).map(([key, value]) => (
                  <div key={key} className="px-8 py-4 flex items-center">
                    <span className="w-40 text-sm text-slate-400 shrink-0">{FIELD_LABELS[key] || key}</span>
                    <span className="text-sm text-slate-900 font-medium flex-1">{(value as string) || '—'}</span>
                    {crossDetails.find((d: any) => d.field === key) && (
                      <SourceBadge source={crossDetails.find((d: any) => d.field === key)?.chosen_source} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-50">
                <h2 className="text-lg font-semibold text-slate-900">Cross-check chi tiết</h2>
                <p className="text-xs text-slate-400 mt-1">So sánh từng trường giữa OCR và VLM, similarity = Levenshtein ratio</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Trường</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">OCR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">VLM</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Similarity</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Nguồn chọn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {crossDetails.map((d: any) => (
                      <tr key={d.field} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-700">{FIELD_LABELS[d.field] || d.field}</td>
                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">{d.ocr_value || '—'}</td>
                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">{d.vlm_value || '—'}</td>
                        <td className="px-6 py-3 text-center">
                          <SimilarityBadge value={d.similarity} />
                        </td>
                        <td className="px-6 py-3 text-center">
                          <SourceBadge source={d.chosen_source} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="bg-slate-900 rounded-2xl p-6 overflow-auto max-h-[600px]">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function ScoreCard({ label, score, status }: { label: string; score?: number; status?: string }) {
  const pct = score != null ? Math.round(score * 100) : null;
  const getColor = (p: number) => p >= 85 ? 'emerald' : p >= 60 ? 'amber' : 'red';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      {pct != null ? (
        <>
          <p className={`text-2xl font-bold ${
            pct >= 85 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {pct}%
          </p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {status && (
            <p className={`text-xs mt-2 capitalize ${
              status === 'match' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {status === 'match' ? '✓ Match' : status === 'no_match' ? '✕ No match' : status}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-300">—</p>
      )}
    </div>
  );
}

function SimilarityBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      pct >= 85 ? 'bg-emerald-50 text-emerald-700' :
      pct >= 60 ? 'bg-amber-50 text-amber-700' :
      pct > 0 ? 'bg-red-50 text-red-700' :
      'bg-slate-50 text-slate-400'
    }`}>
      {pct}%
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === 'none') return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      source === 'ocr' ? 'bg-purple-50 text-purple-700' : 'bg-sky-50 text-sky-700'
    }`}>
      {source.toUpperCase()}
    </span>
  );
}
