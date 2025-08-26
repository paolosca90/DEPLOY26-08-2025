import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Play, Settings, TrendingUp, Brain, Server, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";

export default function Guides() {
  const [activeGuide, setActiveGuide] = useState("getting-started");

  const guides = [
    {
      id: "getting-started",
      title: "🚀 Guida Introduttiva",
      description: "Come iniziare con AI Trading Boost",
      difficulty: "Principiante",
      duration: "10 min",
      icon: Play,
      content: {
        overview: "Questa guida ti aiuterà a configurare e utilizzare AI Trading Boost per la prima volta.",
        steps: [
          {
            title: "1. Configurazione Account",
            content: "Vai su Impostazioni → Preferenze di Trading e imposta il tuo profilo di rischio (consigliato: 2% per trade) e il saldo del tuo conto.",
            icon: Settings
          },
          {
            title: "2. Connessione MT5",
            content: "Configura la connessione al tuo VPS e account MetaTrader 5 nella sezione MT5. Assicurati che il trading automatico sia abilitato.",
            icon: Server
          },
          {
            title: "3. Primo Segnale",
            content: "Vai nella sezione Trading, seleziona un asset (es. EURUSD) e clicca 'Genera Segnale' per ottenere la tua prima analisi AI.",
            icon: TrendingUp
          },
          {
            title: "4. Esecuzione Trade",
            content: "Se il segnale ha alta confidenza (>80%), puoi eseguirlo cliccando 'Esegui Trade'. Il sistema aprirà automaticamente la posizione su MT5.",
            icon: CheckCircle
          }
        ]
      }
    },
    {
      id: "ml-usage",
      title: "🤖 Machine Learning",
      description: "Come utilizzare le funzionalità ML avanzate",
      difficulty: "Intermedio",
      duration: "15 min",
      icon: Brain,
      content: {
        overview: "AI Trading Boost integra machine learning avanzato per migliorare continuamente le performance di trading.",
        steps: [
          {
            title: "Dashboard ML Analytics",
            content: "La pagina ML Analytics mostra metriche come accuratezza, precision, F1 score e Sharpe ratio. Monitora questi valori per valutare le performance del modello.",
            icon: Brain
          },
          {
            title: "Addestramento Modello",
            content: "Clicca 'Addestra Modello' per far imparare l'AI dai trade recenti. Esegui questo processo dopo 20-30 trade o una volta al giorno.",
            icon: Settings
          },
          {
            title: "Rilevamento Pattern",
            content: "Usa 'Rileva Pattern' per identificare formazioni grafiche classiche. Seleziona l'asset desiderato e avvia la scansione.",
            icon: TrendingUp
          },
          {
            title: "Interpretazione Metriche",
            content: "Accuratezza >75% è buona, Sharpe Ratio >1.5 è eccellente. Le feature importance mostrano quali indicatori influenzano di più le decisioni.",
            icon: CheckCircle
          }
        ]
      }
    },
    {
      id: "vps-setup",
      title: "🖥️ Configurazione VPS",
      description: "Setup completo del Virtual Private Server",
      difficulty: "Avanzato",
      duration: "30 min",
      icon: Server,
      content: {
        overview: "Configura il tuo VPS Windows per il trading automatico 24/7 con MetaTrader 5.",
        steps: [
          {
            title: "Requisiti VPS",
            content: "VPS Windows con almeno 2GB RAM, Python 3.7+, e connessione internet stabile. Consigliati provider come Vultr, DigitalOcean o AWS.",
            icon: Server
          },
          {
            title: "Installazione MT5",
            content: "Scarica e installa MetaTrader 5 sul VPS. Configura il tuo account di trading e abilita il trading automatico nelle impostazioni.",
            icon: Settings
          },
          {
            title: "Setup Python Server",
            content: "Installa le dipendenze: pip install MetaTrader5 flask flask-cors. Scarica e avvia il file mt5-python-server.py sulla porta 8080.",
            icon: Play
          },
          {
            title: "Test Connessione",
            content: "Configura l'IP del VPS nelle impostazioni dell'app. Testa la connessione generando un segnale e verificando che venga eseguito su MT5.",
            icon: CheckCircle
          }
        ]
      }
    },
    {
      id: "trading-strategies",
      title: "📈 Strategie di Trading",
      description: "Comprendi le diverse strategie disponibili",
      difficulty: "Intermedio",
      duration: "20 min",
      icon: TrendingUp,
      content: {
        overview: "AI Trading Boost offre diverse strategie ottimizzate per diversi stili di trading e condizioni di mercato.",
        steps: [
          {
            title: "Scalping",
            content: "Trade veloci (1-15 minuti) per catturare piccoli movimenti. Richiede alta confidenza (>90%) e spread bassi. Ideale durante sessioni ad alto volume.",
            icon: TrendingUp
          },
          {
            title: "Intraday",
            content: "Posizioni mantenute per 1-6 ore, chiuse automaticamente prima della fine della sessione NY. Rapporto rischio/rendimento 1:2, confidenza minima 80%.",
            icon: Settings
          },
          {
            title: "Selezione Automatica",
            content: "Il sistema sceglie automaticamente la strategia ottimale basandosi su volatilità, trend strength, confidenza e tempo rimanente alla chiusura NY.",
            icon: Brain
          },
          {
            title: "Gestione Rischio",
            content: "Ogni strategia ha parametri specifici per stop loss, take profit e dimensione posizione. Il sistema calcola automaticamente i livelli ottimali.",
            icon: CheckCircle
          }
        ]
      }
    },
    {
      id: "troubleshooting",
      title: "🔧 Risoluzione Problemi",
      description: "Soluzioni ai problemi più comuni",
      difficulty: "Principiante",
      duration: "10 min",
      icon: AlertCircle,
      content: {
        overview: "Risolvi rapidamente i problemi più comuni che potresti incontrare durante l'utilizzo di AI Trading Boost.",
        steps: [
          {
            title: "Connessione MT5 Fallita",
            content: "Verifica che MT5 sia aperto e connesso, il trading automatico sia abilitato, e il server Python sia in esecuzione sulla porta 8080.",
            icon: AlertCircle
          },
          {
            title: "Segnali Non Eseguiti",
            content: "Controlla il saldo del conto, i margini disponibili, e che il simbolo sia disponibile per il trading sul tuo broker.",
            icon: Settings
          },
          {
            title: "Posizioni Non Visibili",
            content: "Le posizioni appaiono solo se generate dal sistema. Verifica che il commento del trade contenga il trade ID del segnale.",
            icon: TrendingUp
          },
          {
            title: "Performance Basse",
            content: "Riaddestra il modello ML, verifica le condizioni di mercato, e considera di ridurre la dimensione delle posizioni durante alta volatilità.",
            icon: Brain
          }
        ]
      }
    }
  ];

  const selectedGuide = guides.find(g => g.id === activeGuide);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📚 Guide e Documentazione</h1>
        <p className="text-muted-foreground">Tutto quello che devi sapere per utilizzare al meglio AI Trading Boost</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar with guide list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guide Disponibili</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {guides.map((guide) => (
                <Button
                  key={guide.id}
                  variant={activeGuide === guide.id ? "default" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => setActiveGuide(guide.id)}
                >
                  <div className="flex items-start gap-3">
                    <guide.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{guide.title}</div>
                      <div className="text-xs text-muted-foreground">{guide.description}</div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{guide.difficulty}</Badge>
                        <Badge variant="secondary" className="text-xs">{guide.duration}</Badge>
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content area */}
        <div className="lg:col-span-3">
          {selectedGuide && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <selectedGuide.icon className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-2xl">{selectedGuide.title}</CardTitle>
                    <p className="text-muted-foreground">{selectedGuide.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{selectedGuide.difficulty}</Badge>
                      <Badge variant="secondary">{selectedGuide.duration}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">{selectedGuide.content.overview}</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Passaggi da Seguire</h3>
                  {selectedGuide.content.steps.map((step, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <step.icon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-base mb-2">{step.title}</h4>
                            <p className="text-muted-foreground leading-relaxed">{step.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Additional resources */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Risorse Aggiuntive</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">Video Tutorial</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Guarda i video tutorial dettagliati sul nostro canale YouTube
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Vai ai Video
                      </Button>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">Supporto</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Hai bisogno di aiuto? Contatta il nostro team di supporto
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Contatta Supporto
                      </Button>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick tips section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Suggerimenti Rapidi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Best Practice</h4>
              <p className="text-sm text-green-700">
                Inizia sempre con piccole dimensioni di posizione (0.01-0.1 lotti) per testare il sistema
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Attenzione</h4>
              <p className="text-sm text-yellow-700">
                Non eseguire mai trade con confidenza inferiore al 75% senza supervisione
              </p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">💡 Suggerimento</h4>
              <p className="text-sm text-blue-700">
                Monitora le performance ML e riaddestra il modello settimanalmente per risultati ottimali
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
