import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Eye } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/currency";
import { useSupabaseData, SaleItem } from "@/hooks/useSupabaseData";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoicePreviewProps {
  sale: any;
  products: any[];
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF: () => void;
}

const InvoicePreview = ({ sale, products, customers, isOpen, onClose, onGeneratePDF }: InvoicePreviewProps) => {
  const { fetchSaleItemsBySaleId } = useSupabaseData();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sale?.id && isOpen) {
      loadSaleItems();
    }
  }, [sale?.id, isOpen]);

  const loadSaleItems = async () => {
    if (!sale?.id) return;
    setLoading(true);
    try {
      const items = await fetchSaleItemsBySaleId(sale.id);
      setSaleItems(items);
    } catch (error) {
      console.error('Error loading sale items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!sale) return null;

  const customer = sale.customer_id ? customers.find(c => c.id === sale.customer_id) : null;
  
  const getPaymentLabel = (method: string) => {
    const methods: Record<string, string> = {
      'Dinheiro': 'Dinheiro',
      'Cartão': 'Cartão',
      'Transferência': 'Transferência',
      'Mpesa': 'Mpesa'
    };
    return methods[method] || method;
  };

  const formatPaymentMethod = getPaymentLabel;

  const generatePDF = async () => {
    try {
      const element = document.getElementById('invoice-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`factura-${sale.id.slice(-8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const getPaymentStatusColor = (method: string) => {
    switch (method) {
      case 'Dinheiro': return 'bg-green-500';
      case 'Cartão': return 'bg-blue-500';
      case 'Transferência': return 'bg-purple-500';
      case 'Mpesa': return 'bg-orange-500';
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

        <div id="invoice-content" className="space-y-6 bg-white p-6"  style={{ color: '#000' }}>
          {/* Invoice Header */}
          <div className="bg-blue-600 p-6 rounded-lg text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">SISTEMA DE STOCK</h1>
                <p className="text-lg font-medium">FACTURA DE VENDA</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(sale.payment_method)} text-white`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  {formatPaymentMethod(sale.payment_method)}
                </div>
              </div>
            </div>
          </div>

          {/* Company and Customer Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-blue-600 mb-3">EMPRESA:</h3>
                <div className="space-y-1 text-sm text-black">
                  <p className="font-medium">Sistema de Gestão de Stock Lda.</p>
                  <p className="text-gray-600">Maputo, Moçambique</p>
                  <p className="text-gray-600">Tel: +258 84 123 4567</p>
                  <p className="text-gray-600">Email: info@stocksystem.co.mz</p>
                  <p className="text-gray-600">NUIT: 123456789</p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <h3 className="font-bold text-blue-600 mb-3">DETALHES DA FACTURA:</h3>
                <div className="space-y-2 text-sm text-black">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Factura Nº:</span>
                    <span className="font-medium">#{sale.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-medium">{formatDateTime(sale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método:</span>
                    <Badge variant="outline" className="text-black">{formatPaymentMethod(sale.payment_method)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gerado em:</span>
                    <span className="font-medium">{new Date().toLocaleString('pt-MZ')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Info */}
          <Card className="border border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-bold text-blue-600 mb-3">CLIENTE:</h3>
              {customer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-black">
                  <div>
                    <p><span className="text-gray-600">Nome:</span> <span className="font-medium">{customer.name}</span></p>
                    <p><span className="text-gray-600">Email:</span> <span className="font-medium">{customer.email || 'N/A'}</span></p>
                  </div>
                  <div>
                    <p><span className="text-gray-600">Telefone:</span> <span className="font-medium">{customer.phone || 'N/A'}</span></p>
                    <p><span className="text-gray-600">Endereço:</span> <span className="font-medium">{customer.address || 'N/A'}</span></p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">
                  <p>Cliente Anónimo</p>
                  <p className="text-sm">Sem informações adicionais</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              <div className="bg-blue-600 p-4 text-white">
                <h3 className="font-bold">PRODUTOS</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-black">PRODUTO</th>
                      <th className="text-center p-3 font-medium text-black">QTD</th>
                      <th className="text-right p-3 font-medium text-black">PREÇO UNIT.</th>
                      <th className="text-center p-3 font-medium text-black">IVA</th>
                      <th className="text-right p-3 font-medium text-black">SUBTOTAL</th>
                      <th className="text-right p-3 font-medium text-black">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr className="border-t">
                        <td colSpan={6} className="p-8 text-center text-gray-600">
                          <p>Carregando itens da venda...</p>
                        </td>
                      </tr>
                    ) : saleItems.length > 0 ? (
                      saleItems.map((item, index) => {
                        const product = products.find(p => p.id === item.product_id);
                        return (
                          <tr key={index} className={`border-t ${index % 2 === 0 ? 'bg-gray-25' : ''}`}>
                            <td className="p-3 text-black">
                              <div>
                                <p className="font-medium">{product?.name || "Produto não encontrado"}</p>
                                {product?.description && (
                                  <p className="text-xs text-gray-600 mt-1">{product.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-medium text-black">{item.quantity}</td>
                            <td className="p-3 text-right text-black">{formatCurrency(item.unit_price)}</td>
                            <td className="p-3 text-center">
                              {item.includes_vat ? (
                                <Badge variant="default" className="text-xs bg-green-500 text-white">Sim</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-gray-400 text-black">Não</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right text-black">{formatCurrency(item.subtotal)}</td>
                            <td className="p-3 text-right font-medium text-black">{formatCurrency(item.total)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-t">
                        <td colSpan={6} className="p-8 text-center text-gray-600">
                          <p>Nenhum item encontrado para esta venda.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="border border-gray-200">
            <CardContent className="p-0">
              <div className="p-4 space-y-3">
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">SUBTOTAL:</span>
                    <span className="font-medium text-black">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                  </div>
                )}
                
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>IVA TOTAL:</span>
                    <span className="font-medium">{formatCurrency(sale.total_vat_amount)}</span>
                  </div>
                )}
                
                <div className="border-t pt-3">
                  <div className="bg-blue-600 p-3 rounded-lg text-white">
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
          <div className="text-center text-sm text-gray-600 space-y-2 border-t pt-4">
            <p className="font-medium">Obrigado pela sua preferência!</p>
            <p>Esta factura foi gerada automaticamente pelo Sistema de Stock.</p>
            <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg">
              <p className="text-xs opacity-75 text-black">ORIGINAL</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            onClick={generatePDF}
            className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
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
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreview;