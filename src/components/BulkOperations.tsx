import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit, 
  Archive, 
  Send, 
  Download,
  Tag,
  DollarSign,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMicroInteractions } from '@/hooks/useMicroInteractions';

interface BulkItem {
  id: string;
  name: string;
  type: 'product' | 'customer' | 'sale' | 'quotation';
  status?: string;
  data: any;
}

interface BulkOperationsProps {
  items: BulkItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkAction: (action: string, data?: any) => Promise<void>;
  availableActions?: string[];
}

const bulkActions = {
  delete: {
    label: 'Eliminar',
    icon: Trash2,
    variant: 'destructive' as const,
    description: 'Eliminar itens selecionados permanentemente'
  },
  archive: {
    label: 'Arquivar',
    icon: Archive,
    variant: 'secondary' as const,
    description: 'Arquivar itens selecionados'
  },
  export: {
    label: 'Exportar',
    icon: Download,
    variant: 'outline' as const,
    description: 'Exportar itens selecionados'
  },
  updatePrices: {
    label: 'Atualizar Preços',
    icon: DollarSign,
    variant: 'outline' as const,
    description: 'Atualizar preços em massa'
  },
  updateStock: {
    label: 'Atualizar Stock',
    icon: Package,
    variant: 'outline' as const,
    description: 'Atualizar quantidades de stock'
  },
  addTags: {
    label: 'Adicionar Tags',
    icon: Tag,
    variant: 'outline' as const,
    description: 'Adicionar tags aos itens'
  },
  sendEmail: {
    label: 'Enviar Email',
    icon: Send,
    variant: 'outline' as const,
    description: 'Enviar email para clientes selecionados'
  }
};

export const BulkOperations = ({ 
  items, 
  selectedItems, 
  onSelectionChange, 
  onBulkAction,
  availableActions = Object.keys(bulkActions)
}: BulkOperationsProps) => {
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [actionData, setActionData] = useState<any>({});
  const { toast } = useToast();
  const { useLoadingState, triggerSuccess, triggerError, useConfirmation } = useMicroInteractions();
  const { isLoading, withLoading } = useLoadingState('bulk-operations');
  const { confirm } = useConfirmation();

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const handleItemToggle = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      onSelectionChange(selectedItems.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedItems, itemId]);
    }
  };

  const openActionDialog = (action: string) => {
    setCurrentAction(action);
    setActionData({});
    setIsActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!currentAction || selectedItems.length === 0) return;

    const action = bulkActions[currentAction as keyof typeof bulkActions];
    
    if (action.variant === 'destructive') {
      confirm(
        'Confirmar Ação',
        `Tem certeza que deseja ${action.label.toLowerCase()} ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}?`,
        async () => {
          await performAction();
        }
      );
    } else {
      await performAction();
    }
  };

  const performAction = async () => {
    try {
      await withLoading(
        () => onBulkAction(currentAction, actionData),
        {
          successMessage: `${bulkActions[currentAction as keyof typeof bulkActions].label} executado com sucesso`,
          errorMessage: `Erro ao executar ${bulkActions[currentAction as keyof typeof bulkActions].label.toLowerCase()}`
        }
      );

      setIsActionDialogOpen(false);
      onSelectionChange([]);
      triggerSuccess();
    } catch (error) {
      triggerError();
    }
  };

  const renderActionDialog = () => {
    const action = bulkActions[currentAction as keyof typeof bulkActions];
    if (!action) return null;

    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <action.icon className="h-5 w-5" />
            {action.label}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {action.description}
          </p>
          
          <div className="p-3 bg-accent/10 rounded-lg">
            <p className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selecionado{selectedItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          {currentAction === 'updatePrices' && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de Atualização</Label>
                <Select value={actionData.priceType} onValueChange={(value) => setActionData({...actionData, priceType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                    <SelectItem value="set">Definir Preço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actionData.priceValue || ''}
                  onChange={(e) => setActionData({...actionData, priceValue: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          {currentAction === 'updateStock' && (
            <div className="space-y-4">
              <div>
                <Label>Tipo de Atualização</Label>
                <Select value={actionData.stockType} onValueChange={(value) => setActionData({...actionData, stockType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Adicionar</SelectItem>
                    <SelectItem value="subtract">Subtrair</SelectItem>
                    <SelectItem value="set">Definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={actionData.stockValue || ''}
                  onChange={(e) => setActionData({...actionData, stockValue: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {currentAction === 'addTags' && (
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={actionData.tags || ''}
                onChange={(e) => setActionData({...actionData, tags: e.target.value})}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          )}

          {currentAction === 'sendEmail' && (
            <div className="space-y-4">
              <div>
                <Label>Assunto</Label>
                <Input
                  value={actionData.subject || ''}
                  onChange={(e) => setActionData({...actionData, subject: e.target.value})}
                  placeholder="Assunto do email"
                />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={actionData.message || ''}
                  onChange={(e) => setActionData({...actionData, message: e.target.value})}
                  placeholder="Conteúdo do email..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={executeAction} disabled={isLoading} className="flex-1">
              {isLoading ? 'Executando...' : 'Executar'}
            </Button>
            <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="p-0 h-auto"
            >
              {isAllSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : isPartiallySelected ? (
                <div className="h-4 w-4 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center">
                  <div className="h-2 w-2 bg-primary rounded-xs" />
                </div>
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
            <span>Operações em Massa</span>
            {selectedItems.length > 0 && (
              <Badge variant="secondary">
                {selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {selectedItems.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {availableActions.map(actionKey => {
              const action = bulkActions[actionKey as keyof typeof bulkActions];
              if (!action) return null;

              return (
                <Dialog key={actionKey} open={isActionDialogOpen && currentAction === actionKey} onOpenChange={setIsActionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant={action.variant}
                      size="sm"
                      onClick={() => openActionDialog(actionKey)}
                      className="gap-2"
                    >
                      <action.icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  </DialogTrigger>
                  {renderActionDialog()}
                </Dialog>
              );
            })}
          </div>
        </CardContent>
      )}

      {/* Items List */}
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-60 overflow-auto">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleItemToggle(item.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.type} {item.status && `• ${item.status}`}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {item.type}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};