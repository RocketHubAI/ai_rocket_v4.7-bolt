export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  icon: 'rocket' | 'document';
  color: string;
}

export const MOONSHOT_EMAIL_TEMPLATE: EmailTemplate = {
  id: 'moonshot-challenge',
  name: '$5M Moonshot Challenge',
  description: 'Announce the AI Moonshot Challenge with $5M in prizes',
  subject: '$5M AI Moonshot Challenge - Registration Now Open',
  icon: 'rocket',
  color: 'orange',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      font-family: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
      line-height: 1.6;
      color: #e5e7eb !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #0A0F1C !important;
    }
    .container {
      max-width: 640px;
      margin: 40px auto;
      background-color: #0A0F1C !important;
      border-radius: 20px;
      overflow: hidden;
    }
    .email-wrapper {
      background-color: #0A0F1C !important;
      padding: 20px;
    }
    .header {
      background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%);
      color: white;
      padding: 48px 30px 40px;
      text-align: center;
      position: relative;
    }
    .brand-section { position: relative; z-index: 1; }
    .rocket-icon {
      display: inline-block;
      width: 64px;
      height: 64px;
      background: linear-gradient(145deg, #5BA4E6, #3B82C4);
      border-radius: 16px;
      font-size: 36px;
      line-height: 64px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4);
    }
    .brand-name {
      font-size: 42px;
      font-weight: 800;
      color: white;
      margin: 8px 0 4px;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 14px;
      color: #6b7280;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    .challenge-title {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(to right, #fbbf24, #f97316, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      background: #131B2E;
    }
    .greeting {
      font-size: 22px;
      font-weight: 600;
      color: #f3f4f6;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #9ca3af;
      margin-bottom: 24px;
      line-height: 1.7;
    }
    .hero-highlight {
      display: block;
      text-decoration: none;
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(16, 185, 129, 0.1));
      border: 2px solid #f97316;
      border-radius: 20px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
      transition: all 0.3s ease;
    }
    .hero-highlight:hover {
      border-color: #fbbf24;
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(16, 185, 129, 0.2));
    }
    .highlight-text {
      font-size: 20px;
      font-weight: 700;
      color: #f3f4f6;
      margin-bottom: 8px;
    }
    .highlight-sub {
      font-size: 14px;
      color: #9ca3af;
    }
    .stats-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 8px;
      margin: 24px 0;
    }
    .stat-cell {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      border: 2px solid #475569;
      border-radius: 12px;
      padding: 16px 8px;
      text-align: center;
      width: 25%;
      vertical-align: top;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(to right, #f97316, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
      display: block;
    }
    .stat-label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      display: block;
    }
    .feature-grid { margin: 24px 0; }
    .feature-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .feature-icon { font-size: 28px; flex-shrink: 0; }
    .feature-content h4 {
      font-size: 16px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 4px 0;
    }
    .feature-content p {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #f97316 0%, #10b981 100%);
      color: white !important;
      padding: 18px 48px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 8px 32px rgba(249, 115, 22, 0.35);
    }
    .date-badge {
      display: inline-block;
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 20px;
      border-radius: 25px;
      margin-top: 16px;
    }
    .footer {
      background: #0A0F1C;
      padding: 32px 30px;
      text-align: center;
      border-top: 1px solid #1e293b;
    }
    .footer p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 16px;
    }
    .footer a {
      color: #f97316;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="brand-section">
          <div style="font-size: 12px; color: #9ca3af; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase;">From the creators of Health Rocket</div>
          <div class="rocket-icon">&#128640;</div>
          <div class="brand-name">AI Rocket</div>
          <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
          <h1 class="challenge-title">$5M AI Moonshot Challenge</h1>
        </div>
      </div>

      <div class="content">
        <div class="greeting">Hi {{firstName}}!</div>

        <div class="message">
          We are excited to announce the <strong style="color:#fbbf24">$5M AI Moonshot Challenge</strong> - an exclusive opportunity for entrepreneurs and their teams to transform their businesses with AI and compete for equity prizes totaling $5 million.
        </div>

        <a href="https://airocket.app/moonshot/register" class="hero-highlight">
          <div class="highlight-text">Registration is NOW OPEN</div>
          <div class="highlight-sub">Click here to register - Challenge launches January 15, 2026</div>
        </a>

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

        <div class="message" style="text-align:center;margin-bottom:16px">
          The first 300 teams to launch their AI Rockets get <strong style="color:#10b981">90 days of FREE unlimited access</strong> to transform their businesses with AI.
        </div>

        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">&#128202;</div>
            <div class="feature-content">
              <h4>All Your Data Connected</h4>
              <p>Connect Documents, Financials, and more for comprehensive AI insights</p>
            </div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">&#128200;</div>
            <div class="feature-content">
              <h4>Smart Visualizations</h4>
              <p>Turn conversations into actionable charts, graphs, and visual reports</p>
            </div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">&#129309;</div>
            <div class="feature-content">
              <h4>Team Collaboration</h4>
              <p>Work together with your team and AI in shared conversations</p>
            </div>
          </div>
          <div class="feature-card">
            <div class="feature-icon">&#128203;</div>
            <div class="feature-content">
              <h4>Automated Reports</h4>
              <p>Schedule AI-powered reports delivered to your inbox</p>
            </div>
          </div>
        </div>

        <div class="cta-container">
          <a href="https://airocket.app/moonshot" class="cta-button">View Challenge Details</a>
          <div class="date-badge">Challenge Starts January 15, 2026</div>
        </div>

        <div class="message" style="font-size:14px;text-align:center;color:#64748b;margin-top:24px">
          Open to members of Gobundance, EO, YPO, Strategic Coach, Genius Network, R360, and similar entrepreneur mastermind groups.
        </div>
      </div>

      <div class="footer">
        <p>Questions? Visit <a href="https://airocket.app/moonshot">the Challenge page</a> for FAQs and details.</p>
        <p style="margin-top:16px">
          <span style="font-size:18px">&#128640;</span>
          <a href="https://airocket.app">AI Rocket</a>
          <span style="color:#475569">by RocketHub.AI</span>
        </p>
        <p style="margin-top:20px; padding-top:20px; border-top:1px solid #1e293b">
          <a href="{{unsubscribeUrl}}" style="color:#64748b; font-size:12px; text-decoration:underline">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
};

export const WELCOME_WEEK_EMAIL_TEMPLATE: EmailTemplate = {
  id: 'welcome-week',
  name: 'AI Rocket Welcome Week',
  description: 'Invite users to Welcome Week with group and 1-1 setup calls',
  subject: 'AI Rocket Welcome Week',
  icon: 'rocket',
  color: 'blue',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      font-family: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
      line-height: 1.6;
      color: #e5e7eb !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #0A0F1C !important;
    }
    .container {
      max-width: 640px;
      margin: 40px auto;
      background-color: #0A0F1C !important;
      border-radius: 20px;
      overflow: hidden;
    }
    .email-wrapper {
      background-color: #0A0F1C !important;
      padding: 20px;
    }
    .header {
      background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%);
      color: white;
      padding: 48px 30px 40px;
      text-align: center;
      position: relative;
    }
    .brand-section { position: relative; z-index: 1; }
    .rocket-icon {
      display: inline-block;
      width: 64px;
      height: 64px;
      background: linear-gradient(145deg, #5BA4E6, #3B82C4);
      border-radius: 16px;
      font-size: 36px;
      line-height: 64px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4);
    }
    .brand-name {
      font-size: 42px;
      font-weight: 800;
      color: white;
      margin: 8px 0 4px;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 14px;
      color: #6b7280;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    .welcome-title {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(to right, #3b82f6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      background: #131B2E;
    }
    .greeting {
      font-size: 22px;
      font-weight: 600;
      color: #f3f4f6;
      margin-bottom: 8px;
    }
    .sub-greeting {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(to right, #3b82f6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #9ca3af;
      margin-bottom: 24px;
      line-height: 1.7;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 32px 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #334155;
    }
    .call-card {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
      border: 2px solid #3b82f6;
      border-radius: 16px;
      padding: 24px;
      margin: 16px 0;
    }
    .call-card-orange {
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(16, 185, 129, 0.1));
      border: 2px solid #f97316;
    }
    .call-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 8px;
    }
    .call-details {
      font-size: 14px;
      color: #9ca3af;
      margin: 4px 0;
    }
    .call-details strong {
      color: #d1d5db;
    }
    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
    .action-link {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      color: white !important;
      padding: 10px 20px;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    }
    .action-link-secondary {
      background: #1e293b;
      border: 1px solid #475569;
      box-shadow: none;
    }
    .action-link-orange {
      background: linear-gradient(135deg, #f97316 0%, #10b981 100%);
      box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
    }
    .demo-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .demo-image {
      width: 100%;
      max-width: 400px;
      border-radius: 12px;
      margin: 16px auto;
      display: block;
      border: 1px solid #475569;
    }
    .moonshot-card {
      background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(251, 191, 36, 0.1));
      border: 2px solid #f97316;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .moonshot-title {
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(to right, #fbbf24, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0 0 12px;
    }
    .moonshot-stats {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin: 16px 0;
    }
    .moonshot-stat {
      text-align: center;
    }
    .moonshot-stat-value {
      font-size: 24px;
      font-weight: 800;
      color: #fbbf24;
    }
    .moonshot-stat-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
    }
    .auto-entered-badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 20px;
      margin-top: 12px;
    }
    .share-section {
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(59, 130, 246, 0.1));
      border: 1px solid #7c3aed;
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .share-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 12px;
    }
    .footer {
      background: #0A0F1C;
      padding: 32px 30px;
      text-align: center;
      border-top: 1px solid #1e293b;
    }
    .footer p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 16px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="brand-section">
          <div class="rocket-icon">&#128640;</div>
          <div class="brand-name">AI Rocket</div>
          <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
          <h1 class="welcome-title">AI Rocket Intro & Guided Setup Calls</h1>
        </div>
      </div>

      <div class="content">
        <div class="greeting">Hi {{firstName}},</div>
        <div class="sub-greeting">Join us for AI Rocket Welcome Week!</div>

        <div class="message">
          Now that AI Rocket is <strong style="color:#10b981">Live</strong> with <strong style="color:#3b82f6">Free Unlimited AI-for-Work tools</strong> for Entrepreneurs and Teams, we welcome you to learn more and get your team setup via one of the options below.
        </div>

        <div class="section-title">&#128197; Group Workshop - January 20</div>

        <div class="call-card">
          <div class="call-title">AI Rocket Intro & Guided Setup Workshop</div>
          <div class="call-details"><strong>Tuesday, January 20</strong> &bull; 4:00 - 5:00pm EST</div>
          <div class="call-details">Join us for a live walkthrough of AI Rocket and get your team set up with expert guidance.</div>
          <div class="link-row">
            <a href="https://meet.google.com/ptq-mgpd-bdc" class="action-link">Join Google Meet</a>
            <a href="https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=N2phbHZ1aDgxdW1scjB0cHQzdG9yZzNzbWIgY2xheUByb2NrZXRodWIuYWk&tmsrc=clay%40rockethub.ai" class="action-link action-link-secondary">Add to Calendar</a>
          </div>
        </div>

        <div class="section-title">&#128100; 1-on-1 Setup Call - January 19 & 21</div>

        <div class="call-card call-card-orange">
          <div class="call-title">AI Rocket Intro & Guided Setup 1-1</div>
          <div class="call-details">Personalized guided setup for you and your team. Get hands-on help configuring AI Rocket for your specific needs.</div>
          <div class="link-row">
            <a href="https://calendar.app.google/SYd1YRigRRiFWDcbA" class="action-link action-link-orange">Book a 30-Min Time Slot</a>
          </div>
        </div>

        <div class="section-title">&#128269; Explore For Yourself</div>

        <a href="https://airocket.app" class="demo-section" style="display:block;text-decoration:none;">
          <div style="font-size:16px;font-weight:600;color:#f3f4f6;margin-bottom:12px;">Browse features and view the App Demo</div>
          <div style="margin-top:16px;">
            <span class="action-link" style="display:inline-block;">Learn More</span>
          </div>
        </a>

        <div class="moonshot-card">
          <div class="moonshot-title">&#128640; $5M AI Moonshot Challenge</div>
          <div style="font-size:14px;color:#9ca3af;margin-bottom:12px;">
            Transform your business with AI and compete for equity prizes
          </div>
          <div class="moonshot-stats">
            <div class="moonshot-stat">
              <div class="moonshot-stat-value">$5M</div>
              <div class="moonshot-stat-label">Prize Pool</div>
            </div>
            <div class="moonshot-stat">
              <div class="moonshot-stat-value">300</div>
              <div class="moonshot-stat-label">Team Slots</div>
            </div>
            <div class="moonshot-stat">
              <div class="moonshot-stat-value">90</div>
              <div class="moonshot-stat-label">Days Free</div>
            </div>
          </div>
          <div class="auto-entered-badge">&#10003; All teams are automatically entered!</div>
          <div style="margin-top:16px;">
            <a href="https://airocket.app/moonshot" class="action-link action-link-orange">Learn More About the Challenge</a>
          </div>
        </div>

        <div class="share-section">
          <div class="share-title">&#128240; Share the Opportunity</div>
          <div style="font-size:14px;color:#9ca3af;line-height:1.6;">
            Know other entrepreneurs and teams who need AI-for-Work tools? Share this opportunity with them! AI Rocket is free and unlimited for all teams ready to launch.
          </div>
          <div style="margin-top:16px;">
            <span style="display:inline-block;background:linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%);color:white;padding:10px 20px;border-radius:25px;font-weight:600;font-size:14px;box-shadow:0 4px 16px rgba(124, 58, 237, 0.3);">Share AI Rocket</span>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Questions? Reply to this email or reach out anytime.</p>
        <p style="margin-top:16px">
          <span style="font-size:18px">&#128640;</span>
          <a href="https://airocket.app">AI Rocket</a>
          <span style="color:#475569">by RocketHub.AI</span>
        </p>
        <p style="margin-top:20px; padding-top:20px; border-top:1px solid #1e293b">
          <a href="{{unsubscribeUrl}}" style="color:#64748b; font-size:12px; text-decoration:underline">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
};

