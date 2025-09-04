import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText,
  Building2,
  Settings,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const { isAdministrator } = useAuth();

  const primaryTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Produtos", icon: Package },
    { id: "sales", label: "Vendas", icon: ShoppingCart },
    { id: "customers", label: "Clientes", icon: Users }
  ];

  const adminTabs = [
    { id: "quotations", label: "Cotações", icon: FileText },
    { id: "suppliers", label: "Fornecedores", icon: Building2 },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "settings", label: "Configurações", icon: Settings }
  ];

  const tabs = isAdministrator ? [...primaryTabs, ...adminTabs.slice(0, 1)] : primaryTabs;

  return (
    <nav className="mobile-nav-bottom md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => (
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