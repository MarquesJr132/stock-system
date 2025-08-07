import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Eye } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/currency";

interface InvoicePreviewProps {
  sale: any;
  products: any[];
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF: () => void;
}

const InvoicePreview = ({ sale, products, customers, isOpen, onClose, onGeneratePDF }: InvoicePreviewProps) => {
  if (!sale) return null;

  const customer = sale.customer_id ? customers.find(c => c.id === sale.customer_id) : null;
  
  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'credit': return 'Crédito';
      default: return method;
    }
  };

  const getPaymentStatusColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-500';
      case 'card': return 'bg-blue-500';
      case 'credit': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="invoice-preview-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Pré-visualização da Factura
          </DialogTitle>
          <p id="invoice-preview-description" className="text-sm text-muted-foreground">
            Visualize a factura antes de gerar o PDF final.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="gradient-primary p-6 rounded-lg text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">SISTEMA DE STOCK</h1>
                <p className="text-lg font-medium">FACTURA DE VENDA</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(sale.payment_method)} text-white`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  {getPaymentLabel(sale.payment_method)}
                </div>
              </div>
            </div>
          </div>

          {/* Company and Customer Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <h3 className="font-bold text-primary mb-3">EMPRESA:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Sistema de Gestão de Stock Lda.</p>
                  <p className="text-muted-foreground">Maputo, Moçambique</p>
                  <p className="text-muted-foreground">Tel: +258 84 123 4567</p>
                  <p className="text-muted-foreground">Email: info@stocksystem.co.mz</p>
                  <p className="text-muted-foreground">NUIT: 123456789</p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <h3 className="font-bold text-primary mb-3">DETALHES DA FACTURA:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factura Nº:</span>
                    <span className="font-medium">#{sale.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data:</span>
                    <span className="font-medium">{formatDateTime(sale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <Badge variant="outline">{getPaymentLabel(sale.payment_method)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gerado em:</span>
                    <span className="font-medium">{new Date().toLocaleString('pt-MZ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Info */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <h3 className="font-bold text-primary mb-3">CLIENTE:</h3>
              {customer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{customer.name}</span></p>
                    <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{customer.email}</span></p>
                  </div>
                  <div>
                    <p><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{customer.phone}</span></p>
                    <p><span className="text-muted-foreground">Endereço:</span> <span className="font-medium">{customer.address}</span></p>
                  </div>
                  {sale.payment_method === 'credit' && (
                    <div className="md:col-span-2 mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><span className="text-muted-foreground">Limite Crédito:</span> <span className="font-medium text-accent">{formatCurrency(customer.creditLimit)}</span></p>
                        <p><span className="text-muted-foreground">Dívida Actual:</span> <span className="font-medium text-orange-600">{formatCurrency(customer.currentDebt)}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <p>Cliente Anónimo</p>
                  <p className="text-sm">Sem informações adicionais</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="gradient-primary p-4 text-white">
                <h3 className="font-bold">PRODUTOS</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-3 font-medium">PRODUTO</th>
                      <th className="text-center p-3 font-medium">QTD</th>
                      <th className="text-right p-3 font-medium">PREÇO UNIT.</th>
                      <th className="text-center p-3 font-medium">IVA</th>
                      <th className="text-right p-3 font-medium">SUBTOTAL</th>
                      <th className="text-right p-3 font-medium">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Since sale items are stored separately, we'll show a message for now */}
                    <tr className="border-t">
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <p>Os itens da venda são carregados separadamente.</p>
                        <p className="text-sm mt-1">Esta funcionalidade será implementada na próxima atualização.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="shadow-card">
            <CardContent className="p-0">
              <div className="p-4 space-y-3">
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SUBTOTAL:</span>
                    <span className="font-medium">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                  </div>
                )}
                
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-sm text-accent">
                    <span>IVA TOTAL:</span>
                    <span className="font-medium">{formatCurrency(sale.total_vat_amount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="gradient-primary p-3 rounded-lg text-white">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">TOTAL:</span>
                      <span className="text-xl font-bold">{formatCurrency(sale.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground space-y-2 border-t pt-4">
            <p className="font-medium">Obrigado pela sua preferência!</p>
            <p>Esta factura foi gerada automaticamente pelo Sistema de Stock.</p>
            <div className="inline-block px-4 py-2 bg-muted/50 rounded-lg">
              <p className="text-xs opacity-75">ORIGINAL</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              onClick={onGeneratePDF}
              className="gradient-primary hover:opacity-90 transition-smooth flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Fechar Pré-visualização
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;