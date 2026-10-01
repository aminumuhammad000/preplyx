import { useState, useEffect } from 'react';
import { Download, Smartphone, Laptop, Check } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install Preplyx app:\n• Chrome/Edge: Click the Install icon in the address bar\n• iOS Safari: Tap Share -> Add to Home Screen');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed) return null;

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #ddd6fe',
      borderRadius: '16px',
      padding: '16px 20px',
      marginBottom: '24px',
      boxShadow: '0 4px 16px rgba(109, 40, 217, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Download size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Install Preplyx Desktop & Mobile App <Smartphone size={15} color="#7c3aed" /><Laptop size={15} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Install as an app for fast offline access, instant notifications & full screen exam mode.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleInstallClick}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
          }}
        >
          <Download size={14} /> Install App
        </button>

        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: '9px 12px',
            borderRadius: '10px',
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            fontWeight: 600,
            fontSize: '12px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
