import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene0() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800); // Logos appear
    const t2 = setTimeout(() => setPhase(2), 2000); // Text line 1
    const t3 = setTimeout(() => setPhase(3), 3000); // Text line 2
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Logos */}
      <div className="flex items-center gap-8 mb-12">
        <motion.img 
          src={`${import.meta.env.BASE_URL}assets/logo-aigypt.png`}
          className="h-24 w-24 object-contain"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        />
        <motion.div 
          className="w-[2px] h-16 bg-white/20"
          initial={{ opacity: 0, height: 0 }}
          animate={phase >= 1 ? { opacity: 1, height: 64 } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
        <motion.img 
          src={`${import.meta.env.BASE_URL}assets/logo-aina.png`}
          className="h-20 w-auto object-contain"
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 20 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4, delay: 0.1 }}
        />
      </div>

      {/* Title */}
      <div className="flex flex-col items-center font-display leading-none">
        <div className="overflow-hidden">
          <motion.h2 
            className="text-6xl md:text-8xl font-bold tracking-tighter text-glow-purple text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-foreground"
            initial={{ y: 100, rotate: 5 }}
            animate={phase >= 2 ? { y: 0, rotate: 0 } : { y: 100, rotate: 5 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            AIGYPT
          </motion.h2>
        </div>
        <div className="overflow-hidden mt-4">
          <motion.h1 
            className="text-5xl md:text-7xl font-semibold tracking-tight text-accent"
            initial={{ y: -100, opacity: 0 }}
            animate={phase >= 3 ? { y: 0, opacity: 1 } : { y: -100, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], type: 'spring', bounce: 0.3 }}
          >
            POSTER CHALLENGE
          </motion.h1>
        </div>
      </div>
      
      {/* Decorative lines */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-primary to-transparent"
        initial={{ scaleY: 0 }}
        animate={phase >= 3 ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 1.2, ease: "easeInOut", delay: 0.5 }}
        style={{ originY: 0 }}
      />
    </motion.div>
  );
}