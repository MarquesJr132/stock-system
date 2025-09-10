
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import SalesManagement from "@/components/SalesManagement";
import QuotationManagement from "@/components/QuotationManagement";
import { SpecialOrdersManagement } from "@/components/SpecialOrdersManagement";
import CustomerManagement from "@/components/CustomerManagement";
import Reports from "@/components/Reports";
import ProfileManagement from "@/components/ProfileManagement";
import CompanySettings from "@/components/CompanySettings";
import UserManagement from "@/components/UserManagement";
import { SupplierManagement } from "@/components/SupplierManagement";
import { PurchaseOrderManagement } from "@/components/PurchaseOrderManagement";
import { AuditLogs } from "@/components/AuditLogs";
import SuperuserManagement from "@/components/SuperuserManagement";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessReports } from '@/components/business/BusinessReports';
// import { PromotionsManagement } from '@/components/business/PromotionsManagement';
import { StockMovements } from '@/components/business/StockMovements';
import { IntegrationHub } from '@/components/IntegrationHub';

const Index = () => {
  const { user, loading, isSuperuser } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  console.log('Index: rendering with loading =', loading, 'user =', !!user, 'isSuperuser =', isSuperuser);

  if (loading) {
    console.log('Index: showing loading spinner');
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Login />;
  }

  if (isSuperuser) {
    return <SuperuserManagement />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onTabChange={setActiveTab} />;
      case "products":
        return <ProductManagement />;
      case "sales":
        return <SalesManagement />;
      case "quotations":
        return <QuotationManagement />;
      case "special-orders":
        return <SpecialOrdersManagement />;
      case "customers":
        return <CustomerManagement />;
      case "reports":
        return <Reports />;
      case "business":
        return (
          <div className="space-y-6">
            <Tabs defaultValue="reports" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="reports">Relatórios</TabsTrigger>
                <TabsTrigger value="stock-movements">Stock</TabsTrigger>
              </TabsList>
              <TabsContent value="reports">
                <BusinessReports />
              </TabsContent>
              <TabsContent value="stock-movements">
                <StockMovements />
              </TabsContent>
            </Tabs>
          </div>
        );
      case "integrations":
        return <IntegrationHub />;
      case "profile":
        return <ProfileManagement />;
      case "company":
        return <CompanySettings />;
      case "users":
        return <UserManagement />;
      case "suppliers":
        return <SupplierManagement />;
      case "purchase-orders":
        return <PurchaseOrderManagement />;
      case "audit":
        return <AuditLogs />;
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value={activeTab} className="mt-0">
          {renderTabContent()}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Index;
