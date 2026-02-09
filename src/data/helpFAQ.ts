export interface FAQItem {
  question: string;
  answer: string;
  category: 'getting-started' | 'chat-modes' | 'visualizations' | 'astra-create' | 'team' | 'integrations' | 'reports' | 'admin' | 'launch-prep' | 'data-sync' | 'proactive-assistant' | 'scheduled-tasks' | 'connected-apps' | 'mcp-tools' | 'skills';
}

export const helpFAQ: FAQItem[] = [
  {
    category: 'getting-started',
    question: 'What is AI Rocket?',
    answer: 'AI Rocket is your AI assistant connected to all your team\'s data. Ask questions, get insights, create visualizations, and collaborate with your team - all powered by AI that understands your company\'s information.'
  },
  {
    category: 'getting-started',
    question: 'How do I ask AI Rocket a question?',
    answer: 'Simply type your question in the chat input at the bottom of the screen and press Enter or click Send. AI Rocket will analyze your data and provide insights based on your question.'
  },
  {
    category: 'getting-started',
    question: 'What kind of questions can I ask?',
    answer: 'You can ask about your company data, search through documents, analyze trends, or get summaries. Try questions like "What are our top priorities?" or "Show me email trends from last month". You can also create visualizations using the "Create Visualizations" button.'
  },
  {
    category: 'chat-modes',
    question: 'What\'s the difference between Private and Team chat?',
    answer: 'Private mode is just for you - your questions and AI Rocket\'s responses are only visible to you. Team mode is collaborative - everyone on your team can see the conversation and contribute.'
  },
  {
    category: 'chat-modes',
    question: 'When should I use Team mode?',
    answer: 'Use Team mode when you want to collaborate with your team on insights, share discoveries, or have group discussions with AI assistance. It\'s great for team meetings, brainstorming, or sharing important findings.'
  },
  {
    category: 'chat-modes',
    question: 'Can I switch between Private and Team mode?',
    answer: 'Yes! Click the "Private" or "Team" button at the top of the chat to switch modes. Each mode has its own conversation history that stays separate.'
  },
  {
    category: 'visualizations',
    question: 'How do I create a visualization?',
    answer: 'After asking AI Rocket a question, click the "Create Visualizations" button that appears in the conversation. AI Rocket will generate interactive charts and visualizations based on your data. If you want a different version, simply click "Retry".'
  },
  {
    category: 'visualizations',
    question: 'Who can see my visualizations?',
    answer: 'Only you can see visualizations you create. Even in Team mode, visualizations are private to the person who requested them. You can export them as PDFs to share with others.'
  },
  {
    category: 'visualizations',
    question: 'Can I save visualizations?',
    answer: 'Yes! When viewing a visualization, click the bookmark icon to save it. Your saved visualizations appear in your sidebar for easy access later.'
  },
  {
    category: 'visualizations',
    question: 'How do I export a visualization?',
    answer: 'Open any visualization and click the "Export as PDF" button. This creates a downloadable PDF that you can share or keep for your records.'
  },
  {
    category: 'astra-create',
    question: 'What is Creative Suite?',
    answer: 'Creative Suite is a powerful feature that generates AI-powered images and presentations from your team\'s data. Choose from preset content types like Team Snapshot, Sales Campaign, or Thought Leadership, or enter a custom prompt to create stunning visual content in various artistic styles.'
  },
  {
    category: 'astra-create',
    question: 'What content types are available in Creative Suite?',
    answer: 'Creative Suite offers 15+ content types organized into categories: Overview (Team Snapshot, Team Wins), Foundation (Mission, Core Values), Progress (Goals, Weekly/Quarterly/Yearly Reviews), Marketing (Sales Campaign, Thought Leadership), Analysis (Challenges & Opportunities, Financial Health, Trends & Insights, Innovation & Ideas), and Custom (your own prompt).'
  },
  {
    category: 'astra-create',
    question: 'Can I create presentations or just images?',
    answer: 'Both! Creative Suite lets you generate single images or multi-slide presentations. For presentations, you can choose 3, 5, 7, or 10 slides. Single images are great for social media or quick visuals, while presentations work well for meetings and stakeholder updates.'
  },
  {
    category: 'astra-create',
    question: 'What style options are available?',
    answer: 'You can choose from Presentation Styles (Modern Gradient, Tech & Innovation, Bold Headlines, Minimalist Clean, Corporate Professional, Creative Playful) or Image Styles (Photorealistic, Digital Art, 3D Render, Infographic). Each style gives your content a unique visual aesthetic.'
  },
  {
    category: 'astra-create',
    question: 'What are Text Integration options?',
    answer: 'When selecting an Image Style, you can choose how text appears: Integrated (text naturally embedded in the image), Overlay (clean text on top of the image), Minimal (image-focused with essential text only), or Caption (image as hero with text below).'
  },
  {
    category: 'astra-create',
    question: 'Why are some content types grayed out?',
    answer: 'Content types are only available if you have relevant data synced. For example, Financial Health requires financial documents, and Meeting Reviews require meeting notes. Sync more data from Google Drive, Microsoft OneDrive, or upload local files to unlock additional content types.'
  },
  {
    category: 'astra-create',
    question: 'How many content types can I select?',
    answer: 'You can select up to 3 content types per creation. This helps keep the generated content focused and coherent. If you need more topics covered, create additional visualizations.'
  },
  {
    category: 'astra-create',
    question: 'Can I save my Creative Suite visualizations?',
    answer: 'Yes! After generating content, click the save button to add it to your personal gallery. Access your saved visualizations anytime from the "My Visualizations" button in Creative Suite.'
  },
  {
    category: 'astra-create',
    question: 'What layout options are available?',
    answer: 'Choose from Landscape (16:9) for presentations and widescreen displays, Portrait (9:16) for social media stories and mobile viewing, or Square (1:1) for social media posts.'
  },
  {
    category: 'team',
    question: 'What is Team Dashboard?',
    answer: 'Team Dashboard provides daily AI-powered insights on your team\'s goals, mission alignment, and overall health. It analyzes your synced data every day and presents actionable metrics in a 3-panel layout: Goals & Targets (projects, OKRs, milestones, KPIs), Mission Alignment (how work aligns with your mission and values), and Team Health (overall score with engagement, meeting cadence, and risk indicators).'
  },
  {
    category: 'team',
    question: 'How do I access Team Dashboard?',
    answer: 'Click the Team Dashboard tile in the Agent Tools section on Mission Control, or open the Team Dashboard tab in Assistant Mode. Admins can regenerate the dashboard on demand, and it also updates automatically each day at midnight EST.'
  },
  {
    category: 'team',
    question: 'Can I export the Team Dashboard?',
    answer: 'Yes! Click the "Export PDF" button on the Team Dashboard to generate a downloadable PDF with all three panels. This is useful for sharing with stakeholders or using in meetings.'
  },
  {
    category: 'team',
    question: 'Can I customize what Team Dashboard focuses on?',
    answer: 'Yes, admins can set custom instructions that guide what the AI focuses on when generating the dashboard. For example, you can tell it to emphasize specific KPIs, focus on a particular project, or highlight certain team goals.'
  },
  {
    category: 'admin',
    question: 'What is Category Data Access?',
    answer: 'Category Data Access lets admins control which data categories each team member can access when chatting with the AI. You can grant or restrict access to Strategy, Meetings, Financial, and Projects data on a per-user basis. The AI automatically filters its responses based on each user\'s permissions.'
  },
  {
    category: 'admin',
    question: 'How do I manage Category Data Access?',
    answer: 'Go to User Settings (click your profile picture, then Settings) and scroll to the Team Members section. Click on any team member to see their category access toggles. You can enable or disable access to Strategy, Meetings, Financial, and Projects data individually. New team members get full access by default.'
  },
  {
    category: 'team',
    question: 'How do I mention someone in Team chat?',
    answer: 'Type @ followed by their name in Team mode. You\'ll see a list of team members to choose from. Mentioned users will receive a notification.'
  },
  {
    category: 'team',
    question: 'How do notifications work?',
    answer: 'You\'ll receive notifications when someone mentions you in Team chat or when there\'s important team activity. Click the bell icon in the header to view your notifications.'
  },
  {
    category: 'team',
    question: 'Can I see who\'s on my team?',
    answer: 'Yes! Click your profile picture or the team icon in the header to see all team members. You can view their roles and contact information there.'
  },
  {
    category: 'reports',
    question: 'What are Reports?',
    answer: 'Reports are a dedicated space where you can create, view, and manage your own custom reports, as well as view scheduled reports. They provide summaries and analyses of your team\'s data.'
  },
  {
    category: 'reports',
    question: 'How do I access Reports?',
    answer: 'Click the "Reports" button in the left sidebar to view all available reports. You can filter by date and view detailed insights for each report.'
  },
  {
    category: 'reports',
    question: 'Can I create my own reports?',
    answer: 'Yes! All team members can create, manage, edit, and delete their own reports from the Reports page. You can create custom reports that run manually or on a schedule (daily, weekly, or monthly).'
  },
  {
    category: 'reports',
    question: 'What are Team Reports?',
    answer: 'Team Reports are reports created by admins that are automatically delivered to all team members. When you receive a Team Report, you\'ll see it with an orange "Team Report" badge showing who created it. Each team member gets their own copy in their Reports view.'
  },
  {
    category: 'integrations',
    question: 'What are the cloud storage integrations?',
    answer: 'AI Rocket integrates with Google Drive and Microsoft OneDrive/SharePoint to access and analyze your team\'s documents. Once connected, you can ask questions about your docs, sheets, and slides from either service.'
  },
  {
    category: 'integrations',
    question: 'Is my cloud storage data secure?',
    answer: 'Yes! We only access files you grant permission to, and all data is encrypted. Your documents are processed securely and stored safely in your team\'s private database.'
  },
  {
    category: 'integrations',
    question: 'Can I disconnect my cloud storage?',
    answer: 'Yes, admins can disconnect Google Drive or Microsoft OneDrive/SharePoint from the Connect page > My Connections tab, or from the Fuel Stage in Launch Preparation. This will stop syncing new documents, but previously synced data will remain available to your team.'
  },
  {
    category: 'integrations',
    question: 'How do I disconnect and reconnect Google Drive?',
    answer: 'To disconnect and reconnect Google Drive: 1) Go to Settings (click your profile picture, then Settings), 2) Scroll down to the "Google Drive Sync" section, 3) Click the red "Disconnect" button next to your connected account, 4) Confirm the disconnection, 5) Click "Connect Google Drive" to start fresh. When reconnecting, select "See all your Google Drive files" for full folder access. Your existing synced data will remain available during this process.'
  },
  {
    category: 'integrations',
    question: 'Why can\'t I connect additional folders?',
    answer: 'If you\'re unable to connect additional folders, you may need to reconnect your Google Drive with expanded permissions. When you first connected, you only granted access to specific folders. To add more folders: 1) Click "Disconnect Google Drive" at the bottom of the folder management screen, 2) Sign out of your Google account in your browser, 3) Reconnect Google Drive and select "See all your Google Drive files" when prompted, 4) Choose your new folders. This gives AI Rocket permission to access additional folders beyond the original selection.'
  },
  {
    category: 'integrations',
    question: 'What does "See all your Google Drive files" mean?',
    answer: 'When connecting Google Drive, you\'ll see two permission options: "See and download specific files" (restricted to only folders you initially selected) or "See all your Google Drive files" (allows you to select any folder now or later). For flexibility in adding folders, choose "See all your Google Drive files". AI Rocket will ONLY access folders you explicitly select - this permission just allows you to choose from your entire Drive.'
  },
  {
    category: 'integrations',
    question: 'How do I fix "Error loading folders" messages?',
    answer: 'The "Error loading folders" message typically means your Google Drive connection needs to be refreshed or you need expanded permissions. To fix: 1) Disconnect Google Drive from the folder management screen, 2) Sign out of your Google account completely in your browser, 3) Reconnect Google Drive, 4) When prompted, select "See all your Google Drive files" to ensure full access, 5) Choose your folders again. This reestablishes a fresh connection with the proper permissions.'
  },
  {
    category: 'integrations',
    question: 'Why do I need to sign out of Google to reconnect?',
    answer: 'Signing out of your Google account before reconnecting ensures a clean authentication flow. Google sometimes caches old permissions, and signing out clears this cache so you can grant fresh, expanded permissions. This prevents permission conflicts and ensures AI Rocket gets the access it needs to manage your folders properly.'
  },
  {
    category: 'integrations',
    question: 'Will disconnecting Google Drive delete my synced data?',
    answer: 'No! Disconnecting Google Drive only stops new syncing - all your previously synced documents and data remain safe in AI Rocket\'s database. When you reconnect, AI Rocket will recognize your existing data and only sync new or updated files. Your team\'s chat history, visualizations, and reports are completely unaffected.'
  },
  {
    category: 'data-sync',
    question: 'What is AI Data Sync?',
    answer: 'AI Data Sync is the process of connecting your data sources to AI Rocket. You can sync Google Drive folders, Microsoft OneDrive/SharePoint folders, or upload files directly from your computer. Once synced, AI Rocket can search, analyze, and provide insights from your documents. Your data is securely processed and stored, allowing AI Rocket to answer questions about your business information.'
  },
  {
    category: 'data-sync',
    question: 'How do I upload local files?',
    answer: 'In the Fuel Stage of Mission Control, click the "Upload Files" button or drag and drop files directly onto the upload area. You can upload PDFs, Word documents (.docx), Excel spreadsheets (.xlsx), PowerPoint presentations (.pptx), text files (.txt, .md), and CSV files. Files are limited to 50 MB each, with up to 10 files per batch.'
  },
  {
    category: 'data-sync',
    question: 'What file types can I upload locally?',
    answer: 'AI Rocket supports local uploads of: PDF files, Microsoft Word documents (.docx, .doc), Excel spreadsheets (.xlsx, .xls), PowerPoint presentations (.pptx, .ppt), plain text files (.txt), Markdown files (.md), and CSV files. Each file can be up to 50 MB, and you can upload up to 10 files at a time.'
  },
  {
    category: 'data-sync',
    question: 'What happens after I upload a file?',
    answer: 'After uploading, AI Rocket processes your file through several stages: uploading (transferring the file), verifying (checking the file is valid), and classifying (AI analyzes the content to determine the category like Strategy, Finance, Marketing, etc.). Once complete, the file appears in your Documents list and AI Rocket can answer questions about it.'
  },
  {
    category: 'data-sync',
    question: 'Are my uploaded files secure?',
    answer: 'Yes! All uploaded files are securely stored in your team\'s private storage bucket. Only your team members can access them. Files are encrypted in transit and at rest, and each team\'s data is completely isolated from other teams.'
  },
  {
    category: 'data-sync',
    question: 'Can I delete uploaded files?',
    answer: 'Yes, admins can delete uploaded files from the Documents list in the Fuel Stage. Click on the Documents card to see all synced and uploaded documents, then use the delete option to remove any file. Deleted files are permanently removed from AI Rocket\'s database.'
  },
  {
    category: 'data-sync',
    question: 'Do I need a cloud storage service to use AI Rocket?',
    answer: 'No! While Google Drive and Microsoft OneDrive/SharePoint integrations provide powerful automatic syncing, you can also upload files directly from your computer using the Local File Upload feature. This is great for documents that aren\'t in cloud storage, such as email attachments, downloaded reports, or files from other systems.'
  },
  {
    category: 'data-sync',
    question: 'What are Connected Folders?',
    answer: 'Connected Folders are folders from Google Drive or Microsoft OneDrive/SharePoint that you designate for AI Rocket to sync. There are four folder types: Strategy (business plans, goals), Meetings (notes, agendas), Financial (budgets, reports), and Projects (project docs, timelines). Each folder helps AI Rocket understand different aspects of your business.'
  },
  {
    category: 'data-sync',
    question: 'What file types does AI Rocket support?',
    answer: 'AI Rocket supports Google Docs, Google Sheets, Google Slides, PDFs, Word documents (.docx), Excel spreadsheets (.xlsx), PowerPoint presentations (.pptx), and plain text files (.txt). Images and audio files are not currently supported for content analysis.'
  },
  {
    category: 'data-sync',
    question: 'How do I add more folders?',
    answer: 'Go to the Connect page > My Connections tab and click "Manage Folders" on your connection, then click "Add Folder." You can also manage folders from the Fuel Stage in Mission Control. Connect up to 20 folders from Google Drive, Microsoft OneDrive/SharePoint, or upload local files. Team admins can configure data category access permissions for team members.'
  },
  {
    category: 'data-sync',
    question: 'How long does syncing take?',
    answer: 'Initial sync time depends on the number and size of your documents. Small folders (under 50 files) typically sync within 1-2 minutes. Larger collections may take 5-10 minutes. You can continue using AI Rocket while syncing happens in the background.'
  },
  {
    category: 'data-sync',
    question: 'How do I check my sync status?',
    answer: 'The Fuel Stage shows your current sync status including total documents synced, categories detected, and any documents still processing. Click on the Documents or Categories cards to see detailed information about your synced data.'
  },
  {
    category: 'data-sync',
    question: 'What are document categories?',
    answer: 'Categories are automatically detected by AI Rocket based on your document content. Examples include Strategy, Finance, Marketing, Sales, HR, Legal, and more. Having documents across multiple categories improves AI Rocket\'s ability to provide comprehensive insights.'
  },
  {
    category: 'data-sync',
    question: 'Can I manually trigger a sync?',
    answer: 'Yes! In the Fuel Stage, click the "Sync" button to trigger an incremental sync that checks for new or updated files in all your connected folders (Google Drive and Microsoft OneDrive/SharePoint). This is useful when you\'ve just added new documents to your cloud storage.'
  },
  {
    category: 'data-sync',
    question: 'What happens to deleted files?',
    answer: 'When you delete a file from your cloud storage (Google Drive or Microsoft OneDrive), it will be removed from AI Rocket\'s database during the next sync. You can also manually delete documents from the Documents list in the Fuel Stage if needed.'
  },
  {
    category: 'data-sync',
    question: 'Why are some files not syncing?',
    answer: 'Files may not sync if: they are in an unsupported format (images, videos), they are too large, permissions are restricted, or there was a temporary connection issue. Check that files are in supported formats and that AI Rocket has permission to access them.'
  },
  {
    category: 'admin',
    question: 'How do I invite team members?',
    answer: 'As an admin, click on the Team Members section and then click "Invite Member". Enter their email address and they\'ll receive an invitation to join your team.'
  },
  {
    category: 'admin',
    question: 'What\'s the difference between Admin and Member roles?',
    answer: 'Admins can invite team members, manage team settings, connect integrations, delete documents, and create Team Reports that are delivered to all members. Members can chat with AI Rocket, create visualizations, create and manage their own personal reports, and view team data.'
  },
  {
    category: 'admin',
    question: 'How do I create Team Reports?',
    answer: 'As an admin, go to the Reports page and click "New Report". Configure your report (manual or scheduled), then check the "Team Report" checkbox before saving. Team Reports will be delivered to all team members, and each member will see it marked with a "Team Report" badge in their Reports view.'
  },
  {
    category: 'admin',
    question: 'What\'s the difference between personal and Team Reports?',
    answer: 'Personal reports are only visible to the person who creates them. Team Reports, created by admins, are automatically delivered to every team member - each person gets their own copy with a special "Team Report" badge showing which admin created it.'
  },
  {
    category: 'admin',
    question: 'How do I connect cloud storage?',
    answer: 'Go to the Connect page > My Connections tab and click "Connect Google Drive" or "Connect Microsoft OneDrive." You can also connect from Mission Control > Fuel Stage. Authorize access and select which folders to sync with AI Rocket.'
  },
  {
    category: 'admin',
    question: 'Can I remove team members?',
    answer: 'Yes, admins can remove team members from the Team Members panel. Click the menu next to a member\'s name and select "Remove from Team". Their access will be revoked immediately.'
  },
  {
    category: 'launch-prep',
    question: 'What is the Launch Preparation Guide?',
    answer: 'The Launch Preparation Guide helps you get your team fully set up with AI Rocket through three stages: Fuel (add your data), Boosters (use AI features), and Guidance (configure your team). Complete tasks to earn Launch Points and unlock the full potential of AI Rocket.'
  },
  {
    category: 'launch-prep',
    question: 'What are Launch Points?',
    answer: 'Launch Points are an important part of the $5M AI Moonshot Challenge scoring criteria. They measure how your team is using AI to Run, Build, and Grow your business. Points are earned through two categories: Launch Prep (completing Fuel, Boosters, and Guidance stages) and Milestones (usage goals for messages, team chats, visualizations, and reports).'
  },
  {
    category: 'launch-prep',
    question: 'How do I earn Launch Points?',
    answer: 'You earn Launch Points in two ways: (1) Launch Prep - complete Fuel, Boosters, and Guidance stages (up to 150 points each, 450 total), and (2) Milestones - bonus points for reaching usage goals like 100/500/1000 messages (+100/+250/+500), 50/200 team chats (+100/+200), 5/25/100 visualizations (+150/+300/+500), and 3/10/25 scheduled reports (+100/+250/+500).'
  },
  {
    category: 'launch-prep',
    question: 'What is the Fuel Stage?',
    answer: 'The Fuel Stage is about adding data to power your AI. Connect Google Drive, Microsoft OneDrive/SharePoint, or upload local files to your Strategy, Meetings, Financial, and Projects folders. Progress through 5 levels by adding more documents - Level 1 needs just 1 document, while Level 5 requires a comprehensive data collection.'
  },
  {
    category: 'launch-prep',
    question: 'What is the Boosters Stage?',
    answer: 'The Boosters Stage helps you learn AI Rocket\'s AI features. Progress through 5 levels: use Guided Chat or send prompts (Level 1), create visualizations (Level 2), generate manual reports (Level 3), schedule recurring reports (Level 4), and build AI agents (Level 5 - coming soon). Complete all levels to earn up to 150 points total.'
  },
  {
    category: 'launch-prep',
    question: 'What is the Guidance Stage?',
    answer: 'The Guidance Stage is about team configuration and growth. Complete 5 levels: configure team settings (Level 1), enable news preferences (Level 2), invite team members (Level 3), create AI jobs (Level 4 - coming soon), and document processes (Level 5 - coming soon). Complete all levels to earn up to 150 points total.'
  },
  {
    category: 'launch-prep',
    question: 'What is Guided Chat?',
    answer: 'Guided Chat is a feature in the Boosters Stage that analyzes your available data and suggests 3 personalized prompts. It helps you get started with AI Rocket by showing you what kinds of questions work best with your specific data. Click any suggestion to send it to AI Rocket and see instant results.'
  },
  {
    category: 'launch-prep',
    question: 'When can I launch?',
    answer: 'You can launch when you reach minimum requirements: Fuel Stage Level 1 (at least 1 document), Boosters Stage Level 4 (scheduled reports set up), and Guidance Stage Level 2 (news preferences enabled). This ensures you have data, know how to use key features, and have your team configured.'
  },
  {
    category: 'launch-prep',
    question: 'What happens when I launch?',
    answer: 'Launching marks your team as fully prepared to use AI Rocket. You\'ll keep all your Launch Points, maintain access to all features, and can continue earning points through daily activity. The Launch Prep Guide remains accessible for reference and adding team members.'
  },
  {
    category: 'launch-prep',
    question: 'Can I go back to previous stages?',
    answer: 'Yes! You can navigate between Fuel, Boosters, and Guidance stages at any time by clicking on them in Mission Control. Your progress is saved, and you can complete tasks in any order that works best for your team.'
  },
  {
    category: 'launch-prep',
    question: 'Do Launch Points expire?',
    answer: 'No, Launch Points never expire. Once earned, they stay on your account permanently. You can continue earning additional points through daily activity and team achievements even after launching.'
  },
  {
    category: 'launch-prep',
    question: 'How do I access the Launch Preparation Guide?',
    answer: 'Click on "Mission Control" in the left sidebar to open the Launch Preparation Guide. From there, you can see your total Launch Points, current progress in each stage, and tap any stage to enter and complete tasks.'
  },
  {
    category: 'proactive-assistant',
    question: 'What is the Proactive Assistant?',
    answer: 'The Proactive Assistant is a Preview feature that transforms your AI assistant from reactive to proactive. Instead of waiting for you to ask questions, it monitors your business data overnight and delivers personalized morning insights -- like deviations in your metrics, progress toward goals, automation opportunities, and predictive risks. Configure it in User Settings > Assistant Preferences.'
  },
  {
    category: 'proactive-assistant',
    question: 'How do I enable proactive notifications?',
    answer: 'Go to User Settings and look for the Assistant Preferences section. Toggle on "Proactive Assistant" and choose your proactive level: Low (essential only -- reports and urgent mentions), Medium (balanced mix of updates and insights), or High (everything including daily summaries). Then enable your preferred notification channels (Email, SMS, WhatsApp, or Telegram).'
  },
  {
    category: 'proactive-assistant',
    question: 'What notification channels are available?',
    answer: 'The Proactive Assistant supports four notification channels: Email (recommended, uses your account email or a custom address), SMS (enter your phone number), WhatsApp (enter your phone number), and Telegram (message @AIRocketBot to get your Chat ID). You can enable any combination of channels.'
  },
  {
    category: 'proactive-assistant',
    question: 'What are Quiet Hours?',
    answer: 'Quiet Hours let you set a do-not-disturb window so notifications respect your schedule. Enable Quiet Hours in Assistant Preferences, then set a start time, end time, and timezone. During quiet hours, non-urgent notifications are held until the window ends. Only critical urgency items (urgency 9-10) bypass quiet hours.'
  },
  {
    category: 'proactive-assistant',
    question: 'What types of notifications can I receive?',
    answer: 'There are 9 configurable notification types: Daily Summary (morning briefing), Report Ready (when scheduled reports generate), Goal Milestone (progress updates), Meeting Reminder (upcoming meetings), Action Item Due (deadline alerts), Team Mention (when mentioned in team chat), Insight Discovered (interesting data findings), Sync Complete (document sync finished), and Weekly Recap (end-of-week summary). Toggle each one individually.'
  },
  {
    category: 'proactive-assistant',
    question: 'Can I customize my assistant\'s name?',
    answer: 'Yes! In Assistant Preferences, you can change your assistant\'s name to anything you like (up to 30 characters). The default name is Astra, but you can personalize it during the Agent Mode onboarding or change it anytime in settings.'
  },
  {
    category: 'scheduled-tasks',
    question: 'What are Scheduled Tasks?',
    answer: 'Scheduled Tasks is a Preview feature that lets you ask your AI assistant to perform recurring or one-time tasks automatically. For example, "Remind me every Monday at 9am to review my goals" or "Research AI trends every Friday afternoon." The assistant executes the task at the scheduled time and delivers results to you.'
  },
  {
    category: 'scheduled-tasks',
    question: 'How do I create a scheduled task?',
    answer: 'Simply tell your assistant in Agent Chat what you need and when. For example: "Every Friday at 3pm, research the latest trends in AI automation and send me a summary." Your assistant will parse the request and create a persistent scheduled task. You can also view and manage all tasks from the Scheduled Tasks tab.'
  },
  {
    category: 'scheduled-tasks',
    question: 'What types of tasks can I schedule?',
    answer: 'You can schedule Reminders (simple alerts), Research (AI research on a topic), Reports (custom data analysis), Goal Reviews (check progress toward goals), Data Checks (monitor specific metrics), Summaries (regular briefings), and Custom Prompts (any AI prompt you want run on a schedule).'
  },
  {
    category: 'scheduled-tasks',
    question: 'How do I manage my scheduled tasks?',
    answer: 'Open the Scheduled Tasks tab to see all your tasks. Filter by Active, Paused, or Completed. Each task shows its schedule, run count, and next execution time. You can pause a task (stops execution but keeps the schedule), resume it, or delete it entirely. Click the expand arrow to see the full task details and AI prompt.'
  },
  {
    category: 'scheduled-tasks',
    question: 'Can I see the history of task executions?',
    answer: 'Yes! On any scheduled task, expand the details and click "View Execution History" to see up to 10 recent executions. Each entry shows the timestamp, success/failure status, and the result or error message. This helps you verify tasks are running correctly.'
  },
  {
    category: 'connected-apps',
    question: 'What is Connected Apps?',
    answer: 'Connected Apps is a Preview feature that provides a unified hub for connecting and managing all your third-party business tools with AI Rocket. Browse 20+ available integrations across 9 categories including Storage, Calendar, Finance, Communication, CRM, Project Management, Transcription, Analytics, and Custom. Once connected, the AI agent can reference data from these tools in conversation.'
  },
  {
    category: 'connected-apps',
    question: 'How do I connect an app?',
    answer: 'Go to the Connected Apps tab and browse the available integrations by category. Click "Connect" on any integration card to begin the authorization process. For calendar integrations (Google Calendar, Outlook), it uses your existing cloud storage OAuth tokens for one-click setup. Connection status is tracked and visible on each card.'
  },
  {
    category: 'connected-apps',
    question: 'What integrations are available now?',
    answer: 'Currently, Google Calendar and Outlook Calendar integrations are fully active. The AI agent automatically sees your upcoming events (3-day lookahead) and references them in conversation. Additional integrations for QuickBooks, Slack, HubSpot, Salesforce, Notion, Asana, and more are coming soon.'
  },
  {
    category: 'connected-apps',
    question: 'How does the AI use my connected apps?',
    answer: 'When you connect an app, the AI agent gains awareness of that data source. For example, with Google Calendar connected, the agent can see your upcoming meetings and reference them when you ask about your schedule. Usage is tracked -- you can see how many times the AI has referenced each connection on the integration card.'
  },
  {
    category: 'connected-apps',
    question: 'Can I disconnect an app?',
    answer: 'Yes! Click on any connected integration card to expand it, then click "Disconnect" to remove the connection. Your previously synced data remains available, but the AI will no longer pull new data from that source. You can reconnect anytime.'
  },
  {
    category: 'mcp-tools',
    question: 'What are MCP Tools?',
    answer: 'MCP Tools is a Preview feature that shows the automation tools powering your AI assistant\'s capabilities. MCP (Model Context Protocol) servers like n8n provide tools that let the AI agent perform actions beyond just conversation -- like querying databases, calling APIs, or running workflows. The MCP Tools tab shows all discovered tools and their status.'
  },
  {
    category: 'mcp-tools',
    question: 'What is the API Wizard?',
    answer: 'The API Wizard is an admin-only tool that lets you connect any custom API to AI Rocket. Paste an API documentation URL or text, and the AI automatically analyzes it, discovers endpoints, and generates tool schemas. You then configure authentication (API Key, Bearer Token, or Basic Auth), test the connection, and submit for review. Once approved, your AI agent can use the new API.'
  },
  {
    category: 'mcp-tools',
    question: 'How do I use the API Wizard?',
    answer: 'As an admin, go to the MCP Tools tab and click "Connect API." Choose to enter a URL or paste documentation text, then click "Analyze API." Review the discovered endpoints and API details, configure authentication, test the connection, and submit. Endpoints are generated and submitted for admin approval before the AI agent can use them.'
  },
  {
    category: 'mcp-tools',
    question: 'What tool categories are available?',
    answer: 'Tools are organized into categories: Finance, CRM & Sales, Communication, Project Management, Transcription, Analytics, Marketing, E-Commerce, Automation, and General. Each tool card shows its category, description, usage count, and whether it is read-only or can perform write operations.'
  },
  {
    category: 'mcp-tools',
    question: 'Can I see how tools are being used?',
    answer: 'Yes! Each tool card displays its usage count (how many times it has been executed) and average execution time. Admins can also monitor MCP server health status (Healthy, Degraded, or Unreachable) and the total number of tools available on each server.'
  },
  {
    category: 'getting-started',
    question: 'What is Assistant Mode?',
    answer: 'Assistant Mode is a focused split-screen interface for working with your AI assistant. It provides a tabbed layout with Mission Control, Agent Chat, Reports, Team Chat, Connect, and Skills all accessible from dedicated tabs. Enable it in User Settings. It is the recommended way to use AI Rocket once you are past the initial setup.'
  },
  {
    category: 'getting-started',
    question: 'How do I enable Assistant Mode?',
    answer: 'Go to User Settings (click your profile picture, then Settings) and toggle on "Assistant Mode." The interface will switch to the tabbed layout. You can switch back to the classic view at any time by toggling it off.'
  },
  {
    category: 'scheduled-tasks',
    question: 'What is the Guided Task Builder?',
    answer: 'The Guided Task Builder provides 16 pre-built task templates to help you quickly set up useful scheduled tasks. Templates are organized into 4 categories: Productivity (Morning Goal Review, Daily Priorities Check), Research & Intelligence (Industry News Digest, Competitive Intelligence Brief), Team & Alignment (Weekly Progress Summary, Team Pulse Check), and Growth & Strategy (Revenue Growth Analysis, New Opportunity Scanner).'
  },
  {
    category: 'scheduled-tasks',
    question: 'How do I use a task template?',
    answer: 'Open the Scheduled Tasks panel and click "New Task" to see the Guided Task Builder. Browse templates by category or check the popular templates section. Click any template to preview it, then customize the title, AI instructions, frequency, time, and day if needed. Click "Create Task" to activate it.'
  },
  {
    category: 'skills',
    question: 'What are Assistant Skills?',
    answer: 'Assistant Skills are capability modules that enhance how your AI assistant analyzes data and provides insights. Each skill sharpens the assistant\'s focus in a specific domain -- for example, activating the Financial Analyst skill makes the assistant provide deeper financial analysis, while the Marketing Strategist skill enhances marketing-related insights.'
  },
  {
    category: 'skills',
    question: 'What skills are available?',
    answer: 'There are 10 skills available: Financial Analyst, Marketing Strategist, Competitive Intelligence, Operations Optimizer, Team Coach, Growth Strategist, Content Creator, Project Manager, Innovation Scout, and Customer Advocate. Each skill has specific capability tags showing what it enhances.'
  },
  {
    category: 'skills',
    question: 'How do I activate a skill?',
    answer: 'Go to the Skills panel (accessible from the Agent Tools section on Mission Control, or ask your assistant about skills). Toggle any skill on or off with one click. You can activate multiple skills simultaneously -- they stack to provide multi-lens analysis.'
  },
  {
    category: 'skills',
    question: 'Can I have multiple skills active at once?',
    answer: 'Yes! Skills are designed to stack. Activating multiple skills simultaneously gives your assistant a broader perspective. For example, having both Financial Analyst and Growth Strategist active means the assistant will analyze data through both a financial and growth lens.'
  },
  {
    category: 'skills',
    question: 'How do skills affect my assistant?',
    answer: 'Active skills automatically enrich the assistant\'s system prompt with domain expertise. This means your assistant will provide deeper, more specialized analysis in active skill areas. Skills also influence overnight insights and proactive suggestions -- the assistant prioritizes areas where you have active skills.'
  },
  {
    category: 'skills',
    question: 'Can I suggest a new skill?',
    answer: 'Yes! At the bottom of the Skills panel, click "Suggest a New Skill" to submit your idea. Provide a name, description, and use case for the skill you would like to see added. The team reviews all suggestions and may add popular ones in future updates.'
  },
  {
    category: 'connected-apps',
    question: 'Where do I manage my data connections?',
    answer: 'The Connect page > My Connections tab is the central hub for managing all your data connections. Admins can connect new providers (Google Drive or Microsoft OneDrive), reconnect expired tokens, manage folders (add or remove), and disconnect providers. You can also manage connections from the Fuel Stage in Launch Preparation.'
  },
  {
    category: 'connected-apps',
    question: 'How do I reconnect an expired connection?',
    answer: 'Go to the Connect page > My Connections tab. If a connection has an expired token, you will see a warning indicator. Click "Reconnect" to refresh the authentication. You will be redirected to sign in with Google or Microsoft to re-authorize access.'
  }
];

