import { useState } from 'react';
import { Download } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  so_cccd: 'Số CCCD',
  ho_ten: 'Họ và tên',
  ngay_sinh: 'Ngày sinh',
  gioi_tinh: 'Giới tính',
  quoc_tich: 'Quốc tịch',
  que_quan: 'Quê quán',
  noi_thuong_tru: 'Nơi thường trú',
  ngay_het_han: 'Ngày hết hạn',
  ngay_cap: 'Ngày cấp',
  dac_diem_nhan_dang: 'Đặc điểm nhận dạng',
};

const SOURCE_LABELS: Record<string, string> = {
  ocr_front: 'OCR - Mặt trước',
  vlm_front: 'VLM - Mặt trước',
  ocr_back: 'OCR - Mặt sau',
  vlm_back: 'VLM - Mặt sau',
  qr: 'QR Code',
  mrz: 'MRZ (Machine Readable Zone)',
  ocr: 'OCR',
  vlm: 'VLM',
};

interface ResultViewProps {
  result: any;
  showHeader?: boolean;
}

export default function ResultView({ result, showHeader = true }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'compare' | 'sources' | 'raw'>('summary');

  const identity = result.identity || {};
  const verification = result.verification || {};
  const crossDetails = verification.cross_check_details || [];
  const sources = result.sources || {};
  const sourceCount = verification.source_count || 2;

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.request_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (result.status === 'quality_error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
        <h2 className="text-lg font-semibold text-red-800 mb-4">Ảnh không đạt chất lượng</h2>
        <ul className="space-y-2">
          {result.quality_issues?.map((issue: string, i: number) => (
            <li key={i} className="text-red-700 text-sm flex items-center gap-2">
              <span className="text-red-400">&#10005;</span> {issue}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kết quả xác minh</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">{result.request_id}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadJSON}
              className="text-sm bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Download size={14} />
              JSON
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <ScoreCard label="Cross-check Agreement" score={verification.ocr_vlm_agreement} />
        <ScoreCard
          label="Face Match"
          score={verification.face_match?.score}
          status={verification.face_match?.status}
        />
        <ScoreCard label="Overall Confidence" score={verification.overall_confidence} />
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-[11px] text-slate-400 mb-1">Nguồn dữ liệu</p>
          <p className="text-xl font-bold text-slate-900">
            {sourceCount}
            <span className="text-xs font-normal text-slate-400 ml-1">nguồn</span>
          </p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {Object.keys(sources).map((s) => (
              <span key={s} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                {s.toUpperCase().replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-[11px] text-slate-400 mb-1">Thời gian xử lý</p>
          <p className="text-xl font-bold text-slate-900">
            {(result.processing_time_ms / 1000).toFixed(1)}
            <span className="text-xs font-normal text-slate-400 ml-1">giây</span>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {(['summary', 'compare', 'sources', 'raw'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'summary' ? 'Thông tin' : tab === 'compare' ? 'Cross-check' : tab === 'sources' ? `Nguồn (${sourceCount})` : 'Raw JSON'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Thông tin trích xuất</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Kết quả cuối cùng sau khi cross-check OCR và VLM</p>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(identity).map(([key, value]) => (
              <div key={key} className="px-6 py-3 flex items-center">
                <span className="w-36 text-sm text-slate-400 shrink-0">{FIELD_LABELS[key] || key}</span>
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Cross-check chi tiết</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">So sánh từng trường giữa OCR và VLM</p>
          </div>
          {crossDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 uppercase">Trường</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 uppercase">OCR</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400 uppercase">VLM</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400 uppercase">Similarity</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400 uppercase">Nguồn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {crossDetails.map((d: any) => (
                    <tr key={d.field} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{FIELD_LABELS[d.field] || d.field}</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{d.ocr_value || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{d.vlm_value || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><SimilarityBadge value={d.similarity} /></td>
                      <td className="px-4 py-2.5 text-center"><SourceBadge source={d.chosen_source} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              Chi tiết cross-check không khả dụng cho bản ghi này.
              <br />
              <span className="text-xs">Chỉ hiển thị khi xem kết quả trực tiếp từ quy trình xác minh.</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-4">
          {Object.entries(sources).map(([sourceName, sourceData]: [string, any]) => (
            <div key={sourceName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                <SourceBadge source={sourceName} />
                <span className="text-sm font-medium text-slate-700">
                  {SOURCE_LABELS[sourceName] || sourceName}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {sourceData && Object.entries(sourceData).map(([key, value]: [string, any]) => (
                  <div key={key} className="px-6 py-2.5 flex items-center">
                    <span className="w-40 text-sm text-slate-400 shrink-0">{FIELD_LABELS[key] || key}</span>
                    <span className="text-sm text-slate-900 font-mono">{(value as string) || '—'}</span>
                  </div>
                ))}
                {(!sourceData || Object.keys(sourceData).length === 0) && (
                  <div className="px-6 py-4 text-sm text-slate-400 text-center">Không có dữ liệu</div>
                )}
              </div>
            </div>
          ))}
          {Object.keys(sources).length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              Không có dữ liệu nguồn.
            </div>
          )}
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-[500px]">
          <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score, status }: { label: string; score?: number; status?: string }) {
  const pct = score != null ? Math.round(score * 100) : null;

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <p className="text-[11px] text-slate-400 mb-1.5">{label}</p>
      {pct != null ? (
        <>
          <p className={`text-xl font-bold ${
            pct >= 85 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {pct}%
          </p>
          <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {status && (
            <p className={`text-[11px] mt-1.5 capitalize ${
              status === 'match' ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {status === 'match' ? 'Match' : status === 'no_match' ? 'No match' : status}
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
  const colors: Record<string, string> = {
    ocr: 'bg-purple-50 text-purple-700',
    ocr_front: 'bg-purple-50 text-purple-700',
    ocr_back: 'bg-fuchsia-50 text-fuchsia-700',
    vlm: 'bg-sky-50 text-sky-700',
    vlm_front: 'bg-sky-50 text-sky-700',
    vlm_back: 'bg-cyan-50 text-cyan-700',
    qr: 'bg-emerald-50 text-emerald-700',
    mrz: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
      colors[source] || 'bg-slate-50 text-slate-600'
    }`}>
      {source.toUpperCase().replace('_', ' ')}
    </span>
  );
}
