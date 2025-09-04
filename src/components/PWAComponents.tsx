import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePWA } from '@/hooks/usePWA';
import { 
  Smartphone, 
  Bell, 
  Download, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';

export const PWAComponents = () => {
  const {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
    requestNotificationPermission,
    subscribeToPushNotifications,
    updateApp
  } = usePWA();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('App installed successfully');
    }
  };

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeToPushNotifications();
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">Conexão</span>
              </div>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5" />
                <span className="font-medium">Instalação</span>
              </div>
              <Badge variant={isInstalled ? "default" : "secondary"}>
                {isInstalled ? 'Instalado' : 'Web App'}
              </Badge>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Installation Card */}
      {isInstallable && !isInstalled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Instalar Aplicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Instale a aplicação no seu dispositivo para uma experiência melhorada 
              com acesso offline e notificações push.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Acesso offline
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Notificações push
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Inicialização rápida
              </div>
            </div>
            <Button onClick={handleInstall} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Instalar Aplicação
            </Button>
          </CardContent>
        </Card>
      )}


      {/* PWA Features */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades PWA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                {isOnline ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                Funcionamento Offline
              </h4>
              <p className="text-sm text-muted-foreground">
                Acesso básico aos dados quando sem internet
              </p>
            </div>


            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                {isInstalled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                Instalação Nativa
              </h4>
              <p className="text-sm text-muted-foreground">
                App instalado como aplicação nativa
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Cache Inteligente
              </h4>
              <p className="text-sm text-muted-foreground">
                Dados críticos disponíveis offline
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={updateApp} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Atualizações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offline Status */}
      {!isOnline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <WifiOff className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Modo Offline</h4>
                <p className="text-sm text-orange-700 mt-1">
                  Está a trabalhar offline. Algumas funcionalidades podem estar limitadas. 
                  Os dados serão sincronizados quando a conexão for restaurada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};