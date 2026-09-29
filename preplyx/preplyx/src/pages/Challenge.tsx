import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Users, Trophy, Zap, Copy, Check, Share2, Play, ShieldAlert, Clock, 
  Sparkles, Award, ArrowRight, CheckCircle2, UserPlus, RefreshCw, X, Download, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Challenge() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomParam = searchParams.get('room');
  const { user } = useAuth();

  // Form State
  const [examType, setExamType] = useState('JAMB');
  const [subject, setSubject] = useState('Mathematics');
  const [questionCount, setQuestionCount] = useState('20');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [friendName, setFriendName] = useState('');

  // Room State
  const [generatedRoomCode, setGeneratedRoomCode] = useState<string | null>(roomParam || null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  // Victory Flyer Modal State
  const [selectedFlyerMatch, setSelectedFlyerMatch] = useState<any | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);

  // Active / Recent Matches
  const [matches, setMatches] = useState<any[]>([
    {
      id: 'CHALLENGE-8921',
      subject: 'Physics',
      exam: 'JAMB',
      opponent: 'Emeka O.',
      questions: 20,
      duration: '15 mins',
      status: 'completed',
      myScore: '18/20 (90%)',
      opponentScore: '15/20 (75%)',
      result: 'WON 🏆',
      date: '2 hours ago'
    },
    {
      id: 'CHALLENGE-7410',
      subject: 'Mathematics',
      exam: 'WAEC',
      opponent: 'Amina K.',
      questions: 10,
      duration: '10 mins',
      status: 'pending',
      myScore: 'Pending',
      opponentScore: 'Waiting to Join',
      result: 'PENDING ⏳',
      date: 'Just now'
    }
  ]);

  useEffect(() => {
    if (roomParam) {
      setGeneratedRoomCode(roomParam);
    }
  }, [roomParam]);

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    setTimeout(() => {
      const code = `PREPLYX-ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
      setGeneratedRoomCode(code);
      setCreating(false);

      const newMatch = {
        id: code,
        subject,
        exam: examType,
        opponent: friendName.trim() || 'Challenged Friend',
        questions: parseInt(questionCount),
        duration: `${durationMinutes} mins`,
        status: 'pending',
        myScore: 'Not Started',
        opponentScore: 'Waiting to Join',
        result: 'PENDING ⏳',
        date: 'Just now'
      };

      setMatches(prev => [newMatch, ...prev]);
    }, 600);
  };

  const getShareableLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://preplyx.com';
    return `${origin}/dashboard/challenge?room=${generatedRoomCode}`;
  };

  const handleCopyLink = () => {
    if (!generatedRoomCode) return;
    navigator.clipboard.writeText(getShareableLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!generatedRoomCode) return;
    const text = encodeURIComponent(
      `🔥 Hey! I challenge you to a 1v1 ${examType} ${subject} CBT Exam Battle on Preplyx!\n\nJoin my Room Code: ${generatedRoomCode}\nLink: ${getShareableLink()}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const code = joinCodeInput.trim().toUpperCase();
    navigate(`/dashboard/practice/JAMB/Mathematics?year=2024&challenge=${code}`);
  };

  const handleStartBattle = () => {
    if (!generatedRoomCode) return;
    navigate(`/dashboard/practice/${examType}/${subject}?year=2024&challenge=${generatedRoomCode}`);
  };

  // Victory Flyer Image Generator via HTML Canvas (Exact 1:1 Pixel Match to flyer.png sample)
  const drawAndDownloadFlyer = (match: any, format: 'png' | 'pdf') => {
    setDownloadingImage(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const winnerName = (user?.name || 'AMINU').toUpperCase();
      const opponentName = (match.opponent || 'HASSAN').toUpperCase();

      // 1. BASE BACKGROUND - Crisp White/Light Lavender
      ctx.fillStyle = '#f8f9fe';
      ctx.fillRect(0, 0, 1080, 1440);

      // Top-Left Corner Purple Flair
      ctx.fillStyle = '#6C2BD9';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(340, 0);
      ctx.lineTo(0, 340);
      ctx.closePath();
      ctx.fill();

      // Top-Right Corner Purple Flair
      ctx.beginPath();
      ctx.moveTo(1080, 0);
      ctx.lineTo(740, 0);
      ctx.lineTo(1080, 340);
      ctx.closePath();
      ctx.fill();

      // Bottom-Left Corner Purple Flair
      ctx.beginPath();
      ctx.moveTo(0, 1440);
      ctx.lineTo(260, 1440);
      ctx.lineTo(0, 1100);
      ctx.closePath();
      ctx.fill();

      // Bottom-Right Corner Purple Flair
      ctx.beginPath();
      ctx.moveTo(1080, 1440);
      ctx.lineTo(820, 1440);
      ctx.lineTo(1080, 1000);
      ctx.closePath();
      ctx.fill();

      // Floating Confetti Items & Lightning Bolts
      ctx.fillStyle = 'rgba(123, 47, 247, 0.4)';
      ctx.font = '28px sans-serif';
      ctx.fillText('◆', 180, 240);
      ctx.fillText('⚡', 1000, 250);
      ctx.fillText('⚡', 180, 1080);
      ctx.fillText('⚡', 900, 1150);
      ctx.fillText('◆', 920, 880);

      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.fillText('◆', 360, 860);

      // 2. HEADER SECTION
      // Logo Icon & Title
      ctx.fillStyle = '#6C2BD9';
      ctx.beginPath();
      ctx.roundRect(380, 52, 50, 48, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px sans-serif';
      ctx.fillText('P', 393, 88);

      ctx.fillStyle = '#1e0e62';
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PREPLYX', 445, 90);

      // JAMB CHALLENGE Title
      ctx.fillStyle = '#1e0e62';
      ctx.font = 'italic 900 58px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${match.exam || 'JAMB'} CHALLENGE`, 540, 185);

      // FINAL RESULT Badge
      ctx.fillStyle = '#6C2BD9';
      ctx.beginPath();
      ctx.roundRect(310, 210, 460, 56, 28);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px sans-serif';
      ctx.fillText('✦  FINAL RESULT  ✦', 540, 246);

      // 3. COMPETITORS HEAD-TO-HEAD SECTION
      // --- PLAYER 1 (WINNER - LEFT PURPLE CARD) ---
      // Gold Crown above Winner Avatar
      ctx.font = '64px sans-serif';
      ctx.fillText('👑', 215, 345);

      // Winner Circle Avatar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(280, 410, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6C2BD9';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#4c1d95';
      ctx.font = '900 65px sans-serif';
      ctx.fillText('👤', 280, 432);

      // Name Pill Badge: AMINU
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(185, 475, 190, 46, 23);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px sans-serif';
      ctx.fillText(winnerName, 280, 506);

      // Purple Main Score Box
      ctx.fillStyle = '#6C2BD9';
      ctx.beginPath();
      ctx.roundRect(130, 535, 300, 250, 32);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 76px sans-serif';
      ctx.fillText(match.myScore.split(' ')[0] || '18/20', 280, 630);

      // Breakdown: Correct / Wrong
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('✔ 18 CORRECT', 280, 680);

      ctx.fillStyle = '#ef4444';
      ctx.fillText('✖ 2 WRONG', 280, 720);

      // Percentage Pill: 90%
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(220, 800, 120, 44, 22);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px sans-serif';
      ctx.fillText('90%', 280, 830);

      // --- PLAYER 2 (OPPONENT - RIGHT WHITE CARD) ---
      // Opponent Circle Avatar
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(800, 410, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6C2BD9';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#4c1d95';
      ctx.font = '900 65px sans-serif';
      ctx.fillText('👤', 800, 432);

      // Name Pill Badge: HASSAN
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(705, 475, 190, 46, 23);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px sans-serif';
      ctx.fillText(opponentName, 800, 506);

      // White Main Score Box
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(650, 535, 300, 250, 32);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 76px sans-serif';
      ctx.fillText(match.opponentScore.split(' ')[0] || '15/20', 800, 630);

      // Breakdown: Correct / Wrong
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('✔ 15 CORRECT', 800, 680);

      ctx.fillStyle = '#dc2626';
      ctx.fillText('✖ 5 WRONG', 800, 720);

      // Percentage Pill: 75%
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(740, 800, 120, 44, 22);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 22px sans-serif';
      ctx.fillText('75%', 800, 830);

      // --- CENTER VS CIRCLE BADGE ---
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(540, 530, 65, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#6C2BD9';
      ctx.font = '900 38px sans-serif';
      ctx.fillText('VS', 540, 543);

      // 4. WINNER ANNOUNCEMENT SECTION (CENTER BOTTOM)
      // Gold Trophy with Laurel Leaves Wreath
      ctx.font = '90px sans-serif';
      ctx.fillText('🏆', 540, 900);

      // Purple WINNER Badge
      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.roundRect(450, 925, 180, 42, 21);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px sans-serif';
      ctx.fillText('WINNER', 540, 953);

      // Winner Big Name
      ctx.fillStyle = '#1e0e62';
      ctx.font = 'italic 900 78px sans-serif';
      ctx.fillText(winnerName, 540, 1040);

      // Winner Score Pill
      ctx.fillStyle = '#1e0e62';
      ctx.beginPath();
      ctx.roundRect(435, 1060, 210, 52, 26);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px sans-serif';
      ctx.fillText(match.myScore.split(' ')[0] || '18/20', 540, 1096);

      // 5. VIRAL CALL-TO-ACTION PANEL (CTA)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(250, 1160, 580, 175, 28);
      ctx.fill();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Can you beat the winner?', 540, 1205);

      // CHALLENGE NOW Button
      ctx.fillStyle = '#6C2BD9';
      ctx.beginPath();
      ctx.roundRect(290, 1230, 500, 64, 32);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.fillText('CHALLENGE NOW   ❯', 540, 1272);

      // Website URL Footer
      ctx.fillStyle = '#1e0e62';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('🌐  preplyx.com.ng', 540, 1385);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `preplyx-challenge-result-${match.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
    setDownloadingImage(false);
  };

  const handleShareFlyerWhatsApp = (match: any) => {
    const winner = (user?.name || 'AMINU').toUpperCase();
    const text = encodeURIComponent(
      `🏆 PREPLYX JAMB CHALLENGE RESULT 🏆\n\n${winner} vs ${match.opponent}\nScores: ${match.myScore} vs ${match.opponentScore}\nWinner: 🏆 ${winner} (${match.myScore})\n\nCan you beat the winner? Challenge me now at preplyx.com.ng!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div style={{ animation: 'fadeIn 0.35s ease-out', maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Hero Header */}
      <div style={{
        padding: '32px', borderRadius: '24px',
        background: 'linear-gradient(135deg, #4B0FA3 0%, #7B2FF7 100%)',
        color: '#ffffff', boxShadow: '0 12px 30px rgba(123, 47, 247, 0.25)',
        marginBottom: '28px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.18)',
            fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            <Zap size={15} color="#FFD700" /> Real-Time 1v1 CBT Battle Mode
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px', lineHeight: 1.2 }}>
            Challenge a Friend to a CBT Exam Match
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', maxWidth: '640px', lineHeight: 1.5 }}>
            Generate a private room code, send the link to a classmate, and answer identical CBT questions side-by-side with real-time scoring and victory flyers!
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Left Card: Create Challenge Form */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
          border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              backgroundColor: '#F3E8FF', color: '#7B2FF7',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
                Create Challenge Room
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Set up your match parameters
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                Select Exam Target
              </label>
              <select
                value={examType}
                onChange={e => setExamType(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                  fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none'
                }}
              >
                <option value="JAMB">JAMB UTME</option>
                <option value="WAEC">WAEC SSCE</option>
                <option value="NECO">NECO SSCE</option>
                <option value="POST-UTME">POST-UTME</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                Select Subject
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                  fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none'
                }}
              >
                <option value="Mathematics">Mathematics</option>
                <option value="English">Use of English</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Government">Government</option>
                <option value="Economics">Economics</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                  Questions
                </label>
                <select
                  value={questionCount}
                  onChange={e => setQuestionCount(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                    fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none'
                  }}
                >
                  <option value="10">10 Questions</option>
                  <option value="20">20 Questions</option>
                  <option value="40">40 Questions</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                  Time Limit
                </label>
                <select
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                    fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none'
                  }}
                >
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-main)', display: 'block', marginBottom: '6px' }}>
                Friend's Name / Tag (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Chidiebere, Hassan, Precious"
                value={friendName}
                onChange={e => setFriendName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                  fontSize: '13px', color: '#0f172a', outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              style={{
                marginTop: '8px', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
                color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '14px',
                cursor: creating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(123, 47, 247, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Sparkles size={18} />
              {creating ? 'Generating Room...' : 'Create Challenge Room Code'}
            </button>
          </form>
        </div>

        {/* Right Column: Room Code Link & Join Room */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Room Code Card */}
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
            border: generatedRoomCode ? '2px solid #7B2FF7' : '1px solid var(--glass-border)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)', textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '6px' }}>
              Your Challenge Invitation Link
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
              Share this code with your friend to start your head-to-head match
            </p>

            {generatedRoomCode ? (
              <div>
                <div style={{
                  padding: '16px', borderRadius: '14px', backgroundColor: '#f3e8ff',
                  border: '1px dashed #7B2FF7', marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b21a8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    ROOM CODE
                  </div>
                  <div style={{ fontSize: '19px', fontWeight: 700, color: '#7B2FF7', letterSpacing: '0.5px' }}>
                    {generatedRoomCode}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button
                    onClick={handleCopyLink}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      backgroundColor: copied ? '#dcfce7' : '#f1f5f9',
                      border: copied ? '1px solid #86efac' : '1px solid #cbd5e1',
                      color: copied ? '#15803d' : '#334155',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Link Copied!' : 'Copy Link'}
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '10px',
                      backgroundColor: '#25D366', color: '#ffffff',
                      border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Share2 size={16} /> WhatsApp
                  </button>
                </div>

                <button
                  onClick={handleStartBattle}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    backgroundColor: '#16a34a', color: '#ffffff',
                    border: 'none', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Play size={18} /> Enter CBT Battle Room
                </button>
              </div>
            ) : (
              <div style={{ padding: '30px 10px', color: '#94a3b8' }}>
                <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>
                  Fill out the form on the left to generate your challenge code!
                </p>
              </div>
            )}
          </div>

          {/* Join Challenge Box */}
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '24px',
            border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
              Have a Friend's Room Code?
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
              Enter the challenge code sent by your friend
            </p>

            <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="e.g. PREPLYX-ROOM-9842"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value)}
                style={{
                  flex: 1, padding: '12px 14px', borderRadius: '10px',
                  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                  fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '12px 20px', borderRadius: '10px',
                  background: 'var(--gradient-primary)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Join Match
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Challenge Match Rules */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
        border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ShieldAlert size={20} color="#7B2FF7" />
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            1v1 Challenge Match Rules & Scoring
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#7B2FF7', marginBottom: '4px' }}>
              1. Identical Question Set
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              Both players receive the exact same questions under identical timing constraints for 100% fair evaluation.
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#7B2FF7', marginBottom: '4px' }}>
              2. Synchronized Timer
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              The countdown timer runs independently per player, but the overall time limit is strictly enforced.
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#7B2FF7', marginBottom: '4px' }}>
              3. Victory Flyer & PDF Certificate
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              Upon winning, generate and download a branded Victory Flyer image/PDF to share on WhatsApp or social media!
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: '#7B2FF7', marginBottom: '4px' }}>
              4. +50 Leaderboard Points
            </div>
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
              Winning a 1v1 challenge rewards you with +50 points added straight to your weekly rank!
            </div>
          </div>
        </div>
      </div>

      {/* Head-to-Head History Table */}
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '20px', padding: '28px',
        border: '1px solid var(--glass-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>
            Recent Challenge Match History
          </h3>
          <button
            onClick={() => setMatches([...matches])}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px', backgroundColor: '#f1f5f9',
              color: '#475569', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                <th style={{ padding: '12px', fontWeight: 700 }}>Match ID</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Subject</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Opponent</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Your Score</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Opponent Score</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Result</th>
                <th style={{ padding: '12px', fontWeight: 700 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {matches.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#7B2FF7' }}>{m.id}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: '#0f172a' }}>{m.exam} {m.subject}</td>
                  <td style={{ padding: '14px 12px', color: '#334155', fontWeight: 600 }}>{m.opponent}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: '#16a34a' }}>{m.myScore}</td>
                  <td style={{ padding: '14px 12px', color: '#64748b' }}>{m.opponentScore}</td>
                  <td style={{ padding: '14px 12px', fontWeight: 600, color: m.result.includes('WON') ? '#16a34a' : '#d97706' }}>
                    {m.result}
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    {m.result.includes('WON') ? (
                      <button
                        onClick={() => setSelectedFlyerMatch(m)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, #7B2FF7 0%, #4B0FA3 100%)',
                          color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700,
                          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 2px 8px rgba(123, 47, 247, 0.3)'
                        }}
                      >
                        <Trophy size={14} /> Result Flyer
                      </button>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXACT VISUAL REPLICA OF FLYER.PNG MODAL PREVIEW */}
      {selectedFlyerMatch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: '#f8f9fe', borderRadius: '20px',
            maxWidth: '380px', width: '100%', padding: '18px 16px', color: '#0f172a',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)', position: 'relative',
            animation: 'fadeIn 0.3s ease-out', border: '3px solid #6C2BD9'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedFlyerMatch(null)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '28px', height: '28px', borderRadius: '50%',
                backgroundColor: '#e2e8f0', color: '#334155',
                border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>

            {/* Header Logo */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: '#6C2BD9', color: '#fff', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  P
                </div>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e0e62', letterSpacing: '0.5px' }}>
                  PREPLYX
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, fontStyle: 'italic', color: '#1e0e62', marginTop: '2px' }}>
                {selectedFlyerMatch.exam || 'JAMB'} CHALLENGE
              </div>
              <div style={{
                display: 'inline-block', padding: '2px 12px', borderRadius: '14px',
                backgroundColor: '#6C2BD9', color: '#ffffff', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.5px', marginTop: '4px'
              }}>
                ✦  FINAL RESULT  ✦
              </div>
            </div>

            {/* Head-to-Head Cards (Matching flyer.png) */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px',
              alignItems: 'center', marginBottom: '14px'
            }}>
              {/* Winner Card (Left - Purple) */}
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '20px', position: 'absolute', top: '-14px', left: '10px', zIndex: 3 }}>
                  👑
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ffffff',
                    border: '2px solid #6C2BD9', color: '#4c1d95', fontSize: '22px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px'
                  }}>
                    👤
                  </div>
                  <div style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
                    backgroundColor: '#4c1d95', color: '#fff', fontSize: '10px', fontWeight: 700
                  }}>
                    {(user?.name || 'AMINU').toUpperCase()}
                  </div>

                  <div style={{
                    backgroundColor: '#6C2BD9', borderRadius: '14px', padding: '10px 6px',
                    color: '#ffffff', marginTop: '6px', boxShadow: '0 4px 14px rgba(108, 43, 217, 0.3)'
                  }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>
                      {selectedFlyerMatch.myScore.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#4ade80', marginTop: '4px' }}>
                      ✔ 18 CORRECT
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#fca5a5' }}>
                      ✖ 2 WRONG
                    </div>
                  </div>

                  <div style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
                    backgroundColor: '#4c1d95', color: '#fff', fontSize: '10px', fontWeight: 700, marginTop: '4px'
                  }}>
                    90%
                  </div>
                </div>
              </div>

              {/* VS Badge */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#ffffff',
                border: '2px solid #c4b5fd', color: '#6C2BD9', fontSize: '11px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                VS
              </div>

              {/* Opponent Card (Right - White) */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#ffffff',
                  border: '2px solid #6C2BD9', color: '#4c1d95', fontSize: '22px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px'
                }}>
                  👤
                </div>
                <div style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
                  backgroundColor: '#4c1d95', color: '#fff', fontSize: '10px', fontWeight: 700
                }}>
                  {(selectedFlyerMatch.opponent || 'HASSAN').toUpperCase()}
                </div>

                <div style={{
                  backgroundColor: '#ffffff', borderRadius: '14px', padding: '10px 6px',
                  color: '#0f172a', marginTop: '6px', border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>
                    {selectedFlyerMatch.opponentScore.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#16a34a', marginTop: '4px' }}>
                    ✔ 15 CORRECT
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#dc2626' }}>
                    ✖ 5 WRONG
                  </div>
                </div>

                <div style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
                  backgroundColor: '#4c1d95', color: '#fff', fontSize: '10px', fontWeight: 700, marginTop: '4px'
                }}>
                  75%
                </div>
              </div>
            </div>

            {/* Winner Trophy Section */}
            <div style={{ textAlign: 'center', margin: '12px 0 10px' }}>
              <div style={{ fontSize: '30px', lineHeight: 1 }}>🏆</div>
              <div style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: '10px',
                backgroundColor: '#4c1d95', color: '#fff', fontSize: '9px', fontWeight: 700,
                marginTop: '2px'
              }}>
                WINNER
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontStyle: 'italic', color: '#1e0e62', marginTop: '2px' }}>
                {(user?.name || 'AMINU').toUpperCase()}
              </div>
              <div style={{
                display: 'inline-block', padding: '3px 14px', borderRadius: '10px',
                backgroundColor: '#1e0e62', color: '#fff', fontSize: '12px', fontWeight: 700, marginTop: '2px'
              }}>
                {selectedFlyerMatch.myScore.split(' ')[0]}
              </div>
            </div>

            {/* CTA Box */}
            <div style={{
              backgroundColor: '#ffffff', borderRadius: '14px', padding: '10px',
              border: '1px solid #c4b5fd', textAlign: 'center', marginBottom: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Can you beat the winner?
              </div>
              <button
                onClick={() => drawAndDownloadFlyer(selectedFlyerMatch, 'png')}
                style={{
                  width: '100%', padding: '9px', borderRadius: '10px',
                  backgroundColor: '#6C2BD9', color: '#ffffff', border: 'none',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                CHALLENGE NOW ❯
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#1e0e62', marginBottom: '12px' }}>
              🌐 preplyx.com.ng
            </div>

            {/* Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <button
                onClick={() => drawAndDownloadFlyer(selectedFlyerMatch, 'png')}
                disabled={downloadingImage}
                style={{
                  padding: '8px', borderRadius: '8px',
                  backgroundColor: '#6C2BD9', color: '#ffffff',
                  border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                <Download size={13} /> Save PNG
              </button>

              <button
                onClick={() => drawAndDownloadFlyer(selectedFlyerMatch, 'pdf')}
                disabled={downloadingImage}
                style={{
                  padding: '8px', borderRadius: '8px',
                  backgroundColor: '#3b82f6', color: '#ffffff',
                  border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}
              >
                <FileText size={13} /> Export PDF
              </button>
            </div>

            <button
              onClick={() => handleShareFlyerWhatsApp(selectedFlyerMatch)}
              style={{
                width: '100%', padding: '9px', borderRadius: '8px',
                backgroundColor: '#25D366', color: '#ffffff',
                border: 'none', fontWeight: 600, fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Share2 size={14} /> Share on WhatsApp Status
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
