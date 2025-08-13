import { Package, TrendingUp, Users, BarChart3, History, ShoppingCart, Settings, User as UserIcon, Building, Truck, FileText, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { isAdministrator: userIsAdmin, isSuperuser: userIsSuperuser } = useAuth();
  
  const mainItems = [
    { value: "dashboard", icon: BarChart3, label: "Dashboard" },
    { value: "products", icon: Package, label: "Produtos" },
    { value: "sales", icon: ShoppingCart, label: "Vendas" },
    { value: "customers", icon: Users, label: "Clientes" },
    { value: "movements", icon: History, label: "Movimentos" },
    { value: "reports", icon: TrendingUp, label: "Relatórios" },
    { value: "profile", icon: UserIcon, label: "Perfil" }
  ];

  const adminItems = [
    { value: "company", icon: Building, label: "Empresa" },
    { value: "users", icon: Settings, label: "Usuários" },
    { value: "suppliers", icon: Truck, label: "Fornecedores" },
    { value: "purchase-orders", icon: FileText, label: "Compras" },
    { value: "audit", icon: Shield, label: "Auditoria" }
  ];

  const isActive = (tab: string) => activeTab === tab;

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarContent className="bg-card">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground font-medium">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.value)}
                    isActive={isActive(item.value)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full ${
                      isActive(item.value)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-accent/10 text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {userIsAdmin && !userIsSuperuser && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-medium">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.value)}
                      isActive={isActive(item.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full ${
                        isActive(item.value)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-accent/10 text-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}