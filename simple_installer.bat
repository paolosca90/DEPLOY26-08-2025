@echo off
REM ====================================================================
REM AI-ENCORE VPS Simple Installer (Batch Version)
REM Per utenti che preferiscono evitare PowerShell
REM ====================================================================

title AI-ENCORE VPS Installer

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  AI-ENCORE VPS INSTALLER                    ║
echo ║                                                              ║
echo ║  Installazione semplificata del sistema di analisi          ║
echo ║  strutturale per il trading AI-ENCORE                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verifica privilegi amministratore
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERRORE: Questo script deve essere eseguito come Amministratore!
    echo.
    echo 💡 SOLUZIONE:
    echo    1. Clicca destro su questo file .bat
    echo    2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo ✅ Privilegi amministratore verificati
echo.

REM Imposta variabili
set INSTALL_DIR=C:\AI-ENCORE-System
set FINNHUB_API_KEY=d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg
set PYTHON_VERSION=3.11.7

echo 📁 Directory installazione: %INSTALL_DIR%
echo 🔑 Finnhub API Key configurata
echo.

REM ====================================================================
REM STEP 1: Creazione directory
REM ====================================================================
echo 🔄 STEP 1: Creazione struttura directory...

if exist "%INSTALL_DIR%" (
    echo ⚠️  Directory esistente, pulizia in corso...
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)

mkdir "%INSTALL_DIR%" 2>nul
mkdir "%INSTALL_DIR%\data_pipeline" 2>nul
mkdir "%INSTALL_DIR%\analytics_engine" 2>nul
mkdir "%INSTALL_DIR%\backend" 2>nul
mkdir "%INSTALL_DIR%\backend\analysis" 2>nul
mkdir "%INSTALL_DIR%\data_lake" 2>nul
mkdir "%INSTALL_DIR%\logs" 2>nul
mkdir "%INSTALL_DIR%\config" 2>nul

echo ✅ Directory create con successo
echo.

REM ====================================================================
REM STEP 2: Verifica/Installazione Python
REM ====================================================================
echo 🔄 STEP 2: Verifica installazione Python...

python --version >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Python già installato
    python --version
) else (
    echo ⚠️  Python non trovato, download in corso...
    
    REM Download Python usando PowerShell (disponibile su Windows 10+)
    powershell -Command "& {Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/%PYTHON_VERSION%/python-%PYTHON_VERSION%-amd64.exe' -OutFile '%TEMP%\python-installer.exe'}"
    
    if exist "%TEMP%\python-installer.exe" (
        echo 🔄 Installazione Python in corso...
        "%TEMP%\python-installer.exe" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
        
        REM Aggiorna PATH per questa sessione
        for /f "tokens=2*" %%i in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "PATH=%%j;%PATH%"
        
        echo ✅ Python installato
        del "%TEMP%\python-installer.exe" >nul 2>&1
    ) else (
        echo ❌ Errore download Python
        echo 💡 Installa manualmente Python da python.org
        pause
        exit /b 1
    )
)

echo.

REM ====================================================================
REM STEP 3: Installazione dipendenze Python
REM ====================================================================
echo 🔄 STEP 3: Installazione dipendenze Python...

echo Aggiornamento pip...
python -m pip install --upgrade pip --quiet

echo Installazione pandas...
python -m pip install "pandas>=1.5.0" --quiet

echo Installazione numpy...
python -m pip install "numpy>=1.24.0" --quiet

echo Installazione requests...
python -m pip install "requests>=2.28.0" --quiet

echo Installazione pdfplumber...
python -m pip install "pdfplumber>=0.7.0" --quiet

echo Installazione MetaTrader5...
python -m pip install "MetaTrader5>=5.0.45" --quiet

echo Installazione finnhub-python...
python -m pip install "finnhub-python>=2.4.0" --quiet

echo ✅ Tutte le dipendenze installate
echo.

REM ====================================================================
REM STEP 4: Download MetaTrader 5
REM ====================================================================
echo 🔄 STEP 4: Download MetaTrader 5...

if exist "%ProgramFiles%\MetaTrader 5\terminal64.exe" (
    echo ✅ MetaTrader 5 già installato
) else (
    echo Download MT5 in corso...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' -OutFile '%TEMP%\mt5setup.exe'}"
    
    if exist "%TEMP%\mt5setup.exe" (
        echo 🔄 Avvio installazione MT5...
        echo ⚠️  IMPORTANTE: Configura il tuo account broker durante l'installazione!
        "%TEMP%\mt5setup.exe"
        
        echo ✅ MetaTrader 5 installato
        del "%TEMP%\mt5setup.exe" >nul 2>&1
    ) else (
        echo ❌ Download MT5 fallito
        echo 💡 Scarica manualmente da metaquotes.com
    )
)

echo.

