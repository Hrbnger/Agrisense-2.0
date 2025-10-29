import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Upload, Leaf, Droplet, Sun, Sparkles, CheckCircle2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IdentificationResult {
  plantName: string;
  scientificName: string;
  plantType: string;
  suitableEnvironment: string;
  careInstructions: string;
  confidence: number;
}

const IdentifyPlant = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdentify = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please select or capture an image first",
        variant: "destructive",
      });
      return;
    }

    setIdentifying(true);
    setResult(null);

    try {
      // Try Edge Function first
      try {
        const { data, error } = await supabase.functions.invoke('identify-plant', {
          body: { imageData: selectedImage }
        });

        if (error) throw new Error(error.message || error.toString());
        if (data.error) throw new Error(data.error);

        setResult(data);
        
        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('plants').insert({
            user_id: user.id,
            plant_name: data.plantName,
            image_url: selectedImage,
            confidence: data.confidence,
          });
        }
        
        toast({
          title: "Plant Identified!",
          description: `${data.plantName} identified with ${data.confidence}% confidence`,
        });
        return;
      } catch (edgeError: any) {
        // Re-throw error to outer catch block
        throw edgeError;
      }
    } catch (error: any) {
      console.error('Identification error:', error);
      toast({
        title: "Identification Failed",
        description: error?.message || "Failed to identify plant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIdentifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Header Section */}
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-green-500/20 via-primary/20 to-green-100 dark:from-green-900/30 dark:via-primary/30 dark:to-green-900/20 p-8 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-200/30 dark:bg-green-800/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Identify Plant
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Capture or upload a photo to discover what plant you're looking at
            </p>
          </div>
        </div>

        <Card className="border-2 hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ImageIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Upload Your Plant Photo</CardTitle>
                <CardDescription>Take a clear photo or upload an existing image</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedImage ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-primary/20 group">
                <img 
                  src={selectedImage} 
                  alt="Selected plant" 
                  className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full p-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No image selected</p>
                <p className="text-sm text-muted-foreground">Take a photo or upload an image to get started</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
                className="w-full h-12 border-2 hover:border-primary transition-colors"
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                className="w-full h-12 border-2 hover:border-primary transition-colors"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
            </div>

            <Button
              onClick={handleIdentify}
              disabled={!selectedImage || identifying}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90 transition-all"
            >
              {identifying ? (
                <>
                  <span className="animate-spin mr-2">🌱</span>
                  Identifying Plant...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Identify Plant
                </>
              )}
            </Button>

            {result && (
              <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Result Header */}
                <div className="relative rounded-2xl bg-gradient-to-br from-green-500/10 via-primary/10 to-green-100/50 dark:from-green-900/20 dark:via-primary/20 dark:to-green-900/10 p-6 border-2 border-primary/20">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/20">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-foreground">{result.plantName}</h3>
                        <p className="text-sm text-muted-foreground italic mt-1">{result.scientificName}</p>
                      </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                      {result.confidence}% Match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-medium">
                      {result.plantType}
                    </Badge>
                  </div>
                </div>

                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                          <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <CardTitle className="text-lg">Suitable Environment</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {result.suitableEnvironment}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-lg">Care Instructions</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {result.careInstructions}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IdentifyPlant;
