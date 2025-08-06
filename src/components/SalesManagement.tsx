
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, ShoppingCart, CreditCard, Banknote, Users, Printer } from "lucide-react";
import { useStockData, SaleItem } from "@/hooks/useStockData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatCurrency, formatDateTime } from "@/lib/currency";
import SaleItemForm from "./SaleItemForm";
import jsPDF from 'jspdf';

const SalesManagement = () => {
  const { products, customers, sales, addSale } = useStockData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    items: [] as SaleItem[],
    customerId: "",
    paymentMethod: "cash" as "cash" | "card" | "credit",
  });

  const filteredSales = sales.filter(sale => {
    const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
    const searchLower = searchTerm.toLowerCase();
    
    const hasMatchingProduct = sale.items.some(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.name.toLowerCase().includes(searchLower);
    });
    
    return (
      hasMatchingProduct ||
      customer?.name.toLowerCase().includes(searchLower) ||
      sale.paymentMethod.toLowerCase().includes(searchLower)
    );
  });

  const resetForm = () => {
    setFormData({
      items: [],
      customerId: "",
      paymentMethod: "cash"
    });
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  
  // Calculate totals
  const totalAmount = formData.items.reduce((sum, item) => sum + item.total, 0);
  const totalVATAmount = formData.items.reduce((sum, item) => sum + item.vatAmount, 0);
  const totalProfit = formData.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (item.quantity * (item.unitPrice - (product?.purchasePrice || 0)));
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      toast.error("Adicione pelo menos um produto à venda");
      return;
    }

    // Validate each item
    for (const item of formData.items) {
      if (!item.productId || item.quantity <= 0) {
        toast.error("Todos os produtos devem ter produto selecionado e quantidade válida");
        return;
      }

      const product = products.find(p => p.id === item.productId);
      if (!product) {
        toast.error("Produto não encontrado");
        return;
      }

      if (item.quantity > product.quantity) {
        toast.error(`Quantidade insuficiente em stock para ${product.name}`);
        return;
      }
    }

    if (formData.paymentMethod === "credit" && !formData.customerId) {
      toast.error("Selecione um cliente para vendas a crédito");
      return;
    }

    if (formData.paymentMethod === "credit" && selectedCustomer) {
      const newDebt = selectedCustomer.currentDebt + totalAmount;
      if (newDebt > selectedCustomer.creditLimit) {
        toast.error("Esta venda excederia o limite de crédito do cliente");
        return;
      }
    }

    const saleData = {
      items: formData.items,
      customerId: formData.paymentMethod === "credit" ? formData.customerId : undefined,
      totalAmount,
      totalProfit,
      totalVATAmount,
      paymentMethod: formData.paymentMethod
    };

    addSale(saleData);
    toast.success("Venda registrada com sucesso!");
    setDialogOpen(false);
    resetForm();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'credit': return <Users className="h-4 w-4" />;
      default: return <Banknote className="h-4 w-4" />;
    }
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'credit': return 'Crédito';
      default: return method;
    }
  };

  const generateSalePDF = (sale: any) => {
    const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
    
    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(20);
    pdf.text('FACTURA DE VENDA', 105, 30, { align: 'center' });
    
    // Company info
    pdf.setFontSize(12);
    pdf.text('Sua Empresa Lda.', 20, 50);
    pdf.text('Endereço da empresa', 20, 60);
    pdf.text('Telefone: +258 XXX XXX XXX', 20, 70);
    pdf.text('Email: empresa@email.com', 20, 80);
    
    // Sale info
    pdf.text(`Factura Nº: ${sale.id}`, 120, 50);
    pdf.text(`Data: ${formatDateTime(sale.createdAt)}`, 120, 60);
    pdf.text(`Método: ${getPaymentLabel(sale.paymentMethod)}`, 120, 70);
    
    // Customer info
    if (customer) {
      pdf.text('CLIENTE:', 20, 100);
      pdf.text(`Nome: ${customer.name}`, 20, 110);
      pdf.text(`Email: ${customer.email}`, 20, 120);
      pdf.text(`Telefone: ${customer.phone}`, 20, 130);
    } else {
      pdf.text('CLIENTE: Cliente Anónimo', 20, 100);
    }
    
    // Table header
    pdf.setFontSize(10);
    pdf.text('PRODUTO', 20, 150);
    pdf.text('QTD', 80, 150);
    pdf.text('PREÇO UNIT.', 100, 150);
    pdf.text('IVA', 130, 150);
    pdf.text('TOTAL', 160, 150);
    
    pdf.line(20, 155, 190, 155);
    
    // Products
    let yPosition = 165;
    sale.items.forEach((item: SaleItem) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        pdf.text(product.name, 20, yPosition);
        pdf.text(item.quantity.toString(), 80, yPosition);
        pdf.text(formatCurrency(item.unitPrice), 100, yPosition);
        pdf.text(item.includesVAT ? 'Sim' : 'Não', 130, yPosition);
        pdf.text(formatCurrency(item.total), 160, yPosition);
        yPosition += 10;
      }
    });
    
    pdf.line(20, yPosition, 190, yPosition);
    yPosition += 15;
    
    // Footer totals
    pdf.setFontSize(12);
    if (sale.totalVATAmount > 0) {
      const subtotal = sale.totalAmount - sale.totalVATAmount;
      pdf.text(`SUBTOTAL: ${formatCurrency(subtotal)}`, 120, yPosition);
      yPosition += 10;
      pdf.text(`IVA TOTAL: ${formatCurrency(sale.totalVATAmount)}`, 120, yPosition);
      yPosition += 10;
    }
    
    pdf.text(`TOTAL: ${formatCurrency(sale.totalAmount)}`, 120, yPosition);
    
    // Footer
    pdf.setFontSize(8);
    pdf.text('Obrigado pela sua preferência!', 105, 250, { align: 'center' });
    pdf.text('Esta factura foi gerada automaticamente.', 105, 260, { align: 'center' });
    
    pdf.save(`factura_${sale.id}.pdf`);
    toast.success("PDF gerado com sucesso!");
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
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>Registar Nova Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <SaleItemForm
                products={products}
                items={formData.items}
                onChange={(items) => setFormData(prev => ({ ...prev, items }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value: any) => 
                    setFormData(prev => ({ ...prev, paymentMethod: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentMethod === "credit" && (
                  <div>
                    <Label htmlFor="customerId">Cliente *</Label>
                    <Select value={formData.customerId} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, customerId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - Limite: {formatCurrency(customer.creditLimit)} 
                            (Dívida: {formatCurrency(customer.currentDebt)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {formData.items.length > 0 && (
                <Card className="bg-slate-50 dark:bg-slate-800">
                  <CardContent className="pt-4">
                    <h4 className="font-medium mb-3">Resumo da Venda</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totalAmount - totalVATAmount)}</span>
                      </div>
                      {totalVATAmount > 0 && (
                        <div className="flex justify-between">
                          <span>IVA Total:</span>
                          <span>{formatCurrency(totalVATAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Lucro Total:</span>
                          <span>{formatCurrency(totalProfit)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" className="flex-1 min-h-[44px]">
                  Registar Venda
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 sm:flex-initial min-h-[44px]"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
      <div className="space-y-4">
        {filteredSales.map((sale) => {
          const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
          
          return (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-slate-400" />
                      <h3 className="font-medium text-slate-800 dark:text-slate-100">
                        Venda #{sale.id}
                      </h3>
                      <Badge variant="outline">{sale.items.length} produto(s)</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {sale.items.map((item, index) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={index} className="text-sm bg-slate-50 dark:bg-slate-800 p-2 rounded">
                            <div className="flex justify-between">
                              <span>{product?.name || "Produto não encontrado"}</span>
                              <span>{item.quantity}x {formatCurrency(item.unitPrice)}</span>
                            </div>
                            {item.includesVAT && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                IVA: {formatCurrency(item.vatAmount)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Total</p>
                        <p className="font-medium">{formatCurrency(sale.totalAmount)}</p>
                      </div>
                      {sale.totalVATAmount > 0 && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">IVA Total</p>
                          <p className="font-medium">{formatCurrency(sale.totalVATAmount)}</p>
                        </div>
                      )}
                      {isAdmin && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Lucro</p>
                          <p className="font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(sale.totalProfit)}
                          </p>
                        </div>
                      )}
                    </div>

                    {customer && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                        <p className="text-blue-700 dark:text-blue-300">
                          Cliente: {customer.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="text-left sm:text-right flex-1 sm:flex-initial">
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(sale.paymentMethod)}
                        <Badge variant={sale.paymentMethod === 'credit' ? 'secondary' : 'default'}>
                          {getPaymentLabel(sale.paymentMethod)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateSalePDF(sale)}
                      className="flex items-center gap-2 w-full sm:w-auto min-h-[44px]"
                    >
                      <Printer className="h-4 w-4" />
                      <span className="sm:hidden">Imprimir </span>PDF
                    </Button>
                  </div>
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
    </div>
  );
};

export default SalesManagement;
