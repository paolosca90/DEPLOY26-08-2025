import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, Zap, Shield, BarChart3, Users, Download, Star, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  const features = [
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
      title: "AI-Powered Signals",
      description: "Advanced machine learning algorithms analyze market patterns with 85%+ accuracy"
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-500" />,
      title: "Real-Time Execution",
      description: "Direct MT5 integration for instant trade execution with minimal latency"
    },
    {
      icon: <Shield className="h-6 w-6 text-green-500" />,
      title: "Risk Management",
      description: "Built-in stop-loss, take-profit, and position sizing for capital protection"
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
      title: "Advanced Analytics",
      description: "Comprehensive performance tracking and detailed trading statistics"
    }
  ];

  const testimonials = [
    {
      name: "Marco R.",
      profit: "+€12,450",
      period: "3 months",
      text: "AI-ENCORE ha trasformato il mio trading. Risultati consistenti ogni giorno.",
      rating: 5
    },
    {
      name: "Giulia P.",
      profit: "+€8,920",
      period: "2 months", 
      text: "Finalmente un sistema che funziona davvero. Raccomando a tutti i trader.",
      rating: 5
    },
    {
      name: "Roberto L.",
      profit: "+€15,780",
      period: "4 months",
      text: "La precisione dei segnali è incredibile. Il miglior investimento che abbia mai fatto.",
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: "Free Trial",
      price: "0",
      period: "7 giorni",
      description: "Prova gratuita per testare il sistema",
      features: [
        "5 segnali al giorno",
        "Dashboard basic",
        "Email support",
        "Analisi base"
      ],
      popular: false,
      cta: "Inizia Gratis"
    },
    {
      name: "Professional",
      price: "97",
      period: "mese",
      description: "Per trader seri che vogliono risultati consistenti",
      features: [
        "Segnali illimitati 24/7",
        "Auto-trading MT5",
        "Analisi avanzata AI",
        "Support prioritario",
        "Risk management",
        "Performance analytics"
      ],
      popular: true,
      cta: "Inizia Ora"
    },
    {
      name: "Enterprise",
      price: "297",
      period: "mese",
      description: "Per professionisti e fondi di investimento",
      features: [
        "Multi-account management",
        "API personalizzata",
        "Supporto dedicato",
        "Custom strategies",
        "White-label solution",
        "Unlimited execution"
      ],
      popular: false,
      cta: "Contattaci"
    }
  ];

  const handleGetStarted = (planName: string) => {
    setSelectedPlan(planName);
    // Navigate to registration with selected plan
    window.location.href = `/register?plan=${planName.toLowerCase().replace(' ', '-')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      
      {/* Header */}
      <header className="relative z-20 bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <span className="text-white font-bold text-xl">ENCORE Trading</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-slate-800"
                onClick={() => navigate('/login')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
                onClick={() => navigate('/register')}
              >
                Inizia Gratis
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/50">
              🚀 Nuovo Sistema AI-ENCORE 2025
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Il Futuro del 
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {" "}Trading AI
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Sistema di trading automatizzato basato su Intelligenza Artificiale che genera 
              segnali con <strong className="text-blue-400">85%+ di precisione</strong> 
              e si integra direttamente con MetaTrader 5 per esecuzione istantanea.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
                onClick={() => handleGetStarted("Free Trial")}
              >
                <Download className="mr-2 h-5 w-5" />
                Prova Gratuita 7 Giorni
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Vedi Prezzi
              </Button>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">+127%</div>
                  <div className="text-sm text-gray-300">ROI Medio Mensile</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">2,847</div>
                  <div className="text-sm text-gray-300">Trader Attivi</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">€2.1M</div>
                  <div className="text-sm text-gray-300">Profitti Generati</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Perché AI-ENCORE è Diverso
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Non è solo un altro bot di trading. È un sistema completo di Intelligenza Artificiale 
              che analizza migliaia di variabili in tempo reale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-colors">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Cosa Dicono i Nostri Trader
            </h2>
            <p className="text-xl text-gray-300">
              Risultati reali da trader reali
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-lg">{testimonial.name}</CardTitle>
                      <div className="text-green-400 font-bold text-xl">
                        {testimonial.profit}
                      </div>
                      <div className="text-gray-400 text-sm">
                        in {testimonial.period}
                      </div>
                    </div>
                    <div className="flex">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 italic">"{testimonial.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-800/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Scegli il Tuo Piano
            </h2>
            <p className="text-xl text-gray-300">
              Piani flessibili per ogni tipo di trader
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-all ${
                  plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      Più Popolare
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-white text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-white">
                    €{plan.price}
                    <span className="text-lg text-gray-400">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-gray-300">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-gray-300">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/30'
                    }`}
                    onClick={() => handleGetStarted(plan.name)}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none max-w-4xl mx-auto">
            <CardContent className="p-12 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                Pronto a Trasformare il Tuo Trading?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Unisciti a migliaia di trader che hanno già aumentato i loro profitti con AI-ENCORE
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4"
                  onClick={() => handleGetStarted("Free Trial")}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Inizia la Prova Gratuita
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 px-8 py-4"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Parla con un Esperto
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="text-center text-gray-400">
            <p className="mb-2">© 2025 AI-ENCORE. Tutti i diritti riservati.</p>
            <p className="text-sm">
              Il trading comporta rischi. I risultati passati non garantiscono performance future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}