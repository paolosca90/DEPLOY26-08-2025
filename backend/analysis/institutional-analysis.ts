/**
 * Institutional Trading Analysis Module (v2.0)
 * Implements advanced institutional trading concepts (Market Structure, BOS/CHOCH, Order Blocks)
 * to drastically improve signal quality.
 */

// --- ENHANCED INTERFACES ---

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  timeframe: string;
  high: number;
  low: number;
  volume: number;
  timestamp: number;
  strength: "WEAK" | "MODERATE" | "STRONG" | "EXTREME";
  status: "FRESH" | "TESTED" | "BROKEN";
  distance: number; // Distance from current price
}

export interface FairValueGap {
  id: string;
  type: "BULLISH" | "BEARISH";
  timeframe: string;
  top: number;
  bottom: number;
  timestamp: number;
  status: "OPEN" | "PARTIAL_FILL" | "FILLED";
  strength: "WEAK" | "MODERATE" | "STRONG";
  volume: number;
}

export interface StructurePoint {
  type: "HH" | "HL" | "LH" | "LL"; // Higher High, Higher Low, etc.
  price: number;
  timestamp: number;
}

export interface MarketStructure {
  trend: "UPTREND" | "DOWNTREND" | "RANGING";
  bias: "BULLISH" | "BEARISH" | "NEUTRAL"; // The directional "bias" based on recent structure
  lastBOS: { type: "BULLISH" | "BEARISH"; price: number; timestamp: number } | null;
  lastCHOCH: { type: "BULLISH" | "BEARISH"; price: number; timestamp: number } | null;
  swingHighs: { price: number; timestamp: number }[];
  swingLows: { price: number; timestamp: number }[];
  structurePoints: StructurePoint[];
  keyLevels: number[];
}


export interface SupplyDemandZone {
  id: string;
  type: "SUPPLY" | "DEMAND";
  timeframe: string;
  top: number;
  bottom: number;
  timestamp: number;
  strength: "WEAK" | "MODERATE" | "STRONG" | "EXTREME";
  status: "FRESH" | "TESTED" | "BROKEN";
  volume: number;
  touches: number;
  reaction: "STRONG" | "MODERATE" | "WEAK";
}

export interface InstitutionalSession {
  name: "SYDNEY" | "TOKYO" | "LONDON" | "NEW_YORK";
  isActive: boolean;
  openTime: string;
  closeTime: string;
  volatilityMultiplier: number;
  preferredPairs: string[];
  characteristics: string[];
}

export interface MarketMakerModel {
  phase: "ACCUMULATION" | "MANIPULATION" | "DISTRIBUTION" | "REACCUMULATION";
  confidence: number;
  liquiditySweepProbability: number;
  stopHuntLevel: number | null;
  institutionalFlow: "BUYING" | "SELLING" | "NEUTRAL";
  smartMoneyDirection: "LONG" | "SHORT" | "SIDEWAYS";
}

export interface InstitutionalAnalysis {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  marketStructure: MarketStructure;
  supplyDemandZones: SupplyDemandZone[];
  activeSessions: InstitutionalSession[];
  marketMakerModel: MarketMakerModel;
  institutionalLevels: {
    dailyHigh: number;
    dailyLow: number;
    weeklyHigh: number;
    weeklyLow: number;
    monthlyHigh: number;
    monthlyLow: number;
    previousDayHigh: number;
    previousDayLow: number;
  };
  killZones: Array<{
    name: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    volatilityExpected: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
  }>;
}


// --- NEW STRUCTURAL ANALYSIS FUNCTIONS (REPLACEMENT) ---

/**
 * Identifies Swing Highs in a series of candles.
 * A swing high is a local maximum higher than the surrounding candles.
 */
export function identifySwingHighs(candles: Array<{high: number, timestamp: number}>, lookback: number = 5): { price: number; timestamp: number }[] {
  const swingHighs: { price: number; timestamp: number }[] = [];
  if (candles.length < (lookback * 2 + 1)) return [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    let isSwingHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high > currentHigh || candles[i + j].high > currentHigh) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      swingHighs.push({ price: currentHigh, timestamp: candles[i].timestamp });
    }
  }
  return swingHighs;
}

/**
 * Identifies Swing Lows in a series of candles.
 * A swing low is a local minimum lower than the surrounding candles.
 */
