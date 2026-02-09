import React, { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StrategyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
  onSuccess: (documentId: string) => void;
}

interface StrategyFormData {
  mission: string;
  coreValues: string;
  oneYearGoals: string;
  threeYearGoals: string;
  problems: string;
  products: string;
  uniqueness: string;
  marketing: string;
}

export const StrategyDocumentModal: React.FC<StrategyDocumentModalProps> = ({
  isOpen,
  onClose,
  folderId,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<StrategyFormData>({
    mission: '',
    coreValues: '',
    oneYearGoals: '',
    threeYearGoals: '',
    problems: '',
    products: '',
    uniqueness: '',
    marketing: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (field: keyof StrategyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const hasMission = formData.mission.trim() !== '';

  const handleCreate = async () => {
    if (!hasMission) {
      setError('Mission field is required');
      return;
    }

    if (!folderId) {
      setError('Folder ID is missing. Please go back and select a folder.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-strategy-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            folderId,
            strategyData: formData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create strategy document');
      }

      const { document } = await response.json();
      onSuccess(document.id);
    } catch (err: any) {
      console.error('Error creating strategy document:', err);
      setError(err.message || 'Failed to create document');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Strategy Document</h2>
              <p className="text-sm text-gray-400">Help Astra understand your team's direction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={creating}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <span className="font-medium">💡 Tip:</span> Mission field is required. Fill out additional fields for better results - the more information you provide, the better Astra can help your team.
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Mission */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What is the team's mission? <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.mission}
                onChange={(e) => handleChange('mission', e.target.value)}
                placeholder="E.g., To revolutionize how teams collaborate with AI..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Core Values */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What are the team's core values?
              </label>
              <textarea
                value={formData.coreValues}
                onChange={(e) => handleChange('coreValues', e.target.value)}
                placeholder="E.g., Innovation, Transparency, Customer-First..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* One-Year Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What are the team's one-year goals?
              </label>
              <textarea
                value={formData.oneYearGoals}
                onChange={(e) => handleChange('oneYearGoals', e.target.value)}
                placeholder="E.g., Launch MVP, acquire 1000 users, raise Series A..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Three-Year Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What are the team's 3-year goals?
              </label>
              <textarea
                value={formData.threeYearGoals}
                onChange={(e) => handleChange('threeYearGoals', e.target.value)}
                placeholder="E.g., Become market leader, expand to new markets..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Problems */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What problems is the team trying to solve?
              </label>
              <textarea
                value={formData.problems}
                onChange={(e) => handleChange('problems', e.target.value)}
                placeholder="E.g., Teams struggle to leverage AI effectively..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Products */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What products does the team make?
              </label>
              <textarea
                value={formData.products}
                onChange={(e) => handleChange('products', e.target.value)}
                placeholder="E.g., AI-powered collaboration platform..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Uniqueness */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What are the unique things that make your team different?
              </label>
              <textarea
                value={formData.uniqueness}
                onChange={(e) => handleChange('uniqueness', e.target.value)}
                placeholder="E.g., First to integrate real-time AI collaboration..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Marketing Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What is the team's marketing strategy?
              </label>
              <textarea
                value={formData.marketing}
                onChange={(e) => handleChange('marketing', e.target.value)}
                placeholder="E.g., Content marketing, partnerships, community building..."
                disabled={creating}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !hasMission}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 min-h-[44px]"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Document...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Create Document</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
