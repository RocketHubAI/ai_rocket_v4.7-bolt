import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Goal {
  title: string;
  description: string;
  impacts: string[];
}

interface ToolRecommendation {
  name: string;
  category: string;
  score: number;
  scoreReason: string;
  description: string;
  bestFor: string;
  limitations: string;
  pricingTier: string;
  icon: string;
  isRecommended: boolean;
  selected: boolean;
}

interface UseCase {
  title: string;
  description: string;
  outcome: string;
  icon: string;
}

interface Summary {
  whatItDoes: string;
  howItWorks: string;
  keyBenefits: string[];
}

interface BuildStep {
  stepNumber: number;
  title: string;
  description: string;
  details: string[];
  tips: string[];
  timeEstimate: string;
}

interface AdvancedOption {
  tool: string;
  description: string;
  useCase: string;
  setupSteps: string[];
}

interface PlatformBuildPlan {
  platform: 'claude' | 'chatgpt';
  overview: string;
  steps: BuildStep[];
  advancedOptions: AdvancedOption[];
  customInstructions: string;
  knowledgeFiles: string[];
}

interface PrototypeResult {
  prototypeTitle: string;
  summary: Summary;
  useCases: UseCase[];
  toolsRequired: ToolRecommendation[];
  claudeBuildPlan?: PlatformBuildPlan;
  chatgptBuildPlan?: PlatformBuildPlan;
}

interface BuildGuideResult {
  steps: BuildStep[];
}

interface BlueprintResult {
  blueprintTitle: string;
  markdownContent: string;
  claudeOptimized: string;
  chatgptOptimized: string;
  quickStartPrompt: string;
  dataSources: string[];
}

const COMPREHENSIVE_TOOLS_KNOWLEDGE = `
=== COMPREHENSIVE AI TOOLS KNOWLEDGE BASE (2025) ===

**AI ASSISTANTS & CHATBOTS**

Claude Sonnet 4.5 (Anthropic) - Latest flagship model
- Best for: Complex reasoning, coding, long context
- Pricing: Pay-per-token, ~$15/M input tokens
- Strengths: 200K context, excellent coding, nuanced responses
- Limitations: No real-time web access in base model

Claude Projects (Anthropic)
- Best for: Persistent workspaces with uploaded documents
- Pricing: Included with Pro ($20/mo)
- Strengths: Knowledge retrieval, document Q&A, no coding
- Limitations: Limited to Claude ecosystem

Claude Code (Anthropic)
- Best for: Professional coding and development
- Pricing: Enterprise pricing
- Strengths: IDE integration, code generation, debugging
- Limitations: Requires coding knowledge

ChatGPT-5 (OpenAI)
- Best for: General tasks, creative content, broad capabilities
- Pricing: Plus $20/mo, Team $25/user/mo
- Strengths: Fast, multimodal, large ecosystem
- Limitations: Context limits, occasional hallucinations

Custom GPT (OpenAI)
- Best for: Creating specialized chatbots without coding
- Pricing: Included with ChatGPT Plus
- Strengths: Easy setup, shareable, can use Actions
- Limitations: Limited customization depth

GPT-4o (OpenAI)
- Best for: Multimodal tasks (vision, audio, text)
- Pricing: Pay-per-token
- Strengths: Fast, omni-modal, good for apps
- Limitations: Less reasoning power than o1

Gemini 2.5 Pro (Google) - Latest flagship
- Best for: Complex reasoning with grounding
- Pricing: Developer pricing varies
- Strengths: Web grounding, 1M+ context, Google integration
- Limitations: Premium pricing

Gemini 2.5 Flash (Google) - Fast and affordable
- Best for: Fast responses, cost-effective tasks
- Pricing: Very affordable
- Strengths: Speed, multimodal, great value
- Limitations: Less capable than Pro

Gemini 3 Pro (Google) - Cutting edge
- Best for: Most advanced reasoning and multimodal
- Pricing: Premium tier
- Strengths: State-of-the-art, native multimodal
- Limitations: Newest, still rolling out

Gemini Gems (Google)
- Best for: Custom Gemini assistants
- Pricing: Included with Google One AI Premium
- Strengths: Google Workspace integration, easy setup
- Limitations: Google ecosystem only

**AUTOMATION PLATFORMS**

N8N
- Best for: Complex workflow automation, self-hosted
- Pricing: Free self-hosted, Cloud from $20/mo
- Strengths: Open source, powerful, visual builder
- Limitations: Learning curve, technical setup

Make.com (formerly Integromat)
- Best for: Visual workflow automation, app connections
- Pricing: Free tier, paid from $9/mo
- Strengths: User-friendly, many integrations
- Limitations: Execution limits on free tier

Zapier
- Best for: Simple app-to-app automations
- Pricing: Free tier, paid from $19.99/mo
- Strengths: Easiest to use, huge app library
- Limitations: Less powerful, expensive at scale

**DATABASES & STORAGE**

Airtable
- Best for: Flexible database with views
- Pricing: Free tier, Plus from $10/user/mo
- Strengths: Spreadsheet-like, automations, views
- Limitations: Record limits, can get expensive

Notion
- Best for: Knowledge bases, wikis, project management
- Pricing: Free tier, Plus from $8/user/mo
- Strengths: All-in-one workspace, databases, AI features
- Limitations: Performance with large databases

Supabase
- Best for: Full backend (database, auth, storage)
- Pricing: Free tier generous, Pro from $25/mo
- Strengths: PostgreSQL, real-time, open source
- Limitations: Requires development knowledge

Google Sheets
- Best for: Simple data management, collaboration
- Pricing: Free with Google account
- Strengths: Familiar, collaborative, AppScript
- Limitations: Not a real database

**LOW-CODE/NO-CODE BUILDERS**

Bolt.new
- Best for: Building full-stack apps with AI
- Pricing: Subscription model
- Strengths: AI-powered, full apps, deployment
- Limitations: Learning new platform

Retool
- Best for: Internal tools and dashboards
- Pricing: Free tier, paid from $10/user/mo
- Strengths: Connect to any data, fast building
- Limitations: Internal use focused

Bubble
- Best for: Building web apps without code
- Pricing: Free tier, paid from $25/mo
- Strengths: Full apps, workflows, plugins
- Limitations: Vendor lock-in, performance

**SPECIALIZED TOOLS**

Cursor AI
- Best for: AI-powered code editing
- Pricing: Free tier, Pro $20/mo
- Strengths: Built on VS Code, excellent completions
- Limitations: Coding required

Perplexity
- Best for: Research with citations
- Pricing: Free tier, Pro $20/mo
- Strengths: Real-time search, sources
- Limitations: Limited customization

Anthropic Console
- Best for: Testing and deploying Claude
- Pricing: Pay-per-use
- Strengths: Direct API access, workbench
- Limitations: Developer-focused
`;