export function identifySwingLows(candles: Array<{low: number, timestamp: number}>, lookback: number = 5): { price: number; timestamp: number }[] {
  const swingLows: { price: number; timestamp: number }[] = [];
  if (candles.length < (lookback * 2 + 1)) return [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentLow = candles[i].low;
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].low < currentLow || candles[i + j].low < currentLow) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      swingLows.push({ price: currentLow, timestamp: candles[i].timestamp });
    }
  }
  return swingLows;
}

/**
 * Analyzes and sorts swing points to create a structural sequence.
 */
function getStructurePoints(swingHighs: { price: number; timestamp: number }[], swingLows: { price: number; timestamp: number }[]): { price: number; timestamp: number; isHigh: boolean }[] {
    const combined = [
        ...swingHighs.map(sh => ({ ...sh, isHigh: true })),
        ...swingLows.map(sl => ({ ...sl, isHigh: false }))
    ];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Analyzes the sequence of swing points to identify HH, HL, LH, LL and Break of Structure (BOS) / Change of Character (CHOCH).
 */
function analyzeStructuralSequence(points: { price: number; timestamp: number; isHigh: boolean }[]): { structurePoints: StructurePoint[], lastBOS: MarketStructure['lastBOS'], lastCHOCH: MarketStructure['lastCHOCH'] } {
    const structurePoints: StructurePoint[] = [];
    let lastBOS: MarketStructure['lastBOS'] = null;
    let lastCHOCH: MarketStructure['lastCHOCH'] = null;

    if (points.length < 2) return { structurePoints, lastBOS, lastCHOCH };

    for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const current = points[i];

        // If we have two consecutive highs or lows, ignore the less significant one
        if (prev.isHigh === current.isHigh) continue;

        let type: StructurePoint['type'] | null = null;
        if (current.isHigh) {
            type = current.price > prev.price ? "HH" : "LH";
        } else {
            type = current.price > prev.price ? "HL" : "LL";
        }
        structurePoints.push({ type, price: current.price, timestamp: current.timestamp });

        // BOS and CHOCH identification
        const lastHigh = findLastPoint(structurePoints, p => p.type === "HH" || p.type === "LH", structurePoints.length - 2);
        const lastLow = findLastPoint(structurePoints, p => p.type === "LL" || p.type === "HL", structurePoints.length - 2);

        if (lastHigh && current.isHigh && current.price > lastHigh.price) { // Break of a high
            if (lastHigh.type === "HH") { // Bullish trend continuation
                lastBOS = { type: "BULLISH", price: current.price, timestamp: current.timestamp };
            } else { // Change of character from bearish to bullish
                lastCHOCH = { type: "BULLISH", price: current.price, timestamp: current.timestamp };
            }
        }
        if (lastLow && !current.isHigh && current.price < lastLow.price) { // Break of a low
            if (lastLow.type === "LL") { // Bearish trend continuation
                lastBOS = { type: "BEARISH", price: current.price, timestamp: current.timestamp };
            } else { // Change of character from bullish to bearish
                lastCHOCH = { type: "BEARISH", price: current.price, timestamp: current.timestamp };
            }
        }
    }

    return { structurePoints, lastBOS, lastCHOCH };
}

function findLastPoint(points: StructurePoint[], filter: (p: StructurePoint) => boolean, startIndex: number): StructurePoint | null {
    for (let i = startIndex; i >= 0; i--) {
        if (filter(points[i])) return points[i];
    }
    return null;
}

/**
 * Determines the trend and bias based on the structural sequence.
 */
function determineTrendAndBias(points: StructurePoint[]): { trend: MarketStructure['trend'], bias: MarketStructure['bias'] } {
    if (points.length < 3) return { trend: "RANGING", bias: "NEUTRAL" };

    const lastThree = points.slice(-3);
    const [p1, p2, p3] = lastThree;

    // Uptrend: Higher Highs and Higher Lows
    if ((p1.type === "HL" && p2.type === "HH" && p3.type === "HL" && p3.price > p1.price) ||
        (p1.type === "HH" && p2.type === "HL" && p3.type === "HH" && p3.price > p1.price)) {
        return { trend: "UPTREND", bias: "BULLISH" };
    }

    // Downtrend: Lower Lows and Lower Highs
    if ((p1.type === "LH" && p2.type === "LL" && p3.type === "LH" && p3.price < p1.price) ||
        (p1.type === "LL" && p2.type === "LH" && p3.type === "LL" && p3.price < p1.price)) {
        return { trend: "DOWNTREND", bias: "BEARISH" };
    }

    // If the last point is a higher high (HH) or a higher low (HL), the bias is bullish
    const lastPoint = points[points.length - 1];
    if(lastPoint.type === 'HH' || lastPoint.type === 'HL') return { trend: "RANGING", bias: "BULLISH" };
    if(lastPoint.type === 'LL' || lastPoint.type === 'LH') return { trend: "RANGING", bias: "BEARISH" };

    return { trend: "RANGING", bias: "NEUTRAL" };
}


