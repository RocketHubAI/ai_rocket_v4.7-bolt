# User Metrics Dashboard - Complete Guide

**URL:** `astra.app/user-metrics`
**Access:** Super Admin Only
**Date:** 2025-11-20
**Status:** ✅ Deployed & Ready

---

## 🎯 Overview

The User Metrics Dashboard is a comprehensive analytics platform that provides real-time insights into user engagement, AI performance, and feature adoption. Built exclusively for super administrators, it combines powerful data visualization with AI-powered natural language querying through Astra.

### **Who Can Access:**
- clay@rockethub.ai
- derek@rockethub.ai
- marshall@rockethub.ai

All other users will see an "Access Denied" message.

---

## 📊 Dashboard Features

### **1. Overview Tab**

**Top Stats Cards:**
- **Total Users** - Total registered users in the system
- **Active Today** - Users active in the last 24 hours (with 7-day and 30-day counts)
- **Messages Sent** - Total chat messages in selected time range
- **Reports Generated** - Total reports created in selected time range
- **Visualizations** - Total visualizations saved
- **Avg Response Time** - Average AI response time in milliseconds
- **Error Rate** - Percentage of failed AI requests

**Daily Active Users Chart:**
- Interactive bar chart showing DAU over time
- Hover to see exact numbers for each day
- Automatically scales to fit data
- Shows last 7, 30, or 90 days based on filter

### **2. Engagement Tab**

Three separate charts showing trends for:
- **Messages Sent** - Daily message volume (orange gradient)
- **Reports Generated** - Daily report creation (purple gradient)
- **Visualizations Created** - Daily visualization saves (cyan gradient)

Each chart:
- Shows last 14 days of data
- Displays total count at the top
- Interactive hover tooltips
- Color-coded by feature

### **3. Performance Tab**

**Response Times by Mode:**
- **Chat Mode** - Private chat response times
- **Reports Mode** - Report generation times
- **Visualization Mode** - Visualization creation times

For each mode:
- Average response time in milliseconds
- Success rate percentage
- Progress bar visualization
- Green indicates healthy performance

### **4. Milestones Tab**

**Achievement Rates:**
Shows what percentage of users have achieved each milestone:
- First message sent
- First report created
- First visualization saved
- First document uploaded
- Gmail connected
- Google Drive connected
- And more...

Each milestone displays:
- Number of users achieved
- Percentage of total users
- Visual progress bar

### **5. Guide Tab**

Complete interactive documentation including:
- What metrics are being tracked
- How the system works
- Key features and benefits
- How to use the dashboard
- Sample queries and insights

### **6. Ask Astra Tab**

**AI-Powered Metrics Querying:**

Natural language interface to query metrics data:
- Type questions in plain English
- Astra queries live database
- Get instant insights
- No SQL knowledge required

**Example Questions:**
- "How many users were active last week?"
- "What's the average AI response time?"
- "Show me milestone achievement rates"
- "What are the engagement trends?"
- "Which features are most popular?"

**Suggested Questions Provided:**
- Pre-written queries you can click to use
- Covers common analytics needs
- Helps you learn what to ask

---

## 🔧 Technical Implementation

### **Components Created:**

1. **`UserMetricsDashboard.tsx`**
   - Main dashboard container
   - Tab navigation
   - Data fetching and state management
   - Chart rendering components
   - Time range filtering (7/30/90 days)

2. **`MetricsAskAstra.tsx`**
   - Natural language chat interface
   - Real-time AI responses
   - Suggested questions
   - Chat history
   - Loading states

3. **`ProtectedMetricsRoute.tsx`**
   - Super admin authentication check
   - Access denial screen
   - Loading state during verification
   - Automatic redirect for unauthorized users

### **Database Function:**

**`get_daily_metrics_aggregated()`**
- Aggregates daily metrics for fast queries
- Parameters: start_date, end_date
- Returns: daily stats with DAU, messages, reports, visualizations
- Security: Only accessible to super admins
- Performance: Pre-aggregated data = 10-100x faster

### **Route Configuration:**

**Path:** `/user-metrics`
**Protection:** `<ProtectedMetricsRoute>`
**Authentication Flow:**
1. Check if user is logged in
2. Verify email against super admin list
3. Show dashboard or access denied screen

---

## 🚀 How to Use

### **Accessing the Dashboard:**

1. Log in to Astra with super admin credentials
2. Navigate to: `https://astra.app/user-metrics`
3. Dashboard loads automatically

**Or manually enter URL:**
```
https://astra.app/user-metrics
```

### **Changing Time Range:**

Top right dropdown:
- **Last 7 Days** - Recent activity
- **Last 30 Days** - Monthly overview (default)
- **Last 90 Days** - Quarterly trends

All charts and stats update automatically.

### **Refreshing Data:**

Click the **"Refresh"** button (top right) to reload all metrics from the database.

### **Asking Astra Questions:**

