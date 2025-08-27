import backend from "~backend/client";

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
  }
};

// Returns the backend client for making API calls.
export function useBackend() {
  // Use mock client for development
  return mockClient as any;
}