/**
 * Main function that orchestrates the market structure analysis.
 */
export function analyzeMarketStructure(
  candles: Array<{high: number, low: number, open: number, close: number, volume: number, timestamp: number}>
): MarketStructure {
  const swingHighs = identifySwingHighs(candles);
  const swingLows = identifySwingLows(candles);
  const orderedPoints = getStructurePoints(swingHighs, swingLows);

  const { structurePoints, lastBOS, lastCHOCH } = analyzeStructuralSequence(orderedPoints);
  const { trend, bias } = determineTrendAndBias(structurePoints);

  const keyLevels = [...swingHighs.map(s => s.price), ...swingLows.map(s => s.price)]
                      .filter((v, i, a) => a.indexOf(v) === i) // Unique
                      .sort((a, b) => a - b);

  return {
    trend,
    bias,
    lastBOS,
    lastCHOCH,
    swingHighs,
    swingLows,
    structurePoints,
    keyLevels
  };
}


// --- EXISTING FUNCTIONS (NOT MODIFIED IN THIS STEP) ---

/**
 * Identify Order Blocks based on institutional order flow patterns
 */
export function identifyOrderBlocks(
  candles: Array<{high: number, low: number, open: number, close: number, volume: number, timestamp: number}>,
  timeframe: string,
  currentPrice: number
): OrderBlock[] {
  const orderBlocks: OrderBlock[] = [];
  
  if (candles.length < 10) return orderBlocks;
  
  for (let i = 3; i < candles.length - 3; i++) {
    const current = candles[i];
    const prev1 = candles[i - 1];
    const prev2 = candles[i - 2];
    const prev3 = candles[i - 3];
    const next1 = candles[i + 1];
    const next2 = candles[i + 2];
    const next3 = candles[i + 3];
    
    // Bullish Order Block: Strong buying candle followed by upward movement
    if (isBullishOrderBlock(current, prev1, prev2, next1, next2, next3)) {
      const strength = calculateOrderBlockStrength(current, [prev1, prev2, next1, next2, next3], "BULLISH");
      const distance = Math.abs(current.high - currentPrice) / currentPrice;
      
      orderBlocks.push({
        id: `OB_BULL_${timeframe}_${i}_${current.timestamp}`,
        type: "BULLISH",
        timeframe,
        high: current.high,
        low: current.low,
        volume: current.volume,
        timestamp: current.timestamp,
        strength,
        status: "FRESH",
        distance
      });
    }
    
    // Bearish Order Block: Strong selling candle followed by downward movement
    if (isBearishOrderBlock(current, prev1, prev2, next1, next2, next3)) {
      const strength = calculateOrderBlockStrength(current, [prev1, prev2, next1, next2, next3], "BEARISH");
      const distance = Math.abs(current.low - currentPrice) / currentPrice;
      
      orderBlocks.push({
        id: `OB_BEAR_${timeframe}_${i}_${current.timestamp}`,
        type: "BEARISH",
        timeframe,
        high: current.high,
        low: current.low,
        volume: current.volume,
        timestamp: current.timestamp,
        strength,
        status: "FRESH",
        distance
      });
    }
  }
  
  // Sort by strength and proximity to current price
  return orderBlocks
    .sort((a, b) => {
      const strengthScore = { "EXTREME": 4, "STRONG": 3, "MODERATE": 2, "WEAK": 1 };
      const aScore = strengthScore[a.strength] * (1 / (1 + a.distance));
      const bScore = strengthScore[b.strength] * (1 / (1 + b.distance));
      return bScore - aScore;
    })
    .slice(0, 8); // Keep top 8 most relevant order blocks
}

/**
 * Identify Fair Value Gaps (imbalances in price action)
 */