async function generateSummaryAndTools(
  wishText: string,
  goals: Goal[],
  mode: 'beginner' | 'advanced',
  customizationInstructions: string | null,
  apiKey: string
): Promise<PrototypeResult> {
  const goalsContext = goals.map((g, i) => `
Goal ${i + 1}: ${g.title}
Description: ${g.description}
Impacts: ${g.impacts.filter(Boolean).join(', ')}
`).join('\n');

  const customizationContext = customizationInstructions
    ? `\n=== USER'S CUSTOMIZATION REQUESTS ===\n${customizationInstructions}\n`
    : '';

  const modeInstructions = mode === 'beginner'
    ? `MODE: BEGINNER - Focus on NO-CODE solutions only:
- Prioritize: Claude Projects, Custom GPT, Gemini Gems, Notion, Google Sheets, Airtable, Zapier
- Avoid: N8N (too complex), Make.com (technical), Supabase (requires coding), Claude Code (requires coding)
- User has NO coding experience - everything must work out of the box`
    : `MODE: ADVANCED - Can include technical tools:
- Include: Claude Code, N8N, Make.com, Supabase, API integrations
- Also consider: Custom development, self-hosted solutions
- User is comfortable with technical setup and some coding`;

  const prompt = `You are an AI tool analyst researching the best tools for a specific use case.

${COMPREHENSIVE_TOOLS_KNOWLEDGE}

=== THE USER'S WISH ===
"${wishText}"

=== USER'S GOALS ===
${goalsContext}
${customizationContext}

=== ${modeInstructions} ===

=== YOUR TASK ===
1. Analyze which tools from the knowledge base would be best for this specific wish
2. Score each relevant tool from 1-10 based on fit for THIS specific use case
3. Recommend 10-15 tools total, organized by category
4. Mark the TOP 3-5 tools as "recommended" (isRecommended: true) and pre-selected (selected: true)
5. Others are alternatives the user can choose instead

For scoring, consider:
- 9-10: Perfect fit, highly recommended for this exact use case
- 7-8: Great option, would work very well
- 5-6: Decent option, has some limitations for this use
- 3-4: Possible but not ideal
- 1-2: Not recommended for this use case

Respond with JSON:
{
  "prototypeTitle": "<Clear 3-6 word name for this tool plan>",
  "summary": {
    "whatItDoes": "<2-3 sentences explaining exactly what this AI tool will accomplish>",
    "howItWorks": "<2-3 sentences on the technical approach - ${mode === 'beginner' ? 'emphasize no coding required' : 'can include technical details'}>",
    "keyBenefits": ["<Specific benefit 1>", "<Specific benefit 2>", "<Specific benefit 3>", "<Specific benefit 4>"]
  },
  "useCases": [
    {
      "title": "<Use case title - 3-5 words>",
      "description": "<How this tool helps in this scenario>",
      "outcome": "<Specific measurable result>",
      "icon": "target"
    },
    {
      "title": "<Use case 2>",
      "description": "<Description>",
      "outcome": "<Outcome>",
      "icon": "trending-up"
    },
    {
      "title": "<Use case 3>",
      "description": "<Description>",
      "outcome": "<Outcome>",
      "icon": "clock"
    }
  ],
  "toolsRequired": [
    {
      "name": "Claude Sonnet 4.5",
      "category": "AI Assistant",
      "score": 9,
      "scoreReason": "<Why this score for THIS specific use case>",
      "description": "<What this tool does>",
      "bestFor": "<What it excels at for this project>",
      "limitations": "<Any drawbacks for this use case>",
      "pricingTier": "Pro ($20/mo) or API",
      "icon": "brain",
      "isRecommended": true,
      "selected": true
    },
    {
      "name": "<Tool 2>",
      "category": "<AI Assistant|Automation|Database|Builder>",
      "score": <1-10>,
      "scoreReason": "<Reasoning>",
      "description": "<Description>",
      "bestFor": "<Best for>",
      "limitations": "<Limitations>",
      "pricingTier": "<Pricing>",
      "icon": "<brain|bot|workflow|database|code|zap|settings|plug>",
      "isRecommended": <true for top picks, false for alternatives>,
      "selected": <true for recommended, false for alternatives>
    }
    // Include 10-15 total tools, organized by relevance
  ]
}

CRITICAL RULES:
1. Score each tool specifically for THIS wish - don't give generic scores
2. Explain WHY each score in scoreReason (e.g., "9/10 - Perfect for content creation because...")
3. Include a mix of categories: AI assistants, automation, storage
4. For ${mode} mode, ONLY include appropriate tools from the knowledge base
5. Top 3-5 tools should be isRecommended: true and selected: true
6. Rest are alternatives with selected: false

Respond ONLY with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const normalizedTools: ToolRecommendation[] = (parsed.toolsRequired || parsed.tools_required || parsed.tools || []).map((t: any) => ({
      name: t.name || 'Unknown Tool',
      category: t.category || 'General',
      score: typeof t.score === 'number' ? t.score : 7,
      scoreReason: t.scoreReason || t.score_reason || 'Good fit for this use case',
      description: t.description || 'AI-powered tool',
      bestFor: t.bestFor || t.best_for || 'General tasks',
      limitations: t.limitations || 'None specified',
      pricingTier: t.pricingTier || t.pricing_tier || t.pricing || 'Check website',
      icon: t.icon || 'sparkles',
      isRecommended: t.isRecommended ?? t.is_recommended ?? t.recommended ?? false,
      selected: t.selected ?? t.isRecommended ?? t.is_recommended ?? false
    }));

    return {
      prototypeTitle: parsed.prototypeTitle || parsed.prototype_title || parsed.title || 'AI Tool Plan',
      summary: parsed.summary || { whatItDoes: '', howItWorks: '', keyBenefits: [] },
      useCases: parsed.useCases || parsed.use_cases || [],
      toolsRequired: normalizedTools
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    const defaultTools: ToolRecommendation[] = mode === 'beginner'
      ? [
          { name: 'Claude Projects', category: 'AI Assistant', score: 9, scoreReason: 'Perfect for document-based Q&A without coding', description: 'Persistent Claude workspace with uploaded docs', bestFor: 'Knowledge retrieval and document analysis', limitations: 'Limited to Claude ecosystem', pricingTier: 'Pro ($20/mo)', icon: 'brain', isRecommended: true, selected: true },
          { name: 'Custom GPT', category: 'AI Assistant', score: 8, scoreReason: 'Great for creating shareable chat interfaces', description: 'Custom ChatGPT instances', bestFor: 'Conversational interfaces', limitations: 'Less document handling than Claude', pricingTier: 'Plus ($20/mo)', icon: 'bot', isRecommended: true, selected: true },
          { name: 'Gemini Gems', category: 'AI Assistant', score: 7, scoreReason: 'Good Google Workspace integration', description: 'Custom Gemini assistants', bestFor: 'Google ecosystem users', limitations: 'Limited customization', pricingTier: 'Google One AI Premium', icon: 'brain', isRecommended: false, selected: false },
          { name: 'Notion', category: 'Database', score: 8, scoreReason: 'Excellent for organizing and storing data', description: 'All-in-one workspace with databases', bestFor: 'Knowledge management', limitations: 'Performance with large data', pricingTier: 'Free tier available', icon: 'database', isRecommended: true, selected: true },
          { name: 'Google Sheets', category: 'Database', score: 7, scoreReason: 'Familiar interface, free to use', description: 'Spreadsheet-based data management', bestFor: 'Simple data tracking', limitations: 'Not a real database', pricingTier: 'Free', icon: 'database', isRecommended: false, selected: false },
          { name: 'Airtable', category: 'Database', score: 8, scoreReason: 'Flexible database with great views', description: 'Spreadsheet-database hybrid', bestFor: 'Structured data with views', limitations: 'Record limits on free tier', pricingTier: 'Free tier available', icon: 'database', isRecommended: false, selected: false },
          { name: 'Zapier', category: 'Automation', score: 6, scoreReason: 'Easy automations but limited power', description: 'Simple app-to-app automations', bestFor: 'Basic workflow triggers', limitations: 'Expensive at scale', pricingTier: 'Free tier available', icon: 'zap', isRecommended: false, selected: false },
          { name: 'Gemini 2.5 Flash', category: 'AI Assistant', score: 8, scoreReason: 'Fast and affordable AI assistant', description: 'Google fast multimodal model', bestFor: 'Quick responses and drafts', limitations: 'Less capable than Pro', pricingTier: 'Free tier available', icon: 'brain', isRecommended: false, selected: false },
          { name: 'Perplexity', category: 'Research', score: 7, scoreReason: 'Great for research with citations', description: 'AI-powered research assistant', bestFor: 'Finding information with sources', limitations: 'Limited customization', pricingTier: 'Free tier available', icon: 'brain', isRecommended: false, selected: false }
        ]
      : [
          { name: 'Claude Sonnet 4.5', category: 'AI Assistant', score: 9, scoreReason: 'Best reasoning and coding capabilities', description: 'Anthropic flagship model', bestFor: 'Complex tasks and coding', limitations: 'API pricing can add up', pricingTier: 'API pay-per-token', icon: 'brain', isRecommended: true, selected: true },
          { name: 'Claude Code', category: 'AI Assistant', score: 9, scoreReason: 'Excellent for building custom apps', description: 'AI coding assistant', bestFor: 'Code generation and debugging', limitations: 'Requires coding knowledge', pricingTier: 'Enterprise', icon: 'code', isRecommended: true, selected: true },
          { name: 'N8N', category: 'Automation', score: 9, scoreReason: 'Powerful, flexible workflow automation', description: 'Open-source automation platform', bestFor: 'Complex integrations', limitations: 'Learning curve', pricingTier: 'Free self-hosted', icon: 'workflow', isRecommended: true, selected: true },
          { name: 'Make.com', category: 'Automation', score: 7, scoreReason: 'Visual and user-friendly', description: 'Visual workflow automation', bestFor: 'App connections', limitations: 'Execution limits', pricingTier: 'From $9/mo', icon: 'workflow', isRecommended: false, selected: false },
          { name: 'Supabase', category: 'Database', score: 8, scoreReason: 'Full backend solution', description: 'Open-source Firebase alternative', bestFor: 'Real-time apps with auth', limitations: 'Requires dev knowledge', pricingTier: 'Free tier generous', icon: 'database', isRecommended: true, selected: true },
          { name: 'Airtable', category: 'Database', score: 7, scoreReason: 'Good for structured data', description: 'Flexible database', bestFor: 'CRMs and tracking', limitations: 'Not for heavy queries', pricingTier: 'Free tier available', icon: 'database', isRecommended: false, selected: false },
          { name: 'ChatGPT-5', category: 'AI Assistant', score: 8, scoreReason: 'Fast and versatile', description: 'OpenAI latest model', bestFor: 'General tasks', limitations: 'Context limits', pricingTier: 'Plus ($20/mo)', icon: 'bot', isRecommended: false, selected: false },
          { name: 'Gemini 2.5 Pro', category: 'AI Assistant', score: 8, scoreReason: 'Good for web grounding and research', description: 'Google flagship model', bestFor: 'Research with sources', limitations: 'Premium pricing', pricingTier: 'Developer pricing', icon: 'brain', isRecommended: false, selected: false },
          { name: 'Gemini 3 Pro', category: 'AI Assistant', score: 8, scoreReason: 'Cutting edge multimodal capabilities', description: 'Google latest model', bestFor: 'Advanced multimodal tasks', limitations: 'Newest, still rolling out', pricingTier: 'Premium tier', icon: 'brain', isRecommended: false, selected: false },
          { name: 'Cursor AI', category: 'Development', score: 8, scoreReason: 'Great for code editing', description: 'AI-powered code editor', bestFor: 'Development workflow', limitations: 'Requires coding', pricingTier: 'Pro $20/mo', icon: 'code', isRecommended: false, selected: false }
        ];

    return {
      prototypeTitle: 'AI Tool Plan',
      summary: {
        whatItDoes: `This tool will help you ${wishText.substring(0, 100)}...`,
        howItWorks: mode === 'beginner'
          ? 'Uses simple no-code AI tools that anyone can set up in minutes without any technical knowledge.'
          : 'Combines AI assistants with workflow automation and databases for a powerful custom solution.',
        keyBenefits: ['Save significant time', 'Reduce manual work', 'Get better insights', 'Scale your operations']
      },
      useCases: [
        { title: 'Daily Operations', description: 'Streamline your daily workflow with AI assistance', outcome: '2+ hours saved per day', icon: 'clock' },
        { title: 'Data Analysis', description: 'Analyze information and get actionable insights', outcome: 'Better decision making', icon: 'chart' },
        { title: 'Task Automation', description: 'Automate repetitive tasks automatically', outcome: '80% less manual work', icon: 'zap' }
      ],
      toolsRequired: defaultTools
    };
  }
}

async function generateSinglePlatformPlan(
  wishText: string,
  summary: Summary,
  goals: Goal[],
  platform: 'claude' | 'chatgpt',
  apiKey: string
): Promise<PlatformBuildPlan> {
  const goalsContext = goals.map((g, i) => `Goal ${i + 1}: ${g.title} - ${g.description}`).join('\n');

  const platformKnowledge = platform === 'claude'
    ? `CLAUDE PROJECTS KNOWLEDGE:
- Available at claude.ai with Pro ($20/mo) or Team plans
- Upload documents (PDF, DOCX, CSV, TXT) up to 30MB each
- Set custom instructions that apply to all conversations
- 200K token context window
- MCP integrations available: Zapier (8000+ apps), Atlassian, Asana, etc.`
    : `CUSTOM GPT KNOWLEDGE:
- Available at chat.openai.com with Plus ($20/mo) or Team plans
- Upload knowledge files for reference
- Enable tools: Web Search, DALL-E, Code Interpreter, Canvas
- Actions: Connect to APIs, use Zapier AI Actions for 8000+ apps
- Can be shared publicly or privately`;

  const platformName = platform === 'claude' ? 'Claude Projects' : 'Custom GPT';

  const prompt = `You are an AI implementation expert creating a detailed build plan for ${platformName}.

=== THE USER'S AI TOOL IDEA ===
"${wishText}"

=== WHAT IT DOES ===
${summary.whatItDoes}

=== USER'S GOALS ===
${goalsContext}

${platformKnowledge}

=== N8N AI AGENT CAPABILITIES (MUST USE AS FIRST ADVANCED OPTION) ===
N8N is the most powerful platform for building autonomous AI agent workflows. Key capabilities:

WORKFLOW PATTERNS:
- Chained Requests: Sequential AI calls (e.g., transcribe audio → summarize → store in database)
- Single Agent: One AI maintains state, queries tools, remembers context across interactions
- Multi-Agent with Gatekeeper: Primary agent coordinates and delegates to specialized sub-agents
- Multi-Agent Teams: Multiple agents collaborate on complex tasks

WHAT N8N AGENTS CAN DO:
- Make autonomous decisions without human input
- Query APIs and update CRMs automatically
- Send emails, create documents, file reports
- Process webhooks and trigger actions
- Maintain conversational memory within workflows
- Execute conditional logic based on AI analysis
- Connect to 400+ apps (Slack, Gmail, Notion, Airtable, HubSpot, Salesforce, databases, etc.)

EXAMPLE WORKFLOW IDEAS:
- Daily business health monitor that checks metrics and alerts only for critical issues
- Automated approval workflows that handle routine decisions and escalate exceptions
- Customer inquiry router that categorizes, responds to simple queries, and escalates complex ones
- Report generator that pulls data, analyzes trends, and sends summaries on schedule
- Team coordination agent that tracks project status and sends personalized updates

MCP / API INTEGRATIONS:
- ${platform === 'claude' ? 'Claude supports MCP servers for real-time data access and tool use' : 'Custom GPT Actions allow connecting to any REST API'}
- Build custom connectors to CRMs, databases, internal tools
- Enable AI to read/write data from external systems

=== YOUR TASK ===
Create a detailed build plan for ${platformName}. The plan should guide a non-technical user through building this AI tool step-by-step.

Respond with JSON:
{
  "platform": "${platform}",
  "overview": "<2-3 sentences explaining why ${platformName} is good for this use case>",
  "steps": [
    {
      "stepNumber": 1,
      "title": "<Action verb + what to do>",
      "description": "<1 sentence overview>",
      "details": ["<Specific instruction 1>", "<Specific instruction 2>", "<Specific instruction 3>"],
      "tips": ["<Helpful tip>"],
      "timeEstimate": "<e.g., 5 minutes>"
    }
  ],
  "advancedOptions": [
    {
      "tool": "N8N Automated Workflows",
      "description": "<SPECIFIC description of what N8N workflows would do FOR THIS EXACT TOOL - be concrete, mention specific workflow types>",
      "useCase": "<SPECIFIC scenario where N8N would enhance THIS TOOL - reference the tool's actual purpose>",
      "setupSteps": ["<Specific step for THIS tool>", "<Another specific step>", "<Final setup step>"]
    },
    {
      "tool": "${platform === 'claude' ? 'Custom MCP Server' : 'Custom API Actions'}",
      "description": "<SPECIFIC description of what data/systems to connect FOR THIS TOOL>",
      "useCase": "<SPECIFIC scenario where API integration helps THIS TOOL's goal>",
      "setupSteps": ["<Specific step for THIS tool>", "<Another specific step>"]
    },
    {
      "tool": "<Third RELEVANT integration for THIS specific tool>",
      "description": "<Why THIS integration specifically helps THIS tool>",
      "useCase": "<Concrete scenario for THIS tool>",
      "setupSteps": ["<Specific step>", "<Another step>"]
    }
  ],
  "customInstructions": "<Complete custom instructions text the user can copy-paste>",
  "knowledgeFiles": ["<Type of file to upload 1>", "<Type of file to upload 2>"]
}

REQUIREMENTS:
1. Plan should have 5-7 steps
2. Steps must be VERY specific (what to click, what to type)
3. MANDATORY: First advanced option MUST be "N8N Automated Workflows" - describe 2-3 SPECIFIC workflow ideas for THIS exact tool (e.g., for a business monitor tool: "Build an automated daily health check that pulls metrics from your accounting software, analyzes trends, and sends a Slack summary only when issues are detected")
4. Second option MUST be ${platform === 'claude' ? 'Custom MCP Server' : 'Custom API Actions'} with specific integrations for THIS tool
5. Third option should be the most relevant integration for THIS specific tool
6. ALL advanced options must reference the actual tool's purpose - NO generic descriptions
7. Custom instructions should be complete and ready to copy-paste
8. Knowledge files should be specific to the use case

CRITICAL RULES:
- The first advancedOption MUST have tool = "N8N Automated Workflows" - this is NON-NEGOTIABLE
- N8N description must include SPECIFIC workflow types (e.g., "multi-agent gatekeeper", "scheduled health monitor", "webhook-triggered approval flow")
- Reference the actual tool idea in every advanced option description

Respond ONLY with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in platform plan response');
    }

    return JSON.parse(jsonMatch[0]) as PlatformBuildPlan;
  } catch (error) {
    console.error(`Error generating ${platform} plan:`, error);
    return platform === 'claude'
      ? getDefaultClaudePlan(wishText, summary)
      : getDefaultChatGPTPlan(wishText, summary);
  }
}

