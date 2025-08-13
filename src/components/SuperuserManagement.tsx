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
import { UserPlus, Users, Shield, LogOut, Edit, Settings as SettingsIcon } from 'lucide-react';
import TenantLimitsManagement from './TenantLimitsManagement';

interface Administrator {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  tenant_id: string | null;
}

const SuperuserManagement = () => {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [activeTab, setActiveTab] = useState<'admins' | 'limits'>('admins');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Administrator | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const { createUser, signOut, profile } = useAuth();
  const { toast } = useToast();

  const fetchAdministrators = async () => {
    try {
      console.log('Fetching administrators...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, created_at, tenant_id')
        .eq('role', 'administrator')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching administrators:', error);
        throw error;
      }
      
      console.log('Administrators fetched:', data);
      setAdministrators(data || []);
    } catch (error) {
      console.error('Error fetching administrators:', error);
      toast({
        title: "Erro ao carregar administradores",
        description: "Não foi possível carregar a lista de administradores.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdministrators();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await createUser(newAdminEmail, newAdminPassword, newAdminName, 'administrator');

    if (error) {
      toast({
        title: "Erro ao criar administrador",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Administrador criado com sucesso!",
        description: `${newAdminName} foi criado e receberá um email de confirmação.`,
      });
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminPassword('');
      setIsDialogOpen(false);
      fetchAdministrators();
    }

    setIsLoading(false);
  };

  const handleEditAdmin = (admin: Administrator) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.full_name);
    setEditAdminPassword('');
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    
    setIsLoading(true);

    try {
      // Update profile information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editAdminName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAdmin.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (editAdminPassword.trim()) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          editingAdmin.user_id,
          { password: editAdminPassword }
        );

        if (passwordError) {
          console.error('Password update error:', passwordError);
          // Continue with profile update even if password fails
          toast({
            title: "Perfil atualizado parcialmente",
            description: "Nome atualizado, mas houve erro ao alterar a senha.",
            variant: "default",
          });
        } else {
          toast({
            title: "Administrador atualizado!",
            description: "Nome e senha foram atualizados com sucesso.",
          });
        }
      } else {
        toast({
          title: "Administrador atualizado!",
          description: "Nome foi atualizado com sucesso.",
        });
      }

      setEditAdminName('');
      setEditAdminPassword('');
      setIsEditDialogOpen(false);
      setEditingAdmin(null);
      fetchAdministrators();
    } catch (error: any) {
      console.error('Error updating administrator:', error);
      toast({
        title: "Erro ao atualizar administrador",
        description: error.message || "Não foi possível atualizar o administrador.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAdministrator = async (adminId: string) => {
    try {
      // Primeiro, atualizar todos os perfis que foram criados por este administrador
      // para remover a referência de created_by
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ created_by: null })
        .eq('created_by', adminId);

      if (updateError) {
        console.error('Error updating created_by references:', updateError);
        throw updateError;
      }

      // Agora podemos deletar o administrador com segurança
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', adminId);

      if (deleteError) throw deleteError;

      toast({
        title: "Administrador removido",
        description: "O administrador foi removido com sucesso.",
      });
      fetchAdministrators();
    } catch (error) {
      console.error('Error deleting administrator:', error);
      toast({
        title: "Erro ao remover administrador",
        description: "Não foi possível remover o administrador.",
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
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Painel do Superusuário
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gerenciamento de Administradores e Limites do Sistema
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
            variant={activeTab === 'admins' ? 'default' : 'outline'}
            onClick={() => setActiveTab('admins')}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Administradores
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

        {activeTab === 'admins' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Administradores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{administrators.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Administradores ativos no sistema
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
                    {administrators.filter(admin => {
                      const createdDate = new Date(admin.created_at);
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

            {/* Administrators Management */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Administradores
                    </CardTitle>
                    <CardDescription>
                      Gerencie os administradores que têm acesso aos seus próprios sistemas de estoque
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Administrador
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Novo Administrador</DialogTitle>
                        <DialogDescription>
                          Crie um novo administrador que terá acesso ao seu próprio sistema de estoque
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateAdmin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="Digite o nome completo"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="Digite o email"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Senha Temporária</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
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
                            {isLoading ? "Criando..." : "Criar Administrador"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Administrator Dialog */}
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Administrador</DialogTitle>
                        <DialogDescription>
                          Atualize as informações do administrador
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUpdateAdmin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="editName">Nome Completo</Label>
                          <Input
                            id="editName"
                            value={editAdminName}
                            onChange={(e) => setEditAdminName(e.target.value)}
                            placeholder="Digite o nome completo"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editPassword">Nova Senha (opcional)</Label>
                          <div className="relative">
                            <Input
                              id="editPassword"
                              type="password"
                              value={editAdminPassword}
                              onChange={(e) => setEditAdminPassword(e.target.value)}
                              placeholder="Deixe em branco para manter a senha atual"
                              minLength={6}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Deixe em branco se não quiser alterar a senha
                          </p>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditDialogOpen(false);
                              setEditingAdmin(null);
                              setEditAdminName('');
                              setEditAdminPassword('');
                            }}
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
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingAdmins ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {administrators.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum administrador encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        administrators.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell className="font-medium">{admin.full_name}</TableCell>
                            <TableCell>{admin.email}</TableCell>
                            <TableCell>
                              {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Ativo</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditAdmin(admin)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteAdministrator(admin.id)}
                                >
                                  Remover
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Informações Importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Cada administrador terá acesso ao seu próprio sistema de estoque isolado</p>
                <p>• Administradores podem criar usuários para sua própria organização</p>
                <p>• Os dados entre diferentes administradores são completamente separados</p>
                <p>• Você pode definir limites de dados mensais para cada administrador</p>
                <p>• Você pode remover administradores a qualquer momento</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperuserManagement;