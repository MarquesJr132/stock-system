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

  // Health check for real connectivity with retry logic
  const checkRealConnectivity = useCallback(async (retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    const baseTimeout = 800;
    const timeout = baseTimeout + (retryCount * 500); // Exponential backoff
    
    if (!navigator.onLine) {
      console.debug('Navigator offline, skipping connectivity check');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const SUPABASE_URL = "https://fkthdlbljhhjutuywepc.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrdGhkbGJsamhoanV0dXl3ZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MTIwMDgsImV4cCI6MjA3MDA4ODAwOH0.nOAh8oTgWmg5GLT15QmYhPfIM80w5WmX6fpwD3XyR7Y";
      
      console.debug(`Connectivity check attempt ${retryCount + 1}/${maxRetries + 1}, timeout: ${timeout}ms`);
      
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/`,
        {
          method: 'HEAD',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      const isConnected = response.status < 500;
      console.debug(`Connectivity check result: ${isConnected ? 'online' : 'offline'} (status: ${response.status})`);
      return isConnected;
    } catch (error) {
      console.debug(`Connectivity check failed (attempt ${retryCount + 1}):`, error);
      
      // Retry with exponential backoff if we haven't exceeded max retries
      if (retryCount < maxRetries && (error as any).name !== 'AbortError') {
        console.debug(`Retrying connectivity check in ${(retryCount + 1) * 500}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
        return checkRealConnectivity(retryCount + 1);
      }
      
      return false;
    }
  }, []);

  // Update online status with real connectivity check
  useEffect(() => {
    const updateConnectivity = async () => {
      const isReallyOnline = await checkRealConnectivity();
      setSyncStatus(prev => ({ ...prev, isOnline: isReallyOnline }));
    };

    const handleOnline = () => {
      console.debug('Navigator online event');
      updateConnectivity();
    };
    
    const handleOffline = () => {
      console.debug('Navigator offline event');
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Initial check
    updateConnectivity();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic health check every 30 seconds
    const healthCheckInterval = setInterval(updateConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(healthCheckInterval);
    };
  }, [checkRealConnectivity]);

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
            // Handle sales with items idempotently using client-assigned ID
            const { sale_items, ...saleData } = data as any;
            const providedId = (saleData as any).id || ((typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

            let insertedNew = false;
            let effectiveSaleId = providedId;

            const { data: createdSale, error: insertError } = await supabase
              .from('sales')
              .insert({ id: providedId, ...saleData, tenant_id })
              .select()
              .single();

            if (insertError) {
              // If duplicate key, the sale already exists – continue without failing
              if ((insertError as any).code === '23505' || (insertError as any).message?.toLowerCase?.().includes('duplicate')) {
                insertedNew = false;
              } else {
                throw insertError;
              }
            } else if (createdSale) {
              insertedNew = true;
              effectiveSaleId = createdSale.id;
            }

            // Replace sale items to avoid duplicates
            await supabase
              .from('sale_items')
              .delete()
              .eq('sale_id', effectiveSaleId)
              .eq('tenant_id', tenant_id);

            if (sale_items?.length > 0) {
              const itemsWithSaleId = sale_items.map((item: any) => ({
                ...item,
                sale_id: effectiveSaleId,
                tenant_id
              }));
              await supabase.from('sale_items').insert(itemsWithSaleId);

              // Only update product quantities if we actually inserted a new sale record
              if (insertedNew) {
                for (const item of sale_items) {
                  await supabase.rpc('atomic_stock_update', {
                    p_product_id: item.product_id,
                    p_quantity_change: -item.quantity,
                    p_tenant_id: tenant_id
                  });
                }
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