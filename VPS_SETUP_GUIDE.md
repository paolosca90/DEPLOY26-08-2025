# 🚀 Guida Step-by-Step Setup VPS per AI-ENCORE

## 📋 Panoramica

Questa guida ti porterà passo dopo passo attraverso l'installazione completa del sistema AI-ENCORE sulla tua VPS. Puoi scegliere tra **installazione automatica** o **manuale**.

---

## 🎯 OPZIONE A: Installazione Automatica (Consigliata)

### ⚡ Installer PowerShell - 5 Minuti

1. **Connettiti alla VPS** via Remote Desktop
2. **Apri PowerShell come Amministratore**
   ```powershell
   # Clicca destro su PowerShell → "Esegui come amministratore"
   ```

3. **Abilita esecuzione script** (solo la prima volta)
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Force
   ```

4. **Scarica e esegui l'installer**
   ```powershell
   # Opzione 1: Se hai Git
   git clone https://github.com/your-repo/DEPLOY26-08-2025-main.git
   cd DEPLOY26-08-2025-main
   .\vps_installer.ps1
   
   # Opzione 2: Download diretto
   # Carica il file vps_installer.ps1 sulla VPS e esegui:
   .\vps_installer.ps1
   ```

5. **Segui il processo automatico** (durata: ~5-10 minuti)
   - ✅ Installazione Python 3.11
   - ✅ Installazione dipendenze
   - ✅ Download MetaTrader 5  
   - ✅ Configurazione directory
   - ✅ Setup Task Scheduler
   - ✅ Test automatici

6. **Configurazione manuale MT5** (dopo l'installer)
   - Apri MetaTrader 5
   - Configura il tuo account broker
   - Modifica `C:\AI-ENCORE-System\config\.env` con i tuoi dati MT5

7. **Test finale**
   ```powershell
   cd C:\AI-ENCORE-System
   .\test_connections.bat
   ```

🎉 **Fatto! Il sistema è operativo**

---

## 🔧 OPZIONE B: Installazione Manuale Completa

### Step 1: Preparazione VPS

#### 1.1 Connessione Remote Desktop
```bash
# Da Windows locale
mstsc /v:IP_DELLA_TUA_VPS
```

#### 1.2 Aggiornamento Sistema
```powershell
# Apri PowerShell come Amministratore
sconfig  # Su Windows Server Core
# Oppure Windows Update via GUI
```

#### 1.3 Creazione Struttura Directory
```powershell
# Directory principale
$InstallPath = "C:\AI-ENCORE-System"
New-Item -ItemType Directory -Path $InstallPath -Force

# Sottodirectory
@(
    "data_pipeline",
    "analytics_engine", 
    "backend\analysis",
    "data_lake",
    "logs",
    "config"
) | ForEach-Object { New-Item -ItemType Directory -Path "$InstallPath\$_" -Force }
```

---

### Step 2: Installazione Python

#### 2.1 Download Python 3.11
```powershell
# Download installer Python
$pythonUrl = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe"
$pythonInstaller = "$env:TEMP\python-3.11.7-amd64.exe"
Invoke-WebRequest -Uri $pythonUrl -OutFile $pythonInstaller
```

#### 2.2 Installazione Automatica Python
```powershell
# Installazione silenziosa con PATH
Start-Process -FilePath $pythonInstaller -ArgumentList "/quiet", "InstallAllUsers=1", "PrependPath=1", "Include_test=0" -Wait
```

#### 2.3 Verifica Installazione
```powershell
# Riavvia PowerShell o aggiorna PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Test Python
python --version
pip --version
```

---

### Step 3: Installazione Dipendenze Python

#### 3.1 Aggiornamento pip
```powershell
python -m pip install --upgrade pip
```

#### 3.2 Installazione Pacchetti Richiesti
```powershell
# Lista completa pacchetti
$packages = @(
    "pandas>=1.5.0",
    "numpy>=1.24.0", 
    "requests>=2.28.0",
    "pdfplumber>=0.7.0",
    "MetaTrader5>=5.0.45",
    "finnhub-python>=2.4.0"
)

