import { Sparkles, MessageSquare, BarChart3, Users, Settings, FileText, Upload } from 'lucide-react';

interface QuickStartGuideProps {
  onStartTour: () => void;
  isAdmin: boolean;
}

export function QuickStartGuide({ onStartTour, isAdmin }: QuickStartGuideProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          New to AI Rocket?
        </h3>
        <p className="text-gray-300 text-sm mb-3">
          Take a quick interactive tour to learn the basics
        </p>
        <button
          onClick={onStartTour}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
        >
          Start Interactive Tour
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-orange-400" />
          Getting Started
        </h3>
        <GuideSection
          title="Your First Question"
          description="Type any question in the chat input and press Enter. AI Rocket will analyze your team's data and provide insights."
        />
        <GuideSection
          title="Creating Visualizations"
          description="After asking a question, click the 'Create Visualizations' button to generate interactive charts. Use 'Retry' to get different versions."
        />
        <GuideSection
          title="Understanding Chat Modes"
          description="Private mode is for personal questions only you see. Team mode lets everyone collaborate on insights together."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          Team Collaboration
        </h3>
        <GuideSection
          title="Private vs Team Chats"
          description="Switch between modes using the toggle at the top. Each mode keeps its own conversation history."
        />
        <GuideSection
          title="Mentioning Team Members"
          description="In Team mode, type @ followed by a name to mention someone. They'll get a notification."
        />
        <GuideSection
          title="Team Members"
          description="View all team members in the Team Members panel. See their roles and contact information."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Adding Your Data
        </h3>
        <GuideSection
          title="Upload Local Files"
          description="Drag and drop files directly into AI Rocket from the Fuel Stage. Supports PDF, Word, Excel, PowerPoint, text, and CSV files up to 50 MB each."
        />
        <GuideSection
          title="Cloud Drive Sync"
          description="Connect Google Drive or Microsoft OneDrive/SharePoint to automatically sync documents from your Strategy, Meetings, Financial, and Projects folders."
        />
        <GuideSection
          title="AI Classification"
          description="AI Rocket automatically analyzes and categorizes your documents so you can ask questions about any topic."
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Visualizations & Reports
        </h3>
        <GuideSection
          title="Your Visualizations"
          description="Visualizations you create are private to you. Save favorites or export them as PDFs to share."
        />
        <GuideSection
          title="Managing Reports"
          description="Create, view, and manage your own reports from the Reports page. Admins can also set up automated scheduled reports."
        />
      </div>

      {isAdmin && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            Admin Features
          </h3>
          <GuideSection
            title="Inviting Team Members"
            description="Go to Team Members and click 'Invite Member' to add people to your team via email."
          />
          <GuideSection
            title="Connecting Cloud Storage"
            description="In Team Settings, connect Google Drive or Microsoft OneDrive/SharePoint to let AI Rocket access and analyze your documents."
          />
          <GuideSection
            title="Scheduled Reports"
            description="Set up automated reports that run daily, weekly, or monthly. Configure them in Team Settings."
          />
          <GuideSection
            title="Managing Team Settings"
            description="Access Team Settings to configure integrations, reports, and team-wide preferences."
          />
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-yellow-400" />
          Tips & Best Practices
        </h3>
        <GuideSection
          title="Be Specific"
          description="The more specific your questions, the better AI Rocket can help. Include timeframes, topics, or data sources."
        />
        <GuideSection
          title="Use Natural Language"
          description="Ask questions naturally, as if talking to a colleague. AI Rocket understands conversational language."
        />
        <GuideSection
          title="Explore Visualizations"
          description="Use the 'Create Visualizations' button to generate charts from any conversation. Click 'Retry' to see different visualization formats and styles."
        />
      </div>
    </div>
  );
}

interface GuideSectionProps {
  title: string;
  description: string;
}

function GuideSection({ title, description }: GuideSectionProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h4 className="text-white font-medium mb-1">{title}</h4>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
