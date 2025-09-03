import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building, Save, Upload, X, Image } from "lucide-react";
import { useSupabaseData, CompanySettings } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanySettingsComponent = () => {
  const { companySettings, updateCompanySettings } = useSupabaseData();
  const { isAdministrator } = useAuth();
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    nuit: "",
    logo_url: ""
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || "",
        address: companySettings.address || "",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        nuit: companySettings.nuit || "",
        logo_url: companySettings.logo_url || ""
      });
    }
  }, [companySettings]);

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    try {
      if (formData.logo_url) {
        const oldPath = formData.logo_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('company-logos').remove([oldPath]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!formData.logo_url) return;

    try {
      const path = formData.logo_url.split('/').pop();
      if (path) {
        await supabase.storage.from('company-logos').remove([path]);
      }
      setFormData(prev => ({ ...prev, logo_url: '' }));
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erro ao remover logo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await updateCompanySettings({
      company_name: formData.company_name,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      nuit: formData.nuit || null,
      logo_url: formData.logo_url || null
    });

    if (result.error) {
      console.error('Error updating company settings:', result.error);
    }
  };

  if (!isAdministrator) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Building className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-slate-500">
            Apenas administradores podem configurar dados da empresa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Configurações da Empresa
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Configure os dados da sua empresa que aparecerão nas faturas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Dados da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="company_name">Nome da Empresa *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Ex: Minha Empresa Lda."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+258 84 123 4567"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="empresa@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nuit">NUIT</Label>
                <Input
                  id="nuit"
                  value={formData.nuit}
                  onChange={(e) => setFormData(prev => ({ ...prev, nuit: e.target.value }))}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, número, bairro, cidade"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo da Empresa</Label>
              <div className="space-y-4">
                {formData.logo_url ? (
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img 
                      src={formData.logo_url} 
                      alt="Company Logo" 
                      className="h-16 w-16 object-contain"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Logo atual</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                    <div className="text-center">
                      <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum logo carregado</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleLogoUpload(file);
                      }
                    }}
                    disabled={uploading}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Enviando...' : formData.logo_url ? 'Alterar Logo' : 'Enviar Logo'}
                      </span>
                    </Button>
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PNG, JPG, WEBP. Tamanho máximo: 5MB.
                </p>
              </div>
            </div>

            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettingsComponent;