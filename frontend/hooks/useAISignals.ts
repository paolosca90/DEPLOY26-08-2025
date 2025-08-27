import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Interfaccia per segnale AI enhanced
export interface EnhancedAISignal {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  confidence: number;
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  riskRewardRatio: number;
  strategy: string;
  timeframe: string;
  technicalAnalysis: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      ema12: number;
      ema26: number;
    };
    support: number;
    resistance: number;
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
    volatility: "LOW" | "MEDIUM" | "HIGH";
    volume: number;
  };
  confidenceFactors: {
    technical: number;
    trend: number;
    volume: number;
    momentum: number;
    risk: number;
  };
  createdAt: Date;
  shouldExecute: boolean;
  status: "GENERATED" | "EXECUTED" | "CLOSED" | "STOPPED";
  executionResult?: {
    executedAt: Date;
    executedPrice: number;
    lotSize: number;
    result?: "PROFIT" | "LOSS" | "BREAKEVEN";
    pnl?: number;
    closedAt?: Date;
    closedPrice?: number;
  };
}

export interface SignalsSummary {
  totalSignals: number;
  highConfidenceSignals: number;
  avgConfidence: number;
  executedToday: number;
  successRate: number;
}

export interface TopSignalsResponse {
  signals: EnhancedAISignal[];
  summary: SignalsSummary;
}

const MOCK_BACKEND_URL = 'http://localhost:3001';

// Hook per gestire i segnali AI
export function useAISignals() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Query per ottenere i top segnali
  const { 
    data: signalsData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<TopSignalsResponse>({
    queryKey: ['topAISignals'],
    queryFn: async () => {
      const response = await fetch(`${MOCK_BACKEND_URL}/analysis/top-ai-signals`);
      if (!response.ok) throw new Error('Failed to fetch AI signals');
      const data = await response.json();
      
      // Converti le date stringa in oggetti Date
      data.signals = data.signals.map((signal: any) => ({
        ...signal,
        createdAt: new Date(signal.createdAt),
        executionResult: signal.executionResult ? {
          ...signal.executionResult,
          executedAt: new Date(signal.executionResult.executedAt),
          closedAt: signal.executionResult.closedAt ? new Date(signal.executionResult.closedAt) : undefined
        } : undefined
      }));
      
      return data;
    },
    refetchInterval: 30000, // Refresh ogni 30 secondi
    retry: 2
  });

  // Mutation per generare nuovi segnali
  const generateSignalsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${MOCK_BACKEND_URL}/analysis/generate-enhanced-signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to generate AI signals');
      return response.json();
    },
    onSuccess: (data: TopSignalsResponse) => {
      // Aggiorna la cache dei segnali
      queryClient.setQueryData(['topAISignals'], data);
      console.log('✅ Nuovi segnali AI generati:', data.summary);
    },
    onError: (error) => {
      console.error('❌ Errore generazione segnali:', error);
    }
  });

  // Funzione per generare nuovi segnali
  const generateNewSignals = async () => {
    setIsGenerating(true);
    try {
      await generateSignalsMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-refresh periodico per mantenere i dati freschi
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isGenerating && !generateSignalsMutation.isPending) {
        refetch();
      }
    }, 60000); // Ogni minuto

    return () => clearInterval(interval);
  }, [refetch, isGenerating, generateSignalsMutation.isPending]);

  return {
    signals: signalsData?.signals || [],
    summary: signalsData?.summary || {
      totalSignals: 0,
      highConfidenceSignals: 0,
      avgConfidence: 0,
      executedToday: 0,
      successRate: 0
    },
    isLoading,
    error,
    isGenerating: isGenerating || generateSignalsMutation.isPending,
    generateNewSignals,
    refetch
  };
}

// Hook per ML Analytics
export function useMLAnalytics() {
  return useQuery({
    queryKey: ['mlAnalytics'],
    queryFn: async () => {
      const response = await fetch(`${MOCK_BACKEND_URL}/ml/analytics`);
      if (!response.ok) throw new Error('Failed to fetch ML analytics');
      return response.json();
    },
    refetchInterval: 45000, // Refresh ogni 45 secondi
    retry: 2
  });
}

// Hook per ML Training Analytics
export function useMLTrainingAnalytics() {
  return useQuery({
    queryKey: ['mlTrainingAnalytics'],
    queryFn: async () => {
      const response = await fetch(`${MOCK_BACKEND_URL}/ml/training-analytics`);
      if (!response.ok) throw new Error('Failed to fetch ML training analytics');
      return response.json();
    },
    refetchInterval: 120000, // Refresh ogni 2 minuti
    retry: 2
  });
}

// Utility functions
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-400 bg-green-500/10';
  if (confidence >= 60) return 'text-blue-400 bg-blue-500/10';
  if (confidence >= 40) return 'text-yellow-400 bg-yellow-500/10';
  return 'text-red-400 bg-red-500/10';
}

export function getConfidenceBadgeColor(confidence: number): string {
  if (confidence >= 80) return 'bg-green-600';
  if (confidence >= 60) return 'bg-blue-600';
  if (confidence >= 40) return 'bg-yellow-600';
  return 'bg-red-600';
}

export function formatConfidence(confidence: number): string {
  return `${confidence.toFixed(1)}%`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'GENERATED': return 'text-blue-400';
    case 'EXECUTED': return 'text-yellow-400';
    case 'CLOSED': return 'text-green-400';
    case 'STOPPED': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

export function getDirectionIcon(direction: string): string {
  return direction === 'LONG' ? '📈' : '📉';
}

export function getSymbolIcon(symbol: string): string {
  // Forex
  if (symbol.includes('USD')) return '💰';
  if (symbol.includes('EUR')) return '🇪🇺';
  if (symbol.includes('GBP')) return '🇬🇧';
  if (symbol.includes('JPY')) return '🇯🇵';
  if (symbol.includes('CHF')) return '🇨🇭';
  if (symbol.includes('AUD')) return '🇦🇺';
  if (symbol.includes('CAD')) return '🇨🇦';
  
  // Indici CFD
  if (symbol === 'US100') return '💻'; // NASDAQ
  if (symbol === 'SPX500') return '📊'; // S&P500
  if (symbol === 'US30') return '🏭'; // Dow Jones
  if (symbol === 'RUT2000') return '🏪'; // Russell
  
  // Metalli e Commodities CFD
  if (symbol.includes('XAU') || symbol === 'GOLD') return '🥇';
  if (symbol.includes('XAG') || symbol === 'SILVER') return '🥈';
  if (symbol === 'USOIL' || symbol.includes('OIL')) return '🛢️';
  
  return '📈';
}