# Installazione batch
$packages | ForEach-Object { 
    Write-Host "Installing $_..."
    python -m pip install $_ 
}
```

#### 3.3 Verifica Dipendenze
```powershell
# Test import tutti i moduli
python -c "
import pandas as pd
import numpy as np
import requests
import pdfplumber
import MetaTrader5 as mt5
import finnhub
print('✅ Tutti i moduli importati correttamente')
"
```

---

### Step 4: Installazione MetaTrader 5

#### 4.1 Download MT5
```powershell
# Download MT5 installer
$mt5Url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
$mt5Installer = "$env:TEMP\mt5setup.exe"
Invoke-WebRequest -Uri $mt5Url -OutFile $mt5Installer
```

#### 4.2 Installazione MT5
```powershell
# Esegui installer MT5 (interattivo)
Start-Process -FilePath $mt5Installer -Wait
```

#### 4.3 Configurazione Account MT5
1. Apri MetaTrader 5
2. File → Login to Trade Account
3. Inserisci i tuoi dati broker:
   - **Login**: Il tuo numero di conto
   - **Password**: La tua password
   - **Server**: Server del tuo broker

#### 4.4 Test Connessione Python-MT5
```powershell
cd $InstallPath

# Crea test script
@'
import MetaTrader5 as mt5

print("Testing MT5 connection...")
if mt5.initialize():
    account_info = mt5.account_info()
    if account_info:
        print(f"✅ Connected to account: {account_info.login}")
        print(f"💰 Balance: ${account_info.balance}")
        print(f"🏦 Server: {account_info.server}")
    else:
        print("❌ Cannot get account info")
    mt5.shutdown()
else:
    print("❌ Cannot initialize MT5")
    print("Make sure MT5 is running and account is configured")
'@ | Out-File -FilePath "$InstallPath\test_mt5.py" -Encoding UTF8

# Esegui test
python test_mt5.py
```

---

### Step 5: Configurazione File Sistema

#### 5.1 Upload File del Progetto
```powershell
# Copia i file dal tuo progetto locale alla VPS
# Puoi usare:
# - WinSCP (GUI)
# - scp command
# - Git clone
# - Remote Desktop copy-paste

# Esempio con Git (se disponibile):
cd $InstallPath
git clone https://github.com/your-repo/DEPLOY26-08-2025-main.git temp
Move-Item temp\data_pipeline\* data_pipeline\
Move-Item temp\analytics_engine\* analytics_engine\
Move-Item temp\backend\analysis\* backend\analysis\
Remove-Item temp -Recurse -Force
```

#### 5.2 Creazione File Configurazione
```powershell
# File .env per configurazione
$envContent = @"
# AI-ENCORE System Configuration
FINNHUB_API_KEY=d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg

# MT5 Configuration (MODIFICA CON I TUOI DATI)
MT5_LOGIN=your_account_number
MT5_PASSWORD=your_password
MT5_SERVER=your_broker_server

# System Paths
INSTALL_PATH=$InstallPath
DATA_LAKE_PATH=$InstallPath\data_lake
LOG_PATH=$InstallPath\logs

# Settings
BASIS_CACHE_DURATION=30
PRICE_CACHE_DURATION=15
RATE_LIMIT_DELAY=1.5
"@

$envContent | Out-File -FilePath "$InstallPath\config\.env" -Encoding UTF8
```

#### 5.3 Script Utility
```powershell
# Script monitoraggio sistema
$monitorScript = @"
@echo off
cd /d $InstallPath
python analytics_engine\cli_interface.py test --output-format pretty
pause
"@
$monitorScript | Out-File -FilePath "$InstallPath\monitor.bat" -Encoding UTF8

