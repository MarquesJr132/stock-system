
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import SalesManagement from "@/components/SalesManagement";
import CustomerManagement from "@/components/CustomerManagement";
import Reports from "@/components/Reports";
import StockMovements from "@/components/StockMovements";
import UserManagement from "@/components/UserManagement";
import ProfileManagement from "@/components/ProfileManagement";
import SuperuserManagement from "@/components/SuperuserManagement";
import TenantLimitsManagement from "@/components/TenantLimitsManagement";
import Login from "@/components/Login";
import CompanySettings from "@/components/CompanySettings";
import { useAuth } from "@/contexts/AuthContext";
import { Package, TrendingUp, Users, BarChart3, History, ShoppingCart, Settings, LogOut, Menu, User as UserIcon, Building } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isAdministrator, isSuperuser, profile, signOut, loading } = useAuth();

  console.log('Index: Auth state', { isAuthenticated, isAdministrator, isSuperuser, profile: profile?.role, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Superusers get their own dedicated management interface
  if (isSuperuser) {
    return <SuperuserManagement />;
  }

  return (
    <div className="min-h-screen transition-smooth">
      {/* Mobile Header */}
      <div className="lg:hidden bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sistema de Stock
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {profile?.full_name}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="p-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block container mx-auto p-6">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                Sistema de Gestão de Stock - {profile?.role === 'administrator' ? 'Administrador' : 'Usuário'}
              </h1>
              <p className="text-muted-foreground">
                Controle completo do seu inventário, vendas e clientes
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Bem-vindo, {profile?.full_name}
              </span>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
              <div className="bg-card/95 backdrop-blur-md w-64 h-full shadow-elegant border-r border-border" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-border gradient-primary">
                  <h2 className="font-semibold text-primary-foreground">Menu</h2>
                </div>
                <nav className="p-4 space-y-2">
                  {[
                    { value: "dashboard", icon: BarChart3, label: "Dashboard" },
                    { value: "products", icon: Package, label: "Produtos" },
                    { value: "sales", icon: ShoppingCart, label: "Vendas" },
                    { value: "customers", icon: Users, label: "Clientes" },
                    { value: "movements", icon: History, label: "Movimentos" },
                    { value: "reports", icon: TrendingUp, label: "Relatórios" },
                    { value: "profile", icon: UserIcon, label: "Perfil" },
                    ...(isAdministrator && !isSuperuser ? [
                      { value: "company", icon: Building, label: "Empresa" },
                      { value: "users", icon: Settings, label: "Usuários" }
                    ] : [])
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setActiveTab(item.value);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-smooth ${
                        activeTab === item.value 
                          ? "gradient-primary text-primary-foreground shadow-elegant" 
                          : "hover:bg-accent/20 dark:hover:bg-accent/10 text-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Desktop Navigation */}
          <TabsList className={`hidden lg:grid w-full ${isAdministrator && !isSuperuser ? 'grid-cols-9' : 'grid-cols-7'} lg:w-auto`}>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Movimentos
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            {isAdministrator && !isSuperuser && (
              <>
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Empresa
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <SalesManagement />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="movements" className="space-y-6">
            <StockMovements />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Reports />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ProfileManagement />
          </TabsContent>

          {isAdministrator && !isSuperuser && (
            <>
              <TabsContent value="company" className="space-y-6">
                <CompanySettings />
              </TabsContent>
              
              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
