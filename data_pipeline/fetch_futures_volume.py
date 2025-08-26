#!/usr/bin/env python3
"""
Script per l'acquisizione giornaliera dei dati volumetrici intraday dei contratti futures.
Utilizza l'API gratuita di Finnhub.io per ottenere i dati OHLCV con risoluzione di 5 o 15 minuti.

Funzionalità principali:
- Connessione API Finnhub con gestione rate limiting
- Download dati intraday per E-mini S&P 500 e E-mini Nasdaq 100
- Rispetto dei limiti del piano gratuito (60 chiamate/minuto)
- Salvataggio in formato CSV nella directory data_lake/
"""

import requests
import pandas as pd
import os
import sys
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import json

# Configurazione logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_pipeline.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Directory di destinazione per i dati
DATA_LAKE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data_lake')

# Configurazione API Finnhub
# IMPORTANTE: Registrati su finnhub.io per ottenere una chiave API gratuita
FINNHUB_API_KEY = os.environ.get('FINNHUB_API_KEY', 'demo')  # Usa 'demo' per testing limitato
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Limiti API per piano gratuito
RATE_LIMIT_CALLS_PER_MINUTE = 60
RATE_LIMIT_DELAY = 1.5  # Secondi tra le chiamate per stare sotto il limite

# Configurazione simboli futures e forex major
FUTURES_INSTRUMENTS = {
    'ES': {
        'name': 'E-mini S&P 500 Future',
        'finnhub_symbol': 'ES',  # Simbolo principale
        'alternative_symbols': ['ESM23', 'ESU23', 'ESZ23', 'ESH24'],  # Simboli specifici per contratto
        'description': 'Chicago Mercantile Exchange E-mini S&P 500',
        'tick_size': 0.25,
        'contract_size': 50,
        'category': 'equity_index'
    },
    'NQ': {
        'name': 'E-mini Nasdaq 100 Future',
        'finnhub_symbol': 'NQ',
        'alternative_symbols': ['NQM23', 'NQU23', 'NQZ23', 'NQH24'],
        'description': 'Chicago Mercantile Exchange E-mini Nasdaq 100',
        'tick_size': 0.25,
        'contract_size': 20,
        'category': 'equity_index'
    },
    'EUR': {
        'name': 'Euro FX Future (CME)',
        'finnhub_symbol': 'EURUSD',
        'cme_symbol': '6E',
        'alternative_symbols': ['6EM23', '6EU23', '6EZ23', '6EH24', 'ECM23', 'ECU23'],  # CME Euro futures
        'description': 'CME Euro/US Dollar Currency Future',
        'tick_size': 0.00005,
        'contract_size': 125000,
        'category': 'forex_major'
    },
    'GBP': {
        'name': 'British Pound Future (CME)', 
        'finnhub_symbol': 'GBPUSD',
        'cme_symbol': '6B',
        'alternative_symbols': ['6BM23', '6BU23', '6BZ23', '6BH24', 'BPM23', 'BPU23'],  # CME British Pound futures
        'description': 'CME British Pound/US Dollar Currency Future',
        'tick_size': 0.0001,
        'contract_size': 62500,
        'category': 'forex_major'
    },
    'JPY': {
        'name': 'Japanese Yen Future (CME)',
        'finnhub_symbol': 'USDJPY',
        'cme_symbol': '6J',
        'alternative_symbols': ['6JM23', '6JU23', '6JZ23', '6JH24', 'JYM23', 'JYU23'],  # CME Japanese Yen futures
        'description': 'CME US Dollar/Japanese Yen Currency Future',
        'tick_size': 0.000001,
        'contract_size': 12500000,
        'category': 'forex_major'
    },
    'CHF': {
        'name': 'Swiss Franc Future (CME)',
        'finnhub_symbol': 'USDCHF', 
        'cme_symbol': '6S',
        'alternative_symbols': ['6SM23', '6SU23', '6SZ23', '6SH24', 'SFM23', 'SFU23'],  # CME Swiss Franc futures
        'description': 'CME US Dollar/Swiss Franc Currency Future',
        'tick_size': 0.0001,
        'contract_size': 125000,
        'category': 'forex_major'
    },
    'AUD': {
        'name': 'Australian Dollar Future (CME)',
        'finnhub_symbol': 'AUDUSD',
        'cme_symbol': '6A',
        'alternative_symbols': ['6AM23', '6AU23', '6AZ23', '6AH24', 'ADM23', 'ADU23'],  # CME Australian Dollar futures
        'description': 'CME Australian Dollar/US Dollar Currency Future',
        'tick_size': 0.0001,
        'contract_size': 100000,
        'category': 'forex_major'
    },
    'GOLD': {
        'name': 'Gold Future',
        'finnhub_symbol': 'GOLD',
        'alternative_symbols': ['GCM23', 'GCQ23', 'GCZ23', 'GCG24'],  # COMEX Gold futures
        'description': 'COMEX Gold Future',
        'tick_size': 0.10,
        'contract_size': 100,  # 100 troy ounces
        'category': 'precious_metals'
    },
    'SILVER': {
        'name': 'Silver Future',
        'finnhub_symbol': 'SILVER',
        'alternative_symbols': ['SIM23', 'SIU23', 'SIZ23', 'SIH24'],  # COMEX Silver futures
        'description': 'COMEX Silver Future',
        'tick_size': 0.005,
        'contract_size': 5000,  # 5000 troy ounces
        'category': 'precious_metals'
    },
    'CRUDE': {
        'name': 'Crude Oil Future',
        'finnhub_symbol': 'CL', 
        'alternative_symbols': ['CLM23', 'CLU23', 'CLZ23', 'CLH24'],  # NYMEX Crude Oil futures
        'description': 'NYMEX Light Sweet Crude Oil',
        'tick_size': 0.01,
        'contract_size': 1000,  # 1000 barrels
        'category': 'energy'
    }
}

