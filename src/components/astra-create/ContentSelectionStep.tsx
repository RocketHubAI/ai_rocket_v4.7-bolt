import { useState, useEffect, useCallback } from 'react';
import { Check, MessageSquare, LayoutGrid, PenLine, Info, AlertCircle, Database, X, Search, FileText, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CONTENT_TYPES, CONTENT_CATEGORIES, CONTENT_TYPE_DATA_REQUIREMENTS } from './ContentTypes';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export interface DataAvailability {
  byCategory: Record<string, number>;
  total: number;
}

export interface SelectedDocument {
  id: string;
  name: string;
  category: string;
}

interface ContentSelectionStepProps {
  selectedTypes: string[];
  onToggle: (contentId: string) => void;
  maxSelections: number;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  dataAvailability?: DataAvailability;
  selectedDocuments?: SelectedDocument[];
  onSelectedDocumentsChange?: (docs: SelectedDocument[]) => void;
  useTeamData?: boolean;
  onUseTeamDataChange?: (enabled: boolean) => void;
}

export function ContentSelectionStep({
  selectedTypes,
  onToggle,
  maxSelections,
  customPrompt,
  onCustomPromptChange,
  dataAvailability,
  selectedDocuments = [],
  onSelectedDocumentsChange,
  useTeamData = true,
  onUseTeamDataChange
}: ContentSelectionStepProps) {
  const { user } = useAuth();
  const [activeMode, setActiveMode] = useState<'presets' | 'custom'>(selectedTypes.includes('custom') ? 'custom' : 'presets');
  const [infoTooltip, setInfoTooltip] = useState<string | null>(null);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<SelectedDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');
  const [showTeamDataTooltip, setShowTeamDataTooltip] = useState(false);

  const MAX_DOCUMENT_SELECTIONS = 3;

  const fetchDocuments = useCallback(async () => {
    const teamId = user?.user_metadata?.team_id;
    if (!teamId) return;

    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase.rpc('get_team_documents_list', {
        p_team_id: teamId
      });

      if (error) throw error;

      const docs: SelectedDocument[] = (data || []).map((d: { google_file_id: string; file_name: string; category: string }) => ({
        id: d.google_file_id,
        name: d.file_name,
        category: d.category || 'other'
      }));

      setAvailableDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingDocuments(false);
    }
  }, [user]);

  useEffect(() => {
    if (showDocumentPicker && availableDocuments.length === 0) {
      fetchDocuments();
    }
  }, [showDocumentPicker, availableDocuments.length, fetchDocuments]);

  const handleDocumentToggle = (doc: SelectedDocument) => {
    if (!onSelectedDocumentsChange) return;

    const isSelected = selectedDocuments.some(d => d.id === doc.id);
    if (isSelected) {
      onSelectedDocumentsChange(selectedDocuments.filter(d => d.id !== doc.id));
    } else if (selectedDocuments.length < MAX_DOCUMENT_SELECTIONS) {
      onSelectedDocumentsChange([...selectedDocuments, doc]);
    }
  };

  const filteredDocuments = availableDocuments.filter(doc =>
    doc.name.toLowerCase().includes(documentSearch.toLowerCase()) ||
    doc.category.toLowerCase().includes(documentSearch.toLowerCase())
  );

  const checkDataAvailability = (contentTypeId: string): { available: boolean; reason: string } => {
    if (!dataAvailability) return { available: true, reason: '' };

    const requirements = CONTENT_TYPE_DATA_REQUIREMENTS[contentTypeId];
    if (!requirements) return { available: true, reason: '' };

    if (requirements.categories.length === 0) {
      if (requirements.minDocs > 0 && dataAvailability.total < requirements.minDocs) {
        return { available: false, reason: requirements.reason };
      }
      return { available: true, reason: '' };
    }

    const hasRequiredCategory = requirements.categories.some(cat =>
      (dataAvailability.byCategory[cat] || 0) >= 1
    );

    const totalInCategories = requirements.categories.reduce(
      (sum, cat) => sum + (dataAvailability.byCategory[cat] || 0),
      0
    );

    if (!hasRequiredCategory || totalInCategories < requirements.minDocs) {
      return { available: false, reason: requirements.reason };
    }

    return { available: true, reason: '' };
  };

  const handleModeChange = (mode: 'presets' | 'custom') => {
    if (mode === 'custom') {
      if (!selectedTypes.includes('custom')) {
        onToggle('custom');
      }
    } else {
      if (selectedTypes.includes('custom')) {
        onToggle('custom');
      }
    }
    setActiveMode(mode);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'overview': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'foundation': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'progress': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'marketing': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      case 'analysis': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'custom': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const presetCategories = CONTENT_CATEGORIES.filter(c => c.id !== 'custom');
  const groupedContent = presetCategories.map(cat => ({
    ...cat,
    items: CONTENT_TYPES.filter(ct => ct.category === cat.id)
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => handleModeChange('presets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMode === 'presets'
                ? 'bg-cyan-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Presets
          </button>
          <button
            onClick={() => handleModeChange('custom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeMode === 'custom'
                ? 'bg-rose-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <PenLine className="w-4 h-4" />
            Custom
          </button>
        </div>
        {activeMode === 'presets' ? (
          <span className={`text-sm font-medium ${
            selectedTypes.length === maxSelections ? 'text-amber-400' : 'text-cyan-400'
          }`}>
            Select up to {maxSelections}
          </span>
        ) : (
          <div className="relative">
            <button
              onClick={() => {
                if (onUseTeamDataChange) {
                  onUseTeamDataChange(!useTeamData);
                }
              }}
              onMouseEnter={() => setShowTeamDataTooltip(true)}
              onMouseLeave={() => setShowTeamDataTooltip(false)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                useTeamData
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
                  : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              {useTeamData ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>Team Data</span>
            </button>
            {showTeamDataTooltip && (
              <div className="absolute z-20 right-0 top-full mt-2 w-72 p-3 bg-gray-800 border border-cyan-500/30 rounded-lg shadow-xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-cyan-400 font-medium mb-1">Team Data</p>
                    <p className="text-xs text-gray-400">
                      {useTeamData
                        ? 'Astra will use your team\'s documents, goals, strategy, and context to enrich the visualization. This provides more relevant and personalized content.'
                        : 'Astra will only use the custom prompt you provide. No team data, documents, or context will be included in the generation.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {activeMode === 'presets' && (
        <>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
              style={{ width: `${(selectedTypes.filter(t => t !== 'custom').length / maxSelections) * 100}%` }}
            />
          </div>

          {groupedContent.map(group => (
            <div key={group.id}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                getCategoryColor(group.id).split(' ')[0]
              }`}>
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((contentType) => {
                  const Icon = contentType.icon;
                  const isSelected = selectedTypes.includes(contentType.id);
                  const { available: hasData, reason: unavailableReason } = checkDataAvailability(contentType.id);
                  const isMaxed = !isSelected && selectedTypes.length >= maxSelections;
                  const isDisabled = isMaxed || (!isSelected && !hasData);
                  const showUnavailable = !hasData && !isSelected;

                  return (
                    <div key={contentType.id} className="relative">
                      <button
                        onClick={() => hasData && onToggle(contentType.id)}
                        disabled={isDisabled}
                        className={`relative w-full h-[88px] flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                            : showUnavailable
                              ? 'border-gray-800 bg-gray-800/20 opacity-60 cursor-not-allowed'
                              : isMaxed
                                ? 'border-gray-800 bg-gray-800/30 opacity-50 cursor-not-allowed'
                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-gray-900" />
                          </div>
                        )}

                        {showUnavailable && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoTooltip(infoTooltip === contentType.id ? null : contentType.id);
                            }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-colors"
                          >
                            <Info className="w-3 h-3 text-amber-400" />
                          </button>
                        )}

                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-cyan-500/20' : showUnavailable ? 'bg-gray-700/50' : 'bg-gray-700'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isSelected ? 'text-cyan-400' : showUnavailable ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <p className={`text-sm font-medium ${
                            isSelected ? 'text-cyan-400' : showUnavailable ? 'text-gray-500' : 'text-white'
                          }`}>
                            {contentType.name}
                          </p>
                          <p className={`text-xs line-clamp-2 mt-0.5 ${
                            showUnavailable ? 'text-gray-600' : 'text-gray-500'
                          }`}>
                            {contentType.description}
                          </p>
                        </div>
                      </button>

                      {infoTooltip === contentType.id && unavailableReason && (
                        <div className="absolute z-10 left-0 right-0 top-full mt-1 p-3 bg-gray-800 border border-amber-500/30 rounded-lg shadow-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-amber-400 font-medium mb-1">Not Enough Data</p>
                              <p className="text-xs text-gray-400">{unavailableReason}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setInfoTooltip(null)}
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-400"
                          >
                            <span className="sr-only">Close</span>
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {activeMode === 'custom' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800/50 rounded-xl border border-rose-500/30">
            <label className="block text-sm font-medium text-rose-400 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Custom Prompt
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => onCustomPromptChange(e.target.value)}
              placeholder="Describe what you want to visualize. Be specific about the content, tone, and key points to include...

Example: Create a motivational slide about our Q4 revenue growth, highlighting the 35% increase and thanking the sales team for their hard work."
              rows={5}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:border-rose-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Your custom prompt will guide the AI in creating your visualization. Be as specific as possible for best results.
            </p>
          </div>

          {onSelectedDocumentsChange && (
            <div className="p-4 bg-gray-800/50 rounded-xl border border-cyan-500/30">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-cyan-400">
                  <Database className="w-4 h-4 inline mr-2" />
                  Focus on Specific Documents (Optional)
                </label>
                <span className="text-xs text-gray-500">
                  {selectedDocuments.length}/{MAX_DOCUMENT_SELECTIONS} selected
                </span>
              </div>

              {selectedDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-cyan-300 max-w-[180px] truncate">{doc.name}</span>
                      <button
                        onClick={() => handleDocumentToggle(doc)}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowDocumentPicker(true)}
                disabled={selectedDocuments.length >= MAX_DOCUMENT_SELECTIONS}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedDocuments.length >= MAX_DOCUMENT_SELECTIONS
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/40'
                }`}
              >
                {selectedDocuments.length === 0 ? 'Select Documents to Focus On' : 'Add More Documents'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Astra will pull detailed information from these specific files to address your request.
              </p>
            </div>
          )}

          <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700">
            <p className="text-sm text-gray-400 mb-3">
              <span className="text-white font-medium">Tips for great custom prompts:</span>
            </p>
            <ul className="space-y-2 text-xs text-gray-500">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">1.</span>
                Specify the topic or theme clearly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">2.</span>
                Include any specific data, metrics, or quotes to feature
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">3.</span>
                Mention the tone (professional, celebratory, motivational, etc.)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">4.</span>
                Describe your audience if relevant
              </li>
            </ul>
          </div>
        </div>
      )}

      {showDocumentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Select Documents</h3>
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {documentSearch ? 'No documents match your search' : 'No documents available'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map(doc => {
                    const isSelected = selectedDocuments.some(d => d.id === doc.id);
                    const isDisabled = !isSelected && selectedDocuments.length >= MAX_DOCUMENT_SELECTIONS;

                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleDocumentToggle(doc)}
                        disabled={isDisabled}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/50'
                            : isDisabled
                              ? 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed'
                              : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-cyan-500/30' : 'bg-gray-700'
                        }`}>
                          {isSelected ? (
                            <Check className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-cyan-300' : 'text-white'}`}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{doc.category}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setShowDocumentPicker(false)}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Done ({selectedDocuments.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
