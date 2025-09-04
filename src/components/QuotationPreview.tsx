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
          <div id="quotation-content" className="bg-white p-12 text-black min-h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center space-x-6">
                {companySettings?.[0]?.logo_url && (
                  <img
                    src={companySettings[0].logo_url}
                    alt="Company Logo"
                    className="h-16 w-auto object-contain"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-black">
                    {companySettings?.[0]?.company_name || 'Empresa'}
                  </h1>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-bold text-black">COTAÇÃO</h1>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <div className="space-y-1 text-sm">
                  <p className="text-lg font-bold text-black">{companySettings?.[0]?.company_name || 'Empresa'}</p>
                  <p className="text-gray-700">{companySettings?.[0]?.address || ''}</p>
                  <p className="text-gray-700">Tel: {companySettings?.[0]?.phone || ''}</p>
                  <p className="text-gray-700">Email: {companySettings?.[0]?.email || ''}</p>
                  <p className="text-gray-700">NUIT: {companySettings?.[0]?.nuit || ''}</p>
                </div>
              </div>
              <div>
                <div className="space-y-1 text-sm">
                  <p className="text-lg font-bold text-black">{customer?.name || 'Cliente Geral'}</p>
                  {customer?.email && <p className="text-gray-700">Email: {customer.email}</p>}
                  {customer?.phone && <p className="text-gray-700">Tel: {customer.phone}</p>}
                  {customer?.address && <p className="text-gray-700">Endereço: {customer.address}</p>}
                  {customer?.nuit && <p className="text-gray-700">NUIT: {customer.nuit}</p>}
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-4 gap-8 mb-12">
              <div>
                <p className="text-sm font-medium text-gray-700">Data da Cotação:</p>
                <p className="text-sm text-black">{new Date(quotation.created_at).toLocaleDateString('pt-PT')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Válida Até:</p>
                <p className="text-sm text-black">
                  {quotation.valid_until 
                    ? new Date(quotation.valid_until).toLocaleDateString('pt-PT')
                    : 'Não especificado'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Método de Pagamento:</p>
                <p className="text-sm text-black">{getPaymentLabel(quotation.payment_method)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Estado:</p>
                <p className="text-sm text-black">{getStatusLabel(quotation.status)}</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-6 py-4 text-left font-medium text-sm border-r border-gray-600">Produto</th>
                    <th className="px-6 py-4 text-left font-medium text-sm border-r border-gray-600">Descrição</th>
                    <th className="px-6 py-4 text-center font-medium text-sm border-r border-gray-600">Qtd</th>
                    <th className="px-6 py-4 text-right font-medium text-sm border-r border-gray-600">Preço Unit.</th>
                    <th className="px-6 py-4 text-right font-medium text-sm border-r border-gray-600">IVA</th>
                    <th className="px-6 py-4 text-right font-medium text-sm">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {quotationItems.map((item: any, index: number) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-6 py-4 border-b border-gray-200">
                        <div className="font-medium text-sm text-black">{item.products?.name || 'Produto'}</div>
                      </td>
                      <td className="px-6 py-4 border-b border-gray-200">
                        <div className="text-sm text-gray-700">{item.products?.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-black border-b border-gray-200">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm text-black border-b border-gray-200">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-black border-b border-gray-200">
                        {formatCurrency(item.vat_amount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-black border-b border-gray-200">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
              <div className="w-80">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Subtotal:</span>
                    <span className="text-black font-medium">{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">IVA (17%):</span>
                    <span className="text-black font-medium">{formatCurrency(quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-black">
                    <span className="font-bold text-lg text-black">Total:</span>
                    <span className="font-bold text-lg text-black">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div className="mb-12">
                <h4 className="font-medium text-gray-700 mb-3">Observações:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
                  {quotation.notes}
                </p>
              </div>
            )}

            {/* Banking Information Footer */}
            {companySettings?.[0] && (
              companySettings[0].bank_name || 
              companySettings[0].account_number || 
              companySettings[0].iban
            ) && (
              <div className="border-t-2 border-gray-300 pt-6 mt-12">
                <div className="text-center">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-center items-center space-x-6">
                      {companySettings[0].bank_name && (
                        <span><strong>Banco:</strong> {companySettings[0].bank_name}</span>
                      )}
                      {companySettings[0].account_holder && (
                        <span><strong>Titular:</strong> {companySettings[0].account_holder}</span>
                      )}
                      {companySettings[0].account_number && (
                        <span><strong>Conta:</strong> {companySettings[0].account_number}</span>
                      )}
                    </div>
                    {companySettings[0].iban && (
                      <div>
                        <strong>IBAN:</strong> {companySettings[0].iban}
                      </div>
                    )}
                    <div className="mt-2">
                      <strong>Tel:</strong> {companySettings[0].phone} | <strong>Email:</strong> {companySettings[0].email}
                    </div>
                  </div>
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