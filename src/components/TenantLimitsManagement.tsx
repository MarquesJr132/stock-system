import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Users, BarChart3, AlertTriangle, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TenantLimitsManagement = () => {
  const { updateTenantLimits, getAllTenantLimits, syncTenantData, syncAllTenantsTotal } = useSupabaseData();
  const { isSuperuser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tenantLimits, setTenantLimits] = useState<any[]>([]);
  const [administrators, setAdministrators] = useState<any[]>([]);
  const [editingLimit, setEditingLimit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    selected_admin: "",
    monthly_data_limit: 1000,
    monthly_user_limit: 10
  });
  const [editFormData, setEditFormData] = useState({
    monthly_data_limit: 1000,
    monthly_user_limit: 10
  });
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);

  useEffect(() => {
    if (isSuperuser) {
      loadTenantLimits();
      loadAdministrators();
    }
  }, [isSuperuser]);

  const loadAdministrators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, tenant_id')
        .eq('role', 'administrator')
        .order('full_name');

      if (error) throw error;
      setAdministrators(data || []);
    } catch (error) {
      console.error('Error loading administrators:', error);
    }
  };

  const loadTenantLimits = async () => {
    setLoading(true);
    try {
      
      const result = await getAllTenantLimits();
      
      if (result.data) {
        setTenantLimits(result.data);
        
      } else if (result.error) {
        console.error('Error loading tenant limits:', result.error);
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error loading tenant limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selected_admin) {
      toast.error("Selecione um administrador");
      return;
    }

    const selectedAdmin = administrators.find(admin => admin.id === formData.selected_admin);
    if (!selectedAdmin) {
      toast.error("Administrador não encontrado");
      return;
    }
    
    
    const result = await updateTenantLimits(selectedAdmin.tenant_id || selectedAdmin.id, {
      monthly_data_limit: formData.monthly_data_limit,
      monthly_user_limit: formData.monthly_user_limit
    });

    
    if (result.data) {
      setDialogOpen(false);
      setFormData({ selected_admin: "", monthly_data_limit: 1000, monthly_user_limit: 10 });
      toast.success("Limite definido com sucesso!");
      setTimeout(() => {
        loadTenantLimits();
      }, 500);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLimit) return;
    
    
    const result = await updateTenantLimits(editingLimit.tenant_id, editFormData);

    if (result.data) {
      setEditDialogOpen(false);
      setEditingLimit(null);
      toast.success("Limite atualizado com sucesso!");
      setTimeout(() => {
        loadTenantLimits();
      }, 500);
    }
  };

  const openEditDialog = (limit: any) => {
    setEditingLimit(limit);
    setEditFormData({
      monthly_data_limit: limit.monthly_data_limit,
      monthly_user_limit: limit.monthly_user_limit || 10
    });
    setEditDialogOpen(true);
  };

  const handleSyncTenant = async (tenantId: string, countAllData: boolean = false) => {
    try {
      await syncTenantData(tenantId, countAllData);
      setTimeout(() => {
        loadTenantLimits();
      }, 500);
    } catch (error: any) {
      console.error('Error syncing tenant data:', error);
    }
  };

  const handleSyncAllTotal = async () => {
    setIsGlobalSyncing(true);
    try {
      await syncAllTenantsTotal();
      setTimeout(() => {
        loadTenantLimits();
      }, 500);
    } catch (error: any) {
      console.error('Error syncing all tenants:', error);
    } finally {
      setIsGlobalSyncing(false);
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
            Controle os limites de dados e usuários para cada administrador
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncAllTotal}
            disabled={isGlobalSyncing}
            className="text-sm"
          >
            {isGlobalSyncing ? 'Sincronizando...' : 'Recontagem Total'}
          </Button>
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await supabase.rpc('cleanup_orphaned_tenant_limits');
                toast.success('Registros órfãos removidos com sucesso!');
                setTimeout(() => loadTenantLimits(), 500);
              } catch (error) {
                toast.error('Erro ao limpar registros órfãos');
              }
            }}
            className="text-sm"
          >
            Limpar Órfãos
          </Button>
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
              <DialogTitle>Definir Limites do Administrador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="selected_admin">Administrador</Label>
                <Select
                  value={formData.selected_admin}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, selected_admin: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um administrador" />
                  </SelectTrigger>
                  <SelectContent>
                    {administrators.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.full_name} ({admin.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div>
                <Label htmlFor="monthly_user_limit">Limite Mensal de Usuários</Label>
                <Input
                  id="monthly_user_limit"
                  type="number"
                  value={formData.monthly_user_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_user_limit: parseInt(e.target.value) }))}
                  min={1}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Número máximo de usuários que podem ser criados por mês
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Salvar Limites
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
            const userUsagePercentage = getUsagePercentage(limit.current_month_users || 0, limit.monthly_user_limit || 10);
            const isNearLimit = usagePercentage >= 80 || userUsagePercentage >= 80;
            
            return (
              <Card key={limit.id} className={`hover:shadow-lg transition-shadow min-h-[400px] flex flex-col ${isNearLimit ? 'border-yellow-300' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {limit.admin_email || `Tenant #${limit.tenant_id.slice(-8)}`}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Admin: {limit.admin_full_name || administrators.find(a => a.tenant_id === limit.tenant_id || a.id === limit.tenant_id)?.full_name || 'Nome não disponível'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isNearLimit && (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncTenant(limit.tenant_id, true)}
                        className="mr-2"
                        title="Recontagem total"
                      >
                        Sync Total
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(limit)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Uso de Dados */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Dados Mensais:</span>
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
                    </div>
                  </div>

                  {/* Uso de Usuários */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Usuários Mensais:</span>
                      <span className="font-semibold">
                        {limit.current_month_users || 0} / {limit.monthly_user_limit || 10}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getUsageColor(userUsagePercentage)}`}
                        style={{ width: `${Math.min(userUsagePercentage, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <Badge variant={userUsagePercentage >= 90 ? "destructive" : userUsagePercentage >= 70 ? "secondary" : "default"}>
                        {userUsagePercentage}% usado
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Período: {new Date(limit.limit_period_start).toLocaleDateString('pt-PT')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dados restantes:</span>
                        <span className="font-medium">
                          {Math.max(0, limit.monthly_data_limit - limit.current_month_usage)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usuários restantes:</span>
                        <span className="font-medium">
                          {Math.max(0, (limit.monthly_user_limit || 10) - (limit.current_month_users || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Edit Limits Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Limites do Administrador</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_monthly_data_limit">Limite Mensal de Dados</Label>
              <Input
                id="edit_monthly_data_limit"
                type="number"
                value={editFormData.monthly_data_limit}
                onChange={(e) => setEditFormData(prev => ({ ...prev, monthly_data_limit: parseInt(e.target.value) }))}
                min={1}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Número máximo de registros que podem ser criados por mês
              </p>
            </div>

            <div>
              <Label htmlFor="edit_monthly_user_limit">Limite Mensal de Usuários</Label>
              <Input
                id="edit_monthly_user_limit"
                type="number"
                value={editFormData.monthly_user_limit}
                onChange={(e) => setEditFormData(prev => ({ ...prev, monthly_user_limit: parseInt(e.target.value) }))}
                min={1}
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Número máximo de usuários que podem ser criados por mês
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Atualizar Limites
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantLimitsManagement;