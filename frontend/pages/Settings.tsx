import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Settings as SettingsIcon, DollarSign, Server, Shield, HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const preferencesSchema = z.object({
  riskPercentage: z.coerce.number().min(0.1, "Minimo 0.1%").max(10, "Massimo 10%"),
  accountBalance: z.coerce.number().min(100, "Minimo $100"),
});

const mt5ConfigSchema = z.object({
  host: z.string().min(1, "Host è richiesto"),
  port: z.coerce.number().min(1).max(65535),
  login: z.string().min(1, "Login è richiesto"),
  server: z.string().min(1, "Server è richiesto"),
  password: z.string().optional(),
});

export default function Settings() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prefsData, isLoading: isLoadingPrefs, error: prefsError } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => backend.user.getPreferences(),
    retry: 1,
  });

  const { data: mt5Data, isLoading: isLoadingMt5, error: mt5Error } = useQuery({
    queryKey: ["mt5Config"],
    queryFn: () => backend.user.getMt5Config(),
    retry: 1,
  });

  const prefsForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    values: {
      riskPercentage: prefsData?.preferences?.riskPercentage || 2,
      accountBalance: prefsData?.preferences?.accountBalance || 9518.40,
    },
  });

  const mt5Form = useForm<z.infer<typeof mt5ConfigSchema>>({
    resolver: zodResolver(mt5ConfigSchema),
    values: {
      host: mt5Data?.config?.host || "154.61.187.189",
      port: mt5Data?.config?.port || 8080,
      login: mt5Data?.config?.login || "6001637",
      server: mt5Data?.config?.server || "PureMGlobal-MT5",
      password: "",
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (values: z.infer<typeof preferencesSchema>) => backend.user.updatePreferences(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast({ 
        title: "✅ Successo", 
        description: "Preferenze di trading aggiornate con successo." 
      });
    },
    onError: (err: any) => {
      console.error("Update preferences error:", err);
      toast({ 
        variant: "destructive", 
        title: "❌ Errore", 
        description: err.message || "Errore nell'aggiornamento delle preferenze" 
      });
    },
  });

  const updateMt5Mutation = useMutation({
    mutationFn: (values: z.infer<typeof mt5ConfigSchema>) => backend.user.updateMt5Config(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5Config"] });
      toast({ 
        title: "✅ Successo", 
        description: "Configurazione MT5 aggiornata con successo." 
      });
    },
    onError: (err: any) => {
      console.error("Update MT5 config error:", err);
      toast({ 
        variant: "destructive", 
        title: "❌ Errore", 
        description: err.message || "Errore nell'aggiornamento della configurazione MT5" 
      });
    },
  });

  const isConnected = mt5Data?.config?.host && mt5Data?.config?.port;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">⚙️ Impostazioni</h1>
        <p className="text-muted-foreground">Configura il tuo sistema di trading automatizzato</p>
      </div>

      <Tabs defaultValue="trading" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trading" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Trading
          </TabsTrigger>
          <TabsTrigger value="mt5" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            MT5
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Sicurezza
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Preferenze di Trading
              </CardTitle>
              <CardDescription>
                Configura il tuo profilo di rischio e le impostazioni del conto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPrefs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Caricamento preferenze...</span>
                </div>
              ) : prefsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Errore nel caricamento delle preferenze: {prefsError.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...prefsForm}>
                  <form onSubmit={prefsForm.handleSubmit((v) => updatePrefsMutation.mutate(v))} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={prefsForm.control}
                        name="riskPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rischio per Trade (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0.1" 
                                max="10" 
                                {...field} 
                                className="text-center"
                              />
                            </FormControl>
                            <FormDescription>
                              Percentuale del saldo da rischiare per ogni trade (consigliato: 1-3%)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={prefsForm.control}
                        name="accountBalance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Saldo Conto ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="100" 
                                {...field} 
                                className="text-center"
                              />
                            </FormControl>
                            <FormDescription>
                              Saldo attuale del tuo conto di trading
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">💡 Suggerimenti per la Gestione del Rischio</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Inizia con un rischio del 1-2% per trade</li>
                        <li>• Non rischiare mai più del 5% del tuo capitale</li>
                        <li>• Aggiorna il saldo regolarmente per calcoli accurati</li>
                        <li>• Considera di aumentare il rischio solo dopo risultati consistenti</li>
                      </ul>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updatePrefsMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {updatePrefsMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvataggio...
                        </>
                      ) : (
                        "💾 Salva Preferenze"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mt5" className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Stato Connessione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <p className="font-semibold">
                    {isConnected ? "🟢 Sistema Connesso e Operativo" : "🔴 Sistema Non Connesso"}
                  </p>
                  {isConnected && (
                    <div className="text-sm text-muted-foreground space-y-1 mt-2">
                      <p><strong>VPS:</strong> {mt5Data?.config?.host}:{mt5Data?.config?.port}</p>
                      <p><strong>Account:</strong> {mt5Data?.config?.login}</p>
                      <p><strong>Server:</strong> {mt5Data?.config?.server}</p>
                      <p><strong>Saldo:</strong> ${prefsData?.preferences?.accountBalance.toFixed(2)}</p>
                    </div>
                  )}
                </div>
                {isConnected && (
                  <Badge variant="default" className="ml-auto bg-green-100 text-green-800">
                    Pronto per Trading
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* MT5 Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configurazione MetaTrader 5</CardTitle>
              <CardDescription>
                Configura la connessione al tuo VPS e account MT5
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMt5 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  <span>Caricamento configurazione MT5...</span>
                </div>
              ) : mt5Error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Errore nel caricamento della configurazione MT5: {mt5Error.message}
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...mt5Form}>
                  <form onSubmit={mt5Form.handleSubmit((v) => updateMt5Mutation.mutate(v))} className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField 
                        control={mt5Form.control} 
                        name="host" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Host/IP VPS</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="es. 192.168.1.100" />
                            </FormControl>
                            <FormDescription>
                              Indirizzo IP del tuo VPS Windows
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={mt5Form.control} 
                        name="port" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Porta</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} placeholder="8080" />
                            </FormControl>
                            <FormDescription>
                              Porta del server Python (default: 8080)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={mt5Form.control} 
                        name="login" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Login MT5</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="es. 123456" />
                            </FormControl>
                            <FormDescription>
                              Numero del tuo account MetaTrader 5
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={mt5Form.control} 
                        name="server" 
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server MT5</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="es. ICMarkets-Demo" />
                            </FormControl>
                            <FormDescription>
                              Nome del server del tuo broker
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                      <FormField 
                        control={mt5Form.control} 
                        name="password" 
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Password MT5 (opzionale)</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} placeholder="Lascia vuoto se non vuoi modificarla" />
                            </FormControl>
                            <FormDescription>
                              Password del tuo account MT5 (lascia vuoto per non modificarla)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} 
                      />
                    </div>

                    <Alert>
                      <HelpCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Hai bisogno di aiuto?</strong> Consulta la sezione "Guide" per istruzioni dettagliate 
                        su come configurare il VPS e MetaTrader 5.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      type="submit" 
                      disabled={updateMt5Mutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {updateMt5Mutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Salvataggio...
                        </>
                      ) : (
                        "🔗 Salva Configurazione MT5"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sicurezza e Privacy
              </CardTitle>
              <CardDescription>
                Informazioni sulla sicurezza del tuo sistema di trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800">Connessione Sicura</h4>
                    <p className="text-sm text-green-700">
                      Tutte le comunicazioni tra l'app e il tuo VPS sono crittografate
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800">Controllo Locale</h4>
                    <p className="text-sm text-green-700">
                      Il tuo MetaTrader 5 rimane sul tuo VPS, mantenendo il pieno controllo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800">Nessun Accesso Diretto</h4>
                    <p className="text-sm text-green-700">
                      Non abbiamo mai accesso diretto ai tuoi fondi o al tuo account broker
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Raccomandazioni di Sicurezza</h4>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Usa sempre un VPS dedicato per il trading</li>
                      <li>• Mantieni aggiornato il tuo MetaTrader 5</li>
                      <li>• Usa password forti per tutti i tuoi account</li>
                      <li>• Monitora regolarmente le attività di trading</li>
                      <li>• Inizia sempre con un account demo per testare</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
