import { useRef, useCallback, useEffect } from 'react';

/**
 * Detects a figure-8 gesture drawn on the screen.
 * The detection works by tracking touch points and checking if the path
 * forms two loops (like an 8) by crossing itself.
 */
export function useGesture8(onDetected) {
  const pointsRef = useRef([]);
  const activeRef = useRef(false);
  const timerRef = useRef(null);

  const reset = () => {
    pointsRef.current = [];
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    reset();
    activeRef.current = true;
    const t = e.touches[0];
    pointsRef.current = [{ x: t.clientX, y: t.clientY }];
    // Auto-reset after 3 seconds
    timerRef.current = setTimeout(reset, 3000);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!activeRef.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const pts = pointsRef.current;
    const last = pts[pts.length - 1];
    // Sample every ~8px to avoid too many points
    const dx = t.clientX - last.x;
    const dy = t.clientY - last.y;
    if (dx * dx + dy * dy > 64) {
      pts.push({ x: t.clientX, y: t.clientY });
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    const pts = pointsRef.current;
    if (pts.length < 30) { reset(); return; } // Too few points

    // Detect figure-8 by counting self-intersections
    let crossings = 0;
    for (let i = 0; i < pts.length - 3; i++) {
      for (let j = i + 3; j < pts.length - 1; j++) {
        if (segmentsIntersect(
          pts[i], pts[i + 1],
          pts[j], pts[j + 1]
        )) {
          crossings++;
          if (crossings >= 2) break;
        }
      }
      if (crossings >= 2) break;
    }

    // A figure-8 has at least 2 self-intersections (the crossing point)
    // Also check that the path covers enough vertical space (not just a scribble)
    const ys = pts.map(p => p.y);
    const height = Math.max(...ys) - Math.min(...ys);
    const xs = pts.map(p => p.x);
    const width = Math.max(...xs) - Math.min(...xs);

    if (crossings >= 2 && height > 80 && width > 30) {
      onDetected();
    }

    reset();
  }, [onDetected]);

  useEffect(() => {
    const el = document;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}

// Line segment intersection test
function segmentsIntersect(a, b, c, d) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(det) < 1e-10) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t > 0 && t < 1 && u > 0 && u < 1;
}
