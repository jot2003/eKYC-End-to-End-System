import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getResult } from '../lib/api';
import ResultView from '../components/ResultView';
import { ArrowLeft } from 'lucide-react';

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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error || 'Không tìm thấy.'}</p>
        <Link
          to="/ekyc/history"
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Quay lại lịch sử
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link
        to="/ekyc/history"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Quay lại lịch sử
      </Link>
      <ResultView result={result} />
    </div>
  );
}
