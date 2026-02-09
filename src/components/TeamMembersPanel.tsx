import React, { useState, useEffect } from 'react';
import { Users, Shield, Edit2, Trash2, Save, X, UserPlus, Key, Info, Mail, Copy, Eye, EyeOff, ChevronDown, ChevronRight, Loader2, Settings, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TeamSettingsModal } from './TeamSettingsModal';

interface CategoryAccess {
  category: string;
  has_access: boolean;
  document_count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  meetings: 'Meetings',
  strategy: 'Strategy',
  financial: 'Financial',
  operations: 'Operations',
  marketing: 'Marketing',
  sales: 'Sales',
  customer: 'Customer',
  product: 'Product',
  people: 'People',
  legal: 'Legal',
  support: 'Support',
  industry: 'Industry',
  reference: 'Reference',
  other: 'Other',
};

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  view_financial: boolean;
  avatar_url: string | null;
}

interface PendingInvite {
  id: string;
  code: string;
  invited_email: string;
  assigned_role: 'admin' | 'member';
  view_financial: boolean;
  created_at: string;
  category_access: Record<string, boolean> | null;
}

export const TeamMembersPanel: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editViewFinancial, setEditViewFinancial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<{ role: string; team_id: string | null } | null>(null);
  const [teamName, setTeamName] = useState<string>('');

  // Add member states
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [viewFinancial, setViewFinancial] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [showInviteMessage, setShowInviteMessage] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [teamCategories, setTeamCategories] = useState<CategoryAccess[]>([]);
  const [inviteCategoryAccess, setInviteCategoryAccess] = useState<Record<string, boolean>>({});
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  const isAdmin = currentUserData?.role === 'admin';
  const teamId = currentUserData?.team_id;

  // Fetch current user's data from public.users table
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('role, team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current user data:', error);
        return;
      }

      setCurrentUserData(data);
    };

    fetchCurrentUser();
  }, [user?.id]);

  useEffect(() => {
    if (teamId) {
      loadTeamMembers();
      loadTeamName();
      loadTeamCategories();
      loadPendingInvites();
    }
  }, [teamId]);

  const loadTeamCategories = async () => {
    if (!teamId) return;

    setLoadingCategories(true);
    try {
      const { data, error } = await supabase.rpc('get_team_categories', { p_team_id: teamId });

      if (error) throw error;

      const categories = (data || []).map((c: { category: string; document_count: number }) => ({
        category: c.category,
        has_access: true,
        document_count: c.document_count,
      }));

      setTeamCategories(categories);

      const defaultAccess: Record<string, boolean> = {};
      categories.forEach((c: CategoryAccess) => {
        defaultAccess[c.category] = true;
      });
      setInviteCategoryAccess(defaultAccess);
    } catch (err) {
      console.error('Error loading team categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadTeamName = async () => {
    if (!teamId) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle();

      if (error) {
        console.error('Error loading team name:', error);
        return;
      }

      if (data) {
        setTeamName(data.name);
      }
    } catch (err) {
      console.error('Error loading team name:', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      setError('');

      // Query the public.users table for team members
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, role, view_financial, avatar_url, team_id')
        .eq('team_id', teamId);

      if (usersError) throw usersError;

      const teamMembers = (usersData || [])
        .map((u) => ({
          id: u.id,
          email: u.email || '',
          full_name: u.name || null,
          role: (u.role || 'member') as 'admin' | 'member',
          view_financial: u.view_financial !== false,
          avatar_url: u.avatar_url || null,
        }))
        .sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return a.email.localeCompare(b.email);
        });

      setMembers(teamMembers);
    } catch (err: any) {
      console.error('Error loading team members:', err);
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvites = async () => {
    if (!teamId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('invite_codes')
        .select('id, code, invited_email, assigned_role, view_financial, created_at, category_access')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('times_used', 0)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPendingInvites(data || []);
    } catch (err: any) {
      console.error('Error loading pending invites:', err);
    }
  };

  const cancelPendingInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;

    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', inviteId);

      if (error) throw error;

      await loadPendingInvites();
    } catch (err: any) {
      console.error('Error canceling invite:', err);
      setError('Failed to cancel invite');
    }
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member.id);
    setEditRole(member.role);
    setEditViewFinancial(member.view_financial);
  };

  const cancelEditing = () => {
    setEditingMember(null);
    setEditRole('member');
    setEditViewFinancial(true);
  };

  const saveChanges = async (memberId: string) => {
    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: editRole,
          view_financial: editViewFinancial,
        })
        .eq('id', memberId);

      if (updateError) throw updateError;

      if (teamId) {
        await supabase.rpc('update_user_category_access', {
          p_user_id: memberId,
          p_category: 'financial',
          p_has_access: editViewFinancial,
          p_granted_by: user?.id,
        });
      }

      await loadTeamMembers();
      setEditingMember(null);
    } catch (err: any) {
      console.error('Error updating member:', err);
      setError(err.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?\n\nWARNING: This will PERMANENTLY DELETE their account and all associated data. This action cannot be undone.\n\nUsers without a team cannot exist in the system.`)) {
      return;
    }

    try {
      setError('');

      // Call the database function to completely delete the user
      const { error: deleteError } = await supabase.rpc('delete_user_completely', {
        target_user_id: memberId
      });

      if (deleteError) throw deleteError;

      await loadTeamMembers();
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member');
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleInviteTeamMember = async () => {
    if (!inviteEmail) {
      setInviteError('Email is required');
      return;
    }

    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    setShowInviteMessage(false);

    try {
      if (!teamId) {
        setInviteError('No team found.');
        setInviting(false);
        return;
      }

      const inviteCode = generateInviteCode();

      const categoryAccessObj = Object.keys(inviteCategoryAccess).length > 0 ? inviteCategoryAccess : null;

      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code: inviteCode,
          team_id: teamId,
          invited_email: inviteEmail.toLowerCase().trim(),
          assigned_role: inviteRole,
          view_financial: viewFinancial,
          created_by: user?.id,
          max_uses: 1,
          is_active: true,
          category_access: categoryAccessObj
        });

      if (error) throw error;

      setGeneratedCode(inviteCode);
      setShowInviteMessage(true);
      setInviteSuccess(`Invite code generated for ${inviteEmail}`);
      await loadPendingInvites();
    } catch (err: any) {
      console.error('Error creating invite:', err);
      setInviteError(err.message || 'Failed to create invite');
    } finally {
      setInviting(false);
    }
  };

  const sendInviteEmail = async () => {
    if (!generatedCode || !inviteEmail) {
      setInviteError('Missing invite code or email');
      return;
    }

    setSendingEmail(true);
    setInviteError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: inviteEmail,
            inviteCode: generatedCode,
            teamName: teamName || 'your team',
            role: inviteRole,
            categoryAccess: getEnabledCategories(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invite email');
      }

      setInviteSuccess(`Invite email sent successfully to ${inviteEmail}!`);
      setEmailSent(true);
    } catch (err: any) {
      console.error('Error sending invite email:', err);
      setInviteError(err.message || 'Failed to send invite email');
    } finally {
      setSendingEmail(false);
    }
  };

  const getEmailPreviewHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
          <style>
            :root {
              color-scheme: light dark;
              supported-color-schemes: light dark;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              line-height: 1.6;
              color: #e5e7eb !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #0f172a !important;
            }
            body[data-outlook-cycle] {
              background-color: #0f172a !important;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #1e293b !important;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            }
            .email-wrapper {
              background-color: #0f172a !important;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header .tagline {
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.95;
              font-weight: 500;
            }
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 18px;
              font-weight: 600;
              color: #f3f4f6;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              color: #d1d5db;
              margin-bottom: 20px;
              line-height: 1.8;
            }
            .invite-box {
              background: #334155;
              border: 2px solid #475569;
              border-radius: 8px;
              padding: 24px;
              margin: 30px 0;
              text-align: center;
            }
            .invite-label {
              font-size: 12px;
              text-transform: uppercase;
              color: #94a3b8;
              font-weight: 600;
              letter-spacing: 1px;
              margin-bottom: 12px;
            }
            .invite-code {
              font-size: 32px;
              font-weight: 700;
              color: #4ade80;
              font-family: 'Courier New', monospace;
              letter-spacing: 3px;
              margin-bottom: 8px;
            }
            .email-display {
              font-size: 14px;
              color: #94a3b8;
              margin-top: 12px;
            }
            .email-value {
              font-weight: 600;
              color: #e5e7eb;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
              color: white;
              padding: 18px 48px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              font-size: 18px;
              margin: 10px 0;
              transition: transform 0.2s;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            .cta-container {
              text-align: center;
              margin: 20px 0;
            }
            .value-section {
              background: #334155;
              border-radius: 8px;
              padding: 24px;
              margin: 30px 0;
            }
            .value-title {
              font-size: 18px;
              font-weight: 700;
              color: #f3f4f6;
              margin-bottom: 16px;
            }
            .feature-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .feature-list li {
              padding: 8px 0 8px 28px;
              position: relative;
              color: #d1d5db;
              font-size: 15px;
            }
            .feature-list li:before {
              content: "✅";
              position: absolute;
              left: 0;
            }
            .use-case-section {
              margin: 30px 0;
            }
            .use-case-category {
              margin-bottom: 20px;
            }
            .category-title {
              font-size: 16px;
              font-weight: 700;
              color: #f3f4f6;
              margin-bottom: 8px;
            }
            .use-case-list {
              list-style: none;
              padding: 0;
              margin: 0 0 0 24px;
            }
            .use-case-list li {
              color: #9ca3af;
              font-size: 14px;
              padding: 4px 0;
              font-style: italic;
            }
            .use-case-list li:before {
              content: "•";
              color: #64748b;
              margin-right: 8px;
            }
            .steps {
              background: #1e3a5f;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .steps-title {
              font-weight: 600;
              color: #60a5fa;
              margin-bottom: 12px;
              font-size: 16px;
            }
            .steps ol {
              margin: 0;
              padding-left: 20px;
              color: #93c5fd;
            }
            .steps li {
              margin-bottom: 8px;
              font-size: 14px;
            }
            .pro-tips {
              background: #422006;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
            }
            .pro-tips-title {
              font-weight: 600;
              color: #fbbf24;
              margin-bottom: 12px;
              font-size: 16px;
            }
            .pro-tips p {
              margin: 8px 0;
              color: #fcd34d;
              font-size: 14px;
            }
            .footer {
              background: #0f172a;
              padding: 30px;
              text-align: center;
              border-top: 1px solid #334155;
              font-size: 13px;
              color: #94a3b8;
            }
            .footer a {
              color: #60a5fa;
              text-decoration: none;
            }
            .divider {
              border-top: 1px solid #334155;
              margin: 30px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
            <div class="header">
              <h1>🚀 Welcome to AI Rocket + Astra Intelligence</h1>
              <p class="tagline">AI that Works for Work</p>
            </div>
            <div class="content">
              <div class="greeting">
                Hi there!
              </div>
              <div class="message">
                <strong>${user?.user_metadata?.full_name || user?.email}</strong> has invited you to join <strong>${teamName || 'your team'}</strong> on AI Rocket + Astra Intelligence.
              </div>

              <div class="invite-box">
                <div class="invite-label">Your Invite Code</div>
                <div class="invite-code">${generatedCode}</div>
                <div class="email-display">
                  Use with email: <span class="email-value">${inviteEmail}</span>
                </div>
              </div>

              <div class="cta-container">
                <a href="${window.location.origin}" class="cta-button">
                  Create Your Account →
                </a>
              </div>

              <div class="divider"></div>

              <div class="value-section">
                <div class="value-title">What is AI Rocket + Astra?</div>
                <div class="message" style="margin-bottom: 16px;">
                  Your team's AI intelligence platform that connects to ALL your data and provides insights you can trust:
                </div>
                <ul class="feature-list">
                  <li><strong>Instant Answers</strong> - Ask questions about meetings, documents, financials, and strategy in plain English</li>
                  <li><strong>Smart Context</strong> - Astra knows your team's mission, goals, and recent activities</li>
                  <li><strong>Visual Insights</strong> - Get automatic charts, graphs, and reports from your data</li>
                  <li><strong>Team Collaboration</strong> - Work together with AI-assisted group chats and @mentions</li>
                  <li><strong>Private & Secure</strong> - Your data stays with your team, never shared across organizations</li>
                </ul>
              </div>

              <div class="use-case-section">
                <div class="value-title">What Can Astra Do For You?</div>

                <div class="use-case-category">
                  <div class="category-title">📊 Meeting Intelligence</div>
                  <ul class="use-case-list">
                    <li>"What were our key decisions from last week's Leadership Meeting?"</li>
                    <li>"Show me action items assigned to me this month"</li>
                    <li>"Summarize client feedback from recent calls"</li>
                  </ul>
                </div>

                <div class="use-case-category">
                  <div class="category-title">📈 Strategic Insights</div>
                  <ul class="use-case-list">
                    <li>"How do our recent activities align with our quarterly goals?"</li>
                    <li>"What are the top initiatives we're working on?"</li>
                    <li>"Compare this quarter's progress to last quarter"</li>
                  </ul>
                </div>

                <div class="use-case-category">
                  <div class="category-title">💰 Financial Analysis</div>
                  <ul class="use-case-list">
                    <li>"What's our revenue trend over the last 6 months?"</li>
                    <li>"Show me our biggest expenses this quarter"</li>
                    <li>"How does our current P&L compare to budget?"</li>
                  </ul>
                </div>

                <div class="use-case-category">
                  <div class="category-title">🔍 Smart Search</div>
                  <ul class="use-case-list">
                    <li>Find information across ALL your team's documents, meetings, and data</li>
                    <li>Get answers backed by specific sources and dates</li>
                    <li>Ask follow-up questions for deeper insights</li>
                  </ul>
                </div>
              </div>

              <div class="steps">
                <div class="steps-title">🎯 Get Started in 3 Minutes:</div>
                <ol>
                  <li>Click the button above to visit AI Rocket</li>
                  <li>Select "Sign Up" and enter your email: <strong>${inviteEmail}</strong></li>
                  <li>Create a password for your account</li>
                  <li>Enter your invite code: <strong>${generatedCode}</strong></li>
                  <li>Start asking Astra anything about your team!</li>
                </ol>
              </div>

              <div class="pro-tips">
                <div class="pro-tips-title">💡 Pro Tips:</div>
                <p>• Try asking: "What should I know about our team?" to get started</p>
                <p>• Use @Astra in group chats to get AI help for everyone</p>
                <p>• Save your favorite insights as visualizations for quick access</p>
              </div>

              <div class="message">
                <strong>Your Role:</strong> You'll be joining as a <strong>${inviteRole}</strong> with access to team conversations, AI-powered insights, meeting transcripts, action items, strategy documents, and company goals.
              </div>

              ${getEnabledCategories().length > 0 ? `
              <div class="steps" style="background: #1e3a5f; margin-top: 20px;">
                <div class="steps-title">📁 Your Data Access</div>
                <p style="color: #93c5fd; font-size: 14px; margin-bottom: 12px;">
                  You'll have access to the following data categories:
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${getEnabledCategories().map(cat => `
                    <span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500;">
                      ${CATEGORY_LABELS[cat] || cat}
                    </span>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              <div class="divider"></div>

              <div class="invite-box">
                <div class="invite-label">Your Invite Code</div>
                <div class="invite-code">${generatedCode}</div>
                <div class="email-display">
                  Use with email: <span class="email-value">${inviteEmail}</span>
                </div>
              </div>

              <div class="cta-container">
                <a href="${window.location.origin}" class="cta-button">
                  Create Your Account →
                </a>
              </div>
            </div>
            <div class="footer">
              <p>
                This invitation was sent by ${user?.user_metadata?.full_name || user?.email} from ${teamName || 'your team'}.<br>
                Questions? Contact your team administrator.
              </p>
              <p style="margin-top: 20px;">
                <a href="${window.location.origin}">AI Rocket + Astra</a> - AI that Works for You
              </p>
            </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const copyInviteMessage = () => {
    const inviterName = user?.user_metadata?.full_name || user?.email || 'Your teammate';
    const appUrl = window.location.origin;

    const message = `
🚀 Welcome to AI Rocket + Astra Intelligence
AI that Works for Work

Hi there!

${inviterName} has invited you to join ${teamName || 'your team'} on AI Rocket + Astra Intelligence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR INVITE CODE
${generatedCode}

Use with email: ${inviteEmail}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👉 Create Your Account: ${appUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What is AI Rocket + Astra?

Your team's AI intelligence platform that connects to ALL your data and provides insights you can trust:

✅ Instant Answers - Ask questions about meetings, documents, financials, and strategy in plain English
✅ Smart Context - Astra knows your team's mission, goals, and recent activities
✅ Visual Insights - Get automatic charts, graphs, and reports from your data
✅ Team Collaboration - Work together with AI-assisted group chats and @mentions
✅ Private & Secure - Your data stays with your team, never shared across organizations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What Can Astra Do For You?

📊 Meeting Intelligence
• "What were our key decisions from last week's Leadership Meeting?"
• "Show me action items assigned to me this month"
• "Summarize client feedback from recent calls"

📈 Strategic Insights
• "How do our recent activities align with our quarterly goals?"
• "What are the top initiatives we're working on?"
• "Compare this quarter's progress to last quarter"

💰 Financial Analysis
• "What's our revenue trend over the last 6 months?"
• "Show me our biggest expenses this quarter"
• "How does our current P&L compare to budget?"

🔍 Smart Search
• Find information across ALL your team's documents, meetings, and data
• Get answers backed by specific sources and dates
• Ask follow-up questions for deeper insights

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Get Started in 3 Minutes:

1. Visit ${appUrl}
2. Select "Sign Up" and enter your email: ${inviteEmail}
3. Create a password for your account
4. Enter your invite code: ${generatedCode}
5. Start asking Astra anything about your team!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Pro Tips:

• Try asking: "What should I know about our team?" to get started
• Use @Astra in group chats to get AI help for everyone
• Save your favorite insights as visualizations for quick access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Role: You'll be joining as a ${inviteRole} with access to team conversations, AI-powered insights, meeting transcripts, action items, strategy documents, and company goals.
${getEnabledCategories().length > 0 ? `
📁 Your Data Access:
${getEnabledCategories().map(cat => `• ${CATEGORY_LABELS[cat] || cat}`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR INVITE CODE (reminder)
${generatedCode}

Use with email: ${inviteEmail}

👉 Create Your Account: ${appUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This invitation was sent by ${inviterName} from ${teamName || 'your team'}.
Questions? Contact your team administrator.

AI Rocket + Astra - AI that Works for Work
${appUrl}
`.trim();

    navigator.clipboard.writeText(message);
    setInviteSuccess('Full invite email copied to clipboard!');
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteRole('member');
    setGeneratedCode('');
    setShowInviteMessage(false);
    setInviteError('');
    setInviteSuccess('');
    setShowAddMember(false);
    setEmailSent(false);
    setShowEmailPreview(false);
    setShowCategorySettings(false);
    const defaultAccess: Record<string, boolean> = {};
    teamCategories.forEach(c => {
      defaultAccess[c.category] = true;
    });
    setInviteCategoryAccess(defaultAccess);
    setViewFinancial(true);
  };

  const toggleCategoryAccess = (category: string) => {
    const newValue = !inviteCategoryAccess[category];
    setInviteCategoryAccess(prev => ({
      ...prev,
      [category]: newValue
    }));
    if (category === 'financial') {
      setViewFinancial(newValue);
    }
  };

  const setAllCategoryAccess = (enabled: boolean) => {
    const newAccess: Record<string, boolean> = {};
    teamCategories.forEach(c => {
      newAccess[c.category] = enabled;
    });
    setInviteCategoryAccess(newAccess);
    if (teamCategories.some(c => c.category === 'financial')) {
      setViewFinancial(enabled);
    }
  };

  const getEnabledCategories = () => {
    return Object.entries(inviteCategoryAccess)
      .filter(([_, enabled]) => enabled)
      .map(([category]) => category);
  };

  const getCategoryAccessSummary = () => {
    const enabledCount = Object.values(inviteCategoryAccess).filter(Boolean).length;
    const totalCount = teamCategories.length;
    if (enabledCount === totalCount) return 'All categories';
    if (enabledCount === 0) return 'No categories';
    return `${enabledCount}/${totalCount} categories`;
  };

  // Show panel for all team members, just hide admin controls for non-admins
  if (!teamId) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Team Members</h3>
          <span className="text-sm text-gray-400">({members.length})</span>
        </div>
        {teamName && (
          <p className="text-sm text-gray-400 ml-8">
            Team: <span className="text-white font-medium">{teamName}</span>
          </p>
        )}
      </div>

      {isAdmin ? (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200 space-y-2">
              <p className="font-medium">Understanding Roles & Permissions</p>
              <ul className="space-y-1 text-xs text-blue-300">
                <li><strong>Admin:</strong> Can invite team members, manage roles, and access all features including financial data.</li>
                <li><strong>Member:</strong> Standard access with optional financial data viewing permissions.</li>
                <li><strong>View Financials:</strong> When enabled for members, allows access to financial documents and data.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">Team Member View</p>
              <p className="text-xs text-blue-300">
                You can view your team members here. Only team administrators can invite new members or modify roles and permissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {members.map((member) => {
          const isEditing = editingMember === member.id;
          const isCurrentUser = member.id === user?.id;

          return (
            <div
              key={member.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name || member.email}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-medium">
                        {(member.full_name || member.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <p className="text-white font-medium truncate">
                        {member.full_name || 'No name set'}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{member.email}</p>
                  </div>
                </div>

                {!isEditing ? (
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Shield
                          className={`w-4 h-4 ${
                            member.role === 'admin' ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                            member.role === 'admin' ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        >
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {member.view_financial ? 'Financial: Yes' : 'Financial: No'}
                      </p>
                    </div>

                    {isAdmin && !isCurrentUser && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => startEditing(member)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => removeMember(member.id, member.email)}
                          className="p-2 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col space-y-2">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'admin' | 'member')}
                        disabled={saving}
                        className="px-3 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>

                      <label className="flex items-center space-x-2 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={editViewFinancial}
                          onChange={(e) => setEditViewFinancial(e.target.checked)}
                          disabled={saving}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span>View Financial</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => saveChanges(member.id)}
                        disabled={saving}
                        className="p-2 hover:bg-green-600/20 rounded transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Invites ({pendingInvites.length})
          </h4>
          <div className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-dashed border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{invite.invited_email}</p>
                      <p className="text-xs text-yellow-400">Pending - invite sent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Shield
                          className={`w-4 h-4 ${
                            invite.assigned_role === 'admin' ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        />
                        <span
                          className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                            invite.assigned_role === 'admin' ? 'text-yellow-400' : 'text-gray-400'
                          }`}
                        >
                          {invite.assigned_role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {invite.view_financial ? 'Financial: Yes' : 'Financial: No'}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => cancelPendingInvite(invite.id)}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                        title="Cancel invite"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && pendingInvites.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No team members found</p>
        </div>
      ) : (
        isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{showAddMember ? 'Cancel' : 'Add Member'}</span>
            </button>
            <button
              onClick={() => setShowTeamSettings(true)}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Manage Category Access</span>
            </button>
          </div>
        )
      )}

      {isAdmin && showAddMember && (
        <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <UserPlus className="w-5 h-5 text-green-400" />
            <h4 className="text-lg font-semibold text-white">Add Team Member</h4>
          </div>

          {inviteSuccess && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-400 text-sm">{inviteSuccess}</p>
            </div>
          )}

          {inviteError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{inviteError}</p>
            </div>
          )}

          {!showInviteMessage ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={inviting}
                  className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInviteRole('admin')}
                    disabled={inviting}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inviteRole === 'admin'
                        ? 'border-yellow-500 bg-yellow-500/10'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className={`w-4 h-4 ${inviteRole === 'admin' ? 'text-yellow-400' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${inviteRole === 'admin' ? 'text-yellow-400' : 'text-white'}`}>Admin</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Full access to team settings, can invite members and manage roles
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteRole('member')}
                    disabled={inviting}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inviteRole === 'member'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Users className={`w-4 h-4 ${inviteRole === 'member' ? 'text-blue-400' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${inviteRole === 'member' ? 'text-blue-400' : 'text-white'}`}>Member</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Standard access to chat, documents, and team features
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-600">
                <div>
                  <p className="text-white text-sm font-medium">View Financial Information</p>
                  <p className="text-xs text-gray-500 mt-1">Allow access to financial data and documents</p>
                </div>
                <button
                  onClick={() => {
                    const newValue = !viewFinancial;
                    setViewFinancial(newValue);
                    setInviteCategoryAccess(prev => ({
                      ...prev,
                      financial: newValue
                    }));
                  }}
                  disabled={inviting}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    viewFinancial ? 'bg-green-600' : 'bg-gray-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      viewFinancial ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {teamCategories.length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCategorySettings(!showCategorySettings)}
                    disabled={inviting}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors disabled:opacity-50"
                  >
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">Category Access</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getCategoryAccessSummary()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {showCategorySettings ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {showCategorySettings && (
                    <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => setAllCategoryAccess(true)}
                          disabled={inviting}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Enable All
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllCategoryAccess(false)}
                          disabled={inviting}
                          className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          Disable All
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {teamCategories.map(cat => {
                          const hasAccess = inviteCategoryAccess[cat.category] ?? true;
                          return (
                            <button
                              key={cat.category}
                              type="button"
                              onClick={() => toggleCategoryAccess(cat.category)}
                              disabled={inviting}
                              className={`
                                p-3 rounded-lg border transition-all text-left
                                ${hasAccess
                                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                  : 'bg-gray-800 border-gray-600 text-gray-500'
                                }
                                hover:opacity-80 disabled:opacity-50
                              `}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">
                                  {CATEGORY_LABELS[cat.category] || cat.category}
                                </span>
                                {hasAccess ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </div>
                              <span className="text-xs opacity-70">
                                {cat.document_count} doc{cat.document_count !== 1 ? 's' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-gray-500 mt-3">
                        Select which data categories this user can access. They won't see documents from disabled categories in their AI responses.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleInviteTeamMember}
                disabled={inviting || !inviteEmail}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                {inviting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating Invite...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Generate Invite Code</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-400 text-sm font-medium mb-3">Invite Code Generated!</p>
                <div className="bg-gray-800 rounded p-3 mb-3">
                  <p className="text-white text-xs mb-2 font-mono">
                    You've been invited to join {teamName || 'our team'} on Astra Intelligence!
                  </p>
                  <p className="text-white text-xs mb-2">
                    Use this invite code to create your account: <span className="font-bold text-green-400">{generatedCode}</span>
                  </p>
                  <p className="text-white text-xs mb-2">
                    Email: <span className="font-bold">{inviteEmail}</span>
                  </p>
                  <p className="text-white text-xs">
                    Sign up here: <span className="text-blue-400">{window.location.origin}</span>
                  </p>
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={sendInviteEmail}
                    disabled={sendingEmail}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>{emailSent ? 'Send Again' : 'Send Invite Email'}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={copyInviteMessage}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Invite</span>
                  </button>
                  <button
                    onClick={resetInviteForm}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
                <button
                  onClick={() => setShowEmailPreview(true)}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview Invite Email</span>
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm font-medium mb-2">Next Steps:</p>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>• Send the invite email or copy the invite message to share</li>
                  <li>• {inviteEmail} will receive instructions to sign up</li>
                  <li>• They'll use the code and their email to create an account</li>
                  <li>• They'll automatically join your team with the assigned role</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {showEmailPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite Email Preview</h3>
              <button
                onClick={() => setShowEmailPreview(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={getEmailPreviewHTML()}
                className="w-full h-full border-0"
                title="Email Preview"
                style={{ minHeight: '600px' }}
              />
            </div>
          </div>
        </div>
      )}

      {teamId && (
        <TeamSettingsModal
          isOpen={showTeamSettings}
          onClose={() => setShowTeamSettings(false)}
          teamId={teamId}
          initialTab="access"
        />
      )}
    </div>
  );
};