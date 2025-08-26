import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MarketNews } from "~backend/analysis/market-overview";

interface NewsCardProps {
  news: MarketNews;
}

const NewsCard: React.FC<NewsCardProps> = ({ news }) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "HIGH": return "bg-red-500 text-white";
      case "MEDIUM": return "bg-yellow-500 text-white";
      case "LOW": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE": return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "NEGATIVE": return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "NEUTRAL": return <Minus className="h-4 w-4 text-gray-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "POSITIVE": return "text-green-600";
      case "NEGATIVE": return "text-red-600";
      case "NEUTRAL": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} min fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ore fa`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {news.title}
          </CardTitle>
          <div className="flex items-center gap-1 flex-shrink-0">
            {getSentimentIcon(news.sentiment)}
            <Badge className={`text-xs ${getImpactColor(news.impact)}`}>
              {news.impact}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {news.summary}
        </p>
        
        {news.affectedAssets.length > 0 && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Asset interessati:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {news.affectedAssets.slice(0, 4).map((asset, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {asset}
                </Badge>
              ))}
              {news.affectedAssets.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{news.affectedAssets.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{getTimeAgo(news.publishedAt)}</span>
          </div>
          <span className="font-medium">{news.source}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsCard;
