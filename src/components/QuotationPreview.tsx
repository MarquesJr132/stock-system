import { useState, useEffect, useMemo } from "react";
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

  const groupedQuotationItems = useMemo(() => {
    const map = new Map<string, any>();
    (quotationItems || []).forEach((item: any) => {
      const key = item.product_id || item.id;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += Number(item.quantity) || 0;
        existing.vat_amount = (Number(existing.vat_amount) || 0) + (Number(item.vat_amount) || 0);
        existing.subtotal = (Number(existing.subtotal) || 0) + (Number(item.subtotal) || 0);
        const lineTotal = (Number(item.total) || (Number(item.unit_price) || 0) * (Number(item.quantity) || 0));
        existing.total = (Number(existing.total) || 0) + lineTotal;
      } else {
        map.set(key, { ...item });
      }
    });
    return Array.from(map.values());
  }, [quotationItems]);

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
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 m-2 sm:m-4">
        <DialogHeader className="p-3 sm:p-4 pb-0">
          <DialogTitle className="text-lg sm:text-xl">Visualização da Cotação</DialogTitle>
        </DialogHeader>
        
        <div className="p-3 sm:p-4">
          {/* Content for PDF Generation */}
          <div id="quotation-content" className="bg-white p-6 sm:p-12 text-black min-h-[600px]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start mb-8 sm:mb-12 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-6">
                {companySettings?.logo_url && (
                  <img
                    src={companySettings.logo_url}
                    alt="Company Logo"
                    className="h-16 sm:h-24 max-w-32 sm:max-w-40 w-auto object-contain"
                  />
                )}
              </div>
              <div className="text-left sm:text-right">
                <h1 className="text-2xl sm:text-3xl font-bold text-black">COTAÇÃO</h1>
                <p className="text-base sm:text-lg text-gray-600 mt-1">#{quotation.quotation_number || quotation.id.slice(0, 8)}</p>
              </div>
            </div>

            {/* Company and Customer Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-12">
              <div>
                <div className="space-y-1 text-sm">
                  <p className="text-base sm:text-lg font-bold text-black">{companySettings?.company_name || 'Empresa'}</p>
                  <p className="text-gray-700">{companySettings?.address || ''}</p>
                  {companySettings?.phone && <p className="text-gray-700">Contacto: {companySettings.phone}</p>}
                  {companySettings?.email && <p className="text-gray-700">Email: {companySettings.email}</p>}
                  {companySettings?.nuit && <p className="text-gray-700">NUIT: {companySettings.nuit}</p>}
                </div>
              </div>
              <div>
                <div className="space-y-1 text-sm">
                  <p className="text-base sm:text-lg font-bold text-black">{customer?.name || 'Cliente Geral'}</p>
                  {customer?.email && <p className="text-gray-700">Email: {customer.email}</p>}
                  {customer?.phone && <p className="text-gray-700">Tel: {customer.phone}</p>}
                  {customer?.address && <p className="text-gray-700">Endereço: {customer.address}</p>}
                  {customer?.nuit && <p className="text-gray-700">NUIT: {customer.nuit}</p>}
                </div>
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-12">
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
            <div className="mb-8 overflow-x-auto">
              <table className="w-full border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-xs sm:text-sm border-r border-gray-600">Produto</th>
                    <th className="px-2 sm:px-4 py-2 text-left font-medium text-xs sm:text-sm border-r border-gray-600 hidden sm:table-cell">Descrição</th>
                    <th className="px-2 sm:px-4 py-2 text-center font-medium text-xs sm:text-sm border-r border-gray-600">Qtd</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-xs sm:text-sm border-r border-gray-600">Preço Unit.</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-xs sm:text-sm border-r border-gray-600 hidden sm:table-cell">IVA</th>
                    <th className="px-2 sm:px-4 py-2 text-right font-medium text-xs sm:text-sm">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {groupedQuotationItems.map((item: any, index: number) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <tr key={(item.product_id || item.id) + '-' + index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="px-2 sm:px-4 py-2 border-b border-gray-200">
                          <div className="font-medium text-xs sm:text-sm text-black">{product?.name || item.products?.name || 'Produto'}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 border-b border-gray-200 hidden sm:table-cell">
                          <div className="text-xs sm:text-sm text-gray-700">{product?.description || item.products?.description || '-'}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-center text-xs sm:text-sm text-black border-b border-gray-200">{item.quantity}</td>
                        <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm text-black border-b border-gray-200">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm text-black border-b border-gray-200 hidden sm:table-cell">
                          {formatCurrency(item.vat_amount)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm font-medium text-black border-b border-gray-200">
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
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3 sm:mt-4 pt-3 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} className="order-2 sm:order-1">
              Fechar
            </Button>
            <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 order-1 sm:order-2">
              Gerar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}