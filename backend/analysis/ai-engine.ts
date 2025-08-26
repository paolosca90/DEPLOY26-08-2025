import { secret } from "encore.dev/config";
import { TimeframeData } from "./market-data";
import { analyzeSentiment } from "./sentiment-analyzer";
import { analyzeVWAP, generateVWAPSignals } from "./vwap-analyzer";
import { 
  calculateEnhancedIndicators, 
  analyzeMultiTimeframeConfluence, 
  getMarketConditionContext,
  MultiTimeframeAnalysis,
  MarketConditionContext,
  EnhancedIndicators
} from "./enhanced-technical-analysis";
import { 
  calculateEnhancedConfidence,
  EnhancedConfidenceResult
} from "./enhanced-confidence-system";
import {
  performInstitutionalAnalysis,
  InstitutionalAnalysis
} from "./institutional-analysis";
import { learningEngine } from "../ml/learning-engine";
import { TradingStrategy } from "./trading-strategies";
const geminiApiKey = secret("GeminiApiKey");

export interface AIAnalysis {
  direction: "LONG" | "SHORT";
  confidence: number;
  enhancedConfidence: EnhancedConfidenceResult; // New enhanced confidence system
  institutionalAnalysis: InstitutionalAnalysis; // New institutional analysis
  support: number;
  resistance: number;
  sentiment: {
    score: number;
    sources: string[];
  };
  volatility: {
    hourly: number;
    daily: number;
  };
  smartMoney: {
    institutionalFlow: "BUYING" | "SELLING" | "NEUTRAL";
    volumeProfile: "ACCUMULATION" | "DISTRIBUTION" | "CONSOLIDATION";
    orderFlow: "BULLISH" | "BEARISH" | "NEUTRAL";
    liquidityZones: number[];
  };
  priceAction: {
    trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
    structure: "BULLISH" | "BEARISH" | "NEUTRAL";
    keyLevels: number[];
    breakoutProbability: number;
  };
  professionalAnalysis: {
    topTraders: string[];
    consensusView: "BULLISH" | "BEARISH" | "NEUTRAL";
    riskReward: number;
    timeframe: string;
  };
  technical: {
    rsi: number;
    macd: number;
    atr: number;
  };
  enhancedTechnical: {
    indicators5m: EnhancedIndicators;
    indicators15m: EnhancedIndicators;
    indicators30m: EnhancedIndicators;
    multiTimeframeAnalysis: MultiTimeframeAnalysis;
    marketContext: MarketConditionContext;
  };
  // Enhanced analysis components
  vwap: {
    analysis: any;
    signals: any;
  };
}

// Cache for Gemini responses to reduce API calls
const geminiCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function analyzeWithAI(marketData: TimeframeData, symbol: string, strategy: TradingStrategy): Promise<AIAnalysis> {
  // Extract key data from different timeframes
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];

  console.log(`🔍 Starting enhanced AI analysis for ${symbol}`);

  // ========== ENHANCED TECHNICAL ANALYSIS ==========
  // Calculate enhanced indicators for each timeframe
  const indicators5m = calculateEnhancedIndicators(
    [data5m.open], [data5m.high], [data5m.low], [data5m.close]
  );
  
  const indicators15m = calculateEnhancedIndicators(
    [data15m.open], [data15m.high], [data15m.low], [data15m.close]
  );
  
  const indicators30m = calculateEnhancedIndicators(
    [data30m.open], [data30m.high], [data30m.low], [data30m.close]
  );

  // Analyze multi-timeframe confluence
  const multiTimeframeAnalysis = analyzeMultiTimeframeConfluence(data5m, data15m, data30m);
  
  // Get current market condition context
  const marketContext = getMarketConditionContext();

  console.log(`📊 Multi-timeframe confluence: ${multiTimeframeAnalysis.confluence}%`);
  console.log(`⏰ Market session: ${marketContext.sessionType}`);
  console.log(`📈 Volatility state: ${multiTimeframeAnalysis.volatilityState}`);

  // ========== TRADITIONAL ANALYSIS (Enhanced) ==========
  // Advanced price action analysis with enhanced calculations
  const priceActionAnalysis = analyzePriceActionEnhanced(data5m, data15m, data30m, symbol);
  
  // Smart money analysis with improved liquidity zone detection
  const smartMoneyAnalysis = analyzeSmartMoneyEnhanced(data5m, data15m, data30m, symbol);
  
  // Volume and order flow analysis
  const volumeAnalysis = analyzeVolumeProfile(data5m, data15m, data30m);
  
  // Professional trader consensus
  const professionalAnalysis = await analyzeProfessionalTraders(symbol, marketData);

  // Enhanced VWAP analysis
  const vwapAnalysis = analyzeVWAP(marketData, symbol);
  const vwapSignals = generateVWAPSignals(vwapAnalysis);

  // Enhanced sentiment analysis using real news
  const sentimentAnalysis = await analyzeSentiment(symbol);

  // Use Gemini AI for enhanced analysis with better error handling and caching
  const geminiAnalysis = await analyzeWithGeminiCached(marketData, symbol, {
    priceAction: priceActionAnalysis,
    smartMoney: smartMoneyAnalysis,
    volume: volumeAnalysis,
    professional: professionalAnalysis,
    vwap: vwapAnalysis
  });

  // Calculate enhanced support and resistance using multiple methods
  const enhancedLevels = calculateEnhancedSupportResistance(data5m, data15m, data30m, symbol);
  
  // ========== ENHANCED DIRECTION DETERMINATION ==========
  // Determine direction with enhanced multi-factor analysis
  const traditionalDirection = determineDirection(
    priceActionAnalysis,
    smartMoneyAnalysis,
    volumeAnalysis,
    geminiAnalysis
  );

  // Use enhanced direction determination with technical confluence
  const enhancedDirection = determineEnhancedDirection(
    indicators5m, indicators15m, indicators30m, 
    multiTimeframeAnalysis, traditionalDirection
  );

  console.log(`📍 Traditional direction: ${traditionalDirection}, Enhanced direction: ${enhancedDirection}`);

  // ========== INSTITUTIONAL ANALYSIS ==========
  // Perform comprehensive institutional analysis
  const institutionalAnalysis = performInstitutionalAnalysis(
    data5m, data15m, data30m, data30m, data30m, data30m, symbol
  );
  
  console.log(`🏛️ Institutional Analysis - Order Blocks: ${institutionalAnalysis.orderBlocks.length}, FVGs: ${institutionalAnalysis.fairValueGaps.length}`);
  console.log(`📊 Market Maker Phase: ${institutionalAnalysis.marketMakerModel.phase} (${institutionalAnalysis.marketMakerModel.confidence}% confidence)`);
  console.log(`🎯 Supply/Demand Zones: ${institutionalAnalysis.supplyDemandZones.length}, Active Sessions: ${institutionalAnalysis.activeSessions.map(s => s.name).join(', ')}`);

  // ========== ENHANCED CONFIDENCE CALCULATION ==========
  // Calculate traditional confidence for compatibility
  const traditionalConfidence = calculateConfidence(
    priceActionAnalysis,
    smartMoneyAnalysis,
    volumeAnalysis,
    professionalAnalysis,
    geminiAnalysis
  );

  // Calculate enhanced confidence with sophisticated scoring
  const enhancedConfidence = calculateEnhancedConfidence(
    indicators5m,
    indicators15m, 
    indicators30m,
    multiTimeframeAnalysis,
    marketContext,
    enhancedDirection,
    symbol,
    undefined, // historicalWinRate
    institutionalAnalysis // Pass institutional analysis
  );

