import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useCheckAdminAuth,
  useAdminLogin,
  useAdminListSubmissions,
  useAdminUpdateSubmission,
  useAdminDeleteSubmission,
  useAdminListPrizes,
  useAdminAddPrizes,
  useAdminListParticipants,
  useAdminDeleteParticipant,
  useAdminListAnomalyCards,
  useAdminAddAnomalyCard,
  useAdminToggleAnomalyCard,
  useAdminUpdateSettings,
  useGetSettings
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Download, AlertCircle, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export default function Admin() {
  const { data: authStatus, isLoading: authLoading } = useCheckAdminAuth();

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!authStatus?.authenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard />;
}

// LOGIN SCREEN
const loginSchema = z.object({ password: z.string().min(1) });

function AdminLogin() {
  const { toast } = useToast();
  const loginMutation = useAdminLogin();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' }
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: () => {
        window.location.reload();
      },
      onError: () => toast({ title: "Login Gagal", variant: "destructive" })
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border p-8 rounded-2xl shadow-xl">
        <h1 className="font-display text-2xl font-bold mb-6 text-center">Admin AIGYPT</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <input
            type="password"
            {...form.register('password')}
            placeholder="Password"
            className="w-full bg-input border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
          />
          <button type="submit" disabled={loginMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold">
            {loginMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// DASHBOARD
function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-xl text-primary">Admin Panel</h1>
          <a href="/" target="_blank" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
            Buka App <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="verifikasi" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-muted mb-8">
            <TabsTrigger value="verifikasi">Verifikasi</TabsTrigger>
            <TabsTrigger value="voting">Voting & Juara</TabsTrigger>
            <TabsTrigger value="kode">Kode Hadiah</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="contoh">Contoh Karya</TabsTrigger>
            <TabsTrigger value="anomali">Anomali</TabsTrigger>
          </TabsList>

          <TabsContent value="verifikasi"><TabVerifikasi /></TabsContent>
          <TabsContent value="voting"><TabVoting /></TabsContent>
          <TabsContent value="kode"><TabKode /></TabsContent>
          <TabsContent value="leads"><TabLeads /></TabsContent>
          <TabsContent value="contoh"><TabContohKarya /></TabsContent>
          <TabsContent value="anomali"><TabAnomali /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TabVerifikasi() {
  const { data: pending, isLoading } = useAdminListSubmissions({ status: 'pending' });
  const updateMutation = useAdminUpdateSubmission();
  const deleteMutation = useAdminDeleteSubmission();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleVerify = (id: string, status: string) => {
    updateMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Berhasil di-${status}` });
        setTimeout(() => window.location.reload(), 400);
      }
    });
  };

  const handleDelete = (id: string, participantName: string) => {
    if (!window.confirm(`Yakin mau hapus poster ${participantName}? Vote-nya ikut kehapus dan nggak bisa dibalikin.`)) {
      return;
    }
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Poster dihapus" });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] });
      },
      onError: (err: any) => {
        toast({ title: "Gagal hapus", description: err?.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto my-10" />;

  if (!pending || pending.length === 0) return (
    <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl">
      Tidak ada antrian verifikasi. Yey! 🎉
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pending.map(sub => (
        <div key={sub.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold truncate">{sub.participant_name}</h3>
                {sub.entry_number && (
                  <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                    Entry #{sub.entry_number}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{sub.participant_ig}</p>
              {sub.participant_email && (
                <p className="text-xs text-muted-foreground/70 truncate">{sub.participant_email}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={sub.ig_post_url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-secondary rounded-lg hover:bg-secondary/80 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={() => handleDelete(sub.id, sub.participant_name)}
                disabled={deleteMutation.isPending}
                className="p-2.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 min-w-[44px] min-h-[44px] flex items-center justify-center disabled:opacity-50"
                aria-label="Hapus poster"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview karya — beda render per jenis (poster/racik) */}
          <div className="aspect-[4/5] bg-muted relative">
            {(!sub.track || sub.track === 'image') && sub.image_url ? (
              <img src={sub.image_url} className="w-full h-full object-contain" alt="Karya" />
            ) : sub.track === 'text' ? (
              <div className="w-full h-full p-4 overflow-y-auto text-sm leading-relaxed italic text-foreground/85">
                "{sub.content_text}"
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                <span className="text-5xl">{sub.track === 'music' ? '🎵' : '💻'}</span>
                <a
                  href={sub.content_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5"
                >
                  {sub.track === 'music' ? '▶ Buka di Suno' : '🔗 Buka Link Karya'}
                </a>
                <p className="text-[10px] text-muted-foreground text-center">Cek dulu isinya sebelum verify ya</p>
              </div>
            )}
            {sub.track ? (
              <div className="absolute bottom-2 right-2 bg-black/70 px-3 py-1 rounded-lg text-white font-bold backdrop-blur-sm text-sm">
                🧪 Racik — {sub.track}
              </div>
            ) : (
              <div className="absolute bottom-2 right-2 bg-black/70 px-3 py-1 rounded-lg text-white font-bold backdrop-blur-sm text-sm">
                {sub.anomaly_emoji} {sub.anomaly_text}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="p-4 flex flex-col gap-3 mt-auto">
            <button
              onClick={() => handleVerify(sub.id, 'verified')}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 shadow-[0_0_15px_rgba(124,58,237,0.3)] min-h-[52px]"
            >
              ✓ Verify
            </button>
            <button
              onClick={() => handleVerify(sub.id, 'rejected')}
              className="w-full py-3.5 rounded-xl border-2 border-destructive text-destructive font-bold text-base hover:bg-destructive/10 min-h-[52px]"
            >
              ✗ Tolak
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabVoting() {
  const { data: settings } = useGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const { data: verified, isLoading } = useAdminListSubmissions({ status: 'verified' });
  const updateSub = useAdminUpdateSubmission();
  const deleteMutation = useAdminDeleteSubmission();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [deadline, setDeadline] = useState(settings?.deadline_submit || '');

  const sorted = [...(verified || [])].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

  const toggleVoting = () => {
    const newVal = settings?.voting_open === 'true' ? 'false' : 'true';
    updateSettings.mutate({ data: { voting_open: newVal } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/settings'] })
    });
  };

  const saveDeadline = () => {
    updateSettings.mutate({ data: { deadline_submit: deadline } }, {
      onSuccess: () => {
        toast({ title: "Deadline disimpan" });
        queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      }
    });
  };

  const setWinner = (id: string, category: string | null) => {
    updateSub.mutate({ id, data: { winner_category: category } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] })
    });
  };

  const handleDelete = (id: string, participantName: string) => {
    if (!window.confirm(`Yakin mau hapus poster ${participantName}? Ini karya yang udah di-approve — vote-nya ikut kehapus dan nggak bisa dibalikin.`)) {
      return;
    }
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Poster dihapus" });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] });
      },
      onError: (err: any) => {
        toast({ title: "Gagal hapus", description: err?.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 bg-card border border-border p-6 rounded-2xl">
        <div className="flex-1 space-y-2">
          <label className="font-bold">Status Voting</label>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded font-bold text-sm ${settings?.voting_open === 'true' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {settings?.voting_open === 'true' ? 'DIBUKA' : 'DITUTUP'}
            </span>
            <button onClick={toggleVoting} className="text-sm font-bold underline">Toggle</button>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <label className="font-bold">Deadline Submit (ISO String)</label>
          <div className="flex gap-2">
            <input
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="flex-1 bg-input border border-border rounded-lg px-3"
            />
            <button onClick={saveDeadline} className="bg-secondary px-4 py-2 rounded-lg font-bold">Save</button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-display font-bold text-xl">Daftar Karya (Verified)</h2>
        {isLoading ? <Loader2 className="animate-spin" /> : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4">Rank</th>
                  <th className="p-4">Karya</th>
                  <th className="p-4">Peserta</th>
                  <th className="p-4 text-right">Votes</th>
                  <th className="p-4">Pemenang</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((sub, i) => (
                  <tr key={sub.id} className="hover:bg-muted/30">
                    <td className="p-4 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="p-4">
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted">
                        <img src={sub.image_url ?? undefined} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold">{sub.participant_name}</p>
                      <p className="text-xs text-muted-foreground">{sub.participant_ig}</p>
                      {sub.entry_number && <p className="text-xs text-primary">Entry #{sub.entry_number}</p>}
                    </td>
                    <td className="p-4 text-right font-display font-bold text-lg text-primary">{sub.vote_count}</td>
                    <td className="p-4">
                      <select
                        value={sub.winner_category || ''}
                        onChange={(e) => setWinner(sub.id, e.target.value || null)}
                        className="bg-input border border-border rounded p-2 text-sm focus:border-primary w-full max-w-[200px]"
                      >
                        <option value="">- Bukan Juara -</option>
                        <option value="Paling Kreatif">🏆 Paling Kreatif</option>
                        <option value="Paling Absurd">🏆 Paling Absurd</option>
                        <option value="Paling Niat">🏆 Paling Niat</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(sub.id, sub.participant_name)}
                        disabled={deleteMutation.isPending}
                        className="p-2.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 inline-flex items-center justify-center disabled:opacity-50"
                        aria-label="Hapus poster"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TabKode() {
  const { data, isLoading } = useAdminListPrizes();
  const addMutation = useAdminAddPrizes();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [codesInput, setCodesInput] = useState('');
  const [tier, setTier] = useState('basic');

  const handleAdd = () => {
    const codes = codesInput.split('\n').map(c => c.trim()).filter(Boolean);
    if (codes.length === 0) return;

    addMutation.mutate({ data: { codes, tier } }, {
      onSuccess: (res) => {
        toast({ title: `Berhasil tambah ${res.added} kode` });
        setCodesInput('');
        queryClient.invalidateQueries({ queryKey: ['/api/admin/prizes'] });
      }
    });
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  const basicStat = data?.stats.find(s => s.tier === 'basic');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-bold mb-4">Stock Kode 'Basic'</h3>
          <div className="flex items-end justify-between">
            <div className="font-display text-4xl font-bold text-primary">{basicStat?.remaining || 0}</div>
            <div className="text-sm text-muted-foreground">dari {basicStat?.total || 0} total</div>
          </div>
          {(basicStat?.remaining || 0) < 10 && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Stock menipis! Segera top up.
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-bold">Tambah Kode Baru</h3>
          <textarea
            value={codesInput}
            onChange={e => setCodesInput(e.target.value)}
            className="w-full h-32 bg-input border border-border rounded-lg p-3 text-sm font-mono"
            placeholder="KODE1&#10;KODE2&#10;(Satu baris satu kode)"
          />
          <select value={tier} onChange={e => setTier(e.target.value)} className="w-full bg-input border border-border rounded-lg p-3">
            <option value="basic">Basic (Semua Peserta)</option>
            <option value="premium">Premium (Juara)</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending || !codesInput.trim()}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg disabled:opacity-50"
          >
            {addMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Tambahkan'}
          </button>
        </div>
      </div>

      <div className="md:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground sticky top-0 border-b border-border shadow-sm">
              <tr>
                <th className="p-4">Kode</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Status</th>
                <th className="p-4">Diklaim Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.codes.map(prize => (
                <tr key={prize.id} className="hover:bg-muted/30 font-mono text-xs">
                  <td className="p-4 font-bold">{prize.code}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded ${prize.tier === 'premium' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                      {prize.tier}
                    </span>
                  </td>
                  <td className="p-4">
                    {prize.claimed_at ? (
                      <span className="text-muted-foreground">Klaim {format(new Date(prize.claimed_at), 'dd/MM HH:mm')}</span>
                    ) : (
                      <span className="text-green-500">Tersedia</span>
                    )}
                  </td>
                  <td className="p-4">{prize.claimer_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB CONTOH KARYA ────────────────────────────────────────────────────────

interface ExamplePoster {
  id: string;
  image_url: string;
  caption?: string;
  sort_order: number;
  active: boolean;
}

function TabContohKarya() {
  const [posters, setPosters] = useState<ExamplePoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileData, setFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchPosters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/example-posters', { credentials: 'include' });
      if (res.ok) setPosters(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosters(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setFileData({ base64, mimeType: file.type });
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileData) return;
    setUploading(true);
    try {
      const res = await fetch('/api/admin/example-posters', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: fileData.base64, mime_type: fileData.mimeType, caption, sort_order: sortOrder }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Poster ditambahkan!' });
      setPreviewUrl(null); setFileData(null); setCaption(''); setSortOrder(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchPosters();
    } catch (e: any) {
      toast({ title: 'Gagal upload', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const patch = async (id: string, updates: Partial<ExamplePoster>) => {
    const res = await fetch(`/api/admin/example-posters/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) fetchPosters();
    else toast({ title: 'Gagal update', variant: 'destructive' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus poster ini?')) return;
    const res = await fetch(`/api/admin/example-posters/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) fetchPosters();
    else toast({ title: 'Gagal hapus', variant: 'destructive' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-1 space-y-5">
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Upload Contoh Poster</h3>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[4/5] rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden bg-muted relative"
          >
            {previewUrl ? (
              <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
            ) : (
              <div className="text-center text-muted-foreground text-sm px-4">
                <div className="text-3xl mb-2">🖼️</div>
                Klik untuk pilih gambar
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Caption (opsional)"
            className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />

          <div className="flex items-center gap-2">
            <label className="text-sm font-bold shrink-0">Urutan:</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value))}
              className="w-20 bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!fileData || uploading}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Mengupload…' : 'Tambahkan'}
          </button>
        </div>
      </div>

      <div className="md:col-span-2">
        {loading ? (
          <Loader2 className="animate-spin mx-auto my-10" />
        ) : posters.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl text-center py-20 text-muted-foreground">
            Belum ada contoh karya. Upload di sebelah kiri.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {posters.map(p => (
              <div key={p.id} className={`bg-card border rounded-xl overflow-hidden flex flex-col transition-all ${p.active ? 'border-border' : 'border-border/30 opacity-50'}`}>
                <div className="aspect-[4/5] bg-muted relative overflow-hidden">
                  <img src={p.image_url} alt={p.caption || ''} className="w-full h-full object-cover" />
                  {!p.active && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <span className="text-xs font-bold bg-muted px-2 py-1 rounded">NONAKTIF</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2 flex-1">
                  {p.caption && <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    Urutan: <span className="font-bold">{p.sort_order}</span>
                  </div>
                </div>
                <div className="px-3 pb-3 flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <button onClick={() => patch(p.id, { sort_order: p.sort_order - 1 })} className="p-1.5 rounded bg-muted hover:bg-secondary transition-colors" title="Naikan urutan">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => patch(p.id, { sort_order: p.sort_order + 1 })} className="p-1.5 rounded bg-muted hover:bg-secondary transition-colors" title="Turunkan urutan">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => patch(p.id, { active: !p.active })} className="p-1.5 rounded bg-muted hover:bg-secondary transition-colors" title={p.active ? 'Nonaktifkan' : 'Aktifkan'}>
                    {p.active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded bg-muted hover:bg-destructive/20 text-destructive transition-colors" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB ANOMALI ─────────────────────────────────────────────────────────────

function TabAnomali() {
  const { data, isLoading } = useAdminListAnomalyCards();
  const addMutation = useAdminAddAnomalyCard();
  const toggleMutation = useAdminToggleAnomalyCard();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [emoji, setEmoji] = useState('');
  const [text, setText] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/anomaly-cards'] });

  const handleAdd = () => {
    if (!emoji.trim() || !text.trim()) return;
    addMutation.mutate({ data: { emoji: emoji.trim(), text: text.trim() } }, {
      onSuccess: () => {
        toast({ title: "Kartu anomali ditambahkan" });
        setEmoji('');
        setText('');
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Gagal tambah kartu", description: err?.message, variant: "destructive" });
      }
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    toggleMutation.mutate({ id, data: { active: !active } }, {
      onSuccess: () => invalidate(),
      onError: (err: any) => {
        toast({ title: "Gagal update kartu", description: err?.message, variant: "destructive" });
      }
    });
  };

  const activeCount = data?.filter(c => c.active).length ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card border border-border rounded-2xl p-6 h-fit space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Tambah Kartu Anomali</h3>
        <p className="text-xs text-muted-foreground">
          Kartu yang aktif ({activeCount}) bakal diundi random ke peserta baru pas mereka daftar.
          Kartu lama nggak bisa dihapus permanen (biar histori peserta lama nggak putus) —
          tapi bisa dinonaktifkan biar nggak keundi lagi ke peserta baru.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-bold">Emoji</label>
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="🐫"
            maxLength={8}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-2xl text-center"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold">Deskripsi Anomali</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Contoh: Kucing raksasa Mesir tidur di atap tenant"
            rows={3}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm resize-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={addMutation.isPending || !emoji.trim() || !text.trim()}
          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg disabled:opacity-50"
        >
          {addMutation.isPending ? <Loader2 className="animate-spin mx-auto" /> : 'Tambahkan'}
        </button>
      </div>

      <div className="md:col-span-2">
        {isLoading ? (
          <Loader2 className="animate-spin mx-auto my-10" />
        ) : !data || data.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl text-center py-20 text-muted-foreground">
            Belum ada kartu anomali. Tambah di sebelah kiri.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.map(card => (
              <div
                key={card.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  card.active ? 'bg-card border-border' : 'bg-card/50 border-border/30 opacity-50'
                }`}
              >
                <span className="text-2xl shrink-0">{card.emoji}</span>
                <p className="text-sm flex-1 min-w-0">{card.text}</p>
                <button
                  onClick={() => handleToggle(card.id, card.active)}
                  disabled={toggleMutation.isPending}
                  className="p-1.5 rounded bg-muted hover:bg-secondary transition-colors shrink-0 disabled:opacity-50"
                  title={card.active ? 'Nonaktifkan (nggak diundi lagi)' : 'Aktifkan'}
                  aria-label={card.active ? `Nonaktifkan kartu ${card.text}` : `Aktifkan kartu ${card.text}`}
                >
                  {card.active ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabLeads() {
  const { data, isLoading } = useAdminListParticipants();
  const deleteMutation = useAdminDeleteParticipant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Yakin mau hapus peserta "${name}"? Semua entry, poster, dan vote punya dia ikut kehapus permanen. Kode hadiah yang sempat dia klaim bakal dibalikin ke pool.`)) {
      return;
    }
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: `Peserta "${name}" dihapus` });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/participants'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/prizes'] });
      },
      onError: (err: any) => {
        toast({ title: "Gagal hapus peserta", description: err?.message, variant: "destructive" });
      }
    });
  };

  const handleExport = () => {
    if (!data) return;
    const header = ['Nama', 'Email', 'IG', 'Mau Kelas', 'Jumlah Entry', 'Status Terbaik', 'Klaim Hadiah', 'Waktu Daftar'].join(',');
    const rows = data.map(p => [
      `"${p.name}"`,
      p.email || '',
      p.ig_handle,
      p.wants_class_info ? 'YA' : 'TIDAK',
      p.entry_count ?? 0,
      p.submission_status || 'Belum',
      p.prize_claimed ? 'YA' : 'BELUM',
      format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss')
    ].join(','));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aigypt-leads-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card border border-border p-4 rounded-xl">
        <div>
          <h2 className="font-bold text-lg">Data Peserta & Leads</h2>
          <p className="text-sm text-muted-foreground">Total: {data?.length || 0} peserta</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg font-bold hover:bg-secondary/80"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[780px]">
          <thead className="bg-muted text-muted-foreground border-b border-border">
            <tr>
              <th className="p-4">Nama</th>
              <th className="p-4">Email</th>
              <th className="p-4">Instagram</th>
              <th className="p-4 text-center">Mau Kelas</th>
              <th className="p-4 text-center">Entry</th>
              <th className="p-4">Karya</th>
              <th className="p-4">Hadiah</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map(p => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="p-4 font-bold">{p.name}</td>
                <td className="p-4 text-xs text-muted-foreground">{p.email || '-'}</td>
                <td className="p-4">
                  <a href={`https://instagram.com/${p.ig_handle.replace('@', '')}`} target="_blank" className="text-primary hover:underline">{p.ig_handle}</a>
                </td>
                <td className="p-4 text-center">
                  {p.wants_class_info ? <span className="text-green-500 font-bold">✓</span> : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold text-primary">{p.entry_count ?? 0}</span>
                  <span className="text-muted-foreground">/3</span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    p.submission_status === 'verified' ? 'bg-primary/20 text-primary' :
                    p.submission_status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                    p.submission_status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {p.submission_status?.toUpperCase() || 'BELUM'}
                  </span>
                </td>
                <td className="p-4">
                  {p.prize_claimed ? (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded font-bold">{p.prize_tier?.toUpperCase()}</span>
                  ) : '-'}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    title="Hapus peserta ini (spam/duplikat)"
                    aria-label={`Hapus peserta ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


