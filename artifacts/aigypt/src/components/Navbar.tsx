import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronLeft } from 'lucide-react';

// Route poster challenge — dipakai buat nentuin kapan nav "Galeri/Skor/Misi"
// ditampilin. Di Hub (menu pilihan game) menu ini nggak relevan karena user
// belum masuk ke game manapun.
const CHALLENGE_ROUTES = ['/challenge', '/join', '/submit', '/status', '/prompt', '/gallery', '/leaderboard', '/live'];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const isHub = location === '/';
  const inChallenge = CHALLENGE_ROUTES.includes(location);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  const navLinks = [
    { href: '/gallery', label: 'Galeri' },
    { href: '/leaderboard', label: 'Skor' },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent safe-top",
          scrolled ? "bg-background/85 backdrop-blur-md border-border shadow-sm py-3" : "bg-transparent py-4"
        )}
      >
        <div className="container max-w-md mx-auto px-4 md:max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group min-w-0">
            <img
              src="/favicon_AIGYPT.png"
              alt="AIGYPT"
              className="w-7 h-7 object-contain shrink-0 group-hover:scale-110 transition-transform"
            />
            <div className="min-w-0 leading-none">
              <span className="font-display font-bold text-xl text-primary tracking-tight block">AIGYPT</span>
              {inChallenge && (
                <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wide flex items-center gap-1 -mt-0.5">
                  <ChevronLeft className="w-2.5 h-2.5" />
                  Poster Challenge
                </span>
              )}
            </div>
          </Link>

          {/* Desktop nav — cuma muncul kalau lagi di dalam Poster Challenge,
              bukan di Hub (di Hub belum ada game yang dipilih) */}
          {inChallenge && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const active = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative text-sm font-bold px-3 py-2 rounded-lg transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
              <Link
                href="/join"
                className="ml-2 text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(124,58,237,0.3)] min-h-[36px] flex items-center"
              >
                Misi
              </Link>
            </nav>
          )}

          {/* Mobile nav: hamburger + Misi (cuma di dalam Poster Challenge) */}
          {inChallenge && (
            <div className="flex md:hidden items-center gap-3">
              <Link
                href="/join"
                className="text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(124,58,237,0.3)] min-h-[44px] flex items-center"
              >
                Misi
              </Link>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-11 h-11 rounded-xl bg-secondary/80 border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && inChallenge && (
        <div className="fixed inset-x-0 top-[68px] z-40 md:hidden">
          <div className="bg-background/95 backdrop-blur-md border-b border-border shadow-xl px-4 py-3 flex flex-col gap-1">
            <Link
              href="/gallery"
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-colors min-h-[48px]",
                location === '/gallery' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
              )}
            >
              Galeri & Vote
            </Link>
            <Link
              href="/leaderboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-colors min-h-[48px]",
                location === '/leaderboard' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
              )}
            >
              Leaderboard
            </Link>
            <Link
              href="/status"
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-colors min-h-[48px]",
                location === '/status' ? "bg-primary/10 text-primary" : "hover:bg-secondary"
              )}
            >
              Status Misi
            </Link>
            <div className="h-px bg-border my-1" />
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]"
            >
              <ChevronLeft className="w-4 h-4" /> Semua Game
            </Link>
          </div>
        </div>
      )}

      {/* Backdrop to close menu */}
      {menuOpen && inChallenge && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
