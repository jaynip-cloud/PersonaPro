import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  Sparkles,
  BookOpen,
  FileText,
  TrendingUp,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/app/clients', icon: Users },
  { name: 'Projects', href: '/app/projects', icon: Briefcase },
  { name: 'Pitch Generator', href: '/app/pitch-generator', icon: FileText },
  { name: 'Growth Opportunities', href: '/app/growth-opportunities', icon: TrendingUp },
  { name: 'Knowledge Base', href: '/app/knowledge-base', icon: BookOpen },
  { name: 'Settings', href: '/app/settings', icon: Settings },
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
              {item.name}
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