async function generatePlatformBuildPlans(
  wishText: string,
  summary: Summary,
  goals: Goal[],
  apiKey: string
): Promise<{ claudePlan: PlatformBuildPlan; chatgptPlan: PlatformBuildPlan }> {
  const goalsContext = goals.map((g, i) => `Goal ${i + 1}: ${g.title} - ${g.description}`).join('\n');

  const prompt = `You are an AI implementation expert creating detailed build plans for both Claude Projects and Custom GPT.

=== THE USER'S AI TOOL IDEA ===
"${wishText}"

=== WHAT IT DOES ===
${summary.whatItDoes}

=== USER'S GOALS ===
${goalsContext}

=== YOUR TASK ===
Create TWO detailed build plans - one for Claude Projects and one for Custom GPT. Each plan should guide a non-technical user through building this AI tool step-by-step.

CLAUDE PROJECTS KNOWLEDGE:
- Available at claude.ai with Pro ($20/mo) or Team plans
- Upload documents (PDF, DOCX, CSV, TXT) up to 30MB each
- Set custom instructions that apply to all conversations
- 200K token context window
- MCP integrations available: Zapier (8000+ apps), Atlassian, Asana, etc.

CUSTOM GPT KNOWLEDGE:
- Available at chat.openai.com with Plus ($20/mo) or Team plans
- Upload knowledge files for reference
- Enable tools: Web Search, DALL-E, Code Interpreter, Canvas
- Actions: Connect to APIs, use Zapier AI Actions for 8000+ apps
- Can be shared publicly or privately

Respond with JSON:
{
  "claudePlan": {
    "platform": "claude",
    "overview": "<2-3 sentences explaining why Claude Projects is good for this use case>",
    "steps": [
      {
        "stepNumber": 1,
        "title": "<Action verb + what to do>",
        "description": "<1 sentence overview>",
        "details": ["<Specific instruction 1>", "<Specific instruction 2>", "<Specific instruction 3>"],
        "tips": ["<Helpful tip>"],
        "timeEstimate": "<e.g., 5 minutes>"
      }
    ],
    "advancedOptions": [
      {
        "tool": "Zapier MCP",
        "description": "<What this adds>",
        "useCase": "<When to use this>",
        "setupSteps": ["<Step 1>", "<Step 2>"]
      }
    ],
    "customInstructions": "<Complete custom instructions text the user can copy-paste into Claude Projects>",
    "knowledgeFiles": ["<Type of file to upload 1>", "<Type of file to upload 2>"]
  },
  "chatgptPlan": {
    "platform": "chatgpt",
    "overview": "<2-3 sentences explaining why Custom GPT is good for this use case>",
    "steps": [
      {
        "stepNumber": 1,
        "title": "<Action verb + what to do>",
        "description": "<1 sentence overview>",
        "details": ["<Specific instruction 1>", "<Specific instruction 2>", "<Specific instruction 3>"],
        "tips": ["<Helpful tip>"],
        "timeEstimate": "<e.g., 5 minutes>"
      }
    ],
    "advancedOptions": [
      {
        "tool": "Zapier AI Actions",
        "description": "<What this adds>",
        "useCase": "<When to use this>",
        "setupSteps": ["<Step 1>", "<Step 2>"]
      }
    ],
    "customInstructions": "<Complete GPT instructions text the user can copy-paste into Custom GPT builder>",
    "knowledgeFiles": ["<Type of file to upload 1>", "<Type of file to upload 2>"]
  }
}

REQUIREMENTS:
1. Each plan should have 5-7 steps
2. Steps must be VERY specific (what to click, what to type)
3. Include 2-3 advanced options per plan (Zapier, N8N, Supabase, Make.com, etc.)
4. Custom instructions should be complete and ready to copy-paste
5. Knowledge files should be specific to the use case

Respond ONLY with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 12000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in build plans response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      claudePlan: parsed.claudePlan || getDefaultClaudePlan(wishText, summary),
      chatgptPlan: parsed.chatgptPlan || getDefaultChatGPTPlan(wishText, summary)
    };
  } catch (error) {
    console.error('Error generating build plans:', error);
    return {
      claudePlan: getDefaultClaudePlan(wishText, summary),
      chatgptPlan: getDefaultChatGPTPlan(wishText, summary)
    };
  }
}

function getDefaultClaudePlan(wishText: string, summary: Summary): PlatformBuildPlan {
  return {
    platform: 'claude',
    overview: 'Claude Projects provides a persistent workspace where you can upload documents and set custom instructions. Claude will reference your materials in every conversation.',
    steps: [
      { stepNumber: 1, title: 'Create a New Project', description: 'Set up your workspace in Claude', details: ['Go to claude.ai and sign in', 'Click the Projects icon in the left sidebar', 'Click "New Project" and give it a descriptive name'], tips: ['Use a clear name that describes the purpose'], timeEstimate: '2 minutes' },
      { stepNumber: 2, title: 'Add Custom Instructions', description: 'Tell Claude how to behave', details: ['Click on Project Instructions', 'Paste the custom instructions provided below', 'Click Save'], tips: ['Be specific about tone and format'], timeEstimate: '5 minutes' },
      { stepNumber: 3, title: 'Upload Your Knowledge Base', description: 'Give Claude the information it needs', details: ['Click "Add Content" in your project', 'Upload relevant documents (PDFs, docs, etc.)', 'Wait for processing to complete'], tips: ['Start with your most important documents'], timeEstimate: '10 minutes' },
      { stepNumber: 4, title: 'Test Your Setup', description: 'Make sure everything works', details: ['Start a new conversation in the project', 'Ask questions that require your uploaded documents', 'Verify Claude references the right information'], tips: ['Test edge cases and common questions'], timeEstimate: '10 minutes' },
      { stepNumber: 5, title: 'Refine and Iterate', description: 'Improve based on results', details: ['Note any responses that need improvement', 'Update your custom instructions as needed', 'Add more documents if there are knowledge gaps'], tips: ['Keep iterating until responses are consistently good'], timeEstimate: '15 minutes' }
    ],
    advancedOptions: [
      { tool: 'N8N Automated Agent Workflows', description: 'Build sophisticated multi-step AI agent workflows that can take autonomous actions, process data, and coordinate between multiple systems', useCase: 'When you need autonomous operations, scheduled tasks, or complex multi-step workflows that run without manual intervention', setupSteps: ['Sign up for N8N Cloud or self-host an instance', 'Create a new workflow with webhook trigger', 'Add AI agent nodes with Claude integration', 'Connect to your business tools (email, CRM, databases)', 'Set up error handling and notifications'] },
      { tool: 'Custom MCP Server', description: 'Build direct integrations to your business systems using Model Context Protocol', useCase: 'When you need real-time data access from CRMs, databases, or internal tools', setupSteps: ['Design your MCP server endpoints', 'Deploy using Cloudflare Workers or similar', 'Configure Claude to connect to your MCP server', 'Test data retrieval and action execution'] },
      { tool: 'Zapier MCP Integration', description: 'Connect Claude to 8,000+ apps for quick automated actions', useCase: 'For simpler integrations that need quick setup without coding', setupSteps: ['Go to Settings > Integrations in Claude', 'Click "Add Integration" and select Zapier', 'Authorize your Zapier account and configure actions'] }
    ],
    customInstructions: `You are an AI assistant specialized in: ${summary.whatItDoes}\n\n## Your Role\nHelp users by ${summary.howItWorks}\n\n## Response Format\n- Be clear and concise\n- Use bullet points for lists\n- Provide actionable advice\n\n## Rules\n- Always reference the uploaded documents when relevant\n- If you don't know something, say so\n- Ask clarifying questions when needed`,
    knowledgeFiles: ['Product documentation', 'FAQs and common questions', 'Style guides or brand guidelines', 'Example responses or templates']
  };
}