console.log(`🎯 Enhanced confidence: ${enhancedConfidence.finalConfidence.toFixed(1)}% (Grade: ${enhancedConfidence.confidenceGrade})`);
  console.log(`🏛️ Institutional score: ${enhancedConfidence.institutionalScore.toFixed(1)}%`);
  
  // Apply adaptive learning adjustments
  let finalConfidence = enhancedConfidence.finalConfidence;
  const adjustments = await learningEngine.getConfidenceAdjustments(symbol, marketContext.sessionType, strategy);
  if (adjustments.length > 0) {
    console.log(`🧠 Applying ${adjustments.length} adaptive learning adjustments...`);
    for (const adj of adjustments) {
      console.log(`   - ${adj.parameter}: ${adj.value}%`);
      finalConfidence += adj.value;
    }
    finalConfidence = Math.max(15, Math.min(98, finalConfidence));
    console.log(`🧠 Adjusted confidence: ${finalConfidence.toFixed(1)}%`);
  }

  // Log warnings if any
  if (enhancedConfidence.warnings.length > 0) {
    console.log(`⚠️ Warnings: ${enhancedConfidence.warnings.join(', ')}`);
  }

  // ========== SENTIMENT AND VOLATILITY ==========
  // Calculate volatility
  const volatility = {
    hourly: data5m.indicators.atr / data5m.close,
    daily: data30m.indicators.atr / data30m.close,
  };

  // Extract technical indicators for frontend compatibility
  const technical = {
    rsi: data5m.indicators.rsi,
    macd: data5m.indicators.macd,
    atr: data5m.indicators.atr,
  };

  console.log(`✅ Enhanced AI analysis completed for ${symbol}`);

  return {
    direction: enhancedDirection,
    confidence: finalConfidence,
    enhancedConfidence, // Include full enhanced confidence result
    institutionalAnalysis, // Include comprehensive institutional analysis
    support: enhancedLevels.support,
    resistance: enhancedLevels.resistance,
    sentiment: {
      score: sentimentAnalysis.score,
      sources: sentimentAnalysis.sources,
    },
    volatility,
    smartMoney: smartMoneyAnalysis,
    priceAction: priceActionAnalysis,
    professionalAnalysis,
    technical,
    enhancedTechnical: {
      indicators5m,
      indicators15m,
      indicators30m,
      multiTimeframeAnalysis,
      marketContext,
    },
    // Enhanced analysis components
    vwap: {
      analysis: vwapAnalysis,
      signals: vwapSignals
    },
  };
}

function analyzePriceActionEnhanced(data5m: any, data15m: any, data30m: any, symbol: string) {
  const prices = [data5m, data15m, data30m];
  
  // Analyze market structure with enhanced logic
  const highs = prices.map(d => d.high);
  const lows = prices.map(d => d.low);
  const closes = prices.map(d => d.close);
  
  // Enhanced trend detection using multiple criteria
  const trendStrength = calculateTrendStrength(prices);
  const trend = determineTrendDirection(prices, trendStrength);
  
  // Enhanced market structure analysis
  const structureBreak = analyzeStructureBreakEnhanced(prices, symbol);
  const structure: "BULLISH" | "BEARISH" | "NEUTRAL" = structureBreak > 0.3 ? "BULLISH" : structureBreak < -0.3 ? "BEARISH" : "NEUTRAL";
  
  // Calculate enhanced key levels using multiple methods
  const keyLevels = calculateEnhancedSwingLevels(prices, symbol);
  
  // Enhanced breakout probability calculation
  const breakoutProbability = calculateEnhancedBreakoutProbability(prices, symbol);
  
  return {
    trend,
    structure,
    keyLevels,
    breakoutProbability,
  };
}

function calculateTrendStrength(prices: any[]): number {
  // Calculate trend strength using multiple factors
  let trendScore = 0;
  
  // Price momentum across timeframes
  const priceChanges = prices.map((p, i) => 
    i > 0 ? (p.close - prices[i-1].close) / prices[i-1].close : 0
  ).slice(1);
  
  // Consistent direction adds to trend strength
  const positiveChanges = priceChanges.filter(change => change > 0).length;
  const negativeChanges = priceChanges.filter(change => change < 0).length;
  
  if (positiveChanges > negativeChanges) {
    trendScore = positiveChanges / priceChanges.length;
  } else {
    trendScore = -(negativeChanges / priceChanges.length);
  }
  
  // Volume confirmation
  const volumes = prices.map(p => p.volume);
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  const volumeConfirmation = volumes[0] > avgVolume ? 0.2 : -0.1;
  
  return Math.max(-1, Math.min(1, trendScore + volumeConfirmation));
}

