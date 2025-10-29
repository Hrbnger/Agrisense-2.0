import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Upload, AlertCircle, Pill, Shield, Sparkles, CheckCircle2, Image as ImageIcon, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface DiagnosisResult {
  diseaseName: string;
  severity: string;
  symptoms: string;
  treatment: string;
  prevention: string;
  confidence: number;
}

const DiagnoseDisease = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
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

  const handleDiagnose = async () => {
    if (!selectedImage) {
      toast({
        title: "No image selected",
        description: "Please select or capture an image first",
        variant: "destructive",
      });
      return;
    }

    setDiagnosing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('diagnose-disease', {
        body: { imageData: selectedImage }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      
      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('diseases').insert({
          user_id: user.id,
          disease_name: data.diseaseName,
          plant_name: data.plantName || 'Unknown',
          image_url: selectedImage,
          confidence: data.confidence,
          treatment: data.treatment,
        });
      }
      
      toast({
        title: "Diagnosis Complete",
        description: `${data.diseaseName} detected with ${data.confidence}% confidence`,
      });
    } catch (error: any) {
      console.error('Diagnosis error:', error);
      toast({
        title: "Diagnosis Failed",
        description: error.message || "Failed to diagnose disease. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDiagnosing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'mild':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'moderate':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      case 'severe':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
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
        <div className="relative mb-8 rounded-2xl bg-gradient-to-br from-red-500/20 via-orange-500/20 to-red-100 dark:from-red-900/30 dark:via-orange-900/30 dark:to-red-900/20 p-8 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-200/30 dark:bg-orange-800/20 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
              <Activity className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Diagnose Disease
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Detect and identify plant diseases from leaf images with AI-powered analysis
            </p>
          </div>
        </div>

        <Card className="border-2 hover:border-red-500/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ImageIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Upload Leaf Image</CardTitle>
                <CardDescription>Take a clear photo of the affected leaf or upload an existing image</CardDescription>
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
              <div className="relative rounded-xl overflow-hidden border-2 border-red-500/20 group">
                <img 
                  src={selectedImage} 
                  alt="Selected leaf" 
                  className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-300" 
                />
                <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full p-2">
                  <CheckCircle2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center hover:border-red-500/50 transition-colors">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-4">
                  <ImageIcon className="h-10 w-10 text-red-500/50" />
                </div>
                <p className="text-muted-foreground mb-2">No image selected</p>
                <p className="text-sm text-muted-foreground">Take a photo or upload an image to diagnose</p>
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
                className="w-full h-12 border-2 hover:border-red-500 transition-colors"
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
                className="w-full h-12 border-2 hover:border-red-500 transition-colors"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
            </div>

            <Button
              onClick={handleDiagnose}
              disabled={!selectedImage || diagnosing}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-600/90 hover:to-orange-600/90 transition-all"
            >
              {diagnosing ? (
                <>
                  <span className="animate-spin mr-2">🔬</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Diagnose Disease
                </>
              )}
            </Button>

            {result && (
              <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Result Header */}
                <div className={`relative rounded-2xl p-6 border-2 ${
                  result.severity.toLowerCase() === 'severe' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : result.severity.toLowerCase() === 'moderate'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${
                        result.severity.toLowerCase() === 'severe' 
                          ? 'bg-red-500/20' 
                          : result.severity.toLowerCase() === 'moderate'
                          ? 'bg-yellow-500/20'
                          : 'bg-green-500/20'
                      }`}>
                        <AlertCircle className={`h-6 w-6 ${
                          result.severity.toLowerCase() === 'severe' 
                            ? 'text-red-600 dark:text-red-400' 
                            : result.severity.toLowerCase() === 'moderate'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-2xl text-foreground">{result.diseaseName}</h3>
                        <Badge className={`${getSeverityColor(result.severity)} mt-2 font-semibold`}>
                          {result.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <Badge className="bg-background/80 backdrop-blur-sm text-foreground border border-border px-3 py-1">
                      {result.confidence}% Confidence
                    </Badge>
                  </div>
                </div>

                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <CardTitle className="text-lg">Symptoms</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {result.symptoms}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <CardTitle className="text-lg">Treatment</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                        {result.treatment}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <CardTitle className="text-lg">Prevention</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {result.prevention}
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

export default DiagnoseDisease;
