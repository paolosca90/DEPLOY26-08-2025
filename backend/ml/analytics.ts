import { api } from "encore.dev/api";
import { mlDB } from "./db";
import { analysisDB } from "../analysis/db";
import { getSignalAnalytics, getMLTrainingData } from "../analysis/analytics-tracker";

export interface MLAnalytics {
  modelPerformance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  predictionStats: {
    totalPredictions: number;
    correctPredictions: number;
    avgConfidence: number;
    winRate: number;
    profitFactor: number;
  };
  featureImportance: Array<{
    feature: string;
    importance: number;
    type: string;
  }>;
  learningProgress: Array<{
    epoch: number;
    trainingLoss: number;
    validationLoss: number;
    accuracy: number;
  }>;
  marketPatterns: Array<{
    pattern: string;
    type: string;
    confidence: number;
    successRate: number;
    avgProfit: number;
    detectedAt: Date;
  }>;
  performanceTimeline: Array<{
    date: string;
    accuracy: number;
    profitLoss: number;
    predictions: number;
  }>;
  adaptiveParameters: Array<{
    parameter: string;
    currentValue: number;
    previousValue: number;
    adaptationReason: string;
    performanceImprovement: number;
  }>;
  signalAnalytics: {
    successRateBySymbol: Array<{
      symbol: string;
      totalSignals: number;
      successfulSignals: number;
      successRate: number;
      avgGenerationTime: number;
    }>;
    performanceByConditions: Array<{
      sessionType: string;
      volatilityState: string;
      signalCount: number;
      avgConfidence: number;
      successfulCount: number;
    }>;
    trendAnalysis: Array<{
      hour: string;
      signalsGenerated: number;
      avgConfidence: number;
      successfulSignals: number;
    }>;
  };
  mlTrainingInsights: {
    totalTrainingRecords: number;
    accuracyBySymbol: Array<{
      symbol: string;
      accuracy: number;
      sampleSize: number;
    }>;
    confidenceCalibration: Array<{
      confidenceRange: string;
      actualSuccessRate: number;
      sampleSize: number;
    }>;
    marketConditionPerformance: Array<{
      condition: string;
      accuracy: number;
      avgProfitLoss: number;
      sampleSize: number;
    }>;
  };
}

