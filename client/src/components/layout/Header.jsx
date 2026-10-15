import React from 'react';
import { Menu, Zap, Bell, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

export const Header = ({ onOpenMobile }) => {
  const { user } = useAuth();
  const { setIsPanelOpen, demoStatus } = useDemo();

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format current date: "Wednesday, October 14, 2026"
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const firstName = user?.name ? user.name.split(' ')[0] : 'Patient';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Mobile Hamburger & Greeting */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {getGreeting()}, <span className="text-teal-700">{firstName}</span>
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Right Actions & Demo Mode Indicator */}
      <div className="flex items-center gap-3">
        {/* Prominent Demo Mode Indicator */}
        {demoStatus?.config?.enabled && (
          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
            title="Open Demo Controller"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Presentation Demo Mode</span>
            <span className="sm:hidden">Demo</span>
          </button>
        )}

        {/* Timezone badge */}
        <div className="hidden md:flex items-center text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          {user?.timezone || 'Asia/Kolkata'}
        </div>
      </div>
    </header>
  );
};
