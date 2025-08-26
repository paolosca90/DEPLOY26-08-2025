/**
 * Enhanced Confidence Calculation System
 * 
 * This module provides sophisticated confidence scoring for trading signals
 * based on multiple factors including technical analysis, market conditions,
 * and historical performance.
 */

import { MultiTimeframeAnalysis, MarketConditionContext, EnhancedIndicators } from "./enhanced-technical-analysis";
import { InstitutionalAnalysis } from "./institutional-analysis";

export interface ConfidenceFactors {
  technicalAlignment: number; // 0-100
  multiTimeframeConfluence: number; // 0-100
  volumeConfirmation: number; // 0-100
  marketConditions: number; // 0-100
  historicalPerformance: number; // 0-100
  riskAdjustment: number; // 0-100
  momentumStrength: number; // 0-100
  volatilityFilter: number; // 0-100
  institutionalAlignment: number; // 0-100 NEW: Institutional factors
  orderBlockConfirmation: number; // 0-100 NEW: Order block alignment
  liquidityZoneConfirmation: number; // 0-100 NEW: Supply/Demand zones
  marketMakerConfidence: number; // 0-100 NEW: Market maker model
}

export interface EnhancedConfidenceResult {
  finalConfidence: number;
  confidenceGrade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  factors: ConfidenceFactors;
  institutionalScore: number; // NEW: Overall institutional confidence
  recommendations: {
    shouldTrade: boolean;
    suggestedLotSizeMultiplier: number; // 0.1 to 2.0
    riskAdjustment: "REDUCE" | "NORMAL" | "INCREASE";
    timeframeRecommendation: "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";
    institutionalBias: "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH"; // NEW
  };
  warnings: string[];
}

/**
 * Calculate enhanced confidence score with multiple sophisticated factors
 */
export function calculateEnhancedConfidence(
  indicators5m: EnhancedIndicators,
  indicators15m: EnhancedIndicators,
  indicators30m: EnhancedIndicators,
  multiTimeframeAnalysis: MultiTimeframeAnalysis,
  marketContext: MarketConditionContext,
  direction: "LONG" | "SHORT",
  symbol: string,
  historicalWinRate?: number,
  institutionalAnalysis?: InstitutionalAnalysis
): EnhancedConfidenceResult {
  
  const factors: ConfidenceFactors = {
    technicalAlignment: calculateTechnicalAlignment(indicators5m, indicators15m, indicators30m, direction),
    multiTimeframeConfluence: multiTimeframeAnalysis.confluence,
    volumeConfirmation: calculateVolumeConfirmation(indicators5m, indicators15m, indicators30m),
    marketConditions: calculateMarketConditionsScore(marketContext, multiTimeframeAnalysis),
    historicalPerformance: calculateHistoricalPerformanceScore(historicalWinRate, symbol),
    riskAdjustment: calculateRiskAdjustmentScore(multiTimeframeAnalysis, marketContext),
    momentumStrength: calculateMomentumStrength(indicators5m, indicators15m, direction),
    volatilityFilter: calculateVolatilityFilterScore(multiTimeframeAnalysis, marketContext),
    // NEW: Institutional factors
    institutionalAlignment: calculateInstitutionalAlignment(institutionalAnalysis, direction),
    orderBlockConfirmation: calculateOrderBlockConfirmation(institutionalAnalysis, direction),
    liquidityZoneConfirmation: calculateLiquidityZoneConfirmation(institutionalAnalysis, direction),
    marketMakerConfidence: calculateMarketMakerConfidence(institutionalAnalysis)
  };

  // Calculate weighted confidence score
  const weightedConfidence = calculateWeightedConfidence(factors);
  
  // Calculate institutional score separately
  const institutionalScore = calculateInstitutionalScore(factors);
  
  // Apply dynamic thresholds based on market conditions
  const finalConfidence = applyDynamicThresholds(weightedConfidence, marketContext, multiTimeframeAnalysis);
  
  // Determine confidence grade
  const confidenceGrade = getConfidenceGrade(finalConfidence);
  
  // Generate recommendations
  const recommendations = generateRecommendations(finalConfidence, factors, marketContext, institutionalAnalysis);
  
  // Generate warnings
  const warnings = generateWarnings(factors, marketContext, multiTimeframeAnalysis);

  return {
    finalConfidence,
    confidenceGrade,
    factors,
    institutionalScore,
    recommendations,
    warnings
  };
}

