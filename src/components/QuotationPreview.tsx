import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/utils";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface QuotationPreviewProps {
  quotation: any;
  products: any[];
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF: () => void;
}

export function QuotationPreview({ 
  quotation, 
  products, 
  customers, 
  isOpen, 
  onClose, 
  onGeneratePDF 
}: QuotationPreviewProps) {
  const { fetchSaleItemsBySaleId, companySettings } = useSupabaseData();
  const [quotationItems, setQuotationItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quotation && isOpen) {
      loadQuotationItems();
    }
  }, [quotation, isOpen]);

  const loadQuotationItems = async () => {
    if (!quotation?.id) return;
    
    try {
      setLoading(true);
      const items = await fetchSaleItemsBySaleId(quotation.id);
      setQuotationItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens da cotação:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('quotation-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
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

      const customer = customers.find(c => c.id === quotation.customer_id);
      const fileName = `cotacao_${customer?.name || 'cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  if (!quotation) return null;

  const customer = customers.find(c => c.id === quotation.customer_id);
  
  const getPaymentLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: 'Dinheiro',
      card: 'Cartão',
      transfer: 'Transferência',
      check: 'Cheque'
    };
    return labels[method] || method;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'text-yellow-600',
      approved: 'text-green-600',
      rejected: 'text-red-600',
      converted: 'text-blue-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendente',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      converted: 'Convertida'
    };
    return labels[status] || status;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pré-visualização da Cotação</DialogTitle>
        </DialogHeader>

        <div id="quotation-content" className="bg-white p-8 text-black">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none z-0">
            <span className="text-9xl font-bold transform -rotate-45">COTAÇÃO</span>
          </div>

          {/* Header */}
          <div className="mb-8 relative z-10">
            <div className="grid grid-cols-2 gap-8">
              {/* Company Info */}
              <div>
                <h1 className="text-2xl font-bold mb-2">{companySettings?.company_name}</h1>
                <div className="text-sm space-y-1">
                  <p>{companySettings?.address}</p>
                  <p>Tel: {companySettings?.phone}</p>
                  <p>Email: {companySettings?.email}</p>
                  <p>NUIT: {companySettings?.nuit}</p>
                </div>
              </div>
              
              {/* Quotation Info */}
              <div className="text-right">
                <h2 className="text-3xl font-bold text-blue-600 mb-4">COTAÇÃO</h2>
                <div className="text-sm space-y-1">
                  <p><strong>Número:</strong> #{quotation.id.slice(0, 8)}</p>
                  <p><strong>Data:</strong> {formatDateTime(quotation.created_at)}</p>
                  <p><strong>Válida até:</strong> {new Date(quotation.valid_until).toLocaleDateString()}</p>
                  <p className={`font-bold ${getStatusColor(quotation.status)}`}>
                    <strong>Status:</strong> {getStatusLabel(quotation.status)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-8 relative z-10">
            <h3 className="text-lg font-semibold mb-2 border-b border-gray-300 pb-1">Cliente</h3>
            <div className="text-sm">
              <p><strong>Nome:</strong> {customer?.name || 'Cliente Anónimo'}</p>
              {customer?.email && <p><strong>Email:</strong> {customer.email}</p>}
              {customer?.phone && <p><strong>Telefone:</strong> {customer.phone}</p>}
              {customer?.address && <p><strong>Endereço:</strong> {customer.address}</p>}
              {customer?.nuit && <p><strong>NUIT:</strong> {customer.nuit}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 relative z-10">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Produto</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Qtd</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Preço Unit.</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Subtotal</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">IVA</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-4 py-8 text-center">
                      Carregando itens...
                    </td>
                  </tr>
                ) : quotationItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 px-4 py-8 text-center">
                      Nenhum item encontrado
                    </td>
                  </tr>
                ) : (
                  quotationItems.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          <div>
                            <p className="font-medium">{product?.name || 'Produto não encontrado'}</p>
                            {product?.description && (
                              <p className="text-xs text-gray-600">{product.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.subtotal)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.vat_amount)}</td>
                        <td className="border border-gray-300 px-4 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mb-8 relative z-10">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (17%):</span>
                    <span>{formatCurrency(quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method and Notes */}
          <div className="mb-8 relative z-10">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold mb-2">Método de Pagamento</h4>
                <p className="text-sm">{getPaymentLabel(quotation.payment_method)}</p>
              </div>
              {quotation.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Observações</h4>
                  <p className="text-sm">{quotation.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8 relative z-10">
            <p>Esta cotação é válida até {new Date(quotation.valid_until).toLocaleDateString()}</p>
            <p>Gerado em {formatDateTime(new Date().toISOString())}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar Pré-visualização
          </Button>
          <Button onClick={generatePDF}>
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}