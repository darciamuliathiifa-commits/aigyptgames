import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500); // Text
    const t2 = setTimeout(() => setPhase(2), 1500); // Card reveal
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute top-[15%] text-center z-10 w-full flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          className="inline-block px-8 py-4 bg-primary/20 backdrop-blur-xl border border-primary/40 rounded-full"
        >
          <h2 className="text-5xl md:text-6xl font-bold font-display tracking-tight text-white uppercase">
            Tarik Kartumu
          </h2>
        </motion.div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center perspective-1000 top-[10%]">
        <motion.div
          className="relative w-[35vh] h-[55vh] preserve-3d"
          initial={{ rotateY: 180, y: 100, scale: 0.5, opacity: 0 }}
          animate={phase >= 2 
            ? { 
                rotateY: [180, 180, 0, 360, 360], 
                y: [100, -20, 0, 0, 0],
                scale: [0.5, 1.2, 1, 1, 1],
                opacity: [0, 1, 1, 1, 1]
              } 
            : { rotateY: 180, y: 100, scale: 0.5, opacity: 0 }
          }
          transition={{ 
            duration: 3, 
            times: [0, 0.3, 0.6, 0.8, 1],
            ease: "easeInOut",
            repeat: phase >= 2 ? Infinity : 0,
            repeatDelay: 2
          }}
        >
          {/* Back of card */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-background border-2 border-primary/50 backface-hidden glow-purple flex items-center justify-center" style={{ transform: 'rotateY(180deg)' }}>
             <img src={`${import.meta.env.BASE_URL}assets/logo-aigypt.png`} className="w-24 h-24 opacity-50" />
          </div>
          
          {/* Front of card */}
          <div className="absolute inset-0 rounded-2xl border-2 border-accent backface-hidden shadow-[0_0_50px_rgba(167,139,250,0.6)] overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}assets/gacha-card-front.png`} className="w-full h-full object-cover mix-blend-screen" />
          </div>
        </motion.div>
      </div>
      
      {/* Particle bursts */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-accent blur-[1px]"
            initial={{ 
              x: '50vw', y: '50vh', scale: 0 
            }}
            animate={phase >= 2 ? {
              x: `${50 + (Math.random() - 0.5) * 60}vw`,
              y: `${50 + (Math.random() - 0.5) * 60}vh`,
              scale: [0, Math.random() * 2 + 1, 0],
              opacity: [0, 1, 0]
            } : { x: '50vw', y: '50vh', scale: 0 }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}