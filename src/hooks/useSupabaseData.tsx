import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Updated interfaces to match Supabase schema
export interface Product {
  id: string;
  name: string;
  category: string | null;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  min_stock: number | null;
  description: string | null;
  supplier: string | null;
  created_at: string;
  created_by: string;
  tenant_id: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  created_by: string;
  tenant_id: string;
}

export interface Sale {
  id: string;
  customer_id: string | null;
  total_amount: number;
  total_profit: number;
  total_vat_amount: number;
  payment_method: string;
  created_at: string;
  created_by: string;
  tenant_id: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  total: number;
  vat_amount: number;
  includes_vat: boolean;
  tenant_id: string;
  // For form compatibility
  productId?: string;
  unitPrice?: number;
  vatAmount?: number;
  includesVAT?: boolean;
}

export const useSupabaseData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Fetch all data when user is authenticated
  useEffect(() => {
    if (user && profile) {
      fetchAllData();
    }
  }, [user, profile]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchSales(),
        fetchSaleItems()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    console.log('Fetching products for user:', profile?.email, 'tenant:', profile?.tenant_id || profile?.id);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
    console.log('Products fetched:', data?.length, 'products for tenant');
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    console.log('Fetching customers for user:', profile?.email, 'tenant:', profile?.tenant_id || profile?.id);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
    console.log('Customers fetched:', data?.length, 'customers for tenant');
    setCustomers(data || []);
  };

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
    setSales(data || []);
  };

  const fetchSaleItems = async () => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sale items:', error);
      throw error;
    }
    setSaleItems(data || []);
  };

  // CRUD operations for products
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'created_by' | 'tenant_id'>) => {
    if (!profile) return { error: 'User not authenticated' };

    const newProduct = {
      ...productData,
      created_by: profile.id,
      tenant_id: profile.tenant_id || profile.id,
    };

    const { data, error } = await supabase
      .from('products')
      .insert([newProduct])
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar produto",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setProducts(prev => [data, ...prev]);
    toast({
      title: "Sucesso",
      description: "Produto criado com sucesso",
    });
    return { data };
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setProducts(prev => prev.map(p => p.id === id ? data : p));
    toast({
      title: "Sucesso",
      description: "Produto atualizado com sucesso",
    });
    return { data };
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao eliminar produto",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setProducts(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Sucesso",
      description: "Produto eliminado com sucesso",
    });
    return { data: true };
  };

  // CRUD operations for customers
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'created_at' | 'created_by' | 'tenant_id'>) => {
    if (!profile) return { error: 'User not authenticated' };

    const newCustomer = {
      ...customerData,
      created_by: profile.id,
      tenant_id: profile.tenant_id || profile.id,
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar cliente",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setCustomers(prev => [data, ...prev]);
    toast({
      title: "Sucesso",
      description: "Cliente criado com sucesso",
    });
    return { data };
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar cliente",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setCustomers(prev => prev.map(c => c.id === id ? data : c));
    toast({
      title: "Sucesso",
      description: "Cliente atualizado com sucesso",
    });
    return { data };
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao eliminar cliente",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setCustomers(prev => prev.filter(c => c.id !== id));
    toast({
      title: "Sucesso",
      description: "Cliente eliminado com sucesso",
    });
    return { data: true };
  };

  // Helper functions for data analysis
  const getTotalStock = () => {
    return products.reduce((total, product) => total + product.quantity, 0);
  };

  const getTotalValue = () => {
    return products.reduce((total, product) => total + (product.purchase_price * product.quantity), 0);
  };

  const getDailyProfit = () => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(sale => sale.created_at.startsWith(today))
      .reduce((total, sale) => total + sale.total_profit, 0);
  };

  const getLowStockProducts = () => {
    return products.filter(product => 
      product.min_stock && product.quantity <= product.min_stock
    );
  };

  const getTopSellingProducts = () => {
    const productSales = new Map();
    
    saleItems.forEach(item => {
      const current = productSales.get(item.product_id) || 0;
      productSales.set(item.product_id, current + item.quantity);
    });

    return products
      .map(product => ({
        ...product,
        totalSold: productSales.get(product.id) || 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  };

  const getSalesData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTotal = sales
        .filter(sale => sale.created_at.startsWith(dateStr))
        .reduce((total, sale) => total + sale.total_amount, 0);
      
      last7Days.push({
        date: dateStr,
        amount: dayTotal
      });
    }
    return last7Days;
  };

  return {
    // Data
    products,
    customers,
    sales,
    saleItems,
    loading,
    
    // CRUD operations
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // Helper functions
    getTotalStock,
    getTotalValue,
    getDailyProfit,
    getLowStockProducts,
    getTopSellingProducts,
    getSalesData,
    
    // Refresh function
    fetchAllData,
  };
};