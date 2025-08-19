
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import SalesManagement from "@/components/SalesManagement";
import { SpecialOrderManagement } from "@/components/SpecialOrderManagement";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";

const Index = () => {
  const { user, loading, isSuperuser } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (loading) {
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
        return <Dashboard />;
      case "products":
        return <ProductManagement />;
      case "sales":
        return <SalesManagement />;
      case "special-orders":
        return <SpecialOrderManagement />;
      case "customers":
        return <CustomerManagement />;
      case "reports":
        return <Reports />;
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
        return <Dashboard />;
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
