import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { GalleryEntry, LeaderboardEntry } from '@workspace/api-client-react';
import { X } from 'lucide-react';

interface SubmissionCardProps {
  entry: GalleryEntry | LeaderboardEntry;
  rank?: number;
  onVote?: () => void;
  hasVoted?: boolean;
  votingOpen?: boolean;
  className?: string;
}

/** Popup full-size buat lihat poster + vote langsung dari dalam lightbox. */
function SubmissionLightbox({
  entry,
  rank,
  onVote,
  hasVoted,
  votingOpen,
  onClose,
}: SubmissionCardProps & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 bg-card rounded-full flex items-center justify-center hover:bg-secondary transition-colors z-10"
        aria-label="Tutup"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-sm w-full rounded-2xl overflow-hidden bg-card border border-border shadow-[0_0_60px_rgba(124,58,237,0.4)] flex flex-col max-h-[90dvh]"
      >
        <div className="relative w-full overflow-hidden bg-muted shrink-0">
          {(!(entry as any).track || (entry as any).track === 'image') && entry.image_url ? (
            <img
              src={entry.image_url}
              alt={`Karya ${entry.name}`}
              className="w-full h-auto max-h-[65dvh] object-contain bg-black"
            />
          ) : (
            <div className="aspect-[4/5] max-h-[65dvh]"><CardMedia entry={entry} /></div>
          )}
          {rank && (
            <div className={cn(
              "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm shadow-md",
              rank === 1 ? "bg-yellow-500 text-black" :
              rank === 2 ? "bg-gray-300 text-black" :
              rank === 3 ? "bg-amber-700 text-white" :
              "bg-black/50 text-white backdrop-blur-sm border border-white/10"
            )}>
              {rank}
            </div>
          )}
          <div className="absolute top-3 right-14 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg shadow-md">
            {entry.emoji}
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-display font-bold text-lg leading-tight truncate">{entry.name}</h4>
            <a
              href={`https://instagram.com/${entry.ig_handle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary text-sm hover:underline block truncate"
            >
              {entry.ig_handle}
            </a>
            {entry.winner_category && (
              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">
                <span>🏆</span> {entry.winner_category}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Votes</span>
            <span className="font-display text-xl font-bold text-foreground">
              {entry.vote_count.toLocaleString()}
            </span>
          </div>
        </div>

        {onVote && votingOpen && (
          <div className="px-4 pb-4">
            <button
              onClick={() => onVote()}
              className={cn(
                "w-full min-h-[48px] rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2",
                hasVoted
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                  : "bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary"
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("w-4 h-4", hasVoted && "animate-pulse")}>
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              {hasVoted ? "Voted!" : "Vote"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renderer isi kartu berdasarkan jenis karya (track).
 *  track null/"image" → gambar; "text" → kutipan; "music"/"code" → link. */
function CardMedia({ entry }: { entry: GalleryEntry | LeaderboardEntry }) {
  const track = (entry as any).track as string | null | undefined;
  const contentText = (entry as any).content_text as string | null | undefined;
  const contentUrl = (entry as any).content_url as string | null | undefined;

  if ((!track || track === 'image') && entry.image_url) {
    return (
      <img
        src={entry.image_url}
        alt={`Karya ${entry.name}`}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
    );
  }

  if (track === 'text') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/15 via-card to-card p-5 flex flex-col">
        <span className="text-2xl mb-2">✍️</span>
        <p className="text-sm text-foreground/85 leading-relaxed italic overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 9, WebkitBoxOrient: 'vertical' }}>
          "{contentText}"
        </p>
      </div>
    );
  }

  if (track === 'music') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-fuchsia-500/15 via-card to-card flex flex-col items-center justify-center gap-3 p-5">
        <span className="text-5xl">🎵</span>
        <span
          onClick={(e) => { e.stopPropagation(); if (contentUrl) window.open(contentUrl, '_blank', 'noopener,noreferrer'); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 cursor-pointer hover:bg-primary/90 transition-colors"
        >
          ▶ Dengerin Lagunya
        </span>
      </div>
    );
  }

  if (track === 'code') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 via-card to-card flex flex-col items-center justify-center gap-3 p-5">
        <span className="text-5xl">💻</span>
        <span
          onClick={(e) => { e.stopPropagation(); if (contentUrl) window.open(contentUrl, '_blank', 'noopener,noreferrer'); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 cursor-pointer hover:bg-primary/90 transition-colors"
        >
          🔗 Coba Mini App-nya
        </span>
      </div>
    );
  }

  // fallback
  return <div className="w-full h-full bg-muted" />;
}

export function SubmissionCard({ 
  entry, 
  rank, 
  onVote, 
  hasVoted, 
  votingOpen = true,
  className 
}: SubmissionCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className={cn("group relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm flex flex-col transition-all hover:border-primary/50 hover:shadow-[0_0_15px_rgba(124,58,237,0.2)]", className)}>
      
      {/* Image container — klik buat lihat full-size di popup */}
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative aspect-[4/5] w-full overflow-hidden bg-muted text-left cursor-pointer"
        aria-label={`Lihat poster ${entry.name} lebih besar`}
      >
        <CardMedia entry={entry} />
        
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {rank && (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm shadow-md",
              rank === 1 ? "bg-yellow-500 text-black" : 
              rank === 2 ? "bg-gray-300 text-black" : 
              rank === 3 ? "bg-amber-700 text-white" : 
              "bg-black/50 text-white backdrop-blur-sm border border-white/10"
            )}>
              {rank}
            </div>
          )}
          
          {entry.winner_category && (
            <div className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded backdrop-blur-md shadow-md shadow-primary/30 flex items-center gap-1">
              <span>🏆</span> {entry.winner_category}
            </div>
          )}
        </div>
        
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-lg shadow-md">
          {entry.emoji}
        </div>

        {/* Hint icon — muncul pas hover, kasih tau kartu ini bisa diklik */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </div>
        </div>
        
        {/* User info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h4 className="font-display font-bold text-white truncate text-lg leading-tight">{entry.name}</h4>
          <span
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://instagram.com/${entry.ig_handle.replace('@', '')}`, '_blank', 'noopener,noreferrer');
            }}
            className="text-primary-foreground/80 text-sm hover:text-primary transition-colors block truncate cursor-pointer"
          >
            {entry.ig_handle}
          </span>
        </div>
      </button>
      
      {/* Vote section */}
      <div className="p-4 bg-card flex items-center justify-between mt-auto">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Votes</span>
          <span className="font-display text-xl font-bold text-foreground">
            {entry.vote_count.toLocaleString()}
          </span>
        </div>
        
        {onVote && votingOpen && (
          <button
            onClick={onVote}
            className={cn(
              "min-h-[44px] min-w-[44px] px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2",
              hasVoted 
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(124,58,237,0.4)] scale-105" 
                : "bg-secondary text-secondary-foreground hover:bg-primary/20 hover:text-primary"
            )}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill={hasVoted ? "currentColor" : "none"} 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className={cn("w-4 h-4", hasVoted && "animate-pulse")}
            >
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            {hasVoted ? "Voted!" : "Vote"}
          </button>
        )}
        
        {!votingOpen && (
           <div className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
             Voting Closed
           </div>
        )}
      </div>

      {lightboxOpen && (
        <SubmissionLightbox
          entry={entry}
          rank={rank}
          onVote={onVote}
          hasVoted={hasVoted}
          votingOpen={votingOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
