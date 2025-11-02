/**
 * Auth Component - Handles user authentication (Sign In, Sign Up, Google OAuth)
 * 
 * This component provides three authentication methods:
 * 1. Email/Password sign up
 * 2. Email/Password sign in
 * 3. Google OAuth sign in
 * 
 * Features:
 * - Automatic redirect to dashboard if already logged in
 * - Handles OAuth callback from Google
 * - Validates user input
 * - Shows loading states during authentication
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Leaf, Loader2 } from "lucide-react";

const Auth = () => {
  // Form state management
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Only used for sign up
  const [loading, setLoading] = useState(false); // Loading state to disable buttons during API calls
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Effect: Check authentication status and handle OAuth callbacks
   * 
   * This runs on component mount to:
   * 1. Check if user is already logged in (redirects to dashboard if yes)
   * 2. Handle OAuth callback from Google (when user returns from OAuth flow)
   * 3. Listen for auth state changes (catches OAuth success events)
   */
  useEffect(() => {
    // Handle OAuth callback - checks if we're returning from Google OAuth
    const handleOAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        navigate("/dashboard");
      }
    };

    // Check if user is already logged in or handle OAuth callback
    handleOAuthCallback();

    // Listen for auth state changes (including OAuth callbacks)
    // This subscription catches when authentication state changes,
    // such as when OAuth callback completes successfully
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Cleanup: unsubscribe from auth state changes when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  /**
   * Handle user sign up with email and password
   * 
   * Creates a new user account in Supabase Auth and stores the full name
   * in user metadata. The user will receive an email confirmation link.
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create new user account with Supabase Auth
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Store full name in user metadata (accessible via user.user_metadata)
          data: {
            full_name: fullName,
          },
          // Where to redirect user after email confirmation
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Show success message (user needs to confirm email)
      toast({
        title: "Account created!",
        description: "You can now sign in with your credentials.",
      });
    } catch (error: any) {
      // Show error message if sign up fails
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user sign in with email and password
   * 
   * Authenticates existing user and redirects to dashboard on success.
   * The auth state change listener will also catch this and redirect.
   */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Authenticate user with Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to dashboard on successful login
      // The useEffect auth state listener will also catch this
      navigate("/dashboard");
    } catch (error: any) {
      // Show error message if authentication fails
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Google OAuth sign in
   * 
   * Initiates Google OAuth flow. User will be redirected to Google's
   * authentication page, then back to our app with an auth token.
   * 
   * The redirect URL is dynamically constructed to work in both:
   * - Local development (http://localhost:8080)
   * - Production (https://hrbnger.github.io/Agrisense-2.0)
   */
  const handleGoogleSignIn = async () => {
    try {
      // Get the base URL path (e.g., '/Agrisense-2.0/' for GitHub Pages)
      const baseUrl = import.meta.env.BASE_URL || '/';
      // Construct the redirect path, handling trailing slashes
      const redirectPath = baseUrl.endsWith('/') 
        ? `${baseUrl}dashboard` 
        : `${baseUrl}/dashboard`;
      
      // Initiate OAuth flow with Google
      // User will be redirected to Google, then back to our redirect URL
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Dynamic redirect URL that works in all environments
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      });

      if (error) throw error;
      // Note: User will be redirected away from this page to Google
      // The useEffect will handle the callback when they return
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
      <Card className="w-full max-w-md card-elevated">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">AgriSense</CardTitle>
          <CardDescription>
            Your smart farming companion for plant identification and disease detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="farmer@agrisense.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Farmer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="farmer@agrisense.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleGoogleSignIn}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;