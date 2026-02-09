export const DEMO_COMPANY = {
  name: 'Acme Services',
  tagline: 'Professional Business Solutions',
};

export const DEMO_TEAM_MEMBERS = [
  { name: 'Sarah Chen', role: 'CEO', avatar: 'SC' },
  { name: 'Mike Rodriguez', role: 'Sales Lead', avatar: 'MR' },
  { name: 'Emily Watson', role: 'Marketing', avatar: 'EW' },
  { name: 'David Kim', role: 'Operations', avatar: 'DK' },
];

export const DEMO_MISSION_CONTROL = {
  launchPoints: 1250,
  teamMembers: 4,
  documentsConnected: 156,
  fuelLevel: 85,
  stageProgress: {
    fuel: { current: 85, target: 100, label: 'Data Connected' },
    guidance: { current: 70, target: 100, label: 'Team Configured' },
    boosters: { current: 60, target: 100, label: 'Reports Active' },
  },
};

export const DEMO_CHAT_CONVERSATION = [
  {
    role: 'user' as const,
    name: 'Sarah Chen',
    content: 'What were our top revenue sources last quarter?',
  },
  {
    role: 'assistant' as const,
    name: 'Astra',
    content: `Based on Acme Services' Q4 financial data, here are your top revenue sources:

**1. Consulting Services** - $52,300 (41%)
**2. Software Subscriptions** - $38,750 (31%)
**3. Training & Workshops** - $24,200 (19%)
**4. Support Contracts** - $12,250 (9%)

Total Q4 Revenue: **$127,500** (+12% from Q3)

Your consulting services showed the strongest growth at 18% quarter-over-quarter. Would you like me to break down which clients contributed most to this growth?`,
  },
];

export const DEMO_GUIDED_PROMPTS = [
  {
    category: 'Financial Analysis',
    prompts: [
      'Analyze our monthly expenses and identify cost-saving opportunities',
      'Which products have the highest profit margins?',
    ],
  },
  {
    category: 'Team Performance',
    prompts: [
      'Summarize recent team activity and project progress',
      'What are our current project deadlines and status?',
    ],
  },
  {
    category: 'Strategic Planning',
    prompts: [
      'Based on our data, what growth opportunities should we focus on?',
      'What are our top customer segments by revenue?',
    ],
  },
];

export const DEMO_GUIDED_REPORTS = [
  {
    title: 'Weekly Business Snapshot',
    description: 'Key metrics, wins, and focus areas',
    schedule: 'Every Monday at 8am',
  },
  {
    title: 'Monthly Financial Summary',
    description: 'Revenue, expenses, and profitability trends',
    schedule: 'First of each month',
  },
  {
    title: 'Customer Health Report',
    description: 'Client engagement and satisfaction metrics',
    schedule: 'Bi-weekly',
  },
];

export const DEMO_REPORT_DATA = {
  title: 'Weekly Business Snapshot',
  date: 'Dec 30, 2024',
  metrics: [
    { label: 'Revenue', value: '$127,500', change: '+12%', positive: true },
    { label: 'Active Projects', value: '8', change: '+2', positive: true },
    { label: 'New Leads', value: '23', change: '+15%', positive: true },
    { label: 'Customer Satisfaction', value: '94%', change: '+2%', positive: true },
  ],
  highlights: [
    'Closed 3 new consulting contracts worth $45,000',
    'Training workshop attendance up 25% month-over-month',
    'Customer churn reduced to under 3%',
  ],
};

export const DEMO_TEAM_CHAT = [
  {
    user: 'Mike Rodriguez',
    avatar: 'MR',
    message: 'Just closed the Henderson account! $18k annual contract',
    time: '2 hours ago',
  },
  {
    user: 'Emily Watson',
    avatar: 'EW',
    message: '@Astra can you pull the latest marketing campaign performance?',
    time: '1 hour ago',
  },
  {
    user: 'Astra',
    avatar: 'AI',
    isAI: true,
    message: 'Your email campaign achieved a 24% open rate and 8% click-through rate, outperforming industry averages by 15%.',
    time: '1 hour ago',
  },
  {
    user: 'David Kim',
    avatar: 'DK',
    message: 'Great work team! Operations running smooth this week.',
    time: '45 min ago',
  },
];

export const DEMO_VISUALIZATIONS = [
  {
    type: 'line',
    title: 'Revenue Trend (6 Months)',
    data: [85000, 92000, 98000, 105000, 118000, 127500],
    labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  {
    type: 'pie',
    title: 'Revenue by Service',
    data: [
      { label: 'Consulting', value: 41, color: '#3B82F6' },
      { label: 'Software', value: 31, color: '#10B981' },
      { label: 'Training', value: 19, color: '#F59E0B' },
      { label: 'Support', value: 9, color: '#8B5CF6' },
    ],
  },
  {
    type: 'bar',
    title: 'Monthly Goals Progress',
    data: [
      { label: 'Revenue', current: 127500, target: 130000 },
      { label: 'New Clients', current: 8, target: 10 },
      { label: 'Projects', current: 12, target: 15 },
    ],
  },
];

export const DEMO_SMART_DATA = {
  categories: [
    { name: 'Documents', count: 89, icon: 'FileText', color: 'blue' },
    { name: 'Financials', count: 42, icon: 'DollarSign', color: 'emerald' },
    { name: 'Projects', count: 25, icon: 'FolderKanban', color: 'orange' },
  ],
  totalDocuments: 156,
  useCases: [
    'Ask questions about any document content instantly',
    'Generate reports combining data from multiple sources',
    'Get AI insights that understand your full business context',
    'Track changes and trends across all your data over time',
  ],
};

export const DEMO_COMING_SOON = [
  {
    title: 'AI Specialists',
    description: 'Create specialized AI team members like Business Coach, Finance Director, Marketing Manager and more to handle tasks 24/7',
    icon: 'Brain',
  },
  {
    title: 'Create Agents',
    description: 'Design and deploy custom AI Agents to complete tasks autonomously. Build workflows that work for you 24/7',
    icon: 'Bot',
  },
  {
    title: 'Team SOPs',
    description: 'Create guidance documents and playbooks that help your team stay aligned and make better decisions',
    icon: 'Compass',
  },
  {
    title: 'Deep Research',
    description: 'Launch deep AI research investigations on topics critical to your business with multi-source analysis',
    icon: 'Search',
  },
  {
    title: 'Business Coach',
    description: 'Master your metrics, OKRs, and business frameworks with AI-powered coaching for EOS, Scaling Up, and more',
    icon: 'Target',
  },
];
