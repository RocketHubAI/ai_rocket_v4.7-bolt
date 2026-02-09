# Astra Intelligence User Metrics & Analytics

## Overview
This document outlines the comprehensive user metrics framework for measuring success, engagement, retention, and growth of Astra Intelligence.

---

## 1. Acquisition Metrics

### Sign-Up & Conversion
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Sign-Up Rate** | Number of new accounts created per day/week/month | Growing | Count of new users in `auth.users` |
| **Invite Code Conversion** | % of invite codes that result in sign-ups | >50% | Compare `invite_codes.times_used` vs distribution |
| **Time to Sign-Up** | Time from landing page to completed registration | <2 min | Track signup flow timestamps |
| **Sign-Up Completion Rate** | % of users who start vs complete registration | >80% | Track partial vs complete registrations |
| **Source Attribution** | Which channels drive sign-ups | Varies | UTM parameters or referral tracking |

### Invite System Performance
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Invite Code Usage** | Average uses per invite code | Varies | `invite_codes.times_used` / total codes |
| **Invite Code Expiration** | % of codes that expire unused | <20% | Count expired codes with 0 uses |
| **Admin Invite Rate** | % of admins who generate invite codes | >70% | Count admins with created codes |
| **Team Growth Rate** | Average team size over time | Growing | Count users per team over time |

---

## 2. Activation Metrics

### Initial Onboarding
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Onboarding Completion Rate** | % of users who complete all onboarding steps | >60% | Track completion of tour, settings, first message |
| **Time to First Message** | Time from sign-up to first AI conversation | <10 min | Compare `users.created_at` to first chat message |
| **Tour Completion Rate** | % of users who complete interactive tour | >40% | Track tour completion events |
| **Welcome Modal Interaction** | % of users who engage with welcome content | >90% | Track modal dismissal or CTA clicks |

### Feature Discovery (First Week)
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Private Mode Usage** | % of users who try private conversations | >80% | Check for private mode messages |
| **Team Mode Usage** | % of users who try team conversations | >50% | Check for team mode messages |
| **Visualization Created** | % of users who generate first visualization | >30% | Check `saved_visualizations` table |
| **@Mention Usage** | % of users who use @mentions | >20% | Parse messages for @mentions |
| **Settings Accessed** | % of users who open settings | >60% | Track settings modal opens |

### Data Source Connection (Admins)
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Gmail Connection Rate** | % of admins who connect Gmail | >50% | Check `gmail_auth` table |
| **Drive Connection Rate** | % of admins who connect Google Drive | >60% | Check `user_drive_connections` table |
| **Full Integration Rate** | % of admins who connect both Gmail & Drive | >40% | Cross-reference both tables |
| **Time to First Integration** | Time from sign-up to first data source connection | <24 hrs | Track connection timestamps |
| **Folder Configuration Rate** | % of Drive connections with folders selected | >90% | Check non-null folder fields |

---

## 3. Engagement Metrics

### Daily/Weekly/Monthly Active Users
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **DAU (Daily Active Users)** | Unique users who engage each day | Growing | Count distinct user sessions per day |
| **WAU (Weekly Active Users)** | Unique users who engage each week | Growing | Count distinct user sessions per week |
| **MAU (Monthly Active Users)** | Unique users who engage each month | Growing | Count distinct user sessions per month |
| **DAU/MAU Ratio** | Stickiness metric (how often users return) | >20% | DAU ÷ MAU |
| **WAU/MAU Ratio** | Weekly engagement rate | >60% | WAU ÷ MAU |

### Session Metrics
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Average Session Duration** | Mean time spent per session | >10 min | Track login to last activity |
| **Sessions Per User** | Average sessions per user per week | >3 | Count sessions per user |
| **Session Frequency** | Days between sessions | <3 days | Calculate time deltas |
| **Return Rate (Day 1)** | % of users who return next day | >30% | Track next-day logins |
| **Return Rate (Week 1)** | % of users who return in first week | >50% | Track week-1 activity |

### Message Activity
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Messages Per User** | Average messages sent per active user | >20/week | Count messages per user |
| **Messages Per Session** | Average messages per session | >5 | Messages ÷ sessions |
| **Private vs Team Ratio** | Distribution of private vs team messages | Varies | Count by chat mode |
| **Message Length** | Average character count per message | Varies | Calculate from message content |
| **Query Complexity** | Sophistication of user questions | Growing | AI analysis of queries |

