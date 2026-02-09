import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Database, Code, Lock, BarChart3, Send, Loader2, Sparkles, CheckCircle, Clock, Zap, ArrowRight, Users, Shield, TrendingUp, Layers, GitBranch, Activity, MessageSquare } from 'lucide-react';
import { getMCPStrategyResponse } from '../lib/mcp-strategy-assistant';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Section {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

export const MCPStrategyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showAstra, setShowAstra] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sections: Section[] = [
    { id: 'overview', icon: Server, title: 'Architecture Overview', description: 'High-level system design', color: 'blue' },
    { id: 'database', icon: Database, title: 'Database Schema', description: 'Tables and relationships', color: 'green' },
    { id: 'implementation', icon: Code, title: 'Implementation', description: 'Technical details', color: 'purple' },
    { id: 'security', icon: Lock, title: 'Security', description: 'Access and credentials', color: 'red' },
    { id: 'roadmap', icon: Clock, title: 'Roadmap', description: '10-week timeline', color: 'orange' },
    { id: 'analytics', icon: BarChart3, title: 'Analytics', description: 'Metrics and monitoring', color: 'cyan' }
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await getMCPStrategyResponse(question);
      const astraMessage: Message = {
        id: `astra-${Date.now()}`,
        text: responseText,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, astraMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: error?.message || "I'm having trouble processing your request.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            {/* Architecture Diagram */}
            <div className="bg-gray-800/50 border-2 border-blue-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">System Architecture</h3>

              {/* Frontend Layer */}
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-4 border border-blue-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <Layers className="w-6 h-6 text-blue-400" />
                  <h4 className="text-xl font-semibold">Frontend Layer - React PWA</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <MessageSquare className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="font-medium">Chat UI</div>
                    <div className="text-sm text-gray-400">User interactions</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <Users className="w-5 h-5 text-green-400 mb-2" />
                    <div className="font-medium">Team Settings</div>
                    <div className="text-sm text-gray-400">Admin config</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <BarChart3 className="w-5 h-5 text-purple-400 mb-2" />
                    <div className="font-medium">Analytics</div>
                    <div className="text-sm text-gray-400">Tool usage</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center my-4">
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-gradient-to-b from-blue-500 to-green-500"></div>
                  <div className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">HTTPS/REST API</div>
                  <div className="w-px h-8 bg-gradient-to-b from-green-500 to-yellow-500"></div>
                </div>
              </div>

              {/* Backend Layer */}
              <div className="bg-gradient-to-r from-green-900/50 to-cyan-900/50 rounded-xl p-6 mb-4 border border-green-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="w-6 h-6 text-green-400" />
                  <h4 className="text-xl font-semibold">Supabase Edge Function (mcp-client)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <Shield className="w-5 h-5 text-red-400 mb-2" />
                    <div className="font-medium">Authentication</div>
                    <div className="text-sm text-gray-400">User verification & permissions</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <Server className="w-5 h-5 text-green-400 mb-2" />
                    <div className="font-medium">Server Management</div>
                    <div className="text-sm text-gray-400">MCP connections & lifecycle</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <Zap className="w-5 h-5 text-yellow-400 mb-2" />
                    <div className="font-medium">Tool Execution</div>
                    <div className="text-sm text-gray-400">Discovery & async operations</div>
                  </div>
                  <div className="bg-gray-900/70 rounded-lg p-4 border border-gray-700">
                    <Activity className="w-5 h-5 text-cyan-400 mb-2" />
                    <div className="font-medium">Logging</div>
                    <div className="text-sm text-gray-400">Performance & error tracking</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center my-4">
                <div className="flex flex-col items-center">
                  <div className="w-px h-8 bg-gradient-to-b from-yellow-500 to-purple-500"></div>
                  <div className="text-sm text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">MCP Protocol</div>
                  <div className="w-px h-8 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                </div>
              </div>

              {/* MCP Servers Layer */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center space-x-3 mb-4">
                  <GitBranch className="w-6 h-6 text-purple-400" />
                  <h4 className="text-xl font-semibold">MCP Servers</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {['n8n', 'Filesystem', 'Database', 'GitHub', 'Slack', 'Custom'].map((server) => (
                    <div key={server} className="bg-gray-900/70 rounded-lg p-3 border border-gray-700 text-center">
                      <div className="text-sm font-medium">{server}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 rounded-xl p-6 border border-blue-500/30">
                <CheckCircle className="w-8 h-8 text-blue-400 mb-3" />
                <h4 className="text-lg font-semibold mb-2">Web-Native Integration</h4>
                <p className="text-gray-400 text-sm">No browser extensions needed. Works on any device, any browser with full mobile support.</p>
              </div>
              <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 rounded-xl p-6 border border-green-500/30">
                <Users className="w-8 h-8 text-green-400 mb-3" />
                <h4 className="text-lg font-semibold mb-2">Team-Centric Management</h4>
                <p className="text-gray-400 text-sm">Configure once at team level. All members get instant access to configured tools.</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-6 border border-purple-500/30">
                <Shield className="w-8 h-8 text-purple-400 mb-3" />
                <h4 className="text-lg font-semibold mb-2">Enterprise Security</h4>
                <p className="text-gray-400 text-sm">Server-side credential encryption. Zero exposure to client-side code.</p>
              </div>
              <div className="bg-gradient-to-br from-orange-900/30 to-orange-900/10 rounded-xl p-6 border border-orange-500/30">
                <Zap className="w-8 h-8 text-orange-400 mb-3" />
                <h4 className="text-lg font-semibold mb-2">Seamless AI Integration</h4>
                <p className="text-gray-400 text-sm">Natural tool discovery and execution through conversational AI.</p>
              </div>
            </div>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-8">
            <div className="bg-gray-800/50 border-2 border-green-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Database Schema Design</h3>

              {/* Core Tables */}
              <div className="space-y-6">
                {/* mcp_servers */}
                <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 rounded-xl p-6 border border-green-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Database className="w-6 h-6 text-green-400" />
                      <h4 className="text-xl font-semibold">mcp_servers</h4>
                    </div>
                    <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">Core Table</span>
                  </div>
                  <p className="text-gray-400 mb-4">Store MCP server configurations for each team</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Primary Key</div>
                      <div className="font-mono text-sm">id UUID</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Team Reference</div>
                      <div className="font-mono text-sm">team_id UUID</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Server Name</div>
                      <div className="font-mono text-sm">name TEXT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Connection Type</div>
                      <div className="font-mono text-sm">server_type TEXT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Configuration</div>
                      <div className="font-mono text-sm">config JSONB</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="font-mono text-sm">connection_status</div>
                    </div>
                  </div>
                </div>

                {/* mcp_tools */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Code className="w-6 h-6 text-blue-400" />
                      <h4 className="text-xl font-semibold">mcp_tools</h4>
                    </div>
                    <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">Tool Registry</span>
                  </div>
                  <p className="text-gray-400 mb-4">Cache available tools from servers with execution stats</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Tool Name</div>
                      <div className="font-mono text-sm">tool_name TEXT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Input Schema</div>
                      <div className="font-mono text-sm">input_schema JSONB</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Execution Count</div>
                      <div className="font-mono text-sm">execution_count INT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Success Rate</div>
                      <div className="font-mono text-sm">success_count INT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Performance</div>
                      <div className="font-mono text-sm">avg_duration_ms INT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Last Used</div>
                      <div className="font-mono text-sm">last_executed_at</div>
                    </div>
                  </div>
                </div>

                {/* mcp_tool_executions */}
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-6 h-6 text-purple-400" />
                      <h4 className="text-xl font-semibold">mcp_tool_executions</h4>
                    </div>
                    <span className="text-sm bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">Audit Log</span>
                  </div>
                  <p className="text-gray-400 mb-4">Complete execution history for analytics and debugging</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">User Attribution</div>
                      <div className="font-mono text-sm">user_id, team_id</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Input Parameters</div>
                      <div className="font-mono text-sm">input_parameters JSONB</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Output Result</div>
                      <div className="font-mono text-sm">output_result JSONB</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="font-mono text-sm">status TEXT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Timing</div>
                      <div className="font-mono text-sm">duration_ms INT</div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Context</div>
                      <div className="font-mono text-sm">chat_id UUID</div>
                    </div>
                  </div>
                </div>

                {/* Security Note */}
                <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-6 border border-red-500/30">
                  <div className="flex items-center space-x-3 mb-3">
                    <Lock className="w-6 h-6 text-red-400" />
                    <h4 className="text-xl font-semibold">mcp_server_credentials</h4>
                  </div>
                  <p className="text-gray-400 mb-3">Encrypted credential storage (service role only)</p>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-400 mb-1">No User Access</div>
                        <div className="text-sm text-gray-400">Credentials never exposed to client. Accessed only by service role through edge functions.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'implementation':
        return (
          <div className="space-y-8">
            <div className="bg-gray-800/50 border-2 border-purple-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Implementation Details</h3>

              {/* Edge Function */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="w-6 h-6 text-purple-400" />
                  <h4 className="text-xl font-semibold">Supabase Edge Function</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-semibold mb-2 flex items-center space-x-2">
                      <span className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 text-sm">1</span>
                      <span>Authentication & Authorization</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-8">Verify user identity, check team membership, validate permissions</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-semibold mb-2 flex items-center space-x-2">
                      <span className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 text-sm">2</span>
                      <span>MCP Server Management</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-8">Load team configs, establish connections (stdio/SSE/HTTP), manage lifecycle</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-semibold mb-2 flex items-center space-x-2">
                      <span className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 text-sm">3</span>
                      <span>Tool Discovery & Execution</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-8">List available tools, execute with parameters, handle async operations</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-semibold mb-2 flex items-center space-x-2">
                      <span className="w-6 h-6 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 text-sm">4</span>
                      <span>Logging & Monitoring</span>
                    </div>
                    <p className="text-sm text-gray-400 ml-8">Track execution logs, performance metrics, error tracking</p>
                  </div>
                </div>
              </div>

              {/* Frontend Service */}
              <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-6 border border-blue-500/30 mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Code className="w-6 h-6 text-blue-400" />
                  <h4 className="text-xl font-semibold">Frontend MCP Client Service</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">List Servers</div>
                    <code className="text-xs text-blue-400">mcpClient.listServers()</code>
                    <p className="text-xs text-gray-400 mt-2">Fetch configured servers for team</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">List Tools</div>
                    <code className="text-xs text-blue-400">mcpClient.listTools(serverId)</code>
                    <p className="text-xs text-gray-400 mt-2">Get available tools from server</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">Execute Tool</div>
                    <code className="text-xs text-blue-400">mcpClient.callTool(params)</code>
                    <p className="text-xs text-gray-400 mt-2">Run tool with parameters</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">Sync Tools</div>
                    <code className="text-xs text-blue-400">mcpClient.syncTools(serverId)</code>
                    <p className="text-xs text-gray-400 mt-2">Refresh tool cache from server</p>
                  </div>
                </div>
              </div>

              {/* Transport Types */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 rounded-xl p-6 border border-green-500/30">
                  <h5 className="font-semibold mb-2">STDIO Transport</h5>
                  <p className="text-sm text-gray-400">For local process execution</p>
                  <code className="text-xs text-green-400 mt-2 block">command + args</code>
                </div>
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 rounded-xl p-6 border border-blue-500/30">
                  <h5 className="font-semibold mb-2">SSE Transport</h5>
                  <p className="text-sm text-gray-400">For server-sent events</p>
                  <code className="text-xs text-blue-400 mt-2 block">URL endpoint</code>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-6 border border-purple-500/30">
                  <h5 className="font-semibold mb-2">HTTP Transport</h5>
                  <p className="text-sm text-gray-400">For REST APIs</p>
                  <code className="text-xs text-purple-400 mt-2 block">API endpoint</code>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8">
            <div className="bg-gray-800/50 border-2 border-red-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Security Architecture</h3>

              {/* Security Layers */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-xl p-6 border border-red-500/30">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-6 h-6 text-red-400" />
                    <h4 className="text-xl font-semibold">Credential Management</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                      <div className="font-medium mb-1">Server-Side Storage</div>
                      <p className="text-sm text-gray-400">Never exposed to client code</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                      <div className="font-medium mb-1">Encryption at Rest</div>
                      <p className="text-sm text-gray-400">Supabase Vault or pgcrypto</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                      <div className="font-medium mb-1">TLS in Transit</div>
                      <p className="text-sm text-gray-400">All communication encrypted</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                      <div className="font-medium mb-1">Service Role Only</div>
                      <p className="text-sm text-gray-400">Least privilege access</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
                  <div className="flex items-center space-x-3 mb-4">
                    <Lock className="w-6 h-6 text-blue-400" />
                    <h4 className="text-xl font-semibold">Access Control</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="font-medium mb-2">Team Isolation</div>
                      <p className="text-sm text-gray-400">RLS policies ensure teams only access their servers</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="font-medium mb-2">Role-Based</div>
                      <p className="text-sm text-gray-400">Admin configuration, user execution</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="font-medium mb-2">Audit Logging</div>
                      <p className="text-sm text-gray-400">All executions logged with user attribution</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="font-medium mb-2">Rate Limiting</div>
                      <p className="text-sm text-gray-400">Prevent abuse per user/team</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-900/30 to-red-900/30 rounded-xl p-6 border border-yellow-500/30">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-6 h-6 text-yellow-400" />
                    <h4 className="text-xl font-semibold">Input Validation</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <div className="font-medium">Parameter Validation</div>
                        <p className="text-sm text-gray-400">Validate all tool parameters against schemas</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <div className="font-medium">SQL Injection Prevention</div>
                        <p className="text-sm text-gray-400">Use parameterized queries</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                      <div>
                        <div className="font-medium">Output Sanitization</div>
                        <p className="text-sm text-gray-400">Sanitize tool results before display</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'roadmap':
        return (
          <div className="space-y-8">
            <div className="bg-gray-800/50 border-2 border-orange-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">10-Week Implementation Roadmap</h3>

              {/* Timeline */}
              <div className="space-y-6">
                {[
                  { phase: 'Phase 1', weeks: 'Weeks 1-2', title: 'Foundation', color: 'blue', items: ['Database schema & RLS', 'Edge function structure', 'SSE transport support', 'Error handling'] },
                  { phase: 'Phase 2', weeks: 'Weeks 3-4', title: 'Tool Execution', color: 'green', items: ['Execution engine', 'Timeout handling', 'Frontend integration', 'Team Settings UI'] },
                  { phase: 'Phase 3', weeks: 'Weeks 5-6', title: 'AI Integration', color: 'purple', items: ['Tool context generation', 'Tool call detection', 'Conversational UX', 'Result visualization'] },
                  { phase: 'Phase 4', weeks: 'Weeks 7-8', title: 'Advanced Features', color: 'orange', items: ['Analytics dashboard', 'Performance monitoring', 'Connection pooling', 'Caching strategies'] },
                  { phase: 'Phase 5', weeks: 'Weeks 9-10', title: 'Launch', color: 'red', items: ['Comprehensive testing', 'Documentation', 'Video tutorials', 'Public launch'] }
                ].map((phase, idx) => (
                  <div key={idx} className={`bg-gradient-to-r from-${phase.color}-900/30 to-${phase.color}-900/10 rounded-xl p-6 border border-${phase.color}-500/30`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm text-gray-400">{phase.weeks}</div>
                        <h4 className="text-xl font-semibold">{phase.phase}: {phase.title}</h4>
                      </div>
                      <div className={`w-12 h-12 rounded-full bg-${phase.color}-500/20 border-2 border-${phase.color}-500 flex items-center justify-center text-xl font-bold`}>
                        {idx + 1}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {phase.items.map((item, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-gray-900/50 rounded-lg p-2 border border-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Success Metrics */}
              <div className="mt-8 bg-gradient-to-r from-green-900/30 to-cyan-900/30 rounded-xl p-6 border border-green-500/30">
                <h4 className="text-xl font-semibold mb-4">Success Criteria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
                    <div className="font-medium">1000+ executions/day</div>
                    <p className="text-sm text-gray-400">After 3 months</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <Users className="w-5 h-5 text-blue-400 mb-2" />
                    <div className="font-medium">70% user adoption</div>
                    <p className="text-sm text-gray-400">Active users using tools</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <CheckCircle className="w-5 h-5 text-purple-400 mb-2" />
                    <div className="font-medium">&gt;95% success rate</div>
                    <p className="text-sm text-gray-400">Successful executions</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <Zap className="w-5 h-5 text-yellow-400 mb-2" />
                    <div className="font-medium">&lt;2s execution time</div>
                    <p className="text-sm text-gray-400">90th percentile</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-8">
            <div className="bg-gray-800/50 border-2 border-cyan-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-center">Analytics & Monitoring</h3>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 rounded-xl p-6 border border-blue-500/30">
                  <BarChart3 className="w-8 h-8 text-blue-400 mb-3" />
                  <h4 className="text-lg font-semibold mb-2">Usage Metrics</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• Tool executions per day</li>
                    <li>• Unique users using tools</li>
                    <li>• Tools per user average</li>
                    <li>• Most popular tools</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 rounded-xl p-6 border border-green-500/30">
                  <Activity className="w-8 h-8 text-green-400 mb-3" />
                  <h4 className="text-lg font-semibold mb-2">Performance</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• Average execution time</li>
                    <li>• 90th percentile latency</li>
                    <li>• Error rate tracking</li>
                    <li>• Timeout frequency</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-6 border border-purple-500/30">
                  <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
                  <h4 className="text-lg font-semibold mb-2">Business</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li>• Team adoption rate</li>
                    <li>• Feature retention</li>
                    <li>• Admin satisfaction</li>
                    <li>• Cost per execution</li>
                  </ul>
                </div>
              </div>

              {/* Monitoring Dashboards */}
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/30">
                <h4 className="text-xl font-semibold mb-4">Real-Time Monitoring</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">Tool Usage Trends</div>
                    <p className="text-sm text-gray-400">Daily execution counts by server and tool</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">Error Analysis</div>
                    <p className="text-sm text-gray-400">Failure patterns and error aggregation</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">User Activity</div>
                    <p className="text-sm text-gray-400">Top users and execution patterns</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <div className="font-medium mb-2">Performance Metrics</div>
                    <p className="text-sm text-gray-400">Response times and success rates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-700" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">MCP Backend/Client Architecture</h1>
                  <p className="text-xs text-gray-400">Strategic Implementation Plan</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAstra(!showAstra)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 rounded-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Ask Astra</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Navigation */}
        <div className="flex items-center space-x-2 mb-8 overflow-x-auto pb-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? `bg-gradient-to-r from-${section.color}-600 to-${section.color}-500 text-white shadow-lg scale-105`
                    : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">{section.title}</div>
                </div>
                {activeSection === section.id && <ArrowRight className="w-4 h-4" />}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="relative">
          {renderSectionContent()}
        </div>
      </div>

      {/* Ask Astra Sidebar */}
      {showAstra && (
        <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-30 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold">Ask Astra</h3>
            </div>
            <button
              onClick={() => setShowAstra(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                Ask me anything about the MCP strategy!
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-end space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about the strategy..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
