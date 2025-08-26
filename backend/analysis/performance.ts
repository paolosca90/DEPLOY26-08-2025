import { api } from "encore.dev/api";
import { analysisDB } from "./db";

interface PerformanceStats {
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  avgConfidence: number;
  totalProfitLoss: number;
  currentStreak: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

// Retrieves AI model performance statistics based on real trading results.
export const getPerformance = api<void, PerformanceStats>(
  { 
    expose: true, 
    method: "GET", 
    path: "/analysis/performance"
  },
  async () => {
    // Get comprehensive trading statistics from actual trades
    const stats = await analysisDB.queryRow`
      SELECT 
        CAST(COUNT(*) AS DOUBLE PRECISION) as total_trades,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION), 0.0) as win_rate,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_profit,
        COALESCE(CAST(AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_loss,
        COALESCE(CAST(MAX(profit_loss) AS DOUBLE PRECISION), 0.0) as best_trade,
        COALESCE(CAST(MIN(profit_loss) AS DOUBLE PRECISION), 0.0) as worst_trade,
        COALESCE(CAST(AVG(confidence) AS DOUBLE PRECISION), 0.0) as avg_confidence,
        COALESCE(CAST(SUM(profit_loss) AS DOUBLE PRECISION), 0.0) as total_profit_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
    `;

    // Calculate profit factor from actual trades
    const profitStats = await analysisDB.queryRow`
      SELECT 
        COALESCE(CAST(SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) AS DOUBLE PRECISION), 0.0) as total_profit,
        COALESCE(CAST(ABS(SUM(CASE WHEN profit_loss < 0 THEN profit_loss ELSE 0 END)) AS DOUBLE PRECISION), 1.0) as total_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
    `;

    // Calculate current streak from recent trades
    const recentTrades = await analysisDB.queryAll`
      SELECT profit_loss, created_at
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Calculate current winning/losing streak
    let currentStreak = 0;
    if (recentTrades.length > 0) {
      const isWinning = Number(recentTrades[0].profit_loss) > 0;
      for (const trade of recentTrades) {
        const tradeIsWin = Number(trade.profit_loss) > 0;
        if (tradeIsWin === isWinning) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (!isWinning) currentStreak = -currentStreak;
    }

    // Calculate max drawdown from actual trading results
    const drawdownData = await analysisDB.queryAll`
      SELECT 
        profit_loss,
        SUM(profit_loss) OVER (ORDER BY created_at) as running_total
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at
    `;

    let maxDrawdown = 0;
    let peak = 0;
    for (const row of drawdownData) {
      const runningTotal = Number(row.running_total);
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate Sharpe ratio from actual returns
    const returns = recentTrades.map(t => Number(t.profit_loss));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 1;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // If no real data, return zeros instead of demo data
    if (!stats || Number(stats.total_trades) === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        profitFactor: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgConfidence: 0,
        totalProfitLoss: 0,
        currentStreak: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
      };
    }

    const totalProfitValue = Number(profitStats?.total_profit) || 0;
    const totalLossValue = Number(profitStats?.total_loss) || 1;
    const profitFactor = totalLossValue > 0 ? totalProfitValue / totalLossValue : 0;

    return {
      totalTrades: Number(stats.total_trades) || 0,
      winRate: Number(stats.win_rate) || 0,
      avgProfit: Number(stats.avg_profit) || 0,
      avgLoss: Number(stats.avg_loss) || 0,
      profitFactor: Number(profitFactor) || 0,
      bestTrade: Number(stats.best_trade) || 0,
      worstTrade: Number(stats.worst_trade) || 0,
      avgConfidence: Number(stats.avg_confidence) || 0,
      totalProfitLoss: Number(stats.total_profit_loss) || 0,
      currentStreak,
      maxDrawdown,
      sharpeRatio: Number(sharpeRatio.toFixed(2)) || 0,
    };
  }
);

// Get detailed performance breakdown by time periods
export const getDetailedPerformance = api<void, {
  daily: PerformanceStats[];
  weekly: PerformanceStats[];
  monthly: PerformanceStats[];
}>(
  {
    expose: true,
    method: "GET",
    path: "/analysis/performance/detailed"
  },
  async () => {
    // Daily performance for last 30 days
    const dailyPerformance = await analysisDB.queryAll`
      SELECT 
        DATE(created_at) as trade_date,
        COUNT(*) as total_trades,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION), 0.0) as win_rate,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_profit,
        COALESCE(CAST(AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_loss,
        MAX(profit_loss) as best_trade,
        MIN(profit_loss) as worst_trade,
        COALESCE(CAST(AVG(confidence) AS DOUBLE PRECISION), 0.0) as avg_confidence,
        SUM(profit_loss) as total_profit_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY trade_date DESC
    `;

    // Weekly performance for last 12 weeks
    const weeklyPerformance = await analysisDB.queryAll`
      SELECT 
        DATE_TRUNC('week', created_at) as trade_week,
        COUNT(*) as total_trades,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION), 0.0) as win_rate,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_profit,
        COALESCE(CAST(AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_loss,
        MAX(profit_loss) as best_trade,
        MIN(profit_loss) as worst_trade,
        COALESCE(CAST(AVG(confidence) AS DOUBLE PRECISION), 0.0) as avg_confidence,
        SUM(profit_loss) as total_profit_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY trade_week DESC
    `;

    // Monthly performance for last 6 months
    const monthlyPerformance = await analysisDB.queryAll`
      SELECT 
        DATE_TRUNC('month', created_at) as trade_month,
        COUNT(*) as total_trades,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION), 0.0) as win_rate,
        COALESCE(CAST(AVG(CASE WHEN profit_loss > 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_profit,
        COALESCE(CAST(AVG(CASE WHEN profit_loss < 0 THEN profit_loss END) AS DOUBLE PRECISION), 0.0) as avg_loss,
        MAX(profit_loss) as best_trade,
        MIN(profit_loss) as worst_trade,
        COALESCE(CAST(AVG(confidence) AS DOUBLE PRECISION), 0.0) as avg_confidence,
        SUM(profit_loss) as total_profit_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY trade_month DESC
    `;

    const mapToPerformanceStats = (rows: any[]): PerformanceStats[] => {
      return rows.map(row => {
        const totalTrades = Number(row.total_trades) || 0;
        const avgProfit = Number(row.avg_profit) || 0;
        const avgLoss = Number(row.avg_loss) || 0;
        const profitFactor = avgLoss !== 0 ? Math.abs(avgProfit / avgLoss) : 0;

        return {
          totalTrades,
          winRate: Number(row.win_rate) || 0,
          avgProfit,
          avgLoss,
          profitFactor,
          bestTrade: Number(row.best_trade) || 0,
          worstTrade: Number(row.worst_trade) || 0,
          avgConfidence: Number(row.avg_confidence) || 0,
          totalProfitLoss: Number(row.total_profit_loss) || 0,
          currentStreak: 0, // Not calculated for historical data
          maxDrawdown: 0, // Not calculated for historical data
          sharpeRatio: 0, // Not calculated for historical data
        };
      });
    };

    return {
      daily: mapToPerformanceStats(dailyPerformance),
      weekly: mapToPerformanceStats(weeklyPerformance),
      monthly: mapToPerformanceStats(monthlyPerformance),
    };
  }
);

interface PerformanceBySymbol {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  avgConfidence: number;
  bestTrade: number;
  worstTrade: number;
}

interface GetPerformanceBySymbolResponse {
  performance: PerformanceBySymbol[];
}

// Get performance by symbol
export const getPerformanceBySymbol = api<void, GetPerformanceBySymbolResponse>(
  {
    expose: true,
    method: "GET",
    path: "/analysis/performance/by-symbol"
  },
  async () => {
    const symbolPerformance = await analysisDB.queryAll`
      SELECT 
        symbol,
        COUNT(*) as total_trades,
        CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION) as win_rate,
        SUM(profit_loss) as total_profit_loss,
        CAST(AVG(confidence) AS DOUBLE PRECISION) as avg_confidence,
        MAX(profit_loss) as best_trade,
        MIN(profit_loss) as worst_trade
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY symbol
      HAVING COUNT(*) >= 3
      ORDER BY total_profit_loss DESC
    `;

    const performance = symbolPerformance.map(row => ({
      symbol: row.symbol,
      totalTrades: Number(row.total_trades),
      winRate: Number(row.win_rate),
      totalProfitLoss: Number(row.total_profit_loss),
      avgConfidence: Number(row.avg_confidence),
      bestTrade: Number(row.best_trade),
      worstTrade: Number(row.worst_trade),
    }));

    return { performance };
  }
);

interface PerformanceByStrategy {
  strategy: string;
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  avgConfidence: number;
  avgHoldingTime: number;
}

interface GetPerformanceByStrategyResponse {
  performance: PerformanceByStrategy[];
}

// Get performance by strategy
export const getPerformanceByStrategy = api<void, GetPerformanceByStrategyResponse>(
  {
    expose: true,
    method: "GET",
    path: "/analysis/performance/by-strategy"
  },
  async () => {
    const strategyPerformance = await analysisDB.queryAll`
      SELECT 
        strategy,
        COUNT(*) as total_trades,
        CAST(AVG(CASE WHEN profit_loss > 0 THEN 1.0 ELSE 0.0 END) * 100 AS DOUBLE PRECISION) as win_rate,
        SUM(profit_loss) as total_profit_loss,
        CAST(AVG(confidence) AS DOUBLE PRECISION) as avg_confidence,
        CAST(AVG(EXTRACT(EPOCH FROM (closed_at - executed_at))/3600) AS DOUBLE PRECISION) as avg_holding_hours
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL
      AND status IN ('auto_closed', 'closed', 'executed')
      AND executed_at IS NOT NULL
      AND closed_at IS NOT NULL
      AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY strategy
      ORDER BY total_profit_loss DESC
    `;

    const performance = strategyPerformance.map(row => ({
      strategy: row.strategy,
      totalTrades: Number(row.total_trades),
      winRate: Number(row.win_rate),
      totalProfitLoss: Number(row.total_profit_loss),
      avgConfidence: Number(row.avg_confidence),
      avgHoldingTime: Number(row.avg_holding_hours) || 0,
    }));

    return { performance };
  }
);
