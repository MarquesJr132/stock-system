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
  nuit: string | null;
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

export interface TenantLimits {
  id: string;
  tenant_id: string;
  monthly_data_limit: number;
  current_month_usage: number;
  monthly_user_limit: number;
  current_month_users: number;
  limit_period_start: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DataUsageLog {
  id: string;
  tenant_id: string;
  data_type: string;
  action_type: string;
  created_at: string;
  created_by: string;
}

export interface CompanySettings {
  id: string;
  tenant_id: string;
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  nuit: string | null;
  created_at: string;
  updated_at: string;
}

export const useSupabaseData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [tenantLimits, setTenantLimits] = useState<TenantLimits | null>(null);
  const [dataUsage, setDataUsage] = useState<DataUsageLog[]>([]);
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
        fetchSaleItems(),
        fetchCompanySettings(),
        fetchTenantLimits(),
        fetchDataUsage()
      ]);
    } catch (error) {
      console.error('Error fetching all data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar alguns dados. Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }
    
    setProducts(data || []);
  };

  const fetchCustomers = async () => {
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return;
    }
    
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

  const fetchSaleItemsBySaleId = async (saleId: string) => {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);

    if (error) {
      console.error('Error fetching sale items:', error);
      return [];
    }
    return data || [];
  };

  const fetchCompanySettings = async () => {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching company settings:', error);
      }
      return;
    }
    setCompanySettings(data);
  };

  const fetchTenantLimits = async () => {
    const { data } = await supabase
      .from('tenant_limits')
      .select('*')
      .eq('tenant_id', profile?.tenant_id || profile?.id)
      .single();
    
    setTenantLimits(data);
  };

  const fetchDataUsage = async () => {
    const { data } = await supabase
      .from('data_usage_log')
      .select('*')
      .eq('tenant_id', profile?.tenant_id || profile?.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    setDataUsage(data || []);
  };

  // CRUD operations for products
  const addProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'created_by' | 'tenant_id'>) => {
    if (!profile) return { error: 'User not authenticated' };

    // Check data limit before creating
    const tenantId = profile.tenant_id || profile.id;
    const limitCheck = await checkDataLimit(tenantId);
    
    if (!limitCheck.canCreate) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite mensal de dados. Entre em contato com o seu administrador para aumentar o limite.",
        variant: "destructive",
      });
      return { error: 'Data limit exceeded' };
    }

    const newProduct = {
      ...productData,
      created_by: profile.id,
      tenant_id: tenantId,
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

    // Check data limit before creating
    const tenantId = profile.tenant_id || profile.id;
    const limitCheck = await checkDataLimit(tenantId);
    
    if (!limitCheck.canCreate) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite mensal de dados. Entre em contato com o seu administrador para aumentar o limite.",
        variant: "destructive",
      });
      return { error: 'Data limit exceeded' };
    }

    const newCustomer = {
      ...customerData,
      created_by: profile.id,
      tenant_id: tenantId,
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

  // CRUD operations for sales
  const addSale = async (saleData: {
    customer_id: string | null;
    payment_method: string;
    total_amount: number;
    total_profit: number;
    total_vat_amount: number;
    items: any[];
  }) => {
    if (!profile) return { error: 'User not authenticated' };

    // Check data limit before creating
    const tenantId = profile.tenant_id || profile.id;
    const limitCheck = await checkDataLimit(tenantId);
    
    if (!limitCheck.canCreate) {
      toast({
        title: "Limite Atingido",
        description: "Você atingiu o limite mensal de dados. Entre em contato com o seu administrador para aumentar o limite.",
        variant: "destructive",
      });
      return { error: 'Data limit exceeded' };
    }

    try {
      // First, create the sale
      const newSale = {
        customer_id: saleData.customer_id,
        payment_method: saleData.payment_method,
        total_amount: saleData.total_amount,
        total_profit: saleData.total_profit,
        total_vat_amount: saleData.total_vat_amount,
        created_by: profile.id,
        tenant_id: tenantId,
      };

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([newSale])
        .select()
        .single();

      if (saleError) {
        console.error('Error creating sale:', saleError);
        throw saleError;
      }

      // Then, create the sale items
      const saleItems = saleData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        total: item.total,
        vat_amount: item.vat_amount || 0,
        includes_vat: item.includes_vat || false,
        tenant_id: profile.tenant_id || profile.id,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Error creating sale items:', itemsError);
        throw itemsError;
      }

      // Update product quantities
      for (const item of saleData.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ 
              quantity: product.quantity - item.quantity 
            })
            .eq('id', item.product_id);
        }
      }

      // Refresh data
      await fetchAllData();

      toast({
        title: "Sucesso",
        description: "Venda registrada com sucesso",
      });
      return { data: sale };
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao registrar venda: " + error.message,
        variant: "destructive",
      });
      return { error: error.message };
    }
  };

  const updateSale = async (saleId: string, saleData: any) => {
    if (!profile) return { error: 'User not authenticated' };

    try {
      // First, delete existing sale items
      await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);

      // Update the sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .update({
          customer_id: saleData.customer_id,
          payment_method: saleData.payment_method,
          total_amount: saleData.total_amount,
          total_profit: saleData.total_profit,
          total_vat_amount: saleData.total_vat_amount,
        })
        .eq('id', saleId)
        .select()
        .single();

      if (saleError) {
        console.error('Error updating sale:', saleError);
        throw saleError;
      }

      // Create new sale items
      const saleItems = saleData.items.map((item: any) => ({
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        total: item.total,
        vat_amount: item.vat_amount || 0,
        includes_vat: item.includes_vat || false,
        tenant_id: profile.tenant_id || profile.id,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Error creating sale items:', itemsError);
        throw itemsError;
      }

      // Refresh data
      await fetchAllData();

      toast({
        title: "Sucesso",
        description: "Venda atualizada com sucesso",
      });
      return { data: sale };
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar venda: " + error.message,
        variant: "destructive",
      });
      return { error: error.message };
    }
  };

  const updateCompanySettings = async (settingsData: Partial<CompanySettings>) => {
    if (!profile) return { error: 'User not authenticated' };

    // First try to update existing settings
    const { data: existingData } = await supabase
      .from('company_settings')
      .select('id')
      .eq('tenant_id', profile.tenant_id || profile.id)
      .single();

    let result;
    if (existingData) {
      // Update existing
      result = await supabase
        .from('company_settings')
        .update(settingsData)
        .eq('tenant_id', profile.tenant_id || profile.id)
        .select()
        .single();
    } else {
      // Create new
      const newSettings = {
        ...settingsData,
        tenant_id: profile.tenant_id || profile.id,
      };
      result = await supabase
        .from('company_settings')
        .insert([newSettings])
        .select()
        .single();
    }

    const { data, error } = result;

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações da empresa",
        variant: "destructive",
      });
      return { error: error.message };
    }

    setCompanySettings(data);
    toast({
      title: "Sucesso",
      description: "Configurações da empresa atualizadas com sucesso",
    });
    return { data };
  };

  const updateTenantLimits = async (tenantId: string, limitsData: Partial<TenantLimits>) => {
    if (!profile?.role || profile.role !== 'superuser') {
      return { error: 'Apenas superusers podem alterar limites' };
    }

    try {
      
      
      // Use a direct update with ON CONFLICT to avoid race conditions
      const { data, error } = await supabase
        .from('tenant_limits')
        .update(limitsData)
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error updating tenant limits:', error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar limites do tenant: " + error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      if (!data) {
        // No record was updated, this means it doesn't exist - create it
        const { data: insertData, error: insertError } = await supabase
          .from('tenant_limits')
          .insert({
            tenant_id: tenantId,
            ...limitsData,
            created_by: profile.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting tenant limits:', insertError);
          toast({
            title: "Erro",
            description: "Erro ao criar limites do tenant: " + insertError.message,
            variant: "destructive",
          });
          return { error: insertError.message };
        }

        toast({
          title: "Sucesso",
          description: "Limites do tenant criados com sucesso",
        });
        return { data: insertData };
      }

      
      toast({
        title: "Sucesso",
        description: "Limites do tenant atualizados com sucesso",
      });
      return { data };
    } catch (error: any) {
      console.error('Unexpected error updating tenant limits:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao atualizar limites",
        variant: "destructive",
      });
      return { error: error.message || 'Erro inesperado' };
    }
  };

  const getAllTenantLimits = async () => {
    if (!profile?.role || profile.role !== 'superuser') {
      
      return { error: 'Apenas superusers podem ver todos os limites' };
    }

    
    const { data, error } = await supabase
      .from('tenant_limits')
      .select(`
        *
      `)
      .order('created_at', { ascending: false });

    
    if (error) {
      console.error('Error fetching tenant limits:', error);
      return { error: error.message };
    }

    return { data };
  };

  const checkUserLimit = async (tenantId: string) => {
    try {
      
      const { data, error } = await supabase
        .rpc('check_user_limit', {
          tenant_uuid: tenantId
        });

      
      if (error) {
        console.error('Error checking user limit:', error);
        return { canCreate: false, error: error.message };
      }

      return { canCreate: data };
    } catch (error: any) {
      console.error('Exception checking user limit:', error);
      return { canCreate: false, error: error.message };
    }
  };

  const checkDataLimit = async (tenantId: string) => {
    try {
      
      const { data, error } = await supabase
        .rpc('check_data_limit', {
          tenant_uuid: tenantId,
          data_type_param: 'check'
        });

      
      if (error) {
        console.error('Error checking data limit:', error);
        return { canCreate: false, error: error.message };
      }

      return { canCreate: data };
    } catch (error: any) {
      console.error('Exception checking data limit:', error);
      return { canCreate: false, error: error.message };
    }
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

  const getCurrentMonthSales = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return sales
      .filter(sale => new Date(sale.created_at) >= firstDay)
      .reduce((total, sale) => total + sale.total_amount, 0);
  };

  const getCurrentMonthProfit = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return sales
      .filter(sale => new Date(sale.created_at) >= firstDay)
      .reduce((total, sale) => total + sale.total_profit, 0);
  };

  const getCurrentMonthSalesQuantity = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return sales.filter(sale => new Date(sale.created_at) >= firstDay).length;
  };

  return {
    // Data
    products,
    customers,
    sales,
    saleItems,
    companySettings,
    tenantLimits,
    dataUsage,
    loading,
    
    // CRUD operations
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addSale,
    updateSale,
    fetchSaleItemsBySaleId,
    updateCompanySettings,
    updateTenantLimits,
    getAllTenantLimits,
    checkDataLimit,
    checkUserLimit,
    
    // Helper functions
    getTotalStock,
    getLowStockProducts,
    getTotalValue,
    getDailyProfit,
    getSalesData,
    getTopSellingProducts,
    getCurrentMonthSales,
    getCurrentMonthProfit,
    getCurrentMonthSalesQuantity
  };
};