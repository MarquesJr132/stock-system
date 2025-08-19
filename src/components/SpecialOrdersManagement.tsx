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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useSpecialOrders, SpecialOrder, SpecialOrderItem } from '@/hooks/useSpecialOrders'
import { Plus, PackageCheck, Clock, Truck, Package, CheckCircle, X, Trash2, Edit, Minus, ChevronDown, ChevronUp } from 'lucide-react'
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
  
  // Initialize form data with order data when available
  const [formData, setFormData] = useState({
    customer_id: '',
    expected_delivery_date: '',
    payment_method: 'cash',
    advance_payment: 0,
    notes: ''
  })

  const [items, setItems] = useState<SpecialOrderItem[]>([
    { product_name: '', product_description: '', quantity: 1, unit_price: 0, profit_amount: 0, subtotal: 0 }
  ])
  
  const [expandedProductIndex, setExpandedProductIndex] = useState<number>(0)

  // Update form data when order prop changes
  React.useEffect(() => {
    if (order) {
      setFormData({
        customer_id: order.customer_id || '',
        expected_delivery_date: order.expected_delivery_date || '',
        payment_method: order.payment_method || 'cash',
        advance_payment: order.advance_payment || 0,
        notes: order.notes || ''
      })
      
      // Load existing items or set default
      if (order.items && order.items.length > 0) {
        setItems(order.items.map(item => ({
          ...item,
          profit_amount: item.profit_amount || 0
        })))
      } else {
        setItems([{ product_name: '', product_description: '', quantity: 1, unit_price: 0, profit_amount: 0, subtotal: 0 }])
      }
      setExpandedProductIndex(0)
    } else {
      // Reset for new order
      setFormData({
        customer_id: '',
        expected_delivery_date: '',
        payment_method: 'cash',
        advance_payment: 0,
        notes: ''
      })
      setItems([{ product_name: '', product_description: '', quantity: 1, unit_price: 0, profit_amount: 0, subtotal: 0 }])
      setExpandedProductIndex(0)
    }
  }, [order])

  const addItem = () => {
    const newIndex = items.length
    setItems([...items, { product_name: '', product_description: '', quantity: 1, unit_price: 0, profit_amount: 0, subtotal: 0 }])
    setExpandedProductIndex(newIndex)
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
      if (expandedProductIndex === index) {
        setExpandedProductIndex(Math.max(0, index - 1))
      }
    }
  }

  const updateItem = (index: number, field: keyof SpecialOrderItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Calculate subtotal when quantity, unit_price, or profit_amount changes
    if (field === 'quantity' || field === 'unit_price' || field === 'profit_amount') {
      newItems[index].subtotal = (newItems[index].unit_price + newItems[index].profit_amount) * newItems[index].quantity
    }
    
    setItems(newItems)
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.subtotal, 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items
    if (items.some(item => !item.product_name || item.quantity <= 0 || item.unit_price < 0)) {
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

          <div className="space-y-4">
            {items.map((item, index) => (
              <Card key={index} className="border">
                <Collapsible 
                  open={expandedProductIndex === index} 
                  onOpenChange={(isOpen) => setExpandedProductIndex(isOpen ? index : -1)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.product_name || `Produto ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">
                            Qtd: {item.quantity} | Subtotal: {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(index);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {expandedProductIndex === index ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="p-4 pt-0 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-3">
                        <Label htmlFor={`product-name-${index}`}>Nome do Produto</Label>
                        <Input
                          id={`product-name-${index}`}
                          value={item.product_name}
                          onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                          placeholder="Nome do produto"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`quantity-${index}`}>Quantidade</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`unit-price-${index}`}>Preço Unitário (MT)</Label>
                        <Input
                          id={`unit-price-${index}`}
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`profit-amount-${index}`}>Valor do Lucro (MT)</Label>
                        <Input
                          id={`profit-amount-${index}`}
                          type="number"
                          step="0.01"
                          value={item.profit_amount}
                          onChange={(e) => updateItem(index, 'profit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <Label htmlFor={`description-${index}`}>Descrição (Opcional)</Label>
                        <Textarea
                          id={`description-${index}`}
                          value={item.product_description}
                          onChange={(e) => updateItem(index, 'product_description', e.target.value)}
                          placeholder="Descrição do produto"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Preço Base:</span>
                              <p className="font-medium">{formatCurrency(item.unit_price)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Lucro:</span>
                              <p className="font-medium text-green-600">{formatCurrency(item.profit_amount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Preço Final:</span>
                              <p className="font-medium">{formatCurrency(item.unit_price + item.profit_amount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Subtotal:</span>
                              <p className="font-semibold text-primary">{formatCurrency(item.subtotal)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
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

const PaymentReminderDialog = ({
  order,
  isOpen,
  onClose,
  onConfirm
}: {
  order: SpecialOrder
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) => {
  const remainingAmount = order.total_amount - (order.advance_payment || 0)
  
  if (!isOpen) return null

  return (
    <DialogContent className="max-w-md mx-4 sm:mx-auto">
      <DialogHeader>
        <DialogTitle>Confirmar Entrega</DialogTitle>
        <DialogDescription>
          Confirme que a encomenda foi entregue ao cliente
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">Resumo de Pagamento</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total da Encomenda:</span>
              <span className="font-medium">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pagamento Antecipado:</span>
              <span className="font-medium">{formatCurrency(order.advance_payment || 0)}</span>
            </div>
            <hr className="border-yellow-300" />
            <div className="flex justify-between font-bold text-yellow-800">
              <span>Valor a Receber:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </div>

        {remainingAmount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm font-medium">
              ⚠️ O cliente ainda deve pagar {formatCurrency(remainingAmount)}
            </p>
          </div>
        )}

        {remainingAmount <= 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm font-medium">
              ✅ Pagamento completo recebido
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button onClick={onConfirm} className="w-full sm:w-auto">
          Confirmar Entrega
        </Button>
      </div>
    </DialogContent>
  )
}

const OrderItemsViewDialog = ({
  order,
  isOpen,
  onClose,
  onEdit
}: {
  order: SpecialOrder
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
}) => {
  if (!isOpen || !order.items) return null

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
      <DialogHeader>
        <DialogTitle>Detalhes da Encomenda</DialogTitle>
        <DialogDescription>
          Visualize os itens desta encomenda especial
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Customer Info */}
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Informações do Cliente</h3>
          <p><strong>Cliente:</strong> {order.customer?.name || 'Cliente não especificado'}</p>
          <p><strong>Data de Entrega Prevista:</strong> {order.expected_delivery_date || 'Não definida'}</p>
          <p><strong>Método de Pagamento:</strong> {order.payment_method || 'Não especificado'}</p>
          <p><strong>Pagamento Antecipado:</strong> {formatCurrency(order.advance_payment || 0)}</p>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <h3 className="font-semibold">Produtos ({order.items.length})</h3>
          {order.items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label className="text-sm font-medium">Produto</Label>
                  <p className="font-semibold">{item.product_name}</p>
                  {item.product_description && (
                    <p className="text-sm text-muted-foreground">{item.product_description}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Quantidade</Label>
                  <p>{item.quantity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Preço Base</Label>
                  <p>{formatCurrency(item.unit_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Lucro</Label>
                  <p className="text-green-600 font-medium">{formatCurrency(item.profit_amount || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subtotal</Label>
                  <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Total */}
        <div className="bg-primary/10 p-4 rounded-lg">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total da Encomenda:</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div>
            <Label className="text-sm font-medium">Observações</Label>
            <p className="mt-1 p-3 bg-muted rounded-lg">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Fechar
        </Button>
        <Button onClick={() => { onEdit(); onClose(); }} className="w-full sm:w-auto">
          <Edit className="h-4 w-4 mr-2" />
          Editar Encomenda
        </Button>
      </div>
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
    getStatusStats,
    cleanDuplicateSales
  } = useSpecialOrders()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isItemsViewDialogOpen, setIsItemsViewDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SpecialOrder | undefined>()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [isClosingOrder, setIsClosingOrder] = useState(false)

  const stats = getStatusStats()
  const filteredOrders = filterStatus === 'all' 
    ? specialOrders 
    : specialOrders.filter(order => order.status === filterStatus)

  const handleCloseOrder = async (order: SpecialOrder) => {
    setIsClosingOrder(true)
    try {
      await closeSpecialOrder(order)
    } finally {
      setIsClosingOrder(false)
      setIsPaymentDialogOpen(false)
    }
  }

  const handleSubmitOrder = async (orderData: any) => {
    if (selectedOrder) {
      await updateSpecialOrder(selectedOrder.id, orderData)
    } else {
      await addSpecialOrder(orderData)
    }
    setIsFormOpen(false)
    setSelectedOrder(undefined)
  }

  const handleStatusUpdate = async (status: string) => {
    if (selectedOrder) {
      await updateSpecialOrder(selectedOrder.id, { status })
      if (status === 'delivered') {
        setIsPaymentDialogOpen(true)
      }
    }
  }

  const handleDeleteOrder = async (order: SpecialOrder) => {
    await deleteSpecialOrder(order.id)
  }

  if (loading) {
    return <div className="p-6">Carregando encomendas...</div>
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Encomendas Especiais</h1>
          <p className="text-muted-foreground text-sm">Gerir encomendas especiais de produtos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as encomendas</SelectItem>
              {Object.entries(statusLabels).map(([status, label]) => (
                <SelectItem key={status} value={status}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={() => setIsFormOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Nova Encomenda</span>
              <span className="sm:hidden">Nova</span>
            </Button>
            <Button variant="outline" onClick={cleanDuplicateSales} className="flex-1 sm:flex-none">
              <span className="hidden sm:inline">Limpar Duplicadas</span>
              <span className="sm:hidden">Limpar</span>
            </Button>
          </div>
        </div>
      </div>


      {/* Orders Table/List */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            Encomendas 
            {filterStatus !== 'all' && (
              <span className="text-sm font-normal ml-2">
                - {statusLabels[filterStatus as keyof typeof statusLabels]}
              </span>
            )}
            <span className="text-sm font-normal ml-2">({filteredOrders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filterStatus === 'all' 
                ? 'Nenhuma encomenda encontrada' 
                : `Nenhuma encomenda ${statusLabels[filterStatus as keyof typeof statusLabels].toLowerCase()}`
              }
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="block md:hidden">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border-b p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{order.customer?.name || 'Cliente não especificado'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.order_date).toLocaleDateString('pt-MZ')}
                          </p>
                        </div>
                        <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{order.items ? `${order.items.length} item(s)` : '0 items'}</span>
                        <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                      </div>
                      <div className="flex gap-1 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsItemsViewDialogOpen(true)
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        
                        {order.status !== 'closed' && order.status !== 'cancelled' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsFormOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsStatusDialogOpen(true)
                              }}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            
                            {order.status === 'delivered' && (
                              <Button
                                variant="default"
                                size="sm"
                                disabled={isClosingOrder}
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setIsPaymentDialogOpen(true)
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar Encomenda</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem a certeza que deseja eliminar esta encomenda? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteOrder(order)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Produtos</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.customer?.name || 'Cliente não especificado'}
                      </TableCell>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString('pt-MZ')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[order.status as keyof typeof statusColors]}>
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.items ? `${order.items.length} item(s)` : '0 items'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsItemsViewDialogOpen(true)
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          
                          {order.status !== 'closed' && order.status !== 'cancelled' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setIsFormOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order)
                                  setIsStatusDialogOpen(true)
                                }}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              
                              {order.status === 'delivered' && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={isClosingOrder}
                                  onClick={() => {
                                    setSelectedOrder(order)
                                    setIsPaymentDialogOpen(true)
                                  }}
                                >
                                  {isClosingOrder ? 'Fechando...' : 'Fechar'}
                                </Button>
                              )}
                            </>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar Encomenda</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem a certeza que deseja eliminar esta encomenda? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteOrder(order)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SpecialOrderForm
          order={selectedOrder}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setSelectedOrder(undefined)
          }}
          onSubmit={handleSubmitOrder}
        />
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        {selectedOrder && (
          <StatusUpdateDialog
            order={selectedOrder}
            isOpen={isStatusDialogOpen}
            onClose={() => {
              setIsStatusDialogOpen(false)
            }}
            onUpdate={handleStatusUpdate}
          />
        )}
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        {selectedOrder && (
          <PaymentReminderDialog
            order={selectedOrder}
            isOpen={isPaymentDialogOpen}
            onClose={() => {
              setIsPaymentDialogOpen(false)
              setSelectedOrder(undefined)
            }}
            onConfirm={() => handleCloseOrder(selectedOrder)}
          />
        )}
      </Dialog>

      <Dialog open={isItemsViewDialogOpen} onOpenChange={setIsItemsViewDialogOpen}>
        {selectedOrder && (
          <OrderItemsViewDialog
            order={selectedOrder}
            isOpen={isItemsViewDialogOpen}
            onClose={() => {
              setIsItemsViewDialogOpen(false)
              setSelectedOrder(undefined)
            }}
            onEdit={() => {
              setIsItemsViewDialogOpen(false)
              setIsFormOpen(true)
            }}
          />
        )}
      </Dialog>
    </div>
  )
}
