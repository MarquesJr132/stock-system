import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Profile, useAuth } from '@/contexts/AuthContext';
import { UserPlus, Users, Trash2, Shield, Crown, User, Settings, Key } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'user' as 'administrator' | 'gerente' | 'user'
  });
  const [editUser, setEditUser] = useState({
    fullName: '',
    email: '',
    role: 'user' as 'administrator' | 'gerente' | 'user'
  });
  const { profile, isSuperuser, isAdministrator, isGerente, createUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Se for superuser, mostra todos. Senão, mostra apenas do próprio tenant
      if (!isSuperuser && profile) {
        const userTenant = profile.tenant_id || profile.id;
        query = query.or(`tenant_id.eq.${userTenant},user_id.eq.${profile.user_id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar utilizadores",
        description: "Não foi possível carregar a lista de utilizadores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Validate role permissions
    if (!isSuperuser) {
      // Administrators cannot create other administrators  
      if (profile?.role === 'administrator' && newUser.role === 'administrator') {
        toast({
          title: "Erro de permissão",
          description: "Administradores não podem criar outros administradores.",
          variant: "destructive",
        });
        return;
      }
      
      // Gerentes cannot create any users
      if (profile?.role === 'gerente') {
        toast({
          title: "Erro de permissão", 
          description: "Gerentes não têm permissão para criar usuários.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check user limit before creating (only for regular users, not administrators)
    if (newUser.role === 'user') {
      try {
        const tenantId = profile?.tenant_id || profile?.id;
        const { data: canCreate, error: limitError } = await supabase
          .rpc('check_user_limit', {
            tenant_uuid: tenantId
          });

        if (limitError || !canCreate) {
          toast({
            title: "Limite de Usuários Atingido",
            description: "Você atingiu o limite mensal de usuários. Entre em contato com o seu administrador para aumentar o limite.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Error checking user limit:', error);
      }
    }

    try {
      const { error } = await createUser(
        newUser.email,
        newUser.password,
        newUser.fullName,
        newUser.role
      );

      if (error) {
        toast({
          title: "Erro ao criar utilizador",
          description: error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Utilizador criado com sucesso!",
        description: `${newUser.fullName} foi adicionado ao sistema.`,
      });

      // Just reset form and close dialog - don't log in the user
      setNewUser({ fullName: '', email: '', password: '', role: 'user' });
      setIsCreateDialogOpen(false);
      // Refresh users list
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao criar o utilizador.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userToDelete: Profile) => {
    if (userToDelete.user_id === profile?.user_id) {
      toast({
        title: "Ação não permitida",
        description: "Não pode eliminar a sua própria conta.",
        variant: "destructive",
      });
      return;
    }

    if (userToDelete.role === 'superuser') {
      toast({
        title: "Ação não permitida",
        description: "Não é possível eliminar superutilizadores.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja eliminar o utilizador "${userToDelete.full_name}"?`)) {
      toast({
        title: "Funcionalidade não implementada",
        description: "A eliminação de utilizadores requer configuração adicional do Supabase.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditUser({
      fullName: user.full_name,
      email: user.email,
      role: user.role as 'administrator' | 'gerente' | 'user'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (!editUser.fullName) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome completo.",
        variant: "destructive"
      });
      return;
    }

    // Validate role permissions for editing
    if (!isSuperuser) {
      // Administrators cannot promote users to administrator
      if (profile?.role === 'administrator' && editUser.role === 'administrator') {
        toast({
          title: "Erro de permissão",
          description: "Administradores não podem promover usuários a administradores.",
          variant: "destructive",
        });
        return;
      }
      
      // Gerentes cannot edit users
      if (profile?.role === 'gerente') {
        toast({
          title: "Erro de permissão", 
          description: "Gerentes não têm permissão para editar usuários.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Update profile data only (no password updates)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editUser.fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast({
          title: "Erro ao atualizar utilizador",
          description: profileError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Utilizador atualizado com sucesso!",
        description: `${editUser.fullName} foi atualizado.`,
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao atualizar o utilizador.",
        variant: "destructive",
      });
    }
  };

  const handleResetUserPassword = async (user: Profile) => {
    if (user.user_id === profile?.user_id) {
      toast({
        title: "Ação desnecessária",
        description: "Use a seção de perfil para alterar sua própria senha.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja enviar um email de redefinição de senha para "${user.full_name}"?`)) {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://marquesjr132.github.io/stock-system/reset-password',
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: `Um email de redefinição de senha foi enviado para ${user.email}.`,
        });
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser': return <Crown className="h-4 w-4" />;
      case 'administrator': return <Shield className="h-4 w-4" />;
      case 'gerente': return <Settings className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superuser': return 'destructive';
      case 'administrator': return 'default';
      case 'gerente': return 'outline';
      case 'user': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superuser': return 'Superutilizador';
      case 'administrator': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'user': return 'Utilizador';
      default: return role;
    }
  };

  // Show create button only for users who can create users
  const canCreateUsers = isSuperuser || (isAdministrator && !isGerente);

  // Filter users - superusers see all, others see only their tenant
  const filteredUsers = users.filter(user => {
    if (isSuperuser) {
      return true; // Superusers can see all users
    }
    
    if (!profile) {
      return false;
    }
    
    const userTenant = profile.tenant_id || profile.id;
    
    // Show users from same tenant or the user himself
    return user.tenant_id === userTenant || user.user_id === profile.user_id;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestão de Utilizadores
              </CardTitle>
          <CardDescription>
            {isSuperuser 
              ? "Criar contas de administrador para gerir negócios"
              : isGerente
              ? "Visualizar utilizadores do seu negócio"
              : "Gerir utilizadores do seu negócio"
            }
          </CardDescription>
            </div>
            {canCreateUsers && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isSuperuser ? 'Novo Administrador' : 'Novo Utilizador'}
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isSuperuser ? 'Criar Nova Conta de Administrador' : 'Criar Novo Utilizador'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Senha do utilizador"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Função</Label>
                    {isSuperuser ? (
                      <Select 
                        value={newUser.role} 
                        onValueChange={(value: 'administrator' | 'gerente' | 'user') => 
                          setNewUser({ ...newUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administrator">Administrador</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select 
                        value={newUser.role} 
                        onValueChange={(value: 'gerente' | 'user') => 
                          setNewUser({ ...newUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="user">Utilizador</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    Criar {isSuperuser ? (newUser.role === 'administrator' ? 'Administrador' : newUser.role === 'gerente' ? 'Gerente' : 'Utilizador') : (newUser.role === 'gerente' ? 'Gerente' : 'Utilizador')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={getRoleColor(user.role) as any} 
                      className="flex items-center gap-1 w-fit"
                    >
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-PT')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {(isSuperuser || (isAdministrator && user.role !== 'administrator')) && 
                       user.user_id !== profile?.user_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          Editar
                        </Button>
                      )}
                      {(isSuperuser || isAdministrator) && 
                       user.user_id !== profile?.user_id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleResetUserPassword(user)}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Reset Senha
                        </Button>
                      )}
                      {(isSuperuser || (isAdministrator && (user.role === 'user' || user.role === 'gerente'))) && 
                       user.user_id !== profile?.user_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Utilizador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome Completo</Label>
                  <Input
                    id="edit-name"
                    value={editUser.fullName}
                    onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editUser.email}
                    disabled
                    className="bg-muted"
                    placeholder="email@exemplo.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    O email não pode ser alterado. Para alterações de senha, o utilizador deve usar o seu perfil.
                  </p>
                </div>
                <div>
                  <Label htmlFor="edit-role">Função</Label>
                  {isSuperuser ? (
                    <Select 
                      value={editUser.role} 
                      onValueChange={(value: 'administrator' | 'gerente' | 'user') => 
                        setEditUser({ ...editUser, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="administrator">Administrador</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="user">Utilizador</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select 
                      value={editUser.role} 
                      onValueChange={(value: 'gerente' | 'user') => 
                        setEditUser({ ...editUser, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="user">Utilizador</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateUser} className="flex-1">
                    Atualizar Utilizador
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;