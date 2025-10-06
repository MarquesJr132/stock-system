import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { useSupabaseData, SaleItem } from "@/hooks/useSupabaseData";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReceiptPreviewProps {
  sale: any;
  products: any[];
  customers: any[];
  isOpen: boolean;
  onClose: () => void;
  onGeneratePDF: () => void;
}

const ReceiptPreview = ({ sale, products, customers, isOpen, onClose, onGeneratePDF }: ReceiptPreviewProps) => {
  const { fetchSaleItemsBySaleId, companySettings } = useSupabaseData();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataIntegrityIssue, setDataIntegrityIssue] = useState(false);

  // CRÍTICO: Não permitir recibo sem cliente
  const customer = customers.find(c => c.id === sale?.customer_id);
  const isGeneralCustomer = customer?.name === 'Cliente Geral';
  const canPrint = sale?.customer_id && !isGeneralCustomer;

  useEffect(() => {
    if (sale?.id && isOpen) {
      loadSaleItems();
    }
  }, [sale?.id, isOpen]);

  const loadSaleItems = async () => {
    if (!sale?.id) return;
    setLoading(true);
    setDataIntegrityIssue(false);
    
    try {
      console.log(`Loading sale items for sale ID: ${sale.id}`);
      let items = await fetchSaleItemsBySaleId(sale.id);

      if ((!items || items.length === 0) && Array.isArray((sale as any).sale_items) && (sale as any).sale_items.length > 0) {
        console.log(`Using embedded sale items for sale ${sale.id}`);
        items = (sale as any).sale_items.map((it: any) => ({
          ...it,
          sale_id: sale.id,
          tenant_id: sale.tenant_id
        }));
      }

      if (!items || items.length === 0) {
        console.warn(`No sale items found for sale ${sale.id} - potential data integrity issue`);
        setDataIntegrityIssue(true);
      } else {
        console.log(`Successfully loaded ${items.length} sale items for sale ${sale.id}`);
      }

      setSaleItems(items || []);
    } catch (error) {
      console.error('Error loading sale items:', error);
      setSaleItems([]);
      setDataIntegrityIssue(true);
    } finally {
      setLoading(false);
    }
  };

  const groupedSaleItems = useMemo(() => {
    const map = new Map<string, any>();
    (saleItems || []).forEach((item: any) => {
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
  }, [saleItems]);

  if (!sale) return null;
  
  const getPaymentLabel = (method: string) => {
    const methods: Record<string, string> = {
      'Dinheiro': 'Dinheiro',
      'Cartão': 'Cartão',
      'Transferência': 'Transferência',
      'Mpesa': 'Mpesa'
    };
    return methods[method] || method;
  };

  const generatePDF = async () => {
    // VALIDAÇÃO: Não permitir gerar recibo sem cliente válido
    if (!canPrint) {
      alert('Para gerar um recibo, é necessário selecionar um cliente específico. Edite a venda e atribua um cliente.');
      return;
    }

    try {
      const element = document.getElementById('receipt-content');
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

      pdf.save(`recibo-${sale.id.slice(-8)}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 m-2 sm:m-4">
        <DialogHeader className="p-4 sm:p-6 pb-0">
          <DialogTitle className="text-lg sm:text-xl">Visualização do Recibo</DialogTitle>
        </DialogHeader>
        
        <div className="p-3 sm:p-6">
          {/* Content for PDF Generation */}
          <div id="receipt-content" className="bg-white p-6 sm:p-12 text-black min-h-[600px]">
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
                <h1 className="text-2xl sm:text-3xl font-bold text-black">RECIBO</h1>
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
                  <p className="text-gray-700">{companySettings?.nuit || ''}</p>
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

            {/* Sale Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 sm:mb-12">
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
            <div className="mb-8 overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="text-sm text-gray-600">Carregando produtos...</div>
                </div>
              ) : dataIntegrityIssue ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <div className="text-yellow-800 font-medium mb-2">
                    Problema de Integridade de Dados
                  </div>
                  <div className="text-yellow-700 text-sm mb-4">
                    Esta venda não possui produtos associados na base de dados. 
                    Isto pode acontecer quando há falhas durante o processo de criação da venda.
                  </div>
                  <div className="text-xs text-yellow-600">
                    ID da Venda: {sale.id}
                  </div>
                </div>
              ) : (
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
                    {groupedSaleItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Nenhum produto encontrado para esta venda
                        </td>
                      </tr>
                    ) : (
                      groupedSaleItems.map((item: any, index: number) => {
                        const product = products.find(p => p.id === item.product_id);
                        return (
                           <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                             <td className="px-2 sm:px-4 py-2 border-b border-gray-200">
                               <div className="font-medium text-xs sm:text-sm text-black">{product?.name || 'Produto'}</div>
                             </td>
                             <td className="px-2 sm:px-4 py-2 border-b border-gray-200 hidden sm:table-cell">
                               <div className="text-xs sm:text-sm text-gray-700">{product?.description || '-'}</div>
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
                      })
                    )}
                  </tbody>
                </table>
              )}
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
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose} className="order-2 sm:order-1">
              Fechar
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={!canPrint}
              className="bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
              title={!canPrint ? "Selecione um cliente específico para gerar recibo" : ""}
            >
              Gerar PDF
            </Button>
          </div>
          {!canPrint && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ Para gerar um recibo, edite a venda e selecione um cliente específico.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptPreview;
