import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { AnomalyCard as AnomalyCardType } from '@workspace/api-client-react';

interface AnomalyCardProps extends HTMLAttributes<HTMLDivElement> {
  card: AnomalyCardType | undefined | null;
  isFlipped?: boolean;
}

export function AnomalyCard({ card, isFlipped = true, className, ...props }: AnomalyCardProps) {
  if (!card) return null;
  
  return (
    <div 
      className={cn(
        "relative w-full max-w-[280px] aspect-[3/4] mx-auto perspective-1000",
        className
      )}
      {...props}
    >
      <div 
        className={cn(
          "w-full h-full transition-transform duration-300 preserve-3d",
          isFlipped ? "rotate-y-0" : "rotate-y-180"
        )}
      >
        {/* Front of card */}
        <div 
          className="absolute inset-0 backface-hidden w-full h-full rounded-2xl bg-card border border-primary/30 p-6 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(124,58,237,0.4)] overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%)' 
          }}
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
          
          <div className="text-8xl mb-6 relative z-10 filter drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]">
            {card.emoji}
          </div>
          
          <div className="relative z-10 w-full">
            <div className="text-xs uppercase tracking-widest text-primary font-display font-bold mb-2">
              Kartu Anomali
            </div>
            <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
              {card.text}
            </h3>
          </div>
          
          {/* Decorative corners */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-primary/50"></div>
          <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-primary/50"></div>
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-primary/50"></div>
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-primary/50"></div>
        </div>
        
        {/* Back of card */}
        <div 
          className="absolute inset-0 backface-hidden w-full h-full rounded-2xl bg-sidebar border border-sidebar-border rotate-y-180 p-4 flex items-center justify-center"
          style={{ 
            background: 'repeating-linear-gradient(45deg, hsl(var(--card)), hsl(var(--card)) 10px, hsl(var(--secondary)) 10px, hsl(var(--secondary)) 20px)' 
          }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40">
            <span className="font-display font-bold text-primary text-xl">AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