function determineTrendDirection(prices: any[], trendStrength: number): "UPTREND" | "DOWNTREND" | "SIDEWAYS" {
  if (Math.abs(trendStrength) < 0.3) return "SIDEWAYS";
  return trendStrength > 0 ? "UPTREND" : "DOWNTREND";
}

function analyzeStructureBreakEnhanced(prices: any[], symbol: string): number {
  // Enhanced structure break analysis with symbol-specific thresholds
  const symbolThresholds: Record<string, number> = {
    "BTCUSD": 0.02,    // 2% movement needed for BTC
    "ETHUSD": 0.025,   // 2.5% for ETH
    "EURUSD": 0.005,   // 0.5% for major forex
    "GBPUSD": 0.008,   // 0.8% for GBP
    "XAUUSD": 0.01,    // 1% for Gold
    "CRUDE": 0.015     // 1.5% for Oil
  };
  
  const threshold = symbolThresholds[symbol] || 0.01;
  
  const recentHigh = Math.max(...prices.map(p => p.high));
  const recentLow = Math.min(...prices.map(p => p.low));
  const currentPrice = prices[0].close;
  
  // Calculate relative position and movement
  const highBreak = (currentPrice - recentHigh) / recentHigh;
  const lowBreak = (recentLow - currentPrice) / currentPrice;
  
  if (highBreak > threshold) return 1; // Strong bullish break
  if (lowBreak > threshold) return -1; // Strong bearish break
  
  // Partial breaks
  if (highBreak > threshold * 0.5) return 0.5;
  if (lowBreak > threshold * 0.5) return -0.5;
  
  return 0; // No significant break
}

function calculateEnhancedSwingLevels(prices: any[], symbol: string): number[] {
  const highs = prices.map(p => p.high);
  const lows = prices.map(p => p.low);
  const closes = prices.map(p => p.close);
  
  // Basic swing levels
  const basicLevels = [
    Math.max(...highs),
    Math.min(...lows),
    (Math.max(...highs) + Math.min(...lows)) / 2
  ];
  
  // Add Fibonacci-like retracement levels
  const range = Math.max(...highs) - Math.min(...lows);
  const fibLevels = [
    Math.min(...lows) + (range * 0.236),
    Math.min(...lows) + (range * 0.382),
    Math.min(...lows) + (range * 0.618),
    Math.min(...lows) + (range * 0.786)
  ];
  
  // Add volume-weighted levels
  const totalVolume = prices.reduce((sum, p) => sum + p.volume, 0);
  const vwap = prices.reduce((sum, p) => sum + (p.close * p.volume), 0) / totalVolume;
  
  // Combine all levels and remove duplicates
  const allLevels = [...basicLevels, ...fibLevels, vwap];
  return [...new Set(allLevels.map(level => Math.round(level * 100000) / 100000))];
}

function calculateEnhancedBreakoutProbability(prices: any[], symbol: string): number {
  const ranges = prices.map(p => p.high - p.low);
  const avgRange = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
  const currentRange = ranges[0];
  
  // Consolidation factor (lower range = higher breakout probability)
  const consolidationFactor = currentRange < avgRange * 0.6 ? 0.4 : 0;
  
  // Volume factor
  const volumes = prices.map(p => p.volume);
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  const volumeFactor = volumes[0] > avgVolume * 1.3 ? 0.3 : 0;
  
  // Time compression factor (multiple timeframes showing similar patterns)
  const timeCompressionFactor = calculateTimeCompression(prices);
  
  // Symbol-specific volatility expectations
  const symbolVolatility = getSymbolVolatilityExpectation(symbol);
  
  const totalProbability = (consolidationFactor + volumeFactor + timeCompressionFactor + symbolVolatility) * 100;
  
  return Math.min(95, Math.max(20, totalProbability + 30)); // Base 30% + factors
}

function calculateTimeCompression(prices: any[]): number {
  // Analyze if multiple timeframes are showing similar patterns
  const ranges = prices.map(p => (p.high - p.low) / p.close);
  const avgRange = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
  const rangeVariation = ranges.reduce((sum, r) => sum + Math.abs(r - avgRange), 0) / ranges.length;
  
  // Lower variation = higher compression = higher breakout probability
  return rangeVariation < avgRange * 0.3 ? 0.2 : 0;
}

function getSymbolVolatilityExpectation(symbol: string): number {
  const volatilityExpectations: Record<string, number> = {
    "BTCUSD": 0.15,    // High volatility crypto
    "ETHUSD": 0.12,    // High volatility crypto
    "EURUSD": 0.05,    // Low volatility major pair
    "GBPUSD": 0.08,    // Medium volatility
    "XAUUSD": 0.10,    // Medium-high volatility
    "CRUDE": 0.12      // High volatility commodity
  };
  
  return volatilityExpectations[symbol] || 0.08;
}

function analyzeSmartMoneyEnhanced(data5m: any, data15m: any, data30m: any, symbol: string) {
  const volumes = [data5m.volume, data15m.volume, data30m.volume];
  const prices = [data5m.close, data15m.close, data30m.close];
  
  // Enhanced institutional flow analysis
  const institutionalFlow = analyzeInstitutionalFlowEnhanced(volumes, prices, symbol);
  
  // Enhanced volume profile analysis
  const volumeProfile = analyzeVolumeProfilePatternEnhanced(volumes, prices, symbol);
  
  // Enhanced order flow analysis
  const orderFlow = analyzeOrderFlowEnhanced(volumes, prices, symbol);
  
  // Enhanced liquidity zones identification
  const liquidityZones = identifyLiquidityZonesEnhanced(data5m, data15m, data30m, symbol);
  
  return {
    institutionalFlow,
    volumeProfile,
    orderFlow,
    liquidityZones,
  };
}

