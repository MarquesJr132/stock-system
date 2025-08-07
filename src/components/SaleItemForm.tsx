import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { Product, SaleItem } from "@/hooks/useSupabaseData";
import { formatCurrency } from "@/lib/currency";

interface SaleItemFormProps {
  products: Product[];
  items: any[];
  onItemsChange: (items: any[]) => void;
}

const SaleItemForm: React.FC<SaleItemFormProps> = ({ products, items, onItemsChange }) => {
  const addItem = () => {
    const newItem = {
      id: `temp_${Date.now()}`,
      product_id: "",
      productId: "",
      quantity: 1,
      unit_price: 0,
      unitPrice: 0,
      includes_vat: false,
      includesVAT: false,
      vat_amount: 0,
      vatAmount: 0,
      subtotal: 0,
      total: 0,
      sale_id: "",
      tenant_id: ""
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index] };
    
    if (field === "product_id" || field === "productId") {
      const product = products.find(p => p.id === value);
      if (product) {
        item.product_id = value;
        item.productId = value;
        item.unit_price = product.sale_price;
        item.unitPrice = product.sale_price;
      }
    } else if (field === "quantity") {
      item.quantity = parseInt(value) || 0;
    } else if (field === "unit_price" || field === "unitPrice") {
      item.unit_price = parseFloat(value) || 0;
      item.unitPrice = parseFloat(value) || 0;
    } else if (field === "includes_vat" || field === "includesVAT") {
      item.includes_vat = value;
      item.includesVAT = value;
    }

    // Recalculate totals
    const subtotal = item.quantity * item.unit_price;
    item.subtotal = subtotal;

    if (item.includes_vat) {
      item.vat_amount = subtotal * 0.16; // 16% VAT
      item.vatAmount = item.vat_amount;
      item.total = subtotal + item.vat_amount; // Subtotal + IVA
    } else {
      item.vat_amount = 0;
      item.vatAmount = 0;
      item.total = subtotal;
    }

    updatedItems[index] = item;
    onItemsChange(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + (item.total || 0), 0);
  };

  const getTotalVAT = () => {
    return items.reduce((total, item) => total + (item.vat_amount || 0), 0);
  };

  const applyVATToAll = (includeVAT: boolean) => {
    const updatedItems = items.map(item => {
      const subtotal = item.quantity * item.unit_price;
      const newItem = { ...item };
      
      newItem.includes_vat = includeVAT;
      newItem.includesVAT = includeVAT;
      newItem.subtotal = subtotal;
      
      if (includeVAT) {
        newItem.vat_amount = subtotal * 0.16;
        newItem.vatAmount = newItem.vat_amount;
        newItem.total = subtotal + newItem.vat_amount;
      } else {
        newItem.vat_amount = 0;
        newItem.vatAmount = 0;
        newItem.total = subtotal;
      }
      
      return newItem;
    });
    
    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Itens da Venda</h3>
        <Button type="button" onClick={addItem} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Item
        </Button>
      </div>

      {items.map((item, index) => {
        const selectedProduct = products.find(p => p.id === (item.product_id || item.productId));
        
        return (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div>
                  <Label>Produto</Label>
                  <Select
                    value={item.product_id || item.productId || ""}
                    onValueChange={(value) => updateItem(index, "product_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(product.sale_price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Preço Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.unit_price || item.unitPrice || 0}
                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`vat-${index}`}
                    checked={item.includes_vat || item.includesVAT || false}
                    onCheckedChange={(checked) => updateItem(index, "includes_vat", checked)}
                  />
                  <Label htmlFor={`vat-${index}`} className="text-sm">
                    Inclui IVA
                  </Label>
                </div>

                <div className="text-right">
                  <Label>Total</Label>
                  <div className="font-semibold">
                    {formatCurrency(item.total || 0)}
                  </div>
                  {(item.vat_amount || item.vatAmount) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      IVA: {formatCurrency(item.vat_amount || item.vatAmount || 0)}
                    </div>
                  )}
                </div>

                <div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {items.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nenhum item adicionado. Clique em "Adicionar Item" para começar.
            </p>
          </CardContent>
        </Card>
      )}

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resumo da Venda</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apply-vat-all"
                  onCheckedChange={(checked) => applyVATToAll(!!checked)}
                />
                <Label htmlFor="apply-vat-all" className="text-sm font-medium">
                  Aplicar IVA em todos os itens
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(getTotalAmount() - getTotalVAT())}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA:</span>
                <span>{formatCurrency(getTotalVAT())}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(getTotalAmount())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SaleItemForm;