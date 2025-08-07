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
import { UserPlus, Users, Trash2, Shield, Crown, User } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

const UserManagement = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'administrator' as 'administrator' | 'user'
  });
  const { profile, isSuperuser, createUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

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

      setNewUser({ fullName: '', email: '', password: '', role: isSuperuser ? 'administrator' : 'user' });
      setIsCreateDialogOpen(false);
      setTimeout(() => fetchUsers(), 1000);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superuser': return <Crown className="h-4 w-4" />;
      case 'administrator': return <Shield className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superuser': return 'destructive';
      case 'administrator': return 'default';
      case 'user': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superuser': return 'Superutilizador';
      case 'administrator': return 'Administrador';
      case 'user': return 'Utilizador';
      default: return role;
    }
  };

  // Filter users - superusers see all, others see only their tenant
  const filteredUsers = users.filter(user => {
    if (isSuperuser) {
      return true; // Superusers can see all users
    }
    // For this simplified version, we'll just show all users
    // In production, you'd filter by tenant
    return true;
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
              : "Gerir utilizadores do seu negócio"
            }
          </CardDescription>
            </div>
            {(isSuperuser || profile?.role === 'administrator') && (
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
                      <>
                        <Input
                          value="Administrador"
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Superutilizadores só podem criar contas de administrador
                        </p>
                      </>
                    ) : (
                      <Select 
                        value={newUser.role} 
                        onValueChange={(value: 'administrator' | 'user') => 
                          setNewUser({ ...newUser, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Utilizador</SelectItem>
                          <SelectItem value="administrator">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button onClick={handleCreateUser} className="w-full">
                    {isSuperuser ? 'Criar Administrador' : 'Criar Utilizador'}
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
                    {(isSuperuser || (profile?.role === 'administrator' && user.role === 'user')) && 
                     user.user_id !== profile?.user_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;