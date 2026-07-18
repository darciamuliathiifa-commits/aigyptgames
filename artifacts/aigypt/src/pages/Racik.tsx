import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Copy, CheckCircle2, Loader2, Info, Sparkles, ArrowLeft } from 'lucide-react';

/**
 * Meja Racik — game "Racik Prompt".
 * Peserta MENYUSUN prompt dari balok (bukan copy-paste), lihat prompt-nya
 * terbentuk live, jalankan sendiri di Gemini/ChatGPT/Suno, submit hasilnya.
 * Tujuan edukasi: paham sebab-akibat tiap keputusan dalam prompt.
 */

interface PromptBlock {
  id: string;
  track: string;
  category: string;
  label: string;
  prompt_id: string;
  prompt_en: string;
  tooltip: string;
  emoji: string;
  sort_order: number;
}

const TRACKS = [
  { key: 'image', emoji: '🖼️', title: 'Gambar', desc: 'Racik prompt visual, jalankan di Gemini/ChatGPT', tool: 'Gemini / ChatGPT' },
  { key: 'text',  emoji: '✍️', title: 'Tulisan', desc: 'Cerpen, puisi, atau thread — AI yang nulis, kamu yang ngarahin', tool: 'Gemini / ChatGPT' },
  { key: 'music', emoji: '🎵', title: 'Musik', desc: 'Bikin lagu beneran pakai Suno (gratis)', tool: 'Suno (suno.com)' },
  { key: 'code',  emoji: '💻', title: 'Mini App', desc: 'Bikin tools berguna tanpa perlu bisa ngoding', tool: 'ChatGPT / Claude' },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  subjek: 'Subjek', gaya: 'Gaya Visual', cahaya: 'Pencahayaan', mood: 'Mood', detail: 'Detail Pamungkas',
  format: 'Format', sudut_pandang: 'Sudut Pandang', gaya_bahasa: 'Gaya Bahasa', twist: 'Twist',
  genre: 'Genre', tempo_mood: 'Tempo & Mood', tema: 'Tema Lirik', bahasa: 'Bahasa Lirik',
  jenis_tool: 'Jenis Tool', pengguna: 'Target Pengguna', fitur: 'Fitur Wajib', tampilan: 'Gaya Tampilan',
};

type Step = 'pick-track' | 'compose' | 'submit' | 'done';

