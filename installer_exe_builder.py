#!/usr/bin/env python3
"""
AI-ENCORE VPS Installer - EXE Builder
Questo script crea un file EXE auto-contenuto che installa tutto il sistema.
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

# Il codice dell'installer che sarà compilato in EXE
INSTALLER_CODE = '''
import os
import sys
import subprocess
import urllib.request
import zipfile
import shutil
import json
import time
import tempfile
from pathlib import Path
import tkinter as tk
from tkinter import messagebox, ttk, scrolledtext
import threading
import winreg

class AIEncoreInstaller:
    def __init__(self):
        self.install_dir = "C:\\AI-ENCORE-System"
        self.finnhub_api_key = "d290lv9r01qvka4rhvv0d290lv9r01qvka4rhvvg"
        self.python_version = "3.11.7"
        
        # Setup GUI
        self.root = tk.Tk()
        self.root.title("AI-ENCORE VPS Installer")
        self.root.geometry("600x500")
        self.root.resizable(False, False)
        
        # Variabili GUI
        self.progress_var = tk.DoubleVar()
        self.status_var = tk.StringVar(value="Pronto per l'installazione...")
        
        self.setup_gui()
        
    def setup_gui(self):
        """Setup interfaccia grafica"""
        
        # Header
        header_frame = tk.Frame(self.root, bg="#2c3e50", height=80)
        header_frame.pack(fill="x")
        header_frame.pack_propagate(False)
        
        title_label = tk.Label(
            header_frame, 
            text="🚀 AI-ENCORE VPS INSTALLER", 
            font=("Arial", 16, "bold"),
            fg="white", 
            bg="#2c3e50"
        )
        title_label.pack(expand=True)
        
        # Info panel
        info_frame = tk.LabelFrame(self.root, text="Informazioni Installazione", padx=10, pady=10)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        info_text = f"""📁 Directory Installazione: {self.install_dir}
