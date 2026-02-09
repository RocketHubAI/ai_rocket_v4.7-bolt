# AI Rocket + Astra Intelligence v1.1

RocketHub's enterprise AI platform that connects all your company data - strategy documents, meeting notes, financial records, and emails - making it instantly accessible through conversational AI.

**For comprehensive product documentation, see:** [ASTRA_INTELLIGENCE_PRODUCT_OVERVIEW.md](./ASTRA_INTELLIGENCE_PRODUCT_OVERVIEW.md)

## Quick Start

### Environment Setup

1. Copy `.env.example` to `.env`
2. Add your API keys and webhook URL to the `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url_here
   ```

## Development

```bash
npm install
npm run dev
```

## Production Deployment

This app is configured to deploy to Netlify. Make sure to set the following environment variables in your Netlify dashboard:

- `VITE_GEMINI_API_KEY`: Your Google Gemini API key
- `VITE_N8N_WEBHOOK_URL`: Your n8n webhook URL for chat processing

## Key Features

### Dual Interaction Modes
- **Private Chat**: Personal AI assistant for individual insights
- **Team Chat**: Collaborative workspace with real-time AI assistance

### AI Capabilities
- Semantic search across all connected data sources
- Context-aware conversations with memory
- Multi-document synthesis and analysis
- Natural language understanding and intent recognition

### Data Integration
- **Google Drive**: Strategy, meetings, financial documents
- **Gmail**: Email threads and communication history (feature flag)
- **Vector Search**: Find information by meaning, not just keywords

### Visualization & Reporting
- AI-generated charts, graphs, and dashboards
- Scheduled and manual reports
- Export to PDF, CSV, PNG
- Interactive HTML visualizations

### Collaboration Tools
- Real-time message synchronization
- @mention system for users and AI
- Message threading and replies
- Shared conversation history

### User Experience
- Progressive Web App (PWA) - install like a native app
- Mobile-first design with touch optimization
- Dark theme optimized for extended use
- Launch Preparation system with gamified progression
- Mission Control dashboard for progress tracking

### Onboarding & Progression
- **Launch Preparation**: Guided 3-stage setup (Fuel, Boosters, Guidance)
- **Launch Points System**: Gamified achievement tracking
- **Mission Control**: Post-launch progress dashboard
- **Level Progression**: 5 levels per stage with point rewards

## Documentation

### Getting Started
- **[Complete Product Overview](./ASTRA_INTELLIGENCE_PRODUCT_OVERVIEW.md)** - Comprehensive feature documentation
- **[Launch Preparation Guide](./LAUNCH_PREPARATION_GUIDE.md)** - Complete setup system
- **[Mission Control & Launch Points](./MISSION_CONTROL_LAUNCH_POINTS_GUIDE.md)** - Progress tracking guide
- **[User Onboarding Guide](./USER_ONBOARDING_GUIDE.md)** - Getting started

### Integration & Setup
- **[Google Drive Setup](./GOOGLE_DRIVE_INTEGRATION_SETUP.md)** - Integration guide
- **[Gmail Setup](./GMAIL_SETUP.md)** - Email integration
- **[Scheduled Reports](./SCHEDULED_REPORTS_SETUP.md)** - Automated reporting

### Platform Updates
- **[What's New](./WHATS_NEW_FEATURE.md)** - Latest features and improvements

## Architecture

**Frontend:** React + TypeScript + Vite + Tailwind CSS
**Database:** Supabase (PostgreSQL with real-time)
**AI Orchestration:** n8n workflows (webhook-based)
**AI Provider:** Google Gemini 2.5 Flash
**Deployment:** Netlify (auto-deploy)
