import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Building, Phone, Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  payment_terms: number;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

const initialSupplierState = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  tax_number: '',
  payment_terms: 30,
  notes: '',
  status: 'active' as 'active' | 'inactive',
};

export const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierData, setSupplierData] = useState(initialSupplierState);
  const { profile, isAdministrator, isSuperuser } = useAuth();
  const { toast } = useToast();

  const canManageSuppliers = isAdministrator || isSuperuser;

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data as Supplier[] || []);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os fornecedores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;

    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            ...supplierData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Fornecedor atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            ...supplierData,
            tenant_id: profile.tenant_id,
            created_by: profile.id,
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Fornecedor criado com sucesso!",
        });
      }

      fetchSuppliers();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o fornecedor",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
      tax_number: supplier.tax_number || '',
      payment_terms: supplier.payment_terms,
      notes: supplier.notes || '',
      status: supplier.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fornecedor?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso!",
      });

      fetchSuppliers();
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o fornecedor",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSupplierData(initialSupplierState);
    setEditingSupplier(null);
    setIsDialogOpen(false);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchSuppliers();
  }, []);

  if (!canManageSuppliers) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para acessar a gestão de fornecedores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Gestão de Fornecedores
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Fornecedor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Empresa *</Label>
                      <Input
                        id="name"
                        value={supplierData.name}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_person">Pessoa de Contacto</Label>
                      <Input
                        id="contact_person"
                        value={supplierData.contact_person}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, contact_person: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={supplierData.email}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={supplierData.phone}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={supplierData.address}
                      onChange={(e) => setSupplierData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={supplierData.city}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Input
                        id="country"
                        value={supplierData.country}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, country: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax_number">Número Fiscal</Label>
                      <Input
                        id="tax_number"
                        value={supplierData.tax_number}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, tax_number: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_terms">Prazo de Pagamento (dias)</Label>
                      <Input
                        id="payment_terms"
                        type="number"
                        value={supplierData.payment_terms}
                        onChange={(e) => setSupplierData(prev => ({ ...prev, payment_terms: parseInt(e.target.value) || 30 }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select value={supplierData.status} onValueChange={(value) => setSupplierData(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={supplierData.notes}
                      onChange={(e) => setSupplierData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingSupplier ? 'Atualizar' : 'Criar'} Fornecedor
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando fornecedores...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                        {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
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

          {!loading && filteredSuppliers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum fornecedor encontrado para a pesquisa.' : 'Nenhum fornecedor cadastrado.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};