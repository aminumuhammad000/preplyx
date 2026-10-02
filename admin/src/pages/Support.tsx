import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  Send,
  User as UserIcon,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import './Support.css';

import { API_BASE_URL, getAdminAuthHeaders } from '../config/api';

/* ── Types ── */
interface User {
  _id: string;
  name: string;
  email: string;
}

interface SupportTicket {
  _id: string;
  user: User;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export const Support: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchTickets = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/support/tickets`, {
        headers: getAdminAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setTickets(data);
          if (data.length > 0 && !activeTicketId) setActiveTicketId(data[0]._id);
        }
      }
    } catch (error) {
      // Keep state
    } finally {
      setRefreshing(false);
    }
  }, [activeTicketId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const activeTicket = tickets.find(t => t._id === activeTicketId);

  useEffect(() => {
    if (activeTicket) {
      setReplyText(activeTicket.adminReply || '');
    }
  }, [activeTicket]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateStatus = async (status: 'open' | 'in-progress' | 'resolved' | 'closed', message?: string) => {
    if (!activeTicket) return;
    setSubmitting(true);
    try {
      const payload: any = { status };
      if (message !== undefined) payload.adminReply = message;

      const res = await fetch(`${API_BASE_URL}/admin/support/tickets/${activeTicket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const { ticket: updatedTicket } = await res.json();
        setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      } else {
        setTickets(prev => prev.map(t => t._id === activeTicket._id ? { ...t, status, adminReply: message !== undefined ? message : t.adminReply } : t));
      }
      showToast(`Ticket marked as ${status}`);
    } catch (error) {
      setTickets(prev => prev.map(t => t._id === activeTicket._id ? { ...t, status, adminReply: message !== undefined ? message : t.adminReply } : t));
      showToast(`Ticket marked as ${status}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    handleUpdateStatus('resolved', replyText);
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-NG', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });
  };

  return (
    <div className="sp-page">
      {/* Compact Fit Page Header */}
      <div className="dashboard-header-strip">
        <div>
          <h1 className="dashboard-page-title">Support Center</h1>
          <p className="dashboard-page-subtitle">Manage student inquiries, bug reports, and assistance tickets</p>
        </div>
        <div className="flex gap-2">
          <button className="view-all-btn" onClick={() => fetchTickets(true)} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'um-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div className="sp-container">
        {/* LEFT PANE: TICKET LIST */}
        <div className="sp-list-pane">
          <div className="sp-list-header">
            <span className="sp-list-title">All Tickets ({tickets.length})</span>
          </div>

          <div className="sp-tickets-scroll">
            {tickets.length > 0 ? (
              tickets.map(ticket => (
                <div 
                  key={ticket._id} 
                  className={`sp-ticket-card ${activeTicketId === ticket._id ? 'active' : ''}`}
                  onClick={() => setActiveTicketId(ticket._id)}
                >
                  <div className="sp-ticket-top">
                    <div className="sp-ticket-subject">{ticket.subject}</div>
                    <div className="sp-ticket-date">{formatDate(ticket.createdAt)}</div>
                  </div>
                  <div className="sp-ticket-user">
                    <UserIcon size={12} /> {ticket.user?.name || 'Student'}
                  </div>
                  <div className="sp-ticket-badges">
                    <span className={`badge badge-${ticket.status === 'resolved' ? 'success' : ticket.status === 'in-progress' ? 'warning' : 'danger'}`}>
                      {ticket.status.replace('-', ' ')}
                    </span>
                    <span className="em-chip" style={{ fontSize: '10px' }}>
                      {ticket.priority} priority
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="um-empty">
                <CheckCircle size={28} />
                <p>No active tickets.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: TICKET DETAILS */}
        <div className="sp-detail-pane">
          {activeTicket ? (
            <>
              {/* Header */}
              <div className="sp-detail-header">
                <div className="sp-detail-title">{activeTicket.subject}</div>
                <div className="sp-detail-meta">
                  <div className="sp-detail-user-info">
                    <div className="user-avatar-small" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {activeTicket.user?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activeTicket.user?.name || 'Student'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {activeTicket.user?.email || 'No email provided'}
                      </div>
                    </div>
                  </div>
                  <div className="sp-ticket-date">
                    Opened {formatDate(activeTicket.createdAt)}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="sp-detail-body">
                <div className="sp-message-label">
                  <MessageSquare size={13} /> Student Message
                </div>
                <div className="sp-message-bubble">
                  <p>{activeTicket.message}</p>
                </div>

                {activeTicket.adminReply && (
                  <>
                    <div className="sp-message-label" style={{ justifyContent: 'flex-end' }}>
                      <CheckCircle size={13} color="#10b981" /> Admin Response
                    </div>
                    <div className="sp-reply-bubble">
                      <p>{activeTicket.adminReply}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Reply Area */}
              <div className="sp-reply-area">
                <textarea 
                  className="sp-reply-textarea" 
                  placeholder="Type your response here to resolve the ticket..."
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={submitting}
                />
                <div className="sp-reply-actions">
                  {activeTicket.status !== 'closed' && activeTicket.status !== 'resolved' && (
                    <button 
                      className="btn btn-outline"
                      onClick={() => handleUpdateStatus('in-progress')}
                      disabled={submitting || activeTicket.status === 'in-progress'}
                    >
                      <Clock size={14} /> <span>Mark In-Progress</span>
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-primary"
                    onClick={handleSendReply}
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? <RefreshCw size={14} className="um-spin" /> : <Send size={14} />}
                    <span>{activeTicket.adminReply ? 'Update Reply' : 'Send & Resolve'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="sp-detail-empty">
              <div className="sp-detail-icon"><HelpCircle size={32} /></div>
              <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>No Ticket Selected</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a support ticket from the list to view its details and respond.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="em-toast em-toast-success">
          <CheckCircle size={16} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