export default function Racik() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('pick-track');
  const [blocks, setBlocks] = useState<PromptBlock[]>([]);
  const [track, setTrack] = useState<string>('');
  const [tantangan, setTantangan] = useState<PromptBlock | null>(null);
  const [gachaTrack, setGachaTrack] = useState(false); // badge "Berani Tantangan"
  const [selected, setSelected] = useState<Record<string, PromptBlock>>({});
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Konten submit per jalur
  const [file, setFile] = useState<File | null>(null);
  const [contentText, setContentText] = useState('');
  const [contentUrl, setContentUrl] = useState('');

  const participantId = typeof window !== 'undefined' ? localStorage.getItem('participant_id') : null;

  useEffect(() => {
    fetch('/api/racik/blocks')
      .then(r => r.ok ? r.json() : [])
      .then(setBlocks)
      .catch(() => {});
  }, []);

  const trackBlocks = useMemo(() => blocks.filter(b => b.track === track), [blocks, track]);
  const categories = useMemo(() => {
    const cats: string[] = [];
    for (const b of trackBlocks) if (!cats.includes(b.category)) cats.push(b.category);
    return cats;
  }, [trackBlocks]);

  const pickTrack = async (t: string, viaGacha: boolean) => {
    setTrack(t);
    setGachaTrack(viaGacha);
    setSelected({});
    try {
      const r = await fetch(`/api/racik/gacha?track=${t}`);
      if (r.ok) setTantangan(await r.json());
    } catch { /* tantangan opsional — jalan terus */ }
    setStep('compose');
  };

  const tantangAku = () => {
    const t = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    pickTrack(t.key, true);
  };

  // ── Prompt live: dirakit dari balok terpilih + kartu tantangan ──
  const promptID = useMemo(() => {
    const parts = categories.map(c => selected[c]?.prompt_id).filter(Boolean);
    if (tantangan) parts.push(tantangan.prompt_id);
    return parts.join(', ');
  }, [selected, categories, tantangan]);

  const promptEN = useMemo(() => {
    const parts = categories.map(c => selected[c]?.prompt_en).filter(Boolean);
    if (tantangan) parts.push(tantangan.prompt_en);
    return parts.join(', ');
  }, [selected, categories, tantangan]);

  const allPicked = categories.length > 0 && categories.every(c => selected[c]);

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptEN).then(() => {
      setCopied(true);
      toast({ title: 'Prompt tersalin! 📋', description: 'Paste di AI pilihanmu, lalu kembali ke sini buat submit hasilnya.' });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSubmit = async () => {
    if (!participantId) {
      toast({ title: 'Daftar dulu ya', description: 'Kamu perlu terdaftar sebagai peserta buat submit.', variant: 'destructive' });
      setLocation('/join');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (track === 'image') {
        if (!file) throw new Error('Pilih gambar hasilnya dulu ya');
        const fileName = `racik-${participantId}-${Date.now()}.webp`;
        const { error: upErr } = await supabase.storage.from('posters').upload(fileName, file, { upsert: true });
        if (upErr) throw new Error(`Upload gagal: ${upErr.message}`);
        imageUrl = supabase.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
      }

      const r = await fetch('/api/racik/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          track,
          block_ids: Object.values(selected).map(b => b.id),
          tantangan_block_id: tantangan?.id,
          image_url: imageUrl,
          content_text: contentText || undefined,
          content_url: contentUrl || undefined,
        }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || 'Gagal submit');

      setStep('done');
    } catch (err: any) {
      toast({ title: 'Gagal submit', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const trackInfo = TRACKS.find(t => t.key === track);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
      {/* Background — bahasa visual yang sama */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 container max-w-md md:max-w-2xl mx-auto px-4 pt-24 pb-20 flex flex-col">

        {/* ═══ STEP 1: Pilih jalur ═══ */}
        {step === 'pick-track' && (
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5 text-xs font-bold text-primary mb-5">
              🧪 RACIK PROMPT
            </div>
            <h1 className="font-display font-bold uppercase tracking-tighter text-center leading-[0.95] mb-3" style={{ fontSize: 'clamp(1.9rem, 9vw, 3.2rem)' }}>
              <span className="block text-white/90">SUSUN PROMPTMU</span>
              <span className="hero-shimmer block">SENDIRI</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-sm text-center leading-relaxed mb-8">
              Bukan copy-paste. Kamu yang meracik — pilih balok, lihat prompt-nya terbentuk, dan pahami kenapa hasilnya bisa begitu.
            </p>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {TRACKS.map(t => (
                <button
                  key={t.key}
                  onClick={() => pickTrack(t.key, false)}
                  className="text-left rounded-2xl border border-border bg-card/60 p-5 hover:border-primary/60 hover:shadow-[0_0_25px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  <span className="text-3xl block mb-2">{t.emoji}</span>
                  <h2 className="font-display font-bold text-lg mb-1">{t.title}</h2>
                  <p className="text-muted-foreground text-xs leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={tantangAku}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-primary font-bold px-6 py-3 hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Tantang Aku — gacha jalurku! 🎲
            </button>
            <p className="text-muted-foreground/60 text-xs mt-2">Karya dari jalur gacha dapet badge khusus 😎</p>
          </div>
        )}

        {/* ═══ STEP 2: Meja Racik ═══ */}
        {step === 'compose' && trackInfo && (
          <div>
            <button onClick={() => setStep('pick-track')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" /> Ganti jalur
            </button>

            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">{trackInfo.emoji}</span>
              <h1 className="font-display font-bold text-2xl">Meja Racik — {trackInfo.title}</h1>
              {gachaTrack && <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">🎲 BERANI TANTANGAN</span>}
            </div>
            <p className="text-muted-foreground text-sm mb-5">Pilih satu balok di tiap kategori. Perhatikan prompt-mu tumbuh di bawah 👇</p>

            {/* Kartu tantangan hasil gacha */}
            {tantangan && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 mb-6">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">🎴 Kartu Tantangan (wajib masuk racikan)</p>
                <p className="font-bold text-amber-100">{tantangan.emoji} {tantangan.label}</p>
                <p className="text-xs text-amber-200/60 mt-1">{tantangan.tooltip}</p>
              </div>
            )}

            {/* Kategori & balok */}
            <div className="space-y-6">
              {categories.map(cat => (
                <div key={cat}>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-2.5">
                    {CATEGORY_LABELS[cat] ?? cat}
                    {selected[cat] && <span className="text-primary ml-2">✓</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {trackBlocks.filter(b => b.category === cat).map(b => {
                      const isSel = selected[cat]?.id === b.id;
                      return (
                        <div key={b.id} className="relative">
                          <button
                            onClick={() => {
                              setSelected(s => ({ ...s, [cat]: b }));
                              setOpenTooltip(openTooltip === b.id ? null : b.id);
                            }}
                            className={`rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all ${
                              isSel
                                ? 'border-primary bg-primary/20 text-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                : 'border-border bg-card/60 text-foreground hover:border-primary/40'
                            }`}
                          >
                            {b.emoji} {b.label}
                          </button>
                          {/* Tooltip edukasi "kenapa" */}
                          {openTooltip === b.id && (
                            <div className="absolute left-0 top-full mt-1.5 z-20 w-64 rounded-lg bg-popover border border-border p-3 text-xs text-muted-foreground shadow-xl">
                              <Info className="w-3 h-3 inline mr-1 text-primary" />
                              {b.tooltip}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Prompt live ── */}
            <div className="sticky bottom-3 mt-8 rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-md p-4 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Prompt racikanmu {allPicked ? '— lengkap! 🎉' : `(${Object.keys(selected).length}/${categories.length} balok)`}
              </p>
              {promptID ? (
                <>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-1">{promptID}{tantangan ? '' : ''}</p>
                  <p className="text-xs text-muted-foreground/70 italic leading-relaxed border-t border-border/50 pt-1.5 mt-1.5 font-mono">{promptEN}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">Pilih balok pertamamu, prompt-nya muncul di sini...</p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={copyPrompt}
                  disabled={!allPicked}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Tersalin!' : 'Copy Prompt (EN)'}
                </button>
                <button
                  onClick={() => setStep('submit')}
                  disabled={!allPicked}
                  className="rounded-xl border border-primary/40 text-primary font-bold px-4 py-3 disabled:opacity-40 hover:bg-primary/10 transition-colors"
                >
                  Submit Hasil →
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Jalankan di <span className="font-bold">{trackInfo.tool}</span> → simpan hasilnya → balik ke sini.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Submit ═══ */}
        {step === 'submit' && trackInfo && (
          <div>
            <button onClick={() => setStep('compose')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="w-4 h-4" /> Balik ke Meja Racik
            </button>
            <h1 className="font-display font-bold text-2xl mb-2">Submit Karya {trackInfo.emoji}</h1>
            <p className="text-muted-foreground text-sm mb-6">Udah dijalanin di {trackInfo.tool}? Setor hasilnya di sini.</p>

            {track === 'image' && (
              <label className="block rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 text-center cursor-pointer mb-4">
                <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <span className="font-bold text-primary">✓ {file.name}</span>
                ) : (
                  <span className="text-muted-foreground">Tap buat pilih gambar hasilnya 🖼️</span>
                )}
              </label>
            )}

            {track === 'text' && (
              <textarea
                value={contentText}
                onChange={e => setContentText(e.target.value)}
                rows={10}
                placeholder="Paste hasil tulisannya di sini..."
                className="w-full rounded-2xl bg-input border border-border p-4 text-sm leading-relaxed mb-4 focus:border-primary outline-none"
              />
            )}

            {(track === 'music' || track === 'code') && (
              <input
                value={contentUrl}
                onChange={e => setContentUrl(e.target.value)}
                placeholder={track === 'music' ? 'Paste link Suno lagumu (suno.com/song/...)' : 'Paste link hasilnya (CodePen, dsb)'}
                className="w-full rounded-xl bg-input border border-border px-4 py-3.5 text-sm mb-4 focus:border-primary outline-none"
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg py-4 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Kirim Karya 🚀'}
            </button>
          </div>
        )}

        {/* ═══ STEP 4: Selesai ═══ */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center pt-10">
            <span className="text-6xl mb-4">🎉</span>
            <h1 className="font-display font-bold text-3xl mb-3">Karya Terkirim!</h1>
            <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
              Karyamu masuk antrian verifikasi. Setelah disetujui, dia tampil di galeri dan bisa divote. Dan yang paling penting: barusan kamu <span className="text-primary font-bold">meracik prompt sendiri</span> — bukan copy-paste. 😉
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button onClick={() => { setStep('pick-track'); setSelected({}); setFile(null); setContentText(''); setContentUrl(''); }} className="rounded-xl bg-primary text-primary-foreground font-bold py-3.5">
                Racik Lagi 🧪
              </button>
              <button onClick={() => setLocation('/gallery')} className="rounded-xl border border-border font-bold py-3.5 hover:bg-secondary transition-colors">
                Lihat Galeri
              </button>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
