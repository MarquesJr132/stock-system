import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useSpecialOrders, SpecialOrder, SpecialOrderItem } from '@/hooks/useSpecialOrders'
import { Plus, PackageCheck, Clock, Truck, Package, CheckCircle, X, Trash2, Edit, Minus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/currency'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800',
  in_transit: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  delivered: 'bg-indigo-100 text-indigo-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

const statusLabels = {
  pending: 'Pendente',
  ordered: 'Encomendado',
  in_transit: 'Em Trânsito',
  received: 'Recebido',
  delivered: 'Entregue',
  closed: 'Fechado',
  cancelled: 'Cancelado'
}

const statusIcons = {
  pending: Clock,
  ordered: Package,
  in_transit: Truck,
  received: PackageCheck,
  delivered: CheckCircle,
  closed: CheckCircle,
  cancelled: X
}

const SpecialOrderForm = ({ 
  order, 
  isOpen, 
  onClose, 
  onSubmit 
}: {
  order?: SpecialOrder
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}) => {
  const { customers } = useSpecialOrders()
  const [formData, setFormData] = useState({
    customer_id: order?.customer_id || '',
    expected_delivery_date: order?.expected_delivery_date || '',
    payment_method: order?.payment_method || 'cash',
    advance_payment: order?.advance_payment || 0,
    notes: order?.notes || ''
  })

  const [items, setItems] = useState<SpecialOrderItem[]>(
    order?.items || [{ product_name: '', product_description: '', quantity: 1, unit_price: 0, subtotal: 0 }]
  )

  const addItem = () => {
    setItems([...items, { product_name: '', product_description: '', quantity: 1, unit_price: 0, subtotal: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof SpecialOrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Calculate subtotal when quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].subtotal = newItems[index].quantity * newItems[index].unit_price
    }
    
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items
    if (items.some(item => !item.product_name || item.quantity <= 0 || item.unit_price <= 0)) {
      toast({
        title: "Erro",
        description: "Preencha todos os produtos com dados válidos",
        variant: "destructive"
      })
      return
    }

    onSubmit({
      ...formData,
      items: items
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
      <DialogHeader>
        <DialogTitle>{order ? 'Editar Encomenda' : 'Nova Encomenda'}</DialogTitle>
        <DialogDescription>
          {order ? 'Atualize os detalhes da encomenda' : 'Preencha os detalhes da nova encomenda especial'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Cliente</Label>
            <Select 
              value={formData.customer_id} 
              onValueChange={(value) => setFormData({...formData, customer_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
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
            <Label htmlFor="payment_method">Método de Pagamento</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(value) => setFormData({...formData, payment_method: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expected_delivery_date">Data Prevista de Entrega</Label>
            <Input
              id="expected_delivery_date"
              type="date"
              value={formData.expected_delivery_date}
              onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="advance_payment">Pagamento Antecipado (MT)</Label>
            <Input
              id="advance_payment"
              type="number"
              step="0.01"
              min="0"
              value={formData.advance_payment}
              onChange={(e) => setFormData({...formData, advance_payment: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>

        {/* Products Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold">Produtos</Label>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>

          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Produto {index + 1}</h4>
                  {items.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeItem(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Produto *</Label>
                    <Input
                      value={item.product_name}
                      onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                      placeholder="Ex: Notebook Dell Inspiron"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={item.product_description || ''}
                      onChange={(e) => updateItem(index, 'product_description', e.target.value)}
                      placeholder="Especificações do produto"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preço Unitário (MT) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Subtotal</Label>
                    <Input
                      value={formatCurrency(item.subtotal)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Observações adicionais sobre a encomenda"
            rows={3}
          />
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(calculateTotal())}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            {order ? 'Atualizar' : 'Criar'} Encomenda
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

const StatusUpdateDialog = ({ 
  order, 
  isOpen, 
  onClose, 
  onUpdate 
}: {
  order: SpecialOrder
  isOpen: boolean
  onClose: () => void
  onUpdate: (status: string) => void
}) => {
  const [selectedStatus, setSelectedStatus] = useState(order.status)

  const nextStatuses = {
    pending: ['ordered', 'cancelled'],
    ordered: ['in_transit', 'received', 'cancelled'],
    in_transit: ['received', 'cancelled'],
    received: ['delivered'],
    delivered: ['closed']
  }

  const handleUpdate = () => {
    onUpdate(selectedStatus)
    onClose()
  }

  if (!isOpen) return null

  return (
    <DialogContent className="max-w-md mx-4 sm:mx-auto">
      <DialogHeader>
        <DialogTitle>Atualizar Status da Encomenda</DialogTitle>
        <DialogDescription>
          {order.items && order.items.length > 0 && (
            <span>Encomenda com {order.items.length} produto(s)</span>
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Status Atual</Label>
          <div className="flex items-center space-x-2">
            <Badge className={statusColors[order.status as keyof typeof statusColors]}>
              {statusLabels[order.status as keyof typeof statusLabels]}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Novo Status</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nextStatuses[order.status as keyof typeof nextStatuses]?.map(status => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status as keyof typeof statusLabels]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
        <Button onClick={handleUpdate} className="w-full sm:w-auto">Atualizar</Button>
      </div>
    </DialogContent>
  )
}

export const SpecialOrdersManagement = () => {
  const { 
    specialOrders, 
    loading, 
    addSpecialOrder, 
    updateSpecialOrder, 
    deleteSpecialOrder, 
    closeSpecialOrder,
    getStatusStats 
  } = useSpecialOrders()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SpecialOrder | undefined>()
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const stats = getStatusStats()
  const filteredOrders = filterStatus === 'all' 
    ? specialOrders 
    : specialOrders.filter(order => order.status === filterStatus)

  const handleSubmitOrder = async (data: any) => {
    try {
      if (selectedOrder) {
        await updateSpecialOrder(selectedOrder.id, data)
      } else {
        await addSpecialOrder(data)
      }
      setSelectedOrder(undefined)
    } catch (error) {
      console.error('Error submitting order:', error)
    }
  }

  const handleStatusUpdate = async (status: string) => {
    if (!selectedOrder) return

    try {
      await updateSpecialOrder(selectedOrder.id, { status })
      setSelectedOrder(undefined)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleCloseOrder = async (order: SpecialOrder) => {
    try {
      await closeSpecialOrder(order)
    } catch (error) {
      console.error('Error closing order:', error)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteSpecialOrder(id)
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Carregando encomendas...</div>
  }

  return (
    <div className="p-3 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Encomendas Especiais</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Gerir encomendas de produtos não disponíveis em stock
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedOrder(undefined)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Encomenda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          </DialogTrigger>
          <SpecialOrderForm
            order={selectedOrder}
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmit={handleSubmitOrder}
          />
        </Dialog>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-4">
        {Object.entries(stats).map(([status, count]) => {
          const IconComponent = statusIcons[status as keyof typeof statusIcons]
          return (
            <Card 
              key={status} 
              className={`cursor-pointer transition-colors ${
                filterStatus === status ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            >
              <CardContent className="p-2 lg:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                  <IconComponent className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground mb-1 sm:mb-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg lg:text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {statusLabels[status as keyof typeof statusLabels]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button 
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('all')}
          size="sm"
          className="w-full sm:w-auto"
        >
          Todas ({specialOrders.length})
        </Button>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as encomendas</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg sm:text-xl">Lista de Encomendas</CardTitle>
              <CardDescription className="text-sm">
                {filteredOrders.length} encomenda(s) encontrada(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 lg:p-6">
          {/* Mobile Cards View */}
          <div className="block lg:hidden space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">
                        {order.items && order.items.length > 0 
                          ? `${order.items.length} produto(s)`
                          : 'Encomenda especial'
                        }
                      </h3>
                      {order.items && order.items.length > 0 && (
                        <p className="text-sm text-muted-foreground truncate">
                          {order.items[0].product_name}
                          {order.items.length > 1 && ` e mais ${order.items.length - 1}`}
                        </p>
                      )}
                    </div>
                    <Badge className={`ml-2 text-xs ${statusColors[order.status as keyof typeof statusColors]}`}>
                      {statusLabels[order.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="truncate">{order.customer?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Itens:</span>
                      <p>{order.items?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <p>{new Date(order.order_date).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {order.status === 'delivered' && (
                      <Button
                        size="sm"
                        onClick={() => handleCloseOrder(order)}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        Fechar
                      </Button>
                    )}
                    
                    {order.status !== 'closed' && order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order)
                          setIsStatusDialogOpen(true)
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        <span className="hidden xs:inline">Editar Status</span>
                        <span className="xs:hidden">Editar</span>
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 px-2">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-sm mx-4 sm:mx-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-base">Eliminar Encomenda</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm">
                            Tem certeza que deseja eliminar esta encomenda? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Qtd. Items</TableHead>
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
                        <div className="font-medium">
                          {order.items && order.items.length > 0 
                            ? order.items[0].product_name
                            : 'Encomenda especial'
                          }
                        </div>
                        {order.items && order.items.length > 1 && (
                          <div className="text-sm text-muted-foreground">
                            e mais {order.items.length - 1} produto(s)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.customer?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{order.items?.length || 0}</TableCell>
                    <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                        {statusLabels[order.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(order.order_date).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {order.status === 'delivered' && (
                          <Button
                            size="sm"
                            onClick={() => handleCloseOrder(order)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Fechar
                          </Button>
                        )}
                        
                        {order.status !== 'closed' && order.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsStatusDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-sm mx-4 sm:mx-auto">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base">Eliminar Encomenda</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Tem certeza que deseja eliminar esta encomenda? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrder(order.id)}
                                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <PackageCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma encomenda encontrada</p>
              <p className="text-sm">
                {filterStatus === 'all' 
                  ? 'Crie a sua primeira encomenda especial' 
                  : `Não há encomendas com status "${statusLabels[filterStatus as keyof typeof statusLabels]}"`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        {selectedOrder && (
          <StatusUpdateDialog
            order={selectedOrder}
            isOpen={isStatusDialogOpen}
            onClose={() => setIsStatusDialogOpen(false)}
            onUpdate={handleStatusUpdate}
          />
        )}
      </Dialog>
    </div>
  )
}