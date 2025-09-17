import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Banknote, 
  AlertTriangle,
  Target
} from "lucide-react";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from "@/contexts/AuthContext";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { SecurityNotifications } from './SecurityNotifications';
import { MobileDashboardCard } from "./mobile/MobileDashboardCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { FeatureGuard } from "@/components/FeatureGuard";
import { InteractiveChart } from "./dashboard/InteractiveChart";
import { PaymentMethodChart } from "./dashboard/PaymentMethodChart";
import { ABCAnalysis } from "./dashboard/ABCAnalysis";
import { IntelligentAlerts } from "./dashboard/IntelligentAlerts";
import { BusinessGoals } from "./dashboard/BusinessGoals";

interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

const Dashboard = ({ onTabChange }: DashboardProps = {}) => {
  const { 
    products, 
    sales, 
    customers, 
    loading,
    getTotalStock, 
    getTotalValue, 
    getDailyProfit, 
    getLowStockProducts,
    getTopSellingProducts,
    getSalesData,
    calculateCurrentMonthStatistics,
    getPercentageChanges,
  } = useSupabaseData();
  const { isAdministrator, isGerente } = useAuth();
  const isMobile = useIsMobile();
  const { hasFeature } = useTenantFeatures();

  const [percentages, setPercentages] = useState({
    stockChange: 'N/A',
    valueChange: 'N/A', 
    customerChange: 'N/A',
    profitChange: 'N/A'
  });

  // Calculate percentages on component mount
  useEffect(() => {
    const calculatePercentages = async () => {
      if (!loading && calculateCurrentMonthStatistics && getPercentageChanges) {
        try {
          await calculateCurrentMonthStatistics();
          const changes = await getPercentageChanges();
          if (changes && typeof changes === 'object') {
            setPercentages({
              stockChange: changes.stockChange || 'N/A',
              valueChange: changes.valueChange || 'N/A',
              customerChange: changes.customerChange || 'N/A',
              profitChange: changes.profitChange || 'N/A'
            });
          }
        } catch (error) {
          console.error('Error calculating percentages:', error);
        }
      }
    };

    calculatePercentages();
  }, [loading, calculateCurrentMonthStatistics, getPercentageChanges]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Check if user should see dashboard
  if (!hasFeature('dashboard_basic') && !isAdministrator && !isGerente) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Dashboard Indisponível</h2>
        <p className="text-muted-foreground">
          Você não tem acesso ao dashboard. Entre em contato com o administrador.
        </p>
      </div>
    );
  }

  const totalStock = getTotalStock();
  const totalValue = getTotalValue();
  const dailyProfit = getDailyProfit();
  const lowStockProducts = getLowStockProducts();
  const topProducts = getTopSellingProducts();
  const salesData = getSalesData();

  // Helper function to determine change type
  const getChangeType = (change: string): 'positive' | 'negative' | 'neutral' => {
    if (change === 'N/A') return 'neutral';
    const numericChange = parseFloat(change.replace('%', ''));
    return numericChange >= 0 ? 'positive' : 'negative';
  };

  const stats = [
    {
      title: "Valor Total do Stock",
      value: formatCurrency(totalValue),
      icon: Banknote,
      change: percentages.valueChange,
      changeType: getChangeType(percentages.valueChange)
    },
    {
      title: "Produtos em Stock",
      value: totalStock.toString(),
      icon: Package,
      change: percentages.stockChange,
      changeType: getChangeType(percentages.stockChange)
    },
    {
      title: "Clientes Registados",
      value: customers.length.toString(),
      icon: Users,
      change: percentages.customerChange,
      changeType: getChangeType(percentages.customerChange)
    },
    {
      title: "Lucro Hoje",
      value: formatCurrency(dailyProfit),
      icon: Target,
      change: percentages.profitChange,
      changeType: getChangeType(percentages.profitChange)
    }
  ];

  // Category data for pie chart
  const categoryData = products.reduce((acc: any[], product) => {
    const category = product.category || 'Sem categoria';
    const existingCategory = acc.find(item => item.name === category);
    
    if (existingCategory) {
      existingCategory.value += product.quantity;
    } else {
      acc.push({ name: category, value: product.quantity });
    }
    
    return acc;
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Dashboard Base (hero + 4 cards básicos) - sempre disponível se tem dashboard_basic ou é admin/gerente
  const renderBaseDashboard = () => (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-subtle border border-border/20 p-4 sm:p-6 lg:p-8 text-foreground shadow-elegant">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            Bem-vindo ao Soluweb
          </h2>
          <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4">
            Dashboard • Visão geral do seu negócio
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-80">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Sistema ativo
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {customers.length} clientes ativos
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {products.length} produtos cadastrados
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
      </div>

      {/* Basic Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
        {stats.map((stat, index) => 
          isMobile ? (
            <MobileDashboardCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
              changeType={stat.changeType}
            />
          ) : (
            <Card key={index} className="group relative overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-xl sm:text-2xl font-bold text-foreground mb-2 break-words">
                  {stat.value}
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    stat.changeType === "positive" 
                      ? "bg-green-500/10 text-green-500" 
                      : stat.changeType === "negative"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}>
                    {stat.changeType === "positive" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : stat.changeType === "negative" ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Target className="h-3 w-3" />
                    )}
                    <span>{stat.change}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">vs último mês</span>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );

  // Main dashboard return with granular features
  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Base Dashboard (sempre disponível com dashboard_basic) */}
      {renderBaseDashboard()}

      {/* Business Goals - Feature específica */}
      <FeatureGuard feature="dashboard_goals">
        <BusinessGoals />
      </FeatureGuard>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Analytics */}
        <FeatureGuard feature="dashboard_analytics">
          <InteractiveChart />
        </FeatureGuard>
        
        {/* Intelligent Alerts */}
        <FeatureGuard feature="dashboard_intelligent_alerts">
          <IntelligentAlerts onTabChange={onTabChange} />
        </FeatureGuard>
      </div>

      {/* Payment Analysis and ABC Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <FeatureGuard feature="dashboard_payment_methods">
          <PaymentMethodChart />
        </FeatureGuard>
        
        {/* ABC Analysis */}
        <FeatureGuard feature="dashboard_abc_analysis">
          <ABCAnalysis />
        </FeatureGuard>
      </div>

      {/* Low Stock and Stock Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <FeatureGuard feature="dashboard_stock_alerts">
          <Card className="border-0 shadow-elegant">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Alertas de Stock</CardTitle>
                  <CardDescription className="text-sm">
                    Produtos com baixo inventário
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Package className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-foreground font-medium mb-1">
                      Stock adequado
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Todos os produtos estão bem abastecidos
                    </p>
                  </div>
                ) : (
                  lowStockProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="group p-4 rounded-xl border bg-gradient-to-r from-orange-50/50 to-red-50/50 hover:from-orange-50 hover:to-red-50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {product.category || 'Sem categoria'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <Badge variant="destructive" className="text-xs font-semibold">
                            {product.quantity} restantes
                          </Badge>
                          <div className="mt-2">
                            <Progress 
                              value={(product.quantity / (product.min_stock || 1)) * 100} 
                              className="w-24 h-2"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Atual: {product.quantity}</span>
                              <span>Min: {product.min_stock}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </FeatureGuard>

        {/* Stock Distribution by Category */}
        <FeatureGuard feature="dashboard_distribution">
          <Card className="border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Distribuição por Categoria</CardTitle>
              <CardDescription>
                Stock por categoria de produtos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum dado de categoria disponível
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </FeatureGuard>
      </div>

      {/* Security Notifications for Administrators */}
      <FeatureGuard feature="dashboard_security_notifications">
        <SecurityNotifications />
      </FeatureGuard>
    </div>
  );
};

export default Dashboard;