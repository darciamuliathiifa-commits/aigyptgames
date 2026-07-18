import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetParticipant } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { MissionStepper } from '@/components/MissionStepper';
import { AnomalyCard } from '@/components/AnomalyCard';
import { ExamplePostersCarousel } from '@/components/ExamplePostersCarousel';
import { Footer } from '@/components/Footer';
import { Copy, CheckCircle2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Prompt() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const participantId = localStorage.getItem('aigypt_participant_id');
  const activeEntryId = localStorage.getItem('aigypt_active_entry_id');

  const { data: participant, isLoading, isFetching, isError, error } = useGetParticipant(participantId || '', {
    query: {
      enabled: !!participantId,
      queryKey: ['participant', participantId!],
      // 404 = ID di localStorage sudah tidak ada di database → jangan retry
      retry: (failureCount, err) => (err as any)?.status !== 404 && failureCount < 2,
    }
  });

  useEffect(() => {
    if (!participantId) setLocation('/join');
  }, [participantId, setLocation]);

  // ID peserta di localStorage sudah tidak ada di database (mis. DB direset /
  // ganti project Supabase) → bersihkan sesi lama dan arahkan ke /join,
  // jangan nge-hang di "Loading..." selamanya.
  // Guard: jangan redirect kalau query lagi fetching ulang (bisa ada cached
  // error dari sesi sebelumnya yang belum sempat di-refresh).
  useEffect(() => {
    if (isError && !isFetching && (error as any)?.status === 404) {
      localStorage.removeItem('aigypt_participant_id');
      localStorage.removeItem('aigypt_active_entry_id');
      setLocation('/join');
    }
  }, [isError, isFetching, error, setLocation]);

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

  if (isLoading || !participant) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  // Use the active entry's anomaly card; fallback to latest entry, then to participant-level card
  const entries = participant.entries ?? [];
  const activeEntry = activeEntryId
    ? entries.find(e => e.id === activeEntryId)
    : entries[entries.length - 1]; // default to latest

  const activeCard = activeEntry?.anomaly_card ?? participant.anomaly_card;
  const entryNumber = activeEntry?.entry_number;

  const promptText = `Buat ulang foto booth/tenant ini menjadi poster sinematik yang epik dan kreatif.
Pertahankan logo dan tulisan "AIGYPT" tetap jelas terbaca.
Gaya: cinematic, dramatic lighting, nuansa ungu-gelap futuristik.
Tambahkan elemen anomali berikut ke dalam scene secara natural namun mencolok: ${activeCard?.text || ''}.
Kualitas: ultra detail, komposisi poster profesional, aspect ratio 4:5.`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast({ title: "Prompt tersalin!", description: "Buka Gemini atau ChatGPT sekarang." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      <Navbar />

      <main className="flex-1 container max-w-md mx-auto px-4 pt-24 pb-20 relative z-10 flex flex-col">
        <MissionStepper currentStep="upload" className="mb-10" />

        <div className="flex flex-col items-center mb-8">
          <div className="w-32 mb-6">
            <AnomalyCard card={activeCard} />
          </div>
          <h1 className="font-display font-bold text-2xl text-center">
            Bikin Posternya{entryNumber ? ` (Entry #${entryNumber})` : ''}
          </h1>
        </div>

        {/* Contoh Karya Carousel */}
        <div className="mb-8">
          <ExamplePostersCarousel />
        </div>

        <div className="space-y-8">
          {/* Step 1: Foto Tenant Sendiri */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">1</div>
              <h3 className="font-bold">Foto Tenant AIGYPT Pake HP Kamu 📸</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              Datengin tenant AIGYPT, foto booth-nya langsung pake kamera HP kamu. Bebas angle-nya — makin unik makin bagus. Foto ini yang bakal jadi bahan dasar poster kamu.
            </p>
            <p className="text-xs text-muted-foreground/70 italic">
              💡 Pastikan logo/tulisan AIGYPT keliatan jelas di fotonya.
            </p>
          </div>

          {/* Step 2: Prompt */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">2</div>
              <h3 className="font-bold">Copy Prompt</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Buka Gemini atau ChatGPT, <span className="text-foreground font-semibold">upload foto tenant yang barusan kamu jepret</span> sebagai gambar referensi, lalu paste prompt ini.
            </p>

            <a
              href="/aigypt-logo.png"
              download="Logo-AIGYPT.png"
              className="mb-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Logo AIGYPT
            </a>

            <div className="relative group">
              <div className="bg-black/50 border border-primary/20 rounded-xl p-4 font-mono text-sm text-primary-foreground/90 whitespace-pre-wrap leading-relaxed">
                {promptText}
              </div>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 p-2 bg-primary text-primary-foreground rounded-lg shadow-md hover:bg-primary/90 transition-all"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Step 3: IG Upload */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0">3</div>
              <h3 className="font-bold">Post ke Instagram</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Post karya jadinya ke IG (Feed/Story) dan <span className="text-primary font-bold">Wajib tag @ai.gypt</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              Pastikan akun tidak di-private agar admin bisa memverifikasi.
            </p>
          </div>

          <button
            onClick={() => setLocation('/submit')}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-primary/90 transition-all"
          >
            Udah Post di IG! Lanjut →
          </button>
        </div>

        <Footer />
      </main>
    </div>
  );
}

