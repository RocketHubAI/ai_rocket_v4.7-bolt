import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailTemplates {
  [key: string]: {
    subject: string;
    getHtml: (name: string, inviteCode: string) => string;
  };
}

const featureContent = {
  sync_data: {
    title: 'Sync Your Data',
    tagline: 'AI that understands your entire team.',
    icon: '📊',
    summary: 'AI Rocket connects and vectorizes all of your company\'s documents, financials, meetings, and strategy files into an encrypted, real-time knowledge base, transforming raw data into comprehensive, actionable context for Astra.',
    benefits: [
      '<strong>Eliminate Data Silos:</strong> Allow Astra to access and process every file type (PDFs, Google Sheets, transcripts) from your connected storage.',
      '<strong>Real-Time Context:</strong> Data is continuously synced so Astra\'s insights are always based on the absolute latest company information.',
      '<strong>Mission Alignment:</strong> Every AI response is aligned with your documented core values, mission, and goals.',
      '<strong>Comprehensive Intelligence:</strong> Generate highly specific, relevant business answers with rich, unique data context.',
      '<strong>Data Security & Privacy:</strong> Your data remains on your system; AI Rocket only vectorizes and encrypts for secure AI processing.'
    ]
  },
  visualizations: {
    title: 'Visualizations',
    tagline: 'See your data, not just read it.',
    icon: '📈',
    summary: 'Effortlessly convert any chat response or raw data query into a custom, interactive graphic dashboard with the push of a button, making complex trends instantly understandable and shareable.',
    benefits: [
      '<strong>Instant Dashboard Creation:</strong> Transform complex text-based answers into a custom graphic dashboard with a single click.',
      '<strong>One-Click People Analyzer:</strong> Run an EOS People Analyzer visualization correlating leadership meeting transcripts against your core values.',
      '<strong>Prompt-Driven Reporting:</strong> Simply prompt for the metrics you care about, and Astra builds a live-updated, real-time dashboard.',
      '<strong>Insight Generation:</strong> Receive insights from the dashboard, not just raw metrics - understand the why behind the numbers.',
      '<strong>Team Clarity:</strong> Save and share custom visualizations ensuring everyone has access to consistently updated KPIs.'
    ]
  },
  collaboration: {
    title: 'Team Collaboration',
    tagline: 'Where AI is an active member of your team.',
    icon: '👥',
    summary: 'The integrated Team Chat replaces traditional communication platforms, giving Astra full access to conversation history and team data to instantly inject context-aware intelligence directly into your daily discussions.',
    benefits: [
      '<strong>Astra as a Team Member:</strong> Astra is an active participant in your team chat, ready to answer questions and provide intelligence.',
      '<strong>Context-Rich Discussions:</strong> Instantly pull an infinite amount of context (financials, strategy docs, past meetings) into team chat.',
      '<strong>Automated Chat Summaries:</strong> Generate a summary of the last seven days of team activity with a simple prompt.',
      '<strong>Gamified Onboarding:</strong> Maximize AI adoption with a gamified setup experience that guides new users to connect data and explore features.',
      '<strong>Centralized Communication:</strong> Integrate communication, AI interaction, and data insights into a single, secure interface.'
    ]
  },
  reports: {
    title: 'Automated Reports',
    tagline: 'Your business intelligence, delivered on your schedule.',
    icon: '📋',
    summary: 'Configure complex, context-rich reports - such as L10 analysis or financial summaries - with a single prompt and schedule them to be automatically delivered daily, weekly, or monthly.',
    benefits: [
      '<strong>Personalized Action Reports:</strong> Generate a Weekly Action Report summarizing your leadership meeting into a personalized dashboard.',
      '<strong>Set-It-and-Forget-It:</strong> Schedule any report to run on a recurring schedule, eliminating manual report preparation.',
      '<strong>Context-Aware News Briefs:</strong> Receive a Daily News Brief that understands your company and finds relevant external articles.',
      '<strong>Role-Based Delivery:</strong> Set up team reports ensuring every member receives their relevant, personalized version.',
      '<strong>Audit-Ready Traceability:</strong> Reports cite all source documents, giving you a full, transparent path to the information.'
    ]
  },
  guided_prompts: {
    title: 'Guided Prompts & Reports',
    tagline: 'AI that asks the right questions for your business.',
    icon: '💡',
    summary: 'Astra intelligently guides you with context-aware prompts and pre-built report templates based on your team\'s connected data, eliminating guesswork and delivering actionable insights from the moment you start.',
    benefits: [
      '<strong>Data-Driven Suggestions:</strong> Astra analyzes your synced documents, meetings, and financials to suggest the most relevant questions and reports for your business.',
      '<strong>Pre-Built Report Templates:</strong> Access a library of proven report formats (L10 analysis, financial summaries, team performance) that automatically pull from your data.',
      '<strong>Personalized for Your Team:</strong> Guided prompts adapt to your industry, company size, and connected data sources - no generic templates.',
      '<strong>Instant Context:</strong> Skip the setup - Astra already knows your core values, goals, and team structure to deliver relevant insights immediately.',
      '<strong>Learn as You Go:</strong> Guided prompts teach best practices for AI-powered business analysis while delivering real results for your team.'
    ]
  }
};

