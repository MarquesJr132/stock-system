import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ArrowUp, ArrowDown, History, Package } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

const StockMovements = () => {
  const { products } = useSupabaseData();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    type: "in" as "in" | "out",
    quantity: "",
    reason: "",
    reference: ""
  });

  // Placeholder data since we don't have stock movements table yet
  const stockMovements = [
    {
      id: "1",
      product_id: products[0]?.id || "",
      type: "in",
      quantity: 50,
      reason: "Compra inicial",
      reference: "COMP-001",
      created_at: new Date().toISOString(),
      created_by: "admin"
    }
  ];

  const filteredMovements = stockMovements.filter(movement => {
    const product = products.find(p => p.id === movement.product_id);
    const productName = product?.name || "";
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || movement.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      product_id: "",
      type: "in",
      quantity: "",
      reason: "",
      reference: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.quantity || !formData.reason) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    // In a real implementation, this would save to Supabase
    toast.success("Movimento de stock registrado com sucesso!");
    setDialogOpen(false);
    resetForm();
  };

  const getMovementIcon = (type: string) => {
    return type === "in" ? (
      <ArrowUp className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-red-600" />
    );
  };

  const getMovementColor = (type: string) => {
    return type === "in" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Movimentos de Stock
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Controlar entradas e saídas de produtos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Movimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Movimento de Stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product">Produto *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, product_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Movimento *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "in" | "out") => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">📈 Entrada</SelectItem>
                      <SelectItem value="out">📉 Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="Ex: 10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reference">Referência</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Ex: COMP-001"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reason">Motivo *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Compra de fornecedor, Ajuste de inventário, Venda"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Registrar Movimento
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Procurar movimentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="in">📈 Entradas</SelectItem>
                <SelectItem value="out">📉 Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <div className="space-y-4">
        {filteredMovements.map((movement) => {
          const product = products.find(p => p.id === movement.product_id);
          
          return (
            <Card key={movement.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800">
                      {getMovementIcon(movement.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{product?.name || "Produto não encontrado"}</h3>
                      <p className="text-sm text-muted-foreground">{movement.reason}</p>
                      {movement.reference && (
                        <p className="text-xs text-muted-foreground">Ref: {movement.reference}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getMovementColor(movement.type)}`}>
                      {movement.type === "in" ? "+" : "-"}{movement.quantity}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMovements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
              Nenhum movimento encontrado
            </h3>
            <p className="text-slate-500">
              {searchTerm || typeFilter !== "all"
                ? "Tente ajustar os filtros de pesquisa"
                : "Registe o seu primeiro movimento de stock para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockMovements;