import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  isMobile?: boolean;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export const Header = ({ isMobile = false, onMobileMenuToggle, mobileMenuOpen }: HeaderProps) => {
  const { profile, signOut } = useAuth();

  if (isMobile) {
    return (
      <div className="lg:hidden bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMobileMenuToggle}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-primary">
              Sistema de Stock
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <ThemeToggle />
            <span className="text-xs text-muted-foreground hidden sm:block">
              {profile?.full_name}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="p-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block container mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Sistema de Gestão de Stock - {profile?.role === 'administrator' ? 'Administrador' : 'Usuário'}
            </h1>
            <p className="text-muted-foreground">
              Controle completo do seu inventário, vendas e clientes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">
              Bem-vindo, {profile?.full_name}
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};