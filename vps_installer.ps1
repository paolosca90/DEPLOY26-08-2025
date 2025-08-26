# ====================================================================
# AI-ENCORE VPS Auto-Installer
# Script PowerShell per setup automatico completo del sistema
# ====================================================================

param(
    [string]$FinnhubApiKey = "d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg",
    [string]$InstallPath = "C:\AI-ENCORE-System",
    [string]$PythonVersion = "3.11.7"
)

# Colori per output
function Write-ColorOutput([string]$message, [string]$color = "White") {
    Write-Host $message -ForegroundColor $color
}

function Write-Success([string]$message) { Write-ColorOutput "✅ $message" "Green" }
function Write-Warning([string]$message) { Write-ColorOutput "⚠️  $message" "Yellow" }
function Write-Error([string]$message) { Write-ColorOutput "❌ $message" "Red" }
function Write-Info([string]$message) { Write-ColorOutput "ℹ️  $message" "Cyan" }
function Write-Step([string]$message) { Write-ColorOutput "`n🔄 $message" "Magenta" }

Write-ColorOutput @"
╔══════════════════════════════════════════════════════════════╗
║                  AI-ENCORE VPS AUTO-INSTALLER              ║
║                                                              ║
║  Questo script installerà automaticamente tutto quello      ║
║  che serve per il sistema di analisi strutturale           ║
╚══════════════════════════════════════════════════════════════╝
"@ "Yellow"

Write-Info "Percorso installazione: $InstallPath"
Write-Info "Finnhub API Key: $($FinnhubApiKey.Substring(0,10))..."

# Controllo privilegi amministratore
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "Questo script deve essere eseguito come Amministratore!"
    Write-Info "Clicca destro su PowerShell e seleziona 'Esegui come amministratore'"
    Read-Host "Premi Enter per uscire"
    exit 1
}

# ====================================================================
# STEP 1: Preparazione directory
# ====================================================================
Write-Step "STEP 1: Preparazione directory di sistema"

try {
    if (Test-Path $InstallPath) {
        Write-Warning "Directory $InstallPath già esistente, verrà pulita"
        Remove-Item "$InstallPath\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\data_pipeline" -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\analytics_engine" -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\backend\analysis" -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\data_lake" -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\logs" -Force | Out-Null
    New-Item -ItemType Directory -Path "$InstallPath\config" -Force | Out-Null
    
    Write-Success "Directory create con successo"
}
catch {
    Write-Error "Errore creazione directory: $($_.Exception.Message)"
    exit 1
}

# ====================================================================
# STEP 2: Download e installazione Python
# ====================================================================
Write-Step "STEP 2: Installazione Python $PythonVersion"

$pythonInstalled = $false
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -like "*Python 3.*") {
        Write-Success "Python già installato: $pythonVersion"
        $pythonInstalled = $true
    }
}
catch {
    Write-Info "Python non trovato, procedo con l'installazione"
}

if (-not $pythonInstalled) {
    try {
        Write-Info "Download Python $PythonVersion..."
        $pythonUrl = "https://www.python.org/ftp/python/$PythonVersion/python-$PythonVersion-amd64.exe"
        $pythonInstaller = "$env:TEMP\python-$PythonVersion-amd64.exe"
        
        Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller -UseBasicParsing
        
        Write-Info "Installazione Python in corso..."
        Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
        
        # Verifica installazione
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Start-Sleep -Seconds 5
        python --version
        Write-Success "Python installato con successo"
        
        Remove-Item $pythonInstaller -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Error "Errore installazione Python: $($_.Exception.Message)"
        exit 1
    }
}

# ====================================================================
# STEP 3: Installazione dipendenze Python
# ====================================================================
Write-Step "STEP 3: Installazione dipendenze Python"

$pythonPackages = @(
    "pandas>=1.5.0",
    "numpy>=1.24.0",
    "requests>=2.28.0",
    "pdfplumber>=0.7.0",
    "MetaTrader5>=5.0.45",
    "finnhub-python>=2.4.0"
)

