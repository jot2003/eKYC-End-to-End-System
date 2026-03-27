import { useRef, useEffect, useState, useCallback } from 'react';

interface BBox {
  bbox: number[][];
  text: string;
  confidence: number;
}

interface AnnotatedImageProps {
  imageSrc: string;
  bboxes: BBox[];
  highlightedField?: string | null;
  fieldBboxMap?: Record<string, number[]>;
  onBboxHover?: (bboxIndex: number | null) => void;
  onBboxClick?: (bboxIndex: number) => void;
}

const FIELD_COLORS: Record<string, string> = {
  so_cccd: '#ef4444',
  ho_ten: '#3b82f6',
  ngay_sinh: '#10b981',
  gioi_tinh: '#8b5cf6',
  quoc_tich: '#f59e0b',
  que_quan: '#06b6d4',
  noi_thuong_tru: '#ec4899',
  ngay_het_han: '#14b8a6',
};

export default function AnnotatedImage({
  imageSrc,
  bboxes,
  highlightedField,
  fieldBboxMap,
  onBboxHover,
  onBboxClick,
}: AnnotatedImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [hoveredBbox, setHoveredBbox] = useState<number | null>(null);
  const [scale, setScale] = useState({ sx: 1, sy: 1, ox: 0, oy: 0 });

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.src = imageSrc;
  }, [imageSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight || (cw * img.height / img.width);
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgAspect = img.width / img.height;
    const canvasAspect = cw / ch;

    let drawW: number, drawH: number, ox: number, oy: number;
    if (imgAspect > canvasAspect) {
      drawW = cw;
      drawH = cw / imgAspect;
      ox = 0;
      oy = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgAspect;
      ox = (cw - drawW) / 2;
      oy = 0;
    }

    const sx = drawW / img.width;
    const sy = drawH / img.height;
    setScale({ sx, sy, ox, oy });

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, ox, oy, drawW, drawH);

    const highlightedIndices = new Set<number>();
    if (highlightedField && fieldBboxMap && fieldBboxMap[highlightedField] !== undefined) {
      const indices = fieldBboxMap[highlightedField];
      if (Array.isArray(indices)) {
        indices.forEach((i: number) => highlightedIndices.add(i));
      } else {
        highlightedIndices.add(indices as unknown as number);
      }
    }

    bboxes.forEach((b, i) => {
      const isHighlighted = highlightedIndices.has(i);
      const isHovered = hoveredBbox === i;

      const pts = b.bbox.map(([bx, by]) => [ox + bx * sx, oy + by * sy]);

      if (isHighlighted || isHovered) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = getColorForText(b.text, bboxes, fieldBboxMap);
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      ctx.closePath();
      ctx.stroke();

      if (isHighlighted || isHovered) {
        const topY = Math.min(...pts.map((p) => p[1]));
        const leftX = Math.min(...pts.map((p) => p[0]));
        const label = b.text.substring(0, 30);

        ctx.font = '11px sans-serif';
        const metrics = ctx.measureText(label);
        const labelW = metrics.width + 8;
        const labelH = 18;
        const ly = topY - labelH - 2;

        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.fillRect(leftX, ly, labelW, labelH);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, leftX + 4, ly + 13);
      }
    });
  }, [img, bboxes, highlightedField, fieldBboxMap, hoveredBbox]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  function handleMouseMove(e: React.MouseEvent) {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: number | null = null;
    for (let i = 0; i < bboxes.length; i++) {
      const pts = bboxes[i].bbox.map(([bx, by]) => [scale.ox + bx * scale.sx, scale.oy + by * scale.sy]);
      if (isPointInPolygon(mx, my, pts)) {
        found = i;
        break;
      }
    }

    if (found !== hoveredBbox) {
      setHoveredBbox(found);
      onBboxHover?.(found);
    }
  }

  function handleClick() {
    if (hoveredBbox !== null) onBboxClick?.(hoveredBbox);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg cursor-crosshair"
        style={{ aspectRatio: img ? `${img.width}/${img.height}` : '4/3' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredBbox(null); onBboxHover?.(null); }}
        onClick={handleClick}
      />
    </div>
  );
}

function getColorForText(
  text: string,
  _bboxes: BBox[],
  fieldBboxMap?: Record<string, number[]>
): string {
  if (!fieldBboxMap) return 'rgba(0, 200, 0, 0.6)';

  for (const [field, indices] of Object.entries(fieldBboxMap)) {
    if (Array.isArray(indices)) {
      if (FIELD_COLORS[field]) return FIELD_COLORS[field] + '80';
    }
  }

  void text;
  return 'rgba(0, 200, 0, 0.5)';
}

function isPointInPolygon(x: number, y: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
