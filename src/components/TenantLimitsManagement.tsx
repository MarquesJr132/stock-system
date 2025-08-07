import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Users, BarChart3, AlertTriangle, Plus } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TenantLimitsManagement = () => {
  const { updateTenantLimits, getAllTenantLimits } = useSupabaseData();
  const { isSuperuser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tenantLimits, setTenantLimits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    tenant_id: "",
    monthly_data_limit: 1000
  });

  useEffect(() => {
    if (isSuperuser) {
      loadTenantLimits();
    }
  }, [isSuperuser]);

  const loadTenantLimits = async () => {
    setLoading(true);
    try {
      const result = await getAllTenantLimits();
      if (result.data) {
        setTenantLimits(result.data);
      }
    } catch (error) {
      console.error('Error loading tenant limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await updateTenantLimits(formData.tenant_id, {
      monthly_data_limit: formData.monthly_data_limit
    });

    if (result.data) {
      setDialogOpen(false);
      setFormData({ tenant_id: "", monthly_data_limit: 1000 });
      loadTenantLimits();
    }
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.round((current / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (!isSuperuser) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Settings className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-slate-500">
            Apenas superusers podem gerenciar limites de tenants
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Gestão de Limites
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Controle os limites de dados para cada administrador
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Definir Limite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir Limite de Dados</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tenant_id">ID do Tenant</Label>
                <Input
                  id="tenant_id"
                  value={formData.tenant_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: e.target.value }))}
                  placeholder="UUID do tenant do administrador"
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthly_data_limit">Limite Mensal de Dados</Label>
                <Input
                  id="monthly_data_limit"
                  type="number"
                  value={formData.monthly_data_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_data_limit: parseInt(e.target.value) }))}
                  min={1}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Número máximo de registros que podem ser criados por mês
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Salvar Limite
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tenant Limits Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <p>Carregando limites...</p>
            </CardContent>
          </Card>
        ) : tenantLimits.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                Nenhum limite definido
              </h3>
              <p className="text-slate-500">
                Defina limites para controlar o uso de dados dos administradores
              </p>
            </CardContent>
          </Card>
        ) : (
          tenantLimits.map((limit) => {
            const usagePercentage = getUsagePercentage(limit.current_month_usage, limit.monthly_data_limit);
            const isNearLimit = usagePercentage >= 80;
            
            return (
              <Card key={limit.id} className={`hover:shadow-lg transition-shadow ${isNearLimit ? 'border-yellow-300' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Tenant #{limit.tenant_id.slice(-8)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Admin: {limit.profiles?.full_name || 'Nome não disponível'}
                      </p>
                    </div>
                    {isNearLimit && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Uso Mensal:</span>
                      <span className="font-semibold">
                        {limit.current_month_usage} / {limit.monthly_data_limit}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUsageColor(usagePercentage)}`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Badge variant={usagePercentage >= 90 ? "destructive" : usagePercentage >= 70 ? "secondary" : "default"}>
                        {usagePercentage}% usado
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Período: {new Date(limit.limit_period_start).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Restante:</span>
                      <span className="font-medium">
                        {Math.max(0, limit.monthly_data_limit - limit.current_month_usage)} dados
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TenantLimitsManagement;