function getCountdownValues(): { days: number; hours: number; minutes: number; seconds: number } {
  const targetDate = new Date('2026-01-15T00:00:00Z').getTime();
  const now = Date.now();
  const diff = targetDate - now;
  return {
    days: Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))),
    hours: Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
    minutes: Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))),
    seconds: Math.max(0, Math.floor((diff % (1000 * 60)) / 1000))
  };
}

function getBaseStyles(): string {
  return `
    body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #e5e7eb !important; margin: 0 !important; padding: 0 !important; background-color: #0A0F1C !important; }
    .container { max-width: 640px; margin: 40px auto; background-color: #0A0F1C !important; border-radius: 20px; overflow: hidden; }
    .email-wrapper { background-color: #0A0F1C !important; padding: 20px; }
    .header { background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%); color: white; padding: 48px 30px 40px; text-align: center; position: relative; }
    .brand-section { position: relative; z-index: 1; }
    .rocket-icon { display: inline-block; width: 64px; height: 64px; background: linear-gradient(145deg, #5BA4E6, #3B82C4); border-radius: 16px; font-size: 36px; line-height: 64px; text-align: center; margin-bottom: 12px; box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4); }
    .brand-name { font-size: 42px; font-weight: 800; color: white; margin: 8px 0 4px; letter-spacing: -0.5px; }
    .brand-tagline { font-size: 14px; color: #6b7280; letter-spacing: 1px; margin-bottom: 24px; }
    .challenge-title { font-size: 28px; font-weight: 800; color: #fbbf24; margin: 0; }
    .content { padding: 40px 30px; background: #131B2E; }
    .greeting { font-size: 22px; font-weight: 600; color: #f3f4f6; margin-bottom: 16px; }
    .message { font-size: 16px; color: #9ca3af; margin-bottom: 24px; line-height: 1.7; }
    .feature-highlight { background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(16, 185, 129, 0.1)); border: 2px solid #f97316; border-radius: 20px; padding: 32px; margin: 32px 0; text-align: center; }
    .feature-icon { font-size: 56px; margin-bottom: 16px; }
    .feature-title { font-size: 28px; font-weight: 800; color: #f3f4f6; margin-bottom: 8px; }
    .feature-tagline { font-size: 18px; color: #f97316; font-weight: 600; margin-bottom: 20px; }
    .feature-summary { font-size: 15px; color: #d1d5db; line-height: 1.8; text-align: left; margin-bottom: 24px; }
    .benefits-list { list-style: none; padding: 0; margin: 0; text-align: left; }
    .benefits-list li { padding: 14px 0; color: #d1d5db; border-bottom: 1px solid rgba(71, 85, 105, 0.5); font-size: 14px; line-height: 1.6; }
    .benefits-list li:last-child { border-bottom: none; }
    .benefits-list li strong { color: #f3f4f6; }
    .check-icon { color: #10b981; font-weight: bold; font-size: 16px; margin-right: 10px; }
    .share-section { background: linear-gradient(135deg, rgba(59, 130, 196, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid rgba(59, 130, 196, 0.3); border-radius: 16px; padding: 24px; margin: 32px 0; text-align: center; }
    .share-title { font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 8px; }
    .share-subtitle { font-size: 14px; color: #9ca3af; margin-bottom: 16px; }
    .share-link { display: inline-block; color: #5BA4E6; font-weight: 600; text-decoration: none; }
    .countdown-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(249, 115, 22, 0.3); }
    .countdown-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 2px; margin-bottom: 16px; }
    .countdown-note { font-size: 11px; color: #64748b; margin-top: 12px; font-style: italic; }
    .countdown-table { width: 100%; border-collapse: separate; border-spacing: 6px; }
    .countdown-cell { background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 10px; padding: 12px 4px; text-align: center; width: 25%; }
    .countdown-value { font-size: 24px; font-weight: 800; color: #f97316; font-family: 'Courier New', monospace; line-height: 1; }
    .countdown-unit { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
    .invite-box { background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(16, 185, 129, 0.1)); border: 2px solid #f97316; border-radius: 20px; padding: 24px 16px; margin: 32px 0; text-align: center; }
    .launch-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 2px; margin-bottom: 16px; }
    .launch-code { font-size: 32px; font-weight: 700; color: #f97316; font-family: 'Courier New', monospace; letter-spacing: 4px; margin-bottom: 16px; word-break: break-all; }
    .valid-date { display: inline-block; background: rgba(251, 191, 36, 0.15); color: #fbbf24; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 25px; margin-top: 8px; }
    .stats-section { margin: 32px 0; }
    .stats-table { width: 100%; border-collapse: separate; border-spacing: 6px; }
    .stat-cell { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 2px solid #475569; border-radius: 12px; padding: 16px 8px; text-align: center; width: 25%; vertical-align: top; }
    .stat-value { font-size: 22px; font-weight: 800; color: white; margin-bottom: 4px; height: 28px; line-height: 28px; display: block; }
    .stat-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; display: block; }
    .cta-container { text-align: center; margin: 36px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #10b981 100%); color: white; padding: 18px 52px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 8px 32px rgba(249, 115, 22, 0.35); }
    .footer { background: #0A0F1C; padding: 32px 30px; text-align: center; border-top: 1px solid #1e293b; }
    .footer p { font-size: 14px; color: #64748b; margin: 0 0 16px; }
    .footer a { color: #f97316; text-decoration: none; font-weight: 500; }
    @media only screen and (min-width: 480px) {
      .invite-box { padding: 36px; }
      .launch-code { font-size: 40px; letter-spacing: 6px; }
      .countdown-cell { padding: 16px 8px; border-radius: 12px; }
      .countdown-value { font-size: 32px; }
      .countdown-unit { font-size: 9px; letter-spacing: 1px; margin-top: 8px; }
      .stats-table { border-spacing: 10px; }
      .stat-cell { border-radius: 16px; padding: 24px 16px; }
      .stat-value { font-size: 32px; height: 40px; line-height: 40px; margin-bottom: 8px; }
      .stat-label { font-size: 11px; letter-spacing: 1px; }
    }
  `;
}

