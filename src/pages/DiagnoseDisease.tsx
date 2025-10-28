import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Upload, AlertCircle, Pill, Shield } from "lucide-react";
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
            <CardTitle>Diagnose Disease</CardTitle>
            <CardDescription>Detect plant diseases from leaf images</CardDescription>
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
                <img src={selectedImage} alt="Selected leaf" className="w-full h-64 object-cover" />
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
              onClick={handleDiagnose}
              disabled={!selectedImage || diagnosing}
              className="w-full"
            >
              {diagnosing ? "Diagnosing..." : "Diagnose Disease"}
            </Button>

            {result && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <h3 className="font-semibold text-lg">{result.diseaseName}</h3>
                    </div>
                    <Badge className={getSeverityColor(result.severity)}>
                      {result.severity}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground">
                      Confidence: {result.confidence}%
                    </span>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Symptoms</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {result.symptoms}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Treatment</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {result.treatment}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Prevention</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
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
