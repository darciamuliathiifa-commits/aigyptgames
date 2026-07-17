import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800); // Logo
    const t2 = setTimeout(() => setPhase(2), 1800); // Klaim text
    const t3 = setTimeout(() => setPhase(3), 3000); // Subtext
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Intense center glow */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-primary/30 rounded-full blur-[100px]"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1.2 } : { opacity: 0, scale: 0.5 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -20 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0, rotate: -20 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.5 }}
          className="mb-8 relative"
        >
          <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full" />
          <img src={`${import.meta.env.BASE_URL}assets/logo-aina.png`} className="h-40 object-contain relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]" />
        </motion.div>

        <motion.h1 
          className="text-6xl md:text-8xl font-bold font-display tracking-tight text-white mb-6 text-center"
          initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 50, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Klaim Akses AINA <span className="inline-block origin-bottom animate-bounce">🎁</span>
        </motion.h1>

        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 flex items-center space-x-4">
            <span className="text-2xl font-medium">Upload ke IG</span>
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-2xl font-bold text-accent">Tag @ai.gypt</span>
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}