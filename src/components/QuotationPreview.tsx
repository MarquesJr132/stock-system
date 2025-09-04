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
          <div id="quotation-content" className="bg-white text-black min-h-[297mm] flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                {companySettings?.logo_url ? (
                  <img 
                    src={companySettings.logo_url} 
                    alt="Logo da empresa" 
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="h-16 w-32 bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                    Logo
                  </div>
                )}
              </div>
              
              {/* Quotation Title */}
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">COTAÇÃO</h1>
                <p className="text-lg text-gray-600">Nº {quotation.id.split('-')[0]}</p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Company Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Dados da Empresa:</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{companySettings?.company_name}</p>
                  {companySettings?.address && <p>{companySettings.address}</p>}
                  {companySettings?.phone && <p>Tel: {companySettings.phone}</p>}
                  {companySettings?.email && <p>Email: {companySettings.email}</p>}
                  {companySettings?.nuit && <p>NUIT: {companySettings.nuit}</p>}
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Cliente:</h3>
                <div className="space-y-1 text-sm">
                  {customer ? (
                    <>
                      <p className="font-medium">{customer.name}</p>
                      {customer.email && <p>Email: {customer.email}</p>}
                      {customer.phone && <p>Tel: {customer.phone}</p>}
                      {customer.address && <p>{customer.address}</p>}
                      {customer.nuit && <p>NUIT: {customer.nuit}</p>}
                    </>
                  ) : (
                    <p>Cliente não especificado</p>
                  )}
                </div>
                
                <div className="mt-4 space-y-1 text-sm">
                  <p><strong>Data:</strong> {new Date(quotation.created_at).toLocaleDateString('pt-PT')}</p>
                  {quotation.valid_until && (
                    <p><strong>Válida até:</strong> {new Date(quotation.valid_until).toLocaleDateString('pt-PT')}</p>
                  )}
                  <p><strong>Método de Pagamento:</strong> {getPaymentLabel(quotation.payment_method)}</p>
                  <p><strong>Estado:</strong> <span className={getStatusColor(quotation.status)}>{getStatusLabel(quotation.status)}</span></p>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="flex-grow">
              <table className="w-full border-collapse border border-gray-300 mb-6">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Nº</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Produto & Descrição</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Qtd</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Taxa</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Montante</th>
                  </tr>
                </thead>
                <tbody>
                  {quotationItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          {item.product?.description && (
                            <p className="text-gray-600 text-xs">{item.product.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantity}</td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm font-medium">{formatCurrency(quotation.total_amount - quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm">IVA (16%):</span>
                    <span className="text-sm font-medium">{formatCurrency(quotation.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-800">
                    <span className="text-base font-bold">Total:</span>
                    <span className="text-base font-bold">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>

              {quotation.notes && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Observações:</h4>
                  <p className="text-sm text-gray-600">{quotation.notes}</p>
                </div>
              )}
            </div>

            {/* Banking Info Footer */}
            {(companySettings?.bank_name || companySettings?.account_number || companySettings?.iban) && (
              <div className="mt-auto pt-6 border-t border-gray-300">
                <h4 className="font-semibold text-gray-800 mb-2">Dados Bancários:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {companySettings.bank_name && (
                    <p><strong>Banco:</strong> {companySettings.bank_name}</p>
                  )}
                  {companySettings.account_holder && (
                    <p><strong>Titular:</strong> {companySettings.account_holder}</p>
                  )}
                  {companySettings.account_number && (
                    <p><strong>Conta:</strong> {companySettings.account_number}</p>
                  )}
                  {companySettings.iban && (
                    <p><strong>IBAN:</strong> {companySettings.iban}</p>
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