function generateStarterPrompts(toolTitle: string, summary: Summary): string[] {
  return [
    `Show me what you can do. Give me an example of how you would ${summary.whatItDoes.toLowerCase()}.`,
    `Walk me through your process step-by-step. How exactly do you ${summary.howItWorks.toLowerCase()}?`,
    `I need help with [describe your specific situation]. Can you guide me through the best approach?`
  ];
}

function getDefaultChatGPTPlan(wishText: string, summary: Summary): PlatformBuildPlan {
  return {
    platform: 'chatgpt',
    overview: 'Custom GPT lets you create a specialized ChatGPT with your own instructions, knowledge files, and optional capabilities like web search and image generation.',
    steps: [
      { stepNumber: 1, title: 'Open GPT Builder', description: 'Access the creation interface', details: ['Go to chat.openai.com and sign in', 'Click "Explore GPTs" in the sidebar', 'Click "+ Create" in the top right'], tips: ['Make sure you have ChatGPT Plus subscription'], timeEstimate: '2 minutes' },
      { stepNumber: 2, title: 'Configure Your GPT', description: 'Set up the basics', details: ['Switch to the "Configure" tab', 'Enter a name and description', 'Paste the instructions provided below'], tips: ['Keep the description clear and concise'], timeEstimate: '5 minutes' },
      { stepNumber: 3, title: 'Upload Knowledge Files', description: 'Add your reference materials', details: ['Scroll to "Knowledge" section', 'Click "Upload files"', 'Select your documents'], tips: ['Use focused, well-structured files'], timeEstimate: '10 minutes' },
      { stepNumber: 4, title: 'Enable Capabilities', description: 'Turn on useful features', details: ['Review the Capabilities section', 'Enable Web Search if current info is needed', 'Enable Code Interpreter for data analysis'], tips: ['Only enable what you need'], timeEstimate: '3 minutes' },
      { stepNumber: 5, title: 'Test and Publish', description: 'Verify and share your GPT', details: ['Use the preview panel to test', 'Ask various questions to check responses', 'Click "Create" and choose sharing settings'], tips: ['Test thoroughly before sharing'], timeEstimate: '15 minutes' }
    ],
    advancedOptions: [
      { tool: 'N8N Automated Agent Workflows', description: 'Build sophisticated multi-step AI agent workflows that can take autonomous actions, process data, and coordinate between multiple systems', useCase: 'When you need autonomous operations, scheduled tasks, or complex multi-step workflows that run without manual intervention', setupSteps: ['Sign up for N8N Cloud or self-host an instance', 'Create a workflow triggered by webhook or schedule', 'Add AI agent nodes with GPT integration', 'Connect to your business tools (email, CRM, databases)', 'Set up error handling and monitoring'] },
      { tool: 'Custom API Actions', description: 'Build direct API integrations to your business systems for real-time data access', useCase: 'When you need real-time data from CRMs, databases, or internal tools', setupSteps: ['Create an OpenAPI schema for your API endpoints', 'In GPT Builder, go to Actions > Create new action', 'Paste your schema and configure authentication', 'Test data retrieval and action execution'] },
      { tool: 'Zapier AI Actions', description: 'Connect your GPT to 8,000+ apps for quick automated actions', useCase: 'For simpler integrations that need quick setup without coding', setupSteps: ['Go to actions.zapier.com and set up AI Actions', 'Copy the OpenAPI schema URL', 'In GPT Builder, import from URL and configure'] }
    ],
    customInstructions: `You are a specialized AI assistant for: ${summary.whatItDoes}\n\n# Your Purpose\n${summary.howItWorks}\n\n# How to Respond\n- Be helpful and professional\n- Reference uploaded knowledge files when relevant\n- Use clear formatting with headings and bullet points\n- Ask clarifying questions if the request is unclear\n\n# Important Rules\n- Stay focused on your specialty\n- Acknowledge when you don't have enough information\n- Provide actionable, practical advice`,
    knowledgeFiles: ['Core documentation', 'FAQs and help articles', 'Templates and examples', 'Brand or style guidelines']
  };
}

