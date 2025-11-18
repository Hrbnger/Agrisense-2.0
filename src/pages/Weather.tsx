import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CloudSun, Droplets, Wind, Thermometer, MapPin, RefreshCw, Sun, Umbrella, AlertCircle, Cloud, CloudRain, CloudLightning, Snowflake, Sunrise, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  location: string;
  feelsLike: number;
  precipitation: number;
  uvIndex: number;
  latitude: number;
  longitude: number;
}

const Weather = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    getWeatherData();
  }, []);

  const getLocationFromProfile = async (): Promise<{ location: string; latitude: number; longitude: number } | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }

      const { data } = await supabase
        .from('profiles')
        .select('location')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data?.location) {
        return null;
      }

      // Use forward geocoding to convert location string to coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(data.location)}&format=json&limit=1`
      );
      const geocodeData = await response.json();

      if (geocodeData && geocodeData.length > 0) {
        return {
          location: data.location,
          latitude: parseFloat(geocodeData[0].lat),
          longitude: parseFloat(geocodeData[0].lon)
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to get location from profile:", error);
      return null;
    }
  };

  const getWeatherData = async () => {
    setLoading(true);
    setLocationError(null);
    
    try {
      // Get location from user profile (set in Settings)
      const locationData = await getLocationFromProfile();
      
      if (!locationData) {
        setLocationError("Location not enabled. Please enable location services in Settings.");
        toast({
          title: "Location Required",
          description: "Please enable location services in Settings to view weather data",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { location, latitude, longitude } = locationData;

      // Fetch weather data from Open-Meteo API with more parameters
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=uv_index_max&timezone=auto`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      
      const data = await response.json();
      
      // Map weather codes to conditions
      const weatherCode = data.current.weather_code;
      const conditions = [
        { codes: [0], label: "Clear Sky" },
        { codes: [1, 2, 3], label: "Partly Cloudy" },
        { codes: [45, 48], label: "Foggy" },
        { codes: [51, 53, 55], label: "Drizzle" },
        { codes: [61, 63, 65], label: "Rainy" },
        { codes: [71, 73, 75, 77], label: "Snowy" },
        { codes: [80, 81, 82], label: "Rain Showers" },
        { codes: [95, 96, 99], label: "Thunderstorm" },
      ];
      
      const condition = conditions.find(c => c.codes.includes(weatherCode))?.label || "Unknown";
      
      setWeather({
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        precipitation: data.current.precipitation || 0,
        uvIndex: data.daily.uv_index_max[0] || 0,
        condition,
        location,
        latitude,
        longitude,
      });
      setLoading(false);
      
      toast({
        title: "Weather updated",
        description: `Weather data for ${location}`,
      });
    } catch (error) {
      setLocationError("Failed to fetch weather data. Please try again.");
      toast({
        title: "Error",
        description: "Failed to fetch weather data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weather & Farming Tips</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4" />
                  {loading ? "Getting location..." : weather?.location || "Location unavailable"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={getWeatherData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Location Error Alert */}
            {locationError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Location Required</AlertTitle>
                <AlertDescription>
                  {locationError}
                  <br />
                  <strong>How to enable:</strong>
                  <ul className="list-disc ml-6 mt-2">
                    <li>Go to Settings in the app</li>
                    <li>Enable "Location Services" toggle</li>
                    <li>Allow location access when prompted</li>
                    <li>Return to this page and refresh</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading weather data...</p>
              </div>
            ) : weather ? (
              <>
                {/* Main Weather Display */}
                <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-300 dark:from-blue-900 dark:via-blue-800 dark:to-cyan-900 p-8 text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 opacity-90" />
                          <span className="text-sm opacity-90">{weather.location}</span>
                        </div>
                        <h2 className="text-5xl font-bold mb-2">{weather.temp}°C</h2>
                        <p className="text-xl opacity-90">{weather.condition}</p>
                        <p className="text-sm opacity-75 mt-1">Feels like {weather.feelsLike}°C</p>
                      </div>
                      <div className="text-right">
                        {weather.condition.includes("Clear") && <Sun className="h-24 w-24 text-yellow-200" />}
                        {weather.condition.includes("Cloud") && !weather.condition.includes("Clear") && <Cloud className="h-24 w-24 text-white/80" />}
                        {weather.condition.includes("Rain") && <CloudRain className="h-24 w-24 text-blue-200" />}
                        {weather.condition.includes("Thunder") && <CloudLightning className="h-24 w-24 text-yellow-200" />}
                        {weather.condition.includes("Snow") && <Snowflake className="h-24 w-24 text-blue-100" />}
                        {weather.condition.includes("Fog") && <Eye className="h-24 w-24 text-gray-200" />}
                        {!weather.condition.includes("Clear") && !weather.condition.includes("Cloud") && !weather.condition.includes("Rain") && !weather.condition.includes("Thunder") && !weather.condition.includes("Snow") && !weather.condition.includes("Fog") && <CloudSun className="h-24 w-24 text-white/80" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 mb-3">
                        <Thermometer className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{weather.temp}°C</p>
                      <p className="text-xs text-muted-foreground font-medium">Temperature</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-3">
                        <Droplets className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{weather.humidity}%</p>
                      <p className="text-xs text-muted-foreground font-medium">Humidity</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 mb-3">
                        <Wind className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{weather.windSpeed}</p>
                      <p className="text-xs text-muted-foreground font-medium">km/h Wind</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-500 mb-3">
                        <Umbrella className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{weather.precipitation}</p>
                      <p className="text-xs text-muted-foreground font-medium">mm Rain</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <CardContent className="pt-6 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-3">
                        <Sun className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{weather.uvIndex.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground font-medium">UV Index</p>
                      <Badge 
                        variant={weather.uvIndex > 7 ? "destructive" : weather.uvIndex > 4 ? "default" : "secondary"} 
                        className="mt-2 text-xs"
                      >
                        {weather.uvIndex > 7 ? "Very High" : weather.uvIndex > 4 ? "Moderate" : "Low"}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                {/* Farming Tips Section */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-1 w-12 bg-primary rounded-full"></div>
                    <h3 className="text-2xl font-bold">Today's Farming Tips</h3>
                    <div className="flex-1 h-1 bg-primary/20 rounded-full"></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {weather.temp > 30 && (
                      <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                              <Thermometer className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="destructive" className="mb-2">High Temperature Alert</Badge>
                              <p className="font-medium">Water crops early morning and evening to prevent heat stress</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.temp < 15 && (
                      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <Snowflake className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="secondary" className="mb-2">Cool Weather</Badge>
                              <p className="font-medium">Protect sensitive plants with mulch or row covers</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.humidity > 70 && (
                      <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                              <Droplets className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="secondary" className="mb-2">High Humidity</Badge>
                              <p className="font-medium">Watch for fungal diseases and ensure good air circulation</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.humidity < 40 && (
                      <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                              <Sun className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="default" className="mb-2">Low Humidity</Badge>
                              <p className="font-medium">Increase watering frequency and consider misting</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.windSpeed > 20 && (
                      <Card className="border-l-4 border-l-slate-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-900/30">
                              <Wind className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="destructive" className="mb-2">Strong Winds</Badge>
                              <p className="font-medium">Secure tall plants, provide windbreaks, and delay spraying</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.precipitation > 5 && (
                      <Card className="border-l-4 border-l-sky-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-900/30">
                              <CloudRain className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="default" className="mb-2">Heavy Rain Expected</Badge>
                              <p className="font-medium">Check drainage and delay irrigation</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.precipitation > 0 && weather.precipitation <= 5 && (
                      <Card className="border-l-4 border-l-blue-400 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <CloudRain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="secondary" className="mb-2">Light Rain</Badge>
                              <p className="font-medium">Delay fertilizer application and reduce watering</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.uvIndex > 7 && (
                      <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                              <Sun className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="destructive" className="mb-2">High UV Levels</Badge>
                              <p className="font-medium">Consider shade cloth for sensitive crops</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.condition.includes("Clear") && weather.temp > 15 && weather.temp < 28 && (
                      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow bg-green-50/50 dark:bg-green-900/10">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                              <Sunrise className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="default" className="mb-2 bg-green-500">Perfect Conditions</Badge>
                              <p className="font-medium">Ideal time for transplanting, planting, and harvesting</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {weather.condition.includes("Thunder") && (
                      <Card className="border-l-4 border-l-yellow-600 hover:shadow-lg transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                              <CloudLightning className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1">
                              <Badge variant="destructive" className="mb-2">Thunderstorm Warning</Badge>
                              <p className="font-medium">Avoid field work and check for hail damage</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-full bg-primary/10">
                            <Eye className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-2">General Tip</Badge>
                            <p className="font-medium">Monitor plants regularly for pest activity, especially after rain</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Location Info */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Location: {weather.latitude.toFixed(4)}°N, {weather.longitude.toFixed(4)}°E</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Unable to load weather data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Weather;