function analyzeInstitutionalFlowEnhanced(volumes: number[], prices: number[], symbol: string): "BUYING" | "SELLING" | "NEUTRAL" {
  // Enhanced analysis with symbol-specific volume thresholds
  const volumeThresholds: Record<string, number> = {
    "BTCUSD": 1.5,     // Higher threshold for crypto
    "ETHUSD": 1.4,
    "EURUSD": 1.2,     // Lower threshold for forex
    "GBPUSD": 1.3,
    "XAUUSD": 1.4,
    "CRUDE": 1.5
  };
  
  const threshold = volumeThresholds[symbol] || 1.3;
  
  const volumeWeightedPrice = volumes.reduce((sum, vol, i) => sum + (vol * prices[i]), 0) / volumes.reduce((sum, vol) => sum + vol, 0);
  const currentPrice = prices[0];
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  
  // Check if current volume is significant
  if (volumes[0] < avgVolume * threshold) return "NEUTRAL";
  
  const priceDeviation = (currentPrice - volumeWeightedPrice) / volumeWeightedPrice;
  
  if (priceDeviation > 0.003) return "BUYING";   // 0.3% above VWAP with high volume
  if (priceDeviation < -0.003) return "SELLING"; // 0.3% below VWAP with high volume
  return "NEUTRAL";
}

function analyzeVolumeProfilePatternEnhanced(volumes: number[], prices: number[], symbol: string): "ACCUMULATION" | "DISTRIBUTION" | "CONSOLIDATION" {
  const priceChanges = prices.map((price, i) => i > 0 ? price - prices[i] : 0).slice(1);
  const volumeChanges = volumes.map((vol, i) => i > 0 ? vol - volumes[i] : 0).slice(1);
  
  let accumulationScore = 0;
  let distributionScore = 0;
  let consolidationScore = 0;
  
  for (let i = 0; i < priceChanges.length; i++) {
    const priceChange = priceChanges[i];
    const volumeChange = volumeChanges[i];
    const volumeRatio = volumes[i] / (volumes[i + 1] || 1);
    
    // Enhanced scoring with volume ratio consideration
    if (priceChange > 0 && volumeChange > 0 && volumeRatio > 1.2) {
      accumulationScore += 2; // Strong accumulation
    } else if (priceChange > 0 && volumeChange > 0) {
      accumulationScore += 1; // Weak accumulation
    }
    
    if (priceChange < 0 && volumeChange > 0 && volumeRatio > 1.2) {
      distributionScore += 2; // Strong distribution
    } else if (priceChange < 0 && volumeChange > 0) {
      distributionScore += 1; // Weak distribution
    }
    
    if (Math.abs(priceChange) < prices[i] * 0.005 && volumeChange < 0) {
      consolidationScore += 1; // Low volatility with decreasing volume
    }
  }
  
  const maxScore = Math.max(accumulationScore, distributionScore, consolidationScore);
  
  if (maxScore === accumulationScore && accumulationScore > 0) return "ACCUMULATION";
  if (maxScore === distributionScore && distributionScore > 0) return "DISTRIBUTION";
  return "CONSOLIDATION";
}

function analyzeOrderFlowEnhanced(volumes: number[], prices: number[], symbol: string): "BULLISH" | "BEARISH" | "NEUTRAL" {
  // Enhanced order flow analysis with price momentum consideration
  const buyingPressure = volumes.filter((vol, i) => {
    const priceUp = prices[i] > (i > 0 ? prices[i-1] : prices[i]);
    const significantVolume = vol > (volumes.reduce((sum, v) => sum + v, 0) / volumes.length) * 1.1;
    return priceUp && significantVolume;
  }).reduce((sum, vol) => sum + vol, 0);
  
  const sellingPressure = volumes.filter((vol, i) => {
    const priceDown = prices[i] < (i > 0 ? prices[i-1] : prices[i]);
    const significantVolume = vol > (volumes.reduce((sum, v) => sum + v, 0) / volumes.length) * 1.1;
    return priceDown && significantVolume;
  }).reduce((sum, vol) => sum + vol, 0);
  
  const totalSignificantVolume = buyingPressure + sellingPressure;
  
  if (totalSignificantVolume === 0) return "NEUTRAL";
  
  const buyingRatio = buyingPressure / totalSignificantVolume;
  
  if (buyingRatio > 0.65) return "BULLISH";
  if (buyingRatio < 0.35) return "BEARISH";
  return "NEUTRAL";
}

