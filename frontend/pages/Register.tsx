import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, User, CreditCard, Settings, Download, Mail } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

// Validation schemas for each step
const basePersonalDataSchema = z.object({
  firstName: z.string().min(2, "Nome deve essere almeno 2 caratteri"),
  lastName: z.string().min(2, "Cognome deve essere almeno 2 caratteri"),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Password deve essere almeno 8 caratteri"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
});

const personalDataSchema = basePersonalDataSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const planSelectionSchema = z.object({
  plan: z.enum(["free-trial", "professional", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
});

const mt5DataSchema = z.object({
  mt5Login: z.string().min(1, "Login MT5 richiesto"),
  mt5Server: z.string().min(1, "Server MT5 richiesto"),
  brokerName: z.string().min(1, "Nome broker richiesto"),
  accountType: z.enum(["demo", "live"]),
  // Note: We don't store password in form, it will be entered separately
});

const completeSchema = basePersonalDataSchema.merge(planSelectionSchema).merge(mt5DataSchema).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof completeSchema>;

const POPULAR_BROKERS = [
  "XM Global", "IC Markets", "FXCM", "Exness", "Pepperstone", 
  "Admiral Markets", "IG", "OANDA", "FP Markets", "Altro"
];

type PlanKey = "free-trial" | "professional" | "enterprise";

const PLAN_DETAILS: Record<PlanKey, {
  name: string;
  price: number;
  period: string;
  features: string[];
}> = {
  "free-trial": {
    name: "Free Trial",
    price: 0,
    period: "7 giorni",
    features: ["5 segnali/giorno", "Dashboard base", "Email support"]
  },
  "professional": {
    name: "Professional", 
    price: 97,
    period: "mese",
    features: ["Segnali illimitati", "Auto-trading", "Support prioritario"]
  },
  "enterprise": {
    name: "Enterprise",
    price: 297, 
    period: "mese",
    features: ["Multi-account", "API personalizzata", "Supporto dedicato"]
  }
};

export default function Register() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const selectedPlanFromUrl = searchParams.get("plan") as keyof typeof PLAN_DETAILS || "professional";

  const form = useForm<FormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      plan: selectedPlanFromUrl,
      billingCycle: "monthly",
      mt5Login: "",
      mt5Server: "",
      brokerName: "",
      accountType: "demo"
    },
    mode: "onChange"
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const validateCurrentStep = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await form.trigger(['firstName', 'lastName', 'email', 'password', 'confirmPassword']);
        break;
      case 2:
        isValid = await form.trigger(['plan', 'billingCycle']);
        break;
      case 3:
        isValid = await form.trigger(['mt5Login', 'mt5Server', 'brokerName', 'accountType']);
        break;
      default:
        isValid = true;
    }
    
    return isValid;
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      console.log("Registration data:", data);
      
      // Call mock backend for registration
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.firstName,
          surname: data.lastName,
          plan: PLAN_DETAILS[data.plan],
          mt5Data: {
            login: data.mt5Login,
            server: data.mt5Server,
            broker: data.brokerName,
            type: data.accountType
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setRegistrationComplete(true);
        setCurrentStep(4);
        console.log("✅ Registration successful:", result);
      } else {
        throw new Error(result.error || 'Registration failed');
      }
      
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPersonalDataStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <User className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Dati Personali</h2>
        <p className="text-gray-300">Iniziamo con le informazioni di base</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Nome</FormLabel>
              <FormControl>
                <Input placeholder="Il tuo nome" className="bg-white/5 border-white/20 text-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Cognome</FormLabel>
              <FormControl>
                <Input placeholder="Il tuo cognome" className="bg-white/5 border-white/20 text-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="la-tua-email@esempio.com" className="bg-white/5 border-white/20 text-white" {...field} />
            </FormControl>
            <FormDescription className="text-gray-400">
              Useremo questa email per inviarti l'installer personalizzato
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Password sicura" className="bg-white/5 border-white/20 text-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Conferma Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Ripeti password" className="bg-white/5 border-white/20 text-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Telefono (opzionale)</FormLabel>
            <FormControl>
              <Input placeholder="+39 123 456 7890" className="bg-white/5 border-white/20 text-white" {...field} />
            </FormControl>
            <FormDescription className="text-gray-400">
              Solo per supporto tecnico urgente
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderPlanSelectionStep = () => {
    const selectedPlan = form.watch("plan");
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Scegli il Tuo Piano</h2>
          <p className="text-gray-300">Seleziona il piano più adatto alle tue esigenze</p>
        </div>

        <div className="grid gap-4">
          {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all border-2 ${
                selectedPlan === key
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/20 bg-white/5 hover:border-white/40'
              }`}
              onClick={() => form.setValue("plan", key as any)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      {key === "professional" && (
                        <Badge className="bg-blue-500 text-white">Popolare</Badge>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mt-1">
                      €{plan.price}
                      <span className="text-sm text-gray-400">/{plan.period}</span>
                    </div>
                    <ul className="mt-3 text-gray-300 text-sm space-y-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 ${
                    selectedPlan === key
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-white/40'
                  }`}>
                    {selectedPlan === key && (
                      <CheckCircle className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedPlan !== "free-trial" && (
          <FormField
            control={form.control}
            name="billingCycle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white">Ciclo di fatturazione</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Seleziona ciclo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monthly">Mensile</SelectItem>
                    <SelectItem value="yearly">
                      Annuale 
                      <Badge className="ml-2 bg-green-500">-20%</Badge>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            💡 <strong>Modalità Test:</strong> I pagamenti sono temporaneamente disabilitati. 
            Riceverai accesso completo per testare il sistema.
          </p>
        </div>
      </div>
    );
  };

  const renderMT5DataStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Configurazione MT5</h2>
        <p className="text-gray-300">Collega il tuo account MetaTrader 5</p>
      </div>

      <FormField
        control={form.control}
        name="brokerName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Broker</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Seleziona il tuo broker" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {POPULAR_BROKERS.map((broker) => (
                  <SelectItem key={broker} value={broker}>
                    {broker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="mt5Login"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Login MT5</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Es: 123456789" 
                  className="bg-white/5 border-white/20 text-white" 
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-gray-400">
                Il numero del tuo account MT5
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Tipo Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="mt5Server"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-white">Server MT5</FormLabel>
            <FormControl>
              <Input 
                placeholder="Es: XMGlobal-Demo o ICMarkets-Live01" 
                className="bg-white/5 border-white/20 text-white" 
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-gray-400">
              Il server del tuo broker (visibile in MT5)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <h4 className="text-blue-400 font-semibold mb-2">🔒 Sicurezza</h4>
        <p className="text-gray-300 text-sm">
          La password MT5 non viene mai salvata sui nostri server. Sarà richiesta solo 
          durante l'installazione dell'AI-ENCORE Client sul tuo computer.
        </p>
      </div>
    </div>
  );

  const renderCompletionStep = () => (
    <div className="text-center space-y-6">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h2 className="text-3xl font-bold text-white">Registrazione Completata!</h2>
      <p className="text-gray-300 text-lg max-w-2xl mx-auto">
        Il tuo account è stato creato con successo. Riceverai a breve un'email con 
        il tuo installer personalizzato AI-ENCORE.
      </p>

      <Card className="bg-white/5 border-white/20 max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-300">Piano:</span>
              <span className="text-white font-semibold">
                {PLAN_DETAILS[form.getValues("plan")].name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Email:</span>
              <span className="text-white">{form.getValues("email")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Broker:</span>
              <span className="text-white">{form.getValues("brokerName")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button 
          size="lg" 
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={async () => {
            try {
              // Generate installer via mock backend
              const generateResponse = await fetch('http://localhost:3001/installer/generate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: 1, // Mock user ID
                  installerToken: `installer_${Date.now()}`
                })
              });

              const generateResult = await generateResponse.json();
              
              if (generateResult.success) {
                // Download installer
                const downloadUrl = `http://localhost:3001${generateResult.downloadUrl}`;
                window.open(downloadUrl, '_blank');
                console.log("✅ Installer download started:", downloadUrl);
              } else {
                throw new Error(generateResult.error || 'Installer generation failed');
              }
              
            } catch (error) {
              console.error("❌ Errore download installer:", error);
              
              // Fallback to local mock if backend fails
              const mockResponse = {
                content: `@echo off
REM AI-ENCORE Mock Installer per ${form.getValues("firstName")} ${form.getValues("lastName")}
REM Email: ${form.getValues("email")}
REM Piano: ${form.getValues("plan")}
REM Broker: ${form.getValues("brokerName")}
REM Generated: ${new Date().toLocaleString('it-IT')}

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               🚀 AI-ENCORE INSTALLER PERSONALE 🚀           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Ciao ${form.getValues("firstName")}! 👋
echo.
echo I tuoi dati preconfigurati:
echo 📧 Email: ${form.getValues("email")}
echo 💎 Piano: ${form.getValues("plan").toUpperCase()}
echo 🏦 Broker: ${form.getValues("brokerName")}
echo 👤 Login MT5: ${form.getValues("mt5Login")}
echo 🖥️ Server: ${form.getValues("mt5Server")}
echo.
echo ✅ Installer completamente personalizzato!
echo ✅ Zero configurazione richiesta!
echo ✅ Pronto per il trading AI!
echo.
pause`,
                filename: `AI-ENCORE-Installer-${form.getValues("firstName")}-${form.getValues("lastName")}.bat`
              };

              // Crea e scarica il file
              const blob = new Blob([mockResponse.content], { type: 'text/plain' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = mockResponse.filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              console.log("✅ Installer scaricato (fallback):", mockResponse.filename);
            }
          }}
        >
          <Download className="mr-2 h-5 w-5" />
          Scarica Installer Personalizzato
        </Button>
        
        <div className="text-center">
          <Button 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10"
            onClick={() => navigate("/dashboard")}
          >
            <Mail className="mr-2 h-5 w-5" />
            Vai alla Dashboard
          </Button>
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-2xl mx-auto">
        <h4 className="text-green-400 font-semibold mb-2">📧 Controlla la tua email</h4>
        <p className="text-gray-300 text-sm">
          Ti abbiamo inviato un'email con:
        </p>
        <ul className="text-gray-300 text-sm mt-2 space-y-1">
          <li>• Link per il download dell'installer</li>
          <li>• Credenziali di accesso alla dashboard</li>
          <li>• Guida rapida per l'installazione</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Registrati ad AI-ENCORE
          </h1>
          <p className="text-gray-300 text-lg">
            Completa la registrazione in {totalSteps} semplici passaggi
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Passaggio {currentStep} di {totalSteps}</span>
            <span>{Math.round(progress)}% completato</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Form */}
        <Card className="bg-white/5 border-white/20 backdrop-blur">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                
                {currentStep === 1 && renderPersonalDataStep()}
                {currentStep === 2 && renderPlanSelectionStep()}
                {currentStep === 3 && renderMT5DataStep()}
                {currentStep === 4 && renderCompletionStep()}

                {/* Navigation Buttons */}
                {currentStep < 4 && (
                  <div className="flex justify-between mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Indietro
                    </Button>

                    {currentStep === 3 ? (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSubmitting ? "Registrazione..." : "Completa Registrazione"}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Avanti
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Back to Landing */}
        <div className="text-center mt-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white"
          >
            ← Torna alla homepage
          </Button>
        </div>
      </div>
    </div>
  );
}