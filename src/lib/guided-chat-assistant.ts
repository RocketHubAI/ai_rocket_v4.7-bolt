import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface GuidedPrompt {
  title: string;
  prompt: string;
  description: string;
}

export interface CategoryData {
  category: string;
  count: number;
  sampleTitles: string[];
}

export interface UserDataSnapshot {
  categories: CategoryData[];
  totalDocuments: number;
  categoryCount: number;
  hasEmails: boolean;
  emailCount: number;
  emailThreadCount: number;
  teamName: string;
  dataLastUpdated: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  meetings: 'Meetings',
  financial: 'Financial',
  sales: 'Sales',
  marketing: 'Marketing',
  product: 'Product',
  people: 'People/HR',
  operations: 'Operations',
  customer: 'Customer',
  legal: 'Legal',
  industry: 'Industry',
  reference: 'Reference',
  other: 'Other'
};

export async function analyzeUserData(userId: string, teamId: string, hasFinancialAccess: boolean = true): Promise<UserDataSnapshot> {
  try {
    const [teamResult, categoryCountsResult, documentsResult, emailsResult] = await Promise.all([
      supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle(),

      supabase.rpc('get_team_category_counts', { p_team_id: teamId }),

      supabase.rpc('get_team_documents_list', { p_team_id: teamId }),

      supabase
        .from('company_emails')
        .select('id, thread_id')
        .eq('team_id', teamId)
        .order('email_date', { ascending: false })
        .limit(100)
    ]);

    let categoryCounts = categoryCountsResult.data || [];
    let documents = documentsResult.data || [];
    const emails = emailsResult.data || [];

    if (!hasFinancialAccess) {
      categoryCounts = categoryCounts.filter((cat: any) => cat.category !== 'financial');
      documents = documents.filter((d: any) => d.category !== 'financial');
    }

    const uniqueThreads = new Set(emails.map((e: any) => e.thread_id)).size;

    const categories: CategoryData[] = categoryCounts.map((cat: any) => {
      const categoryDocs = documents.filter((d: any) => d.category === cat.category);
      const sampleTitles = categoryDocs
        .slice(0, 5)
        .map((d: any) => d.file_name)
        .filter(Boolean);

      return {
        category: cat.category,
        count: cat.count,
        sampleTitles
      };
    });

    const totalDocuments = categories.reduce((sum, cat) => sum + cat.count, 0);

    return {
      categories,
      totalDocuments,
      categoryCount: categories.length,
      hasEmails: emails.length > 0,
      emailCount: emails.length,
      emailThreadCount: uniqueThreads,
      teamName: teamResult.data?.name || 'Your Team',
      dataLastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing user data:', error);
    throw error;
  }
}

function buildDataSummary(dataSnapshot: UserDataSnapshot): string {
  const lines: string[] = [];

  lines.push(`Total Documents: ${dataSnapshot.totalDocuments}`);
  lines.push(`Categories: ${dataSnapshot.categoryCount}`);
  lines.push('');
  lines.push('Documents by Category:');

  dataSnapshot.categories.forEach(cat => {
    const label = CATEGORY_LABELS[cat.category] || cat.category;
    lines.push(`- ${label}: ${cat.count} documents`);
    if (cat.sampleTitles.length > 0) {
      lines.push(`  Sample titles: ${cat.sampleTitles.slice(0, 3).join(', ')}`);
    }
  });

  if (dataSnapshot.hasEmails) {
    lines.push('');
    lines.push(`Emails: ${dataSnapshot.emailCount} emails across ${dataSnapshot.emailThreadCount} threads`);
  }

  return lines.join('\n');
}

function getAvailableDataTypes(dataSnapshot: UserDataSnapshot): string[] {
  const types: string[] = [];

  dataSnapshot.categories.forEach(cat => {
    const label = CATEGORY_LABELS[cat.category] || cat.category;
    types.push(`${label.toLowerCase()} documents`);
  });

  if (dataSnapshot.hasEmails) {
    types.push('emails');
  }

  return types;
}

export async function generateGuidedPrompts(dataSnapshot: UserDataSnapshot, hasFinancialAccess: boolean = true): Promise<GuidedPrompt[]> {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const dataSummary = buildDataSummary(dataSnapshot);
    const availableTypes = getAvailableDataTypes(dataSnapshot);

    const financialRestriction = !hasFinancialAccess ? `

IMPORTANT RESTRICTION:
This user does NOT have access to financial data. You MUST NOT generate any prompts that:
- Reference financial documents, reports, budgets, or P&L statements
- Ask about revenue, expenses, profits, losses, or financial trends
- Request analysis of bank statements, invoices, or accounting data
- Mention financial forecasts, cash flow, or financial metrics
Focus ONLY on non-financial categories like strategy, meetings, sales, marketing, product, people, operations, customer, legal, industry, and reference documents.
` : '';

    const systemPrompt = `You are an expert AI prompt engineer for Astra Intelligence, a platform that analyzes company documents across multiple categories.

Based on the user's available data, generate exactly 3 highly specific, actionable prompts that will provide maximum value.
${financialRestriction}
USER'S DATA SUMMARY:
${dataSummary}

Team Name: ${dataSnapshot.teamName}
Available Data Types: ${availableTypes.join(', ')}

CRITICAL RULES FOR PROMPT GENERATION (MUST FOLLOW - PROMPTS WILL BE REJECTED OTHERWISE):

1. NEVER include specific document counts in prompts:
   - BAD: "Analyze the 161 Financial documents"
   - GOOD: "Review our most recent financial documents"
   - BAD: "Using the 26 Strategy documents and 18 Product documents"
   - GOOD: "Compare recent strategy and product documents"

2. ALWAYS use relative/bounded language - these phrases are REQUIRED:
   - "most recent" or "latest" (NOT "all")
   - "recent meetings" or "last few meetings" (NOT "all meetings")
   - "a sampling of" or "some examples from" (NOT "all documents")
   - "key" or "top" (NOT exact numbers)
   - "recent trends" (NOT "complete history")

3. FORBIDDEN WORDS/PHRASES (never use these):
   - "all" (as in "all meetings", "all documents", "all data")
   - "every" (as in "every document", "every meeting")
   - "complete" (as in "complete analysis", "complete review")
   - "comprehensive" (as in "comprehensive overview")
   - "entire" (as in "entire history", "entire dataset")
   - "full" (as in "full analysis", "full review")
   - Any specific numbers like "5", "10", "100", etc.

4. SCOPE LIMITS (to ensure fast responses):
   - Limit to 1-2 categories per prompt (NOT 3+)
   - Focus on recent timeframes (last month, recent, latest)
   - Ask for highlights, key points, or summaries (NOT exhaustive lists)

5. PROMPT STYLE:
   - Keep prompts concise (30-60 words maximum)
   - Focus on insights, patterns, and actionable recommendations
   - Be specific about WHAT insight you want, not HOW MUCH data to analyze

PROMPT STRUCTURE:
- Title: 4-6 words, action-oriented
- Prompt: Concise text (30-60 words) using ONLY relative language
- Description: One brief sentence explaining why this prompt is valuable

GOOD PROMPT EXAMPLES:
- "What are the key themes from our most recent strategy documents?"
- "Summarize the main discussion points from our latest meetings."
- "What trends can you identify in our recent sales data?"
- "Based on recent meeting notes, what are our top priorities right now?"

BAD PROMPT EXAMPLES (NEVER GENERATE THESE):
- "Analyze all 50 meetings from the past year" (uses "all" and specific count)
- "Give me a comprehensive review of every document" (uses "comprehensive" and "every")
- "Review the complete history of our financial data" (uses "complete")

OUTPUT FORMAT (JSON only, no other text):
[
  {
    "title": "Strategic Alignment Check",
    "prompt": "Review our most recent strategy documents alongside recent meeting notes. Identify any gaps between our stated goals and day-to-day execution priorities.",
    "description": "Connects strategy with execution to ensure alignment."
  }
]

Generate 3 prompts now as JSON:`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let text = response.text().trim();

    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/g, '');
    }

    const rawPrompts = JSON.parse(text) as GuidedPrompt[];

    if (!Array.isArray(rawPrompts) || rawPrompts.length !== 3) {
      throw new Error('Invalid prompt format from AI');
    }

    const prompts = validateAndFixPrompts(rawPrompts);

    return prompts;
  } catch (error) {
    console.error('Error generating guided prompts:', error);
    throw error;
  }
}

