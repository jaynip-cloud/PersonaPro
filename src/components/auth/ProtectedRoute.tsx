import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOnboarding = false,
}) => {
  const { user, organization, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && organization) {
      const isOnboardingComplete = !!organization.onboarding_completed_at;

      if (!isOnboardingComplete && requireOnboarding) {
        navigate('/onboarding');
      } else if (isOnboardingComplete && !requireOnboarding && window.location.pathname === '/onboarding') {
        navigate('/welcome');
      }
    }
  }, [user, organization, loading, requireOnboarding, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  return <>{children}</>;
};