1. Go to **"Ask Astra"** tab
2. Type your question in plain English
3. Press Enter or click Send
4. Wait for Astra's response (usually 3-10 seconds)
5. Ask follow-up questions for deeper analysis

**Pro Tips:**
- Be specific about time ranges ("last week", "this month")
- Ask about trends and comparisons
- Request breakdowns by feature or user segment
- Combine multiple metrics in one question

---

## 📈 Sample Queries & Use Cases

### **User Engagement Analysis:**

**Question:** "How many active users did we have each day last week?"
**Use Case:** Track daily engagement trends

**Question:** "What percentage of users have sent their first message?"
**Use Case:** Measure activation rate

**Question:** "Compare message volume to report generation"
**Use Case:** Understand feature usage balance

### **Performance Monitoring:**

**Question:** "What's our average AI response time by mode?"
**Use Case:** Identify slow endpoints

**Question:** "Show me error rates for the last 7 days"
**Use Case:** Detect system issues

**Question:** "Are response times improving or getting worse?"
**Use Case:** Track performance trends

### **Feature Adoption:**

**Question:** "Which features are most used?"
**Use Case:** Prioritize development resources

**Question:** "How many users have created visualizations?"
**Use Case:** Measure feature adoption

**Question:** "What's the retention rate for report users?"
**Use Case:** Understand long-term engagement

### **Business Intelligence:**

**Question:** "What's our week-over-week growth?"
**Use Case:** Board reporting

**Question:** "Identify our power users"
**Use Case:** Customer success outreach

**Question:** "Which onboarding milestone has the lowest completion?"
**Use Case:** Optimize onboarding flow

---

## 🎨 Visual Design

### **Color Scheme:**

- **Primary:** Orange gradient (brand color)
- **Background:** Dark gray (900-800)
- **Cards:** Gray 800 with subtle borders
- **Accents:**
  - Blue: Users and engagement
  - Orange: Messages and activity
  - Purple: Reports and analytics
  - Cyan: Visualizations
  - Green: Success and health
  - Red: Errors and warnings

### **Layout:**

- **Sticky Header:** Dashboard title, time filter, refresh button
- **Tab Navigation:** Easy switching between views
- **Grid Layouts:** Responsive cards adjust to screen size
- **Charts:** Full-width visualizations with hover interactions

### **Mobile Responsive:**

- Adapts to all screen sizes
- Touch-friendly tap targets
- Scrollable tabs
- Stacked cards on mobile

---

## 🔒 Security & Access Control

### **Super Admin Detection:**

```typescript
const SUPER_ADMIN_EMAILS = [
  'clay@rockethub.ai',
  'derek@rockethub.ai',
  'marshall@rockethub.ai'
];
```

### **Protection Layers:**

1. **Route Protection:** `<ProtectedMetricsRoute>` wrapper
2. **Email Verification:** Checks auth.user.email
3. **Database RLS:** Functions enforce super admin check
4. **UI Feedback:** Clear access denied message

### **Access Denied Screen:**

Non-super-admins see:
- Red alert icon
- "Access Denied" message
- Explanation of restriction
- "Go Back" button

### **Loading States:**

While checking permissions:
- Shield icon with pulse animation
- "Verifying permissions..." message

---

## 📊 Metrics Data Sources

### **Tables Queried:**

1. **`user_metrics_daily`**
   - Pre-aggregated daily stats per user
   - Messages, reports, visualizations counts
   - Session duration and count
   - Error count

2. **`user_milestones`**
   - First-time achievement tracking
   - Milestone types and dates
   - One per user per type

3. **`astra_performance_logs`**
   - AI response times
   - Success/failure rates
   - Error messages
   - Mode (chat/reports/viz)

4. **`users`**
   - Total user count
   - User metadata

5. **`astra_chats`** (indirect)
   - Referenced via performance logs
   - Used for detailed analysis

### **Data Freshness:**

- **Real-time:** Performance logs insert immediately
- **Batched:** Daily metrics flush every 60s or 10 events
- **Aggregated:** Dashboard queries pre-computed data
- **Live:** Ask Astra queries current database state

---

## 🛠️ Troubleshooting

### **Dashboard Won't Load:**

**Symptoms:** Blank screen or infinite loading
**Causes:**
- Not logged in
- Not a super admin
- Network error

**Solutions:**
1. Check you're logged in: See user icon in header
2. Verify your email: Must be clay@, derek@, or marshall@rockethub.ai
3. Check browser console for errors
4. Try refreshing the page
5. Clear cache and reload

### **No Data Showing:**

**Symptoms:** Charts empty, zeros everywhere
**Causes:**
- No users have generated metrics yet
- Time range filter too narrow
- Database connection issue

**Solutions:**
1. Use the app first (send messages, create reports)
2. Wait 60 seconds for metrics to flush
3. Expand time range to 30 or 90 days
4. Click Refresh button
5. Check browser console for errors

### **Ask Astra Not Responding:**

**Symptoms:** Message sends but no response
**Causes:**
- N8N webhook not configured
- AI service unavailable
- Network timeout

