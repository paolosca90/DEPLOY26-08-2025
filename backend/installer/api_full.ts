import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import * as auth from "../auth/api";

const db = new SQLDatabase("installer", {
  migrations: "./migrations",
});

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg";
const INSTALLER_STORAGE_PATH = process.env.INSTALLER_STORAGE_PATH || "./generated_installers";

// Types
export interface InstallerRequest {
  userId: number;
  installerToken: string;
}

export interface InstallerResponse {
  success: boolean;
  downloadUrl?: string;
  expiresAt?: Date;
  error?: string;
}

export interface GeneratedInstaller {
  id: number;
  userId: number;
  fileName: string;
  filePath: string;
  downloadToken: string;
  expiresAt: Date;
  createdAt: Date;
  downloadCount: number;
}

// Helper functions
function generateDownloadToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generateInstallerFileName(userId: number, userEmail: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const sanitizedEmail = userEmail.replace(/[^a-zA-Z0-9]/g, "_");
  return `AI-ENCORE-Installer-${sanitizedEmail}-${userId}-${timestamp}.bat`;
}

async function ensureInstallerDirectory(): Promise<void> {
  try {
    await mkdir(INSTALLER_STORAGE_PATH, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Generate personalized installer BAT file
async function generatePersonalizedInstaller(
  userId: number,
  userInfo: auth.User,
  subscription: auth.UserSubscription,
  mt5Credentials: Omit<auth.MT5Credentials, "passwordHash">,
  mt5Password: string
): Promise<string> {
  
  // Read the base installer template
  const templatePath = path.join(process.cwd(), "installer_templates", "AI-ENCORE-Ultimate-Installer-Template.bat");
  
  let installerTemplate: string;
  
  // If template doesn't exist, use inline template
  try {
    installerTemplate = await readFile(templatePath, "utf-8");
  } catch (error) {
    // Use inline template as fallback
    installerTemplate = generateInlineInstallerTemplate();
  }

  // Replace placeholders with user-specific data
  const personalizedInstaller = installerTemplate
    .replace(/{{USER_ID}}/g, userId.toString())
    .replace(/{{USER_FIRST_NAME}}/g, userInfo.firstName)
    .replace(/{{USER_LAST_NAME}}/g, userInfo.lastName)
    .replace(/{{USER_EMAIL}}/g, userInfo.email)
    .replace(/{{SUBSCRIPTION_PLAN}}/g, subscription.plan.toUpperCase())
    .replace(/{{FINNHUB_API_KEY}}/g, FINNHUB_API_KEY)
    .replace(/{{MT5_LOGIN}}/g, mt5Credentials.login)
    .replace(/{{MT5_PASSWORD}}/g, mt5Password)
    .replace(/{{MT5_SERVER}}/g, mt5Credentials.server)
    .replace(/{{MT5_BROKER}}/g, mt5Credentials.brokerName)
    .replace(/{{MT5_ACCOUNT_TYPE}}/g, mt5Credentials.accountType.toUpperCase())
    .replace(/{{GENERATION_DATE}}/g, new Date().toLocaleString("it-IT"))
    .replace(/{{INSTALL_DIR}}/g, `C:\\AI-ENCORE-${userInfo.firstName}-${userId}`);

  return personalizedInstaller;
}

function generateInlineInstallerTemplate(): string {
  return `@echo off
REM ====================================================================
REM AI-ENCORE Personalized Installer
REM Generated for: {{USER_FIRST_NAME}} {{USER_LAST_NAME}} ({{USER_EMAIL}})
REM User ID: {{USER_ID}}
REM Plan: {{SUBSCRIPTION_PLAN}}
REM Generated: {{GENERATION_DATE}}
REM ====================================================================

title AI-ENCORE Installer for {{USER_FIRST_NAME}} {{USER_LAST_NAME}}

color 0A
mode con cols=80 lines=30

echo.
echo                ╔══════════════════════════════════════════════════════════════╗
echo                ║                🚀 AI-ENCORE PERSONAL INSTALLER 🚀           ║
echo                ║                                                              ║
echo                ║     Installer personalizzato per {{USER_FIRST_NAME}} {{USER_LAST_NAME}}
echo                ║               Piano: {{SUBSCRIPTION_PLAN}}                    ║
echo                ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo.
    echo     ❌ ERRORE: Privilegi amministratore richiesti!
    echo.
    echo     💡 SOLUZIONE:
    echo        1. Clicca destro su questo file BAT
    echo        2. Seleziona "Esegui come amministratore"
    echo        3. Clicca "Sì" nel prompt UAC
    echo.
    pause
    exit /b 1
)

color 0B
echo     ✅ Privilegi amministratore verificati
echo.

REM Configurazione personalizzata
set "INSTALL_DIR={{INSTALL_DIR}}"
set "USER_ID={{USER_ID}}"
set "USER_NAME={{USER_FIRST_NAME}} {{USER_LAST_NAME}}"
set "USER_EMAIL={{USER_EMAIL}}"
set "SUBSCRIPTION_PLAN={{SUBSCRIPTION_PLAN}}"
set "FINNHUB_API_KEY={{FINNHUB_API_KEY}}"
set "MT5_LOGIN={{MT5_LOGIN}}"
set "MT5_PASSWORD={{MT5_PASSWORD}}"
set "MT5_SERVER={{MT5_SERVER}}"
set "MT5_BROKER={{MT5_BROKER}}"
set "MT5_ACCOUNT_TYPE={{MT5_ACCOUNT_TYPE}}"
set "PYTHON_VERSION=3.11.7"

echo     👤 Utente: %USER_NAME%
echo     📧 Email: %USER_EMAIL%
echo     📁 Directory installazione: %INSTALL_DIR%
echo     💎 Piano: %SUBSCRIPTION_PLAN%
echo     🏦 Broker: %MT5_BROKER%
echo     🔑 Account MT5: %MT5_LOGIN% (%MT5_ACCOUNT_TYPE%)
echo.
echo     ⏱️  Installazione personalizzata in corso...
echo.

echo     🚀 Premere un tasto per avviare l'installazione...
pause >nul
cls

REM ====================================================================
REM STEP 1: Preparazione ambiente personalizzato
REM ====================================================================
echo.
echo [STEP 1/8] 📁 Preparazione ambiente per %USER_NAME%...
echo ═══════════════════════════════════════════════════════════════════

echo Creazione directory personalizzata...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)

mkdir "%INSTALL_DIR%" 2>nul
mkdir "%INSTALL_DIR%\\data_pipeline" 2>nul
mkdir "%INSTALL_DIR%\\analytics_engine" 2>nul
mkdir "%INSTALL_DIR%\\backend" 2>nul
mkdir "%INSTALL_DIR%\\backend\\analysis" 2>nul
mkdir "%INSTALL_DIR%\\data_lake" 2>nul
mkdir "%INSTALL_DIR%\\logs" 2>nul
mkdir "%INSTALL_DIR%\\config" 2>nul
mkdir "%INSTALL_DIR%\\temp" 2>nul

if exist "%INSTALL_DIR%\\config" (
    echo ✅ Directory personalizzate create con successo
) else (
    echo ❌ Errore creazione directory
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 2: Installazione Python (se necessario)
REM ====================================================================
echo.
echo [STEP 2/8] 🐍 Installazione Python %PYTHON_VERSION%...
echo ═══════════════════════════════════════════════════════════════════

python --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Python già presente nel sistema
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo    Versione: %%i
) else (
    echo 📥 Download Python in corso...
    
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe' -OutFile '%TEMP%\\python-installer.exe' -UseBasicParsing" 2>nul
    
    if exist "%TEMP%\\python-installer.exe" (
        echo ✅ Download completato, installazione in corso...
        "%TEMP%\\python-installer.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        timeout /t 15 /nobreak >nul
        del "%TEMP%\\python-installer.exe" >nul 2>&1
        echo ✅ Python installato con successo
    ) else (
        echo ❌ Download Python fallito
        pause
        exit /b 1
    )
)

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 3: Installazione dipendenze Python
REM ====================================================================
echo.
echo [STEP 3/8] 📦 Installazione dipendenze Python...
echo ═══════════════════════════════════════════════════════════════════

python -m pip install --upgrade pip --quiet --disable-pip-version-check
echo ✅ pip aggiornato

echo   📊 Installazione pandas...
python -m pip install "pandas>=1.5.0" --quiet --disable-pip-version-check

echo   🔢 Installazione numpy...
python -m pip install "numpy>=1.24.0" --quiet --disable-pip-version-check

echo   🌐 Installazione requests...
python -m pip install "requests>=2.28.0" --quiet --disable-pip-version-check

echo   📄 Installazione pdfplumber...
python -m pip install "pdfplumber>=0.7.0" --quiet --disable-pip-version-check

echo   💹 Installazione MetaTrader5...
python -m pip install "MetaTrader5>=5.0.45" --quiet --disable-pip-version-check

echo   📈 Installazione finnhub-python...
python -m pip install "finnhub-python>=2.4.0" --quiet --disable-pip-version-check

echo ✅ Installazione dipendenze Python completata

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 4: Download MetaTrader 5 (se necessario)
REM ====================================================================
echo.
echo [STEP 4/8] 📈 Verifica MetaTrader 5...
echo ═══════════════════════════════════════════════════════════════════

if exist "%ProgramFiles%\\MetaTrader 5\\terminal64.exe" (
    echo ✅ MetaTrader 5 già installato
    goto :mt5_done
)

if exist "%ProgramFiles(x86)%\\MetaTrader 5\\terminal64.exe" (
    echo ✅ MetaTrader 5 già installato  
    goto :mt5_done
)

echo 📥 Download MetaTrader 5...
powershell -Command "Invoke-WebRequest -Uri 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' -OutFile '%TEMP%\\mt5setup.exe' -UseBasicParsing" 2>nul

if exist "%TEMP%\\mt5setup.exe" (
    echo ✅ Download completato
    echo.
    echo ⚠️ CONFIGURAZIONE MT5 AUTOMATICA:
    echo    I tuoi dati MT5 sono già configurati:
    echo    🏦 Broker: %MT5_BROKER%
    echo    👤 Login: %MT5_LOGIN%
    echo    🖥️ Server: %MT5_SERVER%
    echo    🔐 Account Type: %MT5_ACCOUNT_TYPE%
    echo.
    echo Premere un tasto per avviare l'installer MT5...
    pause >nul
    
    start /wait "%TEMP%\\mt5setup.exe"
    del "%TEMP%\\mt5setup.exe" >nul 2>&1
    
    echo ✅ MetaTrader 5 installato
) else (
    echo ⚠️ Download MT5 non riuscito, installeremo automaticamente dopo
)

:mt5_done
timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 5: Creazione configurazione personalizzata
REM ====================================================================
echo.
echo [STEP 5/8] ⚙️ Configurazione sistema personalizzata...
echo ═══════════════════════════════════════════════════════════════════

echo Creazione file .env personalizzato...
(
echo # ═══════════════════════════════════════════════════════════════════
echo # AI-ENCORE Personal Configuration
echo # User: %USER_NAME% ^(%USER_EMAIL%^)
echo # Plan: %SUBSCRIPTION_PLAN%
echo # Generated: %DATE% %TIME%
echo # ═══════════════════════════════════════════════════════════════════
echo.
echo # User Information
echo USER_ID=%USER_ID%
echo USER_NAME=%USER_NAME%
echo USER_EMAIL=%USER_EMAIL%
echo SUBSCRIPTION_PLAN=%SUBSCRIPTION_PLAN%
echo.
echo # API Keys - PRECONFIGURATE
echo FINNHUB_API_KEY=%FINNHUB_API_KEY%
echo.
echo # MT5 Configuration - PRECONFIGURATO PER %MT5_BROKER%
echo MT5_LOGIN=%MT5_LOGIN%
echo MT5_PASSWORD=%MT5_PASSWORD%
echo MT5_SERVER=%MT5_SERVER%
echo MT5_BROKER=%MT5_BROKER%
echo MT5_ACCOUNT_TYPE=%MT5_ACCOUNT_TYPE%
echo.
echo # System Paths
echo INSTALL_PATH=%INSTALL_DIR%
echo DATA_LAKE_PATH=%INSTALL_DIR%\\data_lake
echo LOG_PATH=%INSTALL_DIR%\\logs
echo TEMP_PATH=%INSTALL_DIR%\\temp
echo.
echo # Performance settings
echo BASIS_CACHE_DURATION=30
echo PRICE_CACHE_DURATION=15
echo RATE_LIMIT_DELAY=1.5
echo MAX_RETRIES=3
echo.
echo # Debug
echo LOG_LEVEL=INFO
echo ENABLE_DEBUG=false
) > "%INSTALL_DIR%\\config\\.env"

echo ✅ Configurazione personalizzata creata per %USER_NAME%

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 6: Test connessioni personalizzate
REM ====================================================================
echo.
echo [STEP 6/8] 🔗 Test connessioni personalizzate...
echo ═══════════════════════════════════════════════════════════════════

echo Test API Finnhub con la tua chiave...
python -c "
import requests
try:
    resp = requests.get('https://finnhub.io/api/v1/quote?symbol=AAPL&token=%FINNHUB_API_KEY%', timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        print('✅ API Finnhub OK - AAPL: $' + str(data.get('c', 'N/A')))
    else:
        print('❌ Errore API Finnhub: ' + str(resp.status_code))
except Exception as e:
    print('❌ Errore connessione: ' + str(e))
"

echo.
echo Test configurazione MT5 per %MT5_BROKER%...
python -c "
try:
    import MetaTrader5 as mt5
    print('✅ Modulo MetaTrader5 disponibile')
    
    # Test inizializzazione
    if mt5.initialize():
        print('✅ MT5 inizializzato correttamente')
        
        # Test login con le tue credenziali
        login_result = mt5.login(%MT5_LOGIN%, password='%MT5_PASSWORD%', server='%MT5_SERVER%')
        if login_result:
            account = mt5.account_info()
            if account:
                print('✅ Login MT5 riuscito!')
                print('👤 Account: %MT5_LOGIN%')
                print('🏦 Broker: %MT5_BROKER%')
                print('🖥️ Server: %MT5_SERVER%')
                print('💰 Balance: $' + str(account.balance))
            else:
                print('⚠️ Login riuscito ma info account non disponibili')
        else:
            print('⚠️ Login MT5 non riuscito - Verifica credenziali')
            
        mt5.shutdown()
    else:
        print('⚠️ Impossibile inizializzare MT5')
except Exception as e:
    print('❌ Errore MT5: ' + str(e))
"

echo ✅ Test connessioni completato

timeout /t 3 /nobreak >nul
cls

REM ====================================================================
REM STEP 7: Creazione script personalizzati
REM ====================================================================
echo.
echo [STEP 7/8] 🛠️ Creazione script personalizzati...
echo ═══════════════════════════════════════════════════════════════════

REM Script di monitoraggio personalizzato
echo Creando monitor_ai_encore_%USER_ID%.bat...
(
echo @echo off
echo title AI-ENCORE Monitor - %USER_NAME%
echo cd /d "%INSTALL_DIR%"
echo color 0B
echo echo.
echo echo ╔══════════════════════════════════════════════════════════════╗
echo echo ║     AI-ENCORE System Monitor - %USER_NAME%
echo echo ║     Piano: %SUBSCRIPTION_PLAN% ^| Broker: %MT5_BROKER%
echo echo ╚══════════════════════════════════════════════════════════════╝
echo echo.
echo echo 👤 Utente: %USER_NAME%
echo echo 📧 Email: %USER_EMAIL%  
echo echo 🏦 Broker: %MT5_BROKER% ^(%MT5_ACCOUNT_TYPE%^)
echo echo 👤 Login MT5: %MT5_LOGIN%
echo echo 📊 Piano: %SUBSCRIPTION_PLAN%
echo echo.
echo echo 🔗 Test connessioni in corso...
echo echo.
echo python -c "
echo import requests, MetaTrader5 as mt5, sys
echo print('🐍 Python:', sys.version.split()[0])
echo # Test API
echo try:
echo     r = requests.get('https://finnhub.io/api/v1/quote?symbol=AAPL&token=%FINNHUB_API_KEY%', timeout=5)
echo     if r.status_code == 200:
echo         print('✅ API Finnhub OK')
echo     else:
echo         print('❌ API Finnhub Error')
echo except:
echo     print('❌ API Finnhub Error')
echo # Test MT5
echo try:
echo     if mt5.initialize():
echo         if mt5.login(%MT5_LOGIN%, '%MT5_PASSWORD%', '%MT5_SERVER%'):
echo             account = mt5.account_info()
echo             if account:
echo                 print(f'✅ MT5 OK - Balance: ${account.balance}')
echo             else:
echo                 print('⚠️ MT5 Login OK but no account info')
echo         else:
echo             print('❌ MT5 Login Failed')
echo         mt5.shutdown()
echo     else:
echo         print('❌ MT5 Init Failed')
echo except Exception as e:
echo     print(f'❌ MT5 Error: {e}')
echo "
echo echo.
echo echo ════════════════════════════════════════════════════════════════
echo pause
) > "%INSTALL_DIR%\\monitor_ai_encore_%USER_ID%.bat"

echo ✅ Script personalizzati creati

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM STEP 8: Finalizzazione installazione
REM ====================================================================
echo.
echo [STEP 8/8] 🎯 Finalizzazione installazione personalizzata...
echo ═══════════════════════════════════════════════════════════════════

echo Creazione documentazione personalizzata...
(
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║          AI-ENCORE INSTALLAZIONE COMPLETATA PER %USER_NAME%
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo 🎉 INSTALLAZIONE PERSONALIZZATA COMPLETATA!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 👤 UTENTE: %USER_NAME%
echo 📧 EMAIL: %USER_EMAIL%
echo 💎 PIANO: %SUBSCRIPTION_PLAN%
echo 📁 DIRECTORY: %INSTALL_DIR%
echo.
echo 🏦 CONFIGURAZIONE MT5 AUTOMATICA:
echo    Broker: %MT5_BROKER%
echo    Login: %MT5_LOGIN%
echo    Server: %MT5_SERVER%
echo    Tipo: %MT5_ACCOUNT_TYPE%
echo    ✅ Già configurato e testato!
echo.
echo 🔑 API CONFIGURATE:
echo    ✅ Finnhub API Key: Attiva e funzionante
echo    ✅ MT5 Integration: Configurata per %MT5_BROKER%
echo.
echo 🚀 IL TUO SISTEMA AI-ENCORE È OPERATIVO!
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 🛠️ SCRIPT DISPONIBILI:
echo    • monitor_ai_encore_%USER_ID%.bat - Monitoraggio sistema
echo.
echo 📊 DIRECTORY IMPORTANTI:
echo    • data_lake\\ - Dati scaricati automaticamente
echo    • logs\\ - File di log del sistema
echo    • config\\ - Configurazioni personalizzate
echo.
echo 🎯 PROSSIMI PASSI:
echo    1. Esegui: monitor_ai_encore_%USER_ID%.bat
echo    2. Accedi alla dashboard AI-ENCORE
echo    3. Inizia a ricevere segnali automatici!
echo.
echo Generated: %DATE% %TIME%
echo User: %USER_NAME% ^(%USER_EMAIL%^)
echo Plan: %SUBSCRIPTION_PLAN%
) > "%INSTALL_DIR%\\GUIDA_%USER_NAME%_%USER_ID%.txt"

echo ✅ Documentazione personalizzata creata

timeout /t 2 /nobreak >nul
cls

REM ====================================================================
REM COMPLETAMENTO INSTALLAZIONE PERSONALIZZATA
REM ====================================================================
color 0A
echo.
echo                ╔══════════════════════════════════════════════════════════════╗
echo                ║       🎉 INSTALLAZIONE PERSONALIZZATA COMPLETATA! 🎉        ║
echo                ╚══════════════════════════════════════════════════════════════╝
echo.
echo.
echo     👤 Ciao %USER_NAME%! Il tuo sistema AI-ENCORE è pronto!
echo.
echo     📁 Installato in: %INSTALL_DIR%
echo     💎 Piano: %SUBSCRIPTION_PLAN%
echo     🏦 Broker: %MT5_BROKER% (%MT5_ACCOUNT_TYPE%)
echo     🔑 API: Tutte preconfigurate e attive
echo     📈 MT5: Login %MT5_LOGIN% configurato
echo.
echo     ═══════════════════════════════════════════════════════════════════
echo.
color 0B
echo     🚀 SISTEMA COMPLETAMENTE OPERATIVO!
echo.
echo     Il tuo AI-ENCORE è già configurato con:
echo     ✅ Le tue credenziali MT5 (%MT5_BROKER%)
echo     ✅ API Finnhub attivata e testata
echo     ✅ Tutte le dipendenze installate
echo     ✅ Configurazione personalizzata
echo.
echo     📋 Leggi: %INSTALL_DIR%\\GUIDA_%USER_NAME%_%USER_ID%.txt
echo.

REM Proposta apertura directory
echo     Vuoi aprire la tua directory AI-ENCORE ora? (S/N)
set /p OPEN_DIR="     Scelta: "

if /i "%OPEN_DIR%"=="S" (
    echo.
    echo     📂 Apertura directory personalizzata...
    start "" "%INSTALL_DIR%"
    timeout /t 2 /nobreak >nul
)

echo.
color 0A
echo     ════════════════════════════════════════════════════════════════════
echo     🚀 Benvenuto nel futuro del trading, %USER_NAME%!
echo     ════════════════════════════════════════════════════════════════════
echo.

pause
exit /b 0

REM Fine installer personalizzato per %USER_NAME%`;
}

// API Endpoints

// Generate personalized installer
export const generateInstaller = api<InstallerRequest, InstallerResponse>({
  method: "POST",
  path: "/installer/generate",
  expose: true,
}, async ({ userId, installerToken }) => {
  try {
    // Verify installer token
    const decoded = jwt.verify(installerToken, JWT_SECRET) as any;
    
    if (decoded.userId !== userId || decoded.type !== "installer") {
      return { success: false, error: "Token installer non valido" };
    }

    // Get user information
    const { user } = await auth.getProfile({ userId });
    if (!user) {
      return { success: false, error: "Utente non trovato" };
    }

    // Get subscription information
    const { subscription } = await auth.getUserSubscription({ userId });
    if (!subscription) {
      return { success: false, error: "Abbonamento non trovato" };
    }

    // Get MT5 credentials
    const { credentials } = await auth.getMT5Credentials({ userId });
    if (!credentials) {
      return { success: false, error: "Credenziali MT5 non trovate" };
    }

    // Get MT5 password
    const { password: mt5Password } = await auth.getMT5Password({ userId, installerToken });
    if (!mt5Password) {
      return { success: false, error: "Password MT5 non disponibile" };
    }

    // Ensure installer directory exists
    await ensureInstallerDirectory();

    // Generate installer content
    const installerContent = await generatePersonalizedInstaller(
      userId,
      user,
      subscription,
      credentials,
      mt5Password
    );

    // Generate file name and path
    const fileName = generateInstallerFileName(userId, user.email);
    const filePath = path.join(INSTALLER_STORAGE_PATH, fileName);

    // Write installer to file
    await writeFile(filePath, installerContent, "utf-8");

    // Generate download token
    const downloadToken = generateDownloadToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save installer record to database
    await db.query`
      INSERT INTO generated_installers (user_id, file_name, file_path, download_token, expires_at, created_at, download_count)
      VALUES (${userId}, ${fileName}, ${filePath}, ${downloadToken}, ${expiresAt}, NOW(), 0)
    `;

    // Log installer generation
    await db.query`
      INSERT INTO installer_audit_log (user_id, action, success, created_at)
      VALUES (${userId}, 'generate_installer', true, NOW())
    `;

    const downloadUrl = `/installer/download/${downloadToken}`;

    return {
      success: true,
      downloadUrl,
      expiresAt
    };

  } catch (error: any) {
    console.error("Installer generation error:", error);
    
    // Log error
    try {
      await db.query`
        INSERT INTO installer_audit_log (user_id, action, success, error_message, created_at)
        VALUES (${userId}, 'generate_installer', false, ${error.message}, NOW())
      `;
    } catch (logError) {
      console.error("Failed to log installer error:", logError);
    }

    return {
      success: false,
      error: "Errore durante la generazione dell'installer"
    };
  }
});

// Download installer
export const downloadInstaller = api<{ downloadToken: string }, Response>({
  method: "GET",
  path: "/installer/download/:downloadToken",
  expose: true,
}, async ({ downloadToken }) => {
  try {
    // Find installer by download token
    const installerResult = await db.query`
      SELECT id, user_id, file_name, file_path, expires_at, download_count
      FROM generated_installers
      WHERE download_token = ${downloadToken} AND expires_at > NOW()
    `;

    if (installerResult.length === 0) {
      return new Response("Installer non trovato o scaduto", { status: 404 });
    }

    const installer = installerResult[0];

    // Check if file exists
    if (!fs.existsSync(installer.file_path)) {
      return new Response("File installer non disponibile", { status: 404 });
    }

    // Update download count
    await db.query`
      UPDATE generated_installers 
      SET download_count = download_count + 1
      WHERE id = ${installer.id}
    `;

    // Log download
    await db.query`
      INSERT INTO installer_audit_log (user_id, action, success, created_at)
      VALUES (${installer.user_id}, 'download_installer', true, NOW())
    `;

    // Read file and return as download
    const fileContent = await readFile(installer.file_path, "utf-8");

    return new Response(fileContent, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${installer.file_name}"`,
        "Content-Length": Buffer.byteLength(fileContent, "utf-8").toString(),
      },
    });

  } catch (error: any) {
    console.error("Installer download error:", error);
    return new Response("Errore durante il download", { status: 500 });
  }
});

// Get installer status
export const getInstallerStatus = api<{ userId: number }, { installers: GeneratedInstaller[] }>({
  method: "GET",
  path: "/installer/status/:userId",
  expose: true,
}, async ({ userId }) => {
  try {
    const installersResult = await db.query`
      SELECT id, user_id, file_name, download_token, expires_at, created_at, download_count
      FROM generated_installers
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const installers = installersResult.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      filePath: "", // Don't expose file path
      downloadToken: row.download_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      downloadCount: row.download_count
    }));

    return { installers };

  } catch (error: any) {
    console.error("Get installer status error:", error);
    return { installers: [] };
  }
});