### Feature Usage
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Visualization Generation Rate** | Visualizations created per active user | >2/week | Count from `saved_visualizations` |
| **Visualization Save Rate** | % of generated visualizations that are saved | >30% | Compare created vs saved |
| **Report Creation Rate** | Scheduled reports created per user | >1/user | Count from `scheduled_reports` |
| **Report Delivery Success** | % of scheduled reports delivered successfully | >95% | Track report generation success |
| **Favorite Usage** | Average favorites per user | >3 | Count favorites per user |
| **Help Center Access** | % of users who access help resources | >30% | Track help center opens |

### Collaboration Metrics
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Team Conversation Participation** | % of team members active in team chats | >70% | Count unique users per team chat |
| **@Mention Frequency** | Average @mentions per team conversation | >2 | Parse and count @mentions |
| **Group Chat Activity** | Messages in team mode vs private mode | Varies | Compare chat modes |
| **Team Response Time** | Average time for team member to respond | <2 hrs | Calculate message deltas |
| **Cross-User Collaboration** | Number of conversations with 2+ users | Growing | Count multi-participant chats |

---

## 4. Retention Metrics

### Cohort Retention
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Day 1 Retention** | % of users active 1 day after sign-up | >40% | Track next-day activity |
| **Day 7 Retention** | % of users active 7 days after sign-up | >30% | Track week-1 activity |
| **Day 30 Retention** | % of users active 30 days after sign-up | >20% | Track month-1 activity |
| **Day 90 Retention** | % of users active 90 days after sign-up | >15% | Track quarter-1 activity |
| **Cohort Analysis** | Retention curves by sign-up cohort | Improving | Group users by join date |

### Churn & Resurrection
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Churn Rate** | % of users who stop using the product | <10%/mo | Users inactive for 30+ days |
| **Resurrection Rate** | % of churned users who return | >15% | Reactivated after 30+ day gap |
| **Time to Churn** | Average days until user becomes inactive | >60 days | Calculate inactive timestamp |
| **Early Churn Rate** | % of users who churn in first week | <30% | Track week-1 dropoff |
| **Churn Reasons** | Why users leave (if surveyed) | Varies | Exit surveys or feedback |

### Power User Metrics
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Power User Ratio** | % of users with 20+ messages/week | >15% | Count high-frequency users |
| **Power User Retention** | Retention rate for power users | >80% | Track power user activity |
| **Feature Adoption Depth** | Number of features used regularly | >4 | Track feature usage per user |
| **Data Source Leverage** | % of queries that use connected data | >50% | Analyze query context |

---

## 5. Growth Metrics

### Viral & Referral
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Viral Coefficient (K-Factor)** | New users generated per existing user | >1.0 | New users ÷ existing users |
| **Invite Sharing Rate** | % of admins who share invite codes | >60% | Track code distribution |
| **Team Growth Rate** | New members added per team per month | >2 | Track team size over time |
| **Organic Sign-Ups** | Users who sign up without direct invite | Varies | Attribution tracking |
| **Word-of-Mouth Indicator** | Direct traffic or unattributed sign-ups | Growing | Source analysis |

### Network Effects
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Average Team Size** | Mean number of users per team | >3 | Average team membership |
| **Team Activity Correlation** | Does team size increase activity? | Positive | Regression analysis |
| **Multi-Team Users** | Users who join multiple teams | Track | Count teams per user |
| **Team Collaboration Index** | Measure of team interaction quality | Growing | Weighted activity score |

---

## 6. Data Integration Metrics

### Gmail Sync
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Gmail Connection Rate** | % of teams with Gmail connected | >50% | Check `gmail_auth` |
| **Email Sync Volume** | Average emails synced per team | Varies | Count from `company_emails` |
| **Sync Success Rate** | % of sync attempts that succeed | >95% | Track sync errors |
| **Sync Frequency** | How often sync runs successfully | Daily | Monitor sync timestamps |
| **Email Query Rate** | % of queries that reference email data | >20% | Analyze query context |
| **Token Refresh Success** | % of token refreshes that work | >98% | Track refresh function calls |

### Google Drive Sync
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Drive Connection Rate** | % of teams with Drive connected | >60% | Check `user_drive_connections` |
| **Document Sync Volume** | Average documents synced per team | Varies | Count from `documents` table |
| **Folder Configuration Rate** | % of connections with folders selected | >90% | Check folder fields |
| **Sync Success Rate** | % of sync attempts that succeed | >95% | Track sync errors |
| **Document Query Rate** | % of queries that reference documents | >25% | Analyze query context |
| **Financial Folder Usage** | % of connections using financial sync | >30% | Check `financial_sync_enabled` |

### Data Quality
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Vectorization Success** | % of documents successfully vectorized | >98% | Track vectorization errors |
| **Chunk Quality** | Average chunk size and quality | Optimal | Analyze `document_chunks` |
| **Search Relevance** | Quality of semantic search results | High | User feedback or AI eval |
| **Data Freshness** | Age of synced data | <24 hrs | Check `last_sync_at` |

---

## 7. Revenue & Business Metrics

### Monetization (Future)
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Free to Paid Conversion** | % of users who upgrade to paid | >10% | Track plan changes |
| **ARPU (Avg Revenue Per User)** | Average revenue per user | Growing | Revenue ÷ users |
| **MRR (Monthly Recurring Revenue)** | Predictable monthly revenue | Growing | Sum of subscriptions |
| **ARR (Annual Recurring Revenue)** | Annualized revenue | Growing | MRR × 12 |
| **LTV (Lifetime Value)** | Total revenue per user over lifetime | >10x CAC | Revenue per user cohort |
| **CAC (Customer Acquisition Cost)** | Cost to acquire one user | Decreasing | Marketing spend ÷ new users |
| **LTV:CAC Ratio** | Lifetime value to acquisition cost ratio | >3:1 | LTV ÷ CAC |

### Enterprise Metrics
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Team Seat Utilization** | % of paid seats actively used | >80% | Active users ÷ paid seats |
| **Team Expansion Revenue** | Revenue from growing team sizes | Growing | Track seat additions |
| **Enterprise Contract Value** | Average value of enterprise deals | Growing | Track deal sizes |
| **Net Revenue Retention** | Revenue retention + expansion | >100% | Period-over-period revenue |

---

## 8. Product Quality Metrics

### Performance
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Page Load Time** | Time to interactive | <2 sec | Browser performance API |
| **Message Send Latency** | Time to send message | <500ms | Client-side timing |
| **AI Response Time** | Time for AI to respond | <5 sec | Webhook response time |
| **Visualization Generation Time** | Time to create visualization | <10 sec | Track generation duration |
| **Real-Time Sync Latency** | Delay in message sync | <500ms | Supabase realtime metrics |

### Reliability
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Uptime** | % of time app is available | >99.5% | Monitoring service |
| **Error Rate** | % of requests that fail | <1% | Error tracking (Sentry) |
| **Message Delivery Rate** | % of messages successfully delivered | >99.9% | Database writes |
| **Sync Failure Rate** | % of data syncs that fail | <5% | Track sync errors |
| **API Success Rate** | % of external API calls that succeed | >95% | Track API responses |

### User Satisfaction
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Net Promoter Score (NPS)** | Likelihood to recommend (0-10) | >50 | In-app NPS survey |
| **Customer Satisfaction (CSAT)** | Satisfaction rating | >4.5/5 | Post-interaction surveys |
| **Feature Satisfaction** | Ratings per feature | >4.0/5 | Feature-specific surveys |
| **Feedback Submission Rate** | % of users who provide feedback | >20% | Track feedback modal usage |
| **Positive Feedback Ratio** | Positive vs negative feedback | >70% | Analyze feedback sentiment |

---

## 9. Support & Success Metrics

### Help & Support
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Help Center Usage** | % of users who access help | >30% | Track help center opens |
| **Help Assistant Usage** | % of users who use AI help | >15% | Track help conversation starts |
| **FAQ Effectiveness** | % of help sessions that resolve issue | >60% | Post-help surveys |
| **Support Ticket Volume** | Number of support requests | Decreasing | Track support tickets |
| **Time to Resolution** | Average time to resolve support issue | <24 hrs | Ticket resolution time |

### Feature Requests & Feedback
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Feature Request Volume** | Number of feature requests | Varies | Track from feedback system |
| **Feedback Quality** | Usefulness of feedback provided | High | Manual review |
| **Bug Report Rate** | Bugs reported per active user | Decreasing | Track bug submissions |
| **Enhancement Adoption** | Usage of newly released features | >30% | Track new feature usage |

