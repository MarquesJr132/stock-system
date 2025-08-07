
import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import SalesManagement from "@/components/SalesManagement";
import CustomerManagement from "@/components/CustomerManagement";
import Reports from "@/components/Reports";
import StockMovements from "@/components/StockMovements";
import UserManagement from "@/components/UserManagement";
import ProfileManagement from "@/components/ProfileManagement";
import SuperuserManagement from "@/components/SuperuserManagement";
import Login from "@/components/Login";
import CompanySettings from "@/components/CompanySettings";
import { NotificationCenter } from "@/components/NotificationCenter";
import { SupplierManagement } from "@/components/SupplierManagement";
import { PurchaseOrderManagement } from "@/components/PurchaseOrderManagement";
import { AuditLogs } from "@/components/AuditLogs";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isAdministrator, isSuperuser, profile, signOut, loading } = useAuth();

  console.log('Index: Auth state', { isAuthenticated, isAdministrator, isSuperuser, profile: profile?.role, loading });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Superusers get their own dedicated management interface
  if (isSuperuser) {
    return <SuperuserManagement />;
  }

  return (
    <div className="min-h-screen transition-smooth">
      <Header 
        isMobile 
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />
      
      <Header />

      <div className="container mx-auto px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <MobileMenu 
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <Navigation activeTab={activeTab} />

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <SalesManagement />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="movements" className="space-y-6">
            <StockMovements />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Reports />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ProfileManagement />
          </TabsContent>

          {isAdministrator && !isSuperuser && (
            <>
              <TabsContent value="company" className="space-y-6">
                <CompanySettings />
              </TabsContent>
              
              <TabsContent value="users" className="space-y-6">
                <UserManagement />
              </TabsContent>
              
              <TabsContent value="suppliers" className="space-y-6">
                <SupplierManagement />
              </TabsContent>
              
              <TabsContent value="purchase-orders" className="space-y-6">
                <PurchaseOrderManagement />
              </TabsContent>
              
              <TabsContent value="audit" className="space-y-6">
                <AuditLogs />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
