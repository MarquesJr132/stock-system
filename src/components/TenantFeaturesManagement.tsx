import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { TenantFeaturesModal } from './TenantFeaturesModal';

interface AvailableFeature {
  code: string;
  name: string;
  description: string;
  category: string;
}

interface TenantFeature {
  tenant_id: string;
  feature_code: string;
  enabled: boolean;
  expires_at: string | null;
}

interface TenantWithFeatures {
  tenant_id: string;
  admin_email: string;
  admin_full_name: string;
  features: TenantFeature[];
}

export const TenantFeaturesManagement = () => {
  const [availableFeatures, setAvailableFeatures] = useState<AvailableFeature[]>([]);
  const [tenantsWithFeatures, setTenantsWithFeatures] = useState<TenantWithFeatures[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithFeatures | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch available features
      const { data: features, error: featuresError } = await supabase
        .from('available_features')
        .select('*')
        .order('category', { ascending: true });

      if (featuresError) throw featuresError;

      // Fetch tenants with their features
      const { data: tenantLimits, error: tenantsError } = await supabase
        .rpc('get_tenant_limits_with_admin_info');

      if (tenantsError) throw tenantsError;

      // Fetch tenant features
      const { data: tenantFeatures, error: tenantFeaturesError } = await supabase
        .from('tenant_features')
        .select('*');

      if (tenantFeaturesError) throw tenantFeaturesError;

      // Combine data
      const combinedData = tenantLimits.map((tenant: any) => ({
        tenant_id: tenant.tenant_id,
        admin_email: tenant.admin_email,
        admin_full_name: tenant.admin_full_name,
        features: tenantFeatures?.filter(f => f.tenant_id === tenant.tenant_id) || []
      }));

      setAvailableFeatures(features || []);
      setTenantsWithFeatures(combinedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (tenant: TenantWithFeatures) => {
    setSelectedTenant(tenant);
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setSelectedTenant(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Gestão de Funcionalidades por Tenant</h2>
        <p className="text-muted-foreground">
          Configure quais funcionalidades cada tenant tem acesso
        </p>
      </div>

      {tenantsWithFeatures.map((tenant) => (
        <Card key={tenant.tenant_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{tenant.admin_full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{tenant.admin_email}</p>
              </div>
              <Button
                size="sm"
                onClick={() => openEditModal(tenant)}
              >
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm text-muted-foreground">
              <span>
                {tenant.features.filter(f => f.enabled).length} funcionalidades ativas
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      <TenantFeaturesModal
        isOpen={modalOpen}
        onClose={closeEditModal}
        tenant={selectedTenant}
        availableFeatures={availableFeatures}
        onUpdate={fetchData}
      />
    </div>
  );
};