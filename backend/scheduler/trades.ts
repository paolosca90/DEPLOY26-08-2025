import { cron } from "encore.dev/cron";
import { analysisDB } from "../analysis/db";
import { closeMT5Position } from "../analysis/mt5-bridge";
import { user } from "~encore/clients";

// This cron job runs every minute to check for trades that need to be automatically closed.
export const checkExpiredTrades = cron("check-expired-trades", {
  every: "1m",
  handler: async () => {
    console.log("Scheduler: Checking for expired trades...");

    try {
      // Fetch MT5 config at the start of the cycle
      const { config: mt5Config } = await user.getMt5Config();
      if (!mt5Config) {
        console.error("❌ MT5 configuration not found, skipping checkExpiredTrades cycle.");
        return;
      }

      const now = new Date();
      
      // Find trades that have expired or hit their INTRADAY time limit.
      const tradesToClose = await analysisDB.queryAll`
        SELECT trade_id, mt5_order_id, strategy, user_id
        FROM trading_signals
        WHERE status = 'executed' 
        AND (
          (expires_at IS NOT NULL AND expires_at <= ${now})
        )
      `;

      if (tradesToClose.length === 0) {
        console.log("Scheduler: No expired trades to close.");
        return;
      }

      console.log(`Scheduler: Found ${tradesToClose.length} trades to close.`);

      for (const trade of tradesToClose) {
        if (!trade.mt5_order_id) {
          console.log(`Scheduler: Skipping trade ${trade.trade_id}, no MT5 order ID.`);
          continue;
        }

        console.log(`Scheduler: Closing trade ${trade.trade_id} (Order ID: ${trade.mt5_order_id}) due to expiration...`);
        
        const result = await closeMT5Position(trade.mt5_order_id, mt5Config);

        if (result.success) {
          await analysisDB.exec`
            UPDATE trading_signals
            SET status = 'closed', closed_at = NOW()
            WHERE trade_id = ${trade.trade_id}
          `;
          console.log(`Scheduler: Successfully closed trade ${trade.trade_id}.`);
          
          // TODO: Implement a web-based notification system (e.g., pub/sub)
          // For now, we just log it.
          console.log(`Scheduler: User ${trade.user_id} should be notified about auto-closed trade ${trade.trade_id}.`);

        } else {
          console.error(`Scheduler: Failed to close trade ${trade.trade_id}. Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Scheduler: Error checking for expired trades:", error);
    }
  },
});
