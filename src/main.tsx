import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom"; // ✅ Use HashRouter
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import IdentifyPlant from "@/pages/IdentifyPlant";
import DiagnoseDisease from "@/pages/DiagnoseDisease";
import Forum from "@/pages/Forum";
import Weather from "@/pages/Weather";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider
      defaultTheme="system"
      storageKey="agrisense-theme"
      enableSystem
      attribute="class"
    >
      <AuthProvider>
        {/* ✅ Use HashRouter for GitHub Pages routing */}
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/identify-plant" element={<IdentifyPlant />} />
            <Route path="/diagnose-disease" element={<DiagnoseDisease />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>

        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
