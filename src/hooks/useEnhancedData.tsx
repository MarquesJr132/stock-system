import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  period_start: string;
  period_end: string;
  status: string;
  description?: string;
}

export interface PaymentAnalytics {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  month_year: string;
}

export interface ABCProduct {
  product_id: string;
  product_name: string;
  total_revenue: number;
  revenue_percentage: number;
  cumulative_percentage: number;
  abc_category: 'A' | 'B' | 'C';
}

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  total_spent: number;
  transaction_count: number;
}

export const useEnhancedData = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [businessGoals, setBusinessGoals] = useState<BusinessGoal[]>([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics[]>([]);
  const [abcProducts, setAbcProducts] = useState<ABCProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);

  // Fetch business goals
  const fetchBusinessGoals = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('business_goals')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBusinessGoals(data);
    }
  };

  // Fetch payment analytics for current month
  const fetchPaymentAnalytics = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const { data, error } = await supabase
      .from('payment_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('month_year', currentMonth);

    if (!error && data) {
      setPaymentAnalytics(data);
    }
  };

  // Fetch ABC analysis
  const fetchABCAnalysis = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .rpc('get_abc_analysis', { tenant_uuid: tenantId });

    if (!error && data) {
      // Type assertion to ensure abc_category is properly typed
      const typedData = data.map((item: any) => ({
        ...item,
        abc_category: item.abc_category as 'A' | 'B' | 'C'
      })) as ABCProduct[];
      setAbcProducts(typedData);
    }
  };

  // Fetch top customers by revenue
  const fetchTopCustomers = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    
    const { data, error } = await supabase
      .from('sales')
      .select(`
        customer_id,
        total_amount,
        customers!inner(name)
      `)
      .eq('tenant_id', tenantId)
      .not('customer_id', 'is', null);

    if (!error && data) {
      // Group by customer and calculate totals
      const customerMap = new Map<string, TopCustomer>();
      
      data.forEach((sale: any) => {
        const customerId = sale.customer_id;
        const customerName = sale.customers?.name || 'Cliente Desconhecido';
        const amount = Number(sale.total_amount);
        
        if (customerMap.has(customerId)) {
          const existing = customerMap.get(customerId)!;
          existing.total_spent += amount;
          existing.transaction_count += 1;
        } else {
          customerMap.set(customerId, {
            customer_id: customerId,
            customer_name: customerName,
            total_spent: amount,
            transaction_count: 1
          });
        }
      });
      
      // Convert to array and sort by total spent
      const sortedCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5); // Top 5
      
      setTopCustomers(sortedCustomers);
    }
  };

  // Get sales data with different periods for interactive charts
  const getSalesDataWithPeriod = async (period: '7D' | '30D' | '90D' | '1Y') => {
    if (!profile?.tenant_id && !profile?.id) return [];
    
    const tenantId = profile.tenant_id || profile.id;
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7D':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90D':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1Y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const { data, error } = await supabase
      .from('sales')
      .select('created_at, total_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    // Group by date for daily aggregation
    const dailyData = new Map<string, number>();
    
    data.forEach(sale => {
      const date = new Date(sale.created_at).toLocaleDateString('pt-PT');
      const amount = Number(sale.total_amount);
      dailyData.set(date, (dailyData.get(date) || 0) + amount);
    });

    return Array.from(dailyData.entries()).map(([date, amount]) => ({
      date,
      amount
    }));
  };

  // Create or update business goal
  const createBusinessGoal = async (goalData: Omit<BusinessGoal, 'id'>) => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('business_goals')
      .insert({
        ...goalData,
        tenant_id: tenantId,
        created_by: profile.id
      })
      .select()
      .single();

    if (!error && data) {
      setBusinessGoals(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  // Update business goal progress
  const updateGoalProgress = async (goalId: string, currentValue: number) => {
    const { data, error } = await supabase
      .from('business_goals')
      .update({ current_value: currentValue })
      .eq('id', goalId)
      .select()
      .single();

    if (!error && data) {
      setBusinessGoals(prev => 
        prev.map(goal => goal.id === goalId ? data : goal)
      );
      return data;
    }
    return null;
  };

  // Load all data
  const loadEnhancedData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBusinessGoals(),
        fetchPaymentAnalytics(),
        fetchABCAnalysis(),
        fetchTopCustomers()
      ]);
    } catch (error) {
      console.error('Error loading enhanced data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadEnhancedData();
    }
  }, [profile]);

  return {
    loading,
    businessGoals,
    paymentAnalytics,
    abcProducts,
    topCustomers,
    getSalesDataWithPeriod,
    createBusinessGoal,
    updateGoalProgress,
    refreshData: loadEnhancedData
  };
};