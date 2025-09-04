import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'product' | 'customer' | 'sale' | 'quotation' | 'supplier';
  data: any;
  relevance: number;
}

export interface SavedFilter {
  id: string;
  name: string;
  query: string;
  filters: {
    type?: string[];
    dateRange?: { start: Date; end: Date };
    priceRange?: { min: number; max: number };
  };
  created_at: string;
}

export const useGlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<{
    type?: string[];
    dateRange?: { start: Date; end: Date };
    priceRange?: { min: number; max: number };
  }>({});

  const { profile } = useAuth();
  const { toast } = useToast();

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    const filters = localStorage.getItem('savedFilters');
    if (filters) {
      setSavedFilters(JSON.parse(filters));
    }
  }, []);

  // Save search to history
  const addToHistory = (searchQuery: string) => {
    if (!searchQuery.trim() || searchHistory.includes(searchQuery)) return;
    
    const newHistory = [searchQuery, ...searchHistory.slice(0, 9)]; // Keep last 10
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
  };

  // Save filter
  const saveFilter = (name: string) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      query,
      filters: activeFilters,
      created_at: new Date().toISOString()
    };

    const newFilters = [newFilter, ...savedFilters];
    setSavedFilters(newFilters);
    localStorage.setItem('savedFilters', JSON.stringify(newFilters));

    toast({
      title: "Filtro salvo",
      description: `Filtro "${name}" foi salvo com sucesso`
    });
  };

  // Load saved filter
  const loadFilter = (filter: SavedFilter) => {
    setQuery(filter.query);
    setActiveFilters(filter.filters);
    performSearch(filter.query, filter.filters);
  };

  // Delete saved filter
  const deleteFilter = (filterId: string) => {
    const newFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(newFilters);
    localStorage.setItem('savedFilters', JSON.stringify(newFilters));
  };

  // Perform search
  const performSearch = async (searchQuery: string, filters = activeFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const tenantId = profile?.tenant_id || profile?.id;

    try {
      const searchResults: SearchResult[] = [];

      // Search products
      if (!filters.type || filters.type.includes('product')) {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.%${searchQuery}%, description.ilike.%${searchQuery}%, barcode.ilike.%${searchQuery}%`);

        products?.forEach(product => {
          const relevance = calculateRelevance(searchQuery, [product.name, product.description, product.barcode]);
          searchResults.push({
            id: product.id,
            title: product.name,
            subtitle: `€${product.sale_price} - Stock: ${product.quantity}`,
            type: 'product',
            data: product,
            relevance
          });
        });
      }

      // Search customers
      if (!filters.type || filters.type.includes('customer')) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%, phone.ilike.%${searchQuery}%`);

        customers?.forEach(customer => {
          const relevance = calculateRelevance(searchQuery, [customer.name, customer.email, customer.phone]);
          searchResults.push({
            id: customer.id,
            title: customer.name,
            subtitle: customer.email || customer.phone || 'Cliente',
            type: 'customer',
            data: customer,
            relevance
          });
        });
      }

      // Search sales
      if (!filters.type || filters.type.includes('sale')) {
        const { data: sales } = await supabase
          .from('sales')
          .select('*, customers(name)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50);

        sales?.forEach(sale => {
          const customerName = (sale as any).customers?.name || 'Cliente sem nome';
          if (customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              sale.total_amount.toString().includes(searchQuery)) {
            searchResults.push({
              id: sale.id,
              title: `Venda - ${customerName}`,
              subtitle: `€${sale.total_amount} - ${new Date(sale.created_at).toLocaleDateString()}`,
              type: 'sale',
              data: sale,
              relevance: calculateRelevance(searchQuery, [customerName, sale.total_amount.toString()])
            });
          }
        });
      }

      // Search quotations
      if (!filters.type || filters.type.includes('quotation')) {
        const { data: quotations } = await supabase
          .from('quotations')
          .select('*, customers(name)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(50);

        quotations?.forEach(quotation => {
          const customerName = (quotation as any).customers?.name || 'Cliente sem nome';
          if (customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              quotation.quotation_number?.includes(searchQuery)) {
            searchResults.push({
              id: quotation.id,
              title: `Cotação ${quotation.quotation_number || 'Sem número'}`,
              subtitle: `${customerName} - €${quotation.total_amount}`,
              type: 'quotation',
              data: quotation,
              relevance: calculateRelevance(searchQuery, [customerName, quotation.quotation_number || ''])
            });
          }
        });
      }

      // Search suppliers
      if (!filters.type || filters.type.includes('supplier')) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%, contact_person.ilike.%${searchQuery}%`);

        suppliers?.forEach(supplier => {
          const relevance = calculateRelevance(searchQuery, [supplier.name, supplier.email, supplier.contact_person]);
          searchResults.push({
            id: supplier.id,
            title: supplier.name,
            subtitle: supplier.contact_person || supplier.email || 'Fornecedor',
            type: 'supplier',
            data: supplier,
            relevance
          });
        });
      }

      // Sort by relevance
      searchResults.sort((a, b) => b.relevance - a.relevance);
      setResults(searchResults);
      addToHistory(searchQuery);

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Erro na pesquisa",
        description: "Falha ao realizar a pesquisa",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate search relevance
  const calculateRelevance = (query: string, fields: (string | null | undefined)[]): number => {
    let score = 0;
    const queryLower = query.toLowerCase();

    fields.forEach(field => {
      if (!field) return;
      const fieldLower = field.toLowerCase();
      
      if (fieldLower === queryLower) score += 100;
      else if (fieldLower.startsWith(queryLower)) score += 50;
      else if (fieldLower.includes(queryLower)) score += 25;
    });

    return score;
  };

  // Get search suggestions
  const suggestions = useMemo(() => {
    if (!query) return searchHistory.slice(0, 5);
    
    return searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [query, searchHistory]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    searchHistory,
    savedFilters,
    activeFilters,
    setActiveFilters,
    suggestions,
    performSearch,
    saveFilter,
    loadFilter,
    deleteFilter,
    clearHistory: () => {
      setSearchHistory([]);
      localStorage.removeItem('searchHistory');
    }
  };
};