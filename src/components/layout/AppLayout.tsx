import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppLayout = ({ children, activeTab, onTabChange }: AppLayoutProps) => {
  const { profile, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 w-full border-b border-border glass-effect animate-fade-in">
            <div className="flex h-16 items-center px-4 lg:px-6">
              <div className="flex items-center gap-4 flex-1">
                {/* Sidebar trigger for mobile */}
                <SidebarTrigger className="md:hidden" />
                
                {/* Title - responsive */}
                <div className="flex-1">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">
                    <span className="hidden sm:inline text-primary">Soluweb</span>
                    <span className="sm:hidden text-primary">Soluweb</span>
                    <span className="hidden lg:inline text-muted-foreground font-normal text-sm">
                      {' '}• {profile?.role === 'administrator' ? 'Admin Dashboard' : 'User Portal'}
                    </span>
                  </h1>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2 lg:gap-4">
                {/* <NotificationCenter /> */}
                <ThemeToggle />
                
                {/* User info - responsive */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hidden md:inline">Bem-vindo,</span>
                  <span className="truncate max-w-32 lg:max-w-none">
                    {profile?.full_name}
                  </span>
                </div>
                
                {/* Logout button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4 lg:p-8 space-y-8 animate-slide-up">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};