function getHeroHeader(): string {
  return `
    <div class="header">
      <div class="brand-section">
        <div class="rocket-icon">&#128640;</div>
        <div class="brand-name">AI Rocket</div>
        <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
        <h1 class="challenge-title">$5M AI Moonshot Challenge</h1>
      </div>
    </div>
  `;
}

function getCountdownHtml(): string {
  const countdown = getCountdownValues();
  return `
    <div class="countdown-section">
      <div class="countdown-label">Time Until Launch</div>
      <table class="countdown-table">
        <tr>
          <td class="countdown-cell">
            <div class="countdown-value">${countdown.days}</div>
            <div class="countdown-unit">Days</div>
          </td>
          <td class="countdown-cell">
            <div class="countdown-value">${countdown.hours}</div>
            <div class="countdown-unit">Hours</div>
          </td>
          <td class="countdown-cell">
            <div class="countdown-value">${countdown.minutes}</div>
            <div class="countdown-unit">Minutes</div>
          </td>
          <td class="countdown-cell">
            <div class="countdown-value">${countdown.seconds}</div>
            <div class="countdown-unit">Seconds</div>
          </td>
        </tr>
      </table>
      <div class="countdown-note">Countdown as of when this email was sent</div>
    </div>
  `;
}

function getStatsSection(): string {
  return `
    <div class="stats-section">
      <table class="stats-table">
        <tr>
          <td class="stat-cell">
            <div class="stat-value">$5M</div>
            <div class="stat-label">Prize Pool</div>
          </td>
          <td class="stat-cell">
            <div class="stat-value">300</div>
            <div class="stat-label">Team Slots</div>
          </td>
          <td class="stat-cell">
            <div class="stat-value">90</div>
            <div class="stat-label">Days Free</div>
          </td>
          <td class="stat-cell">
            <div class="stat-value">10</div>
            <div class="stat-label">Winners</div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function getLaunchCodeBox(inviteCode: string): string {
  return `
    <div class="invite-box">
      <div class="launch-label">Your Unique Launch Code</div>
      <div class="launch-code">${inviteCode}</div>
      <div class="valid-date">Valid Starting January 15, 2026</div>
      ${getCountdownHtml()}
    </div>
  `;
}

function getShareSection(): string {
  return `
    <div class="share-section">
      <div class="share-title">Know an Entrepreneur Who Needs AI for their Team?</div>
      <div class="share-subtitle">Share the love and send them this challenge info, they will thank you!</div>
      <a href="https://airocket.app/moonshot" class="share-link">airocket.app/moonshot</a>
    </div>
  `;
}

function getFooter(): string {
  return `
    <div class="footer">
      <p>Questions? Visit <a href="https://airocket.app/moonshot">the Challenge page</a> for FAQs and details.</p>
      <p style="margin-top: 16px;"><span style="font-size: 18px;">&#128640;</span> <a href="https://airocket.app">AI Rocket</a> <span style="color: #475569;">by RocketHub.AI</span></p>
      <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #1e293b;">
        <a href="{{unsubscribeUrl}}" style="color: #64748b; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  `;
}

