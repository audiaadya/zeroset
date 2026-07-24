import { useEffect, useRef } from 'react';

export default function ProofCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);
    let raf = 0;

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const onLeave = () => { mouseRef.current.active = false; };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    // Triangle vertices for a geometry proof
    const getVerts = () => {
      const cx = w / 2;
      const cy = h / 2 + 20;
      const r = Math.min(w, h) * 0.28;
      return {
        A: { x: cx, y: cy - r },
        B: { x: cx - r * 0.87, y: cy + r * 0.5 },
        C: { x: cx + r * 0.87, y: cy + r * 0.5 },
        M: { x: cx - r * 0.43, y: cy + r * 0.5 }, // midpoint of AB
        N: { x: cx + r * 0.43, y: cy + r * 0.5 }, // midpoint of AC
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const v = getVerts();
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const active = mouseRef.current.active;

      // Highlight proximity
      const distTo = (p: { x: number; y: number }) => Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      const highlightMN = active && distTo({ x: (v.M.x + v.N.x) / 2, y: (v.M.y + v.N.y) / 2 }) < 60;
      const highlightA = active && distTo(v.A) < 40;

      // Triangle
      ctx.strokeStyle = 'rgba(34, 224, 200, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(v.A.x, v.A.y);
      ctx.lineTo(v.B.x, v.B.y);
      ctx.lineTo(v.C.x, v.C.y);
      ctx.closePath();
      ctx.stroke();

      // Midsegment MN
      ctx.strokeStyle = highlightMN ? 'rgba(251, 191, 36, 0.9)' : 'rgba(34, 224, 200, 0.35)';
      ctx.lineWidth = highlightMN ? 2 : 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(v.M.x, v.M.y);
      ctx.lineTo(v.N.x, v.N.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Auxiliary line from A to midpoint of BC (median)
      const midBC = { x: (v.B.x + v.C.x) / 2, y: (v.B.y + v.C.y) / 2 };
      if (highlightA) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(v.A.x, v.A.y);
        ctx.lineTo(midBC.x, midBC.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Vertex labels
      ctx.fillStyle = highlightA ? '#fbbf24' : '#22E0C8';
      ctx.font = '600 14px Georgia, serif';
      ctx.fillText('A', v.A.x - 4, v.A.y - 8);
      ctx.fillText('B', v.B.x - 14, v.B.y + 14);
      ctx.fillText('C', v.C.x + 6, v.C.y + 14);

      // Midpoint labels
      ctx.fillStyle = highlightMN ? '#fbbf24' : 'rgba(34, 224, 200, 0.6)';
      ctx.font = '500 11px JetBrains Mono, monospace';
      ctx.fillText('M', v.M.x - 10, v.M.y + 14);
      ctx.fillText('N', v.N.x + 4, v.N.y + 14);

      // Theorem text
      ctx.fillStyle = 'rgba(150, 162, 192, 0.5)';
      ctx.font = '400 10px JetBrains Mono, monospace';
      ctx.fillText('Midsegment Theorem', 16, 24);
      ctx.fillText('MN ∥ BC, |MN| = ½|BC|', 16, 40);

      // Hover hint
      if (active) {
        ctx.fillStyle = 'rgba(34, 224, 200, 0.3)';
        ctx.font = '400 9px JetBrains Mono, monospace';
        ctx.fillText('← hover vertices & segments', 16, h - 16);
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-crosshair"
      aria-label="Interactive geometry proof canvas"
    />
  );
}
