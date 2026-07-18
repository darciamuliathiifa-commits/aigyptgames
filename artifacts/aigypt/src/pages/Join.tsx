import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useCreateParticipant, useGetParticipant, type AnomalyCard } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { AnomalyCard as AnomalyCardDisplay } from '@/components/AnomalyCard';
import { MissionStepper } from '@/components/MissionStepper';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Nama terlalu pendek'),
  email: z.string().email('Format email tidak valid'),
  ig_handle: z.string().min(2, 'Username IG harus diisi'),
  wants_class_info: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function Join() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [participantId, setParticipantId] = useState<string | null>(
    localStorage.getItem('aigypt_participant_id')
  );

  const { data: existingParticipant, isLoading: loadingExisting, isError: existingError, error: existingErrorObj } = useGetParticipant(participantId || '', {
    query: {
      enabled: !!participantId,
      queryKey: ['participant', participantId!],
      // 404 = ID di localStorage sudah tidak ada di database → jangan retry
      retry: (failureCount, err) => (err as any)?.status !== 404 && failureCount < 2,
    }
  });

  const createParticipant = useCreateParticipant();

  // Check if this is a "new entry" flow initiated from Status page
  const searchParams = new URLSearchParams(window.location.search);
  const isNewEntry = searchParams.get('newentry') === '1';

  const storedCard = (() => {
    try {
      const raw = localStorage.getItem('aigypt_active_entry_card');
      return raw ? (JSON.parse(raw) as AnomalyCard) : null;
    } catch {
      return null;
    }
  })();

  const [gameState, setGameState] = useState<'form' | 'email_taken' | 'shuffle' | 'reveal' | 'done'>(
    isNewEntry && storedCard ? 'shuffle' :
    participantId ? 'done' : 'form'
  );

  const [drawnCard, setDrawnCard] = useState<AnomalyCard | null>(
    isNewEntry && storedCard ? storedCard : null
  );

  // State for "email already registered" scenario
  const [takenParticipant, setTakenParticipant] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', ig_handle: '', wants_class_info: false },
  });

  useEffect(() => {
    if (existingParticipant && gameState === 'form') {
      setGameState('done');
    }
  }, [existingParticipant, gameState]);

  // Sesi di localStorage sudah tidak ada di database (mis. DB direset) →
  // jangan tampilkan layar sukses palsu; bersihkan diam-diam dan kembali ke form.
  useEffect(() => {
    if (existingError && (existingErrorObj as any)?.status === 404) {
      localStorage.removeItem('aigypt_participant_id');
      localStorage.removeItem('aigypt_active_entry_id');
      setParticipantId(null);
      setDrawnCard(null);
      setGameState('form');
    }
  }, [existingError, existingErrorObj]);

  const onSubmit = (data: FormValues) => {
    const handle = data.ig_handle.startsWith('@') ? data.ig_handle : `@${data.ig_handle}`;

    createParticipant.mutate({
      data: { ...data, ig_handle: handle, email: data.email.toLowerCase().trim() }
    }, {
      onSuccess: (res) => {
        localStorage.setItem('aigypt_participant_id', res.id);
        if (res.active_entry_id) {
          localStorage.setItem('aigypt_active_entry_id', res.active_entry_id);
        }
        setParticipantId(res.id);
        setDrawnCard(res.anomaly_card ?? null);
        setGameState('shuffle');
      },
      onError: (err: any) => {
        // 409 = email already registered
        if (err?.status === 409 || err?.response?.status === 409) {
          const body = err?.response?.data ?? err?.data;
          if (body?.error === 'email_taken' && body?.participant) {
            setTakenParticipant(body.participant);
            setGameState('email_taken');
            return;
          }
        }
        toast({
          title: "Error",
          description: err.message || "Gagal mendaftar. Coba lagi.",
          variant: "destructive"
        });
      }
    });
  };

  const handleRestoreSession = () => {
    if (!takenParticipant) return;
    localStorage.setItem('aigypt_participant_id', takenParticipant.id);
    // Hapus cache React Query yang mungkin menyimpan error 404 dari sesi
    // sebelumnya — kalau tidak, Status page bisa langsung redirect balik ke
    // /join sebelum network request yang baru sempat selesai.
    queryClient.removeQueries({ queryKey: ['participant', takenParticipant.id] });
    setLocation('/status');
  };

  const triggerConfetti = () => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#7C3AED', '#A78BFA', '#F3E8FF'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#7C3AED', '#A78BFA', '#F3E8FF'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleDraw = () => {
    setGameState('reveal');
    setTimeout(() => {
      triggerConfetti();
      setTimeout(() => setGameState('done'), 1200);
    }, 200);
  };

  // Store the card from new-entry flow for display
  useEffect(() => {
    if (isNewEntry && storedCard && gameState === 'done') {
      // Clean up temp stored card
      localStorage.removeItem('aigypt_active_entry_card');
    }
  }, [gameState, isNewEntry, storedCard]);

  const displayCard = drawnCard || (existingParticipant?.entries?.[0]?.anomaly_card) || existingParticipant?.anomaly_card;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <Navbar />

      <main className="flex-1 container max-w-md mx-auto px-4 pt-24 pb-20 relative z-10 flex flex-col">
        <MissionStepper currentStep={gameState === 'form' || gameState === 'email_taken' ? 'daftar' : 'gacha'} className="mb-10" />

        <AnimatePresence mode="wait">
          {/* ── FORM ── */}
          {gameState === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm"
            >
              <h1 className="font-display font-bold text-2xl mb-2 text-center">Daftar Misi</h1>
              <p className="text-muted-foreground text-center text-sm mb-6">
                Masukkan data kamu untuk mulai dan tarik kartu anomali.
              </p>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Nama Panggilan</label>
                  <input
                    {...form.register('name')}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-[16px]"
                    placeholder="John Doe"
                    autoComplete="name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Email</label>
                  <input
                    {...form.register('email')}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-[16px]"
                    placeholder="john@example.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Email ini jadi identitas akunmu — pakai yang sama kalau ganti device.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Username IG</label>
                  <input
                    {...form.register('ig_handle')}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-[16px]"
                    placeholder="@johndoe"
                    autoComplete="username"
                    inputMode="text"
                  />
                  {form.formState.errors.ig_handle && (
                    <p className="text-xs text-destructive">{form.formState.errors.ig_handle.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1 bg-amber-500/10 text-amber-500 p-2 rounded-lg border border-amber-500/20">
                    ⚠️ Akun IG harus public supaya tag-nya bisa kami verifikasi.
                  </p>
                </div>

                <label className="flex items-center gap-3 p-3 border border-border rounded-xl bg-background cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="checkbox"
                    {...form.register('wants_class_info')}
                    className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span className="text-sm">Mau info kelas AIGYPT?</span>
                </label>

                <button
                  type="submit"
                  disabled={createParticipant.isPending}
                  className="w-full py-4 mt-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {createParticipant.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : 'Lanjut & Gacha'}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── EMAIL ALREADY TAKEN ── */}
          {gameState === 'email_taken' && takenParticipant && (
            <motion.div
              key="email_taken"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm text-center"
            >
              <div className="text-4xl mb-4">👋</div>
              <h2 className="font-display font-bold text-xl mb-2">Email ini udah terdaftar!</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Ketemu akun atas nama <span className="font-bold text-foreground">{takenParticipant.name}</span>.{' '}
                Lanjutin sebagai dia?
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleRestoreSession}
                  className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-primary/90 transition-all"
                >
                  Lanjut sebagai {takenParticipant.name} →
                </button>
                <button
                  onClick={() => { setGameState('form'); setTakenParticipant(null); }}
                  className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm border border-border hover:bg-secondary/80 transition-all"
                >
                  Bukan aku — balik ke form
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SHUFFLE / PICK A CARD ── */}
          {gameState === 'shuffle' && (
            <motion.div
              key="shuffle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
            >
              <h2 className="font-display font-bold text-3xl mb-10 text-center animate-pulse text-primary">Tarik Kartu Kamu!</h2>

              <div className="relative w-full max-w-sm h-80 flex items-center justify-center">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ rotate: 0, y: 0 }}
                    animate={{ rotate: (i - 2) * 15, y: Math.abs(i - 2) * 20, x: (i - 2) * 30 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div
                      className="w-32 h-44 rounded-xl bg-sidebar border border-sidebar-border p-2 cursor-pointer hover:-translate-y-4 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all"
                      onClick={handleDraw}
                      style={{ background: 'repeating-linear-gradient(45deg, hsl(var(--card)), hsl(var(--card)) 10px, hsl(var(--secondary)) 10px, hsl(var(--secondary)) 20px)' }}
                    >
                      <div className="w-full h-full border border-primary/20 rounded-lg flex items-center justify-center">
                        <span className="font-display font-bold text-primary/50 text-2xl">?</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="mt-10 text-muted-foreground font-bold">Tap kartu mana aja</p>
            </motion.div>
          )}

          {/* ── REVEAL / DONE ── */}
          {(gameState === 'reveal' || gameState === 'done') && displayCard && (
            <motion.div
              key="reveal"
              initial={gameState === 'reveal' ? { scale: 0.5, opacity: 0 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col items-center"
            >
              <h2 className="font-display font-bold text-2xl mb-8 text-center">
                {gameState === 'done' ? 'Kartu Kamu:' : 'Dapet...'}
              </h2>

              <div className="mb-10 w-full max-w-[280px]">
                <AnomalyCardDisplay card={displayCard} isFlipped={gameState === 'done'} />
              </div>

              {gameState === 'done' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full space-y-4"
                >
                  <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl text-center mb-6">
                    <p className="text-sm font-bold text-primary-foreground">Target kamu sekarang:</p>
                    <p className="text-muted-foreground text-sm mt-1">Gabungin anomali ini ke dalam postermu.</p>
                  </div>

                  <button
                    onClick={() => {
                      // Hapus cached error lama supaya Prompt.tsx tidak langsung
                      // redirect sebelum fresh fetch selesai.
                      const pid = localStorage.getItem('aigypt_participant_id');
                      if (pid) queryClient.removeQueries({ queryKey: ['participant', pid] });
                      setLocation('/prompt');
                    }}
                    className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-primary/90 transition-all"
                  >
                    Lanjut ke Prompt →
                  </button>

                  <button
                    onClick={() => setLocation('/status')}
                    className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-bold text-sm border border-border hover:bg-secondary/80 transition-all"
                  >
                    Lihat Status Saya
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <Footer />
      </main>
    </div>
  );
}
