import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'product' | 'customer' | 'sale' | 'quotation' | 'supplier';
  data: any;
}

export interface SearchFilter {
  id: string;
  name: string;
  type: string;
  value: any;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilter[];
  createdAt: string;
}

export const useGlobalSearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const { toast } = useToast();

  // Load search history and saved filters from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    const filters = localStorage.getItem('savedFilters');
    
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
    if (filters) {
      setSavedFilters(JSON.parse(filters));
    }
  }, []);

  const saveSearchHistory = (query: string) => {
    if (!query.trim() || searchHistory.includes(query)) return;
    
    const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const search = async (query: string, filters: SearchFilter[] = []) => {
    if (!query.trim() && filters.length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const allResults: SearchResult[] = [];

    try {
      // Save search to history
      if (query.trim()) {
        saveSearchHistory(query);
      }

      // Search products
      if (!filters.find(f => f.type === 'table' && f.value !== 'products')) {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
          .limit(10);

        if (products) {
          allResults.push(...products.map(product => ({
            id: product.id,
            title: product.name,
            subtitle: `Código: ${product.barcode} - €${product.sale_price}`,
            type: 'product' as const,
            data: product
          })));
        }
      }

      // Search customers
      if (!filters.find(f => f.type === 'table' && f.value !== 'customers')) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(10);

        if (customers) {
          allResults.push(...customers.map(customer => ({
            id: customer.id,
            title: customer.name,
            subtitle: customer.email || customer.phone,
            type: 'customer' as const,
            data: customer
          })));
        }
      }

      // Search sales
      if (!filters.find(f => f.type === 'table' && f.value !== 'sales')) {
        const { data: sales } = await supabase
          .from('sales')
          .select('*, customer:customers(name)')
          .limit(10);

        if (sales) {
          allResults.push(...sales.map(sale => ({
            id: sale.id,
            title: `Venda #${sale.id.slice(-8)}`,
            subtitle: `${sale.customer?.name} - €${sale.total_amount}`,
            type: 'sale' as const,
            data: sale
          })));
        }
      }

      // Search quotations
      if (!filters.find(f => f.type === 'table' && f.value !== 'quotations')) {
        const { data: quotations } = await supabase
          .from('quotations')
          .select('*')
          .limit(10);

        if (quotations) {
          allResults.push(...quotations.map(quotation => ({
            id: quotation.id,
            title: `Cotação #${quotation.quotation_number}`,
            subtitle: `€${quotation.total_amount}`,
            type: 'quotation' as const,
            data: quotation
          })));
        }
      }

      // Search suppliers
      if (!filters.find(f => f.type === 'table' && f.value !== 'suppliers')) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%,contact_person.ilike.%${query}%`)
          .limit(10);

        if (suppliers) {
          allResults.push(...suppliers.map(supplier => ({
            id: supplier.id,
            title: supplier.name,
            subtitle: supplier.contact_person || supplier.email,
            type: 'supplier' as const,
            data: supplier
          })));
        }
      }

      setResults(allResults);
    } catch (error: any) {
      toast({
        title: "Erro na pesquisa",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFilter = (name: string, filters: SearchFilter[]) => {
    const savedFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString()
    };

    const newSavedFilters = [...savedFilters, savedFilter];
    setSavedFilters(newSavedFilters);
    localStorage.setItem('savedFilters', JSON.stringify(newSavedFilters));

    toast({
      title: "Filtro salvo",
      description: `Filtro "${name}" foi salvo com sucesso`
    });
  };

  const loadFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setActiveFilters(filter.filters);
    }
  };

  const deleteFilter = (filterId: string) => {
    const newSavedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(newSavedFilters);
    localStorage.setItem('savedFilters', JSON.stringify(newSavedFilters));
  };

  const addFilter = (filter: SearchFilter) => {
    setActiveFilters(prev => [...prev, filter]);
  };

  const removeFilter = (filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const clearFilters = () => {
    setActiveFilters([]);
  };

  return {
    isLoading,
    results,
    searchHistory,
    savedFilters,
    activeFilters,
    search,
    clearSearchHistory,
    saveFilter,
    loadFilter,
    deleteFilter,
    addFilter,
    removeFilter,
    clearFilters
  };
};