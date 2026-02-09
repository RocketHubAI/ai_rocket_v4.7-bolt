import { StageProgress } from '../hooks/useLaunchPreparation';

export interface LevelRequirement {
  level: number;
  name: string;
  description: string;
  requirements: string[];
  points: number;
  icon: string;
}

// Fuel Stage Level Definitions
export const FUEL_LEVELS: LevelRequirement[] = [
  {
    level: 1,
    name: 'Level 1',
    description: 'Get started with your first document',
    requirements: ['1 document (any type)'],
    points: 10,
    icon: 'file-text'
  },
  {
    level: 2,
    name: 'Level 2',
    description: 'Establish your data foundation',
    requirements: ['1 Strategy Document', '1 Project Document', '1 Meeting Document', '1 Financial Document'],
    points: 20,
    icon: 'folder-tree'
  },
  {
    level: 3,
    name: 'Level 3',
    description: 'Build a solid data collection',
    requirements: ['3 Strategy Documents', '3 Project Documents', '10 Meeting Documents', '3 Financial Documents'],
    points: 30,
    icon: 'database'
  },
  {
    level: 4,
    name: 'Level 4',
    description: 'Establish a mature data foundation',
    requirements: ['10 Strategy Documents', '10 Project Documents', '50 Meeting Documents', '10 Financial Documents'],
    points: 40,
    icon: 'hard-drive'
  },
  {
    level: 5,
    name: 'Level 5',
    description: 'Advanced preparation for maximum insights',
    requirements: ['10 Strategy Documents', '10 Project Documents', '100 Meeting Documents', '10 Financial Documents'],
    points: 50,
    icon: 'rocket'
  }
];

// Boosters Stage Level Definitions
export const BOOSTERS_LEVELS: LevelRequirement[] = [
  {
    level: 1,
    name: 'Level 1',
    description: 'Start talking to Astra',
    requirements: ['Use Guided Chat OR send 5 prompts'],
    points: 10,
    icon: 'message-circle'
  },
  {
    level: 2,
    name: 'Level 2',
    description: 'See your data come to life',
    requirements: ['Create 1 visualization'],
    points: 20,
    icon: 'bar-chart'
  },
  {
    level: 3,
    name: 'Level 3',
    description: 'Generate insights on demand',
    requirements: ['Generate 1 manual report'],
    points: 30,
    icon: 'file-bar-chart'
  },
  {
    level: 4,
    name: 'Level 4',
    description: 'Set up automated insights',
    requirements: ['Schedule 1 recurring report'],
    points: 40,
    icon: 'calendar-clock'
  },
  {
    level: 5,
    name: 'Level 5',
    description: 'Build your first AI agent',
    requirements: ['Build 1 AI agent (coming soon)'],
    points: 50,
    icon: 'bot'
  }
];

// Guidance Stage Level Definitions
export const GUIDANCE_LEVELS: LevelRequirement[] = [
  {
    level: 1,
    name: 'Level 1',
    description: 'Set up your team',
    requirements: ['Configure team settings'],
    points: 10,
    icon: 'settings'
  },
  {
    level: 2,
    name: 'Level 2',
    description: 'Stay informed',
    requirements: ['Enable news preferences'],
    points: 20,
    icon: 'newspaper'
  },
  {
    level: 3,
    name: 'Level 3',
    description: 'Build your team',
    requirements: ['Invite 1+ team member'],
    points: 30,
    icon: 'user-plus'
  },
  {
    level: 4,
    name: 'Level 4',
    description: 'Create automated workflows',
    requirements: ['Create 1 AI job (coming soon)'],
    points: 40,
    icon: 'briefcase'
  },
  {
    level: 5,
    name: 'Level 5',
    description: 'Document your processes',
    requirements: ['Create 1 guidance document (coming soon)'],
    points: 50,
    icon: 'book-open'
  }
];

// Get level requirements for a stage
export function getLevelRequirements(stage: 'fuel' | 'boosters' | 'guidance'): LevelRequirement[] {
  switch (stage) {
    case 'fuel':
      return FUEL_LEVELS;
    case 'boosters':
      return BOOSTERS_LEVELS;
    case 'guidance':
      return GUIDANCE_LEVELS;
  }
}

// Calculate progress percentage for a stage
export function calculateStageProgress(progress: StageProgress | null): number {
  if (!progress) return 0;

  // Each stage has 5 levels, so each level is 20% progress
  return Math.min((progress.level / 5) * 100, 100);
}

