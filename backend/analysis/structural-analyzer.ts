import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { APIError } from "encore.dev/api";

export interface StructuralLevel {
  price: number;
  type: 'CALL_STRIKE' | 'PUT_STRIKE' | 'POC' | 'VAH' | 'VAL';
  strength: number;
  volume?: number;
  open_interest?: number;
}

export interface VolumeProfile {
  poc: number;
  vah: number;
  val: number;
  session_high: number;
  session_low: number;
  total_volume: number;
  value_area_percentage: number;
}

export interface StructuralLevels {
  option_levels: {
    calls: Array<{
      strike: number;
      volume: number;
      open_interest: number;
      relevance_score: number;
    }>;
    puts: Array<{
      strike: number;
      volume: number;
      open_interest: number;
      relevance_score: number;
    }>;
  };
  volume_profile: VolumeProfile;
  calculation_date: string;
}

export interface BasisData {
  instrument: string;
  basis: number;
  cfd_price: number;
  future_price: number;
  confidence: 'high' | 'medium' | 'low';
  is_within_typical_range: boolean;
  calculation_time: string;
  is_fallback?: boolean;
}

export interface ConfluenceAnalysis {
  confluenceScore: number;
  contributingFactors: string[];
  nearbyLevels: Array<{
    level: number;
    type: string;
    distance: number;
  }>;
}

export interface EnhancedSignalMetadata {
  mlConfidence: number;
  confluenceScore: number;
  structuralLevelsUsed: number;
  basisApplied: number;
  contributingFactors: string[];
  structuralLevels?: StructuralLevel[];
  basisData?: BasisData;
}

const PYTHON_SCRIPTS_DIR = path.join(__dirname, "..", "..", "analytics_engine");
const DATA_LAKE_DIR = path.join(__dirname, "..", "..", "data_lake");

export class StructuralAnalyzer {
  private static instance: StructuralAnalyzer;
  private isInitialized = false;

