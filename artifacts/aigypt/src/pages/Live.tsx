import { useState, useEffect } from 'react';
import { useGetGallery, useGetLeaderboard, useGetSettings } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { Countdown } from '@/components/Countdown';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export default function Live() {
  const queryClient = useQueryClient();
  const { data: gallery, refetch: refetchGallery } = useGetGallery({ query: { refetchInterval: 30000 } as never });
  const { data: leaderboard, refetch: refetchLeaderboard } = useGetLeaderboard({ query: { refetchInterval: 30000 } as never });
  const { data: settings } = useGetSettings();

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [isSpotlightVisible, setIsSpotlightVisible] = useState(false);

  // Setup fullscreen styles & QR
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.cursor = 'none';
    
    QRCode.toDataURL(window.location.origin, {
      color: { dark: '#FFFFFF', light: '#00000000' },
      margin: 1,
      width: 150
    }).then(setQrCodeUrl).catch(console.error);

    return () => {
      document.body.style.overflow = '';
      document.body.style.cursor = '';
    };
  }, []);

  // Supabase realtime for fresh data
  useEffect(() => {
    const channel = supabase.channel('public:submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        refetchGallery();
        refetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchGallery, refetchLeaderboard]);

  // Spotlight rotation logic (12s total: 5s show, 7s hide)
  useEffect(() => {
    if (!gallery || gallery.length === 0) return;
    
    const showSpotlight = () => {
      setIsSpotlightVisible(true);
      setTimeout(() => {
        setIsSpotlightVisible(false);
        // Prep next index
        setTimeout(() => {
          setSpotlightIndex(prev => (prev + 1) % gallery.length);
        }, 1000);
      }, 6000); // Show for 6 seconds
    };

    const interval = setInterval(showSpotlight, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [gallery]);


  const hasWinners = gallery?.some(entry => entry.winner_category);
  const winners = gallery?.filter(e => e.winner_category) || [];

  if (!gallery || gallery.length === 0) {
    return <div className="h-screen w-screen bg-background flex flex-col items-center justify-center text-primary-foreground font-display text-4xl">Waiting for submissions...</div>;
  }

  // Auto-scroll the background grid very slowly
  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-40">
        <div className="columns-4 sm:columns-6 lg:columns-8 gap-4 space-y-4 p-4 animate-scroll-vertical h-[200%]">
          {[...gallery, ...gallery, ...gallery].map((entry, i) => (
            <div key={`${entry.submission_id}-${i}`} className="break-inside-avoid">
              <img src={entry.image_url} alt="" className="w-full rounded-lg filter grayscale opacity-60" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-background/80"></div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start z-10">
        <div>
          <h1 className="font-display font-bold text-5xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-white drop-shadow-lg mb-2">
            AIGYPT Poster Challenge
          </h1>
          <p className="text-xl text-primary-foreground/80 font-medium">Ikutan sekarang! Selesaikan misinya, dapet akses AINA.</p>
        </div>
        
        {settings?.deadline_submit && new Date(settings.deadline_submit) > new Date() && (
          <div className="bg-card/50 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl transform scale-125 origin-top-right">
            <Countdown deadline={settings.deadline_submit} />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 flex items-center justify-center p-20 z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          {hasWinners ? (
            // WINNER SHOWCASE MODE
            <motion.div 
              key="winners"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center w-full gap-8"
            >
              {winners.map((winner, idx) => (
                <div key={winner.submission_id} className="relative flex flex-col items-center">
                  <div className="absolute -top-10 z-30 bg-amber-500 text-black font-display font-bold text-xl px-6 py-2 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                    🏆 {winner.winner_category}
                  </div>
                  <div className="w-[400px] aspect-[4/5] rounded-2xl overflow-hidden border-[6px] border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.3)] relative group">
                    <img src={winner.image_url} className="w-full h-full object-cover" alt="" />
                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                      <h2 className="font-display font-bold text-3xl text-white">{winner.name}</h2>
                      <p className="text-xl text-primary-foreground/80">{winner.ig_handle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            // SPOTLIGHT MODE
            isSpotlightVisible && gallery[spotlightIndex] && (
              <motion.div
                key="spotlight"
                initial={{ opacity: 0, y: 100, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, y: -100, scale: 0.8, rotate: 5 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                className="relative max-w-2xl w-full"
              >
                {/* Glow behind */}
                <div className="absolute -inset-10 bg-primary/20 blur-[100px] rounded-full -z-10"></div>
                
                <div className="bg-card border-2 border-primary/50 rounded-[2rem] p-4 shadow-[0_0_50px_rgba(124,58,237,0.4)] flex bg-opacity-80 backdrop-blur-xl">
                  <div className="w-2/3 aspect-[4/5] rounded-xl overflow-hidden shadow-inner bg-muted shrink-0 relative">
                    <img src={gallery[spotlightIndex].image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="w-1/3 p-8 flex flex-col justify-center gap-6">
                    <div className="text-7xl drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                      {gallery[spotlightIndex].emoji}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-4xl text-white leading-tight mb-2">
                        {gallery[spotlightIndex].name}
                      </h2>
                      <p className="text-2xl text-primary font-medium">{gallery[spotlightIndex].ig_handle}</p>
                    </div>
                    
                    <div className="mt-auto">
                      <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest mb-1">Total Votes</p>
                      <p className="font-display text-5xl font-bold text-foreground">
                        {gallery[spotlightIndex].vote_count}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Footer Leaderboard Strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/90 border-t border-border backdrop-blur-md p-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <div className="font-display font-bold text-xl text-muted-foreground shrink-0 uppercase tracking-widest px-4 border-r border-border">
            Top 5
          </div>
          <div className="flex gap-8 overflow-hidden marquee-container flex-1">
            {leaderboard?.slice(0, 5).map((entry, idx) => (
              <div key={entry.submission_id} className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0 border border-border">
                  <img src={entry.image_url} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <p className="font-bold text-lg whitespace-nowrap">{entry.name}</p>
                  <p className="text-primary text-sm font-bold whitespace-nowrap">{entry.vote_count} votes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {qrCodeUrl && (
          <div className="flex items-center gap-4 ml-8 shrink-0 bg-card border border-border p-2 rounded-xl">
            <div className="text-right">
              <p className="font-display font-bold text-lg leading-none mb-1">Scan untuk main</p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <span className="text-muted-foreground text-xs font-bold">Menangkan akses</span>
                <img src="/LOGO_AINA.png" alt="AINA" className="h-4 object-contain" />
              </div>
            </div>
            <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20 rounded bg-white" />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-vertical {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-scroll-vertical {
          animation: scroll-vertical 120s linear infinite;
        }
      `}} />
    </div>
  );
}
