import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  DollarSign, 
  Download, 
  Mail, 
  Search, 
  Filter,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar
} from "lucide-react";

// Mock data - replace with real API calls
const mockUsers = [
  {
    id: 1,
    firstName: "Marco",
    lastName: "Rossi", 
    email: "marco.rossi@email.com",
    plan: "professional",
    status: "active",
    createdAt: "2025-01-15",
    lastLogin: "2025-01-20",
    mt5Broker: "XM Global",
    installerDownloaded: true,
    totalProfit: 2450.30
  },
  {
    id: 2,
    firstName: "Giulia",
    lastName: "Verdi",
    email: "giulia.verdi@email.com", 
    plan: "enterprise",
    status: "active",
    createdAt: "2025-01-10",
    lastLogin: "2025-01-19",
    mt5Broker: "IC Markets",
    installerDownloaded: false,
    totalProfit: 5780.90
  },
  {
    id: 3,
    firstName: "Roberto",
    lastName: "Bianchi",
    email: "roberto.bianchi@email.com",
    plan: "free-trial",
    status: "expired", 
    createdAt: "2025-01-05",
    lastLogin: "2025-01-18",
    mt5Broker: "FXCM",
    installerDownloaded: true,
    totalProfit: 890.45
  }
];

const mockStats = {
  totalUsers: 847,
  activeUsers: 723,
  totalRevenue: 68490.50,
  installersDownloaded: 612,
  averageProfit: 1847.30,
  conversionRate: 78.5
};

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // In real app, these would be actual API calls
  const { data: users = mockUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return mockUsers;
    }
  });

  const { data: stats = mockStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockStats;
    }
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlan === "all" || user.plan === selectedPlan;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "free-trial": return "bg-gray-500";
      case "professional": return "bg-blue-500"; 
      case "enterprise": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-500";
      case "inactive": return "text-yellow-500";
      case "expired": return "text-red-500";
      default: return "text-gray-500";
    }
  };

  const handleSendEmail = (userId: number, userEmail: string) => {
    // TODO: Implement send email functionality
    alert(`Invio email a ${userEmail}`);
  };

  const handleViewUser = (userId: number) => {
    // TODO: Open user detail modal
    alert(`Visualizza dettagli utente ${userId}`);
  };

  const handleToggleUserStatus = (userId: number, currentStatus: string) => {
    // TODO: Implement toggle user status
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    alert(`Cambio stato utente ${userId} da ${currentStatus} a ${newStatus}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🛡️ Admin Dashboard
          </h1>
          <p className="text-gray-300">
            Gestione utenti e monitoraggio sistema AI-ENCORE
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Utenti Totali</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Utenti Attivi</p>
                  <p className="text-2xl font-bold text-green-400">{stats.activeUsers.toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Ricavi Totali</p>
                  <p className="text-2xl font-bold text-green-400">€{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Installer Scaricati</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.installersDownloaded}</p>
                </div>
                <Download className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Profitto Medio</p>
                  <p className="text-2xl font-bold text-yellow-400">€{stats.averageProfit.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/20 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.conversionRate}%</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/5 border-white/20">
            <TabsTrigger value="users" className="text-white">
              <Users className="mr-2 h-4 w-4" />
              Gestione Utenti
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-white">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-white">
              <Calendar className="mr-2 h-4 w-4" />
              Impostazioni Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-white/5 border-white/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Gestione Utenti AI-ENCORE</CardTitle>
                <CardDescription className="text-gray-300">
                  Visualizza e gestisci tutti gli utenti registrati
                </CardDescription>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca per nome o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white/5 border-white/20 text-white pl-10"
                    />
                  </div>
                  
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white rounded-md px-3 py-2"
                  >
                    <option value="all">Tutti i Piani</option>
                    <option value="free-trial">Free Trial</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-white/5 border border-white/20 text-white rounded-md px-3 py-2"
                  >
                    <option value="all">Tutti gli Stati</option>
                    <option value="active">Attivo</option>
                    <option value="inactive">Inattivo</option>
                    <option value="expired">Scaduto</option>
                  </select>
                </div>
              </CardHeader>

              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-gray-300">Utente</TableHead>
                        <TableHead className="text-gray-300">Piano</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Broker MT5</TableHead>
                        <TableHead className="text-gray-300">Installer</TableHead>
                        <TableHead className="text-gray-300">Profitto</TableHead>
                        <TableHead className="text-gray-300">Registrato</TableHead>
                        <TableHead className="text-gray-300">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-white/10">
                          <TableCell>
                            <div>
                              <div className="text-white font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={`${getPlanColor(user.plan)} text-white`}>
                              {user.plan.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <span className={`font-medium ${getStatusColor(user.status)}`}>
                              {user.status}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-gray-300">
                            {user.mt5Broker}
                          </TableCell>
                          
                          <TableCell>
                            {user.installerDownloaded ? (
                              <Badge className="bg-green-500 text-white">
                                ✓ Scaricato
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white">
                                ✗ Non scaricato
                              </Badge>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-green-400 font-medium">
                              €{user.totalProfit.toLocaleString()}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-gray-300">
                            {user.createdAt}
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewUser(user.id)}
                                className="border-white/30 text-white hover:bg-white/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendEmail(user.id, user.email)}
                                className="border-white/30 text-white hover:bg-white/10"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleUserStatus(user.id, user.status)}
                                className={`border-white/30 hover:bg-white/10 ${
                                  user.status === "active" ? "text-red-400" : "text-green-400"
                                }`}
                              >
                                {user.status === "active" ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {filteredUsers.length === 0 && !usersLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Nessun utente trovato con i filtri selezionati</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="bg-white/5 border-white/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Analytics e Statistiche</CardTitle>
                <CardDescription className="text-gray-300">
                  Analisi dettagliate delle performance del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Funzionalità analytics in arrivo...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-white/5 border-white/20 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Impostazioni Sistema</CardTitle>
                <CardDescription className="text-gray-300">
                  Configurazioni globali del sistema AI-ENCORE
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Impostazioni sistema in arrivo...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}