import MetaTrader5 as mt5
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global variable to track MT5 connection status
mt5_connected = False

def initialize_mt5():
    """Initialize MT5 connection"""
    global mt5_connected
    
    if not mt5.initialize():
        logger.error("Failed to initialize MT5")
        return False
    
    # Get account info to verify connection
    account_info = mt5.account_info()
    if account_info is None:
        logger.error("Failed to get account info")
        mt5.shutdown()
        return False
    
    logger.info(f"MT5 initialized successfully")
    logger.info(f"Account: {account_info.login}, Balance: {account_info.balance}, Server: {account_info.server}")
    mt5_connected = True
    return True

@app.route('/status', methods=['GET'])
def get_status():
    """Get MT5 connection and account status"""
    try:
        if not mt5_connected:
            return jsonify({
                'connected': False,
                'trade_allowed': False,
                'error': 'Not connected to MT5'
            })
        
        # Check if trading is allowed
        account_info = mt5.account_info()
        if account_info is None:
            return jsonify({
                'connected': False,
                'trade_allowed': False,
                'error': 'Failed to get account info'
            })
        
        return jsonify({
            'connected': True,
            'trade_allowed': account_info.trade_allowed,
            'server': account_info.server,
            'login': account_info.login,
            'balance': account_info.balance,
            'equity': account_info.equity,
            'margin': account_info.margin,
            'free_margin': account_info.margin_free,
            'margin_level': account_info.margin_level
        })
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({
            'connected': False,
            'trade_allowed': False,
            'error': str(e)
        }), 500

