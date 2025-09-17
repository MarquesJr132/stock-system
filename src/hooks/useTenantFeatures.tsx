import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TenantFeature {
  feature_code: string;
  name: string;
  category: string;
}

interface TenantFeaturesContextType {
  features: TenantFeature[];
  hasFeature: (featureCode: string) => boolean;
  loading: boolean;
  refreshFeatures: () => Promise<void>;
}

const TenantFeaturesContext = createContext<TenantFeaturesContextType>({
  features: [],
  hasFeature: () => false,
  loading: true,
  refreshFeatures: async () => {},
});

export const TenantFeaturesProvider = ({ children }: { children: ReactNode }) => {
  const [features, setFeatures] = useState<TenantFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTenantFeatures = async () => {
    if (!user) {
      setFeatures([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_tenant_features');
      
      if (error) {
        console.error('Error fetching tenant features:', error);
        setFeatures([]);
      } else {
        setFeatures(data || []);
      }
    } catch (error) {
      console.error('Error fetching tenant features:', error);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  const hasFeature = (featureCode: string): boolean => {
    return features.some(feature => feature.feature_code === featureCode);
  };

  const refreshFeatures = async () => {
    setLoading(true);
    await fetchTenantFeatures();
  };

  useEffect(() => {
    fetchTenantFeatures();
  }, [user]);

  return (
    <TenantFeaturesContext.Provider value={{
      features,
      hasFeature,
      loading,
      refreshFeatures
    }}>
      {children}
    </TenantFeaturesContext.Provider>
  );
};

export const useTenantFeatures = () => {
  const context = useContext(TenantFeaturesContext);
  if (!context) {
    throw new Error('useTenantFeatures must be used within a TenantFeaturesProvider');
  }
  return context;
};