---

## 10. Operational Metrics

### Database & Infrastructure
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Database Size** | Total database storage used | Monitored | Supabase dashboard |
| **Storage Growth Rate** | Rate of data accumulation | Sustainable | Track storage over time |
| **Query Performance** | Average database query time | <100ms | Database metrics |
| **Vector Search Performance** | Semantic search query time | <500ms | Track search queries |
| **Function Execution Time** | Edge function duration | <5 sec | Supabase function logs |

### Cost Metrics
| Metric | Description | Target | Tracking Method |
|--------|-------------|--------|-----------------|
| **Cost Per User** | Infrastructure cost per active user | Decreasing | Costs ÷ MAU |
| **Storage Cost Per GB** | Cost of data storage | Optimized | Supabase billing |
| **API Call Costs** | External API expenses | Controlled | API provider billing |
| **Bandwidth Usage** | Data transfer costs | Optimized | CDN/hosting metrics |

---

## Metric Implementation Priority

### Phase 1: Essential (Implement First)
1. ✅ Sign-up rate and completion
2. ✅ Time to first message
3. ✅ DAU/WAU/MAU
4. ✅ Messages per user
5. ✅ Retention (Day 1, 7, 30)
6. ✅ Data source connection rates
7. ✅ Error rates and uptime

### Phase 2: Growth (Implement Soon)
1. Feature usage metrics
2. Cohort retention analysis
3. Viral coefficient
4. Team growth rates
5. Power user identification
6. Churn prediction
7. NPS surveys

### Phase 3: Advanced (Implement Later)
1. Predictive analytics
2. ML-based insights
3. Advanced cohort analysis
4. Revenue forecasting
5. User journey mapping
6. A/B testing framework
7. Behavioral segmentation

---

## Recommended Analytics Stack

### Data Collection
- **Frontend**: Custom event tracking (React Context)
- **Backend**: Supabase database queries
- **Real-time**: Supabase Realtime subscriptions
- **External**: PostHog, Mixpanel, or Amplitude

### Data Storage
- **Operational**: Supabase PostgreSQL
- **Analytics**: Data warehouse (BigQuery, Snowflake)
- **Aggregated**: Internal dashboards

### Visualization & Reporting
- **Internal Dashboards**: Metabase, Grafana, or Superset
- **Business Intelligence**: Tableau, Looker, or Power BI
- **Custom**: In-app admin analytics panel

### Monitoring & Alerts
- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry, LogRocket
- **Performance**: New Relic, Datadog
- **Alerts**: PagerDuty, Slack notifications

---

## Dashboard Recommendations

### Executive Dashboard (Weekly Review)
- Total users and growth rate
- DAU/WAU/MAU trends
- Retention cohorts
- Data source connection rates
- Key engagement metrics
- NPS score

### Product Dashboard (Daily Check)
- Sign-ups and activations
- Feature usage rates
- Error rates and issues
- Support ticket volume
- User feedback highlights

### Growth Dashboard (Weekly Review)
- User acquisition channels
- Viral coefficient
- Team growth rates
- Invite code performance
- Conversion funnels

### Engineering Dashboard (Real-time)
- System uptime
- Error rates
- API performance
- Database metrics
- Edge function execution

---

## Success Benchmarks (6-Month Goals)

| Category | Metric | Target |
|----------|--------|--------|
| **Acquisition** | New sign-ups per week | 100+ |
| **Activation** | Time to first message | <5 min |
| **Engagement** | DAU/MAU ratio | >25% |
| **Retention** | Day 30 retention | >25% |
| **Integration** | Gmail + Drive connected | >50% of teams |
| **Collaboration** | Team mode usage | >60% of messages |
| **Quality** | NPS Score | >40 |
| **Reliability** | Uptime | >99.5% |

---

## Continuous Improvement Framework

1. **Weekly**: Review engagement and activation metrics
2. **Bi-weekly**: Analyze retention cohorts and churn
3. **Monthly**: Deep-dive into feature usage and satisfaction
4. **Quarterly**: Strategic review of all metrics and goals
5. **Ongoing**: Monitor real-time alerts and critical issues

---

*This metrics framework should evolve as Astra Intelligence grows and matures. Regularly review and adjust based on business priorities and product stage.*
