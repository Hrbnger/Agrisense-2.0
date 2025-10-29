import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Upload, Leaf, Droplet, Sun } from "lucide-react";
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
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Identify Plant</CardTitle>
            <CardDescription>Take or upload a photo to identify plants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedImage && (
              <div className="rounded-lg overflow-hidden border">
                <img src={selectedImage} alt="Selected plant" className="w-full h-64 object-cover" />
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
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
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
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>

            <Button
              onClick={handleIdentify}
              disabled={!selectedImage || identifying}
              className="w-full"
            >
              {identifying ? "Identifying..." : "Identify Plant"}
            </Button>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">{result.plantName}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground italic">{result.scientificName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 rounded">
                      {result.plantType}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Confidence: {result.confidence}%
                    </span>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sun className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Suitable Environment</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {result.suitableEnvironment}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Care Instructions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {result.careInstructions}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IdentifyPlant;
