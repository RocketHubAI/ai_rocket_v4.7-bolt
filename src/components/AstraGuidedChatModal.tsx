import React, { useEffect } from 'react';
import { X, Target, Sparkles, Send, FileText, Calendar, DollarSign, Mail, Loader2, AlertCircle, RefreshCw, Folder, Users, ShoppingCart, Briefcase, Scale, Globe, BookOpen, BarChart, Settings, HelpCircle, Package } from 'lucide-react';
import { useGuidedChat } from '../hooks/useGuidedChat';
import { SupportMenu } from './SupportMenu';
import { getCategoryLabel } from '../lib/guided-chat-assistant';

interface AstraGuidedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
  teamId: string;
  onOpenHelpCenter?: (tab?: 'faq' | 'ask-astra') => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.FC<{ className?: string }>, color: string }> = {
  strategy: { icon: FileText, color: 'text-blue-400' },
  meetings: { icon: Calendar, color: 'text-green-400' },
  financial: { icon: DollarSign, color: 'text-yellow-400' },
  sales: { icon: ShoppingCart, color: 'text-orange-400' },
  marketing: { icon: BarChart, color: 'text-pink-400' },
  product: { icon: Package, color: 'text-cyan-400' },
  people: { icon: Users, color: 'text-teal-400' },
  operations: { icon: Settings, color: 'text-gray-400' },
  customer: { icon: HelpCircle, color: 'text-emerald-400' },
  legal: { icon: Scale, color: 'text-red-400' },
  industry: { icon: Globe, color: 'text-slate-400' },
  reference: { icon: BookOpen, color: 'text-amber-400' },
  other: { icon: Folder, color: 'text-gray-400' }
};

export const AstraGuidedChatModal: React.FC<AstraGuidedChatModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  teamId,
  onOpenHelpCenter
}) => {
  const {
    state,
    prompts,
    dataSnapshot,
    generationNumber,
    error,
    loadExistingPrompts,
    generateNewPrompts,
    reset
  } = useGuidedChat(teamId);

  useEffect(() => {
    if (isOpen) {
      loadExistingPrompts().then(() => {
        if (state === 'idle') {
          generateNewPrompts();
        }
      });
    } else {
      reset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPrompt = (prompt: string) => {
    onSelectPrompt(prompt);
    onClose();
  };

  const handleGenerateMore = () => {
    generateNewPrompts();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Agent Guided Chat
                <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              </h2>
              <p className="text-sm text-gray-300">Prompts tailored to your data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SupportMenu onOpenHelpCenter={onOpenHelpCenter} />
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {state === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">Analyzing your data...</h3>
              <div className="space-y-3 max-w-md mx-auto">
                <div className="flex items-center justify-between text-gray-300 bg-gray-700/50 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Scanning documents</span>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-2 w-16 bg-blue-400/30 rounded"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-gray-300 bg-gray-700/50 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-green-400" />
                    <span className="text-sm">Identifying categories</span>
                  </div>
                  <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>
                    <div className="h-2 w-16 bg-green-400/30 rounded"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-gray-300 bg-gray-700/50 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">Building context</span>
                  </div>
                  <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>
                    <div className="h-2 w-16 bg-yellow-400/30 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === 'generating' && dataSnapshot && (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 text-purple-400 animate-pulse mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-4">Generating personalized prompts...</h3>
              <div className="space-y-2 max-w-md mx-auto text-sm text-gray-300 bg-gray-700/50 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-600 pb-2 mb-2">
                  <span>{dataSnapshot.totalDocuments} documents across {dataSnapshot.categoryCount} categories</span>
                </div>
                {dataSnapshot.categories.slice(0, 6).map((cat) => {
                  const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.other;
                  const IconComponent = config.icon;
                  return (
                    <div key={cat.category} className="flex items-center gap-2">
                      <IconComponent className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                      <span>{cat.count} {getCategoryLabel(cat.category)} Document{cat.count !== 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
                {dataSnapshot.categories.length > 6 && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Folder className="w-4 h-4 flex-shrink-0" />
                    <span>+{dataSnapshot.categories.length - 6} more categories</span>
                  </div>
                )}
                {dataSnapshot.hasEmails && (
                  <div className="flex items-center gap-2 border-t border-gray-600 pt-2 mt-2">
                    <Mail className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span>{dataSnapshot.emailThreadCount} email thread{dataSnapshot.emailThreadCount !== 1 ? 's' : ''} indexed</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Unable to Generate Prompts</h3>
              <p className="text-gray-300 mb-6 max-w-md mx-auto">{error}</p>
              <button
                onClick={handleGenerateMore}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {state === 'ready' && prompts && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-semibold mb-1">
                      {generationNumber === 1 ? 'Here are 3 prompts designed for you:' : `Set ${generationNumber}: 3 new prompts for you:`}
                    </h3>
                    <p className="text-sm text-gray-300">
                      Click any prompt to start a conversation in Agent Chat. You can generate more anytime!
                    </p>
                  </div>
                </div>
              </div>

              {prompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectPrompt(prompt.prompt)}
                  className="w-full text-left p-4 rounded-lg border bg-gray-700/50 hover:bg-gray-700 border-gray-600 hover:border-blue-500 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 font-bold text-white">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {prompt.title}
                        </h3>
                      </div>
                    </div>
                    <Send className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2 mt-1" />
                  </div>
                  <p className="text-sm text-gray-300 mb-2 italic line-clamp-3 ml-10">
                    "{prompt.prompt}"
                  </p>
                  <div className="flex items-start gap-2 ml-10">
                    <Sparkles className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">
                      {prompt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {state === 'ready' && (
          <div className="border-t border-gray-700 p-4 bg-gray-800/50 flex justify-between items-center flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleGenerateMore}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-xl min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Generate 3 More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
