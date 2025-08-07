import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart, CreditCard, Banknote, Users, Printer } from "lucide-react";
import { useSupabaseData, SaleItem } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SaleItemForm from "./SaleItemForm";
import InvoicePreview from "./InvoicePreview";
import { formatCurrency } from "@/lib/currency";

const SalesManagement = () => {
  const { products, customers, sales, addSale } = useSupabaseData();
  const { isAdministrator } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
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

  const handleSaveSale = async () => {
    if (currentSale.items.length === 0) {
      toast.error("Adicione pelo menos um item à venda");
      return;
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

    const result = await addSale(saleData);
    
    if (result.data) {
      setDialogOpen(false);
      resetSale();
    }
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
              <Button onClick={resetSale} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Venda</DialogTitle>
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
                  <Button onClick={handleSaveSale} className="flex-1">
                    Registrar Venda
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
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

      {/* Sales List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSales.map((sale) => {
          const customer = customers.find(c => c.id === sale.customer_id);
          const customerName = getCustomerName(sale.customer_id);
          
          return (
            <Card key={sale.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Venda #{sale.id.slice(-8)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cliente: {customerName}
                    </p>
                  </div>
                   <div className="flex gap-1">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setCurrentSale({
                           customer_id: sale.customer_id || "",
                           payment_method: sale.payment_method,
                           items: []
                         });
                         setDialogOpen(true);
                       }}
                       title="Editar venda"
                     >
                       Editar
                     </Button>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setSelectedSale(sale);
                         setPreviewOpen(true);
                       }}
                       title="Gerar fatura"
                     >
                       <Printer className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(getSaleTotal(sale))}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IVA:</span>
                  <span className="text-sm">
                    {formatCurrency(sale.total_vat_amount || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lucro:</span>
                  <span className="text-sm text-green-600 font-medium">
                    {formatCurrency(sale.total_profit || 0)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <Badge variant="outline">
                    {sale.payment_method === "Dinheiro" && "💵"}
                    {sale.payment_method === "Cartão" && "💳"}
                    {sale.payment_method === "Transferência" && "🏦"}
                    {sale.payment_method === "Mpesa" && "📱"}
                    {" "}
                    {formatPaymentMethod(sale.payment_method)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString('pt-PT')}
                  </span>
                </div>
              </CardContent>
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