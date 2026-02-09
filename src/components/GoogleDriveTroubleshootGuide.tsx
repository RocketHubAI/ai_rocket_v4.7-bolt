import React, { useState } from 'react';
import { AlertTriangle, Mail, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GoogleDriveTroubleshootGuideProps {
  compact?: boolean;
}

export function GoogleDriveTroubleshootGuide({ compact = false }: GoogleDriveTroubleshootGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOpenModal = () => {
    setSubject('Google Drive Connection Issue');
    setDescription('');
    setIsModalOpen(true);
    setError(null);
    setSuccess(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubject('');
    setDescription('');
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supportType: 'support_message',
            subject: subject.trim(),
            description: description.trim(),
            attachmentUrls: [],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit support request');
      }

      setSuccess(true);
      setTimeout(() => {
        handleCloseModal();
      }, 2000);
    } catch (err) {
      console.error('Error submitting support request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (compact) {
    return (
      <>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-yellow-200 font-medium mb-1">
                Having trouble connecting?
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-yellow-300 hover:text-yellow-200 underline"
              >
                {isExpanded ? 'Hide troubleshooting guide' : 'View troubleshooting guide'}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-2">
              <p className="text-xs text-yellow-200/90">
                <strong>Common connection issues:</strong>
              </p>
              <ol className="text-xs text-yellow-200/80 space-y-2 ml-4 list-decimal">
                <li>
                  <strong>Browser blocked the popup:</strong> Make sure your browser allows popups for this site.
                </li>
                <li>
                  <strong>Wrong Google account:</strong> If you have multiple Google accounts, make sure you select the correct one.
                </li>
                <li>
                  <strong>Permissions not granted:</strong> You need to allow all requested permissions for Astra to access your Drive.
                </li>
                <li>
                  <strong>Using a different email:</strong> The email for Google Drive connection doesn't need to match your RocketHub account email.
                </li>
              </ol>
              <div className="pt-2">
                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center gap-2 text-xs text-yellow-300 hover:text-yellow-200 font-medium"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Contact Support for Help
                </button>
                <p className="text-xs text-yellow-200/70 mt-1">
                  If your connection fails, contact us and we'll help you get set up.
                </p>
              </div>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-[#1a1a2e] rounded-lg shadow-xl w-full max-w-lg border border-white/10">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">
                    Contact Support
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-sm">
                      Your message has been sent! We'll respond within 24 hours.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-white/80 mb-2">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary..."
                    className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    disabled={isSubmitting || success}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                    Message
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please include:&#10;- The email address you're trying to connect with&#10;- Any error messages you're seeing"
                    rows={8}
                    className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    disabled={isSubmitting || success}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                    disabled={isSubmitting || success}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || success || !subject.trim() || !description.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-yellow-200 mb-2">
              Troubleshooting Google Drive Connection
            </h3>
            <p className="text-sm text-yellow-200/90 mb-3">
              If you're having trouble connecting your Google Drive, here are some common solutions:
            </p>
            <div className="space-y-3">
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-white">Common Issues:</p>
                <ol className="text-xs text-gray-300 space-y-2 ml-4 list-decimal">
                  <li>
                    <strong className="text-white">Browser blocked the popup:</strong> Make sure your browser allows popups for this site, or try a different browser.
                  </li>
                  <li>
                    <strong className="text-white">Wrong Google account:</strong> If you have multiple Google accounts, ensure you're selecting the correct one during sign-in.
                  </li>
                  <li>
                    <strong className="text-white">Permissions not granted:</strong> You need to allow all requested permissions for Astra to access your Drive folders.
                  </li>
                  <li>
                    <strong className="text-white">Connection interrupted:</strong> If the connection process was interrupted, try again from the beginning.
                  </li>
                </ol>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-200 mb-1">
                  Using a Different Email
                </p>
                <p className="text-xs text-blue-100/80">
                  The email for Google Drive connection doesn't need to match your RocketHub account email. You can use any Google account for the connection.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-yellow-500/20">
              <p className="text-sm font-medium text-yellow-200 mb-2">
                Still Having Issues?
              </p>
              <p className="text-xs text-yellow-200/80 mb-3">
                If your connection attempt fails, contact our support team and we'll help you get set up.
              </p>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1a1a2e] rounded-lg shadow-xl w-full max-w-lg border border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">
                  Contact Support
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">
                    Your message has been sent! We'll respond within 24 hours.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-white/80 mb-2">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary..."
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isSubmitting || success}
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                  Message
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please include:&#10;- The email address you're trying to connect with&#10;- Any error messages you're seeing"
                  rows={8}
                  className="w-full px-4 py-2 bg-[#0f0f1e] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  disabled={isSubmitting || success}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                  disabled={isSubmitting || success}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || success || !subject.trim() || !description.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 via-green-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