// Retrieves comprehensive ML analytics and performance metrics.
export const getMLAnalytics = api<void, MLAnalytics>(
  {
    expose: true,
    method: "GET",
    path: "/ml/analytics"
  },
  async () => {
    // Get model performance metrics
    const modelMetrics = await mlDB.queryAll`
      SELECT metric_type, CAST(AVG(metric_value) AS DOUBLE PRECISION) as avg_value
      FROM ml_model_metrics 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY metric_type
    `;

    const modelPerformance = {
      accuracy: getMetricValue(modelMetrics, 'accuracy', 0.75),
      precision: getMetricValue(modelMetrics, 'precision', 0.72),
      recall: getMetricValue(modelMetrics, 'recall', 0.78),
      f1Score: getMetricValue(modelMetrics, 'f1_score', 0.75),
      sharpeRatio: getMetricValue(modelMetrics, 'sharpe_ratio', 1.2),
      maxDrawdown: getMetricValue(modelMetrics, 'max_drawdown', 0.15),
    };

    // Get prediction statistics with proper type casting
    const predictionStats = await mlDB.queryRow`
      SELECT 
        CAST(COUNT(*) AS BIGINT) as total_predictions,
        CAST(COUNT(CASE WHEN accuracy_score > 0.5 THEN 1 END) AS BIGINT) as correct_predictions,
        CAST(AVG(predicted_confidence) AS DOUBLE PRECISION) as avg_confidence,
        CAST(AVG(CASE WHEN actual_profit_loss > 0 THEN 1.0 ELSE 0.0 END) AS DOUBLE PRECISION) as win_rate
      FROM ml_prediction_accuracy 
      WHERE prediction_date >= NOW() - INTERVAL '30 days'
    `;

    const profitStats = await analysisDB.queryRow`
      SELECT 
        COALESCE(CAST(SUM(CASE WHEN profit_loss > 0 THEN profit_loss ELSE 0 END) AS DOUBLE PRECISION), 0.0) as total_profit,
        COALESCE(CAST(ABS(SUM(CASE WHEN profit_loss < 0 THEN profit_loss ELSE 0 END)) AS DOUBLE PRECISION), 1.0) as total_loss
      FROM trading_signals 
      WHERE profit_loss IS NOT NULL 
      AND created_at >= NOW() - INTERVAL '30 days'
    `;

    const predictionStatsResult = {
      totalPredictions: Number(predictionStats?.total_predictions) || 0,
      correctPredictions: Number(predictionStats?.correct_predictions) || 0,
      avgConfidence: Number(predictionStats?.avg_confidence) || 0,
      winRate: Number(predictionStats?.win_rate) || 0,
      profitFactor: Number(profitStats?.total_profit) / Number(profitStats?.total_loss) || 0,
    };

    // Get feature importance
    const featureImportance = await mlDB.queryAll`
      SELECT 
        feature_name,
        CAST(AVG(importance_score) AS DOUBLE PRECISION) as importance,
        feature_type
      FROM ml_feature_importance 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY feature_name, feature_type
      ORDER BY importance DESC
      LIMIT 10
    `;

    // Get learning progress
    const learningProgress = await mlDB.queryAll`
      SELECT 
        training_epoch as epoch,
        CAST(training_loss AS DOUBLE PRECISION) as training_loss,
        CAST(validation_loss AS DOUBLE PRECISION) as validation_loss,
        CAST((1.0 - validation_loss) AS DOUBLE PRECISION) as accuracy
      FROM ml_learning_progress 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY training_epoch DESC
      LIMIT 50
    `;

    // Get market patterns
    const marketPatterns = await mlDB.queryAll`
      SELECT 
        pattern_name as pattern,
        pattern_type as type,
        CAST(confidence_score AS DOUBLE PRECISION) as confidence,
        CAST(success_rate AS DOUBLE PRECISION) as success_rate,
        CAST(avg_profit AS DOUBLE PRECISION) as avg_profit,
        detected_at
      FROM ml_market_patterns 
      WHERE detected_at >= NOW() - INTERVAL '7 days'
      ORDER BY confidence_score DESC
      LIMIT 10
    `;

    // Get performance timeline
    const performanceTimeline = await mlDB.queryAll`
      SELECT 
        date_period::text as date,
        CAST(accuracy_rate AS DOUBLE PRECISION) as accuracy,
        CAST(total_profit_loss AS DOUBLE PRECISION) as profit_loss,
        CAST(total_predictions AS BIGINT) as predictions
      FROM ml_performance_timeline 
      WHERE date_period >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date_period ASC
    `;

    // Get adaptive parameters
    const adaptiveParameters = await mlDB.queryAll`
      SELECT DISTINCT ON (parameter_name)
        parameter_name as parameter,
        CAST(parameter_value AS DOUBLE PRECISION) as current_value,
        CAST(LAG(parameter_value) OVER (PARTITION BY parameter_name ORDER BY adapted_at) AS DOUBLE PRECISION) as previous_value,
        adaptation_reason,
        CAST((performance_after - performance_before) AS DOUBLE PRECISION) as performance_improvement
      FROM ml_adaptive_parameters 
      WHERE adapted_at >= NOW() - INTERVAL '7 days'
      ORDER BY parameter_name, adapted_at DESC
    `;

    // Get enhanced signal analytics
    const signalAnalytics = await getSignalAnalytics('day');

    // Get ML training insights
    const mlTrainingData = await getMLTrainingData();
    const mlTrainingInsights = await generateMLTrainingInsights(mlTrainingData);

    return {
      modelPerformance,
      predictionStats: predictionStatsResult,
      featureImportance: featureImportance.map(f => ({
        feature: f.feature_name,
        importance: Number(f.importance),
        type: f.feature_type,
      })),
      learningProgress: learningProgress.map(l => ({
        epoch: Number(l.epoch),
        trainingLoss: Number(l.training_loss),
        validationLoss: Number(l.validation_loss),
        accuracy: Number(l.accuracy),
      })),
      marketPatterns: marketPatterns.map(p => ({
        pattern: p.pattern,
        type: p.type,
        confidence: Number(p.confidence),
        successRate: Number(p.success_rate),
        avgProfit: Number(p.avg_profit),
        detectedAt: new Date(p.detected_at),
      })),
      performanceTimeline: performanceTimeline.map(pt => ({
        date: pt.date,
        accuracy: Number(pt.accuracy),
        profitLoss: Number(pt.profit_loss),
        predictions: Number(pt.predictions),
      })),
      adaptiveParameters: adaptiveParameters.map(ap => ({
        parameter: ap.parameter,
        currentValue: Number(ap.current_value),
        previousValue: Number(ap.previous_value) || 0,
        adaptationReason: ap.adaptation_reason || '',
        performanceImprovement: Number(ap.performance_improvement) || 0,
      })),
      signalAnalytics,
      mlTrainingInsights
    };
  }
);

