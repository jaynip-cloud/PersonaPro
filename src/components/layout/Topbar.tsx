import React, { useState } from 'react';
import { Search, Bell, Moon, Sun, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

export const Topbar: React.FC = () => {
  const { theme, toggleTheme, recommendations } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNotifications = recommendations.filter(r => r.status === 'new').length;

  return (
    <header className="fixed left-60 right-0 top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search clients, documents, insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="relative rounded-md p-2 hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 text-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-foreground" />
            )}
          </button>

          <button className="relative rounded-md p-2 hover:bg-accent transition-colors" aria-label="Notifications">
            <Bell className="h-5 w-5 text-foreground" />
            {unreadNotifications > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadNotifications}
              </Badge>
            )}
          </button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-3">
            <Avatar name="Admin User" size="sm" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Admin User</p>
              <p className="text-xs text-muted-foreground">admin@personapro.com</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
