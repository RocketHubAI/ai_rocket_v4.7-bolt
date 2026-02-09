import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export const AdminInviteCodesPanel: React.FC = () => {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showInviteMessage, setShowInviteMessage] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showActiveCodes, setShowActiveCodes] = useState(false);

  const fetchInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateCode = async () => {
    setCreating(true);
    setError('');
    setSuccess('');
    setShowInviteMessage(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newCode = generateRandomCode();

      const { error } = await supabase
        .from('invite_codes')
        .insert({
          code: newCode,
          created_by: user.id,
          max_uses: maxUses,
          current_uses: 0,
          is_active: true
        });

      if (error) throw error;

      setGeneratedCode(newCode);
      setShowInviteMessage(true);
      setSuccess(`Invite code generated successfully!`);
      await fetchInviteCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to create invite code');
    } finally {
      setCreating(false);
    }
  };

  const copyInviteMessage = () => {
    const message = `You're invited to join AI Rocket + Astra Intelligence!

Set up your account and add your team using this invite code: ${generatedCode}

Get started here: ${window.location.origin}

AI Rocket + Astra Intelligence connects to ALL your data sources - emails, documents, financial data - and provides intelligent insights to help your team make better decisions faster.`;

    navigator.clipboard.writeText(message);
    setSuccess('Invite message copied to clipboard!');
  };

  const resetInviteForm = () => {
    setMaxUses(1);
    setGeneratedCode('');
    setShowInviteMessage(false);
    setError('');
    setSuccess('');
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invite code?')) return;

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Invite code deleted');
      await fetchInviteCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete invite code');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setSuccess(`Invite code ${!currentStatus ? 'activated' : 'deactivated'}`);
      await fetchInviteCodes();
    } catch (err: any) {
      setError(err.message || 'Failed to update invite code');
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Invite New Teams</h3>
          <p className="text-sm text-gray-400 mt-1">
            Generate invite codes for new teams to join AI Rocket + Astra Intelligence
          </p>
        </div>
        <button
          onClick={fetchInviteCodes}
          className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <h4 className="text-sm font-semibold text-white mb-3">Generate Invite Code</h4>

        {!showInviteMessage ? (
          <>
            <div className="flex items-end space-x-3 mb-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Max Uses</label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  disabled={creating}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleCreateCode}
                disabled={creating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Generate Code</span>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Generate an invite code for a new team to create their account and get started.
            </p>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-400 text-sm font-medium mb-3">Invite Code Generated!</p>
              <div className="bg-gray-900 rounded p-4 mb-3 border border-gray-700">
                <p className="text-white text-sm mb-3">
                  You're invited to join <span className="font-bold text-blue-400">AI Rocket + Astra Intelligence!</span>
                </p>
                <p className="text-white text-sm mb-2">
                  Set up your account and add your team using this invite code:
                </p>
                <p className="text-2xl font-mono font-bold text-green-400 mb-3 text-center py-2">
                  {generatedCode}
                </p>
                <p className="text-white text-sm mb-2">
                  Get started here: <span className="text-blue-400 break-all">{window.location.origin}</span>
                </p>
                <p className="text-gray-400 text-xs mt-3 pt-3 border-t border-gray-700">
                  AI Rocket + Astra Intelligence connects to ALL your data sources - emails, documents, financial data - and provides intelligent insights to help your team make better decisions faster.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyInviteMessage}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Invite Message</span>
                </button>
                <button
                  onClick={resetInviteForm}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>

            {success && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-400 text-sm font-medium mb-2">Next Steps:</p>
              <ul className="text-gray-400 text-xs space-y-1">
                <li>• Copy the invite message above</li>
                <li>• Send it to the team leader via email or message</li>
                <li>• They'll use the code to create their account</li>
                <li>• They can then invite their team members</li>
                <li>• Each code can be used {maxUses} time{maxUses > 1 ? 's' : ''}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShowActiveCodes(!showActiveCodes)}
          className="w-full flex items-center justify-between text-sm font-semibold text-white hover:text-gray-300 transition-colors"
        >
          <span>Active Invite Codes ({inviteCodes.length})</span>
          {showActiveCodes ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showActiveCodes && (
          inviteCodes.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No invite codes created yet</p>
          ) : (
            <div className="space-y-2">
              {inviteCodes.map((inviteCode) => (
                <div
                  key={inviteCode.id}
                  className={`bg-gray-800 rounded-lg p-4 border ${
                    inviteCode.is_active ? 'border-gray-600' : 'border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <code className="text-lg font-mono text-blue-400">{inviteCode.code}</code>
                        <button
                          onClick={() => handleCopyCode(inviteCode.code)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === inviteCode.code ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                        <span>
                          Uses: {inviteCode.current_uses}/{inviteCode.max_uses}
                        </span>
                        <span>
                          Created: {new Date(inviteCode.created_at).toLocaleDateString()}
                        </span>
                        <span className={inviteCode.is_active ? 'text-green-400' : 'text-red-400'}>
                          {inviteCode.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(inviteCode.id, inviteCode.is_active)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          inviteCode.is_active
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {inviteCode.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCode(inviteCode.id)}
                        className="p-2 hover:bg-red-600/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
