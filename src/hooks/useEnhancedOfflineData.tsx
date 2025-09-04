import { useState, useEffect } from 'react';
import { useOfflineStorage } from './useOfflineStorage';
import { useOfflineSync } from './useOfflineSync';
import { useSupabaseData } from './useSupabaseData';

export const useEnhancedOfflineData = () => {
  const { 
    products, 
    customers, 
    sales, 
    addProduct, 
    addCustomer, 
    addSale,
    updateProduct,
    updateCustomer,
    deleteProduct,
    deleteCustomer
  } = useSupabaseData();
  
  const { syncStatus } = useOfflineSync();
  const { pendingOperations } = useOfflineStorage();

  // Validation functions for offline operations
  const validateStockForSale = (saleItems: any[]) => {
    for (const item of saleItems) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) {
        return { valid: false, error: `Produto não encontrado: ${item.product_id}` };
      }
      if (product.quantity < item.quantity) {
        return { valid: false, error: `Stock insuficiente para ${product.name}. Disponível: ${product.quantity}, Necessário: ${item.quantity}` };
      }
    }
    return { valid: true };
  };

  const getOfflineCapabilities = () => {
    return {
      canCreateSales: true,
      canCreateProducts: true,
      canCreateCustomers: true,
      canUpdateProducts: true,
      canUpdateCustomers: true,
      canDeleteProducts: !syncStatus.isOnline, // Only allow delete offline if we're sure
      canDeleteCustomers: !syncStatus.isOnline,
      stockValidation: true,
      pendingSync: pendingOperations.length > 0
    };
  };

  const getLocalStatistics = () => {
    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const totalSales = sales.length;
    
    const totalStock = products.reduce((sum, product) => sum + product.quantity, 0);
    const totalValue = products.reduce((sum, product) => sum + (product.purchase_price * product.quantity), 0);
    const lowStockProducts = products.filter(product => 
      product.quantity <= (product.min_stock || 5)
    );

    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const today = new Date();
      return saleDate.toDateString() === today.toDateString();
    });

    const todaysRevenue = todaysSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const todaysProfit = todaysSales.reduce((sum, sale) => sum + (sale.total_profit || 0), 0);

    return {
      totalProducts,
      totalCustomers,
      totalSales,
      totalStock,
      totalValue,
      lowStockProducts: lowStockProducts.length,
      todaysSales: todaysSales.length,
      todaysRevenue,
      todaysProfit,
      pendingOperations: pendingOperations.length
    };
  };

  return {
    // Data
    products,
    customers,
    sales,
    
    // Operations with offline support
    addProduct,
    addCustomer,
    addSale,
    updateProduct,
    updateCustomer,
    deleteProduct,
    deleteCustomer,
    
    // Offline specific functions
    validateStockForSale,
    getOfflineCapabilities,
    getLocalStatistics,
    
    // Status
    syncStatus,
    pendingOperations
  };
};