import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MT5Position } from "~backend/analysis/mt5-bridge";

interface PositionsTableProps {
  positions: MT5Position[];
  isLoading: boolean;
  onClose: (ticket: number) => void;
}

const PositionsTable: React.FC<PositionsTableProps> = ({ positions, isLoading, onClose }) => {
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
        <p>Caricamento posizioni...</p>
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nessuna posizione aperta.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Le posizioni aperte appariranno qui dopo l'esecuzione dei trade.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Simbolo</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead>Prezzo Apertura</TableHead>
            <TableHead>Prezzo Corrente</TableHead>
            <TableHead>P/L</TableHead>
            <TableHead>Azione</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((pos) => (
            <TableRow key={pos.ticket}>
              <TableCell className="font-mono">{pos.ticket}</TableCell>
              <TableCell>{pos.symbol}</TableCell>
              <TableCell>
                <Badge variant={pos.type === 0 ? "default" : "destructive"}>
                  {pos.type === 0 ? "BUY" : "SELL"}
                </Badge>
              </TableCell>
              <TableCell>{pos.volume}</TableCell>
              <TableCell className="font-mono">{pos.openPrice.toFixed(5)}</TableCell>
              <TableCell className="font-mono">{pos.currentPrice.toFixed(5)}</TableCell>
              <TableCell className={pos.profit >= 0 ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                ${pos.profit.toFixed(2)}
              </TableCell>
              <TableCell>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onClose(pos.ticket)}
                  className="text-xs"
                >
                  Chiudi
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default PositionsTable;
