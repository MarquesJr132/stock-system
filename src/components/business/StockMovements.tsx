import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowUp, ArrowDown, Package, MapPin, Calendar } from 'lucide-react';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileTable, SimpleMobileCard } from '@/components/mobile/MobileTable';

export const StockMovements = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in' as const,
    quantity: '',
    unit_cost: '',
    from_location: '',
    to_location: '',
    notes: ''
  });

  const { stockMovements, createStockMovement, refreshData } = useBusinessData();
  const { products } = useSupabaseData();
  const { isAdministrator } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const movementTypes = [
    { value: 'in', label: 'Entrada', icon: ArrowUp, color: 'text-green-600' },
    { value: 'out', label: 'Saída', icon: ArrowDown, color: 'text-red-600' },
    { value: 'transfer', label: 'Transferência', icon: Package, color: 'text-blue-600' },
    { value: 'adjustment', label: 'Ajuste', icon: Package, color: 'text-yellow-600' },
    { value: 'reservation', label: 'Reserva', icon: Calendar, color: 'text-purple-600' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdministrator) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem registar movimentações.",
        variant: "destructive",
      });
      return;
    }

    const movementData = {
      product_id: formData.product_id,
      movement_type: formData.movement_type,
      quantity: parseInt(formData.quantity),
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      from_location: formData.from_location || undefined,
      to_location: formData.to_location || undefined,
      notes: formData.notes || undefined,
      reference_type: 'adjustment' // Manual adjustments
    };

    const result = await createStockMovement(movementData);
    
    if (result) {
      toast({
        title: "Movimentação registada",
        description: "Movimentação de stock foi registada com sucesso.",
      });
      
      setDialogOpen(false);
      setFormData({
        product_id: '',
        movement_type: 'in',
        quantity: '',
        unit_cost: '',
        from_location: '',
        to_location: '',
        notes: ''
      });
      refreshData();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível registar a movimentação.",
        variant: "destructive",
      });
    }
  };

  const getMovementTypeInfo = (type: string) => {
    return movementTypes.find(mt => mt.value === type) || movementTypes[0];
  };

  const getMovementDirection = (type: string) => {
    switch (type) {
      case 'in':
      case 'adjustment':
        return '+';
      case 'out':
      case 'reservation':
        return '-';
      case 'transfer':
        return '→';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Movimentações de Stock</h3>
          <p className="text-sm text-muted-foreground">
            Histórico detalhado de entradas, saídas e transferências
          </p>
        </div>
        
        {isAdministrator && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {!isMobile && "Nova Movimentação"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registar Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Produto *</Label>
                  <Select 
                    value={formData.product_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="movement_type">Tipo de Movimento *</Label>
                    <Select 
                      value={formData.movement_type} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, movement_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {movementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {(formData.movement_type === 'in') && (
                  <div>
                    <Label htmlFor="unit_cost">Custo Unitário</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_cost: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from_location">De (Local)</Label>
                      <Input
                        id="from_location"
                        value={formData.from_location}
                        onChange={(e) => setFormData(prev => ({ ...prev, from_location: e.target.value }))}
                        placeholder="Armazém A"
                      />
                    </div>
                    <div>
                      <Label htmlFor="to_location">Para (Local)</Label>
                      <Input
                        id="to_location"
                        value={formData.to_location}
                        onChange={(e) => setFormData(prev => ({ ...prev, to_location: e.target.value }))}
                        placeholder="Loja Central"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Motivo da movimentação..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Registar Movimento
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

      {/* Movements List */}
      {stockMovements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhuma movimentação registada
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Todas as entradas, saídas e transferências aparecerão aqui
            </p>
            {isAdministrator && (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Primeira Movimentação
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <MobileTable
          items={stockMovements}
          renderCard={(movement) => {
            const typeInfo = getMovementTypeInfo(movement.movement_type);
            const Icon = typeInfo.icon;
            
            return (
              <SimpleMobileCard
                title={movement.products?.name || 'Produto Desconhecido'}
                subtitle={typeInfo.label}
                badge={`${getMovementDirection(movement.movement_type)}${movement.quantity}`}
                badgeVariant={movement.movement_type === 'in' ? 'default' : movement.movement_type === 'out' ? 'destructive' : 'secondary'}
                content={
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className={`h-4 w-4 ${typeInfo.color}`} />
                      <span>{new Date(movement.created_at).toLocaleString('pt-PT')}</span>
                    </div>
                    {movement.reference_type && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Referência:</span>
                        <span className="font-medium capitalize">{movement.reference_type}</span>
                      </div>
                    )}
                    {movement.from_location && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">De:</span>
                        <span className="font-medium">{movement.from_location}</span>
                      </div>
                    )}
                    {movement.to_location && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Para:</span>
                        <span className="font-medium">{movement.to_location}</span>
                      </div>
                    )}
                    {movement.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {movement.notes}
                      </p>
                    )}
                  </div>
                }
              />
            );
          }}
          emptyMessage="Nenhuma movimentação encontrada"
        />
      ) : (
        <div className="space-y-4">
          {stockMovements.map((movement) => {
            const typeInfo = getMovementTypeInfo(movement.movement_type);
            const Icon = typeInfo.icon;
            
            return (
              <Card key={movement.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg bg-gray-100 ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {movement.products?.name || 'Produto Desconhecido'}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{typeInfo.label}</span>
                          <span>•</span>
                          <span>{new Date(movement.created_at).toLocaleString('pt-PT')}</span>
                          {movement.reference_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{movement.reference_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        movement.movement_type === 'in' ? 'text-green-600' : 
                        movement.movement_type === 'out' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {getMovementDirection(movement.movement_type)}{movement.quantity}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        unidades
                      </div>
                    </div>
                  </div>
                  
                  {(movement.from_location || movement.to_location || movement.notes) && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      {movement.from_location && movement.to_location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            De <span className="font-medium">{movement.from_location}</span> 
                            {' '}para <span className="font-medium">{movement.to_location}</span>
                          </span>
                        </div>
                      )}
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground">
                          {movement.notes}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};