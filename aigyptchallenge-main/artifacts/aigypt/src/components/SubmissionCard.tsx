import { cn } from '@/lib/utils';
import { GalleryEntry, LeaderboardEntry } from '@workspace/api-client-react';

interface SubmissionCardProps {
  entry: GalleryEntry | LeaderboardEntry;
  rank?: number;
  onVote?: () => void;
  hasVoted?: boolean;
  votingOpen?: boolean;
  className?: string;
}

export function SubmissionCard({ 
  entry, 
  rank, 
  onVote, 
  hasVoted, 
  votingOpen = true,
  className 
}: SubmissionCardProps) {
  return (
    <div className={cn("group relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm flex flex-col transition-all hover:border-primary/50 hover:shadow-[0_0_15px_rgba(124,58,237,0.2)]", className)}>
      
      {/* Image container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <img 
          src={entry.image_url} 
          alt={`Poster by ${entry.name}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        
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
        
        {/* User info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h4 className="font-display font-bold text-white truncate text-lg leading-tight">{entry.name}</h4>
          <a 
            href={`https://instagram.com/${entry.ig_handle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer" 
            className="text-primary-foreground/80 text-sm hover:text-primary transition-colors block truncate"
          >
            {entry.ig_handle}
          </a>
        </div>
      </div>
      
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
    </div>
  );
}