export const faqCategories = {
  'getting-started': {
    title: '🚀 Getting Started',
    description: 'Learn the basics of using AI Rocket'
  },
  'launch-prep': {
    title: '🎯 Launch Preparation',
    description: 'Mission Control and Launch Points guide'
  },
  'data-sync': {
    title: '📂 Data Sync & Folders',
    description: 'Connecting folders and syncing documents'
  },
  'chat-modes': {
    title: '💬 Chat Modes',
    description: 'Understanding Private and Team chat'
  },
  'visualizations': {
    title: '📊 Visualizations',
    description: 'Creating and managing data visualizations'
  },
  'astra-create': {
    title: '✨ Creative Suite',
    description: 'AI-powered images and presentations'
  },
  'team': {
    title: '👥 Team Collaboration',
    description: 'Working with your team in AI Rocket'
  },
  'reports': {
    title: '📈 Reports',
    description: 'Viewing and understanding reports'
  },
  'integrations': {
    title: '🔗 Integrations',
    description: 'Connecting cloud storage and other services'
  },
  'admin': {
    title: '⚙️ Admin Features',
    description: 'Managing your team and settings'
  },
  'proactive-assistant': {
    title: '🔔 Proactive Assistant (Preview)',
    description: 'AI-powered overnight insights and notifications'
  },
  'scheduled-tasks': {
    title: '📅 Scheduled Tasks (Preview)',
    description: 'Automated recurring tasks and reminders'
  },
  'connected-apps': {
    title: '🔌 Connected Apps (Preview)',
    description: 'Third-party app integrations hub'
  },
  'mcp-tools': {
    title: '🔧 MCP Tools (Preview)',
    description: 'Automation tools and API Wizard'
  },
  'skills': {
    title: '🎯 Assistant Skills',
    description: 'AI capability modules and skill activation'
  }
} as const;
