import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import SignalCard from "../components/cards/SignalCard";
import PositionsTable from "../components/tables/PositionsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TradingStrategy } from "~backend/analysis/trading-strategies";
import { useLocation } from "react-router-dom";
import { Sparkles, TrendingUp, Clock, Target } from "lucide-react";

const assetCategories = {
  "🔥 Popolari": [
    "BTCUSD", "ETHUSD", "EURUSD", "GBPUSD", "XAUUSD", "US500", "NAS100", "US30"
  ],
  "💱 Forex Majors": [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"
  ],
  "💱 Forex Minors": [
    "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD", 
    "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
    "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD",
    "NZDJPY", "NZDCHF", "NZDCAD",
    "CADJPY", "CADCHF", "CHFJPY"
  ],
  "💱 Forex Exotics": [
    "USDSEK", "USDNOK", "USDDKK", "USDPLN", "USDHUF", "USDCZK",
    "USDTRY", "USDZAR", "USDMXN", "USDBRL", "USDSGD", "USDHKD",
    "EURPLN", "EURSEK", "EURNOK", "EURDKK", "EURTRY", "EURZAR",
    "GBPPLN", "GBPSEK", "GBPNOK", "GBPDKK", "GBPTRY", "GBPZAR"
  ],
  "📈 Indici CFD": [
    "US30", "US500", "SPX500", "NAS100", "UK100", "GER40", "FRA40", "ESP35", 
    "ITA40", "AUS200", "JPN225", "HK50", "CHINA50", "INDIA50"
  ],
  "🏗️ Materie Prime": [
    "XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD", // Metalli preziosi
    "CRUDE", "BRENT", "NATGAS", // Energia
    "WHEAT", "CORN", "SOYBEAN", "SUGAR", "COFFEE", "COCOA", "COTTON" // Agricole
  ],
  "₿ Criptovalute": [
    "BTCUSD", "ETHUSD", "LTCUSD", "XRPUSD", "ADAUSD", "DOTUSD", 
    "LINKUSD", "BCHUSD", "XLMUSD", "EOSUSD"
  ]
};

const strategyDescriptions = {
  "auto": {
    name: "🤖 Strategia Automatica",
    description: "L'AI sceglie la strategia ottimale basandosi sulle condizioni di mercato",
    icon: Sparkles
  },
  [TradingStrategy.SCALPING]: {
    name: "⚡ Scalping",
    description: "Trade veloci (1-15 min) per catturare piccoli movimenti",
    icon: TrendingUp
  },
  [TradingStrategy.INTRADAY]: {
    name: "📊 Intraday",
    description: "Posizioni mantenute per 1-6 ore con chiusura automatica",
    icon: Clock
  }
};

