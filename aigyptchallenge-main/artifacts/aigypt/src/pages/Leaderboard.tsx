import { useEffect } from 'react';
import { useGetLeaderboard, useGetRecentJoins } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { SubmissionCard } from '@/components/SubmissionCard';
import { Footer } from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Leaderboard() {
  const queryClient = useQueryClient();
  const { data: leaderboard, isLoading: loadingLeaderboard, refetch: refetchLeaderboard } = useGetLeaderboard();
  const { data: recentJoins, isLoading: loadingRecent, refetch: refetchRecent } = useGetRecentJoins();

  useEffect(() => {
    const channel = supabase.channel('public:submissions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        refetchLeaderboard();
        refetchRecent();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchLeaderboard, refetchRecent]);

  const hasWinners = leaderboard?.some(entry => entry.winner_category);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      <Navbar />
      
      <main className="flex-1 container max-w-md mx-auto px-4 pt-24 pb-20 md:max-w-4xl">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">
            Leaderboard
          </h1>
          {recentJoins && (
            <div className="text-sm font-bold px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full animate-pulse">
              🔥 {recentJoins.length} karya masuk
            </div>
          )}
        </div>

        {hasWinners && (
          <section className="mb-16">
            <h2 className="font-display font-bold text-2xl mb-6 flex items-center gap-2">
              <span className="text-3xl">🏆</span> Pemenang
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {leaderboard?.filter(e => e.winner_category).map((entry) => (
                <SubmissionCard key={`win-${entry.submission_id}`} entry={entry} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-16">
          <h2 className="font-display font-bold text-2xl mb-6 border-b border-border pb-2">Papan Skor</h2>
          {loadingLeaderboard ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Belum ada karya terverifikasi.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leaderboard.map((entry, index) => (
                <SubmissionCard 
                  key={entry.submission_id} 
                  entry={entry} 
                  rank={index + 1}
                  votingOpen={false} // voting only in gallery
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display font-bold text-2xl mb-6 border-b border-border pb-2">Baru Bergabung (Menunggu)</h2>
          {loadingRecent ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
          ) : !recentJoins || recentJoins.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">Belum ada submission baru.</div>
          ) : (
            <div className="space-y-4">
              {recentJoins.map((entry) => (
                <div key={entry.submission_id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                    <img src={entry.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{entry.name}</h4>
                    <p className="text-xs text-muted-foreground truncate">{entry.ig_handle}</p>
                  </div>
                  {entry.status === 'pending' ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 shrink-0">
                      Pending
                    </span>
                  ) : entry.status === 'verified' ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-primary/10 text-primary rounded border border-primary/20 shrink-0">
                      Verified
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
        <Footer />
      </main>
    </div>
  );
}
