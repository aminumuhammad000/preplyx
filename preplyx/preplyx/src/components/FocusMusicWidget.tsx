import { useState, useEffect } from 'react';
import { Music, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { 
  FOCUS_MUSIC_TRACKS, startFocusMusic, stopFocusMusic, 
  setFocusMusicVolume, isFocusMusicPlaying, getCurrentTrackId 
} from '../lib/bgMusic';

export default function FocusMusicWidget() {
  const [playing, setPlaying] = useState(isFocusMusicPlaying());
  const [trackId, setTrackId] = useState(getCurrentTrackId() || 'alpha');
  const [volume, setVolume] = useState(0.35);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (playing) {
      startFocusMusic(trackId, volume);
    }
    return () => {
      stopFocusMusic();
    };
  }, []);

  const toggleMusic = () => {
    if (playing) {
      stopFocusMusic();
      setPlaying(false);
    } else {
      startFocusMusic(trackId, volume);
      setPlaying(true);
    }
  };

  const handleTrackSelect = (id: string) => {
    setTrackId(id);
    setDropdownOpen(false);
    if (playing) {
      startFocusMusic(id, volume);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setFocusMusicVolume(val);
  };

  const currentTrack = FOCUS_MUSIC_TRACKS.find(t => t.id === trackId) || FOCUS_MUSIC_TRACKS[0];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      
      {/* Main Focus Music Button Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '20px',
        backgroundColor: playing ? '#f3e8ff' : '#ffffff',
        border: playing ? '1px solid #c4b5fd' : '1px solid var(--glass-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s ease'
      }}>
        {/* On/Off Toggle Button */}
        <button
          onClick={toggleMusic}
          title={playing ? 'Mute Focus Music' : 'Play Focus Background Music'}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'transparent', border: 'none',
            color: playing ? '#7B2FF7' : 'var(--color-text-main)',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer', outline: 'none'
          }}
        >
          {playing ? <Volume2 size={15} color="#7B2FF7" /> : <VolumeX size={15} color="#64748b" />}
          <span>{playing ? 'Music ON' : 'Focus Music'}</span>
        </button>

        <div style={{ width: '1px', height: '14px', backgroundColor: '#e2e8f0' }} />

        {/* Track Selector Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: 'transparent', border: 'none',
            color: 'var(--color-text-main)', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', outline: 'none'
          }}
        >
          <span>{currentTrack.icon} {currentTrack.name.split(' ')[0]}</span>
          <ChevronDown size={13} color="#64748b" />
        </button>
      </div>

      {/* Dropdown Track Selector Panel */}
      {dropdownOpen && (
        <div
          style={{
            position: 'absolute', top: '110%', right: 0, width: '280px',
            backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid var(--glass-border)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.12)', padding: '14px', zIndex: 999,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Choose Exam Focus Music Track
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
            {FOCUS_MUSIC_TRACKS.map(t => {
              const isSelected = t.id === trackId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTrackSelect(t.id)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px',
                    backgroundColor: isSelected ? '#f3e8ff' : '#f8fafc',
                    border: isSelected ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: '2px'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#7B2FF7' : '#0f172a' }}>
                    {t.icon} {t.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {t.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Volume:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              style={{ flex: 1, accentColor: '#7B2FF7', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#7B2FF7', width: '32px' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