const emailTemplates: EmailTemplates = {
  countdown_2_days: {
    subject: 'Moonshot Challenge: 2 DAYS Until Launch - Your Launch Code Inside!',
    getHtml: (name: string, inviteCode: string) => generateCountdownWithFeaturesEmail(name, inviteCode, '2 DAYS')
  },
  countdown_1_day: {
    subject: 'Moonshot Challenge: TOMORROW is Launch Day - Get Ready!',
    getHtml: (name: string, inviteCode: string) => generateCountdownWithFeaturesEmail(name, inviteCode, '1 DAY')
  },
  launch_live: {
    subject: 'Moonshot Challenge: IT\'S LIVE! Create Your Account NOW',
    getHtml: (name: string, inviteCode: string) => generateLaunchLiveEmail(name, inviteCode)
  },
  feature_connected_data: {
    subject: 'Moonshot Challenge: Sync Your Data - AI That Understands Your Team',
    getHtml: (name: string, inviteCode: string) => generateFeatureEmail(name, inviteCode, featureContent.sync_data)
  },
  feature_visualizations: {
    subject: 'Moonshot Challenge: Visualizations - See Your Data, Not Just Read It',
    getHtml: (name: string, inviteCode: string) => generateFeatureEmail(name, inviteCode, featureContent.visualizations)
  },
  feature_collaboration: {
    subject: 'Moonshot Challenge: Team Collaboration - AI as Your Team Member',
    getHtml: (name: string, inviteCode: string) => generateFeatureEmail(name, inviteCode, featureContent.collaboration)
  },
  feature_reports: {
    subject: 'Moonshot Challenge: Automated Reports - Intelligence on Your Schedule',
    getHtml: (name: string, inviteCode: string) => generateFeatureEmail(name, inviteCode, featureContent.reports)
  },
  feature_guided_prompts: {
    subject: 'Moonshot Challenge: Guided Prompts & Reports - AI That Knows Your Business',
    getHtml: (name: string, inviteCode: string) => generateFeatureEmail(name, inviteCode, featureContent.guided_prompts)
  },
  countdown_4_weeks: {
    subject: 'Moonshot Challenge: 4 Weeks Until Launch!',
    getHtml: (name: string, inviteCode: string) => generateCountdownEmail(name, inviteCode, '4 weeks', 'The countdown begins! In just 4 weeks, you\'ll be able to use your launch code and join the $5M Moonshot Challenge.')
  },
  countdown_3_weeks: {
    subject: 'Moonshot Challenge: 3 Weeks Until Launch!',
    getHtml: (name: string, inviteCode: string) => generateCountdownEmail(name, inviteCode, '3 weeks', 'Time is flying! Only 3 weeks until you can launch your AI Rocket and compete for $5M in prizes.')
  },
  countdown_2_weeks: {
    subject: 'Moonshot Challenge: 2 Weeks Until Launch!',
    getHtml: (name: string, inviteCode: string) => generateCountdownEmail(name, inviteCode, '2 weeks', 'We\'re halfway through the countdown! Just 2 weeks until the Moonshot Challenge officially begins.')
  },
  countdown_1_week: {
    subject: 'Moonshot Challenge: 1 Week Until Launch!',
    getHtml: (name: string, inviteCode: string) => generateCountdownEmail(name, inviteCode, '1 week', 'The final stretch! In just 7 days, you\'ll be able to create your account and start your AI transformation journey.')
  },
  countdown_tomorrow: {
    subject: 'Moonshot Challenge: Tomorrow is Launch Day!',
    getHtml: (name: string, inviteCode: string) => generateCountdownEmail(name, inviteCode, 'tomorrow', 'This is it! Tomorrow, January 15, 2026, the Moonshot Challenge officially launches. Be ready to create your account the moment it opens!')
  },
  launch_day: {
    subject: 'Moonshot Challenge: IT\'S LAUNCH DAY! Create Your Account Now',
    getHtml: (name: string, inviteCode: string) => generateLaunchDayEmail(name, inviteCode)
  },
  feature_catchup: {
    subject: 'Moonshot Challenge: Everything You Need to Know About AI Rocket',
    getHtml: (name: string, inviteCode: string) => generateFeatureCatchupEmail(name, inviteCode)
  }
};

