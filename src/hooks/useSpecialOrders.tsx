import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

export interface SpecialOrderItem {
  id?: string
  product_name: string
  product_description?: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface SpecialOrder {
  id: string
  customer_id?: string
  total_amount: number
  advance_payment?: number
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  status: string
  payment_method?: string
  notes?: string
  customer?: {
    id: string
    name: string
  }
  items?: SpecialOrderItem[]
}

export const useSpecialOrders = () => {
  const { profile } = useAuth()
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch special orders with their items
  const fetchSpecialOrders = async () => {
    if (!profile?.id) return
    
    try {
      const tenantId = profile.tenant_id || profile.id

      const { data: ordersData, error: ordersError } = await supabase
        .from('special_orders')
        .select(`
          *,
          customer:customers(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Fetch items for each order
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(order => order.id)
        const { data: itemsData, error: itemsError } = await supabase
          .from('special_order_items')
          .select('*')
          .in('special_order_id', orderIds)

        if (itemsError) throw itemsError

        // Group items by order
        const itemsByOrder = itemsData?.reduce((acc, item) => {
          if (!acc[item.special_order_id]) acc[item.special_order_id] = []
          acc[item.special_order_id].push(item)
          return acc
        }, {} as Record<string, any[]>) || {}

        // Merge orders with their items
        const ordersWithItems = ordersData.map(order => ({
          ...order,
          items: itemsByOrder[order.id] || []
        }))

        setSpecialOrders(ordersWithItems)
      } else {
        setSpecialOrders([])
      }

    } catch (error) {
      console.error('Error fetching special orders:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar encomendas",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch customers
  const fetchCustomers = async () => {
    if (!profile?.id) return
    
    try {
      const tenantId = profile.tenant_id || profile.id

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')

      if (error) throw error

      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  // Add special order with multiple items
  const addSpecialOrder = async (orderData: any) => {
    if (!profile?.id) return
    
    try {
      const tenantId = profile.tenant_id || profile.id

      // Calculate total amount from items
      const totalAmount = orderData.items.reduce((sum: number, item: SpecialOrderItem) => 
        sum + item.subtotal, 0)

      // Insert the order first
      const { data: orderResult, error: orderError } = await supabase
        .from('special_orders')
        .insert([{
          ...orderData,
          total_amount: totalAmount,
          tenant_id: tenantId,
          created_by: profile.id
        }])
        .select()
        .single()

      if (orderError) throw orderError

      // Insert the order items
      const itemsToInsert = orderData.items.map((item: SpecialOrderItem) => ({
        special_order_id: orderResult.id,
        product_name: item.product_name,
        product_description: item.product_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        tenant_id: tenantId
      }))

      const { error: itemsError } = await supabase
        .from('special_order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast({
        title: "Sucesso",
        description: "Encomenda criada com sucesso"
      })

      fetchSpecialOrders()
    } catch (error) {
      console.error('Error adding special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar encomenda",
        variant: "destructive"
      })
    }
  }

  // Update special order
  const updateSpecialOrder = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('special_orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Sucesso", 
        description: "Encomenda atualizada com sucesso"
      })

      fetchSpecialOrders()
    } catch (error) {
      console.error('Error updating special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar encomenda",
        variant: "destructive"
      })
    }
  }

  // Delete special order and its items
  const deleteSpecialOrder = async (id: string) => {
    try {
      // Delete items first
      const { error: itemsError } = await supabase
        .from('special_order_items')
        .delete()
        .eq('special_order_id', id)

      if (itemsError) throw itemsError

      // Then delete the order
      const { error: orderError } = await supabase
        .from('special_orders')
        .delete()
        .eq('id', id)

      if (orderError) throw orderError

      toast({
        title: "Sucesso",
        description: "Encomenda eliminada com sucesso"
      })

      fetchSpecialOrders()
    } catch (error) {
      console.error('Error deleting special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao eliminar encomenda",
        variant: "destructive"
      })
    }
  }

  // Close special order and create sale
  const closeSpecialOrder = async (order: SpecialOrder) => {
    if (!profile?.id || !order.items || order.items.length === 0) return
    
    try {
      const tenantId = profile.tenant_id || profile.id

      // Create sale with the total amount
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          payment_method: order.payment_method || 'cash',
          tenant_id: tenantId,
          created_by: profile.id
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items from order items
      const saleItems = order.items.map(item => ({
        sale_id: saleData.id,
        product_id: null, // Since these are special orders, no existing product
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        total: item.subtotal,
        tenant_id: tenantId,
        includes_vat: false,
        vat_amount: 0
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update order status to closed
      await updateSpecialOrder(order.id, { 
        status: 'closed',
        actual_delivery_date: new Date().toISOString().split('T')[0]
      })

      toast({
        title: "Sucesso",
        description: "Encomenda fechada e venda criada"
      })
    } catch (error) {
      console.error('Error closing special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao fechar encomenda",
        variant: "destructive"
      })
    }
  }

  // Get status statistics
  const getStatusStats = () => {
    return specialOrders.reduce((stats, order) => {
      stats[order.status] = (stats[order.status] || 0) + 1
      return stats
    }, {} as Record<string, number>)
  }

  useEffect(() => {
    if (profile?.id) {
      fetchSpecialOrders()
      fetchCustomers()
    }
  }, [profile?.id])

  return {
    specialOrders,
    customers,
    loading,
    addSpecialOrder,
    updateSpecialOrder,
    deleteSpecialOrder,
    closeSpecialOrder,
    getStatusStats
  }
}