import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import StatCard from "../components/cards/StatCard";
import AutoSignalCard from "../components/cards/AutoSignalCard";
import { DollarSign, Percent, TrendingUp, TrendingDown, Zap, BarChart, Brain, Target, Activity, AlertCircle, Award, Shield, Sparkles, RefreshCw, Clock, Database } from "lucide-react";
import PositionsTable from "../components/tables/PositionsTable";
import HistoryTable from "../components/tables/HistoryTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const backend = useBackend();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: topSignalsData, isLoading: isLoadingTopSignals, error: topSignalsError, refetch: refetchTopSignals } = useQuery({
    queryKey: ["topSignals"],
    queryFn: () => backend.analysis.getTopSignals(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2,
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  const { data: signalStats, isLoading: isLoadingSignalStats, refetch: refetchSignalStats } = useQuery({
    queryKey: ["signalStats"],
    queryFn: () => backend.analysis.getSignalStats(),
    refetchInterval: 20000, // Refresh every 20 seconds
    retry: 2,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const { data: performanceData, isLoading: isLoadingPerformance, error: performanceError } = useQuery({
    queryKey: ["performance"],
    queryFn: () => backend.analysis.getPerformance(),
    retry: 1,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: mlAnalytics, isLoading: isLoadingML, error: mlError } = useQuery({
    queryKey: ["mlAnalytics"],
    queryFn: () => backend.ml.getMLAnalytics(),
    retry: 1,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: positionsData, isLoading: isLoadingPositions, error: positionsError } = useQuery({
    queryKey: ["positions"],
    queryFn: () => backend.analysis.listPositions(),
    retry: 1,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: historyData, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ["history"],
    queryFn: () => backend.analysis.listHistory(),
    retry: 1,
  });

  const trainModelMutation = useMutation({
    mutationFn: () => backend.ml.trainModel({}),
    onSuccess: (data) => {
      toast({ 
        title: "🎯 Training Completato", 
        description: `Modello addestrato con accuratezza ${(data.metrics.accuracy * 100).toFixed(1)}%` 
      });
      queryClient.invalidateQueries({ queryKey: ["mlAnalytics"] });
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "❌ Errore Training", 
        description: err.message 
      });
    },
  });

  const detectPatternsMutation = useMutation({
    mutationFn: (symbol: string) => backend.ml.detectPatterns({ symbol }),
    onSuccess: (data, symbol) => {
      toast({ 
        title: "🔍 Pattern Rilevati", 
        description: `${data.patternsDetected} pattern trovati per ${symbol}` 
      });
      queryClient.invalidateQueries({ queryKey: ["mlAnalytics"] });
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "❌ Errore Rilevamento", 
        description: err.message 
      });
    },
  });

  const forceSignalGenerationMutation = useMutation({
    mutationFn: () => backend.analysis.forceSignalGeneration(),
    onSuccess: (data) => {
      toast({ 
        title: data.success ? "🔄 Generazione Avviata" : "❌ Errore", 
        description: data.message 
      });
      if (data.success) {
        // Refresh signals immediately and then again after a delay
        queryClient.invalidateQueries({ queryKey: ["topSignals"] });
        queryClient.invalidateQueries({ queryKey: ["signalStats"] });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["topSignals"] });
          queryClient.invalidateQueries({ queryKey: ["signalStats"] });
        }, 3000);
      }
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "❌ Errore Generazione", 
        description: err.message 
      });
    },
  });

  const handleQuickTrade = () => {
    navigate('/trade');
  };

  const handleRefreshSignals = () => {
    // Force refresh of signals
    refetchTopSignals();
    refetchSignalStats();
    
    // Also trigger new signal generation
    forceSignalGenerationMutation.mutate();
  };

  // Enhanced stats with real data
  const stats = [
    { 
      title: "Profitto Totale", 
      value: `$${performanceData?.totalProfitLoss?.toFixed(2) || "0.00"}`, 
      icon: DollarSign, 
      description: "Profitto/perdita totale degli ultimi 30 giorni (dati reali)",
      color: (performanceData?.totalProfitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
    },
    { 
      title: "Win Rate", 
      value: `${performanceData?.winRate?.toFixed(1) || 0}%`, 
      icon: Percent, 
      description: "Percentuale di trade in profitto (calcolata sui trade reali)",
      color: (performanceData?.winRate || 0) >= 70 ? "text-green-600" : (performanceData?.winRate || 0) >= 50 ? "text-yellow-600" : "text-red-600"
    },
    { 
      title: "Profit Factor", 
      value: performanceData?.profitFactor?.toFixed(2) || "0", 
      icon: BarChart, 
      description: "Rapporto profitto lordo / perdita lorda",
      color: (performanceData?.profitFactor || 0) >= 1.5 ? "text-green-600" : (performanceData?.profitFactor || 0) >= 1 ? "text-yellow-600" : "text-red-600"
    },
    { 
      title: "Miglior Trade", 
      value: `$${performanceData?.bestTrade?.toFixed(2) || 0}`, 
      icon: TrendingUp, 
      description: "Il trade più profittevole",
      color: (performanceData?.bestTrade || 0) > 0 ? "text-green-600" : undefined
    },
    { 
      title: "Streak Corrente", 
      value: `${Math.abs(performanceData?.currentStreak || 0)}${(performanceData?.currentStreak || 0) >= 0 ? ' W' : ' L'}`, 
      icon: Award, 
      description: "Serie di vittorie/sconfitte consecutive",
      color: (performanceData?.currentStreak || 0) >= 0 ? "text-green-600" : "text-red-600"
    },
    { 
      title: "Sharpe Ratio", 
      value: performanceData?.sharpeRatio?.toFixed(2) || "0", 
      icon: Shield, 
      description: "Rendimento corretto per il rischio",
      color: (performanceData?.sharpeRatio || 0) >= 1.5 ? "text-green-600" : (performanceData?.sharpeRatio || 0) >= 1 ? "text-yellow-600" : "text-red-600"
    },
  ];

  const mlStats = [
    { 
      title: "ML Accuracy", 
      value: `${(mlAnalytics?.modelPerformance.accuracy * 100)?.toFixed(1) || 0}%`, 
      icon: Brain, 
      description: "Accuratezza del modello ML",
      color: (mlAnalytics?.modelPerformance.accuracy || 0) >= 0.8 ? "text-green-600" : "text-yellow-600"
    },
    { 
      title: "Precision", 
      value: `${(mlAnalytics?.modelPerformance.precision * 100)?.toFixed(1) || 0}%`, 
      icon: Target, 
      description: "Precisione delle predizioni"
    },
    { 
      title: "F1 Score", 
      value: `${(mlAnalytics?.modelPerformance.f1Score * 100)?.toFixed(1) || 0}%`, 
      icon: Activity, 
      description: "Bilanciamento precision/recall"
    },
    { 
      title: "Predizioni", 
      value: mlAnalytics?.predictionStats.totalPredictions?.toString() || "0", 
      icon: Zap, 
      description: "Numero totale di predizioni generate"
    },
  ];

  // Signal generation stats
  const signalGenerationStats = [
    {
      title: "Segnali Generati",
      value: signalStats?.totalGenerated?.toString() || "0",
      icon: Sparkles,
      description: "Segnali generati nelle ultime 24h",
      color: (signalStats?.totalGenerated || 0) > 0 ? "text-blue-600" : undefined
    },
    {
      title: "Segnali Eseguiti",
      value: signalStats?.totalExecuted?.toString() || "0",
      icon: Zap,
      description: "Segnali eseguiti automaticamente",
      color: (signalStats?.totalExecuted || 0) > 0 ? "text-green-600" : undefined
    },
    {
      title: "Trade Chiusi",
      value: signalStats?.totalClosed?.toString() || "0",
      icon: Target,
      description: "Trade completati con esito",
      color: (signalStats?.totalClosed || 0) > 0 ? "text-purple-600" : undefined
    },
    {
      title: "Confidenza Media",
      value: `${signalStats?.avgConfidence?.toFixed(1) || 0}%`,
      icon: Brain,
      description: "Confidenza media dei segnali generati",
      color: (signalStats?.avgConfidence || 0) >= 80 ? "text-green-600" : "text-yellow-600"
    },
  ];

  // Prepare chart data
  const performanceChartData = mlAnalytics?.performanceTimeline.map(pt => ({
    date: new Date(pt.date).toLocaleDateString(),
    accuracy: (pt.accuracy * 100).toFixed(1),
    profitLoss: pt.profitLoss.toFixed(0),
    predictions: pt.predictions
  })) || [];

  const featureImportanceData = mlAnalytics?.featureImportance.slice(0, 8).map(f => ({
    feature: f.feature,
    importance: (f.importance * 100).toFixed(1),
    type: f.type
  })) || [];

  const hasRealData = performanceData && performanceData.totalTrades > 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">🚀 AI Trading Boost Dashboard</h1>
          <p className="text-muted-foreground">Sistema di trading automatizzato con intelligenza artificiale avanzata</p>
          {signalStats?.lastGenerationTime && (
            <div className="flex items-center gap-2 mt-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">
                Ultimo aggiornamento: {new Date(signalStats.lastGenerationTime).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleQuickTrade}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            ⚡ Genera Segnale
          </Button>
          <Button 
            onClick={() => trainModelMutation.mutate()}
            disabled={trainModelMutation.isPending}
            variant="outline"
            size="sm"
          >
            {trainModelMutation.isPending ? "Training..." : "🤖 Addestra AI"}
          </Button>
          <Button 
            onClick={() => detectPatternsMutation.mutate("BTCUSD")}
            disabled={detectPatternsMutation.isPending}
            variant="outline"
            size="sm"
          >
            {detectPatternsMutation.isPending ? "Rilevando..." : "🔍 Rileva Pattern"}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {!hasRealData && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-yellow-600" />
              <div>
                <h4 className="font-semibold text-yellow-800">Sistema in Fase di Inizializzazione</h4>
                <p className="text-sm text-yellow-700">
                  Il sistema automatico sta generando i primi segnali. Le statistiche di performance appariranno dopo i primi trade completati.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signal Generation Stats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">🤖 Sistema Automatico</h2>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            H24 Attivo
          </Badge>
          {signalStats?.topPerformingSymbol && signalStats.topPerformingSymbol !== 'N/A' && (
            <Badge variant="outline">
              Top: {signalStats.topPerformingSymbol}
            </Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingSignalStats ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="p-4">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            signalGenerationStats.map(stat => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Performance Overview with Real Data */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">📊 Performance Trading</h2>
          <Badge variant="secondary" className={hasRealData ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {hasRealData ? `${performanceData.totalTrades} trade reali` : "In attesa dati"}
          </Badge>
          {hasRealData && (
            <Badge variant="outline">
              Ultimi 30 giorni
            </Badge>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingPerformance ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              <span>Caricamento performance...</span>
            </div>
          ) : performanceError ? (
            <div className="col-span-full">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700">Errore nel caricamento delle performance</p>
                  <p className="text-sm text-red-600 mt-1">{performanceError.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["performance"] })}
                  >
                    Riprova
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            stats.map(stat => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Auto Signals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">🎯 Segnali AI Automatici</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Top 3 Opportunità
            </Badge>
            {topSignalsData?.signals && topSignalsData.signals.length > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {topSignalsData.signals.length} attivi
              </Badge>
            )}
          </div>
          <Button 
            onClick={handleRefreshSignals}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={isLoadingTopSignals || forceSignalGenerationMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingTopSignals || forceSignalGenerationMutation.isPending ? 'animate-spin' : ''}`} />
            {forceSignalGenerationMutation.isPending ? "Generando..." : "Aggiorna"}
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {isLoadingTopSignals ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="p-4">
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : topSignalsError ? (
            <div className="col-span-full">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700">Errore nel caricamento dei segnali automatici.</p>
                  <p className="text-sm text-red-600 mt-1">{topSignalsError.message}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={handleRefreshSignals}
                  >
                    Riprova
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : !topSignalsData?.signals || topSignalsData.signals.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-dashed border-2 border-muted-foreground/25">
                <CardContent className="p-8 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h4 className="font-semibold mb-2">Sistema in Preparazione</h4>
                  <p className="text-muted-foreground mb-4">
                    Il sistema automatico sta generando i primi segnali. Riprova tra qualche minuto.
                  </p>
                  <Button 
                    onClick={handleRefreshSignals}
                    variant="outline"
                    disabled={forceSignalGenerationMutation.isPending}
                  >
                    {forceSignalGenerationMutation.isPending ? "Generando..." : "🔄 Genera Ora"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            topSignalsData.signals.map((signal, index) => (
              <AutoSignalCard key={`${signal.symbol}-${signal.tradeId}-${index}`} signal={signal as any} />
            ))
          )}
        </div>
        
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-800">Sistema Automatico H24</h4>
          </div>
          <p className="text-sm text-blue-700">
            Il sistema genera automaticamente segnali ogni 2 minuti, seleziona i 3 migliori per confidenza, 
            li esegue automaticamente e registra i risultati per migliorare continuamente l'AI.
          </p>
        </div>
      </div>

      {/* ML Performance Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-3">🤖 Performance Machine Learning</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoadingML ? (
            <div className="col-span-full text-center py-4">Caricamento analytics ML...</div>
          ) : mlError ? (
            <div className="col-span-full text-red-500">
              Errore nel caricamento ML: {mlError.message}
            </div>
          ) : (
            mlStats.map(stat => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color || ''}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ML Analytics Charts */}
      {mlAnalytics && performanceChartData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Performance Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📈 Andamento Performance ML
                <Badge variant="secondary">{performanceChartData.length} giorni</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="Accuratezza %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎯 Importanza Features
                <Badge variant="secondary">Top {featureImportanceData.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={featureImportanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trading Activity Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Posizioni Aperte</span>
              <Badge variant="outline">
                {positionsData?.positions?.length || 0} posizioni
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positionsError ? (
              <div className="text-red-500 text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Errore: {positionsError.message}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["positions"] })}
                >
                  Riprova
                </Button>
              </div>
            ) : (
              <PositionsTable
                positions={positionsData?.positions || []}
                isLoading={isLoadingPositions}
                onClose={() => { /* Implement close logic */ }}
              />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Storico Trade Recenti</span>
              <Badge variant="outline">
                {historyData?.signals?.length || 0} trade
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyError ? (
              <div className="text-red-500 text-center py-4">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>Errore: {historyError.message}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["history"] })}
                >
                  Riprova
                </Button>
              </div>
            ) : (
              <HistoryTable
                signals={historyData?.signals?.slice(0, 5) || []}
                isLoading={isLoadingHistory}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide for New Users */}
      {!hasRealData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              🚀 Sistema Automatico Attivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🤖</span>
                </div>
                <h4 className="font-semibold text-blue-800">Generazione Automatica</h4>
                <p className="text-sm text-blue-600">Il sistema genera segnali ogni 2 minuti su 20+ asset</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🎯</span>
                </div>
                <h4 className="font-semibold text-blue-800">Selezione Intelligente</h4>
                <p className="text-sm text-blue-600">Seleziona automaticamente i 3 segnali con maggiore confidenza</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="font-semibold text-blue-800">Apprendimento Continuo</h4>
                <p className="text-sm text-blue-600">Registra i risultati e migliora l'AI automaticamente</p>
              </div>
            </div>
            <div className="text-center mt-4">
              <p className="text-sm text-blue-700 mb-3">
                Il sistema è attivo H24. Le prime statistiche appariranno dopo i primi trade completati.
              </p>
              <Button onClick={handleQuickTrade} className="bg-blue-600 hover:bg-blue-700">
                🎯 Genera Segnale Manuale
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