REM ====================================================================
REM STEP 5: Creazione file di configurazione
REM ====================================================================
echo 🔄 STEP 5: Creazione file di configurazione...

REM File .env
(
echo # =================================
echo # AI-ENCORE System Configuration
echo # =================================
echo.
echo # API Keys
echo FINNHUB_API_KEY=%FINNHUB_API_KEY%
echo.
echo # MT5 Configuration ^(MODIFICA CON I TUOI DATI^)
echo MT5_LOGIN=your_account_number
echo MT5_PASSWORD=your_password
echo MT5_SERVER=your_broker_server
echo.
echo # System Paths
echo INSTALL_PATH=%INSTALL_DIR%
echo DATA_LAKE_PATH=%INSTALL_DIR%\data_lake
echo LOG_PATH=%INSTALL_DIR%\logs
echo.
echo # Settings
echo BASIS_CACHE_DURATION=30
echo PRICE_CACHE_DURATION=15
echo RATE_LIMIT_DELAY=1.5
) > "%INSTALL_DIR%\config\.env"

echo ✅ File configurazione creato

REM Script di monitoraggio
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo echo.
echo echo ============================================
echo echo   AI-ENCORE System Monitor
echo echo ============================================
echo echo.
echo python analytics_engine\cli_interface.py test --output-format pretty
echo echo.
echo echo ============================================
echo pause
) > "%INSTALL_DIR%\monitor_system.bat"

REM Script acquisizione dati
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo echo [%%date%% %%time%%] Avvio acquisizione dati
echo echo.
echo echo Acquisizione dati opzioni...
echo python data_pipeline\fetch_options_data.py ^>^> logs\acquisition.log 2^>^&1
echo echo Pausa per rate limiting...
echo timeout /t 120 /nobreak ^> nul
echo echo Acquisizione dati futures...
echo python data_pipeline\fetch_futures_volume.py ^>^> logs\acquisition.log 2^>^&1
echo echo [%%date%% %%time%%] Acquisizione completata
echo echo Controlla i log in: logs\acquisition.log
echo pause
) > "%INSTALL_DIR%\run_data_acquisition.bat"

REM Script test connessioni
(
echo @echo off
echo cd /d "%INSTALL_DIR%"
echo echo.
echo echo ============================================
echo echo   Test API e Connessioni AI-ENCORE
echo echo ============================================
echo echo.
echo echo Testing Finnhub API...
echo python analytics_engine\cli_interface.py basis --instrument ES --output-format pretty
echo echo.
echo echo Testing MT5 Connection...
echo python -c "import MetaTrader5 as mt5; print('✅ MT5 Available' if mt5.initialize() else '❌ MT5 Not Connected'); mt5.shutdown() if mt5.initialize() else None"
echo echo.
echo echo ============================================
echo pause
) > "%INSTALL_DIR%\test_connections.bat"

echo ✅ Script di utilità creati
echo.

REM ====================================================================
REM STEP 6: Copia file del sistema (se disponibili)
REM ====================================================================
echo 🔄 STEP 6: Setup file sistema...

REM Cerca file del progetto nella directory corrente
set SOURCE_DIR=%~dp0

echo 📁 Directory sorgente: %SOURCE_DIR%

if exist "%SOURCE_DIR%data_pipeline\fetch_options_data.py" (
    copy "%SOURCE_DIR%data_pipeline\*.py" "%INSTALL_DIR%\data_pipeline\" >nul 2>&1
    echo ✅ File data_pipeline copiati
) else (
    echo ⚠️  File data_pipeline non trovati - dovrai copiarli manualmente
)

if exist "%SOURCE_DIR%analytics_engine\structural_levels.py" (
    copy "%SOURCE_DIR%analytics_engine\*.py" "%INSTALL_DIR%\analytics_engine\" >nul 2>&1
    echo ✅ File analytics_engine copiati
) else (
    echo ⚠️  File analytics_engine non trovati - dovrai copiarli manualmente
)

if exist "%SOURCE_DIR%backend\analysis\structural-analyzer.ts" (
    copy "%SOURCE_DIR%backend\analysis\*.ts" "%INSTALL_DIR%\backend\analysis\" >nul 2>&1
    echo ✅ File backend copiati  
) else (
    echo ⚠️  File backend non trovati - dovrai copiarli manualmente
)

echo.

REM ====================================================================
REM STEP 7: Test del sistema
REM ====================================================================
echo 🔄 STEP 7: Test del sistema...

cd /d "%INSTALL_DIR%"

echo Test import moduli Python...
python -c "
try:
    import pandas, numpy, requests, pdfplumber, MetaTrader5, finnhub
    print('✅ Tutti i moduli importati correttamente')
except ImportError as e:
    print(f'❌ Errore import: {e}')
" 2>nul

