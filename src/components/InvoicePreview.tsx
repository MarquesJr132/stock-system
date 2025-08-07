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
          <div className="bg-slate-800 p-6 rounded-lg text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">SISTEMA DE STOCK</h1>
                <p className="text-lg font-medium">FACTURA DE VENDA</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-white text-slate-800">
                  <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                  {formatPaymentMethod(sale.payment_method)}
                </div>
              </div>
            </div>
          </div>

          {/* Company and Customer Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card className="border-2 border-slate-800">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">EMPRESA:</h3>
                <div className="space-y-1 text-sm text-slate-800">
                  <p className="font-medium text-base">Sistema de Gestão de Stock Lda.</p>
                  <p>Maputo, Moçambique</p>
                  <p>Tel: +258 84 123 4567</p>
                  <p>Email: info@stocksystem.co.mz</p>
                  <p>NUIT: 123456789</p>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="border-2 border-slate-800">
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-800 mb-3 text-lg">DETALHES DA FACTURA:</h3>
                <div className="space-y-2 text-sm text-slate-800">
                  <div className="flex justify-between">
                    <span className="font-medium">Factura Nº:</span>
                    <span className="font-bold">#{sale.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Data:</span>
                    <span className="font-bold">{formatDateTime(sale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Método:</span>
                    <span className="font-bold bg-slate-800 text-white px-2 py-1 rounded text-xs">{formatPaymentMethod(sale.payment_method)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Gerado em:</span>
                    <span className="font-bold">{new Date().toLocaleString("pt-MZ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Info */}
          <Card className="border-2 border-slate-800">
            <CardContent className="p-4">
              <h3 className="font-bold text-slate-800 mb-3 text-lg">CLIENTE:</h3>
              {customer ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-800">
                  <div>
                    <p><span className="font-medium">Nome:</span> <span className="font-bold">{customer.name}</span></p>
                    <p><span className="font-medium">Email:</span> <span className="font-bold">{customer.email || "N/A"}</span></p>
                  </div>
                  <div>
                    <p><span className="font-medium">Telefone:</span> <span className="font-bold">{customer.phone || "N/A"}</span></p>
                    <p><span className="font-medium">Endereço:</span> <span className="font-bold">{customer.address || "N/A"}</span></p>
                  </div>
                </div>
              ) : (
                <div className="text-slate-800">
                  <p className="font-bold">Cliente Anónimo</p>
                  <p className="text-sm">Sem informações adicionais</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="border-2 border-slate-800">
            <CardContent className="p-0">
              <div className="bg-slate-800 p-4 text-white">
                <h3 className="font-bold text-lg">PRODUTOS</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-white border-b-2 border-slate-800">
                      <th className="text-left p-4 font-bold text-slate-800 border-r border-slate-300">PRODUTO</th>
                      <th className="text-center p-4 font-bold text-slate-800 border-r border-slate-300">QTD</th>
                      <th className="text-right p-4 font-bold text-slate-800 border-r border-slate-300">PREÇO UNIT.</th>
                      <th className="text-center p-4 font-bold text-slate-800 border-r border-slate-300">IVA</th>
                      <th className="text-right p-4 font-bold text-slate-800 border-r border-slate-300">SUBTOTAL</th>
                      <th className="text-right p-4 font-bold text-slate-800">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr className="border-b border-slate-300">
                        <td colSpan={6} className="p-8 text-center text-slate-800">
                          <p className="font-medium">Carregando itens da venda...</p>
                        </td>
                      </tr>
                    ) : saleItems.length > 0 ? (
                      saleItems.map((item, index) => {
                        const product = products.find(p => p.id === item.product_id);
                        return (
                          <tr key={index} className="border-b border-slate-300">
                            <td className="p-4 text-slate-800 border-r border-slate-300">
                              <div>
                                <p className="font-bold text-base">{product?.name || "Produto não encontrado"}</p>
                                {product?.description && (
                                  <p className="text-sm text-slate-600 mt-1">{product.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-slate-800 border-r border-slate-300 text-base">{item.quantity}</td>
                            <td className="p-4 text-right text-slate-800 font-bold border-r border-slate-300 text-base">{formatCurrency(item.unit_price)}</td>
                            <td className="p-4 text-center border-r border-slate-300">
                              {item.includes_vat ? (
                                <span className="bg-slate-800 text-white px-2 py-1 rounded text-xs font-bold">SIM</span>
                              ) : (
                                <span className="border border-slate-800 text-slate-800 px-2 py-1 rounded text-xs font-bold">NÃO</span>
                              )}
                            </td>
                            <td className="p-4 text-right text-slate-800 font-bold border-r border-slate-300 text-base">{formatCurrency(item.subtotal)}</td>
                            <td className="p-4 text-right font-bold text-slate-800 text-base">{formatCurrency(item.total)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-b border-slate-300">
                        <td colSpan={6} className="p-8 text-center text-slate-800">
                          <p className="font-medium">Nenhum item encontrado para esta venda.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card className="border-2 border-slate-800">
            <CardContent className="p-0">
              <div className="p-6 space-y-4">
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-slate-800">SUBTOTAL:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                  </div>
                )}
                
                {sale.total_vat_amount > 0 && (
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-slate-800">IVA TOTAL:</span>
                    <span className="font-bold text-slate-800">{formatCurrency(sale.total_vat_amount)}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-slate-800 pt-4">
                  <div className="bg-slate-800 p-4 rounded-lg text-white">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">TOTAL:</span>
                      <span className="text-3xl font-bold">{formatCurrency(sale.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-slate-800 space-y-3 border-t-2 border-slate-800 pt-6">
            <p className="font-bold text-lg">Obrigado pela sua preferência!</p>
            <p className="font-medium">Esta factura foi gerada automaticamente pelo Sistema de Stock.</p>
            <div className="inline-block px-4 py-2 bg-slate-800 text-white rounded-lg">
              <p className="text-sm font-bold">ORIGINAL</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button 
            onClick={generatePDF}
            className="bg-slate-800 hover:bg-slate-700 text-white flex-1"
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