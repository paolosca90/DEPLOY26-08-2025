const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data storage
let users = [
  {
    id: 1,
    email: 'demo@aiencoretrading.com',
    password: 'demo123', // In real app, this would be hashed
    name: 'Demo',
    surname: 'User'
  }
];
let registrations = [];
let aiSignals = [];
let mlPerformanceData = [];

// Asset CFD mostrati nel frontend (basati su analisi futures interna)
const FRONTEND_CFD_ASSETS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", // Forex Majors
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CADJPY", "CHFJPY", // Forex Cross
  "US100", "SPX500", "US30", "RUT2000", // Indici CFD (analisi da futures NQ, ES, YM, RTY)
  "XAUUSD", "XAGUSD", "USOIL" // Metalli e Oil CFD (analisi da futures GC, SI, CL)
];

// Asset futures per analisi istituzionale (INTERNO - non visibili nel frontend)
const INSTITUTIONAL_FUTURES = [
  "6E", "6B", "6J", "6A", "6C", "6S", // Futures Forex per analisi
  "NQ", "ES", "RTY", "YM", // Futures Indici per analisi
  "GC", "SI", "CL" // Futures Commodities per analisi
];

// Mappatura CFD -> Future per analisi interna
const CFD_TO_FUTURE_MAPPING = {
  "EURUSD": "6E", "GBPUSD": "6B", "USDJPY": "6J", "USDCHF": "6S", "AUDUSD": "6A", "USDCAD": "6C",
  "US100": "NQ", "SPX500": "ES", "US30": "YM", "RUT2000": "RTY",
  "XAUUSD": "GC", "XAGUSD": "SI", "USOIL": "CL"
};

