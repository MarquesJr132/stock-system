import { useState, useEffect } from 'react';

// IndexedDB configuration
const DB_NAME = 'StockSystemDB';
const DB_VERSION = 1;

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  tenant_id: string;
}

interface OfflineData {
  products?: any[];
  customers?: any[];
  sales?: any[];
  sale_items?: any[];
  quotations?: any[];
  quotation_items?: any[];
  company_settings?: any[];
  tenant_limits?: any[];
  special_orders?: any[];
  special_order_items?: any[];
  suppliers?: any[];
  purchase_orders?: any[];
  purchase_order_items?: any[];
  promotions?: any[];
  business_goals?: any[];
  payment_analytics?: any[];
  lastSync?: number;
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'table' });
        }

        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationsStore.createIndex('timestamp', 'timestamp');
          operationsStore.createIndex('table', 'table');
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async saveData(table: string, data: any[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');

      const request = store.put({
        table,
        data,
        timestamp: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getData(table: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');

      const request = store.get(table);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveOperation(operation: OfflineOperation): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      const request = store.put(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');

      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeOperation(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');

      const request = store.put({ key, value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['data', 'operations', 'metadata'], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore('data').clear();
      transaction.objectStore('operations').clear();
      transaction.objectStore('metadata').clear();
    });
  }
}

// Singleton instance
const offlineStorage = new OfflineStorageManager();

export const useOfflineStorage = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);

  useEffect(() => {
    const initStorage = async () => {
      try {
        await offlineStorage.init();
        setIsInitialized(true);
        
        // Load pending operations
        const operations = await offlineStorage.getPendingOperations();
        setPendingOperations(operations);
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initStorage();
  }, []);

  const saveData = async (table: string, data: any[]) => {
    await offlineStorage.saveData(table, data);
  };

  const getData = async (table: string) => {
    return await offlineStorage.getData(table);
  };

  const addPendingOperation = async (operation: Omit<OfflineOperation, 'id' | 'timestamp'>) => {
    const fullOperation: OfflineOperation = {
      ...operation,
      id: `${operation.type}_${operation.table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    await offlineStorage.saveOperation(fullOperation);
    setPendingOperations(prev => [...prev, fullOperation]);
    return fullOperation.id;
  };

  const removePendingOperation = async (id: string) => {
    await offlineStorage.removeOperation(id);
    setPendingOperations(prev => prev.filter(op => op.id !== id));
  };

  const setMetadata = async (key: string, value: any) => {
    await offlineStorage.setMetadata(key, value);
  };

  const getMetadata = async (key: string) => {
    return await offlineStorage.getMetadata(key);
  };

  const clearAllData = async () => {
    await offlineStorage.clearAllData();
    setPendingOperations([]);
  };

  return {
    isInitialized,
    pendingOperations,
    saveData,
    getData,
    addPendingOperation,
    removePendingOperation,
    setMetadata,
    getMetadata,
    clearAllData
  };
};

export default offlineStorage;