🔑 Finnhub API Key: {self.finnhub_api_key[:10]}...
🐍 Python Version: {self.python_version}
⏱️ Tempo stimato: 5-10 minuti"""
        
        tk.Label(info_frame, text=info_text, justify="left", font=("Consolas", 9)).pack()
        
        # Progress section
        progress_frame = tk.LabelFrame(self.root, text="Progresso Installazione", padx=10, pady=10)
        progress_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        self.progress_bar = ttk.Progressbar(
            progress_frame, 
            variable=self.progress_var, 
            maximum=100, 
            length=550
        )
        self.progress_bar.pack(pady=5)
        
        self.status_label = tk.Label(
            progress_frame, 
            textvariable=self.status_var, 
            font=("Arial", 9),
            fg="#2c3e50"
        )
        self.status_label.pack()
        
        # Log area
        self.log_area = scrolledtext.ScrolledText(
            progress_frame, 
            height=10, 
            font=("Consolas", 8),
            bg="#f8f9fa"
        )
        self.log_area.pack(fill="both", expand=True, pady=5)
        
        # Buttons
        button_frame = tk.Frame(self.root)
        button_frame.pack(fill="x", padx=10, pady=10)
        
        self.install_button = tk.Button(
            button_frame,
            text="🚀 INSTALLA AI-ENCORE",
            font=("Arial", 12, "bold"),
            bg="#27ae60",
            fg="white",
            height=2,
            command=self.start_installation
        )
        self.install_button.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        self.exit_button = tk.Button(
            button_frame,
            text="❌ Esci",
            font=("Arial", 10),
            bg="#e74c3c",
            fg="white",
            height=2,
            command=self.root.quit
        )
        self.exit_button.pack(side="right", padx=(5, 0))
        
    def log(self, message, level="INFO"):
        """Aggiungi messaggio al log"""
        timestamp = time.strftime("%H:%M:%S")
        
        icons = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌"}
        icon = icons.get(level, "•")
        
        log_message = f"[{timestamp}] {icon} {message}\\n"
        
        self.log_area.insert(tk.END, log_message)
        self.log_area.see(tk.END)
        self.root.update()
        
    def update_progress(self, value, status):
        """Aggiorna barra progresso e status"""
        self.progress_var.set(value)
        self.status_var.set(status)
        self.root.update()
        
    def start_installation(self):
        """Avvia installazione in thread separato"""
        self.install_button.config(state="disabled", text="⏳ Installazione in corso...")
        
        # Avvia installazione in thread separato per non bloccare GUI
        install_thread = threading.Thread(target=self.run_installation)
        install_thread.daemon = True
        install_thread.start()
        
    def check_admin_rights(self):
        """Verifica privilegi amministratore"""
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin()
        except:
            return False
            
    def download_file(self, url, filepath, description="file"):
        """Download file con progress"""
        self.log(f"Download {description} da {url[:50]}...")
        
        def progress_hook(block_num, block_size, total_size):
            if total_size > 0:
                percent = min(100, (block_num * block_size * 100) // total_size)
                self.update_progress(percent, f"Download {description}: {percent}%")
        
        try:
            urllib.request.urlretrieve(url, filepath, progress_hook)
            return True
        except Exception as e:
            self.log(f"Errore download {description}: {e}", "ERROR")
            return False
            
    def run_command(self, cmd, description="comando"):
        """Esegui comando con logging"""
        self.log(f"Esecuzione: {description}")
        try:
            result = subprocess.run(
                cmd, 
                shell=True, 
                capture_output=True, 
                text=True, 
                timeout=300
            )
            
            if result.returncode == 0:
                self.log(f"✅ {description} completato", "SUCCESS")
                return True
            else:
                self.log(f"❌ {description} fallito: {result.stderr}", "ERROR")
                return False
                
        except subprocess.TimeoutExpired:
            self.log(f"❌ {description} timeout", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Errore {description}: {e}", "ERROR")
            return False
    
    def create_directories(self):
        """Crea struttura directory"""
        self.update_progress(10, "Creazione directory...")
        
        directories = [
            self.install_dir,
            f"{self.install_dir}\\\\data_pipeline",
            f"{self.install_dir}\\\\analytics_engine", 
            f"{self.install_dir}\\\\backend\\\\analysis",
            f"{self.install_dir}\\\\data_lake",
            f"{self.install_dir}\\\\logs",
            f"{self.install_dir}\\\\config"
        ]
        
        try:
            for dir_path in directories:
                Path(dir_path).mkdir(parents=True, exist_ok=True)
            
            self.log("Directory create con successo", "SUCCESS")
            return True
        except Exception as e:
            self.log(f"Errore creazione directory: {e}", "ERROR")
            return False
    
    def install_python(self):
        """Installa Python se necessario"""
        self.update_progress(20, "Verifica/Installazione Python...")
        
        # Controlla se Python è già installato
        try:
            result = subprocess.run(["python", "--version"], capture_output=True, text=True)
            if result.returncode == 0 and "Python 3" in result.stdout:
                self.log(f"Python già installato: {result.stdout.strip()}", "SUCCESS")
                return True
        except:
            pass
        
        # Download e installazione Python
        self.log("Python non trovato, installazione in corso...")
        
        python_url = f"https://www.python.org/ftp/python/{self.python_version}/python-{self.python_version}-amd64.exe"
        python_installer = f"{tempfile.gettempdir()}\\\\python-{self.python_version}-amd64.exe"
        
        if not self.download_file(python_url, python_installer, "Python installer"):
            return False
        
        # Installazione silenziosa
        install_cmd = f'"{python_installer}" /quiet InstallAllUsers=1 PrependPath=1 Include_test=0'
        
        if self.run_command(install_cmd, "Installazione Python"):
            # Cleanup
            try:
                os.remove(python_installer)
            except:
                pass
            
            # Aggiorna PATH per questa sessione
            self.update_system_path()
            
            return True
        
        return False
    
    def update_system_path(self):
        """Aggiorna PATH di sistema"""
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                              "SYSTEM\\\\CurrentControlSet\\\\Control\\\\Session Manager\\\\Environment",
                              0, winreg.KEY_READ) as key:
                path_value, _ = winreg.QueryValueEx(key, "Path")
                os.environ["PATH"] = path_value + ";" + os.environ["PATH"]
        except:
            pass
    
    def install_python_packages(self):
        """Installa dipendenze Python"""
        self.update_progress(40, "Installazione dipendenze Python...")
        
        packages = [
            "pandas>=1.5.0",
            "numpy>=1.24.0",
            "requests>=2.28.0", 
            "pdfplumber>=0.7.0",
            "MetaTrader5>=5.0.45",
            "finnhub-python>=2.4.0"
        ]
        
        # Aggiorna pip
        if not self.run_command("python -m pip install --upgrade pip --quiet", "Aggiornamento pip"):
            return False
        
        # Installa ogni pacchetto
        for i, package in enumerate(packages):
            progress = 40 + (i + 1) * 5
            self.update_progress(progress, f"Installazione {package.split('>=')[0]}...")
            
            if not self.run_command(f"python -m pip install {package} --quiet", f"Installazione {package}"):
                self.log(f"Continuo con altri pacchetti...", "WARNING")
        
        return True
    
    def install_metatrader5(self):
        """Installa MetaTrader 5"""
        self.update_progress(70, "Download MetaTrader 5...")
        
        # Controlla se MT5 è già installato
        mt5_paths = [
            "C:\\\\Program Files\\\\MetaTrader 5\\\\terminal64.exe",
            "C:\\\\Program Files (x86)\\\\MetaTrader 5\\\\terminal64.exe"
        ]
        
        for path in mt5_paths:
            if os.path.exists(path):
                self.log("MetaTrader 5 già installato", "SUCCESS")
                return True
        
        # Download MT5
        mt5_url = "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"
        mt5_installer = f"{tempfile.gettempdir()}\\\\mt5setup.exe"
        
        if self.download_file(mt5_url, mt5_installer, "MetaTrader 5"):
            self.log("⚠️ Avvio installazione MT5 - configura il tuo account!", "WARNING")
            
            try:
                subprocess.Popen([mt5_installer])
                self.log("Installer MT5 avviato", "SUCCESS")
                
                # Aspetta un po' prima di pulire
                time.sleep(3)
                try:
                    os.remove(mt5_installer)
                except:
                    pass
                    
                return True
            except Exception as e:
                self.log(f"Errore avvio installer MT5: {e}", "ERROR")
        
        return False
    
    def create_config_files(self):
        """Crea file di configurazione"""
        self.update_progress(80, "Creazione file di configurazione...")
        
        # File .env
        env_content = f"""# AI-ENCORE System Configuration
