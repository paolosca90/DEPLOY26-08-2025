import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Mail, Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useBackend } from "../hooks/useBackend"; // <-- AGGIUNTO

const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const backend = useBackend(); // <-- AGGIUNTO

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // 👇 TUTTA QUESTA FUNZIONE 'onSubmit' È STATA SOSTITUITA
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Usa il client ufficiale Encore invece di fetch
      const result = await backend.auth.login({
        email: data.email,
        password: data.password,
      });

      if (result.success && result.token && result.user) {
        // Store auth token and user data
        localStorage.setItem("auth_token", result.token);
        localStorage.setItem("user_email", result.user.email);
        localStorage.setItem("user_id", result.user.id.toString());
        
        console.log("✅ Login successful:", result);
        
        // Trigger auth state change
        window.dispatchEvent(new Event('authchange'));
        
        // Redirect to dashboard directly
        navigate('/dashboard');
      } else {
        setError(result.error || "Credenziali non valide. Prova con demo@aiencoretrading.com / demo123");
      }

    } catch (error: any) {
      // L'errore ora sarà più specifico
      console.error("Login error:", error);
      if (error.code === 'unavailable') {
          setError("Impossibile connettersi al backend. Assicurati che sia in esecuzione su localhost:4000.");
      } else {
          setError(error.message || "Errore durante il login. Riprova più tardi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Accedi ad AI-ENCORE
          </h1>
          <p className="text-gray-300">
            Accedi al tuo account per continuare
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-white/5 border-white/20 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <LogIn className="h-6 w-6 text-blue-400" />
            </div>
            <CardTitle className="text-white">Accedi al tuo account</CardTitle>
            <CardDescription className="text-gray-300">
              Inserisci le tue credenziali per accedere
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            placeholder="la-tua-email@esempio.com"
                            className="bg-white/5 border-white/20 text-white pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder="La tua password"
                            className="bg-white/5 border-white/20 text-white pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-blue-400 hover:text-blue-300 text-sm p-0 h-auto"
                    onClick={() => {
                      // TODO: Implement password reset
                      alert("Funzione reset password in arrivo!");
                    }}
                  >
                    Password dimenticata?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Accesso in corso...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Accedi
                    </>
                  )}
                </Button>

              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Demo Account Info */}
        <Card className="mt-6 bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="text-center">
              <h4 className="text-blue-400 font-semibold mb-2">Account Demo</h4>
              <p className="text-gray-300 text-sm mb-2">
                Per testare il sistema, usa:
              </p>
              <div className="bg-black/20 rounded p-2 text-sm font-mono">
                <div className="text-blue-400">Email: demo@aiencoretrading.com</div>
                <div className="text-blue-400">Password: demo123</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-4">
          <div className="text-gray-400 text-sm">
            Non hai ancora un account?{" "}
            <Button
              variant="link"
              className="text-blue-400 hover:text-blue-300 p-0 h-auto"
              onClick={() => navigate("/register")}
            >
              Registrati ora
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => navigate("/landing")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla homepage
          </Button>
        </div>
      </div>
    </div>
  );
}
