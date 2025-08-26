#!/usr/bin/env python3
"""
Modulo critico per il calcolo del "basis" - disallineamento di prezzo tra futures e CFD.
Risolve la differenza di prezzo tra i livelli strutturali calcolati sui futures 
e i prezzi dei CFD utilizzati per il trading.

Funzionalità principali:
- Connessione in sola lettura a MetaTrader 5 per prezzi CFD real-time
- Recupero prezzi futures da API Finnhub
- Calcolo e caching del basis con validità temporale
- Mappatura livelli strutturali da futures a CFD
- Gestione errori e fallback per continuità operativa
"""

import os
import sys
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
import json

# Importazioni con gestione errori per ambienti diversi
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    logging.warning("⚠️ MetaTrader5 non disponibile - modalità simulazione attiva")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logging.error("❌ Requests non disponibile - funzionalità limitate")

# Configurazione logging
logger = logging.getLogger(__name__)

# Configurazione API Finnhub (per prezzi futures)
FINNHUB_API_KEY = os.environ.get('FINNHUB_API_KEY', 'demo')
FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

# Configurazione cache basis
BASIS_CACHE_DURATION = 30  # secondi
PRICE_CACHE_DURATION = 15   # secondi per singoli prezzi

# Mappatura strumenti: Future -> CFD MT5
INSTRUMENT_MAPPING = {
    'ES': {
        'future_symbol': 'ES',
        'cfd_symbol': 'US500',  # Simbolo MT5 per S&P 500 CFD
        'finnhub_futures': ['CME:ES', 'GLOBEX:ES'],
        'alternative_cfd_symbols': ['SPX500', 'US500', 'SP500', 'SPY'],
        'description': 'E-mini S&P 500 Future vs CFD',
        'typical_basis_range': (-10, 10)  # Range tipico del basis in punti
    },
    'NQ': {
        'future_symbol': 'NQ', 
        'cfd_symbol': 'US100',  # Simbolo MT5 per Nasdaq 100 CFD
        'finnhub_futures': ['CME:NQ', 'GLOBEX:NQ'],
        'alternative_cfd_symbols': ['NAS100', 'US100', 'NDX', 'QQQ'],
        'description': 'E-mini Nasdaq 100 Future vs CFD',
        'typical_basis_range': (-25, 25)
    },
    'EUR': {
        'future_symbol': '6E',
        'cfd_symbol': 'EURUSD',
        'finnhub_futures': ['CME:6E', 'GLOBEX:6E'],
        'alternative_cfd_symbols': ['EURUSD', 'EUR/USD'],
        'description': 'Euro Future vs EUR/USD CFD',
        'typical_basis_range': (-0.002, 0.002)
    },
    'GBP': {
        'future_symbol': '6B',
        'cfd_symbol': 'GBPUSD', 
        'finnhub_futures': ['CME:6B', 'GLOBEX:6B'],
        'alternative_cfd_symbols': ['GBPUSD', 'GBP/USD'],
        'description': 'British Pound Future vs GBP/USD CFD',
        'typical_basis_range': (-0.003, 0.003)
    },
    'JPY': {
        'future_symbol': '6J',
        'cfd_symbol': 'USDJPY',
        'finnhub_futures': ['CME:6J', 'GLOBEX:6J'], 
        'alternative_cfd_symbols': ['USDJPY', 'USD/JPY'],
        'description': 'Japanese Yen Future vs USD/JPY CFD',
        'typical_basis_range': (-0.5, 0.5)
    },
    'GOLD': {
        'future_symbol': 'GC',
        'cfd_symbol': 'XAUUSD',
        'finnhub_futures': ['COMEX:GC', 'NYMEX:GC', 'CME:GC'],
        'alternative_cfd_symbols': ['XAUUSD', 'GOLD', 'XAU/USD'],
        'description': 'Gold Future vs XAU/USD CFD',
        'typical_basis_range': (-5.0, 5.0)
    },
    'SILVER': {
        'future_symbol': 'SI',
        'cfd_symbol': 'XAGUSD',
        'finnhub_futures': ['COMEX:SI', 'NYMEX:SI', 'CME:SI'],
        'alternative_cfd_symbols': ['XAGUSD', 'SILVER', 'XAG/USD'],
        'description': 'Silver Future vs XAG/USD CFD',
        'typical_basis_range': (-0.5, 0.5)
    }
}

