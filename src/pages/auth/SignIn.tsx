import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Briefcase, Mail, Lock, AlertCircle, MailWarning } from 'lucide-react';
import { authService } from '../../lib/auth';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNotVerified(false);
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid email or password';

      if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('confirm')) {
        setEmailNotVerified(true);
        setError('Please verify your email address before signing in.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    setError('');
    setResentSuccess(false);

    try {
      await authService.resendVerificationEmail(email);
      setResentSuccess(true);
      setTimeout(() => setResentSuccess(false), 5000);
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mb-4 text-sm">
          <strong className="block mb-2">Test Admin Credentials:</strong>
          <div className="space-y-2 text-xs">
            <div className="bg-white rounded p-2">
              <div className="font-semibold text-blue-800">Admin Account</div>
              <div className="font-mono mt-1">
                <div>admin@gmail.com</div>
                <div>Admin123!</div>
              </div>
            </div>
            <div className="bg-white rounded p-2">
              <div className="font-semibold text-blue-800">Demo Account</div>
              <div className="font-mono mt-1">
                <div>demo@gmail.com</div>
                <div>Demo123!</div>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && !emailNotVerified && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {emailNotVerified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <MailWarning className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-900 mb-1">
                        Email Not Verified
                      </h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        Please verify your email address before signing in. Check your inbox for the verification link.
                      </p>
                      {resentSuccess ? (
                        <p className="text-sm text-green-700 font-medium">
                          Verification email sent successfully!
                        </p>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendVerification}
                          disabled={resending || !email}
                          className="border-yellow-300 text-yellow-900 hover:bg-yellow-100"
                        >
                          {resending ? 'Resending...' : 'Resend Verification Link'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="you@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-primary font-medium hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
