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
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Visualização da Cotação</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          {/* Content for PDF Generation */}
          <div id="quotation-content" className="bg-white text-black min-h-[297mm] px-8 py-6" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {companySettings?.logo_url ? (
                  <img 
                    src={companySettings.logo_url} 
                    alt="Logo da empresa" 
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="h-12 w-24 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                    Logo
                  </div>
                )}
              </div>
              
              {/* Quotation Title */}
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900 mb-1">COTAÇÃO</h1>
                <p className="text-sm text-gray-600">Nº {quotation.id.split('-')[0]}</p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-12 mb-6">
              {/* Company Info */}
              <div>
                <div className="space-y-0.5 text-sm">
                  <p className="text-base font-bold text-gray-900">{companySettings?.company_name}</p>
                  {companySettings?.address && <p className="text-gray-700">{companySettings.address}</p>}
                  {companySettings?.phone && <p className="text-gray-700">{companySettings.phone}</p>}
                  {companySettings?.email && <p className="text-gray-700">{companySettings.email}</p>}
                  {companySettings?.nuit && <p className="text-gray-700">NUIT: {companySettings.nuit}</p>}
                </div>
              </div>

              {/* Customer and Quote Info */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">PARA:</p>
                  <div className="space-y-0.5 text-sm">
                    {customer ? (
                      <>
                        <p className="font-semibold text-gray-900">{customer.name}</p>
                        {customer.address && <p className="text-gray-700">{customer.address}</p>}
                        {customer.phone && <p className="text-gray-700">{customer.phone}</p>}
                        {customer.email && <p className="text-gray-700">{customer.email}</p>}
                        {customer.nuit && <p className="text-gray-700">NUIT: {customer.nuit}</p>}
                      </>
                    ) : (
                      <p className="text-gray-700">Cliente não especificado</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Data da Cotação:</span>
                    <span className="text-gray-700">{new Date(quotation.created_at).toLocaleDateString('pt-PT')}</span>
                  </div>
                  {quotation.valid_until && (
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Data de Validade:</span>
                      <span className="text-gray-700">{new Date(quotation.valid_until).toLocaleDateString('pt-PT')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Método de Pagamento:</span>
                    <span className="text-gray-700">{getPaymentLabel(quotation.payment_method)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Estado:</span>
                    <span className={getStatusColor(quotation.status)}>{getStatusLabel(quotation.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-3 py-3 text-left text-sm font-semibold w-12">Nº</th>
                    <th className="px-3 py-3 text-left text-sm font-semibold">Descrição</th>
                    <th className="px-3 py-3 text-center text-sm font-semibold w-16">Qtd</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold w-24">Taxa</th>
                    <th className="px-3 py-3 text-right text-sm font-semibold w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{item.product?.name}</p>
                          {item.product?.description && (
                            <p className="text-gray-600 text-xs">{item.product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-sm text-gray-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-72 space-y-1">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-700">IVA (16%):</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(quotation.total_vat_amount)}</span>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-gray-900">TOTAL:</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {quotation.notes && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Observações:</h4>
                <p className="text-sm text-gray-700">{quotation.notes}</p>
              </div>
            )}

            {/* Banking Info Footer */}
            {(companySettings?.bank_name || companySettings?.account_number || companySettings?.iban || companySettings?.phone) && (
              <div className="mt-auto pt-4 border-t border-gray-300">
                <div className="flex flex-wrap gap-8 text-xs text-gray-600">
                  {companySettings.bank_name && (
                    <span><strong>Banco:</strong> {companySettings.bank_name}</span>
                  )}
                  {companySettings.account_holder && (
                    <span><strong>Titular:</strong> {companySettings.account_holder}</span>
                  )}
                  {companySettings.account_number && (
                    <span><strong>Conta:</strong> {companySettings.account_number}</span>
                  )}
                  {companySettings.iban && (
                    <span><strong>IBAN:</strong> {companySettings.iban}</span>
                  )}
                  {companySettings.phone && (
                    <span><strong>Tel:</strong> {companySettings.phone}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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