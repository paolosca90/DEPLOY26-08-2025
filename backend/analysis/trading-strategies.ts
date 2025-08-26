export enum TradingStrategy {
  SCALPING = "SCALPING",
  INTRADAY = "INTRADAY"
}

export interface StrategyConfig {
  name: string;
  description: string;
  timeframes: string[];
  riskRewardRatio: number;
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  maxHoldingTime: number; // in hours
  minConfidence: number;
  maxLotSize: number;
  volatilityThreshold: number;
  trendStrengthRequired: number;
  marketConditions: string[];
}

export const TRADING_STRATEGIES: Record<TradingStrategy, StrategyConfig> = {
  [TradingStrategy.SCALPING]: {
    name: "Scalping",
    description: "Trade veloci che catturano piccoli movimenti di prezzo (1-15 minuti)",
    timeframes: ["1m", "5m"],
    riskRewardRatio: 1.5,
    stopLossMultiplier: 0.8,
    takeProfitMultiplier: 1.2,
    maxHoldingTime: 0.25,
    minConfidence: 90,
    maxLotSize: 0.5,
    volatilityThreshold: 0.002,
    trendStrengthRequired: 0.7,
    marketConditions: ["HIGH_VOLUME", "TRENDING", "LOW_SPREAD"]
  },
  
  [TradingStrategy.INTRADAY]: {
    name: "Intraday",
    description: "Day trading ottimizzato per chiusura entro la sessione di New York (1-6 ore)",
    timeframes: ["5m", "15m", "30m"],
    riskRewardRatio: 2.0,
    stopLossMultiplier: 1.0,
    takeProfitMultiplier: 2.0,
    maxHoldingTime: 6, // Ridotto da 8 a 6 ore per garantire chiusura entro NY
    minConfidence: 80,
    maxLotSize: 1.0,
    volatilityThreshold: 0.005,
    trendStrengthRequired: 0.5,
    marketConditions: ["NORMAL_VOLUME", "TRENDING", "BREAKOUT"]
  }
};

export interface StrategyPriceTargets {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
}

export function calculateStrategyTargets(
  strategy: TradingStrategy,
  currentPrice: number,
  atr: number,
  direction: "LONG" | "SHORT",
  symbol: string,
  spread: number
): StrategyPriceTargets {
  const config = TRADING_STRATEGIES[strategy];
  const symbolCharacteristics = getSymbolCharacteristics(symbol);
  
  const adjustedATR = atr * symbolCharacteristics.volatilityMultiplier;
  
  // Ensure stop loss is at least 3x the spread to avoid premature stops
  const stopLossDistance = Math.max(
    adjustedATR * config.stopLossMultiplier,
    spread * 3
  );
  const takeProfitDistance = stopLossDistance * config.riskRewardRatio;
  
  let stopLoss: number;
  let takeProfit: number;
  
  if (direction === "LONG") {
    stopLoss = currentPrice - stopLossDistance;
    takeProfit = currentPrice + takeProfitDistance;
  } else {
    stopLoss = currentPrice + stopLossDistance;
    takeProfit = currentPrice - takeProfitDistance;
  }
  
  const minMovement = symbolCharacteristics.minMovement;
  
  if (direction === "LONG") {
    stopLoss = Math.min(stopLoss, currentPrice - minMovement);
    takeProfit = Math.max(takeProfit, currentPrice + minMovement * config.riskRewardRatio);
  } else {
    stopLoss = Math.max(stopLoss, currentPrice + minMovement);
    takeProfit = Math.min(takeProfit, currentPrice - minMovement * config.riskRewardRatio);
  }
  
  const riskAmount = Math.abs(currentPrice - stopLoss);
  const rewardAmount = Math.abs(takeProfit - currentPrice);
  const actualRiskReward = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  
  return {
    entryPrice: currentPrice,
    stopLoss: Math.round(stopLoss * 100000) / 100000,
    takeProfit: Math.round(takeProfit * 100000) / 100000,
    riskAmount: Math.round(riskAmount * 100000) / 100000,
    rewardAmount: Math.round(rewardAmount * 100000) / 100000,
    riskRewardRatio: Math.round(actualRiskReward * 100) / 100
  };
}

export function getOptimalStrategy(
  marketData: any,
  symbol: string,
  userPreference?: TradingStrategy
): TradingStrategy {
  if (userPreference && isStrategyValid(userPreference, marketData, symbol)) {
    return userPreference;
  }
  
  const volatility = calculateMarketVolatility(marketData);
  const trendStrength = calculateTrendStrength(marketData);
  
  // Calcola il tempo rimanente fino alla chiusura di NY (22:00 CET)
  const now = new Date();
  const nyCloseHour = 22; // 22:00 CET
  const currentHour = now.getHours();
  const hoursUntilNYClose = currentHour < nyCloseHour ? nyCloseHour - currentHour : 24 - currentHour + nyCloseHour;
  
  // Se mancano meno di 2 ore alla chiusura NY, forza scalping
  if (hoursUntilNYClose < 2) {
    return TradingStrategy.SCALPING;
  }
  
  const scores = {
    [TradingStrategy.SCALPING]: calculateStrategyScore(TradingStrategy.SCALPING, volatility, trendStrength),
    [TradingStrategy.INTRADAY]: calculateStrategyScore(TradingStrategy.INTRADAY, volatility, trendStrength)
  };
  
  // Find the strategy with the highest score
  let bestStrategy = TradingStrategy.INTRADAY;
  let bestScore = scores[TradingStrategy.INTRADAY];
  
  for (const [strategy, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestStrategy = strategy as TradingStrategy;
      bestScore = score;
    }
  }
  
  return bestStrategy;
}

