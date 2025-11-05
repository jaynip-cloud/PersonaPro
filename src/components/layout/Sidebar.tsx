import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Sparkles,
  BookOpen,
  History,
  TrendingUp,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projects', href: '/projects', icon: Briefcase, comingSoon: true },
  { name: 'Pitch History', href: '/pitch-history', icon: History },
  { name: 'Growth Opportunities', href: '/growth-opportunities', icon: TrendingUp, comingSoon: true },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          <Sparkles className="h-6 w-6 text-sidebar-primary" />
          <span className="text-xl font-bold text-sidebar-foreground font-serif">PersonaPro</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {item.comingSoon && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Soon
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="text-xs text-sidebar-foreground/60">
            <p className="font-medium">AI-Powered Intelligence</p>
            <p className="mt-1">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