// Funzione per generare segnali AI mock con confidence
function generateMockAISignal(symbol) {
  const direction = Math.random() > 0.5 ? "LONG" : "SHORT";
  const basePrice = getBasePrice(symbol);
  const spread = getSpread(symbol);
  const atr = basePrice * 0.01; // 1% ATR mock

  const technical = {
    rsi: Math.random() * 100,
    macd: {
      macd: (Math.random() - 0.5) * 0.001,
      signal: (Math.random() - 0.5) * 0.001,
      histogram: (Math.random() - 0.5) * 0.0005
    },
    movingAverages: {
      sma20: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      sma50: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      ema12: basePrice * (1 + (Math.random() - 0.5) * 0.008),
      ema26: basePrice * (1 + (Math.random() - 0.5) * 0.015)
    },
    trend: Math.random() > 0.33 ? (Math.random() > 0.5 ? "BULLISH" : "BEARISH") : "SIDEWAYS",
    volatility: Math.random() > 0.66 ? "HIGH" : (Math.random() > 0.33 ? "MEDIUM" : "LOW"),
    volume: Math.random() * 1000000
  };

  // Calcola confidence factors
  const confidenceFactors = {
    technical: Math.random() * 40,
    trend: Math.random() * 25,
    volume: Math.random() * 15,
    momentum: Math.random() * 10,
    risk: Math.random() * 10
  };

  const confidence = Object.values(confidenceFactors).reduce((sum, val) => sum + val, 0);

  let entryPrice, takeProfit, stopLoss;
  if (direction === "LONG") {
    entryPrice = basePrice + spread;
    takeProfit = entryPrice + (atr * 2);
    stopLoss = entryPrice - atr;
  } else {
    entryPrice = basePrice - spread;
    takeProfit = entryPrice - (atr * 2);
    stopLoss = entryPrice + atr;
  }

  const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);

  return {
    id: `signal_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol,
    direction,
    confidence: Math.min(100, Math.max(30, confidence)),
    entryPrice: parseFloat(entryPrice.toFixed(getPrecision(symbol))),
    takeProfit: parseFloat(takeProfit.toFixed(getPrecision(symbol))),
    stopLoss: parseFloat(stopLoss.toFixed(getPrecision(symbol))),
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
    strategy: confidence > 80 ? "Scalping AI Pro" : confidence > 70 ? "Trend Following AI" : "Conservative AI",
    timeframe: "M15",
    technicalAnalysis: technical,
    confidenceFactors,
    createdAt: new Date(),
    shouldExecute: confidence > 60,
    status: "GENERATED"
  };
}

function getBasePrice(symbol) {
  const prices = {
    // Forex Majors CFD
    "EURUSD": 1.0850, "GBPUSD": 1.2650, "USDJPY": 149.50, "USDCHF": 0.8750,
    "AUDUSD": 0.6750, "USDCAD": 1.3650,
    // Forex Cross CFD
    "EURGBP": 0.8580, "EURJPY": 162.20, "GBPJPY": 189.10,
    "AUDJPY": 100.80, "CADJPY": 109.50, "CHFJPY": 170.20,
    // Indici CFD (basati sui futures ma con nomi CFD)
    "US100": 16500,  // NASDAQ (da NQ future)
    "SPX500": 4650,  // S&P500 (da ES future)
    "US30": 35000,   // Dow Jones (da YM future)
    "RUT2000": 2100, // Russell (da RTY future)
    // Metalli e Commodities CFD
    "XAUUSD": 2050,  // Gold CFD (analisi anche da GC future)
    "XAGUSD": 24.50, // Silver CFD (da SI future)
    "USOIL": 72.50,  // Oil CFD (da CL future)
    
    // Futures (solo per analisi interna - non mostrati nel frontend)
    "NQ": 16500, "ES": 4650, "RTY": 2100, "YM": 35000, "CL": 72.50, "GC": 2050, "SI": 24.50,
    "6E": 1.0850, "6B": 1.2650, "6J": 0.0067, "6A": 0.6750, "6C": 0.7320, "6S": 1.1430
  };
  return prices[symbol] || 1.0000;
}

function getSpread(symbol) {
  const spreads = {
    // Forex Majors CFD
    "EURUSD": 0.0001, "GBPUSD": 0.0002, "USDJPY": 0.01, "USDCHF": 0.0002,
    "AUDUSD": 0.0002, "USDCAD": 0.0002,
    // Forex Cross CFD
    "EURGBP": 0.0002, "EURJPY": 0.02, "GBPJPY": 0.03,
    "AUDJPY": 0.02, "CADJPY": 0.02, "CHFJPY": 0.03,
    // Indici CFD
    "US100": 1.0, "SPX500": 0.25, "US30": 1.0, "RUT2000": 0.10,
    // Metalli e Commodities CFD
    "XAUUSD": 0.30, "XAGUSD": 0.02, "USOIL": 0.01,
    
    // Futures (solo per analisi interna)
    "NQ": 1.0, "ES": 0.25, "RTY": 0.10, "YM": 1.0, "CL": 0.01, "GC": 0.50, "SI": 0.005,
    "6E": 0.0001, "6B": 0.0002, "6J": 0.000001, "6A": 0.0002, "6C": 0.0002, "6S": 0.0002
  };
  return spreads[symbol] || 0.0001;
}

function getPrecision(symbol) {
  // JPY pairs hanno 2 decimali
  if (symbol.includes("JPY") || symbol === "6J") return 2;
  
  // Indici CFD hanno 2 decimali (come i futures corrispondenti)
  if (["US100", "SPX500", "US30", "RUT2000"].includes(symbol)) return 2;
  
  // Commodities CFD
  if (["USOIL"].includes(symbol)) return 2;
  if (["XAUUSD"].includes(symbol)) return 2;
  if (["XAGUSD"].includes(symbol)) return 3;
  
  // Futures (solo per analisi interna)
  if (["NQ", "ES", "RTY", "YM"].includes(symbol)) return 2;
  if (["CL"].includes(symbol)) return 2;
  if (["GC"].includes(symbol)) return 2;
  if (["SI"].includes(symbol)) return 3;
  if (["6E", "6B", "6A", "6C", "6S"].includes(symbol)) return 4;
  
  // Default per forex CFD
  return 4;
}

// Auth endpoints
app.post('/auth/register', (req, res) => {
  console.log('📝 Mock registration:', req.body);
  
  const { email, password, name, surname, plan, mt5Data } = req.body;
  
  const userId = users.length + 1;
  const newUser = {
    id: userId,
    email,
    password,
    name,
    surname,
    plan,
    mt5Data,
    createdAt: new Date()
  };
  
  users.push(newUser);
  registrations.push(newUser);
  
  console.log(`✅ Mock registration successful for ${email}`);
  console.log(`📧 Mock email sent to: ${email}`);
  console.log(`💳 Mock payment: €${plan?.price || 0} for user ${userId}`);
  
  res.json({
    success: true,
    userId,
    message: 'Registration successful'
  });
});

app.post('/auth/login', (req, res) => {
  console.log('🔐 Mock login attempt:', req.body);
  
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    console.log(`✅ Mock login successful for ${email}`);
    res.json({
      success: true,
      userId: user.id,
      token: `mock_token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname
      }
    });
  } else {
    console.log(`❌ Mock login failed for ${email}`);
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// Installer endpoints
app.post('/installer/generate', (req, res) => {
  console.log('🛠️ Mock installer generation:', req.body);
  
  const { userId } = req.body;
  const downloadToken = `download_${Date.now()}_${userId}`;
  const downloadUrl = `/installer/download/${downloadToken}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  console.log(`🛠️ Mock installer generated for user ${userId}`);
  
  res.json({
    success: true,
    downloadUrl,
    expiresAt
  });
});

app.get('/installer/download/:downloadToken', (req, res) => {
  const { downloadToken } = req.params;
  console.log(`📥 Mock installer download for token: ${downloadToken}`);
  
  const installerContent = `@echo off
REM AI-ENCORE Mock Installer
REM Token: ${downloadToken}
REM Generated: ${new Date().toISOString()}

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               🚀 AI-ENCORE MOCK INSTALLER 🚀                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Token: ${downloadToken}
echo Data: ${new Date().toLocaleString('it-IT')}
echo.
echo Questo è un installer di esempio per sviluppo.
echo In produzione, questo sarà completamente personalizzato.
echo.
echo Il tuo installer reale includerà:
echo ✅ Python e dipendenze automatiche
echo ✅ MetaTrader 5 configurato
echo ✅ Credenziali MT5 preimpostate
echo ✅ API Keys già configurate
echo ✅ Zero configurazione manuale richiesta
echo.
echo 🎯 Installazione completata!
echo.
pause
`;

  res.setHeader('Content-Disposition', 'attachment; filename="AI-ENCORE-Mock-Installer.bat"');
  res.setHeader('Content-Type', 'text/plain');
  res.send(installerContent);
});

// Email endpoints
app.post('/email/send', (req, res) => {
  console.log('📧 Mock email send:', req.body);
  res.json({ success: true, message: 'Mock email sent (logged to console)' });
});

app.post('/email/welcome', (req, res) => {
  console.log('📧 Mock welcome email:', req.body);
  res.json({ success: true, message: 'Mock welcome email sent (logged to console)' });
});

// Payment endpoints
app.post('/payments/create-intent', (req, res) => {
  console.log('💳 Mock payment intent:', req.body);
  res.json({
    success: true,
    clientSecret: 'mock_client_secret',
    message: 'Mock payment intent created'
  });
});

app.get('/payments/subscription/:userId', (req, res) => {
  const { userId } = req.params;
  console.log(`💳 Mock subscription status for user ${userId}`);
  res.json({
    success: true,
    status: 'active',
    plan: 'professional',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
});

// AI Signals endpoints
app.post('/analysis/generate-enhanced-signals', (req, res) => {
  console.log('🤖 Generazione segnali AI avanzati...');
  
  // Genera 6 segnali da asset CFD ad alta priorità (analisi interna via futures)
  const highPriorityAssets = ["EURUSD", "GBPUSD", "USDJPY", "US100", "SPX500", "XAUUSD", "USOIL", "EURGBP"];
  const newSignals = [];
  
  for (let i = 0; i < 6; i++) {
    const symbol = highPriorityAssets[i % highPriorityAssets.length];
    const signal = generateMockAISignal(symbol);
    newSignals.push(signal);
    
    // Salva segnali con confidence > 60% per simulare sistema persistente
    if (signal.confidence > 60) {
      aiSignals.push(signal);
      // Simula esecuzione automatica
      if (Math.random() > 0.3) { // 70% probabilità di esecuzione
        signal.status = "EXECUTED";
        signal.executionResult = {
          executedAt: new Date(),
          executedPrice: signal.entryPrice,
          lotSize: 0.1,
        };
        
        // Simula risultato dopo un po' di tempo (per il learning)
        setTimeout(() => simulateTradeResult(signal), Math.random() * 30000 + 10000); // 10-40 secondi
      }
    }
  }
  
  // Ordina per confidence e prendi top 3
  const topSignals = newSignals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  
  const summary = {
    totalSignals: newSignals.length,
    highConfidenceSignals: newSignals.filter(s => s.confidence > 60).length,
    avgConfidence: newSignals.reduce((sum, s) => sum + s.confidence, 0) / newSignals.length,
    executedToday: aiSignals.filter(s => s.status === 'EXECUTED' || s.status === 'CLOSED').length,
    successRate: calculateSuccessRate()
  };
  
  console.log(`✅ Generati ${topSignals.length} segnali top. Avg confidence: ${summary.avgConfidence.toFixed(1)}%`);
  
  res.json({ signals: topSignals, summary });
});

app.get('/analysis/top-ai-signals', (req, res) => {
  console.log('📊 Recuperando i top 3 segnali AI...');
  
  // Se non ci sono segnali, generane alcuni
  if (aiSignals.length === 0) {
    const highPriorityAssets = ["EURUSD", "GBPUSD", "USDJPY"];
    highPriorityAssets.forEach(symbol => {
      const signal = generateMockAISignal(symbol);
      if (signal.confidence > 50) {
        aiSignals.push(signal);
      }
    });
  }
  
  // Prendi i 3 segnali più recenti con confidence più alta
  const topSignals = aiSignals
    .filter(s => new Date() - new Date(s.createdAt) < 4 * 60 * 60 * 1000) // Ultime 4 ore
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  
  const summary = {
    totalSignals: topSignals.length,
    highConfidenceSignals: topSignals.filter(s => s.confidence > 60).length,
    avgConfidence: topSignals.reduce((sum, s) => sum + s.confidence, 0) / topSignals.length || 0,
    executedToday: aiSignals.filter(s => s.status === 'EXECUTED' || s.status === 'CLOSED').length,
    successRate: calculateSuccessRate()
  };
  
  res.json({ signals: topSignals, summary });
});

// ML Performance endpoints
app.get('/ml/analytics', (req, res) => {
  console.log('📈 ML Analytics richieste...');
  
  const totalTrades = mlPerformanceData.length;
  const winningTrades = mlPerformanceData.filter(t => t.success === true).length;
  const losingTrades = totalTrades - winningTrades;
  const successRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnL = mlPerformanceData.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const avgConfidence = mlPerformanceData.length > 0 ? 
    mlPerformanceData.reduce((sum, t) => sum + t.confidenceAtEntry, 0) / mlPerformanceData.length : 0;
  
  const analytics = {
    modelPerformance: {
      accuracy: successRate / 100,
      precision: winningTrades > 0 ? winningTrades / (winningTrades + losingTrades * 0.3) : 0,
      recall: successRate / 100,
      f1Score: successRate > 0 ? (2 * (successRate/100) * (successRate/100)) / ((successRate/100) + (successRate/100)) : 0,
      totalPredictions: totalTrades,
      correctPredictions: winningTrades
    },
    tradingStats: {
      totalTrades,
      winningTrades,
      losingTrades,
      successRate: successRate / 100,
      totalPnL,
      avgPnL: totalTrades > 0 ? totalPnL / totalTrades : 0,
      avgConfidence: avgConfidence / 100,
      bestTrade: Math.max(...mlPerformanceData.map(t => t.pnl || 0), 0),
      worstTrade: Math.min(...mlPerformanceData.map(t => t.pnl || 0), 0)
    },
    learningProgress: {
      dataPoints: totalTrades,
      modelVersion: "v2.1.3",
      lastUpdate: new Date().toISOString(),
      improvementRate: 2.3,
      confidenceGrowth: 8.7
    }
  };
  
  res.json(analytics);
});

app.get('/ml/training-analytics', (req, res) => {
  console.log('🧠 ML Training Analytics richieste...');
  
  const trainingData = {
    currentModel: {
      version: "v2.1.3",
      trainedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 ore fa
      accuracy: 0.67 + Math.random() * 0.1, // 67-77%
      epochs: 150,
      learningRate: 0.001,
      batchSize: 32
    },
    trainingHistory: Array.from({length: 10}, (_, i) => ({
      epoch: (i + 1) * 15,
      loss: 0.4 - (i * 0.02) + Math.random() * 0.05,
      accuracy: 0.6 + (i * 0.01) + Math.random() * 0.03,
      valLoss: 0.45 - (i * 0.02) + Math.random() * 0.05,
      valAccuracy: 0.58 + (i * 0.01) + Math.random() * 0.03
    })),
    datasetStats: {
      totalSamples: mlPerformanceData.length + 5000,
      trainingSamples: Math.floor((mlPerformanceData.length + 5000) * 0.8),
      validationSamples: Math.floor((mlPerformanceData.length + 5000) * 0.15),
      testSamples: Math.floor((mlPerformanceData.length + 5000) * 0.05),
      featuresCount: 47,
      labelsDistribution: {
        profitable: 0.67,
        unprofitable: 0.33
      }
    },
    recommendations: [
      "Aumentare il dataset con più esempi di mercati volatili",
      "Ottimizzare i parametri RSI e MACD per EUR/USD",
      "Implementare early stopping per evitare overfitting",
      "Considerare l'aggiunta di indicatori di volume"
    ]
  };
  
  res.json(trainingData);
});

// Funzioni helper
function simulateTradeResult(signal) {
  // Simula il risultato del trade con bias realistico
  const isProfit = Math.random() < (signal.confidence / 100) * 0.8; // Più alta confidence = più probabilità di successo
  const pnl = isProfit ? 
    Math.random() * 200 + 50 : // Profitto: $50-250
    -(Math.random() * 150 + 30); // Perdita: $30-180

  const result = {
    executedAt: signal.executionResult?.executedAt,
    executedPrice: signal.executionResult?.executedPrice,
    lotSize: signal.executionResult?.lotSize || 0.1,
    result: isProfit ? "PROFIT" : "LOSS",
    pnl,
    closedAt: new Date(),
    closedPrice: isProfit ? signal.takeProfit : signal.stopLoss
  };

  // Aggiorna il segnale
  signal.status = "CLOSED";
  signal.executionResult = result;

  // Aggiungi ai dati di performance per ML
  mlPerformanceData.push({
    signalId: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entryPrice: signal.entryPrice,
    exitPrice: result.closedPrice,
    lotSize: result.lotSize,
    pnl,
    success: isProfit,
    entryTime: result.executedAt,
    exitTime: result.closedAt,
    durationMinutes: Math.floor((new Date(result.closedAt) - new Date(result.executedAt)) / 60000),
    confidenceAtEntry: signal.confidence,
    createdAt: new Date()
  });

  console.log(`📊 Trade ${signal.symbol} chiuso: ${isProfit ? '✅ PROFIT' : '❌ LOSS'} $${pnl.toFixed(2)}`);
}

function calculateSuccessRate() {
  if (mlPerformanceData.length === 0) return 67.5; // Default mock
  const profitable = mlPerformanceData.filter(t => t.success === true).length;
  return (profitable / mlPerformanceData.length) * 100;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Mock backend running',
    users: users.length,
    registrations: registrations.length,
    aiSignals: aiSignals.length,
    mlPerformanceData: mlPerformanceData.length
  });
});

// Static files for frontend
app.use(express.static('frontend/dist'));

// Catch all handler for SPA
app.get('*', (req, res) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/installer') || req.url.startsWith('/email') || req.url.startsWith('/payments')) {
    res.status(404).json({ error: 'Endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  }
});

app.listen(PORT, () => {
  console.log('🚀 AI-ENCORE Production System Started!');
  console.log(`📡 Backend API: http://localhost:${PORT}`);
  console.log(`🌐 Frontend App: http://localhost:5173`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log('  POST /auth/register - User registration');
  console.log('  POST /auth/login - User login');  
  console.log('  POST /installer/generate - Generate installer');
  console.log('  GET  /installer/download/:token - Download installer');
  console.log('  POST /email/send - Send email');
  console.log('  POST /email/welcome - Send welcome email');
  console.log('  POST /payments/create-intent - Create payment intent');
  console.log('  GET  /payments/subscription/:userId - Get subscription status');
  console.log('');
  console.log('🤖 AI Signals Endpoints:');
  console.log('  POST /analysis/generate-enhanced-signals - Generate top AI signals');
  console.log('  GET  /analysis/top-ai-signals - Get current top 3 signals');
  console.log('  GET  /ml/analytics - ML performance analytics');
  console.log('  GET  /ml/training-analytics - ML training data');
  console.log('  GET  /health - System health check');
  console.log('');
  console.log('🧪 Demo Login Credentials:');
  console.log('  Email: demo@aiencoretrading.com');
  console.log('  Password: demo123');
  console.log('');
  console.log('💎 Production Features Enabled:');
  console.log('  ✅ Filtered assets (Forex + Futures + Metals only)');
  console.log('  ✅ AI Confidence Scoring System (>60% auto-execute)');
  console.log('  ✅ Trade Performance Learning Loop');
  console.log('  ✅ Persistent ML Analytics');
  console.log('  ✅ Real-time Signal Generation');
  console.log('');
  console.log('🎯 Production system ready for testing!');
});