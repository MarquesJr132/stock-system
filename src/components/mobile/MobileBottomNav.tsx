import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const { hasFeature } = useTenantFeatures();

  const allTabs = [];
  
  // Feature-based navigation
  if (hasFeature('dashboard_full') || hasFeature('dashboard_basic')) {
    allTabs.push({ icon: LayoutDashboard, label: "Dashboard", id: "dashboard" });
  }
  
  if (hasFeature('products_management') || hasFeature('products_view_only')) {
    allTabs.push({ icon: Package, label: "Produtos", id: "products" });
  }
  
  if (hasFeature('customers_management')) {
    allTabs.push({ icon: Users, label: "Clientes", id: "customers" });
  }
  
  if (hasFeature('sales_management')) {
    allTabs.push({ icon: ShoppingCart, label: "Vendas", id: "sales" });
  }
  
  if (hasFeature('quotations_management')) {
    allTabs.push({ icon: FileText, label: "Orçamentos", id: "quotations" });
  }

  return (
    <nav className="mobile-nav-bottom md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {allTabs.slice(0, 4).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center touch-target min-w-0 flex-1 gap-1 transition-colors rounded-lg",
              activeTab === tab.id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-xs font-medium truncate px-1">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};