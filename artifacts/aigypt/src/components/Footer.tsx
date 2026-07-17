export function Footer() {
  return (
    <footer className="w-full border-t border-border/50 py-5 mt-8">
      <div className="flex items-center justify-center gap-3">
        <img src="/favicon_AIGYPT.png" alt="AIGYPT" className="w-5 h-5 object-contain opacity-80" />
        <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">AIGYPT</span>
        <span className="text-muted-foreground/50 text-xs">×</span>
        <img src="/LOGO_AINA.png" alt="AINA" className="h-4 object-contain opacity-80" />
      </div>
    </footer>
  );
}
