
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
import { useStockData } from "@/hooks/useStockData";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency, formatNumber } from "@/lib/currency";

const Dashboard = () => {
  const { 
    products, 
    sales, 
    customers, 
    getTotalStock, 
    getTotalValue, 
    getDailyProfit, 
    getLowStockProducts,
    getTopSellingProducts,
    getSalesData
  } = useStockData();
  const { isAdministrator } = useAuth();

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
    <div className="space-y-6">
      {/* Stats Cards - Mobile responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">{/* Smaller gaps on mobile */}
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stat.value}
              </div>
              <div className="flex items-center space-x-1 mt-1">
                {stat.changeType === "positive" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${
                  stat.changeType === "positive" ? "text-green-500" : "text-red-500"
                }`}>
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{/* Mobile responsive charts */}
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
            <CardDescription>
              Evolução das vendas diárias
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">{/* Smaller padding on mobile */}
            <ResponsiveContainer width="100%" height={250}>{/* Smaller height on mobile */}
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  dot={{ fill: '#0088FE' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Top 5 produtos por quantidade vendida
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">{/* Smaller padding on mobile */}
            <ResponsiveContainer width="100%" height={250}>{/* Smaller height on mobile */}
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">{/* Mobile responsive */}
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas de Stock Baixo
            </CardTitle>
            <CardDescription>
              Produtos que precisam de reposição
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  Todos os produtos estão com stock adequado 🎉
                </p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">{/* Smaller padding on mobile */}
                    <div className="min-w-0 flex-1">{/* Prevent overflow */}
                      <p className="font-medium text-slate-800 dark:text-slate-100 truncate text-sm sm:text-base">
                        {product.name}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                        {product.category}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="destructive" className="text-xs">
                        {product.quantity} unidades
                      </Badge>
                      <Progress 
                        value={(product.quantity / 100) * 100} 
                        className="w-16 sm:w-20 mt-1"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
            <CardDescription>
              Valor do stock por categoria de produto
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">{/* Smaller padding on mobile */}
            <ResponsiveContainer width="100%" height={250}>{/* Smaller height on mobile */}
              <PieChart>
                <Pie
                  data={products.reduce((acc, product) => {
                    const category = acc.find(item => item.name === product.category);
                    const value = isAdministrator ? 
                      product.quantity * product.purchasePrice :
                      product.quantity * product.salePrice;
                    
                    if (category) {
                      category.value += value;
                    } else {
                      acc.push({ name: product.category, value });
                    }
                    return acc;
                  }, [] as any[])}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {products.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Valor']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