// Check if user can progress to next stage
export function canProgressToNextStage(
  currentStage: 'fuel' | 'boosters' | 'guidance',
  fuelProgress: StageProgress | null,
  boostersProgress: StageProgress | null,
  guidanceProgress: StageProgress | null
): boolean {
  // User must have at least level 1 in current stage to progress
  const getCurrentLevel = () => {
    switch (currentStage) {
      case 'fuel':
        return fuelProgress?.level || 0;
      case 'boosters':
        return boostersProgress?.level || 0;
      case 'guidance':
        return guidanceProgress?.level || 0;
    }
  };

  return getCurrentLevel() >= 1;
}

// Check if user is ready to launch
export function isReadyToLaunch(
  fuelProgress: StageProgress | null,
  boostersProgress: StageProgress | null,
  guidanceProgress: StageProgress | null
): boolean {
  // User must meet minimum requirements: Fuel 1, Boosters 4, Guidance 2
  return (
    (fuelProgress?.level || 0) >= 1 &&
    (boostersProgress?.level || 0) >= 4 &&
    (guidanceProgress?.level || 0) >= 2
  );
}

// Get minimum points required to launch
export function getMinimumPointsToLaunch(): number {
  // Minimum requirements: Fuel 1 (10) + Boosters 4 (10+20+30+40=100) + Guidance 2 (10+20=30) = 140 points
  return 140;
}

// Get recommended points to launch
export function getRecommendedPointsToLaunch(): number {
  // Maximum points possible: All levels 5 in all stages = 150 + 150 + 150 = 450 points
  // Note: This includes both task achievements and level achievements
  return 450;
}

// Get stage color theme
export function getStageColor(stage: 'fuel' | 'boosters' | 'guidance'): {
  primary: string;
  light: string;
  dark: string;
} {
  switch (stage) {
    case 'fuel':
      return {
        primary: 'orange-500',
        light: 'orange-400',
        dark: 'orange-600'
      };
    case 'boosters':
      return {
        primary: 'cyan-500',
        light: 'cyan-400',
        dark: 'cyan-600'
      };
    case 'guidance':
      return {
        primary: 'green-500',
        light: 'green-400',
        dark: 'green-600'
      };
  }
}

// Get stage icon
export function getStageIcon(stage: 'fuel' | 'boosters' | 'guidance'): string {
  switch (stage) {
    case 'fuel':
      return 'fuel';
    case 'boosters':
      return 'zap';
    case 'guidance':
      return 'compass';
  }
}

// Format points with commas
export function formatPoints(points: number): string {
  return points.toLocaleString();
}

// Get congratulatory message for level up
export function getLevelUpMessage(stage: 'fuel' | 'boosters' | 'guidance', level: number): string {
  const stageName = stage.charAt(0).toUpperCase() + stage.slice(1);
  const levelInfo = getLevelRequirements(stage)[level - 1];

  if (!levelInfo) return `Level ${level} Complete!`;

  return `${stageName} Level ${level}: ${levelInfo.name} Complete!`;
}

// Get encouragement message for stage
export function getEncouragementMessage(stage: 'fuel' | 'boosters' | 'guidance', level: number): string {
  if (level === 5) {
    return `Amazing! You've mastered the ${stage} stage. You're truly prepared for launch! 🚀`;
  }

  if (level >= 3) {
    return `Great progress! You're building a strong foundation. Keep going!`;
  }

  if (level >= 1) {
    return `Nice start! Keep adding more to unlock the full potential of Astra.`;
  }

  return `Let's get started! Complete your first level to unlock the next stage.`;
}

// Calculate overall progress percentage
export function calculateOverallProgress(
  fuelProgress: StageProgress | null,
  boostersProgress: StageProgress | null,
  guidanceProgress: StageProgress | null
): number {
  const fuelPercent = calculateStageProgress(fuelProgress);
  const boostersPercent = calculateStageProgress(boostersProgress);
  const guidancePercent = calculateStageProgress(guidanceProgress);

  return Math.round((fuelPercent + boostersPercent + guidancePercent) / 3);
}

// Get stage name display
export function getStageDisplayName(stage: 'fuel' | 'boosters' | 'guidance' | 'ready' | 'launched'): string {
  switch (stage) {
    case 'fuel':
      return 'Fuel Stage';
    case 'boosters':
      return 'Boosters Stage';
    case 'guidance':
      return 'Guidance Stage';
    case 'ready':
      return 'Ready to Launch';
    case 'launched':
      return 'Launched!';
  }
}
