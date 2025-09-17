import { ReactNode } from 'react';
import { useTenantFeatures } from '@/hooks/useTenantFeatures';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureGuardProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export const FeatureGuard = ({ 
  children, 
  feature, 
  fallback = null, 
  showMessage = false 
}: FeatureGuardProps) => {
  const { hasFeature, loading } = useTenantFeatures();
  const { isAdministrator, isGerente } = useAuth();

  if (loading) {
    return null;
  }

  // No bypass - all users must have the specific feature

  if (!hasFeature(feature)) {
    if (showMessage) {
      return (
        <Alert className="border-muted bg-muted/50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Esta funcionalidade não está disponível no seu plano atual.
          </AlertDescription>
        </Alert>
      );
    }
    return fallback;
  }

  return <>{children}</>;
};