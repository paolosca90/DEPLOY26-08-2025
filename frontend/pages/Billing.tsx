import { useQuery } from "@tanstack/react-query";
import { useBackend } from "../hooks/useBackend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const plans = {
  free: {
    name: "Piano Gratuito",
    price: "€0",
    features: ["Segnali di base", "1 configurazione MT5", "Supporto standard"],
  },
  pro: {
    name: "Piano Pro",
    price: "€49/mese",
    features: ["Segnali avanzati", "5 configurazioni MT5", "Analisi approfondita", "Supporto prioritario"],
  },
  enterprise: {
    name: "Piano Enterprise",
    price: "Contattaci",
    features: ["Tutto del Pro", "Strategie personalizzate", "Backtesting", "Supporto dedicato"],
  },
};

export default function Billing() {
  const backend = useBackend();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => backend.user.getSubscription(),
    retry: 1,
  });

  const currentPlan = data?.subscription?.plan || "free";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abbonamento e Fatturazione</h1>
        <p className="text-muted-foreground">Gestisci il tuo piano di abbonamento.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(plans).map(([key, plan]) => (
          <Card key={key} className={currentPlan === key ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.price}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" disabled={currentPlan === key}>
                {currentPlan === key ? "Piano Attuale" : "Seleziona Piano"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && <p>Caricamento informazioni abbonamento...</p>}
      
      {error && (
        <div className="text-red-500">Errore nel caricamento dell'abbonamento: {error.message}</div>
      )}
      
      {data?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Abbonamento Attuale</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Piano:</strong> {plans[currentPlan as keyof typeof plans].name}</p>
            <p><strong>Stato:</strong> <span className="capitalize">{data.subscription.status}</span></p>
            {data.subscription.expiresAt && (
              <p><strong>Scadenza:</strong> {new Date(data.subscription.expiresAt).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
