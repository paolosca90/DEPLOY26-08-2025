import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Shield, Clock, Zap } from "lucide-react";
import { 
  EnhancedAISignal, 
  getConfidenceColor, 
  getConfidenceBadgeColor, 
  formatConfidence, 
  getStatusColor, 
  getDirectionIcon, 
  getSymbolIcon 
} from "../../hooks/useAISignals";

interface EnhancedSignalCardProps {
  signal: EnhancedAISignal;
  onExecute?: (signalId: string) => void;
  isExecuting?: boolean;
}

const EnhancedSignalCard: React.FC<EnhancedSignalCardProps> = ({ 
  signal, 
  onExecute, 
  isExecuting = false 
}) => {
  const isHighConfidence = signal.confidence > 60;
  const directionIcon = signal.direction === "LONG" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  const directionColor = signal.direction === "LONG" ? "text-green-400" : "text-red-400";

  // Calcola il tempo trascorso dalla creazione
  const timeAgo = React.useMemo(() => {
    const now = new Date();
    const created = new Date(signal.createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Ora';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}g`;
  }, [signal.createdAt]);

  return (
    <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors ${
      isHighConfidence ? 'ring-2 ring-blue-500/20' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getSymbolIcon(signal.symbol)}</span>
            <CardTitle className="text-white text-lg">{signal.symbol}</CardTitle>
            <Badge 
              className={`${directionColor} bg-transparent border ${
                signal.direction === "LONG" ? "border-green-500/30" : "border-red-500/30"
              }`}
            >
              {directionIcon}
              {signal.direction}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getConfidenceBadgeColor(signal.confidence)} text-white`}>
              {formatConfidence(signal.confidence)}
            </Badge>
            <Badge className={`${getStatusColor(signal.status)} bg-transparent border border-current`}>
              {signal.status}
            </Badge>
          </div>
        </div>
        
        {/* Barra di confidence */}
        <div className="mt-2">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
            <span>Confidence Score</span>
            <span className={getConfidenceColor(signal.confidence).split(' ')[0]}>
              {formatConfidence(signal.confidence)}
            </span>
          </div>
          <Progress 
            value={signal.confidence} 
            className="h-2 bg-slate-700"
            style={{
              '--progress-background': signal.confidence >= 60 ? '#10b981' : 
                                     signal.confidence >= 40 ? '#f59e0b' : '#ef4444'
            } as React.CSSProperties}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dettagli prezzi */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-400">Entry</div>
            <div className="text-white font-mono">{signal.entryPrice}</div>
          </div>
          <div>
            <div className="text-gray-400">Take Profit</div>
            <div className="text-green-400 font-mono">{signal.takeProfit}</div>
          </div>
          <div>
            <div className="text-gray-400">Stop Loss</div>
            <div className="text-red-400 font-mono">{signal.stopLoss}</div>
          </div>
        </div>

        {/* Risk/Reward e Strategia */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-1">
            <Target className="h-3 w-3 text-blue-400" />
            <span className="text-gray-400">R:R</span>
            <span className="text-white font-semibold">{signal.riskRewardRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-purple-400" />
            <span className="text-purple-400 text-xs">{signal.strategy}</span>
          </div>
        </div>

        {/* Confidence Factors */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400">Fattori di Confidence:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(signal.confidenceFactors).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400 capitalize">{key}:</span>
                <span className="text-white">{value.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Analisi tecnica condensata */}
        <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">Analisi Tecnica</span>
            <Badge className={`text-xs ${
              signal.technicalAnalysis.trend === 'BULLISH' ? 'bg-green-600' :
              signal.technicalAnalysis.trend === 'BEARISH' ? 'bg-red-600' : 'bg-gray-600'
            }`}>
              {signal.technicalAnalysis.trend}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">RSI:</span>
              <span className="text-white">{signal.technicalAnalysis.rsi.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Volatilità:</span>
              <span className={`${
                signal.technicalAnalysis.volatility === 'HIGH' ? 'text-red-400' :
                signal.technicalAnalysis.volatility === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {signal.technicalAnalysis.volatility}
              </span>
            </div>
          </div>
        </div>

        {/* Risultato esecuzione (se disponibile) */}
        {signal.executionResult && (
          <div className={`bg-slate-700/30 rounded-lg p-3 border ${
            signal.executionResult.result === 'PROFIT' ? 'border-green-500/30' : 
            signal.executionResult.result === 'LOSS' ? 'border-red-500/30' : 'border-gray-500/30'
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-400">Risultato Esecuzione</span>
              {signal.executionResult.result && (
                <Badge className={`text-xs ${
                  signal.executionResult.result === 'PROFIT' ? 'bg-green-600' : 
                  signal.executionResult.result === 'LOSS' ? 'bg-red-600' : 'bg-gray-600'
                }`}>
                  {signal.executionResult.result === 'PROFIT' ? '✅ PROFIT' : 
                   signal.executionResult.result === 'LOSS' ? '❌ LOSS' : '⚪ BREAK'}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">P&L:</span>
                <span className={`font-semibold ${
                  (signal.executionResult.pnl || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${(signal.executionResult.pnl || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lot Size:</span>
                <span className="text-white">{signal.executionResult.lotSize}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timing e azioni */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
            <span>•</span>
            <span>{signal.timeframe}</span>
          </div>
          
          {/* Azioni disponibili */}
          <div className="flex space-x-2">
            {signal.shouldExecute && signal.status === 'GENERATED' && (
              <Button 
                size="sm" 
                className={`text-xs ${isHighConfidence ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                onClick={() => onExecute?.(signal.id)}
                disabled={isExecuting}
              >
                {isExecuting ? 'Esecuzione...' : 'Esegui Trade'}
              </Button>
            )}
            {isHighConfidence && (
              <div className="flex items-center space-x-1 text-xs">
                <Shield className="h-3 w-3 text-blue-400" />
                <span className="text-blue-400">Auto-Execute</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedSignalCard;