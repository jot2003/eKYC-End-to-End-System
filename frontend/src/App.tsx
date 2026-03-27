import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import VerifyPage from './pages/VerifyPage';
import HistoryPage from './pages/HistoryPage';
import ResultPage from './pages/ResultPage';
import { Construction } from 'lucide-react';

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/ekyc" element={<VerifyPage />} />
          <Route path="/ekyc/history" element={<HistoryPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/document" element={<ComingSoon title="Tài liệu" desc="Trích xuất thông tin hóa đơn, biên lai bằng OCR + VLM" />} />
          <Route path="/feedback" element={<ComingSoon title="Feedback NLP" desc="Phân tích phản hồi khách hàng: sentiment, keyword, topic" />} />
          <Route path="/search" element={<ComingSoon title="Tìm kiếm ngữ nghĩa" desc="Tìm kiếm tài liệu theo ý nghĩa bằng vector embeddings" />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
        <Construction size={28} className="text-slate-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-md text-center">{desc}</p>
      <span className="mt-4 text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
        Đang phát triển
      </span>
    </div>
  );
}

export default App;
