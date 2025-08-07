import React, { useState, useEffect } from "react";
import { BarChart3, Users, Building, Database, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TenantStats {
  tenant_id: string;
  tenant_name: string;
  admin_name: string;
  admin_email: string;
  user_count: number;
  product_count: number;
  sale_count: number;
  customer_count: number;
  monthly_data_limit: number;
  current_month_usage: number;
  monthly_user_limit: number;
  current_month_users: number;
  usage_percentage: number;
  user_percentage: number;
}

interface SystemMetrics {
  total_tenants: number;
  total_users: number;
  total_sales: number;
  total_products: number;
  active_tenants: number;
}

export const SuperuserDashboard: React.FC = () => {
  const [tenantStats, setTenantStats] = useState<TenantStats[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    total_tenants: 0,
    total_users: 0,
    total_sales: 0,
    total_products: 0,
    active_tenants: 0,
  });
  const [loading, setLoading] = useState(true);
  const { isSuperuser } = useAuth();
  const { toast } = useToast();

  const fetchSystemMetrics = async () => {
    try {
      // Get total tenants (administrators)
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'administrator');

      if (adminsError) throw adminsError;

      // Get total users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');

      if (usersError) throw usersError;

      // Get total sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id');

      if (salesError) throw salesError;

      // Get total products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id');

      if (productsError) throw productsError;

      setSystemMetrics({
        total_tenants: admins?.length || 0,
        total_users: users?.length || 0,
        total_sales: sales?.length || 0,
        total_products: products?.length || 0,
        active_tenants: admins?.length || 0, // For now, all tenants are considered active
      });
    } catch (error) {
      console.error('Erro ao buscar métricas do sistema:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as métricas do sistema",
        variant: "destructive",
      });
    }
  };

  const fetchTenantStats = async () => {
    try {
      // Get all administrators and their stats
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select(`
          id,
          tenant_id,
          full_name,
          email
        `)
        .eq('role', 'administrator');

      if (adminError) throw adminError;

      const tenantStatsPromises = adminData?.map(async (admin) => {
        const tenantId = admin.tenant_id || admin.id;

        // Get tenant limits
        const { data: limits } = await supabase
          .from('tenant_limits')
          .select('*')
          .eq('tenant_id', tenantId)
          .single();

        // Count users in tenant
        const { data: tenantUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('tenant_id', tenantId);

        // Count products in tenant
        const { data: tenantProducts } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId);

        // Count sales in tenant
        const { data: tenantSales } = await supabase
          .from('sales')
          .select('id')
          .eq('tenant_id', tenantId);

        // Count customers in tenant
        const { data: tenantCustomers } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId);

        const currentUsage = limits?.current_month_usage || 0;
        const dataLimit = limits?.monthly_data_limit || 1000;
        const currentUsers = limits?.current_month_users || 0;
        const userLimit = limits?.monthly_user_limit || 10;

        return {
          tenant_id: tenantId,
          tenant_name: `Tenant ${admin.full_name}`,
          admin_name: admin.full_name,
          admin_email: admin.email,
          user_count: tenantUsers?.length || 0,
          product_count: tenantProducts?.length || 0,
          sale_count: tenantSales?.length || 0,
          customer_count: tenantCustomers?.length || 0,
          monthly_data_limit: dataLimit,
          current_month_usage: currentUsage,
          monthly_user_limit: userLimit,
          current_month_users: currentUsers,
          usage_percentage: Math.round((currentUsage / dataLimit) * 100),
          user_percentage: Math.round((currentUsers / userLimit) * 100),
        };
      }) || [];

      const stats = await Promise.all(tenantStatsPromises);
      setTenantStats(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos tenants:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas dos tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperuser) {
      fetchSystemMetrics();
      fetchTenantStats();
    }
  }, [isSuperuser]);

  if (!isSuperuser) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para acessar o dashboard de superusuário.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = tenantStats.map(tenant => ({
    name: tenant.admin_name,
    users: tenant.user_count,
    products: tenant.product_count,
    sales: tenant.sale_count,
  }));

  return (
    <div className="space-y-6">
      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tenants</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.total_tenants}</div>
            <p className="text-xs text-muted-foreground">
              {systemMetrics.active_tenants} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.total_users}</div>
            <p className="text-xs text-muted-foreground">
              Todos os tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.total_sales}</div>
            <p className="text-xs text-muted-foreground">
              Sistema completo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.total_products}</div>
            <p className="text-xs text-muted-foreground">
              Todos os tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {tenantStats.filter(t => t.usage_percentage > 80 || t.user_percentage > 80).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tenants próximos do limite
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Atividade por Tenant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#8884d8" name="Usuários" />
                <Bar dataKey="products" fill="#82ca9d" name="Produtos" />
                <Bar dataKey="sales" fill="#ffc658" name="Vendas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de Recursos por Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantStats.slice(0, 5).map((tenant) => (
                <div key={tenant.tenant_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{tenant.admin_name}</span>
                    <Badge 
                      variant={tenant.usage_percentage > 80 ? "destructive" : "secondary"}
                    >
                      {tenant.usage_percentage}%
                    </Badge>
                  </div>
                  <Progress value={tenant.usage_percentage} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {tenant.current_month_usage}/{tenant.monthly_data_limit} dados • 
                    {tenant.current_month_users}/{tenant.monthly_user_limit} usuários
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando estatísticas...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Uso de Dados</TableHead>
                  <TableHead>Uso de Usuários</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantStats.map((tenant) => (
                  <TableRow key={tenant.tenant_id}>
                    <TableCell className="font-medium">{tenant.admin_name}</TableCell>
                    <TableCell>{tenant.admin_email}</TableCell>
                    <TableCell>{tenant.user_count}</TableCell>
                    <TableCell>{tenant.product_count}</TableCell>
                    <TableCell>{tenant.sale_count}</TableCell>
                    <TableCell>{tenant.customer_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={tenant.usage_percentage} className="h-2 w-16" />
                        <span className="text-xs">
                          {tenant.current_month_usage}/{tenant.monthly_data_limit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={tenant.user_percentage} className="h-2 w-16" />
                        <span className="text-xs">
                          {tenant.current_month_users}/{tenant.monthly_user_limit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          tenant.usage_percentage > 90 || tenant.user_percentage > 90
                            ? "destructive" 
                            : tenant.usage_percentage > 70 || tenant.user_percentage > 70
                            ? "destructive"
                            : "default"
                        }
                      >
                        {tenant.usage_percentage > 90 || tenant.user_percentage > 90
                          ? "Crítico"
                          : tenant.usage_percentage > 70 || tenant.user_percentage > 70
                          ? "Atenção"
                          : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && tenantStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum tenant encontrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};