REM Test CLI se disponibile
if exist "analytics_engine\cli_interface.py" (
    echo Test CLI interface...
    python analytics_engine\cli_interface.py test --quick >nul 2>&1
    if %errorLevel% equ 0 (
        echo ✅ Test CLI completato
    ) else (
        echo ⚠️  Test CLI parzialmente fallito ^(normale se MT5 non configurato^)
    )
) else (
    echo ⚠️  CLI interface non disponibile
)

echo.

REM ====================================================================
REM STEP 8: Configurazione Task Scheduler
REM ====================================================================
echo 🔄 STEP 8: Configurazione Task Scheduler...

echo Creazione task per acquisizione dati giornaliera...
schtasks /create /tn "AI-ENCORE Daily Data Acquisition" /tr "%INSTALL_DIR%\run_data_acquisition.bat" /sc daily /st 07:00 /ru SYSTEM /f >nul 2>&1

if %errorLevel% equ 0 (
    echo ✅ Task giornaliero creato ^(ore 07:00^)
) else (
    echo ⚠️  Errore creazione task - configura manualmente
)

echo.

REM ====================================================================
REM COMPLETAMENTO
REM ====================================================================
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 🎉 INSTALLAZIONE COMPLETATA! 🎉             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 📁 Sistema installato in: %INSTALL_DIR%
echo.
echo ⚠️  AZIONI MANUALI RICHIESTE:
echo.
echo 1. 🔧 Configura MetaTrader 5:
echo    - Apri MT5 e imposta il tuo account broker
echo    - Testa la connessione
echo.
echo 2. ✏️  Modifica configurazione:
echo    - Apri: %INSTALL_DIR%\config\.env
echo    - Inserisci i tuoi dati MT5 ^(login, password, server^)
echo.
echo 3. 🧪 Esegui test:
echo    - Clicca: %INSTALL_DIR%\test_connections.bat
echo    - Verifica che tutto funzioni
echo.
echo 4. 🚀 Prima acquisizione dati:
echo    - Clicca: %INSTALL_DIR%\run_data_acquisition.bat
echo    - Controlla che i file vengano creati in data_lake\
echo.
echo 📊 SCRIPT DISPONIBILI:
echo    • monitor_system.bat         - Stato sistema
echo    • run_data_acquisition.bat   - Acquisizione manuale dati
echo    • test_connections.bat       - Test API e connessioni
echo.
echo 📅 PROGRAMMAZIONE AUTOMATICA:
echo    • Acquisizione dati: ogni giorno ore 07:00
echo    • Controlla: Pannello di controllo ^> Utilità di pianificazione
echo.
echo 🔥 Il tuo sistema AI-ENCORE con analisi strutturale è pronto!
echo.

REM Crea guida rapida
(
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║                    AI-ENCORE VPS - GUIDA RAPIDA                 ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.
echo 📁 INSTALLAZIONE: %INSTALL_DIR%
echo.
echo 🔧 NEXT STEPS OBBLIGATORI:
echo    1. Configura account MetaTrader 5
echo    2. Modifica config\.env con i tuoi dati MT5
echo    3. Esegui test_connections.bat
echo    4. Esegui run_data_acquisition.bat per primo test
echo.
echo 🚀 SCRIPT PRINCIPALI:
echo    • monitor_system.bat       - Controlla stato sistema
echo    • run_data_acquisition.bat - Acquisisce dati manualmente
echo    • test_connections.bat     - Testa API e MT5
echo.
echo 📊 DIRECTORIES:
echo    • data_lake\     - Dati acquisiti ^(file CSV^)
echo    • logs\          - File di log sistema  
echo    • config\.env    - Configurazione principale
echo.
echo ⏰ AUTOMATIZZAZIONE:
echo    • Task Scheduler configurato per acquisizione ore 07:00
echo    • Controlla: Pannello di controllo ^> Utilità di pianificazione
echo.
echo 🆘 TROUBLESHOOTING:
echo    • Controlla logs\ per errori
echo    • Verifica connessione internet
echo    • Assicurati che MT5 sia in esecuzione
echo    • Verifica dati in config\.env
echo.
echo 🎯 RISULTATO ATTESO:
echo    Il sistema acquisirà automaticamente dati strutturali e
echo    calcolerà basis per migliorare la qualità dei segnali AI-ENCORE
echo.
) > "%INSTALL_DIR%\GUIDA_RAPIDA.txt"

echo 📋 Guida rapida salvata in: %INSTALL_DIR%\GUIDA_RAPIDA.txt
echo.

echo Vuoi aprire la directory di installazione? ^(S/N^)
set /p OPEN_DIR="Scelta: "
if /i "%OPEN_DIR%"=="S" (
    start "" "%INSTALL_DIR%"
)

echo.
echo Grazie per aver installato AI-ENCORE! 🚀
pause