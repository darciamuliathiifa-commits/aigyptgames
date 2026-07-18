import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateSubmission, useGetSettings, useGetParticipant } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/Navbar';
import { MissionStepper } from '@/components/MissionStepper';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  ig_tag_confirmed: z.literal(true, {
    errorMap: () => ({ message: 'Centang konfirmasi bahwa kamu sudah tag @ai.gypt' }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function Submit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const participantId = localStorage.getItem('aigypt_participant_id');
  const activeEntryId = localStorage.getItem('aigypt_active_entry_id');

  const { data: settings } = useGetSettings();
  const createSubmission = useCreateSubmission();

  // Fetch participant to resolve active entry if activeEntryId is null
  const { data: participant, isFetching: participantFetching, isError: participantError, error: participantErrorObj } = useGetParticipant(participantId || '', {
    query: {
      enabled: !!participantId && !activeEntryId,
      queryKey: ['participant-submit', participantId!],
      // 404 = ID di localStorage sudah tidak ada di database → jangan retry
      retry: (failureCount, err) => (err as any)?.status !== 404 && failureCount < 2,
    }
  });

  // ID peserta di localStorage sudah tidak ada di database → bersihkan sesi
  // lama dan arahkan ke /join.
  // Guard: jangan redirect kalau query lagi fetching ulang (cached error dari
  // sesi sebelumnya bisa muncul sebelum request baru selesai).
  useEffect(() => {
    if (participantError && !participantFetching && (participantErrorObj as any)?.status === 404) {
      localStorage.removeItem('aigypt_participant_id');
      localStorage.removeItem('aigypt_active_entry_id');
      setLocation('/join');
    }
  }, [participantError, participantFetching, participantErrorObj, setLocation]);

  // Resolve the entry ID to submit for
  const resolvedEntryId = activeEntryId ?? (
    // Fall back to the first entry without a submission, or the last entry
    participant?.entries?.find(e => !e.submission)?.id ??
    participant?.entries?.[participant.entries.length - 1]?.id ??
    null
  );

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!participantId) setLocation('/join');
  }, [participantId, setLocation]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ig_tag_confirmed: false as true },
  });

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        }, 'image/webp', 0.8);
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (selectedFile.size > 8 * 1024 * 1024) {
      toast({ title: "Ukuran maksimal 8MB", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const onSubmit = async (data: FormValues) => {
    if (!file) {
      toast({ title: "Upload gambarnya dulu ngab!", variant: "destructive" });
      return;
    }
    if (!participantId) return;
    if (!resolvedEntryId) {
      toast({ title: "Entry tidak ditemukan", description: "Coba buka halaman status dulu.", variant: "destructive" });
      return;
    }

    try {
      setIsUploading(true);

      let uploadBlob: Blob = file;
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Mengkompresi gambar...", description: "Tunggu sebentar ya." });
        uploadBlob = await compressImage(file);
      }

      const fileName = `${participantId}-${resolvedEntryId}-${Date.now()}.webp`;

      toast({ title: "Mengunggah...", description: "Sedang menyimpan ke server." });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('posters')
        .upload(fileName, uploadBlob, { contentType: 'image/webp', upsert: true });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('posters').getPublicUrl(fileName);

      await createSubmission.mutateAsync({
        data: {
          participant_id: participantId,
          entry_id: resolvedEntryId,
          image_url: publicUrl,
          ig_post_url: null as unknown as string, // backend selalu simpan null (konfirmasi via checkbox)
          ig_tag_confirmed: data.ig_tag_confirmed,
        }
      });

      toast({ title: "Berhasil!", description: "Karyamu sudah masuk antrian verifikasi." });
      setLocation('/status');

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const isPastDeadline = settings?.deadline_submit && new Date(settings.deadline_submit) < new Date();

  if (isPastDeadline) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background relative">
        <Navbar />
        <main className="flex-1 container max-w-md mx-auto px-4 pt-32 pb-20 relative z-10 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-6">
            <X className="w-10 h-10" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-4">Waktu Habis!</h1>
          <p className="text-muted-foreground mb-8">Maaf, batas waktu pengumpulan karya sudah lewat.</p>
          <button onClick={() => setLocation('/')} className="px-6 py-3 bg-secondary rounded-xl font-bold">Kembali ke Beranda</button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      <Navbar />

      <main className="flex-1 container max-w-md mx-auto px-4 pt-24 pb-20 relative z-10 flex flex-col">
        <MissionStepper currentStep="upload" className="mb-10" />

        <h1 className="font-display font-bold text-2xl text-center mb-2">Submit Karyamu</h1>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Admin bakal cek tag @ai.gypt di post IG kamu.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Upload Hasil Akhir</label>
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl aspect-[4/5] max-h-[400px] flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors relative group",
                previewUrl ? "border-primary/50" : "border-muted hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="font-bold text-white flex items-center gap-2"><Upload className="w-4 h-4" /> Ganti Gambar</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center p-6 text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-bold mb-1">Tap untuk upload</p>
                  <p className="text-xs">JPG, PNG, WEBP (Max 8MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl cursor-pointer">
              <input
                type="checkbox"
                {...form.register('ig_tag_confirmed')}
                className="mt-1 w-5 h-5 accent-primary shrink-0"
              />
              <span>
                <span className="block text-sm font-bold text-foreground">
                  Saya sudah upload ke Instagram dan tag @ai.gypt
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Admin akan mengecek tag melalui username Instagram yang kamu daftarkan.
                </span>
              </span>
            </label>

            {form.formState.errors.ig_tag_confirmed && (
              <p className="text-xs text-destructive">
                {form.formState.errors.ig_tag_confirmed.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUploading ? <><Loader2 className="animate-spin w-5 h-5" /> Mengunggah...</> : 'Kirim & Tunggu Verifikasi'}
          </button>
        </form>

        <Footer />
      </main>
    </div>
  );
}

