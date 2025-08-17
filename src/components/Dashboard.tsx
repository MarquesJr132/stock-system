
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

const Dashboard = () => {
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
    getSalesData
  } = useSupabaseData();
  const { isAdministrator } = useAuth();

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

  const stats = [
    {
      title: "Valor Total do Stock",
      value: formatCurrency(totalValue),
      icon: Banknote,
      change: "+5.2%",
      changeType: "positive"
    },
    {
      title: "Produtos em Stock",
      value: totalStock.toString(),
      icon: Package,
      change: "-2.1%",
      changeType: "negative"
    },
    {
      title: "Clientes Registados",
      value: customers.length.toString(),
      icon: Users,
      change: "+12.5%",
      changeType: "positive"
    },
    ...(isAdministrator ? [{
      title: "Lucro Hoje",
      value: formatCurrency(dailyProfit),
      icon: Target,
      change: "+8.1%",
      changeType: "positive"
    }] : [])
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-8">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 text-card-foreground shadow-card">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">
            Bem-vindo ao Soluweb
          </h2>
          <p className="text-lg opacity-90 mb-4">
            Dashboard executivo • Gestão avançada de inventário
          </p>
          <div className="flex items-center gap-4 text-sm opacity-80">
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

      {/* Premium Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
        {stats.map((stat, index) => (
          <Card key={index} className="group relative overflow-hidden border-0 shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-foreground mb-2">
                {stat.value}
              </div>
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  stat.changeType === "positive" 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-red-500/10 text-red-500"
                }`}>
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{stat.change}</span>
                </div>
                <span className="text-xs text-muted-foreground">vs último mês</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Premium Sales Chart */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-primary">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Evolução de Vendas</CardTitle>
                <CardDescription className="text-sm">
                  Performance dos últimos 7 dias
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-card)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(262 83% 58%)" 
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                  dot={{ fill: 'hsl(262 83% 58%)', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: 'hsl(262 83% 58%)', strokeWidth: 2, fill: 'white' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Premium Top Products */}
        <Card className="border-0 shadow-elegant">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg gradient-secondary">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Top Produtos</CardTitle>
                <CardDescription className="text-sm">
                  Produtos mais vendidos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <defs>
                  <linearGradient id="productGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(12 76% 61%)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-card)'
                  }}
                />
                <Bar 
                  dataKey="totalSold" 
                  fill="url(#productGradient)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  <linearGradient id="categoryGradient1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                    <stop offset="100%" stopColor="hsl(220 70% 50%)" />
                  </linearGradient>
                  <linearGradient id="categoryGradient2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(12 76% 61%)" />
                    <stop offset="100%" stopColor="hsl(38 92% 50%)" />
                  </linearGradient>
                  <linearGradient id="categoryGradient3" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" />
                    <stop offset="100%" stopColor="hsl(172 76% 45%)" />
                  </linearGradient>
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
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={90}
                  fill="url(#categoryGradient1)"
                  dataKey="value"
                >
                  {products.map((_, index) => {
                    const gradients = ['url(#categoryGradient1)', 'url(#categoryGradient2)', 'url(#categoryGradient3)'];
                    return (
                      <Cell key={`cell-${index}`} fill={gradients[index % gradients.length]} />
                    );
                  })}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: 'var(--shadow-card)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
