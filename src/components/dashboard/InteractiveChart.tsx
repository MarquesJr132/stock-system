import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { useEnhancedData } from '@/hooks/useEnhancedData';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

const periods = [
  { key: '7D', label: '7 Dias' },
  { key: '30D', label: '30 Dias' },
  { key: '90D', label: '90 Dias' },
  { key: '1Y', label: '1 Ano' }
] as const;

export const InteractiveChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');
  const [salesData, setSalesData] = useState<Array<{date: string, amount: number}>>([]);
  const [loading, setLoading] = useState(false);
  const { getSalesDataWithPeriod } = useEnhancedData();
  const isMobile = useIsMobile();

  const handlePeriodChange = async (period: '7D' | '30D' | '90D' | '1Y') => {
    setSelectedPeriod(period);
    setLoading(true);
    
    try {
      const data = await getSalesDataWithPeriod(period);
      setSalesData(data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useState(() => {
    handlePeriodChange('30D');
  });

  return (
    <Card className="border-0 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Evolução de Vendas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Performance interativa por período
              </p>
            </div>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {periods.map((period) => (
              <Button
                key={period.key}
                variant={selectedPeriod === period.key ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange(period.key)}
                className={`text-xs ${isMobile ? 'px-2' : 'px-3'}`}
                disabled={loading}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
            <LineChart data={salesData}>
              <defs>
                <linearGradient id="salesGradientInteractive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 12}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 30}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={isMobile ? 10 : 12}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickFormatter={(value) => {
                  if (value === 0) return '0';
                  return formatCurrency(Number(value));
                }}
                domain={['dataMin', 'dataMax']}
                width={isMobile ? 60 : 80}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-card)',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                formatter={(value: any) => [formatCurrency(value), 'Vendas']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(262 83% 58%)" 
                strokeWidth={isMobile ? 2 : 3}
                fill="url(#salesGradientInteractive)"
                dot={{ fill: 'hsl(262 83% 58%)', strokeWidth: 2, r: isMobile ? 3 : 5 }}
                activeDot={{ r: isMobile ? 5 : 7, stroke: 'hsl(262 83% 58%)', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {/* Summary */}
        {salesData.length > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total vendas:</span>
                <div className="font-semibold">
                  {formatCurrency(salesData.reduce((sum, item) => sum + item.amount, 0))}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Média diária:</span>
                <div className="font-semibold">
                  {formatCurrency(salesData.reduce((sum, item) => sum + item.amount, 0) / salesData.length || 0)}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-muted-foreground">Período:</span>
                <div className="font-semibold">
                  {periods.find(p => p.key === selectedPeriod)?.label}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};