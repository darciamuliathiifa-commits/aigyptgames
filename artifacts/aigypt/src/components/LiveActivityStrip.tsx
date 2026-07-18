import { useState, useEffect, useMemo } from 'react';
import { useGetRecentJoins, useGetLeaderboard } from '@workspace/api-client-react';

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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0];
}

export function LiveActivityStrip() {
  const noMotion = usePrefersReducedMotion();
  const { data: recentJoins } = useGetRecentJoins({ query: { refetchInterval: 30_000 } as never });
  const { data: leaderboard } = useGetLeaderboard({ query: { refetchInterval: 30_000 } as never });

  const messages = useMemo<string[]>(() => {
    const count = leaderboard?.length ?? 0;
    const msgs: string[] = [`🔥 ${count > 0 ? count : '?'} karya udah masuk arena`];

    if (recentJoins && recentJoins.length > 0) {
      recentJoins.slice(0, 6).forEach(join => {
        const fn = firstName(join.name);
        msgs.push(`🎲 ${fn} baru aja narik kartu ${join.emoji}`);
        msgs.push(`🖼️ ${fn} baru submit karya!`);
      });
    }

    return msgs;
  }, [recentJoins, leaderboard]);

  const [visible, setVisible] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (messages.length <= 1 || noMotion) return;
    const id = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setVisible(v => (v + 1) % messages.length);
        setAnimating(false);
      }, 350);
    }, 4000);
    return () => clearInterval(id);
  }, [messages.length, noMotion]);

  return (
    <div className="flex items-center justify-center overflow-hidden h-8 mt-2">
      <span
        className="text-sm font-medium text-muted-foreground text-center"
        style={{
          display: 'inline-block',
          animation: animating
            ? 'reel-out 0.35s ease-in forwards'
            : 'activity-slide-in 0.35s ease-out forwards',
          willChange: 'transform, opacity',
        }}
        key={visible}
        aria-live="polite"
      >
        {messages[visible]}
      </span>
    </div>
  );
}
