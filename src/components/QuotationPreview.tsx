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
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false
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

      pdf.save(`cotacao-${quotation.id.slice(-8)}.pdf`);
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
          <div id="quotation-content" className="bg-white p-12 text-black min-h-[600px]">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="flex items-center space-x-6">
                {companySettings?.logo_url && (
                  <img
                    src={companySettings.logo_url}
                    alt="Company Logo"
                    className="h-24 max-w-40 w-auto object-contain"
                  />
                )}
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-black">COTAÇÃO</h1>
                <p className="text-lg text-gray-600 mt-1">#{quotation.quotation_number || quotation.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <div className="space-y-1 text-sm">
                  <p className="text-lg font-bold text-black">{companySettings?.company_name || 'Empresa'}</p>
                  <p className="text-gray-700">{companySettings?.address || ''}</p>
                  <p className="text-gray-700">{companySettings?.phone || ''}</p>
                  <p className="text-gray-700">{companySettings?.email || ''}</p>
                  <p className="text-gray-700">{companySettings?.nuit || ''}</p>
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
            <div className="grid grid-cols-3 gap-8 mb-12">
              <div>
                <p className="text-sm font-medium text-gray-700">Data da Cotação:</p>
                <p className="text-sm text-black">{new Date(quotation.created_at).toLocaleDateString('pt-PT')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Válida até:</p>
                <p className="text-sm text-black">
                  {quotation.valid_until 
                    ? new Date(quotation.valid_until).toLocaleDateString('pt-PT')
                    : 'Não especificado'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status:</p>
                <p className="text-sm text-black">{getStatusLabel(quotation.status)}</p>
              </div>
            </div>

            {/* Products Table */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-2 text-left font-medium text-sm border-r border-gray-600">Produto</th>
                    <th className="px-4 py-2 text-left font-medium text-sm border-r border-gray-600">Descrição</th>
                    <th className="px-4 py-2 text-center font-medium text-sm border-r border-gray-600">Qtd</th>
                    <th className="px-4 py-2 text-right font-medium text-sm border-r border-gray-600">Preço Unit.</th>
                    <th className="px-4 py-2 text-right font-medium text-sm border-r border-gray-600">IVA</th>
                    <th className="px-4 py-2 text-right font-medium text-sm">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {quotationItems.map((item: any, index: number) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-4 py-2 border-b border-gray-200">
                          <div className="font-medium text-sm text-black">{product?.name || item.products?.name || 'Produto'}</div>
                        </td>
                        <td className="px-4 py-2 border-b border-gray-200">
                          <div className="text-sm text-gray-700">{product?.description || item.products?.description || '-'}</div>
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-black border-b border-gray-200">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-sm text-black border-b border-gray-200">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-black border-b border-gray-200">
                          {formatCurrency(item.vat_amount)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-black border-b border-gray-200">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    );
                  })}
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
                    <span className="font-medium text-gray-700">IVA (16%):</span>
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

            {/* Banking Information */}
            {companySettings && (
              companySettings.bank_name || 
              companySettings.account_number || 
              companySettings.iban
            ) && (
              <div className="mt-12">
                <div className="space-y-1 text-xs text-gray-600">
                  {companySettings.bank_name && (
                    <p><strong>Nome do Banco :</strong> {companySettings.bank_name}</p>
                  )}
                  {companySettings.account_holder && (
                    <p><strong>Titular :</strong> {companySettings.account_holder}</p>
                  )}
                  {companySettings.account_number && (
                    <p><strong>Número de Conta :</strong> {companySettings.account_number}</p>
                  )}
                  {companySettings.iban && (
                    <p><strong>NIB:</strong> {companySettings.iban}</p>
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