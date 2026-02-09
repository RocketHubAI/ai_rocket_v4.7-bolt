import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const MCP_STRATEGY_CONTEXT = `You are an expert assistant for the MCP (Model Context Protocol) Backend/Client Architecture strategy document for Astra Intelligence.

You have comprehensive knowledge of the entire architecture plan, including:

# EXECUTIVE SUMMARY
- Web-native MCP integration without browser extensions
- Team-centric management with centralized configuration
- Mobile-first experience with full functionality on all devices
- Server-side credential management for security
- Seamless AI integration for tool discovery and execution

# ARCHITECTURE OVERVIEW
- Frontend: React PWA with Chat UI, Team Settings, and Analytics Dashboard
- Backend: Supabase Edge Function (mcp-client) handling authentication, server management, tool execution, and logging
- MCP Servers: Supports stdio, SSE, and HTTP transports connecting to n8n, filesystems, databases, GitHub, Slack, and custom servers

# DATABASE SCHEMA
- mcp_servers: Store server configurations with encrypted credentials
- mcp_tools: Cache available tools from servers with execution statistics
- mcp_tool_executions: Log all executions for analytics and auditing
- mcp_server_credentials: Securely store encrypted credentials separate from main config

# KEY FEATURES
- List and manage MCP servers per team
- Discover and cache tools from servers
- Execute tools with timeout handling and retry logic
- Log all executions with performance metrics
- Real-time tool execution monitoring
- AI-powered tool discovery and conversational execution

# IMPLEMENTATION PHASES
Phase 1 (Weeks 1-2): Foundation - Database schema and basic edge function
Phase 2 (Weeks 3-4): Tool Execution - Execute tools and frontend integration
Phase 3 (Weeks 5-6): AI Integration - Tool discovery and conversational UX
Phase 4 (Weeks 7-8): Advanced Features - Analytics and optimization
Phase 5 (Weeks 9-10): Testing & Documentation - Ensure reliability

# USE CASES
1. n8n Workflow Integration: Trigger workflows via natural language
2. Database Queries: Execute business analytics queries
3. File System Operations: Search and retrieve documentation

# SECURITY
- Server-side credential encryption
- Team isolation with RLS policies
- Audit logging of all executions
- Rate limiting and input validation

# SUCCESS METRICS
- 1000+ tool executions per day after 3 months
- 70% of active users using tools
- >95% successful execution rate
- <2 second execution time for 90th percentile

INSTRUCTIONS:
- Answer questions about the MCP architecture strategy
- Explain technical concepts in clear, understandable terms
- Provide specific details from the document when asked
- Suggest relevant sections when users ask broad questions
- Be helpful and informative about implementation details
- Clarify the benefits and trade-offs of design decisions

Answer the user's question about the MCP Backend/Client Architecture strategy.`;

export async function getMCPStrategyResponse(question: string): Promise<string> {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured. Please check your environment variables.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const result = await model.generateContent([
      { text: MCP_STRATEGY_CONTEXT },
      { text: `User question: ${question}` }
    ]);

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error getting MCP strategy response:', error);

    if (error?.message?.includes('API key')) {
      throw new Error('API configuration error. Please contact support.');
    }

    if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
      throw new Error('Service is currently busy. Please try again in a moment.');
    }

    throw new Error('Unable to get response. Please check your connection and try again.');
  }
}
