import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackupSystem } from '@/components/BackupSystem';
import { PWAComponents } from '@/components/PWAComponents';
import { 
  Database, 
  Smartphone, 
  Cloud, 
  Settings,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';

export const IntegrationHub = () => {
  const [activeTab, setActiveTab] = useState('backup');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrações e Automação</h2>
        <p className="text-muted-foreground">
          Gerir backups, sincronização e funcionalidades PWA
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backup e Sync
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            PWA
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-6">
          <BackupSystem />
        </TabsContent>

        <TabsContent value="pwa" className="space-y-6">
          <PWAComponents />
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sincronização Automática
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sincronização em tempo real</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Ativa</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dados sincronizados automaticamente entre dispositivos
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Backup automático diário</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Agendado</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Backups criados automaticamente às 02:00
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Notificações de stock baixo</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Monitorando</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alertas automáticos quando stock atinge nível mínimo
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Integração na Cloud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Totalmente na Cloud</h3>
                  <p className="text-muted-foreground text-sm">
                    Todos os dados são armazenados de forma segura na cloud.
                    Backup automático e sincronização multi-dispositivo incluídos.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportação Automática
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure exportações automáticas de relatórios em intervalos regulares.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Relatório mensal</span>
                    <span className="text-xs text-muted-foreground">Todo dia 1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Backup semanal</span>
                    <span className="text-xs text-muted-foreground">Domingos</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lista de produtos</span>
                    <span className="text-xs text-muted-foreground">Diário</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importação Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sistema de importação com validação automática e correção de erros.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Validação de dados</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Detecção de duplicados</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rollback automático</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};