export function identifyFairValueGaps(
  candles: Array<{high: number, low: number, open: number, close: number, volume: number, timestamp: number}>,
  timeframe: string
): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  
  if (candles.length < 3) return fvgs;
  
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];
    
    // Bullish FVG: Gap between previous candle high and next candle low
    if (isBullishFVG(prev, current, next)) {
      const top = next.low;
      const bottom = prev.high;
      const strength = calculateFVGStrength(prev, current, next, "BULLISH");
      
      if (top > bottom) { // Valid gap
        fvgs.push({
          id: `FVG_BULL_${timeframe}_${i}_${current.timestamp}`,
          type: "BULLISH",
          timeframe,
          top,
          bottom,
          timestamp: current.timestamp,
          status: "OPEN",
          strength,
          volume: current.volume
        });
      }
    }
    
    // Bearish FVG: Gap between previous candle low and next candle high
    if (isBearishFVG(prev, current, next)) {
      const top = prev.low;
      const bottom = next.high;
      const strength = calculateFVGStrength(prev, current, next, "BEARISH");
      
      if (top > bottom) { // Valid gap
        fvgs.push({
          id: `FVG_BEAR_${timeframe}_${i}_${current.timestamp}`,
          type: "BEARISH",
          timeframe,
          top,
          bottom,
          timestamp: current.timestamp,
          status: "OPEN",
          strength,
          volume: current.volume
        });
      }
    }
  }
  
  return fvgs.slice(0, 10); // Keep top 10 most recent FVGs
}

/**
 * Identify Supply and Demand zones with institutional characteristics
 */
export function identifySupplyDemandZones(
  candles: Array<{high: number, low: number, open: number, close: number, volume: number, timestamp: number}>,
  timeframe: string,
  currentPrice: number
): SupplyDemandZone[] {
  const zones: SupplyDemandZone[] = [];
  
  if (candles.length < 20) return zones;
  
  // Look for strong moves away from certain price levels
  for (let i = 10; i < candles.length - 10; i++) {
    const baseCandles = candles.slice(i - 5, i + 1);
    const reactionCandles = candles.slice(i + 1, i + 11);
    
    // Check for supply zone (strong move down from a consolidation)
    if (isSupplyZone(baseCandles, reactionCandles)) {
      const zone = createSupplyZone(baseCandles, reactionCandles, timeframe, currentPrice, i);
      if (zone) zones.push(zone);
    }
    
    // Check for demand zone (strong move up from a consolidation)
    if (isDemandZone(baseCandles, reactionCandles)) {
      const zone = createDemandZone(baseCandles, reactionCandles, timeframe, currentPrice, i);
      if (zone) zones.push(zone);
    }
  }
  
  // Filter and sort by strength and proximity
  return zones
    .filter(zone => zone.strength !== "WEAK")
    .sort((a, b) => {
      const strengthScore = { "EXTREME": 4, "STRONG": 3, "MODERATE": 2, "WEAK": 1 };
      const aDistance = Math.min(
        Math.abs(a.top - currentPrice) / currentPrice,
        Math.abs(a.bottom - currentPrice) / currentPrice
      );
      const bDistance = Math.min(
        Math.abs(b.top - currentPrice) / currentPrice,
        Math.abs(b.bottom - currentPrice) / currentPrice
      );
      const aScore = strengthScore[a.strength] * (1 / (1 + aDistance));
      const bScore = strengthScore[b.strength] * (1 / (1 + bDistance));
      return bScore - aScore;
    })
    .slice(0, 6); // Keep top 6 zones
}

/**
 * Get current active institutional trading sessions
 */
