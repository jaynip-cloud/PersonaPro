import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authService } from '../../lib/auth';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          const orgs = await authService.getUserOrganizations(session.user.id);

          if (orgs && orgs.length > 0) {
            const org = orgs[0];

            if (org.onboarding_completed_at) {
              navigate('/dashboard');
            } else {
              navigate('/onboarding');
            }
          } else {
            const newOrg = await authService.createPlaceholderOrg(session.user.id);
            navigate('/onboarding');
          }
        } else {
          navigate('/auth/signin');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setTimeout(() => navigate('/auth/signin'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verifying your email...</p>
      </div>
    </div>
  );
};
