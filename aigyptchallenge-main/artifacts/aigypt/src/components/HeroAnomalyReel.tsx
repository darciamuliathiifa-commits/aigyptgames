import { useState, useEffect } from 'react';

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

const ANOMALY_SAMPLES = [
  { text: 'Sphinx ngoding di tenant', emoji: '🦁' },
  { text: 'Unta pake VR headset nongkrong', emoji: '🐪' },
  { text: 'Robot AIGYPT jualan koshari', emoji: '🤖' },
  { text: 'Piramida melayang terbalik', emoji: '🔺' },
  { text: 'Alien antri daftar kelas AI', emoji: '👽' },
  { text: 'Jin keluar dari lampu, bawa laptop', emoji: '🧞' },
  { text: 'UFO nge-charge di colokan tenant', emoji: '🛸' },
  { text: 'Firaun selfie di photobooth AIGYPT', emoji: '👑' },
  { text: 'Mumi ikutan kelas Vibe Coding', emoji: '🧟' },
  { text: 'Portal galaksi terbuka di pintu', emoji: '🌌' },
];

export function HeroAnomalyReel() {
  const noMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [displayIndex, setDisplayIndex] = useState(0);

  useEffect(() => {
    if (noMotion) return;
    const id = setInterval(() => {
      setPhase('out');
      setTimeout(() => {
        setDisplayIndex(i => (i + 1) % ANOMALY_SAMPLES.length);
        setPhase('in');
        setTimeout(() => setPhase('idle'), 350);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [noMotion]);

  const card = ANOMALY_SAMPLES[displayIndex];

  return (
    <div className="flex flex-col items-center gap-0.5 mb-5 px-4 text-center" aria-live="polite">
      <span className="text-muted-foreground text-xs md:text-sm">
        Kartu lo bisa jadi:
      </span>
      {/* Fixed-height clipping box for the sliding text */}
      <div className="overflow-hidden" style={{ height: '1.75rem' }}>
        <span
          className="block font-bold text-primary text-sm md:text-base whitespace-nowrap"
          style={{
            animation: phase === 'out'
              ? 'reel-out 0.3s ease-in forwards'
              : phase === 'in'
              ? 'reel-in 0.35s ease-out forwards'
              : 'none',
            willChange: 'transform, opacity',
          }}
        >
          &ldquo;{card.text}&rdquo; {card.emoji}
        </span>
      </div>
    </div>
  );
}