# Script acquisizione dati  
$dataScript = @"
@echo off
cd /d $InstallPath
echo Acquisizione dati opzioni...
python data_pipeline\fetch_options_data.py
timeout /t 120 /nobreak
echo Acquisizione dati futures...
python data_pipeline\fetch_futures_volume.py
pause
"@
$dataScript | Out-File -FilePath "$InstallPath\run_data_acquisition.bat" -Encoding UTF8
```

---

### Step 6: Configurazione Task Scheduler

#### 6.1 Task per Acquisizione Dati Giornaliera
```powershell
# Crea task per acquisizione dati alle 7:00 AM ogni giorno
$taskName = "AI-ENCORE Daily Data"
$taskAction = New-ScheduledTaskAction -Execute "$InstallPath\run_data_acquisition.bat"
$taskTrigger = New-ScheduledTaskTrigger -Daily -At "07:00AM"
$taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$taskPrincipal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount

Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Principal $taskPrincipal
```

#### 6.2 Task per Monitoraggio Orario
```powershell
# Task monitoraggio ogni ora
$monitorTaskName = "AI-ENCORE Monitor"
$monitorAction = New-ScheduledTaskAction -Execute "python" -Argument "$InstallPath\analytics_engine\cli_interface.py test" -WorkingDirectory $InstallPath
$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $monitorTaskName -Action $monitorAction -Trigger $monitorTrigger -Settings $taskSettings -Principal $taskPrincipal
```

#### 6.3 Verifica Task Scheduler
```powershell
# Lista task creati
Get-ScheduledTask | Where-Object {$_.TaskName -like "*AI-ENCORE*"}

# Test manuale task
Start-ScheduledTask -TaskName "AI-ENCORE Daily Data"
```

---

### Step 7: Test Completo del Sistema

#### 7.1 Test Ambiente Python
```powershell
cd $InstallPath
python -c "
import sys
print(f'Python: {sys.version}')
print(f'Install Path: {sys.executable}')

# Test imports
modules = ['pandas', 'numpy', 'requests', 'pdfplumber', 'MetaTrader5', 'finnhub']
for mod in modules:
    try:
        __import__(mod)
        print(f'✅ {mod}')
    except ImportError:
        print(f'❌ {mod} - MISSING')
"
```

#### 7.2 Test CLI Interface
```powershell
# Test completo sistema
python analytics_engine\cli_interface.py test

# Test calcolo basis
python analytics_engine\cli_interface.py basis --instrument ES --output-format pretty

# Test livelli strutturali
python analytics_engine\cli_interface.py structural-levels --instruments ES,NQ --output-format pretty
```

#### 7.3 Test Acquisizione Dati
```powershell
# Test manuale acquisizione
.\run_data_acquisition.bat

# Controlla file generati
dir data_lake\*.csv
```

#### 7.4 Test Integrazione MT5
```powershell
# Test connessione e prezzi MT5
python -c "
import os
os.environ['FINNHUB_API_KEY'] = 'd290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg'

import sys
sys.path.append('analytics_engine')

from price_mapper import PriceMapper
mapper = PriceMapper()

# Test basis ES
basis = mapper.get_current_basis('ES')
if basis:
    print(f'✅ ES Basis: {basis[\"basis\"]}')
    print(f'🎯 Confidence: {basis[\"confidence\"]}')
else:
    print('❌ Basis calculation failed')
"
```

---

### Step 8: Monitoraggio e Manutenzione

#### 8.1 Setup Log Rotation
```powershell
# Script per pulizia log vecchi
$cleanupScript = @"
@echo off
cd /d $InstallPath\logs
forfiles /p . /m *.log /d -30 /c "cmd /c del @path"
echo Log cleanup completed
"@
$cleanupScript | Out-File -FilePath "$InstallPath\cleanup_logs.bat" -Encoding UTF8

# Task pulizia log ogni settimana
$cleanupAction = New-ScheduledTaskAction -Execute "$InstallPath\cleanup_logs.bat"
$cleanupTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "02:00AM"
Register-ScheduledTask -TaskName "AI-ENCORE Log Cleanup" -Action $cleanupAction -Trigger $cleanupTrigger -Settings $taskSettings -Principal $taskPrincipal
```

#### 8.2 Script Health Check
```powershell
# Health check script
$healthScript = @"
import os, sys, json
from datetime import datetime
sys.path.append('analytics_engine')

def health_check():
    report = {
        'timestamp': datetime.now().isoformat(),
        'status': 'healthy',
        'checks': {}
    }
    
    # Check data freshness
    from pathlib import Path
    data_lake = Path('data_lake')
    recent_files = [f for f in data_lake.glob('*.csv') if (datetime.now() - datetime.fromtimestamp(f.stat().st_mtime)).days < 2]
    report['checks']['data_freshness'] = len(recent_files) > 0
    
    # Check MT5
    try:
        import MetaTrader5 as mt5
        report['checks']['mt5_available'] = mt5.initialize()
        if report['checks']['mt5_available']:
            mt5.shutdown()
    except:
        report['checks']['mt5_available'] = False
    
    # Check API
    try:
        import requests
        api_key = os.environ.get('FINNHUB_API_KEY')
        resp = requests.get(f'https://finnhub.io/api/v1/quote?symbol=AAPL&token={api_key}', timeout=10)
        report['checks']['api_working'] = resp.status_code == 200
    except:
        report['checks']['api_working'] = False
    
    # Overall status
    if not all(report['checks'].values()):
        report['status'] = 'issues_detected'
    
    with open('logs/health_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Health Status: {report[\"status\"]}')
    for check, result in report['checks'].items():
        print(f'{check}: {\"✅\" if result else \"❌\"}')

if __name__ == '__main__':
    os.environ['FINNHUB_API_KEY'] = 'd290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg'
    health_check()
"@
$healthScript | Out-File -FilePath "$InstallPath\health_check.py" -Encoding UTF8
```

---

## 🔧 Configurazione Post-Installazione

### ⚙️ Personalizzazione Parametri

#### Modifica Configurazione Principale
```powershell
notepad "$InstallPath\config\.env"
```

**Parametri da personalizzare:**
```env
# MT5 - INSERISCI I TUOI DATI REALI
MT5_LOGIN=12345678
MT5_PASSWORD=TuaPassword123
MT5_SERVER=BrokerServer-Demo

# Timing acquisizione dati (opzionale)
FETCH_OPTIONS_SCHEDULE=0 6 * * 1-5    # 6:00 AM invece di 7:00
FETCH_FUTURES_SCHEDULE=30 6 * * 1-5   # 6:30 AM invece di 7:30

# Cache durata (opzionale)
BASIS_CACHE_DURATION=60               # 60 secondi invece di 30
```

#### Personalizzazione Strumenti Monitorati
Modifica `analytics_engine\price_mapper.py`:
```python
# Aggiungi nuovi strumenti nella sezione INSTRUMENT_MAPPING
'BTCUSD': {
    'future_symbol': 'BTC',
    'cfd_symbol': 'BTCUSD',
    'finnhub_futures': ['BINANCE:BTCUSDT'],
    'description': 'Bitcoin CFD vs Future',
    'typical_basis_range': (-100, 100)
}
```

---

## 🚨 Troubleshooting Comune

### Problem 1: Python non trovato
```powershell
# Soluzione: Aggiungi Python al PATH manualmente
$pythonPath = "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311"
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$pythonPath;$pythonPath\Scripts", "User")
```

### Problem 2: MT5 non si connette
```powershell
# Verifica MT5 sia in esecuzione
Get-Process -Name "terminal64" -ErrorAction SilentlyContinue

# Test connessione manuale
python -c "
import MetaTrader5 as mt5
print('Initializing MT5...')
if not mt5.initialize():
    print('Failed to initialize MT5')
    print('Error:', mt5.last_error())
else:
    print('MT5 initialized successfully')
    account = mt5.account_info()
    if account:
        print(f'Account: {account.login}')
    mt5.shutdown()
