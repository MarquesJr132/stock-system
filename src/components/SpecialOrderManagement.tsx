import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageCheck, Plus, Eye, Package, CheckCircle, Clock, Truck, AlertCircle } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SpecialOrder {
  id: string;
  tenant_id: string;
  customer_id?: string;
  supplier_id?: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  advance_payment?: number;
  status: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  payment_method?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer?: { name: string };
  supplier?: { name: string };
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  ordered: { label: 'Encomendado', color: 'bg-blue-500', icon: Package },
  in_transit: { label: 'Em Trânsito', color: 'bg-purple-500', icon: Truck },
  received: { label: 'Recebido', color: 'bg-orange-500', icon: PackageCheck },
  delivered: { label: 'Entregue', color: 'bg-green-500', icon: CheckCircle },
  closed: { label: 'Fechado/Vendido', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: AlertCircle }
};

export function SpecialOrderManagement() {
  const { customers } = useSupabaseData();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SpecialOrder | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    customer_id: '',
    supplier_id: '',
    product_name: '',
    product_description: '',
    quantity: 1,
    unit_price: 0,
    advance_payment: 0,
    expected_delivery_date: '',
    payment_method: 'Dinheiro',
    notes: ''
  });

  const fetchSpecialOrders = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('special_orders')
        .select(`
          *,
          customer:customers(name),
          supplier:suppliers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpecialOrders(data || []);
    } catch (error) {
      toast.error('Erro ao carregar encomendas');
      console.error('Error fetching special orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  useEffect(() => {
    fetchSpecialOrders();
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const total_amount = formData.quantity * formData.unit_price;

      const { error } = await supabase
        .from('special_orders')
        .insert({
          tenant_id: profile?.tenant_id || profile?.id,
          customer_id: formData.customer_id || null,
          supplier_id: formData.supplier_id || null,
          product_name: formData.product_name,
          product_description: formData.product_description,
          quantity: formData.quantity,
          unit_price: formData.unit_price,
          total_amount,
          advance_payment: formData.advance_payment,
          expected_delivery_date: formData.expected_delivery_date || null,
          payment_method: formData.payment_method,
          notes: formData.notes,
          created_by: profile?.id
        });

      if (error) throw error;

      toast.success('Encomenda especial criada com sucesso!');
      setIsDialogOpen(false);
      setFormData({
        customer_id: '',
        supplier_id: '',
        product_name: '',
        product_description: '',
        quantity: 1,
        unit_price: 0,
        advance_payment: 0,
        expected_delivery_date: '',
        payment_method: 'Dinheiro',
        notes: ''
      });
      fetchSpecialOrders();
    } catch (error) {
      toast.error('Erro ao criar encomenda');
      console.error('Error creating special order:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let updateData: any = { status: newStatus };
      
      if (newStatus === 'delivered') {
        updateData.actual_delivery_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('special_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Se status for 'closed', converter para venda
      if (newStatus === 'closed') {
        await convertToSale(orderId);
      }

      toast.success('Status atualizado com sucesso!');
      fetchSpecialOrders();
    } catch (error) {
      toast.error('Erro ao atualizar status');
      console.error('Error updating status:', error);
    }
  };

  const convertToSale = async (orderId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const order = specialOrders.find(o => o.id === orderId);
      if (!order) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      // Criar venda
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          tenant_id: profile?.tenant_id || profile?.id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          total_profit: order.total_amount - (order.advance_payment || 0),
          payment_method: order.payment_method || 'Dinheiro',
          created_by: profile?.id
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Criar item de venda
      const { error: itemError } = await supabase
        .from('sale_items')
        .insert({
          tenant_id: profile?.tenant_id || profile?.id,
          sale_id: sale.id,
          product_id: null, // Produto especial não tem ID
          quantity: order.quantity,
          unit_price: order.unit_price,
          subtotal: order.total_amount,
          total: order.total_amount
        });

      if (itemError) throw itemError;

      toast.success('Encomenda convertida para venda com sucesso!');
    } catch (error) {
      toast.error('Erro ao converter para venda');
      console.error('Error converting to sale:', error);
    }
  };

  const filteredOrders = specialOrders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['pending', 'ordered', 'in_transit', 'received', 'delivered'].includes(order.status);
    if (activeTab === 'completed') return ['closed', 'cancelled'].includes(order.status);
    return order.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Encomendas Especiais</h1>
          <p className="text-muted-foreground">Gerir produtos encomendados especialmente para clientes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Encomenda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Encomenda Especial</DialogTitle>
              <DialogDescription>
                Registar uma encomenda para produto não disponível em stock
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select value={formData.supplier_id} onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar fornecedor" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_name">Nome do Produto</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_description">Descrição</Label>
                <Textarea
                  id="product_description"
                  value={formData.product_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">Preço Unitário</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advance_payment">Sinal</Label>
                  <Input
                    id="advance_payment"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.advance_payment}
                    onChange={(e) => setFormData(prev => ({ ...prev, advance_payment: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expected_delivery_date">Data Prevista de Entrega</Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Método de Pagamento</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Multicaixa">Multicaixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Encomenda</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Ativas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Lista de Encomendas</CardTitle>
              <CardDescription>
                {filteredOrders.length} encomenda(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.product_name}</div>
                          {order.product_description && (
                            <div className="text-sm text-muted-foreground">
                              {order.product_description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.customer?.name || 'Cliente não especificado'}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>{order.total_amount.toFixed(2)} MT</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {order.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'ordered')}
                            >
                              Encomendar
                            </Button>
                          )}
                          
                          {order.status === 'ordered' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'received')}
                            >
                              Recebido
                            </Button>
                          )}
                          
                          {order.status === 'received' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                            >
                              Entregue
                            </Button>
                          )}
                          
                          {order.status === 'delivered' && (
                            <Button
                              size="sm"
                              onClick={() => updateOrderStatus(order.id, 'closed')}
                            >
                              Fechar/Vender
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Order Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Encomenda</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Produto</Label>
                  <p className="font-medium">{selectedOrder.product_name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
              </div>
              
              {selectedOrder.product_description && (
                <div>
                  <Label>Descrição</Label>
                  <p>{selectedOrder.product_description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <p>{selectedOrder.quantity}</p>
                </div>
                <div>
                  <Label>Preço Unitário</Label>
                  <p>{selectedOrder.unit_price.toFixed(2)} MT</p>
                </div>
                <div>
                  <Label>Total</Label>
                  <p className="font-medium">{selectedOrder.total_amount.toFixed(2)} MT</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <p>{selectedOrder.customer?.name || 'Não especificado'}</p>
                </div>
                <div>
                  <Label>Fornecedor</Label>
                  <p>{selectedOrder.supplier?.name || 'Não especificado'}</p>
                </div>
              </div>
              
              {selectedOrder.expected_delivery_date && (
                <div>
                  <Label>Data Prevista de Entrega</Label>
                  <p>{format(new Date(selectedOrder.expected_delivery_date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                </div>
              )}
              
              {selectedOrder.notes && (
                <div>
                  <Label>Observações</Label>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}