class PriceCache:
    """Cache per i prezzi con validità temporale"""
    
    def __init__(self):
        self.cache = {}
        
    def get(self, key: str, max_age_seconds: int = BASIS_CACHE_DURATION) -> Optional[Dict]:
        """Recupera un valore dalla cache se ancora valido"""
        if key not in self.cache:
            return None
            
        cached_item = self.cache[key]
        age = time.time() - cached_item['timestamp']
        
        if age <= max_age_seconds:
            return cached_item['data']
        else:
            # Rimuove elemento scaduto
            del self.cache[key]
            return None
            
    def set(self, key: str, data: Dict):
        """Memorizza un valore nella cache con timestamp corrente"""
        self.cache[key] = {
            'data': data,
            'timestamp': time.time()
        }
        
    def clear(self):
        """Pulisce tutta la cache"""
        self.cache.clear()

class MT5PriceProvider:
    """Provider per i prezzi CFD da MetaTrader 5"""
    
    def __init__(self):
        self.is_connected = False
        self.connection_attempts = 0
        self.max_connection_attempts = 3
        
        if MT5_AVAILABLE:
            self._initialize_connection()
        else:
            logger.warning("⚠️ MT5 non disponibile - prezzi CFD simulati")
    
    def _initialize_connection(self) -> bool:
        """Inizializza la connessione a MT5"""
        try:
            if not mt5.initialize():
                logger.warning("⚠️ Impossibile inizializzare MT5")
                return False
                
            # Verifica connessione account
            account_info = mt5.account_info()
            if account_info is None:
                logger.warning("⚠️ Impossibile ottenere info account MT5")
                mt5.shutdown()
                return False
                
            self.is_connected = True
            logger.info(f"✅ MT5 connesso - Account: {account_info.login}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Errore inizializzazione MT5: {e}")
            return False
    
    def _ensure_connection(self) -> bool:
        """Assicura che la connessione MT5 sia attiva"""
        if not MT5_AVAILABLE:
            return False
            
        if self.is_connected:
            try:
                # Test connessione con una chiamata leggera
                account_info = mt5.account_info()
                return account_info is not None
            except:
                self.is_connected = False
                
        if not self.is_connected and self.connection_attempts < self.max_connection_attempts:
            self.connection_attempts += 1
            logger.info(f"🔄 Tentativo riconnessione MT5 ({self.connection_attempts}/{self.max_connection_attempts})")
            return self._initialize_connection()
            
        return False
    
    def get_cfd_price(self, symbol: str) -> Optional[float]:
        """
        Ottiene il prezzo last di un CFD da MT5
        
        Args:
            symbol: Simbolo CFD MT5
            
        Returns:
            Prezzo last o None se non disponibile
        """
        if not self._ensure_connection():
            logger.debug(f"⚠️ MT5 non connesso per {symbol}")
            return None
            
        try:
            # Prova il simbolo diretto
            tick = mt5.symbol_info_tick(symbol)
            
            if tick is not None:
                # Utilizza il prezzo mid (bid + ask) / 2 per maggiore accuratezza
                mid_price = (tick.bid + tick.ask) / 2 if tick.bid > 0 and tick.ask > 0 else tick.last
                logger.debug(f"✅ Prezzo {symbol}: {mid_price}")
                return float(mid_price)
                
            # Se il simbolo non funziona, prova varianti
            alternatives = INSTRUMENT_MAPPING.get(symbol, {}).get('alternative_cfd_symbols', [])
            
            for alt_symbol in alternatives:
                tick = mt5.symbol_info_tick(alt_symbol)
                if tick is not None:
                    mid_price = (tick.bid + tick.ask) / 2 if tick.bid > 0 and tick.ask > 0 else tick.last
                    logger.debug(f"✅ Prezzo {alt_symbol} (alternativo per {symbol}): {mid_price}")
                    return float(mid_price)
                    
        except Exception as e:
            logger.error(f"❌ Errore ottenimento prezzo CFD {symbol}: {e}")
            
        return None
    
    def get_multiple_cfd_prices(self, symbols: List[str]) -> Dict[str, Optional[float]]:
        """
        Ottiene i prezzi di multipli CFD in batch
        
        Args:
            symbols: Lista di simboli CFD
            
        Returns:
            Dizionario simbolo -> prezzo
        """
        results = {}
        
        if not self._ensure_connection():
            logger.warning("⚠️ MT5 non connesso per batch prices")
            return {symbol: None for symbol in symbols}
            
        for symbol in symbols:
            results[symbol] = self.get_cfd_price(symbol)
            
        return results
    
    def __del__(self):
        """Cleanup della connessione MT5"""
        if MT5_AVAILABLE and self.is_connected:
            try:
                mt5.shutdown()
                logger.debug("🔌 Connessione MT5 chiusa")
            except:
                pass

