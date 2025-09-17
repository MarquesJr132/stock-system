import { Package, TrendingUp, Users, BarChart3, ShoppingCart, FileText, Shield, Truck, Building2, Zap, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { User as UserIcon, LogOut } from "lucide-react";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { user, signOut, profile, isAdministrator, isGerente } = useAuth();
  const isMobile = useIsMobile();
  const { hasFeature } = useTenantFeatures();

  // Base navigation items based on features
  const baseItems = [];
  
  // Feature-based navigation - Dashboard requires both feature and role
  if (hasFeature('dashboard_basic') && (isAdministrator || isGerente)) {
    baseItems.push({ icon: BarChart3, label: "Dashboard", id: "dashboard" });
  }
  
  if (hasFeature('products_management') || hasFeature('products_view_only')) {
    baseItems.push({ icon: Package, label: "Produtos", id: "products" });
  }
  
  if (hasFeature('customers_management')) {
    baseItems.push({ icon: Users, label: "Clientes", id: "customers" });
  }
  
  if (hasFeature('sales_management')) {
    baseItems.push({ icon: ShoppingCart, label: "Vendas", id: "sales" });
  }
  
  if (hasFeature('quotations_management')) {
    baseItems.push({ icon: FileText, label: "Orçamentos", id: "quotations" });
  }
  
  // Reports - requires both feature and role
  if ((hasFeature('reports_basic') || hasFeature('reports_advanced')) && (isAdministrator || isGerente)) {
    baseItems.push({ icon: TrendingUp, label: "Relatórios", id: "reports" });
  }
  
  if (hasFeature('business_analytics')) {
    baseItems.push({ icon: Building2, label: "Business", id: "business" });
  }

  const mainItems = baseItems;

  // Administration items - feature-based
  const adminItems = [];
  
  if (hasFeature('suppliers_management')) {
    adminItems.push({ icon: Truck, label: "Fornecedores", id: "suppliers" });
  }
  
  if (hasFeature('company_settings')) {
    adminItems.push({ icon: Building2, label: "Empresa", id: "company" });
  }
  
  if (hasFeature('user_management')) {
    adminItems.push({ icon: Users, label: "Utilizadores", id: "users" });
  }
  
  // Integrations - requires both feature and role  
  if (hasFeature('integrations') && (isAdministrator || isGerente)) {
    adminItems.push({ icon: Zap, label: "Integrações", id: "integrations" });
  }
  
  if (hasFeature('audit_logs')) {
    adminItems.push({ icon: Shield, label: "Auditoria", id: "audit" });
  }
  
  if (hasFeature('special_orders')) {
    adminItems.push({ icon: Calendar, label: "Encomendas Especiais", id: "special-orders" });
  }

  const isActive = (tab: string) => activeTab === tab;
  
  const { setOpenMobile } = useSidebar();

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
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
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.id)}
                    isActive={isActive(item.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full hover-lift ${
                      isActive(item.id)
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

        {adminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground font-semibold text-sm tracking-wide">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleTabChange(item.id)}
                      isActive={isActive(item.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth w-full hover-lift ${
                        isActive(item.id)
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
        <div className="flex items-center justify-between">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}