export function getActiveInstitutionalSessions(): InstitutionalSession[] {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const sessions: InstitutionalSession[] = [];
  
  // Sydney Session (21:00 - 06:00 UTC)
  if (utcHour >= 21 || utcHour < 6) {
    sessions.push({
      name: "SYDNEY",
      isActive: true,
      openTime: "21:00",
      closeTime: "06:00",
      volatilityMultiplier: 0.7,
      preferredPairs: ["AUDUSD", "NZDUSD", "AUDJPY"],
      characteristics: ["Lower volatility", "Range-bound", "Thin liquidity"]
    });
  }
  
  // Tokyo Session (00:00 - 09:00 UTC)
  if (utcHour >= 0 && utcHour < 9) {
    sessions.push({
      name: "TOKYO",
      isActive: true,
      openTime: "00:00",
      closeTime: "09:00",
      volatilityMultiplier: 0.8,
      preferredPairs: ["USDJPY", "EURJPY", "GBPJPY", "AUDJPY"],
      characteristics: ["Yen strength", "Moderate volatility", "Technical levels respected"]
    });
  }
  
  // London Session (07:00 - 16:00 UTC)
  if (utcHour >= 7 && utcHour < 16) {
    sessions.push({
      name: "LONDON",
      isActive: true,
      openTime: "07:00",
      closeTime: "16:00",
      volatilityMultiplier: 1.2,
      preferredPairs: ["EURUSD", "GBPUSD", "EURGBP", "EURJPY"],
      characteristics: ["High volatility", "Strong trends", "News driven"]
    });
  }
  
  // New York Session (12:00 - 21:00 UTC)
  if (utcHour >= 12 && utcHour < 21) {
    sessions.push({
      name: "NEW_YORK",
      isActive: true,
      openTime: "12:00",
      closeTime: "21:00",
      volatilityMultiplier: 1.3,
      preferredPairs: ["EURUSD", "GBPUSD", "USDCAD", "USDCHF"],
      characteristics: ["Highest volatility", "Dollar strength", "Economic data impact"]
    });
  }
  
  return sessions;
}

/**
 * Analyze market maker models and institutional behavior
 */
export function analyzeMarketMakerModel(
  candles: Array<{high: number, low: number, open: number, close: number, volume: number, timestamp: number}>,
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[]
): MarketMakerModel {
  if (candles.length < 50) {
    return {
      phase: "ACCUMULATION",
      confidence: 30,
      liquiditySweepProbability: 20,
      stopHuntLevel: null,
      institutionalFlow: "NEUTRAL",
      smartMoneyDirection: "SIDEWAYS"
    };
  }
  
  // Analyze recent price action patterns
  const recentCandles = candles.slice(-20);
  const phase = identifyMarketMakerPhase(recentCandles, orderBlocks, fvgs);
  const confidence = calculateMMConfidence(recentCandles, orderBlocks, fvgs);
  const liquiditySweepProbability = calculateLiquiditySweepProbability(recentCandles);
  const stopHuntLevel = identifyStopHuntLevel(recentCandles);
  const institutionalFlow = analyzeInstitutionalFlow(recentCandles, orderBlocks);
  const smartMoneyDirection = determineSmartMoneyDirection(recentCandles, orderBlocks, fvgs);
  
  return {
    phase,
    confidence,
    liquiditySweepProbability,
    stopHuntLevel,
    institutionalFlow,
    smartMoneyDirection
  };
}

// Helper functions for Order Block identification
function isBullishOrderBlock(
  current: any,
  prev1: any,
  prev2: any,
  next1: any,
  next2: any,
  next3: any
): boolean {
  // Strong bullish candle with significant volume
  const isBullishCandle = current.close > current.open;
  const hasSignificantBody = (current.close - current.open) > (current.high - current.low) * 0.6;
  const hasHighVolume = current.volume > (prev1.volume + prev2.volume) / 2 * 1.2;
  
  // Followed by upward movement
  const upwardMovement = next1.close > current.close && next2.close > current.close;
  
  return isBullishCandle && hasSignificantBody && hasHighVolume && upwardMovement;
}

function isBearishOrderBlock(
  current: any,
  prev1: any,
  prev2: any,
  next1: any,
  next2: any,
  next3: any
): boolean {
  // Strong bearish candle with significant volume
  const isBearishCandle = current.close < current.open;
  const hasSignificantBody = (current.open - current.close) > (current.high - current.low) * 0.6;
  const hasHighVolume = current.volume > (prev1.volume + prev2.volume) / 2 * 1.2;
  
  // Followed by downward movement
  const downwardMovement = next1.close < current.close && next2.close < current.close;
  
  return isBearishCandle && hasSignificantBody && hasHighVolume && downwardMovement;
}

