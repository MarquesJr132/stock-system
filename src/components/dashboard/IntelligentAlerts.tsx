import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, TrendingUp, Calendar, Users, Package, Bell } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useEnhancedData } from '@/hooks/useEnhancedData';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

interface Alert {
  id: string;
  type: 'stock' | 'goal' | 'customer' | 'trend' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: string;
  data?: any;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'stock':
      return Package;
    case 'goal':
      return TrendingUp;
    case 'customer':
      return Users;
    case 'trend':
      return TrendingDown;
    case 'opportunity':
      return Calendar;
    default:
      return AlertTriangle;
  }
};

const getAlertColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500/10 text-red-600 border-red-200';
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
    case 'low':
      return 'bg-blue-500/10 text-blue-600 border-blue-200';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-200';
  }
};

export const IntelligentAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAll, setShowAll] = useState(false);
  const { products, sales, getLowStockProducts } = useSupabaseData();
  const { businessGoals, topCustomers } = useEnhancedData();
  const isMobile = useIsMobile();

  // Generate intelligent alerts
  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts: Alert[] = [];

      // 1. Low stock alerts
      const lowStockProducts = getLowStockProducts();
      if (lowStockProducts.length > 0) {
        newAlerts.push({
          id: 'low-stock',
          type: 'stock',
          priority: 'high',
          title: 'Stock baixo detectado',
          message: `${lowStockProducts.length} produtos precisam de reposição urgente`,
          action: 'Ver produtos',
          data: lowStockProducts
        });
      }

      // 2. Business goals alerts
      businessGoals.forEach(goal => {
        const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
        const endDate = new Date(goal.period_end);
        const today = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (progress < 50 && daysLeft < 7) {
          newAlerts.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            priority: 'high',
            title: 'Meta em risco',
            message: `Meta "${goal.description}" está ${progress.toFixed(1)}% completa com ${daysLeft} dias restantes`,
            action: 'Ver meta',
            data: goal
          });
        } else if (progress > 100) {
          newAlerts.push({
            id: `goal-exceeded-${goal.id}`,
            type: 'goal',
            priority: 'low',
            title: 'Meta superada! 🎉',
            message: `Meta "${goal.description}" atingiu ${progress.toFixed(1)}% do objetivo`,
            action: 'Ver detalhes',
            data: goal
          });
        }
      });

      // 3. Sales trend alerts
      const recentSales = sales.slice(-7); // Last 7 sales
      const olderSales = sales.slice(-14, -7); // Previous 7 sales
      
      if (recentSales.length > 0 && olderSales.length > 0) {
        const recentTotal = recentSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        const olderTotal = olderSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        const trendChange = ((recentTotal - olderTotal) / olderTotal) * 100;
        
        if (trendChange < -20) {
          newAlerts.push({
            id: 'sales-decline',
            type: 'trend',
            priority: 'medium',
            title: 'Queda nas vendas',
            message: `Vendas caíram ${Math.abs(trendChange).toFixed(1)}% na última semana`,
            action: 'Analisar tendência',
            data: { trendChange, recentTotal, olderTotal }
          });
        }
      }

      // 4. Customer opportunities
      if (topCustomers.length > 0) {
        const topCustomer = topCustomers[0];
        const lastSaleFromTop = sales
          .filter(sale => sale.customer_id === topCustomer.customer_id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
        if (lastSaleFromTop) {
          const daysSinceLastSale = Math.ceil(
            (new Date().getTime() - new Date(lastSaleFromTop.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysSinceLastSale > 30) {
            newAlerts.push({
              id: 'customer-retention',
              type: 'customer',
              priority: 'medium',
              title: 'Cliente VIP inativo',
              message: `${topCustomer.customer_name} não compra há ${daysSinceLastSale} dias`,
              action: 'Contactar cliente',
              data: topCustomer
            });
          }
        }
      }

      // 5. Seasonal opportunities
      const currentMonth = new Date().getMonth() + 1;
      const seasonalProducts = products.filter(product => {
        // Logic for seasonal products (this is a simplified example)
        return product.category && 
               (product.category.toLowerCase().includes('natal') || 
                product.category.toLowerCase().includes('verão'));
      });
      
      if (seasonalProducts.length > 0 && (currentMonth === 11 || currentMonth === 12)) {
        newAlerts.push({
          id: 'seasonal-opportunity',
          type: 'opportunity',
          priority: 'medium',
          title: 'Oportunidade sazonal',
          message: `${seasonalProducts.length} produtos sazonais para promover`,
          action: 'Ver produtos',
          data: seasonalProducts
        });
      }

      setAlerts(newAlerts.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }));
    };

    generateAlerts();
  }, [products, sales, businessGoals, topCustomers, getLowStockProducts]);

  const displayedAlerts = showAll ? alerts : alerts.slice(0, isMobile ? 3 : 4);

  return (
    <Card className="border-0 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Alertas Inteligentes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Insights automáticos do seu negócio
              </p>
            </div>
          </div>
          
          {alerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {alerts.length} alertas
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <p className="text-foreground font-medium mb-1 text-sm sm:text-base">
              Tudo sob controle! 
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Não há alertas no momento. Seu negócio está a funcionar bem.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              
              return (
                <div 
                  key={alert.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getAlertColor(alert.priority)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getAlertColor(alert.priority)}`}
                        >
                          {alert.priority === 'high' ? 'Alta' : 
                           alert.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {alert.message}
                      </p>
                      
                      {alert.action && (
                        <Button variant="outline" size="sm" className="text-xs">
                          {alert.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {alerts.length > (isMobile ? 3 : 4) && (
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Ver menos' : `Ver mais ${alerts.length - (isMobile ? 3 : 4)} alertas`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};