import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Lock, User, LogIn, ArrowRight, CheckCircle, Copy, Key, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/apiService";

export const Signup = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // API Key display state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKeySuccess, setShowApiKeySuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setCopied(false);

    try {
      if (mode === 'signup') {
        // Signup
        const response = await apiService.signup({ email, password, organizationName });
        
        // Store the API key to display
        if (response.apiKey) {
          setApiKey(response.apiKey);
          setShowApiKeySuccess(true);
        }
        
        // Log the user in (tokens already stored by apiService)
        login(response.user);
        
        // Don't navigate immediately - let user see and copy the API key
        console.log('Signup successful! Showing API key...');
        
      } else {
        // Signin
        const response = await apiService.signin({ email, password });
        login(response.user);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinueToDashboard = () => {
    navigate('/dashboard');
  };

  // If showing API key success screen
  if (showApiKeySuccess && apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-2xl shadow-elevated animate-fade-in">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Account Created Successfully! 🎉</CardTitle>
            <CardDescription>
              Welcome to Instant Dev Logs! Your account has been set up.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Critical API Key Warning */}
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200 font-medium">
                ⚠️ Save Your API Key Now - You Won't See It Again!
              </AlertDescription>
            </Alert>

            {/* API Key Display Box */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Your API Key</Label>
              </div>
              
              <div className="relative">
                <div className="bg-muted/50 border-2 border-primary/20 rounded-lg p-4 font-mono text-sm break-all select-all">
                  {apiKey}
                </div>
                <Button
                  size="sm"
                  variant={copied ? "default" : "secondary"}
                  className="absolute top-2 right-2"
                  onClick={handleCopyApiKey}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                Add to Your Application
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Add this API key to your application's environment variables:
              </p>
              <div className="ml-8 bg-muted rounded p-3 font-mono text-xs">
                <div>LOG_API_KEY={apiKey}</div>
                <div className="mt-1">LOG_COLLECTOR_URL=http://localhost:4000/api/ingest</div>
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                Install Our SDK (Optional)
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Or use our SDK for easier integration:
              </p>
              <div className="ml-8 bg-muted rounded p-3 font-mono text-xs">
                npm install @instant-dev-logs/logger
              </div>
            </div>

            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                Start Logging
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Your application can now send logs to the platform!
              </p>
            </div>

            {/* Security Notice */}
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">🔒 Security Notes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Keep this API key secret - treat it like a password</li>
                <li>Don't commit it to version control (use .env files)</li>
                <li>You can generate new keys anytime from the dashboard</li>
                <li>This key will appear as "idl_sk_******" in your dashboard</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCopyApiKey}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Key Again
            </Button>
            <Button
              onClick={handleContinueToDashboard}
              className="flex-1"
            >
              Continue to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Regular signin/signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md shadow-elevated animate-fade-in">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {mode === 'signup' ? 'Create your account' : 'Welcome back'}
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            {mode === 'signup'
              ? 'Get started with log monitoring'
              : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="organization" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Organization Name
                </Label>
                <Input
                  id="organization"
                  type="text"
                  placeholder="Acme Inc."
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="transition-all focus:ring-2 focus:ring-primary/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {mode === 'signin' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                "Processing..."
              ) : mode === 'signup' ? (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  OR
                </span>
              </div>
            </div>

            <div className="text-center text-sm">
              {mode === 'signup' ? (
                <span className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign Up
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Home
            </button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};