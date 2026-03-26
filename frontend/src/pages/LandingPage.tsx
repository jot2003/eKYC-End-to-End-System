import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Dual AI Pipeline',
    description: 'Kết hợp OCR truyền thống và Vision-Language Model để cross-check, giảm thiểu sai sót.',
    icon: '⟁',
  },
  {
    title: 'Xác minh khuôn mặt',
    description: 'So sánh ảnh chân dung trên CCCD với ảnh selfie bằng ArcFace embedding.',
    icon: '◉',
  },
  {
    title: 'Xử lý < 3 giây',
    description: 'Pipeline tối ưu xử lý song song OCR, VLM và Face matching.',
    icon: '⚡',
  },
  {
    title: 'Production-ready',
    description: 'API chuẩn REST, Docker deployment, structured logging, health check.',
    icon: '▣',
  },
];

const techStack = [
  'PaddleOCR', 'Qwen2.5-VL', 'InsightFace', 'FastAPI', 'React', 'OpenCV', 'PyTorch', 'Docker',
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-block mb-6 px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
          eKYC cho ngân hàng Việt Nam
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
          Xác minh danh tính
          <br />
          <span className="text-blue-600">bằng AI đa phương thức</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Kết hợp OCR + Vision-Language Model + Nhận dạng khuôn mặt để trích xuất
          và xác minh thông tin từ CCCD trong giây lát.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/verify"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            Bắt đầu xác minh
          </Link>
          <a
            href="https://github.com/jot2003/DocuMind"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-slate-700 px-8 py-3 rounded-xl text-base font-medium hover:bg-slate-50 transition-colors border border-slate-200"
          >
            Xem mã nguồn
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-8 border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 text-xl mb-5">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-8">
          Công nghệ sử dụng
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 bg-white rounded-lg text-sm text-slate-600 border border-slate-100 font-mono"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-sm text-slate-400">
          DocuMind &mdash; Graduation Project by Hoang Kim Tri Thanh &middot; HUST 2026
        </p>
      </footer>
    </main>
  );
}