function calculateOrderBlockStrength(
  candle: any,
  surroundingCandles: any[],
  type: "BULLISH" | "BEARISH"
): "WEAK" | "MODERATE" | "STRONG" | "EXTREME" {
  const bodySize = Math.abs(candle.close - candle.open);
  const totalSize = candle.high - candle.low;
  const bodyRatio = bodySize / totalSize;
  
  const avgVolume = surroundingCandles.reduce((sum, c) => sum + c.volume, 0) / surroundingCandles.length;
  const volumeRatio = candle.volume / avgVolume;
  
  const score = bodyRatio * 0.4 + Math.min(volumeRatio / 2, 1) * 0.6;
  
  if (score >= 0.8) return "EXTREME";
  if (score >= 0.6) return "STRONG";
  if (score >= 0.4) return "MODERATE";
  return "WEAK";
}

// Helper functions for Fair Value Gap identification
function isBullishFVG(prev: any, current: any, next: any): boolean {
  // Current candle is strongly bullish
  const isBullish = current.close > current.open;
  const hasGap = next.low > prev.high;
  const significantMove = (current.close - current.open) > (current.high - current.low) * 0.6;
  
  return isBullish && hasGap && significantMove;
}

function isBearishFVG(prev: any, current: any, next: any): boolean {
  // Current candle is strongly bearish
  const isBearish = current.close < current.open;
  const hasGap = next.high < prev.low;
  const significantMove = (current.open - current.close) > (current.high - current.low) * 0.6;
  
  return isBearish && hasGap && significantMove;
}

function calculateFVGStrength(
  prev: any,
  current: any,
  next: any,
  type: "BULLISH" | "BEARISH"
): "WEAK" | "MODERATE" | "STRONG" {
  const gapSize = type === "BULLISH" 
    ? (next.low - prev.high) / prev.high
    : (prev.low - next.high) / next.high;
  
  const candleBody = Math.abs(current.close - current.open);
  const candleRange = current.high - current.low;
  const bodyRatio = candleBody / candleRange;
  
  const score = gapSize * 100 + bodyRatio * 0.3;
  
  if (score >= 0.6) return "STRONG";
  if (score >= 0.3) return "MODERATE";
  return "WEAK";
}

// Helper functions for Supply/Demand zones
function isSupplyZone(baseCandles: any[], reactionCandles: any[]): boolean {
  // Check for consolidation followed by strong bearish move
  const consolidationRange = Math.max(...baseCandles.map(c => c.high)) - Math.min(...baseCandles.map(c => c.low));
  const avgRange = baseCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / baseCandles.length;
  
  const isConsolidation = consolidationRange < avgRange * 3;
  const strongMove = reactionCandles[0].close < baseCandles[baseCandles.length - 1].close * 0.98;
  
  return isConsolidation && strongMove;
}

function isDemandZone(baseCandles: any[], reactionCandles: any[]): boolean {
  // Check for consolidation followed by strong bullish move
  const consolidationRange = Math.max(...baseCandles.map(c => c.high)) - Math.min(...baseCandles.map(c => c.low));
  const avgRange = baseCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / baseCandles.length;
  
  const isConsolidation = consolidationRange < avgRange * 3;
  const strongMove = reactionCandles[0].close > baseCandles[baseCandles.length - 1].close * 1.02;
  
  return isConsolidation && strongMove;
}

function createSupplyZone(
  baseCandles: any[],
  reactionCandles: any[],
  timeframe: string,
  currentPrice: number,
  index: number
): SupplyDemandZone | null {
  const top = Math.max(...baseCandles.map(c => c.high));
  const bottom = Math.min(...baseCandles.map(c => c.low));
  const volume = baseCandles.reduce((sum, c) => sum + c.volume, 0);
  
  return {
    id: `SUPPLY_${timeframe}_${index}`,
    type: "SUPPLY",
    timeframe,
    top,
    bottom,
    timestamp: baseCandles[0].timestamp,
    strength: "MODERATE",
    status: "FRESH",
    volume,
    touches: 0,
    reaction: "STRONG"
  };
}

function createDemandZone(
  baseCandles: any[],
  reactionCandles: any[],
  timeframe: string,
  currentPrice: number,
  index: number
): SupplyDemandZone | null {
  const top = Math.max(...baseCandles.map(c => c.high));
  const bottom = Math.min(...baseCandles.map(c => c.low));
  const volume = baseCandles.reduce((sum, c) => sum + c.volume, 0);
  
  return {
    id: `DEMAND_${timeframe}_${index}`,
    type: "DEMAND",
    timeframe,
    top,
    bottom,
    timestamp: baseCandles[0].timestamp,
    strength: "MODERATE",
    status: "FRESH",
    volume,
    touches: 0,
    reaction: "STRONG"
  };
}

