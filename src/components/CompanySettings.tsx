import React, { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Building2, MapPin, Image, CreditCard, Upload, X, Plus, Edit, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface CompanySettingsComponentProps {}

const CompanySettingsComponent: React.FC<CompanySettingsComponentProps> = () => {
  const { profile, loading } = useAuth();
  const { companySettings, updateCompanySettings, productCategories, addProductCategory, updateProductCategory, deleteProductCategory } = useSupabaseData();
  
  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    email: '',
    nuit: '',
    address: '',
    logo_url: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
    iban: ''
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || '',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        nuit: companySettings.nuit || '',
        address: companySettings.address || '',
        logo_url: companySettings.logo_url || '',
        bank_name: companySettings.bank_name || '',
        account_holder: companySettings.account_holder || '',
        account_number: companySettings.account_number || '',
        iban: companySettings.iban || ''
      });
    }
  }, [companySettings]);

  const handleLogoUpload = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('O arquivo deve ter menos de 5MB');
        return;
      }

      // Delete old logo if exists
      if (formData.logo_url) {
        const oldFileName = formData.logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('company-logos')
            .remove([oldFileName]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo carregado com sucesso!');
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      toast.error('Erro ao carregar logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      if (formData.logo_url) {
        const fileName = formData.logo_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('company-logos')
            .remove([fileName]);
        }
      }
      setFormData(prev => ({ ...prev, logo_url: '' }));
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast.error('Erro ao remover logo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCompanySettings(formData);
      toast.success('Configurações atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  // Debug logging
  console.log('CompanySettings Debug:', {
    profile: profile,
    profileRole: profile?.role,
    isLoading: loading
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Carregando...
          </h2>
        </div>
      </div>
    );
  }

  if (!profile || profile.role !== 'gerente') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">
            Acesso Restrito
          </h2>
          <p className="text-muted-foreground">
            Apenas administradores e gerentes podem acessar as configurações da empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground">
          Gerencie as informações da sua empresa, identidade visual e dados bancários
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Dados fundamentais da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nuit">NUIT</Label>
                <Input
                  id="nuit"
                  value={formData.nuit}
                  onChange={(e) => setFormData(prev => ({ ...prev, nuit: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Localização */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localização
            </CardTitle>
            <CardDescription>
              Endereço e localização da empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Identidade Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Identidade Visual
            </CardTitle>
            <CardDescription>
              Logo e elementos visuais da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Label>Logo da Empresa</Label>
              
              {formData.logo_url ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img 
                      src={formData.logo_url} 
                      alt="Logo da empresa" 
                      className="h-20 w-20 object-contain border rounded-lg bg-background"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Logo atual carregado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Clique no X para remover
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhum logo carregado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tamanho máximo: 5MB | Formatos: JPG, PNG, SVG
                  </p>
                </div>
              )}
              
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Dados Bancários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Dados Bancários
            </CardTitle>
            <CardDescription>
              Informações bancárias para faturas e documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nome do Banco</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="Ex: Banco Comercial e de Investimentos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder">Titular da Conta</Label>
                <Input
                  id="account_holder"
                  value={formData.account_holder}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_holder: e.target.value }))}
                  placeholder="Nome do titular"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Número da Conta</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                  placeholder="000000000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN/NIB</Label>
                <Input
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder="MZ59 0000 0000 0000 0000 0000 0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <CardTitle>Gestão de Categorias de Produtos</CardTitle>
              </div>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', description: '' });
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      if (editingCategory) {
                        await updateProductCategory(editingCategory.id, categoryFormData);
                      } else {
                        await addProductCategory(categoryFormData);
                      }
                      setCategoryDialogOpen(false);
                      setCategoryFormData({ name: '', description: '' });
                      setEditingCategory(null);
                    } catch (error) {
                      console.error('Error saving category:', error);
                    }
                  }}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoryName">Nome da Categoria *</Label>
                        <Input
                          id="categoryName"
                          value={categoryFormData.name}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Electrónica"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="categoryDescription">Descrição</Label>
                        <Textarea
                          id="categoryDescription"
                          value={categoryFormData.description}
                          onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Descrição da categoria (opcional)"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit">
                          {editingCategory ? 'Atualizar' : 'Criar'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>
              Gerencie as categorias de produtos usadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma categoria cadastrada. Crie uma categoria para organizar seus produtos.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productCategories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryFormData({
                                name: category.name,
                                description: category.description || ''
                              });
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={async () => {
                              if (confirm('Tem certeza que deseja eliminar esta categoria?')) {
                                await deleteProductCategory(category.id);
                              }
                            }}
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

        <div className="flex justify-end">
          <Button type="submit" size="lg">
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CompanySettingsComponent;