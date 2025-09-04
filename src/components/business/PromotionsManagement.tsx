import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Tag, Calendar, Percent, Gift, Package } from 'lucide-react';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/currency';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTable, SimpleMobileCard } from '@/components/mobile/MobileTable';

export const PromotionsManagement = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage' as const,
    value: '',
    min_quantity: '1',
    max_uses: '',
    start_date: '',
    end_date: '',
    promo_code: '',
    active: true
  });

  const { promotions, createPromotion, updatePromotion, refreshData } = useBusinessData();
  const { isAdministrator } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const promotionTypes = [
    { value: 'percentage', label: 'Desconto Percentual', icon: Percent },
    { value: 'fixed_amount', label: 'Valor Fixo', icon: Tag },
    { value: 'buy_x_get_y', label: 'Compre X Leve Y', icon: Gift },
    { value: 'combo', label: 'Combo de Produtos', icon: Package }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdministrator) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem criar promoções.",
        variant: "destructive",
      });
      return;
    }

    const promotionData = {
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
      value: parseFloat(formData.value),
      min_quantity: parseInt(formData.min_quantity) || 1,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      promo_code: formData.promo_code || undefined,
      active: formData.active
    };

    const result = await createPromotion(promotionData);
    
    if (result) {
      toast({
        title: "Promoção criada",
        description: "Nova promoção foi criada com sucesso.",
      });
      
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        type: 'percentage',
        value: '',
        min_quantity: '1',
        max_uses: '',
        start_date: '',
        end_date: '',
        promo_code: '',
        active: true
      });
      refreshData();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível criar a promoção.",
        variant: "destructive",
      });
    }
  };

  const togglePromotionStatus = async (id: string, currentStatus: boolean) => {
    const result = await updatePromotion(id, { active: !currentStatus });
    
    if (result) {
      toast({
        title: "Status atualizado",
        description: `Promoção ${!currentStatus ? 'ativada' : 'desativada'} com sucesso.`,
      });
    }
  };

  const getPromotionStatusColor = (promotion: any) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (!promotion.active) return 'secondary';
    if (promotion.start_date > today) return 'outline';
    if (promotion.end_date < today) return 'destructive';
    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) return 'destructive';
    
    return 'default';
  };

  const getPromotionStatus = (promotion: any) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (!promotion.active) return 'Inativa';
    if (promotion.start_date > today) return 'Agendada';
    if (promotion.end_date < today) return 'Expirada';
    if (promotion.max_uses && promotion.current_uses >= promotion.max_uses) return 'Esgotada';
    
    return 'Ativa';
  };

  const getPromotionTypeLabel = (type: string) => {
    return promotionTypes.find(pt => pt.value === type)?.label || type;
  };

  const formatPromotionValue = (type: string, value: number) => {
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'fixed_amount':
        return formatCurrency(value);
      case 'buy_x_get_y':
        return `${value} unidades`;
      default:
        return value.toString();
    }
  };

  // Get default dates (today to next week)
  const getDefaultDates = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return {
      start: today.toISOString().split('T')[0],
      end: nextWeek.toISOString().split('T')[0]
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestão de Promoções</h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie descontos e ofertas especiais
          </p>
        </div>
        
        {isAdministrator && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {!isMobile && "Nova Promoção"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Promoção</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Promoção *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Desconto de Natal"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Tipo de Promoção *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {promotionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição da promoção..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="value">
                      Valor {formData.type === 'percentage' ? '(%)' : formData.type === 'fixed_amount' ? '(MT)' : '(unidades)'} *
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      step={formData.type === 'percentage' ? "0.1" : formData.type === 'fixed_amount' ? "0.01" : "1"}
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_quantity">Quantidade Mínima</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_quantity: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="start_date">Data Início *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      defaultValue={getDefaultDates().start}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">Data Fim *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      defaultValue={getDefaultDates().end}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_uses">Usos Máximos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="promo_code">Código Promocional</Label>
                    <Input
                      id="promo_code"
                      value={formData.promo_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
                      placeholder="DESCONTO10"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    />
                    <Label htmlFor="active">Ativar promoção</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Criar Promoção
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

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhuma promoção criada
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Crie promoções para atrair mais clientes e aumentar as vendas
            </p>
            {isAdministrator && (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Promoção
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <MobileTable
          items={promotions}
          renderCard={(promotion) => (
            <SimpleMobileCard
              title={promotion.name}
              subtitle={getPromotionTypeLabel(promotion.type)}
              badge={getPromotionStatus(promotion)}
              badgeVariant={getPromotionStatusColor(promotion)}
              content={
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="font-medium">
                      {formatPromotionValue(promotion.type, promotion.value)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">
                      {new Date(promotion.start_date).toLocaleDateString('pt-PT')} - {new Date(promotion.end_date).toLocaleDateString('pt-PT')}
                    </span>
                  </div>
                  {promotion.promo_code && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Código:</span>
                      <Badge variant="outline" className="text-xs">
                        {promotion.promo_code}
                      </Badge>
                    </div>
                  )}
                  {promotion.max_uses && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usos:</span>
                      <span className="font-medium">
                        {promotion.current_uses}/{promotion.max_uses}
                      </span>
                    </div>
                  )}
                </div>
              }
            />
          )}
          emptyMessage="Nenhuma promoção encontrada"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {promotion.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {getPromotionTypeLabel(promotion.type)}
                    </p>
                  </div>
                  <Badge variant={getPromotionStatusColor(promotion)}>
                    {getPromotionStatus(promotion)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="font-semibold text-lg">
                      {formatPromotionValue(promotion.type, promotion.value)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantidade mín:</span>
                    <span className="font-medium">{promotion.min_quantity}</span>
                  </div>
                  
                  {promotion.max_uses && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usos:</span>
                      <span className="font-medium">
                        {promotion.current_uses}/{promotion.max_uses}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3 w-3" />
                    Período de validade
                  </div>
                  <div className="text-sm font-medium">
                    {new Date(promotion.start_date).toLocaleDateString('pt-PT')} - {new Date(promotion.end_date).toLocaleDateString('pt-PT')}
                  </div>
                </div>

                {promotion.promo_code && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">
                      Código promocional
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {promotion.promo_code}
                    </Badge>
                  </div>
                )}

                {promotion.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {promotion.description}
                  </p>
                )}

                {isAdministrator && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {promotion.active ? 'Ativa' : 'Inativa'}
                    </span>
                    <Switch
                      checked={promotion.active}
                      onCheckedChange={() => togglePromotionStatus(promotion.id, promotion.active)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};