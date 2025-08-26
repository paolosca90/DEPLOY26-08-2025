import { user } from "~encore/clients";

/**
 * Unified configuration helper to ensure consistent MT5 and trading parameters
 * across all signal generation methods (automatic, manual, and forced).
 * 
 * This centralizes configuration retrieval to eliminate timing discrepancies
 * between automatic signals (fetched every 2 minutes) and manual signals 
 * (fetched at request time).
 */

export interface UnifiedTradingConfig {
  mt5Config: any; // Mt5Config type from user service
  tradeParams: {
    accountBalance: number;
    riskPercentage: number;
  };
}

/**
 * Gets unified trading configuration for consistent signal generation.
 * This function ensures all signal generation methods use the same
 * configuration source and validation logic.
 * 
 * @returns Promise<UnifiedTradingConfig> The unified configuration
 * @throws Error if MT5 configuration or preferences are not available
 */
export async function getUnifiedTradingConfig(): Promise<UnifiedTradingConfig> {
  try {
    // Fetch configuration from the single source of truth
    const { config: mt5Config } = await user.getMt5Config();
    const { preferences } = await user.getPreferences();

    if (!mt5Config || !preferences) {
      throw new Error("MT5 configuration or preferences not available");
    }

    // Validate MT5 configuration
    if (!mt5Config.host || !mt5Config.port) {
      throw new Error("MT5 configuration is incomplete - missing host or port");
    }

    // Validate preferences
    if (!preferences.accountBalance || !preferences.riskPercentage) {
      throw new Error("Trading preferences are incomplete - missing account balance or risk percentage");
    }

    return {
      mt5Config,
      tradeParams: {
        accountBalance: preferences.accountBalance,
        riskPercentage: preferences.riskPercentage
      }
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get unified trading configuration: ${errorMessage}`);
  }
}

/**
 * Validates that a generated signal uses real MT5 data.
 * This ensures consistency across all signal generation methods.
 * 
 * @param signal The trading signal to validate
 * @param symbol The trading symbol (for error messages)
 * @returns boolean True if signal uses MT5 data, throws error if not
 * @throws Error if signal uses fallback data
 */
export function validateMT5DataSource(signal: any, symbol: string): boolean {
  if (signal.analysis.dataSource !== 'MT5') {
    throw new Error(`Unable to generate signal for ${symbol} - MT5 data not available. Please check your MT5 connection.`);
  }
  return true;
}

/**
 * Creates standardized database parameters for signal insertion.
 * This ensures all signals use consistent user_id and database structure.
 * 
 * @param signal The trading signal
 * @param status The signal status ('pending' for manual, 'auto_generated' for automatic)
 * @returns Object with standardized database parameters
 */
export function createStandardizedSignalParams(signal: any, status: 'pending' | 'auto_generated') {
  return {
    tradeId: signal.tradeId,
    userId: 1, // Standardized to use user_id = 1 for all signals
    symbol: signal.symbol,
    direction: signal.direction,
    strategy: signal.strategy,
    entryPrice: signal.entryPrice,
    takeProfit: signal.takeProfit,
    stopLoss: signal.stopLoss,
    confidence: signal.confidence,
    riskRewardRatio: signal.riskRewardRatio,
    recommendedLotSize: signal.recommendedLotSize,
    maxHoldingTime: signal.maxHoldingTime,
    expiresAt: signal.expiresAt,
    analysisData: JSON.stringify(signal.analysis),
    status
  };
}