#!/usr/bin/env python3
"""
Modulo per il calcolo dei livelli di prezzo strutturali basati sui dati delle opzioni e volumi futures.
Trasforma i dati grezzi raccolti dalla data pipeline in insight azionabili per il sistema di trading.

Funzionalità principali:
- Calcolo livelli chiave da Open Interest delle opzioni
- Calcolo Value Area e Point of Control dai volumi intraday
- Identificazione livelli di supporto/resistenza strutturale
- Algoritmi per determinare la rilevanza dei livelli
"""

import pandas as pd
import numpy as np
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
import warnings

# Sopprime warnings di pandas per operazioni con dati vuoti
warnings.filterwarnings('ignore', category=RuntimeWarning)

# Configurazione logging
logger = logging.getLogger(__name__)

# Directory dove si trovano i dati grezzi
DATA_LAKE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data_lake')

# Configurazioni per il calcolo dei livelli
VALUE_AREA_PERCENTAGE = 0.70  # 70% dei volumi per calcolare la Value Area
MIN_VOLUME_THRESHOLD = 100    # Volume minimo per considerare un livello significativo
MIN_OPEN_INTEREST_THRESHOLD = 500  # Open Interest minimo per livelli opzioni

# Configurazioni specifiche per strumento
INSTRUMENT_CONFIG = {
    'ES': {
        'name': 'E-mini S&P 500',
        'tick_size': 0.25,
        'point_value': 50.0,
        'min_level_distance': 5.0,  # Distanza minima tra livelli in punti
        'volume_profile_bins': 50   # Numero di bin per il volume profile
    },
    'NQ': {
        'name': 'E-mini Nasdaq 100',
        'tick_size': 0.25,
        'point_value': 20.0,
        'min_level_distance': 10.0,
        'volume_profile_bins': 50
    }
}

class StructuralLevelsCalculator:
    """Classe principale per il calcolo dei livelli strutturali"""
    
    def __init__(self, data_lake_dir: str = DATA_LAKE_DIR):
        self.data_lake_dir = data_lake_dir
        
        if not os.path.exists(data_lake_dir):
            logger.warning(f"⚠️ Directory data lake non trovata: {data_lake_dir}")
            
    def _find_data_file(self, date: datetime, pattern: str) -> Optional[str]:
        """
        Trova il file di dati per una data specifica
        
        Args:
            date: Data per cui cercare il file
            pattern: Pattern del nome file (es. '_cme_options.csv')
            
        Returns:
            Path completo del file o None se non trovato
        """
        date_str = date.strftime('%Y-%m-%d')
        target_filename = f"{date_str}{pattern}"
        target_path = os.path.join(self.data_lake_dir, target_filename)
        
        if os.path.exists(target_path):
            return target_path
        
        # Se il file esatto non esiste, cerca file simili nella directory
        if os.path.exists(self.data_lake_dir):
            for filename in os.listdir(self.data_lake_dir):
                if date_str in filename and pattern.replace('.csv', '') in filename:
                    logger.info(f"🔍 Trovato file alternativo: {filename}")
                    return os.path.join(self.data_lake_dir, filename)
        
        return None
    
    def load_options_data(self, date: datetime) -> pd.DataFrame:
        """
        Carica i dati delle opzioni per la data specificata
        
        Args:
            date: Data per cui caricare i dati
            
        Returns:
            DataFrame con i dati delle opzioni o DataFrame vuoto
        """
        file_path = self._find_data_file(date, '_cme_options.csv')
        
        if not file_path:
            logger.warning(f"⚠️ File opzioni non trovato per {date.strftime('%Y-%m-%d')}")
            return pd.DataFrame()
        
        try:
            df = pd.read_csv(file_path)
            logger.info(f"📊 Caricati {len(df)} record di opzioni da {os.path.basename(file_path)}")
            return df
            
        except Exception as e:
            logger.error(f"❌ Errore caricamento file opzioni {file_path}: {e}")
            return pd.DataFrame()
    
    def load_futures_data(self, date: datetime, instrument: str) -> pd.DataFrame:
        """
        Carica i dati intraday dei futures per strumento e data specificati
        
        Args:
            date: Data per cui caricare i dati
            instrument: Codice strumento (ES, NQ)
            
        Returns:
            DataFrame con i dati intraday o DataFrame vuoto
        """
        # Prova diversi pattern per trovare il file
        patterns = [
            f'_{instrument}_intraday_5m.csv',
            f'_{instrument}_intraday_15m.csv',
            f'_{instrument}_intraday.csv'
        ]
        
        for pattern in patterns:
            file_path = self._find_data_file(date, pattern)
            if file_path:
                break
        
        if not file_path:
            logger.warning(f"⚠️ File futures {instrument} non trovato per {date.strftime('%Y-%m-%d')}")
            return pd.DataFrame()
        
        try:
            df = pd.read_csv(file_path)
            
            # Converte la colonna datetime se presente
            if 'datetime' in df.columns:
                df['datetime'] = pd.to_datetime(df['datetime'])
            
            logger.info(f"📊 Caricati {len(df)} record futures {instrument} da {os.path.basename(file_path)}")
            return df
            
        except Exception as e:
            logger.error(f"❌ Errore caricamento file futures {file_path}: {e}")
            return pd.DataFrame()

