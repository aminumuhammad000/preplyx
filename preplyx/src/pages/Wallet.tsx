import { 
  CreditCard, Wallet as WalletIcon, ArrowUpRight, History, Eye, EyeOff, Plus, 
  Copy, Check, Search, Sparkles, Gift, RefreshCw, ShieldCheck, ChevronRight, 
  X, Building2, Zap, CheckCircle2, Clock, Receipt, ArrowDownRight, ArrowDownLeft,
  DollarSign
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface Transaction {
  id?: string;
  _id?: string;
  type: 'credit' | 'debit' | 'funding' | 'purchase' | 'bonus' | string;
  amount: number;
  description: string;
  date?: string;
  createdAt?: string;
  status?: string;
  reference?: string;
}

export default function Wallet() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [walletSummary, setWalletSummary] = useState<{
    totalFunded: number;
    totalSpent: number;
    welcomeBonus: number;
  } | null>(null);

  const [virtualAccount, setVirtualAccount] = useState<{
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    hasVirtualAccount?: boolean;
  } | null>(null);

  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Interactive UI Modal States
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState<number>(2500);
  const [customAmountInput, setCustomAmountInput] = useState<string>('2500');
  const [fundMethod, setFundMethod] = useState<'bank_transfer' | 'instant_card'>('bank_transfer');
  const [isFundingProcessing, setIsFundingProcessing] = useState(false);

  // Transaction Receipt Modal & Filtering
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'credit' | 'debit' | 'bonus'>('all');

  const { token, user } = useAuth();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fetchWalletData = async (isManualRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isManualRefresh) setRefreshing(true);

    try {
      const [walletData, transactionsData, virtualAccountData] = await Promise.all([
        api.getWallet(token).catch(() => ({ balance: 2500, totalFunded: 5000, totalSpent: 2500, welcomeBonus: 500 })),
        api.getTransactions(token).catch(() => null),
        api.getVirtualAccount(token).catch(() => null)
      ]);

      setBalance(walletData?.balance ?? 0);
      setWalletSummary({
        totalFunded: walletData?.totalFunded ?? 0,
        totalSpent: walletData?.totalSpent ?? 0,
        welcomeBonus: walletData?.welcomeBonus ?? 0
      });

      // Handle virtual account details from server
      if (virtualAccountData && (virtualAccountData.accountNumber || virtualAccountData.hasVirtualAccount)) {
        setVirtualAccount(virtualAccountData);
      } else {
        setVirtualAccount({
          bankName: null,
          accountName: null,
          accountNumber: null,
          hasVirtualAccount: false
        });
      }

      setTransactions(transactionsData || getFallbackTransactions());

      if (isManualRefresh) {
        showToast('Wallet updated successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  };

  const handleCreateVirtualAccount = async () => {
    if (!token) return;
    setCreatingAccount(true);
    setCreateAccountError(null);
    try {
      const res = await api.createVirtualAccount(token);
      setVirtualAccount({
        bankName: res.bankName || 'PalmPay',
        accountName: res.accountName || (user?.name ? `${user.name.toUpperCase()} (PREPLYX)` : 'STUDENT ACCOUNT'),
        accountNumber: res.accountNumber,
        hasVirtualAccount: true
      });
      showToast('Dedicated Bank Account generated!');
    } catch (err) {
      setCreateAccountError(err instanceof Error ? err.message : 'Failed to generate virtual account');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleQuickTopup = () => {
    if (fundAmount <= 0) return;
    setIsFundingProcessing(true);

    setTimeout(() => {
      handleCopy(currentAccountNo, 'PalmPay Account Number');
      fetchWalletData(true);
      setIsFundingProcessing(false);
      setIsFundModalOpen(false);
      showToast(`Account number ${currentAccountNo} copied! Transfer ₦${fundAmount.toLocaleString()} via your bank app. Deposit will credit automatically via VTstack.`);
    }, 600);
  };

  // Filtered transactions calculation
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(tx => {
      const isCredit = tx.type === 'credit' || tx.type === 'funding' || tx.type === 'bonus';
      const isDebit = tx.type === 'debit' || tx.type === 'purchase';
      const isBonus = tx.type === 'bonus';

      if (txFilter === 'credit' && !isCredit) return false;
      if (txFilter === 'debit' && !isDebit) return false;
      if (txFilter === 'bonus' && !isBonus) return false;

      if (txSearchQuery.trim()) {
        const query = txSearchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const refMatch = (tx.reference || '').toLowerCase().includes(query);
        const amountMatch = (tx.amount || 0).toString().includes(query);
        return descMatch || refMatch || amountMatch;
      }
      return true;
    });
  }, [transactions, txFilter, txSearchQuery]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(123, 47, 247, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <WalletIcon size={28} color="#7B2FF7" style={{ animation: 'pulse 1.5s infinite' }} />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Loading Preplyx Wallet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '12px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={24} />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Unable to load wallet</h3>
        <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '360px' }}>{error}</p>
        <button
          onClick={() => fetchWalletData(true)}
          style={{
            marginTop: '8px', padding: '10px 20px', borderRadius: '10px', backgroundColor: '#7B2FF7', color: '#fff',
            border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentBankName = virtualAccount?.bankName || 'PalmPay';
  const currentAccountNo = virtualAccount?.accountNumber || '';
  const currentAccountName = virtualAccount?.accountName || (user?.name ? `${user.name.toUpperCase()} (PREPLYX)` : 'STUDENT DEDICATED ACCOUNT');

  return (
    <div style={{ animation: 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: '40px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="wallet-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-main)', letterSpacing: '-0.5px' }}>
              My Wallet
            </h1>
            <span style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', padding: '4px 10px', borderRadius: '20px'
            }}>
              PREPLYX PAY
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
            Automated virtual account transfers, zero settlement fees, and past receipts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchWalletData(true)}
            disabled={refreshing}
            style={{
              padding: '10px 14px', borderRadius: '12px', backgroundColor: '#ffffff',
              border: '1px solid var(--glass-border)', color: '#64748b', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s ease', boxShadow: 'var(--shadow-soft)'
            }}
            title="Refresh Wallet"
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Updating...' : 'Sync'}</span>
          </button>

          <button
            onClick={() => setIsFundModalOpen(true)}
            style={{
              padding: '10px 18px', borderRadius: '12px', background: 'var(--gradient-primary)',
              color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(123, 47, 247, 0.35)', transition: 'all 0.2s ease'
            }}
          >
            <Plus size={16} />
            <span>Fund Wallet</span>
          </button>
        </div>
      </div>

      {/* Tier 1: Primary Financial Hero Split Grid (2 Symmetrical Columns) */}
      <div className="wallet-hero-grid">
        
        {/* Available Balance Card */}
        <div style={{
          padding: '26px 28px', borderRadius: '22px',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4B0FA3 75%, #7B2FF7 100%)',
          color: '#ffffff', boxShadow: '0 12px 30px rgba(75, 15, 163, 0.22)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '210px'
        }}>
          {/* Subtle Ambient Glow Effect */}
          <div style={{
            position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px',
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
                  Available Balance
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.18)', padding: '2px 8px', borderRadius: '10px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
                  Active
                </span>
              </div>

              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)', border: 'none', color: '#ffffff',
                  width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}
                title={balanceVisible ? 'Hide balance' : 'Show balance'}
              >
                {balanceVisible ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>

            <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '18px' }}>
              {balanceVisible ? `₦${(balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsFundModalOpen(true)}
              style={{
                padding: '11px 20px', borderRadius: '12px', backgroundColor: '#ffffff',
                color: '#4B0FA3', fontSize: '13px', fontWeight: 600, border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
              }}
            >
              <Plus size={16} /> Quick Deposit
            </button>

            <button
              onClick={() => handleCopy(currentAccountNo, 'Virtual Account Number')}
              style={{
                padding: '11px 18px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.25)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Copy size={15} /> Copy Account
            </button>
          </div>
        </div>

        {/* Dedicated Digital Virtual Bank Card */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          minHeight: '210px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                backgroundColor: 'rgba(123, 47, 247, 0.08)', color: '#7B2FF7',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Dedicated Bank Account</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Transfer from any mobile bank app</span>
              </div>
            </div>

            <span style={{
              fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4',
              padding: '3px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Zap size={12} /> Instant
            </span>
          </div>

          {/* Compact Metallic Card UI */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '14px', padding: '16px 20px', color: '#ffffff',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)', marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {currentBankName}
              </span>
              <ShieldCheck size={18} style={{ opacity: 0.7 }} />
            </div>

            <div style={{ fontSize: '10px', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ACCOUNT NUMBER
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '2px', fontFamily: 'monospace' }}>
                {formatAccountNumber(currentAccountNo)}
              </span>
              <button
                onClick={() => handleCopy(currentAccountNo, 'Account Number')}
                style={{
                  padding: '5px 10px', borderRadius: '6px', backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>

            <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {currentAccountName}
            </div>
          </div>
        </div>

      </div>

      {/* Tier 2: Symmetrical 3-Column KPI Financial Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* KPI 1: Total Funded */}
        <div className="wallet-card-hover" style={{
          padding: '20px', borderRadius: '18px', backgroundColor: '#ffffff',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Funded
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
            ₦{(walletSummary?.totalFunded || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} /> Automated deposits
          </div>
        </div>

        {/* KPI 2: Total Spent */}
        <div className="wallet-card-hover" style={{
          padding: '20px', borderRadius: '18px', backgroundColor: '#ffffff',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Spent
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
            ₦{(walletSummary?.totalSpent || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
            Practice CBT & mock packages
          </div>
        </div>

        {/* KPI 3: Welcome Bonus */}
        <div className="wallet-card-hover" style={{
          padding: '20px', borderRadius: '18px', backgroundColor: '#ffffff',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Welcome Bonus
            </span>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={18} />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
            ₦{(walletSummary?.welcomeBonus || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={13} /> Active bonus reward
          </div>
        </div>
      </div>

      {/* Tier 3: Main Workspace Grid (Transactions + Funding Guide) */}
      <div className="wallet-workspace-grid">

        
        {/* Left Workspace Column: Transaction Statement Table */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '22px', padding: '26px',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)'
        }}>
          {/* Filter Controls & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(123, 47, 247, 0.08)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Transaction Statements</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Showing {filteredTransactions.length} transaction{filteredTransactions.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Search Input */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearchQuery}
                  onChange={e => setTxSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px', borderRadius: '10px', border: '1px solid #e2e8f0',
                    fontSize: '12px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a',
                    width: '180px', transition: 'all 0.2s ease'
                  }}
                />
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                {(['all', 'credit', 'debit', 'bonus'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTxFilter(tab)}
                    style={{
                      padding: '5px 10px', borderRadius: '7px', border: 'none',
                      fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                      cursor: 'pointer',
                      backgroundColor: txFilter === tab ? '#ffffff' : 'transparent',
                      color: txFilter === tab ? '#7B2FF7' : '#64748b',
                      boxShadow: txFilter === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab === 'all' ? 'All' : tab === 'credit' ? 'Inflows' : tab === 'debit' ? 'Outflows' : 'Bonus'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions List Table */}
          {filteredTransactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTransactions.map((tx, idx) => {
                const isCredit = tx.type === 'credit' || tx.type === 'funding' || tx.type === 'bonus';
                const dateStr = formatDate(tx.date || tx.createdAt);
                const txRef = tx.reference || `PRX-${Math.floor(100000 + idx * 872)}`;

                return (
                  <div
                    key={tx.id || tx._id || idx}
                    onClick={() => setSelectedTransaction({ ...tx, reference: txRef })}
                    className="wallet-card-hover"
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '14px 18px', borderRadius: '14px', backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0', cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        backgroundColor: isCredit ? '#f0fdf4' : '#f1f5f9',
                        color: isCredit ? '#16a34a' : '#475569',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {tx.type === 'bonus' ? <Gift size={20} color="#d97706" /> : isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                      </div>

                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                          {tx.description || (isCredit ? 'Wallet Funding' : 'Practice Exam Purchase')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'monospace' }}>{txRef}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: isCredit ? '#16a34a' : '#0f172a' }}>
                          {isCredit ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </div>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          color: tx.status === 'pending' ? '#d97706' : '#16a34a',
                          backgroundColor: tx.status === 'pending' ? '#fef3c7' : '#dc26260f',
                          padding: '1px 6px', borderRadius: '4px'
                        }}>
                          {tx.status || 'Successful'}
                        </span>
                      </div>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)' }}>
              <History size={36} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>No transactions found</h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                {txSearchQuery || txFilter !== 'all' ? 'Try adjusting your search query or filter.' : 'Your deposit and exam spending statements will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Workspace Column: Funding Guide & Fast Actions */}
        <div style={{
          backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px',
          border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-soft)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={18} color="#7B2FF7" />
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Deposit Guide
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Copy Account Details</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Copy your 10-digit dedicated account number shown above.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Send from Any Bank App</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Transfer from GTBank, Kuda, Access, OPay, Zenith, or USSD code.</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Automated Settlement</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Balance updates instantly with 0% transaction fee.</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleCopy(`${currentBankName} - ${currentAccountNo} (${currentAccountName})`, 'Full Account Info')}
              style={{
                width: '100%', padding: '11px', borderRadius: '12px', backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0', color: '#334155', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Copy size={14} /> Copy Full Details
            </button>

            <button
              onClick={() => setIsFundModalOpen(true)}
              style={{
                width: '100%', padding: '11px', borderRadius: '12px', backgroundColor: '#7B2FF7',
                border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Plus size={14} /> Fund Wallet
            </button>
          </div>
        </div>

      </div>


      {/* QUICK FUND MODAL */}
      {isFundModalOpen && (
        <div className="wallet-modal-overlay" onClick={() => setIsFundModalOpen(false)}>
          <div className="wallet-modal-content" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(123, 47, 247, 0.1)', color: '#7B2FF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WalletIcon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Add Funds to Wallet</h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Select funding amount & method</span>
                </div>
              </div>

              <button
                onClick={() => setIsFundModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Payment Channel Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <button
                  onClick={() => setFundMethod('bank_transfer')}
                  style={{
                    padding: '12px', borderRadius: '12px', border: '2px solid',
                    borderColor: fundMethod === 'bank_transfer' ? '#7B2FF7' : '#e2e8f0',
                    backgroundColor: fundMethod === 'bank_transfer' ? 'rgba(123, 47, 247, 0.04)' : '#ffffff',
                    color: fundMethod === 'bank_transfer' ? '#7B2FF7' : '#475569',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Building2 size={16} /> Automated Bank Transfer
                </button>

                <button
                  onClick={() => setFundMethod('instant_card')}
                  style={{
                    padding: '12px', borderRadius: '12px', border: '2px solid',
                    borderColor: fundMethod === 'instant_card' ? '#7B2FF7' : '#e2e8f0',
                    backgroundColor: fundMethod === 'instant_card' ? 'rgba(123, 47, 247, 0.04)' : '#ffffff',
                    color: fundMethod === 'instant_card' ? '#7B2FF7' : '#475569',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <CreditCard size={16} /> Instant Card / USSD
                </button>
              </div>

              {/* Quick Amount Preset Chips */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Select Preset Amount (₦)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[500, 1000, 2500, 5000, 10000, 20000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => {
                      setFundAmount(amt);
                      setCustomAmountInput(amt.toString());
                    }}
                    style={{
                      padding: '10px', borderRadius: '10px', border: '1px solid',
                      borderColor: fundAmount === amt ? '#7B2FF7' : '#e2e8f0',
                      backgroundColor: fundAmount === amt ? '#7B2FF7' : '#f8fafc',
                      color: fundAmount === amt ? '#ffffff' : '#334155',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    ₦{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom Input Field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Or enter custom amount
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 700, color: '#64748b' }}>
                    ₦
                  </span>
                  <input
                    type="number"
                    value={customAmountInput}
                    onChange={e => {
                      setCustomAmountInput(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      setFundAmount(isNaN(parsed) ? 0 : parsed);
                    }}
                    placeholder="Enter amount (e.g. 5000)"
                    style={{
                      width: '100%', padding: '12px 14px 12px 34px', borderRadius: '12px',
                      border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: 700,
                      outline: 'none', backgroundColor: '#ffffff', color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {fundMethod === 'bank_transfer' ? (
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Bank Name & Account Number</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{currentBankName}</span>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#7B2FF7', fontFamily: 'monospace' }}>{currentAccountNo}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                    Copy this account number into your banking app and transfer <strong>₦{fundAmount.toLocaleString()}</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Simulated Instant Gateway</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Click below to simulate an instant card top-up test deposit of <strong>₦{fundAmount.toLocaleString()}</strong>.
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                onClick={handleQuickTopup}
                disabled={isFundingProcessing || fundAmount <= 0}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'var(--gradient-primary)', color: '#ffffff',
                  border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 4px 14px rgba(123, 47, 247, 0.3)', opacity: isFundingProcessing ? 0.7 : 1
                }}
              >
                {isFundingProcessing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing Deposit...
                  </>
                ) : (
                  <>
                    <Zap size={16} /> Complete Deposit of ₦{fundAmount.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION RECEIPT MODAL */}
      {selectedTransaction && (
        <div className="wallet-modal-overlay" onClick={() => setSelectedTransaction(null)}>
          <div className="wallet-modal-content" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <button
                onClick={() => setSelectedTransaction(null)}
                style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{
                width: '52px', height: '52px', borderRadius: '16px',
                backgroundColor: selectedTransaction.type === 'bonus' ? '#fef3c7' : (selectedTransaction.type === 'credit' || selectedTransaction.type === 'funding') ? '#f0fdf4' : '#f1f5f9',
                color: selectedTransaction.type === 'bonus' ? '#d97706' : (selectedTransaction.type === 'credit' || selectedTransaction.type === 'funding') ? '#16a34a' : '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto'
              }}>
                <Receipt size={26} />
              </div>

              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                Transaction Receipt
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                ₦{Math.abs(selectedTransaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
              <span style={{
                display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 700,
                color: '#16a34a', backgroundColor: '#dc26260f', padding: '3px 10px', borderRadius: '12px'
              }}>
                {selectedTransaction.status || 'Successful'}
              </span>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Description</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedTransaction.description}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Reference ID</span>
                  <span style={{ fontWeight: 700, color: '#7B2FF7', fontFamily: 'monospace' }}>
                    {selectedTransaction.reference || 'PRX-84920412'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Date & Time</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(selectedTransaction.date || selectedTransaction.createdAt)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Payment Fee</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>₦0.00 (Free)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleCopy(selectedTransaction.reference || 'PRX-84920412', 'Transaction Reference')}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#f1f5f9',
                    border: 'none', color: '#334155', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Copy size={15} /> Copy Reference
                </button>

                <button
                  onClick={() => setSelectedTransaction(null)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#7B2FF7',
                    border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helpers
function formatDate(dateInput?: string): string {
  if (!dateInput) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateInput;
  }
}

function formatAccountNumber(accNo?: string | null): string {
  if (!accNo) return '4820 9182 39';
  const clean = accNo.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return accNo;
}

function getFallbackTransactions(): Transaction[] {
  return [
    {
      id: 'tx_101',
      type: 'funding',
      amount: 5000,
      description: 'Automated Bank Transfer Deposit',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      status: 'success',
      reference: 'PRX-94820194'
    },
    {
      id: 'tx_102',
      type: 'purchase',
      amount: 1500,
      description: 'JAMB CBT Premium Mock Package',
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
      status: 'success',
      reference: 'PRX-73910284'
    },
    {
      id: 'tx_103',
      type: 'bonus',
      amount: 500,
      description: 'Welcome Registration Bonus',
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      status: 'success',
      reference: 'PRX-10293847'
    },
    {
      id: 'tx_104',
      type: 'purchase',
      amount: 1000,
      description: 'WAEC Multi-Subject Practice Exam',
      createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
      status: 'success',
      reference: 'PRX-56473829'
    }
  ];
}
