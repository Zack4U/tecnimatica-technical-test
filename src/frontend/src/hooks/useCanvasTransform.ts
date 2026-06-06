import { useState, useRef, useCallback, useEffect } from 'react';

export type CanvasTransform = { x: number; y: number; scale: number };

const DEFAULT: CanvasTransform = { x: 0, y: 0, scale: 1 };
const MIN_SCALE = 0.25;
const MAX_SCALE = 6;
// Px de movimiento para considerar que se arrastró (no es un click)
const DRAG_THRESHOLD = 5;

function clampScale(s: number): number {
  return Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);
}

/** Convierte coordenadas de pantalla al sistema de coordenadas base del SVG (viewBox). */
function toSVGCoords(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

/**
 * Hook que gestiona el zoom/pan del canvas SVG.
 * Adjunta listeners de rueda y tacto de forma imperativa (passive:false).
 * Devuelve ref para el elemento SVG y manejadores React para mouse y teclado.
 */
export function useCanvasTransform() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [transform, setTransform] = useState<CanvasTransform>(DEFAULT);
  const [isPanning, setIsPanning] = useState(false);

  // Refs para acceso estable desde listeners imperativos
  const transformRef      = useRef(transform);
  const isPanningRef      = useRef(false);
  const lastPosRef        = useRef({ x: 0, y: 0 });
  const dragStartRef      = useRef({ x: 0, y: 0 });
  const didDragRef        = useRef(false);
  const pinchDistRef      = useRef<number | null>(null);
  const pinchLastMidRef   = useRef({ x: 0, y: 0 });

  useEffect(() => { transformRef.current = transform; }, [transform]);

  // Zoom centrado en un punto SVG (cx, cy) con un factor multiplicador
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setTransform(prev => {
      const newScale = clampScale(prev.scale * factor);
      const ratio = newScale / prev.scale;
      return { scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
    });
  }, []);

  const reset = useCallback(() => setTransform(DEFAULT), []);

  const isModified =
    transform.x !== 0 || transform.y !== 0 || transform.scale !== 1;

  // ── Wheel (non-passive para poder llamar preventDefault) ──────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x: cx, y: cy } = toSVGCoords(svg, e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setTransform(prev => {
        const newScale = clampScale(prev.scale * factor);
        const ratio = newScale / prev.scale;
        return { scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // ── Touch (non-passive) ───────────────────────────────────────────────────
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        isPanningRef.current = true;
        didDragRef.current = false;
        dragStartRef.current = lastPosRef.current = { x: t.clientX, y: t.clientY };
        pinchDistRef.current = null;
      } else if (e.touches.length >= 2) {
        isPanningRef.current = false;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchDistRef.current = dist;
        pinchLastMidRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isPanningRef.current) {
        const t = e.touches[0];
        const dx = t.clientX - lastPosRef.current.x;
        const dy = t.clientY - lastPosRef.current.y;
        if (!didDragRef.current &&
          Math.hypot(t.clientX - dragStartRef.current.x, t.clientY - dragStartRef.current.y) > DRAG_THRESHOLD) {
          didDragRef.current = true;
        }
        lastPosRef.current = { x: t.clientX, y: t.clientY };
        if (!didDragRef.current) return;
        // Convierte delta de pantalla a delta SVG
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        setTransform(prev => ({ ...prev, x: prev.x + dx / ctm.a, y: prev.y + dy / ctm.d }));
      } else if (e.touches.length >= 2 && pinchDistRef.current !== null) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = newDist / pinchDistRef.current;
        pinchDistRef.current = newDist;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // Pan del punto medio
        const dmx = midX - pinchLastMidRef.current.x;
        const dmy = midY - pinchLastMidRef.current.y;
        pinchLastMidRef.current = { x: midX, y: midY };
        const { x: cx, y: cy } = toSVGCoords(svg, midX, midY);
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        setTransform(prev => {
          const newScale = clampScale(prev.scale * factor);
          const ratio    = newScale / prev.scale;
          return {
            scale: newScale,
            x: cx - (cx - prev.x) * ratio + dmx / ctm.a,
            y: cy - (cy - prev.y) * ratio + dmy / ctm.d,
          };
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isPanningRef.current = false;
        pinchDistRef.current = null;
      } else if (e.touches.length === 1) {
        pinchDistRef.current = null;
        const t = e.touches[0];
        isPanningRef.current = true;
        lastPosRef.current = { x: t.clientX, y: t.clientY };
      }
    };

    svg.addEventListener('touchstart', onTouchStart,  { passive: false });
    svg.addEventListener('touchmove',  onTouchMove,   { passive: false });
    svg.addEventListener('touchend',   onTouchEnd,    { passive: true  });
    return () => {
      svg.removeEventListener('touchstart', onTouchStart);
      svg.removeEventListener('touchmove',  onTouchMove);
      svg.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  // ── Manejadores React (mouse) ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = lastPosRef.current = { x: e.clientX, y: e.clientY };
    setIsPanning(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanningRef.current) return;
    const { clientX, clientY } = e;
    if (!didDragRef.current &&
      Math.hypot(clientX - dragStartRef.current.x, clientY - dragStartRef.current.y) > DRAG_THRESHOLD) {
      didDragRef.current = true;
    }
    if (!didDragRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const dx = clientX - lastPosRef.current.x;
    const dy = clientY - lastPosRef.current.y;
    lastPosRef.current = { x: clientX, y: clientY };
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    setTransform(prev => ({ ...prev, x: prev.x + dx / ctm.a, y: prev.y + dy / ctm.d }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  // Suprime clicks de hijos si el gesto fue un arrastre
  const handleClickCapture = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (didDragRef.current) {
      e.stopPropagation();
      didDragRef.current = false;
    }
  }, []);

  // ── Teclado (cuando el SVG tiene foco) ────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<SVGSVGElement>) => {
    const PAN_STEP = 20;
    switch (e.key) {
      case '+': case '=':
        e.preventDefault();
        setTransform(prev => {
          const newScale = clampScale(prev.scale * 1.2);
          const ratio = newScale / prev.scale;
          const cx = 215, cy = 150; // centro del viewBox
          return { scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
        });
        break;
      case '-':
        e.preventDefault();
        setTransform(prev => {
          const newScale = clampScale(prev.scale / 1.2);
          const ratio = newScale / prev.scale;
          const cx = 215, cy = 150;
          return { scale: newScale, x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
        });
        break;
      case '0':
        e.preventDefault();
        reset();
        break;
      case 'ArrowLeft':  e.preventDefault(); setTransform(p => ({ ...p, x: p.x + PAN_STEP })); break;
      case 'ArrowRight': e.preventDefault(); setTransform(p => ({ ...p, x: p.x - PAN_STEP })); break;
      case 'ArrowUp':    e.preventDefault(); setTransform(p => ({ ...p, y: p.y + PAN_STEP })); break;
      case 'ArrowDown':  e.preventDefault(); setTransform(p => ({ ...p, y: p.y - PAN_STEP })); break;
    }
  }, [reset]);

  return {
    svgRef,
    transform,
    isModified,
    isPanning,
    reset,
    zoomAt,
    mouseHandlers: {
      onMouseDown:    handleMouseDown,
      onMouseMove:    handleMouseMove,
      onMouseUp:      handleMouseUp,
      onMouseLeave:   handleMouseUp,
      onClickCapture: handleClickCapture,
      onKeyDown:      handleKeyDown,
    },
  };
}
