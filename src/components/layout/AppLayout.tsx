import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { EnhancedHeader } from "@/components/ui/enhanced-header";
import { useIsMobile } from "@/hooks/use-mobile";


interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppLayout = ({ children, activeTab, onTabChange }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <EnhancedHeader onTabChange={onTabChange} />
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};