class FinnhubPriceProvider:
    """Provider per i prezzi futures da Finnhub"""
    
    def __init__(self, api_key: str = FINNHUB_API_KEY):
        self.api_key = api_key
        self.session = requests.Session() if REQUESTS_AVAILABLE else None
        
        if self.session:
            self.session.headers.update({
                'X-Finnhub-Token': api_key,
                'User-Agent': 'PriceMapper/1.0'
            })
        
        self.last_request_time = 0
        self.rate_limit_delay = 1.5  # secondi
        
    def _rate_limit_delay(self):
        """Applica rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            time.sleep(sleep_time)
            
        self.last_request_time = time.time()
    
    def get_future_price(self, symbol: str) -> Optional[float]:
        """
        Ottiene il prezzo corrente di un future da Finnhub
        
        Args:
            symbol: Simbolo future (es. 'CME:ES', 'COMEX:GC')
            
        Returns:
            Prezzo corrente o None se non disponibile
        """
        if not REQUESTS_AVAILABLE or not self.session:
            logger.debug(f"⚠️ Requests non disponibile per {symbol}")
            return None
            
        try:
            self._rate_limit_delay()
            
            # Usa endpoint quote per prezzi real-time
            url = f"{FINNHUB_BASE_URL}/quote"
            params = {'symbol': symbol}
            
            response = self.session.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verifica che i dati siano validi
                if data and 'c' in data and data['c'] is not None and data['c'] > 0:
                    price = float(data['c'])  # Current price
                    logger.debug(f"✅ Prezzo future {symbol}: {price}")
                    return price
                    
            logger.debug(f"⚠️ Dati price non validi per {symbol}: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"❌ Errore ottenimento prezzo future {symbol}: {e}")
            
        return None
    
    def try_multiple_future_symbols(self, symbols: List[str]) -> Optional[float]:
        """
        Prova multipli simboli future fino a trovarne uno valido
        
        Args:
            symbols: Lista di simboli future da provare
            
        Returns:
            Primo prezzo valido trovato o None
        """
        for symbol in symbols:
            price = self.get_future_price(symbol)
            if price is not None:
                return price
                
        return None

class PriceMapper:
    """Classe principale per il mapping prezzi futures-CFD"""
    
    def __init__(self):
        self.mt5_provider = MT5PriceProvider()
        self.finnhub_provider = FinnhubPriceProvider()
        self.cache = PriceCache()
        
        logger.info("🗺️ PriceMapper inizializzato")
    
    def get_current_basis(self, instrument: str) -> Optional[Dict]:
        """
        Calcola il basis corrente per uno strumento
        
        Args:
            instrument: Codice strumento (ES, NQ, EUR, etc.)
            
        Returns:
            Dizionario con basis e metadati o None se fallisce
        """
        if instrument not in INSTRUMENT_MAPPING:
            logger.error(f"❌ Strumento {instrument} non configurato")
            return None
            
        # Controlla cache prima
        cache_key = f"basis_{instrument}"
        cached_basis = self.cache.get(cache_key, BASIS_CACHE_DURATION)
        
        if cached_basis:
            logger.debug(f"📋 Basis {instrument} da cache: {cached_basis['basis']}")
            return cached_basis
            
        config = INSTRUMENT_MAPPING[instrument]
        
        # Ottiene prezzo CFD
        cfd_price = self._get_best_cfd_price(config)
        
        # Ottiene prezzo future
        future_price = self._get_best_future_price(config)
        
        if cfd_price is None or future_price is None:
            logger.warning(f"⚠️ Impossibile calcolare basis per {instrument} - prezzi mancanti")
            return self._get_fallback_basis(instrument, config)
            
        # Calcola basis = prezzo_cfd - prezzo_future
        basis = cfd_price - future_price
        
        # Verifica sanity check
        typical_range = config['typical_basis_range']
        if not (typical_range[0] <= basis <= typical_range[1]):
            logger.warning(f"⚠️ Basis {instrument} fuori range tipico: {basis} (atteso: {typical_range})")
        
        result = {
            'instrument': instrument,
            'basis': round(basis, 6),
            'cfd_price': round(cfd_price, 6),
            'future_price': round(future_price, 6),
            'cfd_symbol_used': config['cfd_symbol'],
            'future_symbol_used': 'multiple',  # Verrà aggiornato dal provider
            'calculation_time': datetime.now().isoformat(),
            'is_within_typical_range': typical_range[0] <= basis <= typical_range[1],
            'confidence': 'high' if typical_range[0] <= basis <= typical_range[1] else 'medium'
        }
        
        # Salva in cache
        self.cache.set(cache_key, result)
        
        logger.info(f"✅ Basis {instrument}: {basis:.4f} (CFD: {cfd_price:.4f}, Future: {future_price:.4f})")
        return result
    
    def _get_best_cfd_price(self, config: Dict) -> Optional[float]:
        """Ottiene il miglior prezzo CFD disponibile"""
        # Prova simbolo principale
        cfd_price = self.mt5_provider.get_cfd_price(config['cfd_symbol'])
        
        if cfd_price is not None:
            return cfd_price
            
        # Prova simboli alternativi
        for alt_symbol in config.get('alternative_cfd_symbols', []):
            cfd_price = self.mt5_provider.get_cfd_price(alt_symbol)
            if cfd_price is not None:
                logger.debug(f"✅ Usato simbolo CFD alternativo: {alt_symbol}")
                return cfd_price
                
        return None
    
    def _get_best_future_price(self, config: Dict) -> Optional[float]:
        """Ottiene il miglior prezzo future disponibile"""
        return self.finnhub_provider.try_multiple_future_symbols(config['finnhub_futures'])
    
    def _get_fallback_basis(self, instrument: str, config: Dict) -> Optional[Dict]:
        """
        Genera un basis di fallback basato su dati storici o stime
        
        Args:
            instrument: Codice strumento  
            config: Configurazione strumento
            
        Returns:
            Basis stimato o None
        """
        logger.warning(f"⚠️ Usando basis di fallback per {instrument}")
        
        # Basis tipici basati su esperienza di mercato
        fallback_basis = {
            'ES': 2.5,    # S&P 500 CFD solitamente premio sui futures
            'NQ': 5.0,    # Nasdaq 100 CFD solitamente premio 
            'EUR': 0.0001, # EUR/USD molto vicini
            'GBP': 0.0001, # GBP/USD molto vicini
            'JPY': 0.01,   # USD/JPY piccola differenza
            'GOLD': 1.0,   # Gold CFD leggero premio
            'SILVER': 0.05 # Silver piccola differenza
        }
        
        estimated_basis = fallback_basis.get(instrument, 0.0)
        
        return {
            'instrument': instrument,
            'basis': estimated_basis,
            'cfd_price': None,
            'future_price': None,
            'cfd_symbol_used': config['cfd_symbol'],
            'future_symbol_used': 'fallback',
            'calculation_time': datetime.now().isoformat(),
            'is_within_typical_range': True,
            'confidence': 'low',
            'is_fallback': True
        }
    
    def map_levels_to_cfd(self, structural_levels: List[float], instrument: str) -> List[Dict]:
        """
        Mappa una lista di livelli strutturali dai futures ai CFD
        
        Args:
            structural_levels: Lista di livelli di prezzo dai futures
            instrument: Codice strumento
            
        Returns:
            Lista di livelli mappati con metadati
        """
        if not structural_levels:
            return []
            
        basis_data = self.get_current_basis(instrument)
        
        if basis_data is None:
            logger.error(f"❌ Impossibile mappare livelli per {instrument} - basis non disponibile")
            return []
            
        basis = basis_data['basis']
        mapped_levels = []
        
        for original_level in structural_levels:
            # Applica basis: livello_per_cfd = livello_originale_future + basis
            mapped_level = original_level + basis
            
            mapped_levels.append({
                'original_future_level': round(original_level, 6),
                'mapped_cfd_level': round(mapped_level, 6),
                'basis_applied': round(basis, 6),
                'confidence': basis_data['confidence'],
                'instrument': instrument,
                'mapping_time': datetime.now().isoformat()
            })
        
        logger.info(f"✅ Mappati {len(mapped_levels)} livelli {instrument} con basis {basis:.4f}")
        return mapped_levels
    
    def get_multiple_basis(self, instruments: List[str]) -> Dict[str, Optional[Dict]]:
        """
        Calcola il basis per multipli strumenti in batch
        
        Args:
            instruments: Lista di codici strumento
            
        Returns:
            Dizionario strumento -> basis data
        """
        results = {}
        
        for instrument in instruments:
            try:
                results[instrument] = self.get_current_basis(instrument)
            except Exception as e:
                logger.error(f"❌ Errore calcolo basis per {instrument}: {e}")
                results[instrument] = None
                
        return results
    
    def validate_basis_sanity(self, instrument: str, basis: float) -> bool:
        """
        Valida che il basis sia ragionevole per lo strumento
        
        Args:
            instrument: Codice strumento
            basis: Valore basis da validare
            
        Returns:
            True se il basis è ragionevole, False altrimenti
        """
        if instrument not in INSTRUMENT_MAPPING:
            return False
            
        typical_range = INSTRUMENT_MAPPING[instrument]['typical_basis_range']
        return typical_range[0] <= basis <= typical_range[1]
    
    def clear_cache(self):
        """Pulisce la cache dei basis"""
        self.cache.clear()
        logger.info("🧹 Cache basis pulita")

def main():
    """Funzione di test per il modulo price_mapper"""
    print("🧪 Test modulo PriceMapper")
    
    # Inizializza mapper
    mapper = PriceMapper()
    
    # Test strumenti principali
    test_instruments = ['ES', 'NQ', 'GOLD']
    
    print(f"\n📊 Test calcolo basis per {len(test_instruments)} strumenti:")
    
    for instrument in test_instruments:
        try:
            basis_data = mapper.get_current_basis(instrument)
            
            if basis_data:
                print(f"✅ {instrument}: Basis = {basis_data['basis']:.4f}")
                print(f"   CFD: {basis_data.get('cfd_price', 'N/A')}")
                print(f"   Future: {basis_data.get('future_price', 'N/A')}")
                print(f"   Confidence: {basis_data.get('confidence', 'unknown')}")
                
                # Test mapping di livelli esempio
                test_levels = [4500.0, 4505.0, 4510.0] if instrument == 'ES' else [15000.0, 15010.0, 15020.0] if instrument == 'NQ' else [2000.0, 2005.0, 2010.0]
                
                mapped = mapper.map_levels_to_cfd(test_levels, instrument)
                
                if mapped:
                    print(f"   Mappati {len(mapped)} livelli di test")
                    for level_data in mapped[:2]:  # Mostra primi 2
                        print(f"   {level_data['original_future_level']} -> {level_data['mapped_cfd_level']}")
                        
            else:
                print(f"❌ {instrument}: Basis non disponibile")
                
        except Exception as e:
            print(f"❌ {instrument}: Errore - {e}")
    
    # Test batch
    print(f"\n📊 Test batch basis:")
    batch_results = mapper.get_multiple_basis(test_instruments)
    
    success_count = sum(1 for result in batch_results.values() if result is not None)
    print(f"✅ Batch completato: {success_count}/{len(test_instruments)} successi")
    
    print("\n🎉 Test PriceMapper completato!")

if __name__ == "__main__":
    main()