import { useState } from 'react';
import {
  X,
  Wand2,
  Globe,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileJson,
  TestTube,
  Send
} from 'lucide-react';
import { useCustomApis } from '../hooks/useMCPTools';

type WizardStep = 'input' | 'analyzing' | 'review' | 'auth' | 'testing' | 'complete';

interface ApiWizardModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApiWizardModal({ onClose, onSuccess }: ApiWizardModalProps) {
  const { analyzeApi, generateEndpoints, testConnection, submitForReview } = useCustomApis();

  const [step, setStep] = useState<WizardStep>('input');
  const [error, setError] = useState<string | null>(null);

  const [apiDocsUrl, setApiDocsUrl] = useState('');
  const [apiDocsText, setApiDocsText] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');

  const [analysis, setAnalysis] = useState<any>(null);
  const [apiName, setApiName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [category, setCategory] = useState('custom');

  const [authType, setAuthType] = useState('api_key');
  const [apiKey, setApiKey] = useState('');
  const [headerName, setHeaderName] = useState('Authorization');
  const [keyPrefix, setKeyPrefix] = useState('Bearer');

  const [testResult, setTestResult] = useState<any>(null);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError(null);
    try {
      const params: any = {};
      if (inputMode === 'url' && apiDocsUrl) {
        params.api_docs_url = apiDocsUrl;
      } else if (inputMode === 'text' && apiDocsText) {
        params.api_docs_text = apiDocsText;
      } else {
        throw new Error('Please provide API documentation URL or text');
      }

      const result = await analyzeApi(params);

      if (result.analysis) {
        setAnalysis(result.analysis);
        setApiName(result.analysis.api_name || '');
        setBaseUrl(result.analysis.base_url || '');
        setCategory(result.analysis.category || 'custom');
        setAuthType(result.analysis.auth_type || 'api_key');
      } else if (result.raw_analysis) {
        setAnalysis({ raw: result.raw_analysis });
      }
      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('input');
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    setError(null);
    try {
      const authConfig: Record<string, string> = {};
      if (authType === 'api_key') {
        authConfig.api_key = apiKey;
        authConfig.header_name = headerName;
        authConfig.prefix = keyPrefix;
      } else if (authType === 'bearer_token') {
        authConfig.token = apiKey;
      }

      const result = await testConnection({ base_url: baseUrl, auth_type: authType, auth_config: authConfig });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    }
  };

  const handleGenerate = async () => {
    setError(null);
    try {
      const authConfig: Record<string, string> = {};
      if (authType === 'api_key') {
        authConfig.api_key = apiKey;
        authConfig.header_name = headerName;
        authConfig.prefix = keyPrefix;
      } else if (authType === 'bearer_token') {
        authConfig.token = apiKey;
      }

      const params: any = {
        api_name: apiName,
        base_url: baseUrl,
        auth_type: authType,
        auth_config: authConfig,
      };
      if (inputMode === 'url' && apiDocsUrl) params.api_docs_url = apiDocsUrl;
      if (inputMode === 'text' && apiDocsText) params.api_docs_text = apiDocsText;

      const result = await generateEndpoints(params);
      setGeneratedResult(result);

      if (result.api_definition_id) {
        await submitForReview(result.api_definition_id);
      }

      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">API Wizard</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {step === 'input' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Paste your API documentation and the AI will analyze it, discover endpoints,
                and generate tool schemas for your AI agent to use.
              </p>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setInputMode('url')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${inputMode === 'url' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                  <Globe className="w-3 h-3 inline mr-1" /> URL
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${inputMode === 'text' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                  <FileJson className="w-3 h-3 inline mr-1" /> Paste Text
                </button>
              </div>

              {inputMode === 'url' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">API Documentation URL</label>
                  <input
                    type="url"
                    value={apiDocsUrl}
                    onChange={(e) => setApiDocsUrl(e.target.value)}
                    placeholder="https://api.example.com/docs"
                    className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Paste API Documentation</label>
                  <textarea
                    value={apiDocsText}
                    onChange={(e) => setApiDocsText(e.target.value)}
                    placeholder="Paste your API documentation, OpenAPI spec, or endpoint descriptions here..."
                    rows={8}
                    className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                  />
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={inputMode === 'url' ? !apiDocsUrl : !apiDocsText}
                className="w-full py-2.5 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Analyze API
              </button>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-sm text-slate-300 font-medium">Analyzing API documentation...</p>
              <p className="text-xs text-slate-500 mt-1">Discovering endpoints and generating schemas</p>
            </div>
          )}

          {step === 'review' && analysis && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-sm text-emerald-400 font-medium">Analysis complete</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">Review the details below and proceed to authentication</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">API Name</label>
                <input
                  type="text"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="finance">Finance</option>
                  <option value="crm">CRM & Sales</option>
                  <option value="communication">Communication</option>
                  <option value="project_management">Project Management</option>
                  <option value="transcription">Transcription</option>
                  <option value="analytics">Analytics</option>
                  <option value="marketing">Marketing</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {analysis.suggested_endpoints && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Discovered Endpoints ({analysis.suggested_endpoints.length})
                  </label>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {analysis.suggested_endpoints.map((ep: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 bg-slate-800/30 rounded-lg">
                        <span className={`px-1.5 py-0.5 rounded font-mono font-medium ${ep.http_method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {ep.http_method}
                        </span>
                        <span className="text-slate-300 truncate">{ep.display_name}</span>
                        <span className="text-slate-600 font-mono truncate ml-auto">{ep.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.auth_instructions && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs font-medium text-blue-400 mb-1">Authentication Instructions</p>
                  <p className="text-xs text-blue-400/70">{analysis.auth_instructions}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep('auth')}
                  disabled={!apiName || !baseUrl}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  Authentication <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 'auth' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Enter your API credentials. These are encrypted and stored securely.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Auth Type</label>
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:border-cyan-500/50 focus:outline-none"
                >
                  <option value="api_key">API Key</option>
                  <option value="bearer_token">Bearer Token</option>
                  <option value="basic_auth">Basic Auth</option>
                  <option value="none">No Auth</option>
                </select>
              </div>

              {authType !== 'none' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {authType === 'api_key' ? 'API Key' : authType === 'bearer_token' ? 'Token' : 'Credentials'}
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={authType === 'api_key' ? 'Enter your API key' : 'Enter your token'}
                      className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                    />
                  </div>

                  {authType === 'api_key' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Header Name</label>
                        <input
                          type="text"
                          value={headerName}
                          onChange={(e) => setHeaderName(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Key Prefix</label>
                        <input
                          type="text"
                          value={keyPrefix}
                          onChange={(e) => setKeyPrefix(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-cyan-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={handleTestConnection}
                className="w-full py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Connection
              </button>

              {testResult && (
                <div className={`p-3 rounded-lg text-xs ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {testResult.success
                    ? `Connection successful (${testResult.status_code})`
                    : `Connection failed: ${testResult.error || `Status ${testResult.status_code}`}`
                  }
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('review')}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex-1 py-2 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center gap-1"
                >
                  <Send className="w-4 h-4" /> Generate & Submit
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">API Connected</h3>
              <p className="text-sm text-slate-400 mb-2">
                {generatedResult?.endpoints_created || 0} endpoints generated and submitted for review.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                An admin will review and approve the API before your AI agent can use it.
              </p>
              <button
                onClick={onSuccess}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
