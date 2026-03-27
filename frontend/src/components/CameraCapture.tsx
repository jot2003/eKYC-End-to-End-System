import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, X, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  mode: 'document' | 'face';
  onCapture: (file: File) => void;
  onClose: () => void;
  label?: string;
}

const ID_CARD_RATIO = 85.6 / 54;
const STABILITY_THRESHOLD = 8;
const STABILITY_FRAMES_NEEDED = 12;
const COUNTDOWN_FROM = 3;

export default function CameraCapture({ mode, onCapture, onClose, label }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const stableCountRef = useRef(0);
  const rafRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(
    mode === 'face' ? 'user' : 'environment'
  );
  const [captured, setCaptured] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState('');
  const [detected, setDetected] = useState(false);

  const countdownRef = useRef<number | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(fallback);
        setError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = fallback;
        }
      } catch {
        setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
      }
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stream || captured) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let running = true;

    function analyzeFrame() {
      if (!running || !video || !canvas || !ctx) return;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const sampleW = Math.floor(video.videoWidth / 4);
      const sampleH = Math.floor(video.videoHeight / 4);
      canvas.width = sampleW;
      canvas.height = sampleH;
      ctx.drawImage(video, 0, 0, sampleW, sampleH);

      const frame = ctx.getImageData(0, 0, sampleW, sampleH);

      if (prevFrameRef.current && frame.data.length === prevFrameRef.current.data.length) {
        const diff = computeFrameDiff(prevFrameRef.current, frame);

        if (diff < STABILITY_THRESHOLD) {
          stableCountRef.current++;
        } else {
          stableCountRef.current = 0;
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            setCountdown(null);
          }
          setDetected(false);
        }

        const stable = stableCountRef.current >= STABILITY_FRAMES_NEEDED;
        setIsStable(stable);

        if (mode === 'document') {
          const guide = getDocumentGuide(sampleW, sampleH);
          const edgeScore = detectDocumentEdges(frame, guide);
          const contrastOk = checkGuideContrast(frame, guide);

          if (stable && (edgeScore > 0.15 || contrastOk)) {
            setDetected(true);
            setDetectionStatus('Phát hiện CCCD - Giữ nguyên');
            if (!countdownRef.current) startCountdown();
          } else if (stable) {
            setDetectionStatus('Giữ nguyên - Đang quét...');
          } else {
            setDetectionStatus('Đặt CCCD vào khung hướng dẫn');
          }
        } else {
          const faceGuide = getFaceGuide(sampleW, sampleH);
          const hasFace = detectFaceRegion(frame, faceGuide);

          if (stable && hasFace) {
            setDetected(true);
            setDetectionStatus('Phát hiện khuôn mặt - Giữ nguyên');
            if (!countdownRef.current) startCountdown();
          } else if (stable) {
            setDetectionStatus('Giữ nguyên - Đang quét...');
          } else {
            setDetectionStatus('Đưa khuôn mặt vào khung hướng dẫn');
          }
        }
      }

      prevFrameRef.current = frame;
      rafRef.current = requestAnimationFrame(analyzeFrame);
    }

    rafRef.current = requestAnimationFrame(analyzeFrame);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, captured, mode]);

  useEffect(() => {
    if (captured || !stream) return;
    drawOverlay();
    const onResize = () => drawOverlay();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, captured, isStable, countdown, detected, mode]);

  function drawOverlay() {
    const overlay = overlayRef.current;
    const container = containerRef.current;
    if (!overlay || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    overlay.width = w;
    overlay.height = h;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);

    if (mode === 'document') {
      const guideW = w * 0.82;
      const guideH = guideW / ID_CARD_RATIO;
      const gx = (w - guideW) / 2;
      const gy = (h - guideH) / 2;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      roundRect(ctx, gx, gy, guideW, guideH, 8);
      ctx.fill();
      ctx.restore();

      const borderColor = countdown !== null
        ? 'rgba(34, 197, 94, 0.95)'
        : detected
          ? 'rgba(59, 130, 246, 0.9)'
          : 'rgba(255, 255, 255, 0.6)';

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      roundRect(ctx, gx, gy, guideW, guideH, 8);
      ctx.stroke();

      drawCornerMarks(ctx, gx, gy, guideW, guideH, borderColor);

      if (isStable && countdown === null) {
        const scanY = gy + 4 + ((Date.now() / 15) % (guideH - 8));
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx + 10, scanY);
        ctx.lineTo(gx + guideW - 10, scanY);
        ctx.stroke();
      }
    } else {
      const ovalRx = w * 0.26;
      const ovalRy = ovalRx * 1.35;
      const cx = w / 2;
      const cy = h * 0.44;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(cx, cy, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const borderColor = countdown !== null
        ? 'rgba(34, 197, 94, 0.95)'
        : detected
          ? 'rgba(59, 130, 246, 0.9)'
          : 'rgba(255, 255, 255, 0.6)';

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.5;
      if (countdown === null && !detected) {
        ctx.setLineDash([8, 5]);
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isStable && countdown === null) {
        const scanY = cy - ovalRy + 6 + ((Date.now() / 15) % (ovalRy * 2 - 12));
        const halfW = Math.sqrt(Math.max(0, 1 - ((scanY - cy) / ovalRy) ** 2)) * ovalRx;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - halfW + 5, scanY);
        ctx.lineTo(cx + halfW - 5, scanY);
        ctx.stroke();
      }
    }
  }

  function startCountdown() {
    let count = COUNTDOWN_FROM;
    setCountdown(count);

    countdownRef.current = window.setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(null);
        doCapture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }

  function doCapture() {
    const video = videoRef.current;
    if (!video) return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(captureCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    captureCanvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCaptured(url);
          stableCountRef.current = 0;
          setIsStable(false);
          setDetected(false);
        }
      },
      'image/jpeg',
      0.92
    );
  }

  function handleConfirm() {
    if (!captured) return;
    fetch(captured)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `camera_${mode}_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        cleanup();
      });
  }

  function handleRetake() {
    if (captured) URL.revokeObjectURL(captured);
    setCaptured(null);
    stableCountRef.current = 0;
    prevFrameRef.current = null;
    setIsStable(false);
    setDetected(false);
    setCountdown(null);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  function handleSwitchCamera() {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    stableCountRef.current = 0;
    prevFrameRef.current = null;
    setDetected(false);
    startCamera(newFacing);
  }

  function cleanup() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }

  function handleClose() { cleanup(); onClose(); }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
          <Camera size={28} className="text-red-400" />
        </div>
        <p className="text-white font-medium mb-2">Camera không khả dụng</p>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={handleClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors">Đóng</button>
      </div>
    );
  }

  if (captured) {
    return (
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden">
        <img src={captured} alt="Captured" className="w-full aspect-4/3 object-contain bg-black" />
        <div className="p-4 flex items-center justify-center gap-4">
          <button onClick={handleRetake} className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors">
            <RotateCcw size={16} /> Chụp lại
          </button>
          <button onClick={handleConfirm} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25">
            <Check size={16} /> Sử dụng ảnh này
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden">
      <div ref={containerRef} className="relative aspect-4/3 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={overlayRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
              <span className="text-5xl font-bold text-white drop-shadow-lg">{countdown}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-30 w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="absolute bottom-3 left-3 right-3 z-20">
          <div className={`backdrop-blur-sm rounded-lg px-3 py-2 ${detected ? 'bg-blue-600/60' : 'bg-black/50'}`}>
            <p className="text-white text-xs text-center font-medium">
              {detectionStatus || (label ?? (mode === 'document' ? 'Đặt CCCD vào khung hướng dẫn' : 'Đưa khuôn mặt vào khung'))}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center justify-center gap-6">
        <button onClick={handleSwitchCamera} className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600 transition-colors" title="Đổi camera">
          <SwitchCamera size={18} />
        </button>
        <button onClick={doCapture} className="w-16 h-16 rounded-full border-4 border-white bg-white/10 hover:bg-white/30 transition-colors flex items-center justify-center group" title="Chụp thủ công">
          <div className="w-12 h-12 rounded-full bg-white group-hover:scale-95 transition-transform" />
        </button>
        <div className="w-10 h-10" />
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCornerMarks(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  const len = 24;
  const lw = 3;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';

  const corners = [
    [x, y, 1, 0, 0, 1],
    [x + w, y, -1, 0, 0, 1],
    [x, y + h, 1, 0, 0, -1],
    [x + w, y + h, -1, 0, 0, -1],
  ];

  for (const [cx, cy, dx, dy, ex, ey] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * len, cy + dy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + ex * len, cy + ey * len);
    ctx.stroke();
  }
}

function getDocumentGuide(frameW: number, frameH: number) {
  const guideW = Math.floor(frameW * 0.82);
  const guideH = Math.floor(guideW / ID_CARD_RATIO);
  const gx = Math.floor((frameW - guideW) / 2);
  const gy = Math.floor((frameH - guideH) / 2);
  return { x: gx, y: gy, w: guideW, h: guideH };
}

function getFaceGuide(frameW: number, frameH: number) {
  const rx = Math.floor(frameW * 0.26);
  const ry = Math.floor(rx * 1.35);
  const cx = Math.floor(frameW / 2);
  const cy = Math.floor(frameH * 0.44);
  return { cx, cy, rx, ry };
}

function computeFrameDiff(prev: ImageData, curr: ImageData): number {
  const len = prev.data.length;
  let totalDiff = 0;
  const step = 12;
  for (let i = 0; i < len; i += step * 4) {
    totalDiff += Math.abs(prev.data[i] - curr.data[i]);
    totalDiff += Math.abs(prev.data[i + 1] - curr.data[i + 1]);
    totalDiff += Math.abs(prev.data[i + 2] - curr.data[i + 2]);
  }
  const samples = Math.floor(len / (step * 4));
  return totalDiff / (samples * 3);
}

function detectDocumentEdges(
  frame: ImageData,
  guide: { x: number; y: number; w: number; h: number }
): number {
  const w = frame.width;
  const data = frame.data;
  const threshold = 25;
  let edgePixels = 0;
  let totalChecked = 0;

  const edges = [
    { sx: guide.x, sy: guide.y, ex: guide.x + guide.w, ey: guide.y, normal: 'v' },
    { sx: guide.x, sy: guide.y + guide.h, ex: guide.x + guide.w, ey: guide.y + guide.h, normal: 'v' },
    { sx: guide.x, sy: guide.y, ex: guide.x, ey: guide.y + guide.h, normal: 'h' },
    { sx: guide.x + guide.w, sy: guide.y, ex: guide.x + guide.w, ey: guide.y + guide.h, normal: 'h' },
  ];

  for (const edge of edges) {
    const steps = Math.max(Math.abs(edge.ex - edge.sx), Math.abs(edge.ey - edge.sy));
    for (let s = 0; s < steps; s += 2) {
      const t = s / Math.max(steps, 1);
      const px = Math.floor(edge.sx + (edge.ex - edge.sx) * t);
      const py = Math.floor(edge.sy + (edge.ey - edge.sy) * t);

      if (px < 2 || px >= w - 2 || py < 2 || py >= frame.height - 2) continue;

      const idx = (py * w + px) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      const offset = edge.normal === 'v' ? w * 4 * 2 : 4 * 2;
      const n1 = (data[idx - offset] + data[idx - offset + 1] + data[idx - offset + 2]) / 3;
      const n2 = (data[idx + offset] + data[idx + offset + 1] + data[idx + offset + 2]) / 3;

      if (Math.abs(n1 - gray) > threshold || Math.abs(n2 - gray) > threshold) {
        edgePixels++;
      }
      totalChecked++;
    }
  }

  return totalChecked > 0 ? edgePixels / totalChecked : 0;
}

function checkGuideContrast(
  frame: ImageData,
  guide: { x: number; y: number; w: number; h: number }
): boolean {
  const w = frame.width;
  const h = frame.height;
  const data = frame.data;

  let insideSum = 0;
  let insideCount = 0;
  let outsideSum = 0;
  let outsideCount = 0;

  const margin = 6;

  for (let y = guide.y - margin; y < guide.y + guide.h + margin; y += 4) {
    for (let x = guide.x - margin; x < guide.x + guide.w + margin; x += 4) {
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = (y * w + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      const inside = x >= guide.x && x < guide.x + guide.w && y >= guide.y && y < guide.y + guide.h;
      if (inside) {
        insideSum += gray;
        insideCount++;
      } else {
        outsideSum += gray;
        outsideCount++;
      }
    }
  }

  if (insideCount === 0 || outsideCount === 0) return false;
  const insideAvg = insideSum / insideCount;
  const outsideAvg = outsideSum / outsideCount;
  return Math.abs(insideAvg - outsideAvg) > 15;
}

function detectFaceRegion(
  frame: ImageData,
  guide: { cx: number; cy: number; rx: number; ry: number }
): boolean {
  const w = frame.width;
  const h = frame.height;
  const data = frame.data;

  let skinPixels = 0;
  let totalChecked = 0;

  for (let y = guide.cy - guide.ry; y < guide.cy + guide.ry; y += 3) {
    for (let x = guide.cx - guide.rx; x < guide.cx + guide.rx; x += 3) {
      if (x < 0 || x >= w || y < 0 || y >= h) continue;

      const dx = (x - guide.cx) / guide.rx;
      const dy = (y - guide.cy) / guide.ry;
      if (dx * dx + dy * dy > 1) continue;

      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (isSkinColor(r, g, b)) skinPixels++;
      totalChecked++;
    }
  }

  return totalChecked > 0 && skinPixels / totalChecked > 0.2;
}

function isSkinColor(r: number, g: number, b: number): boolean {
  return (
    r > 70 && g > 35 && b > 15 &&
    r > g && r > b &&
    Math.abs(r - g) > 10 &&
    r - b > 10
  );
}
