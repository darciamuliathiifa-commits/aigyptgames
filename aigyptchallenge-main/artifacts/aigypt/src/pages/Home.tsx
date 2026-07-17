import { useGetSettings, useGetLeaderboard } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Countdown } from '@/components/Countdown';
import { Navbar } from '@/components/Navbar';
import { HeroFloatingCards, HeroMarqueeStrip } from '@/components/HeroExampleCards';
import { HeroAnomalyReel } from '@/components/HeroAnomalyReel';
import { LiveActivityStrip } from '@/components/LiveActivityStrip';
import { ExamplePostersCarousel } from '@/components/ExamplePostersCarousel';
import { Footer } from '@/components/Footer';

export default function Home() {
  const { data: settings } = useGetSettings();
  const { data: leaderboard } = useGetLeaderboard();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">

      {/* ── Background layer ── */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {/* Static blobs (existing) */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />

        {/* Slow drifting blobs (new — 60-90s per cycle) */}
        <div
          className="absolute top-[20%] left-[30%] w-[50%] h-[40%] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', animation: 'blob-drift-1 70s ease-in-out infinite' }}
        />
        <div
          className="absolute top-[50%] right-[10%] w-[35%] h-[35%] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(232,121,249,0.08) 0%, transparent 70%)', animation: 'blob-drift-2 85s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)', animation: 'blob-drift-3 60s ease-in-out infinite' }}
        />

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 flex flex-col items-center overflow-x-hidden">

        {/* ── Hero section ── */}
        <div className="relative w-full container max-w-4xl mx-auto px-4 flex flex-col items-center pt-20 lg:min-h-[640px]">

          {/* Desktop floating cards — absolute, z-0, behind content */}
          <HeroFloatingCards />

          {/* Hero content — z-10 */}
          <div className="relative z-10 flex flex-col items-center w-full">

            {/* ── 1. Badge row ── */}
            <div className="flex flex-wrap justify-center items-center gap-2 mb-6 mt-2">
              {/* LIVE badge */}
              <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-3 py-1.5 text-xs font-bold text-red-400 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                LIVE DARI TENANT AIGYPT
              </div>
              {/* AINA badge */}
              <a
                href="https://ainalabs.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 text-xs font-bold text-primary hover:border-primary/50 transition-colors backdrop-blur-sm"
              >
                <span>🎁</span>
                <span>Misi selesai = akses</span>
                <img src="/LOGO_AINA.png" alt="AINA" className="h-3.5 object-contain" />
              </a>
            </div>

            {/* ── 2. Title — 3 lines stagger ── */}
            <div className="text-center mb-4 px-2">
              <h1
                className="font-display font-bold uppercase tracking-tighter leading-[0.9]"
                style={{ fontSize: 'clamp(2.4rem, 13vw, 5rem)' }}
              >
                <span
                  className="block text-white/90"
                  style={{ animation: 'hero-line-in 0.5s ease-out both', animationDelay: '0ms' }}
                >
                  UBAH TENANT INI
                </span>
                <span
                  className="block text-white/90"
                  style={{ animation: 'hero-line-in 0.5s ease-out both', animationDelay: '80ms' }}
                >
                  JADI POSTER
                </span>
                <span
                  className="block"
                  style={{ animation: 'hero-line-in 0.5s ease-out both', animationDelay: '160ms' }}
                >
                  <span className="hero-shimmer">PALING GILA</span>
                  {' '}
                  <span className="not-italic">🔥</span>
                </span>
              </h1>
            </div>

            {/* ── 3. Anomaly cycling reel ── */}
            <HeroAnomalyReel />

            {/* ── 4. Tagline ── */}
            <p className="text-muted-foreground font-medium text-sm md:text-base max-w-sm mx-auto leading-relaxed text-center mb-7 px-2">
              Foto tenant AIGYPT pake HP lo, gacha kartu anomali, biarin AI yang ngegas.{' '}
              <br className="hidden sm:block" />
              3 kesempatan. Vote terbanyak menang. Semua yang kelar dapet akses AINA.
            </p>

            {/* ── 5. CTAs ── */}
            <div className="flex flex-col w-full max-w-sm gap-3 mb-8">
              {/* Primary CTA — full width, solid purple */}
              <Link
                href="/join"
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-xl text-center shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] hover:bg-primary/90 transition-all hover:-translate-y-0.5 min-h-[56px] flex items-center justify-center gap-2"
              >
                Tarik Kartu Lo{' '}
                <span className="dice-wiggle inline-block">🎲</span>
              </Link>
              {/* Secondary CTA — ghost/outline */}
              <Link
                href="/gallery"
                className="w-full py-3 rounded-xl border border-border bg-transparent text-muted-foreground font-bold text-base text-center hover:border-primary/40 hover:text-foreground transition-all min-h-[48px] flex items-center justify-center"
              >
                Intip Karya Orang 👀
              </Link>
            </div>

            {/* ── 6. Countdown ── */}
            {settings?.deadline_submit && (
              <div className="mb-6 w-full flex flex-col items-center">
                <h2 className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  ⏳ SISA WAKTU BUAT SUBMIT
                </h2>
                <Countdown deadline={settings.deadline_submit} />
              </div>
            )}

            {/* ── Mobile marquee ── */}
            <HeroMarqueeStrip />

            {/* ── 7. Live activity strip ── */}
            <LiveActivityStrip />
          </div>
        </div>

        {/* ── Below hero: steps + example posters + CTAs ── */}
        <div className="w-full container max-w-md mx-auto px-4 pb-4">

          {/* Jalan Misi */}
          <div className="w-full mt-10 pt-8 border-t border-border">
            <h3 className="font-display font-bold text-2xl text-center mb-8">Jalan Misi</h3>
            <div className="space-y-5">
              {[
                { num: '1', title: 'Daftar', desc: 'Isi form dan dapatkan ID peserta.' },
                { num: '2', title: 'Tarik Kartu Anomali', desc: 'Dapatkan elemen kejutan secara acak untuk postermu.' },
                { num: '3', title: 'Foto Tenant & Bikin Poster', desc: 'Foto booth AIGYPT pake HP lo, upload ke Gemini/ChatGPT, buat poster sinematik dengan anomalimu.' },
                { num: '4', title: 'Upload ke IG', desc: 'Post hasilnya dan tag @ai.gypt biar sah.' },
                { num: '5', title: 'Daftarkan & Klaim Hadiah', desc: 'Masukin link IG-mu, tunggu verifikasi, dan ambil akses AINA!' },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-display font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-bold">{step.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Example posters (desktop-only horizontal carousel, below steps) */}
          <div className="hidden lg:block mt-12 pt-8 border-t border-border">
            <ExamplePostersCarousel />
          </div>

          {/* Secondary nav CTAs */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            <Link
              href="/gallery"
              className="py-3 rounded-xl bg-secondary/80 text-secondary-foreground font-bold text-center border border-border hover:bg-secondary hover:border-primary/30 transition-all min-h-[48px] flex items-center justify-center"
            >
              Galeri & Vote
            </Link>
            <Link
              href="/leaderboard"
              className="py-3 rounded-xl bg-secondary/80 text-secondary-foreground font-bold text-center border border-border hover:bg-secondary hover:border-primary/30 transition-all min-h-[48px] flex items-center justify-center"
            >
              Leaderboard
            </Link>
          </div>

          <Footer />
        </div>
      </main>
    </div>
  );
}
