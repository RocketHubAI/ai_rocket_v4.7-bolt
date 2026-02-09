import { TourStep } from '../components/InteractiveTour';
import { ChatMode, TabType } from '../types';

export interface TourNavigation {
  mode?: ChatMode;
  openTab?: TabType;
  openUserSettings?: boolean;
  closeUserSettings?: boolean;
}

export const memberTourSteps: TourStep[] = [
  {
    id: 'chat-with-astra',
    title: 'Chat with Astra',
    description: 'Ask Astra questions about your data using the message box. Save your favorite prompts so you can quickly use them again.',
    targetSelector: '[data-tour="chat-input"]',
    position: 'top',
    navigation: { openTab: 'private', mode: 'private' }
  },
  {
    id: 'suggested-prompts',
    title: 'AI Suggested Prompts',
    description: 'Click the sparkle icon to see powerful suggested prompts that help you get the most out of Astra. These prompts are designed to analyze your mission, meetings, financials, and team alignment.',
    targetSelector: '[data-tour="suggested-prompts"]',
    position: 'right',
    navigation: { openTab: 'private', mode: 'private' }
  },
  {
    id: 'reports-view',
    title: 'Manage & View Reports',
    description: 'Access the Reports page to view, create, and manage reports. You can set up automated scheduled reports that run daily, weekly, or monthly.',
    position: 'top',
    navigation: { openTab: 'reports', mode: 'reports' }
  },
  {
    id: 'sync-your-data',
    title: 'AI Data Sync',
    description: 'This shows your synced data status. Your admin connects Google Drive folders so Astra can analyze your documents. The more data synced, the smarter Astra becomes!',
    targetSelector: '[data-tour="data-sync"]',
    position: 'top',
    navigation: { openTab: 'mission-control', mode: 'private' }
  },
  {
    id: 'mission-control',
    title: 'Welcome to Mission Control!',
    description: 'This is your home base! Track Launch Points, view synced data, access AI features, and manage your team. Earn points across Fuel (data), Boosters (AI features), and Guidance (team) stages. Explore and have fun!',
    position: 'top',
    navigation: { openTab: 'mission-control', mode: 'private' }
  }
];

export const adminTourSteps: TourStep[] = [
  {
    id: 'chat-with-astra',
    title: 'Chat with Astra',
    description: 'Ask Astra questions about your data using the message box. Save your favorite prompts so you can quickly use them again.',
    targetSelector: '[data-tour="chat-input"]',
    position: 'top',
    navigation: { openTab: 'private', mode: 'private' }
  },
  {
    id: 'suggested-prompts',
    title: 'AI Suggested Prompts',
    description: 'Click the sparkle icon to see powerful suggested prompts that help you get the most out of Astra. These prompts are designed to analyze your mission, meetings, financials, and team alignment.',
    targetSelector: '[data-tour="suggested-prompts"]',
    position: 'right',
    navigation: { openTab: 'private', mode: 'private' }
  },
  {
    id: 'reports-view',
    title: 'Manage & View Reports',
    description: 'Access the Reports page to view, create, and manage reports. You can set up automated scheduled reports that run daily, weekly, or monthly.',
    position: 'top',
    navigation: { openTab: 'reports', mode: 'reports' }
  },
  {
    id: 'sync-your-data',
    title: 'AI Data Sync',
    description: 'This shows your synced data status. Connect Google Drive folders so Astra can analyze your documents. Click "Manage" to add folders. The more data synced, the smarter Astra becomes!',
    targetSelector: '[data-tour="data-sync"]',
    position: 'top',
    navigation: { openTab: 'mission-control', mode: 'private' }
  },
  {
    id: 'team-members',
    title: 'Manage Your Team',
    description: 'View and manage team members here. As an admin, you can invite new members, manage roles, and remove users from your team.',
    targetSelector: '[data-tour="team-panel"]',
    position: 'top',
    navigation: { openTab: 'mission-control', mode: 'private' }
  },
  {
    id: 'mission-control',
    title: 'Welcome to Mission Control!',
    description: 'This is your home base! Track Launch Points, view synced data, access AI features, and manage your team. Earn points across Fuel (data), Boosters (AI features), and Guidance (team) stages. Explore and have fun!',
    position: 'top',
    navigation: { openTab: 'mission-control', mode: 'private' }
  }
];

export function getTourStepsForRole(isAdmin: boolean): TourStep[] {
  return isAdmin ? adminTourSteps : memberTourSteps;
}