@app.route('/rates', methods=['POST'])
def get_rates():
    """Get historical rates for a symbol"""
    try:
        if not mt5_connected:
            return jsonify({'error': 'Not connected to MT5'}), 400
        
        data = request.get_json()
        symbol = data.get('symbol')
        timeframe = data.get('timeframe', '5m')
        count = data.get('count', 50)
        
        if not symbol:
            return jsonify({'error': 'Symbol is required'}), 400
        
        # Convert timeframe string to MT5 constant
        timeframe_map = {
            '1m': mt5.TIMEFRAME_M1,
            '5m': mt5.TIMEFRAME_M5,
            '15m': mt5.TIMEFRAME_M15,
            '30m': mt5.TIMEFRAME_M30,
            '1h': mt5.TIMEFRAME_H1,
            '4h': mt5.TIMEFRAME_H4,
            '1d': mt5.TIMEFRAME_D1
        }
        
        mt5_timeframe = timeframe_map.get(timeframe, mt5.TIMEFRAME_M5)
        
        # Get rates
        rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, count)
        
        if rates is None or len(rates) == 0:
            return jsonify({'error': f'No rates available for {symbol}'}), 404
        
        # Convert to list of dictionaries
        rates_list = []
        for rate in rates:
            rates_list.append({
                'time': int(rate['time']),
                'open': float(rate['open']),
                'high': float(rate['high']),
                'low': float(rate['low']),
                'close': float(rate['close']),
                'tick_volume': int(rate['tick_volume'])
            })
        
        return jsonify({
            'symbol': symbol,
            'timeframe': timeframe,
            'rates': rates_list
        })
        
    except Exception as e:
        logger.error(f"Get rates error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/symbol_info', methods=['POST'])
def get_symbol_info():
    """Get symbol information"""
    try:
        if not mt5_connected:
            return jsonify({'error': 'Not connected to MT5'}), 400
        
        data = request.get_json()
        symbol = data.get('symbol')
        
        if not symbol:
            return jsonify({'error': 'Symbol is required'}), 400
        
        symbol_info = mt5.symbol_info(symbol)
        
        if symbol_info is None:
            return jsonify({'error': f'Symbol {symbol} not found'}), 404
        
        return jsonify({
            'symbol_info': {
                'name': symbol_info.name,
                'visible': symbol_info.visible,
                'tradable': symbol_info.visible and symbol_info.select,
                'bid': symbol_info.bid,
                'ask': symbol_info.ask,
                'spread': symbol_info.spread,
                'digits': symbol_info.digits,
                'point': symbol_info.point,
                'volume_min': symbol_info.volume_min,
                'volume_max': symbol_info.volume_max,
                'volume_step': symbol_info.volume_step,
                'filling_mode': symbol_info.filling_mode
            }
        })
        
    except Exception as e:
        logger.error(f"Get symbol info error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/execute', methods=['POST'])
def execute_order():
    """Execute an order on MT5 with multiple filling mode attempts"""
    try:
        if not mt5_connected:
            return jsonify({
                'success': False,
                'error': 'Not connected to MT5'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request data missing'
            }), 400
        
        # Extract parameters from request
        symbol = data.get('symbol')
        action = data.get('action')  # 'BUY' or 'SELL'
        volume = data.get('volume', 0.1)
        sl = data.get('sl', 0)  # Stop Loss
        tp = data.get('tp', 0)  # Take Profit
        comment = data.get('comment', 'AI Trading Bot')
        
        if not symbol or not action:
            return jsonify({
                'success': False,
                'error': 'Symbol and action are required'
            }), 400
        
        # Convert action to MT5 type
        if action.upper() == 'BUY':
            order_type = mt5.ORDER_TYPE_BUY
        elif action.upper() == 'SELL':
            order_type = mt5.ORDER_TYPE_SELL
        else:
            return jsonify({
                'success': False,
                'error': f'Invalid action: {action}'
            }), 400
        
        # Get current price
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return jsonify({
                'success': False,
                'error': f'Cannot get price for {symbol}'
            }), 400
        
        # Use appropriate price (ask for BUY, bid for SELL)
        price = tick.ask if action.upper() == 'BUY' else tick.bid
        
        # Try different filling modes in order of preference
        filling_modes = [
            mt5.ORDER_FILLING_RETURN,  # Most compatible
            mt5.ORDER_FILLING_IOC,     # Immediate or Cancel
            mt5.ORDER_FILLING_FOK,     # Fill or Kill
        ]
        
        last_error = None
        
        for filling_mode in filling_modes:
            # Prepare order request
            request_dict = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": float(volume),
                "type": order_type,
                "price": price,
                "deviation": 20,
                "magic": 12345,
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode,
            }
            
            # Add SL and TP if specified
            if sl > 0:
                request_dict["sl"] = float(sl)
            if tp > 0:
                request_dict["tp"] = float(tp)
            
            logger.info(f"Trying filling mode {filling_mode} for order: {request_dict}")
            
            # Execute the order
            result = mt5.order_send(request_dict)
            
            if result is None:
                last_error = f"order_send returned None with filling mode {filling_mode}"
                logger.warning(last_error)
                continue
            
            # Check result
            if result.retcode == mt5.TRADE_RETCODE_DONE:
                logger.info(f"✅ Order executed successfully with filling mode {filling_mode}: Order {result.order}")
                return jsonify({
                    'success': True,
                    'order': result.order,
                    'deal': result.deal,
                    'price': result.price,
                    'volume': result.volume,
                    'comment': result.comment,
                    'filling_mode_used': filling_mode
                })
            else:
                last_error = f"Filling mode {filling_mode} failed: {result.retcode} - {result.comment}"
                logger.warning(last_error)
                continue
        
        # If all filling modes failed
        error_msg = f"All filling modes failed. Last error: {last_error}"
        logger.error(error_msg)
        return jsonify({
            'success': False,
            'error': error_msg
        }), 400
            
    except Exception as e:
        logger.error(f"Order execution error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/positions', methods=['GET'])
def get_positions():
    """Get current open positions"""
    try:
        if not mt5_connected:
            return jsonify({'error': 'Not connected to MT5'}), 400
        
        positions = mt5.positions_get()
        
        if positions is None:
            positions = []
        
        positions_list = []
        for pos in positions:
            positions_list.append({
                'ticket': pos.ticket,
                'symbol': pos.symbol,
                'type': pos.type,
                'volume': pos.volume,
                'price_open': pos.price_open,
                'price_current': pos.price_current,
                'profit': pos.profit,
                'swap': pos.swap,
                'comment': pos.comment
            })
        
        return jsonify({
            'positions': positions_list
        })
        
    except Exception as e:
        logger.error(f"Get positions error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/close_position', methods=['POST'])
def close_position():
    """Close an open position"""
    try:
        if not mt5_connected:
            return jsonify({
                'success': False,
                'error': 'Not connected to MT5'
            }), 400
        
        data = request.get_json()
        ticket = data.get('ticket')
        
        if not ticket:
            return jsonify({
                'success': False,
                'error': 'Position ticket is required'
            }), 400
        
        # Get position info
        position = mt5.positions_get(ticket=ticket)
        if not position:
            return jsonify({
                'success': False,
                'error': f'Position {ticket} not found'
            }), 404
        
        position = position[0]
        
        # Determine close order type (opposite of position type)
        if position.type == mt5.ORDER_TYPE_BUY:
            close_type = mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(position.symbol).bid
        else:
            close_type = mt5.ORDER_TYPE_BUY
            price = mt5.symbol_info_tick(position.symbol).ask
        
        # Try different filling modes for closing as well
        filling_modes = [
            mt5.ORDER_FILLING_RETURN,
            mt5.ORDER_FILLING_IOC,
            mt5.ORDER_FILLING_FOK,
        ]
        
        for filling_mode in filling_modes:
            # Prepare close request
            close_request = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": position.symbol,
                "volume": position.volume,
                "type": close_type,
                "position": ticket,
                "price": price,
                "deviation": 20,
                "magic": 12345,
                "comment": "Close by AI Bot",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode,
            }
            
            # Execute close order
            result = mt5.order_send(close_request)
            
            if result and result.retcode == mt5.TRADE_RETCODE_DONE:
                return jsonify({
                    'success': True,
                    'deal': result.deal,
                    'price': result.price,
                    'filling_mode_used': filling_mode
                })
        
        return jsonify({
            'success': False,
            'error': f'Close failed with all filling modes'
        }), 400
            
    except Exception as e:
        logger.error(f"Close position error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting MT5 Python Server...")
    
    # Initialize MT5 connection
    if initialize_mt5():
        logger.info("MT5 server ready on port 8080")
        app.run(host='0.0.0.0', port=8080, debug=False)
    else:
        logger.error("Failed to start MT5 server - MT5 initialization failed")