function generateCountdownWithFeaturesEmail(name: string, inviteCode: string, daysLabel: string): string {
  const firstName = name.split(' ')[0];
  const countdown = getCountdownValues();
  const topFeatures = [
    featureContent.sync_data,
    featureContent.visualizations,
    featureContent.reports
  ];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
          .countdown-hero { text-align: center; margin-bottom: 32px; padding: 32px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(16, 185, 129, 0.1)); border-radius: 20px; border: 2px solid rgba(249, 115, 22, 0.3); }
          .countdown-hero-number { font-size: 72px; font-weight: 900; color: #f97316; line-height: 1; margin-bottom: 8px; }
          .countdown-hero-label { font-size: 24px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 2px; }
          .feature-grid { margin: 32px 0; }
          .feature-mini { background: #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid #334155; }
          .feature-mini-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .feature-mini-icon { font-size: 32px; }
          .feature-mini-title { font-size: 18px; font-weight: 700; color: #f3f4f6; }
          .feature-mini-tagline { font-size: 14px; color: #f97316; font-weight: 600; margin-bottom: 8px; }
          .feature-mini-summary { font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0; }
          .what-is-section { background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 28px; margin: 32px 0; border: 1px solid #334155; }
          .what-is-title { font-size: 20px; font-weight: 700; color: #f3f4f6; margin-bottom: 16px; text-align: center; }
          .what-is-text { font-size: 15px; color: #d1d5db; line-height: 1.7; margin-bottom: 16px; }
          .what-is-list { list-style: none; padding: 0; margin: 0; }
          .what-is-list li { padding: 10px 0; color: #d1d5db; font-size: 14px; display: flex; align-items: flex-start; gap: 10px; }
          .what-is-list li::before { content: "✓"; color: #10b981; font-weight: bold; flex-shrink: 0; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div class="countdown-hero">
                <div class="countdown-hero-number">${daysLabel}</div>
                <div class="countdown-hero-label">Until Launch</div>
              </div>

              <div class="greeting">Hi ${firstName}!</div>
              <div class="message">
                The $5M Moonshot Challenge launches on <strong style="color: #fbbf24;">January 15, 2026</strong>! You're registered and your launch code is ready. Here's what you need to know.
              </div>

              <div class="invite-box">
                <div class="launch-label">Your Launch Code</div>
                <div class="launch-code">${inviteCode}</div>
                <div class="valid-date">Use this code on January 15th to create your account</div>
                <div class="countdown-section" style="margin-top: 24px; padding-top: 20px;">
                  <div class="countdown-label">Exact Time Until Launch</div>
                  <table class="countdown-table">
                    <tr>
                      <td class="countdown-cell">
                        <div class="countdown-value">${countdown.days}</div>
                        <div class="countdown-unit">Days</div>
                      </td>
                      <td class="countdown-cell">
                        <div class="countdown-value">${countdown.hours}</div>
                        <div class="countdown-unit">Hours</div>
                      </td>
                      <td class="countdown-cell">
                        <div class="countdown-value">${countdown.minutes}</div>
                        <div class="countdown-unit">Minutes</div>
                      </td>
                      <td class="countdown-cell">
                        <div class="countdown-value">${countdown.seconds}</div>
                        <div class="countdown-unit">Seconds</div>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="what-is-section">
                <div class="what-is-title">What is the Moonshot Challenge?</div>
                <div class="what-is-text">
                  The $5M AI Moonshot Challenge gives 300 entrepreneurial teams 90 days of FREE unlimited access to AI Rocket - the AI platform built specifically for business teams.
                </div>
                <ul class="what-is-list">
                  <li><strong style="color: #f3f4f6;">$5M Prize Pool</strong> - Top 10 teams share in the winnings</li>
                  <li><strong style="color: #f3f4f6;">90 Days FREE</strong> - Full unlimited access, no credit card required</li>
                  <li><strong style="color: #f3f4f6;">Only 300 Spots</strong> - First come, first served on launch day</li>
                  <li><strong style="color: #f3f4f6;">Real Business Results</strong> - Winners judged on actual AI-driven outcomes</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <div style="font-size: 13px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 2px; margin-bottom: 20px;">3 Powerful Features You'll Get Access To</div>
              </div>

              <div class="feature-grid">
                ${topFeatures.map(f => `
                  <div class="feature-mini">
                    <div class="feature-mini-header">
                      <span class="feature-mini-icon">${f.icon}</span>
                      <span class="feature-mini-title">${f.title}</span>
                    </div>
                    <div class="feature-mini-tagline">${f.tagline}</div>
                    <p class="feature-mini-summary">${f.summary}</p>
                  </div>
                `).join('')}
              </div>

              ${getStatsSection()}

              <div class="cta-container">
                <a href="https://airocket.app/moonshot" class="cta-button">
                  View Full Challenge Details
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateLaunchLiveEmail(name: string, inviteCode: string): string {
  const firstName = name.split(' ')[0];
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
          .live-badge { display: inline-block; background: linear-gradient(135deg, #ef4444, #f97316); color: white; font-size: 14px; font-weight: 800; padding: 8px 24px; border-radius: 25px; text-transform: uppercase; letter-spacing: 2px; animation: pulse 2s infinite; margin-bottom: 16px; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
          .launch-hero { text-align: center; margin-bottom: 32px; padding: 40px 24px; background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(16, 185, 129, 0.15)); border-radius: 24px; border: 3px solid #f97316; }
          .launch-hero-title { font-size: 42px; font-weight: 900; color: #fbbf24; margin: 0 0 8px 0; line-height: 1.1; }
          .launch-hero-subtitle { font-size: 20px; color: #10b981; font-weight: 600; margin: 0; }
          .urgency-banner { background: linear-gradient(90deg, #7c2d12, #422006); border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
          .urgency-text { color: #fbbf24; font-weight: 700; font-size: 18px; margin: 0; }
          .urgency-subtext { color: #fcd34d; font-size: 14px; margin-top: 8px; }
          .code-box-live { background: linear-gradient(135deg, #0f172a, #1e293b); border: 4px solid #f97316; border-radius: 24px; padding: 40px 24px; margin: 32px 0; text-align: center; box-shadow: 0 0 60px rgba(249, 115, 22, 0.3); }
          .code-label { font-size: 14px; text-transform: uppercase; color: #fbbf24; font-weight: 800; letter-spacing: 3px; margin-bottom: 16px; }
          .code-value { font-size: 48px; font-weight: 900; color: #f97316; font-family: 'Courier New', monospace; letter-spacing: 8px; margin-bottom: 24px; word-break: break-all; }
          .create-button { display: inline-block; background: linear-gradient(135deg, #f97316 0%, #10b981 100%); color: white; padding: 20px 60px; border-radius: 50px; text-decoration: none; font-weight: 800; font-size: 20px; box-shadow: 0 8px 40px rgba(249, 115, 22, 0.5); text-transform: uppercase; letter-spacing: 1px; }
          .steps-section { background: #1e293b; border-radius: 20px; padding: 32px; margin: 32px 0; }
          .steps-title { font-size: 22px; font-weight: 800; color: #f3f4f6; margin-bottom: 24px; text-align: center; }
          .step-row { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
          .step-row:last-child { margin-bottom: 0; }
          .step-num { background: linear-gradient(135deg, #f97316, #10b981); color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; flex-shrink: 0; }
          .step-text { color: #e5e7eb; font-size: 16px; line-height: 1.5; padding-top: 6px; }
          .step-text strong { color: #f97316; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div class="launch-hero">
                <span class="live-badge">LIVE NOW</span>
                <h2 class="launch-hero-title">The Challenge Has Begun!</h2>
                <p class="launch-hero-subtitle">Create your account and claim your spot</p>
              </div>

              <div class="greeting">${firstName}, this is it!</div>
              <div class="message">
                Today is <strong style="color: #fbbf24;">January 15, 2026</strong> - the $5M Moonshot Challenge is officially LIVE. Your launch code is active and ready to use. Create your account now before the 300 spots fill up!
              </div>

              <div class="urgency-banner">
                <p class="urgency-text">Only 300 Team Spots Available!</p>
                <p class="urgency-subtext">First come, first served - don't wait!</p>
              </div>

              <div class="code-box-live">
                <div class="code-label">Your Launch Code</div>
                <div class="code-value">${inviteCode}</div>
                <a href="https://airocket.app" class="create-button">Create My Account</a>
              </div>

              <div class="steps-section">
                <div class="steps-title">How to Get Started</div>
                <div class="step-row">
                  <span class="step-num">1</span>
                  <span class="step-text">Click the button above to go to <strong>airocket.app</strong></span>
                </div>
                <div class="step-row">
                  <span class="step-num">2</span>
                  <span class="step-text">Click <strong>"Sign Up"</strong> and enter your email address</span>
                </div>
                <div class="step-row">
                  <span class="step-num">3</span>
                  <span class="step-text">Enter your launch code: <strong>${inviteCode}</strong></span>
                </div>
                <div class="step-row">
                  <span class="step-num">4</span>
                  <span class="step-text">Set up your team and start your <strong>90 days of FREE</strong> unlimited access!</span>
                </div>
              </div>

              ${getStatsSection()}

              <div class="message" style="text-align: center; font-size: 18px; color: #d1d5db;">
                Good luck in the Challenge! We can't wait to see what you and your team accomplish.
              </div>

              <div class="cta-container">
                <a href="https://airocket.app" class="cta-button">
                  Create Your Account Now
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateFeatureEmail(name: string, inviteCode: string, feature: { title: string; tagline: string; icon: string; summary: string; benefits: string[] }): string {
  const firstName = name.split(' ')[0];
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div class="greeting">Hi ${firstName}!</div>
              <div class="message">
                Here's a preview of one of the powerful features you'll have access to when the Moonshot Challenge launches.
              </div>

              <div class="feature-highlight">
                <div class="feature-icon">${feature.icon}</div>
                <div class="feature-title">${feature.title}</div>
                <div class="feature-tagline">${feature.tagline}</div>
                <p class="feature-summary">${feature.summary}</p>
                <ul class="benefits-list">
                  ${feature.benefits.map(b => `<li><span class="check-icon">&#10003;</span>${b}</li>`).join('')}
                </ul>
              </div>

              ${getLaunchCodeBox(inviteCode)}

              ${getStatsSection()}

              <div class="cta-container">
                <a href="https://airocket.app/moonshot" class="cta-button">
                  View Challenge Details
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateCountdownEmail(name: string, inviteCode: string, timeLeft: string, message: string): string {
  const firstName = name.split(' ')[0];
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
          .countdown-hero { font-size: 56px; font-weight: 800; color: #fbbf24; text-transform: uppercase; margin: 16px 0; }
          .countdown-hero-label { font-size: 18px; color: rgba(255,255,255,0.9); }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div style="text-align: center; margin-bottom: 32px;">
                <div class="countdown-hero">${timeLeft}</div>
                <div class="countdown-hero-label">Until Launch</div>
              </div>

              <div class="greeting">Hi ${firstName}!</div>
              <div class="message">${message}</div>
              <div class="message">Remember: Only the first 300 teams to launch their AI Rockets will enter the Challenge with 90 days FREE unlimited access. Be ready!</div>

              ${getLaunchCodeBox(inviteCode)}

              ${getStatsSection()}

              <div class="cta-container">
                <a href="https://airocket.app/moonshot" class="cta-button">
                  View Challenge Details
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateFeatureCatchupEmail(name: string, inviteCode: string): string {
  const firstName = name.split(' ')[0];
  const allFeatures = [
    featureContent.sync_data,
    featureContent.visualizations,
    featureContent.collaboration,
    featureContent.reports,
    featureContent.guided_prompts
  ];

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
          .feature-card { background: #1e293b; border-radius: 16px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155; }
          .feature-card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
          .feature-card-icon { font-size: 36px; }
          .feature-card-title { font-size: 20px; font-weight: 700; color: #f3f4f6; }
          .feature-card-tagline { font-size: 14px; color: #f97316; font-weight: 600; margin-bottom: 12px; }
          .feature-card-summary { font-size: 14px; color: #9ca3af; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div class="greeting">Hi ${firstName}!</div>
              <div class="message">
                Thanks for registering for the $5M Moonshot Challenge! Since you joined closer to launch day, we've put together this comprehensive guide to all the powerful features you'll have access to. Get ready to transform your business with AI!
              </div>

              ${allFeatures.map(f => `
                <div class="feature-card">
                  <div class="feature-card-header">
                    <span class="feature-card-icon">${f.icon}</span>
                    <span class="feature-card-title">${f.title}</span>
                  </div>
                  <div class="feature-card-tagline">${f.tagline}</div>
                  <p class="feature-card-summary">${f.summary}</p>
                </div>
              `).join('')}

              ${getLaunchCodeBox(inviteCode)}

              ${getStatsSection()}

              <div class="message" style="text-align: center; margin-top: 24px;">
                Remember: Only the first 300 teams get 90 days of FREE unlimited access. Be ready to create your account on January 15th!
              </div>

              <div class="cta-container">
                <a href="https://airocket.app/moonshot" class="cta-button">
                  View Challenge Details
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateLaunchDayEmail(name: string, inviteCode: string): string {
  const firstName = name.split(' ')[0];
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          ${getBaseStyles()}
          .launch-hero { text-align: center; margin-bottom: 32px; }
          .launch-hero h2 { font-size: 36px; font-weight: 800; color: #fbbf24; margin: 0 0 8px 0; }
          .launch-hero p { font-size: 18px; color: #10b981; margin: 0; }
          .urgency-box { background: #422006; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center; }
          .urgency-text { color: #fbbf24; font-weight: 600; font-size: 16px; margin: 0; }
          .steps-box { background: #1e293b; border-radius: 16px; padding: 24px; margin: 24px 0; }
          .steps-title { font-size: 18px; font-weight: 700; color: #f3f4f6; margin-bottom: 16px; }
          .step-item { display: flex; gap: 12px; margin-bottom: 12px; color: #d1d5db; font-size: 15px; }
          .step-number { background: linear-gradient(135deg, #f97316, #10b981); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            ${getHeroHeader()}
            <div class="content">
              <div class="launch-hero">
                <h2>IT'S LAUNCH DAY!</h2>
                <p>The $5M Moonshot Challenge Starts NOW</p>
              </div>

              <div class="greeting">The moment is here, ${firstName}!</div>
              <div class="message">Today is January 15, 2026 - the day you've been waiting for. The Moonshot Challenge is officially LIVE and you can create your account right now!</div>

              <div class="invite-box" style="border-width: 3px;">
                <div class="launch-label">Use Your Launch Code NOW</div>
                <div class="launch-code">${inviteCode}</div>
                <a href="https://airocket.app" class="cta-button" style="margin-top: 20px;">Create Your Account</a>
              </div>

              <div class="urgency-box">
                <p class="urgency-text">Only 300 team slots available! First come, first served.</p>
              </div>

              <div class="steps-box">
                <div class="steps-title">What to do right now:</div>
                <div class="step-item">
                  <span class="step-number">1</span>
                  <span>Click the button above to go to AI Rocket</span>
                </div>
                <div class="step-item">
                  <span class="step-number">2</span>
                  <span>Click "Sign Up" and enter your email</span>
                </div>
                <div class="step-item">
                  <span class="step-number">3</span>
                  <span>Enter your launch code: <strong style="color: #f97316;">${inviteCode}</strong></span>
                </div>
                <div class="step-item">
                  <span class="step-number">4</span>
                  <span>Set up your team and start your AI transformation!</span>
                </div>
              </div>

              ${getStatsSection()}

              <div class="message" style="text-align: center;">Good luck in the Challenge. We can't wait to see what you build!</div>

              <div class="cta-container">
                <a href="https://airocket.app" class="cta-button">
                  Create Your Account Now
                </a>
              </div>

              ${getShareSection()}
            </div>
            ${getFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
}

interface TestEmailRequest {
  testMode: boolean;
  emailType: string;
  email: string;
  name: string;
  inviteCode: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: TestEmailRequest | null = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    if (body?.testMode && body?.emailType) {
      const template = emailTemplates[body.emailType];
      if (!template) {
        return new Response(
          JSON.stringify({
            error: `Unknown email type: ${body.emailType}`,
            availableTypes: Object.keys(emailTemplates)
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: contactData } = await supabase
        .from('marketing_contacts')
        .select('unsubscribe_token')
        .eq('email', body.email)
        .maybeSingle();

      const unsubscribeUrl = contactData?.unsubscribe_token
        ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
        : 'https://airocket.app/unsubscribe';

      let emailHtml = template.getHtml(body.name, body.inviteCode);
      emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AI Rocket Moonshot Challenge <moonshot@airocket.app>",
          to: body.email,
          subject: `[TEST] ${template.subject}`,
          html: emailHtml,
        }),
      });

      if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        return new Response(
          JSON.stringify({ error: "Failed to send test email", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const resendData = await resendResponse.json();
      return new Response(
        JSON.stringify({
          success: true,
          message: `Test email (${body.emailType}) sent to ${body.email}`,
          emailId: resendData.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('moonshot_email_sequence')
      .select(`
        id,
        registration_id,
        email_type,
        scheduled_for,
        moonshot_registrations!inner (
          name,
          email
        ),
        moonshot_invite_codes!inner (
          code
        )
      `)
      .lte('scheduled_for', now)
      .is('sent_at', null)
      .neq('email_type', 'confirmation')
      .limit(50);

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending emails', details: fetchError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending emails to send', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const emailRecord of pendingEmails) {
      const registration = emailRecord.moonshot_registrations as unknown as { name: string; email: string };
      const inviteCode = (emailRecord.moonshot_invite_codes as unknown as { code: string }).code;
      const template = emailTemplates[emailRecord.email_type];

      if (!template) {
        console.warn(`Unknown email type: ${emailRecord.email_type}`);
        continue;
      }

      try {
        const { data: contactData } = await supabase
          .from('marketing_contacts')
          .select('unsubscribe_token')
          .eq('email', registration.email)
          .maybeSingle();

        const unsubscribeUrl = contactData?.unsubscribe_token
          ? `https://airocket.app/unsubscribe?token=${contactData.unsubscribe_token}`
          : 'https://airocket.app/unsubscribe';

        let emailHtml = template.getHtml(registration.name, inviteCode);
        emailHtml = emailHtml.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AI Rocket Moonshot Challenge <moonshot@airocket.app>",
            to: registration.email,
            subject: template.subject,
            html: emailHtml,
          }),
        });

        if (resendResponse.ok) {
          await supabase
            .from('moonshot_email_sequence')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', emailRecord.id);

          sentCount++;
          console.log(`Sent ${emailRecord.email_type} to ${registration.email}`);
        } else {
          const errorText = await resendResponse.text();
          errors.push(`Failed to send ${emailRecord.email_type} to ${registration.email}: ${errorText}`);
        }
      } catch (err) {
        errors.push(`Error sending ${emailRecord.email_type} to ${registration.email}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingEmails.length} emails, sent ${sentCount}`,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in moonshot-email-scheduler function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});