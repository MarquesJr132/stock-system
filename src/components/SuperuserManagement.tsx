import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, Shield, LogOut, Edit, Settings as SettingsIcon, Building2, Key, Trash2 } from 'lucide-react';
import TenantLimitsManagement from './TenantLimitsManagement';
import { TenantFeaturesModal } from './TenantFeaturesModal';

interface Company {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  tenant_id: string | null;
}

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

const SuperuserManagement = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'companies' | 'limits'>('companies');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);
  const [isLimitsDialogOpen, setIsLimitsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<TenantWithFeatures | null>(null);
  const [availableFeatures, setAvailableFeatures] = useState<AvailableFeature[]>([]);
  const [newCompanyEmail, setNewCompanyEmail] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPassword, setNewCompanyPassword] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyPassword, setEditCompanyPassword] = useState('');
  const [limitsData, setLimitsData] = useState({
    total_user_limit: 10,
    monthly_space_limit_mb: 500
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const { createUser, signOut, profile } = useAuth();
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, created_at, tenant_id')
        .eq('role', 'administrator')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }
      
      console.log('Companies fetched:', data);
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erro ao carregar empresas",
        description: "Não foi possível carregar a lista de empresas.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const fetchAvailableFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('available_features')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setAvailableFeatures(data || []);
    } catch (error) {
      console.error('Error fetching available features:', error);
    }
  };

  const assignDefaultFeatures = async (tenantId: string) => {
    const defaultFeatures = [
      'invoice',
      'quote', 
      'receipt',
      'register_customer',
      'product',
      'expenses',
      'dashboard_basic',
      'reports'
    ];

    try {
      const featuresToInsert = defaultFeatures.map(featureCode => ({
        tenant_id: tenantId,
        feature_code: featureCode,
        enabled: true
      }));

      const { error } = await supabase
        .from('tenant_features')
        .insert(featuresToInsert);

      if (error) throw error;
      console.log('Default features assigned successfully');
    } catch (error) {
      console.error('Error assigning default features:', error);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchAvailableFeatures();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await createUser(newCompanyEmail, newCompanyPassword, newCompanyName, 'administrator');

    if (error) {
      toast({
        title: "Erro ao criar empresa",
        description: error,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Find the newly created company
      const { data: newCompany } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .eq('email', newCompanyEmail)
        .eq('role', 'administrator')
        .single();

      if (newCompany) {
        const tenantId = newCompany.tenant_id || newCompany.id;
        
        // Assign default features
        await assignDefaultFeatures(tenantId);
        
        toast({
          title: "Empresa criada com sucesso!",
          description: `${newCompanyName} foi criada e receberá um email de confirmação.`,
        });
        
        // Open limits configuration
        setLimitsData({ total_user_limit: 10, monthly_space_limit_mb: 500 });
        setSelectedCompany({
          tenant_id: tenantId,
          admin_email: newCompanyEmail,
          admin_full_name: newCompanyName,
          features: []
        });
        setIsLimitsDialogOpen(true);
      }

      setNewCompanyEmail('');
      setNewCompanyName('');
      setNewCompanyPassword('');
      setIsDialogOpen(false);
      fetchCompanies();
    } catch (error) {
      console.error('Error in post-creation setup:', error);
    }

    setIsLoading(false);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyName(company.full_name);
    setIsEditDialogOpen(true);
  };

  const handlePasswordChange = (company: Company) => {
    setEditingCompany(company);
    setEditCompanyPassword('');
    setIsPasswordDialogOpen(true);
  };

  const openFeaturesModal = async (company: Company) => {
    try {
      const tenantId = company.tenant_id || company.id;
      
      // Fetch tenant features
      const { data: tenantFeatures, error } = await supabase
        .from('tenant_features')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setSelectedCompany({
        tenant_id: tenantId,
        admin_email: company.email,
        admin_full_name: company.full_name,
        features: tenantFeatures || []
      });
      setIsFeaturesDialogOpen(true);
    } catch (error) {
      console.error('Error fetching tenant features:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as funcionalidades da empresa.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editCompanyName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast({
        title: "Empresa atualizada!",
        description: "Nome da empresa foi atualizado com sucesso.",
      });

      setEditCompanyName('');
      setIsEditDialogOpen(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message || "Não foi possível atualizar a empresa.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        editingCompany.user_id,
        { password: editCompanyPassword }
      );

      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Senha da empresa foi alterada com sucesso.",
      });

      setEditCompanyPassword('');
      setIsPasswordDialogOpen(false);
      setEditingCompany(null);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveLimits = async () => {
    if (!selectedCompany) return;
    
    try {
      const { error } = await supabase.rpc('initialize_tenant_limits', {
        tenant_uuid: selectedCompany.tenant_id
      });

      if (error) throw error;

      // Update the limits
      const { error: updateError } = await supabase
        .from('tenant_limits')
        .update({
          total_user_limit: limitsData.total_user_limit,
          monthly_space_limit_mb: limitsData.monthly_space_limit_mb
        })
        .eq('tenant_id', selectedCompany.tenant_id);

      if (updateError) throw updateError;

      toast({
        title: "Limites configurados!",
        description: "Limites da empresa foram definidos com sucesso.",
      });

      setIsLimitsDialogOpen(false);
      setSelectedCompany(null);
    } catch (error: any) {
      console.error('Error saving limits:', error);
      toast({
        title: "Erro ao configurar limites",
        description: error.message || "Não foi possível configurar os limites.",
        variant: "destructive",
      });
    }
  };

  const deleteCompany = async (companyId: string) => {
    try {
      // Primeiro, atualizar todos os perfis que foram criados por esta empresa
      // para remover a referência de created_by
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ created_by: null })
        .eq('created_by', companyId);

      if (updateError) {
        console.error('Error updating created_by references:', updateError);
        throw updateError;
      }

      // Agora podemos deletar a empresa com segurança
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', companyId);

      if (deleteError) throw deleteError;

      toast({
        title: "Empresa removida",
        description: "A empresa foi removida com sucesso.",
      });
      fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      
      // Build detailed error message with code and message
      let errorMessage = "Não foi possível remover a empresa.";
      
      if (error?.code) {
        errorMessage = error?.message 
          ? `${error.message} (Código: ${error.code})`
          : `Erro de banco de dados (Código: ${error.code})`;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao remover empresa",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border shadow-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Painel do Superusuário
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerenciamento de Empresas e Limites do Sistema
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Olá, {profile?.full_name}
              </span>
              <Badge variant="destructive" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Superusuário
              </Badge>
              <Button variant="outline" onClick={async () => {
                try {
                  const result = await signOut();
                  if (result.error) {
                    toast({
                      title: "Erro",
                      description: result.error,
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  console.error('Logout error:', error);
                  toast({
                    title: "Erro",
                    description: "Erro ao fazer logout",
                    variant: "destructive",
                  });
                }
              }}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Lista de Empresas
          </Button>
          <Button
            variant={activeTab === 'limits' ? 'default' : 'outline'}
            onClick={() => setActiveTab('limits')}
            className="flex items-center gap-2"
          >
            <SettingsIcon className="h-4 w-4" />
            Limites de Dados
          </Button>
        </div>

        {activeTab === 'limits' && <TenantLimitsManagement />}

        {activeTab === 'companies' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companies.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Empresas ativas no sistema
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Novos este Mês</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {companies.filter(company => {
                      const createdDate = new Date(company.created_at);
                      const now = new Date();
                      return createdDate.getMonth() === now.getMonth() && 
                             createdDate.getFullYear() === now.getFullYear();
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Criados nos últimos 30 dias
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Ativo</div>
                  <p className="text-xs text-muted-foreground">
                    Sistema funcionando normalmente
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Companies Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Empresas
                    </CardTitle>
                    <CardDescription>
                      Gerencie as empresas que têm acesso aos seus próprios sistemas de gestão
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Empresa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Empresa</DialogTitle>
                        <DialogDescription>
                          Crie uma nova empresa que terá acesso ao seu próprio sistema de gestão
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCompany} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            placeholder="Digite o nome completo"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newCompanyEmail}
                            onChange={(e) => setNewCompanyEmail(e.target.value)}
                            placeholder="Digite o email"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha Temporária</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newCompanyPassword}
                            onChange={(e) => setNewCompanyPassword(e.target.value)}
                            placeholder="Digite uma senha temporária"
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Criando..." : "Criar Empresa"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Company Dialog */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Empresa</DialogTitle>
                        <DialogDescription>
                          Atualize as informações da empresa
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateCompany} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editName">Nome da Empresa</Label>
                          <Input
                            id="editName"
                            value={editCompanyName}
                            onChange={(e) => setEditCompanyName(e.target.value)}
                            placeholder="Digite o nome da empresa"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Atualizando..." : "Atualizar"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Password Change Dialog */}
                  <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar Senha</DialogTitle>
                        <DialogDescription>
                          Defina uma nova senha para a empresa
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editPassword">Nova Senha</Label>
                          <Input
                            id="editPassword"
                            type="password"
                            value={editCompanyPassword}
                            onChange={(e) => setEditCompanyPassword(e.target.value)}
                            placeholder="Digite a nova senha"
                            minLength={6}
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPasswordDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Atualizando..." : "Alterar Senha"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Features Modal */}
                  <TenantFeaturesModal
                    isOpen={isFeaturesDialogOpen}
                    onClose={() => setIsFeaturesDialogOpen(false)}
                    tenant={selectedCompany}
                    availableFeatures={availableFeatures}
                    onUpdate={() => {
                      fetchCompanies();
                      setIsFeaturesDialogOpen(false);
                    }}
                  />

                  {/* Limits Configuration Dialog */}
                  <Dialog open={isLimitsDialogOpen} onOpenChange={setIsLimitsDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurar Limites da Empresa</DialogTitle>
                        <DialogDescription>
                          Defina os limites de usuários e espaço para esta empresa
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="userLimit">Limite de Usuários</Label>
                          <Input
                            id="userLimit"
                            type="number"
                            value={limitsData.total_user_limit}
                            onChange={(e) => setLimitsData(prev => ({ ...prev, total_user_limit: parseInt(e.target.value) }))}
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="spaceLimit">Limite de Espaço (MB)</Label>
                          <Input
                            id="spaceLimit"
                            type="number"
                            value={limitsData.monthly_space_limit_mb}
                            onChange={(e) => setLimitsData(prev => ({ ...prev, monthly_space_limit_mb: parseInt(e.target.value) }))}
                            min={1}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLimitsDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={saveLimits}>
                            Salvar Limites
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCompanies ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Carregando empresas...</p>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      Nenhuma empresa encontrada
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Crie a primeira empresa para começar
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Tenant ID</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.full_name}</TableCell>
                          <TableCell>{company.email}</TableCell>
                          <TableCell>
                            {new Date(company.created_at).toLocaleDateString('pt-PT')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {company.tenant_id?.slice(-8) || company.id.slice(-8)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCompany(company)}
                                title="Editar empresa"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePasswordChange(company)}
                                title="Alterar senha"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openFeaturesModal(company)}
                                title="Gerenciar funcionalidades"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja remover esta empresa?')) {
                                    deleteCompany(company.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Remover empresa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

        <div className="mt-8 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Informações Importantes</h3>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              • Cada empresa criada aqui terá acesso ao seu próprio sistema de gestão isolado
            </p>
            <p>
              • As empresas podem criar e gerenciar seus próprios utilizadores e dados
            </p>
            <p>
              • O sistema mantém completo isolamento de dados entre diferentes empresas
            </p>
            <p>
              • Use a aba "Limites de Dados" para controlar o uso de recursos de cada empresa
            </p>
            <p>
              • Funcionalidades padrão são atribuídas automaticamente: Faturas, Cotações, Recibos, Clientes, Produtos, Despesas, Dashboard e Relatórios
            </p>
            <p className="text-amber-600 dark:text-amber-400">
              ⚠️ A remoção de uma empresa irá excluir permanentemente todos os dados associados
            </p>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperuserManagement;