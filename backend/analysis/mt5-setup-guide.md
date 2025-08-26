# MT5 Direct Connection Setup Guide

This guide explains how to set up direct MetaTrader 5 integration without broker API keys.

## Prerequisites

1. **MetaTrader 5 Terminal** installed on Windows (or Windows VM/VPS)
2. **Python 3.7+** installed
3. **Demo or Live Trading Account** with your broker

## Setup Steps

### 1. Install MetaTrader 5

Download and install MT5 from your broker or from MetaQuotes:
- [MetaTrader 5 Download](https://www.metatrader5.com/en/download)

### 2. Install Python Dependencies

```bash
pip install MetaTrader5 flask flask-cors
```

### 3. Configure MT5 Account

1. Open MetaTrader 5
2. Go to **File → Login to Trade Account**
3. Enter your account credentials:
   - **Login**: Your account number
   - **Password**: Your account password  
   - **Server**: Your broker's server (e.g., "Demo-Server", "Live-Server")
4. Make sure **"Allow automated trading"** is enabled in Tools → Options → Expert Advisors

### 4. Start the Python Server

1. Save the `mt5-python-server.py` file to your computer
2. Run the server:
```bash
python mt5-python-server.py
```
3. The server will start on `http://localhost:8080`

### 5. Configure Leap Secrets

In the Leap Infrastructure tab, add these secrets:

```
# MT5 Connection Settings
MT5ServerHost=localhost
MT5ServerPort=8080
MT5Login=your_mt5_account_number
MT5Password=your_mt5_password
MT5Server=your_broker_server_name
```

### 6. Test the Connection

1. Start your Telegram bot
2. Send `/status` to check if MT5 is connected
3. Try generating a signal with `/predict EURUSD`
4. Execute a test trade with `/execute TRADE_ID 0.01`

## Broker-Specific Setup

### Popular Brokers

**XM Global**
- Server format: `XMGlobal-Demo` or `XMGlobal-Real`
- Supports most major pairs and metals

**IC Markets**
- Server format: `ICMarkets-Demo` or `ICMarkets-Live01`
- Low spreads, good for scalping

**FXCM**
- Server format: `FXCM-Demo` or `FXCM-Server`
- US-regulated broker

**Exness**
- Server format: `Exness-Demo` or `Exness-Real`
- High leverage available

### Symbol Formats

Different brokers may use different symbol formats:

| Standard | Some Brokers |
|----------|--------------|
| EURUSD   | EURUSDm      |
| GBPUSD   | GBPUSDm      |
| XAUUSD   | GOLD         |
| CRUDE    | WTI          |

## Troubleshooting

### Common Issues

**1. "MT5 initialization failed"**
- Ensure MT5 is running and logged in
- Check if automated trading is enabled
- Restart MT5 and try again

**2. "Login failed"**
- Verify account credentials
- Check server name (case-sensitive)
- Ensure account allows automated trading

**3. "Trade disabled"**
- Check if market is open
- Verify account has sufficient margin
- Ensure symbol is available for trading

**4. "Connection timeout"**
- Check if Python server is running
- Verify firewall settings
- Test with `curl http://localhost:8080/status`

### Debug Mode

To enable debug logging in the Python server:

```python
# In mt5-python-server.py, change:
app.run(host='0.0.0.0', port=8080, debug=True)
```

### Testing Without Real Money

1. **Use Demo Account**: Always test with demo account first
2. **Small Lot Sizes**: Start with 0.01 lots
3. **Simulation Mode**: The system falls back to simulation if MT5 is unavailable

## Security Considerations

1. **Local Network Only**: The Python server runs on localhost by default
2. **No API Keys**: No need to store broker API keys
3. **Direct Control**: You maintain full control over your MT5 terminal
4. **Account Protection**: Use demo accounts for testing

## Production Deployment

For production use:

1. **VPS Hosting**: Use a Windows VPS for 24/7 operation
2. **Stable Connection**: Ensure reliable internet connection
3. **Monitoring**: Set up monitoring for the Python server
4. **Backup**: Keep backup of your trading configuration

## Alternative: Expert Advisor

If you prefer, you can create a custom Expert Advisor (EA) that exposes REST API endpoints. This provides more control but requires MQL5 programming knowledge.

The Python server approach is recommended for most users as it's easier to set up and maintain.
