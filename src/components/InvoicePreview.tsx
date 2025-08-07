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

        <div id="invoice-content" className="space-y-6 bg-white p-8" style={{ color: '#000', fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="bg-slate-700 text-white text-center py-6">
            <h1 className="text-3xl font-bold mb-2">SISTEMA DE STOCK</h1>
            <p className="text-lg">FACTURA DE VENDA</p>
          </div>

          {/* Company and Invoice Details */}
          <div className="grid grid-cols-2 gap-8 mt-8">
            {/* Company Info */}
            <div>
              <h3 className="font-bold text-slate-700 mb-4 text-lg">EMPRESA:</h3>
              <div className="space-y-1 text-sm text-black">
                <p className="font-bold">Sistema de Gestão de Stock Lda.</p>
                <p>Maputo, Moçambique</p>
                <p>Tel: +258 84 123 4567</p>
                <p>Email: info@stocksystem.co.mz</p>
                <p>NUIT: 123456789</p>
              </div>
            </div>

            {/* Invoice Details */}
            <div>
              <h3 className="font-bold text-slate-700 mb-4 text-lg">DETALHES DA FACTURA:</h3>
              <div className="space-y-1 text-sm text-black">
                <p><span className="font-semibold">Factura Nº:</span> #{sale.id.slice(-8)}</p>
                <p><span className="font-semibold">Data:</span> {formatDateTime(sale.created_at)}</p>
                <p><span className="font-semibold">Método:</span> {formatPaymentMethod(sale.payment_method)}</p>
                <div className="mt-2">
                  <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs">
                    Status: {formatPaymentMethod(sale.payment_method)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mt-8">
            <h3 className="font-bold text-slate-700 mb-4 text-lg">CLIENTE:</h3>
            {customer ? (
              <div className="grid grid-cols-2 gap-8 text-sm text-black">
                <div className="space-y-1">
                  <p><span className="font-semibold">Nome:</span> {customer.name}</p>
                  <p><span className="font-semibold">Email:</span> {customer.email || 'N/A'}</p>
                  <p><span className="font-semibold">Telefone:</span> {customer.phone || 'N/A'}</p>
                  <p><span className="font-semibold">Endereço:</span> {customer.address || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <div className="text-black">
                <p><span className="font-semibold">Nome:</span> Cliente Anônimo</p>
              </div>
            )}
          </div>

          {/* Products Table */}
          <div className="mt-8">
            <table className="w-full border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-700 text-white">
                  <th className="border border-slate-400 p-3 text-left font-bold">PRODUTO</th>
                  <th className="border border-slate-400 p-3 text-center font-bold">QTD</th>
                  <th className="border border-slate-400 p-3 text-center font-bold">PREÇO UNIT.</th>
                  <th className="border border-slate-400 p-3 text-center font-bold">IVA</th>
                  <th className="border border-slate-400 p-3 text-center font-bold">SUBTOTAL</th>
                  <th className="border border-slate-400 p-3 text-center font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="border border-slate-400 p-8 text-center text-black">
                      Carregando itens da venda...
                    </td>
                  </tr>
                ) : saleItems.length > 0 ? (
                  saleItems.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <tr key={index} className="text-black">
                        <td className="border border-slate-400 p-3">
                          <div>
                            <p className="font-semibold">{product?.name || "Produto não encontrado"}</p>
                            {product?.description && (
                              <p className="text-xs text-gray-600">{product.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-400 p-3 text-center font-semibold">{item.quantity}</td>
                        <td className="border border-slate-400 p-3 text-center">{formatCurrency(item.unit_price)}</td>
                        <td className="border border-slate-400 p-3 text-center">
                          {item.includes_vat ? 'SIM' : 'NÃO'}
                        </td>
                        <td className="border border-slate-400 p-3 text-center">{formatCurrency(item.subtotal)}</td>
                        <td className="border border-slate-400 p-3 text-center font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-400 p-8 text-center text-black">
                      Nenhum item encontrado para esta venda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-8 flex justify-end">
            <div className="w-80">
              {sale.total_vat_amount > 0 && (
                <div className="flex justify-between py-2 text-black">
                  <span className="font-semibold">SUBTOTAL:</span>
                  <span className="font-semibold">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                </div>
              )}
              
              {sale.total_vat_amount > 0 && (
                <div className="flex justify-between py-2 text-black">
                  <span className="font-semibold">IVA TOTAL:</span>
                  <span className="font-semibold">{formatCurrency(sale.total_vat_amount)}</span>
                </div>
              )}
              
              <div className="bg-slate-700 text-white p-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">TOTAL:</span>
                  <span className="text-2xl font-bold">{formatCurrency(sale.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-black">
            <p className="font-semibold mb-2">Obrigado pela sua preferência!</p>
            <p className="text-sm mb-4">Esta factura foi gerada automaticamente pelo Sistema de Stock.</p>
            <p className="text-xs text-gray-600">Gerado em: {new Date().toLocaleString('pt-MZ')}</p>
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