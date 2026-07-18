import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ExamplePoster {
  id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
}

// Deterministic configs — no random at render time
const LEFT_CONFIGS = [
  { topPct: 4,  rotate: -6, width: 155, dur: '5.2s', delay: '0s'   },
  { topPct: 35, rotate:  4, width: 132, dur: '6.8s', delay: '1.4s' },
  { topPct: 65, rotate: -8, width: 162, dur: '4.6s', delay: '0.8s' },
];
const RIGHT_CONFIGS = [
  { topPct: 10, rotate:  7, width: 142, dur: '6.1s', delay: '0.3s' },
  { topPct: 42, rotate: -4, width: 170, dur: '5.5s', delay: '2.0s' },
  { topPct: 70, rotate:  5, width: 126, dur: '7.0s', delay: '1.1s' },
];
const MARQUEE_ROTATIONS = [-3, 2, -5, 4, -2, 3, -4, 2];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

function usePosters() {
  const [posters, setPosters] = useState<ExamplePoster[]>([]);
  useEffect(() => {
    fetch('/api/example-posters')
      .then(r => r.ok ? r.json() : [])
      .then(setPosters)
      .catch(() => {});
  }, []);
  return posters;
}

/** Mouse parallax — returns normalized offset (-1 to 1) from viewport center */
function useMouseParallax(enabled: boolean) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      setOffset({
        x: (e.clientX - window.innerWidth  / 2) / (window.innerWidth  / 2),
        y: (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2),
      });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [enabled]);
  return offset;
}

function Lightbox({ poster, onClose }: { poster: ExamplePoster; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 bg-card rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        aria-label="Tutup"
      >
        <X className="w-5 h-5" />
      </button>
      <div onClick={e => e.stopPropagation()} className="max-w-sm w-full">
        <img
          src={poster.image_url}
          alt={poster.caption || 'Contoh poster'}
          className="w-full rounded-2xl shadow-[0_0_60px_rgba(124,58,237,0.4)]"
        />
        {poster.caption && (
          <p className="text-center text-sm text-muted-foreground mt-3">{poster.caption}</p>
        )}
      </div>
    </div>
  );
}

/* ── Desktop: absolute floating cards with mouse parallax (lg+) ─────────── */
export function HeroFloatingCards() {
  const posters = usePosters();
  const noMotion = usePrefersReducedMotion();
  const [lightbox, setLightbox] = useState<ExamplePoster | null>(null);
  const mouse = useMouseParallax(!noMotion);

  if (posters.length < 2) return null;

  const visible = posters.slice(0, 6);
  const half = Math.ceil(visible.length / 2);
  const leftPosters  = visible.slice(0, half);
  const rightPosters = visible.slice(half);

  const cardGlow = 'shadow-[0_4px_20px_rgba(124,58,237,0.18)] group-hover:shadow-[0_8px_32px_rgba(124,58,237,0.45)]';

  // Parallax speeds: left column 8px, right column 12px (opposite mouse direction)
  const leftPx  = noMotion ? 0 : -mouse.x * 8;
  const leftPy  = noMotion ? 0 : -mouse.y * 6;
  const rightPx = noMotion ? 0 : -mouse.x * 12;
  const rightPy = noMotion ? 0 : -mouse.y * 8;

  return (
    <>
      {/* Only visible on lg+ — absolute, behind content (z-0) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-0 overflow-hidden">

        {/* Left column */}
        <div
          className="absolute left-0 top-0 h-full w-[200px]"
          style={{ transform: `translate(${leftPx}px, ${leftPy}px)`, transition: noMotion ? 'none' : 'transform 0.2s ease-out', willChange: 'transform' }}
        >
          {leftPosters.map((poster, i) => {
            const cfg = LEFT_CONFIGS[i % LEFT_CONFIGS.length];
            return (
              <div
                key={poster.id}
                className="absolute pointer-events-auto"
                style={{
                  top: `${cfg.topPct}%`,
                  left: `${8 + (i % 2) * 14}px`,
                  width: `${cfg.width}px`,
                  transform: `rotate(${cfg.rotate}deg)`,
                  transition: 'transform 0.35s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.04)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = `rotate(${cfg.rotate}deg)`;
                }}
                onClick={() => setLightbox(poster)}
              >
                <div
                  style={noMotion ? {} : {
                    animation: `float-card ${cfg.dur} ${cfg.delay} ease-in-out infinite`,
                  }}
                >
                  <div className={`aspect-[4/5] rounded-2xl overflow-hidden border border-primary/30 ${cardGlow} transition-all duration-300 bg-muted opacity-85 cursor-pointer group`}>
                    <img
                      src={poster.image_url}
                      alt={poster.caption || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div
          className="absolute right-0 top-0 h-full w-[200px]"
          style={{ transform: `translate(${rightPx}px, ${rightPy}px)`, transition: noMotion ? 'none' : 'transform 0.25s ease-out', willChange: 'transform' }}
        >
          {rightPosters.map((poster, i) => {
            const cfg = RIGHT_CONFIGS[i % RIGHT_CONFIGS.length];
            return (
              <div
                key={poster.id}
                className="absolute pointer-events-auto"
                style={{
                  top: `${cfg.topPct}%`,
                  right: `${8 + (i % 2) * 14}px`,
                  width: `${cfg.width}px`,
                  transform: `rotate(${cfg.rotate}deg)`,
                  transition: 'transform 0.35s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'rotate(0deg) scale(1.04)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = `rotate(${cfg.rotate}deg)`;
                }}
                onClick={() => setLightbox(poster)}
              >
                <div
                  style={noMotion ? {} : {
                    animation: `float-card ${cfg.dur} ${cfg.delay} ease-in-out infinite`,
                  }}
                >
                  <div className={`aspect-[4/5] rounded-2xl overflow-hidden border border-primary/30 ${cardGlow} transition-all duration-300 bg-muted opacity-85 cursor-pointer group`}>
                    <img
                      src={poster.image_url}
                      alt={poster.caption || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lightbox && <Lightbox poster={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

/* ── Mobile: marquee strip (below countdown, hidden on lg+) ─────────────── */
export function HeroMarqueeStrip() {
  const posters = usePosters();
  const noMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState<ExamplePoster | null>(null);

  if (posters.length === 0) return null;

  // 2x cukup buat loop mulus (translateX -50%), sebelumnya 3x = 1/3 gambar
  // sia-sia di-download tanpa pernah kelihatan.
  const doubled = [...posters, ...posters];

  return (
    <div className="lg:hidden w-full overflow-hidden mt-5 mb-2">
      <div
        className={noMotion ? 'flex gap-3 overflow-x-auto pb-2 scrollbar-hide' : 'flex gap-3'}
        style={noMotion ? {} : {
          width: 'max-content',
          animation: `marquee 28s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
        }}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setTimeout(() => setPaused(false), 300)}
      >
        {doubled.map((poster, i) => {
          const rotate = MARQUEE_ROTATIONS[i % MARQUEE_ROTATIONS.length];
          return (
            <button
              key={`${poster.id}-${i}`}
              className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              style={{ width: '110px', transform: `rotate(${rotate}deg)` }}
              onClick={() => setLightbox(poster)}
              aria-label={poster.caption || 'Contoh poster'}
            >
              <div className="aspect-[4/5] rounded-xl overflow-hidden border border-primary/25 shadow-[0_2px_12px_rgba(124,58,237,0.15)]">
                <img
                  src={poster.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </button>
          );
        })}
      </div>
      {lightbox && <Lightbox poster={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