try {
    Write-Info "Aggiornamento pip..."
    python -m pip install --upgrade pip --quiet
    
    foreach ($package in $pythonPackages) {
        Write-Info "Installazione $package..."
        python -m pip install $package --quiet
    }
    
    Write-Success "Tutte le dipendenze Python installate"
}
catch {
    Write-Error "Errore installazione dipendenze: $($_.Exception.Message)"
    exit 1
}

# ====================================================================
# STEP 4: Download e installazione MetaTrader 5
# ====================================================================
Write-Step "STEP 4: Installazione MetaTrader 5"

$mt5Path = "$env:ProgramFiles\MetaTrader 5\terminal64.exe"
if (Test-Path $mt5Path) {
    Write-Success "MetaTrader 5 già installato"
}
else {
    try {
        Write-Info "Download MetaTrader 5..."
        $mt5Url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
        $mt5Installer = "$env:TEMP\mt5setup.exe"
        
        Invoke-WebRequest -Uri $mt5Url -OutFile $mt5Installer -UseBasicParsing
        
        Write-Info "Installazione MT5 in corso..."
        Write-Warning "IMPORTANTE: Dovrai configurare manualmente l'account MT5 dopo l'installazione!"
        
        Start-Process -FilePath $mt5Installer -Wait
        
        Write-Success "MetaTrader 5 installato"
        Remove-Item $mt5Installer -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Warning "Installazione MT5 fallita - dovrai installarlo manualmente"
    }
}

# ====================================================================
# STEP 5: Creazione file di configurazione
# ====================================================================
Write-Step "STEP 5: Creazione file di configurazione"

# File .env
$envContent = @"
# =================================
# AI-ENCORE System Configuration
# =================================

# API Keys
FINNHUB_API_KEY=$FinnhubApiKey

# MT5 Configuration (DA CONFIGURARE MANUALMENTE)
MT5_LOGIN=your_account_number
MT5_PASSWORD=your_password  
MT5_SERVER=your_broker_server

# System Paths
INSTALL_PATH=$InstallPath
DATA_LAKE_PATH=$InstallPath\data_lake
LOG_PATH=$InstallPath\logs

# Acquisizione dati
FETCH_OPTIONS_SCHEDULE=0 7 * * 1-5
FETCH_FUTURES_SCHEDULE=30 7 * * 1-5

# Cache settings
BASIS_CACHE_DURATION=30
PRICE_CACHE_DURATION=15

# Rate limiting
RATE_LIMIT_DELAY=1.5
MAX_RETRIES=3
"@

$envContent | Out-File -FilePath "$InstallPath\config\.env" -Encoding UTF8
Write-Success "File configurazione creato: $InstallPath\config\.env"

# Script caricamento ambiente
$loadEnvContent = @'
"""
Utility per caricare configurazione ambiente AI-ENCORE
"""
import os
from pathlib import Path

def load_environment():
    """Carica variabili ambiente da file .env"""
    env_file = Path(__file__).parent.parent / "config" / ".env"
    
    if env_file.exists():
        with open(env_file, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✅ Configurazione caricata da {env_file}")
    else:
        print(f"⚠️ File configurazione non trovato: {env_file}")

# Auto-load quando importato
load_environment()
'@

$loadEnvContent | Out-File -FilePath "$InstallPath\config\load_env.py" -Encoding UTF8

# ====================================================================
# STEP 6: Copia file del sistema
# ====================================================================
Write-Step "STEP 6: Setup file del sistema AI-ENCORE"

# Trovo la directory del progetto corrente
$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Info "Copia file da: $sourceDir"

# Copia file Python
$filesToCopy = @(
    @{Source="data_pipeline\fetch_options_data.py"; Dest="data_pipeline\fetch_options_data.py"},
    @{Source="data_pipeline\fetch_futures_volume.py"; Dest="data_pipeline\fetch_futures_volume.py"},
    @{Source="analytics_engine\structural_levels.py"; Dest="analytics_engine\structural_levels.py"},
    @{Source="analytics_engine\price_mapper.py"; Dest="analytics_engine\price_mapper.py"},
    @{Source="analytics_engine\cli_interface.py"; Dest="analytics_engine\cli_interface.py"},
    @{Source="backend\analysis\structural-analyzer.ts"; Dest="backend\analysis\structural-analyzer.ts"}
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $sourceDir $file.Source
    $destPath = Join-Path $InstallPath $file.Dest
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        Write-Success "Copiato: $($file.Dest)"
    }
    else {
        Write-Warning "File non trovato: $($file.Source)"
    }
}

