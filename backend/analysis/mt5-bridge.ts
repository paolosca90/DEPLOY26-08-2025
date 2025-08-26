import fetch from "node-fetch";
import type { Mt5Config } from "~backend/user/api";

export interface MT5OrderRequest {
  symbol: string;
  direction: "LONG" | "SHORT";
  lotSize: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  comment?: string;
}

export interface MT5OrderResult {
  success: boolean;
  orderId?: number;
  executionPrice?: number;
  error?: string;
}

export interface MT5AccountInfo {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  currency: string;
}

export interface MT5Position {
  ticket: number;
  symbol: string;
  type: number; // 0 = BUY, 1 = SELL
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  swap: number;
  comment: string;
}

export async function fetchWithTimeout(resource: string, options: any = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function executeMT5Order(order: MT5OrderRequest, mt5Config: Mt5Config): Promise<MT5OrderResult> {
  try {
    console.log(`🔄 Attempting to execute ${order.direction} order for ${order.symbol}`);
    const realResult = await tryRealExecution(order, mt5Config);
    if (realResult.success) {
      console.log(`✅ Real MT5 execution successful for ${order.symbol}`);
      return realResult;
    }
    console.log(`❌ Real MT5 execution failed: ${realResult.error}`);
    return realResult;
  } catch (error: any) {
    console.error("❌ MT5 execution error:", error);
    return { success: false, error: error.message || "Unknown execution error" };
  }
}

async function tryRealExecution(order: MT5OrderRequest, mt5Config: Mt5Config): Promise<MT5OrderResult> {
  try {
    const { host, port } = mt5Config;
    if (!host || !port) {
      return { success: false, error: "MT5 server host/port not configured" };
    }
    const url = `http://${host}:${port}/execute`;
    console.log(`🔗 Connecting to MT5 execution endpoint: ${url}`);

    // Enhanced symbol mapping for execution
    const correctSymbol = await findCorrectExecutionSymbol(order.symbol, host, port);
    const action = order.direction === "LONG" ? "BUY" : "SELL";

    const payload = {
      symbol: correctSymbol,
      action: action,
      volume: order.lotSize,
      sl: order.stopLoss,
      tp: order.takeProfit,
      comment: order.comment || "AI Trading Bot",
    };

    console.log(`📊 Sending payload to MT5: ${JSON.stringify(payload)}`);

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, 15000);

    if (!response.ok) {
      const resText = await response.text();
      return { success: false, error: `MT5 server error: ${response.status} - ${resText}` };
    }

    const result = await response.json() as any;

    if (result.success) {
      console.log(`✅ Order executed successfully: Order ID ${result.order}, Deal ID ${result.deal}`);
      return {
        success: true,
        orderId: result.order || result.deal || undefined,
        executionPrice: result.price || undefined,
      };
    } else {
      return {
        success: false,
        error: result.error || `MT5 error code ${result.retcode}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Connection to MT5 server failed: ${error.message || error}`,
    };
  }
}

async function findCorrectExecutionSymbol(symbol: string, host: string, port: number): Promise<string> {
  const baseUrl = `http://${host}:${port}`;
  
  // Get comprehensive symbol variations with priority for execution
  const symbolVariations = getExecutionSymbolVariations(symbol);
  
  console.log(`🔍 Finding correct execution symbol for ${symbol}. Testing ${symbolVariations.length} variations...`);
  
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
          console.log(`✅ Found tradeable symbol: ${symbol} → ${variation}`);
          return variation;
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  console.log(`⚠️ Using original symbol ${symbol} as fallback`);
  return symbol;
}

function getExecutionSymbolVariations(symbol: string): string[] {
  const variations: string[] = [];
  
  // Priority mappings for specific symbols (most common first)
  const priorityMappings = getPrioritySymbolMappings(symbol);
  variations.push(...priorityMappings);
  
  // Add original symbol
  variations.push(symbol);
  
  // Common broker suffixes (in order of popularity)
  const commonSuffixes = ['pm', '.pm', '_pm', 'pro', '.pro', '_pro', 'm', '.m', '_m', 'c', 'i', 'ecn', '.ecn', '_ecn', 'raw', '.raw', '_raw'];
  commonSuffixes.forEach(suffix => {
    variations.push(symbol + suffix);
  });
  
  // Alternative symbol names
  const alternativeNames = getAlternativeSymbolNames(symbol);
  variations.push(...alternativeNames);
  
  // Apply suffixes to alternative names
  alternativeNames.forEach(altName => {
    commonSuffixes.forEach(suffix => {
      variations.push(altName + suffix);
    });
  });
  
  return [...new Set(variations)]; // Remove duplicates
}

function getPrioritySymbolMappings(symbol: string): string[] {
  const mappings: { [key: string]: string[] } = {
    // US Indices - most common formats first
    "US30": [
      "US30pm", "US30.pm", "DJ30pm", "DJ30.pm", "DJI30pm", "DJI30.pm",
      "US30pro", "US30.pro", "DJ30pro", "DJ30.pro", "DJIA", "DJIApm",
      "DOW30pm", "DOW30.pm", "YMpm", "YM.pm", "US30c", "US30i"
    ],
    "US500": [
      "US500pm", "US500.pm", "SPX500pm", "SPX500.pm", "SP500pm", "SP500.pm",
      "US500pro", "US500.pro", "SPX500pro", "SPX500.pro", "ESpm", "ES.pm",
      "SPYpm", "SPY.pm", "US500c", "US500i", "SPX500c", "SPX500i"
    ],
    "SPX500": [
      "SPX500pm", "SPX500.pm", "US500pm", "US500.pm", "SP500pm", "SP500.pm",
      "SPX500pro", "SPX500.pro", "US500pro", "US500.pro", "ESpm", "ES.pm",
      "SPYpm", "SPY.pm", "SPX500c", "SPX500i", "US500c", "US500i"
    ],
    "NAS100": [
      "NAS100pm", "NAS100.pm", "NASDAQpm", "NASDAQ.pm", "NDXpm", "NDX.pm",
      "NAS100pro", "NAS100.pro", "NASDAQpro", "NASDAQ.pro", "NQpm", "NQ.pm",
      "QQQpm", "QQQ.pm", "NAS100c", "NAS100i", "TECH100pm", "TECH100.pm"
    ],
    // Forex
    "EURUSD": [
      "EURUSDpm", "EURUSD.pm", "EURUSDpro", "EURUSD.pro", "EURUSDm", "EURUSD.m",
      "EURUSDc", "EURUSDi", "EURUSDecn", "EURUSD.ecn", "EURUSDraw", "EURUSD.raw"
    ],
    "GBPUSD": [
      "GBPUSDpm", "GBPUSD.pm", "GBPUSDpro", "GBPUSD.pro", "GBPUSDm", "GBPUSD.m",
      "GBPUSDc", "GBPUSDi", "GBPUSDecn", "GBPUSD.ecn", "GBPUSDraw", "GBPUSD.raw"
    ],
    "USDJPY": [
      "USDJPYpm", "USDJPY.pm", "USDJPYpro", "USDJPY.pro", "USDJPYm", "USDJPY.m",
      "USDJPYc", "USDJPYi", "USDJPYecn", "USDJPY.ecn", "USDJPYraw", "USDJPY.raw"
    ],
    // Gold
    "XAUUSD": [
      "XAUUSDpm", "XAUUSD.pm", "GOLDpm", "GOLD.pm", "XAUUSDpro", "XAUUSD.pro",
      "GOLDpro", "GOLD.pro", "XAUUSDm", "XAUUSD.m", "GOLDm", "GOLD.m",
      "XAUUSDc", "XAUUSDi", "GOLDc", "GOLDi", "GOLD", "XAUUSDecn", "XAUUSD.ecn"
    ],
    // Crypto
    "BTCUSD": [
      "BTCUSDpm", "BTCUSD.pm", "BTCUSDpro", "BTCUSD.pro", "BTCUSDm", "BTCUSD.m",
      "BITCOIN", "BITCOINpm", "BITCOIN.pm", "BTC", "BTCpm", "BTC.pm"
    ],
    "ETHUSD": [
      "ETHUSDpm", "ETHUSD.pm", "ETHUSDpro", "ETHUSD.pro", "ETHUSDm", "ETHUSD.m",
      "ETHEREUM", "ETHEREUMpm", "ETHEREUM.pm", "ETH", "ETHpm", "ETH.pm"
    ],
    // Oil
    "CRUDE": [
      "CRUDEpm", "CRUDE.pm", "WTIpm", "WTI.pm", "USOILpm", "USOIL.pm",
      "CRUDEpro", "CRUDE.pro", "WTIpro", "WTI.pro", "CLpm", "CL.pm",
      "CRUDEm", "CRUDE.m", "WTIm", "WTI.m", "USOIL", "WTI", "CL"
    ]
  };
  
  return mappings[symbol] || [];
}

function getAlternativeSymbolNames(symbol: string): string[] {
  const alternatives: { [key: string]: string[] } = {
    "US30": ["DJ30", "DJI30", "DJIA", "DOW", "DOW30", "YM", "DOWJONES"],
    "US500": ["SPX500", "SP500", "SPY", "ES", "SPXUSD", "S&P500"],
    "SPX500": ["US500", "SP500", "SPY", "ES", "SPXUSD", "S&P500"],
    "NAS100": ["NASDAQ", "NDX", "QQQ", "NQ", "NASUSD", "TECH100"],
    "XAUUSD": ["GOLD"],
    "BTCUSD": ["BITCOIN", "BTC"],
    "ETHUSD": ["ETHEREUM", "ETH"],
    "CRUDE": ["WTI", "USOIL", "CL"],
    "BRENT": ["BRENT", "UKOIL"]
  };
  
  return alternatives[symbol] || [];
}

export async function getMT5Positions(mt5Config: Mt5Config): Promise<MT5Position[]> {
  try {
    const { host, port } = mt5Config;
    if (!host || !port) {
      console.log("MT5 server not configured for positions");
      return [];
    }
    
    console.log(`🔗 Fetching positions from MT5: http://${host}:${port}/positions`);
    
    const response = await fetchWithTimeout(`http://${host}:${port}/positions`, {
      method: "GET",
    }, 8000);

    if (response.ok) {
      const data = await response.json() as any;
      console.log(`📊 MT5 positions response:`, data);
      
      if (data && data.positions && Array.isArray(data.positions)) {
        const positions = data.positions.map((pos: any) => ({
          ticket: pos.ticket,
          symbol: pos.symbol,
          type: pos.type,
          volume: pos.volume,
          openPrice: pos.price_open,
          currentPrice: pos.price_current,
          profit: pos.profit,
          swap: pos.swap,
          comment: pos.comment || "",
        }));
        
        console.log(`✅ Successfully mapped ${positions.length} MT5 positions`);
        return positions;
      } else {
        console.log("⚠️ No positions array in MT5 response");
        return [];
      }
    } else {
      const errorText = await response.text();
      console.error(`❌ MT5 positions endpoint error: ${response.status} ${response.statusText} - ${errorText}`);
      return [];
    }
  } catch (error) {
    console.error("❌ Error getting MT5 positions:", error);
    return [];
  }
}

export async function closeMT5Position(ticket: number, mt5Config: Mt5Config): Promise<MT5OrderResult> {
  try {
    const { host, port } = mt5Config;
    if (!host || !port) {
      return { success: false, error: "MT5 server not configured" };
    }
    
    const response = await fetchWithTimeout(`http://${host}:${port}/close_position`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket }),
    }, 10000);

    if (response.ok) {
      const result = await response.json() as any;
      if (result.success) {
        return {
          success: true,
          orderId: result.deal,
          executionPrice: result.price,
        };
      } else {
        return {
          success: false,
          error: result.error,
        };
      }
    } else {
      const resText = await response.text();
      return { success: false, error: `Close position error: ${response.status} - ${resText}` };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Close position failed: ${error.message || error}`,
    };
  }
}
