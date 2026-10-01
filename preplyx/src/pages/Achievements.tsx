import { 
  Award, Trophy, Star, Lock, TrendingUp, Target, Zap, Flame, Crown, Medal,
  Sparkles, CheckCircle2, Search, Filter, Share2, ChevronRight, RefreshCw, X,
  ShieldCheck, BookOpen, ArrowUpRight, SlidersHorizontal, Layers, Check, Copy
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface AchievementItem {
  id: number;
  title?: string;
  name?: string;
  description: string;
  icon: string;
  color?: string;
  unlocked: boolean;
  progress?: number;
  date?: string;
  xp?: number;
  category?: string;
  rarity?: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [userProgress, setUserProgress] = useState({
    totalAchievements: 10,
    unlocked: 1,
    points: 100,
    level: 1
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unlocked' | 'in_progress' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadge, setSelectedBadge] = useState<AchievementItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const { token } = useAuth();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fetchAchievements = async (isManualRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isManualRefresh) setRefreshing(true);

    try {
      const data = await api.getAchievements(token);
      const formatted = (data.achievements || []).map((item: any) => formatAchievementData(item));
      setAchievements(formatted);
      setUserProgress(data.progress || { totalAchievements: 10, unlocked: 1, points: 100, level: 1 });
      
      if (isManualRefresh) {
        showToast('Achievements synchronized!');
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
      // Fallback data if server fails
      setAchievements(getFallbackAchievements());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, [token]);

  const handleClaimReward = async (badgeId: number) => {
    if (!token) return;
    setClaimingId(badgeId);

    try {
      const res = await api.unlockAchievement(token, badgeId).catch(() => null);
      const earnedXp = res?.earnedXp || (badgeId === 1 ? 100 : badgeId * 100);
      setAchievements(prev =>
        prev.map(item =>
          item.id === badgeId ? { ...item, unlocked: true, progress: 100, date: new Date().toISOString().split('T')[0] } : item
        )
      );
      setUserProgress(prev => ({
        ...prev,
        unlocked: prev.unlocked + 1,
        points: res?.totalXp || (prev.points + earnedXp)
      }));
      showToast(`Badge Unlocked! +${earnedXp} XP Claimed 🎉`);
    } catch (err) {
      showToast('Reward claimed!');
    } finally {
      setClaimingId(null);
      if (selectedBadge?.id === badgeId) {
        setSelectedBadge(prev => prev ? { ...prev, unlocked: true, progress: 100 } : null);
      }
    }
  };

  const iconMap: Record<string, any> = {
    Star, Zap, Flame, Crown, Target, Trophy, Medal, Award, TrendingUp, Lock
  };

  // Filtered achievements calculation
  const filteredAchievements = useMemo(() => {
    return achievements.filter(item => {
      const isUnlocked = item.unlocked;
      const isInProgress = !item.unlocked && (item.progress || 0) > 0;
      const isLocked = !item.unlocked && (item.progress || 0) === 0;

      if (selectedCategory === 'unlocked' && !isUnlocked) return false;
      if (selectedCategory === 'in_progress' && !isInProgress) return false;
      if (selectedCategory === 'locked' && !isLocked) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || item.name || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const categoryMatch = (item.category || '').toLowerCase().includes(q);
        return titleMatch || descMatch || categoryMatch;
      }
      return true;
    });
  }, [achievements, selectedCategory, searchQuery]);

  // Level XP Progress Calculation
  const currentPoints = userProgress.points || 0;
  const currentLevel = userProgress.level || 1;
  const pointsForCurrentLevel = (currentLevel - 1) * 500;
  const pointsForNextLevel = currentLevel * 500;
  const xpInCurrentLevel = Math.max(0, currentPoints - pointsForCurrentLevel);
  const xpNeededForNext = 500;
  const levelProgressPct = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(123, 47, 247, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Trophy size={28} color="#7B2FF7" style={{ animation: 'pulse 1.5s infinite' }} />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Loading Achievements & Badges...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '40px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="wallet-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-main)', margin: '0 0 2px 0', letterSpacing: '-0.5px' }}>
            Achievements & Badges
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Unlock badges and track your study XP milestones.
          </p>
        </div>

        <button
          onClick={() => fetchAchievements(true)}
          disabled={refreshing}
          style={{
            padding: '8px 14px', borderRadius: '10px', backgroundColor: '#ffffff',
            border: '1px solid var(--glass-border)', color: '#64748b', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: 'var(--shadow-soft)', transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Minimalist Level & XP Banner */}
      <div style={{
        padding: '22px 24px', borderRadius: '18px',
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4B0FA3 75%, #7B2FF7 100%)',
        color: '#ffffff', boxShadow: '0 8px 24px rgba(75, 15, 163, 0.2)',
        marginBottom: '22px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Subtle Ambient Graphic Glow */}
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '20px', alignItems: 'center' }}>
          
          {/* Level Info & XP Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Crown size={15} color="#f59e0b" />
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9 }}>
                Level {currentLevel} Scholar Rank
              </span>
            </div>

            <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{currentPoints.toLocaleString()} XP</span>
              <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.18)', padding: '3px 8px', borderRadius: '10px' }}>
                <Sparkles size={12} style={{ display: 'inline', marginRight: '3px', color: '#f59e0b' }} />
                Earned
              </span>
            </div>

            {/* Level XP Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.85, fontWeight: 600, marginBottom: '4px' }}>
                <span>Level {currentLevel} Progress</span>
                <span>{xpInCurrentLevel} / {xpNeededForNext} XP to Level {currentLevel + 1}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${levelProgressPct}%`, height: '100%',
                  background: 'linear-gradient(90deg, #4ade80 0%, #22c55e 100%)',
                  borderRadius: '999px', transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)',
              padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.18)',
              minWidth: '115px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>
                {userProgress.unlocked} / {userProgress.totalAchievements}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Unlocked
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(8px)',
              padding: '12px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.18)',
              minWidth: '115px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
                {Math.round((userProgress.unlocked / Math.max(1, userProgress.totalAchievements)) * 100)}%
              </div>
              <div style={{ fontSize: '10px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                Complete
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Filter Toolbar & Live Search */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '16px', padding: '14px 18px',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
        marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'unlocked', 'in_progress', 'locked'] as const).map(cat => {
            const count = achievements.filter(a => {
              if (cat === 'unlocked') return a.unlocked;
              if (cat === 'in_progress') return !a.unlocked && (a.progress || 0) > 0;
              if (cat === 'locked') return !a.unlocked && (a.progress || 0) === 0;
              return true;
            }).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                  backgroundColor: selectedCategory === cat ? '#7B2FF7' : '#f1f5f9',
                  color: selectedCategory === cat ? '#ffffff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{cat === 'all' ? 'All' : cat === 'unlocked' ? 'Unlocked' : cat === 'in_progress' ? 'In Progress' : 'Locked'}</span>
                <span style={{
                  fontSize: '10px', padding: '1px 5px', borderRadius: '8px',
                  backgroundColor: selectedCategory === cat ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                  color: selectedCategory === cat ? '#ffffff' : '#475569'
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search badges..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '12px', outline: 'none',
              backgroundColor: '#f8fafc', color: '#0f172a', transition: 'all 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Badges Grid */}
      {filteredAchievements.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {filteredAchievements.map(item => {
            const IconComp = iconMap[item.icon] || Award;
            const isUnlocked = item.unlocked;
            const badgeColor = item.color || '#7B2FF7';
            const xpReward = item.xp || item.id * 100;
            const title = item.title || item.name || 'Achievement';
            const progress = item.progress ?? (isUnlocked ? 100 : 0);

            return (
              <div
                key={item.id}
                onClick={() => setSelectedBadge(item)}
                className="achievement-card-hover"
                style={{
                  padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff',
                  border: isUnlocked ? '1px solid rgba(123, 47, 247, 0.22)' : '1px solid var(--glass-border)',
                  boxShadow: 'var(--shadow-soft)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                {/* Header Tag & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                    color: getRarityColor(item.rarity || 'Rare'), backgroundColor: `${getRarityColor(item.rarity || 'Rare')}12`,
                    padding: '2px 7px', borderRadius: '8px'
                  }}>
                    {item.rarity || 'Milestone'}
                  </span>

                  <span style={{
                    fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px',
                    color: isUnlocked ? '#16a34a' : '#64748b'
                  }}>
                    {isUnlocked ? (
                      <>
                        <CheckCircle2 size={13} color="#16a34a" /> Earned
                      </>
                    ) : (
                      <>
                        <Lock size={12} color="#94a3b8" /> {progress}%
                      </>
                    )}
                  </span>
                </div>

                {/* Badge Icon & Compact Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                    backgroundColor: isUnlocked ? `${badgeColor}15` : '#f1f5f9',
                    color: isUnlocked ? badgeColor : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isUnlocked ? `1.5px solid ${badgeColor}` : '1px solid #e2e8f0'
                  }}>
                    <IconComp size={22} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px 0' }}>
                      {title}
                    </h3>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.35', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Progress & XP Footer */}
                <div>
                  {!isUnlocked && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: badgeColor, borderRadius: '999px' }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Sparkles size={12} /> +{xpReward} XP
                    </span>

                    {progress === 100 && !isUnlocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimReward(item.id);
                        }}
                        disabled={claimingId === item.id}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', backgroundColor: '#16a34a',
                          color: '#ffffff', border: 'none', fontSize: '10px', fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {claimingId === item.id ? 'Claiming...' : 'Claim'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        View <ChevronRight size={12} />
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '16px', padding: '40px 20px',
          textAlign: 'center', border: '1px solid var(--glass-border)', color: 'var(--color-text-muted)',
          marginBottom: '24px'
        }}>
          <Trophy size={36} color="#cbd5e1" style={{ marginBottom: '10px' }} />
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>No badges match your filter</h4>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      )}

      {/* Compact Milestone Perks Section */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '18px', padding: '20px',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Award size={16} color="#7B2FF7" />
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Upcoming Scholar Perks</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={18} color="#d97706" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Level 5 Golden Avatar</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Profile frame reward</div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={18} color="#16a34a" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>2,500 XP Milestone</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>₦500 wallet credit</div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={18} color="#7B2FF7" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Exam Champion Title</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>50 CBT tests completed</div>
            </div>
          </div>
        </div>
      </div>


      {/* BADGE DETAIL MODAL */}
      {selectedBadge && (
        <div className="wallet-modal-overlay" onClick={() => setSelectedBadge(null)}>
          <div className="wallet-modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <button
                onClick={() => setSelectedBadge(null)}
                style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              {/* Glowing Badge Emblem */}
              {(() => {
                const IconComp = iconMap[selectedBadge.icon] || Award;
                const isUnlocked = selectedBadge.unlocked;
                const badgeColor = selectedBadge.color || '#7B2FF7';

                return (
                  <div className={isUnlocked ? 'badge-glow' : ''} style={{
                    width: '72px', height: '72px', borderRadius: '24px',
                    backgroundColor: isUnlocked ? `${badgeColor}18` : '#f1f5f9',
                    color: isUnlocked ? badgeColor : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    border: isUnlocked ? `3px solid ${badgeColor}` : '2px solid #cbd5e1'
                  }}>
                    <IconComp size={36} />
                  </div>
                );
              })()}

              <span style={{
                fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                color: getRarityColor(selectedBadge.rarity || 'Rare'), backgroundColor: `${getRarityColor(selectedBadge.rarity || 'Rare')}15`,
                padding: '4px 12px', borderRadius: '12px'
              }}>
                {selectedBadge.rarity || 'Scholar Milestone'}
              </span>

              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '10px 0 4px 0' }}>
                {selectedBadge.title || selectedBadge.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                {selectedBadge.description}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Reward Points</span>
                  <span style={{ fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> +{selectedBadge.xp || selectedBadge.id * 100} XP
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Status</span>
                  <span style={{ fontWeight: 700, color: selectedBadge.unlocked ? '#16a34a' : '#64748b' }}>
                    {selectedBadge.unlocked ? 'Unlocked & Claimed' : `${selectedBadge.progress || 0}% Completed`}
                  </span>
                </div>

                {selectedBadge.unlocked && selectedBadge.date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Date Earned</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedBadge.date}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    showToast('Achievement title copied!');
                  }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#f1f5f9',
                    border: 'none', color: '#334155', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Share2 size={15} /> Share Badge
                </button>

                {!selectedBadge.unlocked && (selectedBadge.progress || 0) === 100 ? (
                  <button
                    onClick={() => handleClaimReward(selectedBadge.id)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#16a34a',
                      border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Claim Reward
                  </button>
                ) : (
                  <button
                    onClick={() => setSelectedBadge(null)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#7B2FF7',
                      border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helpers
function formatAchievementData(item: any): AchievementItem {
  return {
    id: item.id || Math.floor(Math.random() * 1000),
    title: item.title || item.name || 'Scholar Badge',
    name: item.name || item.title || 'Scholar Badge',
    description: item.description || 'Complete practice requirements to unlock this badge',
    icon: item.icon || 'Award',
    color: item.color || getCategoryColor(item.id),
    unlocked: Boolean(item.unlocked),
    progress: item.progress ?? (item.unlocked ? 100 : 0),
    date: item.date,
    xp: item.xp || (item.id === 1 ? 100 : item.id * 100),
    category: item.category || getCategoryName(item.id),
    rarity: item.rarity || getRarityLevel(item.id)
  };
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Legendary': return '#f59e0b';
    case 'Epic': return '#7B2FF7';
    case 'Rare': return '#3b82f6';
    default: return '#10b981';
  }
}

function getRarityLevel(id: number): 'Common' | 'Rare' | 'Epic' | 'Legendary' {
  if (id % 4 === 0) return 'Legendary';
  if (id % 3 === 0) return 'Epic';
  if (id % 2 === 0) return 'Rare';
  return 'Common';
}

function getCategoryColor(id: number): string {
  const colors = ['#f59e0b', '#7B2FF7', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];
  return colors[id % colors.length];
}

function getCategoryName(id: number): string {
  const categories = ['Milestone', 'Exam Speed', 'Streak Master', 'Subject Expert', 'Leaderboard'];
  return categories[id % categories.length];
}

function getFallbackAchievements(): AchievementItem[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return [
    { id: 1, title: 'Welcome Scholar', description: 'Join Preplyx platform and begin your learning journey', icon: 'Sparkles', color: '#7B2FF7', unlocked: true, progress: 100, date: todayStr, rarity: 'Common', xp: 100, category: 'Milestone' },
    { id: 2, title: 'First Steps', description: 'Complete your first practice exam', icon: 'Star', color: '#f59e0b', unlocked: false, progress: 0, rarity: 'Common', xp: 100, category: 'Milestone' },
    { id: 3, title: 'Quick Learner', description: 'Complete 10 practice exams', icon: 'Zap', color: '#7B2FF7', unlocked: false, progress: 0, rarity: 'Rare', xp: 200, category: 'Exam Speed' },
    { id: 4, title: 'Streak Master', description: 'Maintain a 7-day study streak', icon: 'Flame', color: '#ef4444', unlocked: false, progress: 0, rarity: 'Epic', xp: 300, category: 'Streak Master' },
    { id: 5, title: 'Perfect Score', description: 'Score 100% on any exam', icon: 'Crown', color: '#10b981', unlocked: false, progress: 0, rarity: 'Legendary', xp: 400, category: 'Milestone' },
    { id: 6, title: 'Subject Expert', description: 'Master 5 subjects with 80%+ score', icon: 'Target', color: '#3b82f6', unlocked: false, progress: 0, rarity: 'Rare', xp: 500, category: 'Subject Expert' },
    { id: 7, title: 'Exam Champion', description: 'Complete 50 practice exams', icon: 'Trophy', color: '#f59e0b', unlocked: false, progress: 0, rarity: 'Epic', xp: 600, category: 'Milestone' },
    { id: 8, title: 'Month Warrior', description: 'Maintain a 30-day study streak', icon: 'Flame', color: '#ef4444', unlocked: false, progress: 0, rarity: 'Legendary', xp: 700, category: 'Streak Master' },
    { id: 9, title: 'Top Ranker', description: 'Reach top 10 on global leaderboard', icon: 'Medal', color: '#7B2FF7', unlocked: false, progress: 0, rarity: 'Epic', xp: 800, category: 'Leaderboard' },
    { id: 10, title: 'Speed Demon', description: 'Complete CBT exam under 30 minutes', icon: 'Zap', color: '#3b82f6', unlocked: false, progress: 0, rarity: 'Legendary', xp: 1000, category: 'Exam Speed' }
  ];
}
