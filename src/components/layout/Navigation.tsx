import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, TrendingUp, Users, BarChart3, History, ShoppingCart, Settings, User as UserIcon, Building } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface NavigationProps {
  activeTab: string;
}

export const Navigation = ({ activeTab }: NavigationProps) => {
  const { isAdministrator, isSuperuser } = useAuth();

  return (
    <TabsList className={`hidden lg:grid w-full ${isAdministrator && !isSuperuser ? 'grid-cols-9' : 'grid-cols-7'} lg:w-auto`}>
      <TabsTrigger value="dashboard" className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Dashboard
      </TabsTrigger>
      <TabsTrigger value="products" className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        Produtos
      </TabsTrigger>
      <TabsTrigger value="sales" className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        Vendas
      </TabsTrigger>
      <TabsTrigger value="customers" className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Clientes
      </TabsTrigger>
      <TabsTrigger value="movements" className="flex items-center gap-2">
        <History className="h-4 w-4" />
        Movimentos
      </TabsTrigger>
      <TabsTrigger value="reports" className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Relatórios
      </TabsTrigger>
      <TabsTrigger value="profile" className="flex items-center gap-2">
        <UserIcon className="h-4 w-4" />
        Perfil
      </TabsTrigger>
      {isAdministrator && !isSuperuser && (
        <>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Usuários
          </TabsTrigger>
        </>
      )}
    </TabsList>
  );
};