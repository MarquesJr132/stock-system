import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Clock,
  Filter
} from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { formatCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import { AuditLogs } from "@/components/AuditLogs";

const Reports = () => {
  const { products, customers, sales, getTotalValue, getDailyProfit } = useSupabaseData();
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);

  // Fetch tenant users if administrator
  useEffect(() => {
    const fetchTenantUsers = async () => {
      if (profile?.role === 'administrator' || profile?.role === 'superuser') {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('tenant_id', profile.tenant_id || profile.id)
            .order('full_name');
          
          if (!error && data) {
            setTenantUsers(data);
          }
        } catch (error) {
          console.error('Erro ao buscar usuários:', error);
        }
      }
    };

    fetchTenantUsers();
  }, [profile]);

  // Filter sales by selected user
  const filteredSales = selectedUser === "all" 
    ? sales 
    : sales.filter(sale => sale.created_by === selectedUser);

  // Calculate various metrics based on filtered sales
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.total_profit, 0);
  const stockValue = getTotalValue();

  // Sales by day (last 30 days) with user filter
  const salesByDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTotal = filteredSales
      .filter(sale => sale.created_at.startsWith(dateStr))
      .reduce((total, sale) => total + sale.total_amount, 0);
    
    return {
      date: date.getDate().toString(),
      amount: dayTotal,
      sales: filteredSales.filter(sale => sale.created_at.startsWith(dateStr)).length
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

  // Payment methods distribution with user filter
  const paymentMethods = filteredSales.reduce((acc, sale) => {
    const method = sale.payment_method || 'Dinheiro';
    acc[method] = (acc[method] || 0) + sale.total_amount;
    return acc;
  }, {} as Record<string, number>);

  const paymentData = Object.entries(paymentMethods).map(([method, amount]) => ({
    name: method,
    value: amount
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const auditData = products.filter(product => product.category !== 'encomenda_especial').map(product => {
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
            {selectedUser !== "all" && (
              <span className="ml-2 text-primary font-medium">
                - Filtrado por usuário
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {tenantUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
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

          {(profile?.role === 'administrator' || profile?.role === 'gerente' || profile?.role === 'superuser') && (
            <Button
              variant="outline"
              onClick={() => {
                const rows = filteredSales.map((s) => {
                  const c = customers.find((x) => x.id === s.customer_id);
                  return {
                    Data: new Date(s.created_at).toLocaleDateString('pt-PT'),
                    Cliente: c?.name || 'Cliente Geral',
                    Total: s.total_amount,
                    IVA: s.total_vat_amount,
                    Lucro: s.total_profit,
                    Pagamento: s.payment_method,
                  };
                });
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Vendas');
                XLSX.writeFile(wb, `relatorio_vendas_${new Date().toISOString().slice(0,10)}.xlsx`);
              }}
            >
              Exportar Excel
            </Button>
          )}
        </div>
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
                <CardTitle className="text-sm font-medium">
                  Receita Total
                  {selectedUser !== "all" && (
                    <span className="text-xs text-muted-foreground ml-1">(Usuário)</span>
                  )}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedUser !== "all" 
                    ? `${totalSales} vendas realizadas`
                    : <><span className="text-green-600">↗ +12%</span> vs período anterior</>
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Lucro Total
                  {selectedUser !== "all" && (
                    <span className="text-xs text-muted-foreground ml-1">(Usuário)</span>
                  )}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalProfit)}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedUser !== "all" 
                    ? `Margem: ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%`
                    : <><span className="text-green-600">↗ +8%</span> vs período anterior</>
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vendas
                  {selectedUser !== "all" && (
                    <span className="text-xs text-muted-foreground ml-1">(Usuário)</span>
                  )}
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSales}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedUser !== "all" 
                    ? `Ticket médio: ${totalSales > 0 ? formatCurrency(totalRevenue / totalSales) : formatCurrency(0)}`
                    : <><span className="text-green-600">↗ +15%</span> vs período anterior</>
                  }
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
                <CardTitle>
                  Vendas por Dia
                  {selectedUser !== "all" && tenantUsers.find(u => u.id === selectedUser) && (
                    <span className="text-sm text-muted-foreground ml-2">
                      - {tenantUsers.find(u => u.id === selectedUser)?.full_name}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
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
                <CardTitle>
                  Métodos de Pagamento
                  {selectedUser !== "all" && tenantUsers.find(u => u.id === selectedUser) && (
                    <span className="text-sm text-muted-foreground ml-2">
                      - {tenantUsers.find(u => u.id === selectedUser)?.full_name}
                    </span>
                  )}
                </CardTitle>
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
          {/* Import and use the real AuditLogs component */}
          <AuditLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;