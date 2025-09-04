import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  target?: number;
  progress?: number;
  icon: LucideIcon;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  status?: 'on-track' | 'behind' | 'ahead';
  className?: string;
}

export const KPICard = ({ 
  title, 
  value, 
  target, 
  progress, 
  icon: Icon, 
  trend, 
  status,
  className 
}: KPICardProps) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ahead':
        return 'text-green-600 bg-green-100';
      case 'behind':
        return 'text-red-600 bg-red-100';
      case 'on-track':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'ahead':
        return 'Acima da meta';
      case 'behind':
        return 'Abaixo da meta';
      case 'on-track':
        return 'Na meta';
      default:
        return '';
    }
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {status && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-2 py-1", getStatusColor(status))}
            >
              {getStatusLabel(status)}
            </Badge>
          )}
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Value */}
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {typeof value === 'number' ? formatCurrency(value) : value}
          </div>
          
          {/* Target Display */}
          {target && (
            <div className="text-sm text-muted-foreground">
              Meta: {formatCurrency(target)}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(1)}%</span>
              <span>Meta: 100%</span>
            </div>
          </div>
        )}

        {/* Trend */}
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            trend.type === "positive" 
              ? "bg-green-500/10 text-green-600" 
              : trend.type === "negative"
              ? "bg-red-500/10 text-red-600"
              : "bg-gray-500/10 text-gray-600"
          )}>
            <span>{trend.value}</span>
            <span className="text-muted-foreground">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};