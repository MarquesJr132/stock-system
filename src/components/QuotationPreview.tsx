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
  const { getQuotationItems, companySettings } = useSupabaseData();
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
      const items = await getQuotationItems(quotation.id);
      setQuotationItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens da cotação:', error);
      setQuotationItems([]);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      const element = document.getElementById('quotation-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5; // mm
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = pageHeight - margin * 2;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

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

        <div id="quotation-content" className="relative space-y-4 bg-white p-6" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '12px', position: 'relative' }}>
          {/* Watermark - visible in PDF */}
          <div style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            fontSize: '80px',
            fontWeight: 'bold',
            color: 'rgba(200, 200, 200, 0.2)',
            fontFamily: 'Arial, sans-serif',
            zIndex: 1,
            pointerEvents: 'none',
            userSelect: 'none',
            width: '100%',
            textAlign: 'center'
          }}>
            COTAÇÃO
          </div>
          
          {/* Content with higher z-index */}
          <div style={{ position: 'relative', zIndex: 10 }}>
             {/* Header */}
             <div className="bg-slate-700 text-white text-center py-4">
               {companySettings?.logo_url && (
                 <img 
                   src={companySettings.logo_url} 
                   alt="Company Logo" 
                   className="h-12 w-12 object-contain mx-auto mb-2"
                 />
               )}
               <h1 className="text-xl font-bold mb-1">{companySettings?.company_name || 'SISTEMA DE STOCK'}</h1>
               <p className="text-sm">COTAÇÃO</p>
             </div>

            {/* Company, Invoice Details and Customer Info in 3 columns */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* Company Info */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 text-sm">EMPRESA:</h3>
                <div className="space-y-0.5 text-xs text-black">
                  <p className="font-bold">{companySettings?.company_name || 'Sistema de Gestão de Stock Lda.'}</p>
                  <p>{companySettings?.address || 'Maputo, Moçambique'}</p>
                  <p>Tel: {companySettings?.phone || '+258 84 123 4567'}</p>
                  <p>Email: {companySettings?.email || 'info@stocksystem.co.mz'}</p>
                  <p>NUIT: {companySettings?.nuit || '123456789'}</p>
                </div>
              </div>

              {/* Quotation Details */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 text-sm">DETALHES DA COTAÇÃO:</h3>
                <div className="space-y-0.5 text-xs text-black">
                  <p><span className="font-semibold">Cotação Nº:</span> #{quotation.id.slice(-8)}</p>
                  <p><span className="font-semibold">Data:</span> {formatDateTime(quotation.created_at)}</p>
                  <p><span className="font-semibold">Válida até:</span> {new Date(quotation.valid_until).toLocaleDateString()}</p>
                  <p className={`font-semibold ${getStatusColor(quotation.status)}`}>
                    <span className="font-semibold">Status:</span> {getStatusLabel(quotation.status)}
                  </p>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-bold text-slate-700 mb-2 text-sm">CLIENTE:</h3>
                {customer ? (
                  <div className="space-y-0.5 text-xs text-black">
                    <p><span className="font-semibold">Nome:</span> {customer.name}</p>
                    <p><span className="font-semibold">Email:</span> {customer.email || 'N/A'}</p>
                    <p><span className="font-semibold">Telefone:</span> {customer.phone || 'N/A'}</p>
                    <p><span className="font-semibold">Endereço:</span> {customer.address || 'N/A'}</p>
                    {customer.nuit && (
                      <p><span className="font-semibold">NUIT:</span> {customer.nuit}</p>
                    )}
                  </div>
                 ) : (
                   <div className="text-black text-xs">
                     <p><span className="font-semibold">Nome:</span> Anônimo</p>
                   </div>
                 )}
              </div>
            </div>

            {/* Products Table */}
            <div className="mt-4">
              <table className="w-full border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="border border-slate-400 p-2 text-left font-bold text-xs">PRODUTO</th>
                    <th className="border border-slate-400 p-2 text-center font-bold text-xs">QTD</th>
                    <th className="border border-slate-400 p-2 text-center font-bold text-xs">PREÇO UNIT.</th>
                    <th className="border border-slate-400 p-2 text-center font-bold text-xs">IVA</th>
                    <th className="border border-slate-400 p-2 text-center font-bold text-xs">SUBTOTAL</th>
                    <th className="border border-slate-400 p-2 text-center font-bold text-xs">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="border border-slate-400 p-4 text-center text-black text-xs">
                        Carregando itens da cotação...
                      </td>
                    </tr>
                  ) : quotationItems.length > 0 ? (
                    quotationItems.map((item, index) => {
                      const product = products.find(p => p.id === item.product_id);
                      return (
                        <tr key={index} className="text-black">
                          <td className="border border-slate-400 p-2">
                            <div>
                              <p className="font-semibold text-xs">{item.product_name || product?.name || "Produto não encontrado"}</p>
                              {product?.description && (
                                <p className="text-xs text-gray-600">{product.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-400 p-2 text-center font-semibold text-xs">{item.quantity}</td>
                          <td className="border border-slate-400 p-2 text-center text-xs">{formatCurrency(item.unit_price)}</td>
                          <td className="border border-slate-400 p-2 text-center text-xs">
                            {item.vat_amount > 0 ? 'SIM' : 'NÃO'}
                          </td>
                          <td className="border border-slate-400 p-2 text-center text-xs">{formatCurrency(item.subtotal)}</td>
                          <td className="border border-slate-400 p-2 text-center font-semibold text-xs">{formatCurrency(item.total)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="border border-slate-400 p-4 text-center text-black text-xs">
                        Nenhum item encontrado para esta cotação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals - After table */}
            <div className="mt-6 flex justify-end">
              <div className="w-64">
                {quotation.total_vat_amount > 0 && (
                  <div className="flex justify-between py-1 text-black text-sm">
                    <span className="font-semibold">SUBTOTAL:</span>
                    <span className="font-semibold">{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                  </div>
                )}
                
                {quotation.total_vat_amount > 0 && (
                  <div className="flex justify-between py-1 text-black text-sm">
                    <span className="font-semibold">IVA TOTAL:</span>
                    <span className="font-semibold">{formatCurrency(quotation.total_vat_amount)}</span>
                  </div>
                )}
                
                <div className="bg-slate-700 text-white p-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">TOTAL:</span>
                    <span className="text-lg font-bold">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment method and Notes */}
            <div className="mt-6 grid grid-cols-2 gap-6 text-black text-sm">
              <div>
                <h4 className="font-bold text-slate-700 mb-2">MÉTODO DE PAGAMENTO:</h4>
                <p>{quotation.payment_method ? getPaymentLabel(quotation.payment_method) : 'Não especificado'}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-700 mb-2">OBSERVAÇÕES:</h4>
                <p>{quotation.notes || 'N/A'}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-black">
              <p className="font-semibold mb-1 text-sm">Esta cotação é válida até {new Date(quotation.valid_until).toLocaleDateString()}</p>
              <p className="text-xs text-gray-600">Gerado em: {new Date().toLocaleString('pt-MZ')}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700">
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}