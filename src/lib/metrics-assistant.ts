import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

interface MetricsData {
  overview?: {
    totalUsers: number;
    activeUsersToday: number;
    activeUsers7Days: number;
    activeUsers30Days: number;
    totalMessages: number;
    totalReports: number;
    totalVisualizations: number;
    avgResponseTime: number;
    errorRate: number;
  };
  dailyMetrics?: Array<{
    metric_date: string;
    daily_active_users: number;
    total_messages: number;
    total_reports: number;
    total_visualizations: number;
  }>;
  milestones?: Array<{
    milestone_type: string;
    users_achieved: number;
    achievement_rate_pct: number;
  }>;
  performance?: Array<{
    date: string;
    mode: string;
    avg_response_ms: number;
    success_rate: number;
    total_requests: number;
  }>;
  timeRange?: 7 | 30 | 90;
}

function buildMetricsContext(metricsData: MetricsData): string {
  const { overview, dailyMetrics, milestones, performance, timeRange } = metricsData;

  let context = `You are Astra's Metrics Assistant for the Astra Intelligence platform. You help super admins analyze user metrics, engagement trends, and platform performance.

CURRENT METRICS DATA (Last ${timeRange || 30} days):
`;

  // Overview Section
  if (overview) {
    context += `
OVERVIEW STATISTICS:
- Total Users: ${overview.totalUsers}
- Active Users Today: ${overview.activeUsersToday}
- Active Users (7 days): ${overview.activeUsers7Days}
- Active Users (30 days): ${overview.activeUsers30Days}
- Total Messages: ${overview.totalMessages.toLocaleString()}
- Total Reports: ${overview.totalReports.toLocaleString()}
- Total Visualizations: ${overview.totalVisualizations.toLocaleString()}
- Average AI Response Time: ${overview.avgResponseTime.toFixed(0)}ms
- Error Rate: ${(overview.errorRate * 100).toFixed(2)}%
`;
  }

  // Daily Metrics Section
  if (dailyMetrics && dailyMetrics.length > 0) {
    context += `
DAILY ACTIVITY TRENDS (Last ${Math.min(7, dailyMetrics.length)} days):
`;
    const recentDays = dailyMetrics.slice(-7);
    recentDays.forEach(day => {
      context += `- ${day.metric_date}: ${day.daily_active_users} active users, ${day.total_messages} messages, ${day.total_reports} reports, ${day.total_visualizations} visualizations\n`;
    });

    // Calculate trends
    if (dailyMetrics.length >= 2) {
      const firstDay = dailyMetrics[0];
      const lastDay = dailyMetrics[dailyMetrics.length - 1];
      const userGrowth = ((lastDay.daily_active_users - firstDay.daily_active_users) / firstDay.daily_active_users * 100).toFixed(1);
      const messageGrowth = ((lastDay.total_messages - firstDay.total_messages) / firstDay.total_messages * 100).toFixed(1);

      context += `
TREND ANALYSIS:
- User Activity Trend: ${parseFloat(userGrowth) >= 0 ? '+' : ''}${userGrowth}% (from ${firstDay.metric_date} to ${lastDay.metric_date})
- Message Volume Trend: ${parseFloat(messageGrowth) >= 0 ? '+' : ''}${messageGrowth}% over period
`;
    }
  }

  // Milestones Section
  if (milestones && milestones.length > 0) {
    context += `
MILESTONE ACHIEVEMENT RATES:
`;
    milestones.forEach(milestone => {
      context += `- ${milestone.milestone_type}: ${milestone.users_achieved} users (${milestone.achievement_rate_pct.toFixed(1)}% achievement rate)\n`;
    });
  }

  // Performance Section
  if (performance && performance.length > 0) {
    context += `
AI PERFORMANCE METRICS (Recent):
`;
    const recentPerf = performance.slice(-7);
    recentPerf.forEach(perf => {
      context += `- ${perf.date} (${perf.mode}): ${perf.avg_response_ms.toFixed(0)}ms avg, ${(perf.success_rate * 100).toFixed(1)}% success, ${perf.total_requests} requests\n`;
    });

    // Calculate average performance
    const avgResponseTime = recentPerf.reduce((sum, p) => sum + p.avg_response_ms, 0) / recentPerf.length;
    const avgSuccessRate = recentPerf.reduce((sum, p) => sum + p.success_rate, 0) / recentPerf.length;

    context += `
PERFORMANCE SUMMARY:
- Average Response Time: ${avgResponseTime.toFixed(0)}ms
- Average Success Rate: ${(avgSuccessRate * 100).toFixed(1)}%
`;
  }

  context += `
INSTRUCTIONS:
- Analyze the metrics data to answer the user's question
- Provide specific numbers and percentages from the data
- Identify trends, patterns, and insights
- Compare different metrics when relevant
- Be concise but informative
- Use bullet points for clarity
- Highlight important findings or concerns
- Suggest actionable insights when appropriate

When answering questions:
1. Reference specific data points from above
2. Calculate percentages, ratios, and trends when helpful
3. Compare metrics over time or across categories
4. Provide context for what the numbers mean
5. Flag any concerning trends (high error rates, declining engagement, etc.)

Answer the user's question using the metrics data provided above.`;

  return context;
}

export async function getMetricsResponse(
  question: string,
  metricsData: MetricsData
): Promise<string> {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured. Please check your environment variables.');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const metricsContext = buildMetricsContext(metricsData);

    const result = await model.generateContent([
      { text: metricsContext },
      { text: `User question: ${question}` }
    ]);

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Error getting metrics response:', error);

    if (error?.message?.includes('API key')) {
      throw new Error('API configuration error. Please contact support.');
    }

    if (error?.message?.includes('quota') || error?.message?.includes('rate limit')) {
      throw new Error('Service is currently busy. Please try again in a moment.');
    }

    throw new Error('Unable to get response. Please check your connection and try again.');
  }
}
