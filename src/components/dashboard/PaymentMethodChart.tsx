import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CreditCard, Wallet } from 'lucide-react';
import { useEnhancedData } from '@/hooks/useEnhancedData';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export const PaymentMethodChart = () => {
  const { paymentAnalytics } = useEnhancedData();
  const isMobile = useIsMobile();

  const chartData = paymentAnalytics.map((item, index) => ({
    name: item.payment_method,
    value: item.total_amount,
    transactions: item.transaction_count,
    average: item.average_amount,
    color: COLORS[index % COLORS.length]
  }));

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Transações: {data.transactions}
          </p>
          <p className="text-sm text-muted-foreground">
            Média: {formatCurrency(data.average)}
          </p>
          <p className="text-sm text-muted-foreground">
            {((data.value / totalAmount) * 100).toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Métodos de Pagamento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribuição por método - mês atual
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 sm:py-16">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1 text-sm sm:text-base">
              Nenhuma venda este mês
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Os métodos de pagamento aparecerão aqui quando houver vendas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 70 : 100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {!isMobile && <Legend />}
              </PieChart>
            </ResponsiveContainer>

            {/* Summary List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Resumo detalhado</h4>
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.transactions} transações
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {formatCurrency(item.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((item.value / totalAmount) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};