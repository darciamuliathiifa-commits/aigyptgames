import { Link } from 'wouter';
import { useGetLeaderboard } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

/**
 * AIGYPT Games Hub — landing page.
 * User langsung disambut pilihan game. Fase 1: AI Poster Challenge (live).
 * Fase 2: tambah game baru dengan menambah objek di array GAMES di bawah.
 */

type GameStatus = 'live' | 'soon';

interface GameDef {
  slug: string;
  emoji: string;
  title: string;
  desc: string;
  href?: string;
  status: GameStatus;
  prize?: string;
}

const GAMES: GameDef[] = [
  {
    slug: 'poster-challenge',
    emoji: '🎨',
    title: 'AI Poster Challenge',
    desc: 'Foto tenant AIGYPT, gacha kartu anomali, biarin AI yang ngegas. Vote terbanyak menang.',
    href: '/challenge',
    status: 'live',
    prize: 'Semua yang kelar dapet akses AINA',
  },
  {
    slug: 'racik-prompt',
    emoji: '🧪',
    title: 'Racik Prompt',
    desc: 'Susun prompt-mu sendiri dari balok — gambar, tulisan, musik, atau mini app. Pahami caranya, bukan cuma hasilnya.',
    href: '/racik',
    status: 'live',
    prize: 'Karya terverifikasi = akses AINA',
  },
  {
    slug: 'game-3',
    emoji: '🔮',
    title: 'Masih Rahasia',
    desc: 'Sabar. Yang ini bakal lebih gila.',
    status: 'soon',
  },
];

export default function Hub() {
  const { data: leaderboard } = useGetLeaderboard();
  const karyaCount = leaderboard?.length ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      {/* ── Background layer (sama dengan Home) ── */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
        <div
          className="absolute top-[30%] left-[25%] w-[50%] h-[40%] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', animation: 'blob-drift-1 70s ease-in-out infinite' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 w-full container max-w-md md:max-w-5xl mx-auto px-4 pt-24 pb-6 flex flex-col items-center">
        {/* ── Header ── */}
        <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 text-xs font-bold text-primary backdrop-blur-sm mb-5">
          🕹️ AIGYPT GAMES
        </div>

        <h1
          className="font-display font-bold uppercase tracking-tighter leading-[0.95] text-center mb-3"
          style={{ fontSize: 'clamp(2.2rem, 11vw, 4rem)' }}
        >
          <span className="block text-white/90" style={{ animation: 'hero-line-in 0.5s ease-out both' }}>
            PILIH
          </span>
          <span className="block" style={{ animation: 'hero-line-in 0.5s ease-out both', animationDelay: '80ms' }}>
            <span className="hero-shimmer">GAME SERUMU</span> 🎲
          </span>
        </h1>

        <p className="text-muted-foreground font-medium text-sm md:text-base max-w-sm text-center leading-relaxed mb-10">
          Satu tenant, banyak cara buat seru-seruan bareng AI. Mulai dari sini.
        </p>

        {/* ── Game cards — berjejer 1 kolom di HP, 3 kolom sejajar di desktop ── */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {GAMES.map((game) =>
            game.status === 'live' ? (
              <div
                key={game.slug}
                className="group relative flex flex-col rounded-2xl border border-primary/40 bg-card/60 backdrop-blur-sm p-6 shadow-[0_0_30px_rgba(124,58,237,0.25)] hover:shadow-[0_0_50px_rgba(124,58,237,0.45)] hover:border-primary/70 hover:-translate-y-1 transition-all"
              >
                {/* LIVE badge */}
                <div className="absolute -top-3 left-5 inline-flex items-center gap-1.5 bg-background border border-red-500/40 rounded-full px-3 py-1 text-[11px] font-bold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  LIVE SEKARANG
                </div>

                <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                  {game.emoji}
                </div>
                <h2 className="font-display font-bold text-2xl leading-tight mb-1.5">{game.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{game.desc}</p>

                {/* Prize strip */}
                {game.prize && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-bold text-primary mb-4">
                    <span>🎁</span>
                    <span className="truncate">{game.prize}</span>
                    <img src="/LOGO_AINA.png" alt="AINA" className="h-3.5 object-contain ml-auto shrink-0" />
                  </div>
                )}

                <div className="mt-auto space-y-3">
                  <span className="text-xs text-muted-foreground font-medium block">
                    {karyaCount > 0 ? `${karyaCount} karya udah masuk 🔥` : 'Jadi yang pertama main 👀'}
                  </span>
                  <Link
                    href={game.href!}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-display font-bold text-base px-5 py-3 shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:bg-primary/90 transition-colors"
                  >
                    Gas Main <span className="dice-wiggle inline-block">🎲</span>
                  </Link>

                  {/* Link Galeri & Leaderboard — scoped ke game ini doang,
                      karena belum tentu game lain punya galeri/leaderboard */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/gallery"
                      className="py-2 rounded-lg bg-secondary/80 text-secondary-foreground text-xs font-bold text-center border border-border hover:bg-secondary hover:border-primary/30 transition-all"
                    >
                      Galeri & Vote
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="py-2 rounded-lg bg-secondary/80 text-secondary-foreground text-xs font-bold text-center border border-border hover:bg-secondary hover:border-primary/30 transition-all"
                    >
                      Leaderboard
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={game.slug}
                className="relative flex flex-col rounded-2xl border border-dashed border-border bg-card/30 p-6 opacity-70"
              >
                <div className="absolute -top-3 left-5 inline-flex items-center gap-1.5 bg-background border border-border rounded-full px-3 py-1 text-[11px] font-bold text-muted-foreground">
                  🔒 SEGERA HADIR
                </div>
                <div className="w-14 h-14 shrink-0 rounded-xl bg-secondary/60 border border-border flex items-center justify-center text-3xl grayscale mb-4">
                  {game.emoji}
                </div>
                <h2 className="font-display font-bold text-2xl leading-tight mb-1.5 text-muted-foreground">{game.title}</h2>
                <p className="text-muted-foreground/70 text-sm leading-relaxed">{game.desc}</p>
              </div>
            ),
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
