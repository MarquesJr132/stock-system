import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react";
import { useSupabaseData, Product } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileTable, SimpleMobileCard } from "@/components/mobile/MobileTable";
import { MobileInput } from "@/components/mobile/MobileInput";
import { useIsMobile } from "@/hooks/use-mobile";

const ProductManagement = () => {
  const { products, addProduct, updateProduct, deleteProduct, loading } = useSupabaseData();
  const { profile, isAdministrator } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    purchase_price: "",
    sale_price: "",
    quantity: "",
    min_stock: "",
    description: "",
    supplier: ""
  });

  const categories = ["all", ...Array.from(new Set(products.filter(p => p.category !== 'encomenda_especial').map(p => p.category || 'Sem categoria')))];

  const filteredProducts = products.filter(product => {
    // Excluir produtos de encomenda especial do stock normal
    if (product.category === 'encomenda_especial') {
      return false;
    }
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      purchase_price: "",
      sale_price: "",
      quantity: "",
      min_stock: "",
      description: "",
      supplier: ""
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category || "",
      purchase_price: product.purchase_price.toString(),
      sale_price: product.sale_price.toString(),
      quantity: product.quantity.toString(),
      min_stock: (product.min_stock || 5).toString(),
      description: product.description || "",
      supplier: product.supplier || ""
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    // Validar preços negativos
    const purchasePrice = parseFloat(formData.purchase_price);
    const salePrice = parseFloat(formData.sale_price);
    const quantity = parseInt(formData.quantity);

    if (purchasePrice < 0 || salePrice < 0) {
      toast({
        title: "Erro de validação",
        description: "Preços não podem ser negativos.",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 0) {
      toast({
        title: "Erro de validação",
        description: "Quantidade não pode ser negativa.",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: formData.name,
      category: formData.category || null,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      quantity: quantity,
      min_stock: parseInt(formData.min_stock) || 5,
      description: formData.description || null,
      supplier: formData.supplier || null,
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdministrator) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem eliminar produtos.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm("Tem certeza que deseja eliminar este produto?")) {
      await deleteProduct(id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Gestão de Produtos
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Gerir inventário e informações dos produtos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Ex: Telemóveis, Computadores"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchasePrice">Preço de Compra *</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="salePrice">Preço de Venda *</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="minStock">Stock Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_stock: e.target.value }))}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada do produto"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingProduct ? "Atualizar" : "Criar"} Produto
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

      {/* Search and Filter - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          {isMobile ? (
            <MobileInput
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          ) : (
            <Input
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className={`w-full sm:w-48 ${isMobile ? 'h-12' : ''}`}>
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "Todas as categorias" : (category || 'Sem categoria')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchTerm || categoryFilter !== "all" 
                ? "Tente ajustar os filtros de pesquisa"
                : "Comece por criar o seu primeiro produto"
              }
            </p>
            {isAdministrator && !searchTerm && categoryFilter === "all" && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Produto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        isMobile ? (
          <MobileTable
            items={filteredProducts}
            onEdit={isAdministrator ? handleEdit : undefined}
            onDelete={isAdministrator ? (product) => handleDelete(product.id) : undefined}
            renderCard={(product) => (
              <SimpleMobileCard
                title={product.name}
                subtitle={product.category || 'Sem categoria'}
                badge={`${product.quantity} unidades`}
                badgeVariant={product.min_stock && product.quantity <= product.min_stock ? "destructive" : "secondary"}
                content={
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço venda:</span>
                      <span className="font-medium">{formatCurrency(product.sale_price)}</span>
                    </div>
                    {product.supplier && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fornecedor:</span>
                        <span className="font-medium truncate max-w-32">{product.supplier}</span>
                      </div>
                    )}
                    {product.min_stock && product.quantity <= product.min_stock && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs">Stock baixo</span>
                      </div>
                    )}
                  </div>
                }
              />
            )}
            emptyMessage="Nenhum produto encontrado"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {product.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {product.category || 'Sem categoria'}
                      </p>
                    </div>
                    {product.min_stock && product.quantity <= product.min_stock && (
                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço de compra:</span>
                      <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Preço de venda:</span>
                      <span className="font-medium">{formatCurrency(product.sale_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantidade:</span>
                      <Badge 
                        variant={product.min_stock && product.quantity <= product.min_stock ? "destructive" : "secondary"}
                      >
                        {product.quantity} unidades
                      </Badge>
                    </div>
                    {product.supplier && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fornecedor:</span>
                        <span className="font-medium truncate max-w-32">{product.supplier}</span>
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {isAdministrator && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        className="flex-1"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default ProductManagement;