import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { VAHLogo } from './VAHLogo';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
  onGoBack: () => void;
  step?: 'email' | 'sent' | 'reset';
  token?: string;
}

export function ForgotPasswordPage({ onNavigate, onGoBack, step = 'email', token }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);

    try {
      // Call backend API to request password reset
      const response = await fetch('/api/profile/reset-password-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      // Backend returns 204 (No Content) for security (no user enumeration)
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Password reset instructions have been sent to ${email}` 
        });
        
        // Navigate to sent confirmation after brief delay
        setTimeout(() => {
          onNavigate('reset-password-sent');
        }, 1500);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to send reset link. Please try again or contact support if the problem persists.' 
        });
      }
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to send reset link. Please try again or contact support if the problem persists.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password.trim()) {
      setMessage({ type: 'error', text: 'Please enter a new password' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    try {
      // Call backend API to reset password
      const response = await fetch('/api/profile/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: token || '',
          password: password 
        }),
      });

      if (response.ok) {
        // Backend returns 204 (No Content) on success
        setMessage({ 
          type: 'success', 
          text: 'Password has been successfully reset. Redirecting to login...' 
        });
        
        // Navigate to login after brief delay
        setTimeout(() => {
          onNavigate('login');
        }, 2000);
      } else {
        // Parse error response for specific error messages
        let errorMessage = 'Failed to reset password. Please try again or request a new reset link.';
        try {
          const data = await response.json();
          if (data.error === 'invalid_or_expired') {
            errorMessage = 'This reset link is invalid or has expired. Please request a new one.';
          } else if (data.error === 'weak_password') {
            errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, and numbers.';
          } else if (data.error === 'missing_fields') {
            errorMessage = 'Please fill in all required fields.';
          }
        } catch {
          // If we can't parse JSON, use default message
        }
        
        setMessage({ 
          type: 'error', 
          text: errorMessage
        });
      }
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to reset password. Please try again or request a new reset link.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <VAHLogo className="h-12 w-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Reset Your Password</h1>
        <p className="text-muted-foreground text-lg">
          Enter your email address and we'll send you instructions to reset your password
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSendResetLink} className="space-y-6">
        <div>
          <Label htmlFor="email" className="text-base font-medium">
            Email Address
          </Label>
          <div className="mt-2 relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="pl-12 h-12 text-base"
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium"
          disabled={loading || !email.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      {/* Additional Info */}
      <div className="mt-8 space-y-4 text-center">
        <div className="text-sm text-muted-foreground">
          <p>Don't have an account? 
            <button
              onClick={() => onNavigate('signup')}
              className="ml-1 text-primary hover:text-primary/80 font-medium"
            >
              Sign up here
            </button>
          </p>
        </div>
        
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">
            Having trouble? Our support team is here to help.
          </p>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('contact')}
            className="text-sm"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </>
  );

  const renderSentStep = () => (
    <>
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Check Your Email</h1>
        <p className="text-muted-foreground text-lg">
          We've sent password reset instructions to your email address
        </p>
      </div>

      {/* Instructions */}
      <Card className="p-6 bg-muted/30 border-border/50 mb-6">
        <h3 className="font-semibold mb-3">What to do next:</h3>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">1</span>
            <span>Check your email inbox for a message from VirtualAddressHub</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">2</span>
            <span>Click the "Reset Password" link in the email</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">3</span>
            <span>Create a new secure password for your account</span>
          </li>
        </ol>
      </Card>

      {/* Actions */}
      <div className="space-y-4">
        <div className="text-center text-sm text-muted-foreground">
          <p>Didn't receive the email? Check your spam folder or 
            <button
              onClick={() => onNavigate('reset-password')}
              className="ml-1 text-primary hover:text-primary/80 font-medium"
            >
              try again
            </button>
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onNavigate('login')}
            className="flex-1"
          >
            Back to Login
          </Button>
          <Button 
            onClick={() => onNavigate('contact')}
            variant="outline"
            className="flex-1"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </>
  );

  const renderResetStep = () => (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <VAHLogo className="h-12 w-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Create New Password</h1>
        <p className="text-muted-foreground text-lg">
          Enter a strong new password for your account
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div>
          <Label htmlFor="password" className="text-base font-medium">
            New Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            className="mt-2 h-12 text-base"
            disabled={loading}
            autoComplete="new-password"
            autoFocus
          />
          <p className="text-sm text-muted-foreground mt-1">
            Must be at least 8 characters long
          </p>
        </div>

        <div>
          <Label htmlFor="confirm-password" className="text-base font-medium">
            Confirm New Password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            className="mt-2 h-12 text-base"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-medium"
          disabled={loading || !password.trim() || !confirmPassword.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Updating Password...
            </>
          ) : (
            'Update Password'
          )}
        </Button>
      </form>

      {/* Security Note */}
      <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Security Tip</p>
            <p className="text-blue-800">
              Choose a password that's unique to VirtualAddressHub and includes a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onGoBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Main Card */}
        <Card className="p-8 shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
          {step === 'email' && renderEmailStep()}
          {step === 'sent' && renderSentStep()}
          {step === 'reset' && renderResetStep()}
        </Card>

        {/* Message Alert */}
        {message && (
          <Alert className={`mt-4 ${
            message.type === 'error' 
              ? 'border-red-200 bg-red-50' 
              : 'border-green-200 bg-green-50'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-muted-foreground">
            © 2024 VirtualAddressHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
