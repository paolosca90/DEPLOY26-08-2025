// Configurazione asset per ambiente di produzione
// Solo Forex cross con equivalenti Futures + NASDAQ/SP500/Oro

export const PRODUCTION_ASSETS = {
  "💱 Forex Majors": [
    "EURUSD", // EUR/USD - Euro Dollaro
    "GBPUSD", // GBP/USD - Sterlina Dollaro  
    "USDJPY", // USD/JPY - Dollaro Yen
    "USDCHF", // USD/CHF - Dollaro Franco Svizzero
    "AUDUSD", // AUD/USD - Dollaro Australiano
    "USDCAD", // USD/CAD - Dollaro Canadese
  ],
  
  "💱 Forex Cross": [
    "EURGBP", // EUR/GBP - Euro Sterlina
    "EURJPY", // EUR/JPY - Euro Yen
    "GBPJPY", // GBP/JPY - Sterlina Yen
    "AUDJPY", // AUD/JPY - Dollaro Australiano Yen
    "CADJPY", // CAD/JPY - Dollaro Canadese Yen
    "CHFJPY", // CHF/JPY - Franco Svizzero Yen
  ],

  "📈 Indici CFD": [
    "US100",  // NASDAQ-100 CFD (analisi da NQ future)
    "SPX500", // S&P 500 CFD (analisi da ES future)
    "US30",   // Dow Jones CFD (analisi da YM future)
    "RUT2000", // Russell 2000 CFD (analisi da RTY future)
  ],

  "🏗️ Metalli e Commodities": [
    "XAUUSD", // Gold Spot CFD (analisi anche da GC future)
    "XAGUSD", // Silver Spot CFD (analisi da SI future)
    "USOIL",  // Oil CFD (analisi da CL future)
  ]
};

// Mappatura per analisi istituzionale: CFD Frontend <-> Futures Backend
// I futures vengono usati solo internamente per l'analisi, i CFD vengono mostrati agli utenti
export const CFD_FUTURES_ANALYSIS_MAPPING = {
  // Forex (stesso simbolo per CFD e analisi futures)
  "EURUSD": "6E",    // Euro CFD analizzato via 6E Future
  "GBPUSD": "6B",    // British Pound CFD analizzato via 6B Future
  "USDJPY": "6J",    // Japanese Yen CFD analizzato via 6J Future
  "USDCHF": "6S",    // Swiss Franc CFD analizzato via 6S Future
  "AUDUSD": "6A",    // Australian Dollar CFD analizzato via 6A Future
  "USDCAD": "6C",    // Canadian Dollar CFD analizzato via 6C Future
  
  // Indici (CFD diverso dal future per chiarezza)
  "US100": "NQ",     // NASDAQ CFD analizzato via NQ Future
  "SPX500": "ES",    // S&P500 CFD analizzato via ES Future
  "US30": "YM",      // Dow Jones CFD analizzato via YM Future
  "RUT2000": "RTY",  // Russell CFD analizzato via RTY Future
  
  // Metalli e Commodities
  "XAUUSD": "GC",    // Gold CFD analizzato via GC Future
  "XAGUSD": "SI",    // Silver CFD analizzato via SI Future
  "USOIL": "CL"      // Oil CFD analizzato via CL Future
};

// Futures che hanno la stessa direzione del forex
export const SAME_DIRECTION_FUTURES = ["6E", "6B", "6A", "6J", "6S", "6C"];

// Futures che sono l'inverso (da gestire con logica speciale se necessario)
export const INVERSE_FUTURES = []; // Per ora tutti sono nella stessa direzione

// Lista completa degli asset disponibili
export const ALL_PRODUCTION_ASSETS = [
  ...PRODUCTION_ASSETS["💱 Forex Majors"],
  ...PRODUCTION_ASSETS["💱 Forex Cross"], 
  ...PRODUCTION_ASSETS["📈 Indici CFD"],
  ...PRODUCTION_ASSETS["🏗️ Metalli e Commodities"]
];

// Asset per l'analisi istituzionale (SOLO INTERNO - non visibili nel frontend)
export const INSTITUTIONAL_ANALYSIS_ASSETS = [
  "6E", "6B", "6J", "6A", "6C", "6S",   // Futures Forex per analisi
  "NQ", "ES", "RTY", "YM",              // Futures Indici per analisi
  "GC", "SI", "CL"                      // Futures Commodities per analisi
];

// Asset CFD mostrati nel frontend (tradotti dall'analisi dei futures)
export const HIGH_PRIORITY_ASSETS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", // Forex Majors CFD
  "EURGBP", "EURJPY", "GBPJPY",                               // Cross CFD principali
  "US100", "SPX500", "US30",                                  // Indici CFD (da analisi futures)
  "XAUUSD", "XAGUSD",                                         // Metalli CFD
  "USOIL"                                                     // Oil CFD (da analisi CL)
];

// Simboli per dashboard e grafici
export const DASHBOARD_SYMBOLS = HIGH_PRIORITY_ASSETS;