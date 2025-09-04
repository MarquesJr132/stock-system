import { useState, useEffect, useRef } from 'react';
import { Search, Filter, History, X, Save, Folder, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGlobalSearch, SearchResult, SearchFilter } from '@/hooks/useGlobalSearch';
import { useMicroInteractions } from '@/hooks/useMicroInteractions';

interface GlobalSearchProps {
  onResultSelect?: (result: SearchResult) => void;
}

export const GlobalSearch = ({ onResultSelect }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterType, setNewFilterType] = useState('');
  const [newFilterValue, setNewFilterValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
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
  } = useGlobalSearch();

  const { triggerSuccess } = useMicroInteractions();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query || activeFilters.length > 0) {
        search(query, activeFilters);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, activeFilters]);

  const handleResultClick = (result: SearchResult) => {
    triggerSuccess(`Selecionado: ${result.title}`);
    onResultSelect?.(result);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  const handleAddFilter = () => {
    if (newFilterName && newFilterType && newFilterValue) {
      addFilter({
        id: Date.now().toString(),
        name: newFilterName,
        type: newFilterType,
        value: newFilterValue
      });
      setNewFilterName('');
      setNewFilterType('');
      setNewFilterValue('');
    }
  };

  const handleSaveFilter = () => {
    if (newFilterName && activeFilters.length > 0) {
      saveFilter(newFilterName, activeFilters);
      setNewFilterName('');
    }
  };

  const filterTypes = [
    { value: 'table', label: 'Tabela' },
    { value: 'date', label: 'Data' },
    { value: 'status', label: 'Estado' },
    { value: 'category', label: 'Categoria' }
  ];

  const tableOptions = [
    { value: 'products', label: 'Produtos' },
    { value: 'customers', label: 'Clientes' },
    { value: 'sales', label: 'Vendas' },
    { value: 'quotations', label: 'Cotações' },
    { value: 'suppliers', label: 'Fornecedores' }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Pesquisar produtos, clientes, vendas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-16 h-12"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="h-8 w-8 p-0"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 w-8 p-0"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {activeFilters.map((filter) => (
            <Badge key={filter.id} variant="secondary" className="gap-1">
              {filter.name}: {filter.value}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(filter.id)}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 text-xs"
          >
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Search History */}
      {showHistory && searchHistory.length > 0 && (
        <Card className="mt-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Histórico de Pesquisa</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearchHistory}
                className="text-xs"
              >
                Limpar
              </Button>
            </div>
            <div className="space-y-1">
              {searchHistory.map((historyQuery, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleHistoryClick(historyQuery)}
                  className="w-full justify-start h-8 text-sm"
                >
                  <History className="h-3 w-3 mr-2" />
                  {historyQuery}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mt-2">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Add New Filter */}
              <div>
                <h3 className="text-sm font-medium mb-3">Adicionar Filtro</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Nome"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    className="text-sm"
                  />
                  <Select value={newFilterType} onValueChange={setNewFilterType}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newFilterType === 'table' ? (
                    <Select value={newFilterValue} onValueChange={setNewFilterValue}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Valor" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Valor"
                      value={newFilterValue}
                      onChange={(e) => setNewFilterValue(e.target.value)}
                      className="text-sm"
                    />
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={!newFilterName || !newFilterType || !newFilterValue}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>

              <Separator />

              {/* Save Current Filter */}
              {activeFilters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Salvar Filtro Atual</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do filtro"
                      value={newFilterName}
                      onChange={(e) => setNewFilterName(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveFilter}
                      disabled={!newFilterName}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Salvar
                    </Button>
                  </div>
                </div>
              )}

              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Filtros Salvos</h3>
                  <div className="space-y-1">
                    {savedFilters.map((filter) => (
                      <div key={filter.id} className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadFilter(filter.id)}
                          className="flex-1 justify-start h-8 text-sm"
                        >
                          <Folder className="h-3 w-3 mr-2" />
                          {filter.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFilter(filter.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {query && (
        <Card className="mt-2">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Pesquisando...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-3">
                  Resultados ({results.length})
                </h3>
                {results.map((result) => (
                  <Button
                    key={`${result.type}-${result.id}`}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResultClick(result)}
                    className="w-full justify-start h-auto p-3 text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                        <span className="font-medium">{result.title}</span>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};