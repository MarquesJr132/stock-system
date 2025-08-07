import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building, Save } from "lucide-react";
import { useSupabaseData, CompanySettings } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";

const CompanySettingsComponent = () => {
  const { companySettings, updateCompanySettings } = useSupabaseData();
  const { isAdministrator } = useAuth();
  const [formData, setFormData] = useState({
    company_name: "",
    address: "",
    phone: "",
    email: "",
    nuit: ""
  });

  useEffect(() => {
    if (companySettings) {
      setFormData({
        company_name: companySettings.company_name || "",
        address: companySettings.address || "",
        phone: companySettings.phone || "",
        email: companySettings.email || "",
        nuit: companySettings.nuit || ""
      });
    }
  }, [companySettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await updateCompanySettings({
      company_name: formData.company_name,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      nuit: formData.nuit || null
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