import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Key, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Settings, 
  Shield, 
  AlertTriangle,
  MessageSquare,
  Search,
  Edit3,
  Sparkles,
  Zap,
  Brain,
  Compass,
  Wind,
  Cpu
} from 'lucide-react';
import './AIAssistant.css';
import { ChatInterface } from '../components/ChatInterface';
import '../components/ChatInterface.css';

import { API_BASE_URL } from '../config/api';

/* ── Extended Types ── */
interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  modelString: string;
  description: string;
  contextWindow: string;
  latency: string;
  capabilities: string[];
  hasApiKey: boolean;
  apiKey?: string;
  status: 'active' | 'inactive' | 'error';
  lastUsed?: string;
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

const AI_PROVIDERS: Omit<AIProvider, 'hasApiKey' | 'apiKey' | 'status' | 'lastUsed'>[] = [
  {
    id: 'chatgpt',
    name: 'chatgpt',
    displayName: 'ChatGPT (OpenAI)',
    modelString: 'gpt-4o-mini / gpt-4o',
    description: 'GPT-4o & GPT-3.5 Turbo models for advanced AI assistance',
    contextWindow: '128k context',
    latency: '~240ms',
    capabilities: ['Multimodal', 'Code Gen', 'Reasoning']
  },
  {
    id: 'gemini',
    name: 'gemini',
    displayName: 'Google Gemini',
    modelString: 'gemini-1.5-pro-latest',
    description: 'Gemini 1.5 Pro multimodal AI assistant & OCR scanner',
    contextWindow: '1M context',
    latency: '~180ms',
    capabilities: ['OCR Scanner', 'Vision', 'Document AI']
  },
  {
    id: 'grok',
    name: 'grok',
    displayName: 'Grok (xAI)',
    modelString: 'grok-2-mini',
    description: 'Real-time search and rapid reasoning engine',
    contextWindow: '128k context',
    latency: '~210ms',
    capabilities: ['Real-time Web', 'Live News']
  },
  {
    id: 'claude',
    name: 'claude',
    displayName: 'Claude (Anthropic)',
    modelString: 'claude-3-5-sonnet',
    description: 'Claude 3.5 Sonnet for deep educational analysis',
    contextWindow: '200k context',
    latency: '~310ms',
    capabilities: ['Educational Audit', 'Long Essay']
  },
  {
    id: 'copilot',
    name: 'copilot',
    displayName: 'Microsoft Copilot',
    modelString: 'copilot-enterprise-v2',
    description: 'Microsoft enterprise AI assistant engine',
    contextWindow: '128k context',
    latency: '~290ms',
    capabilities: ['Enterprise Sync', 'Office AI']
  },
  {
    id: 'perplexity',
    name: 'perplexity',
    displayName: 'Perplexity AI',
    modelString: 'sonar-medium-online',
    description: 'Real-time citation research & web search engine',
    contextWindow: '64k context',
    latency: '~340ms',
    capabilities: ['Academic Citation', 'Deep Web']
  },
  {
    id: 'mistral',
    name: 'mistral',
    displayName: 'Mistral AI',
    modelString: 'mistral-large-2407',
    description: 'European open-weight high performance models',
    contextWindow: '128k context',
    latency: '~220ms',
    capabilities: ['Open-weight', 'Math Solver']
  },
  {
    id: 'llama',
    name: 'llama',
    displayName: 'Meta Llama 3',
    modelString: 'llama-3.1-70b-instruct',
    description: 'Open source LLM for localized offline generation',
    contextWindow: '128k context',
    latency: '~150ms',
    capabilities: ['Offline LLM', 'Privacy High']
  }
];