  static getInstance(): StructuralAnalyzer {
    if (!StructuralAnalyzer.instance) {
      StructuralAnalyzer.instance = new StructuralAnalyzer();
    }
    return StructuralAnalyzer.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.ensureDirectoriesExist();
      await this.checkPythonScripts();
      this.isInitialized = true;
      console.log("✅ StructuralAnalyzer inizializzato");
    } catch (error) {
      console.error("❌ Errore inizializzazione StructuralAnalyzer:", error);
      throw new APIError(500, "Errore inizializzazione analisi strutturale");
    }
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.access(PYTHON_SCRIPTS_DIR);
    } catch {
      throw new Error(`Directory Python scripts non trovata: ${PYTHON_SCRIPTS_DIR}`);
    }

    try {
      await fs.access(DATA_LAKE_DIR);
    } catch {
      await fs.mkdir(DATA_LAKE_DIR, { recursive: true });
      console.log(`📁 Creata directory data lake: ${DATA_LAKE_DIR}`);
    }
  }

  private async checkPythonScripts(): Promise<void> {
    const requiredScripts = [
      "structural_levels.py",
      "price_mapper.py"
    ];

    for (const script of requiredScripts) {
      const scriptPath = path.join(PYTHON_SCRIPTS_DIR, script);
      try {
        await fs.access(scriptPath);
      } catch {
        throw new Error(`Script Python mancante: ${scriptPath}`);
      }
    }
  }

  async getStructuralLevels(date: Date, instruments: string[] = ['ES', 'NQ']): Promise<Record<string, StructuralLevels>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🎯 Recupero livelli strutturali per ${instruments.join(', ')} del ${date.toISOString().split('T')[0]}`);

      const result = await this.runPythonScript('structural_levels.py', [
        '--date', date.toISOString().split('T')[0],
        '--instruments', instruments.join(','),
        '--output-format', 'json'
      ]);

      if (!result.success) {
        console.warn("⚠️ Livelli strutturali non disponibili, uso fallback");
        return this.generateFallbackLevels(instruments, date);
      }

      const levels = JSON.parse(result.output);
      console.log(`✅ Livelli strutturali caricati per ${Object.keys(levels).length} strumenti`);
      
      return levels;

    } catch (error) {
      console.error("❌ Errore recupero livelli strutturali:", error);
      return this.generateFallbackLevels(instruments, date);
    }
  }

  async getBasisData(instrument: string): Promise<BasisData | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🗺️ Calcolo basis per ${instrument}`);

      const result = await this.runPythonScript('price_mapper.py', [
        '--instrument', instrument,
        '--action', 'get_basis',
        '--output-format', 'json'
      ]);

      if (!result.success) {
        console.warn(`⚠️ Basis non disponibile per ${instrument}, uso fallback`);
        return this.generateFallbackBasis(instrument);
      }

      const basisData = JSON.parse(result.output);
      console.log(`✅ Basis ${instrument}: ${basisData.basis}`);
      
      return basisData;

    } catch (error) {
      console.error(`❌ Errore calcolo basis per ${instrument}:`, error);
      return this.generateFallbackBasis(instrument);
    }
  }

  async calculateConfluenceScore(
    signalPrice: number,
    structuralLevels: StructuralLevels,
    basisData: BasisData | null,
    atrValue: number = 5.0
  ): Promise<ConfluenceAnalysis> {
    let confluenceScore = 0;
    const contributingFactors: string[] = [];
    const nearbyLevels: Array<{ level: number; type: string; distance: number }> = [];

    if (!structuralLevels) {
      return { confluenceScore: 0, contributingFactors: [], nearbyLevels: [] };
    }

    const tolerance = atrValue * 0.5; // Tolleranza basata su 50% dell'ATR
    let adjustedLevels: number[] = [];

    try {
      // Raccogli tutti i livelli strutturali
      const allLevels: StructuralLevel[] = [];

      // Livelli dalle opzioni Call
      for (const call of structuralLevels.option_levels?.calls || []) {
        allLevels.push({
          price: call.strike,
          type: 'CALL_STRIKE',
          strength: call.relevance_score || call.open_interest,
          volume: call.volume,
          open_interest: call.open_interest
        });
      }

      // Livelli dalle opzioni Put
      for (const put of structuralLevels.option_levels?.puts || []) {
        allLevels.push({
          price: put.strike,
          type: 'PUT_STRIKE',
          strength: put.relevance_score || put.open_interest,
          volume: put.volume,
          open_interest: put.open_interest
        });
      }

      // Livelli dal volume profile
      const vp = structuralLevels.volume_profile;
      if (vp) {
        if (vp.poc) allLevels.push({ price: vp.poc, type: 'POC', strength: vp.total_volume || 100000 });
        if (vp.vah) allLevels.push({ price: vp.vah, type: 'VAH', strength: (vp.total_volume || 100000) * 0.7 });
        if (vp.val) allLevels.push({ price: vp.val, type: 'VAL', strength: (vp.total_volume || 100000) * 0.7 });
      }

      // Applica basis per convertire livelli da futures a CFD
      if (basisData && !basisData.is_fallback) {
        adjustedLevels = allLevels.map(level => level.price + basisData.basis);
      } else {
        adjustedLevels = allLevels.map(level => level.price);
      }

      // Calcola confluenza per ogni livello
      for (let i = 0; i < allLevels.length; i++) {
        const adjustedLevel = adjustedLevels[i];
        const distance = Math.abs(signalPrice - adjustedLevel);

        if (distance <= tolerance) {
          const level = allLevels[i];
          const levelWeight = this.calculateLevelWeight(level.type, level.strength);
          confluenceScore += levelWeight;

          contributingFactors.push(`NEAR_${level.type}`);
          nearbyLevels.push({
            level: adjustedLevel,
            type: level.type,
            distance: distance
          });

          console.log(`✅ Confluenza trovata: ${level.type} a ${adjustedLevel} (distanza: ${distance.toFixed(2)}, peso: ${levelWeight})`);
        }
      }

      console.log(`🎯 Punteggio confluenza finale: ${confluenceScore} (${contributingFactors.length} fattori)`);

    } catch (error) {
      console.error("❌ Errore calcolo confluenza:", error);
    }

    return {
      confluenceScore: Math.round(confluenceScore),
      contributingFactors,
      nearbyLevels
    };
  }

  private calculateLevelWeight(levelType: string, strength: number): number {
    const baseWeights = {
      'POC': 3.0,        // Point of Control = peso massimo
      'VAH': 2.5,        // Value Area High
      'VAL': 2.5,        // Value Area Low
      'PUT_STRIKE': 2.0, // Strike Put con alto OI
      'CALL_STRIKE': 2.0 // Strike Call con alto OI
    };

    const baseWeight = baseWeights[levelType] || 1.0;
    
    // Scala il peso in base alla forza del livello
    const strengthMultiplier = Math.min(1.5, Math.max(0.5, strength / 100000));
    
    return baseWeight * strengthMultiplier;
  }

  async enhanceSignalReliability(
    originalConfidence: number,
    confluenceScore: number,
    maxConfidence: number = 95
  ): Promise<number> {
    // Formula combinata: confidence ML + bonus confluenza
    const confluenceBonus = Math.min(20, confluenceScore * 2); // Max 20% bonus
    const enhancedConfidence = originalConfidence + confluenceBonus;

    // Applica limite massimo
    const finalConfidence = Math.min(maxConfidence, enhancedConfidence);

    console.log(`📈 Confidence migliorato: ${originalConfidence}% + ${confluenceBonus}% = ${finalConfidence}%`);

    return Math.round(finalConfidence);
  }

  private async runPythonScript(scriptName: string, args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const scriptPath = path.join(PYTHON_SCRIPTS_DIR, scriptName);
      const pythonProcess = spawn('python', [scriptPath, ...args]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim() || undefined
        });
      });

      // Timeout dopo 30 secondi
      setTimeout(() => {
        pythonProcess.kill();
        resolve({
          success: false,
          output: '',
          error: 'Python script timeout'
        });
      }, 30000);
    });
  }

  private generateFallbackLevels(instruments: string[], date: Date): Record<string, StructuralLevels> {
    const fallback: Record<string, StructuralLevels> = {};

    for (const instrument of instruments) {
      fallback[instrument] = {
        option_levels: {
          calls: [],
          puts: []
        },
        volume_profile: {
          poc: 0,
          vah: 0,
          val: 0,
          session_high: 0,
          session_low: 0,
          total_volume: 0,
          value_area_percentage: 0
        },
        calculation_date: date.toISOString().split('T')[0]
      };
    }

    console.log("⚠️ Usando livelli strutturali di fallback");
    return fallback;
  }

  private generateFallbackBasis(instrument: string): BasisData {
    // Basis tipici per quando i dati real-time non sono disponibili
    const fallbackBases: Record<string, number> = {
      'ES': 2.5,
      'NQ': 5.0,
      'EURUSD': 0.0001,
      'GBPUSD': 0.0001,
      'USDJPY': 0.01,
      'XAUUSD': 1.0,
      'XAGUSD': 0.05
    };

    return {
      instrument,
      basis: fallbackBases[instrument] || 0,
      cfd_price: 0,
      future_price: 0,
      confidence: 'low',
      is_within_typical_range: true,
      calculation_time: new Date().toISOString(),
      is_fallback: true
    };
  }

  getInstrumentFromSymbol(symbol: string): string {
    // Mappa simboli CFD a codici strumento per analisi strutturale
    const symbolMapping: Record<string, string> = {
      'US500': 'ES',
      'SPX500': 'ES',
      'US30': 'YM',
      'US100': 'NQ',
      'NAS100': 'NQ',
      'EURUSD': 'EUR',
      'GBPUSD': 'GBP',
      'USDJPY': 'JPY',
      'USDCHF': 'CHF',
      'AUDUSD': 'AUD',
      'XAUUSD': 'GOLD',
      'XAGUSD': 'SILVER',
      'USOIL': 'CRUDE'
    };

    return symbolMapping[symbol] || symbol;
  }

  async cleanup(): Promise<void> {
    // Cleanup risorse se necessario
    this.isInitialized = false;
    console.log("🧹 StructuralAnalyzer cleanup completato");
  }
}