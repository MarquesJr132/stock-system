import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { 
  TrendingUp, 
  Download, 
  Calendar, 
  Banknote, 
  Package, 
  Users,
  BarChart3,
  PieChart,
  UserPlus,
  Clock
} from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { formatCurrency, formatNumber, formatDate, MOZAMBIQUE_LOCALE } from "@/lib/currency";

const Reports = () => {
  const { products, customers, sales, getTotalValue, getDailyProfit } = useSupabaseData();
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "audit"

  // Calculate various metrics
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalProfit = sales.reduce((sum, sale) => sum + sale.totalProfit, 0);
  const stockValue = getTotalValue();

  // Sales by day (last 30 days)
  const salesByDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dayStr = new Intl.DateTimeFormat(MOZAMBIQUE_LOCALE, { day: '2-digit', month: '2-digit' }).format(date);
    
    const daySales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.toDateString() === date.toDateString();
    });
    
    return {
      date: dayStr,
      revenue: daySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      profit: daySales.reduce((sum, sale) => sum + sale.totalProfit, 0),
      sales: daySales.length
    };
  });

  // Top products by revenue
  const topProductsByRevenue = products.map(product => {
    // Find all sale items for this product across all sales
    const productSaleItems = sales.flatMap(sale => 
      sale.items.filter(item => item.productId === product.id)
    );
    
    const revenue = productSaleItems.reduce((sum, item) => sum + item.total, 0);
    const quantity = productSaleItems.reduce((sum, item) => sum + item.quantity, 0);
    const profit = productSaleItems.reduce((sum, item) => {
      // Calculate profit per item: (unit price - purchase price) * quantity
      return sum + ((item.unitPrice - product.purchasePrice) * item.quantity);
    }, 0);
    
    return {
      name: product.name,
      revenue,
      quantity,
      profit
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Sales by category
  const salesByCategory = products.reduce((acc, product) => {
    // Find all sale items for this product across all sales
    const productSaleItems = sales.flatMap(sale => 
      sale.items.filter(item => item.productId === product.id)
    );
    const revenue = productSaleItems.reduce((sum, item) => sum + item.total, 0);
    
    const existing = acc.find(item => item.name === product.category);
    if (existing) {
      existing.value += revenue;
    } else {
      acc.push({ name: product.category, value: revenue });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Payment method distribution
  const paymentMethods = sales.reduce((acc, sale) => {
    const method = sale.paymentMethod;
    const existing = acc.find(item => item.name === method);
    if (existing) {
      existing.value += sale.totalAmount;
      existing.count += 1;
    } else {
      acc.push({ 
        name: method === 'cash' ? 'Dinheiro' : method === 'card' ? 'Cartão' : 'Crédito',
        value: sale.totalAmount,
        count: 1
      });
    }
    return acc;
  }, [] as { name: string; value: number; count: number }[]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const exportData = () => {
    const reportData = {
      resumo: {
        totalProdutos: totalProducts,
        totalClientes: totalCustomers,
        totalVendas: totalSales,
        receitaTotal: totalRevenue,
        lucroTotal: totalProfit,
        valorStock: stockValue
      },
      vendas: sales,
      produtos: products,
      clientes: customers
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `relatorio_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Relatórios & Analytics
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Análise detalhada do desempenho do negócio
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto">{/* Scroll on mobile */}
            <Button
              variant={activeTab === "overview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("overview")}
              className="flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </Button>
            <Button
              variant={activeTab === "audit" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("audit")}
              className="flex items-center gap-2 whitespace-nowrap text-xs sm:text-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Criação de Produtos</span>
              <span className="sm:hidden">Produtos</span>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">{/* Stack on mobile */}
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
            
            <Button onClick={exportData} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">{/* Conteúdo da visão geral */}

      {/* Key Metrics - Mobile responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{/* Mobile responsive grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Lucro: {formatCurrency(totalProfit)} ({totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Ticket médio: {totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : formatCurrency(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor do Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stockValue)}</div>
            <p className="text-xs text-muted-foreground">
              {totalProducts} produtos em stock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{/* Mobile responsive */}
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução das Vendas</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">{/* Smaller padding on mobile */}
            <ResponsiveContainer width="100%" height={250}>{/* Smaller height */}
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'revenue' ? 'Receita' : 'Lucro'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  name="revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#00C49F" 
                  strokeWidth={2}
                  name="profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Produtos por Receita</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">{/* Smaller padding on mobile */}
            <ResponsiveContainer width="100%" height={250}>{/* Smaller height */}
              <BarChart data={topProductsByRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
                <Bar dataKey="revenue" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Receita']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethods.map((method, index) => (
                <div key={method.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {method.count} transações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(method.value)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {((method.value / totalRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProductsByRevenue.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {product.quantity} unidades vendidas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Lucro: {formatCurrency(product.profit)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sales.slice(-5).reverse().map((sale) => {
                // Get the first product from the sale items for display
                const firstItem = sale.items[0];
                const product = firstItem ? products.find(p => p.id === firstItem.productId) : null;
                const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
                const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                
                return (
                  <div key={sale.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">
                        {product?.name} 
                        {sale.items.length > 1 && ` +${sale.items.length - 1} mais`}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {customer ? customer.name : 'Cliente anónimo'} • {totalItems} itens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(sale.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      ) : (
        /* Relatório de Auditoria - Criação de Produtos */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Histórico de Criação de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="h-5 w-5 text-slate-400" />
                          <h3 className="font-medium text-slate-800 dark:text-slate-100">
                            {product.name}
                          </h3>
                          <Badge variant="secondary">{product.category}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-blue-500" />
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Criado por:</p>
                              <p className="font-medium">{product.createdByName || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Data de criação:</p>
                              <p className="font-medium">{formatDate(product.createdAt)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-orange-500" />
                            <div>
                              <p className="text-slate-600 dark:text-slate-400">Stock atual:</p>
                              <p className="font-medium">{product.quantity} unidades</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Preço compra:</span>
                            <span className="font-medium ml-1">{formatCurrency(product.purchasePrice)}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Preço venda:</span>
                            <span className="font-medium ml-1">{formatCurrency(product.salePrice)}</span>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Margem:</span>
                            <span className="font-medium text-green-600 dark:text-green-400 ml-1">
                              {formatCurrency(product.salePrice - product.purchasePrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                {products.length === 0 && (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                      Nenhum produto encontrado
                    </h3>
                    <p className="text-slate-500">
                      Adicione produtos para ver o histórico de criação
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resumo por criador */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Criador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(
                  products.reduce((acc, product) => {
                    const creator = product.createdByName || 'N/A';
                    if (!acc[creator]) {
                      acc[creator] = {
                        count: 0,
                        totalValue: 0,
                        categories: new Set()
                      };
                    }
                    acc[creator].count++;
                    acc[creator].totalValue += product.salePrice * product.quantity;
                    acc[creator].categories.add(product.category);
                    return acc;
                  }, {} as Record<string, { count: number; totalValue: number; categories: Set<string> }>)
                ).map(([creator, stats]) => (
                  <Card key={creator} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus className="h-5 w-5 text-blue-500" />
                        <h3 className="font-medium">{creator}</h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Produtos criados:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Valor total:</span>
                          <span className="font-medium">{formatCurrency(stats.totalValue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600 dark:text-slate-400">Categorias:</span>
                          <span className="font-medium">{stats.categories.size}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;