async function generateMLTrainingInsights(trainingData: any[]) {
  if (trainingData.length === 0) {
    return {
      totalTrainingRecords: 0,
      accuracyBySymbol: [],
      confidenceCalibration: [],
      marketConditionPerformance: []
    };
  }

  // Calculate accuracy by symbol
  const symbolStats = trainingData.reduce((acc, record) => {
    if (!acc[record.symbol]) {
      acc[record.symbol] = { correct: 0, total: 0 };
    }
    acc[record.symbol].total++;
    if (record.wasCorrect) {
      acc[record.symbol].correct++;
    }
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const accuracyBySymbol = Object.entries(symbolStats).map(([symbol, stats]) => ({
    symbol,
    accuracy: stats.correct / stats.total,
    sampleSize: stats.total
  }));

  // Calculate confidence calibration
  const confidenceRanges = [
    { min: 0, max: 60, label: '0-60%' },
    { min: 60, max: 70, label: '60-70%' },
    { min: 70, max: 80, label: '70-80%' },
    { min: 80, max: 90, label: '80-90%' },
    { min: 90, max: 100, label: '90-100%' }
  ];

  const confidenceCalibration = confidenceRanges.map(range => {
    const recordsInRange = trainingData.filter(r => 
      r.predictedConfidence >= range.min && r.predictedConfidence < range.max
    );
    const successRate = recordsInRange.length > 0 
      ? recordsInRange.filter(r => r.wasProfitable).length / recordsInRange.length 
      : 0;
    
    return {
      confidenceRange: range.label,
      actualSuccessRate: successRate,
      sampleSize: recordsInRange.length
    };
  });

  // Calculate performance by market conditions
  const conditionStats = trainingData.reduce((acc, record) => {
    const sessionType = record.generationMarketConditions?.sessionType || 'UNKNOWN';
    if (!acc[sessionType]) {
      acc[sessionType] = { correct: 0, total: 0, totalProfitLoss: 0 };
    }
    acc[sessionType].total++;
    if (record.wasCorrect) {
      acc[sessionType].correct++;
    }
    acc[sessionType].totalProfitLoss += record.actualProfitLoss;
    return acc;
  }, {} as Record<string, { correct: number; total: number; totalProfitLoss: number }>);

  const marketConditionPerformance = Object.entries(conditionStats).map(([condition, stats]) => ({
    condition,
    accuracy: stats.correct / stats.total,
    avgProfitLoss: stats.totalProfitLoss / stats.total,
    sampleSize: stats.total
  }));

  return {
    totalTrainingRecords: trainingData.length,
    accuracyBySymbol,
    confidenceCalibration,
    marketConditionPerformance
  };
}

function getMetricValue(metrics: any[], metricType: string, defaultValue: number): number {
  const metric = metrics.find(m => m.metric_type === metricType);
  return metric ? Number(metric.avg_value) : defaultValue;
}

// Records ML model performance metrics
export const recordModelMetrics = api<{
  modelName: string;
  modelVersion: string;
  metrics: Record<string, number>;
}, { success: boolean }>(
  {
    expose: false,
    method: "POST",
    path: "/ml/metrics"
  },
  async (req) => {
    const { modelName, modelVersion, metrics } = req;

    for (const [metricType, value] of Object.entries(metrics)) {
      await mlDB.exec`
        INSERT INTO ml_model_metrics (
          model_name, model_version, metric_type, metric_value, training_date
        ) VALUES (
          ${modelName}, ${modelVersion}, ${metricType}, ${value}, NOW()
        )
      `;
    }

    return { success: true };
  }
);

// Records feature importance for model interpretability
export const recordFeatureImportance = api<{
  modelName: string;
  modelVersion: string;
  features: Array<{ name: string; importance: number; type: string }>;
}, { success: boolean }>(
  {
    expose: false,
    method: "POST",
    path: "/ml/features"
  },
  async (req) => {
    const { modelName, modelVersion, features } = req;

    for (const feature of features) {
      await mlDB.exec`
        INSERT INTO ml_feature_importance (
          model_name, model_version, feature_name, importance_score, feature_type
        ) VALUES (
          ${modelName}, ${modelVersion}, ${feature.name}, ${feature.importance}, ${feature.type}
        )
      `;
    }

    return { success: true };
  }
);

// Records prediction accuracy for continuous learning
export const recordPredictionAccuracy = api<{
  tradeId: string;
  predictedDirection: string;
  actualDirection?: string;
  predictedConfidence: number;
  actualProfitLoss?: number;
  modelVersion: string;
  symbol: string;
  timeframe: string;
}, { success: boolean }>(
  {
    expose: false,
    method: "POST",
    path: "/ml/prediction-accuracy"
  },
  async (req) => {
    const {
      tradeId,
      predictedDirection,
      actualDirection,
      predictedConfidence,
      actualProfitLoss,
      modelVersion,
      symbol,
      timeframe
    } = req;

    let accuracyScore = null;
    if (actualDirection) {
      accuracyScore = predictedDirection === actualDirection ? 1.0 : 0.0;
    }

    await mlDB.exec`
      INSERT INTO ml_prediction_accuracy (
        trade_id, predicted_direction, actual_direction, predicted_confidence,
        actual_profit_loss, prediction_date, outcome_date, accuracy_score,
        model_version, symbol, timeframe
      ) VALUES (
        ${tradeId}, ${predictedDirection}, ${actualDirection}, ${predictedConfidence},
        ${actualProfitLoss}, NOW(), ${actualDirection ? 'NOW()' : null}, ${accuracyScore},
        ${modelVersion}, ${symbol}, ${timeframe}
      )
    `;

    return { success: true };
  }
);

// Detects and records market patterns
export const recordMarketPattern = api<{
  patternName: string;
  patternType: string;
  symbol: string;
  timeframe: string;
  confidence: number;
  successRate: number;
  avgProfit: number;
  patternData: any;
}, { success: boolean }>(
  {
    expose: false,
    method: "POST",
    path: "/ml/market-patterns"
  },
  async (req) => {
    const {
      patternName,
      patternType,
      symbol,
      timeframe,
      confidence,
      successRate,
      avgProfit,
      patternData
    } = req;

    await mlDB.exec`
      INSERT INTO ml_market_patterns (
        pattern_name, pattern_type, symbol, timeframe, confidence_score,
        success_rate, avg_profit, pattern_data, detected_at
      ) VALUES (
        ${patternName}, ${patternType}, ${symbol}, ${timeframe}, ${confidence},
        ${successRate}, ${avgProfit}, ${JSON.stringify(patternData)}, NOW()
      )
    `;

    return { success: true };
  }
);

// Get comprehensive analytics for ML model improvement
export const getMLTrainingAnalytics = api<void, {
  trainingData: any[];
  insights: any;
  recommendations: string[];
}>(
  {
    expose: true,
    method: "GET",
    path: "/ml/training-analytics"
  },
  async () => {
    const trainingData = await getMLTrainingData();
    const insights = await generateMLTrainingInsights(trainingData);
    
    // Generate recommendations based on insights
    const recommendations = generateMLRecommendations(insights, trainingData);
    
    return {
      trainingData: trainingData.slice(0, 100), // Return only recent 100 for performance
      insights,
      recommendations
    };
  }
);

function generateMLRecommendations(insights: any, trainingData: any[]): string[] {
  const recommendations: string[] = [];
  
  // Check overall accuracy
  const overallAccuracy = trainingData.filter(r => r.wasCorrect).length / trainingData.length;
  if (overallAccuracy < 0.7) {
    recommendations.push("🔄 Overall accuracy below 70% - Consider retraining with more diverse data");
  }
  
  // Check confidence calibration
  const highConfidenceLowSuccess = insights.confidenceCalibration.find(
    (c: any) => c.confidenceRange === '80-90%' && c.actualSuccessRate < 0.7
  );
  if (highConfidenceLowSuccess) {
    recommendations.push("⚠️ High confidence predictions underperforming - Review confidence calculation");
  }
  
  // Check symbol performance variance
  const symbolAccuracies = insights.accuracyBySymbol.map((s: any) => s.accuracy);
  const maxAccuracy = Math.max(...symbolAccuracies);
  const minAccuracy = Math.min(...symbolAccuracies);
  if (maxAccuracy - minAccuracy > 0.3) {
    recommendations.push("📊 Large accuracy variance between symbols - Consider symbol-specific models");
  }
  
  // Check market condition performance
  const conditionPerformance = insights.marketConditionPerformance;
  const poorConditions = conditionPerformance.filter((c: any) => c.accuracy < 0.6);
  if (poorConditions.length > 0) {
    recommendations.push(`🌍 Poor performance in ${poorConditions.map((c: any) => c.condition).join(', ')} conditions - Adjust strategy`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push("✅ Model performance is stable across all metrics");
    recommendations.push("📈 Continue current training approach");
  }
  
  return recommendations;
}
