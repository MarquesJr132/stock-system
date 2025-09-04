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
          <div id="invoice-content" className="bg-white text-black min-h-[297mm] flex flex-col" style={{ fontFamily: 'Arial, sans-serif' }}>
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
              
              {/* Invoice Title */}
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">FACTURA</h1>
                <p className="text-lg text-gray-600">Nº {sale.id.split('-')[0]}</p>
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
                  <p><strong>Data:</strong> {new Date(sale.created_at).toLocaleDateString('pt-PT')}</p>
                  <p><strong>Método de Pagamento:</strong> {getPaymentLabel(sale.payment_method)}</p>
                  <p><strong>Estado:</strong> <span className={getStatusColor(sale.status)}>{getStatusLabel(sale.status)}</span></p>
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
                  {saleItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-sm">{index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{products.find(p => p.id === item.product_id)?.name || 'Produto não encontrado'}</p>
                          {products.find(p => p.id === item.product_id)?.description && (
                            <p className="text-gray-600 text-xs">{products.find(p => p.id === item.product_id)?.description}</p>
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
                    <span className="text-sm font-medium">{formatCurrency(sale.total_amount - sale.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-sm">IVA (16%):</span>
                    <span className="text-sm font-medium">{formatCurrency(sale.total_vat_amount)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-800">
                    <span className="text-base font-bold">Total:</span>
                    <span className="text-base font-bold">{formatCurrency(sale.total_amount)}</span>
                  </div>
                </div>
              </div>

              {sale.notes && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Observações:</h4>
                  <p className="text-sm text-gray-600">{sale.notes}</p>
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
};

export default InvoicePreview;