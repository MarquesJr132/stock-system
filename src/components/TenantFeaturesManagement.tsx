import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { Separator } from '@/components/ui/separator';

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
  const [saving, setSaving] = useState(false);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
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

  const startEditing = (tenantId: string) => {
    setEditingTenant(tenantId);
    
    // Initialize pending changes with current state
    const tenant = tenantsWithFeatures.find(t => t.tenant_id === tenantId);
    if (tenant) {
      const currentState: Record<string, boolean> = {};
      availableFeatures.forEach(feature => {
        const isEnabled = tenant.features.some(
          f => f.feature_code === feature.code && f.enabled
        );
        currentState[feature.code] = isEnabled;
      });
      setPendingChanges(currentState);
    }
  };

  const cancelEditing = () => {
    setEditingTenant(null);
    setPendingChanges({});
  };

  const handlePendingChange = (featureCode: string, enabled: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [featureCode]: enabled
    }));
  };

  const resetChanges = () => {
    const tenant = tenantsWithFeatures.find(t => t.tenant_id === editingTenant);
    if (tenant) {
      const currentState: Record<string, boolean> = {};
      availableFeatures.forEach(feature => {
        const isEnabled = tenant.features.some(
          f => f.feature_code === feature.code && f.enabled
        );
        currentState[feature.code] = isEnabled;
      });
      setPendingChanges(currentState);
    }
  };

  const saveChanges = async () => {
    if (!editingTenant) return;
    
    setSaving(true);
    try {
      // Get current features for this tenant
      const tenant = tenantsWithFeatures.find(t => t.tenant_id === editingTenant);
      if (!tenant) return;

      const currentFeatures = tenant.features.reduce((acc, f) => {
        acc[f.feature_code] = f.enabled;
        return acc;
      }, {} as Record<string, boolean>);

      // Find changes to apply
      const featuresToUpdate = [];
      const featuresToDelete = [];

      for (const [featureCode, enabled] of Object.entries(pendingChanges)) {
        const currentEnabled = currentFeatures[featureCode] || false;
        
        if (enabled !== currentEnabled) {
          if (enabled) {
            featuresToUpdate.push({
              tenant_id: editingTenant,
              feature_code: featureCode,
              enabled: true
            });
          } else {
            featuresToDelete.push(featureCode);
          }
        }
      }

      // Apply updates
      if (featuresToUpdate.length > 0) {
        const { error } = await supabase
          .from('tenant_features')
          .upsert(featuresToUpdate);
        if (error) throw error;
      }

      if (featuresToDelete.length > 0) {
        const { error } = await supabase
          .from('tenant_features')
          .delete()
          .eq('tenant_id', editingTenant)
          .in('feature_code', featuresToDelete);
        if (error) throw error;
      }

      await fetchData();
      setEditingTenant(null);
      setPendingChanges({});
      
      toast({
        title: "Sucesso",
        description: "Funcionalidades atualizadas com sucesso",
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar alterações",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTenantFeature = async (tenantId: string, featureCode: string, enabled: boolean) => {
    setSaving(true);
    try {
      if (enabled) {
        const { error } = await supabase
          .from('tenant_features')
          .upsert({
            tenant_id: tenantId,
            feature_code: featureCode,
            enabled: true
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_features')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('feature_code', featureCode);
        if (error) throw error;
      }

      await fetchData();
      toast({
        title: "Sucesso",
        description: "Funcionalidade atualizada com sucesso",
      });
    } catch (error) {
      console.error('Error updating feature:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar funcionalidade",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const applyPackage = async (tenantId: string, packageType: 'basic' | 'premium') => {
    setSaving(true);
    try {
      // Delete all current features for this tenant
      const { error: deleteError } = await supabase
        .from('tenant_features')
        .delete()
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      // Define package features
      const packageFeatures = packageType === 'basic' 
        ? ['dashboard_basic', 'products_view_only', 'customers_management', 'sales_management']
        : availableFeatures.map(f => f.code); // Premium gets all features

      // Insert new features
      const featuresToInsert = packageFeatures.map(featureCode => ({
        tenant_id: tenantId,
        feature_code: featureCode,
        enabled: true
      }));

      const { error: insertError } = await supabase
        .from('tenant_features')
        .insert(featuresToInsert);

      if (insertError) throw insertError;

      await fetchData();
      toast({
        title: "Sucesso",
        description: `Pacote ${packageType} aplicado com sucesso`,
      });
    } catch (error) {
      console.error('Error applying package:', error);
      toast({
        title: "Erro",
        description: "Erro ao aplicar pacote",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedFeatures = availableFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, AvailableFeature[]>);

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
              <div className="flex gap-2">
                {editingTenant === tenant.tenant_id ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetChanges}
                      disabled={saving}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveChanges}
                      disabled={saving}
                    >
                      Salvar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPackage(tenant.tenant_id, 'basic')}
                      disabled={saving || editingTenant !== null}
                    >
                      Básico
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyPackage(tenant.tenant_id, 'premium')}
                      disabled={saving || editingTenant !== null}
                    >
                      Premium
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => startEditing(tenant.tenant_id)}
                      disabled={saving || editingTenant !== null}
                    >
                      Editar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedFeatures).map(([category, features]) => (
                <div key={category}>
                  <h4 className="font-medium mb-2 capitalize">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                     {features.map((feature) => {
                       const isEditing = editingTenant === tenant.tenant_id;
                       const isEnabled = isEditing 
                         ? pendingChanges[feature.code] ?? tenant.features.some(
                             f => f.feature_code === feature.code && f.enabled
                           )
                         : tenant.features.some(
                             f => f.feature_code === feature.code && f.enabled
                           );
                       
                       return (
                         <div key={feature.code} className="flex items-center space-x-2">
                           <Checkbox
                             id={`${tenant.tenant_id}-${feature.code}`}
                             checked={isEnabled}
                             onCheckedChange={(checked) => {
                               if (isEditing) {
                                 handlePendingChange(feature.code, checked as boolean);
                               } else {
                                 updateTenantFeature(tenant.tenant_id, feature.code, checked as boolean);
                               }
                             }}
                             disabled={saving || (editingTenant !== null && editingTenant !== tenant.tenant_id)}
                           />
                           <Label
                             htmlFor={`${tenant.tenant_id}-${feature.code}`}
                             className="text-sm"
                           >
                             {feature.name}
                           </Label>
                           {isEditing && pendingChanges[feature.code] !== undefined && (
                             pendingChanges[feature.code] !== tenant.features.some(
                               f => f.feature_code === feature.code && f.enabled
                             )
                           ) && (
                             <Badge variant="outline" className="text-xs">
                               Alterado
                             </Badge>
                           )}
                         </div>
                       );
                     })}
                  </div>
                  {category !== 'system' && <Separator className="mt-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};