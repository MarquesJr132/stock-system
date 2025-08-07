import { Package, TrendingUp, Users, BarChart3, History, ShoppingCart, Settings, User as UserIcon, Building } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileMenu = ({ isOpen, onClose, activeTab, onTabChange }: MobileMenuProps) => {
  const { isAdministrator, isSuperuser } = useAuth();

  if (!isOpen) return null;

  const menuItems = [
    { value: "dashboard", icon: BarChart3, label: "Dashboard" },
    { value: "products", icon: Package, label: "Produtos" },
    { value: "sales", icon: ShoppingCart, label: "Vendas" },
    { value: "customers", icon: Users, label: "Clientes" },
    { value: "movements", icon: History, label: "Movimentos" },
    { value: "reports", icon: TrendingUp, label: "Relatórios" },
    { value: "profile", icon: UserIcon, label: "Perfil" },
    ...(isAdministrator && !isSuperuser ? [
      { value: "company", icon: Building, label: "Empresa" },
      { value: "users", icon: Settings, label: "Usuários" }
    ] : [])
  ];

  const handleItemClick = (tab: string) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div className="bg-card/95 backdrop-blur-md w-64 h-full shadow-elegant border-r border-border" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border gradient-primary">
          <h2 className="font-semibold text-primary-foreground">Menu</h2>
        </div>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.value}
              onClick={() => handleItemClick(item.value)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-smooth ${
                activeTab === item.value 
                  ? "gradient-primary text-primary-foreground shadow-elegant" 
                  : "hover:bg-accent/20 dark:hover:bg-accent/10 text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};