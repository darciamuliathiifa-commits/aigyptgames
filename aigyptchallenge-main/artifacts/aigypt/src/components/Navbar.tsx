import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent safe-top",
          scrolled ? "bg-background/85 backdrop-blur-md border-border shadow-sm py-3" : "bg-transparent py-4"
        )}
      >
        <div className="container max-w-md mx-auto px-4 md:max-w-4xl flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-xl text-primary flex items-center gap-2 group">
            <img
              src="/favicon_AIGYPT.png"
              alt="AIGYPT"
              className="w-7 h-7 object-contain group-hover:scale-110 transition-transform"
            />
            <span className="tracking-tight">AIGYPT</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/gallery" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              Galeri
            </Link>
            <Link href="/leaderboard" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              Skor
            </Link>
            <Link
              href="/join"
              className="text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-[0_0_10px_rgba(124,58,237,0.3)] min-h-[36px] flex items-center"
            >
              Misi
            </Link>
          </nav>

          {/* Mobile nav: hamburger + Misi always visible */}
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
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[68px] z-40 md:hidden">
          <div className="bg-background/95 backdrop-blur-md border-b border-border shadow-xl px-4 py-3 flex flex-col gap-1">
            <Link
              href="/gallery"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary font-bold text-sm transition-colors min-h-[48px]"
            >
              Galeri & Vote
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary font-bold text-sm transition-colors min-h-[48px]"
            >
              Leaderboard
            </Link>
            <Link
              href="/status"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary font-bold text-sm transition-colors min-h-[48px]"
            >
              Status Misi
            </Link>
          </div>
        </div>
      )}

      {/* Backdrop to close menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