async function generateBuildGuide(
  wishText: string,
  summary: Summary,
  selectedTools: ToolRecommendation[],
  mode: 'beginner' | 'advanced',
  apiKey: string
): Promise<BuildGuideResult> {
  const toolsContext = selectedTools
    .filter(t => t.selected)
    .map(t => `- ${t.name} (${t.category}): ${t.bestFor}`)
    .join('\n');

  const prompt = `You are creating a step-by-step build guide for an AI tool.

=== THE TOOL ===
"${wishText}"

=== SUMMARY ===
What it does: ${summary.whatItDoes}
How it works: ${summary.howItWorks}

=== SELECTED TOOLS ===
${toolsContext}

=== MODE: ${mode.toUpperCase()} ===
${mode === 'beginner' ? 'Keep steps VERY simple. No coding. Assume user has never used these tools. Be extremely detailed.' : 'Can include technical steps, configurations, and some coding.'}

=== YOUR TASK ===
Create a detailed 6-8 step build guide. Each step should:
- Be specific to the selected tools
- Include actionable instructions
- Have helpful tips

Respond with JSON:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "<Action-oriented step title>",
      "description": "<Brief 1-sentence overview>",
      "details": ["<Specific instruction 1>", "<Specific instruction 2>"],
      "tips": ["<Helpful tip 1>", "<Helpful tip 2>"],
      "timeEstimate": "<e.g., 5 minutes>"
    }
  ]
}

Make every step practical and specific to: ${selectedTools.filter(t => t.selected).map(t => t.name).join(', ')}

Respond ONLY with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 6000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    return JSON.parse(jsonMatch[0]) as BuildGuideResult;
  } catch (error) {
    console.error('Error generating build guide:', error);
    const tools = selectedTools.filter(t => t.selected);
    return {
      steps: [
        { title: 'Set up your primary AI tool', description: 'Get started with your main AI assistant.', details: `Sign up for ${tools[0]?.name || 'your AI tool'} and create a new project. This will be the brain of your solution.`, tips: ['Use your work email', 'Start with free tier if available'], icon: 'brain', toolUsed: tools[0]?.name },
        { title: 'Configure your assistant', description: 'Customize how the AI behaves.', details: 'Add custom instructions that define exactly how your AI should respond. Be specific about the format, tone, and type of responses you want.', tips: ['Be very specific in instructions', 'Include examples'], icon: 'settings', toolUsed: tools[0]?.name },
        { title: 'Set up your data storage', description: 'Create a place for your data.', details: `Set up ${tools[1]?.name || 'your database'} to store and organize your information. Create the necessary tables or collections.`, tips: ['Plan your data structure first', 'Start simple'], icon: 'database', toolUsed: tools[1]?.name },
        { title: 'Connect your tools', description: 'Make everything work together.', details: 'Set up the integrations between your AI assistant and your data storage. This allows information to flow automatically.', tips: ['Test connections one at a time', 'Check permissions'], icon: 'plug' },
        { title: 'Add your content', description: 'Upload your data and documents.', details: 'Add your existing content, documents, or data that you want the AI to use. This gives it the knowledge it needs.', tips: ['Start with key documents', 'Use clear file names'], icon: 'upload' },
        { title: 'Test thoroughly', description: 'Make sure everything works.', details: 'Run through several real scenarios to test your tool. Try different types of questions and tasks to ensure it handles them correctly.', tips: ['Test edge cases', 'Keep notes on issues'], icon: 'play' },
        { title: 'Launch and iterate', description: 'Start using and improving.', details: 'Begin using your tool in your daily work. Gather feedback and make improvements based on what you learn from actual usage.', tips: ['Start with low-stakes tasks', 'Iterate weekly'], icon: 'check' }
      ]
    };
  }
}

async function generateBlueprint(
  wishText: string,
  summary: Summary,
  selectedTools: ToolRecommendation[],
  buildSteps: BuildStep[],
  mode: 'beginner' | 'advanced',
  apiKey: string
): Promise<BlueprintResult> {
  const tools = selectedTools.filter(t => t.selected);
  const toolsList = tools.map(t => `- **${t.name}** (${t.category}): ${t.bestFor}`).join('\n');
  const stepsList = buildSteps.map((s, i) => `${i + 1}. **${s.title}**: ${s.description}\n   ${s.details}`).join('\n\n');

  const markdown = `# AI Tool Build Guide: ${summary.whatItDoes.split('.')[0]}

## Overview
${summary.whatItDoes}

## How It Works
${summary.howItWorks}

## Key Benefits
${summary.keyBenefits.map(b => `- ${b}`).join('\n')}

## Tools You'll Use
${toolsList}

## Step-by-Step Build Guide

${stepsList}

## Quick Start Prompt
Copy this to get started with any AI assistant:

\`\`\`
Help me build: "${wishText}"

I want to use these tools: ${tools.map(t => t.name).join(', ')}

Please guide me through the setup step by step, starting with ${tools[0]?.name || 'the first tool'}.
\`\`\`

---
*Generated by RocketHub Build Lab*`;

  return {
    blueprintTitle: summary.whatItDoes.split('.')[0],
    markdownContent: markdown,
    claudeOptimized: markdown,
    chatgptOptimized: markdown,
    quickStartPrompt: `Help me build an AI tool: "${wishText}". I want to use ${tools.map(t => t.name).join(', ')}. Guide me step by step.`,
    dataSources: ['Your documents', 'Your data']
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      action,
      prototypeId,
      wishNumber,
      wishText,
      goals,
      mode = 'beginner',
      customizationInstructions,
      selectedTools,
      summary
    } = body;

    if (!prototypeId) {
      return new Response(
        JSON.stringify({ error: 'prototypeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Action: ${action || 'generate'}, Mode: ${mode}`);

    if (action === 'generate-build-guide') {
      const selectedToolsList = selectedTools || [];
      const summaryData = summary || { whatItDoes: wishText, howItWorks: 'AI-powered solution', keyBenefits: [] };

      const buildGuide = await generateBuildGuide(
        wishText,
        summaryData,
        selectedToolsList,
        mode,
        geminiApiKey
      );

      await supabase
        .from('build_lab_prototypes')
        .update({
          build_steps: buildGuide.steps,
          build_guide_generated: true,
          build_guide_content: buildGuide,
          selected_tools: selectedToolsList
        })
        .eq('id', prototypeId);

      return new Response(
        JSON.stringify({ success: true, buildGuide }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-blueprint') {
      const { data: prototypeData } = await supabase
        .from('build_lab_prototypes')
        .select('summary, tools_required, build_steps')
        .eq('id', prototypeId)
        .single();

      if (!prototypeData?.summary || !prototypeData?.tools_required || !prototypeData?.build_steps) {
        return new Response(
          JSON.stringify({ error: 'Summary, tools, and build guide must be generated first' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const blueprint = await generateBlueprint(
        wishText || '',
        prototypeData.summary,
        prototypeData.tools_required,
        prototypeData.build_steps,
        mode,
        geminiApiKey
      );

      await supabase
        .from('build_lab_blueprints')
        .upsert({
          prototype_id: prototypeId,
          user_id: user.id,
          blueprint_title: blueprint.blueprintTitle,
          markdown_content: blueprint.markdownContent,
          claude_optimized: blueprint.claudeOptimized,
          chatgpt_optimized: blueprint.chatgptOptimized,
          quick_start_prompt: blueprint.quickStartPrompt,
          data_sources: blueprint.dataSources,
          status: 'ready'
        }, { onConflict: 'prototype_id' });

      return new Response(
        JSON.stringify({ success: true, blueprint }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-selected-tools') {
      await supabase
        .from('build_lab_prototypes')
        .update({
          selected_tools: selectedTools,
          build_guide_generated: false,
          build_steps: null
        })
        .eq('id', prototypeId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-platform-plan') {
      const { platform } = body;
      if (!platform || (platform !== 'claude' && platform !== 'chatgpt')) {
        return new Response(
          JSON.stringify({ error: 'Valid platform (claude or chatgpt) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: prototypeData } = await supabase
        .from('build_lab_prototypes')
        .select('summary, wish_text')
        .eq('id', prototypeId)
        .single();

      if (!prototypeData?.summary) {
        return new Response(
          JSON.stringify({ error: 'Summary must be generated first' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const goalsForPlan = (goals || []).map((g: any) => ({
        title: g.title || g.goalTitle || '',
        description: g.description || g.goalDescription || '',
        impacts: g.impacts || []
      }));

      console.log(`Generating ${platform} plan for prototype ${prototypeId}`);

      const plan = await generateSinglePlatformPlan(
        prototypeData.wish_text || wishText || '',
        prototypeData.summary,
        goalsForPlan,
        platform,
        geminiApiKey
      );

      const updateData = platform === 'claude'
        ? { claude_build_plan: plan }
        : { chatgpt_build_plan: plan };

      await supabase
        .from('build_lab_prototypes')
        .update(updateData)
        .eq('id', prototypeId);

      return new Response(
        JSON.stringify({ success: true, plan }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark-exported') {
      const { platform } = body;
      if (!platform || (platform !== 'claude' && platform !== 'chatgpt')) {
        return new Response(
          JSON.stringify({ error: 'Valid platform (claude or chatgpt) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData = platform === 'claude'
        ? { claude_exported_at: new Date().toISOString() }
        : { chatgpt_exported_at: new Date().toISOString() };

      await supabase
        .from('build_lab_prototypes')
        .update(updateData)
        .eq('id', prototypeId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!wishText) {
      return new Response(
        JSON.stringify({ error: 'wishText is required for generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prototype = await generateSummaryAndTools(
      wishText,
      goals || [],
      mode,
      customizationInstructions,
      geminiApiKey
    );

    console.log('Generated:', prototype.prototypeTitle, 'Tools:', prototype.toolsRequired.length);

    // Generate starter prompts (3 recommended prompts to get started)
    const starterPrompts = generateStarterPrompts(prototype.prototypeTitle, prototype.summary);

    // Quick generation: Only summary, use cases, and starter prompts
    // Platform-specific plans are generated on-demand when user selects Claude or GPT
    await supabase
      .from('build_lab_prototypes')
      .update({
        prototype_title: prototype.prototypeTitle,
        summary: prototype.summary,
        use_cases: prototype.useCases,
        tools_required: prototype.toolsRequired,
        selected_tools: prototype.toolsRequired.filter(t => t.selected),
        starter_prompts: starterPrompts,
        mode: mode,
        customization_instructions: customizationInstructions,
        status: 'ready',
        build_guide_generated: false,
        generation_completed_at: new Date().toISOString()
      })
      .eq('id', prototypeId);

    return new Response(
      JSON.stringify({
        success: true,
        prototype: {
          title: prototype.prototypeTitle,
          summary: prototype.summary,
          useCases: prototype.useCases,
          toolsRequired: prototype.toolsRequired,
          starterPrompts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
