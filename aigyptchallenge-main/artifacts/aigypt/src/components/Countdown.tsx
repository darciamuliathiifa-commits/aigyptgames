import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, differenceInSeconds } from 'date-fns';
import { id } from 'date-fns/locale';

interface CountdownProps {
  deadline: string;
  className?: string;
  onExpire?: () => void;
}

export function Countdown({ deadline, className, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    if (!deadline) return;

    const targetDate = new Date(deadline);
    
    const updateCountdown = () => {
      const now = new Date();
      const diffInSeconds = differenceInSeconds(targetDate, now);
      
      if (diffInSeconds <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }
      
      const days = Math.floor(diffInSeconds / (3600 * 24));
      const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = Math.floor(diffInSeconds % 60);
      
      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (timeLeft.isExpired) {
    return (
      <div className={cn("text-destructive font-display font-bold px-4 py-2 bg-destructive/10 rounded-xl inline-block border border-destructive/20 text-center", className)}>
        Deadline telah lewat
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-card border border-border rounded-xl w-14 h-16 md:w-16 md:h-20 flex items-center justify-center shadow-inner relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
        <div className="absolute top-1/2 left-0 right-0 h-px bg-black/40 z-10"></div>
        <span className="font-display text-2xl md:text-3xl font-bold text-primary relative z-20">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest font-bold mt-2">
        {label}
      </span>
    </div>
  );

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-center gap-2 md:gap-3">
        {timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days} label="Hari" />
            <span className="text-xl md:text-2xl font-display text-muted-foreground mb-6">:</span>
          </>
        )}
        <TimeBlock value={timeLeft.hours} label="Jam" />
        <span className="text-xl md:text-2xl font-display text-muted-foreground mb-6">:</span>
        <TimeBlock value={timeLeft.minutes} label="Mnt" />
        <span className="text-xl md:text-2xl font-display text-muted-foreground mb-6">:</span>
        <TimeBlock value={timeLeft.seconds} label="Dtk" />
      </div>
    </div>
  );
}
