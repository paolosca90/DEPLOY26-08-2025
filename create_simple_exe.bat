@echo off
REM ====================================================================
REM AI-ENCORE Simple EXE Creator
REM Crea un EXE semplice usando il convertitore bat-to-exe integrato
REM ====================================================================

title AI-ENCORE EXE Creator

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              AI-ENCORE Simple EXE Creator                   ║  
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Crea installer batch ultra-semplificato
echo 🔄 Creazione installer semplificato...

(
echo @echo off
echo title AI-ENCORE VPS Auto Installer
echo.
echo echo ╔══════════════════════════════════════════════════════════════╗
echo echo ║                  AI-ENCORE VPS INSTALLER                    ║
echo echo ║                                                              ║
echo echo ║  Installer automatico per sistema analisi strutturale      ║
echo echo ╚══════════════════════════════════════════════════════════════╝
echo echo.
echo.
echo REM Verifica admin
echo net session ^>nul 2^>^&1
echo if %%errorLevel%% neq 0 ^(
echo     echo ❌ ERRORE: Esegui come Amministratore!
echo     echo.
echo     echo 💡 Clicca destro su questo file e seleziona
echo     echo    "Esegui come amministratore"
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo ✅ Privilegi amministratore OK
echo echo.
echo.
echo REM Variabili
echo set INSTALL_DIR=C:\AI-ENCORE-System
echo set API_KEY=d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg
echo.
echo echo 📁 Directory: %%INSTALL_DIR%%
echo echo 🔑 API Key configurata
echo echo.
echo.
echo REM Step 1: Directory
echo echo 🔄 STEP 1: Creazione directory...
echo if exist "%%INSTALL_DIR%%" rmdir /s /q "%%INSTALL_DIR%%" ^>nul 2^>^&1
echo mkdir "%%INSTALL_DIR%%" 2^>nul
echo mkdir "%%INSTALL_DIR%%\data_pipeline" 2^>nul
echo mkdir "%%INSTALL_DIR%%\analytics_engine" 2^>nul  
echo mkdir "%%INSTALL_DIR%%\backend\analysis" 2^>nul
echo mkdir "%%INSTALL_DIR%%\data_lake" 2^>nul
echo mkdir "%%INSTALL_DIR%%\logs" 2^>nul
echo mkdir "%%INSTALL_DIR%%\config" 2^>nul
echo echo ✅ Directory create
echo echo.
echo.
echo REM Step 2: Python
echo echo 🔄 STEP 2: Verifica Python...
echo python --version ^>nul 2^>^&1
echo if %%errorLevel%% equ 0 ^(
echo     echo ✅ Python già installato
echo     python --version
echo ^) else ^(
echo     echo ⬇️ Download Python...
echo     powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile '%%TEMP%%\python.exe'"
echo     echo 🔄 Installazione Python...
echo     "%%TEMP%%\python.exe" /quiet InstallAllUsers=1 PrependPath=1
echo     del "%%TEMP%%\python.exe" ^>nul 2^>^&1
echo     echo ✅ Python installato
echo ^)
echo echo.
echo.
echo REM Step 3: Dipendenze  
echo echo 🔄 STEP 3: Installazione dipendenze...
echo python -m pip install --upgrade pip --quiet
echo python -m pip install pandas numpy requests pdfplumber MetaTrader5 finnhub-python --quiet
echo echo ✅ Dipendenze installate
echo echo.
echo.
echo REM Step 4: MetaTrader 5
echo echo 🔄 STEP 4: MetaTrader 5...
echo if exist "%%ProgramFiles%%\MetaTrader 5\terminal64.exe" ^(
echo     echo ✅ MT5 già installato  
echo ^) else ^(
echo     echo ⬇️ Download MT5...
echo     powershell -Command "Invoke-WebRequest -Uri 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' -OutFile '%%TEMP%%\mt5.exe'"
echo     echo 🔄 Avvio installer MT5...
echo     "%%TEMP%%\mt5.exe"
echo     echo ✅ MT5 installer avviato
echo ^)
echo echo.
echo.
echo REM Step 5: Configurazione
echo echo 🔄 STEP 5: File di configurazione...
echo ^(
echo echo # AI-ENCORE System Configuration
echo echo FINNHUB_API_KEY=%%API_KEY%%
echo echo.
echo echo # MT5 Configuration ^(MODIFICA CON I TUOI DATI^)
echo echo MT5_LOGIN=your_account_number  
echo echo MT5_PASSWORD=your_password
echo echo MT5_SERVER=your_broker_server
echo echo.
echo echo # Paths
echo echo INSTALL_PATH=%%INSTALL_DIR%%
echo echo DATA_LAKE_PATH=%%INSTALL_DIR%%\data_lake
echo echo LOG_PATH=%%INSTALL_DIR%%\logs
echo ^) ^> "%%INSTALL_DIR%%\config\.env"
echo echo ✅ Configurazione creata
echo echo.
echo.
echo REM Step 6: Script utilità
echo echo 🔄 STEP 6: Script di utilità...
echo ^(
echo echo @echo off
echo echo cd /d "%%INSTALL_DIR%%"
echo echo echo ============================================
echo echo echo   AI-ENCORE System Monitor  
echo echo echo ============================================
echo echo python -c "import sys; print^('Python:', sys.version^); [print^(f'✅ {m}'^) if not __import__^(m, fromlist=['']^) else None for m in ['pandas','numpy','requests','MetaTrader5']]; import MetaTrader5 as mt5; print^('✅ MT5 Connected' if mt5.initialize^(^) else '❌ MT5 Disconnected'^); mt5.shutdown^(^)"
echo echo pause
echo ^) ^> "%%INSTALL_DIR%%\monitor.bat"
echo.
echo ^(
echo echo @echo off  
echo echo cd /d "%%INSTALL_DIR%%"
echo echo echo Testing Finnhub API...
echo echo python -c "import requests; r=requests.get^('https://finnhub.io/api/v1/quote?symbol=AAPL^&token=%%API_KEY%%'^); print^('✅ API Working - AAPL:', r.json^(^).get^('c'^) if r.status_code==200 else '❌ API Error'^)"
echo echo echo Testing MT5...
echo echo python -c "import MetaTrader5 as mt5; print^('✅ MT5 OK' if mt5.initialize^(^) else '❌ MT5 Error'^); mt5.shutdown^(^) if mt5.initialize^(^) else None"
echo echo pause
echo ^) ^> "%%INSTALL_DIR%%\test_connections.bat"
echo echo ✅ Script creati
echo echo.
echo.
echo REM Step 7: Task Scheduler
echo echo 🔄 STEP 7: Task programmato...
echo schtasks /create /tn "AI-ENCORE Daily" /tr "%%INSTALL_DIR%%\monitor.bat" /sc daily /st 07:00 /ru SYSTEM /f ^>nul 2^>^&1
echo if %%errorLevel%% equ 0 ^(
echo     echo ✅ Task giornaliero creato ^(07:00^)
echo ^) else ^(  
echo     echo ⚠️ Task non creato - configura manualmente
echo ^)
echo echo.
echo.
echo REM Completamento
echo echo ╔══════════════════════════════════════════════════════════════╗
echo echo ║                 🎉 INSTALLAZIONE COMPLETATA! 🎉             ║
echo echo ╚══════════════════════════════════════════════════════════════╝
echo echo.
echo echo 📁 Sistema installato in: %%INSTALL_DIR%%
echo echo.
echo echo ⚠️ AZIONI MANUALI RICHIESTE:
echo echo.
echo echo 1. 🔧 Configura MetaTrader 5 con il tuo account
echo echo 2. ✏️ Modifica: %%INSTALL_DIR%%\config\.env  
echo echo 3. 📁 Copia file Python del progetto AI-ENCORE
echo echo 4. 🧪 Esegui: %%INSTALL_DIR%%\test_connections.bat
echo echo.
echo echo 🎯 Il sistema è pronto per l'analisi strutturale!
echo echo.
echo echo Vuoi aprire la directory? ^(S/N^)
echo set /p OPEN=Scelta: 
echo if /i "%%OPEN%%"=="S" start "" "%%INSTALL_DIR%%"
echo echo.
echo echo 🔥 AI-ENCORE con analisi strutturale installato!
echo pause
) > "AI-ENCORE-Simple-Installer.bat"

echo ✅ Installer BAT creato: AI-ENCORE-Simple-Installer.bat
echo.

REM Cerca Bat to Exe converter
echo 🔍 Ricerca converter BAT to EXE...

REM Lista di possibili converter
set "CONVERTER1=%ProgramFiles%\Bat To Exe Converter\Bat_To_Exe_Converter.exe"
set "CONVERTER2=%ProgramFiles(x86)%\Bat To Exe Converter\Bat_To_Exe_Converter.exe"
set "CONVERTER3=%USERPROFILE%\Desktop\Bat_To_Exe_Converter.exe"

REM Prova i converter
if exist "%CONVERTER1%" (
    echo ✅ Trovato converter, creazione EXE...
    "%CONVERTER1%" /bat "AI-ENCORE-Simple-Installer.bat" /exe "AI-ENCORE-Simple-Installer.exe" /x64 /invisible
    echo ✅ EXE creato!
    goto :success
)

if exist "%CONVERTER2%" (
    echo ✅ Trovato converter, creazione EXE...
    "%CONVERTER2%" /bat "AI-ENCORE-Simple-Installer.bat" /exe "AI-ENCORE-Simple-Installer.exe" /x64 /invisible
    echo ✅ EXE creato!
    goto :success
)

if exist "%CONVERTER3%" (
    echo ✅ Trovato converter, creazione EXE...
    "%CONVERTER3%" /bat "AI-ENCORE-Simple-Installer.bat" /exe "AI-ENCORE-Simple-Installer.exe" /x64 /invisible
    echo ✅ EXE creato!
    goto :success
)

REM Se non trova converter
echo ⚠️ Converter BAT to EXE non trovato
echo.
echo 💡 SOLUZIONI:
echo.
echo OPZIONE A - Usa il file BAT direttamente:
echo   • Copia AI-ENCORE-Simple-Installer.bat sulla VPS
echo   • Clicca destro → "Esegui come amministratore" 
echo.
echo OPZIONE B - Scarica converter gratuito:
echo   • Vai su: https://www.f2ko.de/en/b2e.php
echo   • Scarica "Bat To Exe Converter"
echo   • Installa e ri-esegui questo script
echo.
echo OPZIONE C - Usa Python per creare EXE:
echo   • Esegui: python installer_exe_builder.py
echo.
goto :end

:success
echo.
echo 🎉 SUCCESSO! File creati:
echo   • AI-ENCORE-Simple-Installer.exe  (EXE per VPS)
echo   • AI-ENCORE-Simple-Installer.bat  (BAT alternativo)
echo.
echo 🚀 COME USARE SULLA VPS:
echo   1. Copia AI-ENCORE-Simple-Installer.exe sulla VPS
echo   2. Clicca destro → "Esegui come amministratore"
echo   3. Segui le istruzioni automatiche
echo   4. Configura MT5 e modifica .env come richiesto
echo.
echo 💡 L'EXE farà tutto automaticamente in 5-10 minuti!

:end
echo.
pause