/**
 * Calculate technical indicator alignment score
 */
function calculateTechnicalAlignment(
  indicators5m: EnhancedIndicators,
  indicators15m: EnhancedIndicators,
  indicators30m: EnhancedIndicators,
  direction: "LONG" | "SHORT"
): number {
  let alignmentScore = 0;
  let totalWeight = 0;

  // RSI alignment across timeframes
  const rsiScores = [indicators5m.rsi, indicators15m.rsi, indicators30m.rsi];
  const rsiWeight = 3;
  
  if (direction === "LONG") {
    // Look for oversold conditions or bullish momentum
    const oversoldCount = rsiScores.filter(rsi => rsi < 40).length;
    const bullishMomentum = rsiScores.filter(rsi => rsi > 50 && rsi < 70).length;
    alignmentScore += (oversoldCount * 10 + bullishMomentum * 5) * rsiWeight;
  } else {
    // Look for overbought conditions or bearish momentum
    const overboughtCount = rsiScores.filter(rsi => rsi > 60).length;
    const bearishMomentum = rsiScores.filter(rsi => rsi < 50 && rsi > 30).length;
    alignmentScore += (overboughtCount * 10 + bearishMomentum * 5) * rsiWeight;
  }
  totalWeight += rsiWeight * 15; // Max possible score for RSI

  // MACD alignment
  const macdWeight = 4;
  const macds = [indicators5m.macd, indicators15m.macd, indicators30m.macd];
  
  macds.forEach(macd => {
    if (direction === "LONG") {
      if (macd.line > macd.signal && macd.histogram > 0) alignmentScore += 15 * macdWeight;
      else if (macd.line > macd.signal) alignmentScore += 10 * macdWeight;
      else if (macd.histogram > 0) alignmentScore += 5 * macdWeight;
    } else {
      if (macd.line < macd.signal && macd.histogram < 0) alignmentScore += 15 * macdWeight;
      else if (macd.line < macd.signal) alignmentScore += 10 * macdWeight;
      else if (macd.histogram < 0) alignmentScore += 5 * macdWeight;
    }
  });
  totalWeight += 15 * macds.length * macdWeight;

  // Moving average alignment
  const maWeight = 2;
  const smaAlignments = [indicators5m.sma, indicators15m.sma, indicators30m.sma];
  
  smaAlignments.forEach(sma => {
    if (direction === "LONG") {
      if (sma.sma20 > sma.sma50 && sma.sma50 > sma.sma200) alignmentScore += 20 * maWeight;
      else if (sma.sma20 > sma.sma50) alignmentScore += 10 * maWeight;
    } else {
      if (sma.sma20 < sma.sma50 && sma.sma50 < sma.sma200) alignmentScore += 20 * maWeight;
      else if (sma.sma20 < sma.sma50) alignmentScore += 10 * maWeight;
    }
  });
  totalWeight += 20 * smaAlignments.length * maWeight;

  return Math.min(100, (alignmentScore / totalWeight) * 100);
}

/**
 * Calculate volume confirmation score
 */
function calculateVolumeConfirmation(
  indicators5m: EnhancedIndicators,
  indicators15m: EnhancedIndicators,
  indicators30m: EnhancedIndicators
): number {
  // This is a placeholder - in real implementation, volume analysis would be more sophisticated
  // For now, we'll use a simplified approach based on momentum indicators
  
  const momentum5m = indicators5m.momentum.momentum;
  const momentum15m = indicators15m.momentum.momentum;
  const momentum30m = indicators30m.momentum.momentum;
  
  const momentumAlignment = [momentum5m, momentum15m, momentum30m].filter(m => 
    Math.sign(momentum5m) === Math.sign(m)
  ).length;
  
  // Higher alignment suggests volume confirmation
  return (momentumAlignment / 3) * 100;
}

/**
 * Calculate market conditions score
 */
