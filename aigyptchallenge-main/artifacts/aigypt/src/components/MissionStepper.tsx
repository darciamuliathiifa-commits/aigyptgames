import { cn } from '@/lib/utils';
import { Check, Clock, CircleAlert, Gift } from 'lucide-react';

export type MissionStep = 'daftar' | 'gacha' | 'upload' | 'verifikasi' | 'hadiah';

interface MissionStepperProps {
  currentStep: MissionStep;
  status?: 'pending' | 'verified' | 'rejected' | null;
  className?: string;
}

export function MissionStepper({ currentStep, status, className }: MissionStepperProps) {
  const steps = [
    { id: 'daftar', label: 'Daftar' },
    { id: 'gacha', label: 'Gacha' },
    { id: 'upload', label: 'Upload Karya' },
    { id: 'verifikasi', label: 'Verifikasi' },
    { id: 'hadiah', label: 'Hadiah' },
  ];

  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  const getStepState = (stepId: MissionStep, index: number) => {
    // Past completed steps
    if (index < currentIndex) return 'completed';
    
    // Current step
    if (index === currentIndex) {
      if (stepId === 'verifikasi') {
        if (status === 'rejected') return 'error';
        if (status === 'verified') return 'completed';
        return 'waiting';
      }
      return 'active';
    }
    
    // Future steps
    return 'upcoming';
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="relative flex justify-between">
        {/* Connecting lines */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted z-0">
          <div 
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-in-out" 
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          ></div>
        </div>

        {/* Steps */}
        {steps.map((step, index) => {
          const state = getStepState(step.id as MissionStep, index);
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  state === 'completed' ? "bg-primary border-primary text-primary-foreground shadow-[0_0_10px_rgba(124,58,237,0.5)]" :
                  state === 'active' ? "bg-card border-primary text-primary shadow-[0_0_15px_rgba(124,58,237,0.3)]" :
                  state === 'waiting' ? "bg-amber-500/20 border-amber-500 text-amber-500" :
                  state === 'error' ? "bg-destructive/20 border-destructive text-destructive" :
                  "bg-card border-muted text-muted-foreground"
                )}
              >
                {state === 'completed' && <Check className="w-5 h-5" />}
                {state === 'active' && <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />}
                {state === 'waiting' && <Clock className="w-5 h-5 animate-pulse" />}
                {state === 'error' && <CircleAlert className="w-5 h-5" />}
                {state === 'upcoming' && (
                  step.id === 'hadiah' ? <Gift className="w-4 h-4" /> : <span className="text-sm font-bold">{index + 1}</span>
                )}
              </div>
              <span 
                className={cn(
                  "text-[10px] md:text-xs mt-2 font-bold text-center max-w-[60px]",
                  state === 'completed' || state === 'active' ? "text-foreground" : 
                  state === 'error' ? "text-destructive" :
                  state === 'waiting' ? "text-amber-500" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