def calculate_option_levels(date: datetime, calculator: StructuralLevelsCalculator = None) -> Dict[str, Dict]:
    """
    Calcola i livelli di prezzo chiave dai dati delle opzioni del CME
    
    Args:
        date: Data per cui calcolare i livelli
        calculator: Istanza del calculator (opzionale, ne crea una nuova se None)
        
    Returns:
        Dizionario con i livelli per Call e Put per ogni strumento
    """
    if calculator is None:
        calculator = StructuralLevelsCalculator()
    
    logger.info(f"🎯 Calcolo livelli opzioni per {date.strftime('%Y-%m-%d')}")
    
    options_df = calculator.load_options_data(date)
    
    if options_df.empty:
        logger.warning("⚠️ Nessun dato opzioni disponibile")
        return {}
    
    results = {}
    
    # Processa ogni strumento presente nei dati
    for underlying in options_df['underlying'].unique():
        if underlying not in INSTRUMENT_CONFIG:
            logger.warning(f"⚠️ Strumento {underlying} non configurato, ignorato")
            continue
        
        instrument_data = options_df[options_df['underlying'] == underlying].copy()
        
        if instrument_data.empty:
            continue
        
        config = INSTRUMENT_CONFIG[underlying]
        
        # Calcola livelli per Call e Put separatamente
        call_levels = _calculate_option_levels_by_type(
            instrument_data[instrument_data['type'] == 'CALL'], 
            'CALL', config
        )
        
        put_levels = _calculate_option_levels_by_type(
            instrument_data[instrument_data['type'] == 'PUT'], 
            'PUT', config
        )
        
        results[underlying] = {
            'calls': call_levels,
            'puts': put_levels,
            'metadata': {
                'total_call_volume': instrument_data[instrument_data['type'] == 'CALL']['volume'].sum(),
                'total_put_volume': instrument_data[instrument_data['type'] == 'PUT']['volume'].sum(),
                'total_call_oi': instrument_data[instrument_data['type'] == 'CALL']['open_interest'].sum(),
                'total_put_oi': instrument_data[instrument_data['type'] == 'PUT']['open_interest'].sum(),
                'strike_range': {
                    'min': instrument_data['strike'].min(),
                    'max': instrument_data['strike'].max()
                }
            }
        }
        
        logger.info(f"✅ Livelli {underlying}: {len(call_levels)} CALL, {len(put_levels)} PUT")
    
    return results

