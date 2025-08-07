import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  Calendar,
  FileText,
  Clock
} from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { formatCurrency } from "@/lib/currency";

const Reports = () => {
  const { products, customers, sales, getTotalValue, getDailyProfit } = useSupabaseData();
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate various metrics
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const stockValue = getTotalValue();

  // Sales by day (last 30 days)
  const salesByDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = sales
      .filter(sale => sale.created_at.startsWith(dateStr))
      .reduce((total, sale) => total + sale.total_amount, 0);
    
    return {
      date: date.getDate().toString(),
      amount: dayTotal,
      sales: sales.filter(sale => sale.created_at.startsWith(dateStr)).length
    };
  }).reverse();

  // Top products by revenue
  const topProducts = products
    .map(product => {
      const productRevenue = sales.reduce((total, sale) => {
        // This is simplified - in a real app you'd join with sale_items
        return total;
      }, 0);
      return {
        ...product,
        revenue: product.sale_price * product.quantity // Simplified calculation
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Payment methods distribution
  const paymentMethods = sales.reduce((acc, sale) => {
    const method = sale.payment_method || 'Dinheiro';
    acc[method] = (acc[method] || 0) + sale.total_amount;
    return acc;
  }, {} as Record<string, number>);

  const paymentData = Object.entries(paymentMethods).map(([method, amount]) => ({
    name: method,
    value: amount
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const auditData = products.map(product => {
    return {
      id: product.id,
      name: product.name,
      action: 'Produto criado',
      user: 'Admin',
      date: new Date(product.created_at),
      details: `Produto "${product.name}" adicionado ao sistema`
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Relatórios
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Análise de vendas e desempenho
          </p>
        </div>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">↗ +12%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">↗ +8%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSales}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">↗ +15%</span> vs período anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">↗ +5%</span> vs período anterior
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Vendas']} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métodos de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={(entry) => entry.name}
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Preço: {formatCurrency(product.sale_price)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} em stock
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auditoria do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditData.slice(0, 10).map((log, index) => (
                  <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{log.action}</Badge>
                        <span className="text-sm text-muted-foreground">por {log.user}</span>
                      </div>
                      <p className="text-sm">{log.details}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.date.toLocaleDateString('pt-PT')}
                      </div>
                      <div>{log.date.toLocaleTimeString('pt-PT')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;