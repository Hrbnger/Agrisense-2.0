/**
 * Dashboard Component - Main user dashboard after login
 * 
 * Features:
 * - Displays personalized welcome message with user's name
 * - Shows user avatar and profile info in header
 * - Quick action cards for main features
 * - Recent activity feed (plant identifications & disease diagnoses)
 * - Real-time profile updates via Supabase subscriptions
 * - Auto-refresh when navigating back from profile page
 */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Camera, Leaf, MessageSquare, CloudSun, User, LogOut, Settings, Menu, AlertCircle, Clock, Sparkles, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

/**
 * ActivityItem interface - Represents a recent user activity
 * Can be either a plant identification or disease diagnosis
 */
interface ActivityItem {
  id: string;
  type: 'plant' | 'disease';
  name: string;
  confidence?: number;
  created_at: string;
  image_url?: string | null;
  severity?: string;
}

const Dashboard = () => {
  // Authentication state - current user session
  const [session, setSession] = useState<Session | null>(null);
  // User profile data (name, avatar, etc.) from profiles table
  const [profile, setProfile] = useState<any>(null);
  // Recent activities (plant IDs and disease diagnoses) for the user
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  // Loading state for activity fetch operation
  const [loadingActivity, setLoadingActivity] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // Used to detect route changes
  const { toast } = useToast();

  /**
   * Effect: Initialize authentication check and data loading
   * 
   * Runs once on component mount to:
   * 1. Get current session (check if user is logged in)
   * 2. If logged in: fetch user profile and recent activities
   * 3. Set up listener for auth state changes (logout, token refresh, etc.)
   * 4. Redirect to auth page if not logged in
   */
  useEffect(() => {
    // Get current session synchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        // No session = not logged in, redirect to auth page
        navigate("/auth");
      } else {
        // User is logged in, fetch their data
        fetchProfile(session.user.id, session);
        fetchRecentActivity(session.user.id);
      }
    });

    // Listen for authentication state changes
    // This catches: logout, token refresh, session expiry, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Session exists, refresh user data
        fetchProfile(session.user.id, session);
        fetchRecentActivity(session.user.id);
      }
    });

    // Cleanup: unsubscribe when component unmounts
    return () => subscription.unsubscribe();
  }, [navigate]);

  /**
   * Effect: Refetch profile when navigating back to dashboard
   * 
   * This ensures profile updates (like name/avatar changes) are visible
   * when user navigates back from the profile page.
   * 
   * Uses a small delay (100ms) to allow database commits to propagate.
   */
  useEffect(() => {
    if (location.pathname === "/dashboard" && session?.user) {
      // Always refetch when navigating to dashboard
      // Add a small delay to ensure profile update has been committed to DB
      const timer = setTimeout(() => {
        fetchProfile(session.user.id, session);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, session?.user?.id]);

  /**
   * Effect: Refetch profile when window regains focus
   * 
   * If user updates profile in another tab/window, this will refresh
   * the data when they return to this tab.
   */
  useEffect(() => {
    const handleFocus = () => {
      if (location.pathname === "/dashboard" && session?.user) {
        fetchProfile(session.user.id, session);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname, session?.user?.id]);

  /**
   * Fetch user profile from database
   * 
   * If profile doesn't exist (e.g., OAuth user who hasn't set up profile yet),
   * automatically creates one using data from user metadata or email.
   * 
   * @param userId - The user's UUID from Supabase Auth
   * @param currentSession - Optional session object (uses state session if not provided)
   */
  const fetchProfile = async (userId: string, currentSession: Session | null = null) => {
    const sessionToUse = currentSession || session;
    
    // Try to fetch existing profile
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    // If profile doesn't exist, create one automatically
    // This happens for OAuth users who haven't visited the profile page yet
    if (!data && sessionToUse?.user) {
      const userMetadata = sessionToUse.user.user_metadata || {};
      const email = sessionToUse.user.email || '';
      
      // Extract name with fallback chain:
      // 1. Try user metadata (from OAuth or signup)
      // 2. Extract from email (part before @)
      // 3. Default to "User"
      const fullName = userMetadata.full_name || 
                       userMetadata.name || 
                       (email ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) : 'User');
      
      // Create profile record in database
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          full_name: fullName,
          email: email,
        })
        .select()
        .single();
      
      if (newProfile) {
        setProfile(newProfile);
      }
    } else {
      // Profile exists, use it
      setProfile(data);
    }
  };

  /**
   * Effect: Set up realtime subscription for profile updates
   * 
   * Listens for changes to the user's profile in the database.
   * When profile is updated (e.g., name/avatar changed), automatically
   * updates the UI without requiring a page refresh.
   * 
   * Requires Supabase Realtime to be enabled in your project settings.
   */
  useEffect(() => {
    if (!session?.user) return;

    // Create a channel specific to this user's profile
    const channel = supabase
      .channel(`profile:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only listen for updates, not inserts/deletes
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${session.user.id}`, // Only this user's profile
        },
        async (payload) => {
          // Profile was updated, update local state
          console.log('Profile updated via realtime:', payload.new);
          setProfile(payload.new);
          
          // Also refetch to ensure we have the complete latest data
          // (realtime might not include all fields)
          if (session?.user) {
            await fetchProfile(session.user.id, session);
          }
        }
      )
      .subscribe();

    // Cleanup: remove subscription when component unmounts or user changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  /**
   * Fetch recent user activities (plant identifications and disease diagnoses)
   * 
   * Combines data from both 'plants' and 'diseases' tables, sorts by date,
   * and displays the 10 most recent activities.
   * 
   * @param userId - The user's UUID to fetch activities for
   */
  const fetchRecentActivity = async (userId: string) => {
    setLoadingActivity(true);
    try {
      // Fetch recent plant identifications (last 5)
      const { data: plantsData } = await supabase
        .from("plants")
        .select("id, plant_name, confidence, image_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent disease diagnoses (last 5)
      const { data: diseasesData } = await supabase
        .from("diseases")
        .select("id, disease_name, confidence, image_url, created_at, treatment")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Combine both types into a unified activity list
      // Map plant data to ActivityItem format
      const activities: ActivityItem[] = [
        ...(plantsData || []).map(p => ({
          id: p.id,
          type: 'plant' as const,
          name: p.plant_name,
          confidence: p.confidence,
          created_at: p.created_at,
          image_url: p.image_url,
        })),
        // Map disease data to ActivityItem format
        ...(diseasesData || []).map(d => ({
          id: d.id,
          type: 'disease' as const,
          name: d.disease_name,
          confidence: d.confidence,
          created_at: d.created_at,
          image_url: d.image_url,
        })),
      ]
      // Sort by date (most recent first)
      .sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      // Show top 10 most recent across both types
      .slice(0, 10);

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/");
  };

  const quickActions = [
    {
      title: "Identify Plant",
      description: "Take or upload a photo to identify plants",
      icon: Leaf,
      color: "bg-primary",
      action: () => navigate("/identify-plant"),
    },
    {
      title: "Diagnose Disease",
      description: "Detect plant diseases from leaf images",
      icon: Camera,
      color: "bg-destructive",
      action: () => navigate("/diagnose-disease"),
    },
    {
      title: "Community Forum",
      description: "Connect with other farmers",
      icon: MessageSquare,
      color: "bg-secondary",
      action: () => navigate("/forum"),
    },
    {
      title: "Weather & Tips",
      description: "Get localized farming advice",
      icon: CloudSun,
      color: "bg-accent",
      action: () => navigate("/weather"),
    },
  ];

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={`${import.meta.env.BASE_URL}app-logo.jpg`} alt="AgriSense" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
                AgriSense
              </h1>
              <p className="text-xs text-muted-foreground">Smart Farming Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* User Avatar and Name */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-green-600 text-white font-semibold">
                  {(() => {
                    if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase();
                    const userMetadata = session?.user?.user_metadata || {};
                    if (userMetadata.full_name || userMetadata.name) {
                      return (userMetadata.full_name || userMetadata.name).charAt(0).toUpperCase();
                    }
                    if (session?.user?.email) {
                      return session.user.email.charAt(0).toUpperCase();
                    }
                    return "U";
                  })()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">
                  {profile?.full_name || 
                   session?.user?.user_metadata?.full_name || 
                   session?.user?.user_metadata?.name ||
                   (session?.user?.email ? session.user.email.split('@')[0].charAt(0).toUpperCase() + session.user.email.split('@')[0].slice(1) : "User")}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-muted">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-green-600 p-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-200/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-3">
                  Welcome back, {(() => {
                    // Try profile first
                    if (profile?.full_name) return profile.full_name;
                    
                    // Try user metadata from session (for OAuth users)
                    const userMetadata = session?.user?.user_metadata || {};
                    if (userMetadata.full_name) return userMetadata.full_name;
                    if (userMetadata.name) return userMetadata.name;
                    
                    // Extract name from email
                    if (session?.user?.email) {
                      const emailName = session.user.email.split('@')[0];
                      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
                    }
                    
                    // Final fallback
                    return "User";
                  })()}! 👋
                </h2>
                <p className="text-lg opacity-90 mb-4">
                  Ready to make your farming smarter today?
                </p>
                <div className="flex items-center gap-6 mt-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <Leaf className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {recentActivity.filter(a => a.type === 'plant').length} Plants
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {recentActivity.filter(a => a.type === 'disease').length} Diagnoses
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-primary rounded-full"></div>
            <h3 className="text-xl font-bold">Quick Actions</h3>
            <div className="flex-1 h-1 bg-primary/20 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.title}
                  className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 hover:border-primary/50 group overflow-hidden"
                  onClick={action.action}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {action.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Get started</span>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="border-2 hover:border-primary/20 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Recent Activity</CardTitle>
                    <CardDescription>Your latest farming activities and discoveries</CardDescription>
                  </div>
                </div>
              </div>
              {recentActivity.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {recentActivity.length} {recentActivity.length === 1 ? 'item' : 'items'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Leaf className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No recent activity yet.</p>
                <p className="text-sm mt-2">Start by identifying a plant or diagnosing a disease!</p>
                <div className="mt-4 flex gap-3 justify-center">
                  <Button variant="outline" size="sm" onClick={() => navigate("/identify-plant")}>
                    <Leaf className="h-4 w-4 mr-2" />
                    Identify Plant
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/diagnose-disease")}>
                    <Camera className="h-4 w-4 mr-2" />
                    Diagnose Disease
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group animate-in fade-in slide-in-from-left-4 duration-300`}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => {
                      if (activity.type === 'plant') {
                        navigate("/identify-plant");
                      } else {
                        navigate("/diagnose-disease");
                      }
                    }}
                  >
                    <div className={`p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform ${
                      activity.type === 'plant' 
                        ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30' 
                        : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30'
                    }`}>
                      {activity.type === 'plant' ? (
                        <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-bold text-base group-hover:text-primary transition-colors">
                          {activity.name}
                        </h4>
                        <Badge 
                          variant={activity.type === 'plant' ? 'default' : 'destructive'}
                          className="text-xs font-semibold"
                        >
                          {activity.type === 'plant' ? 'Plant ID' : 'Disease'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.confidence && (
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <TrendingUp className="h-3 w-3" />
                            <span className="font-semibold">{activity.confidence}%</span>
                            <span>confidence</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    {activity.image_url && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-border shadow-md group-hover:ring-2 group-hover:ring-primary/50 transition-all flex-shrink-0">
                        <img 
                          src={activity.image_url} 
                          alt={activity.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;