# ====================================================================
# STEP 7: Creazione script di utilità
# ====================================================================
Write-Step "STEP 7: Creazione script di utilità"

# Script di monitoraggio
$monitorScript = @"
@echo off
cd /d $InstallPath
echo.
echo ============================================
echo   AI-ENCORE System Monitor
echo ============================================
echo.

python analytics_engine\cli_interface.py test --output-format pretty

echo.
echo ============================================
echo   System Status Check Completed
echo ============================================
pause
"@

$monitorScript | Out-File -FilePath "$InstallPath\monitor_system.bat" -Encoding UTF8

# Script acquisizione dati
$dataAcquisitionScript = @"
@echo off
cd /d $InstallPath

echo [%date% %time%] Avvio acquisizione dati AI-ENCORE
echo.

REM Carica configurazione
call config\load_env.bat

echo Acquisizione dati opzioni e sentiment...
python data_pipeline\fetch_options_data.py >> logs\acquisition.log 2>&1

echo Pausa per rate limiting...
timeout /t 120 /nobreak > nul

echo Acquisizione dati futures...  
python data_pipeline\fetch_futures_volume.py >> logs\acquisition.log 2>&1

echo [%date% %time%] Acquisizione completata
echo Controlla i log in: logs\acquisition.log
pause
"@

$dataAcquisitionScript | Out-File -FilePath "$InstallPath\run_data_acquisition.bat" -Encoding UTF8

# Script test API
$testApiScript = @"
@echo off
cd /d $InstallPath
echo.
echo ============================================
echo   Test API e Connessioni
echo ============================================
echo.

echo Testing Finnhub API...
python analytics_engine\cli_interface.py basis --instrument ES --output-format pretty

echo.
echo Testing MT5 Connection...
python -c "import MetaTrader5 as mt5; print('✅ MT5 Available' if mt5.initialize() else '❌ MT5 Not Connected'); mt5.shutdown() if mt5.initialize() else None"

echo.
echo ============================================
pause
"@

$testApiScript | Out-File -FilePath "$InstallPath\test_connections.bat" -Encoding UTF8

Write-Success "Script di utilità creati"

# ====================================================================
# STEP 8: Configurazione Task Scheduler
# ====================================================================
Write-Step "STEP 8: Configurazione Task Scheduler"

try {
    # Task per acquisizione dati giornaliera
    $taskName = "AI-ENCORE Daily Data Acquisition"
    $taskAction = New-ScheduledTaskAction -Execute "$InstallPath\run_data_acquisition.bat"
    $taskTrigger = New-ScheduledTaskTrigger -Daily -At "07:00AM"
    $taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Principal $taskPrincipal -Force | Out-Null
    
    Write-Success "Task Scheduler configurato per acquisizione dati giornaliera alle 07:00"
    
    # Task per monitoraggio ogni ora
    $monitorTaskName = "AI-ENCORE System Monitor"
    $monitorAction = New-ScheduledTaskAction -Execute "python" -Argument "$InstallPath\analytics_engine\cli_interface.py test" -WorkingDirectory $InstallPath
    $monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
    
    Register-ScheduledTask -TaskName $monitorTaskName -Action $monitorAction -Trigger $monitorTrigger -Settings $taskSettings -Principal $taskPrincipal -Force | Out-Null
    
    Write-Success "Task Scheduler configurato per monitoraggio orario"
}
catch {
    Write-Warning "Configurazione Task Scheduler fallita - dovrai configurarla manualmente"
    Write-Info "Usa i file .bat creati per configurare manualmente le attività pianificate"
}

