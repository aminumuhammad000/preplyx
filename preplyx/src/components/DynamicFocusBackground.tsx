import { useEffect, useState } from 'react';
import { subscribeMusicChange } from '../lib/bgMusic';

export default function DynamicFocusBackground() {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [raindrops, setRaindrops] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeMusicChange((trackId, playing) => {
      if (playing && trackId) {
        setActiveTrack(trackId);
      } else {
        setActiveTrack(null);
      }
    });

    // Generate 40 raindrops for rain ambient mode
    const drops = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 0 to 100vw
      duration: 0.6 + Math.random() * 0.8, // 0.6s to 1.4s fall speed
      delay: Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.5,
      length: 15 + Math.floor(Math.random() * 25)
    }));
    setRaindrops(drops);

    return () => unsubscribe();
  }, []);

  if (!activeTrack) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: -1, transition: 'all 0.6s ease-in-out',
        background: activeTrack === 'rain'
          ? 'linear-gradient(135deg, #071927 0%, #0c253e 50%, #173456 100%)'
          : activeTrack === 'lofi'
          ? 'linear-gradient(135deg, #2a1647 0%, #441246 50%, #631d9c 100%)'
          : activeTrack === 'zen'
          ? 'linear-gradient(135deg, #043d2e 0%, #035e44 50%, #044b37 100%)'
          : 'linear-gradient(135deg, #0b1120 0%, #17153b 50%, #290d63 100%)'
      }}
    >
      {/* Animated Raindrops Overlay for Rain Focus Mode */}
      {activeTrack === 'rain' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          {raindrops.map(d => (
            <div
              key={d.id}
              style={{
                position: 'absolute',
                left: `${d.left}%`,
                top: '-30px',
                width: '1.5px',
                height: `${d.length}px`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(186,230,253,0.8) 100%)',
                opacity: d.opacity,
                animation: `rainFall ${d.duration}s linear ${d.delay}s infinite`
              }}
            />
          ))}

          <style>{`
            @keyframes rainFall {
              0% { transform: translateY(-30px); }
              100% { transform: translateY(105vh); }
            }
          `}</style>
        </div>
      )}

      {/* Gentle Focus Ambient Radial Glow */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.3) 100%)'
      }} />
    </div>
  );
}
