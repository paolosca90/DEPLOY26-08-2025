import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TradingSignal } from "~backend/analysis/signal-generator";

interface HistoryTableProps {
  signals: TradingSignal[];
  isLoading: boolean;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ signals, isLoading }) => {
  if (isLoading) {
    return <div>Caricamento storico trade...</div>;
  }

  if (!signals || signals.length === 0) {
    return <div className="text-center py-8">Nessun trade nello storico.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Simbolo</TableHead>
          <TableHead>Direzione</TableHead>
          <TableHead>Entrata</TableHead>
          <TableHead>Chiusura</TableHead>
          <TableHead>P/L</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {signals.map((signal) => {
          // Safely access nested properties with fallbacks
          const createdAt = signal.analysis?.createdAt || new Date().toISOString();
          const executionPrice = signal.analysis?.executionPrice;
          const profitLoss = signal.analysis?.profitLoss;
          const status = signal.analysis?.status || 'pending';
          
          return (
            <TableRow key={signal.tradeId}>
              <TableCell>{new Date(createdAt).toLocaleString()}</TableCell>
              <TableCell>{signal.symbol}</TableCell>
              <TableCell>
                <Badge variant={signal.direction === "LONG" ? "default" : "destructive"}>
                  {signal.direction}
                </Badge>
              </TableCell>
              <TableCell>{signal.entryPrice.toFixed(5)}</TableCell>
              <TableCell>{executionPrice ? executionPrice.toFixed(5) : "-"}</TableCell>
              <TableCell className={profitLoss && profitLoss > 0 ? "text-green-500" : profitLoss && profitLoss < 0 ? "text-red-500" : ""}>
                {profitLoss !== null && profitLoss !== undefined ? profitLoss.toFixed(2) : "-"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{status}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default HistoryTable;