FINNHUB_API_KEY={self.finnhub_api_key}

# MT5 Configuration (MODIFICA CON I TUOI DATI)
MT5_LOGIN=your_account_number
MT5_PASSWORD=your_password
MT5_SERVER=your_broker_server

# System Paths
INSTALL_PATH={self.install_dir}
DATA_LAKE_PATH={self.install_dir}\\\\data_lake
LOG_PATH={self.install_dir}\\\\logs

# Settings
BASIS_CACHE_DURATION=30
PRICE_CACHE_DURATION=15
RATE_LIMIT_DELAY=1.5
"""
        
        try:
            with open(f"{self.install_dir}\\\\config\\\\.env", "w", encoding="utf-8") as f:
                f.write(env_content)
            
            self.log("File configurazione creato", "SUCCESS")
        except Exception as e:
            self.log(f"Errore creazione configurazione: {e}", "ERROR")
            return False
        
        # Script utilità
        self.create_utility_scripts()
        
        return True
    
    def create_utility_scripts(self):
        """Crea script di utilità"""
        
        # Monitor script
        monitor_script = f"""@echo off
cd /d "{self.install_dir}"
echo.
echo ============================================
echo   AI-ENCORE System Monitor
echo ============================================
echo.

python -c "
import sys
print('Python version:', sys.version)
print('Install path:', sys.executable)

# Test imports
modules = ['pandas', 'numpy', 'requests', 'pdfplumber', 'MetaTrader5']
for mod in modules:
    try:
        __import__(mod)
        print(f'✅ {{mod}}')
    except ImportError:
        print(f'❌ {{mod}} - MISSING')
        
# Test MT5
try:
    import MetaTrader5 as mt5
    if mt5.initialize():
        account = mt5.account_info()
        if account:
            print(f'✅ MT5 Connected - Account: {{account.login}}')
        else:
            print('⚠️ MT5 Initialized but no account info')
        mt5.shutdown()
    else:
        print('❌ MT5 Cannot initialize')
except Exception as e:
    print(f'❌ MT5 Error: {{e}}')
"

echo.
echo ============================================
pause
"""
        
        # Data acquisition script
        data_script = f"""@echo off
cd /d "{self.install_dir}"
echo [%date% %time%] Avvio acquisizione dati AI-ENCORE
echo.

echo Testing API connection...
python -c "
import requests
import os
os.environ['FINNHUB_API_KEY'] = '{self.finnhub_api_key}'

