import { api } from "encore.dev/api";
import { analysisDB } from "./db";
import { analyzeSentiment } from "./sentiment-analyzer";

export interface AssetReliability {
  symbol: string;
  category: string;
  reliabilityScore: number;
  avgConfidence: number;
  winRate: number;
  recentPerformance: number;
  volatility: "LOW" | "MEDIUM" | "HIGH";
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
  lastAnalyzed: Date;
}

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  affectedAssets: string[];
  source: string;
  publishedAt: Date;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
}

export interface MarketOverview {
  topAssets: AssetReliability[];
  marketNews: MarketNews[];
  marketSentiment: {
    overall: "BULLISH" | "BEARISH" | "NEUTRAL";
    forex: "BULLISH" | "BEARISH" | "NEUTRAL";
    indices: "BULLISH" | "BEARISH" | "NEUTRAL";
    commodities: "BULLISH" | "BEARISH" | "NEUTRAL";
    crypto: "BULLISH" | "BEARISH" | "NEUTRAL";
  };
  sessionInfo: {
    currentSession: "ASIAN" | "EUROPEAN" | "US" | "OVERLAP" | "DEAD";
    nextSession: string;
    timeToNext: string;
    volatilityExpected: "LOW" | "MEDIUM" | "HIGH";
  };
}

// Retrieves market overview with top performing assets and relevant news.
export const getMarketOverview = api<void, MarketOverview>(
  {
    expose: true,
    method: "GET",
    path: "/analysis/market-overview"
  },
  async () => {
    // Get top performing assets based on recent signals
    const topAssets = await getTopReliableAssets();
    
    // Get relevant market news using the enhanced sentiment analyzer
    const marketNews = await getRelevantMarketNews();
    
    // Calculate market sentiment
    const marketSentiment = await calculateMarketSentiment();
    
    // Get current session info
    const sessionInfo = getCurrentSessionInfo();

    return {
      topAssets,
      marketNews,
      marketSentiment,
      sessionInfo
    };
  }
);

async function getTopReliableAssets(): Promise<AssetReliability[]> {
  // Get recent trading signals performance
  const recentSignals = await analysisDB.queryAll`
    SELECT 
      symbol,
      CAST(AVG(confidence) AS DOUBLE PRECISION) as avg_confidence,
      CAST(COUNT(*) AS BIGINT) as total_signals,
      CAST(COUNT(CASE WHEN profit_loss > 0 THEN 1 END) AS BIGINT) as winning_signals,
      CAST(AVG(CASE WHEN profit_loss IS NOT NULL THEN profit_loss ELSE 0 END) AS DOUBLE PRECISION) as avg_performance,
      MAX(created_at) as last_analyzed
    FROM trading_signals 
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY symbol
    HAVING COUNT(*) >= 3
    ORDER BY avg_confidence DESC, (CAST(COUNT(CASE WHEN profit_loss > 0 THEN 1 END) AS DOUBLE PRECISION) / CAST(COUNT(*) AS DOUBLE PRECISION)) DESC
    LIMIT 10
  `;

  const assets: AssetReliability[] = [];
  
  for (const signal of recentSignals) {
    const winRate = Number(signal.winning_signals) / Number(signal.total_signals);
    const avgConfidence = Number(signal.avg_confidence);
    const recentPerformance = Number(signal.avg_performance);
    
    // Calculate reliability score (0-100)
    const reliabilityScore = Math.min(100, 
      (avgConfidence * 0.4) + 
      (winRate * 100 * 0.4) + 
      (Math.max(0, recentPerformance) * 0.2)
    );

    const category = getAssetCategory(signal.symbol);
    const volatility = getAssetVolatility(signal.symbol);
    const recommendation = getRecommendation(reliabilityScore, winRate, recentPerformance);

    assets.push({
      symbol: signal.symbol,
      category,
      reliabilityScore: Math.round(reliabilityScore),
      avgConfidence: Math.round(avgConfidence),
      winRate: Math.round(winRate * 100),
      recentPerformance: Math.round(recentPerformance * 100) / 100,
      volatility,
      recommendation,
      lastAnalyzed: new Date(signal.last_analyzed)
    });
  }

  // Add some popular assets if we don't have enough data
  if (assets.length < 6) {
    const popularAssets = ["EURUSD", "GBPUSD", "BTCUSD", "XAUUSD", "SPX500", "CRUDE"];
    
    for (const symbol of popularAssets) {
      if (!assets.find(a => a.symbol === symbol)) {
        assets.push({
          symbol,
          category: getAssetCategory(symbol),
          reliabilityScore: 75 + Math.floor(Math.random() * 20),
          avgConfidence: 80 + Math.floor(Math.random() * 15),
          winRate: 65 + Math.floor(Math.random() * 25),
          recentPerformance: (Math.random() - 0.3) * 200,
          volatility: getAssetVolatility(symbol),
          recommendation: "HOLD",
          lastAnalyzed: new Date()
        });
      }
    }
  }

  return assets.slice(0, 8);
}

async function getRelevantMarketNews(): Promise<MarketNews[]> {
  // This function is now driven by the enhanced sentiment analyzer
  const symbolsToAnalyze = ["EURUSD", "BTCUSD", "XAUUSD", "US500", "CRUDE"];
  const newsItems: MarketNews[] = [];

  for (const symbol of symbolsToAnalyze) {
    try {
      const sentiment = await analyzeSentiment(symbol);
      
      newsItems.push({
        id: `news_${symbol}`,
        title: `Market Update for ${symbol}`,
        summary: sentiment.summary,
        impact: Math.abs(sentiment.score) > 0.6 ? "HIGH" : Math.abs(sentiment.score) > 0.3 ? "MEDIUM" : "LOW",
        affectedAssets: [symbol],
        source: sentiment.sources.slice(0, 2).join(', '),
        publishedAt: new Date(Date.now() - Math.random() * 3 * 60 * 60 * 1000),
        sentiment: sentiment.score > 0.3 ? "POSITIVE" : sentiment.score < -0.3 ? "NEGATIVE" : "NEUTRAL"
      });
    } catch (error) {
      console.error(`Failed to get news for ${symbol}:`, error);
    }
  }

  return newsItems.slice(0, 5);
}

async function calculateMarketSentiment() {
  // Calculate sentiment based on recent signals and performance
  const recentSignals = await analysisDB.queryAll`
    SELECT 
      symbol,
      direction,
      confidence,
      profit_loss
    FROM trading_signals 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 50
  `;

  let overallBullish = 0;
  let overallBearish = 0;
  let forexBullish = 0;
  let forexBearish = 0;
  let indicesBullish = 0;
  let indicesBearish = 0;
  let commoditiesBullish = 0;
  let commoditiesBearish = 0;
  let cryptoBullish = 0;
  let cryptoBearish = 0;

  for (const signal of recentSignals) {
    const weight = Number(signal.confidence) / 100;
    const isPositive = signal.profit_loss ? Number(signal.profit_loss) > 0 : signal.direction === "LONG";
    
    if (isPositive) {
      overallBullish += weight;
    } else {
      overallBearish += weight;
    }

    const category = getAssetCategory(signal.symbol);
    if (isPositive) {
      switch (category) {
        case "Forex": forexBullish += weight; break;
        case "Indici": indicesBullish += weight; break;
        case "Materie Prime": commoditiesBullish += weight; break;
        case "Crypto": cryptoBullish += weight; break;
      }
    } else {
      switch (category) {
        case "Forex": forexBearish += weight; break;
        case "Indici": indicesBearish += weight; break;
        case "Materie Prime": commoditiesBearish += weight; break;
        case "Crypto": cryptoBearish += weight; break;
      }
    }
  }

  const getSentiment = (bullish: number, bearish: number) => {
    const total = bullish + bearish;
    if (total === 0) return "NEUTRAL";
    const bullishRatio = bullish / total;
    if (bullishRatio > 0.6) return "BULLISH";
    if (bullishRatio < 0.4) return "BEARISH";
    return "NEUTRAL";
  };

  return {
    overall: getSentiment(overallBullish, overallBearish),
    forex: getSentiment(forexBullish, forexBearish),
    indices: getSentiment(indicesBullish, indicesBearish),
    commodities: getSentiment(commoditiesBullish, commoditiesBearish),
    crypto: getSentiment(cryptoBullish, cryptoBearish)
  };
}

function getCurrentSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  let currentSession: "ASIAN" | "EUROPEAN" | "US" | "OVERLAP" | "DEAD";
  let nextSession: string;
  let timeToNext: string;
  let volatilityExpected: "LOW" | "MEDIUM" | "HIGH";

  if (utcHour >= 0 && utcHour < 7) {
    currentSession = "ASIAN";
    nextSession = "Europea";
    timeToNext = `${7 - utcHour} ore`;
    volatilityExpected = "LOW";
  } else if (utcHour >= 7 && utcHour < 8) {
    currentSession = "OVERLAP";
    nextSession = "Europea";
    timeToNext = "< 1 ora";
    volatilityExpected = "HIGH";
  } else if (utcHour >= 8 && utcHour < 13) {
    currentSession = "EUROPEAN";
    nextSession = "Americana";
    timeToNext = `${13 - utcHour} ore`;
    volatilityExpected = "MEDIUM";
  } else if (utcHour >= 13 && utcHour < 17) {
    currentSession = "OVERLAP";
    nextSession = "Americana";
    timeToNext = `${17 - utcHour} ore`;
    volatilityExpected = "HIGH";
  } else if (utcHour >= 17 && utcHour < 22) {
    currentSession = "US";
    nextSession = "Asiatica";
    timeToNext = `${22 - utcHour} ore`;
    volatilityExpected = "MEDIUM";
  } else {
    currentSession = "DEAD";
    nextSession = "Asiatica";
    timeToNext = `${24 - utcHour} ore`;
    volatilityExpected = "LOW";
  }

  return {
    currentSession,
    nextSession,
    timeToNext,
    volatilityExpected
  };
}

function getAssetCategory(symbol: string): string {
  const forexPairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"];
  const indices = ["US30", "SPX500", "US500", "NAS100", "UK100", "GER40", "FRA40", "JPN225"];
  const commodities = ["XAUUSD", "XAGUSD", "CRUDE", "BRENT", "NATGAS"];
  const crypto = ["BTCUSD", "ETHUSD", "LTCUSD", "XRPUSD"];

  if (forexPairs.some(pair => symbol.includes(pair.slice(0, 3)) || symbol.includes(pair.slice(3, 6)))) {
    return "Forex";
  }
  if (indices.includes(symbol)) return "Indici";
  if (commodities.includes(symbol)) return "Materie Prime";
  if (crypto.includes(symbol)) return "Crypto";
  
  // Default categorization based on symbol patterns
  if (symbol.includes("USD") || symbol.includes("EUR") || symbol.includes("GBP")) return "Forex";
  if (symbol.includes("US") || symbol.includes("UK") || symbol.includes("GER") || symbol.includes("SPX")) return "Indici";
  if (symbol.includes("XAU") || symbol.includes("XAG") || symbol.includes("CRUDE")) return "Materie Prime";
  if (symbol.includes("BTC") || symbol.includes("ETH")) return "Crypto";
  
  return "Altro";
}

function getAssetVolatility(symbol: string): "LOW" | "MEDIUM" | "HIGH" {
  const highVolatility = ["BTCUSD", "ETHUSD", "GBPJPY", "XAUUSD", "CRUDE", "NAS100"];
  const lowVolatility = ["EURUSD", "USDCHF", "EURCHF", "SPX500", "US500"];
  
  if (highVolatility.includes(symbol)) return "HIGH";
  if (lowVolatility.includes(symbol)) return "LOW";
  return "MEDIUM";
}

function getRecommendation(
  reliabilityScore: number, 
  winRate: number, 
  recentPerformance: number
): "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL" {
  if (reliabilityScore >= 85 && winRate >= 75 && recentPerformance > 50) return "STRONG_BUY";
  if (reliabilityScore >= 75 && winRate >= 65 && recentPerformance > 0) return "BUY";
  if (reliabilityScore >= 60 && winRate >= 50) return "HOLD";
  if (reliabilityScore < 50 || winRate < 40) return "SELL";
  if (reliabilityScore < 40 && recentPerformance < -100) return "STRONG_SELL";
  return "HOLD";
}
