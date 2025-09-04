import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, TrendingUp } from 'lucide-react';
import { useEnhancedData } from '@/hooks/useEnhancedData';
import { KPICard } from './KPICard';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export const BusinessGoals = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    goal_type: '',
    target_value: '',
    description: '',
    period_end: ''
  });
  
  const { businessGoals, createBusinessGoal, refreshData } = useEnhancedData();
  const { isAdministrator } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const goalTypes = [
    { value: 'monthly_sales', label: 'Vendas Mensais' },
    { value: 'monthly_profit', label: 'Lucro Mensal' },
    { value: 'customer_acquisition', label: 'Aquisição de Clientes' },
    { value: 'product_sales', label: 'Vendas de Produtos' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdministrator) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem criar metas.",
        variant: "destructive",
      });
      return;
    }

    const goalData = {
      goal_type: formData.goal_type,
      target_value: parseFloat(formData.target_value),
      current_value: 0,
      period_start: new Date().toISOString().split('T')[0],
      period_end: formData.period_end,
      status: 'active' as const,
      description: formData.description
    };

    const result = await createBusinessGoal(goalData);
    
    if (result) {
      toast({
        title: "Meta criada",
        description: "Nova meta de negócio foi criada com sucesso.",
      });
      
      setDialogOpen(false);
      setFormData({
        goal_type: '',
        target_value: '',
        description: '',
        period_end: ''
      });
      refreshData();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível criar a meta.",
        variant: "destructive",
      });
    }
  };

  const getGoalStatus = (goal: any) => {
    const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
    
    if (progress >= 100) return 'ahead';
    if (progress >= 80) return 'on-track';
    return 'behind';
  };

  const getGoalTypeLabel = (type: string) => {
    return goalTypes.find(gt => gt.value === type)?.label || type;
  };

  // Get next 30 days as default period end
  const getDefaultPeriodEnd = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Metas de Negócio</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe o progresso dos seus objetivos
          </p>
        </div>
        
        {isAdministrator && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {!isMobile && "Nova Meta"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="goal_type">Tipo de Meta</Label>
                  <Select 
                    value={formData.goal_type} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {goalTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Ex: Aumentar vendas mensais"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="target_value">Valor Meta</Label>
                  <Input
                    id="target_value"
                    type="number"
                    step="0.01"
                    value={formData.target_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="period_end">Data Limite</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    defaultValue={getDefaultPeriodEnd()}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Criar Meta
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Goals Grid */}
      {businessGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhuma meta definida
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Defina metas para acompanhar o crescimento do seu negócio
            </p>
            {isAdministrator && (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Meta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessGoals.map((goal) => {
            const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            const status = getGoalStatus(goal);
            const daysLeft = Math.ceil(
              (new Date(goal.period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return (
              <KPICard
                key={goal.id}
                title={getGoalTypeLabel(goal.goal_type)}
                value={goal.current_value}
                target={goal.target_value}
                progress={progress}
                icon={Target}
                status={status}
                trend={{
                  value: `${daysLeft} dias restantes`,
                  type: daysLeft > 7 ? 'positive' : daysLeft > 3 ? 'neutral' : 'negative'
                }}
                className="hover:scale-105 transition-transform"
              />
            );
          })}
        </div>
      )}
    </div>
  );
};