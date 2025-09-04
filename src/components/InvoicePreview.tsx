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
          <div id="invoice-content" className="bg-white text-black min-h-[297mm] px-8 py-6" style={{ fontFamily: 'Arial, sans-serif' }}>
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
              
              {/* Invoice Title */}
              <div className="text-right">
                <h1 className="text-xl font-bold text-gray-900 mb-1">FACTURA</h1>
                <p className="text-sm text-gray-600">Nº {sale.id.split('-')[0]}</p>
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

              {/* Customer and Invoice Info */}
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
                    <span className="font-semibold text-gray-900">Data da Factura:</span>
                    <span className="text-gray-700">{new Date(sale.created_at).toLocaleDateString('pt-PT')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Método de Pagamento:</span>
                    <span className="text-gray-700">{getPaymentLabel(sale.payment_method)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Estado:</span>
                    <span className={getStatusColor(sale.status)}>{getStatusLabel(sale.status)}</span>
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
                  {saleItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="px-3 py-2 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{products.find(p => p.id === item.product_id)?.name || 'Produto não encontrado'}</p>
                          {products.find(p => p.id === item.product_id)?.description && (
                            <p className="text-gray-600 text-xs">{products.find(p => p.id === item.product_id)?.description}</p>
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
                  <span className="text-gray-900 font-medium">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-700">IVA (16%):</span>
                  <span className="text-gray-900 font-medium">{formatCurrency(sale.total_vat_amount)}</span>
                </div>
                <div className="border-t border-gray-400 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-gray-900">TOTAL:</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(sale.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {sale.notes && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Observações:</h4>
                <p className="text-sm text-gray-700">{sale.notes}</p>
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
};

export default InvoicePreview;