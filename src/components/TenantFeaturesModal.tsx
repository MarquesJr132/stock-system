import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface TenantFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantWithFeatures | null;
  availableFeatures: AvailableFeature[];
  onUpdate: () => void;
}

export const TenantFeaturesModal = ({ 
  isOpen, 
  onClose, 
  tenant, 
  availableFeatures, 
  onUpdate 
}: TenantFeaturesModalProps) => {
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tenant && isOpen) {
      // Initialize pending changes with current state
      const currentState: Record<string, boolean> = {};
      availableFeatures.forEach(feature => {
        const isEnabled = tenant.features.some(
          f => f.feature_code === feature.code && f.enabled
        );
        currentState[feature.code] = isEnabled;
      });
      setPendingChanges(currentState);
    }
  }, [tenant, isOpen, availableFeatures]);

  const handlePendingChange = (featureCode: string, enabled: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [featureCode]: enabled
    }));
  };

  const resetChanges = () => {
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

  const applyPackage = async (packageType: 'basic' | 'premium') => {
    if (!tenant) return;
    
    setSaving(true);
    try {
      // Delete all current features for this tenant
      const { error: deleteError } = await supabase
        .from('tenant_features')
        .delete()
        .eq('tenant_id', tenant.tenant_id);

      if (deleteError) throw deleteError;

      // Define package features
      const packageFeatures = packageType === 'basic' 
        ? ['dashboard_basic', 'products_view_only', 'customers_management', 'sales_management']
        : availableFeatures.map(f => f.code); // Premium gets all features

      // Insert new features
      const featuresToInsert = packageFeatures.map(featureCode => ({
        tenant_id: tenant.tenant_id,
        feature_code: featureCode,
        enabled: true
      }));

      const { error: insertError } = await supabase
        .from('tenant_features')
        .insert(featuresToInsert);

      if (insertError) throw insertError;

      // Update pending changes to reflect the new state
      const newState: Record<string, boolean> = {};
      availableFeatures.forEach(feature => {
        newState[feature.code] = packageFeatures.includes(feature.code);
      });
      setPendingChanges(newState);

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

  const saveChanges = async () => {
    if (!tenant) return;
    
    setSaving(true);
    try {
      // Get current features for this tenant
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
              tenant_id: tenant.tenant_id,
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
          .eq('tenant_id', tenant.tenant_id)
          .in('feature_code', featuresToDelete);
        if (error) throw error;
      }

      onUpdate();
      onClose();
      
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

  const groupedFeatures = availableFeatures
    .filter(feature => feature.code !== 'dashboard_full') // Hide dashboard_full from UI
    .reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, AvailableFeature[]>);

  if (!tenant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Funcionalidades - {tenant.admin_full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Package buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPackage('basic')}
              disabled={saving}
            >
              Básico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPackage('premium')}
              disabled={saving}
            >
              Premium
            </Button>
          </div>

          <Separator />

          {/* Features by category */}
          <div className="space-y-4">
            {Object.entries(groupedFeatures).map(([category, features]) => (
              <div key={category}>
                <h4 className="font-medium mb-2 capitalize">
                  {category.replace('_', ' ')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {features.map((feature) => {
                    const isEnabled = pendingChanges[feature.code] ?? tenant.features.some(
                      f => f.feature_code === feature.code && f.enabled
                    );
                    const hasChanges = pendingChanges[feature.code] !== undefined && 
                      pendingChanges[feature.code] !== tenant.features.some(
                        f => f.feature_code === feature.code && f.enabled
                      );
                    
                    return (
                      <div key={feature.code} className="flex items-center space-x-2">
                        <Checkbox
                          id={`modal-${tenant.tenant_id}-${feature.code}`}
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            handlePendingChange(feature.code, checked as boolean);
                          }}
                          disabled={saving}
                        />
                        <Label
                          htmlFor={`modal-${tenant.tenant_id}-${feature.code}`}
                          className="text-sm flex-1"
                        >
                          {feature.name}
                        </Label>
                        {hasChanges && (
                          <Badge variant="outline" className="text-xs">
                            Alterado
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                {category !== Object.keys(groupedFeatures)[Object.keys(groupedFeatures).length - 1] && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={resetChanges}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={saveChanges}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};