def _calculate_option_levels_by_type(data: pd.DataFrame, option_type: str, config: Dict) -> List[Dict]:
    """
    Calcola i livelli per un tipo di opzione specifico (Call o Put)
    
    Args:
        data: DataFrame filtrato per tipo di opzione
        option_type: 'CALL' o 'PUT'
        config: Configurazione dello strumento
        
    Returns:
        Lista di livelli ordinati per rilevanza
    """
    if data.empty:
        return []
    
    # Filtra per Open Interest minimo
    significant_data = data[data['open_interest'] >= MIN_OPEN_INTEREST_THRESHOLD].copy()
    
    if significant_data.empty:
        logger.debug(f"Nessuna opzione {option_type} con OI significativo")
        return []
    
    # Calcola score di rilevanza combinando Volume e Open Interest
    significant_data['relevance_score'] = (
        significant_data['volume'] * 0.4 +
        significant_data['open_interest'] * 0.6
    )
    
    # Ordina per rilevanza decrescente
    significant_data = significant_data.sort_values('relevance_score', ascending=False)
    
    # Prende i top 3-5 livelli, evitando strike troppo vicini
    selected_levels = []
    min_distance = config['min_level_distance']
    
    for _, row in significant_data.iterrows():
        current_strike = row['strike']
        
        # Verifica distanza minima dai livelli già selezionati
        too_close = any(
            abs(current_strike - level['strike']) < min_distance 
            for level in selected_levels
        )
        
        if not too_close:
            selected_levels.append({
                'strike': float(current_strike),
                'type': option_type,
                'volume': int(row['volume']),
                'open_interest': int(row['open_interest']),
                'relevance_score': float(row['relevance_score']),
                'option_symbol': row.get('option_symbol', f"{current_strike}{option_type[0]}")
            })
        
        # Limita a massimo 5 livelli per tipo
        if len(selected_levels) >= 5:
            break
    
    return selected_levels

def calculate_volume_profile(date: datetime, instrument_symbol: str, calculator: StructuralLevelsCalculator = None) -> Dict[str, float]:
    """
    Calcola il Volume Profile per un futures specifico
    Include Point of Control (POC), Value Area High (VAH) e Value Area Low (VAL)
    
    Args:
        date: Data per cui calcolare il profile
        instrument_symbol: Simbolo strumento (ES, NQ)
        calculator: Istanza del calculator (opzionale)
        
    Returns:
        Dizionario con POC, VAH, VAL e statistiche aggiuntive
    """
    if calculator is None:
        calculator = StructuralLevelsCalculator()
    
    logger.info(f"📊 Calcolo Volume Profile {instrument_symbol} per {date.strftime('%Y-%m-%d')}")
    
    futures_df = calculator.load_futures_data(date, instrument_symbol)
    
    if futures_df.empty:
        logger.warning(f"⚠️ Nessun dato futures per {instrument_symbol}")
        return {}
    
    if instrument_symbol not in INSTRUMENT_CONFIG:
        logger.error(f"❌ Strumento {instrument_symbol} non configurato")
        return {}
    
    config = INSTRUMENT_CONFIG[instrument_symbol]
    
    try:
        # Calcola il range di prezzo per la sessione
        session_high = futures_df['high'].max()
        session_low = futures_df['low'].min()
        price_range = session_high - session_low
        
        if price_range <= 0:
            logger.warning(f"⚠️ Range di prezzo invalido per {instrument_symbol}")
            return {}
        
        # Crea bins per il volume profile
        num_bins = config['volume_profile_bins']
        bin_size = price_range / num_bins
        
        # Definisce i bin di prezzo
        price_bins = np.linspace(session_low, session_high, num_bins + 1)
        
        # Calcola il volume per ogni bin di prezzo
        volume_by_price = np.zeros(num_bins)
        
        for _, row in futures_df.iterrows():
            # Per ogni candela, distribuisce il volume nel range OHLC
            candle_low = row['low']
            candle_high = row['high']
            candle_volume = row.get('volume', 0)
            
            if candle_volume <= 0:
                continue
            
            # Trova i bin che intersecano questa candela
            start_bin = max(0, np.digitize(candle_low, price_bins) - 1)
            end_bin = min(num_bins - 1, np.digitize(candle_high, price_bins) - 1)
            
            # Distribuisce il volume proporzionalmente nei bin intersecati
            if start_bin == end_bin:
                volume_by_price[start_bin] += candle_volume
            else:
                bins_in_range = end_bin - start_bin + 1
                volume_per_bin = candle_volume / bins_in_range
                for bin_idx in range(start_bin, end_bin + 1):
                    volume_by_price[bin_idx] += volume_per_bin
        
        # Trova il Point of Control (prezzo con maggior volume)
        poc_bin = np.argmax(volume_by_price)
        poc_price = (price_bins[poc_bin] + price_bins[poc_bin + 1]) / 2
        
        # Calcola la Value Area (70% del volume totale)
        total_volume = np.sum(volume_by_price)
        target_volume = total_volume * VALUE_AREA_PERCENTAGE
        
        # Espande dal POC fino a raggiungere il 70% del volume
        value_area_volume = volume_by_price[poc_bin]
        va_low_bin = poc_bin
        va_high_bin = poc_bin
        
        while value_area_volume < target_volume and (va_low_bin > 0 or va_high_bin < num_bins - 1):
            # Determina quale direzione aggiungere (quella con più volume)
            low_volume = volume_by_price[va_low_bin - 1] if va_low_bin > 0 else 0
            high_volume = volume_by_price[va_high_bin + 1] if va_high_bin < num_bins - 1 else 0
            
            if low_volume >= high_volume and va_low_bin > 0:
                va_low_bin -= 1
                value_area_volume += volume_by_price[va_low_bin]
            elif high_volume > 0 and va_high_bin < num_bins - 1:
                va_high_bin += 1
                value_area_volume += volume_by_price[va_high_bin]
            else:
                break
        
        # Calcola VAH e VAL
        val_price = (price_bins[va_low_bin] + price_bins[va_low_bin + 1]) / 2
        vah_price = (price_bins[va_high_bin] + price_bins[va_high_bin + 1]) / 2
        
        # Statistiche aggiuntive
        total_ticks_traded = len(futures_df)
        average_volume_per_tick = total_volume / total_ticks_traded if total_ticks_traded > 0 else 0
        
        result = {
            'poc': round(poc_price, 2),
            'vah': round(vah_price, 2),
            'val': round(val_price, 2),
            'session_high': round(session_high, 2),
            'session_low': round(session_low, 2),
            'total_volume': int(total_volume),
            'value_area_volume': int(value_area_volume),
            'value_area_percentage': round(value_area_volume / total_volume * 100, 1),
            'ticks_in_session': total_ticks_traded,
            'average_volume_per_tick': round(average_volume_per_tick, 1),
            'price_range': round(price_range, 2),
            'bin_size': round(bin_size, 3)
        }
        
        logger.info(f"✅ Volume Profile {instrument_symbol}: POC={result['poc']}, VAH={result['vah']}, VAL={result['val']}")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Errore calcolo Volume Profile per {instrument_symbol}: {e}")
        return {}

def get_combined_structural_levels(date: datetime, instruments: List[str] = None) -> Dict[str, Dict]:
    """
    Ottiene tutti i livelli strutturali combinati per una data specifica
    
    Args:
        date: Data per cui calcolare i livelli
        instruments: Lista degli strumenti (default: ['ES', 'NQ'])
        
    Returns:
        Dizionario completo con livelli opzioni e volume profile per ogni strumento
    """
    if instruments is None:
        instruments = list(INSTRUMENT_CONFIG.keys())
    
    logger.info(f"🎯 Calcolo livelli strutturali combinati per {date.strftime('%Y-%m-%d')}")
    
    calculator = StructuralLevelsCalculator()
    combined_results = {}
    
    # Calcola livelli opzioni una volta per tutti gli strumenti
    option_levels = calculate_option_levels(date, calculator)
    
    # Calcola volume profile per ogni strumento
    for instrument in instruments:
        logger.info(f"📊 Processando {instrument}...")
        
        volume_profile = calculate_volume_profile(date, instrument, calculator)
        
        combined_results[instrument] = {
            'option_levels': option_levels.get(instrument, {}),
            'volume_profile': volume_profile,
            'instrument_config': INSTRUMENT_CONFIG.get(instrument, {}),
            'calculation_date': date.strftime('%Y-%m-%d'),
            'calculation_timestamp': datetime.now().isoformat()
        }
    
    return combined_results

