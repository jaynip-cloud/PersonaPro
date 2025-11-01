import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { authService } from '../../lib/auth';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          setSuccess(true);
          setLoading(false);

          const orgs = await authService.getUserOrganizations(session.user.id);

          if (orgs && orgs.length > 0) {
            const org = orgs[0];

            if (org.onboarding_completed_at) {
              setTimeout(() => navigate('/dashboard'), 2000);
            } else {
              setTimeout(() => navigate('/onboarding'), 2000);
            }
          } else {
            await authService.createPlaceholderOrg(session.user.id);
            setTimeout(() => navigate('/onboarding'), 2000);
          }
        } else {
          navigate('/auth/signin');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground font-medium">Verifying your email...</p>
              <p className="text-sm text-muted-foreground mt-2">Please wait a moment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-600 mb-4 font-medium">{error}</div>
              <p className="text-muted-foreground mb-6">Redirecting to sign in...</p>
              <Button onClick={() => navigate('/auth/signin')} variant="primary">
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h2>
              <p className="text-muted-foreground mb-6">
                Your email has been successfully verified. Redirecting you now...
              </p>
              <div className="flex justify-center">
                <Button onClick={() => navigate('/onboarding')} variant="primary">
                  Continue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
