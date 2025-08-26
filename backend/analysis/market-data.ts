import { secret } from "encore.dev/config";
import type { Mt5Config } from "~backend/user/api";

export interface MarketDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread: number;
  indicators: {
    rsi: number;
    macd: number;
    atr: number;
  };
  source: 'MT5' | 'FALLBACK';
}

export interface TimeframeData {
  [timeframe: string]: MarketDataPoint;
}

interface SymbolInfo {
  name: string;
  spread: number;
  point: number;
  tradable: boolean;
  // other fields can be added if needed
}

export async function fetchMarketData(
  symbol: string, 
  timeframes: string[], 
  mt5Config: Mt5Config, 
  requireRealData: boolean = false
): Promise<TimeframeData> {
  const data: TimeframeData = {};
  let mt5Available = false;

  // First, check if MT5 is available
  try {
    const { host, port } = mt5Config;
    
    if (host && port && host !== "localhost" && host !== "your_vps_ip") {
      const baseUrl = `http://${host}:${port}`;
      
      console.log(`🔗 Testing MT5 connection to: ${baseUrl}`);
      
      const statusResponse = await fetchWithTimeout(`${baseUrl}/status`, {
        method: "GET",
      }, 5000);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json() as any;
        mt5Available = statusData.connected;
        console.log(`📊 MT5 connection status: ${mt5Available ? 'Connected' : 'Disconnected'}`);
        
        if (mt5Available) {
          console.log(`💰 MT5 Account - Login: ${statusData.login}, Balance: ${statusData.balance}, Server: ${statusData.server}`);
        }
      } else {
        console.log(`⚠️ MT5 status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
      }
    } else {
      console.log(`⚠️ MT5 server configuration incomplete. Host: ${host}, Port: ${port}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`⚠️ MT5 connection check failed: ${errorMessage}`);
  }

  // Try to fetch data for each timeframe
  for (const timeframe of timeframes) {
    let dataPoint: MarketDataPoint | null = null;

    // Try MT5 first if available
    if (mt5Available) {
      dataPoint = await fetchMT5Data(symbol, timeframe, mt5Config);
      if (dataPoint) {
        console.log(`✅ Successfully fetched MT5 data for ${symbol} ${timeframe} - Close: ${dataPoint.close}`);
      }
    }

    // If MT5 failed or unavailable, create fallback data
    if (!dataPoint) {
      if (requireRealData) {
        throw new Error(`Real MT5 data required for ${symbol} ${timeframe}, but MT5 is unavailable or returned no data.`);
      }
      console.log(`⚠️ MT5 data unavailable for ${symbol} ${timeframe}, using enhanced fallback data`);
      dataPoint = createEnhancedFallbackData(symbol, timeframe);
    }

    data[timeframe] = dataPoint;
  }

  return data;
}

async function fetchMT5Data(symbol: string, timeframe: string, mt5Config: Mt5Config): Promise<MarketDataPoint | null> {
  try {
    const { host, port } = mt5Config;

    if (!host || !port) {
      console.log("MT5 server not configured.");
      return null;
    }

    const baseUrl = `http://${host}:${port}`;

    // Try to find the correct symbol format for this broker
    const symbolInfoResult = await findCorrectSymbolFormat(baseUrl, symbol);
    if (!symbolInfoResult) {
      console.log(`❌ Symbol ${symbol} not found in any format on this broker`);
      return null;
    }
    const { name: correctSymbol, info: symbolInfo } = symbolInfoResult;
    const spreadInPrice = symbolInfo.spread * symbolInfo.point;

    // Fetch rates data with the correct symbol and longer timeout
    const response = await fetchWithTimeout(`${baseUrl}/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: correctSymbol,
        timeframe: timeframe,
        count: 50 // Fetch last 50 bars for indicator calculation
      }),
    }, 15000); // 15 second timeout for data fetch

    if (!response.ok) {
      console.error(`❌ MT5 rates endpoint error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json() as any;
    if (result.error || !result.rates || result.rates.length === 0) {
      console.error("❌ Failed to get rates from MT5:", result.error || "No rates returned");
      return null;
    }

    // Use the most recent bar (last in the list)
    const latestBar = result.rates[result.rates.length - 1];
    
    const { open, high, low, close, tick_volume, time } = latestBar;

    // Calculate indicators based on the fetched rates
    const indicators = calculateIndicatorsFromRates(result.rates);

    console.log(`📊 Successfully fetched MT5 data for ${symbol} (${correctSymbol}) ${timeframe} - Close: ${close}, Volume: ${tick_volume}, Spread: ${spreadInPrice}`);

    return {
      timestamp: time * 1000,
      open,
      high,
      low,
      close,
      volume: tick_volume,
      spread: spreadInPrice,
      indicators,
      source: 'MT5',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error fetching MT5 data for ${symbol}: ${errorMessage}`);
    return null;
  }
}

// Custom fetch with timeout function
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`The operation was aborted due to timeout (${timeoutMs}ms)`);
    }
    throw error;
  }
}

async function findCorrectSymbolFormat(baseUrl: string, symbol: string): Promise<{ name: string; info: SymbolInfo } | null> {
  const symbolVariations = getSymbolVariations(symbol);
  
  console.log(`🔍 Trying to find correct symbol format for ${symbol}. Testing variations: ${symbolVariations.slice(0, 8).join(', ')}...`);
  
  for (const variation of symbolVariations) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/symbol_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: variation }),
      }, 3000);

      if (response.ok) {
        const result = await response.json() as any;
        if (result.symbol_info && !result.error && result.symbol_info.tradable) {
          console.log(`✅ Found correct symbol format: ${symbol} → ${variation}`);
          return { name: variation, info: result.symbol_info };
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log(`❌ No valid symbol format found for ${symbol} on this broker`);
  return null;
}

function getSymbolVariations(symbol: string): string[] {
  const variations = [symbol];
  
  // Enhanced symbol mapping for US indices
  const specificMappings = getSpecificSymbolMappings(symbol);
  variations.push(...specificMappings);
  
  // Common suffixes
  const suffixes = ['m', 'pm', 'pro', 'ecn', 'raw', 'c', 'i', '.', '_m', '_pro', '_ecn', '.m', '.pm', '.pro'];
  suffixes.forEach(suffix => {
    variations.push(symbol + suffix);
  });
  
  // Common prefixes
  const prefixes = ['m', 'pro', 'ecn'];
  prefixes.forEach(prefix => {
    variations.push(prefix + symbol);
  });
  
  // Additional broker-specific mappings
  const brokerSpecificMappings = getBrokerSpecificMappings(symbol);
  variations.push(...brokerSpecificMappings);
  
  return [...new Set(variations)];
}

function getSpecificSymbolMappings(symbol: string): string[] {
  const mappings: { [key: string]: string[] } = {
    // US Indices - comprehensive mapping
    "US30": [
      "US30pm", "US30.pm", "US30_pm", "US30pro", "US30.pro", "US30_pro",
      "DJ30", "DJ30pm", "DJ30.pm", "DJI30", "DJI30pm", "DJIA", "DJIApm",
      "DOW", "DOWpm", "DOW30", "DOW30pm", "YM", "YMpm", "DOWJONES", "DOWJONESpm",
      "US30c", "US30i", "US30ecn", "US30.ecn", "US30_ecn", "US30raw", "US30.raw"
    ],
    "US500": [
      "US500pm", "US500.pm", "US500_pm", "US500pro", "US500.pro", "US500_pro",
      "SPX500", "SPX500pm", "SPX500.pm", "SP500", "SP500pm", "SPY", "SPYpm",
      "ES", "ESpm", "SPXUSD", "SPXUSDpm", "S&P500", "S&P500pm",
      "US500c", "US500i", "US500ecn", "US500.ecn", "US500_ecn", "US500raw", "US500.raw"
    ],
    "SPX500": [
      "SPX500pm", "SPX500.pm", "SPX500_pm", "SPX500pro", "SPX500.pro", "SPX500_pro",
      "US500", "US500pm", "US500.pm", "SP500", "SP500pm", "SPY", "SPYpm",
      "ES", "ESpm", "SPXUSD", "SPXUSDpm", "S&P500", "S&P500pm",
      "SPX500c", "SPX500i", "SPX500ecn", "SPX500.ecn", "SPX500_ecn", "SPX500raw", "SPX500.raw"
    ],
    "NAS100": [
      "NAS100pm", "NAS100.pm", "NAS100_pm", "NAS100pro", "NAS100.pro", "NAS100_pro",
      "NASDAQ", "NASDAQpm", "NASDAQ.pm", "NDX", "NDXpm", "QQQ", "QQQpm",
      "NQ", "NQpm", "NASUSD", "NASUSDpm", "TECH100", "TECH100pm",
      "NAS100c", "NAS100i", "NAS100ecn", "NAS100.ecn", "NAS100_ecn", "NAS100raw", "NAS100.raw"
    ],
    // Forex pairs
    "EURUSD": [
      "EURUSDpm", "EURUSD.pm", "EURUSD_pm", "EURUSDpro", "EURUSDc", "EURUSDi", 
      "EURUSD.pro", "EURUSD.ecn", "EURUSD_pro", "EURUSD_ecn", "EURUSDraw", "EURUSD.raw"
    ],
    "GBPUSD": [
      "GBPUSDpm", "GBPUSD.pm", "GBPUSD_pm", "GBPUSDpro", "GBPUSDc", "GBPUSDi", 
      "GBPUSD.pro", "GBPUSD.ecn", "GBPUSD_pro", "GBPUSD_ecn", "GBPUSDraw", "GBPUSD.raw"
    ],
    "USDJPY": [
      "USDJPYpm", "USDJPY.pm", "USDJPY_pm", "USDJPYpro", "USDJPYc", "USDJPYi", 
      "USDJPY.pro", "USDJPY.ecn", "USDJPY_pro", "USDJPY_ecn", "USDJPYraw", "USDJPY.raw"
    ],
    // Gold
    "XAUUSD": [
      "XAUUSDpm", "XAUUSD.pm", "XAUUSD_pm", "XAUUSDpro", "XAUUSDc", "XAUUSDi", 
      "GOLD", "GOLDpm", "GOLD.pm", "GOLD_pm", "GOLDpro", "GOLDc", "GOLDi",
      "XAUUSD.pro", "XAUUSD.ecn", "XAUUSD_pro", "XAUUSD_ecn", "XAUUSDraw", "XAUUSD.raw"
    ],
    // Crypto
    "BTCUSD": [
      "BTCUSDpm", "BTCUSD.pm", "BTCUSD_pm", "BTCUSDpro", "BTCUSDc", "BTCUSDi", 
      "BITCOIN", "BTC", "BTCUSD.pro", "BTCUSD.ecn", "BTCUSD_pro", "BTCUSD_ecn"
    ],
    "ETHUSD": [
      "ETHUSDpm", "ETHUSD.pm", "ETHUSD_pm", "ETHUSDpro", "ETHUSDc", "ETHUSDi", 
      "ETHEREUM", "ETH", "ETHUSD.pro", "ETHUSD.ecn", "ETHUSD_pro", "ETHUSD_ecn"
    ],
    // Oil
    "CRUDE": [
      "CRUDEpm", "CRUDE.pm", "CRUDE_pm", "CRUDEpro", "CRUDEc", "CRUDEi", 
      "WTI", "WTIpm", "WTI.pm", "USOIL", "USOILpm", "USOIL.pm", "CL", "CLpm",
      "CRUDE.pro", "CRUDE.ecn", "CRUDE_pro", "CRUDE_ecn", "CRUDEraw", "CRUDE.raw"
    ]
  };
  
  return mappings[symbol] || [];
}

function getBrokerSpecificMappings(symbol: string): string[] {
  const mappings: { [key: string]: string[] } = {
    "EURUSD": ["EURUSDpm", "EURUSD.m", "EURUSD_m", "EURUSDpro", "EURUSDc", "EURUSDi", "EURUSD.pro", "EURUSD.ecn"],
    "GBPUSD": ["GBPUSDpm", "GBPUSD.m", "GBPUSD_m", "GBPUSDpro", "GBPUSDc", "GBPUSDi", "GBPUSD.pro", "GBPUSD.ecn"],
    "XAUUSD": ["XAUUSDpm", "XAUUSD.m", "XAUUSD_m", "XAUUSDpro", "XAUUSDc", "XAUUSDi", "GOLD", "GOLDpm", "GOLD.m", "XAUUSD.pro", "XAUUSD.ecn"],
    "BTCUSD": ["BTCUSDpm", "BTCUSD.m", "BTCUSD_m", "BTCUSDpro", "BTCUSDc", "BTCUSDi", "BITCOIN", "BTC", "BTCUSD.pro", "BTCUSD.ecn"],
    "ETHUSD": ["ETHUSDpm", "ETHUSD.m", "ETHUSD_m", "ETHUSDpro", "ETHUSDc", "ETHUSDi", "ETHEREUM", "ETH", "ETHUSD.pro", "ETHUSD.ecn"],
    "CRUDE": ["CRUDEpm", "CRUDE.m", "CRUDE_m", "CRUDEpro", "CRUDEc", "CRUDEi", "WTI", "WTIpm", "WTI.m", "USOIL", "USOILpm", "CRUDE.pro", "CRUDE.ecn"],
    "US30": ["US30pm", "US30.m", "US30_m", "US30pro", "US30c", "US30i", "DJ30", "DJI30", "DJIA", "US30.pro", "US30.ecn"],
    "SPX500": ["SPX500pm", "SPX500.m", "SPX500_m", "SPX500pro", "SPX500c", "SPX500i", "SP500", "SPY", "US500", "US500pm", "US500.m", "SPX500.pro", "SPX500.ecn"],
    "US500": ["US500pm", "US500.m", "US500_m", "US500pro", "US500c", "US500i", "SP500", "SPY", "SPX500", "SPX500pm", "SPX500.m", "US500.pro", "US500.ecn"],
    "NAS100": ["NAS100pm", "NAS100.m", "NAS100_m", "NAS100pro", "NAS100c", "NAS100i", "NASDAQ", "NDX", "QQQ", "NAS100.pro", "NAS100.ecn"],
  };
  
  return mappings[symbol] || [];
}

function calculateIndicatorsFromRates(rates: any[]): { rsi: number; macd: number; atr: number } {
  if (rates.length < 26) {
    const lastBar = rates[rates.length - 1];
    return calculateIndicators(lastBar.open, lastBar.high, lastBar.low, lastBar.close);
  }

  const trs = rates.map((rate, i) => {
    const prevClose = i > 0 ? rates[i-1].close : rate.open;
    const tr1 = rate.high - rate.low;
    const tr2 = Math.abs(rate.high - prevClose);
    const tr3 = Math.abs(rate.low - prevClose);
    return Math.max(tr1, tr2, tr3);
  });
  const atr = trs.slice(-14).reduce((sum, tr) => sum + tr, 0) / 14;

  const changes = rates.map((rate, i) => i > 0 ? rate.close - rates[i-1].close : 0).slice(-14);
  const gains = changes.filter(c => c > 0).reduce((sum, c) => sum + c, 0);
  const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, c) => sum + c, 0));
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  const closes = rates.map(r => r.close);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];

  return {
    rsi: Math.round(rsi * 10) / 10,
    macd: Math.round(macd * 100000) / 100000,
    atr: Math.round(atr * 100000) / 100000,
  };
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  if (data.length > 0) {
    emaArray.push(data[0]);
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
  }
  return emaArray;
}

function calculateIndicators(open: number, high: number, low: number, close: number) {
  const priceChange = (close - open) / open;
  let rsi = 50;
  
  if (priceChange > 0.005) rsi = 60 + Math.random() * 15;
  else if (priceChange > 0.001) rsi = 52 + Math.random() * 8;
  else if (priceChange < -0.005) rsi = 25 + Math.random() * 15;
  else if (priceChange < -0.001) rsi = 40 + Math.random() * 8;
  else rsi = 45 + Math.random() * 10;
  
  const range = (high - low) / close;
  const macd = priceChange * 1000 + (Math.random() - 0.5) * range * 100;
  const atr = range * (0.8 + Math.random() * 0.4);
  
  return {
    rsi: Math.round(Math.max(10, Math.min(90, rsi)) * 10) / 10,
    macd: Math.round(macd * 100000) / 100000,
    atr: Math.round(atr * 100000) / 100000,
  };
}

function createEnhancedFallbackData(symbol: string, timeframe: string): MarketDataPoint {
  const basePrice = getSymbolBasePrice(symbol);
  const volatility = getSymbolVolatility(symbol);
  
  const timeVariation = Math.sin(Date.now() / 1000000) * 0.1;
  const trendBias = getTrendBias(symbol);
  
  const open = basePrice * (1 + (Math.random() - 0.5) * volatility + timeVariation);
  const trendAdjustment = trendBias * volatility * 0.5;
  const close = open * (1 + (Math.random() - 0.5) * volatility + trendAdjustment);
  const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
  const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
  
  const baseVolume = getBaseVolume(symbol, timeframe);
  const volume = Math.floor(baseVolume * (0.5 + Math.random()));
  
  const indicators = calculateRealisticIndicators(open, high, low, close, symbol);
  const spread = basePrice * volatility * 0.05; // Simulate a spread
  
  return {
    timestamp: Date.now(),
    open: Math.round(open * 100000) / 100000,
    high: Math.round(high * 100000) / 100000,
    low: Math.round(low * 100000) / 100000,
    close: Math.round(close * 100000) / 100000,
    volume,
    spread,
    indicators,
    source: 'FALLBACK',
  };
}

function getSymbolBasePrice(symbol: string): number {
  const basePrices: Record<string, number> = {
    "BTCUSD": 95000, "ETHUSD": 3500, "EURUSD": 1.085, "GBPUSD": 1.275,
    "USDJPY": 150.5, "AUDUSD": 0.665, "USDCAD": 1.365, "USDCHF": 0.885,
    "NZDUSD": 0.615, "XAUUSD": 2050, "CRUDE": 75.5, "BRENT": 80.2,
    "US30": 44500, "SPX500": 5800, "US500": 5800, "NAS100": 20500,
  };
  return basePrices[symbol] || 1.0;
}

function getSymbolVolatility(symbol: string): number {
  const volatilities: Record<string, number> = {
    "BTCUSD": 0.03, "ETHUSD": 0.04, "EURUSD": 0.005, "GBPUSD": 0.008,
    "USDJPY": 0.006, "AUDUSD": 0.007, "USDCAD": 0.006, "USDCHF": 0.005,
    "NZDUSD": 0.008, "XAUUSD": 0.015, "CRUDE": 0.02, "BRENT": 0.018,
    "US30": 0.015, "SPX500": 0.012, "US500": 0.012, "NAS100": 0.018,
  };
  return volatilities[symbol] || 0.01;
}

function getTrendBias(symbol: string): number {
  const trendBiases: Record<string, number> = {
    "BTCUSD": 0.3, "ETHUSD": 0.2, "EURUSD": -0.1, "GBPUSD": 0.1,
    "USDJPY": 0.2, "AUDUSD": -0.2, "USDCAD": 0.1, "USDCHF": -0.1,
    "NZDUSD": -0.2, "XAUUSD": 0.4, "CRUDE": 0.1, "BRENT": 0.1,
    "US30": 0.2, "SPX500": 0.15, "US500": 0.15, "NAS100": 0.25,
  };
  return trendBiases[symbol] || 0;
}

function getBaseVolume(symbol: string, timeframe: string): number {
  const baseVolumes: Record<string, Record<string, number>> = {
    "BTCUSD": { "5m": 500, "15m": 1500, "30m": 3000 },
    "EURUSD": { "5m": 200, "15m": 600, "30m": 1200 },
    "US30": { "5m": 150, "15m": 450, "30m": 900 },
    "SPX500": { "5m": 180, "15m": 540, "30m": 1080 },
    "US500": { "5m": 180, "15m": 540, "30m": 1080 },
    "NAS100": { "5m": 200, "15m": 600, "30m": 1200 },
  };
  const symbolVolumes = baseVolumes[symbol] || { "5m": 100, "15m": 300, "30m": 600 };
  return symbolVolumes[timeframe] || symbolVolumes["5m"];
}

function calculateRealisticIndicators(open: number, high: number, low: number, close: number, symbol: string) {
  const priceChange = (close - open) / open;
  const range = (high - low) / close;
  
  let rsi = 50;
  if (priceChange > 0.01) rsi = 65 + Math.random() * 20;
  else if (priceChange < -0.01) rsi = 35 - Math.random() * 20;
  else rsi = 40 + Math.random() * 20;
  
  const macd = priceChange * 1000 + (Math.random() - 0.5) * 0.0001;
  const symbolVolatility = getSymbolVolatility(symbol);
  const atr = range * close * (0.8 + Math.random() * 0.4) * symbolVolatility;

  return {
    rsi: Math.max(0, Math.min(100, Math.round(rsi * 10) / 10)),
    macd: Math.round(macd * 100000) / 100000,
    atr: Math.round(atr * 100000) / 100000,
  };
}
