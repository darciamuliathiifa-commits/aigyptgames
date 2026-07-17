import { useState, useEffect } from 'react';
import { useGetGallery, useGetSettings, useCastVote, useRemoveVote } from '@workspace/api-client-react';
import { Navbar } from '@/components/Navbar';
import { SubmissionCard } from '@/components/SubmissionCard';
import { Footer } from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

// Helper to generate simple UUID for fingerprint
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Gallery() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: gallery, isLoading } = useGetGallery();
  const { data: settings } = useGetSettings();
  
  const castVote = useCastVote();
  const removeVote = useRemoveVote();
  
  const [fingerprint, setFingerprint] = useState<string>('');
  const [votedIds, setVotedIds] = useState<string[]>([]);

  useEffect(() => {
    let fp = localStorage.getItem('aigypt_fingerprint');
    if (!fp) {
      fp = generateUUID();
      localStorage.setItem('aigypt_fingerprint', fp);
    }
    setFingerprint(fp);
    
    try {
      const storedVotes = JSON.parse(localStorage.getItem('aigypt_votes') || '[]');
      setVotedIds(storedVotes);
    } catch(e) {}
  }, []);

  const handleVoteToggle = (submissionId: string) => {
    if (!settings || settings.voting_open !== 'true') {
      toast({ title: "Voting ditutup", description: "Waktu voting sudah habis.", variant: "destructive" });
      return;
    }

    const hasVoted = votedIds.includes(submissionId);
    
    if (hasVoted) {
      // Remove vote
      removeVote.mutate({ submissionId }, {
        onSuccess: () => {
          const newVotes = votedIds.filter(id => id !== submissionId);
          setVotedIds(newVotes);
          localStorage.setItem('aigypt_votes', JSON.stringify(newVotes));
          queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        }
      });
    } else {
      // Cast vote
      if (votedIds.length >= 3) {
        toast({ title: "Batas Vote Habis", description: "Kamu hanya bisa nge-vote 3 karya.", variant: "destructive" });
        return;
      }
      
      castVote.mutate({
        data: { submission_id: submissionId, voter_fingerprint: fingerprint }
      }, {
        onSuccess: () => {
          const newVotes = [...votedIds, submissionId];
          setVotedIds(newVotes);
          localStorage.setItem('aigypt_votes', JSON.stringify(newVotes));
          queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
          
          toast({ title: "Vote berhasil!", description: `Sisa vote kamu: ${3 - newVotes.length}` });
        },
        onError: (err: any) => {
          toast({ title: "Gagal vote", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  const votingOpen = settings?.voting_open === 'true';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-20 md:max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl">Galeri Karya</h1>
            <p className="text-muted-foreground mt-2">Vote karya paling epik! Maksimal 3 vote per orang.</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {!votingOpen && (
              <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-xl font-bold border border-destructive/20 text-sm">
                Voting Ditutup
              </div>
            )}
            {votingOpen && (
              <div className="bg-card border border-border px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2">
                <span>Sisa Vote:</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < (3 - votedIds.length) ? 'bg-primary shadow-[0_0_8px_rgba(124,58,237,0.5)]' : 'bg-muted'}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>
        ) : !gallery || gallery.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
            Belum ada karya terverifikasi yang masuk galeri.
          </div>
        ) : (
          <div className="columns-2 lg:columns-3 xl:columns-4 gap-4 lg:gap-6 space-y-4 lg:space-y-6">
            {gallery.map(entry => (
              <div key={entry.submission_id} className="break-inside-avoid">
                <SubmissionCard 
                  entry={entry}
                  hasVoted={votedIds.includes(entry.submission_id)}
                  onVote={() => handleVoteToggle(entry.submission_id)}
                  votingOpen={votingOpen}
                />
              </div>
            ))}
          </div>
        )}
        <Footer />
      </main>
    </div>
  );
}
