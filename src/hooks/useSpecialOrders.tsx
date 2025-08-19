import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'

export interface SpecialOrder {
  id: string
  tenant_id: string
  customer_id?: string
  supplier_id?: string
  product_name: string
  product_description?: string
  quantity: number
  unit_price: number
  total_amount: number
  advance_payment?: number
  status: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  payment_method?: string
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
  // Relations
  customer?: { name: string }
  supplier?: { name: string }
}

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
}

export interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
}

export const useSpecialOrders = () => {
  const { user, profile } = useAuth()
  const [specialOrders, setSpecialOrders] = useState<SpecialOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSpecialOrders = async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('special_orders')
        .select(`
          *,
          customer:customers(name),
          supplier:suppliers(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSpecialOrders(data || [])
    } catch (error) {
      console.error('Error fetching special orders:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar encomendas",
        variant: "destructive"
      })
    }
  }

  const fetchCustomers = async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .order('name', { ascending: true })

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchSuppliers = async () => {
    if (!profile?.id) return

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, email, phone')
        .order('name', { ascending: true })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchSpecialOrders(),
      fetchCustomers(),
      fetchSuppliers()
    ])
    setLoading(false)
  }

  useEffect(() => {
    if (user && profile?.id) {
      fetchAllData()
    }
  }, [user, profile?.id])

  const addSpecialOrder = async (orderData: Omit<SpecialOrder, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'created_by'>) => {
    if (!profile?.id || !profile.tenant_id) return

    try {
      const { data, error } = await supabase
        .from('special_orders')
        .insert([{
          ...orderData,
          tenant_id: profile.tenant_id,
          created_by: profile.id
        }])
        .select()
        .single()

      if (error) throw error

      await fetchSpecialOrders()
      toast({
        title: "Sucesso",
        description: "Encomenda criada com sucesso"
      })

      return data
    } catch (error) {
      console.error('Error adding special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao criar encomenda",
        variant: "destructive"
      })
      throw error
    }
  }

  const updateSpecialOrder = async (id: string, updates: Partial<SpecialOrder>) => {
    try {
      const { error } = await supabase
        .from('special_orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchSpecialOrders()
      toast({
        title: "Sucesso",
        description: "Encomenda atualizada com sucesso"
      })
    } catch (error) {
      console.error('Error updating special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar encomenda",
        variant: "destructive"
      })
      throw error
    }
  }

  const deleteSpecialOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('special_orders')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchSpecialOrders()
      toast({
        title: "Sucesso",
        description: "Encomenda eliminada com sucesso"
      })
    } catch (error) {
      console.error('Error deleting special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao eliminar encomenda",
        variant: "destructive"
      })
      throw error
    }
  }

  const closeSpecialOrder = async (order: SpecialOrder) => {
    if (!profile?.id || !profile.tenant_id) return

    try {
      // First update the special order status to closed
      await updateSpecialOrder(order.id, {
        status: 'closed',
        actual_delivery_date: new Date().toISOString().split('T')[0]
      })

      // Create a sale from the special order
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          tenant_id: profile.tenant_id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          total_profit: order.total_amount - (order.total_amount * 0.7), // Estimate profit
          total_vat_amount: 0,
          payment_method: order.payment_method || 'cash',
          created_by: profile.id
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale item
      const { error: saleItemError } = await supabase
        .from('sale_items')
        .insert([{
          tenant_id: profile.tenant_id,
          sale_id: saleData.id,
          product_id: null, // Special order doesn't have product_id
          quantity: order.quantity,
          unit_price: order.unit_price,
          subtotal: order.total_amount,
          total: order.total_amount,
          vat_amount: 0,
          includes_vat: false
        }])

      if (saleItemError) throw saleItemError

      toast({
        title: "Sucesso",
        description: "Encomenda fechada e convertida em venda"
      })

      await fetchSpecialOrders()
    } catch (error) {
      console.error('Error closing special order:', error)
      toast({
        title: "Erro",
        description: "Erro ao fechar encomenda",
        variant: "destructive"
      })
      throw error
    }
  }

  const getStatusStats = () => {
    const stats = {
      pending: 0,
      ordered: 0,
      in_transit: 0,
      received: 0,
      delivered: 0,
      closed: 0,
      cancelled: 0
    }

    specialOrders.forEach(order => {
      if (stats.hasOwnProperty(order.status)) {
        stats[order.status as keyof typeof stats]++
      }
    })

    return stats
  }

  return {
    specialOrders,
    customers,
    suppliers,
    loading,
    addSpecialOrder,
    updateSpecialOrder,
    deleteSpecialOrder,
    closeSpecialOrder,
    getStatusStats,
    refetch: fetchAllData
  }
}