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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Visualização da Cotação</DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          {/* Content for PDF Generation */}
          <div id="quotation-content" className="bg-white p-6 text-black min-h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                {companySettings?.logo_url && (
                  <img
                    src={companySettings.logo_url}
                    alt="Company Logo"
                    className="h-14 max-w-28 w-auto object-contain"
                  />
                )}
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-black">COTAÇÃO</h1>
                <p className="text-xs text-gray-600 mt-1">#{quotation.quotation_number || quotation.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">DE:</h3>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-black">{companySettings?.company_name || 'Empresa'}</p>
                  {companySettings?.address && <p className="text-gray-600">{companySettings.address}</p>}
                  {companySettings?.phone && <p className="text-gray-600">{companySettings.phone}</p>}
                  {companySettings?.email && <p className="text-gray-600">{companySettings.email}</p>}
                  {companySettings?.nuit && <p className="text-gray-600">NUIT: {companySettings.nuit}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">PARA:</h3>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-black">{customer?.name || 'Cliente Geral'}</p>
                  {customer?.email && <p className="text-gray-600">{customer.email}</p>}
                  {customer?.phone && <p className="text-gray-600">{customer.phone}</p>}
                  {customer?.address && <p className="text-gray-600">{customer.address}</p>}
                  {customer?.nuit && <p className="text-gray-600">NUIT: {customer.nuit}</p>}
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 p-2 rounded">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data da Cotação</p>
                <p className="text-xs font-semibold text-black">{new Date(quotation.created_at).toLocaleDateString('pt-PT')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Válida Até</p>
                <p className="text-xs font-semibold text-black">
                  {quotation.valid_until 
                    ? new Date(quotation.valid_until).toLocaleDateString('pt-PT')
                    : 'Não especificado'
                  }
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                <p className="text-xs font-semibold text-black">{getStatusLabel(quotation.status)}</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="px-3 py-2 text-left font-medium text-xs">Produto</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Descrição</th>
                    <th className="px-3 py-2 text-center font-medium text-xs">Qtd</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Preço Unit.</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">IVA</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationItems.map((item: any, index: number) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 border-b border-gray-200">
                        <div className="font-medium text-xs text-black">{item.products?.name || 'Produto'}</div>
                      </td>
                      <td className="px-3 py-2 border-b border-gray-200">
                        <div className="text-xs text-gray-600">{item.products?.description || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-black border-b border-gray-200">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-xs text-black border-b border-gray-200">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-black border-b border-gray-200">
                        {formatCurrency(item.vat_amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-black border-b border-gray-200">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-4">
              <div className="w-60 bg-gray-50 p-2 rounded-lg">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-black font-medium">{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">IVA (16%):</span>
                    <span className="text-black font-medium">{formatCurrency(quotation.total_vat_amount)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-1 mt-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-sm text-black">Total:</span>
                      <span className="font-bold text-sm text-black">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Banking Information - Bottom Left */}
            {companySettings && (
              companySettings.bank_name || 
              companySettings.account_number || 
              companySettings.iban
            ) && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-1">Informações Bancárias</h4>
                <div className="space-y-0.5 text-xs text-gray-600">
                  {companySettings.bank_name && (
                    <p><span className="font-medium">Banco:</span> {companySettings.bank_name}</p>
                  )}
                  {companySettings.account_holder && (
                    <p><span className="font-medium">Titular:</span> {companySettings.account_holder}</p>
                  )}
                  {companySettings.account_number && (
                    <p><span className="font-medium">Número de Conta:</span> {companySettings.account_number}</p>
                  )}
                  {companySettings.iban && (
                    <p><span className="font-medium">NIB:</span> {companySettings.iban}</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700">
              Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}