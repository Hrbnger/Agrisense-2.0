import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Moon, Sun, MapPin, Palette, FileText, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // If user has a location saved, they've enabled location services
      if (data?.location) {
        setLocationEnabled(true);
      }
    }
  };


  const handleLocationToggle = async (checked: boolean) => {
    if (!checked) {
      // User is turning location OFF
      setLocationEnabled(false);
      
      // Clear location from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ location: null })
          .eq('user_id', user.id);
      }
      
      toast({
        title: "Location Disabled",
        description: "Location services have been disabled",
      });
      return;
    }

    // User is turning location ON - request permission
    setLoading(true);

    if (!navigator.geolocation) {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Request location permission
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Get location name using reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          
          const locationName = data.address.city || 
                              data.address.town || 
                              data.address.village || 
                              data.address.county || 
                              data.address.state || 
                              "Unknown Location";
          
          const fullLocation = `${locationName}, ${data.address.country || ''}`;
          
          // Save location to profile
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('profiles')
              .update({ location: fullLocation })
              .eq('user_id', user.id);
          }
          
          setLocationEnabled(true);
          toast({
            title: "Location Enabled",
            description: `Location set to ${fullLocation}. Weather will now show data for your current location.`,
          });
        } catch (error) {
          console.error("Failed to get location name:", error);
          setLocationEnabled(true);
          toast({
            title: "Location Enabled",
            description: "Location services enabled. Weather will use your current location.",
          });
        }
        setLoading(false);
      },
      (error) => {
        let errorMessage = "Failed to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        toast({
          title: "Location Access Required",
          description: errorMessage,
          variant: "destructive",
        });
        setLocationEnabled(false);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your app preferences and privacy</p>
          </div>

          {/* Location Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Location</CardTitle>
              </div>
              <CardDescription>Manage location services for weather and maps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="location-services" className="text-base">
                    Location Services
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow location access for weather forecasts and location-based features. When enabled, you'll see a browser popup requesting permission.
                  </p>
                </div>
                <Switch
                  id="location-services"
                  checked={locationEnabled}
                  onCheckedChange={handleLocationToggle}
                  disabled={loading}
                />
              </div>
            {/* Android WebView hint */}
            {typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) && (
              <p className="text-xs text-muted-foreground">
                Tip: If location doesn’t appear, open the app’s permissions and allow Location.
              </p>
            )}
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>Customize the look and feel of the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-select" className="text-base">
                    Theme
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose between system, light, or dark mode
                  </p>
                </div>
                <Select
                  value={mounted ? (theme || "system") : "system"}
                  onValueChange={(value) => {
                    setTheme(value as "system" | "light" | "dark");
                    toast({
                      title: "Theme Updated",
                      description: `Theme changed to ${value === "system" ? "system" : value === "dark" ? "dark" : "light"} mode`,
                    });
                  }}
                >
                  <SelectTrigger id="theme-select" className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <span className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </span>
                    </SelectItem>
                    <SelectItem value="light">
                      <span className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </span>
                    </SelectItem>
                    <SelectItem value="dark">
                      <span className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Policy Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Privacy & Legal</CardTitle>
              </div>
              <CardDescription>Review our policies and terms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/privacy-policy")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Privacy Policy
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/terms-of-service")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
