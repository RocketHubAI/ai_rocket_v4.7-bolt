import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Eye, Code, Send, Clock, Mail, Users, ChevronLeft, ChevronRight, RefreshCw, Rocket, ImagePlus, Trash2, Upload, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getFeatureContext } from '../lib/marketing-context';
import type { EmailTemplate } from '../lib/email-templates';

interface MarketingEmailComposerProps {
  emailId: string | null;
  template?: EmailTemplate | null;
  onClose: () => void;
}

interface UserFilters {
  launch_status: 'all' | 'launched' | 'onboarding';
  current_stage: 'all' | 'fuel' | 'guidance' | 'boosters';
  drive_connected: 'all' | 'connected' | 'not_connected';
  activity_level: 'all' | 'active_7d' | 'active_30d' | 'inactive_30d';
  user_role: 'all' | 'admin' | 'member';
  account_age: 'all' | 'new_7d' | 'new_30d' | 'established';
  has_visualizations: boolean | null;
  has_scheduled_reports: boolean | null;
  has_messages: boolean | null;
}

const DEFAULT_USER_FILTERS: UserFilters = {
  launch_status: 'all',
  current_stage: 'all',
  drive_connected: 'all',
  activity_level: 'all',
  user_role: 'all',
  account_age: 'all',
  has_visualizations: null,
  has_scheduled_reports: null,
  has_messages: null
};

interface EmailData {
  subject: string;
  subject_mode: 'static' | 'dynamic';
  content_description: string;
  special_notes: string;
  html_content: string;
  recipient_filter: {
    types: ('all_users' | 'specific' | 'preview_requests' | 'marketing_contacts' | 'moonshot_registrations' | 'filtered_users')[];
    emails?: string[];
    user_filters?: UserFilters;
  };
  scheduled_for: string | null;
  context_type?: 'full' | 'core' | 'benefits' | 'useCases';
  is_recurring?: boolean;
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  custom_interval_days?: number;
  send_hour?: number;
  featured_image_url?: string;
  from_address?: string;
  from_name?: string;
  reply_to?: string;
}

interface SenderOption {
  id: string;
  address: string;
  name: string;
  domain: string;
  description: string;
}

const SENDER_OPTIONS: SenderOption[] = [
  { id: 'astra', address: 'astra@airocket.app', name: 'AI Rocket', domain: 'airocket.app', description: 'Default AI Rocket sender' },
  { id: 'clay-airocket', address: 'clay@airocket.app', name: 'Clay Speakman', domain: 'airocket.app', description: 'Personal email from Clay (AI Rocket)' },
  { id: 'clay-rockethub', address: 'clay@rockethub.ai', name: 'Clay Speakman', domain: 'rockethub.ai', description: 'Personal email from Clay (RocketHub)' },
  { id: 'derek-rockethub', address: 'derek@rockethub.ai', name: 'Derek Clements', domain: 'rockethub.ai', description: 'Personal email from Derek' },
  { id: 'marshall-rockethub', address: 'marshall@rockethub.ai', name: 'Marshall McDonald', domain: 'rockethub.ai', description: 'Personal email from Marshall' },
  { id: 'welcome', address: 'welcome@airocket.app', name: 'AI Rocket', domain: 'airocket.app', description: 'Welcome emails' },
  { id: 'updates', address: 'updates@airocket.app', name: 'AI Rocket Updates', domain: 'airocket.app', description: 'Product updates' },
  { id: 'support', address: 'support@airocket.app', name: 'AI Rocket Support', domain: 'airocket.app', description: 'Support communications' },
];

const INITIAL_DATA: EmailData = {
  subject: '',
  subject_mode: 'static',
  content_description: '',
  special_notes: '',
  html_content: '',
  recipient_filter: { types: ['all_users'] },
  scheduled_for: null,
  context_type: 'full',
  is_recurring: false,
  frequency: 'weekly',
  custom_interval_days: 3,
  send_hour: 9,
  featured_image_url: '',
  from_address: 'astra@airocket.app',
  from_name: 'AI Rocket',
  reply_to: ''
};

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily', description: 'Every day' },
  { value: 'weekly', label: 'Weekly', description: 'Every 7 days' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 14 days' },
  { value: 'monthly', label: 'Monthly', description: 'Every 30 days' },
  { value: 'custom', label: 'Custom', description: 'Set your own interval' }
] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: i === 0 ? '12:00 AM ET' : i < 12 ? `${i}:00 AM ET` : i === 12 ? '12:00 PM ET' : `${i - 12}:00 PM ET`
}));

