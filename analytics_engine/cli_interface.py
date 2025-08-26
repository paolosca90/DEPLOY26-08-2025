#!/usr/bin/env python3
"""
Interfaccia CLI per testare i moduli dell'analytics engine.
Permette di eseguire analisi strutturali e calcoli di basis da linea di comando,
facilitando il debug e l'integrazione con il sistema TypeScript.
"""

import argparse
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Importa i moduli dell'analytics engine
from structural_levels import (
    StructuralLevelsCalculator, 
    calculate_option_levels, 
    calculate_volume_profile,
    get_combined_structural_levels,
    identify_confluence_zones
)
from price_mapper import PriceMapper

# Configurazione logging per CLI
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def setup_cli_parser() -> argparse.ArgumentParser:
    """Configura il parser degli argomenti CLI"""
    parser = argparse.ArgumentParser(
        description='CLI per Analytics Engine - Analisi Strutturale e Price Mapping'
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Comandi disponibili')
    
    # Comando: structural-levels
    levels_parser = subparsers.add_parser('structural-levels', help='Calcola livelli strutturali')
    levels_parser.add_argument('--date', type=str, help='Data in formato YYYY-MM-DD (default: ieri)')
    levels_parser.add_argument('--instruments', type=str, default='ES,NQ', help='Strumenti separati da virgola (default: ES,NQ)')
    levels_parser.add_argument('--output-format', choices=['json', 'pretty'], default='json', help='Formato output')
    levels_parser.add_argument('--include-confluences', action='store_true', help='Includi zone di confluenza')
    
    # Comando: basis
    basis_parser = subparsers.add_parser('basis', help='Calcola basis futures-CFD')
    basis_parser.add_argument('--instrument', type=str, required=True, help='Codice strumento (ES, NQ, etc.)')
    basis_parser.add_argument('--action', choices=['get_basis', 'validate'], default='get_basis', help='Azione da eseguire')
    basis_parser.add_argument('--output-format', choices=['json', 'pretty'], default='json', help='Formato output')
    
    # Comando: confluence
    confluence_parser = subparsers.add_parser('confluence', help='Analizza confluenza per prezzo specifico')
    confluence_parser.add_argument('--price', type=float, required=True, help='Prezzo da analizzare')
    confluence_parser.add_argument('--instrument', type=str, required=True, help='Strumento (ES, NQ, etc.)')
    confluence_parser.add_argument('--date', type=str, help='Data livelli strutturali (YYYY-MM-DD)')
    confluence_parser.add_argument('--tolerance', type=float, default=5.0, help='Tolleranza in punti (default: 5.0)')
    
    # Comando: test
    test_parser = subparsers.add_parser('test', help='Esegue test completo del sistema')
    test_parser.add_argument('--quick', action='store_true', help='Test rapido (solo funzioni principali)')
    
    return parser

def parse_date(date_str: str = None) -> datetime:
    """Parsa una data string o restituisce ieri se None"""
    if date_str:
        try:
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            logger.error(f"Formato data non valido: {date_str}. Usa YYYY-MM-DD")
            sys.exit(1)
    else:
        # Default: ieri
        yesterday = datetime.now() - timedelta(days=1)
        return yesterday

def format_output(data: Any, format_type: str) -> str:
    """Formatta l'output secondo il tipo richiesto"""
    if format_type == 'json':
        return json.dumps(data, indent=2, default=str)
    elif format_type == 'pretty':
        return format_pretty_output(data)
    else:
        return str(data)

def format_pretty_output(data: Any) -> str:
    """Formatta output in modo human-readable"""
    if isinstance(data, dict):
        lines = []
        for key, value in data.items():
            if isinstance(value, dict):
                lines.append(f"{key}:")
                for sub_key, sub_value in value.items():
                    lines.append(f"  {sub_key}: {sub_value}")
            elif isinstance(value, list) and value:
                lines.append(f"{key}: {len(value)} items")
                for i, item in enumerate(value[:3]):  # Mostra solo primi 3
                    lines.append(f"  [{i}] {item}")
                if len(value) > 3:
                    lines.append(f"  ... e altri {len(value) - 3}")
            else:
                lines.append(f"{key}: {value}")
        return "\n".join(lines)
    else:
        return str(data)

def command_structural_levels(args) -> Dict[str, Any]:
    """Esegue comando per calcolare livelli strutturali"""
    date = parse_date(args.date)
    instruments = [inst.strip() for inst in args.instruments.split(',')]
    
    logger.info(f"Calcolo livelli strutturali per {instruments} del {date.strftime('%Y-%m-%d')}")
    
    try:
        # Calcola livelli strutturali combinati
        structural_levels = get_combined_structural_levels(date, instruments)
        
        result = {
            'success': True,
            'date': date.strftime('%Y-%m-%d'),
            'instruments': instruments,
            'data': structural_levels
        }
        
        # Aggiungi confluenze se richiesto
        if args.include_confluences:
            logger.info("Calcolo zone di confluenza...")
            confluences = identify_confluence_zones(structural_levels)
            result['confluences'] = confluences
        
        logger.info(f"✅ Livelli calcolati per {len(structural_levels)} strumenti")
        return result
        
    except Exception as e:
        logger.error(f"❌ Errore calcolo livelli strutturali: {e}")
        return {
            'success': False,
            'error': str(e),
            'date': date.strftime('%Y-%m-%d'),
            'instruments': instruments
        }

def command_basis(args) -> Dict[str, Any]:
    """Esegue comando per calcolare basis"""
    instrument = args.instrument.upper()
    
    logger.info(f"Calcolo basis per {instrument}")
    
    try:
        mapper = PriceMapper()
        
        if args.action == 'get_basis':
            basis_data = mapper.get_current_basis(instrument)
            
            if basis_data:
                return {
                    'success': True,
                    'instrument': instrument,
                    'action': 'get_basis',
                    'data': basis_data
                }
            else:
                return {
                    'success': False,
                    'instrument': instrument,
                    'error': 'Impossibile calcolare basis',
                    'action': 'get_basis'
                }
                
        elif args.action == 'validate':
            # Test di validazione del sistema
            test_results = []
            
            # Test connessione MT5
            mt5_connected = mapper.mt5_provider.is_connected
            test_results.append({
                'test': 'MT5 Connection',
                'success': mt5_connected,
                'message': 'Connesso' if mt5_connected else 'Disconnesso'
            })
            
            # Test API Finnhub
            try:
                finnhub_test = mapper.finnhub_provider.get_future_price('CME:ES')
                test_results.append({
                    'test': 'Finnhub API',
                    'success': finnhub_test is not None,
                    'message': f'Prezzo ottenuto: {finnhub_test}' if finnhub_test else 'Nessun dato'
                })
            except:
                test_results.append({
                    'test': 'Finnhub API',
                    'success': False,
                    'message': 'Errore connessione'
                })
            
            return {
                'success': True,
                'instrument': instrument,
                'action': 'validate',
                'tests': test_results,
                'overall_success': all(test['success'] for test in test_results)
            }
    
    except Exception as e:
        logger.error(f"❌ Errore comando basis: {e}")
        return {
            'success': False,
            'instrument': instrument,
            'error': str(e)
        }

def command_confluence(args) -> Dict[str, Any]:
    """Esegue analisi di confluenza per un prezzo specifico"""
    price = args.price
    instrument = args.instrument.upper()
    date = parse_date(args.date)
    tolerance = args.tolerance
    
    logger.info(f"Analisi confluenza per {instrument} @ {price} (tolleranza: ±{tolerance})")
    
    try:
        # Ottieni livelli strutturali
        structural_levels = get_combined_structural_levels(date, [instrument])
        instrument_levels = structural_levels.get(instrument)
        
        if not instrument_levels:
            return {
                'success': False,
                'error': f'Livelli strutturali non disponibili per {instrument}',
                'instrument': instrument,
                'price': price,
                'date': date.strftime('%Y-%m-%d')
            }
        
        # Calcola basis
        mapper = PriceMapper()
        basis_data = mapper.get_current_basis(instrument)
        
        # Simula calcolo confluenza (logica semplificata)
        nearby_levels = []
        confluence_score = 0
        contributing_factors = []
        
        # Controlla opzioni Call
        for call in instrument_levels.get('option_levels', {}).get('calls', []):
            adjusted_strike = call['strike'] + (basis_data['basis'] if basis_data else 0)
            distance = abs(price - adjusted_strike)
            
            if distance <= tolerance:
                nearby_levels.append({
                    'type': 'CALL_STRIKE',
                    'level': adjusted_strike,
                    'distance': distance,
                    'strength': call.get('relevance_score', call.get('open_interest', 0))
                })
                confluence_score += 2
                contributing_factors.append('NEAR_CALL_STRIKE')
        
        # Controlla opzioni Put
        for put in instrument_levels.get('option_levels', {}).get('puts', []):
            adjusted_strike = put['strike'] + (basis_data['basis'] if basis_data else 0)
            distance = abs(price - adjusted_strike)
            
            if distance <= tolerance:
                nearby_levels.append({
                    'type': 'PUT_STRIKE',
                    'level': adjusted_strike,
                    'distance': distance,
                    'strength': put.get('relevance_score', put.get('open_interest', 0))
                })
                confluence_score += 2
                contributing_factors.append('NEAR_PUT_STRIKE')
        
        # Controlla volume profile
        vp = instrument_levels.get('volume_profile', {})
        for level_type, price_key in [('POC', 'poc'), ('VAH', 'vah'), ('VAL', 'val')]:
            if price_key in vp and vp[price_key]:
                adjusted_level = vp[price_key] + (basis_data['basis'] if basis_data else 0)
                distance = abs(price - adjusted_level)
                
                if distance <= tolerance:
                    nearby_levels.append({
                        'type': level_type,
                        'level': adjusted_level,
                        'distance': distance,
                        'strength': vp.get('total_volume', 0)
                    })
                    confluence_score += 3 if level_type == 'POC' else 2.5
                    contributing_factors.append(f'NEAR_{level_type}')
        
        return {
            'success': True,
            'instrument': instrument,
            'price': price,
            'date': date.strftime('%Y-%m-%d'),
            'tolerance': tolerance,
            'confluence_analysis': {
                'confluence_score': confluence_score,
                'contributing_factors': contributing_factors,
                'nearby_levels': nearby_levels
            },
            'basis_data': basis_data
        }
        
    except Exception as e:
        logger.error(f"❌ Errore analisi confluenza: {e}")
        return {
            'success': False,
            'error': str(e),
            'instrument': instrument,
            'price': price
        }

def command_test(args) -> Dict[str, Any]:
    """Esegue test completo del sistema"""
    logger.info("🧪 Avvio test sistema analytics engine")
    
    results = {
        'success': True,
        'timestamp': datetime.now().isoformat(),
        'tests': []
    }
    
    # Test 1: Structural Levels Calculator
    try:
        logger.info("Test 1: StructuralLevelsCalculator")
        calculator = StructuralLevelsCalculator()
        test_date = datetime.now() - timedelta(days=1)
        
        # Test caricamento dati (anche se fallisce, è ok)
        options_df = calculator.load_options_data(test_date)
        futures_df = calculator.load_futures_data(test_date, 'ES')
        
        results['tests'].append({
            'name': 'StructuralLevelsCalculator',
            'success': True,
            'details': {
                'options_records': len(options_df) if not options_df.empty else 0,
                'futures_records': len(futures_df) if not futures_df.empty else 0
            }
        })
        
    except Exception as e:
        results['tests'].append({
            'name': 'StructuralLevelsCalculator',
            'success': False,
            'error': str(e)
        })
        results['success'] = False
    
    # Test 2: PriceMapper
    try:
        logger.info("Test 2: PriceMapper")
        mapper = PriceMapper()
        
        # Test basis calculation per ES
        basis_result = mapper.get_current_basis('ES')
        
        results['tests'].append({
            'name': 'PriceMapper',
            'success': basis_result is not None,
            'details': {
                'basis_available': basis_result is not None,
                'basis_value': basis_result['basis'] if basis_result else None,
                'confidence': basis_result['confidence'] if basis_result else None
            }
        })
        
    except Exception as e:
        results['tests'].append({
            'name': 'PriceMapper', 
            'success': False,
            'error': str(e)
        })
        results['success'] = False
    
    if not args.quick:
        # Test 3: Integration Test
        try:
            logger.info("Test 3: Integration Test")
            test_date = datetime.now() - timedelta(days=1)
            
            # Test flusso completo per ES
            structural_levels = get_combined_structural_levels(test_date, ['ES'])
            
            results['tests'].append({
                'name': 'Integration Test',
                'success': True,
                'details': {
                    'instruments_processed': len(structural_levels),
                    'has_es_data': 'ES' in structural_levels
                }
            })
            
        except Exception as e:
            results['tests'].append({
                'name': 'Integration Test',
                'success': False,
                'error': str(e)
            })
            results['success'] = False
    
    # Summary
    successful_tests = sum(1 for test in results['tests'] if test['success'])
    total_tests = len(results['tests'])
    
    results['summary'] = {
        'total_tests': total_tests,
        'successful_tests': successful_tests,
        'success_rate': f"{successful_tests/total_tests*100:.1f}%" if total_tests > 0 else "0%"
    }
    
    logger.info(f"📊 Test completati: {successful_tests}/{total_tests} successi")
    
    return results

def main():
    """Funzione principale CLI"""
    parser = setup_cli_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Esegui comando richiesto
    try:
        if args.command == 'structural-levels':
            result = command_structural_levels(args)
        elif args.command == 'basis':
            result = command_basis(args)
        elif args.command == 'confluence':
            result = command_confluence(args)
        elif args.command == 'test':
            result = command_test(args)
        else:
            logger.error(f"Comando non riconosciuto: {args.command}")
            sys.exit(1)
        
        # Output risultato
        output = format_output(result, getattr(args, 'output_format', 'json'))
        print(output)
        
        # Exit code basato su successo
        exit_code = 0 if result.get('success', False) else 1
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        logger.info("🛑 Comando interrotto dall'utente")
        sys.exit(130)
    except Exception as e:
        logger.error(f"❌ Errore imprevisto: {e}")
        print(json.dumps({
            'success': False,
            'error': f'Errore imprevisto: {str(e)}',
            'command': args.command
        }, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()