export function generateTradeId(symbol: string): string {
  const prefix = symbol.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  
  return `${prefix}-${timestamp}${random}`;
}

export function formatPrice(price: number, decimals: number = 5): string {
  return price.toFixed(decimals);
}

export function calculateRiskReward(entryPrice: number, takeProfit: number, stopLoss: number): number {
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  
  return reward / risk;
}

export function validateSymbol(symbol: string): boolean {
  const validSymbols = [
    // Forex Majors
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD",
    
    // Forex Minors
    "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD", 
    "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
    "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD",
    "NZDJPY", "NZDCHF", "NZDCAD",
    "CADJPY", "CADCHF", "CHFJPY",
    
    // Forex Exotics
    "USDSEK", "USDNOK", "USDDKK", "USDPLN", "USDHUF", "USDCZK",
    "USDTRY", "USDZAR", "USDMXN", "USDBRL", "USDSGD", "USDHKD",
    "EURPLN", "EURSEK", "EURNOK", "EURDKK", "EURTRY", "EURZAR",
    "GBPPLN", "GBPSEK", "GBPNOK", "GBPDKK", "GBPTRY", "GBPZAR",
    
    // Indices CFD (Updated nomenclature)
    "US30", "SPX500", "US500", "NAS100", "UK100", "GER40", "FRA40", "ESP35", 
    "ITA40", "AUS200", "JPN225", "HK50", "CHINA50", "INDIA50",
    
    // Commodities
    "XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD", // Precious metals
    "CRUDE", "BRENT", "NATGAS", // Energy
    "WHEAT", "CORN", "SOYBEAN", "SUGAR", "COFFEE", "COCOA", "COTTON", // Agricultural
    
    // Cryptocurrencies
    "BTCUSD", "ETHUSD", "LTCUSD", "XRPUSD", "ADAUSD", "DOTUSD", 
    "LINKUSD", "BCHUSD", "XLMUSD", "EOSUSD"
  ];
  
  return validSymbols.includes(symbol.toUpperCase());
}
