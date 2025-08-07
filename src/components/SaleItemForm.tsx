
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { Product, SaleItem } from "@/hooks/useSupabaseData";
import { formatCurrency } from "@/lib/currency";

interface SaleItemFormProps {
  products: Product[];
  items: SaleItem[];
  onChange: (items: SaleItem[]) => void;
}

export const SaleItemForm = ({ products, items, onChange }: SaleItemFormProps) => {
  const [applyVATToAll, setApplyVATToAll] = useState(false);

  const addItem = () => {
    const newItem: SaleItem = {
      productId: "",
      quantity: 1,
      unitPrice: 0,
      includesVAT: false,
      vatAmount: 0,
      subtotal: 0,
      total: 0
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amounts when relevant fields change
    if (field === 'productId' || field === 'quantity' || field === 'includesVAT') {
      const item = newItems[index];
      const product = products.find(p => p.id === item.productId);
      
      if (product) {
        item.unitPrice = product.salePrice;
        item.subtotal = item.quantity * item.unitPrice;
        
        if (item.includesVAT) {
          // IVA é 16% do valor original (adicionado ao valor)
          item.vatAmount = item.subtotal * 0.16;
          item.total = item.subtotal + item.vatAmount;
        } else {
          item.vatAmount = 0;
          item.total = item.subtotal;
        }
      }
    }

    onChange(newItems);
  };

  const toggleVATForAll = () => {
    const newApplyVATToAll = !applyVATToAll;
    setApplyVATToAll(newApplyVATToAll);

    const newItems = items.map(item => {
      const updatedItem = { ...item, includesVAT: newApplyVATToAll };
      const product = products.find(p => p.id === item.productId);
      
      if (product) {
        updatedItem.subtotal = updatedItem.quantity * updatedItem.unitPrice;
        
        if (updatedItem.includesVAT) {
          updatedItem.vatAmount = updatedItem.subtotal * 0.16;
          updatedItem.total = updatedItem.subtotal + updatedItem.vatAmount;
        } else {
          updatedItem.vatAmount = 0;
          updatedItem.total = updatedItem.subtotal;
        }
      }
      
      return updatedItem;
    });

    onChange(newItems);
  };

  const getAvailableProducts = () => {
    return products.filter(p => p.quantity > 0);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Produtos da Venda</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleVATForAll}
              className="text-xs"
            >
              IVA em Todos ({applyVATToAll ? 'Sim' : 'Não'})
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const product = products.find(p => p.id === item.productId);
            const maxQuantity = product?.quantity || 0;

            return (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Produto {index + 1}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Produto *</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) => updateItem(index, 'productId', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableProducts().map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.salePrice)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {product && (
                      <p className="text-xs text-slate-500 mt-1">
                        Stock: {product.quantity}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      min="1"
                      max={maxQuantity}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div>
                    <Label>Preço Unitário</Label>
                    <Input
                      type="text"
                      value={product ? formatCurrency(product.salePrice) : ''}
                      disabled
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`vat-${index}`}
                      checked={item.includesVAT}
                      onChange={(e) => updateItem(index, 'includesVAT', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`vat-${index}`} className="text-sm">
                      Incluir IVA (16%)
                    </Label>
                  </div>
                </div>

                {product && item.quantity > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                    {item.includesVAT && (
                      <div className="flex justify-between">
                        <span>IVA (16%):</span>
                        <span>{formatCurrency(item.vatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>Nenhum produto adicionado</p>
              <Button type="button" variant="outline" onClick={addItem} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleItemForm;
