import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Award, X, ArrowRight } from 'lucide-react';
import { playExamCompleteSound } from '../lib/soundEffects';

interface VictoryCelebrationProps {
  score: number;
  total: number;
  pct: number;
  onClose: () => void;
}

const BALLOON_ITEMS = ['🎈', '🎉', '🏆', '✨', '⭐', '🎊', '🥳', '🏅'];
const COLORS = ['#FF4D4D', '#7B2FF7', '#25D366', '#FFD700', '#00C49F', '#FF8042', '#EC4899'];

export default function VictoryCelebration({ score, total, pct, onClose }: VictoryCelebrationProps) {
  const [balloons, setBalloons] = useState<any[]>([]);

  useEffect(() => {
    // Play celebratory sound fanfare
    playExamCompleteSound();

    // Generate 35 floating balloons with randomized physics parameters
    const generated = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      symbol: BALLOON_ITEMS[Math.floor(Math.random() * BALLOON_ITEMS.length)],
      left: Math.random() * 92, // 0 to 92vw
      delay: Math.random() * 2, // 0s to 2s start delay
      duration: 4 + Math.random() * 3.5, // 4s to 7.5s float time
      size: 24 + Math.floor(Math.random() * 28), // 24px to 52px font size
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      sway: Math.random() > 0.5 ? 40 : -40
    }));

    setBalloons(generated);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(8px)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', overflow: 'hidden'
    }}>
      
      {/* Floating Balloons & Confetti Physics Container */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {balloons.map(b => (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.left}%`,
              bottom: '-60px',
              fontSize: `${b.size}px`,
              color: b.color,
              animation: `floatUp ${b.duration}s ease-out ${b.delay}s infinite`,
              filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.3))',
              userSelect: 'none'
            }}
          >
            {b.symbol}
          </div>
        ))}
      </div>

      {/* Floating Physics Keyframe Styles */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.9;
          }
          50% {
            transform: translateY(-50vh) rotate(15deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-110vh) rotate(-15deg);
            opacity: 0;
          }
        }
        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Celebratory Victory Modal Card */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '28px', border: '3px solid #ffd700',
        maxWidth: '520px', width: '100%', padding: '36px', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(123, 47, 247, 0.4)', position: 'relative',
        animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: '#f1f5f9', color: '#64748b', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        {/* Big Trophy Graphic */}
        <div style={{
          width: '84px', height: '84px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', boxShadow: '0 10px 25px rgba(255, 215, 0, 0.4)'
        }}>
          <Trophy size={44} />
        </div>

        {/* Header Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 16px', borderRadius: '20px', backgroundColor: '#f3e8ff',
          color: '#7B2FF7', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase',
          letterSpacing: '0.5px', marginBottom: '12px'
        }}>
          <Sparkles size={15} /> CBT Exam Winner 🎉
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginBottom: '8px', lineHeight: 1.2 }}>
          CONGRATULATIONS!
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
          You completed your CBT practice test with a high score performance!
        </p>

        {/* Big Score Card */}
        <div style={{
          padding: '20px', borderRadius: '18px', backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0', marginBottom: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around'
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              SCORE PERCENTAGE
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#7B2FF7', lineHeight: 1, marginTop: '4px' }}>
              {pct}%
            </div>
          </div>

          <div style={{ width: '1px', height: '40px', backgroundColor: '#cbd5e1' }} />

          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              CORRECT ANSWERS
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, color: '#16a34a', lineHeight: 1, marginTop: '4px' }}>
              {score} <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 600 }}>/ {total}</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
            color: '#ffffff', border: 'none', fontWeight: 800, fontSize: '15px',
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(123, 47, 247, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <span>Claim Victory & View Performance Breakdown</span>
          <ArrowRight size={18} />
        </button>
      </div>

    </div>
  );
}