export const GUIDED_LAUNCH_ONBOARDING_TEMPLATE: EmailTemplate = {
  id: 'guided-launch-onboarding',
  name: 'Guided Launch Onboarding',
  description: 'Personal outreach from Clay to help users complete their launch journey with 1-1 support option',
  subject: 'Your AI Rocket is Ready for Liftoff',
  icon: 'rocket',
  color: 'blue',
  htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      font-family: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
      line-height: 1.6;
      color: #e5e7eb !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: #0A0F1C !important;
    }
    .container {
      max-width: 640px;
      margin: 40px auto;
      background-color: #0A0F1C !important;
      border-radius: 20px;
      overflow: hidden;
    }
    .email-wrapper {
      background-color: #0A0F1C !important;
      padding: 20px;
    }
    .header {
      background: linear-gradient(180deg, #0A0F1C 0%, #131B2E 100%);
      color: white;
      padding: 48px 30px 40px;
      text-align: center;
      position: relative;
    }
    .brand-section { position: relative; z-index: 1; }
    .rocket-icon {
      display: inline-block;
      width: 64px;
      height: 64px;
      background: linear-gradient(145deg, #5BA4E6, #3B82C4);
      border-radius: 16px;
      font-size: 36px;
      line-height: 64px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 8px 32px rgba(59, 130, 196, 0.4);
    }
    .brand-name {
      font-size: 42px;
      font-weight: 800;
      color: white;
      margin: 8px 0 4px;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 14px;
      color: #6b7280;
      letter-spacing: 1px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(to right, #3b82f6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      background: #131B2E;
    }
    .greeting {
      font-size: 22px;
      font-weight: 600;
      color: #f3f4f6;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #9ca3af;
      margin-bottom: 20px;
      line-height: 1.8;
    }
    .message strong {
      color: #f3f4f6;
    }
    .highlight-box {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1));
      border: 2px solid #3b82f6;
      border-radius: 16px;
      padding: 24px;
      margin: 28px 0;
    }
    .highlight-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .highlight-text {
      font-size: 15px;
      color: #9ca3af;
      line-height: 1.7;
    }
    .easy-button-section {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      margin: 28px 0;
      text-align: center;
    }
    .easy-button-title {
      font-size: 20px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 8px;
    }
    .easy-button-subtitle {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 16px;
    }
    .feature-list {
      text-align: left;
      padding: 0 20px;
    }
    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    .feature-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    .feature-text {
      font-size: 14px;
      color: #d1d5db;
    }
    .cta-section {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
      color: white !important;
      padding: 18px 40px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.35);
      margin-bottom: 12px;
    }
    .cta-subtext {
      font-size: 13px;
      color: #6b7280;
      margin-top: 12px;
    }
    .divider {
      height: 1px;
      background: #334155;
      margin: 32px 0;
    }
    .onboarding-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
      border: 2px solid #10b981;
      border-radius: 16px;
      padding: 24px;
      margin: 28px 0;
      text-align: center;
    }
    .onboarding-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
      margin: 0 0 8px;
    }
    .onboarding-text {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .onboarding-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      color: white !important;
      padding: 14px 32px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    }
    .signature {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #334155;
    }
    .signature-text {
      font-size: 16px;
      color: #d1d5db;
      margin-bottom: 8px;
    }
    .signature-name {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .signature-title {
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      background: #0A0F1C;
      padding: 32px 30px;
      text-align: center;
      border-top: 1px solid #1e293b;
    }
    .footer p {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 16px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="brand-section">
          <div class="rocket-icon">&#128640;</div>
          <div class="brand-name">AI Rocket</div>
          <div class="brand-tagline">AI Built for Entrepreneurs and Their Teams</div>
          <h1 class="title">Your AI Rocket is Ready</h1>
        </div>
      </div>

      <div class="content">
        <div class="greeting">Hi {{firstName}},</div>

        <div class="message">
          I noticed you've started setting up your AI Rocket but haven't launched yet. I wanted to reach out personally because <strong>I believe AI Rocket can be a game-changer for you and your team</strong> - and I want to make sure you have everything you need to get there.
        </div>

        <div class="easy-button-section">
          <div class="easy-button-title">&#127919; The "Easy Button" for AI at Work</div>
          <div class="easy-button-subtitle">AI Rocket was built to make AI simple, powerful, and actually useful for your business</div>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">&#128202;</span>
              <span class="feature-text"><strong>Connect your data</strong> - Google Drive, meetings, financials, and more</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">&#128172;</span>
              <span class="feature-text"><strong>Ask Astra anything</strong> - Get insights from your own data instantly</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">&#128101;</span>
              <span class="feature-text"><strong>Collaborate with your team</strong> - Everyone can chat with AI using shared knowledge</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">&#128203;</span>
              <span class="feature-text"><strong>Automated reports</strong> - AI-powered insights delivered to your inbox</span>
            </div>
          </div>
        </div>

        <div class="highlight-box">
          <div class="highlight-title">&#127775; You're Almost There!</div>
          <div class="highlight-text">
            You've already taken the first steps. Now let's get you across the finish line so you can start experiencing the power of AI tailored to your business.
          </div>
        </div>

        <div class="cta-section">
          <a href="https://airocket.app" class="cta-button">Continue Your Launch Journey</a>
          <div class="cta-subtext">Pick up right where you left off</div>
        </div>

        <div class="divider"></div>

        <div class="onboarding-card">
          <div class="onboarding-title">&#128100; Prefer a Guided Experience?</div>
          <div class="onboarding-text">
            I'm personally offering <strong style="color:#10b981">1-on-1 Guided Onboarding calls</strong> to help you get set up. We'll walk through everything together and I'll answer any questions you have about making AI work for your specific needs.
          </div>
          <a href="https://calendar.app.google/SHj8AtJykVEusf4V8" class="onboarding-button">Book a 1-1 Setup Call with Me</a>
        </div>

        <div class="message" style="text-align:center;font-size:15px;margin-top:24px;">
          Questions? Just reply to this email - I read and respond to every message personally.
        </div>

        <div class="signature">
          <div class="signature-text">Looking forward to helping you launch,</div>
          <div class="signature-name">Clay Speakman</div>
          <div class="signature-title">Creator, AI Rocket</div>
        </div>
      </div>

      <div class="footer">
        <p>
          <span style="font-size:18px">&#128640;</span>
          <a href="https://airocket.app">AI Rocket</a>
          <span style="color:#475569">by RocketHub.AI</span>
        </p>
        <p style="margin-top:20px; padding-top:20px; border-top:1px solid #1e293b">
          <a href="{{unsubscribeUrl}}" style="color:#64748b; font-size:12px; text-decoration:underline">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
};

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  MOONSHOT_EMAIL_TEMPLATE,
  WELCOME_WEEK_EMAIL_TEMPLATE,
  GUIDED_LAUNCH_ONBOARDING_TEMPLATE
];
