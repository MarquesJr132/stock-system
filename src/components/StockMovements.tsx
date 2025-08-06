
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ArrowUp, ArrowDown, History, Package } from "lucide-react";
import { useStockData } from "@/hooks/useStockData";
import { toast } from "sonner";

const StockMovements = () => {
  const { products, stockMovements, addStockMovement } = useStockData();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: "",
    type: "in" as "in" | "out",
    quantity: "",
    reason: "",
    reference: ""
  });

  const filteredMovements = stockMovements.filter(movement => {
    const product = products.find(p => p.id === movement.productId);
    const matchesSearch = product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || movement.type === typeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const resetForm = () => {
    setFormData({
      productId: "",
      type: "in",
      quantity: "",
      reason: "",
      reference: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.quantity || !formData.reason) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    const selectedProduct = products.find(p => p.id === formData.productId);
    if (!selectedProduct) {
      toast.error("Produto não encontrado");
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (formData.type === "out" && quantity > selectedProduct.quantity) {
      toast.error("Quantidade insuficiente em stock");
      return;
    }

    const movementData = {
      productId: formData.productId,
      type: formData.type,
      quantity: quantity,
      reason: formData.reason,
      reference: formData.reference || undefined
    };

    addStockMovement(movementData);
    toast.success("Movimento de stock registado com sucesso!");
    setDialogOpen(false);
    resetForm();
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
              <DialogTitle>Registar Movimento de Stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productId">Produto *</Label>
                  <Select value={formData.productId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, productId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Stock: {product.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo de Movimento *</Label>
                  <Select value={formData.type} onValueChange={(value: "in" | "out") => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Saída</SelectItem>
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
                    placeholder="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reference">Referência</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    placeholder="Número da fatura, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Motivo *</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Compra, Devolução, Ajuste de inventário, Dano..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Registar Movimento
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
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Procurar movimentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="in">Entradas</SelectItem>
                <SelectItem value="out">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <div className="space-y-4">
        {filteredMovements.map((movement) => {
          const product = products.find(p => p.id === movement.productId);
          
          return (
            <Card key={movement.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {movement.type === "in" ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <h3 className="font-medium text-slate-800 dark:text-slate-100">
                        {product?.name || "Produto não encontrado"}
                      </h3>
                      <Badge variant={movement.type === "in" ? "default" : "secondary"}>
                        {movement.type === "in" ? "Entrada" : "Saída"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Quantidade</p>
                        <p className="font-medium">{movement.quantity}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">Motivo</p>
                        <p className="font-medium">{movement.reason}</p>
                      </div>
                      {movement.reference && (
                        <div>
                          <p className="text-slate-600 dark:text-slate-400">Referência</p>
                          <p className="font-medium">{movement.reference}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-500">
                      {movement.createdAt.toLocaleDateString('pt-PT')} às{' '}
                      {movement.createdAt.toLocaleTimeString('pt-PT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Stock atual: {product?.quantity || 0}
                    </span>
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
