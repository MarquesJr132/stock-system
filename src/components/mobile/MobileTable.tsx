import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MobileTableItem {
  id: string;
  [key: string]: any;
}

interface MobileTableProps {
  items: MobileTableItem[];
  renderCard: (item: MobileTableItem) => React.ReactNode;
  onEdit?: (item: MobileTableItem) => void;
  onDelete?: (item: MobileTableItem) => void;
  onView?: (item: MobileTableItem) => void;
  className?: string;
  emptyMessage?: string;
}

export const MobileTable = ({ 
  items, 
  renderCard, 
  onEdit, 
  onDelete, 
  onView,
  className,
  emptyMessage = "Nenhum item encontrado" 
}: MobileTableProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <Card key={item.id} className="mobile-card hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {renderCard(item)}
            </div>
            {(onEdit || onDelete || onView) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(item)}>
                      Ver detalhes
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(item)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

// Simple mobile table card renderer
export const SimpleMobileCard = ({ 
  title, 
  subtitle, 
  badge, 
  content,
  badgeVariant = "default"
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  content?: React.ReactNode;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}) => (
  <CardContent className="p-4">
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {badge && (
          <Badge variant={badgeVariant} className="flex-shrink-0">
            {badge}
          </Badge>
        )}
      </div>
      {content && (
        <div className="pt-2">
          {content}
        </div>
      )}
    </div>
  </CardContent>
);