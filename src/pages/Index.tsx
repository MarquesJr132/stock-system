
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "@/components/Login";
import Dashboard from "@/components/Dashboard";
import ProductManagement from "@/components/ProductManagement";
import SalesManagement from "@/components/SalesManagement";
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

  console.log("Index: Auth state", { user: !!user, loading, isSuperuser });

  if (loading) {
    console.log("Index: Showing loading spinner");
    return <LoadingSpinner />;
  }

  if (!user) {
    console.log("Index: No user, showing login");
    return <Login />;
  }

  if (isSuperuser) {
    console.log("Index: Superuser detected, showing superuser management");
    return <SuperuserManagement />;
  }

  console.log("Index: Showing normal app layout");

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "products":
        return <ProductManagement />;
      case "sales":
        return <SalesManagement />;
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
