import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (organization && !organization.onboarding_completed) {
      navigate('/onboarding');
      return;
    }
  }, [user, organization, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !organization || !organization.onboarding_completed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-16">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
