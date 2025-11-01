import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../../lib/auth';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    setResending(true);
    setError('');

    try {
      await authService.resendVerificationEmail(email);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Check Your Email</h1>
          <p className="text-muted-foreground mt-2">
            We've sent a verification link to your email
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong className="block mb-2">What's next?</strong>
                  Click the verification link in the email we sent to{' '}
                  <span className="font-semibold">{email}</span> to activate your account.
                </p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>The link will expire in 24 hours.</p>
                <p>Check your spam folder if you don't see the email.</p>
              </div>

              {resent && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">Verification email sent successfully!</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleResend}
                  variant="outline"
                  className="w-full"
                  disabled={resending || resent}
                >
                  {resending ? 'Resending...' : resent ? 'Email Sent!' : 'Resend Verification Email'}
                </Button>

                <Button
                  onClick={() => navigate('/auth/signin')}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
