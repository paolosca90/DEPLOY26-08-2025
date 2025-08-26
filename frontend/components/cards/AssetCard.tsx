import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Activity, Target } from "lucide-react";
import type { AssetReliability } from "~backend/analysis/market-overview";

interface AssetCardProps {
  asset: AssetReliability;
  onClick?: (symbol: string) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick }) => {
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "STRONG_BUY": return "bg-green-600 text-white";
      case "BUY": return "bg-green-500 text-white";
      case "HOLD": return "bg-yellow-500 text-white";
      case "SELL": return "bg-red-500 text-white";
      case "STRONG_SELL": return "bg-red-600 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getVolatilityColor = (vol: string) => {
    switch (vol) {
      case "LOW": return "text-green-600";
      case "MEDIUM": return "text-yellow-600";
      case "HIGH": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRecommendationText = (rec: string) => {
    switch (rec) {
      case "STRONG_BUY": return "Forte Acquisto";
      case "BUY": return "Acquisto";
      case "HOLD": return "Mantieni";
      case "SELL": return "Vendi";
      case "STRONG_SELL": return "Forte Vendita";
      default: return rec;
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(asset.symbol)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className="font-bold">{asset.symbol}</span>
            <Badge variant="outline" className="text-xs">
              {asset.category}
            </Badge>
          </div>
          <Badge className={`text-xs ${getRecommendationColor(asset.recommendation)}`}>
            {getRecommendationText(asset.recommendation)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Affidabilità</span>
          <span className="font-semibold">{asset.reliabilityScore}/100</span>
        </div>
        <Progress value={asset.reliabilityScore} className="h-2" />
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Confidenza:</span>
            <span className="font-semibold">{asset.avgConfidence}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Win Rate:</span>
            <span className="font-semibold">{asset.winRate}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            {asset.recentPerformance >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className="text-muted-foreground">Performance:</span>
            <span className={`font-semibold ${asset.recentPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {asset.recentPerformance >= 0 ? '+' : ''}{asset.recentPerformance.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Volatilità:</span>
            <span className={`font-semibold ${getVolatilityColor(asset.volatility)}`}>
              {asset.volatility}
            </span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Ultimo aggiornamento: {new Date(asset.lastAnalyzed).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default AssetCard;