function calculateMarketConditionsScore(
  marketContext: MarketConditionContext,
  multiTimeframeAnalysis: MultiTimeframeAnalysis
): number {
  let score = 50; // Base score
  
  // Session-based scoring
  switch (marketContext.sessionType) {
    case "OVERLAP":
      score += 20; // High activity periods are better
      break;
    case "EUROPEAN":
    case "US":
      score += 10;
      break;
    case "ASIAN":
      score += 5;
      break;
    case "DEAD":
      score -= 20; // Penalize low activity periods
      break;
  }
  
  // Volatility-based scoring
  switch (multiTimeframeAnalysis.volatilityState) {
    case "NORMAL":
      score += 10; // Ideal volatility
      break;
    case "LOW":
      score -= 5; // Harder to profit
      break;
    case "HIGH":
      score -= 10; // Higher risk
      break;
    case "EXTREME":
      score -= 25; // Dangerous conditions
      break;
  }
  
  // Trend strength bonus
  score += marketContext.trendStrength * 20;
  
  // Market noise penalty
  score -= marketContext.marketNoise * 15;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate historical performance score
 */
function calculateHistoricalPerformanceScore(
  historicalWinRate?: number,
  symbol?: string
): number {
  if (!historicalWinRate) {
    return 60; // Neutral if no history
  }
  
  // Convert win rate to confidence boost/penalty
  if (historicalWinRate > 0.7) return 90;
  if (historicalWinRate > 0.6) return 80;
  if (historicalWinRate > 0.5) return 70;
  if (historicalWinRate > 0.4) return 60;
  if (historicalWinRate > 0.3) return 50;
  return 30;
}

/**
 * Calculate risk adjustment score
 */
function calculateRiskAdjustmentScore(
  multiTimeframeAnalysis: MultiTimeframeAnalysis,
  marketContext: MarketConditionContext
): number {
  let score = 70; // Base risk score
  
  // Adjust based on volatility
  switch (multiTimeframeAnalysis.volatilityState) {
    case "LOW":
      score += 15; // Lower risk
      break;
    case "NORMAL":
      score += 10;
      break;
    case "HIGH":
      score -= 10;
      break;
    case "EXTREME":
      score -= 30; // Very high risk
      break;
  }
  
  // Adjust based on trend alignment
  switch (multiTimeframeAnalysis.trendAlignment) {
    case "STRONG_BULL":
    case "STRONG_BEAR":
      score += 15; // Strong trends are more predictable
      break;
    case "BULL":
    case "BEAR":
      score += 5;
      break;
    case "NEUTRAL":
      score -= 10; // Neutral trends are riskier
      break;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate momentum strength score
 */
function calculateMomentumStrength(
  indicators5m: EnhancedIndicators,
  indicators15m: EnhancedIndicators,
  direction: "LONG" | "SHORT"
): number {
  const roc5m = indicators5m.momentum.roc;
  const roc15m = indicators15m.momentum.roc;
  
  // Check momentum alignment with direction
  let score = 0;
  
  if (direction === "LONG") {
    if (roc5m > 0 && roc15m > 0) score += 40;
    else if (roc5m > 0 || roc15m > 0) score += 20;
    
    // Bonus for accelerating momentum
    if (roc5m > roc15m && roc5m > 0) score += 20;
  } else {
    if (roc5m < 0 && roc15m < 0) score += 40;
    else if (roc5m < 0 || roc15m < 0) score += 20;
    
    // Bonus for accelerating momentum
    if (roc5m < roc15m && roc5m < 0) score += 20;
  }
  
  // MACD momentum confirmation
  const macd5m = indicators5m.macd;
  if (direction === "LONG" && macd5m.histogram > 0) score += 20;
  if (direction === "SHORT" && macd5m.histogram < 0) score += 20;
  
  return Math.min(100, score);
}

/**
 * Calculate volatility filter score
 */
function calculateVolatilityFilterScore(
  multiTimeframeAnalysis: MultiTimeframeAnalysis,
  marketContext: MarketConditionContext
): number {
  let score = 50; // Base score
  
  // Ideal volatility for trading
  switch (multiTimeframeAnalysis.volatilityState) {
    case "NORMAL":
      score = 90; // Perfect for trading
      break;
    case "LOW":
      score = 70; // Acceptable but lower profit potential
      break;
    case "HIGH":
      score = 60; // Risky but tradeable
      break;
    case "EXTREME":
      score = 20; // Very risky
      break;
  }
  
  return score;
}

/**
 * Calculate weighted confidence score
 */
function calculateWeightedConfidence(factors: ConfidenceFactors): number {
  const weights = {
    technicalAlignment: 0.15,        // Reduced to make room for institutional
    multiTimeframeConfluence: 0.15,  // Reduced
    volumeConfirmation: 0.08,        // Reduced
    marketConditions: 0.12,          // Reduced
    historicalPerformance: 0.08,     // Reduced
    riskAdjustment: 0.08,            // Reduced
    momentumStrength: 0.04,          // Reduced
    volatilityFilter: 0.05,          // Reduced
    // NEW: Institutional factors (30% total weight)
    institutionalAlignment: 0.10,    // High weight for institutional alignment
    orderBlockConfirmation: 0.08,    // Order blocks are crucial
    liquidityZoneConfirmation: 0.07, // Supply/Demand zones
    marketMakerConfidence: 0.05      // Market maker model
  };

  let weightedScore = 0;
  let totalWeight = 0;

  Object.entries(factors).forEach(([factor, score]) => {
    const weight = weights[factor as keyof typeof weights] || 0;
    weightedScore += score * weight;
    totalWeight += weight;
  });

  return weightedScore / totalWeight;
}

/**
 * Apply dynamic thresholds based on market conditions
 */
function applyDynamicThresholds(
  baseConfidence: number,
  marketContext: MarketConditionContext,
  multiTimeframeAnalysis: MultiTimeframeAnalysis
): number {
  let adjustedConfidence = baseConfidence;

  // Apply volatility adjustment
  adjustedConfidence *= marketContext.volatilityAdjustment;

  // Reduce confidence during extreme volatility
  if (multiTimeframeAnalysis.volatilityState === "EXTREME") {
    adjustedConfidence *= 0.7;
  }

  // Boost confidence during strong trends
  if (multiTimeframeAnalysis.trendAlignment === "STRONG_BULL" || 
      multiTimeframeAnalysis.trendAlignment === "STRONG_BEAR") {
    adjustedConfidence *= 1.1;
  }

  // Ensure confidence stays within reasonable bounds
  return Math.min(98, Math.max(15, adjustedConfidence));
}

/**
 * Get confidence grade based on score
 */
function getConfidenceGrade(confidence: number): EnhancedConfidenceResult["confidenceGrade"] {
  if (confidence >= 90) return "A+";
  if (confidence >= 85) return "A";
  if (confidence >= 80) return "B+";
  if (confidence >= 75) return "B";
  if (confidence >= 60) return "C";
  if (confidence >= 45) return "D";
  return "F";
}

/**
 * Generate warnings based on analysis
 */
function generateWarnings(
  factors: ConfidenceFactors,
  marketContext: MarketConditionContext,
  multiTimeframeAnalysis: MultiTimeframeAnalysis
): string[] {
  const warnings: string[] = [];

  if (factors.technicalAlignment < 50) {
    warnings.push("⚠️ Weak technical alignment across indicators");
  }

  if (factors.multiTimeframeConfluence < 40) {
    warnings.push("⚠️ Poor multi-timeframe confluence - signals conflicting");
  }

  if (marketContext.sessionType === "DEAD") {
    warnings.push("⚠️ Trading during low-activity session - reduced liquidity");
  }

  if (multiTimeframeAnalysis.volatilityState === "EXTREME") {
    warnings.push("🚨 Extreme market volatility detected - high risk");
  }

  if (factors.volumeConfirmation < 30) {
    warnings.push("⚠️ Weak volume confirmation for price movement");
  }

  if (factors.historicalPerformance < 40) {
    warnings.push("⚠️ Poor historical performance for this symbol/conditions");
  }

  if (factors.riskAdjustment < 40) {
    warnings.push("🚨 High-risk market conditions - consider reducing position size");
  }

  // NEW: Institutional warnings
  if (factors.institutionalAlignment < 40) {
    warnings.push("⚠️ Institutional flow conflicts with trade direction");
  }

  if (factors.orderBlockConfirmation < 30) {
    warnings.push("⚠️ No supporting order blocks found for this direction");
  }

  if (factors.liquidityZoneConfirmation < 30) {
    warnings.push("⚠️ Price not near significant supply/demand zones");
  }

  return warnings;
}

/**
 * Calculate institutional alignment score
 */
function calculateInstitutionalAlignment(
  institutionalAnalysis: InstitutionalAnalysis | undefined,
  direction: "LONG" | "SHORT"
): number {
  if (!institutionalAnalysis) return 50; // Neutral if no analysis

  let score = 50; // Base score
  
  // Smart money direction alignment
  const { smartMoneyDirection } = institutionalAnalysis.marketMakerModel;
  if ((direction === "LONG" && smartMoneyDirection === "LONG") ||
      (direction === "SHORT" && smartMoneyDirection === "SHORT")) {
    score += 20;
  } else if (smartMoneyDirection === "SIDEWAYS") {
    score -= 10;
  } else {
    score -= 25; // Conflicting direction
  }
  
  // Institutional flow alignment
  const { institutionalFlow } = institutionalAnalysis.marketMakerModel;
  if ((direction === "LONG" && institutionalFlow === "BUYING") ||
      (direction === "SHORT" && institutionalFlow === "SELLING")) {
    score += 15;
  } else if (institutionalFlow === "NEUTRAL") {
    score -= 5;
  } else {
    score -= 20; // Conflicting flow
  }
  
  // Active session boost
  const hasHighVolatilitySession = institutionalAnalysis.activeSessions.some(
    session => session.volatilityMultiplier >= 1.2
  );
  if (hasHighVolatilitySession) {
    score += 10;
  }
  
  // Kill zone alignment
  const activeKillZone = institutionalAnalysis.killZones.find(kz => kz.isActive);
  if (activeKillZone && activeKillZone.volatilityExpected === "HIGH") {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate order block confirmation score
 */
function calculateOrderBlockConfirmation(
  institutionalAnalysis: InstitutionalAnalysis | undefined,
  direction: "LONG" | "SHORT"
): number {
  if (!institutionalAnalysis) return 30; // Low if no analysis
  
  const { orderBlocks } = institutionalAnalysis;
  
  if (orderBlocks.length === 0) return 20;
  
  // Filter order blocks by direction
  const relevantOBs = orderBlocks.filter(ob => 
    (direction === "LONG" && ob.type === "BULLISH") ||
    (direction === "SHORT" && ob.type === "BEARISH")
  );
  
  if (relevantOBs.length === 0) return 25;
  
  let score = 40; // Base score for having relevant OBs
  
  // Boost score based on order block strength
  const strengthBonus = relevantOBs.reduce((sum, ob) => {
    const strengthScore = { "EXTREME": 20, "STRONG": 15, "MODERATE": 10, "WEAK": 5 };
    return sum + strengthScore[ob.strength];
  }, 0);
  
  score += Math.min(40, strengthBonus);
  
  // Boost score for fresh order blocks
  const freshOBs = relevantOBs.filter(ob => ob.status === "FRESH");
  score += freshOBs.length * 5;
  
  // Boost score for nearby order blocks
  const nearbyOBs = relevantOBs.filter(ob => ob.distance < 0.02); // Within 2%
  score += nearbyOBs.length * 10;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate liquidity zone confirmation score
 */
function calculateLiquidityZoneConfirmation(
  institutionalAnalysis: InstitutionalAnalysis | undefined,
  direction: "LONG" | "SHORT"
): number {
  if (!institutionalAnalysis) return 30; // Low if no analysis
  
  const { supplyDemandZones } = institutionalAnalysis;
  
  if (supplyDemandZones.length === 0) return 25;
  
  // Filter zones by direction
  const relevantZones = supplyDemandZones.filter(zone => 
    (direction === "LONG" && zone.type === "DEMAND") ||
    (direction === "SHORT" && zone.type === "SUPPLY")
  );
  
  if (relevantZones.length === 0) return 30;
  
  let score = 45; // Base score for having relevant zones
  
  // Boost score based on zone strength
  const strengthBonus = relevantZones.reduce((sum, zone) => {
    const strengthScore = { "EXTREME": 20, "STRONG": 15, "MODERATE": 10, "WEAK": 5 };
    return sum + strengthScore[zone.strength];
  }, 0);
  
  score += Math.min(35, strengthBonus);
  
  // Boost score for fresh zones
  const freshZones = relevantZones.filter(zone => zone.status === "FRESH");
  score += freshZones.length * 8;
  
  // Boost score for untested zones
  const untestedZones = relevantZones.filter(zone => zone.touches === 0);
  score += untestedZones.length * 10;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate market maker confidence score
 */
function calculateMarketMakerConfidence(
  institutionalAnalysis: InstitutionalAnalysis | undefined
): number {
  if (!institutionalAnalysis) return 40; // Neutral if no analysis
  
  const { marketMakerModel } = institutionalAnalysis;
  
  let score = marketMakerModel.confidence; // Base score from MM model
  
  // Boost score based on phase clarity
  switch (marketMakerModel.phase) {
    case "ACCUMULATION":
    case "DISTRIBUTION":
      score += 10; // Clear phases are good
      break;
    case "MANIPULATION":
      score += 15; // Manipulation phase often leads to strong moves
      break;
    case "REACCUMULATION":
      score += 5; // Moderate boost
      break;
  }
  
  // Adjust based on liquidity sweep probability
  if (marketMakerModel.liquiditySweepProbability > 70) {
    score -= 10; // High probability of false moves
  } else if (marketMakerModel.liquiditySweepProbability < 30) {
    score += 10; // Low probability of manipulation
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate overall institutional score
 */
function calculateInstitutionalScore(factors: ConfidenceFactors): number {
  const institutionalFactors = [
    factors.institutionalAlignment,
    factors.orderBlockConfirmation,
    factors.liquidityZoneConfirmation,
    factors.marketMakerConfidence
  ];
  
  return institutionalFactors.reduce((sum, score) => sum + score, 0) / institutionalFactors.length;
}

/**
 * Updated recommendations with institutional bias
 */
function generateRecommendations(
  confidence: number,
  factors: ConfidenceFactors,
  marketContext: MarketConditionContext,
  institutionalAnalysis?: InstitutionalAnalysis
): EnhancedConfidenceResult["recommendations"] {
  // Determine if trade should be taken
  const shouldTrade = confidence >= 65 && 
                     factors.technicalAlignment >= 50 && 
                     factors.institutionalAlignment >= 40; // NEW: institutional requirement
  
  // Adjust lot size with institutional factors
  let suggestedLotSizeMultiplier = 1.0;
  
  const institutionalScore = calculateInstitutionalScore(factors);
  
  if (confidence >= 85 && institutionalScore >= 80) suggestedLotSizeMultiplier = 2.0; // Max size
  else if (confidence >= 75 && institutionalScore >= 70) suggestedLotSizeMultiplier = 1.5;
  else if (confidence >= 65 && institutionalScore >= 60) suggestedLotSizeMultiplier = 1.2;
  else if (confidence >= 55 && institutionalScore >= 50) suggestedLotSizeMultiplier = 1.0;
  else if (confidence >= 45 && institutionalScore >= 40) suggestedLotSizeMultiplier = 0.5;
  else suggestedLotSizeMultiplier = 0.1;
  
  // Risk adjustment with institutional considerations
  let riskAdjustment: EnhancedConfidenceResult["recommendations"]["riskAdjustment"];
  if (factors.riskAdjustment >= 80 && institutionalScore >= 70) riskAdjustment = "INCREASE";
  else if (factors.riskAdjustment >= 60 && institutionalScore >= 50) riskAdjustment = "NORMAL";
  else riskAdjustment = "REDUCE";
  
  // Timeframe recommendation with institutional timing
  let timeframeRecommendation: EnhancedConfidenceResult["recommendations"]["timeframeRecommendation"];
  const hasActiveKillZone = institutionalAnalysis?.killZones.some(kz => kz.isActive) || false;
  
  if (factors.momentumStrength >= 80 && hasActiveKillZone) {
    timeframeRecommendation = "SHORT_TERM";
  } else if (factors.multiTimeframeConfluence >= 75 && institutionalScore >= 60) {
    timeframeRecommendation = "MEDIUM_TERM";
  } else {
    timeframeRecommendation = "LONG_TERM";
  }
  
  // NEW: Institutional bias
  let institutionalBias: EnhancedConfidenceResult["recommendations"]["institutionalBias"];
  if (institutionalScore >= 85) {
    institutionalBias = institutionalAnalysis?.marketMakerModel.smartMoneyDirection === "LONG" 
      ? "STRONG_BULLISH" : "STRONG_BEARISH";
  } else if (institutionalScore >= 70) {
    institutionalBias = institutionalAnalysis?.marketMakerModel.smartMoneyDirection === "LONG" 
      ? "BULLISH" : "BEARISH";
  } else if (institutionalScore >= 30) {
    institutionalBias = "NEUTRAL";
  } else {
    institutionalBias = institutionalAnalysis?.marketMakerModel.smartMoneyDirection === "LONG" 
      ? "BEARISH" : "BULLISH"; // Contrarian when institutional score is very low
  }

  return {
    shouldTrade,
    suggestedLotSizeMultiplier,
    riskAdjustment,
    timeframeRecommendation,
    institutionalBias
  };
}
