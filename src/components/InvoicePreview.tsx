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
  const { fetchSaleItemsBySaleId, companySettings } = useSupabaseData();
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

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      completed: 'text-green-600',
      pending: 'text-yellow-600',
      cancelled: 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      completed: 'Concluída',
      pending: 'Pendente',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  const generatePDF = async () => {
    try {
      const element = document.getElementById('invoice-content');
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Visualização da Factura</DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          {/* Content for PDF Generation */}
          <div id="invoice-content" className="bg-white p-12 text-black min-h-[600px]">
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
                <h1 className="text-3xl font-bold text-black">FACTURA</h1>
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

            {/* Sale Details */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <p className="text-sm font-medium text-gray-700">Data da Venda:</p>
                <p className="text-sm text-black">{new Date(sale.created_at).toLocaleDateString('pt-PT')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Método de Pagamento:</p>
                <p className="text-sm text-black">{getPaymentLabel(sale.payment_method)}</p>
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
                  {saleItems.map((item: any, index: number) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                       <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                         <td className="px-4 py-2 border-b border-gray-200">
                           <div className="font-medium text-sm text-black">{product?.name || 'Produto'}</div>
                         </td>
                         <td className="px-4 py-2 border-b border-gray-200">
                           <div className="text-sm text-gray-700">{product?.description || '-'}</div>
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
                    <span className="text-black font-medium">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-700">IVA (16%):</span>
                    <span className="text-black font-medium">{formatCurrency(sale.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-3 border-t-2 border-black">
                    <span className="font-bold text-lg text-black">Total:</span>
                    <span className="font-bold text-lg text-black">{formatCurrency(sale.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="mb-12">
                <h4 className="font-medium text-gray-700 mb-3">Observações:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded">
                  {sale.notes}
                </p>
              </div>
            )}

            {/* Banking Information - Bottom Left */}
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
};

export default InvoicePreview;