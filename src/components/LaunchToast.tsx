import React, { useEffect, useState } from 'react';
import { X, Trophy, Star, Zap, Rocket, Award } from 'lucide-react';

export interface ToastNotification {
  id: string;
  type: 'level_up' | 'achievement' | 'points' | 'launch';
  title: string;
  message: string;
  points?: number;
  icon?: string;
  color?: 'orange' | 'cyan' | 'green' | 'yellow' | 'purple';
  duration?: number;
}

interface LaunchToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const LaunchToast: React.FC<LaunchToastProps> = ({ notifications, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const duration = notification.duration || 5000;

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'level_up':
        return <Star className="w-6 h-6" />;
      case 'achievement':
        return <Award className="w-6 h-6" />;
      case 'points':
        return <Trophy className="w-6 h-6" />;
      case 'launch':
        return <Rocket className="w-6 h-6" />;
      default:
        return <Zap className="w-6 h-6" />;
    }
  };

  const getColorClasses = () => {
    const color = notification.color || 'orange';
    return {
      bg: `bg-${color}-500/20`,
      border: `border-${color}-500/50`,
      text: `text-${color}-400`,
      glow: `shadow-${color}-500/20`
    };
  };

  const colors = getColorClasses();

  return (
    <div
      className={`
        relative bg-gray-800 border-2 rounded-lg shadow-xl p-4
        transform transition-all duration-300
        ${colors.border}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.type === 'level_up' || notification.type === 'launch' ? 'animate-pulse' : ''}
      `}
    >
      {/* Confetti effect for major achievements */}
      {(notification.type === 'level_up' || notification.type === 'launch') && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="confetti-container">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start space-x-3 relative z-10">
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
          ${colors.bg} ${colors.text}
        `}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white mb-1 flex items-center">
            {notification.title}
            {notification.points && (
              <span className="ml-2 text-sm font-semibold text-yellow-400">
                +{notification.points}
              </span>
            )}
          </h4>
          <p className="text-sm text-gray-300">{notification.message}</p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 rounded-b-lg overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-${notification.color || 'orange'}-500 to-${notification.color || 'orange'}-400`}
          style={{
            animation: `progress ${duration}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }

        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }

        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(45deg, #ff6b6b, #ffd93d, #6bcf7f, #4d96ff);
          opacity: 0;
          animation: confetti-fall 1.5s ease-out forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(200px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Hook to manage toast notifications
export function useLaunchToast() {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const showToast = (notification: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const dismissToast = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showLevelUp = (stage: string, level: number, points: number) => {
    showToast({
      type: 'level_up',
      title: `Level ${level} Complete!`,
      message: `${stage.charAt(0).toUpperCase() + stage.slice(1)} stage upgraded!`,
      points,
      color: stage === 'fuel' ? 'orange' : stage === 'boosters' ? 'cyan' : 'green',
      duration: 6000
    });
  };

  const showAchievement = (name: string, description: string, points: number) => {
    showToast({
      type: 'achievement',
      title: '🎉 Achievement Unlocked!',
      message: `${name}: ${description}`,
      points,
      color: 'purple',
      duration: 6000
    });
  };

  const showPoints = (points: number, reason: string) => {
    showToast({
      type: 'points',
      title: `+${points} Launch Points`,
      message: reason,
      points,
      color: 'yellow',
      duration: 4000
    });
  };

  const showLaunch = () => {
    showToast({
      type: 'launch',
      title: '🚀 LAUNCH SUCCESSFUL!',
      message: 'Welcome to Astra Intelligence!',
      color: 'orange',
      duration: 8000
    });
  };

  return {
    notifications,
    showToast,
    dismissToast,
    showLevelUp,
    showAchievement,
    showPoints,
    showLaunch
  };
}
