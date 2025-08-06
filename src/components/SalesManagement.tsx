
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
import InvoicePreview from "./InvoicePreview";
import jsPDF from 'jspdf';

const SalesManagement = () => {
  const { products, customers, sales, addSale } = useStockData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
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
    
    // Add colors and styling
    const primaryColor: [number, number, number] = [34, 59, 93]; // Dark blue
    const accentColor: [number, number, number] = [59, 130, 246]; // Blue
    const grayColor: [number, number, number] = [107, 114, 128]; // Gray
    
    // Header with company logo area (you can add actual logo later)
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 45, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SISTEMA DE STOCK', 105, 25, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('FACTURA DE VENDA', 105, 35, { align: 'center' });
    
    // Company info section
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EMPRESA:', 20, 60);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text('Sistema de Gestão de Stock Lda.', 20, 68);
    pdf.text('Maputo, Moçambique', 20, 75);
    pdf.text('Tel: +258 84 123 4567', 20, 82);
    pdf.text('Email: info@stocksystem.co.mz', 20, 89);
    pdf.text('NUIT: 123456789', 20, 96);
    
    // Invoice details box
    pdf.setFillColor(248, 250, 252);
    pdf.rect(120, 55, 70, 45, 'F');
    
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DETALHES DA FACTURA:', 125, 63);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Factura Nº: #${sale.id}`, 125, 71);
    pdf.text(`Data: ${formatDateTime(sale.createdAt)}`, 125, 78);
    pdf.text(`Método: ${getPaymentLabel(sale.paymentMethod)}`, 125, 85);
    
    // Payment status indicator
    const statusColor: [number, number, number] = sale.paymentMethod === 'cash' ? [34, 197, 94] : 
                       sale.paymentMethod === 'card' ? [59, 130, 246] : [245, 158, 11];
    pdf.setFillColor(...statusColor);
    pdf.circle(125, 93, 2, 'F');
    pdf.text(`Status: ${getPaymentLabel(sale.paymentMethod)}`, 130, 95);
    
    // Customer info section
    let customerYStart = 115;
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CLIENTE:', 20, customerYStart);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    if (customer) {
      pdf.text(`Nome: ${customer.name}`, 20, customerYStart + 8);
      pdf.text(`Email: ${customer.email}`, 20, customerYStart + 15);
      pdf.text(`Telefone: ${customer.phone}`, 20, customerYStart + 22);
      pdf.text(`Endereço: ${customer.address}`, 20, customerYStart + 29);
      if (sale.paymentMethod === 'credit') {
        pdf.setTextColor(...accentColor);
        pdf.text(`Limite Crédito: ${formatCurrency(customer.creditLimit)}`, 20, customerYStart + 36);
        pdf.text(`Dívida Actual: ${formatCurrency(customer.currentDebt)}`, 20, customerYStart + 43);
      }
    } else {
      pdf.text('Cliente Anónimo', 20, customerYStart + 8);
      pdf.text('Sem informações adicionais', 20, customerYStart + 15);
    }
    
    // Products table
    const tableYStart = customer && sale.paymentMethod === 'credit' ? 175 : 155;
    
    // Table header
    pdf.setFillColor(...primaryColor);
    pdf.rect(20, tableYStart, 170, 12, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRODUTO', 25, tableYStart + 8);
    pdf.text('QTD', 85, tableYStart + 8);
    pdf.text('PREÇO UNIT.', 105, tableYStart + 8);
    pdf.text('IVA', 135, tableYStart + 8);
    pdf.text('SUBTOTAL', 155, tableYStart + 8);
    pdf.text('TOTAL', 175, tableYStart + 8);
    
    // Products rows
    let yPosition = tableYStart + 20;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    sale.items.forEach((item: SaleItem, index: number) => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(20, yPosition - 5, 170, 10, 'F');
        }
        
        // Product name (truncate if too long)
        const productName = product.name.length > 20 ? 
          product.name.substring(0, 17) + '...' : product.name;
        
        pdf.text(productName, 25, yPosition);
        pdf.text(item.quantity.toString(), 88, yPosition);
        pdf.text(formatCurrency(item.unitPrice), 105, yPosition);
        
        // IVA indicator with color
        if (item.includesVAT) {
          pdf.setTextColor(...accentColor);
          pdf.text('Sim', 137, yPosition);
          pdf.setTextColor(0, 0, 0);
        } else {
          pdf.setTextColor(...grayColor);
          pdf.text('Não', 137, yPosition);
          pdf.setTextColor(0, 0, 0);
        }
        
        pdf.text(formatCurrency(item.subtotal), 155, yPosition);
        pdf.text(formatCurrency(item.total), 175, yPosition);
        
        yPosition += 12;
      }
    });
    
    // Table border
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.rect(20, tableYStart, 170, yPosition - tableYStart);
    
    // Totals section
    yPosition += 10;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(120, yPosition, 70, 35, 'F');
    
    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    if (sale.totalVATAmount > 0) {
      const subtotal = sale.totalAmount - sale.totalVATAmount;
      pdf.text(`SUBTOTAL:`, 125, yPosition + 8);
      pdf.text(`${formatCurrency(subtotal)}`, 170, yPosition + 8, { align: 'right' });
      
      pdf.setTextColor(...accentColor);
      pdf.text(`IVA TOTAL:`, 125, yPosition + 16);
      pdf.text(`${formatCurrency(sale.totalVATAmount)}`, 170, yPosition + 16, { align: 'right' });
      yPosition += 8;
    }
    
    // Total with emphasis
    pdf.setFillColor(...primaryColor);
    pdf.rect(120, yPosition + 16, 70, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL:`, 125, yPosition + 24);
    pdf.text(`${formatCurrency(sale.totalAmount)}`, 185, yPosition + 24, { align: 'right' });
    
    // Footer section
    yPosition += 45;
    pdf.setTextColor(...grayColor);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Obrigado pela sua preferência!', 105, yPosition, { align: 'center' });
    pdf.text('Esta factura foi gerada automaticamente pelo Sistema de Stock.', 105, yPosition + 8, { align: 'center' });
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-MZ')}`, 105, yPosition + 16, { align: 'center' });
    
    // Add watermark
    pdf.setTextColor(240, 240, 240);
    pdf.setFontSize(48);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ORIGINAL', 105, 150, { align: 'center', angle: 45 });
    
    // Save with better filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Factura_${sale.id}_${timestamp}.pdf`;
    pdf.save(filename);
    toast.success("Factura PDF gerada com sucesso!");
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4" aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>Registar Nova Venda</DialogTitle>
              <p id="dialog-description" className="text-sm text-muted-foreground">
                Selecione produtos, defina quantidades e método de pagamento para registar uma nova venda.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <SaleItemForm
                products={products}
                items={formData.items}
                onChange={(items) => setFormData(prev => ({ ...prev, items }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Cliente (Opcional)</Label>
                  <Select value={formData.customerId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, customerId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem cliente</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - Limite: {formatCurrency(customer.creditLimit)} 
                          (Dívida: {formatCurrency(customer.currentDebt)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              {formData.paymentMethod === "credit" && !formData.customerId && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Para vendas a crédito, selecione um cliente acima.
                  </p>
                </div>
              )}

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
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSale(sale);
                          setPreviewOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="hidden sm:inline">Pré-visualizar</span>
                      </Button>
                    </div>
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

      <InvoicePreview
        sale={selectedSale}
        products={products}
        customers={customers}
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedSale(null);
        }}
        onGeneratePDF={() => {
          if (selectedSale) {
            generateSalePDF(selectedSale);
            setPreviewOpen(false);
          }
        }}
      />
    </div>
  );
};

export default SalesManagement;
