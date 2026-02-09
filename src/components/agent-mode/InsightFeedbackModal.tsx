import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, MessageSquare, Brain } from 'lucide-react';

interface InsightFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { wasHelpful: boolean | null; message: string }) => void;
  agentName: string;
  messagePreview: string;
}

export default function InsightFeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  agentName,
  messagePreview,
}: InsightFeedbackModalProps) {
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit({ wasHelpful, message: feedbackText });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setWasHelpful(null);
      setFeedbackText('');
      onClose();
    }, 1500);
  };

  const truncatedPreview = messagePreview.length > 150
    ? messagePreview.slice(0, 150) + '...'
    : messagePreview;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Feedback Received</h3>
            <p className="text-gray-400 text-sm">
              {agentName} will use this to improve future insights and recommendations.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="text-white font-semibold">Share Feedback</h3>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-gray-500 mb-1">{agentName}'s message:</p>
                <p className="text-sm text-gray-300 leading-relaxed">{truncatedPreview}</p>
              </div>

              <div>
                <p className="text-sm text-gray-300 mb-3">Was this helpful?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setWasHelpful(true)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      wasHelpful === true
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful
                  </button>
                  <button
                    onClick={() => setWasHelpful(false)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      wasHelpful === false
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Not Helpful
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">
                  Suggestions or areas to focus on
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="e.g., More insights on customer calls, focus on sales metrics..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500/50 transition-colors"
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2 bg-gray-800/30 rounded-lg p-3">
                <Brain className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  {agentName} learns from your feedback to deliver more relevant insights and better recommendations over time.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={wasHelpful === null && !feedbackText.trim()}
                className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm text-white font-medium transition-all"
              >
                Submit Feedback
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
