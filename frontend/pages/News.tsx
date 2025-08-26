import { useQuery } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import NewsCard from "../components/cards/NewsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function News() {
  const backend = useBackend();

  const { data: marketOverview, isLoading, error, refetch } = useQuery({
    queryKey: ["marketOverview"],
    queryFn: () => backend.analysis.getMarketOverview(),
    retry: 1,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "BULLISH": return "text-green-600";
      case "BEARISH": return "text-red-600";
      case "NEUTRAL": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "BULLISH": return "📈";
      case "BEARISH": return "📉";
      case "NEUTRAL": return "➡️";
      default: return "➡️";
    }
  };

  const getSessionColor = (session: string) => {
    switch (session) {
      case "OVERLAP": return "text-green-600 bg-green-50 border-green-200";
      case "EUROPEAN":
      case "US": return "text-blue-600 bg-blue-50 border-blue-200";
      case "ASIAN": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "DEAD": return "text-gray-600 bg-gray-50 border-gray-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">📰 News e Mercati</h1>
          <p className="text-muted-foreground">Notizie di mercato e sentiment globale</p>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Caricamento notizie...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">📰 News e Mercati</h1>
          <p className="text-muted-foreground">Notizie di mercato e sentiment globale</p>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-500 text-lg mb-4">Errore nel caricamento: {error.message}</p>
          <Button onClick={() => refetch()}>Riprova</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📰 News e Mercati</h1>
        <p className="text-muted-foreground">Notizie di mercato e sentiment globale in tempo reale</p>
      </div>

      {marketOverview && (
        <>
          {/* Market Overview Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🌍 Panoramica Mercati</h2>
            
            {/* Session Info and Market Sentiment */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Sessione Corrente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-lg font-bold px-3 py-2 rounded-lg border ${getSessionColor(marketOverview.sessionInfo.currentSession)}`}>
                    {marketOverview.sessionInfo.currentSession}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Prossima: {marketOverview.sessionInfo.nextSession} in {marketOverview.sessionInfo.timeToNext}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Volatilità attesa: <span className="font-semibold">{marketOverview.sessionInfo.volatilityExpected}</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Sentiment Generale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-lg font-bold ${getSentimentColor(marketOverview.marketSentiment.overall)}`}>
                    {getSentimentIcon(marketOverview.marketSentiment.overall)} {marketOverview.marketSentiment.overall}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div>Forex: <span className={getSentimentColor(marketOverview.marketSentiment.forex)}>{marketOverview.marketSentiment.forex}</span></div>
                    <div>Crypto: <span className={getSentimentColor(marketOverview.marketSentiment.crypto)}>{marketOverview.marketSentiment.crypto}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Indici
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-lg font-bold ${getSentimentColor(marketOverview.marketSentiment.indices)}`}>
                    {getSentimentIcon(marketOverview.marketSentiment.indices)} {marketOverview.marketSentiment.indices}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sentiment indici azionari
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Materie Prime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-lg font-bold ${getSentimentColor(marketOverview.marketSentiment.commodities)}`}>
                    {getSentimentIcon(marketOverview.marketSentiment.commodities)} {marketOverview.marketSentiment.commodities}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sentiment commodities
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Market News */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">📰 Notizie di Mercato</h3>
              <Badge variant="secondary">
                {marketOverview.marketNews.length} notizie
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {marketOverview.marketNews.map((news, index) => (
                <NewsCard key={news.id} news={news} />
              ))}
            </div>
          </div>

          {/* Additional Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Insights di Mercato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">💡 Suggerimento del Giorno</h4>
                  <p className="text-sm text-blue-700">
                    Durante le sessioni di overlap (Europea-USA), la volatilità tende ad aumentare. 
                    Considera strategie di breakout per massimizzare i profitti.
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">📈 Trend Settimanale</h4>
                  <p className="text-sm text-green-700">
                    Gli indici USA mostrano un trend rialzista consolidato. 
                    Le criptovalute stanno recuperando terreno dopo il recente consolidamento.
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Attenzione</h4>
                  <p className="text-sm text-yellow-700">
                    Questa settimana sono previsti importanti annunci delle banche centrali. 
                    Monitora attentamente la volatilità su EUR e USD.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
