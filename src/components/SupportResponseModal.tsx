import { useState, useEffect } from 'react';
import { X, Send, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupportMessage {
  id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  support_type: string;
  support_details: {
    subject?: string;
    description?: string;
    url_context?: string;
  };
  attachment_urls: string[];
  status?: 'needs_response' | 'responded';
  admin_response?: string;
  responded_at?: string;
  internal_notes?: string;
  not_resolved?: boolean;
}

interface SupportResponseModalProps {
  message: SupportMessage;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupportResponseModal({ message, onClose, onSuccess }: SupportResponseModalProps) {
  const [responseMessage, setResponseMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState(message.internal_notes || '');
  const [notResolved, setNotResolved] = useState(message.not_resolved || false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when message changes (e.g., when reopening modal with updated data)
  useEffect(() => {
    setInternalNotes(message.internal_notes || '');
    setNotResolved(message.not_resolved || false);
  }, [message.internal_notes, message.not_resolved]);

  const handleSend = async () => {
    if (!responseMessage.trim()) {
      setError('Please enter a response message');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-response`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId: message.id,
            responseMessage: responseMessage.trim(),
            notResolved,
            internalNotes: internalNotes.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send response');
      }

      if (result.warning) {
        console.warn('Response saved with warning:', result.warning);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error sending response:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !sending) {
      onClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !sending) {
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 md:p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Respond to {message.user_name}</h2>
            <p className="text-sm text-gray-400 mt-1">{message.user_email}</p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Original Message */}
          <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Original Message
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">From:</span>
                <span className="ml-2 text-white font-medium">{message.user_name}</span>
                <span className="ml-2 text-gray-400">({message.user_email})</span>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  message.support_type === 'bug_report' ? 'bg-red-500/20 text-red-400' :
                  message.support_type === 'feature_request' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {message.support_type?.replace(/_/g, ' ')}
                </span>
              </div>
              {message.support_details?.subject && (
                <div>
                  <span className="text-gray-400">Subject:</span>
                  <span className="ml-2 text-white">{message.support_details.subject}</span>
                </div>
              )}
              {message.support_details?.description && (
                <div>
                  <span className="text-gray-400 block mb-1">Description:</span>
                  <div className="ml-2 text-gray-300 whitespace-pre-wrap bg-gray-800/50 p-2 rounded">
                    {message.support_details.description}
                  </div>
                </div>
              )}
              {message.support_details?.url_context && (
                <div>
                  <span className="text-gray-400">Page:</span>
                  <span className="ml-2 text-gray-300 text-xs font-mono">{message.support_details.url_context}</span>
                </div>
              )}
              {message.attachment_urls.length > 0 && (
                <div>
                  <span className="text-gray-400 block mb-1">Attachments:</span>
                  <div className="ml-2 space-y-1">
                    {message.attachment_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs block"
                      >
                        Attachment {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Previous Response (if exists) */}
          {message.admin_response && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Previous Response</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{message.admin_response}</p>
              {message.responded_at && (
                <p className="text-xs text-gray-400 mt-2">
                  Sent {new Date(message.responded_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Response Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Response <span className="text-red-400">*</span>
            </label>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Type your response here... This will be sent to the user via email."
              disabled={sending}
              className="w-full h-40 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Press Ctrl+Enter to send quickly
            </p>
          </div>

          {/* Not Resolved Checkbox */}
          <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notResolved}
                onChange={(e) => setNotResolved(e.target.checked)}
                disabled={sending}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-900 text-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-0 disabled:opacity-50"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-300 block">
                  Mark as "Not Resolved"
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Check this if the issue requires additional attention or follow-up after your response. The message will be tagged as "Not Resolved" alongside the "Responded" status.
                </p>
              </div>
            </label>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Internal Notes (Optional)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add private notes visible only to admins..."
              disabled={sending}
              className="w-full h-24 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              These notes are private and will not be sent to the user
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
            <button
              onClick={handleSend}
              disabled={sending || !responseMessage.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Response
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={sending}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
