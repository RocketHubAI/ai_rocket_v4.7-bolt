import { useState } from 'react';
import { MessageSquare, Send, Sparkles, Fuel } from 'lucide-react';

interface FeedbackQuestion {
  id: string;
  question_text: string;
  category: string;
}

interface FeedbackModalProps {
  questions: FeedbackQuestion[];
  onSubmit: (answers: FeedbackAnswer[], generalFeedback?: string) => Promise<void>;
  onSkip: () => Promise<void>;
  pointsReward?: number;
}

interface FeedbackAnswer {
  question_id: string;
  rating: number | null;
  comment: string;
}

export function FeedbackModal({ questions, onSubmit, onSkip, pointsReward = 30 }: FeedbackModalProps) {
  const [answers, setAnswers] = useState<FeedbackAnswer[]>(
    questions.map(q => ({ question_id: q.id, rating: null, comment: '' }))
  );
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState('');

  const updateRating = (questionId: string, rating: number) => {
    setAnswers(prev =>
      prev.map(a => (a.question_id === questionId ? { ...a, rating } : a))
    );
    setError('');
  };

  const updateComment = (questionId: string, comment: string) => {
    setAnswers(prev =>
      prev.map(a => (a.question_id === questionId ? { ...a, comment } : a))
    );
  };

  const allRatingsComplete = answers.every(a => a.rating !== null);

  const handleSubmit = async () => {
    if (!allRatingsComplete) {
      setError('Please provide a rating for all questions');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(answers, generalFeedback);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await onSkip();
    } catch (err: any) {
      setError(err.message || 'Failed to skip feedback. Please try again.');
      setIsSkipping(false);
    }
  };

  const completedCount = answers.filter(a => a.rating !== null).length;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-orange-500 via-green-500 to-blue-500 p-1 rounded-2xl shadow-2xl max-w-2xl w-full animate-in fade-in duration-300">
        <div className="bg-gray-900 rounded-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                Help Us Make Astra Better
              </h2>
              <p className="text-sm text-gray-400">
                Your feedback shapes the future of AI-powered insights
              </p>
            </div>
            <button
              onClick={handleSkip}
              disabled={isSkipping || isSubmitting}
              className="flex-shrink-0 px-3 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip for Now
            </button>
          </div>

          <div className="mb-6 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">
                  Earn {pointsReward} Fuel Points!
                </p>
                <p className="text-sm text-orange-200/80">
                  Complete this survey to fuel your launch preparation
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Progress</span>
              <span className="text-gray-300 font-medium">
                {completedCount} of {questions.length} questions
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-8">
            {questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              if (!answer) return null;

              return (
                <div
                  key={question.id}
                  className="bg-gray-800 rounded-lg p-5 border border-gray-700"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium leading-relaxed">
                        {question.question_text}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Rate on a scale of 1-10 (10 being the best)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-10 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                      <button
                        key={rating}
                        onClick={() => updateRating(question.id, rating)}
                        className={`
                          h-12 rounded-lg font-semibold text-sm transition-all
                          ${
                            answer.rating === rating
                              ? 'bg-gradient-to-br from-orange-500 to-blue-500 text-white scale-110 shadow-lg'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
                          }
                        `}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Additional comments (optional)
                    </label>
                    <textarea
                      value={answer.comment}
                      onChange={(e) => updateComment(question.id, e.target.value)}
                      placeholder="Share any thoughts, suggestions, or issues..."
                      maxLength={2000}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                      rows={3}
                    />
                    {answer.comment && (
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {answer.comment.length} / 2000
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Final open-ended feedback */}
          <div className="mt-8 bg-gray-800 rounded-lg p-5 border border-gray-700">
            <div className="mb-4">
              <p className="text-white font-medium leading-relaxed mb-1">
                What is the one suggestion, issue, or feature request you have for Astra AI today?
              </p>
              <p className="text-xs text-gray-500">
                Optional - This helps us prioritize what matters most to you
              </p>
            </div>
            <textarea
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              placeholder="Share your most important feedback, idea, or concern..."
              maxLength={2000}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
              rows={4}
            />
            {generalFeedback && (
              <p className="text-xs text-gray-500 mt-1 text-right">
                {generalFeedback.length} / 2000
              </p>
            )}
          </div>

          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={!allRatingsComplete || isSubmitting}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-500 text-white font-semibold py-4 px-6 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
            {!allRatingsComplete && (
              <p className="text-xs text-gray-400 text-center mt-3">
                Please rate all questions to continue
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            Your feedback is collected weekly to help us continuously improve Astra AI
          </p>
        </div>
      </div>
    </div>
  );
}