function identifyLiquidityZonesEnhanced(data5m: any, data15m: any, data30m: any, symbol: string): number[] {
  const currentPrice = data5m.close;
  const levels: Array<{price: number, weight: number}> = [];
  
  // Previous highs and lows with enhanced weighting
  levels.push(
    { price: data30m.high, weight: 3 },
    { price: data30m.low, weight: 3 },
    { price: data15m.high, weight: 2 },
    { price: data15m.low, weight: 2 },
    { price: data5m.high, weight: 1 },
    { price: data5m.low, weight: 1 }
  );
  
  // Enhanced psychological levels based on symbol characteristics
  const psychLevels = calculatePsychologicalLevels(currentPrice, symbol);
  psychLevels.forEach(level => levels.push({ price: level, weight: 2 }));
  
  // VWAP levels with different timeframe weights
  const vwap5m = data5m.close;
  const vwap15m = (data5m.close + data15m.close) / 2;
  const vwap30m = (data5m.close + data15m.close + data30m.close) / 3;
  
  levels.push(
    { price: vwap5m, weight: 1 },
    { price: vwap15m, weight: 2 },
    { price: vwap30m, weight: 3 }
  );
  
  // Enhanced Fibonacci levels
  const recentHigh = Math.max(data5m.high, data15m.high, data30m.high);
  const recentLow = Math.min(data5m.low, data15m.low, data30m.low);
  const range = recentHigh - recentLow;
  
  if (range > 0) {
    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
    fibLevels.forEach(fib => {
      levels.push({ price: recentLow + (range * fib), weight: 2 });
    });
  }
  
  // Sort by weight and proximity to current price
  const weightedLevels = levels
    .map(level => {
      const distance = Math.abs(level.price - currentPrice) / currentPrice;
      return {
        ...level,
        distance,
        score: level.weight / (1 + distance * 10) // Closer levels get higher scores
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Take top 8 levels
    .map(level => level.price)
    .filter((price, index, self) => self.indexOf(price) === index) // Remove duplicates
    .sort((a, b) => a - b);
  
  return weightedLevels;
}

function calculatePsychologicalLevels(currentPrice: number, symbol: string): number[] {
  const levels: number[] = [];
  
  // Symbol-specific psychological level spacing
  const spacingMap: Record<string, number[]> = {
    "BTCUSD": [1000, 5000, 10000],      // $1k, $5k, $10k levels
    "ETHUSD": [100, 500, 1000],         // $100, $500, $1k levels
    "EURUSD": [0.01, 0.05, 0.1],        // 1 cent, 5 cent, 10 cent levels
    "GBPUSD": [0.01, 0.05, 0.1],        // 1 cent, 5 cent, 10 cent levels
    "USDJPY": [1, 5, 10],               // 1 yen, 5 yen, 10 yen levels
    "XAUUSD": [10, 50, 100],            // $10, $50, $100 levels
    "CRUDE": [1, 5, 10]                 // $1, $5, $10 levels
  };
  
  const spacings = spacingMap[symbol] || [currentPrice * 0.01, currentPrice * 0.05, currentPrice * 0.1];
  
  spacings.forEach((spacing: number) => {
    const nearestLevel = Math.round(currentPrice / spacing) * spacing;
    levels.push(
      nearestLevel,
      nearestLevel + spacing,
      nearestLevel - spacing,
      nearestLevel + (spacing * 2),
      nearestLevel - (spacing * 2)
    );
  });
  
  return levels.filter(level => level > 0);
}

function calculateEnhancedSupportResistance(data5m: any, data15m: any, data30m: any, symbol: string) {
  const currentPrice = data5m.close;
  const allLevels = identifyLiquidityZonesEnhanced(data5m, data15m, data30m, symbol);
  
  // Separate into support and resistance with enhanced logic
  const supportLevels = allLevels.filter(level => level < currentPrice * 0.995); // 0.5% buffer
  const resistanceLevels = allLevels.filter(level => level > currentPrice * 1.005); // 0.5% buffer
  
  // Find the most significant levels (closest to current price)
  const nearestSupport = supportLevels.length > 0 
    ? supportLevels.sort((a, b) => b - a)[0] // Highest support below current price
    : currentPrice * 0.95; // Fallback 5% below
    
  const nearestResistance = resistanceLevels.length > 0
    ? resistanceLevels.sort((a, b) => a - b)[0] // Lowest resistance above current price
    : currentPrice * 1.05; // Fallback 5% above
  
  return {
    support: Math.round(nearestSupport * 100000) / 100000,
    resistance: Math.round(nearestResistance * 100000) / 100000
  };
}

function analyzeVolumeProfile(data5m: any, data15m: any, data30m: any) {
  const timeframes = [data5m, data15m, data30m];
  
  // Calculate volume-weighted average price (VWAP) concept
  const vwap = calculateVWAP(timeframes);
  
  // Analyze volume distribution
  const volumeDistribution = analyzeVolumeDistribution(timeframes);
  
  // Identify high volume nodes (HVN) and low volume nodes (LVN)
  const volumeNodes = identifyVolumeNodes(timeframes);
  
  return {
    vwap,
    distribution: volumeDistribution,
    nodes: volumeNodes,
  };
}

async function analyzeProfessionalTraders(symbol: string, marketData: TimeframeData) {
  // Simulate analysis of top professional traders for the asset
  const topTraders = getTopTradersForAsset(symbol);
  
  // Analyze their typical strategies and current market view
  const consensusView = analyzeTraderConsensus(symbol, marketData);
  
  // Calculate risk-reward based on professional standards
  const riskReward = calculateProfessionalRiskReward(marketData);
  
  // Determine optimal timeframe based on asset characteristics
  const timeframe = determineOptimalTimeframe(symbol);
  
  return {
    topTraders,
    consensusView,
    riskReward,
    timeframe,
  };
}

function getTopTradersForAsset(symbol: string): string[] {
  const traderDatabase: Record<string, string[]> = {
    "BTCUSD": [
      "Plan B (S2F Model Creator)",
      "Willy Woo (On-chain Analyst)", 
      "Benjamin Cowen (Crypto Analyst)",
      "Coin Bureau (Educational Content)",
      "The Moon (Technical Analysis)"
    ],
    "EURUSD": [
      "Kathy Lien (BK Asset Management)",
      "Boris Schlossberg (BK Asset Management)",
      "James Stanley (DailyFX)",
      "Christopher Vecchio (DailyFX)",
      "Nick Cawley (DailyFX)"
    ],
    "GBPUSD": [
      "Kathy Lien (BK Asset Management)",
      "James Stanley (DailyFX)",
      "Nick Cawley (DailyFX)",
      "Christopher Vecchio (DailyFX)",
      "Paul Robinson (FXPro)"
    ],
    "XAUUSD": [
      "Peter Schiff (Euro Pacific Capital)",
      "Jim Rickards (Strategic Intelligence)",
      "Mike Maloney (GoldSilver.com)",
      "Rick Rule (Sprott Inc)",
      "David Morgan (Silver Investor)"
    ],
    "CRUDE": [
      "Phil Flynn (Price Futures Group)",
      "John Kilduff (Again Capital)",
      "Andy Lipow (Lipow Oil Associates)",
      "Bob Yawger (Mizuho Securities)",
      "Rebecca Babin (CIBC Private Wealth)"
    ]
  };
  
  return traderDatabase[symbol] || [
    "Professional Trader 1",
    "Professional Trader 2", 
    "Professional Trader 3",
    "Professional Trader 4",
    "Professional Trader 5"
  ];
}

function analyzeTraderConsensus(symbol: string, marketData: TimeframeData): "BULLISH" | "BEARISH" | "NEUTRAL" {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];
  
  // Simulate professional trader analysis based on market conditions
  const factors = [];
  
  // Price momentum
  if (data5m.close > data15m.close && data15m.close > data30m.close) {
    factors.push(1); // Bullish momentum
  } else if (data5m.close < data15m.close && data15m.close < data30m.close) {
    factors.push(-1); // Bearish momentum
  } else {
    factors.push(0); // Neutral
  }
  
  // Volume confirmation
  if (data5m.volume > data15m.volume * 1.2) {
    factors.push(data5m.close > data5m.open ? 1 : -1);
  } else {
    factors.push(0);
  }
  
  // Volatility analysis
  const avgVolatility = (data5m.indicators.atr + data15m.indicators.atr + data30m.indicators.atr) / 3;
  if (avgVolatility > data5m.close * 0.02) {
    factors.push(0); // High volatility = neutral
  } else {
    factors.push(data5m.close > data30m.close ? 1 : -1);
  }
  
  const consensus = factors.reduce((sum, factor) => sum + factor, 0);
  
  if (consensus > 1) return "BULLISH";
  if (consensus < -1) return "BEARISH";
  return "NEUTRAL";
}

function calculateProfessionalRiskReward(marketData: TimeframeData): number {
  const data5m = marketData["5m"];
  const atr = data5m.indicators.atr;
  
  // Professional traders typically aim for 1:2 or 1:3 risk-reward
  const stopLoss = atr * 1.5;
  const takeProfit = atr * 3;
  
  return takeProfit / stopLoss;
}

function determineOptimalTimeframe(symbol: string): string {
  const timeframeMap: Record<string, string> = {
    "BTCUSD": "15m-1h", // Crypto moves fast
    "ETHUSD": "15m-1h",
    "EURUSD": "5m-15m", // Forex scalping
    "GBPUSD": "5m-15m",
    "USDJPY": "5m-15m",
    "XAUUSD": "15m-30m", // Gold intermediate moves
    "CRUDE": "15m-30m", // Oil intermediate moves
  };
  
  return timeframeMap[symbol] || "15m";
}

async function analyzeWithGeminiCached(
  marketData: TimeframeData, 
  symbol: string, 
  additionalData: any
): Promise<{ direction: "LONG" | "SHORT"; confidence: number }> {
  try {
    // Create cache key based on market data and symbol
    const cacheKey = `${symbol}_${marketData["5m"].close}_${Date.now() - (Date.now() % (5 * 60 * 1000))}`;
    
    // Check cache first
    const cached = geminiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log("Using cached Gemini analysis");
      return cached.response;
    }

    const apiKey = geminiApiKey();
    if (!apiKey || apiKey === "your_gemini_key") {
      console.log("Gemini API key not configured, using fallback analysis");
      return fallbackAnalysis(marketData);
    }

    const prompt = createAdvancedTradingPrompt(marketData, symbol, additionalData);
    
    // Simplified single request with longer timeout
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 200, // Reduced to save quota
          }
        })
      });

      if (response.status === 429) {
        console.log("Gemini quota exceeded, using enhanced fallback analysis");
        return enhancedFallbackAnalysis(marketData, additionalData);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        return enhancedFallbackAnalysis(marketData, additionalData);
      }

      const data = await response.json() as any;
      
      if (data && data.error) {
        console.error("Gemini API response error:", data.error);
        return enhancedFallbackAnalysis(marketData, additionalData);
      }
      
      const text = data && data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.log("No text response from Gemini, using enhanced fallback");
        return enhancedFallbackAnalysis(marketData, additionalData);
      }

      const result = parseGeminiResponse(text);
      
      // Cache the result
      geminiCache.set(cacheKey, {
        response: result,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      cleanCache();
      
      console.log("Gemini analysis successful");
      return result;
      
    } catch (error) {
      console.error("Gemini API request failed:", error);
      return enhancedFallbackAnalysis(marketData, additionalData);
    }

  } catch (error) {
    console.error("Error in Gemini analysis:", error);
    return enhancedFallbackAnalysis(marketData, additionalData);
  }
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of geminiCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      geminiCache.delete(key);
    }
  }
}