# Configurazione timeframes
TIMEFRAME_CONFIG = {
    '5': {'name': '5 minuti', 'seconds': 300},
    '15': {'name': '15 minuti', 'seconds': 900},
    '60': {'name': '1 ora', 'seconds': 3600}  # Backup per volumi aggregati
}

class FinnhubDataFetcher:
    """Classe per l'acquisizione dei dati da Finnhub API"""
    
    def __init__(self, api_key: str = FINNHUB_API_KEY):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-Finnhub-Token': api_key,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.last_request_time = 0
        
        if api_key == 'demo':
            logger.warning("⚠️ Usando API key demo di Finnhub - funzionalità limitate")
        else:
            logger.info("✅ Configurata API key Finnhub personalizzata")
    
    def _enforce_rate_limit(self):
        """Applica il rate limiting per rispettare i limiti API"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < RATE_LIMIT_DELAY:
            sleep_time = RATE_LIMIT_DELAY - time_since_last
            logger.debug(f"Rate limiting: aspetto {sleep_time:.2f} secondi")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def test_api_connection(self) -> bool:
        """
        Testa la connessione all'API Finnhub
        
        Returns:
            True se la connessione è valida, False altrimenti
        """
        try:
            self._enforce_rate_limit()
            
            # Test con endpoint di status
            response = self.session.get(
                f"{FINNHUB_BASE_URL}/stock/profile2?symbol=AAPL",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and 'name' in data:
                    logger.info("✅ Connessione API Finnhub verificata")
                    return True
                    
            elif response.status_code == 401:
                logger.error("❌ API key Finnhub non valida")
            elif response.status_code == 429:
                logger.error("❌ Rate limit Finnhub superato")
            else:
                logger.error(f"❌ Errore API Finnhub: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Errore test connessione Finnhub: {e}")
            
        return False
    
    def get_forex_candles(self, symbol: str, resolution: str, from_timestamp: int, to_timestamp: int) -> Optional[Dict]:
        """
        Ottiene i dati candlestick per un simbolo forex/futures
        
        Args:
            symbol: Simbolo del futures (es. 'OANDA:SPX500_USD')
            resolution: Risoluzione in minuti ('1', '5', '15', '30', '60')
            from_timestamp: Timestamp di inizio (Unix)
            to_timestamp: Timestamp di fine (Unix)
            
        Returns:
            Dizionario con i dati OHLCV o None se fallisce
        """
        try:
            self._enforce_rate_limit()
            
            # Endpoint per dati forex/futures
            url = f"{FINNHUB_BASE_URL}/forex/candle"
            params = {
                'symbol': symbol,
                'resolution': resolution,
                'from': from_timestamp,
                'to': to_timestamp
            }
            
            logger.debug(f"Richiesta dati per {symbol}: {params}")
            
            response = self.session.get(url, params=params, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('s') == 'ok' and data.get('c'):  # Status OK e prezzi presenti
                    logger.info(f"✅ Dati ottenuti per {symbol}: {len(data['c'])} candele")
                    return data
                elif data.get('s') == 'no_data':
                    logger.warning(f"⚠️ Nessun dato disponibile per {symbol}")
                    return None
                else:
                    logger.warning(f"⚠️ Risposta API incompleta per {symbol}: {data}")
                    return None
                    
            else:
                logger.error(f"❌ Errore API per {symbol}: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Errore richiesta dati per {symbol}: {e}")
            return None
    
    def try_multiple_symbols(self, instrument_config: Dict, resolution: str, from_ts: int, to_ts: int) -> Optional[Dict]:
        """
        Prova diversi simboli per un strumento fino a trovare dati validi
        
        Args:
            instrument_config: Configurazione dello strumento
            resolution: Risoluzione temporale
            from_ts: Timestamp di inizio
            to_ts: Timestamp di fine
            
        Returns:
            Dati trovati per il primo simbolo valido o None
        """
        category = instrument_config.get('category', 'unknown')
        base_symbol = instrument_config['finnhub_symbol']
        
        # Lista di possibili formati per il simbolo basata sulla categoria
        symbol_formats = []
        
        if category == 'equity_index':
            symbol_formats = [
                f"CME:{base_symbol}",             # CME E-mini futures (principale)
                f"GLOBEX:{base_symbol}",          # CME Globex
                f"CME_MINI:{base_symbol}",        # CME Mini
                base_symbol                       # Simbolo diretto
            ]
            
        elif category == 'forex_major':
            # Usa i codici futures CME per le valute
            cme_symbol = instrument_config.get('cme_symbol', base_symbol)
            symbol_formats = [
                f"CME:{cme_symbol}",              # CME principale
                f"GLOBEX:{cme_symbol}",           # CME Globex
                f"CME_MINI:{cme_symbol}",         # CME Mini
                cme_symbol                        # Simbolo diretto
            ]
            
        elif category == 'precious_metals':
            if base_symbol == 'GOLD':
                symbol_formats = [
                    "COMEX:GC",                   # COMEX Gold continuous (principale)
                    "NYMEX:GC",                   # NYMEX Gold  
                    "CME:GC",                     # CME Gold
                    "GLOBEX:GC"                   # Globex Gold
                ]
            elif base_symbol == 'SILVER':
                symbol_formats = [
                    "COMEX:SI",                   # COMEX Silver continuous (principale)
                    "NYMEX:SI",                   # NYMEX Silver
                    "CME:SI",                     # CME Silver
                    "GLOBEX:SI"                   # Globex Silver
                ]
                
        elif category == 'energy':
            if base_symbol == 'CL':  # Crude Oil
                symbol_formats = [
                    "NYMEX:CL",                   # NYMEX Crude continuous (principale)
                    "CME:CL",                     # CME Crude
                    "GLOBEX:CL",                  # Globex Crude
                    "COMEX:CL"                    # COMEX Crude (alternativo)
                ]
        else:
            # Formato generico per strumenti non categorizzati
            symbol_formats = [
                f"CME:{base_symbol}",
                f"OANDA:{base_symbol}",
                f"FOREXCOM:{base_symbol}",
                f"FX:{base_symbol}",
                base_symbol
            ]
        
        # Aggiungi simboli alternativi specifici del contratto
        if 'alternative_symbols' in instrument_config:
            for alt_symbol in instrument_config['alternative_symbols']:
                if category == 'equity_index':
                    symbol_formats.extend([f"CME:{alt_symbol}", f"OANDA:{alt_symbol}"])
                elif category == 'forex_major':
                    symbol_formats.extend([f"CME:{alt_symbol}", f"FX:{alt_symbol}"])
                elif category == 'precious_metals':
                    symbol_formats.extend([f"COMEX:{alt_symbol}", f"CME:{alt_symbol}"])
                elif category == 'energy':
                    symbol_formats.extend([f"NYMEX:{alt_symbol}", f"CME:{alt_symbol}"])
                else:
                    symbol_formats.append(alt_symbol)
        
        logger.info(f"Tentativo acquisizione {instrument_config['name']} ({category})")
        
        for i, symbol_format in enumerate(symbol_formats):
            logger.debug(f"Tentativo {i+1}/{len(symbol_formats)} con simbolo: {symbol_format}")
            
            data = self.get_forex_candles(symbol_format, resolution, from_ts, to_ts)
            
            if data and data.get('c'):  # Dati validi trovati
                logger.info(f"✅ Dati trovati per {instrument_config['name']} con simbolo: {symbol_format}")
                return {**data, 'symbol_used': symbol_format}
                
            # Pausa tra i tentativi per rispettare il rate limit
            time.sleep(0.3)
        
        logger.warning(f"⚠️ Nessun simbolo valido trovato per {instrument_config['name']} ({category})")
        return None
    
    def get_intraday_data(self, instrument: str, target_date: datetime, resolution: str = '5') -> pd.DataFrame:
        """
        Ottiene i dati intraday per uno strumento specifico
        
        Args:
            instrument: Codice strumento (ES, NQ)
            target_date: Data per cui ottenere i dati
            resolution: Risoluzione in minuti ('5', '15', '60')
            
        Returns:
            DataFrame con i dati OHLCV
        """
        if instrument not in FUTURES_INSTRUMENTS:
            logger.error(f"❌ Strumento non configurato: {instrument}")
            return pd.DataFrame()
        
        config = FUTURES_INSTRUMENTS[instrument]
        
        # Calcola timestamp per la sessione di trading del giorno target
        start_time = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        from_ts = int(start_time.timestamp())
        to_ts = int(end_time.timestamp())
        
        logger.info(f"Acquisizione dati {config['name']} per {target_date.strftime('%Y-%m-%d')}")
        logger.info(f"Periodo: {start_time} - {end_time} (risoluzione: {resolution}m)")
        
        # Prova diversi simboli per questo strumento
        raw_data = self.try_multiple_symbols(config, resolution, from_ts, to_ts)
        
        if not raw_data:
            return pd.DataFrame()
        
        # Converte i dati in DataFrame
        try:
            df_data = {
                'timestamp': raw_data['t'],
                'open': raw_data['o'], 
                'high': raw_data['h'],
                'low': raw_data['l'],
                'close': raw_data['c'],
                'volume': raw_data['v'] if 'v' in raw_data else [0] * len(raw_data['c'])
            }
            
            df = pd.DataFrame(df_data)
            
            # Converte timestamp in datetime
            df['datetime'] = pd.to_datetime(df['timestamp'], unit='s')
            
            # Filtra solo i dati del giorno target per sicurezza
            target_date_str = target_date.strftime('%Y-%m-%d')
            df['date'] = df['datetime'].dt.date.astype(str)
            df = df[df['date'] == target_date_str].copy()
            
            # Aggiunge metadati
            df['instrument'] = instrument
            df['resolution_minutes'] = int(resolution)
            df['symbol_used'] = raw_data.get('symbol_used', 'unknown')
            
            # Riordina le colonne
            columns_order = [
                'datetime', 'timestamp', 'instrument', 'symbol_used', 
                'open', 'high', 'low', 'close', 'volume', 'resolution_minutes'
            ]
            df = df.reindex(columns=columns_order)
            
            logger.info(f"✅ Processati {len(df)} record per {instrument}")
            return df
            
        except Exception as e:
            logger.error(f"❌ Errore processamento dati per {instrument}: {e}")
            return pd.DataFrame()

def ensure_data_lake_exists():
    """Crea la directory data_lake se non esiste"""
    if not os.path.exists(DATA_LAKE_DIR):
        os.makedirs(DATA_LAKE_DIR)
        logger.info(f"📁 Creata directory: {DATA_LAKE_DIR}")

def save_futures_data(df: pd.DataFrame, instrument: str, target_date: datetime, resolution: str) -> str:
    """
    Salva i dati dei futures in formato CSV standardizzato
    
    Args:
        df: DataFrame con i dati intraday
        instrument: Codice strumento (ES, NQ)
        target_date: Data di riferimento
        resolution: Risoluzione temporale usata
        
    Returns:
        Path del file salvato
    """
    if df.empty:
        logger.warning(f"⚠️ Nessun dato {instrument} da salvare")
        return ""
    
    date_str = target_date.strftime('%Y-%m-%d')
    filename = f"{date_str}_{instrument}_intraday_{resolution}m.csv"
    filepath = os.path.join(DATA_LAKE_DIR, filename)
    
    df.to_csv(filepath, index=False)
    logger.info(f"💾 Dati {instrument} salvati: {filepath} ({len(df)} record)")
    
    return filepath

def generate_summary_report(results: Dict[str, str], target_date: datetime) -> str:
    """
    Genera un report riassuntivo dell'acquisizione
    
    Args:
        results: Dizionario con i risultati per strumento
        target_date: Data di riferimento
        
    Returns:
        Path del file di report
    """
    date_str = target_date.strftime('%Y-%m-%d')
    report_filename = f"{date_str}_futures_acquisition_report.json"
    report_path = os.path.join(DATA_LAKE_DIR, report_filename)
    
    report_data = {
        'acquisition_date': datetime.now().isoformat(),
        'target_date': date_str,
        'status': 'completed',
        'results': results,
        'success_count': len([r for r in results.values() if r]),
        'total_instruments': len(FUTURES_INSTRUMENTS)
    }
    
    with open(report_path, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    logger.info(f"📊 Report salvato: {report_path}")
    return report_path

def main():
    """Funzione principale per l'acquisizione giornaliera dei dati futures"""
    logger.info("🚀 Avvio acquisizione dati volumetrici futures")
    
    # Determina la data target (sessione di trading precedente)
    today = datetime.now()
    
    # Se oggi è lunedì, prendi i dati di venerdì
    if today.weekday() == 0:  # Lunedì
        target_date = today - timedelta(days=3)
    # Se oggi è fine settimana, prendi i dati di venerdì  
    elif today.weekday() >= 5:  # Sabato o domenica
        days_back = today.weekday() - 4
        target_date = today - timedelta(days=days_back)
    else:
        # Altrimenti prendi i dati del giorno precedente
        target_date = today - timedelta(days=1)
    
    logger.info(f"📅 Data target per acquisizione: {target_date.strftime('%Y-%m-%d')}")
    
    ensure_data_lake_exists()
    
    # Inizializza fetcher
    fetcher = FinnhubDataFetcher()
    
    # Testa la connessione API
    if not fetcher.test_api_connection():
        logger.error("💥 Impossibile connettersi all'API Finnhub")
        return 2
    
    results = {}
    success_count = 0
    
    # Acquisisce dati per ogni strumento
    for instrument_code, instrument_config in FUTURES_INSTRUMENTS.items():
        try:
            logger.info(f"📈 Acquisizione dati per {instrument_config['name']}")
            
            # Prova prima con risoluzione 5 minuti
            df = fetcher.get_intraday_data(instrument_code, target_date, '5')
            
            if df.empty:
                # Fallback a 15 minuti se 5 minuti non disponibile
                logger.info(f"🔄 Tentativo con risoluzione 15 minuti per {instrument_code}")
                df = fetcher.get_intraday_data(instrument_code, target_date, '15')
            
            if not df.empty:
                # Salva i dati
                resolution_used = str(df.iloc[0]['resolution_minutes'])
                saved_path = save_futures_data(df, instrument_code, target_date, resolution_used)
                
                if saved_path:
                    results[instrument_code] = saved_path
                    success_count += 1
                    logger.info(f"✅ Dati {instrument_code} acquisiti con successo")
                else:
                    results[instrument_code] = None
                    logger.error(f"❌ Errore salvataggio dati {instrument_code}")
            else:
                results[instrument_code] = None
                logger.error(f"❌ Nessun dato disponibile per {instrument_code}")
                
        except Exception as e:
            logger.error(f"❌ Errore acquisizione {instrument_code}: {e}")
            results[instrument_code] = None
    
    # Genera report riassuntivo
    report_path = generate_summary_report(results, target_date)
    
    # Report finale
    total_instruments = len(FUTURES_INSTRUMENTS)
    logger.info(f"📊 Acquisizione completata: {success_count}/{total_instruments} strumenti")
    
    if success_count == total_instruments:
        logger.info("🎉 Acquisizione dati futures completata con successo!")
        return 0
    elif success_count > 0:
        logger.warning("⚠️ Acquisizione parzialmente riuscita")
        return 1
    else:
        logger.error("💥 Acquisizione fallita completamente")
        return 2

if __name__ == "__main__":
    # Controlla se è presente la variabile d'ambiente per l'API key
    if not os.environ.get('FINNHUB_API_KEY'):
        print("⚠️ AVVISO: Variabile d'ambiente FINNHUB_API_KEY non impostata")
        print("💡 Per utilizzare questo script:")
        print("   1. Registrati su https://finnhub.io/ (gratuito)")
        print("   2. Ottieni la tua API key")
        print("   3. Imposta: export FINNHUB_API_KEY='tua_chiave_api'")
        print("   4. Riavvia questo script")
        print("")
        print("🧪 Procedendo con modalità demo (limitata)...")
        print("")
    
    exit_code = main()
    sys.exit(exit_code)