**Solutions:**
1. Check VITE_N8N_WEBHOOK_URL is set
2. Verify N8N is running and accessible
3. Try a simpler question
4. Wait and retry (may be temporary)
5. Check browser console for error details

### **Access Denied Even as Super Admin:**

**Symptoms:** See access denied screen
**Causes:**
- Email doesn't match exactly
- Logged in with different account
- RLS policy issue

**Solutions:**
1. Verify logged-in email: Should see it in header
2. Log out and back in with correct email
3. Check email spelling (case-sensitive)
4. Contact dev team if persists

---

## 📝 Future Enhancements (Roadmap)

### **Phase 1 - Visualization Improvements:**
- [ ] Export dashboard as PDF
- [ ] Download charts as images
- [ ] More chart types (line, pie, scatter)
- [ ] Date range picker (custom dates)
- [ ] Comparison mode (compare two time periods)

### **Phase 2 - Advanced Analytics:**
- [ ] Cohort analysis charts
- [ ] Retention curves
- [ ] Funnel visualization (signup → active → power user)
- [ ] User segmentation (by usage patterns)
- [ ] Churn prediction indicators

### **Phase 3 - Alerting & Automation:**
- [ ] Automated email reports (daily/weekly)
- [ ] Slack notifications for anomalies
- [ ] Custom alert thresholds
- [ ] Scheduled data exports
- [ ] Webhook integration for external tools

### **Phase 4 - Ask Astra Enhancements:**
- [ ] Chart generation from queries
- [ ] Export query results as CSV
- [ ] Save favorite questions
- [ ] Query templates library
- [ ] Multi-query comparisons

### **Phase 5 - Team Analytics:**
- [ ] Per-team breakdown
- [ ] Team comparison views
- [ ] Admin delegation (non-super admins)
- [ ] Team-specific reports
- [ ] Role-based access control

---

## 🎓 Best Practices

### **For Daily Use:**

1. **Check Daily:**
   - Open dashboard each morning
   - Review yesterday's active users
   - Check error rates for issues
   - Monitor response time trends

2. **Weekly Review:**
   - Compare week-over-week growth
   - Analyze feature adoption rates
   - Review milestone achievements
   - Ask Astra for weekly summaries

3. **Monthly Planning:**
   - Export key metrics for reports
   - Identify trends and patterns
   - Plan feature prioritization
   - Share insights with team

### **For Analysis:**

1. **Start Broad, Then Narrow:**
   - Begin with Overview tab
   - Identify interesting patterns
   - Drill into specific tabs
   - Ask Astra for details

2. **Compare Time Periods:**
   - Switch between 7/30/90 day views
   - Look for seasonal patterns
   - Identify growth or decline
   - Correlate with product changes

3. **Ask "Why" Questions:**
   - Don't just observe numbers
   - Use Ask Astra to understand causes
   - Look for correlations
   - Form hypotheses and test them

### **For Sharing:**

1. **Screenshot Best Practices:**
   - Use native screenshot tool
   - Capture full dashboard or specific charts
   - Annotate with arrows/text if needed
   - Share in Slack or presentations

2. **Reporting Tips:**
   - Lead with insights, not data
   - Use simple language
   - Show trends, not just snapshots
   - Connect metrics to business goals

---

## 📞 Support & Contact

### **Questions About Metrics:**
- Use "Ask Astra" tab for metric questions
- Review this guide first
- Check troubleshooting section

### **Technical Issues:**
- Check browser console for errors
- Screenshot the issue
- Note steps to reproduce
- Contact dev team with details

### **Feature Requests:**
- See "Future Enhancements" roadmap
- Suggest new features via feedback
- Prioritize most impactful additions

### **Super Admin Access:**
Currently limited to:
- clay@rockethub.ai
- derek@rockethub.ai
- marshall@rockethub.ai

To add new super admins, update:
- `ProtectedMetricsRoute.tsx` (SUPER_ADMIN_EMAILS)
- Database RLS policies (super admin checks)

---

## ✅ Success Metrics

The dashboard is successful if it:

- ✅ Loads in < 3 seconds
- ✅ Shows real-time data (< 60s delay)
- ✅ Charts are interactive and readable
- ✅ Ask Astra responds in < 10 seconds
- ✅ Access control works correctly
- ✅ Mobile experience is usable
- ✅ Enables data-driven decisions

---

## 🎉 You're Ready!

You now have:

1. **Complete Dashboard** - Comprehensive analytics at your fingertips
2. **AI Assistant** - Ask Astra for natural language querying
3. **Real-Time Data** - Up-to-date metrics within 60 seconds
4. **Secure Access** - Super admin protection
5. **Beautiful UI** - Intuitive and mobile-friendly design

**Navigate to:** `https://astra.app/user-metrics`

Start exploring your metrics and making data-driven decisions! 🚀

---

**Last Updated:** 2025-11-20
**Version:** 1.0.0
**Status:** ✅ Production Ready
