import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500); // Image 1
    const t2 = setTimeout(() => setPhase(2), 1200); // Image 2
    const t3 = setTimeout(() => setPhase(3), 2000); // Text
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 flex items-center justify-center perspective-1000">
        <motion.div
          className="absolute left-[15%] w-[35vw] h-[55vh] rounded-2xl overflow-hidden glow-purple border border-white/20"
          initial={{ opacity: 0, x: -200, rotateY: 45, rotateZ: -10 }}
          animate={phase >= 1 ? { opacity: 1, x: 0, rotateY: 15, rotateZ: -5 } : { opacity: 0, x: -200, rotateY: 45, rotateZ: -10 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
          style={{ transformOrigin: 'left center' }}
        >
          <img src={`${import.meta.env.BASE_URL}assets/poster-camel-vr.png`} className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          className="absolute right-[15%] w-[35vw] h-[55vh] rounded-2xl overflow-hidden glow-purple border border-white/20"
          initial={{ opacity: 0, x: 200, rotateY: -45, rotateZ: 10 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: -15, rotateZ: 5 } : { opacity: 0, x: 200, rotateY: -45, rotateZ: 10 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
          style={{ transformOrigin: 'right center' }}
        >
          <img src={`${import.meta.env.BASE_URL}assets/poster-mummy-ai.png`} className="w-full h-full object-cover" />
        </motion.div>
      </div>

      <div className="absolute bottom-[10%] left-0 w-full text-center z-10">
        <div className="overflow-hidden inline-block p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-primary/50">
          <motion.h2 
            className="text-4xl md:text-6xl font-bold font-display tracking-tight text-white"
            initial={{ y: 100 }}
            animate={phase >= 3 ? { y: 0 } : { y: 100 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Bikin Poster,<br/>
            <span className="text-accent">Menang AINA</span>
          </motion.h2>
        </div>
      </div>
    </motion.div>
  );
}