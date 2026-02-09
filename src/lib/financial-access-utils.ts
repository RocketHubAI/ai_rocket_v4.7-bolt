const FINANCIAL_KEYWORDS = [
  'financial',
  'financials',
  'finance',
  'budget',
  'budgets',
  'budgeting',
  'revenue',
  'revenues',
  'expense',
  'expenses',
  'profit',
  'profits',
  'profitability',
  'loss',
  'losses',
  'p&l',
  'p & l',
  'profit and loss',
  'income statement',
  'balance sheet',
  'cash flow',
  'cashflow',
  'burn rate',
  'burnrate',
  'runway',
  'forecast',
  'forecasts',
  'forecasting',
  'projection',
  'projections',
  'earnings',
  'ebitda',
  'gross margin',
  'net margin',
  'margin',
  'margins',
  'roi',
  'return on investment',
  'cost',
  'costs',
  'costing',
  'invoice',
  'invoices',
  'invoicing',
  'billing',
  'payment',
  'payments',
  'accounts receivable',
  'accounts payable',
  'ar',
  'ap',
  'payroll',
  'salary',
  'salaries',
  'compensation',
  'bank statement',
  'bank statements',
  'transaction',
  'transactions',
  'accounting',
  'accountant',
  'bookkeeping',
  'tax',
  'taxes',
  'taxation',
  'depreciation',
  'amortization',
  'asset',
  'assets',
  'liability',
  'liabilities',
  'equity',
  'valuation',
  'funding',
  'investment',
  'investments',
  'investor',
  'investors',
  'capital',
  'capitalization',
  'debt',
  'loan',
  'loans',
  'credit',
  'expenditure',
  'expenditures',
  'spending',
  'money',
  'monetary',
  'fiscal',
  'quarterly',
  'annual report',
  'financial report',
  'financial data',
  'financial analysis',
  'financial performance',
  'financial metrics',
  'financial summary',
  'financial overview',
  'financial health',
  'financial status',
  'financial position',
  'mrr',
  'arr',
  'monthly recurring revenue',
  'annual recurring revenue',
  'ltv',
  'cac',
  'customer acquisition cost',
  'lifetime value',
  'unit economics'
];

const FINANCIAL_PHRASE_PATTERNS = [
  /how much (did|do|are|have) we (spend|spent|make|made|earn|earned|owe|owed)/i,
  /what('s| is| are) (our|the) (revenue|expense|profit|loss|budget|cost|margin|earnings)/i,
  /financial (status|health|performance|outlook|position|summary|report|data|analysis)/i,
  /(show|give|provide|get|fetch|pull|analyze|review|summarize) (me )?(our |the )?(financial|finance|budget|revenue|expense|profit)/i,
  /(cash|money|funds|capital) (flow|position|status|available|remaining)/i,
  /(burn|spending|expense) rate/i,
  /how long (will|can|do) (our|the) (funds|money|cash|capital|runway)/i,
  /(income|balance|cash flow) statement/i,
  /(p&l|profit.and.loss|quarterly|annual|monthly) (report|summary|data|analysis)/i
];

export interface FinancialAccessCheckResult {
  isFinancialQuestion: boolean;
  matchedKeywords: string[];
  confidence: 'high' | 'medium' | 'low';
}

export function detectFinancialQuestion(prompt: string): FinancialAccessCheckResult {
  const normalizedPrompt = prompt.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  for (const keyword of FINANCIAL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(normalizedPrompt)) {
      matchedKeywords.push(keyword);
    }
  }

  let patternMatch = false;
  for (const pattern of FINANCIAL_PHRASE_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      patternMatch = true;
      break;
    }
  }

  const isFinancialQuestion = matchedKeywords.length > 0 || patternMatch;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (patternMatch || matchedKeywords.length >= 3) {
    confidence = 'high';
  } else if (matchedKeywords.length >= 2) {
    confidence = 'medium';
  } else if (matchedKeywords.length === 1) {
    confidence = 'low';
  }

  return {
    isFinancialQuestion,
    matchedKeywords,
    confidence
  };
}

export function getFinancialAccessDeniedMessage(): string {
  return `I can see you're asking about financial information, but you don't currently have access to financial data.

**To get access:**
- Contact your team administrator
- They can enable financial access in Team Settings

If you believe you should have access, please reach out to your team admin.`;
}
