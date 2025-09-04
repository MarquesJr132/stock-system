import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDashboardCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const MobileDashboardCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType,
  className 
}: MobileDashboardCardProps) => {
  return (
    <Card className={cn("mobile-card hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide line-clamp-2">
            {title}
          </p>
        </div>
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-lg sm:text-xl font-bold text-foreground break-words">
            {value}
          </div>
          {change && (
            <div className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              changeType === "positive" 
                ? "bg-green-500/10 text-green-600" 
                : changeType === "negative"
                ? "bg-red-500/10 text-red-600"
                : "bg-gray-500/10 text-gray-600"
            )}>
              <span>{change}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};