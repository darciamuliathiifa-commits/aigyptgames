import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetParticipant, useClaimPrize, useCreateEntry, type Entry } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ExternalLink, RefreshCw, Copy, CheckCircle2, Dices } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetSettings } from '@workspace/api-client-react';

export default function Status() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const participantId = localStorage.getItem('aigypt_participant_id');
  const claimPrizeMutation = useClaimPrize();
  const createEntryMutation = useCreateEntry();

  const [copiedCode, setCopiedCode] = useState(false);
  const [revealCode, setRevealCode] = useState(false);

  const { data: participant, isLoading, isFetching, isError, error, refetch } = useGetParticipant(participantId || '', {
    query: {
      enabled: !!participantId,
      queryKey: ['participant', participantId!],
      // 404 = ID di localStorage sudah tidak ada di database → jangan retry
      retry: (failureCount, err) => (err as any)?.status !== 404 && failureCount < 2,
    }
  });

  // ID peserta di localStorage sudah tidak ada di database → bersihkan sesi
  // lama dan arahkan ke /join, jangan render halaman kosong.
  // Guard: jangan redirect kalau query lagi fetching ulang (bisa ada cached error
  // dari sesi sebelumnya yang belum sempat di-refresh).
  useEffect(() => {
    if (isError && !isFetching && (error as any)?.status === 404) {
      localStorage.removeItem('aigypt_participant_id');
      localStorage.removeItem('aigypt_active_entry_id');
      setLocation('/join');
    }
  }, [isError, isFetching, error, setLocation]);

  const { data: settings } = useGetSettings();

  // Supabase realtime: listen for any submission changes for this participant
  useEffect(() => {
    if (!participantId) {
      setLocation('/join');
      return;
    }

    const channel = supabase
      .channel(`public:submissions:participant_id=eq.${participantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions', filter: `participant_id=eq.${participantId}` }, () => {
        refetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [participantId, setLocation, refetch]);

  const handleClaim = () => {
    claimPrizeMutation.mutate({ data: { participant_id: participant!.id } }, {
      onSuccess: () => { setRevealCode(true); refetch(); },
      onError: (err: any) => {
        toast({ title: "Gagal klaim hadiah", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleNewEntry = () => {
    if (!participantId) return;
    createEntryMutation.mutate({ data: { participant_id: participantId } }, {
      onSuccess: (entry) => {
        // Save active entry info for gacha animation on join page
        localStorage.setItem('aigypt_active_entry_id', entry.id);
        localStorage.setItem('aigypt_active_entry_card', JSON.stringify(entry.anomaly_card));
        setLocation('/join?newentry=1');
      },
      onError: (err: any) => {
        toast({ title: "Gagal bikin entry baru", description: err.message || "Coba lagi.", variant: "destructive" });
      }
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: "Kode disalin!" });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  if (isError) {
    const status = (error as any)?.status;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-6 text-sm text-muted-foreground">
        {status === 404
          ? 'Sesi lama tidak ditemukan — mengalihkan ke pendaftaran…'
          : 'Gagal memuat data. Coba refresh halaman ini.'}
      </div>
    );
  }

  if (!participant) return null;

  const entries = participant.entries ?? [];
  const entryCount = entries.length;
  const remainingEntries = 3 - entryCount;

  const isPastDeadline = settings?.deadline_submit && new Date(settings.deadline_submit) < new Date();

  // Has at least one verified submission → eligible for prize claim
  const hasVerifiedEntry = entries.some(e => e.submission?.status === 'verified');

  const statusLabel = (status?: string | null) => {
    if (!status) return { text: 'Belum Upload', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (status === 'pending') return { text: 'Menunggu Verifikasi', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    if (status === 'verified') return { text: 'Terverifikasi ✓', color: 'text-primary', bg: 'bg-primary/10' };
    if (status === 'rejected') return { text: 'Ditolak', color: 'text-destructive', bg: 'bg-destructive/10' };
    return { text: status, color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <Navbar />

      <main className="flex-1 container max-w-md mx-auto px-4 pt-24 pb-20 relative z-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl mb-1">Status Misi</h1>
          <p className="text-sm text-muted-foreground">{participant.name} · {participant.ig_handle}</p>
        </div>

        {/* ── ENTRY CARDS ── */}
        <div className="space-y-4">
          {entries.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
              <p className="text-muted-foreground text-sm mb-4">Belum ada entry. Tarik kartu anomalimu!</p>
              <button onClick={() => setLocation('/join')} className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl">
                Mulai Sekarang
              </button>
            </div>
          )}

          {entries.map((entry: Entry) => {
            const sub = entry.submission;
            const badge = statusLabel(sub?.status);
            return (
              <div key={entry.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {/* Entry header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-primary">Entry #{entry.entry_number}</span>
                    {entry.anomaly_card && (
                      <span className="text-sm font-medium text-muted-foreground">
                        {entry.anomaly_card.emoji} {entry.anomaly_card.text}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.bg} ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>

                {/* Submission content */}
                {sub ? (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0 border border-border">
                        <img src={sub.image_url} alt="Karya" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {sub.status === 'pending' && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Admin lagi ngecek tag <span className="font-bold text-foreground">@ai.gypt</span> di post kamu. Pantau terus!
                          </p>
                        )}
                        {sub.status === 'verified' && (
                          <div>
                            <p className="text-sm font-bold text-primary flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Karya verified!
                            </p>
                            {sub.winner_category && (
                              <div className="mt-1 inline-flex px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs font-bold rounded">
                                🏆 {sub.winner_category}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">{sub.vote_count ?? 0} vote</p>
                          </div>
                        )}
                        {sub.status === 'rejected' && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Admin nggak nemuin tag @ai.gypt. Cek lagi dan submit ulang.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action for this entry */}
                    {(sub.status === 'rejected' || sub.status === 'pending') && (
                      <button
                        onClick={() => {
                          localStorage.setItem('aigypt_active_entry_id', entry.id);
                          setLocation('/submit');
                        }}
                        className="w-full py-2.5 rounded-xl bg-secondary border border-border text-secondary-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
                      >
                        {sub.status === 'rejected' ? 'Submit Ulang' : 'Ganti Karya'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Belum ada karya untuk entry ini.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          localStorage.setItem('aigypt_active_entry_id', entry.id);
                          setLocation('/prompt');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-secondary border border-border text-secondary-foreground font-bold text-sm hover:bg-secondary/80 transition-all"
                      >
                        Lihat Prompt
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('aigypt_active_entry_id', entry.id);
                          setLocation('/submit');
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all"
                      >
                        Upload Karya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── IKUT LAGI BUTTON ── */}
        {!isPastDeadline && remainingEntries > 0 && entryCount > 0 && (
          <button
            onClick={handleNewEntry}
            disabled={createEntryMutation.isPending}
            className="w-full py-4 rounded-xl border-2 border-primary text-primary font-display font-bold text-lg hover:bg-primary/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {createEntryMutation.isPending ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                <Dices className="w-5 h-5" /> Ikut Lagi 🎲 (sisa {remainingEntries} percobaan)
              </>
            )}
          </button>
        )}

        {/* ── JATAH HABIS ── */}
        {entryCount >= 3 && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="font-bold text-muted-foreground">Jatah percobaan lo udah habis (3/3) — pantau votenya! 🔥</p>
          </div>
        )}

        {/* ── PRIZE SECTION (per akun, bukan per karya) ── */}
        {hasVerifiedEntry && (
          <div className="space-y-4">
            <div className="h-px bg-border" />
            {!participant.prize_basic && !revealCode ? (
              <button
                onClick={handleClaim}
                disabled={claimPrizeMutation.isPending}
                className="w-full aspect-[4/1] relative overflow-hidden rounded-2xl group flex flex-col items-center justify-center border border-primary/50 shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_50px_rgba(124,58,237,0.5)] transition-all"
                style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.2) 100%)' }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-shimmer"></div>
                {claimPrizeMutation.isPending ? (
                  <Loader2 className="animate-spin w-8 h-8 text-primary" />
                ) : (
                  <>
                    <div className="flex items-center gap-3 z-10 group-hover:scale-105 transition-transform">
                      <h2 className="font-display text-2xl font-bold text-primary-foreground drop-shadow-md">Klaim Akses</h2>
                      <img src="/LOGO_AINA.png" alt="AINA" className="h-7 object-contain drop-shadow-md" />
                      <span className="text-2xl">🎁</span>
                    </div>
                    <p className="text-xs text-primary-foreground/70 mt-2 z-10">Tap untuk buka kode rahasiamu</p>
                  </>
                )}
              </button>
            ) : (
              <AnimatePresence>
                {(participant.prize_basic || revealCode) && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="bg-card border border-primary rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(124,58,237,0.5)] relative overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent pointer-events-none"></div>

                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Kode Akses Lo</h3>

                    <div className="my-6 relative inline-block">
                      <div className="text-4xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-300 tracking-wider">
                        {participant.prize_basic?.code || 'LOADING'}
                      </div>
                      <div className="absolute -inset-2 bg-primary/20 blur-xl -z-10 rounded-full"></div>
                    </div>

                    <button
                      onClick={() => copyCode(participant.prize_basic?.code || '')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-secondary text-secondary-foreground rounded-xl font-bold text-base hover:bg-secondary/80 transition-colors mb-6 border border-border min-h-[52px]"
                    >
                      {copiedCode ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
                      {copiedCode ? 'Tersalin!' : 'Copy Kode'}
                    </button>

                    <div className="pt-6 border-t border-border/50 space-y-4">
                      <p className="text-sm text-muted-foreground">Masukkan kode ini di website AINA Labs untuk aktivasi aksesmu.</p>
                      <a
                        href="https://ainalabs.pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                      >
                        Buka ainalabs.pro <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
