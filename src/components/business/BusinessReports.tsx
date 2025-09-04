import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Calendar, DollarSign, Users, Package } from 'lucide-react';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

export const BusinessReports = () => {
  const { seasonalData, getMarginAnalysis } = useBusinessData();
  const { products, sales, customers } = useSupabaseData();
  const isMobile = useIsMobile();

  // Calculate seasonal trends
  const getSeasonalTrends = () => {
    const monthlyData = new Map();
    
    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      monthlyData.set(month, {
        month: getMonthName(month),
        revenue: 0,
        quantity: 0,
        products: 0
      });
    }
    
    // Aggregate seasonal data
    seasonalData.forEach(item => {
      const existing = monthlyData.get(item.month);
      if (existing) {
        existing.revenue += item.revenue;
        existing.quantity += item.quantity_sold;
        existing.products += 1;
      }
    });
    
    return Array.from(monthlyData.values());
  };

  // Calculate margin analysis by category
  const getCategoryMargins = () => {
    const categoryMap = new Map();
    
    products.forEach(product => {
      const category = product.category || 'Sem categoria';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          totalProducts: 0,
          totalValue: 0,
          avgMargin: 0
        });
      }
      
      const cat = categoryMap.get(category);
      cat.totalProducts += 1;
      cat.totalValue += product.sale_price * product.quantity;
      
      // Calculate basic margin percentage
      const margin = product.sale_price > 0 ? 
        ((product.sale_price - product.purchase_price) / product.sale_price) * 100 : 0;
      cat.avgMargin = (cat.avgMargin + margin) / 2;
    });
    
    return Array.from(categoryMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 8); // Top 8 categories
  };

  // Calculate sales performance by month
  const getSalesPerformance = () => {
    const monthlyPerformance = new Map();
    
    // Initialize months
    for (let month = 1; month <= 12; month++) {
      monthlyPerformance.set(month, {
        month: getMonthName(month),
        sales: 0,
        transactions: 0,
        avgTicket: 0
      });
    }
    
    sales.forEach(sale => {
      const month = new Date(sale.created_at).getMonth() + 1;
      const performance = monthlyPerformance.get(month);
      
      if (performance) {
        performance.sales += Number(sale.total_amount);
        performance.transactions += 1;
        performance.avgTicket = performance.sales / performance.transactions;
      }
    });
    
    return Array.from(monthlyPerformance.values());
  };

  // Get customer acquisition trends
  const getCustomerTrends = () => {
    const monthlyCustomers = new Map();
    
    for (let month = 1; month <= 12; month++) {
      monthlyCustomers.set(month, {
        month: getMonthName(month),
        newCustomers: 0,
        totalCustomers: 0
      });
    }
    
    customers.forEach(customer => {
      const month = new Date(customer.created_at).getMonth() + 1;
      const trend = monthlyCustomers.get(month);
      
      if (trend) {
        trend.newCustomers += 1;
      }
    });
    
    // Calculate cumulative customers
    let cumulative = 0;
    monthlyCustomers.forEach(trend => {
      cumulative += trend.newCustomers;
      trend.totalCustomers = cumulative;
    });
    
    return Array.from(monthlyCustomers.values());
  };

  const getMonthName = (month: number) => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return months[month - 1];
  };

  const seasonalTrends = getSeasonalTrends();
  const categoryMargins = getCategoryMargins();
  const salesPerformance = getSalesPerformance();
  const customerTrends = getCustomerTrends();

  // Calculate key metrics
  const totalRevenue = seasonalTrends.reduce((sum, item) => sum + item.revenue, 0);
  const totalTransactions = salesPerformance.reduce((sum, item) => sum + item.transactions, 0);
  const avgTicketValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const newCustomersThisYear = customerTrends.reduce((sum, item) => sum + item.newCustomers, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Relatórios Empresariais</h3>
        <p className="text-sm text-muted-foreground">
          Análises detalhadas de performance e tendências
        </p>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Anual</p>
                <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-lg font-bold">{formatCurrency(avgTicketValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novos Clientes</p>
                <p className="text-lg font-bold">{newCustomersThisYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-lg font-bold">{totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Trends */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Tendências Sazonais</CardTitle>
                <p className="text-sm text-muted-foreground">Receita por mês</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <LineChart data={seasonalTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Receita']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Performance */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Performance de Vendas</CardTitle>
                <p className="text-sm text-muted-foreground">Transações por mês</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <BarChart data={salesPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'avgTicket') return [formatCurrency(value), 'Ticket Médio'];
                    return [value, name === 'transactions' ? 'Transações' : 'Vendas'];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="transactions" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Margins */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Análise de Margem por Categoria</CardTitle>
            <p className="text-sm text-muted-foreground">Valor e margens por categoria</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryMargins.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Dados insuficientes para análise de margem
                </p>
              ) : (
                categoryMargins.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{category.category}</h4>
                      <p className="text-sm text-muted-foreground">
                        {category.totalProducts} produtos
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">
                        {formatCurrency(category.totalValue)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {category.avgMargin.toFixed(1)}% margem
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Acquisition */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Aquisição de Clientes</CardTitle>
                <p className="text-sm text-muted-foreground">Crescimento da base de clientes</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <LineChart data={customerTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={isMobile ? 10 : 12}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [value, name === 'newCustomers' ? 'Novos Clientes' : 'Total Clientes']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="newCustomers" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="newCustomers"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCustomers" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="totalCustomers"
                  dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h4 className="font-semibold mb-2">Exportar Relatórios</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Exporte dados para análise externa ou envio para contabilidade
            </p>
            <div className="flex justify-center gap-4">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Exportar Excel
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Exportar PDF
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};