function isStrategyValid(
  strategy: TradingStrategy,
  marketData: any,
  symbol: string
): boolean {
  const config = TRADING_STRATEGIES[strategy];
  const volatility = calculateMarketVolatility(marketData);
  const trendStrength = calculateTrendStrength(marketData);
  
  return (
    volatility <= config.volatilityThreshold * 2 &&
    trendStrength >= config.trendStrengthRequired * 0.8
  );
}

function calculateStrategyScore(
  strategy: TradingStrategy,
  volatility: number,
  trendStrength: number
): number {
  const config = TRADING_STRATEGIES[strategy];
  let score = 50;
  
  const volatilityFit = 1 - Math.abs(volatility - config.volatilityThreshold) / config.volatilityThreshold;
  score += Math.max(0, volatilityFit * 30);
  
  if (trendStrength >= config.trendStrengthRequired) {
    score += Math.min(30, (trendStrength - config.trendStrengthRequired) / (1 - config.trendStrengthRequired) * 30);
  }
  
  return score;
}

function calculateMarketVolatility(marketData: any): number {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];
  
  const volatilities = [
    data5m.indicators.atr / data5m.close,
    data15m.indicators.atr / data15m.close,
    data30m.indicators.atr / data30m.close
  ];
  
  return volatilities.reduce((sum, vol) => sum + vol, 0) / volatilities.length;
}

function calculateTrendStrength(marketData: any): number {
  const data5m = marketData["5m"];
  const data15m = marketData["15m"];
  const data30m = marketData["30m"];
  
  const prices = [data5m.close, data15m.close, data30m.close];
  const isUptrend = prices.every((price, i) => i === 0 || price >= prices[i - 1]);
  const isDowntrend = prices.every((price, i) => i === 0 || price <= prices[i - 1]);
  
  if (isUptrend || isDowntrend) {
    const totalMove = Math.abs(prices[0] - prices[prices.length - 1]);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return Math.min(1, totalMove / avgPrice * 100);
  }
  
  return 0;
}

function getSymbolCharacteristics(symbol: string) {
  const characteristics: Record<string, any> = {
    "BTCUSD": {
      volatilityMultiplier: 1.0,
      minMovement: 100,
      tickSize: 0.01
    },
    "ETHUSD": {
      volatilityMultiplier: 1.0,
      minMovement: 5,
      tickSize: 0.01
    },
    "EURUSD": {
      volatilityMultiplier: 1.0,
      minMovement: 0.0010,
      tickSize: 0.00001
    },
    "GBPUSD": {
      volatilityMultiplier: 1.2,
      minMovement: 0.0015,
      tickSize: 0.00001
    },
    "USDJPY": {
      volatilityMultiplier: 1.0,
      minMovement: 0.10,
      tickSize: 0.001
    },
    "XAUUSD": {
      volatilityMultiplier: 1.0,
      minMovement: 2.0,
      tickSize: 0.01
    },
    "CRUDE": {
      volatilityMultiplier: 1.5,
      minMovement: 0.50,
      tickSize: 0.01
    }
  };
  
  return characteristics[symbol] || {
    volatilityMultiplier: 1.0,
    minMovement: 0.001,
    tickSize: 0.00001
  };
}

export function getStrategyRecommendation(
  strategy: TradingStrategy,
  marketData: any,
  aiAnalysis: any
): string {
  const config = TRADING_STRATEGIES[strategy];
  const volatility = calculateMarketVolatility(marketData);
  const trendStrength = calculateTrendStrength(marketData);
  
  let recommendation = `${config.name} Strategy Selected:\n\n`;
  
  switch (strategy) {
    case TradingStrategy.SCALPING:
      recommendation += "🔥 SETUP SCALPING:\n";
      recommendation += "• Entrata/uscita rapida (1-15 minuti)\n";
      recommendation += "• Stop loss stretto per protezione capitale\n";
      recommendation += "• Solo segnali ad alta confidenza\n";
      recommendation += "• Monitora spread e slippage\n";
      recommendation += "• Migliore durante sessioni ad alto volume\n";
      break;
      
    case TradingStrategy.INTRADAY:
      recommendation += "⚡ SETUP INTRADAY:\n";
      recommendation += "• Mantieni per 1-6 ore massimo\n";
      recommendation += "• Rapporto rischio/rendimento bilanciato\n";
      recommendation += "• Segui la direzione del trend\n";
      recommendation += "• Chiusura automatica prima della fine sessione NY\n";
      recommendation += "• Monitora notizie ed eventi\n";
      break;
  }
  
  recommendation += `\n📊 CONDIZIONI DI MERCATO:\n`;
  recommendation += `• Volatilità: ${(volatility * 100).toFixed(2)}%\n`;
  recommendation += `• Forza Trend: ${(trendStrength * 100).toFixed(0)}%\n`;
  recommendation += `• Confidenza: ${aiAnalysis.confidence}%\n`;
  
  // NEW: Institutional Analysis Section
  if (aiAnalysis.institutionalAnalysis) {
    const institutional = aiAnalysis.institutionalAnalysis;
    recommendation += `\n🏛️ ANALISI ISTITUZIONALE:\n`;
    
    // Market Maker Model
    recommendation += `• Fase Market Maker: ${institutional.marketMakerModel.phase}\n`;
    recommendation += `• Smart Money: ${institutional.marketMakerModel.smartMoneyDirection}\n`;
    recommendation += `• Flusso Istituzionale: ${institutional.marketMakerModel.institutionalFlow}\n`;
    
    // Order Blocks
    if (institutional.orderBlocks.length > 0) {
      const bullishOBs = institutional.orderBlocks.filter((ob: any) => ob.type === "BULLISH").length;
      const bearishOBs = institutional.orderBlocks.filter((ob: any) => ob.type === "BEARISH").length;
      recommendation += `• Order Blocks: ${bullishOBs} Bullish, ${bearishOBs} Bearish\n`;
    }
    
    // Fair Value Gaps
    if (institutional.fairValueGaps.length > 0) {
      const openFVGs = institutional.fairValueGaps.filter((fvg: any) => fvg.status === "OPEN").length;
      recommendation += `• Fair Value Gaps Aperti: ${openFVGs}\n`;
    }
    
    // Supply/Demand Zones
    if (institutional.supplyDemandZones.length > 0) {
      const freshZones = institutional.supplyDemandZones.filter((zone: any) => zone.status === "FRESH").length;
      recommendation += `• Zone S/D Fresche: ${freshZones}\n`;
    }
    
    // Active Sessions
    if (institutional.activeSessions.length > 0) {
      const sessionNames = institutional.activeSessions.map((s: any) => s.name).join(", ");
      recommendation += `• Sessioni Attive: ${sessionNames}\n`;
    }
    
    // Kill Zones
    const activeKillZone = institutional.killZones.find((kz: any) => kz.isActive);
    if (activeKillZone) {
      recommendation += `• Kill Zone Attiva: ${activeKillZone.name} (${activeKillZone.volatilityExpected})\n`;
    }
    
    // Enhanced Confidence
    if (aiAnalysis.enhancedConfidence && aiAnalysis.enhancedConfidence.institutionalScore) {
      recommendation += `• Score Istituzionale: ${aiAnalysis.enhancedConfidence.institutionalScore.toFixed(1)}%\n`;
      recommendation += `• Bias Istituzionale: ${aiAnalysis.enhancedConfidence.recommendations.institutionalBias}\n`;
    }
  }
  
  if (aiAnalysis.confidence < config.minConfidence) {
    recommendation += `\n⚠️ ATTENZIONE: Confidenza sotto l'ottimale (${config.minConfidence}%)\n`;
  }
  
  if (volatility > config.volatilityThreshold * 1.5) {
    recommendation += `\n⚠️ ATTENZIONE: Alta volatilità rilevata\n`;
  }
  
  if (trendStrength < config.trendStrengthRequired) {
    recommendation += `\n⚠️ ATTENZIONE: Forza del trend debole\n`;
  }
  
  // NEW: Institutional Warnings
  if (aiAnalysis.enhancedConfidence && aiAnalysis.enhancedConfidence.factors) {
    const factors = aiAnalysis.enhancedConfidence.factors;
    
    if (factors.institutionalAlignment < 40) {
      recommendation += `\n🚨 ATTENZIONE: Flusso istituzionale in conflitto\n`;
    }
    
    if (factors.orderBlockConfirmation < 30) {
      recommendation += `\n⚠️ ATTENZIONE: Nessun Order Block di supporto\n`;
    }
    
    if (factors.liquidityZoneConfirmation < 30) {
      recommendation += `\n⚠️ ATTENZIONE: Lontano da zone di liquidità significative\n`;
    }
  }
  
  return recommendation;
}

export function calculatePositionSize(
  strategy: TradingStrategy,
  accountBalance: number,
  riskPercentage: number,
  riskAmount: number
): number {
  const config = TRADING_STRATEGIES[strategy];
  
  const maxRiskAmount = accountBalance * (riskPercentage / 100);
  const positionSize = riskAmount > 0 ? Math.min(maxRiskAmount / riskAmount, config.maxLotSize) : config.maxLotSize;
  
  return Math.round(positionSize * 100) / 100;
}