function createAdvancedTradingPrompt(marketData: TimeframeData, symbol: string, additionalData: any): string {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];

  // Simplified prompt to reduce token usage
  return `
Analyze ${symbol} trading signal:

PRICE DATA:
5m: ${data5m.close} (Vol: ${data5m.volume})
15m: ${data15m.close} (Vol: ${data15m.volume})
30m: ${data30m.close} (Vol: ${data30m.volume})

ANALYSIS:
- Trend: ${additionalData.priceAction.trend}
- Structure: ${additionalData.priceAction.structure}
- Smart Money: ${additionalData.smartMoney.institutionalFlow}
- Volume: ${additionalData.smartMoney.volumeProfile}

Provide trading recommendation:
DIRECTION: [LONG or SHORT]
CONFIDENCE: [70-95]
REASON: [Brief explanation]
`;
}

function parseGeminiResponse(text: string): { direction: "LONG" | "SHORT"; confidence: number } {
  try {
    const directionMatch = text.match(/DIRECTION:\s*(LONG|SHORT)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\d+)/i);

    const direction = directionMatch?.[1]?.toUpperCase() as "LONG" | "SHORT" || "LONG";
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

    return {
      direction,
      confidence: Math.max(70, Math.min(95, confidence))
    };
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return { direction: "LONG", confidence: 75 };
  }
}

