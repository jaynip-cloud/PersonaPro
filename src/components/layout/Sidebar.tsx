import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  BookOpen,
  History,
  TrendingUp,
} from 'lucide-react';
import { ComingSoonModal } from '../ui/ComingSoonModal';
import { Logo } from '../ui/Logo';
import { useApp } from '../../context/AppContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, comingSoon: false },
  { name: 'Clients', href: '/clients', icon: Users, comingSoon: false },
  { name: 'Pitch History', href: '/pitch-history', icon: History, comingSoon: false },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen, comingSoon: false },
  { name: 'Projects', href: '/projects', icon: Briefcase, comingSoon: true },
  { name: 'Growth Opportunities', href: '/growth-opportunities', icon: TrendingUp, comingSoon: true },
  { name: 'Settings', href: '/settings', icon: Settings, comingSoon: false },
];

export const Sidebar: React.FC = () => {
  const { theme } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState('');

  const handleNavClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    if (item.comingSoon) {
      e.preventDefault();
      setSelectedFeature(item.name);
      setModalOpen(true);
    }
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <Logo size="lg" theme={theme} />
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative ${
                    isActive && !item.comingSoon
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  } ${item.comingSoon ? 'cursor-pointer' : ''}`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.name}</span>
                {item.comingSoon && (
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    SOON
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

      <ComingSoonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        featureName={selectedFeature}
      />
    </>
  );
};