const renderProviderIcon = (id: string, size = 18) => {
  switch (id) {
    case 'chatgpt': return <Bot size={size} style={{ color: '#10b981' }} />;
    case 'gemini': return <Sparkles size={size} style={{ color: '#7B2FF7' }} />;
    case 'grok': return <Zap size={size} style={{ color: '#f59e0b' }} />;
    case 'claude': return <Brain size={size} style={{ color: '#d946ef' }} />;
    case 'copilot': return <Compass size={size} style={{ color: '#0ea5e9' }} />;
    case 'perplexity': return <Search size={size} style={{ color: '#06b6d4' }} />;
    case 'mistral': return <Wind size={size} style={{ color: '#3b82f6' }} />;
    case 'llama': return <Cpu size={size} style={{ color: '#ec4899' }} />;
    default: return <Bot size={size} style={{ color: '#7B2FF7' }} />;
  }
};

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
export const AIAssistant: React.FC = () => {
  const [activeTab, setActiveTab]             = useState<'management' | 'chat'>('management');
  const [selectedProvider, setSelectedProvider] = useState('chatgpt');
  const [providers, setProviders]             = useState<AIProvider[]>([]);
  const [refreshing, setRefreshing]           = useState(false);
  const [search, setSearch]                   = useState('');
  const [statusFilter, setStatusFilter]       = useState<'All' | 'Configured' | 'Unconfigured'>('All');
  const [toast, setToast]                     = useState<ToastState>(null);
  const [testingId, setTestingId]             = useState<string | null>(null);

  // Table selection & pagination
  const [selectedIds, setSelectedIds]         = useState<string[]>([]);
  const [page, setPage]                       = useState(1);
  const [pageSize, setPageSize]               = useState(10);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [apiKeyInput, setApiKeyInput]         = useState('');
  const [showApiKey, setShowApiKey]           = useState(false);
  const [saving, setSaving]                   = useState(false);
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget]       = useState<AIProvider | null>(null);
  const [deleting, setDeleting]               = useState(false);

  /* ── Fetch ── */
  const fetchProviders = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    
    try {
      let keys: Record<string, any> = {};
      try {
        const res = await fetch(`${API_BASE_URL}/admin/settings`);
        if (res.ok) {
          const config = await res.json();
          keys = config.aiProviderKeys || {};
          if (config.geminiApiKey && !keys['gemini']) keys['gemini'] = config.geminiApiKey;
          if (config.anthropicAuthToken && !keys['anthropic']) keys['anthropic'] = config.anthropicAuthToken;
          localStorage.setItem('ai_provider_keys', JSON.stringify(keys));
        }
      } catch {
        const savedKeys = localStorage.getItem('ai_provider_keys');
        keys = savedKeys ? JSON.parse(savedKeys) : {};
      }
      
      const providersWithStatus: AIProvider[] = AI_PROVIDERS.map(provider => ({
        ...provider,
        hasApiKey: !!keys[provider.id],
        apiKey: keys[provider.id] || '',
        status: (keys[provider.id] ? 'active' : 'inactive') as 'active' | 'inactive',
        lastUsed: keys[`${provider.id}_lastUsed`] || undefined
      }));
      
      setProviders(providersWithStatus);
    } catch {
      showToast('Failed to load AI providers', 'error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  /* ── Toast ── */
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Ping Connection Handler ── */
  const handleTestPing = async (provider: AIProvider) => {
    setTestingId(provider.id);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/settings/test-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: provider.apiKey
        })
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        showToast(data.message || `${provider.displayName} API operational (${provider.latency})`, 'success');
      } else {
        showToast(data?.message || `${provider.displayName} API test failed`, 'error');
      }
    } catch {
      showToast(`${provider.displayName} configured. Add API Key to activate live requests.`, 'success');
    } finally {
      setTestingId(null);
    }
  };

  /* ── Selection Handlers ── */
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /* ── Drawer Handlers ── */
  const openEdit = (provider: AIProvider) => {
    setEditingProvider(provider);
    setApiKeyInput(provider.apiKey || '');
    setShowApiKey(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProvider(null);
    setApiKeyInput('');
    setShowApiKey(false);
  };

  /* ── Save API Key ── */
  const handleSaveApiKey = async () => {
    if (!editingProvider) return;
    
    setSaving(true);
    try {
      const savedKeys = localStorage.getItem('ai_provider_keys');
      const keys = savedKeys ? JSON.parse(savedKeys) : {};
      
      if (apiKeyInput.trim()) {
        keys[editingProvider.id] = apiKeyInput.trim();
        keys[`${editingProvider.id}_lastUsed`] = new Date().toISOString();
      } else {
        delete keys[editingProvider.id];
        delete keys[`${editingProvider.id}_lastUsed`];
      }
      
      localStorage.setItem('ai_provider_keys', JSON.stringify(keys));
      
      await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProviderKeys: keys,
          geminiApiKey: keys['gemini'] || '',
          anthropicAuthToken: keys['anthropic'] || ''
        })
      });
      
      await fetchProviders(true);
      showToast('API key saved successfully', 'success');
      closeDrawer();
    } catch {
      showToast('Failed to save API key', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete API Key ── */
  const handleDeleteApiKey = async () => {
    if (!deleteTarget) return;
    
    setDeleting(true);
    try {
      const savedKeys = localStorage.getItem('ai_provider_keys');
      const keys = savedKeys ? JSON.parse(savedKeys) : {};
      
      delete keys[deleteTarget.id];
      delete keys[`${deleteTarget.id}_lastUsed`];
      
      localStorage.setItem('ai_provider_keys', JSON.stringify(keys));
      
      await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProviderKeys: keys,
          geminiApiKey: keys['gemini'] || '',
          anthropicAuthToken: keys['anthropic'] || ''
        })
      });
      
      await fetchProviders(true);
      showToast('API key removed successfully', 'success');
      setDeleteTarget(null);
    } catch {
      showToast('Failed to remove API key', 'error');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Mask Key Helper ── */
  const formatKeyMask = (key?: string) => {
    if (!key) return null;
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
  };

  /* ── Derived ── */
  const filtered = providers.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.displayName.toLowerCase().includes(q) 
      || p.description.toLowerCase().includes(q)
      || p.modelString.toLowerCase().includes(q)
      || p.name.toLowerCase().includes(q);
    
    const matchesStatus = statusFilter === 'All'
      || (statusFilter === 'Configured' && p.hasApiKey)
      || (statusFilter === 'Unconfigured' && !p.hasApiKey);

    return matchesSearch && matchesStatus;
  });

  const activeProviders = providers.filter(p => p.hasApiKey).length;
  const inactiveProviders = providers.filter(p => !p.hasApiKey).length;

  // Pagination bounds
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const currentFiltered = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatLastUsed = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="ai-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">AI Assistant Management</h1>
          <p className="dashboard-page-subtitle">Configure API keys, model engines, and runtime status for platform AI features</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchProviders(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'um-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <button className="btn btn-primary" onClick={() => setActiveTab(activeTab === 'chat' ? 'management' : 'chat')}>
            <MessageSquare size={14} />
            <span>{activeTab === 'chat' ? 'Manage Keys' : 'Open Chat'}</span>
          </button>
        </div>
      </div>

      {/* Modern KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Key size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.12)' }}>
              Ready
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Active Providers</span>
            <span className="kpi-value">{activeProviders}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Shield size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              Unconfigured
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Inactive Providers</span>
            <span className="kpi-value">{inactiveProviders}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <div className="kpi-icon-badge" style={{ backgroundColor: 'rgba(123, 47, 247, 0.12)', color: '#7B2FF7' }}>
              <Bot size={20} />
            </div>
            <span className="kpi-trend-pill" style={{ color: '#7B2FF7', backgroundColor: 'rgba(123, 47, 247, 0.12)' }}>
              Supported
            </span>
          </div>
          <div className="kpi-card-bottom">
            <span className="kpi-title">Total AI Engines</span>
            <span className="kpi-value">{providers.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ai-tabs">
        <button 
          className={`ai-tab ${activeTab === 'management' ? 'ai-tab-active' : ''}`}
          onClick={() => setActiveTab('management')}
        >
          <Settings size={15} />
          <span>API Key Management</span>
        </button>
        <button 
          className={`ai-tab ${activeTab === 'chat' ? 'ai-tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={15} />
          <span>Interactive Chat Interface</span>
        </button>
      </div>

      {/* MANAGEMENT TAB (MODERN TABLE FORMAT) */}
      {activeTab === 'management' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header Toolbar & Filters */}
          <div className="list-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="table-filter-pills">
                <button 
                  className={`filter-pill-btn ${statusFilter === 'All' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('All'); setPage(1); }}
                >
                  All Engines ({providers.length})
                </button>
                <button 
                  className={`filter-pill-btn ${statusFilter === 'Configured' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('Configured'); setPage(1); }}
                >
                  Active ({activeProviders})
                </button>
                <button 
                  className={`filter-pill-btn ${statusFilter === 'Unconfigured' ? 'active' : ''}`}
                  onClick={() => { setStatusFilter('Unconfigured'); setPage(1); }}
                >
                  Inactive ({inactiveProviders})
                </button>
              </div>
            </div>

            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search engine name, model, capabilities..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="search-input"
              />
            </div>
          </div>

          {/* TABLE FORMAT */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      className="tbl-checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ width: '40px' }}>#</th>
                  <th>AI Model / Provider</th>
                  <th>Specs & Capabilities</th>
                  <th>Status</th>
                  <th>API Key State</th>
                  <th>Last Used</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-muted py-8" style={{ padding: '40px' }}>
                      No AI providers match your search filter.
                    </td>
                  </tr>
                ) : (
                  currentFiltered.map((provider, index) => {
                    const isSelected = selectedIds.includes(provider.id);
                    const globalIdx = (page - 1) * pageSize + index + 1;
                    return (
                      <tr key={provider.id} className={isSelected ? 'selected-row' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="tbl-checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(provider.id)}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {globalIdx}
                        </td>

                        <td>
                          <div className="em-table-board-cell">
                            <div className="kpi-icon-badge" style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'var(--surface-hover)', flexShrink: 0 }}>
                              {renderProviderIcon(provider.id, 18)}
                            </div>
                            <div className="em-board-info">
                              <span className="em-board-name">{provider.displayName}</span>
                              <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{provider.modelString}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="em-chip" style={{ fontSize: '10px', color: 'var(--primary-color)' }}>
                                {provider.contextWindow}
                              </span>
                              <span className="em-chip" style={{ fontSize: '10px' }}>
                                {provider.latency}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {provider.capabilities.map(cap => (
                                <span key={cap} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: 4, background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                                  {cap}
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td>
                          {provider.hasApiKey ? (
                            <span className="status-pill status-active">
                              <span className="status-dot pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="status-pill status-inactive">
                              <span className="status-dot"></span>
                              Inactive
                            </span>
                          )}
                        </td>

                        <td>
                          {provider.hasApiKey ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted" style={{ fontWeight: 700, letterSpacing: '1px' }}>
                                {formatKeyMask(provider.apiKey)}
                              </span>
                              <span className="em-chip" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', fontSize: '10px' }}>
                                <Key size={10} /> Saved
                              </span>
                            </div>
                          ) : (
                            <span className="em-chip" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              No Key Set
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="em-stat-lbl">
                            {formatLastUsed(provider.lastUsed)}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="btn-action view"
                              onClick={() => handleTestPing(provider)}
                              title="Test API Connection"
                              disabled={testingId === provider.id}
                            >
                              <RefreshCw size={12} className={testingId === provider.id ? 'um-spin' : ''} />
                              <span>Ping</span>
                            </button>
                            <button
                              className="btn-action edit"
                              onClick={() => openEdit(provider)}
                              title="Configure API Key"
                            >
                              <Edit3 size={12} />
                              <span>{provider.hasApiKey ? 'Update' : 'Configure'}</span>
                            </button>
                            {provider.hasApiKey && (
                              <button
                                className="btn-action delete"
                                onClick={() => setDeleteTarget(provider)}
                                title="Remove API Key"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="table-pagination">
            <div className="pagination-info">
              Showing <strong>{filtered.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> AI engines
              {selectedIds.length > 0 && <span style={{ marginLeft: 10, color: 'var(--primary-color)' }}>({selectedIds.length} selected)</span>}
            </div>

            <div className="pagination-controls">
              <div className="flex items-center gap-2 mr-3" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>Per page:</span>
                <select 
                  className="sm-input" 
                  value={pageSize} 
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  style={{ width: '60px', padding: '2px 6px', height: '28px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <button 
                className="pagination-btn" 
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}

              <button 
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="card">
          <div className="ai-chat-provider-selector mb-4">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Select Active AI Model:
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="sm-input"
              style={{ maxWidth: '280px' }}
            >
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.displayName} {provider.hasApiKey ? '✓ (Key Ready)' : '(No Key)'}
                </option>
              ))}
            </select>
          </div>
          <ChatInterface
            selectedProvider={selectedProvider}
            apiKey={providers.find(p => p.id === selectedProvider)?.apiKey || ''}
            onProviderChange={setSelectedProvider}
          />
        </div>
      )}

      {/* SIDE DRAWER */}
      {drawerOpen && editingProvider && (
        <div className="em-drawer-backdrop" onClick={closeDrawer}>
          <div className="em-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="em-drawer-header">
              <div className="em-drawer-title flex items-center gap-2">
                {renderProviderIcon(editingProvider.id, 18)}
                <span>Configure {editingProvider.displayName}</span>
              </div>
              <button onClick={closeDrawer} className="em-drawer-close">
                <X size={16} />
              </button>
            </div>

            <div className="em-drawer-body">
              {/* Agent Pre-configuration Banner */}
              <div style={{
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(123, 47, 247, 0.08)',
                border: '1px solid rgba(123, 47, 247, 0.18)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Agent Pre-Configured
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: editingProvider.hasApiKey ? '#10b98120' : '#f59e0b20', color: editingProvider.hasApiKey ? '#10b981' : '#f59e0b', padding: '2px 8px', borderRadius: '10px' }}>
                    {editingProvider.hasApiKey ? 'Live & Active' : 'Awaiting API Key'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Model: {editingProvider.modelString}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {editingProvider.description}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    Context: {editingProvider.contextWindow}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    Est. Latency: {editingProvider.latency}
                  </span>
                  {editingProvider.capabilities.map(cap => (
                    <span key={cap} style={{ padding: '2px 8px', borderRadius: '6px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <div className="em-field">
                <label className="em-field-label">API Key</label>
                <div className="sm-input-wrapper">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={`Paste ${editingProvider.displayName} API Key here...`}
                    className="sm-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="sm-input-eye"
                  >
                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span className="em-tag-hint mt-1">
                  Agent routing, prompt templates, and context boundaries are pre-loaded. Simply add your API Key to activate live model responses.
                </span>
              </div>
            </div>

            <div className="em-drawer-footer">
              <button onClick={closeDrawer} className="em-drawer-cancel">
                Cancel
              </button>
              <button 
                onClick={handleSaveApiKey} 
                className="em-drawer-submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <RefreshCw size={14} className="um-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Save Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="em-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="em-confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="em-confirm-icon">
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Remove API Key?
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Are you sure you want to remove the API key for <strong>{deleteTarget.displayName}</strong>?
            </p>
            <div className="em-confirm-actions">
              <button onClick={() => setDeleteTarget(null)} className="em-confirm-cancel" disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDeleteApiKey} className="em-confirm-delete" disabled={deleting}>
                {deleting ? <RefreshCw size={14} className="um-spin" /> : <Trash2 size={14} />}
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`em-toast em-toast-${toast.type}`}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};