function enhancedFallbackAnalysis(marketData: TimeframeData, additionalData: any): { direction: "LONG" | "SHORT"; confidence: number } {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];

  // Enhanced fallback analysis using all available data
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalWeight = 0;
  
  // Price momentum analysis (weight: 3)
  const priceChanges = [
    (data5m.close - data15m.close) / data15m.close,
    (data15m.close - data30m.close) / data30m.close
  ];
  
  priceChanges.forEach(change => {
    if (change > 0.001) bullishSignals += 3; // 0.1% threshold
    else if (change < -0.001) bearishSignals += 3;
    totalWeight += 3;
  });
  
  // Volume analysis (weight: 2)
  if (data5m.volume > data15m.volume * 1.2) {
    if (data5m.close > data5m.open) bullishSignals += 2;
    else bearishSignals += 2;
    totalWeight += 2;
  }
  
  // Technical indicators (weight: 2)
  if (data5m.indicators.rsi < 30) bullishSignals += 2; // Oversold
  else if (data5m.indicators.rsi > 70) bearishSignals += 2; // Overbought
  totalWeight += 2;
  
  if (data5m.indicators.macd > 0) bullishSignals += 1;
  else bearishSignals += 1;
  totalWeight += 1;
  
  // Smart money analysis (weight: 4)
  if (additionalData.smartMoney.institutionalFlow === "BUYING") bullishSignals += 2;
  else if (additionalData.smartMoney.institutionalFlow === "SELLING") bearishSignals += 2;
  totalWeight += 2;
  
  if (additionalData.smartMoney.volumeProfile === "ACCUMULATION") bullishSignals += 1;
  else if (additionalData.smartMoney.volumeProfile === "DISTRIBUTION") bearishSignals += 1;
  totalWeight += 1;
  
  if (additionalData.smartMoney.orderFlow === "BULLISH") bullishSignals += 1;
  else if (additionalData.smartMoney.orderFlow === "BEARISH") bearishSignals += 1;
  totalWeight += 1;
  
  // Price action analysis (weight: 3)
  if (additionalData.priceAction.trend === "UPTREND") bullishSignals += 2;
  else if (additionalData.priceAction.trend === "DOWNTREND") bearishSignals += 2;
  totalWeight += 2;
  
  if (additionalData.priceAction.structure === "BULLISH") bullishSignals += 1;
  else if (additionalData.priceAction.structure === "BEARISH") bearishSignals += 1;
  totalWeight += 1;
  
  // Calculate direction and confidence
  const direction = bullishSignals > bearishSignals ? "LONG" : "SHORT";
  const signalStrength = Math.abs(bullishSignals - bearishSignals);
  const confidence = Math.min(90, 70 + (signalStrength / totalWeight) * 20);

  console.log(`Enhanced fallback analysis: ${direction} with ${confidence}% confidence (${bullishSignals}/${bearishSignals} signals)`);

  return { direction, confidence };
}

function fallbackAnalysis(marketData: TimeframeData): { direction: "LONG" | "SHORT"; confidence: number } {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];

  // Basic price action analysis
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // Price momentum
  if (data5m.close > data15m.close) bullishSignals++;
  else bearishSignals++;
  
  if (data15m.close > data30m.close) bullishSignals++;
  else bearishSignals++;
  
  // Volume confirmation
  if (data5m.volume > data15m.volume && data5m.close > data5m.open) bullishSignals++;
  if (data5m.volume > data15m.volume && data5m.close < data5m.open) bearishSignals++;
  
  // Technical indicators
  if (data5m.indicators.rsi < 30) bullishSignals++; // Oversold
  if (data5m.indicators.rsi > 70) bearishSignals++; // Overbought
  
  const direction = bullishSignals > bearishSignals ? "LONG" : "SHORT";
  const signalStrength = Math.abs(bullishSignals - bearishSignals);
  const confidence = Math.min(85, 70 + (signalStrength * 3));

  return { direction, confidence };
}

function calculateVWAP(timeframes: any[]) {
  const totalVolume = timeframes.reduce((sum, tf) => sum + tf.volume, 0);
  const vwap = timeframes.reduce((sum, tf) => sum + (tf.close * tf.volume), 0) / totalVolume;
  return vwap;
}

function analyzeVolumeDistribution(timeframes: any[]) {
  const volumes = timeframes.map(tf => tf.volume);
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  
  if (volumes[0] > avgVolume * 1.5) return "HIGH_VOLUME";
  if (volumes[0] < avgVolume * 0.5) return "LOW_VOLUME";
  return "NORMAL_VOLUME";
}

function identifyVolumeNodes(timeframes: any[]) {
  const priceVolumePairs = timeframes.map(tf => ({ price: tf.close, volume: tf.volume }));
  
  // Find high volume nodes (areas of high trading activity)
  const sortedByVolume = priceVolumePairs.sort((a, b) => b.volume - a.volume);
  
  return {
    highVolumeNodes: sortedByVolume.slice(0, 2).map(pair => pair.price),
    lowVolumeNodes: sortedByVolume.slice(-2).map(pair => pair.price)
  };
}