export default function Trade() {
  const location = useLocation();
  const [symbol, setSymbol] = useState("US30");
  const [strategy, setStrategy] = useState<TradingStrategy | "auto">("auto");
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if a symbol was passed from navigation
  useEffect(() => {
    if (location.state?.selectedSymbol) {
      setSymbol(location.state.selectedSymbol);
    }
  }, [location.state]);

  const predictMutation = useMutation({
    mutationFn: () => {
      const strategyParam = strategy === "auto" ? undefined : strategy;
      return backend.analysis.predict({ symbol, strategy: strategyParam });
    },
    onSuccess: (data) => {
      toast({ 
        title: "✅ Segnale Generato", 
        description: `Segnale ${data.direction} per ${symbol} con confidenza ${data.confidence}%` 
      });
    },
    onError: (err: any) => {
      console.error("Predict error:", err);
      toast({ 
        variant: "destructive", 
        title: "❌ Errore", 
        description: err.message || "Errore nella generazione del segnale" 
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (params: { tradeId: string; lotSize: number }) => {
      return backend.analysis.execute(params);
    },
    onSuccess: (data) => {
      toast({ 
        title: "🚀 Trade Eseguito", 
        description: `Trade eseguito con successo! Order ID: ${data.orderId}` 
      });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
    },
    onError: (err: any) => {
      console.error("Execute error:", err);
      toast({ 
        variant: "destructive", 
        title: "❌ Errore Esecuzione", 
        description: err.message || "Errore nell'esecuzione del trade" 
      });
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: (ticket: number) => {
      return backend.analysis.closePosition({ ticket });
    },
    onSuccess: () => {
      toast({ 
        title: "✅ Posizione Chiusa", 
        description: "Posizione chiusa con successo." 
      });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["performance"] });
    },
    onError: (err: any) => {
      console.error("Close position error:", err);
      toast({ 
        variant: "destructive", 
        title: "❌ Errore Chiusura", 
        description: err.message || "Errore nella chiusura della posizione" 
      });
    },
  });

  const { data: positionsData, isLoading: isLoadingPositions, error: positionsError } = useQuery({
    queryKey: ["positions"],
    queryFn: () => backend.analysis.listPositions(),
    retry: 1,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const handleClosePosition = (ticket: number) => {
    closePositionMutation.mutate(ticket);
  };

  const selectedStrategy = strategyDescriptions[strategy];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🎯 Trading AI</h1>
        <p className="text-muted-foreground">Genera segnali intelligenti ed esegui trade automatici su oltre 100 asset finanziari</p>
      </div>

      {/* Signal Generation Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generatore Segnali AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset da Analizzare</label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona Asset" />
                </SelectTrigger>
                <SelectContent className="max-h-[400px]">
                  {Object.entries(assetCategories).map(([category, assets]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {category}
                      </div>
                      {assets.map(asset => (
                        <SelectItem key={asset} value={asset} className="pl-4">
                          {asset}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Strategia di Trading</label>
              <Select value={strategy} onValueChange={(v) => setStrategy(v as TradingStrategy | "auto")}>
                <SelectTrigger>
                  <SelectValue placeholder="Strategia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">🤖 Automatica (Consigliata)</SelectItem>
                  <SelectItem value={TradingStrategy.SCALPING}>⚡ Scalping</SelectItem>
                  <SelectItem value={TradingStrategy.INTRADAY}>📊 Intraday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => predictMutation.mutate()} 
                disabled={predictMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {predictMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Genera Segnale AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Strategy Description */}
          {selectedStrategy && (
            <div className="bg-white/60 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <selectedStrategy.icon className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">{selectedStrategy.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
            </div>
          )}

          {/* Special notice for US indices */}
          {(symbol === "US30" || symbol === "US500" || symbol === "SPX500" || symbol === "NAS100") && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🇺🇸</span>
                <span className="font-semibold text-yellow-800">Indici USA Selezionati</span>
              </div>
              <p className="text-sm text-yellow-700">
                Il sistema utilizzerà automaticamente il formato simbolo corretto per il tuo broker (es. {symbol}pm, {symbol}.pm, ecc.)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Signal Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📊 Segnale Generato</h3>
          
          {predictMutation.isPending && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h4 className="font-semibold text-blue-800 mb-2">Analisi AI in Corso</h4>
                  <p className="text-blue-700">Analizzando {symbol} con intelligenza artificiale avanzata...</p>
                  <div className="mt-4 space-y-2 text-sm text-blue-600">
                    <p>• Raccolta dati di mercato multi-timeframe</p>
                    <p>• Analisi tecnica con 15+ indicatori</p>
                    <p>• Valutazione sentiment e smart money</p>
                    <p>• Calcolo livelli di confidenza</p>
                    {(symbol === "US30" || symbol === "US500" || symbol === "SPX500" || symbol === "NAS100") && (
                      <p>• Rilevamento formato simbolo ottimale per indici USA</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {predictMutation.error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Errore nella Generazione</h3>
                  <p className="text-red-700 mb-4">{predictMutation.error.message}</p>
                  <Button 
                    variant="outline" 
                    onClick={() => predictMutation.mutate()}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    🔄 Riprova
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {predictMutation.data && (
            <SignalCard
              signal={predictMutation.data}
              onExecute={(tradeId, lotSize) => executeMutation.mutate({ tradeId, lotSize })}
            />
          )}
          
          {!predictMutation.isPending && !predictMutation.error && !predictMutation.data && (
            <Card className="border-dashed border-2 border-muted-foreground/25">
              <CardContent className="p-8">
                <div className="text-center text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h4 className="font-semibold mb-2">Pronto per Generare Segnali</h4>
                  <p className="mb-4">Seleziona un asset e una strategia, poi clicca "Genera Segnale AI"</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold">✨ 100+ Asset</p>
                      <p>Forex, Indici, Crypto, Commodities</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-semibold">🎯 AI Avanzata</p>
                      <p>Machine Learning e analisi tecnica</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Positions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">📈 Posizioni Aperte</h3>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {positionsData?.positions?.length || 0} attive
            </Badge>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {isLoadingPositions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Caricamento posizioni...</p>
                </div>
              ) : positionsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 mb-2">Errore nel caricamento</p>
                  <p className="text-sm text-muted-foreground mb-4">{positionsError.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["positions"] })}
                  >
                    🔄 Riprova
                  </Button>
                </div>
              ) : (
                <PositionsTable
                  positions={positionsData?.positions || []}
                  isLoading={isLoadingPositions}
                  onClose={handleClosePosition}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Tips for US Indices */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">💡 Suggerimenti per il Trading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-semibold text-green-800">Alta Confidenza</h4>
              <p className="text-sm text-green-700">Esegui trade solo con confidenza &gt;80%</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">💰</span>
              </div>
              <h4 className="font-semibold text-blue-800">Gestione Rischio</h4>
              <p className="text-sm text-blue-700">Usa il calcolatore automatico del lottaggio</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🇺🇸</span>
              </div>
              <h4 className="font-semibold text-purple-800">Indici USA</h4>
              <p className="text-sm text-purple-700">Sistema ottimizzato per US30, US500, NAS100</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
