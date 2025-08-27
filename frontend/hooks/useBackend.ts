import backend from "~backend/client";

// Mock backend URL - using localhost:3001 where the mock backend runs
const MOCK_BACKEND_URL = "http://localhost:3001";

// Helper function to make HTTP requests to mock backend
async function mockHttpRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${MOCK_BACKEND_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error: any) {
    // Add specific error handling for connection issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const connectError = new Error("Unable to connect to backend. Make sure it's running on localhost:3001.");
      (connectError as any).code = 'unavailable';
      throw connectError;
    }
    throw error;
  }
}

// Mock client implementation for development
const mockClient = {
  analysis: {
    getMarketOverview: async () => ({
      topAssets: [],
      marketNews: [],
      marketSentiment: { overall: "NEUTRAL", forex: "NEUTRAL", indices: "NEUTRAL", commodities: "NEUTRAL", crypto: "NEUTRAL" },
      sessionInfo: { activeSession: "London", openSessions: [], volatilityLevel: "MEDIUM" }
    }),
    getAISignals: async () => ([]),
    getPositions: async () => ([]),
    getHistory: async () => ([])
  },
  ml: {
    getMLAnalytics: async () => ({
      modelPerformance: { accuracy: 0.85, precision: 0.82, f1Score: 0.83, sharpeRatio: 1.2 },
      predictionStats: { totalPredictions: 1250, winRate: 0.72 }
    })
  },
  auth: {
    login: async (params: { email: string; password: string }) => {
      console.log("🔐 Attempting login with mock backend:", params.email);
      
      try {
        const result = await mockHttpRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        
        console.log("✅ Mock backend login successful:", result);
        return result;
      } catch (error: any) {
        console.error("❌ Mock backend login failed:", error);
        
        // If backend is unavailable, try fallback with demo credentials
        if (error.code === 'unavailable') {
          console.log("🔄 Backend unavailable, trying fallback...");
          if (params.email === "demo@aiencoretrading.com" && params.password === "demo123") {
            console.log("✅ Fallback login successful for demo user");
            return {
              success: true,
              token: `fallback_token_${Date.now()}`,
              user: {
                id: 1,
                email: params.email,
                name: "Demo",
                surname: "User"
              }
            };
          } else {
            return {
              success: false,
              error: "Invalid credentials. Try demo@aiencoretrading.com / demo123"
            };
          }
        }
        
        // Re-throw other errors
        throw error;
      }
    },
    
    register: async (params: any) => {
      console.log("📝 Attempting registration with mock backend:", params.email);
      
      try {
        const result = await mockHttpRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify(params),
        });
        
        console.log("✅ Mock backend registration successful:", result);
        return result;
      } catch (error: any) {
        console.error("❌ Mock backend registration failed:", error);
        throw error;
      }
    }
  }
};

// Returns the backend client for making API calls.
export function useBackend() {
  // Use mock client for development
  return mockClient as any;
}