def identify_confluence_zones(structural_levels: Dict[str, Dict], price_tolerance: float = 2.0) -> Dict[str, List[Dict]]:
    """
    Identifica zone di confluenza dove più livelli strutturali si sovrappongono
    
    Args:
        structural_levels: Risultato di get_combined_structural_levels()
        price_tolerance: Tolleranza in punti per considerare livelli come confluenti
        
    Returns:
        Dizionario con zone di confluenza per strumento
    """
    confluence_results = {}
    
    for instrument, data in structural_levels.items():
        if not data:
            continue
            
        logger.info(f"🔍 Ricerca confluenze per {instrument}")
        
        all_levels = []
        
        # Raccoglie tutti i livelli con le loro tipologie
        option_data = data.get('option_levels', {})
        
        # Livelli dalle opzioni Call
        for call_level in option_data.get('calls', []):
            all_levels.append({
                'price': call_level['strike'],
                'type': 'CALL_STRIKE',
                'strength': call_level.get('relevance_score', 0),
                'volume': call_level.get('volume', 0),
                'open_interest': call_level.get('open_interest', 0)
            })
        
        # Livelli dalle opzioni Put
        for put_level in option_data.get('puts', []):
            all_levels.append({
                'price': put_level['strike'],
                'type': 'PUT_STRIKE', 
                'strength': put_level.get('relevance_score', 0),
                'volume': put_level.get('volume', 0),
                'open_interest': put_level.get('open_interest', 0)
            })
        
        # Livelli dal volume profile
        volume_data = data.get('volume_profile', {})
        if volume_data:
            for level_type, price_key in [('POC', 'poc'), ('VAH', 'vah'), ('VAL', 'val')]:
                if price_key in volume_data:
                    all_levels.append({
                        'price': volume_data[price_key],
                        'type': level_type,
                        'strength': volume_data.get('total_volume', 0),
                        'volume': volume_data.get('total_volume', 0)
                    })
        
        # Trova confluenze
        confluences = []
        
        for i, level1 in enumerate(all_levels):
            confluent_levels = [level1]
            
            for j, level2 in enumerate(all_levels):
                if i != j and abs(level1['price'] - level2['price']) <= price_tolerance:
                    confluent_levels.append(level2)
            
            # Se ci sono almeno 2 livelli confluenti, crea una zona
            if len(confluent_levels) >= 2:
                # Evita duplicati controllando se questa confluenza esiste già
                existing = any(
                    abs(conf['center_price'] - level1['price']) <= price_tolerance
                    for conf in confluences
                )
                
                if not existing:
                    total_strength = sum(level.get('strength', 0) for level in confluent_levels)
                    avg_price = sum(level['price'] for level in confluent_levels) / len(confluent_levels)
                    
                    confluences.append({
                        'center_price': round(avg_price, 2),
                        'level_count': len(confluent_levels),
                        'total_strength': total_strength,
                        'types': [level['type'] for level in confluent_levels],
                        'price_range': {
                            'min': min(level['price'] for level in confluent_levels),
                            'max': max(level['price'] for level in confluent_levels)
                        },
                        'contributing_levels': confluent_levels
                    })
        
        # Ordina per forza decrescente
        confluences.sort(key=lambda x: (x['level_count'], x['total_strength']), reverse=True)
        
        confluence_results[instrument] = confluences[:10]  # Limita ai top 10
        
        logger.info(f"✅ {instrument}: trovate {len(confluences)} zone di confluenza")
    
    return confluence_results

def main():
    """Funzione di test per verificare il funzionamento dei moduli"""
    import json
    
    # Test con data di ieri
    test_date = datetime.now() - timedelta(days=1)
    
    print(f"🧪 Test modulo structural_levels per {test_date.strftime('%Y-%m-%d')}")
    
    try:
        # Test calcolo livelli combinati
        structural_levels = get_combined_structural_levels(test_date)
        
        if structural_levels:
            print(f"✅ Livelli strutturali calcolati per {len(structural_levels)} strumenti")
            
            # Test identificazione confluenze
            confluences = identify_confluence_zones(structural_levels)
            
            print(f"✅ Zone di confluenza identificate per {len(confluences)} strumenti")
            
            # Stampa risultati riassuntivi
            for instrument, data in structural_levels.items():
                option_levels = data.get('option_levels', {})
                volume_profile = data.get('volume_profile', {})
                instrument_confluences = confluences.get(instrument, [])
                
                print(f"\n📊 {instrument}:")
                print(f"   Livelli Call: {len(option_levels.get('calls', []))}")
                print(f"   Livelli Put: {len(option_levels.get('puts', []))}")
                print(f"   Volume Profile: {'✅' if volume_profile else '❌'}")
                print(f"   Confluenze: {len(instrument_confluences)}")
                
                if volume_profile:
                    print(f"   POC: {volume_profile.get('poc', 'N/A')}")
                    print(f"   VAH: {volume_profile.get('vah', 'N/A')}")
                    print(f"   VAL: {volume_profile.get('val', 'N/A')}")
        else:
            print("⚠️ Nessun livello strutturale calcolato - verificare dati nella data_lake")
            
    except Exception as e:
        print(f"❌ Errore durante il test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()