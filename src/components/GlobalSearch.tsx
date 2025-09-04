import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Save, Clock, X, Package, Users, ShoppingCart, FileText, Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  compact?: boolean;
}

const typeIcons = {
  product: Package,
  customer: Users,
  sale: ShoppingCart,
  quotation: FileText,
  supplier: Truck
};

const typeLabels = {
  product: 'Produto',
  customer: 'Cliente',
  sale: 'Venda',
  quotation: 'Cotação',
  supplier: 'Fornecedor'
};

const typeColors = {
  product: 'bg-blue-500',
  customer: 'bg-green-500',
  sale: 'bg-orange-500',
  quotation: 'bg-purple-500',
  supplier: 'bg-gray-500'
};

export const GlobalSearch = ({ onResultSelect, compact = false }: GlobalSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    results,
    isLoading,
    searchHistory,
    performSearch,
  } = useGlobalSearch();

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery);
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    onResultSelect?.(result);
  };

  return (
    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Pesquisar produtos, clientes, vendas..."
          className="pl-10 pr-20"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("h-6 w-6 p-0", showFilters && "bg-accent")}
          >
            <Filter className="h-3 w-3" />
          </Button>
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('');
                performSearch('');
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum resultado encontrado para "{query}"</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </Label>
            {results.map((result) => {
              const Icon = typeIcons[result.type];
              const color = typeColors[result.type];
              
              return (
                <Card
                  key={`${result.type}-${result.id}`}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg text-white", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <Badge variant="secondary">
                        {typeLabels[result.type]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Search History */}
        {!query && searchHistory.length > 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Pesquisas Recentes</Label>
              <div className="space-y-2 mt-2">
                {searchHistory.slice(0, 5).map((item, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSearch(item)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};