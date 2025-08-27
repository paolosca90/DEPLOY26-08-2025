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
    const checkAuth = () => {
      const token = localStorage.getItem("auth_token");
      setIsAuthenticated(!!token);
    };
    
    checkAuth();
    setIsLoading(false);
    
    // Listen for storage changes (when login happens in another tab/component)
    window.addEventListener('storage', checkAuth);
    
    // Custom event for same-tab login
    const handleAuthChange = () => checkAuth();
    window.addEventListener('authchange', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authchange', handleAuthChange);
    };
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
          {/* Public Routes - Always Accessible */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes - Only if authenticated */}
          {isAuthenticated ? (
            <>
              <Route path="/dashboard" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />
              <Route path="/ml" element={
                <Layout>
                  <MLDashboard />
                </Layout>
              } />
              <Route path="/trade" element={
                <Layout>
                  <Trade />
                </Layout>
              } />
              <Route path="/news" element={
                <Layout>
                  <News />
                </Layout>
              } />
              <Route path="/history" element={
                <Layout>
                  <History />
                </Layout>
              } />
              <Route path="/guides" element={
                <Layout>
                  <Guides />
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout>
                  <Settings />
                </Layout>
              } />
              <Route path="/billing" element={
                <Layout>
                  <Billing />
                </Layout>
              } />
            </>
          ) : (
            /* Fallback for unknown routes when not authenticated */
            <Route path="*" element={<LandingPage />} />
          )}
        </Routes>
        <Toaster />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