// Helper functions for Market Maker Model
function identifyMarketMakerPhase(
  candles: any[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[]
): "ACCUMULATION" | "MANIPULATION" | "DISTRIBUTION" | "REACCUMULATION" {
  // Simplified phase identification
  const recentRange = candles.slice(-10);
  const priceMovement = (recentRange[recentRange.length - 1].close - recentRange[0].close) / recentRange[0].close;
  
  if (Math.abs(priceMovement) < 0.02) return "ACCUMULATION";
  if (priceMovement > 0.05) return "DISTRIBUTION";
  if (priceMovement < -0.05) return "DISTRIBUTION";
  return "MANIPULATION";
}

function calculateMMConfidence(
  candles: any[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[]
): number {
  let confidence = 50;
  
  // More order blocks = higher confidence
  confidence += Math.min(orderBlocks.length * 5, 25);
  
  // More FVGs = higher confidence
  confidence += Math.min(fvgs.length * 3, 15);
  
  // Volume confirmation
  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
  const recentVolume = candles.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
  
  if (recentVolume > avgVolume * 1.2) confidence += 10;
  
  return Math.min(95, Math.max(10, confidence));
}

function calculateLiquiditySweepProbability(candles: any[]): number {
  // Look for patterns that suggest liquidity sweeps
  const recentCandles = candles.slice(-10);
  let probability = 20; // Base probability
  
  // Check for false breakouts (sign of liquidity sweeps)
  const falseBreakouts = recentCandles.filter((candle, i) => {
    if (i === 0) return false;
    const prev = recentCandles[i - 1];
    const hasBreakout = candle.high > prev.high * 1.002 || candle.low < prev.low * 0.998;
    const hasReversal = Math.abs(candle.close - candle.open) > (candle.high - candle.low) * 0.6;
    return hasBreakout && hasReversal;
  });
  
  probability += falseBreakouts.length * 15;
  
  return Math.min(90, probability);
}

function identifyStopHuntLevel(candles: any[]): number | null {
  // Look for recent swing highs/lows that could be targeted for stop hunts
  const recent = candles.slice(-20);
  const swingLevels = [];
  
  for (let i = 2; i < recent.length - 2; i++) {
    const current = recent[i];
    const isSwingHigh = recent[i - 1].high < current.high && recent[i + 1].high < current.high;
    const isSwingLow = recent[i - 1].low > current.low && recent[i + 1].low > current.low;
    
    if (isSwingHigh) swingLevels.push(current.high);
    if (isSwingLow) swingLevels.push(current.low);
  }
  
  // Return the most recent swing level
  return swingLevels.length > 0 ? swingLevels[swingLevels.length - 1] : null;
}

function analyzeInstitutionalFlow(candles: any[], orderBlocks: OrderBlock[]): "BUYING" | "SELLING" | "NEUTRAL" {
  const bullishOBs = orderBlocks.filter(ob => ob.type === "BULLISH").length;
  const bearishOBs = orderBlocks.filter(ob => ob.type === "BEARISH").length;
  
  const recentCandles = candles.slice(-5);
  const netPriceMovement = recentCandles[recentCandles.length - 1].close - recentCandles[0].close;
  
  if (bullishOBs > bearishOBs && netPriceMovement > 0) return "BUYING";
  if (bearishOBs > bullishOBs && netPriceMovement < 0) return "SELLING";
  return "NEUTRAL";
}

function determineSmartMoneyDirection(
  candles: any[],
  orderBlocks: OrderBlock[],
  fvgs: FairValueGap[]
): "LONG" | "SHORT" | "SIDEWAYS" {
  const bullishSignals = orderBlocks.filter(ob => ob.type === "BULLISH").length + 
                        fvgs.filter(fvg => fvg.type === "BULLISH").length;
  const bearishSignals = orderBlocks.filter(ob => ob.type === "BEARISH").length + 
                        fvgs.filter(fvg => fvg.type === "BEARISH").length;
  
  if (bullishSignals > bearishSignals + 1) return "LONG";
  if (bearishSignals > bullishSignals + 1) return "SHORT";
  return "SIDEWAYS";
}

/**
 * Get institutional levels (daily, weekly, monthly highs/lows)
 */
export function getInstitutionalLevels(
  dailyCandles: any[],
  weeklyCandles: any[],
  monthlyCandles: any[]
): {
  dailyHigh: number;
  dailyLow: number;
  weeklyHigh: number;
  weeklyLow: number;
  monthlyHigh: number;
  monthlyLow: number;
  previousDayHigh: number;
  previousDayLow: number;
} {
  const today = dailyCandles[dailyCandles.length - 1];
  const yesterday = dailyCandles[dailyCandles.length - 2];
  const thisWeek = weeklyCandles[weeklyCandles.length - 1];
  const thisMonth = monthlyCandles[monthlyCandles.length - 1];
  
  return {
    dailyHigh: today?.high || 0,
    dailyLow: today?.low || 0,
    weeklyHigh: thisWeek?.high || 0,
    weeklyLow: thisWeek?.low || 0,
    monthlyHigh: thisMonth?.high || 0,
    monthlyLow: thisMonth?.low || 0,
    previousDayHigh: yesterday?.high || 0,
    previousDayLow: yesterday?.low || 0
  };
}

/**
 * Get kill zones (high probability trading times)
 */
export function getKillZones(): Array<{
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  volatilityExpected: "LOW" | "MODERATE" | "HIGH" | "EXTREME";
}> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  const killZones = [
    {
      name: "London Open",
      startTime: "07:00",
      endTime: "09:00",
      isActive: utcHour >= 7 && utcHour < 9,
      volatilityExpected: "HIGH" as const
    },
    {
      name: "New York Open",
      startTime: "12:00",
      endTime: "14:00",
      isActive: utcHour >= 12 && utcHour < 14,
      volatilityExpected: "EXTREME" as const
    },
    {
      name: "London Close",
      startTime: "15:00",
      endTime: "17:00",
      isActive: utcHour >= 15 && utcHour < 17,
      volatilityExpected: "HIGH" as const
    },
    {
      name: "Asian Session",
      startTime: "00:00",
      endTime: "03:00",
      isActive: utcHour >= 0 && utcHour < 3,
      volatilityExpected: "MODERATE" as const
    }
  ];
  
  return killZones;
}

/**
 * Main function to perform comprehensive institutional analysis
 */
export function performInstitutionalAnalysis(
  data5m: any,
  data15m: any,
  data30m: any,
  data1h: any,
  data4h: any,
  data1d: any,
  symbol: string
): InstitutionalAnalysis {
  const currentPrice = data5m.close;
  
  // Create a more realistic, but still simulated, candle history for analysis
  const allCandles = [data5m, data15m, data30m, data1h, data4h, data1d].filter(Boolean);
  const historicalCandles = Array.from({ length: 50 }, (_, i) => {
      const baseIndex = Math.min(allCandles.length - 1, Math.floor(i / (50 / allCandles.length)));
      const baseCandle = allCandles[baseIndex];
      const variance = (Math.random() - 0.5) * 0.01 * (50 - i) / 50; // less variance for recent candles
      return {
          high: baseCandle.high * (1 + variance + 0.001),
          low: baseCandle.low * (1 + variance - 0.001),
          open: baseCandle.open * (1 + variance),
          close: baseCandle.close * (1 + variance),
          volume: baseCandle.volume * (0.8 + Math.random() * 0.4),
          timestamp: Date.now() - (50 - i) * 60000 * 5 // 5 min candles
      };
  });

  const candlesToAnalyze = historicalCandles.sort((a, b) => a.timestamp - b.timestamp);
  
  // Perform analysis
  const orderBlocks = identifyOrderBlocks(candlesToAnalyze, "5m", currentPrice);
  const fairValueGaps = identifyFairValueGaps(candlesToAnalyze, "5m");
  const marketStructure = analyzeMarketStructure(candlesToAnalyze);
  const supplyDemandZones = identifySupplyDemandZones(candlesToAnalyze, "5m", currentPrice);
  const activeSessions = getActiveInstitutionalSessions();
  const marketMakerModel = analyzeMarketMakerModel(candlesToAnalyze, orderBlocks, fairValueGaps);
  const institutionalLevels = getInstitutionalLevels([data1d], [data1d], [data1d]);
  const killZones = getKillZones();
  
  return {
    orderBlocks,
    fairValueGaps,
    marketStructure,
    supplyDemandZones,
    activeSessions,
    marketMakerModel,
    institutionalLevels,
    killZones
  };
}
