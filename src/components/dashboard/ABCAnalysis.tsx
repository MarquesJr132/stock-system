import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Package, Star } from 'lucide-react';
import { useEnhancedData } from '@/hooks/useEnhancedData';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';

const getCategoryInfo = (category: 'A' | 'B' | 'C') => {
  switch (category) {
    case 'A':
      return {
        label: 'Alta Rotação',
        description: '80% da receita',
        color: 'bg-green-500/10 text-green-600 border-green-200',
        priority: 'Alta prioridade'
      };
    case 'B':
      return {
        label: 'Média Rotação', 
        description: '15% da receita',
        color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
        priority: 'Média prioridade'
      };
    case 'C':
      return {
        label: 'Baixa Rotação',
        description: '5% da receita', 
        color: 'bg-red-500/10 text-red-600 border-red-200',
        priority: 'Baixa prioridade'
      };
  }
};

export const ABCAnalysis = () => {
  const { abcProducts } = useEnhancedData();
  const isMobile = useIsMobile();

  // Group products by category
  const categoryGroups = {
    A: abcProducts.filter(p => p.abc_category === 'A'),
    B: abcProducts.filter(p => p.abc_category === 'B'),
    C: abcProducts.filter(p => p.abc_category === 'C')
  };

  const totalRevenue = abcProducts.reduce((sum, product) => sum + product.total_revenue, 0);

  return (
    <Card className="border-0 shadow-elegant">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Análise ABC</CardTitle>
            <p className="text-sm text-muted-foreground">
              Classificação de produtos por receita
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {abcProducts.length === 0 ? (
          <div className="text-center py-8 sm:py-16">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1 text-sm sm:text-base">
              Análise não disponível
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              A análise ABC aparecerá quando houver vendas registadas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Category Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['A', 'B', 'C'] as const).map((category) => {
                const info = getCategoryInfo(category);
                const products = categoryGroups[category];
                const categoryRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
                const percentage = totalRevenue > 0 ? (categoryRevenue / totalRevenue) * 100 : 0;
                
                return (
                  <div key={category} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={info.color}>
                        Categoria {category}
                      </Badge>
                      {category === 'A' && <Star className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{info.label}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{info.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Produtos: {products.length}</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="text-xs font-medium">
                        {formatCurrency(categoryRevenue)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top products from each category */}
            <div className="space-y-4">
              <h4 className="font-semibold">Top produtos por categoria</h4>
              
              {(['A', 'B', 'C'] as const).map((category) => {
                const products = categoryGroups[category].slice(0, isMobile ? 3 : 5);
                const info = getCategoryInfo(category);
                
                if (products.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={info.color} variant="outline">
                        Categoria {category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {info.priority}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {products.map((product, index) => (
                        <div 
                          key={product.product_id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {index + 1}. {product.product_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.revenue_percentage.toFixed(1)}% da receita total
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-sm">
                              {formatCurrency(product.total_revenue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.cumulative_percentage.toFixed(1)}% acumulado
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Insights */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-sm mb-2 text-blue-800">💡 Insights</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Produtos A: Foque em manter stock adequado - são seus principais geradores de receita</li>
                <li>• Produtos B: Monitore tendências - podem subir para categoria A</li>
                <li>• Produtos C: Considere estratégias de promoção ou descontinuação</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};