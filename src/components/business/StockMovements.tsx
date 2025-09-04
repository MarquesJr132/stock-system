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


export const StockMovements = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    movement_type: 'in' as 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation',
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
        variant: "destructive"
      });
      return;
    }

    try {
      await createStockMovement({
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity: parseInt(formData.quantity),
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        from_location: formData.from_location || null,
        to_location: formData.to_location || null,
        notes: formData.notes || null
      });

      toast({
        title: "Movimento registado",
        description: "Movimentação de stock criada com sucesso."
      });

      setFormData({
        product_id: '',
        movement_type: 'in' as 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation',
        quantity: '',
        unit_cost: '',
        from_location: '',
        to_location: '',
        notes: ''
      });
      setDialogOpen(false);
      await refreshData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao registar movimento.",
        variant: "destructive"
      });
    }
  };

  const getMovementTypeInfo = (type: string) => {
    return movementTypes.find(t => t.value === type) || movementTypes[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Produto não encontrado';
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold">Movimentações de Stock</h2>
            <p className="text-sm text-muted-foreground">
              Controlo de entradas, saídas e transferências
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Nova Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Produto</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="movement_type">Tipo de Movimento</Label>
                  <Select value={formData.movement_type} onValueChange={(value) => setFormData(prev => ({ ...prev, movement_type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
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
                </div>

                {formData.movement_type === 'transfer' && (
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
        </div>

        <Card>
          <CardContent className="p-4">
            {stockMovements.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma movimentação registada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockMovements.map((movement) => {
                  const typeInfo = getMovementTypeInfo(movement.movement_type);
                  const TypeIcon = typeInfo.icon;

                  return (
                    <div key={movement.id} className="p-3 border rounded-lg bg-background">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-lg bg-accent/10 flex-shrink-0">
                            <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{getProductName(movement.product_id)}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(movement.created_at)}</p>
                            {movement.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {movement.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            {movement.quantity} un.
                          </p>
                          {movement.unit_cost && (
                            <p className="text-xs text-muted-foreground">
                              €{(movement.quantity * movement.unit_cost).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Movimentações de Stock</h2>
          <p className="text-muted-foreground">
            Controlo de entradas, saídas e transferências
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product_id">Produto</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="movement_type">Tipo de Movimento</Label>
                  <Select value={formData.movement_type} onValueChange={(value) => setFormData(prev => ({ ...prev, movement_type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
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
              </div>

              {formData.movement_type === 'transfer' && (
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockMovements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma movimentação registada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stockMovements.map((movement) => {
                const typeInfo = getMovementTypeInfo(movement.movement_type);
                const TypeIcon = typeInfo.icon;

                return (
                  <div key={movement.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-accent/10`}>
                        <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">{getProductName(movement.product_id)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(movement.created_at)}
                        </p>
                        {movement.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {movement.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={typeInfo.color}>
                        {typeInfo.label}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        {movement.quantity} unidades
                      </p>
                      {movement.unit_cost && (
                        <p className="text-xs text-muted-foreground">
                          €{(movement.quantity * movement.unit_cost).toFixed(2)}
                        </p>
                      )}
                      {movement.from_location && movement.to_location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {movement.from_location} → {movement.to_location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};