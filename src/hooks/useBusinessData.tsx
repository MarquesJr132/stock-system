import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'combo';
  value: number;
  min_quantity: number;
  max_uses?: number;
  current_uses: number;
  start_date: string;
  end_date: string;
  active: boolean;
  products?: string[];
  categories?: string[];
  customer_ids?: string[];
  promo_code?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation';
  quantity: number;
  unit_cost?: number;
  reference_type?: string;
  reference_id?: string;
  from_location?: string;
  to_location?: string;
  notes?: string;
  created_at: string;
  products?: { name: string };
}

export interface ProductReservation {
  id: string;
  product_id: string;
  customer_id?: string;
  quantity: number;
  reserved_until: string;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  notes?: string;
  created_at: string;
  products?: { name: string };
  customers?: { name: string };
}

export interface StockLocation {
  id: string;
  name: string;
  type: 'warehouse' | 'store' | 'online' | 'transit';
  address?: string;
  active: boolean;
}

export interface SeasonalData {
  product_id: string;
  product_name: string;
  month: number;
  year: number;
  quantity_sold: number;
  revenue: number;
  avg_price: number;
}

export const useBusinessData = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [productReservations, setProductReservations] = useState<ProductReservation[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [seasonalData, setSeasonalData] = useState<SeasonalData[]>([]);

  // Fetch promotions
  const fetchPromotions = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Type assertion for proper typing
      const typedData = data.map((item: any) => ({
        ...item,
        type: item.type as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'combo',
        products: item.products as string[] | undefined,
        categories: item.categories as string[] | undefined,
        customer_ids: item.customer_ids as string[] | undefined
      })) as Promotion[];
      setPromotions(typedData);
    }
  };

  // Fetch stock movements
  const fetchStockMovements = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        products!inner(name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      // Type assertion for proper typing
      const typedData = data.map((item: any) => ({
        ...item,
        movement_type: item.movement_type as 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation'
      })) as StockMovement[];
      setStockMovements(typedData);
    }
  };

  // Fetch product reservations
  const fetchProductReservations = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('product_reservations')
      .select(`
        *,
        products!inner(name),
        customers(name)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Type assertion for proper typing
      const typedData = data.map((item: any) => ({
        ...item,
        status: item.status as 'active' | 'fulfilled' | 'expired' | 'cancelled'
      })) as ProductReservation[];
      setProductReservations(typedData);
    }
  };

  // Fetch stock locations
  const fetchStockLocations = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('stock_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name');

    if (!error && data) {
      // Type assertion for proper typing
      const typedData = data.map((item: any) => ({
        ...item,
        type: item.type as 'warehouse' | 'store' | 'online' | 'transit'
      })) as StockLocation[];
      setStockLocations(typedData);
    }
  };

  // Fetch seasonal analytics
  const fetchSeasonalData = async () => {
    if (!profile?.tenant_id && !profile?.id) return;
    
    const tenantId = profile.tenant_id || profile.id;
    const currentYear = new Date().getFullYear();
    
    const { data, error } = await supabase
      .from('seasonal_analytics')
      .select(`
        product_id,
        month,
        year,
        quantity_sold,
        revenue,
        avg_price,
        products!inner(name)
      `)
      .eq('tenant_id', tenantId)
      .eq('year', currentYear)
      .order('month', { ascending: true });

    if (!error && data) {
      const processedData = data.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.products?.name || 'Produto Desconhecido',
        month: item.month,
        year: item.year,
        quantity_sold: item.quantity_sold,
        revenue: item.revenue,
        avg_price: item.avg_price
      })) as SeasonalData[];
      setSeasonalData(processedData);
    }
  };

  // Create promotion
  const createPromotion = async (promotionData: Omit<Promotion, 'id' | 'current_uses'>) => {
    if (!profile?.tenant_id && !profile?.id) return null;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('promotions')
      .insert({
        ...promotionData,
        tenant_id: tenantId,
        created_by: profile.id,
        current_uses: 0
      })
      .select()
      .single();

    if (!error && data) {
      const typedData = {
        ...data,
        type: data.type as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'combo',
        products: data.products as string[] | undefined,
        categories: data.categories as string[] | undefined,
        customer_ids: data.customer_ids as string[] | undefined
      } as Promotion;
      setPromotions(prev => [typedData, ...prev]);
      return typedData;
    }
    return null;
  };

  // Create stock movement
  const createStockMovement = async (movementData: {
    product_id: string;
    movement_type: 'in' | 'out' | 'transfer' | 'adjustment' | 'reservation';
    quantity: number;
    unit_cost?: number;
    reference_type?: string;
    reference_id?: string;
    from_location?: string;
    to_location?: string;
    notes?: string;
  }) => {
    if (!profile?.tenant_id && !profile?.id) return null;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        ...movementData,
        tenant_id: tenantId,
        created_by: profile.id
      })
      .select()
      .single();

    if (!error && data) {
      await fetchStockMovements(); // Refresh the list
      return data;
    }
    return null;
  };

  // Create product reservation
  const createProductReservation = async (reservationData: {
    product_id: string;
    customer_id?: string;
    quantity: number;
    reserved_until: string;
    notes?: string;
  }) => {
    if (!profile?.tenant_id && !profile?.id) return null;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('product_reservations')
      .insert({
        ...reservationData,
        tenant_id: tenantId,
        created_by: profile.id
      })
      .select()
      .single();

    if (!error && data) {
      await fetchProductReservations(); // Refresh the list
      return data;
    }
    return null;
  };

  // Create stock location
  const createStockLocation = async (locationData: {
    name: string;
    type: 'warehouse' | 'store' | 'online' | 'transit';
    address?: string;
  }) => {
    if (!profile?.tenant_id && !profile?.id) return null;
    
    const tenantId = profile.tenant_id || profile.id;
    const { data, error } = await supabase
      .from('stock_locations')
      .insert({
        ...locationData,
        tenant_id: tenantId,
        created_by: profile.id
      })
      .select()
      .single();

    if (!error && data) {
      const typedData = {
        ...data,
        type: data.type as 'warehouse' | 'store' | 'online' | 'transit'
      } as StockLocation;
      setStockLocations(prev => [...prev, typedData]);
      return typedData;
    }
    return null;
  };

  // Update promotion
  const updatePromotion = async (id: string, updates: Partial<Promotion>) => {
    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const typedData = {
        ...data,
        type: data.type as 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'combo',
        products: data.products as string[] | undefined,
        categories: data.categories as string[] | undefined,
        customer_ids: data.customer_ids as string[] | undefined
      } as Promotion;
      setPromotions(prev => prev.map(p => p.id === id ? typedData : p));
      return typedData;
    }
    return null;
  };

  // Update reservation status
  const updateReservationStatus = async (id: string, status: 'active' | 'fulfilled' | 'expired' | 'cancelled') => {
    const { data, error } = await supabase
      .from('product_reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      setProductReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      return data;
    }
    return null;
  };

  // Get available promotions for a product
  const getAvailablePromotions = (productId: string, categoryName?: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    return promotions.filter(promo => {
      if (!promo.active) return false;
      if (promo.start_date > today || promo.end_date < today) return false;
      if (promo.max_uses && promo.current_uses >= promo.max_uses) return false;
      
      // Check if promotion applies to this product
      if (promo.products && promo.products.length > 0) {
        return promo.products.includes(productId);
      }
      
      if (promo.categories && promo.categories.length > 0 && categoryName) {
        return promo.categories.includes(categoryName);
      }
      
      // If no specific products or categories, applies to all
      return !promo.products && !promo.categories;
    });
  };

  // Calculate margin analysis
  const getMarginAnalysis = () => {
    // This would need to be integrated with sales data for complete analysis
    return seasonalData.map(item => ({
      product_name: item.product_name,
      revenue: item.revenue,
      avg_price: item.avg_price,
      margin_percentage: 0, // Would need cost data to calculate
      profit: 0 // Would need cost data to calculate
    }));
  };

  // Load all business data
  const loadBusinessData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPromotions(),
        fetchStockMovements(),
        fetchProductReservations(),
        fetchStockLocations(),
        fetchSeasonalData()
      ]);
    } catch (error) {
      console.error('Error loading business data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      loadBusinessData();
    }
  }, [profile]);

  return {
    loading,
    promotions,
    stockMovements,
    productReservations,
    stockLocations,
    seasonalData,
    createPromotion,
    createStockMovement,
    createProductReservation,
    createStockLocation,
    updatePromotion,
    updateReservationStatus,
    getAvailablePromotions,
    getMarginAnalysis,
    refreshData: loadBusinessData
  };
};