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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Mock backend running',
    users: users.length,
    registrations: registrations.length
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
  console.log('🚀 Mock Backend Server Started!');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌐 Frontend: http://localhost:5173`);
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
  console.log('  GET  /health - Health check');
  console.log('');
  console.log('🧪 Demo Login Credentials:');
  console.log('  Email: demo@aiencoretrading.com');
  console.log('  Password: demo123');
  console.log('');
  console.log('🎯 System ready for testing!');
});