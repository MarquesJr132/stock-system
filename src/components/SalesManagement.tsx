import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, ShoppingCart, CreditCard, Banknote, Users, Printer, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSupabaseData, SaleItem } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SaleItemForm from "./SaleItemForm";
import InvoicePreview from "./InvoicePreview";
import { formatCurrency } from "@/lib/currency";

const SalesManagement = () => {
  const { products, customers, sales, addSale, updateSale, deleteSale, fetchSaleItemsBySaleId } = useSupabaseData();
  const { isAdministrator, isGerente } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [currentSale, setCurrentSale] = useState({
    customer_id: "",
    payment_method: "Dinheiro",
    items: [] as any[]
  });

  const filteredSales = sales.filter(sale => {
    const customer = customers.find(c => c.id === sale.customer_id);
    const customerName = customer?.name || "Cliente Geral";
    return customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           sale.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const resetSale = () => {
    setCurrentSale({
      customer_id: "",
      payment_method: "Dinheiro",
      items: []
    });
    setEditingSale(null);
  };

  const loadSaleForEdit = async (sale: any) => {
    try {
      let saleItems = await fetchSaleItemsBySaleId(sale.id);

      // Fallback: itens embutidos na venda (para vendas antigas/offline)
      if ((!saleItems || saleItems.length === 0) && Array.isArray((sale as any).sale_items) && (sale as any).sale_items.length > 0) {
        saleItems = (sale as any).sale_items.map((it: any) => ({
          ...it,
          sale_id: sale.id,
          tenant_id: sale.tenant_id
        }));
      }

      const formattedItems = saleItems.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          total: item.total,
          vat_amount: item.vat_amount,
          includes_vat: item.includes_vat
        };
      });
      
      setCurrentSale({
        customer_id: sale.customer_id || "",
        payment_method: sale.payment_method,
        items: formattedItems
      });
      setEditingSale(sale);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error loading sale for edit:', error);
      toast.error("Erro ao carregar venda para edição");
    }
  };

  const calculateTotals = () => {
    const subtotal = currentSale.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const vatAmount = currentSale.items.reduce((sum, item) => sum + (item.vat_amount || 0), 0);
    const total = currentSale.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const profit = currentSale.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        return sum + ((item.unit_price - product.purchase_price) * item.quantity);
      }
      return sum;
    }, 0);

    return { subtotal, vatAmount, total, profit };
  };

  const handleDeleteSale = async (saleId: string) => {
    try {
      const result = await deleteSale(saleId);
      if (result.data) {
        // If the expanded sale was deleted, close expansion
        if (expandedSaleId === saleId) {
          setExpandedSaleId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };

  const handleSaveSale = async () => {
    if (currentSale.items.length === 0) {
      toast.error("Adicione pelo menos um item à venda");
      return;
    }

    // Prevent double submission
    const button = document.querySelector('[data-saving]') as HTMLButtonElement;
    if (button?.disabled) return;
    if (button) {
      button.disabled = true;
      button.setAttribute('data-saving', 'true');
    }

    const totals = calculateTotals();
    
    // Create sale object
    const saleData = {
      customer_id: currentSale.customer_id || null,
      payment_method: currentSale.payment_method,
      total_amount: totals.total,
      total_profit: totals.profit,
      total_vat_amount: totals.vatAmount,
      items: currentSale.items
    };

    try {
      let result;
      if (editingSale) {
        result = await updateSale(editingSale.id, saleData);
      } else {
        result = await addSale(saleData);
      }
      
      if (result.data) {
        setDialogOpen(false);
        resetSale();
        // Auto-expand the newly created sale
        if (!editingSale && result.data) {
          setExpandedSaleId(result.data.id);
        }
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.removeAttribute('data-saving');
      }
    }
  };

  const toggleSaleExpansion = (saleId: string) => {
    setExpandedSaleId(prev => prev === saleId ? null : saleId);
  };

  const handleNewSale = () => {
    resetSale();
    // Minimize the currently expanded sale and prepare for new sale
    setExpandedSaleId(null);
  };

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'Dinheiro': 'Dinheiro',
      'Cartão': 'Cartão',
      'Transferência': 'Transferência',
      'Mpesa': 'Mpesa'
    };
    return methods[method] || method;
  };

  const getSaleTotal = (sale: any) => {
    return sale.total_amount || 0;
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Cliente Geral";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Cliente Desconhecido";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Gestão de Vendas
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Registar vendas e controlar receitas
          </p>
        </div>
        
        {isAdministrator && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewSale} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSale ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente (Opcional)</Label>
                    <Select
                      value={currentSale.customer_id || "none"}
                      onValueChange={(value) => setCurrentSale(prev => ({ ...prev, customer_id: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Cliente Geral</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Método de Pagamento</Label>
                    <Select
                      value={currentSale.payment_method}
                      onValueChange={(value) => setCurrentSale(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dinheiro">💵 Dinheiro</SelectItem>
                        <SelectItem value="Cartão">💳 Cartão</SelectItem>
                        <SelectItem value="Transferência">🏦 Transferência</SelectItem>
                        <SelectItem value="Mpesa">📱 Mpesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SaleItemForm
                  products={products}
                  items={currentSale.items}
                  onItemsChange={(items) => setCurrentSale(prev => ({ ...prev, items }))}
                />

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveSale} className="flex-1" data-saving="false">
                    {editingSale ? 'Atualizar Venda' : 'Registrar Venda'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      resetSale();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Procurar vendas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales List with Accordion */}
      <div className="space-y-4">
        {filteredSales.map((sale) => {
          const customer = customers.find(c => c.id === sale.customer_id);
          const customerName = getCustomerName(sale.customer_id);
          const isExpanded = expandedSaleId === sale.id;
          
          return (
            <Card key={sale.id} className="transition-all duration-200 hover:shadow-md">
              <Collapsible open={isExpanded} onOpenChange={() => toggleSaleExpansion(sale.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            Venda #{sale.id.slice(-8)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {customerName} • {formatCurrency(getSaleTotal(sale))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {sale.payment_method === "Dinheiro" && "💵"}
                          {sale.payment_method === "Cartão" && "💳"}
                          {sale.payment_method === "Transferência" && "🏦"}
                          {sale.payment_method === "Mpesa" && "📱"}
                          {" "}
                          {formatPaymentMethod(sale.payment_method)}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Sale Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-accent/5 rounded-lg">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                        <p className="font-semibold text-lg">{formatCurrency(getSaleTotal(sale))}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">IVA</p>
                        <p className="text-sm">{formatCurrency(sale.total_vat_amount || 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucro</p>
                        <p className="text-sm text-green-600 font-medium">{formatCurrency(sale.total_profit || 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
                        <p className="text-sm">{new Date(sale.created_at).toLocaleDateString('pt-PT')}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {(isAdministrator || isGerente) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadSaleForEdit(sale);
                          }}
                          className="flex items-center gap-2"
                        >
                          Editar Venda
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSale(sale);
                          setPreviewOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Gerar Fatura
                      </Button>
                      {(isAdministrator || isGerente) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Apagar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Eliminação</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja eliminar esta venda? Esta ação não pode ser desfeita.
                                O stock dos produtos será restaurado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSale(sale.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredSales.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              Nenhuma venda encontrada
            </h3>
            <p className="text-slate-500">
              {searchTerm 
                ? "Tente ajustar os termos de pesquisa"
                : "Registe a sua primeira venda para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invoice Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Fatura</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <InvoicePreview 
              sale={selectedSale}
              products={products}
              customers={customers}
              isOpen={previewOpen}
              onClose={() => setPreviewOpen(false)}
              onGeneratePDF={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesManagement;