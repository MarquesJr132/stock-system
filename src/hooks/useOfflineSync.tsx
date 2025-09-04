import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineStorage, OfflineOperation } from './useOfflineStorage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncErrors: string[];
  pendingCount: number;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    syncErrors: [],
    pendingCount: 0
  });

  const { 
    pendingOperations, 
    removePendingOperation, 
    setMetadata, 
    getMetadata,
    isInitialized 
  } = useOfflineStorage();
  
  const { user } = useAuth();

  // Update online status
  useEffect(() => {
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count
  useEffect(() => {
    setSyncStatus(prev => ({ ...prev, pendingCount: pendingOperations.length }));
  }, [pendingOperations]);

  // Load last sync time
  useEffect(() => {
    if (isInitialized) {
      getMetadata('lastSync').then(lastSync => {
        if (lastSync) {
          setSyncStatus(prev => ({ ...prev, lastSync: new Date(lastSync) }));
        }
      });
    }
  }, [isInitialized, getMetadata]);

  const syncOperation = async (operation: OfflineOperation): Promise<boolean> => {
    try {
      const { type, table, data, tenant_id } = operation;

      switch (table) {
        case 'products':
          if (type === 'create') {
            await supabase.from('products').insert({ ...data, tenant_id });
          } else if (type === 'update') {
            await supabase.from('products').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('products').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'customers':
          if (type === 'create') {
            await supabase.from('customers').insert({ ...data, tenant_id });
          } else if (type === 'update') {
            await supabase.from('customers').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('customers').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'sales':
          if (type === 'create') {
            // Handle sales with items
            const { sale_items, ...saleData } = data;
            const { data: createdSale } = await supabase
              .from('sales')
              .insert({ ...saleData, tenant_id })
              .select()
              .single();

            if (createdSale && sale_items?.length > 0) {
              const itemsWithSaleId = sale_items.map((item: any) => ({
                ...item,
                sale_id: createdSale.id,
                tenant_id
              }));
              await supabase.from('sale_items').insert(itemsWithSaleId);

              // Update product quantities
              for (const item of sale_items) {
                await supabase.rpc('atomic_stock_update', {
                  p_product_id: item.product_id,
                  p_quantity_change: -item.quantity,
                  p_tenant_id: tenant_id
                });
              }
            }
          } else if (type === 'update') {
            await supabase.from('sales').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('sales').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'quotations':
          if (type === 'create') {
            const { quotation_items, ...quotationData } = data;
            const { data: createdQuotation } = await supabase
              .from('quotations')
              .insert({ ...quotationData, tenant_id })
              .select()
              .single();

            if (createdQuotation && quotation_items?.length > 0) {
              const itemsWithQuotationId = quotation_items.map((item: any) => ({
                ...item,
                quotation_id: createdQuotation.id,
                tenant_id
              }));
              await supabase.from('quotation_items').insert(itemsWithQuotationId);
            }
          } else if (type === 'update') {
            await supabase.from('quotations').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('quotations').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'special_orders':
          if (type === 'create') {
            const { special_order_items, ...orderData } = data;
            const { data: createdOrder } = await supabase
              .from('special_orders')
              .insert({ ...orderData, tenant_id })
              .select()
              .single();

            if (createdOrder && special_order_items?.length > 0) {
              const itemsWithOrderId = special_order_items.map((item: any) => ({
                ...item,
                special_order_id: createdOrder.id,
                tenant_id
              }));
              await supabase.from('special_order_items').insert(itemsWithOrderId);
            }
          } else if (type === 'update') {
            await supabase.from('special_orders').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('special_orders').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'suppliers':
          if (type === 'create') {
            await supabase.from('suppliers').insert({ ...data, tenant_id });
          } else if (type === 'update') {
            await supabase.from('suppliers').update(data).eq('id', data.id).eq('tenant_id', tenant_id);
          } else if (type === 'delete') {
            await supabase.from('suppliers').delete().eq('id', data.id).eq('tenant_id', tenant_id);
          }
          break;

        case 'company_settings':
          if (type === 'create' || type === 'update') {
            await supabase.from('company_settings').upsert({ ...data, tenant_id });
          }
          break;

        default:
          console.warn(`Sync not implemented for table: ${operation.table}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error(`Failed to sync operation for ${operation.table}:`, error);
      return false;
    }
  };

  const syncAllPendingOperations = useCallback(async () => {
    if (!syncStatus.isOnline || !user || syncStatus.isSyncing) {
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      for (const operation of pendingOperations) {
        try {
          const success = await syncOperation(operation);
          if (success) {
            await removePendingOperation(operation.id);
            successCount++;
          } else {
            errorCount++;
            errors.push(`Failed to sync ${operation.type} on ${operation.table}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`Error syncing ${operation.type} on ${operation.table}: ${error}`);
          console.error('Sync operation failed:', error);
        }
      }

      // Update last sync time
      const now = new Date();
      await setMetadata('lastSync', now.getTime());
      
      setSyncStatus(prev => ({ 
        ...prev, 
        lastSync: now,
        syncErrors: errors
      }));

      if (successCount > 0) {
        toast.success(`${successCount} operações sincronizadas com sucesso`);
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} operações falharam na sincronização`);
      }

    } catch (error) {
      console.error('Sync process failed:', error);
      toast.error('Falha no processo de sincronização');
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, user, pendingOperations, removePendingOperation, setMetadata]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (syncStatus.isOnline && pendingOperations.length > 0 && !syncStatus.isSyncing) {
      const timer = setTimeout(() => {
        syncAllPendingOperations();
      }, 1000); // Wait 1 second after coming online

      return () => clearTimeout(timer);
    }
  }, [syncStatus.isOnline, pendingOperations.length, syncStatus.isSyncing, syncAllPendingOperations]);

  const manualSync = useCallback(() => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      syncAllPendingOperations();
    } else if (!syncStatus.isOnline) {
      toast.error('Não é possível sincronizar offline');
    } else {
      toast.info('Sincronização já em andamento');
    }
  }, [syncStatus.isOnline, syncStatus.isSyncing, syncAllPendingOperations]);

  return {
    syncStatus,
    manualSync,
    syncAllPendingOperations
  };
};