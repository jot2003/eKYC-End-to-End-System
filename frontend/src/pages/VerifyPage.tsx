import { useState } from 'react';
import Stepper from '../components/Stepper';
import ImageDropzone from '../components/ImageDropzone';
import ResultView from '../components/ResultView';
import { verifyIdentity } from '../lib/api';
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  ShieldCheck,
  RotateCcw,
  Plus,
} from 'lucide-react';

const EKYC_STEPS = [
  { label: 'CCCD Trước' },
  { label: 'CCCD Sau' },
  { label: 'Selfie' },
  { label: 'Xử lý' },
  { label: 'Kết quả' },
];

const PROCESSING_STEPS = [
  'Kiểm tra chất lượng ảnh',
  'Tiền xử lý ảnh',
  'Trích xuất OCR',
  'Trích xuất VLM',
  'Đối chiếu kết quả',
  'Xác minh khuôn mặt',
];

export default function VerifyPage() {
  const [step, setStep] = useState(0);
  const [cccdFrontFile, setCccdFrontFile] = useState<File | null>(null);
  const [cccdBackFile, setCccdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState(-1);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!cccdFrontFile || !selfieFile) return;

    setStep(3);
    setProcessingStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= PROCESSING_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    try {
      const res = await verifyIdentity(cccdFrontFile, selfieFile);
      clearInterval(stepInterval);
      setProcessingStep(PROCESSING_STEPS.length - 1);

      if (res.status === 'quality_error') {
        setError(res.quality_issues?.join('\n') || 'Ảnh không đạt chất lượng.');
        return;
      }

      setResult(res);
      setTimeout(() => setStep(4), 600);
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(
        err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.'
      );
    }
  }

  function handleReset() {
    setStep(0);
    setCccdFrontFile(null);
    setCccdBackFile(null);
    setSelfieFile(null);
    setResult(null);
    setError(null);
    setProcessingStep(-1);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-10">
        <Stepper steps={EKYC_STEPS} currentStep={step} />
      </div>

      {step === 0 && (
        <StepCard
          title="Ảnh CCCD mặt trước"
          subtitle="Chụp hoặc upload ảnh mặt trước căn cước công dân"
        >
          <ImageDropzone
            onFileSelect={setCccdFrontFile}
            selectedFile={cccdFrontFile}
            label="Kéo thả ảnh CCCD mặt trước vào đây"
          />
          <StepActions>
            <div />
            <button
              onClick={() => setStep(1)}
              disabled={!cccdFrontFile}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Tiếp tục <ArrowRight size={16} />
            </button>
          </StepActions>
        </StepCard>
      )}

      {step === 1 && (
        <StepCard
          title="Ảnh CCCD mặt sau"
          subtitle="Mặt sau chứa MRZ và QR code (tùy chọn)"
        >
          <ImageDropzone
            onFileSelect={setCccdBackFile}
            selectedFile={cccdBackFile}
            label="Kéo thả ảnh CCCD mặt sau vào đây"
          />
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              Tính năng xử lý mặt sau CCCD (MRZ + QR) đang được phát triển.
              Bạn có thể bỏ qua bước này.
            </p>
          </div>
          <StepActions>
            <BackButton onClick={() => setStep(0)} />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
              >
                Bỏ qua <SkipForward size={16} />
              </button>
              {cccdBackFile && (
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Tiếp tục <ArrowRight size={16} />
                </button>
              )}
            </div>
          </StepActions>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard
          title="Ảnh selfie"
          subtitle="Chụp ảnh chân dung để so sánh với ảnh trên CCCD"
        >
          <ImageDropzone
            onFileSelect={setSelfieFile}
            selectedFile={selfieFile}
            label="Kéo thả ảnh selfie vào đây"
          />
          <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2">Hướng dẫn</p>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>Nhìn thẳng vào camera, đủ sáng</li>
              <li>Không đội mũ, không đeo kính râm</li>
              <li>Hỗ trợ PNG, JPG, WEBP - tối đa 10MB</li>
            </ul>
          </div>
          <StepActions>
            <BackButton onClick={() => setStep(1)} />
            <button
              onClick={handleSubmit}
              disabled={!selfieFile}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
            >
              <ShieldCheck size={16} /> Xác minh
            </button>
          </StepActions>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard
          title="Đang xử lý"
          subtitle="Hệ thống đang phân tích ảnh của bạn"
        >
          {error ? (
            <div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 whitespace-pre-line mb-6">
                {error}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw size={16} /> Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="space-y-3 max-w-md mx-auto">
                {PROCESSING_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {i < processingStep ? (
                        <span className="text-green-500 text-sm font-bold">
                          &#10003;
                        </span>
                      ) : i === processingStep ? (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        i <= processingStep
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        ((processingStep + 1) / PROCESSING_STEPS.length) * 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">
                  {Math.round(
                    ((processingStep + 1) / PROCESSING_STEPS.length) * 100
                  )}
                  %
                </p>
              </div>
            </div>
          )}
        </StepCard>
      )}

      {step === 4 && result && (
        <div>
          <ResultView result={result} />
          <div className="flex justify-center mt-8">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Xác minh mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
      <p className="text-sm text-slate-500 mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function StepActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-6">{children}</div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
    >
      <ArrowLeft size={16} /> Quay lại
    </button>
  );
}
