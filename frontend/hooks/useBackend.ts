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
    getHistory: async () => ([]),
    
    // Performance statistics
    getPerformance: async () => ({
      totalTrades: 47,
      winRate: 72.3,
      avgProfit: 245.50,
      avgLoss: -125.30,
      profitFactor: 1.96,
      bestTrade: 892.15,
      worstTrade: -456.80,
      avgConfidence: 78.5,
      totalProfitLoss: 3420.75,
      currentStreak: 3,
      maxDrawdown: 8.2,
      sharpeRatio: 1.45
    }),
    
    // Top trading signals
    getTopSignals: async () => ({
      signals: [
        {
          symbol: "EURUSD",
          direction: "LONG" as const,
          confidence: 85,
          entryPrice: 1.0845,
          takeProfit: 1.0875,
          stopLoss: 1.0825,
          riskRewardRatio: 1.5,
          strategy: "INTRADAY",
          timeframe: "15m",
          analysis: {
            rsi: 65.2,
            macd: 0.0012,
            trend: "BULLISH",
            volatility: "NORMAL"
          },
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          tradeId: "DEMO-EURUSD-" + Date.now()
        },
        {
          symbol: "BTCUSD",
          direction: "SHORT" as const,
          confidence: 78,
          entryPrice: 95250.0,
          takeProfit: 94800.0,
          stopLoss: 95600.0,
          riskRewardRatio: 1.28,
          strategy: "SCALPING",
          timeframe: "5m",
          analysis: {
            rsi: 32.8,
            macd: -0.0045,
            trend: "BEARISH",
            volatility: "HIGH"
          },
          createdAt: new Date(Date.now() - 12 * 60 * 1000),
          tradeId: "DEMO-BTCUSD-" + Date.now()
        },
        {
          symbol: "US30",
          direction: "LONG" as const,
          confidence: 82,
          entryPrice: 44520.5,
          takeProfit: 44680.0,
          stopLoss: 44420.0,
          riskRewardRatio: 1.59,
          strategy: "INTRADAY",
          timeframe: "15m",
          analysis: {
            rsi: 58.7,
            macd: 0.0028,
            trend: "BULLISH",
            volatility: "NORMAL"
          },
          createdAt: new Date(Date.now() - 8 * 60 * 1000),
          tradeId: "DEMO-US30-" + Date.now()
        }
      ]
    }),
    
    // Signal statistics
    getSignalStats: async () => ({
      totalGenerated: 156,
      totalExecuted: 47,
      totalClosed: 44,
      avgConfidence: 78.5,
      topPerformingSymbol: "EURUSD",
      lastGenerationTime: new Date(Date.now() - 2 * 60 * 1000)
    }),
    
    // Trading positions
    listPositions: async () => ({
      positions: [
        {
          ticket: 123456789,
          symbol: "EURUSD",
          type: 0, // BUY
          volume: 0.1,
          openPrice: 1.0832,
          currentPrice: 1.0845,
          profit: 13.0,
          swap: 0.0,
          comment: "DEMO-EURUSD-AUTO"
        },
        {
          ticket: 123456790,
          symbol: "BTCUSD",
          type: 1, // SELL
          volume: 0.01,
          openPrice: 95800.0,
          currentPrice: 95250.0,
          profit: 55.0,
          swap: -2.5,
          comment: "DEMO-BTCUSD-AUTO"
        }
      ]
    }),
    
    // Trading history
    listHistory: async () => ({
      signals: [
        {
          tradeId: "DEMO-EURUSD-CLOSED-1",
          symbol: "EURUSD",
          direction: "LONG" as const,
          strategy: "INTRADAY",
          entryPrice: 1.0825,
          takeProfit: 1.0855,
          stopLoss: 1.0805,
          confidence: 82,
          riskRewardRatio: 1.5,
          recommendedLotSize: 0.1,
          maxHoldingTime: 4,
          expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          chartUrl: "/api/chart/eurusd-demo.png",
          strategyRecommendation: "Strong bullish momentum with RSI divergence",
          analysis: {
            dataSource: "DEMO",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            executedAt: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
            executionPrice: 1.0828,
            profitLoss: 245.50,
            status: "auto_closed",
            closedAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000)
          }
        },
        {
          tradeId: "DEMO-BTCUSD-CLOSED-2",
          symbol: "BTCUSD",
          direction: "SHORT" as const,
          strategy: "SCALPING",
          entryPrice: 95500.0,
          takeProfit: 95200.0,
          stopLoss: 95700.0,
          confidence: 75,
          riskRewardRatio: 1.5,
          recommendedLotSize: 0.01,
          maxHoldingTime: 1,
          expiresAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
          chartUrl: "/api/chart/btcusd-demo.png",
          strategyRecommendation: "Short-term scalping opportunity",
          analysis: {
            dataSource: "DEMO",
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
            executedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
            executionPrice: 95480.0,
            profitLoss: 180.25,
            status: "auto_closed",
            closedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
          }
        }
      ]
    }),
    
    // Force signal generation
    forceSignalGeneration: async () => ({
      success: true,
      message: "Demo signal generation simulated successfully. 3 new signals generated."
    })
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
