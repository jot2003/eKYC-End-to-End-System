import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Eye, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface LivenessCheckProps {
  onComplete: (selfieFile: File, livenessResult: { passed: boolean; challenges: ChallengeResult[] }) => void;
  onClose: () => void;
}

interface ChallengeResult {
  type: string;
  passed: boolean;
}

type ChallengeType = 'blink' | 'turn_right';
type Phase = 'ready' | 'challenge' | 'capturing' | 'done';

const CHALLENGES: { type: ChallengeType; instruction: string; icon: string }[] = [
  { type: 'blink', instruction: 'Hãy chớp mắt', icon: '👁️' },
  { type: 'turn_right', instruction: 'Hãy quay đầu sang phải', icon: '➡️' },
];

const FACE_OVAL_RATIO = 0.6;
const BLINK_THRESHOLD = 12;
const TURN_THRESHOLD = 18;
const CHALLENGE_TIMEOUT_MS = 8000;

export default function LivenessCheck({ onComplete, onClose }: LivenessCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const baselineFrameRef = useRef<ImageData | null>(null);
  const rafRef = useRef<number>(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
  const [feedback, setFeedback] = useState('');
  const [detected, setDetected] = useState(false);
  const [challengeTimer, setChallengeTimer] = useState(0);

  const challengeStartRef = useRef(0);
  const blinkDetectedRef = useRef(false);
  const turnDetectedRef = useRef(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallback);
        if (videoRef.current) videoRef.current.srcObject = fallback;
      } catch {
        setError('Không thể truy cập camera.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;

    const onPlay = () => {
      const loop = () => {
        if (video.paused || video.ended) return;
        drawOverlay();
        if (phase === 'challenge') analyzeFrame();
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    video.addEventListener('loadeddata', onPlay);
    return () => video.removeEventListener('loadeddata', onPlay);
  }, [stream, phase, challengeIndex]); // eslint-disable-line

  useEffect(() => {
    if (phase !== 'challenge') return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - challengeStartRef.current;
      setChallengeTimer(Math.max(0, CHALLENGE_TIMEOUT_MS - elapsed));
      if (elapsed > CHALLENGE_TIMEOUT_MS) {
        handleChallengeFail();
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, challengeIndex]); // eslint-disable-line

  function startChallenge() {
    setPhase('challenge');
    challengeStartRef.current = Date.now();
    blinkDetectedRef.current = false;
    turnDetectedRef.current = false;
    prevFrameRef.current = null;
    baselineFrameRef.current = null;
    setChallengeTimer(CHALLENGE_TIMEOUT_MS);
    setFeedback('');
    setDetected(false);
  }

  function handleChallengePass() {
    const challenge = CHALLENGES[challengeIndex];
    const newResults = [...challengeResults, { type: challenge.type, passed: true }];
    setChallengeResults(newResults);
    setDetected(true);

    if (challengeIndex < CHALLENGES.length - 1) {
      setTimeout(() => {
        setChallengeIndex(challengeIndex + 1);
        setDetected(false);
        challengeStartRef.current = Date.now();
        blinkDetectedRef.current = false;
        turnDetectedRef.current = false;
        prevFrameRef.current = null;
        baselineFrameRef.current = null;
        setChallengeTimer(CHALLENGE_TIMEOUT_MS);
      }, 800);
    } else {
      setTimeout(() => captureSelfie(newResults), 500);
    }
  }

  function handleChallengeFail() {
    setChallengeResults([...challengeResults, { type: CHALLENGES[challengeIndex].type, passed: false }]);
    setFeedback('Thời gian hết. Vui lòng thử lại.');
    setPhase('ready');
    setChallengeIndex(0);
    setChallengeResults([]);
  }

  function captureSelfie(results: ChallengeResult[]) {
    setPhase('capturing');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `liveness_selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const allPassed = results.every(r => r.passed);
        setPhase('done');
        setTimeout(() => onComplete(file, { passed: allPassed, challenges: results }), 500);
      }
    }, 'image/jpeg', 0.92);
  }

  function drawOverlay() {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video || !video.videoWidth) return;

    const w = overlay.width = overlay.clientWidth;
    const h = overlay.height = overlay.clientHeight;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);

    const ovalW = w * FACE_OVAL_RATIO * 0.65;
    const ovalH = h * FACE_OVAL_RATIO;
    const cx = w / 2;
    const cy = h / 2 - h * 0.03;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(cx, cy, ovalW, ovalH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const color = detected ? '#22c55e' : phase === 'challenge' ? '#3b82f6' : '#94a3b8';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ovalW, ovalH, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function analyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    const sampleW = 200;
    const sampleH = 150;
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d')!;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cropX = vw * 0.25;
    const cropY = vh * 0.15;
    const cropW = vw * 0.5;
    const cropH = vh * 0.6;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, sampleW, sampleH);
    const frame = ctx.getImageData(0, 0, sampleW, sampleH);

    if (!baselineFrameRef.current) {
      baselineFrameRef.current = frame;
      prevFrameRef.current = frame;
      return;
    }

    const challenge = CHALLENGES[challengeIndex];

    if (challenge.type === 'blink' && !blinkDetectedRef.current) {
      const eyeRegionDiff = computeRegionDiff(prevFrameRef.current!, frame, 0.2, 0.3, 0.8, 0.55);
      if (eyeRegionDiff > BLINK_THRESHOLD) {
        blinkDetectedRef.current = true;
        setFeedback('Phát hiện chớp mắt!');
        handleChallengePass();
      }
    }

    if (challenge.type === 'turn_right' && !turnDetectedRef.current) {
      const horizontalShift = computeHorizontalShift(baselineFrameRef.current!, frame);
      if (horizontalShift > TURN_THRESHOLD) {
        turnDetectedRef.current = true;
        setFeedback('Phát hiện xoay đầu!');
        handleChallengePass();
      }
    }

    prevFrameRef.current = frame;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">Đóng</button>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden" style={{ minHeight: 400 }}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)', minHeight: 400 }} />
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />

      <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-20">
        <X size={18} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
        {phase === 'ready' && (
          <div className="text-center">
            <p className="text-white text-sm mb-1">Xác minh người thật</p>
            <p className="text-white/60 text-xs mb-4">
              Hệ thống sẽ yêu cầu bạn thực hiện {CHALLENGES.length} thao tác để xác minh
            </p>
            <button
              onClick={startChallenge}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Eye size={16} className="inline mr-2" />
              Bắt đầu
            </button>
            {feedback && (
              <p className="text-amber-400 text-xs mt-2">{feedback}</p>
            )}
          </div>
        )}

        {phase === 'challenge' && (
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-3">
              {CHALLENGES.map((c, i) => (
                <div
                  key={c.type}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i < challengeIndex ? 'bg-green-400' :
                    i === challengeIndex ? 'bg-blue-400 animate-pulse' :
                    'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-white text-lg font-medium mb-1">
              {CHALLENGES[challengeIndex].instruction}
            </p>
            <p className="text-white/60 text-xs">
              Thử thách {challengeIndex + 1}/{CHALLENGES.length} — {Math.ceil(challengeTimer / 1000)}s
            </p>
            {detected && (
              <div className="mt-2 flex items-center justify-center gap-1 text-green-400 text-sm">
                <Check size={16} /> {feedback}
              </div>
            )}
          </div>
        )}

        {phase === 'capturing' && (
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white text-sm">Đang chụp ảnh selfie...</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center">
            <Check size={32} className="text-green-400 mx-auto mb-2" />
            <p className="text-green-400 text-sm font-medium">Xác minh thành công!</p>
          </div>
        )}
      </div>
    </div>
  );
}


function computeRegionDiff(
  prev: ImageData, curr: ImageData,
  x1: number, y1: number, x2: number, y2: number,
): number {
  const w = prev.width;
  const h = prev.height;
  const sx = Math.floor(x1 * w);
  const sy = Math.floor(y1 * h);
  const ex = Math.floor(x2 * w);
  const ey = Math.floor(y2 * h);

  let totalDiff = 0;
  let count = 0;

  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const i = (y * w + x) * 4;
      const grayPrev = (prev.data[i] + prev.data[i + 1] + prev.data[i + 2]) / 3;
      const grayCurr = (curr.data[i] + curr.data[i + 1] + curr.data[i + 2]) / 3;
      totalDiff += Math.abs(grayPrev - grayCurr);
      count++;
    }
  }

  return count > 0 ? totalDiff / count : 0;
}


function computeHorizontalShift(baseline: ImageData, current: ImageData): number {
  const w = baseline.width;
  const h = baseline.height;

  let baselineWeightedX = 0;
  let baselineTotalWeight = 0;
  let currentWeightedX = 0;
  let currentTotalWeight = 0;

  const cy = Math.floor(h * 0.4);
  const rowRange = Math.floor(h * 0.2);

  for (let y = cy - rowRange; y < cy + rowRange; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const bGray = (baseline.data[i] + baseline.data[i + 1] + baseline.data[i + 2]) / 3;
      const cGray = (current.data[i] + current.data[i + 1] + current.data[i + 2]) / 3;

      const bEdge = Math.abs(bGray - ((x > 0) ? (baseline.data[i - 4] + baseline.data[i - 3] + baseline.data[i - 2]) / 3 : bGray));
      const cEdge = Math.abs(cGray - ((x > 0) ? (current.data[i - 4] + current.data[i - 3] + current.data[i - 2]) / 3 : cGray));

      baselineWeightedX += x * bEdge;
      baselineTotalWeight += bEdge;
      currentWeightedX += x * cEdge;
      currentTotalWeight += cEdge;
    }
  }

  const baselineCenterX = baselineTotalWeight > 0 ? baselineWeightedX / baselineTotalWeight : w / 2;
  const currentCenterX = currentTotalWeight > 0 ? currentWeightedX / currentTotalWeight : w / 2;

  return Math.abs(currentCenterX - baselineCenterX);
}
