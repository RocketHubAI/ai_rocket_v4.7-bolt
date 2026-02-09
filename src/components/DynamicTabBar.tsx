import {
  Rocket,
  MessageSquare,
  FileBarChart,
  Users,
  BarChart3,
  Brain,
  Bot,
  Compass,
  Activity,
  LayoutDashboard,
  Trophy,
  CalendarClock,
  Wrench,
  Plug,
  Sparkles,
  Search,
  Target,
  X
} from 'lucide-react';
import { TabType, TabConfig } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  MessageSquare,
  FileBarChart,
  Users,
  BarChart3,
  Brain,
  Bot,
  Compass,
  Activity,
  LayoutDashboard,
  Trophy,
  CalendarClock,
  Wrench,
  Plug,
  Sparkles,
  Search,
  Target
};

interface DynamicTabBarProps {
  openTabs: TabConfig[];
  activeTab: TabType;
  onTabClick: (tab: TabType) => void;
  onCloseTab: (tab: TabType) => void;
  compact?: boolean;
}

export default function DynamicTabBar({
  openTabs,
  activeTab,
  onTabClick,
  onCloseTab,
  compact = false
}: DynamicTabBarProps) {
  const getTabSize = () => {
    const count = openTabs.length;
    if (count <= 3) return 'large';
    if (count <= 5) return 'medium';
    return 'small';
  };

  const tabSize = getTabSize();

  const sizeClasses = {
    large: {
      padding: 'px-4 py-2.5',
      iconSize: 'w-5 h-5',
      fontSize: 'text-sm',
      gap: 'gap-2'
    },
    medium: {
      padding: 'px-3 py-2',
      iconSize: 'w-4 h-4',
      fontSize: 'text-xs',
      gap: 'gap-1.5'
    },
    small: {
      padding: 'px-2.5 py-1.5',
      iconSize: 'w-4 h-4',
      fontSize: 'text-xs',
      gap: 'gap-1'
    }
  };

  const currentSize = sizeClasses[tabSize];

  return (
    <div className="flex flex-wrap gap-1 bg-slate-800/50 p-1 rounded-lg">
      {openTabs.map((tab) => {
        const IconComponent = iconMap[tab.icon];
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={`
              group relative flex items-center ${currentSize.gap} ${currentSize.padding}
              rounded-md transition-all duration-200 touch-manipulation select-none
              min-h-[44px] border border-slate-600/60
              ${isActive
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 active:bg-slate-700/70'
              }
            `}
          >
            {IconComponent && (
              <IconComponent className={`${currentSize.iconSize} flex-shrink-0`} />
            )}
            <span className={`${currentSize.fontSize} font-medium whitespace-nowrap`}>
              {compact ? tab.shortLabel : tab.label}
            </span>

            {!tab.isCore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={`
                  ml-1 p-0.5 rounded transition-opacity duration-200
                  ${isActive
                    ? 'opacity-60 hover:opacity-100 hover:bg-slate-600'
                    : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-600'
                  }
                `}
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {isActive && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