"
```

### Problem 3: API Finnhub errori
```powershell
# Test API key
python -c "
import os, requests
api_key = 'd290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg'
resp = requests.get(f'https://finnhub.io/api/v1/quote?symbol=AAPL&token={api_key}')
print(f'Status: {resp.status_code}')
print(f'Response: {resp.text[:200]}')
"
```

### Problem 4: Task Scheduler non funziona
```powershell
# Controlla task esistenti
Get-ScheduledTask | Where-Object {$_.TaskName -like "*AI-ENCORE*"} | Format-Table TaskName,State

# Test task manualmente
Start-ScheduledTask -TaskName "AI-ENCORE Daily Data"

# Controlla log task
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-TaskScheduler/Operational'; ID=100,101,102} | Select-Object -First 5
```

---

## 📊 Monitoraggio Performance

### Dashboard VPS
Crea script PowerShell per dashboard:
```powershell
# dashboard.ps1
$InstallPath = "C:\AI-ENCORE-System"
cd $InstallPath

Clear-Host
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                AI-ENCORE VPS Dashboard              ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# System status
Write-Host "`n🖥️  SYSTEM STATUS" -ForegroundColor Yellow
Get-ComputerInfo | Select-Object TotalPhysicalMemory,CsProcessors,WindowsProductName | Format-List

# Disk space
Write-Host "💾 DISK SPACE" -ForegroundColor Yellow  
Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3} | ForEach-Object {
    $free = [math]::Round($_.FreeSpace/1GB,2)
    $total = [math]::Round($_.Size/1GB,2)
    Write-Host "$($_.DeviceID) Free: $free GB / Total: $total GB"
}

# Recent data files
Write-Host "`n📊 RECENT DATA FILES" -ForegroundColor Yellow
if (Test-Path "data_lake") {
    Get-ChildItem "data_lake\*.csv" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Format-Table Name,LastWriteTime,@{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}
}

# Task status
Write-Host "⏰ SCHEDULED TASKS" -ForegroundColor Yellow
Get-ScheduledTask | Where-Object {$_.TaskName -like "*AI-ENCORE*"} | Format-Table TaskName,State,NextRunTime

# Log summary
Write-Host "📝 RECENT LOGS" -ForegroundColor Yellow
if (Test-Path "logs") {
    Get-ChildItem "logs\*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 3 | ForEach-Object {
        Write-Host "$($_.Name) - Modified: $($_.LastWriteTime)"
        Get-Content $_.FullName -Tail 2 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
}

Write-Host "`n🔄 Press Enter to refresh, Ctrl+C to exit" -ForegroundColor Green
Read-Host
& $MyInvocation.MyCommand.Path  # Restart dashboard
```

---

## 🎉 Completamento Setup

### ✅ Checklist Finale

- [ ] **Python 3.11+ installato e funzionante**
- [ ] **Tutte le dipendenze Python installate**  
- [ ] **MetaTrader 5 installato e account configurato**
- [ ] **File di progetto copiati correttamente**
- [ ] **File .env configurato con i tuoi dati MT5**
- [ ] **Task Scheduler configurato per acquisizione automatica**
- [ ] **Test sistema completato con successo**
- [ ] **Primo run manuale acquisizione dati eseguito**
- [ ] **Log directory configurata e monitorata**

### 🚀 Sistema Operativo!

Il tuo sistema AI-ENCORE è ora completamente installato e configurato sulla VPS. Il sistema:

- 🔄 **Acquisisce automaticamente** dati opzioni e futures ogni mattina alle 7:00
- 🎯 **Calcola basis real-time** tra futures e CFD
- 📊 **Genera livelli strutturali** da opzioni e volumi
- 🧠 **Potenzia i segnali** con analisi di confluenza
- 📈 **Migliora l'affidabilità** combinando ML + analisi strutturale

### 📞 Supporto

- **Log files**: `C:\AI-ENCORE-System\logs\`
- **Monitor script**: `C:\AI-ENCORE-System\monitor.bat`  
- **Health check**: `C:\AI-ENCORE-System\health_check.py`
- **Data verification**: Controlla `data_lake\` per file CSV giornalieri

Il tuo sistema di trading è ora **significantly more powerful** con analisi strutturale istituzionale!