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
  ShoppingCart,
  Target
} from "lucide-react";
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatNumber } from "@/lib/currency";
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
    getPercentageChanges
  } = useSupabaseData();
  const { isAdministrator } = useAuth();
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
          // Calculate current month statistics first
          await calculateCurrentMonthStatistics();
          
          // Then get percentage changes
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-xl lg:rounded-2xl bg-gradient-subtle border border-border/20 p-4 sm:p-6 lg:p-8 text-foreground shadow-elegant">
        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
            Bem-vindo ao Soluweb
          </h2>
          <p className="text-sm sm:text-base lg:text-lg opacity-90 mb-4">
            Dashboard executivo • Gestão avançada de inventário
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

      {/* Premium Stats Cards - Mobile Optimized */}
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

      {/* Business Goals Section */}
      <BusinessGoals />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Interactive Sales Chart */}
        <InteractiveChart />

        {/* Intelligent Alerts */}
        <IntelligentAlerts onTabChange={onTabChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Payment Method Analytics */}
        <PaymentMethodChart />

        {/* ABC Analysis */}
        <ABCAnalysis />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Premium Low Stock Alert */}
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
                lowStockProducts.map((product) => (
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
                            <span>Mín: {product.min_stock || 0}</span>
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

        {/* Premium Stock Distribution */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-accent">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Distribuição</CardTitle>
                <CardDescription className="text-sm">
                  Valor por categoria de produto
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            {products.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  Nenhum produto cadastrado
                </p>
                <p className="text-muted-foreground text-sm">
                  A distribuição por categoria aparecerá quando houver produtos
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <defs>
                    <linearGradient id="categoryGradient1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(262 83% 68%)" />
                    </linearGradient>
                    <linearGradient id="categoryGradient2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" />
                      <stop offset="100%" stopColor="hsl(38 92% 60%)" />
                    </linearGradient>
                    <linearGradient id="categoryGradient3" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(142 76% 46%)" />
                      <stop offset="100%" stopColor="hsl(172 76% 55%)" />
                    </linearGradient>
                    <linearGradient id="categoryGradient4" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(315 100% 70%)" />
                      <stop offset="100%" stopColor="hsl(280 100% 75%)" />
                    </linearGradient>
                    <linearGradient id="categoryGradient5" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(45 100% 65%)" />
                      <stop offset="100%" stopColor="hsl(25 100% 70%)" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.1)" />
                    </filter>
                  </defs>
                  <Pie
                    data={products.reduce((acc, product) => {
                      const category = product.category || 'Sem categoria';
                      const value = isAdministrator ? 
                        product.quantity * product.purchase_price :
                        product.quantity * product.sale_price;
                      
                      const existing = acc.find(item => item.name === category);
                      if (existing) {
                        existing.value += value;
                      } else {
                        acc.push({ name: category, value });
                      }
                      return acc;
                    }, [] as any[])}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={({ name, percent, value, index, cx, cy, midAngle, innerRadius, outerRadius }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                      
                      if (percent < 0.05) return null; // Hide labels for slices < 5%
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="hsl(var(--foreground))" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          className="text-sm font-medium"
                        >
                          {`${name}`}
                        </text>
                      );
                    }}
                    outerRadius={100}
                    innerRadius={35}
                    paddingAngle={2}
                    fill="url(#categoryGradient1)"
                    dataKey="value"
                    filter="url(#shadow)"
                  >
                    {products.reduce((acc, product) => {
                      const category = product.category || 'Sem categoria';
                      const existing = acc.find(item => item.name === category);
                      if (!existing) {
                        acc.push({ name: category });
                      }
                      return acc;
                    }, [] as any[]).map((_, index) => {
                      const gradients = [
                        'url(#categoryGradient1)', 
                        'url(#categoryGradient2)', 
                        'url(#categoryGradient3)',
                        'url(#categoryGradient4)',
                        'url(#categoryGradient5)'
                      ];
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={gradients[index % gradients.length]}
                          stroke="rgba(255,255,255,0.8)"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '16px',
                      boxShadow: 'var(--shadow-elegant)',
                      padding: '12px 16px',
                      fontSize: '14px'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notificações de Segurança - apenas para administradores */}
      {isAdministrator && (
        <div className="mt-8">
          <SecurityNotifications />
        </div>
      )}
    </div>
  );
};

export default Dashboard;