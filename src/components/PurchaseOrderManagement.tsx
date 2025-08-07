import React, { useState, useEffect } from "react";
import { Plus, Edit, Eye, Package, Calendar, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  total_amount: number;
  tax_amount: number;
  notes?: string;
  order_date: string;
  expected_delivery_date?: string;
  received_date?: string;
  created_at: string;
  suppliers?: {
    name: string;
  };
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  purchase_price: number;
}

interface OrderItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

const statusMap = {
  pending: { label: 'Pendente', variant: 'secondary' as const },
  confirmed: { label: 'Confirmado', variant: 'default' as const },
  shipped: { label: 'Enviado', variant: 'default' as const },
  received: { label: 'Recebido', variant: 'default' as const },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const },
};

export const PurchaseOrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orderData, setOrderData] = useState({
    supplier_id: '',
    order_number: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
    items: [] as OrderItem[],
  });
  const { profile, isAdministrator, isSuperuser } = useAuth();
  const { toast } = useToast();

  const canManageOrders = isAdministrator || isSuperuser;

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as PurchaseOrder[] || []);
    } catch (error) {
      console.error('Erro ao buscar ordens de compra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ordens de compra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, purchase_price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OC${year}${month}${random}`;
  };

  const addOrderItem = () => {
    setOrderData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, unit_cost: 0, total_cost: 0 }]
    }));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    setOrderData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total cost
      if (field === 'quantity' || field === 'unit_cost') {
        newItems[index].total_cost = newItems[index].quantity * newItems[index].unit_cost;
      }
      
      // Auto-fill unit cost when product is selected
      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index].unit_cost = product.purchase_price;
          newItems[index].total_cost = newItems[index].quantity * product.purchase_price;
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeOrderItem = (index: number) => {
    setOrderData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return orderData.items.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !orderData.supplier_id || orderData.items.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um item",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalAmount = calculateTotal();
      const orderNumber = orderData.order_number || generateOrderNumber();

      if (editingOrder) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('purchase_orders')
          .update({
            supplier_id: orderData.supplier_id,
            order_number: orderNumber,
            total_amount: totalAmount,
            order_date: orderData.order_date,
            expected_delivery_date: orderData.expected_delivery_date || null,
            notes: orderData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingOrder.id);

        if (orderError) throw orderError;

        // Delete existing items and insert new ones
        await supabase
          .from('purchase_order_items')
          .delete()
          .eq('purchase_order_id', editingOrder.id);

        if (orderData.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(
              orderData.items.map(item => ({
                purchase_order_id: editingOrder.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                total_cost: item.total_cost,
              }))
            );

          if (itemsError) throw itemsError;
        }

        toast({
          title: "Sucesso",
          description: "Ordem de compra atualizada com sucesso!",
        });
      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            tenant_id: profile.tenant_id,
            supplier_id: orderData.supplier_id,
            order_number: orderNumber,
            total_amount: totalAmount,
            order_date: orderData.order_date,
            expected_delivery_date: orderData.expected_delivery_date || null,
            notes: orderData.notes,
            created_by: profile.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert order items
        if (orderData.items.length > 0) {
          const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(
              orderData.items.map(item => ({
                purchase_order_id: newOrder.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                total_cost: item.total_cost,
              }))
            );

          if (itemsError) throw itemsError;
        }

        toast({
          title: "Sucesso",
          description: "Ordem de compra criada com sucesso!",
        });
      }

      fetchOrders();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar ordem de compra:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ordem de compra",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setOrderData({
      supplier_id: '',
      order_number: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
      items: [],
    });
    setEditingOrder(null);
    setIsDialogOpen(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (canManageOrders) {
      fetchOrders();
      fetchSuppliers();
      fetchProducts();
    }
  }, [canManageOrders]);

  if (!canManageOrders) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para acessar a gestão de ordens de compra.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ordens de Compra
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ordem
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingOrder ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Fornecedor *</Label>
                      <Select value={orderData.supplier_id} onValueChange={(value) => setOrderData(prev => ({ ...prev, supplier_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um fornecedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="order_number">Número da Ordem</Label>
                      <Input
                        id="order_number"
                        value={orderData.order_number}
                        onChange={(e) => setOrderData(prev => ({ ...prev, order_number: e.target.value }))}
                        placeholder="Será gerado automaticamente"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="order_date">Data da Ordem *</Label>
                      <Input
                        id="order_date"
                        type="date"
                        value={orderData.order_date}
                        onChange={(e) => setOrderData(prev => ({ ...prev, order_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expected_delivery_date">Data Prevista de Entrega</Label>
                      <Input
                        id="expected_delivery_date"
                        type="date"
                        value={orderData.expected_delivery_date}
                        onChange={(e) => setOrderData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Itens da Ordem *</Label>
                      <Button type="button" onClick={addOrderItem} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>
                    
                    {orderData.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 items-end p-4 border rounded">
                        <div className="space-y-2">
                          <Label>Produto</Label>
                          <Select 
                            value={item.product_id} 
                            onValueChange={(value) => updateOrderItem(index, 'product_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
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
                        <div className="space-y-2">
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço Unitário</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) => updateOrderItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Total</Label>
                          <Input
                            value={formatCurrency(item.total_cost)}
                            disabled
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    
                    {orderData.items.length > 0 && (
                      <div className="text-right">
                        <strong>Total Geral: {formatCurrency(calculateTotal())}</strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={orderData.notes}
                      onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingOrder ? 'Atualizar' : 'Criar'} Ordem
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar ordens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando ordens de compra...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.suppliers?.name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(order.order_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusMap[order.status].variant}>
                        {statusMap[order.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && filteredOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhuma ordem encontrada para os filtros aplicados.' 
                : 'Nenhuma ordem de compra cadastrada.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};