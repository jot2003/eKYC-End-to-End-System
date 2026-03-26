import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Dual AI Pipeline',
    description: 'Kết hợp OCR truyền thống (EasyOCR) và Vision-Language Model (GPT) để cross-check, giảm thiểu sai sót.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: 'Xác minh khuôn mặt',
    description: 'So sánh ảnh chân dung trên CCCD với ảnh selfie bằng InsightFace ArcFace embedding + cosine similarity.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    title: 'Cross-validation thông minh',
    description: 'So sánh Levenshtein từng trường OCR vs VLM. Chọn nguồn tin cậy nhất theo FIELD_TRUST matrix.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Production-ready',
    description: 'FastAPI REST API, Docker deployment, SQLite persistence, structured logging, CORS, health check.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
];

const pipeline = [
  { step: '01', title: 'Image Quality', desc: 'Blur, brightness, resolution check' },
  { step: '02', title: 'Preprocessing', desc: 'Denoise, deskew, resize' },
  { step: '03', title: 'OCR Extract', desc: 'EasyOCR Vietnamese + Field NER' },
  { step: '04', title: 'VLM Extract', desc: 'Azure OpenAI multimodal' },
  { step: '05', title: 'Cross-Check', desc: 'Levenshtein merge + FIELD_TRUST' },
  { step: '06', title: 'Face Verify', desc: 'InsightFace ArcFace cosine sim' },
];

const techStack = [
  { name: 'EasyOCR', category: 'AI' },
  { name: 'Azure OpenAI', category: 'AI' },
  { name: 'InsightFace', category: 'AI' },
  { name: 'OpenCV', category: 'AI' },
  { name: 'FastAPI', category: 'Backend' },
  { name: 'SQLAlchemy', category: 'Backend' },
  { name: 'React', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'Docker', category: 'Infra' },
  { name: 'Python', category: 'Lang' },
  { name: 'TypeScript', category: 'Lang' },
];

export default function LandingPage() {
  return (
    <main>
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
          eKYC System for Vietnamese Banking
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Xác minh danh tính
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            bằng AI đa phương thức
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Kết hợp OCR + Vision-Language Model + Nhận dạng khuôn mặt để trích xuất
          và xác minh thông tin từ Căn cước công dân trong giây lát.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/verify"
            className="bg-blue-600 text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5"
          >
            Bắt đầu xác minh
          </Link>
          <a
            href="https://github.com/jot2003/DocuMind"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-slate-700 px-8 py-3.5 rounded-xl text-base font-medium hover:bg-slate-50 transition-all border border-slate-200 hover:-translate-y-0.5"
          >
            GitHub
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-10">
          Tính năng nổi bật
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-5 group-hover:bg-blue-100 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-10">
          Pipeline xử lý
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {pipeline.map((p, i) => (
            <div key={p.step} className="relative">
              <div className="bg-white rounded-xl p-4 border border-slate-100 text-center h-full">
                <div className="text-xs font-mono text-blue-500 mb-2">{p.step}</div>
                <div className="text-sm font-semibold text-slate-900 mb-1">{p.title}</div>
                <div className="text-xs text-slate-400">{p.desc}</div>
              </div>
              {i < pipeline.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-2.5 text-slate-300 text-xs">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
          Tech Stack
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((tech) => (
            <span
              key={tech.name}
              className="px-4 py-2 bg-white rounded-lg text-sm text-slate-600 border border-slate-100 font-mono hover:border-blue-200 hover:text-blue-700 transition-colors cursor-default"
            >
              {tech.name}
            </span>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-sm text-slate-400">
          DocuMind &mdash; AI-powered eKYC System &middot; Built by Hoang Kim Tri Thanh
        </p>
      </footer>
    </main>
  );
}
