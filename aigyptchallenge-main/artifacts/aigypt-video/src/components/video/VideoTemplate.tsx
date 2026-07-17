import { useEffect } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { AnimatePresence, motion } from 'framer-motion';

import { Scene0 } from './video_scenes/Scene0';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';

export const SCENE_DURATIONS: Record<string, number> = {
  scene0: 5000,
  scene1: 6000,
  scene2: 6000,
  scene3: 7000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  scene0: Scene0,
  scene1: Scene1,
  scene2: Scene2,
  scene3: Scene3,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="w-full h-screen overflow-hidden relative" style={{ backgroundColor: '#1A1625' }}>
      {/* Persistent Background */}
      <video
        src={`${import.meta.env.BASE_URL}assets/bg-abstract.mp4`}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
      />

      {/* Persistent Overlay / Particles */}
      <motion.div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #1A1625 0%, transparent 40%, rgba(26,22,37,0.5) 100%)' }} />

        {/* Accent floating shapes — persistent, transform with sceneIndex */}
        <motion.div
          className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}
          animate={{
            x: ['-10vw', '50vw', '20vw', '10vw'][sceneIndex] ?? '0vw',
            y: ['10vh', '-20vh', '60vh', '20vh'][sceneIndex] ?? '0vh',
            scale: sceneIndex === 3 ? 1.5 : 1,
          }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[30vw] h-[30vw] rounded-full blur-[80px]"
          style={{ backgroundColor: 'rgba(167,139,250,0.1)' }}
          animate={{
            x: ['60vw', '10vw', '70vw', '50vw'][sceneIndex] ?? '0vw',
            y: ['50vh', '80vh', '10vh', '50vh'][sceneIndex] ?? '0vh',
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