function determineDirection(
  priceAction: any,
  smartMoney: any,
  volumeAnalysis: any,
  geminiAnalysis: any
): "LONG" | "SHORT" {
  let bullishScore = 0;
  let bearishScore = 0;
  
  // Price action weight: 30%
  if (priceAction.trend === "UPTREND") bullishScore += 0.15;
  if (priceAction.trend === "DOWNTREND") bearishScore += 0.15;
  if (priceAction.structure === "BULLISH") bullishScore += 0.15;
  if (priceAction.structure === "BEARISH") bearishScore += 0.15;
  
  // Smart money weight: 40%
  if (smartMoney.institutionalFlow === "BUYING") bullishScore += 0.15;
  if (smartMoney.institutionalFlow === "SELLING") bearishScore += 0.15;
  if (smartMoney.volumeProfile === "ACCUMULATION") bullishScore += 0.1;
  if (smartMoney.volumeProfile === "DISTRIBUTION") bearishScore += 0.1;
  if (smartMoney.orderFlow === "BULLISH") bullishScore += 0.15;
  if (smartMoney.orderFlow === "BEARISH") bearishScore += 0.15;
  
  // Gemini AI weight: 30%
  if (geminiAnalysis.direction === "LONG") bullishScore += 0.3;
  if (geminiAnalysis.direction === "SHORT") bearishScore += 0.3;
  
  return bullishScore > bearishScore ? "LONG" : "SHORT";
}

function calculateConfidence(
  priceAction: any,
  smartMoney: any,
  volumeAnalysis: any,
  professionalAnalysis: any,
  geminiAnalysis: any
): number {
  let baseConfidence = 70;
  
  // Add confidence based on signal alignment
  let alignmentScore = 0;
  
  // Price action alignment
  if (priceAction.trend !== "SIDEWAYS" && priceAction.structure !== "NEUTRAL") {
    alignmentScore += 5;
  }
  
  // Smart money alignment
  if (smartMoney.institutionalFlow !== "NEUTRAL" && smartMoney.orderFlow !== "NEUTRAL") {
    alignmentScore += 8;
  }
  
  // Professional consensus alignment
  if (professionalAnalysis.consensusView !== "NEUTRAL") {
    alignmentScore += 5;
  }
  
  // Gemini confidence boost (reduced impact to account for fallback)
  alignmentScore += Math.min(10, (geminiAnalysis.confidence - 70) * 0.2);
  
  // Breakout probability boost
  if (priceAction.breakoutProbability > 70) {
    alignmentScore += 5;
  }
  
  return Math.min(95, Math.max(70, baseConfidence + alignmentScore));
}

/**
 * Enhanced direction determination using sophisticated multi-factor analysis
 */
function determineEnhancedDirection(
  indicators5m: EnhancedIndicators,
  indicators15m: EnhancedIndicators,
  indicators30m: EnhancedIndicators,
  multiTimeframeAnalysis: MultiTimeframeAnalysis,
  traditionalDirection: "LONG" | "SHORT"
): "LONG" | "SHORT" {
  let bullishScore = 0;
  let bearishScore = 0;
  
  // Multi-timeframe RSI analysis
  const rsiValues = [indicators5m.rsi, indicators15m.rsi, indicators30m.rsi];
  
  rsiValues.forEach((rsi, index) => {
    const weight = 3 - index; // 5m gets weight 3, 15m gets weight 2, 30m gets weight 1
    
    if (rsi < 30) bullishScore += 2 * weight; // Oversold
    else if (rsi < 50) bullishScore += 1 * weight; // Bearish but not extreme
    else if (rsi > 70) bearishScore += 2 * weight; // Overbought
    else if (rsi > 50) bearishScore += 1 * weight; // Bullish but not extreme
  });
  
  // MACD analysis across timeframes
  const macdValues = [indicators5m.macd, indicators15m.macd, indicators30m.macd];
  
  macdValues.forEach((macd, index) => {
    const weight = 3 - index;
    
    if (macd.line > macd.signal) {
      bullishScore += 2 * weight;
      if (macd.histogram > 0) bullishScore += 1 * weight; // Increasing momentum
    } else {
      bearishScore += 2 * weight;
      if (macd.histogram < 0) bearishScore += 1 * weight; // Increasing momentum
    }
  });
  
  // Moving average trend analysis
  const smaAnalysis = [indicators5m.sma, indicators15m.sma, indicators30m.sma];
  
  smaAnalysis.forEach((sma, index) => {
    const weight = 3 - index;
    
    // Strong trend: SMA20 > SMA50 > SMA200
    if (sma.sma20 > sma.sma50 && sma.sma50 > sma.sma200) {
      bullishScore += 3 * weight;
    } else if (sma.sma20 < sma.sma50 && sma.sma50 < sma.sma200) {
      bearishScore += 3 * weight;
    }
    // Partial trend
    else if (sma.sma20 > sma.sma50) {
      bullishScore += 1 * weight;
    } else if (sma.sma20 < sma.sma50) {
      bearishScore += 1 * weight;
    }
  });
  
  // Multi-timeframe confluence bonus
  if (multiTimeframeAnalysis.confluence > 70) {
    if (multiTimeframeAnalysis.trendAlignment === "STRONG_BULL" || 
        multiTimeframeAnalysis.trendAlignment === "BULL") {
      bullishScore += 5;
    } else if (multiTimeframeAnalysis.trendAlignment === "STRONG_BEAR" || 
               multiTimeframeAnalysis.trendAlignment === "BEAR") {
      bearishScore += 5;
    }
  }
  
  // Momentum confirmation
  const momentum5m = indicators5m.momentum.roc;
  const momentum15m = indicators15m.momentum.roc;
  
  if (momentum5m > 0 && momentum15m > 0) {
    bullishScore += 3;
  } else if (momentum5m < 0 && momentum15m < 0) {
    bearishScore += 3;
  }
  
  // Bollinger Bands analysis
  const bb5m = indicators5m.bollinger;
  if (bb5m.squeeze) {
    // During squeeze, look for breakout direction based on other indicators
    if (bullishScore > bearishScore) bullishScore += 2;
    else bearishScore += 2;
  }
  
  // Traditional direction as tie-breaker with reduced weight
  if (traditionalDirection === "LONG") bullishScore += 1;
  else bearishScore += 1;
  
  const enhancedDirection = bullishScore > bearishScore ? "LONG" : "SHORT";
  
  console.log(`🎯 Enhanced direction analysis: BULL ${bullishScore} vs BEAR ${bearishScore} = ${enhancedDirection}`);
  
  return enhancedDirection;
}
