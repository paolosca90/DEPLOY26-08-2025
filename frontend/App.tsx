import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";

import Layout from "./components/Layout";
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
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ml" element={<MLDashboard />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/news" element={<News />} />
            <Route path="/history" element={<History />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/billing" element={<Billing />} />
          </Routes>
        </Layout>
        <Toaster />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
