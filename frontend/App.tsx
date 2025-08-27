import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";

import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MLDashboard from "./pages/MLDashboard";
import Trade from "./pages/Trade";
import News from "./pages/News";
import History from "./pages/History";
import Guides from "./pages/Guides";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";

const queryClient = new QueryClient();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is authenticated (check for JWT token)
    const token = localStorage.getItem("auth_token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          {isAuthenticated ? (
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/ml" element={<MLDashboard />} />
                  <Route path="/trade" element={<Trade />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/guides" element={<Guides />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/billing" element={<Billing />} />
                </Routes>
              </Layout>
            } />
          ) : (
            // Redirect unauthenticated users to landing page
            <Route path="/*" element={<LandingPage />} />
          )}
        </Routes>
        <Toaster />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
