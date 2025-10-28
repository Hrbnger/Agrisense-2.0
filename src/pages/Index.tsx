import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Camera, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "AI Plant Identification",
      description: "Instantly identify any plant species using advanced AI technology",
      icon: Leaf,
    },
    {
      title: "Disease Detection",
      description: "Diagnose plant diseases early and get treatment recommendations",
      icon: Camera,
    },
    {
      title: "Farmer Community",
      description: "Connect with farmers, share knowledge, and get expert advice",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-hero py-20 px-4">
        <div className="container mx-auto text-center">
          <img 
            src="/app-icon.jpg" 
            alt="AgriSense" 
            className="mx-auto w-20 h-20 rounded-full object-cover mb-6 animate-fade-in shadow-lg" 
          />
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            AgriSense
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            Your Smart Farming Companion for Plant Identification, Disease Detection, and Community Support
          </p>
          <div className="flex gap-4 justify-center animate-fade-in">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Smart Farming
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powered by AI and built for farmers, AgriSense helps you make informed decisions about your crops
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="card-elevated hover:scale-105 transition-transform">
                  <CardHeader>
                    <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black">
                Why Choose AgriSense?
              </h2>
              <div className="space-y-4 text-black">
                {[
                  "Quick and accurate plant identification",
                  "Early disease detection saves crops",
                  "Expert advice from the farming community",
                  "Offline access to previous results",
                  "Localized weather and farming tips",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-lg">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="card-elevated">
                <CardContent className="p-8">
                  <div className="aspect-square rounded-lg flex items-center justify-center overflow-hidden">
                    <img src="/app-icon.jpg" alt="AgriSense" className="w-full h-full object-cover" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Farming?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of farmers using AgriSense to improve their crop yields and make data-driven decisions
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="gap-2">
            Start Free Today
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-card border-t">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 AgriSense. Smart Farming for Everyone.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
