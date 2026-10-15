import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  History,
  Users2,
  Settings,
  Zap,
  Activity,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';

export const Sidebar = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();
  const { setIsPanelOpen, demoStatus } = useDemo();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/medicines', label: 'My Medicines', icon: Pill },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/history', label: 'Medication History', icon: History },
    { to: '/care-circle', label: 'Care Circle', icon: Users2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Medi<span className="text-teal-600">Sync</span>
          </span>
          <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Adherence System
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold shadow-2xs border border-teal-100/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Demo Mode Trigger in Sidebar */}
      {demoStatus?.config?.enabled && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              setIsPanelOpen(true);
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs font-semibold hover:bg-amber-500/15 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              <span>Demo Controls</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900 uppercase">
              Active
            </span>
          </button>
        </div>
      )}

      {/* User profile & logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Patient'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