export async function saveGuidedPrompts(
  userId: string,
  teamId: string,
  prompts: GuidedPrompt[],
  dataSnapshot: UserDataSnapshot,
  generationNumber: number
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('guided_chat_prompts')
      .insert({
        user_id: userId,
        team_id: teamId,
        prompt_set: prompts,
        data_snapshot: dataSnapshot,
        generation_number: generationNumber,
        is_current: true
      })
      .select()
      .single();

    if (error) throw error;

    return data.id;
  } catch (error) {
    console.error('Error saving guided prompts:', error);
    throw error;
  }
}

export async function getCurrentGuidedPrompts(userId: string): Promise<{ prompts: GuidedPrompt[], generationNumber: number } | null> {
  try {
    const { data, error } = await supabase
      .from('guided_chat_prompts')
      .select('prompt_set, generation_number')
      .eq('user_id', userId)
      .eq('is_current', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      prompts: data.prompt_set as GuidedPrompt[],
      generationNumber: data.generation_number
    };
  } catch (error) {
    console.error('Error fetching current guided prompts:', error);
    return null;
  }
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

const FORBIDDEN_PATTERNS = [
  /\ball\s+(documents?|meetings?|data|files?|records?|emails?)\b/gi,
  /\bevery\s+(document|meeting|file|record|email)\b/gi,
  /\bcomplete\s+(analysis|review|overview|history|dataset)\b/gi,
  /\bcomprehensive\s+(analysis|review|overview|report)\b/gi,
  /\bentire\s+(history|dataset|collection|archive)\b/gi,
  /\bfull\s+(analysis|review|overview|report)\b/gi,
  /\b\d{2,}\s+(documents?|meetings?|files?|records?)\b/gi,
  /analyze\s+the\s+\d+/gi,
  /review\s+the\s+\d+/gi,
];

const REPLACEMENT_MAP: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\ball\s+(documents?)\b/gi, replacement: 'recent $1' },
  { pattern: /\ball\s+(meetings?)\b/gi, replacement: 'recent $1' },
  { pattern: /\ball\s+(data)\b/gi, replacement: 'recent $1' },
  { pattern: /\ball\s+(files?)\b/gi, replacement: 'recent $1' },
  { pattern: /\ball\s+(emails?)\b/gi, replacement: 'recent $1' },
  { pattern: /\bevery\s+(document|meeting|file|email)\b/gi, replacement: 'recent $1s' },
  { pattern: /\bcomplete\s+(analysis|review|overview)\b/gi, replacement: 'brief $1' },
  { pattern: /\bcomprehensive\s+(analysis|review|overview|report)\b/gi, replacement: 'key $1' },
  { pattern: /\bentire\s+(history|dataset)\b/gi, replacement: 'recent $1' },
  { pattern: /\bfull\s+(analysis|review)\b/gi, replacement: 'brief $1' },
  { pattern: /\b\d{2,}\s+(documents?|meetings?|files?)\b/gi, replacement: 'recent $1' },
];

function sanitizePrompt(prompt: string): string {
  let sanitized = prompt;
  for (const { pattern, replacement } of REPLACEMENT_MAP) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
}

function validateAndFixPrompts(prompts: GuidedPrompt[]): GuidedPrompt[] {
  return prompts.map(p => ({
    ...p,
    prompt: sanitizePrompt(p.prompt),
    title: sanitizePrompt(p.title),
    description: sanitizePrompt(p.description)
  }));
}
