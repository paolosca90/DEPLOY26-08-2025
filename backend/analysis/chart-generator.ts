import { secret } from "encore.dev/config";
import { TimeframeData } from "./market-data";
import { AIAnalysis } from "./ai-engine";

const quickChartApiKey = secret("QuickChartApiKey");

export async function generateChart(
  symbol: string, 
  marketData: TimeframeData, 
  analysis: AIAnalysis
): Promise<string> {
  try {
    // Use QuickChart.io for chart generation
    const chartUrl = await generateQuickChart(symbol, marketData, analysis);
    if (chartUrl) {
      return chartUrl;
    }
  } catch (error) {
    console.error("Error generating chart with QuickChart:", error);
  }

  // Fallback to TradingView widget URL
  return generateTradingViewWidget(symbol, analysis);
}

async function generateQuickChart(
  symbol: string,
  marketData: TimeframeData,
  analysis: AIAnalysis
): Promise<string | null> {
  try {
    const data5m = marketData["5m"];
    const data15m = marketData["15m"];
    const data30m = marketData["30m"];

    // Create chart configuration
    const chartConfig = {
      type: 'line',
      data: {
        labels: ['30m ago', '15m ago', '5m ago', 'Now'],
        datasets: [
          {
            label: `${symbol} Price`,
            data: [data30m.close, data15m.close, data5m.close, data5m.close],
            borderColor: analysis.direction === 'LONG' ? '#10B981' : '#EF4444',
            backgroundColor: analysis.direction === 'LONG' ? '#10B98120' : '#EF444420',
            borderWidth: 3,
            fill: true,
          },
          {
            label: 'Take Profit',
            data: [null, null, null, analysis.direction === 'LONG' ? 
              data5m.close + data5m.indicators.atr * 2 : 
              data5m.close - data5m.indicators.atr * 2],
            borderColor: '#10B981',
            borderDash: [5, 5],
            pointRadius: 8,
            pointBackgroundColor: '#10B981',
          },
          {
            label: 'Stop Loss',
            data: [null, null, null, analysis.direction === 'LONG' ? 
              data5m.close - data5m.indicators.atr * 1.5 : 
              data5m.close + data5m.indicators.atr * 1.5],
            borderColor: '#EF4444',
            borderDash: [5, 5],
            pointRadius: 8,
            pointBackgroundColor: '#EF4444',
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `${symbol} - ${analysis.direction} Signal (${analysis.confidence}% confidence)`,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Price'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          }
        }
      }
    };

    // Generate chart URL
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=800&height=400&format=png`;
    
    // Test if the URL is accessible
    const response = await fetch(chartUrl, { method: 'HEAD' });
    if (response.ok) {
      return chartUrl;
    }
    
    return null;
  } catch (error) {
    console.error("Error generating QuickChart:", error);
    return null;
  }
}

function generateTradingViewWidget(symbol: string, analysis: AIAnalysis): string {
  // Generate TradingView widget URL as fallback
  const tvSymbol = convertSymbolForTradingView(symbol);
  
  const params = new URLSearchParams({
    symbol: tvSymbol,
    interval: '5',
    theme: 'light',
    style: '1',
    locale: 'en',
    toolbar_bg: '#f1f3f6',
    enable_publishing: 'false',
    hide_top_toolbar: 'true',
    hide_legend: 'true',
    save_image: 'false',
    container_id: 'tradingview_chart',
    width: '800',
    height: '400'
  });

  return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
}

function convertSymbolForTradingView(symbol: string): string {
  const symbolMap: { [key: string]: string } = {
    "BTCUSD": "BINANCE:BTCUSDT",
    "ETHUSD": "BINANCE:ETHUSDT",
    "EURUSD": "FX:EURUSD",
    "GBPUSD": "FX:GBPUSD",
    "USDJPY": "FX:USDJPY",
    "AUDUSD": "FX:AUDUSD",
    "USDCAD": "FX:USDCAD",
    "USDCHF": "FX:USDCHF",
    "XAUUSD": "TVC:GOLD",
    "CRUDE": "NYMEX:CL1!",
    "BRENT": "ICE:BRN1!",
  };

  return symbolMap[symbol] || `FX:${symbol}`;
}

// Alternative chart generation using Chart.js server-side rendering
export async function generateChartWithChartJS(
  symbol: string,
  marketData: TimeframeData,
  analysis: AIAnalysis
): Promise<string> {
  // This would require a server-side Chart.js implementation
  // For now, return a placeholder
  const data5m = marketData["5m"];
  
  const chartParams = new URLSearchParams({
    symbol,
    price: data5m.close.toString(),
    direction: analysis.direction,
    support: analysis.support.toString(),
    resistance: analysis.resistance.toString(),
    confidence: analysis.confidence.toString(),
    tp: analysis.direction === "LONG" ? 
        (data5m.close + data5m.indicators.atr * 2).toString() :
        (data5m.close - data5m.indicators.atr * 2).toString(),
    sl: analysis.direction === "LONG" ? 
        (data5m.close - data5m.indicators.atr * 1.5).toString() :
        (data5m.close + data5m.indicators.atr * 1.5).toString(),
  });

  return `https://chart-api.example.com/generate?${chartParams.toString()}`;
}
