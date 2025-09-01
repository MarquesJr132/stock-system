import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Edit, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QuotationPreview } from "./QuotationPreview";
import SaleItemForm from "./SaleItemForm";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

interface QuotationItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  includes_vat: boolean;
  vat_amount: number;
  subtotal: number;
  total: number;
}

interface Quotation {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  total_amount: number;
  total_profit: number;
  total_vat_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  payment_method: string;
  status: string;
  valid_until: string;
  notes?: string;
}

export default function QuotationManagement() {
  const { isAdministrator, isGerente } = useAuth();
  const { 
    products, 
    customers,
    getQuotations,
    addQuotation,
    updateQuotation,
    getQuotationItems
  } = useSupabaseData();

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [currentQuotation, setCurrentQuotation] = useState<Partial<Quotation>>({
    customer_id: null,
    payment_method: "",
    status: "pending",
    valid_until: "",
    notes: ""
  });
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [expandedQuotations, setExpandedQuotations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const quotationData = await getQuotations();
      setQuotations(quotationData);
    } catch (error) {
      console.error('Erro ao carregar cotações:', error);
      toast.error('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter(quotation => {
    const customer = customers.find(c => c.id === quotation.customer_id);
    const customerName = customer?.name || "Cliente Anónimo";
    return customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           quotation.total_amount.toString().includes(searchTerm);
  });

  const resetQuotation = () => {
    setCurrentQuotation({
      customer_id: null,
      payment_method: "",
      status: "pending",
      valid_until: "",
      notes: ""
    });
    setQuotationItems([]);
    setSelectedQuotation(null);
  };

  const loadQuotationForEdit = async (quotation: Quotation) => {
    try {
      setLoading(true);
      const items = await getQuotationItems(quotation.id);
      
      const quotationItems = items?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        includes_vat: item.includes_vat,
        vat_amount: item.vat_amount,
        subtotal: item.subtotal,
        total: item.total,
        product_name: item.product_name || 'Produto não encontrado'
      })) || [];
      
      setCurrentQuotation({
        ...quotation,
        id: quotation.id
      });
      setQuotationItems(quotationItems);
      setSelectedQuotation(quotation);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Erro ao carregar cotação:', error);
      toast.error('Erro ao carregar cotação para edição');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = quotationItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalVat = quotationItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const total = quotationItems.reduce((sum, item) => sum + item.total, 0);
    
    // Calcular lucro total baseado nos preços de compra dos produtos
    const totalProfit = quotationItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        const profit = (item.unit_price - product.purchase_price) * item.quantity;
        return sum + profit;
      }
      return sum;
    }, 0);

    return { subtotal, totalVat, total, totalProfit };
  };

  const handleSaveQuotation = async () => {
    if (quotationItems.length === 0) {
      toast.error('Adicione pelo menos um item à cotação');
      return;
    }

    if (!currentQuotation.valid_until) {
      toast.error('Defina uma data de validade para a cotação');
      return;
    }

    const { subtotal, totalVat, total, totalProfit } = calculateTotals();

    try {
      setLoading(true);

      const quotationData = {
        customer_id: currentQuotation.customer_id,
        total_amount: total,
        total_profit: totalProfit,
        total_vat_amount: totalVat,
        payment_method: currentQuotation.payment_method || 'cash',
        status: 'quotation', // Status especial para cotações
        valid_until: currentQuotation.valid_until,
        notes: currentQuotation.notes,
        items: quotationItems
      };

      if (selectedQuotation) {
        // Atualizar cotação existente
        await updateQuotation(selectedQuotation.id, quotationData);
        toast.success('Cotação atualizada com sucesso!');
      } else {
        // Criar nova cotação
        await addQuotation(quotationData);
        toast.success('Cotação criada com sucesso!');
      }

      setIsDialogOpen(false);
      resetQuotation();
      loadQuotations();
    } catch (error) {
      console.error('Erro ao salvar cotação:', error);
      toast.error('Erro ao salvar cotação');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuotationExpansion = (quotationId: string) => {
    const newExpanded = new Set(expandedQuotations);
    if (newExpanded.has(quotationId)) {
      newExpanded.delete(quotationId);
    } else {
      newExpanded.add(quotationId);
    }
    setExpandedQuotations(newExpanded);
  };

  const handleNewQuotation = () => {
    resetQuotation();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "Pendente", variant: "secondary" as const },
      approved: { label: "Aprovada", variant: "default" as const },
      rejected: { label: "Rejeitada", variant: "destructive" as const },
      converted: { label: "Convertida", variant: "outline" as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const isValidDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cotações</h2>
          <p className="text-muted-foreground">
            Gerencie as cotações de produtos e serviços
          </p>
        </div>
        {(isAdministrator || isGerente) && (
          <Button onClick={handleNewQuotation}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Cotação
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou valor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuotations.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma cotação encontrada</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredQuotations.map((quotation) => {
            const customer = customers.find(c => c.id === quotation.customer_id);
            const customerName = customer?.name || "Cliente Anónimo";
            const isExpanded = expandedQuotations.has(quotation.id);
            const isValidQuotation = isValidDate(quotation.valid_until);

            return (
              <Collapsible key={quotation.id}>
                <Card className={`transition-all ${!isValidQuotation ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-lg">{customerName}</CardTitle>
                            <CardDescription>
                              Cotação #{quotation.id.slice(0, 8)} • {formatDateTime(quotation.created_at)}
                              {!isValidQuotation && (
                                <span className="text-destructive ml-2">• Expirada</span>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold">{formatCurrency(quotation.total_amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              Válida até: {new Date(quotation.valid_until).toLocaleDateString()}
                            </p>
                          </div>
                          {getStatusBadge(quotation.status)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total</p>
                          <p className="text-lg font-semibold">{formatCurrency(quotation.total_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">IVA</p>
                          <p className="text-lg font-semibold">{formatCurrency(quotation.total_vat_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Lucro</p>
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(quotation.total_profit)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <div className="mt-1">{getStatusBadge(quotation.status)}</div>
                        </div>
                      </div>

                      {quotation.notes && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-muted-foreground">Observações</p>
                          <p className="text-sm mt-1">{quotation.notes}</p>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        {(isAdministrator || isGerente) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadQuotationForEdit(quotation)}
                            disabled={loading}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuotation(quotation);
                            setIsPreviewOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Dialog para criar/editar cotação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedQuotation ? 'Editar Cotação' : 'Nova Cotação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente</Label>
                <Select
                  value={currentQuotation.customer_id || ""}
                  onValueChange={(value) => setCurrentQuotation({...currentQuotation, customer_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <Select
                  value={currentQuotation.payment_method || ""}
                  onValueChange={(value) => setCurrentQuotation({...currentQuotation, payment_method: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="check">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_until">Válida até</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={currentQuotation.valid_until || ""}
                  onChange={(e) => setCurrentQuotation({...currentQuotation, valid_until: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={currentQuotation.status || "pending"}
                  onValueChange={(value) => setCurrentQuotation({...currentQuotation, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovada</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                    <SelectItem value="converted">Convertida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                placeholder="Observações adicionais..."
                value={currentQuotation.notes || ""}
                onChange={(e) => setCurrentQuotation({...currentQuotation, notes: e.target.value})}
              />
            </div>

            <SaleItemForm
              items={quotationItems}
              onItemsChange={setQuotationItems}
              products={products}
            />

            {quotationItems.length > 0 && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Subtotal</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculateTotals().subtotal)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">IVA</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculateTotals().totalVat)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{formatCurrency(calculateTotals().total)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Lucro</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(calculateTotals().totalProfit)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveQuotation} disabled={loading}>
                {loading ? 'Salvando...' : selectedQuotation ? 'Atualizar' : 'Criar'} Cotação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview da cotação */}
      <QuotationPreview
        quotation={selectedQuotation}
        products={products}
        customers={customers}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedQuotation(null);
        }}
        onGeneratePDF={() => {
          // Lógica para gerar PDF será implementada no componente QuotationPreview
        }}
      />
    </div>
  );
}