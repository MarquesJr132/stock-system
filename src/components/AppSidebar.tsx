import { Package, TrendingUp, Users, BarChart3, History, ShoppingCart, Settings, User as UserIcon, Building, Truck, FileText, Shield, LogOut, PackageCheck } from "lucide-react";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { isAdministrator: userIsAdmin, isSuperuser: userIsSuperuser, signOut, profile } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  
  const mainItems = [
    { value: "dashboard", icon: BarChart3, label: "Dashboard" },
    { value: "products", icon: Package, label: "Produtos" },
    { value: "sales", icon: ShoppingCart, label: "Vendas" },
    { value: "special-orders", icon: PackageCheck, label: "Encomendas" },
    { value: "customers", icon: Users, label: "Clientes" },
    { value: "reports", icon: TrendingUp, label: "Relatórios" },
    { value: "profile", icon: UserIcon, label: "Perfil" }
  ];

  const adminItems = [
    { value: "company", icon: Building, label: "Empresa" },
    { value: "users", icon: Settings, label: "Usuários" },
    { value: "suppliers", icon: Truck, label: "Fornecedores" },
    // Hide purchase orders for now
    // { value: "purchase-orders", icon: FileText, label: "Compras" }
  ];

  // Add audit access only for administrators (not managers)
  if (userIsAdmin && profile?.role === 'administrator') {
    adminItems.push({ value: "audit", icon: Shield, label: "Auditoria" });
  }

  const isActive = (tab: string) => activeTab === tab;

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 font-semibold text-sm tracking-wide">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => {
                      onTabChange(item.value);
                      if (isMobile) setOpenMobile(false);
                    }}
                    isActive={isActive(item.value)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full hover-lift ${
                      isActive(item.value)
                        ? "bg-primary text-primary-foreground shadow-card"
                        : "hover:bg-primary/10 text-foreground hover:text-primary"
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
            <SidebarGroupLabel className="text-muted-foreground font-semibold text-sm tracking-wide">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => {
                        onTabChange(item.value);
                        if (isMobile) setOpenMobile(false);
                      }}
                      isActive={isActive(item.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full hover-lift ${
                        isActive(item.value)
                          ? "bg-primary text-primary-foreground shadow-card"
                          : "hover:bg-primary/10 text-foreground hover:text-primary"
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
      
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}