export function MarketingEmailComposer({ emailId, template, onClose }: MarketingEmailComposerProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(() => template ? 2 : 1);
  const [emailData, setEmailData] = useState<EmailData>(() => {
    if (template) {
      return {
        ...INITIAL_DATA,
        subject: template.subject,
        content_description: template.description,
        html_content: template.htmlContent,
      };
    }
    return INITIAL_DATA;
  });
  const [regenerationComments, setRegenerationComments] = useState('');
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, total: 0 });
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('immediate');
  const [draftId, setDraftId] = useState<string | null>(emailId);
  const [previewRequestCount, setPreviewRequestCount] = useState(0);
  const [marketingContactsCount, setMarketingContactsCount] = useState(0);
  const [moonshotRegistrationCount, setMoonshotRegistrationCount] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(template || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedSenderId, setSelectedSenderId] = useState('astra');
  const [userFilters, setUserFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [filteredUsersCount, setFilteredUsersCount] = useState(0);
  const [filteredUserEmails, setFilteredUserEmails] = useState<string[]>([]);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [loadingFilteredCount, setLoadingFilteredCount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSenderChange = (senderId: string) => {
    setSelectedSenderId(senderId);
    const sender = SENDER_OPTIONS.find(s => s.id === senderId);
    if (sender) {
      setEmailData(prev => ({
        ...prev,
        from_address: sender.address,
        from_name: sender.name
      }));
    }
  };

  useEffect(() => {
    if (emailId) {
      loadEmail();
    }
    loadUsers();
    loadPreviewRequests();
    loadMarketingContactsCount();
    loadMoonshotRegistrationCount();
  }, [emailId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailData.subject || emailData.content_description) {
        saveDraft();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [emailData.subject, emailData.content_description, emailData.special_notes, emailData.context_type]);

  useEffect(() => {
    if (emailData.recipient_filter.types.includes('filtered_users')) {
      loadFilteredUsers();
    }
  }, [userFilters, emailData.recipient_filter.types]);

  const loadFilteredUsers = async () => {
    setLoadingFilteredCount(true);
    try {
      const { data, error } = await supabase.rpc('get_filtered_marketing_recipients', {
        p_launch_status: userFilters.launch_status,
        p_current_stage: userFilters.current_stage,
        p_drive_connected: userFilters.drive_connected,
        p_activity_level: userFilters.activity_level,
        p_user_role: userFilters.user_role,
        p_account_age: userFilters.account_age,
        p_has_visualizations: userFilters.has_visualizations,
        p_has_scheduled_reports: userFilters.has_scheduled_reports,
        p_has_messages: userFilters.has_messages
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setFilteredUsersCount(data[0].user_count || 0);
        const emails = (data[0].user_emails || []).map((u: { email: string }) => u.email);
        setFilteredUserEmails(emails);
        setEmailData(prev => ({
          ...prev,
          recipient_filter: {
            ...prev.recipient_filter,
            user_filters: userFilters
          }
        }));
      }
    } catch (error) {
      console.error('Error loading filtered users:', error);
      setFilteredUsersCount(0);
      setFilteredUserEmails([]);
    } finally {
      setLoadingFilteredCount(false);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (userFilters.launch_status !== 'all') count++;
    if (userFilters.current_stage !== 'all') count++;
    if (userFilters.drive_connected !== 'all') count++;
    if (userFilters.activity_level !== 'all') count++;
    if (userFilters.user_role !== 'all') count++;
    if (userFilters.account_age !== 'all') count++;
    if (userFilters.has_visualizations !== null) count++;
    if (userFilters.has_scheduled_reports !== null) count++;
    if (userFilters.has_messages !== null) count++;
    return count;
  };

  const resetFilters = () => {
    setUserFilters(DEFAULT_USER_FILTERS);
  };

  const loadEmail = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_emails')
        .select('*')
        .eq('id', emailId)
        .single();

      if (error) throw error;
      if (data) {
        let recipientFilter = data.recipient_filter;
        if (recipientFilter?.type && !recipientFilter.types) {
          const oldType = recipientFilter.type;
          recipientFilter = {
            types: [oldType === 'all' ? 'all_users' : oldType],
            emails: recipientFilter.emails
          };
        }
        setEmailData({
          subject: data.subject,
          subject_mode: data.subject_mode || 'static',
          content_description: data.content_description,
          special_notes: data.special_notes,
          html_content: data.html_content,
          recipient_filter: recipientFilter,
          scheduled_for: data.scheduled_for,
          context_type: data.context_type || 'full',
          is_recurring: data.is_recurring || false,
          frequency: data.frequency || 'weekly',
          custom_interval_days: data.custom_interval_days || 3,
          send_hour: data.send_hour ?? 9,
          from_address: data.from_address || 'astra@airocket.app',
          from_name: data.from_name || 'AI Rocket',
          reply_to: data.reply_to || ''
        });
        const matchingSender = SENDER_OPTIONS.find(s => s.address === data.from_address);
        if (matchingSender) {
          setSelectedSenderId(matchingSender.id);
        }
        if (data.is_recurring) {
          setScheduleType('recurring');
          setStep(3);
        } else if (data.html_content) {
          setStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading email:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .order('name');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPreviewRequests = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_preview_requests_with_onboarding');

      if (error) throw error;

      const notYetSignedUp = data?.filter((req: any) => !req.user_onboarded) || [];
      setPreviewRequestCount(notYetSignedUp.length);
    } catch (error) {
      console.error('Error loading preview requests:', error);
    }
  };

  const loadMarketingContactsCount = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_marketing_contacts_for_campaign');

      if (error) throw error;
      setMarketingContactsCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading marketing contacts count:', error);
    }
  };

  const loadMoonshotRegistrationCount = async () => {
    try {
      const { count, error } = await supabase
        .from('moonshot_registrations')
        .select('*', { count: 'exact', head: true })
        .is('converted_at', null);

      if (error) throw error;
      setMoonshotRegistrationCount(count || 0);
    } catch (error) {
      console.error('Error loading moonshot registration count:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPEG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `email-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketing-images')
        .getPublicUrl(filePath);

      setEmailData(prev => ({ ...prev, featured_image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setEmailData(prev => ({ ...prev, featured_image_url: '' }));
  };

  const generateEmail = async () => {
    setGenerating(true);
    try {
      const featureContext = getFeatureContext(emailData.context_type || 'full');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: emailData.subject,
            contentDescription: emailData.content_description,
            specialNotes: emailData.special_notes,
            previousHtml: emailData.html_content || undefined,
            regenerationComments: regenerationComments || undefined,
            featureContext,
            featuredImageUrl: emailData.featured_image_url || undefined
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Generate email error:', errorData);
        throw new Error(errorData.error || 'Failed to generate email');
      }

      const result = await response.json();
      setEmailData(prev => ({ ...prev, html_content: result.html }));
      setRegenerationComments('');
      setStep(2);

      await saveDraft();
    } catch (error) {
      console.error('Error generating email:', error);
      alert(`Failed to generate email: ${error.message}\n\nPlease ensure GEMINI_API_KEY is configured in Supabase secrets.`);
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    try {
      const { data: existingEmail } = draftId
        ? await supabase.from('marketing_emails').select('status, is_recurring').eq('id', draftId).maybeSingle()
        : { data: null };

      const shouldPreserveStatus = existingEmail?.status === 'recurring' && existingEmail?.is_recurring;

      const payload = {
        subject: emailData.subject,
        subject_mode: emailData.subject_mode,
        content_description: emailData.content_description,
        special_notes: emailData.special_notes,
        html_content: emailData.html_content,
        recipient_filter: emailData.recipient_filter,
        scheduled_for: emailData.scheduled_for,
        context_type: emailData.context_type,
        from_address: emailData.from_address,
        from_name: emailData.from_name,
        reply_to: emailData.reply_to || null,
        ...(shouldPreserveStatus ? {} : { status: 'draft' })
      };

      if (draftId) {
        const { error } = await supabase
          .from('marketing_emails')
          .update(payload)
          .eq('id', draftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('marketing_emails')
          .insert({ ...payload, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setDraftId(data.id);
          sessionStorage.setItem('marketingEmailEditingId', data.id);
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const calculateNextRunAt = (frequency: string, customDays?: number, sendHour?: number): string => {
    const hour = sendHour ?? 9;
    const now = new Date();
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const etParts = etFormatter.formatToParts(now);
    const etYear = parseInt(etParts.find(p => p.type === 'year')?.value || '2024');
    const etMonth = parseInt(etParts.find(p => p.type === 'month')?.value || '1') - 1;
    const etDay = parseInt(etParts.find(p => p.type === 'day')?.value || '1');
    let targetDate = new Date(Date.UTC(etYear, etMonth, etDay, hour + 5, 0, 0));
    const testDate = new Date(targetDate);
    const etOffsetCheck = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    }).format(testDate);
    const actualHour = parseInt(etOffsetCheck);
    if (actualHour !== hour) {
      targetDate = new Date(targetDate.getTime() + (hour - actualHour) * 60 * 60 * 1000);
    }
    switch (frequency) {
      case 'daily':
        targetDate.setUTCDate(targetDate.getUTCDate() + 1);
        break;
      case 'weekly':
        targetDate.setUTCDate(targetDate.getUTCDate() + 7);
        break;
      case 'biweekly':
        targetDate.setUTCDate(targetDate.getUTCDate() + 14);
        break;
      case 'monthly':
        targetDate.setUTCMonth(targetDate.getUTCMonth() + 1);
        break;
      case 'custom':
        targetDate.setUTCDate(targetDate.getUTCDate() + (customDays || 3));
        break;
    }
    return targetDate.toISOString();
  };

  const saveRecurringEmail = async () => {
    const frequencyLabel = emailData.frequency === 'custom'
      ? `every ${emailData.custom_interval_days} days`
      : emailData.frequency;
    if (!confirm(`Set up recurring ${frequencyLabel} email to ${getRecipientCount()} recipients?`)) {
      return;
    }

    setSending(true);
    try {
      const nextRunAt = calculateNextRunAt(
        emailData.frequency || 'weekly',
        emailData.custom_interval_days,
        emailData.send_hour
      );

      const payload = {
        subject: emailData.subject,
        subject_mode: emailData.subject_mode,
        content_description: emailData.content_description,
        special_notes: emailData.special_notes,
        html_content: '',
        recipient_filter: emailData.recipient_filter,
        context_type: emailData.context_type,
        status: 'recurring',
        is_recurring: true,
        frequency: emailData.frequency,
        custom_interval_days: emailData.frequency === 'custom' ? emailData.custom_interval_days : null,
        send_hour: emailData.send_hour,
        next_run_at: nextRunAt,
        run_count: 0,
        created_by: user?.id
      };

      if (draftId) {
        const { error } = await supabase
          .from('marketing_emails')
          .update(payload)
          .eq('id', draftId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_emails')
          .insert(payload);
        if (error) throw error;
      }

      const sendHourLabel = HOUR_OPTIONS.find(h => h.value === emailData.send_hour)?.label || '9:00 AM';
      const daysMessage = emailData.frequency === 'custom'
        ? `in ${emailData.custom_interval_days} days`
        : emailData.frequency === 'daily'
          ? 'tomorrow'
          : `in ${emailData.frequency === 'weekly' ? '7' : emailData.frequency === 'biweekly' ? '14' : '30'} days`;

      alert(`Recurring email set up successfully! First email will be sent ${daysMessage} at ${sendHourLabel}.`);
      onClose();
    } catch (error) {
      console.error('Error saving recurring email:', error);
      alert('Failed to set up recurring email');
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async () => {
    if (!user?.email) return;

    try {
      let testSubject = emailData.subject;
      const testHtmlContent = emailData.html_content;

      if (emailData.subject_mode === 'dynamic') {
        const generateResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: emailData.subject,
              contentDescription: emailData.content_description,
              specialNotes: emailData.special_notes,
              generateDynamicSubject: true,
              subjectOnly: true
            }),
          }
        );

        if (generateResponse.ok) {
          const result = await generateResponse.json();
          testSubject = result.subject || 'AI Insights for Your Team';
        }
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-marketing-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientEmails: [user.email],
            subject: testSubject,
            htmlContent: testHtmlContent,
            isTestEmail: true,
            fromAddress: emailData.from_address,
            fromName: emailData.from_name,
            replyTo: emailData.reply_to || emailData.from_address
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send test email');
      alert('Test email sent to your inbox!');
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Failed to send test email');
    }
  };

  const resumeCampaign = async (campaignId: string): Promise<{ totalSent: number; totalFailed: number; remaining: number }> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resume-marketing-campaign`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketingEmailId: campaignId }),
      }
    );

    if (!response.ok) throw new Error('Failed to resume campaign');
    const result = await response.json();
    return {
      totalSent: result.total_sent || 0,
      totalFailed: result.total_failed || 0,
      remaining: result.remaining || 0
    };
  };

  const sendEmail = async () => {
    if (!confirm(`Send this email to ${getRecipientCount()} recipients?`)) {
      return;
    }

    setSending(true);
    try {
      let finalEmailId = emailId || draftId;

      if (!finalEmailId) {
        const { data, error } = await supabase
          .from('marketing_emails')
          .insert({
            subject: emailData.subject,
            content_description: emailData.content_description,
            special_notes: emailData.special_notes,
            html_content: emailData.html_content,
            recipient_filter: emailData.recipient_filter,
            scheduled_for: emailData.scheduled_for,
            status: scheduleType === 'scheduled' ? 'scheduled' : 'sending',
            from_address: emailData.from_address,
            from_name: emailData.from_name,
            reply_to: emailData.reply_to || null,
            created_by: user?.id
          })
          .select()
          .single();

        if (error) throw error;
        finalEmailId = data.id;
      } else {
        const { error } = await supabase
          .from('marketing_emails')
          .update({
            subject: emailData.subject,
            html_content: emailData.html_content,
            recipient_filter: emailData.recipient_filter,
            status: scheduleType === 'scheduled' ? 'scheduled' : 'sending',
            scheduled_for: emailData.scheduled_for,
            from_address: emailData.from_address,
            from_name: emailData.from_name,
            reply_to: emailData.reply_to || null
          })
          .eq('id', finalEmailId);

        if (error) throw error;
      }

      if (scheduleType === 'scheduled') {
        alert('Email scheduled successfully!');
        onClose();
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-marketing-email-campaign`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marketingEmailId: finalEmailId,
            recipientFilter: emailData.recipient_filter,
            fromAddress: emailData.from_address,
            fromName: emailData.from_name,
            replyTo: emailData.reply_to || emailData.from_address
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send email');

      let result = await response.json();
      let totalSent = result.successful_sends || 0;
      let totalFailed = result.failed_sends || 0;

      setSendProgress({ sent: totalSent, total: result.total_recipients || 0 });

      while (result.requires_resume && result.remaining > 0) {
        const resumeResult = await resumeCampaign(finalEmailId!);
        totalSent = resumeResult.totalSent;
        totalFailed = resumeResult.totalFailed;
        setSendProgress({ sent: totalSent, total: result.total_recipients || 0 });

        if (resumeResult.remaining === 0) break;
        result = { ...result, remaining: resumeResult.remaining, requires_resume: resumeResult.remaining > 0 };
      }

      alert(`Email campaign complete! ${totalSent} successful, ${totalFailed} failed.`);
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email campaign. You can resume from the email list.');
    } finally {
      setSending(false);
      setSendProgress({ sent: 0, total: 0 });
    }
  };

  const getRecipientCount = () => {
    const types = emailData.recipient_filter.types || [];
    let count = 0;

    if (types.includes('all_users')) {
      count += allUsers.length;
    }
    if (types.includes('filtered_users')) {
      count += filteredUsersCount;
    }
    if (types.includes('preview_requests')) {
      count += previewRequestCount;
    }
    if (types.includes('marketing_contacts')) {
      count += marketingContactsCount;
    }
    if (types.includes('moonshot_registrations')) {
      count += moonshotRegistrationCount;
    }
    if (types.includes('specific')) {
      count += selectedUserIds.length;
    }

    return count;
  };

  const canProceedFromStep1 = (emailData.subject_mode === 'dynamic' || emailData.subject) && emailData.content_description;
  const canProceedFromStep2 = emailData.html_content;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {emailId ? 'Edit Marketing Email' : activeTemplate ? 'Send Template Email' : 'Create Marketing Email'}
              </h2>
              {activeTemplate && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-sm text-orange-400">
                  <Rocket className="w-4 h-4" />
                  {activeTemplate.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all ${
                    s <= step ? 'bg-blue-500 w-16' : 'bg-slate-700 w-12'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-bold text-white mb-4">Email Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject Line
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setEmailData(prev => ({ ...prev, subject_mode: 'static' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          emailData.subject_mode === 'static'
                            ? 'bg-blue-600/30 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span className="font-medium">Entry</span>
                        <span className="text-xs opacity-70">(You set the subject)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailData(prev => ({ ...prev, subject_mode: 'dynamic' }))}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                          emailData.subject_mode === 'dynamic'
                            ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 border-cyan-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Dynamic</span>
                        <span className="text-xs opacity-70">(AI generates fresh subjects)</span>
                      </button>
                    </div>
                    {emailData.subject_mode === 'static' ? (
                      <>
                        <div className="relative">
                          <input
                            type="text"
                            value={emailData.subject}
                            onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            placeholder="e.g., 🚀 Exciting New Features Now Available!"
                            maxLength={150}
                            spellCheck={true}
                            autoComplete="off"
                            style={{ unicodeBidi: 'plaintext' }}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEmailData(prev => ({ ...prev, subject: prev.subject + '🚀' }))}
                              className="text-xl hover:scale-110 transition-transform"
                              title="Add rocket emoji"
                            >
                              🚀
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmailData(prev => ({ ...prev, subject: prev.subject + '✨' }))}
                              className="text-xl hover:scale-110 transition-transform"
                              title="Add sparkles emoji"
                            >
                              ✨
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmailData(prev => ({ ...prev, subject: prev.subject + '💡' }))}
                              className="text-xl hover:scale-110 transition-transform"
                              title="Add lightbulb emoji"
                            >
                              💡
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Tip: You can paste emojis directly or use the buttons above
                        </p>
                      </>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-700/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-cyan-200 font-medium">AI-Generated Subject</p>
                            <p className="text-sm text-gray-400 mt-1">
                              A fresh, engaging subject line will be generated each time based on your content description.
                              Great for recurring emails to keep subjects fresh and engaging.
                            </p>
                            <div className="mt-3">
                              <label className="block text-xs font-medium text-gray-400 mb-1">
                                Optional: Subject hints or keywords
                              </label>
                              <input
                                type="text"
                                value={emailData.subject}
                                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                placeholder="e.g., focus on urgency, mention AI features, include discount..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Content Description *
                    </label>
                    <textarea
                      value={emailData.content_description}
                      onChange={(e) => setEmailData(prev => ({ ...prev, content_description: e.target.value }))}
                      rows={6}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="Describe what this email should communicate to users..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Feature Context
                    </label>
                    <select
                      value={emailData.context_type}
                      onChange={(e) => setEmailData(prev => ({ ...prev, context_type: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="full">Full Context (All features & benefits)</option>
                      <option value="core">Core Features Only</option>
                      <option value="benefits">Benefits Focus</option>
                      <option value="useCases">Use Cases Focus</option>
                    </select>
                    <p className="text-sm text-gray-400 mt-2">
                      Choose how much product context to include. Full context provides the most detail about features.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Special Notes / Instructions
                    </label>
                    <textarea
                      value={emailData.special_notes}
                      onChange={(e) => setEmailData(prev => ({ ...prev, special_notes: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      placeholder="Any specific instructions for the AI (tone, key points, CTAs, etc.)..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Featured Image (Optional)
                    </label>
                    <p className="text-sm text-gray-400 mb-3">
                      Upload an image to feature prominently in the email (e.g., infographic, product screenshot, promotional graphic)
                    </p>

                    {emailData.featured_image_url ? (
                      <div className="relative">
                        <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
                          <img
                            src={emailData.featured_image_url}
                            alt="Featured image preview"
                            className="w-full max-h-64 object-contain bg-slate-900"
                          />
                          <div className="flex items-center justify-between p-3 border-t border-slate-700">
                            <span className="text-sm text-green-400 flex items-center gap-2">
                              <ImagePlus className="w-4 h-4" />
                              Image uploaded
                            </span>
                            <button
                              onClick={removeImage}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        {uploadingImage ? (
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-400">Uploading...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400 mb-1">Click to upload an image</p>
                            <p className="text-xs text-gray-500">PNG, JPEG, GIF, or WebP (max 5MB)</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Preview & Edit</h3>
                <button
                  onClick={() => setShowHtmlEditor(!showHtmlEditor)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {showHtmlEditor ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                  {showHtmlEditor ? 'Show Preview' : 'Edit HTML'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {showHtmlEditor ? (
                    <textarea
                      value={emailData.html_content}
                      onChange={(e) => setEmailData(prev => ({ ...prev, html_content: e.target.value }))}
                      className="w-full h-[600px] px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
                    />
                  ) : (
                    <div className="bg-white rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={emailData.html_content}
                        className="w-full h-[600px]"
                        title="Email Preview"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Regenerate Email</h4>
                    <textarea
                      value={regenerationComments}
                      onChange={(e) => setRegenerationComments(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none mb-3"
                      placeholder="Provide feedback to improve the email..."
                    />
                    <button
                      onClick={generateEmail}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>

                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Test Email</h4>
                    <button
                      onClick={sendTestEmail}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Send to Me
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-white">Select Recipients</h3>
              <p className="text-sm text-gray-400">Select one or more recipient groups. You can combine multiple groups.</p>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailData.recipient_filter.types.includes('all_users')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...emailData.recipient_filter.types, 'all_users']
                        : emailData.recipient_filter.types.filter(t => t !== 'all_users');
                      setEmailData(prev => ({
                        ...prev,
                        recipient_filter: { ...prev.recipient_filter, types }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white font-medium">All Users</div>
                    <div className="text-sm text-gray-400">Send to all {allUsers.length} registered users</div>
                  </div>
                </label>

                <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50 rounded-lg overflow-hidden">
                  <label className="flex items-center gap-3 p-4 cursor-pointer hover:from-cyan-900/40 hover:to-blue-900/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={emailData.recipient_filter.types.includes('filtered_users')}
                      onChange={(e) => {
                        const types = e.target.checked
                          ? [...emailData.recipient_filter.types.filter(t => t !== 'all_users'), 'filtered_users']
                          : emailData.recipient_filter.types.filter(t => t !== 'filtered_users');
                        setEmailData(prev => ({
                          ...prev,
                          recipient_filter: { ...prev.recipient_filter, types }
                        }));
                        if (e.target.checked) {
                          setShowFilterOptions(true);
                          loadFilteredUsers();
                        }
                      }}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium flex items-center gap-2">
                        <Filter className="w-4 h-4 text-cyan-400" />
                        Filtered Users
                        {getActiveFilterCount() > 0 && (
                          <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                            {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        {loadingFilteredCount ? 'Loading...' : `Send to ${filteredUsersCount} users matching your criteria`}
                      </div>
                    </div>
                    {emailData.recipient_filter.types.includes('filtered_users') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowFilterOptions(!showFilterOptions);
                        }}
                        className="p-2 hover:bg-slate-700 rounded transition-colors"
                      >
                        {showFilterOptions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </button>
                    )}
                  </label>

                  {emailData.recipient_filter.types.includes('filtered_users') && showFilterOptions && (
                    <div className="p-4 border-t border-cyan-700/30 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-cyan-300">Filter Criteria</span>
                        <button
                          onClick={resetFilters}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Reset all
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Launch Status</label>
                          <select
                            value={userFilters.launch_status}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, launch_status: e.target.value as UserFilters['launch_status'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All statuses</option>
                            <option value="launched">Launched</option>
                            <option value="onboarding">Onboarding (not launched)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Current Stage</label>
                          <select
                            value={userFilters.current_stage}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, current_stage: e.target.value as UserFilters['current_stage'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All stages</option>
                            <option value="fuel">Fuel (data setup)</option>
                            <option value="guidance">Guidance (team config)</option>
                            <option value="boosters">Boosters (features)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Drive Connected</label>
                          <select
                            value={userFilters.drive_connected}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, drive_connected: e.target.value as UserFilters['drive_connected'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All users</option>
                            <option value="connected">Has drive connected</option>
                            <option value="not_connected">No drive connected</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Activity Level</label>
                          <select
                            value={userFilters.activity_level}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, activity_level: e.target.value as UserFilters['activity_level'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All activity levels</option>
                            <option value="active_7d">Active (last 7 days)</option>
                            <option value="active_30d">Active (last 30 days)</option>
                            <option value="inactive_30d">Inactive (30+ days)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">User Role</label>
                          <select
                            value={userFilters.user_role}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, user_role: e.target.value as UserFilters['user_role'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All roles</option>
                            <option value="admin">Admins only</option>
                            <option value="member">Members only</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Account Age</label>
                          <select
                            value={userFilters.account_age}
                            onChange={(e) => setUserFilters(prev => ({ ...prev, account_age: e.target.value as UserFilters['account_age'] }))}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                          >
                            <option value="all">All accounts</option>
                            <option value="new_7d">New (last 7 days)</option>
                            <option value="new_30d">New (last 30 days)</option>
                            <option value="established">Established (30+ days)</option>
                          </select>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-4 mt-4">
                        <span className="text-xs text-gray-400 block mb-3">Feature Usage</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Visualizations</label>
                            <select
                              value={userFilters.has_visualizations === null ? 'any' : userFilters.has_visualizations ? 'yes' : 'no'}
                              onChange={(e) => setUserFilters(prev => ({
                                ...prev,
                                has_visualizations: e.target.value === 'any' ? null : e.target.value === 'yes'
                              }))}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                            >
                              <option value="any">Any</option>
                              <option value="yes">Has used</option>
                              <option value="no">Never used</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Scheduled Reports</label>
                            <select
                              value={userFilters.has_scheduled_reports === null ? 'any' : userFilters.has_scheduled_reports ? 'yes' : 'no'}
                              onChange={(e) => setUserFilters(prev => ({
                                ...prev,
                                has_scheduled_reports: e.target.value === 'any' ? null : e.target.value === 'yes'
                              }))}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                            >
                              <option value="any">Any</option>
                              <option value="yes">Has scheduled</option>
                              <option value="no">Never scheduled</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Chat Messages</label>
                            <select
                              value={userFilters.has_messages === null ? 'any' : userFilters.has_messages ? 'yes' : 'no'}
                              onChange={(e) => setUserFilters(prev => ({
                                ...prev,
                                has_messages: e.target.value === 'any' ? null : e.target.value === 'yes'
                              }))}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:border-cyan-500 outline-none"
                            >
                              <option value="any">Any</option>
                              <option value="yes">Has sent messages</option>
                              <option value="no">Never sent messages</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded p-3 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">
                            {loadingFilteredCount ? (
                              <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              <span className="font-medium text-cyan-300">{filteredUsersCount} users match your criteria</span>
                            )}
                          </span>
                          <button
                            onClick={loadFilteredUsers}
                            disabled={loadingFilteredCount}
                            className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingFilteredCount ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailData.recipient_filter.types.includes('preview_requests')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...emailData.recipient_filter.types, 'preview_requests']
                        : emailData.recipient_filter.types.filter(t => t !== 'preview_requests');
                      setEmailData(prev => ({
                        ...prev,
                        recipient_filter: { ...prev.recipient_filter, types }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-white font-medium">Preview Requests (Not Yet Signed Up)</div>
                    <div className="text-sm text-gray-400">Send to {previewRequestCount} users who requested preview access but haven't created accounts yet</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-lg cursor-pointer hover:from-amber-900/40 hover:to-orange-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailData.recipient_filter.types.includes('marketing_contacts')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...emailData.recipient_filter.types, 'marketing_contacts']
                        : emailData.recipient_filter.types.filter(t => t !== 'marketing_contacts');
                      setEmailData(prev => ({
                        ...prev,
                        recipient_filter: { ...prev.recipient_filter, types }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <div className="text-white font-medium">Marketing Contacts</div>
                    <div className="text-sm text-gray-400">Send to {marketingContactsCount} contacts (excludes users already in the system and unsubscribed contacts)</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-700/50 rounded-lg cursor-pointer hover:from-yellow-900/40 hover:to-amber-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailData.recipient_filter.types.includes('moonshot_registrations')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...emailData.recipient_filter.types, 'moonshot_registrations']
                        : emailData.recipient_filter.types.filter(t => t !== 'moonshot_registrations');
                      setEmailData(prev => ({
                        ...prev,
                        recipient_filter: { ...prev.recipient_filter, types }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-yellow-500 focus:ring-yellow-500"
                  />
                  <div>
                    <div className="text-white font-medium flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-yellow-400" />
                      Moonshot Challenge Registrations
                    </div>
                    <div className="text-sm text-gray-400">Send to {moonshotRegistrationCount} registrations who haven't created accounts yet</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailData.recipient_filter.types.includes('specific')}
                    onChange={(e) => {
                      const types = e.target.checked
                        ? [...emailData.recipient_filter.types, 'specific']
                        : emailData.recipient_filter.types.filter(t => t !== 'specific');
                      setEmailData(prev => ({
                        ...prev,
                        recipient_filter: { ...prev.recipient_filter, types, emails: [] }
                      }));
                    }}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">Specific Users</div>
                    <div className="text-sm text-gray-400">Choose specific recipients from registered users</div>
                  </div>
                </label>

                {emailData.recipient_filter.types.includes('specific') && (
                  <div className="ml-7 mt-3 max-h-64 overflow-y-auto bg-slate-900 rounded-lg p-4 space-y-2">
                    {allUsers.map(user => (
                      <label key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(prev => [...prev, user.id]);
                            } else {
                              setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <div className="text-white text-sm">{user.name || user.email}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-300 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="font-medium">{getRecipientCount()} recipients selected</span>
                  {emailData.recipient_filter.types.length > 1 && (
                    <span className="text-sm text-gray-400 ml-2">
                      (from {emailData.recipient_filter.types.length} groups)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-white">Schedule & Send</h3>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    checked={scheduleType === 'immediate'}
                    onChange={() => setScheduleType('immediate')}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-white font-medium">Send Immediately</div>
                    <div className="text-sm text-gray-400">Send to all recipients right away</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                  <input
                    type="radio"
                    checked={scheduleType === 'scheduled'}
                    onChange={() => setScheduleType('scheduled')}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">Schedule for Later</div>
                    <div className="text-sm text-gray-400">Choose a specific date and time</div>
                  </div>
                </label>

                {scheduleType === 'scheduled' && (
                  <div className="ml-7 mt-3">
                    <input
                      type="datetime-local"
                      value={emailData.scheduled_for || ''}
                      onChange={(e) => setEmailData(prev => ({
                        ...prev,
                        scheduled_for: e.target.value
                      }))}
                      className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/50 rounded-lg cursor-pointer hover:from-blue-900/60 hover:to-cyan-900/60 transition-colors">
                  <input
                    type="radio"
                    checked={scheduleType === 'recurring'}
                    onChange={() => setScheduleType('recurring')}
                    className="w-4 h-4"
                  />
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">Recurring Email</div>
                    <div className="text-sm text-gray-400">Generate fresh content and send automatically on a schedule</div>
                  </div>
                </label>

                {scheduleType === 'recurring' && (
                  <div className="ml-7 mt-3 space-y-4">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Send Frequency
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {FREQUENCY_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className={`flex flex-col p-3 rounded-lg cursor-pointer transition-all ${
                              emailData.frequency === option.value
                                ? 'bg-blue-600/30 border-2 border-blue-500'
                                : 'bg-slate-800 border-2 border-transparent hover:bg-slate-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="frequency"
                              value={option.value}
                              checked={emailData.frequency === option.value}
                              onChange={(e) => setEmailData(prev => ({
                                ...prev,
                                frequency: e.target.value as any
                              }))}
                              className="sr-only"
                            />
                            <span className="text-white font-medium">{option.label}</span>
                            <span className="text-xs text-gray-400">{option.description}</span>
                          </label>
                        ))}
                      </div>

                      {emailData.frequency === 'custom' && (
                        <div className="mt-4 flex items-center gap-3">
                          <label className="text-sm text-gray-300">Send every</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={emailData.custom_interval_days || 3}
                            onChange={(e) => setEmailData(prev => ({
                              ...prev,
                              custom_interval_days: Math.max(1, Math.min(365, parseInt(e.target.value) || 1))
                            }))}
                            className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
                          />
                          <label className="text-sm text-gray-300">days</label>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Send Time
                      </label>
                      <select
                        value={emailData.send_hour ?? 9}
                        onChange={(e) => setEmailData(prev => ({
                          ...prev,
                          send_hour: parseInt(e.target.value)
                        }))}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        Emails will be sent at this time (Eastern Time) on the scheduled day
                      </p>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-200 font-medium">How Recurring Emails Work</p>
                          <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
                            <li>Fresh email content is generated each time using AI</li>
                            <li>Your content description serves as the template</li>
                            <li>Emails are sent at your chosen time on the scheduled day</li>
                            <li>You can pause or edit the recurring email anytime</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Mail className="w-4 h-4 text-blue-400" />
                  Sender Email
                </div>
                <select
                  value={selectedSenderId}
                  onChange={(e) => handleSenderChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {SENDER_OPTIONS.map(sender => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name} &lt;{sender.address}&gt;
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-400">
                  {SENDER_OPTIONS.find(s => s.id === selectedSenderId)?.description}
                </div>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 space-y-3">
                <h4 className="font-semibold text-white">Campaign Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Subject:</span>
                    <span className="text-white font-medium">
                      {emailData.subject_mode === 'dynamic' ? (
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          AI-Generated
                          {emailData.subject && <span className="text-gray-500 text-xs ml-1">(hints: {emailData.subject})</span>}
                        </span>
                      ) : emailData.subject}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white font-medium">
                      {emailData.from_name} &lt;{emailData.from_address}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recipients:</span>
                    <span className="text-white font-medium">{getRecipientCount()} users</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Send Type:</span>
                    <span className="text-white font-medium">
                      {scheduleType === 'immediate' ? 'Immediately' : scheduleType === 'scheduled' ? 'Scheduled' : `Recurring (${emailData.frequency === 'custom' ? `every ${emailData.custom_interval_days} days` : emailData.frequency})`}
                    </span>
                  </div>
                  {scheduleType === 'recurring' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">First Send:</span>
                      <span className="text-white font-medium">
                        {new Date(calculateNextRunAt(emailData.frequency || 'weekly', emailData.custom_interval_days, emailData.send_hour)).toLocaleDateString()} at {HOUR_OPTIONS.find(h => h.value === emailData.send_hour)?.label || '9:00 AM'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedFromStep1}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  Set Up as Recurring
                </button>
                <button
                  onClick={generateEmail}
                  disabled={!canProceedFromStep1 || generating}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  {generating ? 'Generating...' : 'Generate Preview'}
                </button>
              </>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedFromStep2}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={getRecipientCount() === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={scheduleType === 'recurring' ? saveRecurringEmail : sendEmail}
                disabled={sending}
                className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  scheduleType === 'recurring'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                    : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600'
                }`}
              >
                {scheduleType === 'recurring' ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    {sending ? 'Setting Up...' : 'Set Up Recurring Email'}
                  </>
                ) : scheduleType === 'scheduled' ? (
                  <>
                    <Clock className="w-5 h-5" />
                    {sending ? 'Scheduling...' : 'Schedule Email'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {sending ? 'Sending...' : 'Send Email'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