# ====================================================================
# STEP 9: Test finale del sistema
# ====================================================================
Write-Step "STEP 9: Test finale del sistema"

Write-Info "Esecuzione test completo..."
Set-Location $InstallPath

try {
    $testResult = python analytics_engine\cli_interface.py test --quick 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Test sistema completato con successo!"
    }
    else {
        Write-Warning "Alcuni test sono falliti - controlla la configurazione"
    }
    
    Write-Info "Output test:"
    Write-Host $testResult -ForegroundColor Gray
}
catch {
    Write-Warning "Impossibile eseguire test automatico"
}

# ====================================================================
# STEP 10: Creazione guida rapida
# ====================================================================
$quickGuide = @"
╔══════════════════════════════════════════════════════════════════╗
║                    AI-ENCORE VPS - GUIDA RAPIDA                 ║
╚══════════════════════════════════════════════════════════════════╝

📁 DIRECTORY INSTALLAZIONE: $InstallPath

🔧 CONFIGURAZIONE MANUALE NECESSARIA:
   1. Apri MetaTrader 5 e configura il tuo account
   2. Modifica il file: $InstallPath\config\.env
      - Inserisci login, password e server MT5

🚀 SCRIPT DISPONIBILI:
   • monitor_system.bat       - Controllo stato sistema
   • run_data_acquisition.bat - Acquisizione manuale dati  
   • test_connections.bat     - Test API e connessioni

📊 MONITORAGGIO:
   • Log: $InstallPath\logs\
   • Data Lake: $InstallPath\data_lake\
   • Configurazione: $InstallPath\config\.env

⏰ TASK SCHEDULER CONFIGURATO:
   • Acquisizione dati: Ogni giorno ore 07:00
   • Monitoraggio: Ogni ora

🧪 TEST SISTEMA:
   Esegui: $InstallPath\monitor_system.bat

📞 TROUBLESHOOTING:
   • Controlla i log in logs/
   • Esegui test_connections.bat
   • Verifica configurazione MT5
   • Controlla connessione internet

🎯 NEXT STEPS:
   1. Configura account MT5
   2. Esegui test_connections.bat
   3. Esegui run_data_acquisition.bat per primo test
   4. Controlla che i dati vengano salvati in data_lake/

═══════════════════════════════════════════════════════════════════
"@

$quickGuide | Out-File -FilePath "$InstallPath\GUIDA_RAPIDA.txt" -Encoding UTF8

Write-ColorOutput $quickGuide "Green"

# ====================================================================
# COMPLETAMENTO
# ====================================================================
Write-ColorOutput "`n🎉 INSTALLAZIONE COMPLETATA!" "Green"
Write-ColorOutput "════════════════════════════════════════" "Green"

Write-Info "Il sistema AI-ENCORE è stato installato in: $InstallPath"
Write-Info "Leggi la guida rapida: $InstallPath\GUIDA_RAPIDA.txt"

Write-Warning "⚠️  AZIONI MANUALI RICHIESTE:"
Write-Host "   1. Configura account MetaTrader 5" -ForegroundColor Yellow
Write-Host "   2. Modifica file configurazione con i tuoi dati MT5" -ForegroundColor Yellow
Write-Host "   3. Esegui il primo test: $InstallPath\test_connections.bat" -ForegroundColor Yellow

Write-ColorOutput "`n🔥 Il tuo sistema di analisi strutturale è pronto!" "Green"

Read-Host "`nPremi Enter per aprire la directory di installazione"
Start-Process "explorer.exe" -ArgumentList $InstallPath