try:
    resp = requests.get('https://finnhub.io/api/v1/quote?symbol=AAPL&token={self.finnhub_api_key}', timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        print(f'✅ Finnhub API working - AAPL: ${{data.get(\"c\", \"N/A\")}}')
    else:
        print(f'❌ Finnhub API error: {{resp.status_code}}')
except Exception as e:
    print(f'❌ API test failed: {{e}}')
"

echo.
echo ⚠️ Per acquisizione dati completa, copia i file Python del progetto in:
echo    {self.install_dir}\\\\data_pipeline\\\\
echo    {self.install_dir}\\\\analytics_engine\\\\
echo.
pause
"""
        
        # Test connections script
        test_script = f"""@echo off
cd /d "{self.install_dir}"
echo.
echo ============================================
echo   Test Connessioni AI-ENCORE
echo ============================================
echo.

echo 🔑 Testing Finnhub API...
python -c "
import requests
try:
    resp = requests.get('https://finnhub.io/api/v1/quote?symbol=AAPL&token={self.finnhub_api_key}', timeout=10)
    if resp.status_code == 200:
        print('✅ Finnhub API working')
    else:
        print(f'❌ API error: {{resp.status_code}}')
except Exception as e:
    print(f'❌ API error: {{e}}')
"

echo.
echo 🔗 Testing MT5 Connection...
python -c "
try:
    import MetaTrader5 as mt5
    print('✅ MT5 module available')
    
    if mt5.initialize():
        print('✅ MT5 initialized')
        account = mt5.account_info()
        if account:
            print(f'✅ Account connected: {{account.login}}')
            print(f'💰 Balance: ${{account.balance}}')
        else:
            print('⚠️ MT5 initialized but no account configured')
        mt5.shutdown()
    else:
        print('❌ Cannot initialize MT5')
        print('💡 Make sure MT5 is installed and account is configured')
except ImportError:
    print('❌ MT5 module not available')
except Exception as e:
    print(f'❌ MT5 error: {{e}}')
"

echo.
echo ============================================
pause
"""
        
        # Salva script
        scripts = [
            ("monitor_system.bat", monitor_script),
            ("run_data_acquisition.bat", data_script),
            ("test_connections.bat", test_script)
        ]
        
        for filename, content in scripts:
            try:
                with open(f"{self.install_dir}\\\\{filename}", "w", encoding="utf-8") as f:
                    f.write(content)
                self.log(f"Script {filename} creato", "SUCCESS")
            except Exception as e:
                self.log(f"Errore creazione {filename}: {e}", "ERROR")
    
    def create_scheduled_task(self):
        """Crea task programmato"""
        self.update_progress(90, "Configurazione task programmato...")
        
        task_cmd = f'schtasks /create /tn "AI-ENCORE Daily Data" /tr "{self.install_dir}\\\\run_data_acquisition.bat" /sc daily /st 07:00 /ru SYSTEM /f'
        
        if self.run_command(task_cmd, "Creazione task programmato"):
            self.log("Task giornaliero configurato (ore 07:00)", "SUCCESS")
        else:
            self.log("Task programmato non creato - configuralo manualmente", "WARNING")
    
    def create_quick_guide(self):
        """Crea guida rapida"""
        guide_content = f"""╔══════════════════════════════════════════════════════════════════╗
║                    AI-ENCORE VPS - GUIDA RAPIDA                 ║
╚══════════════════════════════════════════════════════════════════╝

📁 INSTALLAZIONE COMPLETATA IN: {self.install_dir}

🔧 AZIONI MANUALI RICHIESTE:

1. 🏦 Configura MetaTrader 5:
   - Apri MT5 dalla directory installazione o Start Menu
   - File > Login to Trade Account 
   - Inserisci: Login, Password, Server del tuo broker

2. ✏️ Modifica configurazione sistema:
   - Apri: {self.install_dir}\\\\config\\\\.env
   - Sostituisci "your_account_number" con il tuo login MT5
   - Sostituisci "your_password" con la tua password MT5
   - Sostituisci "your_broker_server" con il server del tuo broker

3. 📁 Copia file del progetto AI-ENCORE:
   - Copia i file .py del progetto nelle directory:
     • data_pipeline\\\\*.py
     • analytics_engine\\\\*.py
     • backend\\\\analysis\\\\*.ts

🚀 SCRIPT PRONTI:
   • monitor_system.bat         - Controllo stato sistema
   • run_data_acquisition.bat   - Test acquisizione dati
   • test_connections.bat       - Test API Finnhub e MT5

📊 DIRECTORY IMPORTANTI:
   • data_lake\\\\     - Qui verranno salvati i dati CSV
   • logs\\\\          - File di log del sistema
   • config\\\\        - File di configurazione

⏰ TASK PROGRAMMATO:
   • Nome: "AI-ENCORE Daily Data"
   • Orario: 07:00 ogni giorno
   • Controlla: Pannello di controllo > Utilità di pianificazione

🎯 RISULTATO FINALE:
   Il sistema acquisirà automaticamente dati strutturali dai mercati
   futures e opzioni per migliorare la qualità dei segnali AI-ENCORE
   con analisi di confluenza e basis real-time.

🆘 TROUBLESHOOTING:
   • Esegui test_connections.bat per verificare API e MT5
   • Controlla logs\\\\ per eventuali errori
   • Assicurati che MT5 sia in esecuzione per i prezzi CFD
   • Verifica connessione internet per API Finnhub

🔥 Il tuo sistema di analisi strutturale è installato!
   Completa la configurazione manuale sopra per renderlo operativo.
"""
        
        try:
            with open(f"{self.install_dir}\\\\GUIDA_RAPIDA.txt", "w", encoding="utf-8") as f:
                f.write(guide_content)
            self.log("Guida rapida creata", "SUCCESS")
        except Exception as e:
            self.log(f"Errore creazione guida: {e}", "ERROR")
    
    def final_test(self):
        """Test finale del sistema"""
        self.update_progress(95, "Test finale sistema...")
        
        # Test Python imports
        test_cmd = 'python -c "import pandas, numpy, requests; print(\\'✅ Core modules OK\\')"'
        
        if self.run_command(test_cmd, "Test moduli Python"):
            self.log("Sistema base verificato", "SUCCESS")
        else:
            self.log("Alcuni moduli potrebbero non essere installati", "WARNING")
    
    def run_installation(self):
        """Esegui installazione completa"""
        try:
            # Verifica privilegi admin
            if not self.check_admin_rights():
                messagebox.showerror(
                    "Privilegi Amministratore",
                    "Questo installer deve essere eseguito come Amministratore!\\n\\n"
                    "Clicca destro sull\\'EXE e seleziona \\'Esegui come amministratore\\'"
                )
                return
            
            self.log("Avvio installazione AI-ENCORE VPS...", "SUCCESS")
            
            steps = [
                (self.create_directories, "Creazione directory"),
                (self.install_python, "Installazione Python"),
                (self.install_python_packages, "Installazione dipendenze Python"), 
                (self.install_metatrader5, "Installazione MetaTrader 5"),
                (self.create_config_files, "Creazione configurazione"),
                (self.create_scheduled_task, "Configurazione task programmato"),
                (self.create_quick_guide, "Creazione documentazione"),
                (self.final_test, "Test finale")
            ]
            
            success_count = 0
            
            for i, (step_func, step_name) in enumerate(steps):
                self.log(f"Esecuzione: {step_name}")
                
                try:
                    if step_func():
                        success_count += 1
                        self.log(f"✅ {step_name} completato", "SUCCESS")
                    else:
                        self.log(f"⚠️ {step_name} parzialmente fallito", "WARNING")
                except Exception as e:
                    self.log(f"❌ Errore in {step_name}: {e}", "ERROR")
            
            # Completamento
            self.update_progress(100, "Installazione completata!")
            
            if success_count >= 6:  # La maggior parte degli step
                self.log("🎉 INSTALLAZIONE COMPLETATA CON SUCCESSO!", "SUCCESS")
                self.log("📋 Leggi la GUIDA_RAPIDA.txt per i prossimi passi", "INFO")
                
                # Mostra risultato finale
                result_msg = f"""🎉 AI-ENCORE INSTALLATO CON SUCCESSO!

📁 Installato in: {self.install_dir}

✅ Completato: {success_count}/{len(steps)} passaggi

🔧 NEXT STEPS OBBLIGATORI:
1. Configura MetaTrader 5 con il tuo account
2. Modifica {self.install_dir}\\\\config\\\\.env
3. Copia i file Python del progetto AI-ENCORE
4. Esegui test_connections.bat

📋 Leggi la guida completa in:
{self.install_dir}\\\\GUIDA_RAPIDA.txt

Vuoi aprire la directory di installazione?"""
                
                if messagebox.askyesno("Installazione Completata", result_msg):
                    os.startfile(self.install_dir)
                
            else:
                self.log("⚠️ Installazione completata con alcuni errori", "WARNING")
                messagebox.showwarning(
                    "Installazione Parziale", 
                    "L\\'installazione è completata ma alcuni componenti potrebbero "
                    "richiedere configurazione manuale. Controlla i log sopra."
                )
            
            # Riabilita pulsante
            self.install_button.config(
                state="normal", 
                text="✅ Installazione Completata",
                bg="#27ae60"
            )
            
        except Exception as e:
            self.log(f"❌ Errore critico installazione: {e}", "ERROR")
            messagebox.showerror("Errore Installazione", f"Errore critico: {e}")
            
            self.install_button.config(
                state="normal", 
                text="❌ Installazione Fallita",
                bg="#e74c3c"
            )
    
    def run(self):
        """Avvia GUI installer"""
        self.log("AI-ENCORE VPS Installer avviato", "INFO")
        self.log("Clicca 'INSTALLA AI-ENCORE' per iniziare", "INFO")
        
        self.root.mainloop()

if __name__ == "__main__":
    # Verifica Windows
    if os.name != "nt":
        print("❌ Questo installer è progettato per Windows")
        sys.exit(1)
    
    # Avvia installer
    installer = AIEncoreInstaller()
    installer.run()
'''

def create_exe_installer():
    """Crea l'installer EXE usando PyInstaller"""
    print("🔥 AI-ENCORE EXE Installer Builder")
    print("=" * 50)
    
    # Installa PyInstaller se necessario
    print("📦 Verifica PyInstaller...")
    try:
        import PyInstaller
        print("✅ PyInstaller già installato")
    except ImportError:
        print("⬇️ Installazione PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        print("✅ PyInstaller installato")
    
    # Crea file temporaneo con il codice dell'installer
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as temp_file:
        temp_file.write(INSTALLER_CODE)
        temp_script = temp_file.name
    
    try:
        print("🔨 Compilazione EXE in corso...")
        
        # Comando PyInstaller per creare EXE
        cmd = [
            sys.executable, "-m", "PyInstaller",
            "--onefile",                    # Singolo file EXE
            "--windowed",                   # GUI (no console)
            "--name", "AI-ENCORE-Installer", # Nome EXE
            "--icon", "NONE",               # Nessuna icona custom
            "--add-data", f"{temp_script};.", # Include script
            "--hidden-import", "tkinter",
            "--hidden-import", "urllib.request",
            "--hidden-import", "winreg",
            "--distpath", str(Path(__file__).parent), # Output nella directory corrente
            temp_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            exe_path = Path(__file__).parent / "AI-ENCORE-Installer.exe"
            
            if exe_path.exists():
                size_mb = exe_path.stat().st_size / (1024 * 1024)
                
                print(f"🎉 EXE creato con successo!")
                print(f"📁 File: {exe_path}")
                print(f"💾 Dimensione: {size_mb:.1f} MB")
                print()
                print("🚀 COME USARE:")
                print("1. Copia AI-ENCORE-Installer.exe sulla VPS")
                print("2. Clicca destro → 'Esegui come amministratore'")
                print("3. Clicca 'INSTALLA AI-ENCORE' e aspetta")
                print("4. Segui la guida rapida generata")
                print()
                print("✨ L'installer EXE farà tutto automaticamente!")
                
                return str(exe_path)
            else:
                print("❌ File EXE non trovato dopo compilazione")
                return None
        else:
            print("❌ Errore compilazione PyInstaller:")
            print(result.stderr)
            return None
            
    finally:
        # Cleanup
        try:
            os.unlink(temp_script)
            
            # Rimuovi directory build e spec file
            build_dir = Path(__file__).parent / "build"
            if build_dir.exists():
                shutil.rmtree(build_dir)
            
            spec_file = Path(__file__).parent / "AI-ENCORE-Installer.spec"
            if spec_file.exists():
                spec_file.unlink()
                
        except Exception as e:
            print(f"⚠️ Warning cleanup: {e}")

if __name__ == "__main__":
    create_exe_installer()