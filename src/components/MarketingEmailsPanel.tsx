import React, { useState, useEffect } from 'react';
import { Plus, Send, Clock, CheckCircle, Eye, Edit, Copy, Trash2, RefreshCw, Pause, Play, History, Rocket, FileText, AlertCircle, Sparkles, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MarketingEmailComposer } from './MarketingEmailComposer';
import { EMAIL_TEMPLATES, MOONSHOT_EMAIL_TEMPLATE, WELCOME_WEEK_EMAIL_TEMPLATE, GUIDED_LAUNCH_ONBOARDING_TEMPLATE } from '../lib/email-templates';
import type { EmailTemplate } from '../lib/email-templates';

interface MarketingEmail {
  id: string;
  subject: string;
  subject_mode: 'static' | 'dynamic';
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'recurring';
  scheduled_for: string | null;
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  is_recurring: boolean;
  frequency: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  run_count: number;
  parent_recurring_id: string | null;
  pending_count?: number;
  content_description?: string;
}

export function MarketingEmailsPanel() {
  const [emails, setEmails] = useState<MarketingEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(() => {
    const saved = sessionStorage.getItem('marketingEmailComposerOpen');
    return saved === 'true';
  });
  const [editingEmail, setEditingEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('marketingEmailEditingId');
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadEmails();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('marketingEmailComposerOpen', showComposer.toString());
    if (editingEmail) {
      sessionStorage.setItem('marketingEmailEditingId', editingEmail);
    } else {
      sessionStorage.removeItem('marketingEmailEditingId');
    }
  }, [showComposer, editingEmail]);

  const loadEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_emails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const emailsWithPending = await Promise.all((data || []).map(async (email) => {
        if (email.total_recipients > 0) {
          const { count } = await supabase
            .from('marketing_email_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('marketing_email_id', email.id)
            .eq('status', 'pending');
          return { ...email, pending_count: count || 0 };
        }
        return { ...email, pending_count: 0 };
      }));

      setEmails(emailsWithPending);
    } catch (error) {
      console.error('Error loading marketing emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email');
    }
  };

  const handleDuplicate = async (email: MarketingEmail) => {
    try {
      const { data: emailData } = await supabase
        .from('marketing_emails')
        .select('*')
        .eq('id', email.id)
        .single();

      if (!emailData) return;

      const { error } = await supabase
        .from('marketing_emails')
        .insert({
          subject: `${emailData.subject} (Copy)`,
          content_description: emailData.content_description,
          special_notes: emailData.special_notes,
          html_content: emailData.html_content,
          recipient_filter: emailData.recipient_filter,
          status: 'draft'
        });

      if (error) throw error;
      await loadEmails();
    } catch (error) {
      console.error('Error duplicating email:', error);
      alert('Failed to duplicate email');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-4 h-4" />;
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'sending':
        return <Send className="w-4 h-4" />;
      case 'sent':
        return <CheckCircle className="w-4 h-4" />;
      case 'recurring':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-gray-400';
      case 'scheduled':
        return 'text-yellow-400';
      case 'sending':
        return 'text-blue-400';
      case 'sent':
        return 'text-green-400';
      case 'recurring':
        return 'text-cyan-400';
      default:
        return 'text-gray-400';
    }
  };

  const handlePauseRecurring = async (id: string) => {
    try {
      await supabase
        .from('marketing_emails')
        .update({ status: 'draft', is_recurring: false })
        .eq('id', id);
      await loadEmails();
    } catch (error) {
      console.error('Error pausing recurring email:', error);
    }
  };

  const handleResumeRecurring = async (email: MarketingEmail) => {
    try {
      const nextRunAt = new Date();
      switch (email.frequency) {
        case 'daily':
          nextRunAt.setDate(nextRunAt.getDate() + 1);
          break;
        case 'weekly':
          nextRunAt.setDate(nextRunAt.getDate() + 7);
          break;
        case 'biweekly':
          nextRunAt.setDate(nextRunAt.getDate() + 14);
          break;
        case 'monthly':
          nextRunAt.setMonth(nextRunAt.getMonth() + 1);
          break;
      }
      nextRunAt.setHours(9, 0, 0, 0);

      await supabase
        .from('marketing_emails')
        .update({
          status: 'recurring',
          is_recurring: true,
          next_run_at: nextRunAt.toISOString()
        })
        .eq('id', email.id);
      await loadEmails();
    } catch (error) {
      console.error('Error resuming recurring email:', error);
    }
  };

  const handleResumeCampaign = async (emailId: string) => {
    if (!confirm('Resume sending to remaining recipients?')) return;

    setResumingId(emailId);
    try {
      let remaining = 1;
      let totalSent = 0;
      let totalFailed = 0;

      while (remaining > 0) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resume-marketing-campaign`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ marketingEmailId: emailId }),
          }
        );

        if (!response.ok) throw new Error('Failed to resume');

        const result = await response.json();
        remaining = result.remaining || 0;
        totalSent = result.total_sent || 0;
        totalFailed = result.total_failed || 0;

        await loadEmails();
      }

      alert(`Campaign complete! ${totalSent} sent, ${totalFailed} failed.`);
    } catch (error) {
      console.error('Error resuming campaign:', error);
      alert('Failed to resume campaign');
    } finally {
      setResumingId(null);
      await loadEmails();
    }
  };

  const filteredEmails = filterStatus === 'all'
    ? emails
    : emails.filter(e => e.status === filterStatus);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuccessRate = (email: MarketingEmail) => {
    if (email.total_recipients === 0) return '-';
    const rate = (email.successful_sends / email.total_recipients) * 100;
    return `${rate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading marketing emails...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Marketing Emails</h2>
          <p className="text-gray-400 mt-1">Create and manage email campaigns</p>
        </div>
        <button
          onClick={() => {
            setEditingEmail(null);
            setSelectedTemplate(null);
            setShowComposer(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Email
        </button>
      </div>

      {/* Active Recurring Emails Section */}
      {emails.filter(e => e.status === 'recurring' && e.is_recurring).length > 0 && (
        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <RefreshCw className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Active Recurring Emails</h3>
              <p className="text-sm text-gray-400">Automated emails running on schedule</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emails.filter(e => e.status === 'recurring' && e.is_recurring).map((email) => (
              <div
                key={email.id}
                className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 hover:border-cyan-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      {email.subject_mode === 'dynamic' ? (
                        <Sparkles className="w-5 h-5 text-white" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate" title={email.subject}>
                        {email.subject_mode === 'dynamic' ? 'Dynamic Subject' : email.subject}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded-full capitalize">
                          {email.frequency}
                        </span>
                        {email.subject_mode === 'dynamic' && (
                          <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Subject
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {email.content_description && (
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {email.content_description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <div>
                      <span className="text-gray-500">Next run: </span>
                      <span className="text-cyan-300">
                        {email.next_run_at ? new Date(email.next_run_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Not scheduled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEmail(email.id);
                        setShowComposer(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-cyan-400 transition-colors rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePauseRecurring(email.id)}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors rounded"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {email.run_count > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-gray-500">
                    {email.run_count} email{email.run_count !== 1 ? 's' : ''} sent so far
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Templates Section */}
      <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Email Templates</h3>
            <p className="text-sm text-gray-400">Pre-built emails ready to send</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EMAIL_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setEditingEmail(null);
                setSelectedTemplate(template);
                setShowComposer(true);
              }}
              className={`bg-slate-800/80 border border-slate-700 rounded-lg p-4 hover:bg-slate-800 transition-all text-left group ${
                template.color === 'orange' ? 'hover:border-orange-500' : 'hover:border-blue-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                  template.color === 'orange'
                    ? 'bg-gradient-to-br from-orange-500 to-emerald-500'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-white">{template.name}</div>
                  <div className="text-xs text-gray-400">
                    {template.id === 'moonshot-challenge' ? 'Registration announcement' : 'Welcome & onboarding'}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {template.description}
              </p>
              <div className={`mt-3 flex items-center gap-2 text-xs ${
                template.color === 'orange' ? 'text-orange-400' : 'text-blue-400'
              }`}>
                <Send className="w-3.5 h-3.5" />
                <span>Ready to send</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
        {['all', 'recurring', 'draft', 'scheduled', 'sent'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-md capitalize transition-colors ${
              filterStatus === status
                ? 'bg-slate-700 text-white'
                : 'text-gray-400 hover:text-white'
            } ${status === 'recurring' ? 'flex items-center gap-1.5' : ''}`}
          >
            {status === 'recurring' && <RefreshCw className="w-3.5 h-3.5" />}
            {status}
          </button>
        ))}
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No marketing emails found. Create your first campaign!
                </td>
              </tr>
            ) : (
              filteredEmails.filter(e => !e.parent_recurring_id).map((email) => (
                <tr key={email.id} className={`hover:bg-slate-700/50 transition-colors ${email.is_recurring ? 'bg-cyan-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{email.subject}</div>
                    {email.is_recurring && email.frequency && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded-full capitalize">
                          {email.frequency}
                        </span>
                        {email.run_count > 0 && (
                          <span className="text-xs text-gray-400">
                            {email.run_count} sent
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center gap-2 ${getStatusColor(email.status)}`}>
                      {getStatusIcon(email.status)}
                      <span className="capitalize">{email.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {email.total_recipients > 0 ? email.total_recipients : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300">
                      {email.is_recurring ? (
                        email.run_count > 0 ? `${email.run_count} runs` : 'Not run yet'
                      ) : (
                        <>
                          {getSuccessRate(email)}
                          {email.failed_sends > 0 && (
                            <span className="text-red-400 text-sm ml-2">
                              ({email.failed_sends} failed)
                            </span>
                          )}
                          {(email.pending_count || 0) > 0 && (
                            <span className="text-amber-400 text-sm ml-2">
                              ({email.pending_count} pending)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {email.is_recurring && email.next_run_at ? (
                      <div>
                        <div className="text-xs text-gray-500">Next:</div>
                        <div>{formatDate(email.next_run_at)}</div>
                      </div>
                    ) : email.status === 'scheduled' ? (
                      formatDate(email.scheduled_for)
                    ) : email.status === 'sent' ? (
                      formatDate(email.sent_at)
                    ) : (
                      formatDate(email.created_at)
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {(email.pending_count || 0) > 0 && (
                        <button
                          onClick={() => handleResumeCampaign(email.id)}
                          disabled={resumingId === email.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title={`Resume sending to ${email.pending_count} pending recipients`}
                        >
                          {resumingId === email.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              Resume ({email.pending_count})
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingEmail(email.id);
                          setShowComposer(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                        title="View/Edit"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {email.status === 'recurring' && (
                        <button
                          onClick={() => handlePauseRecurring(email.id)}
                          className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                          title="Pause Recurring"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {email.status === 'draft' && email.frequency && (
                        <button
                          onClick={() => handleResumeRecurring(email)}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                          title="Resume Recurring"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicate(email)}
                        className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {(email.status === 'draft' || email.status === 'recurring') && (
                        <button
                          onClick={() => handleDelete(email.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showComposer && (
        <MarketingEmailComposer
          emailId={editingEmail}
          template={selectedTemplate}
          onClose={() => {
            setShowComposer(false);
            setEditingEmail(null);
            setSelectedTemplate(null);
            loadEmails();
          }}
        />
      )}
    </div>
  );
}
